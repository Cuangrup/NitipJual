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

function showToast(pesan, tipe='sukses') {
  const warna = tipe==='sukses' ? 'linear-gradient(90deg,#C4789A,#9B7FD4)' : '#e53935'
  const icon = tipe==='sukses' ? 'ti-circle-check' : 'ti-alert-circle'
  const toast = document.createElement('div')
  toast.innerHTML = `<i class="ti ${icon}" style="font-size:18px"></i><span>${pesan}</span>`
  toast.style.cssText = `position:fixed;top:20px;left:50%;transform:translateX(-50%);background:${warna};color:#fff;padding:11px 18px;border-radius:12px;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;z-index:9999;white-space:nowrap;max-width:90vw;font-family:inherit;`
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
  if (avaEl) avaEl.innerHTML = foto ? `<img src="${foto}" alt="${nama}" style="width:100%;height:100%;object-fit:cover">` : inisial
  const profilAva = document.getElementById('profil-ava')
  if (profilAva) profilAva.innerHTML = foto ? `<img src="${foto}" alt="${nama}" style="width:100%;height:100%;object-fit:cover">` : inisial
  const profilNama = document.getElementById('profil-nama')
  if (profilNama) profilNama.textContent = nama
  const profilEmail = document.getElementById('profil-email')
  if (profilEmail) profilEmail.textContent = user.email
  showPage('page-home')
  loadProduk()
  setTimeout(cekChatBaru, 1000)
}

