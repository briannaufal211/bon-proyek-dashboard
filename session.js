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
async function request(action,options={}){
 const r=await fetch(AUTH+'?action='+action,{...options,credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(20000)});
 const data=await r.json().catch(()=>({}));if(!r.ok){const error=new Error(data.error||'Login belum dapat diproses.');error.status=r.status;throw error;}return data;
}
channel?.addEventListener('message',event=>{if(event.data==='signed-out'){clear();notify('signed-out');}else if(event.data==='signed-in'){memory=null;const record=read();if(record)expiry(record);notify('signed-in');}});
const initial=read();if(initial)expiry(initial);
export const session=Object.freeze({
 getToken:()=>read()?.token||'',
 login:async(code,remember)=>{const record=await request('login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,remember:!!remember})});save(record);return record.token;},
 invalidate:()=>{clear();channel?.postMessage('signed-out');notify('signed-out');},
 logout:async()=>{const token=read()?.token;try{if(token)await request('logout',{method:'POST',headers:{Authorization:'Bearer '+token}});}finally{clear();channel?.postMessage('signed-out');notify('signed-out');}},
});
