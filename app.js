const { createClient } = supabase
const db = createClient(
  'https://gshstlssjlyefxxefspa.supabase.co',
  'sb_publishable_vwGZFBrtZRQIVpIVsYrQbg_SPYyl7me'
)

const BUCKET = 'foto produk'
let produkAktif = null
let fotoFiles = []
let fotoIndex = 0
let fotoList = []
let filterState = { sort: 'terbaru', kota: '', kondisi: '', minHarga: '', maxHarga: '' }

function showToast(pesan, tipe='sukses') {
  const warna = tipe==='sukses' ? 'linear-gradient(90deg,#C4789A,#9B7FD4)' : '#e53935'
  const icon = tipe==='sukses' ? 'ti-circle-check' : 'ti-alert-circle'
  const toast = document.createElement('div')
  toast.innerHTML = `<i class="ti ${icon}" style="font-size:18px"></i><span>${pesan}</span>`
  toast.style.cssText = `position:fixed;top:20px;left:50%;transform:translateX(-50%);background:${warna};color:#fff;padding:11px 18px;border-radius:12px;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;z-index:9999;white-space:nowrap;max-width:90vw;font-family:inherit;`
  document.body.appendChild(toast)
  setTimeout(() => { toast.style.opacity='0'; toast.style.transition='opacity .3s'; setTimeout(()=>toast.remove(),300) }, 2800)
}

let sesiAktif = null
let favoritSet = new Set()
const HALAMAN_WAJIB_LOGIN = ['page-jual', 'page-profil', 'page-chat-list', 'page-chat']

async function muatFavoritSaya(userId) {
  favoritSet = new Set()
  const { data } = await db.from('favorites').select('product_id').eq('user_id', userId)
  if (data) data.forEach(f => favoritSet.add(f.product_id))
}

async function toggleFavorit(productId) {
  if (!sesiAktif) {
    showToast('Login dulu untuk menyimpan ke favorit', 'error')
    showPage('page-login')
    return
  }
  const userId = sesiAktif.user.id
  const sudah = favoritSet.has(productId)
  if (sudah) {
    await db.from('favorites').delete().eq('user_id', userId).eq('product_id', productId)
    favoritSet.delete(productId)
  } else {
    await db.from('favorites').insert({ user_id: userId, product_id: productId })
    favoritSet.add(productId)
  }
  document.querySelectorAll(`.card-heart[data-pid="${productId}"]`).forEach(b => b.classList.toggle('on', favoritSet.has(productId)))
  showToast(favoritSet.has(productId) ? 'Ditambahkan ke favorit' : 'Dihapus dari favorit')
  if (document.getElementById('tab-favorit')?.classList.contains('active')) loadFavoritTab()
}

async function loadFavoritTab() {
  const list = document.getElementById('favorit-list')
  if (!list) return
  if (!sesiAktif) { list.innerHTML = '<p class="empty">Login dulu untuk lihat favorit.</p>'; return }
  list.innerHTML = '<p class="empty">Memuat favorit...</p>'
  const { data, error } = await db.from('favorites').select('product_id, products(*)').eq('user_id', sesiAktif.user.id).order('created_at', { ascending: false })
  if (error || !data || data.filter(f => f.products).length === 0) { list.innerHTML = '<p class="empty">Belum ada produk favorit.</p>'; return }
  list.innerHTML = data.filter(f => f.products).map(f => {
    const p = f.products
    const foto = p.foto_urls?.length > 0 ? `<img src="${p.foto_urls[0]}" alt="${p.nama}" style="width:100%;height:100%;object-fit:cover">` : `<i class="ti ti-package"></i>`
    return `<div class="produk-card" onclick="lihatDetail('${p.id}')">
      <div class="pimg">${foto}</div>
      <button class="card-heart on" data-pid="${p.id}" onclick="event.stopPropagation();toggleFavorit('${p.id}')"><i class="ti ti-heart"></i></button>
      <div class="pinfo">
        <span class="badge ${p.kondisi==='baru'?'b-baru':'b-preloved'}">${p.kondisi==='baru'?'Baru':'Preloved'}</span>
        <div class="pname">${p.nama}</div>
        <div class="pharga">Rp ${Number(p.harga).toLocaleString('id-ID')}</div>
      </div>
    </div>`
  }).join('')
}

async function cekSession() {
  const { data: { session } } = await db.auth.getSession()
  sesiAktif = session
  if (session) tampilHome(session.user)
  else tampilHomeGuest()
}

function tampilHomeGuest() {
  favoritSet = new Set()
  const avaEl = document.getElementById('user-ava')
  if (avaEl) avaEl.innerHTML = '<i class="ti ti-user" style="font-size:16px"></i>'
  const loginBtn = document.getElementById('topbar-login-btn')
  if (loginBtn) loginBtn.style.display = 'block'
  showPage('page-home')
  loadProduk()
}

async function tampilHome(user) {
  const nama = user.user_metadata?.full_name || user.email
  const inisial = nama.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()
  const userId = user.id
  const { data: userData } = await db.from('users').select('no_hp, foto_profil').eq('id', userId).single()
  const foto = userData?.foto_profil || user.user_metadata?.avatar_url
  const avaEl = document.getElementById('user-ava')
  if (avaEl) avaEl.innerHTML = foto ? `<img src="${foto}" alt="${nama}" style="width:100%;height:100%;object-fit:cover">` : inisial
  const loginBtn = document.getElementById('topbar-login-btn')
  if (loginBtn) loginBtn.style.display = 'none'
  const profilAva = document.getElementById('profil-ava')
  if (profilAva) profilAva.innerHTML = foto ? `<img src="${foto}" alt="${nama}" style="width:100%;height:100%;object-fit:cover">` : inisial
  const profilNama = document.getElementById('profil-nama')
  if (profilNama) profilNama.textContent = nama
  const profilEmail = document.getElementById('profil-email')
  if (profilEmail) profilEmail.textContent = user.email
  showPage('page-home')
  await muatFavoritSaya(user.id)
  loadProduk()
  setTimeout(cekChatBaru, 1000)
  setInterval(cekChatBaru, 30000)
  subscribeChatBadge(userId)
  if (!userData?.no_hp) {
    const popup = document.getElementById('popup-nohp')
    if (popup) popup.style.display = 'flex'
  }
}

async function simpanNoHp() {
  const hp = document.getElementById('popup-hp').value.trim()
  if (!hp) return showToast('No. HP wajib diisi', 'error')
  const { data: { session } } = await db.auth.getSession()
  if (!session) return
  const { error } = await db.from('users').update({ no_hp: hp }).eq('id', session.user.id)
  if (error) return showToast('Gagal menyimpan', 'error')
  document.getElementById('popup-nohp').style.display = 'none'
  showToast('No. HP berhasil disimpan!')
}

async function loginGoogle() {
  const { error } = await db.auth.signInWithOAuth({ provider:'google', options:{ redirectTo: window.location.origin } })
  if (error) showToast('Gagal login, coba lagi','error')
}

async function logout() {
  await db.auth.signOut()
  localStorage.removeItem('draft-iklan')
  sesiAktif = null
  tampilHomeGuest()
}

function showPage(id) {
  if (HALAMAN_WAJIB_LOGIN.includes(id) && !sesiAktif) {
    showToast('Login dulu untuk lanjut', 'error')
    id = 'page-login'
  }
  if (id !== 'page-jual') simpanDraftIklan()
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  document.getElementById(id).classList.add('active')
  window.scrollTo(0,0)
  if (id==='page-jual') setTimeout(()=>{ muatDraftIklan(); initFotoRow(); initProvinsiDropdown() }, 50)
  if (id==='page-chat-list') { loadChatList(); hapusBadgeChat() }
  if (id==='page-profil') loadIklanSaya()
}

function setNav(el) {
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('active'))
  el.classList.add('active')
}

function switchTab(el, tabId) {
  document.querySelectorAll('.profil-tab').forEach(t=>t.classList.remove('active'))
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'))
  el.classList.add('active')
  document.getElementById(tabId).classList.add('active')
  if (tabId==='tab-iklan') loadIklanSaya()
  if (tabId==='tab-favorit') loadFavoritTab()
  if (tabId==='tab-ulasan') loadUlasanSaya()
}

