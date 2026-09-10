import { prisma } from '../../lib/prisma.js';

export async function listPoi(category?: string) {
  if (category) {
    return prisma.$queryRaw<any[]>`
      SELECT id, name, category, "stationId", address, description, "photoUrl", "dataSource",
             ST_AsGeoJSON(geom)::json AS geometry
      FROM "Poi"
      WHERE category = ${category}::"PoiCategory"
    `;
  }
  return prisma.$queryRaw<any[]>`
    SELECT id, name, category, "stationId", address, description, "photoUrl", "dataSource",
           ST_AsGeoJSON(geom)::json AS geometry
    FROM "Poi"
  `;
}

export async function createManualPoi(input: {
  name: string;
  category: string;
  stationId?: string;
  lng: number;
  lat: number;
  address?: string;
}) {
  const rows: { id: string }[] = await prisma.$queryRawUnsafe(
    `INSERT INTO "Poi" (id, name, category, "stationId", geom, address, "dataSource", "createdAt")
     VALUES (gen_random_uuid(), $1, $2::"PoiCategory", $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6, 'manual', now())
     RETURNING id`,
    input.name,
    input.category,
    input.stationId ?? null,
    input.lng,
    input.lat,
    input.address ?? null,
  );
  return { id: rows[0].id };
}
