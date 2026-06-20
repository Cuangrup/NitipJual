const { createClient } = supabase
const db = createClient(
  'https://gshstlssjlyefxxefspa.supabase.co',
  'sb_publishable_vwGZFBrtZRQIVpIVsYrQbg_SPYyl7me'
)

const BUCKET = 'foto produk'
let fotoFiles = []

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
    if (foto) avaEl.innerHTML = `<img src="${foto}" alt="${nama}">`
    else avaEl.textContent = inisial
  }

  const profilAva = document.getElementById('profil-ava')
  if (profilAva) {
    if (foto) profilAva.innerHTML = `<img src="${foto}" alt="${nama}">`
    else profilAva.textContent = inisial
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
    options: { redirectTo: window.location.origin }
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
  if (id === 'page-jual') resetFormJual()
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

  list.innerHTML = data.map(p => {
    const foto = p.foto_urls && p.foto_urls.length > 0
      ? `<img src="${p.foto_urls[0]}" alt="${p.nama}" style="width:100%;height:100%;object-fit:cover">`
      : `<i class="ti ti-package"></i>`
    return `
      <div class="produk-card" onclick="lihatDetail('${p.id}')">
        <div class="pimg">${foto}</div>
        <div class="pinfo">
          <span class="badge ${p.kondisi === 'baru' ? 'b-baru' : 'b-preloved'}">
            ${p.kondisi === 'baru' ? 'Baru' : 'Preloved'}
          </span>
          <div class="pname">${p.nama}</div>
          <div class="pharga">Rp ${Number(p.harga).toLocaleString('id-ID')}</div>
          <div class="ploc"><i class="ti ti-map-pin" style="font-size:10px"></i> ${p.users?.kota || 'Lokal'}</div>
        </div>
      </div>
    `
  }).join('')
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

async function kompresiFoto(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width
        let h = img.height
        const maxW = 800
        if (w > maxW) { h = h * maxW / w; w = maxW }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.75)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

function handleFotoInput(event) {
  const files = Array.from(event.target.files)
  const sisa = 5 - fotoFiles.length
  const tambah = files.slice(0, sisa)
  fotoFiles = [...fotoFiles, ...tambah]
  renderFotoPreview()
}

function renderFotoPreview() {
  const row = document.getElementById('foto-row')
  const previews = fotoFiles.map((file, i) => {
    const url = URL.createObjectURL(file)
    return `
      <div style="position:relative;width:70px;height:70px;flex-shrink:0">
        <img src="${url}" style="width:70px;height:70px;object-fit:cover;border-radius:10px;border:0.5px solid var(--pkbr)">
        <button onclick="hapusFoto(${i})" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#e53935;color:#fff;border:none;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;padding:0">×</button>
      </div>
    `
  }).join('')

  const tambahBtn = fotoFiles.length < 5
    ? `<label for="foto-input" class="photo-add" style="cursor:pointer">
        <i class="ti ti-camera"></i><span>Tambah</span>
       </label>
       <input type="file" id="foto-input" accept="image/*" multiple style="display:none" onchange="handleFotoInput(event)">`
    : ''

  row.innerHTML = previews + tambahBtn
}

function hapusFoto(index) {
  fotoFiles.splice(index, 1)
  renderFotoPreview()
}

function resetFormJual() {
  fotoFiles = []
  const row = document.getElementById('foto-row')
  if (row) row.innerHTML = `
    <label for="foto-input" class="photo-add" style="cursor:pointer">
      <i class="ti ti-camera"></i><span>Tambah</span>
    </label>
    <input type="file" id="foto-input" accept="image/*" multiple style="display:none" onchange="handleFotoInput(event)">
  `
  const fields = ['nama-produk','harga','deskripsi']
  fields.forEach(id => {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })
  document.getElementById('kategori').value = ''
  setToggle('kondisi-group', document.querySelector('#kondisi-group .tg-btn'))
  setToggle('tipe-group', document.querySelector('#tipe-group .tg-btn'))
}

async function postingProduk() {
  const { data: { session } } = await db.auth.getSession()
  if (!session) return alert('Kamu harus login dulu.')

  const nama = document.getElementById('nama-produk').value.trim()
  const deskripsi = document.getElementById('deskripsi').value.trim()
  const harga = parseInt(document.getElementById('harga').value)
  const kondisi = document.querySelector('#kondisi-group .tg-btn.active')?.textContent.trim().toLowerCase() === 'preloved' ? 'preloved' : 'baru'
  const kategori = document.getElementById('kategori').value
  const lokasi = document.getElementById('lokasi')?.value.trim() || 'Gresik'

  if (!nama || !harga) return alert('Nama produk dan harga wajib diisi.')

  const btnPosting = document.querySelector('.btnp')
  btnPosting.textContent = 'Memproses...'
  btnPosting.disabled = true

  let foto_urls = []
  for (let i = 0; i < fotoFiles.length; i++) {
    const file = fotoFiles[i]
    const compressed = await kompresiFoto(file)
    const fileName = `${session.user.id}/${Date.now()}_${i}.jpg`
    const { data, error } = await db.storage.from(BUCKET).upload(fileName, compressed, {
      contentType: 'image/jpeg',
      upsert: false
    })
    if (!error) {
      const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(fileName)
      foto_urls.push(urlData.publicUrl)
    }
  }

  const { error } = await db.from('products').insert({
    seller_id: session.user.id,
    nama, deskripsi, harga, kondisi, kategori,
    foto_urls, status: 'aktif'
  })

  btnPosting.textContent = 'Pasang iklan sekarang'
  btnPosting.disabled = false

  if (error) {
    alert('Gagal posting: ' + error.message)
    return
  }

  alert('Iklan berhasil dipasang!')
  showPage('page-home')
  loadProduk()
}

function setToggle(groupId, el) {
  if (!el) return
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
