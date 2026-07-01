const PROVINSI_KOTA = {
  "Aceh": ["Banda Aceh","Sabang","Langsa","Lhokseumawe","Subulussalam","Aceh Besar","Aceh Utara","Aceh Timur","Aceh Barat","Aceh Selatan","Aceh Tengah","Aceh Tenggara","Aceh Tamiang","Bireuen","Pidie","Pidie Jaya","Nagan Raya","Aceh Jaya","Aceh Barat Daya","Gayo Lues","Simeulue","Aceh Singkil","Bener Meriah"],
  "Sumatera Utara": ["Medan","Binjai","Tebing Tinggi","Pematang Siantar","Tanjung Balai","Sibolga","Padang Sidempuan","Gunungsitoli","Deli Serdang","Langkat","Karo","Simalungun","Asahan","Labuhanbatu","Tapanuli Utara","Tapanuli Selatan","Tapanuli Tengah","Nias","Mandailing Natal","Dairi","Pakpak Bharat","Humbang Hasundutan","Samosir","Toba","Nias Selatan","Nias Utara","Nias Barat","Labuhanbatu Utara","Labuhanbatu Selatan","Padang Lawas","Padang Lawas Utara","Batubara","Serdang Bedagai"],
  "Sumatera Barat": ["Padang","Bukittinggi","Payakumbuh","Sawahlunto","Solok","Padang Panjang","Pariaman","Agam","Tanah Datar","Padang Pariaman","Pesisir Selatan","Solok Selatan","Sijunjung","Dharmasraya","Lima Puluh Kota","Pasaman","Pasaman Barat","Kepulauan Mentawai"],
  "Riau": ["Pekanbaru","Dumai","Kampar","Pelalawan","Indragiri Hulu","Indragiri Hilir","Kuantan Singingi","Rokan Hulu","Rokan Hilir","Siak","Bengkalis","Meranti"],
  "Kepulauan Riau": ["Tanjung Pinang","Batam","Bintan","Karimun","Natuna","Lingga","Anambas"],
  "Jambi": ["Jambi","Sungai Penuh","Batanghari","Muaro Jambi","Tanjung Jabung Barat","Tanjung Jabung Timur","Bungo","Tebo","Sarolangun","Merangin","Kerinci"],
  "Sumatera Selatan": ["Palembang","Prabumulih","Lubuklinggau","Pagar Alam","Ogan Komering Ulu","Ogan Komering Ilir","Muara Enim","Musi Rawas","Musi Banyuasin","Banyuasin","Lahat","Empat Lawang","Ogan Ilir","Ogan Komering Ulu Timur","Ogan Komering Ulu Selatan","Musi Rawas Utara","Penukal Abab Lematang Ilir"],
  "Bengkulu": ["Bengkulu","Bengkulu Selatan","Bengkulu Utara","Bengkulu Tengah","Kaur","Seluma","Muko Muko","Lebong","Rejang Lebong","Kepahiang"],
  "Lampung": ["Bandar Lampung","Metro","Lampung Selatan","Lampung Tengah","Lampung Utara","Lampung Barat","Lampung Timur","Tanggamus","Tulang Bawang","Way Kanan","Pesawaran","Pringsewu","Mesuji","Tulang Bawang Barat","Pesisir Barat"],
  "Bangka Belitung": ["Pangkal Pinang","Bangka","Belitung","Bangka Barat","Bangka Tengah","Bangka Selatan","Belitung Timur"],
  "DKI Jakarta": ["Jakarta Pusat","Jakarta Utara","Jakarta Barat","Jakarta Selatan","Jakarta Timur","Kepulauan Seribu"],
  "Jawa Barat": ["Bandung","Bekasi","Bogor","Cimahi","Cirebon","Depok","Sukabumi","Tasikmalaya","Banjar","Bandung Barat","Bekasi (Kab)","Bogor (Kab)","Ciamis","Cianjur","Cirebon (Kab)","Garut","Indramayu","Karawang","Kuningan","Majalengka","Pangandaran","Purwakarta","Subang","Sukabumi (Kab)","Sumedang","Tasikmalaya (Kab)"],
  "Banten": ["Tangerang","Cilegon","Serang","Tangerang Selatan","Lebak","Pandeglang","Serang (Kab)","Tangerang (Kab)"],
  "Jawa Tengah": ["Semarang","Surakarta","Salatiga","Magelang","Pekalongan","Tegal","Banjarnegara","Banyumas","Batang","Blora","Boyolali","Brebes","Cilacap","Demak","Grobogan","Jepara","Karanganyar","Kebumen","Kendal","Klaten","Kudus","Magelang (Kab)","Pati","Pekalongan (Kab)","Pemalang","Purbalingga","Purworejo","Rembang","Semarang (Kab)","Sragen","Sukoharjo","Tegal (Kab)","Temanggung","Wonogiri","Wonosobo"],
  "DI Yogyakarta": ["Yogyakarta","Bantul","Gunung Kidul","Kulon Progo","Sleman"],
  "Jawa Timur": ["Surabaya","Malang","Mojokerto","Pasuruan","Probolinggo","Blitar","Kediri","Madiun","Batu","Gresik","Sidoarjo","Lamongan","Tuban","Bojonegoro","Ngawi","Magetan","Ponorogo","Pacitan","Trenggalek","Tulungagung","Blitar (Kab)","Kediri (Kab)","Malang (Kab)","Mojokerto (Kab)","Pasuruan (Kab)","Probolinggo (Kab)","Jombang","Nganjuk","Madiun (Kab)","Bangkalan","Sampang","Pamekasan","Sumenep","Situbondo","Bondowoso","Jember","Banyuwangi","Lumajang"],
  "Bali": ["Denpasar","Badung","Gianyar","Tabanan","Klungkung","Bangli","Karangasem","Buleleng","Jembrana"],
  "Nusa Tenggara Barat": ["Mataram","Bima","Lombok Barat","Lombok Tengah","Lombok Timur","Lombok Utara","Sumbawa","Sumbawa Barat","Dompu","Bima (Kab)"],
  "Nusa Tenggara Timur": ["Kupang","Flores Timur","Sikka","Ende","Ngada","Manggarai","Sumba Timur","Sumba Barat","Timor Tengah Selatan","Timor Tengah Utara","Belu","Alor","Lembata","Rote Ndao","Manggarai Barat","Nagekeo","Manggarai Timur","Sabu Raijua","Malaka","Sumba Tengah","Sumba Barat Daya"],
  "Kalimantan Barat": ["Pontianak","Singkawang","Kubu Raya","Mempawah","Sambas","Bengkayang","Landak","Sanggau","Sekadau","Sintang","Kapuas Hulu","Melawi","Kayong Utara","Ketapang"],
  "Kalimantan Tengah": ["Palangka Raya","Kotawaringin Barat","Kotawaringin Timur","Kapuas","Barito Selatan","Barito Utara","Barito Timur","Murung Raya","Katingan","Seruyan","Sukamara","Lamandau","Pulang Pisau","Gunung Mas"],
  "Kalimantan Selatan": ["Banjarmasin","Banjarbaru","Tanah Laut","Banjar","Barito Kuala","Tapin","Hulu Sungai Selatan","Hulu Sungai Tengah","Hulu Sungai Utara","Tabalong","Tanah Bumbu","Balangan","Kotabaru"],
  "Kalimantan Timur": ["Samarinda","Balikpapan","Bontang","Kutai Kartanegara","Kutai Barat","Kutai Timur","Berau","Paser","Penajam Paser Utara","Mahakam Ulu"],
  "Kalimantan Utara": ["Tarakan","Bulungan","Malinau","Nunukan","Tana Tidung"],
  "Sulawesi Utara": ["Manado","Bitung","Tomohon","Kotamobagu","Minahasa","Minahasa Utara","Minahasa Selatan","Minahasa Tenggara","Bolaang Mongondow","Kepulauan Sangihe","Kepulauan Talaud","Kepulauan Siau Tagulandang Biaro"],
  "Gorontalo": ["Gorontalo","Gorontalo (Kab)","Boalemo","Pohuwato","Bone Bolango","Gorontalo Utara"],
  "Sulawesi Tengah": ["Palu","Banggai","Banggai Kepulauan","Morowali","Poso","Donggala","Toli Toli","Buol","Parigi Moutong","Tojo Una Una","Sigi","Banggai Laut","Morowali Utara"],
  "Sulawesi Selatan": ["Makassar","Palopo","Parepare","Gowa","Takalar","Jeneponto","Bantaeng","Bulukumba","Selayar","Sinjai","Maros","Pangkep","Barru","Bone","Soppeng","Wajo","Sidenreng Rappang","Pinrang","Enrekang","Luwu","Tana Toraja","Luwu Utara","Luwu Timur","Toraja Utara"],
  "Sulawesi Barat": ["Mamuju","Majene","Polewali Mandar","Mamasa","Mamuju Tengah","Pasangkayu"],
  "Sulawesi Tenggara": ["Kendari","Bau Bau","Konawe","Konawe Selatan","Konawe Utara","Konawe Kepulauan","Kolaka","Kolaka Utara","Kolaka Timur","Bombana","Buton","Buton Utara","Buton Tengah","Buton Selatan","Muna","Muna Barat","Wakatobi"],
  "Maluku": ["Ambon","Tual","Maluku Tengah","Maluku Tenggara","Kepulauan Aru","Seram Bagian Barat","Seram Bagian Timur","Buru","Buru Selatan","Maluku Barat Daya"],
  "Maluku Utara": ["Ternate","Tidore Kepulauan","Halmahera Barat","Halmahera Tengah","Halmahera Utara","Halmahera Selatan","Halmahera Timur","Kepulauan Sula","Pulau Morotai","Pulau Taliabu"],
  "Papua Barat": ["Manokwari","Sorong","Fakfak","Kaimana","Teluk Bintuni","Teluk Wondama","Manokwari Selatan","Pegunungan Arfak"],
  "Papua Barat Daya": ["Sorong (Kota)","Sorong (Kab)","Maybrat","Raja Ampat","Sorong Selatan","Tambrauw"],
  "Papua": ["Jayapura","Merauke","Biak Numfor","Kepulauan Yapen","Waropen","Supiori","Mamberamo Raya","Sarmi","Keerom"],
  "Papua Tengah": ["Nabire","Paniai","Puncak Jaya","Puncak","Dogiyai","Intan Jaya","Deiyai","Mimika"],
  "Papua Pegunungan": ["Jayawijaya","Pegunungan Bintang","Yahukimo","Tolikara","Nduga","Lanny Jaya","Mamberamo Tengah","Yalimo"],
  "Papua Selatan": ["Merauke","Boven Digoel","Mappi","Asmat"]
};