async function loadUlasanSaya() {
  const { data: { session } } = await db.auth.getSession()
  if (!session) return
  const list = document.getElementById('ulasan-list')
  const ringkasan = document.getElementById('ulasan-ringkasan')
  const sub = ringkasan?.nextElementSibling
  if (list) list.innerHTML = '<p class="empty">Memuat ulasan...</p>'
  const { data, error } = await db.from('ratings').select('rating, komentar, users!ratings_buyer_id_fkey(nama), orders(products(nama))').eq('seller_id', session.user.id).order('created_at',{ascending:false})
  if (error || !data) { if (list) list.innerHTML = '<p class="empty">Gagal memuat ulasan.</p>'; return }
  const jumlah = data.length
  const rerata = jumlah>0 ? (data.reduce((s,r)=>s+r.rating,0)/jumlah).toFixed(1) : '–'
  if (ringkasan) ringkasan.textContent = jumlah>0 ? `★ ${rerata}` : '–'
  if (sub) sub.textContent = `dari ${jumlah} ulasan`
  if (list) list.innerHTML = renderUlasanList(data)
}

function filterIklan(el, status) {
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'))
  el.classList.add('active')
  loadIklanSaya(status)
}

async function loadIklanSaya(status='') {
  const { data:{ session } } = await db.auth.getSession()
  if (!session) return
  const list = document.getElementById('iklan-saya-list')
  if (!list) return
  list.innerHTML = '<p class="empty">Memuat iklan...</p>'
  let query = db.from('products').select('*').eq('seller_id', session.user.id).order('created_at',{ascending:false})
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error || !data || data.length===0) { list.innerHTML='<p class="empty">Belum ada iklan.</p>'; return }
  list.innerHTML = data.map(p => {
    const foto = p.foto_urls?.length > 0 ? `<img src="${p.foto_urls[0]}" alt="${p.nama}" style="width:100%;height:100%;object-fit:cover">` : `<i class="ti ti-package" style="font-size:22px"></i>`
    const statusBadge = p.status==='aktif' ? `<span style="background:#E8F5E9;color:#2E7D32;font-size:10px;padding:2px 7px;border-radius:6px;font-weight:500">Aktif</span>`
      : p.status==='terjual' ? `<span style="background:#E3F2FD;color:#1565C0;font-size:10px;padding:2px 7px;border-radius:6px;font-weight:500">Terjual</span>`
      : `<span style="background:#FFEBEE;color:#c62828;font-size:10px;padding:2px 7px;border-radius:6px;font-weight:500">Dihapus</span>`
    const editBtn = p.status==='aktif' ? `<button class="btn-act btn-edit" onclick="editIklan('${p.id}')"><i class="ti ti-edit" style="font-size:11px"></i> Edit</button>` : ''
    const terjualBtn = p.status==='aktif' ? `<button class="btn-act btn-terjual" onclick="tandaiTerjual('${p.id}')"><i class="ti ti-check" style="font-size:11px"></i> Terjual</button>` : ''
    const hapusBtn = p.status!=='dihapus' ? `<button class="btn-act btn-hapus" onclick="hapusIklan('${p.id}')"><i class="ti ti-trash" style="font-size:11px"></i></button>` : ''
    return `<div class="iklan-list-card">
      <div class="iklan-list-foto">${foto}</div>
      <div class="iklan-list-info">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <div class="iklan-list-nama">${p.nama}</div>${statusBadge}
        </div>
        <div class="iklan-list-harga">Rp ${Number(p.harga).toLocaleString('id-ID')}</div>
        <div class="iklan-list-actions">${editBtn}${terjualBtn}${hapusBtn}</div>
      </div>
    </div>`
  }).join('')
}

