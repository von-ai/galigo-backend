// src/modules/stations/stations.service.ts
import { prisma } from '../../lib/prisma.js';

export async function listStations() {
  return prisma.$queryRaw<any[]>`
    SELECT s.id, s.name, s.slug, s."order",
           ST_AsGeoJSON(s.geom)::json AS geometry
    FROM "Station" s
    ORDER BY s."order" ASC
  `;
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
