export function rupiah(value){return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(value);}
export function numeric(text){
 let s=text.replace(/\s/g,'').replace(/^[Rr][Pp][.:]?/,'');
 if(!/^\d[\d.,]*$/.test(s))return null;
 if(/[,\.]\d{2}$/.test(s)){
  const end=s.slice(-2);if(end!=='00')return null;s=s.slice(0,-3);
 }
 const value=Number(s.replace(/[.,]/g,''));return Number.isSafeInteger(value)&&value>0&&value<=999999999999?value:null;
}
export function suggestTotal(text){
 const lines=text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);const hits=[];
 for(let i=0;i<lines.length;i++){
  const line=lines[i];
  if(/sub\s*total|kembali|change|cash|tunai|bayar|payment|diskon|discount/i.test(line)&&!/grand\s*total|total\s*(?:akhir|belanja)/i.test(line))continue;
  if(!/gra[nm]?d\s*total|\btotal\b|amount\s*due|jumlah\s*(?:akhir|bayar)|balance\s*due/i.test(line))continue;
  const tokens=line.match(/\d[\d.,]*(?:\s*\d{3})*/g)||[];
  let values=tokens.map(numeric).filter(v=>v!==null&&v>=100);
  if(!values.length&&lines[i+1])values=(lines[i+1].match(/\d[\d.,]*/g)||[]).map(numeric).filter(v=>v!==null&&v>=100);
  if(values.length)hits.push({amount:values.at(-1),score:/gra[nm]?d\s*total|total\s*(?:akhir|belanja)/i.test(line)?2:1,line:line.trim()});
 }
 hits.sort((a,b)=>b.score-a.score);if(!hits.length)return null;
 const best=hits.filter(hit=>hit.score===hits[0].score);
 return new Set(best.map(hit=>hit.amount)).size===1?best[0]:null;
}
