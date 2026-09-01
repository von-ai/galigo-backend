// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Ganti password ini segera setelah pertama kali login.
  const passwordHash = await bcrypt.hash('ganti-password-ini', 10);
  await prisma.user.upsert({
    where: { email: 'dishub@example.id' },
    update: {},
    create: { email: 'dishub@example.id', passwordHash, name: 'Admin Dishub' },
  });

  const corridor = await prisma.corridor.upsert({
    where: { slug: 'maros-pangkep-barru' },
    update: {},
    create: { name: 'Maros–Pangkep–Barru', slug: 'maros-pangkep-barru' },
  });

  const stations = [
    {
      slug: 'stasiun-mandai',
      name: 'Stasiun Mandai',
      order: 1,
      lng: 119.5613,
      lat: -5.0631,
    },
    {
      slug: 'stasiun-pangkep',
      name: 'Stasiun Pangkep',
      order: 2,
      lng: 119.5721,
      lat: -4.7962,
    },
    {
      slug: 'stasiun-barru-garongkong',
      name: 'Stasiun Barru (Garongkong)',
      order: 3,
      lng: 119.6142,
      lat: -4.4103,
    },
  ];

  const stationIds: Record<string, string> = {};
  for (const s of stations) {
    const existing = await prisma.station.findUnique({
      where: { slug: s.slug },
    });
    if (existing) {
      stationIds[s.slug] = existing.id;
      continue;
    }
    const rows: { id: string }[] = await prisma.$queryRawUnsafe(
      `INSERT INTO "Station" (id, "corridorId", name, slug, "order", geom, "dataSource", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), 'manual', now(), now())
       RETURNING id`,
      corridor.id,
      s.name,
      s.slug,
      s.order,
      s.lng,
      s.lat,
    );
    stationIds[s.slug] = rows[0].id;
  }

  const pois = [
    {
      name: 'Warung Coto Daeng Sija',
      category: 'makan',
      station: 'stasiun-barru-garongkong',
      lng: 119.6151,
      lat: -4.4098,
    },
    {
      name: 'Musholla Al-Ikhlas',
      category: 'musholla',
      station: 'stasiun-barru-garongkong',
      lng: 119.6138,
      lat: -4.411,
    },
    {
      name: 'ATM BRI Dermaga Barru',
      category: 'atm',
      station: 'stasiun-barru-garongkong',
      lng: 119.6129,
      lat: -4.4095,
    },
    {
      name: 'RM Ayam Kampung Pangkep',
      category: 'makan',
      station: 'stasiun-pangkep',
      lng: 119.573,
      lat: -4.7955,
    },
    {
      name: 'Musholla Stasiun Pangkep',
      category: 'musholla',
      station: 'stasiun-pangkep',
      lng: 119.5718,
      lat: -4.797,
    },
  ] as const;

  for (const p of pois) {
    const existing: { id: string }[] = await prisma.$queryRawUnsafe(
      `SELECT id FROM "Poi" WHERE name = $1 AND "stationId" = $2 LIMIT 1`,
      p.name,
      stationIds[p.station],
    );
    if (existing.length > 0) continue;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "Poi" (id, name, category, "stationId", geom, address, "dataSource", "createdAt")
     VALUES (gen_random_uuid(), $1, $2::"PoiCategory", $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), NULL, 'manual', now())`,
      p.name,
      p.category,
      stationIds[p.station],
      p.lng,
      p.lat,
    );
  }

  await prisma.transportEstimate.createMany({
    data: [
      {
        stationId: stationIds['stasiun-barru-garongkong'],
        mode: 'pete_pete',
        timeBucket: 'pagi',
        minMinutes: 5,
        maxMinutes: 8,
        isSurveyed: true,
        sourceLabel: 'Pagi 06.00–09.00 · survei lapangan Mei 2026',
      },
      {
        stationId: stationIds['stasiun-barru-garongkong'],
        mode: 'kereta',
        timeBucket: 'tetap',
        fixedTimeLabel: '07.15',
        isSurveyed: true,
        sourceLabel: 'Jadwal tetap · keberangkatan berikutnya',
      },
      {
        stationId: stationIds['stasiun-pangkep'],
        mode: 'pete_pete',
        timeBucket: 'siang',
        isSurveyed: false,
        sourceLabel: 'Waktu tunggu belum terdata di titik ini',
      },
    ],
  });

  // --- Garis rute: jalur kereta (menyambung 3 stasiun) + 2 trayek pete-pete di Barru ---
  const routes: {
    name: string;
    mode: string;
    stationId: string | null;
    points: [number, number][];
  }[] = [
    {
      name: 'Jalur Kereta Trans Sulawesi',
      mode: 'kereta',
      stationId: null,
      points: [
        [119.5613, -5.0631], // Mandai
        [119.5721, -4.7962], // Pangkep
        [119.6142, -4.4103], // Barru
      ],
    },
    {
      name: 'Pete-pete C3',
      mode: 'pete_pete',
      stationId: stationIds['stasiun-barru-garongkong'],
      points: [
        [119.6151, -4.4098],
        [119.6165, -4.408],
        [119.614, -4.4055],
        [119.611, -4.407],
        [119.612, -4.411],
        [119.6142, -4.4103],
      ],
    },
    {
      name: 'Pete-pete B2',
      mode: 'pete_pete',
      stationId: stationIds['stasiun-barru-garongkong'],
      points: [
        [119.6142, -4.4103],
        [119.61, -4.413],
        [119.608, -4.416],
        [119.611, -4.418],
        [119.615, -4.415],
      ],
    },
  ];

  for (const r of routes) {
    const existing: { id: string }[] = await prisma.$queryRawUnsafe(
      `SELECT id FROM "Route" WHERE name = $1 LIMIT 1`,
      r.name,
    );
    if (existing.length > 0) continue; // idempotent — pelajaran dari duplikat POI kemarin

    const wkt = `LINESTRING(${r.points.map(([lng, lat]) => `${lng} ${lat}`).join(', ')})`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Route" (id, name, mode, "stationId", geom, "dataSource", "createdAt")
     VALUES (gen_random_uuid(), $1, $2::"TransportMode", $3, ST_SetSRID(ST_GeomFromText($4), 4326), 'manual', now())`,
      r.name,
      r.mode,
      r.stationId,
      wkt,
    );
  }

  console.log('Seed selesai.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