function initProvinsiDropdown() {
  const sel = document.getElementById('lokasi-provinsi');
  if (!sel) return;
  sel.innerHTML = '<option value="">Pilih Lokasi Iklan (Provinsi)</option>';
  Object.keys(PROVINSI_KOTA).sort().forEach(prov => {
    const opt = document.createElement('option');
    opt.value = prov;
    opt.textContent = prov;
    sel.appendChild(opt);
  });
}

function updateKota(provinsi) {
  const kotaSel = document.getElementById('lokasi');
  if (!kotaSel) return;
  if (!provinsi) {
    kotaSel.innerHTML = '<option value="">Pilih kota / kabupaten...</option>';
    kotaSel.disabled = true;
    kotaSel.style.opacity = '0.5';
    return;
  }
  const kota = PROVINSI_KOTA[provinsi] || [];
  kotaSel.innerHTML = '<option value="">Pilih kota / kabupaten...</option>';
  kota.forEach(k => {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = k;
    kotaSel.appendChild(opt);
  });
  kotaSel.disabled = false;
  kotaSel.style.opacity = '1';
}

function pilihKotaFilter(el, kota) {
  document.querySelectorAll('#filter-kota-chips .tg-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  filterState.kota = kota;
}

document.addEventListener('DOMContentLoaded', () => {
  initProvinsiDropdown();
});
