// scripts/cleanup-dummy-poi-routes.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Hapus semua POI dummy — ini mencakup 6 POI dari seed.ts DAN
  //    "Toilet Umum Barru" yang kamu buat waktu tes Fase 4 (dua-duanya
  //    sama-sama dataSource: 'manual', tidak perlu dibedakan by name).
  const poiToDelete = await prisma.poi.findMany({
    where: { dataSource: 'manual' },
  });
  console.log(
    'POI dummy yang akan dihapus:',
    poiToDelete.map((p) => p.name),
  );

  const deletedPoi = await prisma.poi.deleteMany({
    where: { dataSource: 'manual' },
  });
  console.log(`POI dummy dihapus: ${deletedPoi.count}`);

  // 2. Hapus rute kereta dummy — SEKARANG tumpang tindih dengan
  //    "Jalur Rel Kereta Trans Sulawesi" (asli, dari MAPID). Perhatikan
  //    namanya mirip tapi BEDA: dummy = "Jalur Kereta Trans Sulawesi"
  //    (tanpa kata "Rel"), asli = "Jalur Rel Kereta Trans Sulawesi".
  //    Filter pakai dataSource + mode, bukan nama, supaya tidak salah pilih.
  const deletedRoute = await prisma.route.deleteMany({
    where: { mode: 'kereta', dataSource: 'manual' },
  });
  console.log(`Rute kereta dummy dihapus: ${deletedRoute.count}`);

  // Rute pete-pete (dataSource: 'manual') SENGAJA TIDAK disentuh di sini —
  // itu satu-satunya sumber data pete-pete kita, MAPID tidak punya
  // layer untuk itu.

  console.log('Selesai.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
