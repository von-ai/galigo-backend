// src/modules/mapid-sync/mapid-sync.service.ts
import { prisma } from '../../lib/prisma.js';
import { MAPID_LAYERS, CATEGORY_MAP } from './mapid-sync.config.js';

async function fetchMapidLayer(layerId: string) {
  const url = `${process.env.MAPID_BASE_URL}/layers_new/get_layer?api_key=${process.env.MAPID_API_KEY}&layer_id=${layerId}&project_id=${process.env.MAPID_PROJECT_ID}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MAPID API error: ${res.status}`);
  return res.json();
}

function toSlug(name: string): string {
  return (
    'stasiun-' +
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  );
}

function geometryToWKT(geom: { type: string; coordinates: any }): string {
  if (geom.type === 'LineString') {
    const coords = geom.coordinates
      .map(([lng, lat]: number[]) => `${lng} ${lat}`)
      .join(', ');
    return `LINESTRING(${coords})`;
  }
  if (geom.type === 'MultiLineString') {
    const lines = geom.coordinates.map(
      (line: number[][]) =>
        `(${line.map(([lng, lat]) => `${lng} ${lat}`).join(', ')})`,
    );
    return `MULTILINESTRING(${lines.join(', ')})`;
  }
  throw new Error(`Tipe geometri tidak didukung: ${geom.type}`);
}

async function syncStations(corridorId: string) {
  const data = await fetchMapidLayer(MAPID_LAYERS.stasiunKereta);
  for (const f of data.features) {
    const [lng, lat] = f.geometry.coordinates;
    const name = `Stasiun ${f.properties.name}`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Station" (id, "corridorId", name, slug, "order", geom, "dataSource", "mapidId", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, 0, ST_SetSRID(ST_MakePoint($4, $5), 4326), 'mapid', $6, now(), now())
       ON CONFLICT ("mapidId") DO UPDATE SET name = $2, geom = ST_SetSRID(ST_MakePoint($4, $5), 4326), "updatedAt" = now()`,
      corridorId,
      name,
      toSlug(f.properties.name),
      lng,
      lat,
      f.id,
    );
  }
  return data.features.length;
}

async function syncRailLine() {
  const data = await fetchMapidLayer(MAPID_LAYERS.jalurRelKereta);
  // Ratusan segmen OSM digabung jadi SATU MultiLineString, bukan ratusan
  // baris Route terpisah.
  const lines = data.features.map(
    (f: any) =>
      `(${f.geometry.coordinates.map(([lng, lat]: number[]) => `${lng} ${lat}`).join(', ')})`,
  );
  const wkt = `MULTILINESTRING(${lines.join(', ')})`;
  const mapidId = 'jalur-rel-kereta-aggregate'; // bukan id fitur asli — ini gabungan

  await prisma.$executeRawUnsafe(
    `INSERT INTO "Route" (id, name, mode, "stationId", geom, "dataSource", "mapidId", "createdAt")
     VALUES (gen_random_uuid(), 'Jalur Rel Kereta Trans Sulawesi', 'kereta', NULL, ST_SetSRID(ST_GeomFromText($1), 4326), 'mapid', $2, now())
     ON CONFLICT ("mapidId") DO UPDATE SET geom = ST_SetSRID(ST_GeomFromText($1), 4326)`,
    wkt,
    mapidId,
  );
  return data.features.length;
}

async function syncBusRoutes() {
  const data = await fetchMapidLayer(MAPID_LAYERS.ruteTransSulsel);
  let i = 0;
  for (const f of data.features) {
    i++;
    const name = f.properties.Rute?.trim() || `Trans Sulsel #${i}`;
    const wkt = geometryToWKT(f.geometry);
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Route" (id, name, mode, "stationId", geom, "dataSource", "mapidId", "createdAt")
       VALUES (gen_random_uuid(), $1, 'bus', NULL, ST_SetSRID(ST_GeomFromText($2), 4326), 'mapid', $3, now())
       ON CONFLICT ("mapidId") DO UPDATE SET name = $1, geom = ST_SetSRID(ST_GeomFromText($2), 4326)`,
      name,
      wkt,
      f.id,
    );
  }
  return data.features.length;
}

async function syncPoi() {
  const data = await fetchMapidLayer(MAPID_LAYERS.shpTitik);
  for (const f of data.features) {
    // SENGAJA pakai geometry.coordinates, BUKAN properties.Latitude_Y/Longitude_
    // — field itu terbukti kadang meleset atau rusak (lihat "Grand Mall Maros").
    const [lng, lat] = f.geometry.coordinates;
    const category = CATEGORY_MAP[f.properties.Kategori] ?? 'ruang_publik';
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Poi" (id, name, category, "stationId", geom, address, "dataSource", "mapidId", "createdAt")
       VALUES (gen_random_uuid(), $1, $2::"PoiCategory", NULL, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, 'mapid', $6, now())
       ON CONFLICT ("mapidId") DO UPDATE SET name = $1, category = $2::"PoiCategory", geom = ST_SetSRID(ST_MakePoint($3, $4), 4326)`,
      f.properties.Nama_Lokas,
      category,
      lng,
      lat,
      f.properties.Kabupaten,
      f.id,
    );
  }
  return data.features.length;
}

export async function syncAll() {
  const corridor = await prisma.corridor.upsert({
    where: { slug: 'maros-pangkep-barru' },
    update: {},
    create: { name: 'Maros–Pangkep–Barru', slug: 'maros-pangkep-barru' },
  });

  const stationCount = await syncStations(corridor.id);
  await syncRailLine();
  const busCount = await syncBusRoutes();
  const poiCount = await syncPoi();

  return { stationCount, busCount, poiCount };
}