async function tandaiTerjual(id) {
  const { data: orders } = await db.from('orders').select('id, buyer_id, users!orders_buyer_id_fkey(nama)').eq('product_id', id)
  const modal = document.getElementById('modal-pilih-pembeli')
  const content = document.getElementById('modal-pilih-pembeli-content')
  if (!orders || orders.length === 0) {
    if (!confirm('Belum ada yang chat soal produk ini. Tandai terjual tanpa pilih pembeli?')) return
    await simpanTerjual(id, null)
    return
  }
  let dipilih = null
  const renderList = () => `
    <div style="font-size:15px;font-weight:500;margin-bottom:4px">Siapa pembelinya?</div>
    <div style="font-size:12px;color:var(--tx2);margin-bottom:12px">Pilih dari yang pernah chat soal produk ini. Cuma orang yang dipilih yang nanti bisa kasih rating.</div>
    ${orders.map(o => `
      <div onclick="pilihPembeliSementara('${o.id}')" id="buyer-row-${o.id}" style="display:flex;align-items:center;gap:8px;padding:9px;border-radius:10px;cursor:pointer;border:1.5px solid ${dipilih===o.id?'#C4789A':'transparent'};background:${dipilih===o.id?'#FEF0F5':'transparent'};margin-bottom:4px">
        <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(90deg,#C4789A,#9B7FD4);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:500;flex-shrink:0">${(o.users?.nama||'?').split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}</div>
        <span style="font-size:13px">${o.users?.nama||'Pembeli'}</span>
      </div>`).join('')}
    <button id="btn-konfirmasi-pembeli" onclick="konfirmasiPembeli('${id}')" disabled style="width:100%;margin-top:10px;padding:11px;background:linear-gradient(90deg,#C4789A,#9B7FD4);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;opacity:0.5">Konfirmasi</button>
    <button onclick="tutupModalPembeli()" style="width:100%;margin-top:6px;padding:11px;background:transparent;color:var(--tx2);border:none;font-size:12px;cursor:pointer">Batal</button>`
  window._pembeliOrders = orders
  window._pembeliDipilih = null
  content.innerHTML = renderList()
  modal.style.display = 'flex'
}

function pilihPembeliSementara(orderId) {
  window._pembeliDipilih = orderId
  document.querySelectorAll('[id^="buyer-row-"]').forEach(el => {
    el.style.borderColor = 'transparent'
    el.style.background = 'transparent'
  })
  const row = document.getElementById(`buyer-row-${orderId}`)
  if (row) { row.style.borderColor = '#C4789A'; row.style.background = '#FEF0F5' }
  const btn = document.getElementById('btn-konfirmasi-pembeli')
  if (btn) { btn.disabled = false; btn.style.opacity = '1' }
}

function tutupModalPembeli() {
  document.getElementById('modal-pilih-pembeli').style.display = 'none'
}

async function konfirmasiPembeli(productId) {
  if (!window._pembeliDipilih) return
  await simpanTerjual(productId, window._pembeliDipilih)
}

async function simpanTerjual(productId, orderId) {
  const { error } = await db.from('products').update({ status:'terjual' }).eq('id', productId)
  if (orderId) await db.from('orders').update({ status:'selesai' }).eq('id', orderId)
  tutupModalPembeli()
  if (error) { showToast('Gagal mengupdate status','error'); return }
  showToast('Iklan ditandai terjual!')
  loadIklanSaya()
}

async function hapusIklan(id) {
  const { error } = await db.from('products').update({status:'dihapus'}).eq('id',id)
  if (error) { showToast('Gagal menghapus iklan','error'); return }
  showToast('Iklan berhasil dihapus')
  loadIklanSaya()
}

async function editIklan(id) {
  const { data: p, error } = await db.from('products').select('*').eq('id', id).single()
  if (error || !p) { showToast('Gagal memuat iklan','error'); return }
  document.getElementById('edit-id').value = p.id
  document.getElementById('edit-nama').value = p.nama || ''
  document.getElementById('edit-harga').value = p.harga || ''
  document.getElementById('edit-deskripsi').value = p.deskripsi || ''
  document.getElementById('edit-kategori').value = p.kategori || ''
  document.querySelectorAll('#edit-kondisi-group .tg-btn').forEach(btn => btn.classList.toggle('active', btn.textContent.trim().toLowerCase() === p.kondisi))
  const fotoWrap = document.getElementById('edit-foto-existing')
  fotoWrap.innerHTML = p.foto_urls?.map((f, i) => `
    <div style="position:relative;width:70px;height:70px;flex-shrink:0">
      <img src="${f}" style="width:70px;height:70px;object-fit:cover;border-radius:10px;border:0.5px solid var(--pkbr)">
      <button onclick="hapusFotoExisting(${i},'${id}')" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#e53935;color:#fff;border:none;cursor:pointer;font-size:14px;line-height:1;padding:0">×</button>
    </div>`).join('') || ''
  showPage('page-edit')
}

async function simpanEdit() {
  const id = document.getElementById('edit-id').value
  const nama = document.getElementById('edit-nama').value.trim()
  const harga = parseInt(document.getElementById('edit-harga').value)
  const deskripsi = document.getElementById('edit-deskripsi').value.trim()
  const kategori = document.getElementById('edit-kategori').value
  const kondisi = document.querySelector('#edit-kondisi-group .tg-btn.active')?.textContent.trim().toLowerCase() === 'preloved' ? 'preloved' : 'baru'
  if (!nama || !harga) return showToast('Nama dan harga wajib diisi','error')
  const btn = document.getElementById('btn-simpan-edit')
  btn.innerHTML = '<i class="ti ti-loader"></i> Menyimpan...'
  btn.disabled = true
  const { error } = await db.from('products').update({ nama, harga, deskripsi, kategori, kondisi }).eq('id', id)
  btn.innerHTML = '<i class="ti ti-check"></i> Simpan perubahan'
  btn.disabled = false
  if (error) { showToast('Gagal menyimpan','error'); return }
  showToast('Iklan berhasil diperbarui!')
  showPage('page-profil')
  loadIklanSaya()
}

async function hapusFotoExisting(index, id) {
  const { data: p } = await db.from('products').select('foto_urls').eq('id', id).single()
  if (!p) return
  const urls = [...(p.foto_urls || [])]
  urls.splice(index, 1)
  await db.from('products').update({ foto_urls: urls }).eq('id', id)
  editIklan(id)
}

let fotoProfilBaru = null

async function bukaEditProfil() {
  fotoProfilBaru = null
  const { data: { session } } = await db.auth.getSession()
  if (!session) return
  const { data: u } = await db.from('users').select('*').eq('id', session.user.id).single()
  const nama = u?.nama || session.user.user_metadata?.full_name || ''
  const foto = u?.foto_profil || session.user.user_metadata?.avatar_url
  const inisial = nama.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()
  const ava = document.getElementById('edit-profil-ava')
  if (ava) ava.innerHTML = foto ? `<img src="${foto}" style="width:100%;height:100%;object-fit:cover">` : inisial
  if (document.getElementById('ep-nama')) document.getElementById('ep-nama').value = nama
  if (document.getElementById('ep-email')) document.getElementById('ep-email').value = session.user.email
  if (document.getElementById('ep-hp')) document.getElementById('ep-hp').value = u?.no_hp || ''
  showPage('page-edit-profil')
}

function pilihFotoProfil(event) {
  const file = event.target.files[0]
  if (!file) return
  fotoProfilBaru = file
  const reader = new FileReader()
  reader.onload = e => {
    const ava = document.getElementById('edit-profil-ava')
    if (ava) ava.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover">`
  }
  reader.readAsDataURL(file)
}

async function simpanEditProfil() {
  const nama = document.getElementById('ep-nama').value.trim()
  const hp = document.getElementById('ep-hp').value.trim()
  if (!hp) return showToast('No. HP wajib diisi','error')
  const { data: { session } } = await db.auth.getSession()
  if (!session) return
  const btn = document.querySelector('#page-edit-profil .btnp')
  const btnHtmlAsli = btn.innerHTML
  btn.innerHTML = '<i class="ti ti-loader"></i> Menyimpan...'
  btn.disabled = true
  const updateData = { nama, no_hp: hp }
  if (fotoProfilBaru) {
    const compressed = await kompresiFoto(fotoProfilBaru)
    const fileName = `profil/${session.user.id}_${Date.now()}.jpg`
    const { error: upErr } = await db.storage.from(BUCKET).upload(fileName, compressed, { contentType:'image/jpeg' })
    if (!upErr) {
      const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(fileName)
      updateData.foto_profil = urlData.publicUrl
    }
  }
  const { error } = await db.from('users').update(updateData).eq('id', session.user.id)
  btn.innerHTML = btnHtmlAsli
  btn.disabled = false
  if (error) { showToast('Gagal menyimpan','error'); return }
  fotoProfilBaru = null
  if (updateData.foto_profil) {
    const avaEl = document.getElementById('user-ava')
    const profilAva = document.getElementById('profil-ava')
    if (avaEl) avaEl.innerHTML = `<img src="${updateData.foto_profil}" style="width:100%;height:100%;object-fit:cover">`
    if (profilAva) profilAva.innerHTML = `<img src="${updateData.foto_profil}" style="width:100%;height:100%;object-fit:cover">`
  }
  const profilNama = document.getElementById('profil-nama')
  if (profilNama) profilNama.textContent = nama
  showToast('Profil berhasil diperbarui!')
  showPage('page-profil')
}

function simpanDraftIklan() {
  const nama = document.getElementById('nama-produk')?.value||''
  const harga = document.getElementById('harga')?.value||''
  const deskripsi = document.getElementById('deskripsi')?.value||''
  const kategori = document.getElementById('kategori')?.value||''
  const lokasi = document.getElementById('lokasi')?.value||''
  const kondisi = document.querySelector('#kondisi-group .tg-btn.active')?.textContent.trim()||'Baru'
  const tipe = document.querySelector('#tipe-group .tg-btn.active')?.textContent.trim()||'Individu'
  if (nama||harga||deskripsi) localStorage.setItem('draft-iklan', JSON.stringify({nama,harga,deskripsi,kategori,lokasi,kondisi,tipe}))
}

function muatDraftIklan() {
  const draft = localStorage.getItem('draft-iklan')
  if (!draft) return
  const d = JSON.parse(draft)
  if (document.getElementById('nama-produk')) document.getElementById('nama-produk').value=d.nama||''
  if (document.getElementById('harga')) document.getElementById('harga').value=d.harga||''
  if (document.getElementById('deskripsi')) document.getElementById('deskripsi').value=d.deskripsi||''
  if (document.getElementById('kategori')) document.getElementById('kategori').value=d.kategori||''
  if (document.getElementById('lokasi')) document.getElementById('lokasi').value=d.lokasi||'Gresik'
  document.querySelectorAll('#kondisi-group .tg-btn').forEach(btn=>btn.classList.toggle('active',btn.textContent.trim()===d.kondisi))
  document.querySelectorAll('#tipe-group .tg-btn').forEach(btn=>btn.classList.toggle('active',btn.textContent.trim()===d.tipe))
}

function bersihkanForm() {
  localStorage.removeItem('draft-iklan')
  fotoFiles = []
  const fields = ['nama-produk','harga','deskripsi']
  fields.forEach(id => { const el=document.getElementById(id); if(el) el.value='' })
  const kat = document.getElementById('kategori'); if(kat) kat.value=''
  const prov = document.getElementById('lokasi-provinsi'); if(prov) { prov.value=''; updateKota('') }
  const tg1 = document.querySelector('#kondisi-group .tg-btn'); if(tg1) setToggle('kondisi-group',tg1)
  const tg2 = document.querySelector('#tipe-group .tg-btn'); if(tg2) setToggle('tipe-group',tg2)
  initFotoRow()
  showToast('Form dibersihkan')
}

function initFotoRow() {
  const row = document.getElementById('foto-row')
  if (!row) return
  if (fotoFiles.length>0) renderFotoPreview()
  else row.innerHTML=`<label for="foto-input" class="photo-add" style="cursor:pointer"><i class="ti ti-camera"></i><span>Tambah</span></label><input type="file" id="foto-input" accept="image/*" multiple style="display:none" onchange="handleFotoInput(event)">`
}

async function loadProduk(keyword='', kategori='') {
  const list = document.getElementById('produk-list')
  list.innerHTML='<p class="empty">Memuat iklan...</p>'
  let query = db.from('products').select('*, users(nama, kota)').eq('status','aktif')
  if (keyword) query=query.ilike('nama',`%${keyword}%`)
  if (kategori) query=query.eq('kategori',kategori)
  if (filterState.kota) query=query.eq('kota',filterState.kota)
  if (filterState.kondisi) query=query.eq('kondisi',filterState.kondisi)
  if (filterState.minHarga) query=query.gte('harga',parseInt(filterState.minHarga))
  if (filterState.maxHarga) query=query.lte('harga',parseInt(filterState.maxHarga))
  if (filterState.sort==='harga_asc') query=query.order('harga',{ascending:true})
  else if (filterState.sort==='harga_desc') query=query.order('harga',{ascending:false})
  else query=query.order('created_at',{ascending:false})
  const { data, error } = await query
  if (error || !data || data.length===0) { list.innerHTML='<p class="empty">Belum ada iklan di kotamu.</p>'; return }
  list.innerHTML=data.map(p=>{
    const foto=p.foto_urls?.length>0?`<img src="${p.foto_urls[0]}" alt="${p.nama}" style="width:100%;height:100%;object-fit:cover">`:`<i class="ti ti-package"></i>`
    return `<div class="produk-card" onclick="lihatDetail('${p.id}')">
      <div class="pimg">${foto}</div>
      <button class="card-heart ${favoritSet.has(p.id)?'on':''}" data-pid="${p.id}" onclick="event.stopPropagation();toggleFavorit('${p.id}')"><i class="ti ti-heart"></i></button>
      <div class="pinfo">
        <span class="badge ${p.kondisi==='baru'?'b-baru':'b-preloved'}">${p.kondisi==='baru'?'Baru':'Preloved'}</span>
        <div class="pname">${p.nama}</div>
        <div class="pharga">Rp ${Number(p.harga).toLocaleString('id-ID')}</div>
        <div class="ploc"><i class="ti ti-map-pin" style="font-size:10px"></i> ${p.kota||p.users?.kota||'Lokal'}</div>
      </div>
    </div>`
  }).join('')
}

function cariProduk() {
  const kw=document.getElementById('search')?.value||document.getElementById('search-desktop')?.value||''
  loadProduk(kw)
}

function bukaFavoritSaya() {
  showPage('page-profil')
  const tabBtn = document.querySelector('.profil-tab[onclick*="tab-favorit"]')
  if (tabBtn) switchTab(tabBtn, 'tab-favorit')
}

let _halamanSebelumLegal = 'page-login'
function bukaHalamanLegal(id) {
  const aktif = document.querySelector('.page.active')?.id
  if (aktif && aktif !== 'page-syarat' && aktif !== 'page-privasi') _halamanSebelumLegal = aktif
  showPage(id)
}
function tutupHalamanLegal() {
  showPage(_halamanSebelumLegal)
}

function kembaliBeranda() {
  filterState = { sort:'terbaru', kota:'', kondisi:'', minHarga:'', maxHarga:'' }
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'))
  document.querySelectorAll('.sb-item').forEach(c=>c.classList.remove('active'))
  const beranda = document.querySelector('.sb-item[data-nav="beranda"]')
  if (beranda) beranda.classList.add('active')
  const sd = document.getElementById('search-desktop'); if (sd) sd.value=''
  const sm = document.getElementById('search'); if (sm) sm.value=''
  showPage('page-home')
  loadProduk()
}

function filterKategori(el, kat) {
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'))
  document.querySelectorAll('.sb-item').forEach(c=>c.classList.remove('active'))
  if (el) el.classList.add('active')
  loadProduk('',kat)
}

function terapkanFilter() {
  filterState.sort = document.querySelector('#sort-group .tg-btn.active')?.dataset.val || 'terbaru'
  filterState.kota = document.getElementById('filter-kota')?.value || ''
  filterState.kondisi = document.querySelector('#kondisi-filter-group .tg-btn.active')?.dataset.val || ''
  filterState.minHarga = document.getElementById('filter-min')?.value || ''
  filterState.maxHarga = document.getElementById('filter-max')?.value || ''
  showPage('page-home')
  loadProduk()
}

function resetFilter() {
  filterState = { sort:'terbaru', kota:'', kondisi:'', minHarga:'', maxHarga:'' }
  document.getElementById('filter-kota').value = ''
  document.getElementById('filter-min').value = ''
  document.getElementById('filter-max').value = ''
  setToggle('sort-group', document.querySelector('#sort-group .tg-btn'))
  setToggle('kondisi-filter-group', document.querySelector('#kondisi-filter-group .tg-btn'))
  showToast('Filter direset')
}




function toggleSidebarKat(el) {
  const more = document.getElementById('sb-kat-more')
  const icon = el.querySelector('i')
  const label = el.querySelector('span')
  if (!more) return
  const isOpen = more.style.display === 'block'
  more.style.display = isOpen ? 'none' : 'block'
  icon.className = isOpen ? 'ti ti-chevron-down' : 'ti ti-chevron-up'
  label.textContent = isOpen ? 'Lihat semua kategori' : 'Sembunyikan'
}

function fokusSearch() {
  showPage('page-home')
  setTimeout(() => {
    const search = document.getElementById('search')
    if (search) { search.focus(); search.scrollIntoView({ behavior:'smooth' }) }
  }, 100)
}

function gantiFotoIndex(idx) {
  if (!fotoList.length) return
  fotoIndex=(idx+fotoList.length)%fotoList.length
  const utama=document.getElementById('foto-utama')
  if (utama) utama.src=fotoList[fotoIndex]
  document.querySelectorAll('.thumb-item').forEach((t,i)=>t.style.border=i===fotoIndex?'1.5px solid #9B7FD4':'0.5px solid var(--color-border-tertiary)')
  document.querySelectorAll('.foto-dot').forEach((d,i)=>{ d.style.width=i===fotoIndex?'12px':'6px'; d.style.background=i===fotoIndex?'#fff':'rgba(255,255,255,0.4)' })
}

function initSwipe(el) {
  let startX=0
  el.addEventListener('touchstart',e=>{startX=e.touches[0].clientX},{passive:true})
  el.addEventListener('touchend',e=>{const diff=startX-e.changedTouches[0].clientX; if(Math.abs(diff)>40) diff>0?gantiFotoIndex(fotoIndex+1):gantiFotoIndex(fotoIndex-1)},{passive:true})
}

async function toggleUlasanDetail(sellerId) {
  const box = document.getElementById('ulasan-detail-box')
  const chevron = document.getElementById('ulasan-chevron')
  if (!box) return
  const sedangTerbuka = box.style.display !== 'none'
  if (sedangTerbuka) {
    box.style.display = 'none'
    if (chevron) chevron.className = 'ti ti-chevron-down'
    return
  }
  box.style.display = 'block'
  if (chevron) chevron.className = 'ti ti-chevron-up'
  box.innerHTML = '<div style="font-size:12px;color:var(--tx3);padding:6px 0">Memuat ulasan...</div>'
  const { data } = await db.from('ratings').select('rating, komentar, users!ratings_buyer_id_fkey(nama), orders(products(nama))').eq('seller_id', sellerId).order('created_at',{ascending:false}).limit(10)
  box.innerHTML = `<div style="font-size:12px;font-weight:500;color:var(--color-text-primary);margin-bottom:2px">Ulasan pembeli</div>${renderUlasanList(data)}`
}

function renderUlasanList(data) {
  if (!data || data.length === 0) return `<div style="font-size:12px;color:var(--tx3);padding:8px 0">Belum ada ulasan.</div>`
  return data.map(r => {
    const nama = r.users?.nama || 'Pembeli'
    const produk = r.orders?.products?.nama || ''
    const bintangHtml = [1,2,3,4,5].map(i => `<i class="ti ${i<=r.rating?'ti-star-filled':'ti-star'}" style="font-size:11px;color:${i<=r.rating?'#F2A623':'#E7E1F2'}"></i>`).join('')
    return `<div style="padding:9px 0;border-bottom:0.5px solid var(--color-border-tertiary)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
        <span style="font-size:12px;font-weight:500;color:var(--color-text-primary)">${nama}</span>
        <span style="display:flex;gap:1px">${bintangHtml}</span>
      </div>
      ${produk?`<div style="font-size:10px;color:var(--tx3);margin-bottom:3px">Untuk: ${produk}</div>`:''}
      ${r.komentar?`<div style="font-size:12px;color:var(--tx2);line-height:1.4">${r.komentar}</div>`:''}
    </div>`
  }).join('')
}

async function lihatDetail(id) {
  const { data:p, error } = await db.from('products').select('*, users(nama, kota, foto_profil, no_hp)').eq('id',id).single()
  if (error||!p) { showToast('Gagal memuat iklan','error'); return }
  produkAktif = p
  fotoList=p.foto_urls?.length>0?p.foto_urls:[]
  fotoIndex=0
  const waktu=new Date(p.created_at)
  const selisihJam=Math.floor((Date.now()-waktu)/3600000)
  const waktuLabel=selisihJam<1?'Baru saja':selisihJam<24?`${selisihJam} jam lalu`:`${Math.floor(selisihJam/24)} hari lalu`
  const sellerAva=p.users?.foto_profil?`<img src="${p.users.foto_profil}" style="width:100%;height:100%;object-fit:cover">`:(p.users?.nama||'?').split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()
  const { data: ratingData } = await db.from('ratings').select('rating').eq('seller_id', p.seller_id)
  const ratingCount = ratingData?.length || 0
  const ratingAvg = ratingCount>0 ? (ratingData.reduce((s,r)=>s+r.rating,0)/ratingCount).toFixed(1) : null
  const ratingHtml = ratingCount>0
    ? `<div onclick="toggleUlasanDetail('${p.seller_id}')" style="font-size:10px;color:#F2A623;display:flex;align-items:center;gap:2px;cursor:pointer;width:fit-content"><i class="ti ti-star-filled" style="font-size:10px"></i>${ratingAvg} (${ratingCount} ulasan)<i class="ti ti-chevron-down" id="ulasan-chevron" style="font-size:11px;margin-left:1px"></i></div>`
    : `<div style="font-size:10px;color:var(--color-text-tertiary)">Belum ada ulasan</div>`
  const ulasanHtml = ratingCount>0 ? `<div id="ulasan-detail-box" style="display:none;border-top:0.5px solid var(--color-border-tertiary);margin:9px 0 0;padding-top:6px"></div>` : ''
  const noHp = p.users?.no_hp
  const waHtml = noHp ? `
    <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#25D366;margin-bottom:8px">
      <i class="ti ti-brand-whatsapp" style="font-size:16px"></i>${noHp}
    </div>
    <a href="https://wa.me/${noHp.replace(/\D/g,'')}" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:11px;background:#25D366;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;text-decoration:none;margin-bottom:8px">
      <i class="ti ti-brand-whatsapp"></i>Chat via WhatsApp
    </a>` : ''
  const fotoUtamaHtml=fotoList.length>0?`<img id="foto-utama" src="${fotoList[0]}" alt="${p.nama}" style="width:100%;height:100%;object-fit:contain">`:`<i class="ti ti-package" style="font-size:48px;color:#9B7FD4"></i>`
  const dotsHtml=fotoList.length>1?`<div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);display:flex;gap:4px;pointer-events:none">${fotoList.map((_,i)=>`<div class="foto-dot" onclick="gantiFotoIndex(${i})" style="width:${i===0?'12px':'6px'};height:6px;border-radius:3px;background:${i===0?'#fff':'rgba(255,255,255,0.4)'};cursor:pointer;pointer-events:all;transition:all .2s"></div>`).join('')}</div>`:''
  const thumbsHtml=fotoList.length>1?`<div style="display:flex;gap:6px;padding:8px 12px;overflow-x:auto;background:var(--color-background-primary);border-bottom:0.5px solid var(--color-border-tertiary)">${fotoList.map((f,i)=>`<div class="thumb-item" onclick="gantiFotoIndex(${i})" style="width:60px;height:52px;border-radius:8px;overflow:hidden;border:${i===0?'1.5px solid #9B7FD4':'0.5px solid var(--color-border-tertiary)'};cursor:pointer;flex-shrink:0"><img src="${f}" style="width:100%;height:100%;object-fit:cover"></div>`).join('')}</div>`:''
  const infoHtml=`<div style="padding:10px 14px;background:var(--color-background-primary);margin-bottom:6px">
    <span class="badge ${p.kondisi==='baru'?'b-baru':'b-preloved'}">${p.kondisi==='baru'?'Baru':'Preloved'}</span>
    <div style="font-size:16px;font-weight:500;color:var(--color-text-primary);margin:5px 0 4px;line-height:1.3">${p.nama}</div>
    <div style="font-size:22px;font-weight:500;color:#C4789A;margin-bottom:5px">Rp ${Number(p.harga).toLocaleString('id-ID')}</div>
    <div style="font-size:11px;color:var(--color-text-tertiary);display:flex;align-items:center;gap:5px">
      <i class="ti ti-map-pin" style="font-size:11px"></i>${p.kota||p.users?.kota||'Lokal'}<span>·</span><i class="ti ti-clock" style="font-size:11px"></i>${waktuLabel}
    </div>
    <div style="border-top:0.5px solid var(--color-border-tertiary);margin:9px 0"></div>
    <div style="display:flex;align-items:center;gap:9px;margin-bottom:8px">
      <div style="width:34px;height:34px;border-radius:50%;background:#FEF0F5;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500;color:#9B3060;flex-shrink:0;overflow:hidden">${sellerAva}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:500;color:var(--color-text-primary)">${p.users?.nama||'Penjual'}</div>
        <div style="font-size:10px;color:#9B7FD4;display:flex;align-items:center;gap:2px"><i class="ti ti-shield-check" style="font-size:10px"></i>Terverifikasi · ${p.kota||p.users?.kota||'Lokal'}</div>
        ${ratingHtml}
      </div>
    </div>
    ${ulasanHtml}
    ${waHtml}
    ${p.deskripsi?`<div style="border-top:0.5px solid var(--color-border-tertiary);margin:9px 0"></div>
    <div id="desc-text" style="font-size:12px;color:var(--color-text-secondary);line-height:1.6;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${p.deskripsi}</div>
    <div onclick="toggleDesc()" id="desc-toggle" style="font-size:11px;color:#9B7FD4;font-weight:500;margin-top:3px;cursor:pointer">Lihat selengkapnya</div>`:''}
  </div>`
  const layananHtml=`<div style="padding:0 14px 6px">
    <div style="font-size:11px;font-weight:500;color:var(--color-text-secondary);margin-bottom:6px">Layanan tambahan (opsional)</div>
    <div style="display:flex;gap:6px;margin-bottom:10px">
      <div id="card-cek" onclick="toggleLayanan('cek')" style="flex:1;background:var(--color-background-primary);border-radius:10px;border:0.5px solid var(--color-border-tertiary);padding:9px 10px;cursor:pointer">
        <span style="background:#F3EEFB;color:#6B3FA0;font-size:9px;padding:2px 6px;border-radius:6px;font-weight:500;display:inline-block;margin-bottom:3px">NitipCek</span>
        <div style="font-size:11px;font-weight:500;color:var(--color-text-primary);margin-bottom:5px">Verifikasi barang</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:11px;color:#C4789A;font-weight:500">Rp 10.000</div>
          <div id="tog-cek" style="width:28px;height:15px;border-radius:8px;background:var(--color-border-secondary);position:relative;transition:background .2s;flex-shrink:0"><div style="position:absolute;top:2px;left:2px;width:11px;height:11px;background:#fff;border-radius:50%;transition:left .2s"></div></div>
        </div>
      </div>
      <div id="card-go" onclick="toggleLayanan('go')" style="flex:1;background:var(--color-background-primary);border-radius:10px;border:0.5px solid var(--color-border-tertiary);padding:9px 10px;cursor:pointer">
        <span style="background:#E3F2FD;color:#1565C0;font-size:9px;padding:2px 6px;border-radius:6px;font-weight:500;display:inline-block;margin-bottom:3px">NitipKirim</span>
        <div style="font-size:11px;font-weight:500;color:var(--color-text-primary);margin-bottom:5px">Antar ke rumahku</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:11px;color:#C4789A;font-weight:500">Sesuai jarak</div>
          <div id="tog-go" style="width:28px;height:15px;border-radius:8px;background:var(--color-border-secondary);position:relative;transition:background .2s;flex-shrink:0"><div style="position:absolute;top:2px;left:2px;width:11px;height:11px;background:#fff;border-radius:50%;transition:left .2s"></div></div>
        </div>
      </div>
    </div>
    <button onclick="hubungiSeller()" style="width:100%;padding:13px;background:linear-gradient(90deg,#C4789A,#9B7FD4);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:500;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;font-family:inherit;margin-bottom:16px">
      <i class="ti ti-message"></i>Hubungi via NitipJual
    </button>
  </div>`
  const isDesktop=window.innerWidth>=768
  if (isDesktop) {
    document.getElementById('detail-content').innerHTML=`<div style="display:flex;gap:20px;max-width:1100px;margin:0 auto;padding:20px;align-items:flex-start">
      <div style="width:420px;flex-shrink:0">
        <div style="width:100%;height:320px;background:#F3EEFB;display:flex;align-items:center;justify-content:center;border-radius:12px;overflow:hidden;position:relative;border:0.5px solid var(--color-border-tertiary)">
          ${fotoUtamaHtml}
          ${fotoList.length>1?`<button onclick="gantiFotoIndex(fotoIndex-1)" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.9);border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center"><i class="ti ti-chevron-left"></i></button><button onclick="gantiFotoIndex(fotoIndex+1)" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.9);border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center"><i class="ti ti-chevron-right"></i></button>`:''}
        </div>
        ${fotoList.length>1?`<div style="display:flex;gap:6px;margin-top:8px;overflow-x:auto">${fotoList.map((f,i)=>`<div class="thumb-item" onclick="gantiFotoIndex(${i})" style="width:64px;height:56px;border-radius:8px;overflow:hidden;border:${i===0?'1.5px solid #9B7FD4':'0.5px solid var(--color-border-tertiary)'};cursor:pointer;flex-shrink:0"><img src="${f}" style="width:100%;height:100%;object-fit:cover"></div>`).join('')}</div>`:''}
      </div>
      <div style="flex:1;min-width:0">
        ${infoHtml.replace('padding:10px 14px','padding:0').replace('margin-bottom:6px','')}
        ${layananHtml.replace('padding:0 14px 6px','padding:10px 0 6px')}
      </div>
    </div>`
  } else {
    document.getElementById('detail-content').innerHTML=`
      <div style="width:100%;height:280px;background:#F3EEFB;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">
        ${fotoUtamaHtml}${dotsHtml}
      </div>
      ${thumbsHtml}${infoHtml}${layananHtml}`
    const fotoWrap=document.querySelector('#detail-content > div:first-child')
    if (fotoWrap) initSwipe(fotoWrap)
  }
  showPage('page-detail')
}

