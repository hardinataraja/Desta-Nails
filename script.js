
// === Firebase Setup ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCo7mrvNqksgyOrHwiRU5pW0k38fQeLR4U",
  authDomain: "desta-nails.firebaseapp.com",
  projectId: "desta-nails",
  storageBucket: "desta-nails.appspot.com",
  messagingSenderId: "539165179095",
  appId: "1:539165179095:web:6cb77efd6cec10f9d08492",
  measurementId: "G-4SRZSM2KD7"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// === Element References ===
const productList=document.getElementById('productList');
const previewModal=document.getElementById('previewModal');
const checkoutModal=document.getElementById('checkoutModal');
const paymentModal=document.getElementById('paymentModal');
const thankyouModal=document.getElementById('thankyouModal');
const cartIcon=document.getElementById('cartIcon');
const cartCount=document.getElementById('cartCount');

let products=[],cart=[],previewIndex=null,qtyPreview=1,currentOrderId=null,currentOrderObj=null;

// === Realtime Produk ===
onSnapshot(collection(db,'products'),snap=>{
  products=snap.docs.map(d=>({id:d.id,...d.data()}));
  productList.innerHTML=products.map((p,i)=>`
    <div class="card">
      <img src="${p.img}" alt="${p.name}">
      <h3>${p.name}</h3>
      <p>Rp${Number(p.price).toLocaleString('id-ID')}</p>
    </div>`).join('');
});

// === Event Preview Produk ===
productList.addEventListener('click', e=>{
  const img=e.target.closest('img');
  if(!img)return;
  const card=img.closest('.card');
  const index=[...productList.children].indexOf(card);
  if(index>=0)showPreview(index);
});

window.showPreview=i=>{
  previewIndex=i;qtyPreview=1;
  const p=products[i];
  document.getElementById('previewImg').src=p.img;
  document.getElementById('previewName').textContent=p.name;
  document.getElementById('previewPrice').textContent=`Rp${p.price.toLocaleString('id-ID')}`;
  document.getElementById('previewQty').textContent=qtyPreview;
  previewModal.classList.add('show');
};
window.closePreview=()=>previewModal.classList.remove('show');

window.changeQty=n=>{
  qtyPreview+=n;
  if(qtyPreview<0) qtyPreview=0;
  document.getElementById('previewQty').textContent=qtyPreview;
};

// === Tambah ke Keranjang ===
window.addFromPreview=async()=>{
  const p=products[previewIndex];
  if(!p) return Swal.fire('Oops!', 'Produk tidak ditemukan.', 'error');
  const ex=cart.find(x=>x.id===p.id);
  if(qtyPreview===0){
    if(ex) cart = cart.filter(x=>x.id !== p.id);
  } else {
    if(ex) ex.qty = qtyPreview;
    else cart.push({...p, qty: qtyPreview});
  }
  cartCount.textContent = cart.reduce((a,b)=>a + b.qty, 0);
  previewModal.classList.remove('show');
  Swal.fire({
    icon: 'success',
    title: 'Ditambahkan!',
    text: `${p.name} berhasil dimasukkan ke keranjang.`,
    timer: 1800,
    showConfirmButton: false,
    background: '#f9d6eb',
    color: '#4c0068'
  });
};

// === Buka Keranjang / Checkout ===
cartIcon.addEventListener('click', ()=>{
  if(!cart.length){
    Swal.fire('Keranjang kosong!', 'Tambahkan produk terlebih dahulu.', 'info');
    return;
  }
  let html='', total=0;
  cart.forEach(i=>{
    html += `${i.name} x${i.qty} - Rp${(i.price*i.qty).toLocaleString('id-ID')}<br>`;
    total += i.price * i.qty;
  });
  html += `<br><strong>Total: Rp${total.toLocaleString('id-ID')}</strong>`;
  document.getElementById('orderDetails').innerHTML = html;
  checkoutModal.style.display='flex';
});
window.closeCheckout=()=>checkoutModal.style.display='none';

// === Generate Kode Unik ===
function genKodeUnik(){
  const k = Math.floor(Math.random()*999) + 1;
  return { kode: k, kodeStr: String(k).padStart(3,'0') };
}

// === Bayar Sekarang ===
window.bayarSekarang=async()=>{
  const nama = document.getElementById('nama').value.trim();
  const alamat = document.getElementById('alamat').value.trim();
  const nohp = document.getElementById('nohp').value.trim();
  if(!nama || !alamat || !nohp)
    return Swal.fire('Lengkapi Data!', 'Isi Nama, Alamat & WhatsApp kamu.', 'warning');

  const result = await Swal.fire({
    title: 'Lanjut ke Pembayaran?',
    text: 'Pastikan data kamu sudah benar.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#c800b3',
    cancelButtonColor: '#777',
    confirmButtonText: 'Ya, lanjut'
  });
  if(!result.isConfirmed) return;

  const baseTotal = cart.reduce((a,b)=>a + b.price*b.qty, 0);
  const { kode, kodeStr } = genKodeUnik();
  const finalTotal = baseTotal + kode;
  const orderCode = 'DS-'+Math.random().toString(36).substring(2,8).toUpperCase();
  const orderObj = {
    kode: orderCode,
    nama, alamat, nohp,
    payment_status: 'pending',
    kode_unik: kode,
    total_bayar: finalTotal,
    items: cart,
    status: 'baru',
    timestamp: new Date().toISOString()
  };
  try {
    const ref = await addDoc(collection(db,'orders'), orderObj);
    currentOrderId = ref.id;
    currentOrderObj = orderObj;
  } catch(err){
    console.error(err);
    return Swal.fire('Gagal!', 'Tidak dapat membuat pesanan.', 'error');
  }
  document.getElementById('payBase').textContent = `Rp${baseTotal.toLocaleString('id-ID')}`;
  document.getElementById('payKode').textContent = kodeStr;
  document.getElementById('payTotal').textContent = `Rp${finalTotal.toLocaleString('id-ID')}`;
  checkoutModal.style.display='none';
  paymentModal.style.display='flex';
};

