const { createClient } = supabase
const db = createClient(
  'https://gshstlssjlyefxxefspa.supabase.co',
  'sb_publishable_vwGZFBrtZRQIVpIVsYrQbg_SPYyl7me'
)

const BUCKET = 'foto produk'
let fotoFiles = []
let produkAktif = null

function showToast(pesan, tipe = 'sukses') {
  const warna = tipe === 'sukses' ? 'linear-gradient(90deg,#C4789A,#9B7FD4)' : '#e53935'
  const icon = tipe === 'sukses' ? 'ti-circle-check' : 'ti-alert-circle'
  const toast = document.createElement('div')
  toast.innerHTML = `<i class="ti ${icon}" style="font-size:18px"></i><span>${pesan}</span>`
  toast.style.cssText = `position:fixed;top:20px;left:50%;transform:translateX(-50%);background:${warna};color:#fff;padding:11px 18px;border-radius:12px;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;z-index:9999;white-space:nowrap;max-width:90vw;font-family:inherit;`
  if (!document.getElementById('toast-anim')) {
    const s = document.createElement('style')
    s.id = 'toast-anim'
    s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}'
    document.head.appendChild(s)
  }
  document.body.appendChild(toast)
  setTimeout(() => { toast.style.opacity='0'; toast.style.transition='opacity .3s'; setTimeout(()=>toast.remove(),300) }, 2800)
}

async function cekSession() {
  const { data: { session } } = await db.auth.getSession()
  if (session) tampilHome(session.user)
  else showPage('page-login')
}

function tampilHome(user) {
  const nama = user.user_metadata?.full_name || user.email
  const inisial = nama.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()
  const foto = user.user_metadata?.avatar_url
  const avaEl = document.getElementById('user-ava')
  if (avaEl) avaEl.innerHTML = foto ? `<img src="${foto}" alt="${nama}">` : inisial
  const profilAva = document.getElementById('profil-ava')
  if (profilAva) profilAva.innerHTML = foto ? `<img src="${foto}" alt="${nama}">` : inisial
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
  if (error) showToast('Gagal login, coba lagi', 'error')
}

async function logout() {
  await db.auth.signOut()
  localStorage.removeItem('draft-iklan')
  showPage('page-login')
}

function showPage(id) {
  if (id !== 'page-jual') simpanDraftIklan()
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  document.getElementById(id).classList.add('active')
  window.scrollTo(0, 0)
  if (id === 'page-jual') setTimeout(() => { muatDraftIklan(); initFotoRow() }, 50)
}

function simpanDraftIklan() {
  const nama = document.getElementById('nama-produk')?.value || ''
  const harga = document.getElementById('harga')?.value || ''
  const deskripsi = document.getElementById('deskripsi')?.value || ''
  const kategori = document.getElementById('kategori')?.value || ''
  const lokasi = document.getElementById('lokasi')?.value || ''
  const kondisi = document.querySelector('#kondisi-group .tg-btn.active')?.textContent.trim() || 'Baru'
  const tipe = document.querySelector('#tipe-group .tg-btn.active')?.textContent.trim() || 'Individu'
  if (nama || harga || deskripsi) localStorage.setItem('draft-iklan', JSON.stringify({nama,harga,deskripsi,kategori,lokasi,kondisi,tipe}))
}

function muatDraftIklan() {
  const draft = localStorage.getItem('draft-iklan')
  if (!draft) return
  const d = JSON.parse(draft)
  if (document.getElementById('nama-produk')) document.getElementById('nama-produk').value = d.nama||''
  if (document.getElementById('harga')) document.getElementById('harga').value = d.harga||''
  if (document.getElementById('deskripsi')) document.getElementById('deskripsi').value = d.deskripsi||''
  if (document.getElementById('kategori')) document.getElementById('kategori').value = d.kategori||''
  if (document.getElementById('lokasi')) document.getElementById('lokasi').value = d.lokasi||'Gresik'
  document.querySelectorAll('#kondisi-group .tg-btn').forEach(btn => btn.classList.toggle('active', btn.textContent.trim()===d.kondisi))
  document.querySelectorAll('#tipe-group .tg-btn').forEach(btn => btn.classList.toggle('active', btn.textContent.trim()===d.tipe))
}

function initFotoRow() {
  const row = document.getElementById('foto-row')
  if (!row) return
  if (fotoFiles.length > 0) renderFotoPreview()
  else row.innerHTML = `<label for="foto-input" class="photo-add" style="cursor:pointer"><i class="ti ti-camera"></i><span>Tambah</span></label><input type="file" id="foto-input" accept="image/*" multiple style="display:none" onchange="handleFotoInput(event)">`
}