function toggleDesc() {
  const desc=document.getElementById('desc-text')
  const toggle=document.getElementById('desc-toggle')
  if (!desc) return
  const collapsed=desc.style.webkitLineClamp!=='unset'
  desc.style.webkitLineClamp=collapsed?'unset':'3'
  desc.style.overflow=collapsed?'visible':'hidden'
  toggle.textContent=collapsed?'Sembunyikan':'Lihat selengkapnya'
}

function toggleLayanan(type) {
  const card=document.getElementById(`card-${type}`)
  const tog=document.getElementById(`tog-${type}`)
  if (!card||!tog) return
  const dot=tog.querySelector('div')
  const isOn=tog.dataset.on==='1'
  tog.dataset.on=isOn?'0':'1'
  tog.style.background=isOn?'var(--color-border-secondary)':'#9B7FD4'
  dot.style.left=isOn?'2px':'15px'
  card.style.border=isOn?'0.5px solid var(--color-border-tertiary)':'1.5px solid #9B7FD4'
  card.style.background=isOn?'var(--color-background-primary)':'#FAF5FF'
}

async function hubungiSeller() {
  if (!produkAktif) return
  const { data: { session } } = await db.auth.getSession()
  if (!session) return showToast('Kamu harus login dulu','error')
  const p = produkAktif
  const buyerId = session.user.id
  const sellerId = p.seller_id
  if (buyerId === sellerId) return showToast('Ini iklanmu sendiri','error')
  let { data: order } = await db.from('orders').select('id,buyer_id,seller_id').eq('product_id',p.id).eq('buyer_id',buyerId).maybeSingle()
  if (!order) {
    const kode='NTJ-'+Math.random().toString(36).substring(2,8).toUpperCase()
    const { data: newOrder } = await db.from('orders').insert({ kode, buyer_id:buyerId, seller_id:sellerId, product_id:p.id, status:'negosiasi', harga_deal:p.harga }).select().single()
    order = newOrder
  }
  if (!order) return showToast('Gagal membuka chat','error')
  bukaChat(order.id, p)
}

