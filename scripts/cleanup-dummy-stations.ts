// scripts/cleanup-dummy-stations.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Cari stasiun Barru ASLI dari MAPID — tujuan pemindahan referensi
  //    pete-pete, supaya data pete-pete tidak ikut hilang/menggantung.
  const realBarru = await prisma.station.findFirst({
    where: { dataSource: 'mapid', name: { contains: 'Barru' } },
  });
  if (!realBarru) {
    throw new Error(
      'Stasiun Barru asli dari MAPID tidak ditemukan — batalkan, jangan lanjut hapus dummy.',
    );
  }
  console.log('Stasiun Barru asli ditemukan:', realBarru.id, realBarru.name);

  // 2. Pindahkan rute pete-pete (SATU-SATUNYA sumber data pete-pete kita,
  //    MAPID tidak punya layer untuk ini) ke stasiun asli.
  const movedRoutes = await prisma.route.updateMany({
    where: { mode: 'pete_pete', dataSource: 'manual' },
    data: { stationId: realBarru.id },
  });
  console.log(`Rute pete-pete dipindah ke stasiun asli: ${movedRoutes.count}`);

  // 3. Lepas referensi POI dummy ke stasiun dummy — POI-nya SENDIRI TIDAK
  //    dihapus di langkah ini (itu urusan pembersihan tahap berikutnya).
  //    Aman dilepas karena rekomendasi POI di aplikasi jalan berdasarkan
  //    jarak geografis (ST_DWithin), bukan field stationId ini.
  const unlinkedPoi = await prisma.poi.updateMany({
    where: { dataSource: 'manual', stationId: { not: null } },
    data: { stationId: null },
  });
  console.log(
    `POI dummy dilepas dari stasiun dummy (POI tetap ada): ${unlinkedPoi.count}`,
  );

  // 4. Hapus estimasi kedatangan yang nempel ke stasiun dummy — field ini
  //    wajib (tidak bisa di-null-kan), jadi harus dihapus dulu sebelum
  //    stasiunnya, kalau tidak foreign key akan menolak.
  const dummyStations = await prisma.station.findMany({
    where: { dataSource: 'manual' },
  });
  const dummyStationIds = dummyStations.map((s) => s.id);
  console.log(
    'Stasiun dummy yang akan dihapus:',
    dummyStations.map((s) => s.name),
  );

  const deletedEstimates = await prisma.transportEstimate.deleteMany({
    where: { stationId: { in: dummyStationIds } },
  });
  console.log(`Estimasi kedatangan dummy dihapus: ${deletedEstimates.count}`);

  // 5. Baru sekarang aman hapus stasiun dummy-nya.
  const deletedStations = await prisma.station.deleteMany({
    where: { dataSource: 'manual' },
  });
  console.log(`Stasiun dummy dihapus: ${deletedStations.count}`);

  console.log('Selesai. Pete-pete tetap tersambung ke stasiun Barru asli.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
