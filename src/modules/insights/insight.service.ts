// src/modules/insights/insights.service.ts
import { GoogleGenAI } from '@google/genai';
import { prisma } from '../../lib/prisma.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const REGENERATE_COOLDOWN_MS = 2 * 60 * 1000; // 2 menit

export class InsightsError extends Error {}

// Sumber kebenaran tunggal — dipakai untuk kartu KPI DAN prompt Gemini,
// supaya ringkasan AI tidak pernah menyebut angka yang beda dari yang
// tampil di dashboard yang sama.
export async function getStats() {
  const [stationCount, poiCount, unsurveyedCount] = await Promise.all([
    prisma.station.count(),
    prisma.poi.count(),
    prisma.transportEstimate.count({ where: { isSurveyed: false } }),
  ]);
  return { stationCount, poiCount, unsurveyedCount };
}

async function getCorridorBySlug(slug: string) {
  return prisma.corridor.findUnique({ where: { slug } });
}

// Murni baca cache — tidak pernah memanggil Gemini. Buka dashboard harus
// selalu gratis dan cepat.
export async function getLatestSummary(corridorSlug: string) {
  const corridor = await getCorridorBySlug(corridorSlug);
  if (!corridor) return null;

  return prisma.aiSummary.findFirst({
    where: { corridorId: corridor.id },
    orderBy: { createdAt: 'desc' },
  });
}

export async function regenerateSummary(corridorSlug: string) {
  const corridor = await getCorridorBySlug(corridorSlug);
  if (!corridor) throw new InsightsError('Koridor tidak ditemukan');

  const last = await prisma.aiSummary.findFirst({
    where: { corridorId: corridor.id },
    orderBy: { createdAt: 'desc' },
  });

  if (last && Date.now() - last.createdAt.getTime() < REGENERATE_COOLDOWN_MS) {
    const waitSec = Math.ceil(
      (REGENERATE_COOLDOWN_MS - (Date.now() - last.createdAt.getTime())) / 1000,
    );
    throw new InsightsError(
      `Tunggu ${waitSec} detik lagi sebelum regenerate ulang`,
    );
  }

  const stats = await getStats();
  const modelName = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash';

  const prompt =
    `Buat ringkasan 2-3 kalimat berbahasa Indonesia untuk pejabat Dinas Perhubungan ` +
    `tentang kondisi konektivitas feeder di koridor ${corridor.name}, berdasarkan data ini: ` +
    `${stats.stationCount} stasiun, ${stats.poiCount} tempat terdata, ${stats.unsurveyedCount} estimasi belum tersurvei. ` +
    `Jangan mengarang angka di luar data ini.`;

  let text: string;
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });
    if (!response.text) throw new Error('Gemini merespons tanpa teks');
    text = response.text;
  } catch (err) {
    console.error('Gagal generate ringkasan AI:', err);
    // Sengaja TIDAK menyimpan apa pun kalau gagal — dashboard tetap
    // menampilkan ringkasan lama daripada ketiban yang kosong/rusak.
    throw new InsightsError(
      'Gagal membuat ringkasan AI, coba lagi sebentar lagi',
    );
  }

  return prisma.aiSummary.create({
    data: {
      corridorId: corridor.id,
      content: text,
      model: modelName,
      dataSnapshotLabel: `dari ${stats.stationCount} titik dan ${stats.poiCount} tempat`,
    },
  });
}