let chatOrderId = null
let chatSubscription = null

async function bukaChat(orderId, produk) {
  chatOrderId = orderId
  const { data: { session } } = await db.auth.getSession()
  const userId = session.user.id
  const sellerNama = produk.users?.nama || produk.nama_seller || 'Penjual'
  document.getElementById('chat-nama').textContent = sellerNama
  document.getElementById('chat-produk').textContent = produk.nama
  const ava = document.getElementById('chat-ava')
  ava.textContent = sellerNama.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()
  await loadPesan(orderId, userId)
  tandaiSudahBaca()
  if (chatSubscription) chatSubscription.unsubscribe()
  chatSubscription = db.channel('chat-'+orderId)
    .on('postgres_changes',{ event:'INSERT', schema:'public', table:'chats', filter:`order_id=eq.${orderId}` }, payload => { tampilPesan(payload.new, userId) })
    .subscribe()
  showPage('page-chat')
  initChatKeyboardFix()
  cekBannerRating(orderId, userId)
}

async function cekBannerRating(orderId, userId) {
  const banner = document.getElementById('chat-rating-banner')
  banner.style.display = 'none'
  const { data: order } = await db.from('orders').select('status, buyer_id, seller_id').eq('id', orderId).single()
  if (!order || order.status !== 'selesai' || order.buyer_id !== userId) return
  const { data: existing } = await db.from('ratings').select('rating').eq('order_id', orderId).maybeSingle()
  if (existing) {
    banner.innerHTML = `<div style="background:#FEF0F5;padding:10px 14px;font-size:12px;color:#9B3060;display:flex;align-items:center;gap:6px"><i class="ti ti-star-filled" style="color:#F2A623"></i>Kamu udah kasih rating ${existing.rating} bintang buat transaksi ini</div>`
    banner.style.display = 'block'
    return
  }
  window._ratingSementara = 0
  banner.innerHTML = `
    <div style="background:#FEF0F5;padding:12px 14px;border-bottom:0.5px solid #F5C0D5">
      <div style="font-size:12px;font-weight:500;color:#9B3060;margin-bottom:6px">Transaksi ini ditandai selesai. Beri rating buat sellernya?</div>
      <div id="rating-stars" style="display:flex;gap:4px;margin-bottom:6px"></div>
      <textarea id="rating-komentar" placeholder="Ceritain pengalaman chat/nego sama sellernya..." style="width:100%;border:0.5px solid #F5C0D5;border-radius:8px;padding:7px;font-size:12px;font-family:inherit;height:44px;resize:none;margin-bottom:6px"></textarea>
      <button onclick="kirimRating('${orderId}','${order.seller_id}','${userId}')" style="width:100%;padding:8px;background:linear-gradient(90deg,#C4789A,#9B7FD4);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer">Kirim rating</button>
    </div>`
  renderRatingStars(0)
  banner.style.display = 'block'
}