async function loginGoogle() {
  const { error } = await db.auth.signInWithOAuth({ provider:'google', options:{ redirectTo: window.location.origin } })
  if (error) showToast('Gagal login, coba lagi','error')
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
  window.scrollTo(0,0)
  if (id==='page-jual') setTimeout(()=>{ muatDraftIklan(); initFotoRow() }, 50)
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
    const foto = p.foto_urls?.length > 0 ? `<img src="${p.foto_urls[0]}" alt="${p.nama}">` : `<i class="ti ti-package" style="font-size:22px"></i>`
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
          <div class="iklan-list-nama">${p.nama}</div>
          ${statusBadge}
        </div>
        <div class="iklan-list-harga">Rp ${Number(p.harga).toLocaleString('id-ID')}</div>
        <div class="iklan-list-actions">${editBtn}${terjualBtn}${hapusBtn}</div>
      </div>
    </div>`
  }).join('')
}

async function tandaiTerjual(id) {
  const { error } = await db.from('products').update({status:'terjual'}).eq('id',id)
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

function initFotoRow() {
  const row = document.getElementById('foto-row')
  if (!row) return
  if (fotoFiles.length>0) renderFotoPreview()
  else row.innerHTML=`<label for="foto-input" class="photo-add" style="cursor:pointer"><i class="ti ti-camera"></i><span>Tambah</span></label><input type="file" id="foto-input" accept="image/*" multiple style="display:none" onchange="handleFotoInput(event)">`
}

async function loadProduk(keyword='', kategori='') {
  const list = document.getElementById('produk-list')
  list.innerHTML='<p class="empty">Memuat iklan...</p>'
  let query = db.from('products').select('*, users(nama, kota)').eq('status','aktif').order('created_at',{ascending:false})
  if (keyword) query=query.ilike('nama',`%${keyword}%`)
  if (kategori) query=query.eq('kategori',kategori)
  const { data, error } = await query
  if (error||!data||data.length===0) { list.innerHTML='<p class="empty">Belum ada iklan di kotamu.</p>'; return }
  list.innerHTML=data.map(p=>{
    const foto=p.foto_urls?.length>0?`<img src="${p.foto_urls[0]}" alt="${p.nama}" style="width:100%;height:100%;object-fit:cover">`:`<i class="ti ti-package"></i>`
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
  const kw=document.getElementById('search')?.value||document.getElementById('search-desktop')?.value||''
  loadProduk(kw)
}

function filterKategori(el, kat) {
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'))
  document.querySelectorAll('.sb-item').forEach(c=>c.classList.remove('active'))
  if (el) el.classList.add('active')
  loadProduk('',kat)
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

async function lihatDetail(id) {
  const { data:p, error } = await db.from('products').select('*, users(nama, kota, foto_profil)').eq('id',id).single()
  if (error||!p) { showToast('Gagal memuat iklan','error'); return }
  produkAktif = p
  fotoList=p.foto_urls?.length>0?p.foto_urls:[]
  fotoIndex=0
  const waktu=new Date(p.created_at)
  const selisihJam=Math.floor((Date.now()-waktu)/3600000)
  const waktuLabel=selisihJam<1?'Baru saja':selisihJam<24?`${selisihJam} jam lalu`:`${Math.floor(selisihJam/24)} hari lalu`
  const sellerAva=p.users?.foto_profil?`<img src="${p.users.foto_profil}" style="width:100%;height:100%;object-fit:cover">`:(p.users?.nama||'?').split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()
  const fotoUtamaHtml=fotoList.length>0?`<img id="foto-utama" src="${fotoList[0]}" alt="${p.nama}" style="width:100%;height:100%;object-fit:contain">`:`<i class="ti ti-package" style="font-size:48px;color:#9B7FD4"></i>`
  const dotsHtml=fotoList.length>1?`<div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);display:flex;gap:4px;pointer-events:none">${fotoList.map((_,i)=>`<div class="foto-dot" onclick="gantiFotoIndex(${i})" style="width:${i===0?'12px':'6px'};height:6px;border-radius:3px;background:${i===0?'#fff':'rgba(255,255,255,0.4)'};cursor:pointer;pointer-events:all;transition:all .2s"></div>`).join('')}</div>`:''
  const thumbsHtml=fotoList.length>1?`<div style="display:flex;gap:6px;padding:8px 12px;overflow-x:auto;background:var(--color-background-primary);border-bottom:0.5px solid var(--color-border-tertiary)">${fotoList.map((f,i)=>`<div class="thumb-item" onclick="gantiFotoIndex(${i})" style="width:60px;height:52px;border-radius:8px;overflow:hidden;border:${i===0?'1.5px solid #9B7FD4':'0.5px solid var(--color-border-tertiary)'};cursor:pointer;flex-shrink:0"><img src="${f}" style="width:100%;height:100%;object-fit:cover"></div>`).join('')}</div>`:''
  const infoHtml=`<div style="padding:10px 14px;background:var(--color-background-primary);margin-bottom:6px">
    <span class="badge ${p.kondisi==='baru'?'b-baru':'b-preloved'}">${p.kondisi==='baru'?'Baru':'Preloved'}</span>
    <div style="font-size:16px;font-weight:500;color:var(--color-text-primary);margin:5px 0 4px;line-height:1.3">${p.nama}</div>
    <div style="font-size:22px;font-weight:500;color:#C4789A;margin-bottom:5px">Rp ${Number(p.harga).toLocaleString('id-ID')}</div>
    <div style="font-size:11px;color:var(--color-text-tertiary);display:flex;align-items:center;gap:5px">
      <i class="ti ti-map-pin" style="font-size:11px"></i>${p.users?.kota||'Lokal'}<span>·</span><i class="ti ti-clock" style="font-size:11px"></i>${waktuLabel}
    </div>
    <div style="border-top:0.5px solid var(--color-border-tertiary);margin:9px 0"></div>
    <div style="display:flex;align-items:center;gap:9px">
      <div style="width:34px;height:34px;border-radius:50%;background:#FEF0F5;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500;color:#9B3060;flex-shrink:0;overflow:hidden">${sellerAva}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:500;color:var(--color-text-primary)">${p.users?.nama||'Penjual'}</div>
        <div style="font-size:10px;color:#9B7FD4;display:flex;align-items:center;gap:2px"><i class="ti ti-shield-check" style="font-size:10px"></i>Terverifikasi · ${p.users?.kota||'Lokal'}</div>
      </div>
    </div>
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
        <span style="background:#E3F2FD;color:#1565C0;font-size:9px;padding:2px 6px;border-radius:6px;font-weight:500;display:inline-block;margin-bottom:3px">NitiPGo</span>
        <div style="font-size:11px;font-weight:500;color:var(--color-text-primary);margin-bottom:5px">Antar ke rumahku</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:11px;color:#C4789A;font-weight:500">Sesuai jarak</div>
          <div id="tog-go" style="width:28px;height:15px;border-radius:8px;background:var(--color-border-secondary);position:relative;transition:background .2s;flex-shrink:0"><div style="position:absolute;top:2px;left:2px;width:11px;height:11px;background:#fff;border-radius:50%;transition:left .2s"></div></div>
        </div>
      </div>
    </div>
    <button onclick="hubungiSeller()" style="width:100%;padding:13px;background:linear-gradient(90deg,#C4789A,#9B7FD4);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:500;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;font-family:inherit;margin-bottom:16px">
      <i class="ti ti-message"></i>Hubungi penjual
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
  if (!session) return showToast('Kamu harus login dulu', 'error')

  const p = produkAktif
  const buyerId = session.user.id
  const sellerId = p.seller_id

  if (buyerId === sellerId) return showToast('Ini iklanmu sendiri', 'error')

  // Cek order/chat sudah ada
  let { data: order } = await db.from('orders')
    .select('id, buyer_id, seller_id')
    .eq('product_id', p.id)
    .eq('buyer_id', buyerId)
    .maybeSingle()

  if (!order) {
    const kode = 'NTJ-' + Math.random().toString(36).substring(2,8).toUpperCase()
    const { data: newOrder } = await db.from('orders').insert({
      kode, buyer_id: buyerId, seller_id: sellerId,
      product_id: p.id, status: 'negosiasi',
      harga_deal: p.harga
    }).select().single()
    order = newOrder
  }

  if (!order) return showToast('Gagal membuka chat', 'error')
  bukaChat(order.id, p)
}

let chatOrderId = null
let chatSubscription = null

async function bukaChat(orderId, produk) {
  chatOrderId = orderId
  const { data: { session } } = await db.auth.getSession()
  const userId = session.user.id

  // Set header chat
  const sellerNama = produk.users?.nama || produk.nama_seller || 'Penjual'
  document.getElementById('chat-nama').textContent = sellerNama
  document.getElementById('chat-produk').textContent = produk.nama
  const ava = document.getElementById('chat-ava')
  ava.textContent = sellerNama.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()

  // Load pesan
  await loadPesan(orderId, userId)

  // Subscribe realtime
  if (chatSubscription) chatSubscription.unsubscribe()
  chatSubscription = db.channel('chat-' + orderId)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'chats',
      filter: `order_id=eq.${orderId}`
    }, payload => {
      tampilPesan(payload.new, userId)
    })
    .subscribe()

  showPage('page-chat')
}

async function loadPesan(orderId, userId) {
  const box = document.getElementById('chat-messages')
  box.innerHTML = ''
  const { data, error } = await db.from('chats')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (error || !data) return
  data.forEach(msg => tampilPesan(msg, userId))
  box.scrollTop = box.scrollHeight
}

function tampilPesan(msg, userId) {
  const box = document.getElementById('chat-messages')
  const isMine = msg.sender_id === userId
  const waktu = new Date(msg.created_at)
  const jam = waktu.getHours() + ':' + String(waktu.getMinutes()).padStart(2,'0')

  const div = document.createElement('div')
  div.style.cssText = `display:flex;flex-direction:column;align-items:${isMine?'flex-end':'flex-start'}`
  div.innerHTML = `
    <div style="max-width:75%;padding:9px 12px;border-radius:${isMine?'12px 12px 3px 12px':'12px 12px 12px 3px'};background:${isMine?'linear-gradient(90deg,#C4789A,#9B7FD4)':'var(--color-background-primary)'};color:${isMine?'#fff':'var(--color-text-primary)'};font-size:13px;line-height:1.4;border:${isMine?'none':'0.5px solid var(--color-border-tertiary)'}">${msg.pesan}</div>
    <div style="font-size:10px;color:var(--color-text-tertiary);margin-top:3px">${jam}</div>
  `
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
  const { error } = await db.from('chats').insert({
    order_id: chatOrderId,
    sender_id: session.user.id,
    dari: 'buyer',
    pesan
  })
  if (error) showToast('Gagal mengirim pesan', 'error')
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

async function editIklan(id) {
  const { data: p, error } = await db.from("products").select("*").eq("id", id).single()
  if (error || !p) { showToast("Gagal memuat iklan", "error"); return }
  document.getElementById("edit-id").value = p.id
  document.getElementById("edit-nama").value = p.nama || ""
  document.getElementById("edit-harga").value = p.harga || ""
  document.getElementById("edit-deskripsi").value = p.deskripsi || ""
  document.getElementById("edit-kategori").value = p.kategori || ""
  document.querySelectorAll("#edit-kondisi-group .tg-btn").forEach(btn => btn.classList.toggle("active", btn.textContent.trim().toLowerCase() === p.kondisi))
  const fotoWrap = document.getElementById("edit-foto-existing")
  fotoWrap.innerHTML = p.foto_urls?.map((f, i) => `<div style="position:relative;width:70px;height:70px;flex-shrink:0"><img src="${f}" style="width:70px;height:70px;object-fit:cover;border-radius:10px;border:0.5px solid var(--pkbr)"><button onclick="hapusFotoExisting(${i},'${id}')" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#e53935;color:#fff;border:none;cursor:pointer;font-size:14px;line-height:1;padding:0">×</button></div>`).join("") || ""
  showPage("page-edit")
}

