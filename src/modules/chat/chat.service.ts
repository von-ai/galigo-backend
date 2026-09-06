// src/modules/chat/chat.service.ts
import { GoogleGenAI } from '@google/genai';
import {
  getStationBySlug,
  findNearbyModes,
} from '../stations/stations.service.js';
import { prisma } from '../../lib/prisma.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Source = { type: 'station' | 'poi'; label: string; id: string };

async function getStationCoords(slug: string) {
  const rows: { lng: number; lat: number; name: string }[] =
    await prisma.$queryRaw`
    SELECT ST_X(geom) as lng, ST_Y(geom) as lat, name
    FROM "Station" WHERE slug = ${slug} LIMIT 1
  `;
  return rows[0] ?? null;
}

// Bangun konteks perbandingan dua titik — moda apa yang lewat di masing-
// masing ujung. Ini yang dipakai Gemini untuk menyarankan moda spesifik,
// bukan cuma jawaban generik "naik transportasi umum".
async function buildTripContext(fromSlug: string, toSlug: string) {
  const [from, to] = await Promise.all([
    getStationCoords(fromSlug),
    getStationCoords(toSlug),
  ]);
  if (!from || !to) return null;

  const [modesFrom, modesTo] = await Promise.all([
    findNearbyModes(from.lng, from.lat),
    findNearbyModes(to.lng, to.lat),
  ]);

  const summarize = (
    modes: { mode: string; name: string; distance_m: number }[],
  ) =>
    modes.length
      ? modes
          .map((m) => `${m.mode} (${m.name}, ${Math.round(m.distance_m)}m)`)
          .join('; ')
      : 'tidak ada moda terdata dalam radius 1km';

  return [
    `Titik asal: ${from.name}. Moda tersedia: ${summarize(modesFrom)}.`,
    `Titik tujuan: ${to.name}. Moda tersedia: ${summarize(modesTo)}.`,
  ].join('\n');
}

export async function askChat(
  message: string,
  stationSlug?: string,
  fromSlug?: string,
  toSlug?: string,
) {
  let context = 'Tidak ada titik yang sedang dipilih pengguna.';
  let sources: Source[] = [];

  if (fromSlug && toSlug) {
    const tripContext = await buildTripContext(fromSlug, toSlug);
    if (tripContext) {
      context =
        tripContext +
        '\nTugasmu: sarankan moda paling masuk akal (kereta/bus/pete-pete/jalan kaki) untuk ' +
        'perjalanan ini berdasarkan data di atas SAJA. Kalau salah satu ujung tidak ada moda ' +
        'terdata, katakan jujur itu belum tercover, jangan mengarang solusi.';
    }
  } else if (stationSlug) {
    const station = await getStationBySlug(stationSlug);
    if (station) {
      sources = [
        { type: 'station', label: station.name, id: station.id },
        ...station.nearbyPois
          .slice(0, 5)
          .map((p: any) => ({ type: 'poi' as const, label: p.name, id: p.id })),
      ];
      context = [
        `Stasiun: ${station.name}`,
        `Tempat terdekat: ${station.nearbyPois.map((p: any) => `${p.name} (${p.category}, ${Math.round(p.distance_m)}m)`).join('; ') || 'belum ada data'}`,
        `Estimasi kedatangan: ${station.estimates.map((e: any) => (e.isSurveyed ? `${e.mode} ${e.fixedTimeLabel ?? `${e.minMinutes}-${e.maxMinutes} menit`} (${e.sourceLabel})` : `${e.mode} belum tersurvei`)).join('; ') || 'belum ada data'}`,
      ].join('\n');
    }
  }

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL ?? 'gemini-3.6-flash',
    contents: message,
    config: {
      systemInstruction:
        'Kamu adalah asisten perjalanan GALIGO. Jawab singkat dan hanya berdasarkan DATA di bawah. ' +
        'Jangan mengarang nama tempat, jarak, atau estimasi waktu yang tidak ada di data. ' +
        'Kalau datanya belum tersedia, katakan terus terang belum tersurvei.\n\nDATA:\n' +
        context,
    },
  });

  return {
    reply:
      response.text ??
      'Maaf, saya tidak bisa menjawab pertanyaan itu saat ini.',
    sources,
  };
}