function renderRatingStars(n) {
  window._ratingSementara = n
  const el = document.getElementById('rating-stars')
  if (!el) return
  el.innerHTML = [1,2,3,4,5].map(i => `<i class="ti ${i<=n?'ti-star-filled':'ti-star'}" onclick="renderRatingStars(${i})" style="font-size:22px;color:${i<=n?'#F2A623':'#E7E1F2'};cursor:pointer"></i>`).join('')
}

async function kirimRating(orderId, sellerId, buyerId) {
  const rating = window._ratingSementara || 0
  if (!rating) { showToast('Pilih bintangnya dulu','error'); return }
  const komentar = document.getElementById('rating-komentar')?.value.trim() || ''
  const { error } = await db.from('ratings').insert({ order_id: orderId, seller_id: sellerId, buyer_id: buyerId, rating, komentar })
  if (error) { showToast('Gagal mengirim rating','error'); return }
  showToast('Terima kasih atas ratingnya!')
  cekBannerRating(orderId, buyerId)
}

function scrollChatKeBawah() {
  const box = document.getElementById('chat-messages')
  if (box) box.scrollTop = box.scrollHeight
}

// Paksa tinggi halaman chat ngikutin tinggi layar yang BENERAN kelihatan
// (visualViewport), karena di banyak browser HP unit CSS 100dvh tidak
// otomatis menyusut saat keyboard muncul untuk elemen position:fixed.
function resizeChatPageUtkKeyboard() {
  const chatPage = document.getElementById('page-chat')
  if (!chatPage || !chatPage.classList.contains('active')) return
  if (!window.visualViewport) { scrollChatKeBawah(); return }
  const vh = window.visualViewport.height
  chatPage.style.height = vh + 'px'
  chatPage.style.maxHeight = vh + 'px'
  chatPage.style.top = window.visualViewport.offsetTop + 'px'
  window.scrollTo(0, 0)
  scrollChatKeBawah()
}

function resetChatPageStyle() {
  const chatPage = document.getElementById('page-chat')
  if (!chatPage) return
  chatPage.style.height = ''
  chatPage.style.maxHeight = ''
  chatPage.style.top = ''
}

let chatKeyboardFixReady = false
function initChatKeyboardFix() {
  const input = document.getElementById('chat-input')
  if (!input) return

  input.addEventListener('focus', () => {
    setTimeout(resizeChatPageUtkKeyboard, 50)
    setTimeout(resizeChatPageUtkKeyboard, 300)
  })
  input.addEventListener('blur', () => {
    setTimeout(resetChatPageStyle, 100)
  })

  // Pasang sekali saja walau bukaChat dipanggil berkali-kali
  if (!chatKeyboardFixReady && window.visualViewport) {
    window.visualViewport.addEventListener('resize', resizeChatPageUtkKeyboard)
    window.visualViewport.addEventListener('scroll', resizeChatPageUtkKeyboard)
    chatKeyboardFixReady = true
  }
}