async function simpanEdit() {
  const id = document.getElementById("edit-id").value
  const nama = document.getElementById("edit-nama").value.trim()
  const harga = parseInt(document.getElementById("edit-harga").value)
  const deskripsi = document.getElementById("edit-deskripsi").value.trim()
  const kategori = document.getElementById("edit-kategori").value
  const kondisi = document.querySelector("#edit-kondisi-group .tg-btn.active")?.textContent.trim().toLowerCase() === "preloved" ? "preloved" : "baru"
  if (!nama || !harga) return showToast("Nama dan harga wajib diisi", "error")
  const btn = document.getElementById("btn-simpan-edit")
  btn.innerHTML = "<i class=\"ti ti-loader\"></i> Menyimpan..."
  btn.disabled = true
  const { error } = await db.from("products").update({ nama, harga, deskripsi, kategori, kondisi }).eq("id", id)
  btn.innerHTML = "<i class=\"ti ti-check\"></i> Simpan perubahan"
  btn.disabled = false
  if (error) { showToast("Gagal menyimpan", "error"); return }
  showToast("Iklan berhasil diperbarui!")
  showPage("page-profil")
  loadIklanSaya()
}

async function hapusFotoExisting(index, id) {
  const { data: p } = await db.from("products").select("foto_urls").eq("id", id).single()
  if (!p) return
  const urls = [...(p.foto_urls || [])]
  urls.splice(index, 1)
  await db.from("products").update({ foto_urls: urls }).eq("id", id)
  editIklan(id)
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
  const lokasi=document.getElementById('lokasi')?.value.trim()||'Gresik'
  if (!nama||!harga) return showToast('Nama produk dan harga wajib diisi','error')
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
  const {error}=await db.from('products').insert({seller_id:session.user.id,nama,deskripsi,harga,kondisi,kategori,foto_urls,status:'aktif'})
  btn.innerHTML='<i class="ti ti-speakerphone"></i> Pasang iklan sekarang'
  btn.disabled=false
  if (error) { showToast('Gagal memposting iklan','error'); return }
  localStorage.removeItem('draft-iklan')
  fotoFiles=[]
  showToast('Iklan berhasil dipasang!')
  showPage('page-home')
  loadProduk()
  setTimeout(cekChatBaru, 1000)
}