// === Konfirmasi Sudah Bayar ===
window.konfirmasiSudahBayar=async()=>{
  if(!currentOrderId) return Swal.fire('Tidak ada pesanan aktif.', '', 'error');
  const res = await Swal.fire({
    title: 'Konfirmasi Pembayaran?',
    text: 'Pastikan kamu sudah transfer sesuai total.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Ya, sudah bayar',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#c800b3'
  });
  if(!res.isConfirmed) return;

  try{
    await updateDoc(doc(db,'orders',currentOrderId), { payment_status: 'waiting_verification' });
  } catch(err){
    console.error(err);
    return Swal.fire('Gagal!', 'Tidak bisa update status pembayaran.', 'error');
  }
  paymentModal.style.display='none';
  document.getElementById('orderCodeText').textContent = currentOrderObj.kode;
  thankyouModal.style.display='flex';
  cart = [];
  cartCount.textContent = 0;
  Swal.fire({
    icon:'success',
    title:'Pembayaran dikonfirmasi!',
    text:'Pesanan kamu sedang diproses.',
    timer:2000,
    showConfirmButton:false,
    background:'#f9d6eb',
    color:'#4c0068'
  });
};

// === Salin Kode Pesanan ===
window.copyOrderCode=()=>{
  const text = document.getElementById('orderCodeText').textContent;
  navigator.clipboard.writeText(text).then(()=>{
    Swal.fire({
      icon:'success',
      title:'Kode Disalin!',
      html:`Kode pesanan: <b>${text}</b>`,
      timer:2000,
      showConfirmButton:false,
      background:'#f9d6eb',
      color:'#4c0068'
    });
  });
};

// === Lihat Status ===
window.lihatStatus=()=>{
  const code = document.getElementById('orderCodeText').textContent;
  localStorage.setItem('lastOrderCode', code);
  thankyouModal.style.display='none';
  window.location.href = 'status.html?code=' + encodeURIComponent(code);
};

// === Batal Payment ===
window.batalPayment=async()=>{
  const res = await Swal.fire({
    title:'Batalkan pembayaran?',
    text:'Pesanan akan disimpan tapi belum dibayar.',
    icon:'warning',
    showCancelButton:true,
    confirmButtonText:'Ya, batal',
    cancelButtonText:'Kembali',
    confirmButtonColor:'#c800b3'
  });
  if(res.isConfirmed){
    paymentModal.style.display='none';
  }
};

// === Metode Pembayaran ===
const paymentDetailsArea = document.getElementById('paymentDetailsArea');
document.getElementById('paymentMethod2').addEventListener('change', e=>{
  const val = e.target.value;
  if(!val){ paymentDetailsArea.innerHTML = ''; return; }
  let html = '';
  if(val.includes('BCA')){
    html = `<div class="bank-box"><span>BCA • 1234567890<br>Penerima: <b>Desta Nails Collection</b></span>
      <button class="copy-btn" onclick="copyText('1234567890')">Copy</button></div>`;
  } else if(val.includes('BRI')){
    html = `<div class="bank-box"><span>BRI • 9988776655<br>Penerima: <b>Desta Nails Collection</b></span>
      <button class="copy-btn" onclick="copyText('9988776655')">Copy</button></div>`;
  } else if(val.includes('DANA')){
    html = `<div class="bank-box"><span>DANA • 085774771996<br>Penerima: <b>Desta Nails Collection</b></span>
      <button class="copy-btn" onclick="copyText('085774771996')">Copy</button></div>`;
  } else if(val.includes('OVO')){
    html = `<div class="bank-box"><span>OVO • 085774771996<br>Penerima: <b>Desta Nails Collection</b></span>
      <button class="copy-btn" onclick="copyText('085774771996')">Copy</button></div>`;
  } else if(val.includes('QRIS')){
    html = `<div class="bank-box"><span>Scan QRIS untuk bayar ke <b>Desta Nails Collection</b></span></div>
      <img class="qris-img" src="https://via.placeholder.com/240x240.png?text=QRIS+Desta+Nails" alt="QRIS">`;
  } else if(val.includes('COD')){
    html = `<div class="bank-box"><span>Pembayaran dilakukan saat barang diterima (COD)</span></div>`;
  }
  paymentDetailsArea.innerHTML = html;
});

// === Tombol Status ===
document.getElementById('statusIcon').addEventListener('click', ()=>{
  window.location.href = 'status.html';
});

// === Copy Text Umum ===
window.copyText=t=>{
  navigator.clipboard.writeText(t).then(()=>{
    Swal.fire({
      icon:'success',
      title:'Tersalin!',
      text:t,
      timer:1500,
      showConfirmButton:false,
      background:'#f9d6eb',
      color:'#4c0068'
    });
  });
};
