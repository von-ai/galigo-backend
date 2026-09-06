// src/modules/stations/stations.service.ts
import { prisma } from '../../lib/prisma.js';

// src/modules/stations/stations.service.ts — ganti fungsi listStations, tambah getSummary
export async function listStations() {
  return prisma.$queryRaw<any[]>`
    SELECT s.id, s.name, s.slug, s."order",
           ST_AsGeoJSON(s.geom)::json AS geometry,
           COUNT(DISTINCT p.id)::int AS poi_count,
           COUNT(DISTINCT e.id) FILTER (WHERE e."isSurveyed")::int AS surveyed_estimate_count
    FROM "Station" s
    LEFT JOIN "Poi" p ON ST_DWithin(p.geom::geography, s.geom::geography, 600)
    LEFT JOIN "TransportEstimate" e ON e."stationId" = s.id
    GROUP BY s.id
    ORDER BY s."order" ASC
  `;
}

export async function getSummary() {
  const [row]: any[] = await prisma.$queryRaw`
    SELECT
      (SELECT COUNT(*) FROM "Station")::int AS station_count,
      (SELECT COUNT(*) FROM "Route" WHERE mode = 'pete_pete')::int AS pete_route_count,
      (SELECT COUNT(*) FROM "Poi")::int AS poi_count
  `;
  return {
    stationCount: row.station_count,
    peteRouteCount: row.pete_route_count,
    poiCount: row.poi_count,
  };
}

export async function getStationBySlug(slug: string) {
  const [station] = await prisma.$queryRaw<any[]>`
    SELECT s.id, s.name, s.slug, ST_AsGeoJSON(s.geom)::json AS geometry
    FROM "Station" s
    WHERE s.slug = ${slug}
    LIMIT 1
  `;
  if (!station) return null;

  const estimates = await prisma.transportEstimate.findMany({
    where: { stationId: station.id },
  });

  // Radius 600m, terdekat dulu — geography cast bikin ST_Distance mengembalikan meter.
  const nearbyPois = await prisma.$queryRaw<any[]>`
    SELECT p.id, p.name, p.category, p.address,
           ST_AsGeoJSON(p.geom)::json AS geometry,
           ST_Distance(p.geom::geography, s.geom::geography) AS distance_m
    FROM "Poi" p
    JOIN "Station" s ON s.id = ${station.id}
    WHERE ST_DWithin(p.geom::geography, s.geom::geography, 600)
    ORDER BY distance_m ASC
  `;

  return { ...station, estimates, nearbyPois };
}

// Dipakai untuk analisis dua titik (rencana perjalanan) — cari moda apa
// saja yang lewat dalam radius 1km dari sebuah koordinat.
export async function findNearbyModes(lng: number, lat: number) {
  const rows: { mode: string; name: string; distance_m: number }[] =
    await prisma.$queryRaw`
    SELECT mode, name, ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) AS distance_m
    FROM "Route"
    WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, 1000)
    ORDER BY distance_m ASC
  `;
  return rows;
}
