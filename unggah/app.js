import {rupiah,suggestTotal} from './ocr-utils.js';
import {session} from '../session.js?v=20261126-sso1';
const API='https://dkpgmchugxretivziawy.supabase.co/functions/v1/bon-operator';
const el=id=>document.getElementById(id);let credential='',photo=null,worker=null,payload=null,requestId=null,busy=false,previewUrl=null;
const pendingKey='bon-proyek-pending-upload-id';
const put=(id,text)=>el(id).textContent=text;
let nextReceiptTimer=null;
const savedBanner=document.createElement('div');savedBanner.className='notice';savedBanner.hidden=true;savedBanner.setAttribute('role','status');savedBanner.setAttribute('aria-live','polite');el('workspace').prepend(savedBanner);
const sourceLinks=document.createElement('nav');sourceLinks.className='notice actions';sourceLinks.setAttribute('aria-label','Buka sumber data');
for(const [label,id] of [['Buka Tagihan','16vTiGt51obdCg3Sx3WEa5QYftHIb1MMgI5PAy4qZsvk'],['Buka Pembayaran','1yqCJTwX-_1JEHR9blXg5_Dvfvxz11JqSlUL2rcHZPAU']]){
 const link=document.createElement('a');link.textContent=label;link.className='secondary';link.href=`https://docs.google.com/spreadsheets/d/${id}/edit`;link.target='_blank';link.rel='noopener noreferrer';sourceLinks.append(link);
}
savedBanner.after(sourceLinks);
function cancelNextReceipt(){if(nextReceiptTimer!==null){clearTimeout(nextReceiptTimer);nextReceiptTimer=null;}}
el('date').value=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'});
async function api(url=API,options={}){
 const response=await fetch(url,{...options,headers:{...options.headers,Authorization:'Bearer '+session.getToken()},credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(80000)});
 const data=await response.json().catch(()=>({}));if(!response.ok){if(response.status===401)session.invalidate();const e=new Error(data.error||'Koneksi belum tersedia.');e.status=response.status;throw e;}return data;
}
function savedId(){try{return localStorage.getItem(pendingKey);}catch{return null;}}
function remember(id){try{id?localStorage.setItem(pendingKey,id):localStorage.removeItem(pendingKey);}catch{}}
function fieldLock(lock){for(const id of ['project','date','photo','amount','category','description','verified','sample','ocr'])el(id).disabled=lock;el('save').disabled=lock||!photo;}
function lock(){credential='';el('workspace').hidden=true;el('gate').hidden=false;el('logout').hidden=true;el('code').value='';reset();savedBanner.hidden=true;savedBanner.textContent='';}
el('logout').addEventListener('click',async()=>{try{await session.logout();lock();}catch{lock();put('login-message','Sudah keluar di perangkat ini. Penutupan sesi server belum dapat dikonfirmasi.');}});
let restoring=false;
async function unlock(){
 await api(API+'?mode=session');credential=session.getToken();el('code').value='';el('gate').hidden=true;el('workspace').hidden=false;el('logout').hidden=false;put('login-message','');
 const id=savedId();el('resume').hidden=!id;if(id){requestId=id;put('resume-text','Ada penyimpanan sebelumnya yang belum ditutup. Periksa status sebelum mencatat bon yang sama.');}
}
async function restore(){if(restoring||!el('workspace').hidden||!session.getToken())return;restoring=true;put('login-message','Memulihkan sesi login…');try{await unlock();}catch(e){put('login-message',e.message);}finally{restoring=false;}}
document.addEventListener('bon-session-changed',event=>{if(event.detail.type==='signed-out')lock();else restore();});
el('login-form').addEventListener('submit',async event=>{
 event.preventDefault();el('login').disabled=true;put('login-message','Memeriksa akses…');
 try{await session.login(el('code').value.trim(),el('remember-device').checked);await unlock();
 }catch(e){credential='';put('login-message',e.message);}finally{el('login').disabled=false;}
});
async function prepare(file){
 if(busy||payload)throw Error('Selesaikan pemeriksaan status penyimpanan sebelumnya terlebih dahulu.');
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024)throw Error('Pilih JPG, PNG, atau WebP maksimal 8 MB.');
 const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
 if(bitmap.width*bitmap.height>24000000){bitmap.close();throw Error('Resolusi foto terlalu besar. Gunakan foto hingga 24 megapiksel.');}
 const scale=Math.min(1,1920/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
 const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 photo=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.92));if(!photo||photo.size>4*1024*1024)throw Error('Foto masih terlalu besar setelah diproses.');
 savedBanner.hidden=true;savedBanner.textContent='';
 if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(photo);el('preview').src=previewUrl;el('preview').hidden=false;el('photo-empty').hidden=true;
 el('ocr').disabled=false;el('save').disabled=false;el('amount').value='';el('verified').checked=false;put('suggestion','Total belum dibaca.');put('ocr-message','Foto siap. Jalankan OCR atau isi total dari foto secara manual.');put('ocr-text','Belum ada hasil.');
}
el('photo').addEventListener('change',async()=>{try{if(el('photo').files[0])await prepare(el('photo').files[0]);}catch(e){put('ocr-message',e.message);}});
el('sample').addEventListener('click',async()=>{
 try{el('sample').disabled=true;const r=await fetch('./sample.jpg');if(!r.ok)throw Error('Contoh belum tersedia.');await prepare(new File([await r.blob()],'contoh-cord.jpg',{type:'image/jpeg'}));await readOcr();}catch(e){put('ocr-message',e.message);}finally{el('sample').disabled=!!payload;}
});
async function readOcr(){
 if(!photo||busy||payload)return;busy=true;el('ocr').disabled=true;el('save').disabled=true;el('sample').disabled=true;el('photo').disabled=true;
 put('ocr-message','Menyiapkan OCR. Penggunaan pertama perlu mengunduh model.');
 try{
  if(!window.Tesseract)throw Error('Model OCR belum dapat dimuat. Anda tetap dapat membaca foto dan mengisi total manual.');
  if(!worker)worker=await window.Tesseract.createWorker('eng',1,{workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js',corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',langPath:'https://tessdata.projectnaptha.com/4.0.0',logger:m=>{if(m.status==='recognizing text')put('ocr-message',`Membaca foto: ${Math.round(m.progress*100)}%`);}});
  await worker.setParameters({tessedit_pageseg_mode:'11'});
  const bitmap=await createImageBitmap(photo);const scale=Math.min(2,3000/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  const ctx=canvas.getContext('2d');ctx.filter='grayscale(1) contrast(1.35)';ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const {data}=await worker.recognize(canvas);put('ocr-text',data.text||'Teks belum terbaca.');const total=suggestTotal(data.text||'');
  if(total){el('amount').value=total.amount;put('suggestion',`Usulan OCR: ${rupiah(total.amount)}`);put('ocr-message','Periksa usulan terhadap total pada foto. Koreksi angka jika perlu.');}
  else{put('suggestion','Total belum dapat dipastikan.');put('ocr-message','Periksa foto dan isi total terverifikasi secara manual.');}
 }catch(e){put('ocr-message',e.message||'OCR gagal. Isi total manual dari foto.');worker?.terminate();worker=null;}
 finally{busy=false;el('ocr').disabled=false;el('save').disabled=false;el('sample').disabled=false;el('photo').disabled=false;}
}
el('ocr').addEventListener('click',readOcr);
function showResult(data){
 cancelNextReceipt();
 if(data.state==='committed'){
  remember(null);el('resume').hidden=true;put('save-message',`${data.invoice} berhasil dicatat sebesar ${rupiah(data.amount)}. Dashboard akan membaca pembaruannya. Pembayaran belum dibuat.`);el('check').hidden=true;el('new').hidden=false;
  savedBanner.textContent=`${data.invoice} berhasil dicatat sebesar ${rupiah(data.amount)}. Formulir siap untuk bon berikutnya. Pembayaran belum dibuat.`;savedBanner.hidden=false;
  nextReceiptTimer=setTimeout(reset,2500);
 }else{put('save-message',data.message||'Penyimpanan belum terkonfirmasi. Periksa status, jangan unggah ulang bon yang sama.');el('check').hidden=false;el('new').hidden=true;}
}
async function checkStatus(){
 const id=requestId||savedId();if(!id)return;
 try{const data=await api(API+'?id='+encodeURIComponent(id));showResult(data);if(data.state==='reserved'&&payload){put('save-message','Belum masuk ke Tagihan. Foto dapat dikirim lagi dengan ID yang sama.');el('save').disabled=false;}}
 catch(e){put('save-message',e.status===404?'Belum ada catatan penyimpanan. Jika foto dan isian masih tersedia, coba simpan dengan ID yang sama.':e.message);if(e.status===404&&payload)el('save').disabled=false;}
}
el('check').addEventListener('click',checkStatus);el('resume-check').addEventListener('click',checkStatus);
el('save-form').addEventListener('submit',async event=>{
 event.preventDefault();if(busy||!photo)return;busy=true;
 if(!payload){requestId=requestId||crypto.randomUUID();payload={id:requestId,project:el('project').value.trim().toUpperCase(),date:el('date').value,amount:Number(el('amount').value),category:el('category').value,description:el('description').value.trim(),verified:el('verified').checked};}
 remember(requestId);fieldLock(true);put('save-message','Mengirim foto dan mencatat tagihan…');
 try{const form=new FormData();form.append('metadata',JSON.stringify(payload));form.append('photo',photo,'bon.jpg');showResult(await api(API,{method:'POST',body:form}));}
 catch(e){put('save-message',e.message);if(e.status===400){payload=null;remember(null);fieldLock(false);}else{el('check').hidden=false;put('save-message',e.message+' Periksa status sebelum mencoba lagi.');}}
 finally{busy=false;}
});
function reset(){
 cancelNextReceipt();
 photo=null;payload=null;requestId=null;busy=false;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;el('preview').removeAttribute('src');el('preview').hidden=true;el('photo-empty').hidden=false;
 el('save-form').reset();el('photo').value='';fieldLock(false);el('ocr').disabled=true;el('save').disabled=true;el('new').hidden=true;el('check').hidden=true;put('save-message','');put('suggestion','Total belum dibaca.');put('ocr-text','Belum ada hasil.');put('ocr-message','Pilih foto untuk mulai membaca.');
 if(!el('workspace').hidden)el('workspace').scrollIntoView({behavior:'smooth',block:'start'});
}
el('new').addEventListener('click',reset);
restore();