async function loadPesan(orderId, userId) {
  const box = document.getElementById('chat-messages')
  box.innerHTML = ''
  const { data, error } = await db.from('chats').select('*').eq('order_id',orderId).order('created_at',{ascending:true})
  if (error || !data) return
  data.forEach(msg => tampilPesan(msg, userId))
  box.scrollTop = box.scrollHeight
}

function tampilPesan(msg, userId) {
  const box = document.getElementById('chat-messages')
  const isMine = msg.sender_id === userId
  const waktu = new Date(msg.created_at)
  const jam = waktu.getHours()+':'+String(waktu.getMinutes()).padStart(2,'0')
  const div = document.createElement('div')
  div.style.cssText = `display:flex;flex-direction:column;align-items:${isMine?'flex-end':'flex-start'}`
  div.innerHTML = `
    <div style="max-width:75%;padding:9px 12px;border-radius:${isMine?'12px 12px 3px 12px':'12px 12px 12px 3px'};background:${isMine?'linear-gradient(90deg,#C4789A,#9B7FD4)':'var(--color-background-primary)'};color:${isMine?'#fff':'var(--color-text-primary)'};font-size:13px;line-height:1.4;border:${isMine?'none':'0.5px solid var(--color-border-tertiary)'}">${msg.pesan}</div>
    <div style="font-size:10px;color:var(--color-text-tertiary);margin-top:3px">${jam}</div>`
  box.appendChild(div)
  box.scrollTop = box.scrollHeight
}

async function kirimPesan() {
  const input = document.getElementById('chat-input')
  const pesan = input.value.trim()
  if (!pesan || !chatOrderId) return
  const { data: { session } } = await db.auth.getSession()
  if (!session) return
  input.value = ''
  const { error } = await db.from('chats').insert({ order_id:chatOrderId, sender_id:session.user.id, dari:'buyer', pesan })
  if (error) showToast('Gagal mengirim pesan','error')
}

async function loadChatList() {
  const { data: { session } } = await db.auth.getSession()
  if (!session) return
  const userId = session.user.id
  const container = document.getElementById('chat-list-content')
  if (!container) return
  container.innerHTML = '<p class="empty">Memuat chat...</p>'

  const lastSeen = localStorage.getItem('last-seen-chat') || '1970-01-01'

  const { data, error } = await db.from('orders')
    .select('id, kode, status, harga_deal, seller_id, buyer_id, products(nama, foto_urls), seller:users!orders_seller_id_fkey(nama, foto_profil), buyer:users!orders_buyer_id_fkey(nama, foto_profil)')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('created_at',{ascending:false})

  if (error || !data || data.length===0) { container.innerHTML='<p class="empty">Belum ada chat.</p>'; return }

  const orderIds = data.map(o => o.id)
  const { data: unreadChats } = await db.from('chats')
    .select('order_id, created_at')
    .in('order_id', orderIds)
    .neq('sender_id', userId)
    .gt('created_at', lastSeen)

  const unreadMap = {}
  if (unreadChats) {
    unreadChats.forEach(c => {
      unreadMap[c.order_id] = (unreadMap[c.order_id] || 0) + 1
    })
  }

  const { data: lastMsgs } = await db.from('chats')
    .select('order_id, pesan, sender_id, created_at')
    .in('order_id', orderIds)
    .order('created_at', {ascending: false})

  const lastMsgMap = {}
  if (lastMsgs) {
    lastMsgs.forEach(m => {
      if (!lastMsgMap[m.order_id]) lastMsgMap[m.order_id] = m
    })
  }

  const unreadItems = data.filter(o => unreadMap[o.id])
  const readItems = data.filter(o => !unreadMap[o.id])

  const renderItem = (o) => {
    const isSeller = o.seller_id === userId
    const lawan = isSeller ? o.buyer : o.seller
    const lawanNama = lawan?.nama || 'Pengguna'
    const lawanAva = lawanNama.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()
    const produkNama = o.products?.nama || 'Produk'
    const roleLabel = isSeller ? 'Pembeli' : 'Penjual'
    const unreadCount = unreadMap[o.id] || 0
    const lastMsg = lastMsgMap[o.id]
    const isUnread = unreadCount > 0

    const waktu = lastMsg ? (() => {
      const d = new Date(lastMsg.created_at)
      const now = new Date()
      const diff = Math.floor((now - d) / 86400000)
      if (diff === 0) return d.getHours()+':'+String(d.getMinutes()).padStart(2,'0')
      if (diff === 1) return 'Kemarin'
      return d.toLocaleDateString('id-ID',{day:'numeric',month:'short'})
    })() : ''

    return `<div onclick="bukaOrder('${o.id}')" style="
      background:${isUnread ? '#FEF0F5' : 'var(--color-background-primary)'};
      border-radius:12px;
      border:${isUnread ? '0.5px solid #F5C0D5' : '0.5px solid var(--color-border-tertiary)'};
      padding:12px;display:flex;gap:10px;margin-bottom:8px;cursor:pointer;align-items:center">
      <div style="width:44px;height:44px;border-radius:50%;background:${isUnread?'#FEF0F5':'#F3EEFB'};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:500;color:${isUnread?'#9B3060':'#6B3FA0'};flex-shrink:0;overflow:hidden">
        ${lawan?.foto_profil?`<img src="${lawan.foto_profil}" style="width:100%;height:100%;object-fit:cover">`:lawanAva}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:${isUnread?'700':'500'};color:var(--color-text-primary);margin-bottom:2px">
          ${lawanNama} <span style="font-size:10px;color:var(--color-text-tertiary);font-weight:400">(${roleLabel})</span>
        </div>
        <div style="font-size:11px;color:var(--color-text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:2px">${produkNama}</div>
        ${lastMsg ? `<div style="font-size:10px;color:${isUnread?'#9B3060':'var(--color-text-muted)'};font-weight:${isUnread?'500':'400'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${lastMsg.sender_id===userId?'Kamu: ':''}${lastMsg.pesan}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
        <div style="font-size:9px;color:${isUnread?'#C4789A':'var(--color-text-tertiary)'};font-weight:${isUnread?'500':'400'}">${waktu}</div>
        ${isUnread ? `<div style="min-width:18px;height:18px;border-radius:9px;background:linear-gradient(90deg,#C4789A,#9B7FD4);color:#fff;font-size:9px;font-weight:500;display:flex;align-items:center;justify-content:center;padding:0 5px">${unreadCount}</div>` : `<div style="font-size:11px;font-weight:500;color:#C4789A">Rp ${Number(o.harga_deal||0).toLocaleString('id-ID')}</div>`}
      </div>
    </div>`
  }

  let html = ''
  if (unreadItems.length > 0) {
    html += `<div style="font-size:11px;font-weight:500;color:var(--color-text-secondary);margin-bottom:6px;padding:0 2px">Pesan baru</div>`
    html += unreadItems.map(renderItem).join('')
    if (readItems.length > 0) {
      html += `<div style="font-size:11px;font-weight:500;color:var(--color-text-secondary);margin:10px 0 6px;padding:0 2px">Sudah dibaca</div>`
      html += readItems.map(renderItem).join('')
    }
  } else {
    html += data.map(renderItem).join('')
  }

  container.innerHTML = html
}

async function bukaOrder(orderId) {
  const { data: o } = await db.from('orders').select('*, products(nama, foto_urls, users(nama)), users!orders_seller_id_fkey(nama)').eq('id',orderId).single()
  if (!o) return
  const p = { ...o.products, seller_id:o.seller_id, users:o.products?.users }
  produkAktif = p
  bukaChat(orderId, p)
}


let audioCtx = null

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

function bunyiNotifikasi() {
  try {
    const ctx = getAudioCtx()
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.8, t + 0.01)
    gain.gain.linearRampToValueAtTime(0, t + 0.15)
    osc.frequency.setValueAtTime(880, t)
    osc.frequency.setValueAtTime(1100, t + 0.08)
    osc.start(t)
    osc.stop(t + 0.15)
    setTimeout(() => {
      const t2 = ctx.currentTime
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.type = 'sine'
      gain2.gain.setValueAtTime(0, t2)
      gain2.gain.linearRampToValueAtTime(0.6, t2 + 0.01)
      gain2.gain.linearRampToValueAtTime(0, t2 + 0.2)
      osc2.frequency.setValueAtTime(1320, t2)
      osc2.start(t2)
      osc2.stop(t2 + 0.2)
    }, 150)
  } catch(e) { console.log('Audio not supported') }
}

let chatBadgeChannel = null

function subscribeChatBadge(userId) {
  if (chatBadgeChannel) { chatBadgeChannel.unsubscribe(); chatBadgeChannel = null }
  chatBadgeChannel = db.channel('badge-chat-' + userId)
  chatBadgeChannel.on('postgres_changes',{ event:'INSERT', schema:'public', table:'chats' }, payload => {
    if (payload.new.sender_id !== userId) {
      cekChatBaru()
      bunyiNotifikasi()
      if (document.getElementById('page-chat-list')?.classList.contains('active')) {
        loadChatList()
      }
    }
  }).subscribe()
}

async function cekChatBaru() {
  const { data: { session } } = await db.auth.getSession()
  if (!session) return
  const userId = session.user.id
  const { data: orders } = await db.from('orders').select('id').or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
  if (!orders || orders.length===0) return
  const orderIds = orders.map(o=>o.id)
  const lastSeen = localStorage.getItem('last-seen-chat') || '1970-01-01'
  const { data: newChats } = await db.from('chats').select('id').in('order_id',orderIds).neq('sender_id',userId).gt('created_at',lastSeen)
  const ada = newChats && newChats.length > 0
  const badges = ['badge-chat-topbar','badge-chat-sidebar','badge-chat-mobile']
  badges.forEach(id => { const el=document.getElementById(id); if(el) el.style.display=ada?'block':'none' })
}

function hapusBadgeChat() {
  const badges = ['badge-chat-topbar','badge-chat-sidebar','badge-chat-mobile']
  badges.forEach(id => { const el=document.getElementById(id); if(el) el.style.display='none' })
}

function tandaiSudahBaca() {
  localStorage.setItem('last-seen-chat', new Date().toISOString())
}




function toggleLokasiDesktop() {
  const dd = document.getElementById('lokasi-desktop-dropdown')
  if (!dd) return
  dd.style.display = dd.style.display === 'none' ? 'block' : 'none'
}

function pilihLokasiDesktop(kota, label) {
  const lbl = document.getElementById('lokasi-desktop-label')
  if (lbl) lbl.textContent = label
  filterState.kota = kota
  const dd = document.getElementById('lokasi-desktop-dropdown')
  if (dd) dd.style.display = 'none'
  loadProduk(document.getElementById('search-desktop')?.value || '')
}

function toggleSidebarKat(el) {
  const more = document.getElementById('sb-kat-more')
  const icon = el.querySelector('i')
  const label = el.querySelector('span')
  if (!more) return
  const isOpen = more.style.display === 'block'
  more.style.display = isOpen ? 'none' : 'block'
  icon.className = isOpen ? 'ti ti-chevron-down' : 'ti ti-chevron-up'
  label.textContent = isOpen ? 'Lihat semua kategori' : 'Sembunyikan'
}

function fokusSearch() {
  showPage('page-home')
  setTimeout(() => {
    const search = document.getElementById('search')
    if (search) { search.focus(); search.scrollIntoView({behavior:'smooth'}) }
  }, 100)
}

function handleFotoInput(event) {
  const files=Array.from(event.target.files)
  fotoFiles=[...fotoFiles,...files.slice(0,5-fotoFiles.length)]
  renderFotoPreview()
}

function renderFotoPreview() {
  const row=document.getElementById('foto-row')
  if (!row) return
  const previews=fotoFiles.map((file,i)=>{
    const url=URL.createObjectURL(file)
    return `<div style="position:relative;width:70px;height:70px;flex-shrink:0"><img src="${url}" style="width:70px;height:70px;object-fit:cover;border-radius:10px;border:0.5px solid var(--pkbr)"><button onclick="hapusFoto(${i})" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#e53935;color:#fff;border:none;cursor:pointer;font-size:14px;line-height:1;padding:0">×</button></div>`
  }).join('')
  const tambah=fotoFiles.length<5?`<label for="foto-input" class="photo-add" style="cursor:pointer"><i class="ti ti-camera"></i><span>Tambah</span></label><input type="file" id="foto-input" accept="image/*" multiple style="display:none" onchange="handleFotoInput(event)">`:''
  row.innerHTML=previews+tambah
}

