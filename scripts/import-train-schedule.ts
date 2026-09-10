import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SCHEDULE = {
  judul: 'STASIUN MANDAI-GARONGKONG',
  jadwal: [
    {
      nama_kereta: 'KA LONTARA 3 (SS5)',
      rute: [
        { stasiun: 'Mandai', datang: '-', berangkat: '13:34' },
        { stasiun: 'Maros', datang: '13:41', berangkat: '13:43' },
        { stasiun: 'Rammang-rammang', datang: '13:57', berangkat: '13:59' },
        { stasiun: 'Pangkajene', datang: '14:08', berangkat: '14:10' },
        { stasiun: 'Labakkang', datang: '14:23', berangkat: '14:25' },
        { stasiun: "Ma'rang", datang: '14:37', berangkat: '14:39' },
        { stasiun: 'Mandalle', datang: '14:47', berangkat: '14:49' },
        { stasiun: 'Tanete Rilau', datang: '15:03', berangkat: '15:05' },
        { stasiun: 'Barru', datang: '15:16', berangkat: '15:18' },
        { stasiun: 'Garongkong', datang: '15:27', berangkat: '-' },
      ],
    },
    {
      nama_kereta: 'KA LONTARA 4 (SS6)',
      rute: [
        { stasiun: 'Garongkong', datang: '-', berangkat: '18:46' },
        { stasiun: 'Barru', datang: '18:55', berangkat: '18:57' },
        { stasiun: 'Tanete Rilau', datang: '19:08', berangkat: '19:10' },
        { stasiun: 'Mandalle', datang: '19:24', berangkat: '19:26' },
        { stasiun: "Ma'rang", datang: '19:34', berangkat: '19:36' },
        { stasiun: 'Labakkang', datang: '19:48', berangkat: '19:50' },
        { stasiun: 'Pangkajene', datang: '20:03', berangkat: '20:05' },
        { stasiun: 'Rammang-rammang', datang: '20:14', berangkat: '20:16' },
        { stasiun: 'Maros', datang: '20:30', berangkat: '20:32' },
        { stasiun: 'Mandai', datang: '20:39', berangkat: '-' },
      ],
    },
  ],
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/^stasiun\s+/i, '')
    .replace(/['’-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function findStationByName(
  allStations: { id: string; name: string }[],
  name: string,
) {
  const target = normalize(name);
  return allStations.find((s) => normalize(s.name) === target);
}

async function importTrainSchedule() {
  // Idempotent — hapus dulu semua estimasi kereta lama supaya aman
  // dijalankan berkali-kali tanpa numpuk duplikat.
  await prisma.transportEstimate.deleteMany({ where: { mode: 'kereta' } });

  const allStations = await prisma.station.findMany({
    where: { dataSource: 'mapid' },
  });
  let inserted = 0;
  const notFound = new Set<string>();

  for (const train of SCHEDULE.jadwal) {
    const origin = train.rute[0].stasiun;
    const destination = train.rute[train.rute.length - 1].stasiun;

    for (const stop of train.rute) {
      const station = await findStationByName(allStations, stop.stasiun);
      if (!station) {
        notFound.add(stop.stasiun);
        continue;
      }

      const time = stop.berangkat !== '-' ? stop.berangkat : stop.datang;
      if (!time || time === '-') continue;

      const direction =
        stop.berangkat !== '-' ? `menuju ${destination}` : `dari ${origin}`;

      await prisma.transportEstimate.create({
        data: {
          stationId: station.id,
          mode: 'kereta',
          timeBucket: 'tetap',
          fixedTimeLabel: time,
          isSurveyed: true,
          sourceLabel: `${train.nama_kereta} · ${direction} · jadwal tetap`,
        },
      });
      inserted++;
    }
  }

  console.log(`Estimasi kereta ditambahkan: ${inserted}`);
  if (notFound.size > 0) {
    console.log('⚠️  Nama stasiun di jadwal yang TIDAK ketemu di database:', [
      ...notFound,
    ]);
    console.log(
      "   Cek nama asli di DB: curl -s http://localhost:3001/stations | jq '.[].name'",
    );
  }
}

async function restorePetePeteEstimates() {
  const barru = await prisma.station.findFirst({
    where: { dataSource: 'mapid', name: { contains: 'Barru' } },
  });
  if (!barru) {
    console.log(
      'Stasiun Barru asli tidak ditemukan — lewati pemulihan estimasi pete-pete.',
    );
    return;
  }
  const existing = await prisma.transportEstimate.findFirst({
    where: { stationId: barru.id, mode: 'pete_pete' },
  });
  if (existing) {
    console.log(
      'Estimasi pete-pete di Barru sudah ada, tidak dipulihkan ulang.',
    );
    return;
  }
  await prisma.transportEstimate.create({
    data: {
      stationId: barru.id,
      mode: 'pete_pete',
      timeBucket: 'pagi',
      minMinutes: 5,
      maxMinutes: 8,
      isSurveyed: true,
      sourceLabel: 'Pagi 06.00–09.00 · survei lapangan Mei 2026',
    },
  });
  console.log(
    'Estimasi pete-pete di Barru dipulihkan (sempat hilang akibat cleanup stasiun dummy).',
  );
}

async function main() {
  await importTrainSchedule();
  await restorePetePeteEstimates();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