function setToggle(groupId, el) {
  if (!el) return
  document.querySelectorAll(`#${groupId} .tg-btn`).forEach(b=>b.classList.remove('active'))
  el.classList.add('active')
  simpanDraftIklan()
}


async function loadChatList() {
  const { data: { session } } = await db.auth.getSession()
  if (!session) return
  const userId = session.user.id
  const container = document.getElementById('chat-list-content')
  if (!container) return
  container.innerHTML = '<p class="empty">Memuat chat...</p>'

  const { data, error } = await db.from('orders')
    .select('id, kode, status, harga_deal, seller_id, buyer_id, products(nama, foto_urls), seller:users!orders_seller_id_fkey(nama, foto_profil), buyer:users!orders_buyer_id_fkey(nama, foto_profil)')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error || !data || data.length === 0) {
    container.innerHTML = '<p class="empty">Belum ada chat.</p>'
    return
  }

  container.innerHTML = data.map(o => {
    const isSeller = o.seller_id === userId
    const lawan = isSeller ? o.buyer : o.seller
    const lawanNama = lawan?.nama || 'Pengguna'
    const lawanAva = lawanNama.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()
    const produkNama = o.products?.nama || 'Produk'
    const foto = o.products?.foto_urls?.[0]
    const roleLabel = isSeller ? 'Pembeli' : 'Penjual'

    return `<div onclick="bukaOrder('${o.id}')" style="background:var(--color-background-primary);border-radius:12px;border:0.5px solid var(--color-border-tertiary);padding:12px;display:flex;gap:10px;margin-bottom:8px;cursor:pointer;align-items:center">
      <div style="width:44px;height:44px;border-radius:50%;background:#FEF0F5;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:500;color:#9B3060;flex-shrink:0;overflow:hidden">
        ${lawan?.foto_profil ? `<img src="${lawan.foto_profil}" style="width:100%;height:100%;object-fit:cover">` : lawanAva}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;color:var(--color-text-primary);margin-bottom:2px">${lawanNama} <span style="font-size:10px;color:var(--color-text-tertiary)">(${roleLabel})</span></div>
        <div style="font-size:11px;color:var(--color-text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${produkNama}</div>
      </div>
      <div style="font-size:12px;font-weight:500;color:#C4789A">Rp ${Number(o.harga_deal||0).toLocaleString('id-ID')}</div>
    </div>`
  }).join('')
}

