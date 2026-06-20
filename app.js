const { createClient } = supabase
const db = createClient(
  'https://gshstlssjlyefxxefspa.supabase.co',
  'sb_publishable_vwGZFBrtZRQIVpIVsYrQbg_SPYyl7me'
)

async function cekSession() {
  const { data: { session } } = await db.auth.getSession()
  if (session) {
    tampilHome(session.user)
  } else {
    showPage('page-login')
  }
}

function tampilHome(user) {
  const nama = user.user_metadata?.full_name || user.email
  const inisial = nama.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()
  const foto = user.user_metadata?.avatar_url

  const avaEl = document.getElementById('user-ava')
  if (avaEl) {
    if (foto) {
      avaEl.innerHTML = `<img src="${foto}" alt="${nama}">`
    } else {
      avaEl.textContent = inisial
    }
  }

  const profilAva = document.getElementById('profil-ava')
  if (profilAva) {
    if (foto) {
      profilAva.innerHTML = `<img src="${foto}" alt="${nama}">`
    } else {
      profilAva.textContent = inisial
    }
  }

  const profilNama = document.getElementById('profil-nama')
  if (profilNama) profilNama.textContent = nama

  const profilEmail = document.getElementById('profil-email')
  if (profilEmail) profilEmail.textContent = user.email

  showPage('page-home')
  loadProduk()
}

async function loginGoogle() {
  const { error } = await db.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  })
  if (error) console.error('Login error:', error.message)
}

async function logout() {
  await db.auth.signOut()
  showPage('page-login')
}

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  document.getElementById(id).classList.add('active')
  window.scrollTo(0, 0)
}

async function loadProduk(keyword = '', kategori = '') {
  const list = document.getElementById('produk-list')
  list.innerHTML = '<p class="empty">Memuat iklan...</p>'

  let query = db
    .from('products')
    .select('*, users(nama, kota)')
    .eq('status', 'aktif')
    .order('created_at', { ascending: false })

  if (keyword) query = query.ilike('nama', `%${keyword}%`)
  if (kategori) query = query.eq('kategori', kategori)

  const { data, error } = await query

  if (error || !data || data.length === 0) {
    list.innerHTML = '<p class="empty">Belum ada iklan di kotamu.</p>'
    return
  }

  list.innerHTML = data.map(p => `
    <div class="produk-card" onclick="lihatDetail('${p.id}')">
      <div class="pimg"><i class="ti ti-package"></i></div>
      <div class="pinfo">
        <span class="badge ${p.kondisi === 'baru' ? 'b-baru' : 'b-preloved'}">
          ${p.kondisi === 'baru' ? 'Baru' : 'Preloved'}
        </span>
        <div class="pname">${p.nama}</div>
        <div class="pharga">Rp ${Number(p.harga).toLocaleString('id-ID')}</div>
        <div class="ploc"><i class="ti ti-map-pin" style="font-size:10px"></i> ${p.users?.kota || 'Lokal'}</div>
      </div>
    </div>
  `).join('')
}

function cariProduk() {
  const kw = document.getElementById('search')?.value || document.getElementById('search-desktop')?.value || ''
  loadProduk(kw)
}

function filterKategori(el, kat) {
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'))
  document.querySelectorAll('.sb-item').forEach(c => c.classList.remove('active'))
  if (el) el.classList.add('active')
  loadProduk('', kat)
}

function lihatDetail(id) {
  console.log('Lihat produk:', id)
}

async function postingProduk() {
  const { data: { session } } = await db.auth.getSession()
  if (!session) return alert('Kamu harus login dulu.')

  const nama = document.getElementById('nama-produk').value.trim()
  const deskripsi = document.getElementById('deskripsi').value.trim()
  const harga = parseInt(document.getElementById('harga').value)
  const kondisi = document.querySelector('#kondisi-group .tg-btn.active')?.textContent.toLowerCase() === 'preloved' ? 'preloved' : 'baru'
  const kategori = document.getElementById('kategori').value
  const lokasi = document.getElementById('lokasi').value.trim()

  if (!nama || !harga) return alert('Nama produk dan harga wajib diisi.')

  const { error } = await db.from('products').insert({
    seller_id: session.user.id,
    nama, deskripsi, harga, kondisi, kategori,
    status: 'aktif'
  })

  if (error) {
    alert('Gagal posting: ' + error.message)
    return
  }

  alert('Iklan berhasil dipasang!')
  showPage('page-home')
  loadProduk()
}

function setToggle(groupId, el) {
  document.querySelectorAll(`#${groupId} .tg-btn`).forEach(b => b.classList.remove('active'))
  el.classList.add('active')
}

db.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    tampilHome(session.user)
  } else if (event === 'SIGNED_OUT') {
    showPage('page-login')
  }
})

cekSession()
