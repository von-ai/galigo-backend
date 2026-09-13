export const MAPID_LAYERS = {
  stasiunKereta: '6a8c4a47ba6cb8dfce8bf047',
  jalurRelKereta: '6a8c4ab6ba6cb8dfce8c0ac4',
  shpTitik: '6a8c48feba6cb8dfce8af642',
  ruteTransSulsel: '6a8c4702ba6cb8dfce888717',
  rekomendasiDestinasi: '6aa13f90753cb27abecf2894',
  jalurAngkot: '6aa518f5753cb27abe6e6465',
} as const;

export const CATEGORY_MAP: Record<string, string> = {
  'Pendidikan Regional': 'pendidikan',
  'Kawasan Industri / Utilitas': 'industri',
  'Kawasan Industri': 'industri',
  'Ruang Publik': 'ruang_publik',
  'Ruang Publik / Ikon Kota': 'ruang_publik',
  'Pusat Pemerintahan': 'pemerintahan',
  'Infrastruktur Transportasi': 'transportasi',
  'Fasilitas Kesehatan': 'kesehatan',
  'Pariwisata / Tarikan': 'wisata',
  'Komersial & Perdagangan': 'umkm',
};
