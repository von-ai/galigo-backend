// src/modules/routes/routes.service.ts
import { prisma } from '../../lib/prisma.js';

export async function listRoutes(mode?: string) {
  if (mode) {
    return prisma.$queryRaw<any[]>`
      SELECT id, name, mode, "stationId", "dataSource",
             ST_AsGeoJSON(geom)::json AS geometry
      FROM "Route"
      WHERE mode = ${mode}::"TransportMode"
    `;
  }
  return prisma.$queryRaw<any[]>`
    SELECT id, name, mode, "stationId", "dataSource",
           ST_AsGeoJSON(geom)::json AS geometry
    FROM "Route"
  `;
}
