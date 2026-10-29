'use strict';
const $=id=>document.getElementById(id);
let currentData=null;
const fmt=n=>Number(n||0).toLocaleString('de-DE',{maximumFractionDigits:0});
const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const dateLabel=s=>/^\d{8}$/.test(s)?`${s.slice(6)}.${s.slice(4,6)}.${s.slice(0,4)}`:s;
const dateStamp=s=>Date.UTC(+s.slice(0,4),+s.slice(4,6)-1,+s.slice(6,8));
async function derive(pw,salt){
 const km=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:600000,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt']);
}
$('year').textContent=new Date().getFullYear();
$('show-pw').addEventListener('click',()=>{
 const show=$('pw').type==='password'; $('pw').type=show?'text':'password';
 $('show-pw').textContent=show?'Verbergen':'Zeigen'; $('show-pw').setAttribute('aria-label',show?'Passwort verbergen':'Passwort anzeigen'); $('show-pw').setAttribute('aria-pressed',String(show));
});
if(location.protocol!=='https:'){$('gate-wrap').hidden=true;$('wait').hidden=false;}
else $('gate').addEventListener('submit',async e=>{
 e.preventDefault();$('err').textContent='';$('unlock').disabled=true;$('unlock').textContent='Wird entschlüsselt …';
 try{
  const r=await fetch('data/analytics.json.enc',{cache:'no-store'});if(!r.ok)throw new Error('unavailable');
  const p=await r.json(),key=await derive($('pw').value,b64(p.salt));
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(p.iv)},key,b64(p.ct));
  const data=JSON.parse(new TextDecoder().decode(pt));
  if(!Array.isArray(data.daily)||!Array.isArray(data.pages)||!Array.isArray(data.sources))throw new Error('schema');
  currentData=data;render(data);$('pw').value='';$('pw').type='password';$('gate-wrap').hidden=true;$('dash').hidden=false;$('lock').hidden=false;
  $('dash').setAttribute('tabindex','-1');$('dash').focus({preventScroll:true});
 }catch(_){$('err').textContent='Das Dashboard konnte nicht geöffnet werden. Prüfe dein Passwort oder versuche es später erneut.';}
 finally{$('unlock').disabled=false;$('unlock').replaceChildren(document.createTextNode('Dashboard öffnen →'));}
});
$('lock').addEventListener('click',()=>location.reload());
$('chart-metric').addEventListener('change',()=>{if(currentData)renderChart(currentData);});
$('page-search').addEventListener('input',()=>{if(currentData)renderPages(currentData);});
function render(d){
 const sum=i=>d.daily.reduce((a,r)=>a+(Number(r.m[i])||0),0);
 $('kUsers').textContent=fmt(sum(0));$('kSessions').textContent=fmt(sum(1));$('kViews').textContent=fmt(sum(2));
 const generated=new Date(d.generated);
 $('updated').textContent=Number.isNaN(generated.valueOf())?'Snapshot-Zeit nicht verfügbar':`Stand: ${generated.toLocaleString('de-DE',{timeZone:'Europe/Berlin',dateStyle:'medium',timeStyle:'short'})} Uhr (Berlin)`;
 renderChart(d);renderPages(d);renderTable('sources',d.sources,'Quelle','Sitzungen',true);
}
function renderPages(d){const q=$('page-search').value.toLocaleLowerCase('de');renderTable('pages',d.pages.filter(r=>String(r.d[0]).toLocaleLowerCase('de').includes(q)),'Seite','Aufrufe');}
function renderTable(id,rows,first,last,source=false){
 const table=$(id);table.replaceChildren();
 const cap=document.createElement('caption');cap.className='sr-only';cap.textContent=source?'Quellen nach Sitzungen':'Seiten nach Aufrufen';table.append(cap);
 const thead=table.createTHead(),head=thead.insertRow();for(const label of [first,last]){const th=document.createElement('th');th.scope='col';th.textContent=label;head.append(th);}
 const body=table.createTBody();const total=rows.reduce((a,r)=>a+(Number(r.m[0])||0),0);
 if(!rows.length){const td=body.insertRow().insertCell();td.colSpan=2;td.textContent=id==='pages'&&$('page-search').value?'Keine passenden Seiten.':'Noch keine Daten im Snapshot.';return;}
 for(const row of rows){const tr=body.insertRow(),td=tr.insertCell();let label=String(row.d[0]||'(nicht zugeordnet)');if(source&&label==='(direct)')label='Direkt / unbekannt';td.append(document.createTextNode(label));const bar=document.createElement('div');bar.className='bar';bar.setAttribute('aria-hidden','true');const fill=document.createElement('span');fill.style.width=(total?Math.max(0,Math.min(100,Number(row.m[0])/total*100)):0)+'%';bar.append(fill);td.append(bar);tr.insertCell().textContent=fmt(row.m[0]);}
}
function renderChart(d){
 const index={users:0,sessions:1,views:2}[$('chart-metric').value];
 const label=['Aktive Nutzer pro Tag','Sitzungen pro Tag','Seitenaufrufe pro Tag'][index];
 const ds=d.daily.map(r=>({date:String(r.d[0]),value:Math.max(0,Number(r.m[index])||0)})).filter(r=>/^\d{8}$/.test(r.date)).sort((a,b)=>a.date.localeCompare(b.date));
 const svg=$('chart');svg.replaceChildren();svg.setAttribute('aria-label',label);
 const ns='http://www.w3.org/2000/svg';const add=(tag,attrs,text)=>{const el=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,String(v));if(text!==undefined)el.textContent=text;svg.append(el);return el;};
 const title=add('title',{},label);title.id='chart-title';svg.setAttribute('aria-labelledby','chart-title');
 const W=1000,H=240,L=34,R=12,T=15,B=18,max=Math.max(1,...ds.map(x=>x.value));
 for(let i=0;i<4;i++){const val=Math.ceil(max/3*(3-i)),y=T+(H-T-B)*i/3;add('line',{x1:L,x2:W-R,y1:y,y2:y,stroke:'#e8eef5','stroke-dasharray':i===3?'none':'3 5'});add('text',{x:L-9,y:y+4,fill:'#64748b','font-size':11,'text-anchor':'end'},fmt(val));}
 if(!ds.length){add('text',{x:W/2,y:H/2,fill:'#64748b','font-size':15,'text-anchor':'middle'},'Noch keine Daten im Snapshot.');$('chart-summary').textContent='Sobald Messdaten vorliegen, erscheint hier der Verlauf.';$('chart-start').textContent='';$('chart-end').textContent='';return;}
 const first=dateStamp(ds[0].date),last=dateStamp(ds[ds.length-1].date),span=Math.max(86400000,last-first);
 const pts=ds.map(x=>[ds.length===1?(W+L-R)/2:L+(dateStamp(x.date)-first)/span*(W-L-R),H-B-x.value/max*(H-T-B)]);
 const line=pts.map((p,i)=>(i?'L':'M')+p.map(n=>n.toFixed(2)).join(',')).join(' ');
 if(ds.length>1){add('path',{d:`${line} L${pts[pts.length-1][0]},${H-B} L${pts[0][0]},${H-B} Z`,fill:'#1d6bc012'});add('path',{d:line,fill:'none',stroke:'#1d6bc0','stroke-width':2.5,'stroke-linejoin':'round'});}
 pts.forEach((p,i)=>{const dot=add('circle',{cx:p[0],cy:p[1],r:3.5,fill:'#1d6bc0',stroke:'white','stroke-width':1.5});const tip=document.createElementNS(ns,'title');tip.textContent=`${dateLabel(ds[i].date)}: ${fmt(ds[i].value)}`;dot.append(tip);});
 $('chart-summary').textContent=`${label} · Höchster Tageswert: ${fmt(Math.max(...ds.map(x=>x.value)))} · ${ds.length} Tage mit Daten`;
 $('chart-start').textContent=dateLabel(ds[0].date);$('chart-end').textContent=dateLabel(ds[ds.length-1].date);
}