function hapusFoto(index) { fotoFiles.splice(index,1); renderFotoPreview() }

async function kompresiFoto(file) {
  return new Promise(resolve=>{
    const reader=new FileReader()
    reader.onload=e=>{
      const img=new Image()
      img.onload=()=>{
        const canvas=document.createElement('canvas')
        let w=img.width,h=img.height
        if(w>800){h=h*800/w;w=800}
        canvas.width=w;canvas.height=h
        canvas.getContext('2d').drawImage(img,0,0,w,h)
        canvas.toBlob(blob=>resolve(blob),'image/jpeg',0.75)
      }
      img.src=e.target.result
    }
    reader.readAsDataURL(file)
  })
}

async function postingProduk() {
  const { data:{session} } = await db.auth.getSession()
  if (!session) return showToast('Kamu harus login dulu','error')
  const nama=document.getElementById('nama-produk').value.trim()
  const deskripsi=document.getElementById('deskripsi').value.trim()
  const harga=parseInt(document.getElementById('harga').value)
  const kondisi=document.querySelector('#kondisi-group .tg-btn.active')?.textContent.trim().toLowerCase()==='preloved'?'preloved':'baru'
  const kategori=document.getElementById('kategori').value
  const lokasi=document.getElementById('lokasi')?.value.trim()||document.getElementById('lokasi-provinsi')?.value.trim()||''
  if (!nama||!harga) return showToast('Nama produk dan harga wajib diisi','error')
  if (!lokasi) return showToast('Pilih lokasi iklan dulu','error')
  const btn=document.querySelector('#page-jual .btnp')
  btn.innerHTML='<i class="ti ti-loader"></i> Memproses...'
  btn.disabled=true
  let foto_urls=[]
  for (let i=0;i<fotoFiles.length;i++) {
    const compressed=await kompresiFoto(fotoFiles[i])
    const fileName=`${session.user.id}/${Date.now()}_${i}.jpg`
    const {error:upErr}=await db.storage.from(BUCKET).upload(fileName,compressed,{contentType:'image/jpeg'})
    if (!upErr) { const {data:urlData}=db.storage.from(BUCKET).getPublicUrl(fileName); foto_urls.push(urlData.publicUrl) }
  }
  const {error}=await db.from('products').insert({seller_id:session.user.id,nama,deskripsi,harga,kondisi,kategori,foto_urls,status:'aktif',kota:lokasi})
  btn.innerHTML='<i class="ti ti-speakerphone"></i> Pasang iklan sekarang'
  btn.disabled=false
  if (error) { showToast('Gagal memposting iklan','error'); return }
  localStorage.removeItem('draft-iklan')
  fotoFiles=[]
  showToast('Iklan berhasil dipasang!')
  showPage('page-home')
  loadProduk()
}

function setToggle(groupId, el) {
  if (!el) return
  document.querySelectorAll(`#${groupId} .tg-btn`).forEach(b=>b.classList.remove('active'))
  el.classList.add('active')
  simpanDraftIklan()
}

db.auth.onAuthStateChange((event,session)=>{
  if (event==='SIGNED_IN'&&session) {
    sesiAktif = session
    const aktif=document.querySelector('.page.active')?.id
    if (aktif==='page-login') tampilHome(session.user)
  } else if (event==='SIGNED_OUT') {
    sesiAktif = null
    const aktif=document.querySelector('.page.active')?.id
    if (HALAMAN_WAJIB_LOGIN.includes(aktif)) tampilHomeGuest()
  }
})


document.addEventListener('click', function(e) {
  const wrap = document.getElementById('lokasi-desktop-wrap')
  if (wrap && !wrap.contains(e.target)) {
    const dd = document.getElementById('lokasi-desktop-dropdown')
    if (dd) dd.style.display = 'none'
  }
})

document.addEventListener('click', function initAudio() {
  getAudioCtx()
  document.removeEventListener('click', initAudio)
}, { once: true })

document.addEventListener('click', function(e) {
  const wrap = document.getElementById('lokasi-desktop-wrap')
  if (wrap && !wrap.contains(e.target)) {
    const dd = document.getElementById('lokasi-desktop-dropdown')
    if (dd) dd.style.display = 'none'
  }
})

document.addEventListener('click', function initAudio() {
  getAudioCtx()
  document.removeEventListener('click', initAudio)
}, { once: true })

cekSession()
