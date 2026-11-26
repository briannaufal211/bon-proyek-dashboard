import {rupiah,suggestTotal} from './ocr-utils.js';
import {session, englishMessage} from '../session.js?v=20261126-en1';
const API='https://dkpgmchugxretivziawy.supabase.co/functions/v1/bon-operator';
const el=id=>document.getElementById(id);let credential='',photo=null,worker=null,payload=null,requestId=null,busy=false,previewUrl=null;
const pendingKey='bon-proyek-pending-upload-id';
const put=(id,text)=>el(id).textContent=text;
let nextReceiptTimer=null;
const savedBanner=document.createElement('div');savedBanner.className='notice';savedBanner.hidden=true;savedBanner.setAttribute('role','status');savedBanner.setAttribute('aria-live','polite');el('workspace').prepend(savedBanner);
const sourceLinks=document.createElement('nav');sourceLinks.className='notice actions';sourceLinks.setAttribute('aria-label','Buka sumber data');
for(const [label,id] of [['Open Invoices sheet','16vTiGt51obdCg3Sx3WEa5QYftHIb1MMgI5PAy4qZsvk'],['Open Payments sheet','1yqCJTwX-_1JEHR9blXg5_Dvfvxz11JqSlUL2rcHZPAU']]){
 const link=document.createElement('a');link.textContent=label;link.className='secondary';link.href=`https://docs.google.com/spreadsheets/d/${id}/edit`;link.target='_blank';link.rel='noopener noreferrer';sourceLinks.append(link);
}
savedBanner.after(sourceLinks);
function cancelNextReceipt(){if(nextReceiptTimer!==null){clearTimeout(nextReceiptTimer);nextReceiptTimer=null;}}
el('date').value=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'});
async function api(url=API,options={}){
 const response=await fetch(url,{...options,headers:{...options.headers,Authorization:'Bearer '+session.getToken()},credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(80000)});
 const data=await response.json().catch(()=>({}));if(!response.ok){if(response.status===401)session.invalidate();const e=new Error(englishMessage(data.error,'The receipt service is unavailable. Please try again shortly.'));e.status=response.status;throw e;}return data;
}
function savedId(){try{return localStorage.getItem(pendingKey);}catch{return null;}}
function remember(id){try{id?localStorage.setItem(pendingKey,id):localStorage.removeItem(pendingKey);}catch{}}
function fieldLock(lock){for(const id of ['project','date','photo','amount','category','description','verified','sample','ocr'])el(id).disabled=lock;el('save').disabled=lock||!photo;}
function lock(){credential='';el('workspace').hidden=true;el('gate').hidden=false;el('logout').hidden=true;el('code').value='';reset();savedBanner.hidden=true;savedBanner.textContent='';}
el('logout').addEventListener('click',async()=>{try{await session.logout();lock();}catch{lock();put('login-message','Signed out on this device. The server could not confirm that the session has ended.');}});
let restoring=false;
async function unlock(){
 await api(API+'?mode=session');credential=session.getToken();el('code').value='';el('gate').hidden=true;el('workspace').hidden=false;el('logout').hidden=false;put('login-message','');
 const id=savedId();el('resume').hidden=!id;if(id){requestId=id;put('resume-text','A previous save is unresolved. Check its status before recording the same receipt.');}
}
async function restore(){if(restoring||!el('workspace').hidden||!session.getToken())return;restoring=true;put('login-message','Restoring your session…');try{await unlock();}catch(e){put('login-message',e.message);}finally{restoring=false;}}
document.addEventListener('bon-session-changed',event=>{if(event.detail.type==='signed-out')lock();else restore();});
el('login-form').addEventListener('submit',async event=>{
 event.preventDefault();el('login').disabled=true;put('login-message','Checking access…');
 try{await session.login(el('code').value.trim(),el('remember-device').checked);await unlock();
 }catch(e){credential='';put('login-message',e.message);}finally{el('login').disabled=false;}
});
async function prepare(file){
 if(busy||payload)throw Error('Check the status of the previous save first.');
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024)throw Error('Choose a JPG, PNG, or WebP up to 8 MB.');
 const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
 if(bitmap.width*bitmap.height>24000000){bitmap.close();throw Error('The photo exceeds the 24-megapixel limit.');}
 const scale=Math.min(1,1920/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
 const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 photo=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.92));if(!photo||photo.size>4*1024*1024)throw Error('The photo is still too large after processing.');
 savedBanner.hidden=true;savedBanner.textContent='';
 if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(photo);el('preview').src=previewUrl;el('preview').hidden=false;el('photo-empty').hidden=true;
 el('ocr').disabled=false;el('save').disabled=false;el('amount').value='';el('verified').checked=false;put('suggestion','No total detected yet.');put('ocr-message','Photo ready. Run OCR or enter the total from the photo.');put('ocr-text','No text yet.');
}
el('photo').addEventListener('change',async()=>{try{if(el('photo').files[0])await prepare(el('photo').files[0]);}catch(e){put('ocr-message',e.message);}});
el('sample').addEventListener('click',async()=>{
 try{el('sample').disabled=true;const r=await fetch('./sample.jpg');if(!r.ok)throw Error('The sample receipt is currently unavailable.');await prepare(new File([await r.blob()],'cord-sample.jpg',{type:'image/jpeg'}));await readOcr();}catch(e){put('ocr-message',e.message);}finally{el('sample').disabled=!!payload;}
});
async function readOcr(){
 if(!photo||busy||payload)return;busy=true;el('ocr').disabled=true;el('save').disabled=true;el('sample').disabled=true;el('photo').disabled=true;
 put('ocr-message','Preparing OCR. The first run downloads the model.');
 try{
  if(!window.Tesseract)throw Error('The OCR model could not load. Enter the total from the photo manually.');
  if(!worker)worker=await window.Tesseract.createWorker('eng',1,{workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js',corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',langPath:'https://tessdata.projectnaptha.com/4.0.0',logger:m=>{if(m.status==='recognizing text')put('ocr-message',`Reading the photo: ${Math.round(m.progress*100)}%`);}});
  await worker.setParameters({tessedit_pageseg_mode:'11'});
  const bitmap=await createImageBitmap(photo);const scale=Math.min(2,3000/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  const ctx=canvas.getContext('2d');ctx.filter='grayscale(1) contrast(1.35)';ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const {data}=await worker.recognize(canvas);put('ocr-text',data.text||'No text recognized.');const total=suggestTotal(data.text||'');
  if(total){el('amount').value=total.amount;put('suggestion',`OCR suggestion: ${rupiah(total.amount)}`);put('ocr-message','Compare this amount with the receipt and correct it if needed.');}
  else{put('suggestion','The receipt total could not be confirmed.');put('ocr-message','Check the photo and enter the verified total manually.');}
 }catch(e){put('ocr-message',e.message||'OCR failed. Enter the total from the photo.');worker?.terminate();worker=null;}
 finally{busy=false;el('ocr').disabled=false;el('save').disabled=false;el('sample').disabled=false;el('photo').disabled=false;}
}
el('ocr').addEventListener('click',readOcr);
function showResult(data){
 cancelNextReceipt();
 if(data.state==='committed'){
  remember(null);el('resume').hidden=true;put('save-message',`Recorded ${data.invoice} for ${rupiah(data.amount)}. The dashboard will pick up the invoice. Record its payment separately.`);el('check').hidden=true;el('new').hidden=false;
  savedBanner.textContent=`Recorded ${data.invoice} for ${rupiah(data.amount)}. The form is ready for your next receipt. Record its payment separately.`;savedBanner.hidden=false;
  nextReceiptTimer=setTimeout(reset,2500);
 }else{put('save-message',englishMessage(data.message,'The save is unconfirmed. Check its status before recording the receipt again.'));el('check').hidden=false;el('new').hidden=true;}
}
async function checkStatus(){
 const id=requestId||savedId();if(!id)return;
 try{const data=await api(API+'?id='+encodeURIComponent(id));showResult(data);if(data.state==='reserved'&&payload){put('save-message','The invoice is not yet in the Invoices sheet. You can send the photo again using the same upload ID.');el('save').disabled=false;}}
 catch(e){put('save-message',e.status===404?'No save was found. If the photo and form are still available, try again using the same upload ID.':e.message);if(e.status===404&&payload)el('save').disabled=false;}
}
el('check').addEventListener('click',checkStatus);el('resume-check').addEventListener('click',checkStatus);
el('save-form').addEventListener('submit',async event=>{
 event.preventDefault();if(busy||!photo)return;busy=true;
 if(!payload){requestId=requestId||crypto.randomUUID();payload={id:requestId,project:el('project').value.trim().toUpperCase(),date:el('date').value,amount:Number(el('amount').value),category:el('category').value,description:el('description').value.trim(),verified:el('verified').checked};}
 remember(requestId);fieldLock(true);put('save-message','Uploading the photo and recording the invoice…');
 try{const form=new FormData();form.append('metadata',JSON.stringify(payload));form.append('photo',photo,'bon.jpg');showResult(await api(API,{method:'POST',body:form}));}
 catch(e){put('save-message',e.message);if(e.status===400){payload=null;remember(null);fieldLock(false);}else{el('check').hidden=false;put('save-message',e.message+' Check the save status before trying again.');}}
 finally{busy=false;}
});
function reset(){
 cancelNextReceipt();
 photo=null;payload=null;requestId=null;busy=false;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;el('preview').removeAttribute('src');el('preview').hidden=true;el('photo-empty').hidden=false;
 el('save-form').reset();el('photo').value='';fieldLock(false);el('ocr').disabled=true;el('save').disabled=true;el('new').hidden=true;el('check').hidden=true;put('save-message','');put('suggestion','No total detected yet.');put('ocr-text','No text yet.');put('ocr-message','Choose a photo to get started.');
 if(!el('workspace').hidden)el('workspace').scrollIntoView({behavior:'smooth',block:'start'});
}
el('new').addEventListener('click',reset);
restore();
