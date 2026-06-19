const { createClient } = supabase
const db = createClient(
  'https://gshstlssjlyefxxefspa.supabase.co',
  'GANTI_PUBLISHABLE_KEY_KAMU'
)

// CEK SESSION
async function cekSession() {
  const { data: { session } } = await db.auth.getSession()
  if (session) {
    tampilHome(session.user)
  } else {
    showPage('page-login')
  }
}

// TAMPIL HOME
function tampilHome(user) {
  const nama = user.user_metadata?.full_name || user.email
  document.getElementById('user-nama').textContent = nama
  showPage('page-home')
  loadProduk()
}

// LOGIN GOOGLE
async function loginGoogle() {
  const { error } = await db.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://nitipjual.vercel.app'
    }
  })
  if (error) console.error('Login error:', error.message)
}

// LOGOUT
async function logout() {
  await db.auth.signOut()
  showPage('page-login')
}

// NAVIGASI
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  document.getElementById(id).classList.add('active')
}

// LOAD PRODUK
async function loadProduk(keyword = '') {
  const list = document.getElementById('produk-list')
  list.innerHTML = '<p class="empty">Memuat produk...</p>'

  let query = db
    .from('products')
    .select('*, users(nama, kota)')
    .eq('status', 'aktif')
    .order('created_at', { ascending: false })

  if (keyword) query = query.ilike('nama', `%${keyword}%`)

  const { data, error } = await query

  if (error || !data || data.length === 0) {
    list.innerHTML = '<p class="empty">Belum ada iklan di kotamu.</p>'
    return
  }

  list.innerHTML = data.map(p => `
    <div class="produk-card" onclick="lihatDetail('${p.id}')">
      <div class="pimg"><i class="ti ti-package" aria-hidden="true"></i></div>
      <div class="pinfo">
        <span class="badge ${p.kondisi === 'baru' ? 'b-baru' : 'b-preloved'}">
          ${p.kondisi === 'baru' ? 'Baru' : 'Preloved'}
        </span>
        <div class="pname">${p.nama}</div>
        <div class="pharga">Rp ${p.harga.toLocaleString('id-ID')}</div>
        <div class="ploc"><i class="ti ti-map-pin" style="font-size:10px"></i> ${p.users?.kota || 'Lokal'}</div>
      </div>
    </div>
  `).join('')
}

// CARI PRODUK
function cariProduk() {
  const keyword = document.getElementById('search').value
  loadProduk(keyword)
}

// LIHAT DETAIL (nanti dikembangkan)
function lihatDetail(id) {
  console.log('Lihat produk:', id)
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

// AUTH STATE CHANGE
db.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    tampilHome(session.user)
  } else if (event === 'SIGNED_OUT') {
    showPage('page-login')
  }
})

// JALANKAN
cekSession()