async function loadProduk(keyword='', kategori='') {
  const list = document.getElementById('produk-list')
  list.innerHTML = '<p class="empty">Memuat iklan...</p>'
  let query = db.from('products').select('*, users(nama, kota)').eq('status','aktif').order('created_at',{ascending:false})
  if (keyword) query = query.ilike('nama', `%${keyword}%`)
  if (kategori) query = query.eq('kategori', kategori)
  const { data, error } = await query
  if (error || !data || data.length===0) { list.innerHTML='<p class="empty">Belum ada iklan di kotamu.</p>'; return }
  list.innerHTML = data.map(p => {
    const foto = p.foto_urls?.length > 0 ? `<img src="${p.foto_urls[0]}" alt="${p.nama}" style="width:100%;height:100%;object-fit:cover">` : `<i class="ti ti-package"></i>`
    return `<div class="produk-card" onclick="lihatDetail('${p.id}')">
      <div class="pimg">${foto}</div>
      <div class="pinfo">
        <span class="badge ${p.kondisi==='baru'?'b-baru':'b-preloved'}">${p.kondisi==='baru'?'Baru':'Preloved'}</span>
        <div class="pname">${p.nama}</div>
        <div class="pharga">Rp ${Number(p.harga).toLocaleString('id-ID')}</div>
        <div class="ploc"><i class="ti ti-map-pin" style="font-size:10px"></i> ${p.users?.kota||'Lokal'}</div>
      </div>
    </div>`
  }).join('')
}

function cariProduk() {
  const kw = document.getElementById('search')?.value || document.getElementById('search-desktop')?.value || ''
  loadProduk(kw)
}

function filterKategori(el, kat) {
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'))
  document.querySelectorAll('.sb-item').forEach(c=>c.classList.remove('active'))
  if (el) el.classList.add('active')
  loadProduk('', kat)
}

