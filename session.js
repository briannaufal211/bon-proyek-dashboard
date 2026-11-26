const AUTH='https://dkpgmchugxretivziawy.supabase.co/functions/v1/bon-auth';
const COOKIE='bon_proyek_session_v1';
const basePath=new URL('.',import.meta.url).pathname;
let memory=null;let expiryTimer=null;
const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('bon-proyek-auth-v1'):null;
function read(){
 try{
  const value=document.cookie.split('; ').find(c=>c.startsWith(COOKIE+'='));
  if(value){const stored=JSON.parse(decodeURIComponent(value.slice(COOKIE.length+1)));if(/^[\w-]{43}$/.test(stored.token)&&Date.parse(stored.expiresAt)>Date.now()){memory=stored;return memory;}}
 }catch{}
 if(memory&&Date.parse(memory.expiresAt)>Date.now())return memory;
 return null;
}
function clear(){memory=null;clearTimeout(expiryTimer);document.cookie=`${COOKIE}=; Path=${basePath}; Max-Age=0; SameSite=Strict; Secure`;}
function notify(type){document.dispatchEvent(new CustomEvent('bon-session-changed',{detail:{type}}));}
function expiry(record){clearTimeout(expiryTimer);expiryTimer=setTimeout(()=>{clear();notify('signed-out');},Math.min(2147483647,Math.max(0,Date.parse(record.expiresAt)-Date.now())));}
function save(record){
 memory=record;let value=`${COOKIE}=${encodeURIComponent(JSON.stringify(record))}; Path=${basePath}; SameSite=Strict; Secure`;
 if(record.remember)value+='; Max-Age='+Math.max(0,Math.floor((Date.parse(record.expiresAt)-Date.now())/1000));
 document.cookie=value;expiry(record);channel?.postMessage('signed-in');
}
const messages = {
  "Asal halaman tidak diizinkan.": "This page origin is not authorized.",
  "Origin tidak diizinkan.": "This page origin is not authorized.",
  "Metode tidak diizinkan.": "This method is not allowed.",
  "Layanan ini hanya untuk membaca laporan.": "This service only provides read-only reports.",
  "Akses belum dikonfigurasi.": "Access has not been configured.",
  "Aplikasi belum dikonfigurasi.": "The receipt app has not been configured.",
  "Akses dashboard belum dikonfigurasi.": "Dashboard access has not been configured.",
  "Terlalu banyak percobaan. Coba kembali dalam 10 menit.": "Too many attempts. Try again in 10 minutes.",
  "Permintaan terlalu besar.": "The request is too large.",
  "Permintaan tidak valid.": "The request is invalid.",
  "Kode akses belum cocok.": "The access code is incorrect.",
  "Sesi berakhir. Silakan masuk kembali.": "Your session has expired. Sign in again.",
  "Layanan tidak ditemukan.": "The service was not found.",
  "Layanan login belum dapat dihubungi. Coba kembali.": "The sign-in service is unavailable. Try again shortly.",
  "Layanan sesi belum dapat diperiksa. Coba kembali.": "Your session could not be verified. Try again shortly.",
  "Google Sheets belum dapat dibaca. Coba beberapa saat lagi.": "Google Sheets is temporarily unavailable. Try again shortly.",
  "ID unggahan tidak valid.": "The upload ID is invalid.",
  "Unggahan belum tercatat.": "No upload has been recorded.",
  "Kode proyek harus seperti PROYEK-A.": "Enter a project code such as PROYEK-A.",
  "Tanggal transaksi tidak valid.": "Enter a valid transaction date.",
  "Isi total rupiah utuh yang lebih besar dari nol.": "Enter a whole rupiah amount greater than zero.",
  "Pilih kategori biaya.": "Select a cost category.",
  "Keterangan harus 3-160 karakter.": "The description must be 3 to 160 characters.",
  "Periksa dan konfirmasi isi bon sebelum menyimpan.": "Review and confirm the receipt before saving.",
  "Foto terlalu besar.": "The photo is too large.",
  "Pilih foto JPEG yang valid, maksimal 4 MB setelah diproses.": "Choose a valid JPEG that is no larger than 4 MB after processing.",
  "Isi foto JPEG tidak valid.": "The JPEG file is invalid.",
  "Penyimpanan sedang diperiksa. Jangan buat unggahan baru untuk bon yang sama.": "The save is being checked. Use the existing upload for this receipt.",
  "Penyimpanan sedang berjalan.": "The receipt is being saved.",
  "Hasil penyimpanan belum pasti. Periksa status; jangan unggah ulang bon ini.": "Check the status of this save before attempting to record the same receipt again.",
  "Penyimpanan belum dapat diselesaikan. Gunakan Periksa status sebelum mencoba lagi.": "The save could not be completed. Check its status before trying again."
};
export const englishMessage = (message, fallback) => messages[message] ?? fallback;
async function request(action,options={}){
 const r=await fetch(AUTH+'?action='+action,{...options,credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(20000)});
 const data=await r.json().catch(()=>({}));if(!r.ok){const error=new Error(englishMessage(data.error,'Sign-in could not be completed. Try again shortly.'));error.status=r.status;throw error;}return data;
}
channel?.addEventListener('message',event=>{if(event.data==='signed-out'){clear();notify('signed-out');}else if(event.data==='signed-in'){memory=null;const record=read();if(record)expiry(record);notify('signed-in');}});
const initial=read();if(initial)expiry(initial);
export const session=Object.freeze({
 getToken:()=>read()?.token||'',
 login:async(code,remember)=>{const record=await request('login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,remember:!!remember})});save(record);return record.token;},
 invalidate:()=>{clear();channel?.postMessage('signed-out');notify('signed-out');},
 logout:async()=>{const token=read()?.token;try{if(token)await request('logout',{method:'POST',headers:{Authorization:'Bearer '+token}});}finally{clear();channel?.postMessage('signed-out');notify('signed-out');}},
});
