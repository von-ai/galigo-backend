// src/modules/chat/chat.service.ts
import { GoogleGenAI } from '@google/genai';
import { getStationBySlug } from '../stations/stations.service.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Source = { type: 'station' | 'poi'; label: string; id: string };

export async function askChat(message: string, stationSlug?: string) {
  let context = 'Tidak ada titik yang sedang dipilih pengguna.';
  let sources: Source[] = [];

  if (stationSlug) {
    const station = await getStationBySlug(stationSlug);
    if (station) {
      sources = [
        { type: 'station', label: station.name, id: station.id },
        ...station.nearbyPois.slice(0, 5).map((p: any) => ({
          type: 'poi' as const,
          label: p.name,
          id: p.id,
        })),
      ];

      const poiText = station.nearbyPois.length
        ? station.nearbyPois
            .map(
              (p: any) =>
                `${p.name} (${p.category}, ${Math.round(p.distance_m)}m)`,
            )
            .join('; ')
        : 'belum ada data';

      const estimateText = station.estimates.length
        ? station.estimates
            .map((e: any) =>
              e.isSurveyed
                ? `${e.mode} ${e.fixedTimeLabel ?? `${e.minMinutes}-${e.maxMinutes} menit`} (${e.sourceLabel})`
                : `${e.mode} belum tersurvei`,
            )
            .join('; ')
        : 'belum ada data';

      context = [
        `Stasiun: ${station.name}`,
        `Tempat terdekat: ${poiText}`,
        `Estimasi kedatangan: ${estimateText}`,
      ].join('\n');
    }
  }

  // src/modules/chat/chat.service.ts — bagian pemanggilan Gemini, ganti jadi:
  let response;
  try {
    response = await ai.models.generateContent({
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
  } catch (err) {
    // Log detail asli dari Google (kode error, pesan, dsb) — supaya kelihatan
    // apakah ini rate limit, model tidak ditemukan, atau masalah lain.
    console.error('Gemini API error:', err);
    throw err;
  }

  if (!response.text) {
    console.error(
      'Gemini merespons tanpa teks (kemungkinan diblokir safety filter):',
      response,
    );
    return {
      reply: 'Maaf, saya tidak bisa menjawab pertanyaan itu saat ini.',
      sources,
    };
  }

  return { reply: response.text, sources };
}