async function lihatDetail(id) {
  const { data: p, error } = await db.from('products').select('*, users(nama, kota, foto_profil)').eq('id', id).single()
  if (error || !p) { showToast('Gagal memuat iklan', 'error'); return }
  produkAktif = p

  const fotos = p.foto_urls?.length > 0 ? p.foto_urls : []
  const fotoHtml = fotos.length > 0
    ? `<img src="${fotos[0]}" id="foto-utama" alt="${p.nama}" style="width:100%;height:100%;object-fit:cover">`
    : `<i class="ti ti-package" style="font-size:48px;color:#9B7FD4"></i>`

  const thumbsHtml = fotos.map((f,i) => `
    <div onclick="gantiGambar('${f}')" style="width:60px;height:52px;border-radius:8px;overflow:hidden;border:${i===0?'1.5px solid #9B7FD4':'0.5px solid var(--color-border-tertiary)'};cursor:pointer;flex-shrink:0">
      <img src="${f}" style="width:100%;height:100%;object-fit:cover">
    </div>`).join('')

  const dotsHtml = fotos.length > 1 ? `<div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);display:flex;gap:4px">
    ${fotos.map((_,i)=>`<div style="width:${i===0?'12px':'6px'};height:6px;border-radius:3px;background:${i===0?'#fff':'rgba(255,255,255,0.4)'}"></div>`).join('')}
  </div>` : ''

  const sellerAva = p.users?.foto_profil
    ? `<img src="${p.users.foto_profil}" style="width:100%;height:100%;object-fit:cover">`
    : (p.users?.nama||'?').split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()

  const waktu = new Date(p.created_at)
  const selisihJam = Math.floor((Date.now()-waktu)/3600000)
  const waktuLabel = selisihJam < 1 ? 'Baru saja' : selisihJam < 24 ? `${selisihJam} jam lalu` : `${Math.floor(selisihJam/24)} hari lalu`

  document.getElementById('detail-content').innerHTML = `
    <div style="width:100%;aspect-ratio:4/3;background:#F3EEFB;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">
      ${fotoHtml}${dotsHtml}
    </div>
    ${thumbsHtml ? `<div style="display:flex;gap:6px;padding:8px 12px;overflow-x:auto;background:var(--color-background-primary);border-bottom:0.5px solid var(--color-border-tertiary)">${thumbsHtml}</div>` : ''}
    <div style="padding:10px 12px;background:var(--color-background-primary);margin-bottom:6px">
      <span class="badge ${p.kondisi==='baru'?'b-baru':'b-preloved'}">${p.kondisi==='baru'?'Baru':'Preloved'}</span>
      <div style="font-size:15px;font-weight:500;color:var(--color-text-primary);margin:4px 0 3px;line-height:1.3">${p.nama}</div>
      <div style="font-size:20px;font-weight:500;color:#C4789A;margin-bottom:4px">Rp ${Number(p.harga).toLocaleString('id-ID')}</div>
      <div style="font-size:11px;color:var(--color-text-tertiary);display:flex;align-items:center;gap:4px">
        <i class="ti ti-map-pin" style="font-size:11px"></i>${p.users?.kota||'Lokal'}
        <span>·</span>
        <i class="ti ti-clock" style="font-size:11px"></i>${waktuLabel}
      </div>
      <div style="border-top:0.5px solid var(--color-border-tertiary);margin:8px 0"></div>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="width:32px;height:32px;border-radius:50%;background:#FEF0F5;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;color:#9B3060;flex-shrink:0;overflow:hidden">${sellerAva}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:500;color:var(--color-text-primary)">${p.users?.nama||'Penjual'}</div>
          <div style="font-size:10px;color:#9B7FD4;display:flex;align-items:center;gap:2px"><i class="ti ti-shield-check" style="font-size:10px"></i>Terverifikasi · ${p.users?.kota||'Lokal'}</div>
        </div>
      </div>
      ${p.deskripsi ? `
      <div style="border-top:0.5px solid var(--color-border-tertiary);margin:8px 0"></div>
      <div id="desc-text" style="font-size:12px;color:var(--color-text-secondary);line-height:1.6;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${p.deskripsi}</div>
      <div onclick="toggleDesc()" style="font-size:11px;color:#9B7FD4;font-weight:500;margin-top:3px;cursor:pointer" id="desc-toggle">Lihat selengkapnya</div>` : ''}
    </div>
    <div style="padding:0 12px 6px">
      <div style="font-size:11px;font-weight:500;color:var(--color-text-secondary);margin-bottom:6px">Layanan tambahan (opsional)</div>
      <div style="display:flex;gap:6px;margin-bottom:10px">
        <div id="card-cek" onclick="toggleLayanan('cek')" style="flex:1;background:var(--color-background-primary);border-radius:10px;border:0.5px solid var(--color-border-tertiary);padding:8px 10px;cursor:pointer">
          <span style="background:#F3EEFB;color:#6B3FA0;font-size:9px;padding:2px 6px;border-radius:6px;font-weight:500;display:inline-block;margin-bottom:3px">NitipCek</span>
          <div style="font-size:11px;font-weight:500;color:var(--color-text-primary);margin-bottom:4px">Verifikasi barang</div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="font-size:11px;color:#C4789A;font-weight:500">Rp 10.000</div>
            <div id="tog-cek" style="width:28px;height:15px;border-radius:8px;background:var(--color-border-secondary);position:relative;flex-shrink:0"><div style="position:absolute;top:2px;left:2px;width:11px;height:11px;background:#fff;border-radius:50%"></div></div>
          </div>
        </div>
        <div id="card-go" onclick="toggleLayanan('go')" style="flex:1;background:var(--color-background-primary);border-radius:10px;border:0.5px solid var(--color-border-tertiary);padding:8px 10px;cursor:pointer">
          <span style="background:#E3F2FD;color:#1565C0;font-size:9px;padding:2px 6px;border-radius:6px;font-weight:500;display:inline-block;margin-bottom:3px">NitiPGo</span>
          <div style="font-size:11px;font-weight:500;color:var(--color-text-primary);margin-bottom:4px">Antar ke rumahku</div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="font-size:11px;color:#C4789A;font-weight:500">Sesuai jarak</div>
            <div id="tog-go" style="width:28px;height:15px;border-radius:8px;background:var(--color-border-secondary);position:relative;flex-shrink:0"><div style="position:absolute;top:2px;left:2px;width:11px;height:11px;background:#fff;border-radius:50%"></div></div>
          </div>
        </div>
      </div>
      <button onclick="hubungiSeller()" style="width:100%;padding:12px;background:linear-gradient(90deg,#C4789A,#9B7FD4);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:500;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;font-family:inherit;margin-bottom:16px">
        <i class="ti ti-message"></i>Hubungi penjual
      </button>
    </div>
  `
  showPage('page-detail')
}

function gantiGambar(url) {
  const el = document.getElementById('foto-utama')
  if (el) el.src = url
}

