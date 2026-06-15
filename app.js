// SUPABASE INIT
const { createClient } = supabase
const db = createClient(
  'https://gshstlssjlyefxxefspa.supabase.co',
  'sb_publishable_vwGZFBrtZRQIVpIVsYrQbg_SPYyl7me'
)

// CEK SESSION
async function cekSession() {
  const { data: { session } } = await db.auth.getSession()
  if (session) {
    document.getElementById('user-nama').textContent = session.user.user_metadata.full_name
    showPage('page-home')
    loadProduk()
  } else {
    showPage('page-login')
  }
}

// LOGIN GOOGLE
async function loginGoogle() {
  await db.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  })
}

// LOGOUT
async function logout() {
  await db.auth.signOut()
  showPage('page-login')
}

// NAVIGASI HALAMAN
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  document.getElementById(id).classList.add('active')
}

// LOAD PRODUK
async function loadProduk(keyword = '') {
  const list = document.getElementById('produk-list')
  list.innerHTML = '<p class="empty">Memuat produk...</p>'

  let query = db.from('products').select('*, users(nama, kota)').eq('status', 'aktif').order('created_at', { ascending: false })

  if (keyword) query = query.ilike('nama', `%${keyword}%`)

  const { data, error } = await query

  if (error || !data || data.length === 0) {
    list.innerHTML = '<p class="empty">Belum ada produk di kotamu.</p>'
    return
  }

  list.innerHTML = data.map(p => `
    <div class="produk-card">
      <span class="badge ${p.kondisi === 'baru' ? 'badge-baru' : 'badge-preloved'}">
        ${p.kondisi === 'baru' ? 'Baru' : 'Preloved'}
      </span>
      <div class="nama">${p.nama}</div>
      <div class="harga">Rp ${p.harga.toLocaleString('id-ID')}</div>
      <div class="meta">📍 ${p.users?.kota || 'Lokal'} · ${p.users?.nama || 'Seller'}</div>
    </div>
  `).join('')
}

// CARI PRODUK
function cariProduk() {
  const keyword = document.getElementById('search').value
  loadProduk(keyword)
}

// POSTING PRODUK
async function postingProduk() {
  const { data: { session } } = await db.auth.getSession()
  if (!session) return alert('Kamu harus login dulu.')

  const nama = document.getElementById('nama-produk').value.trim()
  const deskripsi = document.getElementById('deskripsi').value.trim()
  const harga = parseInt(document.getElementById('harga').value)
  const kondisi = document.getElementById('kondisi').value
  const kategori = document.getElementById('kategori').value.trim()

  if (!nama || !harga) return alert('Nama produk dan harga wajib diisi.')

  const { error } = await db.from('products').insert({
    seller_id: session.user.id,
    nama, deskripsi, harga, kondisi, kategori
  })

  if (error) {
    alert('Gagal posting: ' + error.message)
    return
  }

  alert('Produk berhasil diposting!')
  showPage('page-home')
  loadProduk()
}

// JALANKAN
cekSession()
