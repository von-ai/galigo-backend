/*
  Warnings:

  - A unique constraint covering the columns `[mapidId]` on the table `Poi` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mapidId]` on the table `Route` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mapidId]` on the table `Station` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PoiCategory" ADD VALUE 'pendidikan';
ALTER TYPE "PoiCategory" ADD VALUE 'kesehatan';
ALTER TYPE "PoiCategory" ADD VALUE 'pemerintahan';
ALTER TYPE "PoiCategory" ADD VALUE 'industri';
ALTER TYPE "PoiCategory" ADD VALUE 'ruang_publik';
ALTER TYPE "PoiCategory" ADD VALUE 'transportasi';

-- AlterTable
ALTER TABLE "Poi" ADD COLUMN     "mapidId" TEXT;

-- AlterTable
ALTER TABLE "Route" ADD COLUMN     "mapidId" TEXT;

-- AlterTable
ALTER TABLE "Station" ADD COLUMN     "mapidId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Poi_mapidId_key" ON "Poi"("mapidId");

-- CreateIndex
CREATE UNIQUE INDEX "Route_mapidId_key" ON "Route"("mapidId");

-- CreateIndex
CREATE UNIQUE INDEX "Station_mapidId_key" ON "Station"("mapidId");