function toggleDesc() {
  const desc = document.getElementById('desc-text')
  const toggle = document.getElementById('desc-toggle')
  if (!desc) return
  const collapsed = desc.style.webkitLineClamp === '3'
  desc.style.webkitLineClamp = collapsed ? 'unset' : '3'
  desc.style.overflow = collapsed ? 'visible' : 'hidden'
  toggle.textContent = collapsed ? 'Sembunyikan' : 'Lihat selengkapnya'
}

function toggleLayanan(type) {
  const card = document.getElementById(`card-${type}`)
  const tog = document.getElementById(`tog-${type}`)
  if (!card || !tog) return
  const isOn = tog.style.background === 'rgb(155, 127, 212)'
  tog.style.background = isOn ? 'var(--color-border-secondary)' : '#9B7FD4'
  tog.querySelector('div').style.left = isOn ? '2px' : '15px'
  card.style.border = isOn ? '0.5px solid var(--color-border-tertiary)' : '1.5px solid #9B7FD4'
  card.style.background = isOn ? 'var(--color-background-primary)' : '#FAF5FF'
}

function hubungiSeller() {
  showToast('Fitur chat segera hadir!')
}

function handleFotoInput(event) {
  const files = Array.from(event.target.files)
  fotoFiles = [...fotoFiles, ...files.slice(0, 5-fotoFiles.length)]
  renderFotoPreview()
}

function renderFotoPreview() {
  const row = document.getElementById('foto-row')
  if (!row) return
  const previews = fotoFiles.map((file,i) => {
    const url = URL.createObjectURL(file)
    return `<div style="position:relative;width:70px;height:70px;flex-shrink:0">
      <img src="${url}" style="width:70px;height:70px;object-fit:cover;border-radius:10px;border:0.5px solid var(--pkbr)">
      <button onclick="hapusFoto(${i})" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#e53935;color:#fff;border:none;cursor:pointer;font-size:14px;line-height:1;padding:0">×</button>
    </div>`
  }).join('')
  const tambah = fotoFiles.length < 5
    ? `<label for="foto-input" class="photo-add" style="cursor:pointer"><i class="ti ti-camera"></i><span>Tambah</span></label><input type="file" id="foto-input" accept="image/*" multiple style="display:none" onchange="handleFotoInput(event)">`
    : ''
  row.innerHTML = previews + tambah
}

function hapusFoto(index) {
  fotoFiles.splice(index, 1)
  renderFotoPreview()
}

async function kompresiFoto(file) {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w=img.width, h=img.height
        if (w>800) { h=h*800/w; w=800 }
        canvas.width=w; canvas.height=h
        canvas.getContext('2d').drawImage(img,0,0,w,h)
        canvas.toBlob(blob=>resolve(blob),'image/jpeg',0.75)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

async function postingProduk() {
  const { data: { session } } = await db.auth.getSession()
  if (!session) return showToast('Kamu harus login dulu', 'error')
  const nama = document.getElementById('nama-produk').value.trim()
  const deskripsi = document.getElementById('deskripsi').value.trim()
  const harga = parseInt(document.getElementById('harga').value)
  const kondisi = document.querySelector('#kondisi-group .tg-btn.active')?.textContent.trim().toLowerCase()==='preloved'?'preloved':'baru'
  const kategori = document.getElementById('kategori').value
  const lokasi = document.getElementById('lokasi')?.value.trim()||'Gresik'
  if (!nama||!harga) return showToast('Nama produk dan harga wajib diisi','error')
  const btn = document.querySelector('#page-jual .btnp')
  btn.innerHTML='<i class="ti ti-loader" style="animation:spin 1s linear infinite"></i> Memproses...'
  btn.disabled=true
  let foto_urls=[]
  for (let i=0;i<fotoFiles.length;i++) {
    const compressed = await kompresiFoto(fotoFiles[i])
    const fileName=`${session.user.id}/${Date.now()}_${i}.jpg`
    const { error:upErr } = await db.storage.from(BUCKET).upload(fileName,compressed,{contentType:'image/jpeg'})
    if (!upErr) {
      const { data:urlData } = db.storage.from(BUCKET).getPublicUrl(fileName)
      foto_urls.push(urlData.publicUrl)
    }
  }
  const { error } = await db.from('products').insert({seller_id:session.user.id,nama,deskripsi,harga,kondisi,kategori,foto_urls,status:'aktif'})
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

db.auth.onAuthStateChange((event, session) => {
  if (event==='SIGNED_IN'&&session) {
    const aktif = document.querySelector('.page.active')?.id
    if (aktif==='page-login') tampilHome(session.user)
  } else if (event==='SIGNED_OUT') showPage('page-login')
})

cekSession()
