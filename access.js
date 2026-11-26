import {session, englishMessage} from './session.js?v=20261126-en1';
(() => {
 let unlocked=false,firstSnapshot=null,restoring=false;
 const el=id=>document.getElementById(id);
 const gate=el('access-gate'),report=el('dashboard'),form=el('access-form'),input=el('access-code'),message=el('access-message'),submit=el('access-submit'),logout=el('logout');
 async function fetchReport(){
  const token=session.getToken();if(!token){const error=new Error('Your session has expired. Sign in again.');error.status=401;throw error;}
  const response=await fetch(window.BON_DASHBOARD_CONFIG.endpoint,{method:'GET',cache:'no-store',credentials:'omit',headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(25000)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const error=new Error(englishMessage(data.error,'The report could not be opened.'));error.status=response.status;throw error;}
  if(!data.revision||!Array.isArray(data.invoices)||!Array.isArray(data.cases))throw Error('Report data is currently unavailable.');return data;
 }
 function lock(text=''){
  unlocked=false;firstSnapshot=null;report.hidden=true;gate.hidden=false;logout.hidden=true;message.textContent=text;input.value='';document.dispatchEvent(new Event('bon-dashboard-locked'));
 }
 function open(data){firstSnapshot=data;unlocked=true;report.hidden=false;gate.hidden=true;logout.hidden=false;message.textContent='';document.dispatchEvent(new Event('bon-dashboard-unlocked'));}
 async function restore(){
  if(restoring||unlocked||!session.getToken())return;restoring=true;message.textContent='Restoring your session…';
  try{open(await fetchReport());}catch(error){if(error.status===401)session.invalidate();lock(error.message==='Failed to fetch'?'Cannot connect to the report. Try again shortly.':error.message);}finally{restoring=false;}
 }
 window.bonDashboard=Object.freeze({isUnlocked:()=>unlocked,lock:(text='')=>{if(/session|access code/i.test(text))session.invalidate();lock(text);},read:async()=>{if(firstSnapshot){const data=firstSnapshot;firstSnapshot=null;return data;}return fetchReport();}});
 form.addEventListener('submit',async event=>{
  event.preventDefault();submit.disabled=true;submit.textContent='Opening the report…';message.textContent='';
  try{await session.login(input.value.trim(),el('access-remember').checked);input.value='';open(await fetchReport());}
  catch(error){if(error.status===401)session.invalidate();message.textContent=error.message==='Failed to fetch'?'Cannot connect to the sign-in service. Try again shortly.':error.message;}
  finally{submit.disabled=false;submit.textContent='Open dashboard';}
 });
 logout.addEventListener('click',async()=>{logout.disabled=true;try{await session.logout();lock();}catch{lock('Signed out on this device. The server could not confirm that the session has ended.');}finally{logout.disabled=false;}});
 document.addEventListener('bon-session-changed',event=>{if(event.detail.type==='signed-out')lock();else restore();});
 restore();
})();