async function bukaOrder(orderId) {
  const { data: o } = await db.from('orders')
    .select('*, products(nama, foto_urls, users(nama)), users!orders_seller_id_fkey(nama)')
    .eq('id', orderId).single()
  if (!o) return
  const p = { ...o.products, seller_id: o.seller_id, users: o.products?.users }
  produkAktif = p
  bukaChat(orderId, p)
}


async function cekChatBaru() {
  const { data: { session } } = await db.auth.getSession()
  if (!session) return
  const userId = session.user.id

  const { data: orders } = await db.from('orders')
    .select('id')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)

  if (!orders || orders.length === 0) return

  const orderIds = orders.map(o => o.id)
  const lastSeen = localStorage.getItem('last-seen-chat') || '1970-01-01'

  const { data: newChats } = await db.from('chats')
    .select('id')
    .in('order_id', orderIds)
    .neq('sender_id', userId)
    .gt('created_at', lastSeen)

  const ada = newChats && newChats.length > 0
  const badges = ['badge-chat-topbar', 'badge-chat-sidebar', 'badge-chat-mobile']
  badges.forEach(id => {
    const el = document.getElementById(id)
    if (el) el.style.display = ada ? 'block' : 'none'
  })
}

function hapusBadgeChat() {
  localStorage.setItem('last-seen-chat', new Date().toISOString())
  const badges = ['badge-chat-topbar', 'badge-chat-sidebar', 'badge-chat-mobile']
  badges.forEach(id => {
    const el = document.getElementById(id)
    if (el) el.style.display = 'none'
  })
}

db.auth.onAuthStateChange((event,session)=>{
  if (event==='SIGNED_IN'&&session) { const aktif=document.querySelector('.page.active')?.id; if(aktif==='page-login') tampilHome(session.user) }
  else if (event==='SIGNED_OUT') showPage('page-login')
})

cekSession()
