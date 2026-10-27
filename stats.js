/* Pure calculations and backward-compatible local storage. No migration on load. */
(function(root){
'use strict';
const KEY='darts-practice-v1', INITIAL=KEY+'-backup-before-dashboard', PREVIOUS=KEY+'-backup-previous';
const marks=['×','○','☆'];
function recordId(r){return r.exportId||'legacy-'+String(r.id);}
function validDate(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T00:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===s;}
function jstDate(now=new Date()){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
function shift(day,n){const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function monday(day){const d=new Date(day+'T00:00:00Z');return shift(day,-((d.getUTCDay()+6)%7));}
function period(mode,today=jstDate()){
if(mode==='today')return {start:today,end:today,label:'今日 '+today};
if(mode==='week'){const start=monday(today);return {start,end:shift(start,6),label:'今週 '+start+'〜'+shift(start,6)};}
if(mode==='rolling')return {start:shift(today,-6),end:today,label:'直近1週間 '+shift(today,-6)+'〜'+today};
if(mode==='month'){const start=today.slice(0,7)+'-01',d=new Date(start+'T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);return {start,end:shift(d.toISOString().slice(0,10),-1),label:'今月 '+today.slice(0,7)};}
return {start:null,end:null,label:'全期間'};
}
function unique(records){const seen=new Set();return records.filter(r=>{const id=recordId(r);if(seen.has(id))return false;seen.add(id);return true;});}
function select(records,p){return unique(records).filter(r=>validDate(r.date)&&(!p.start||r.date>=p.start)&&(!p.end||r.date<=p.end));}
function finite(v){return typeof v==='number'&&Number.isFinite(v)&&v>=0;}
function aggregate(records){
const rows=unique(records),mm=rows.map(r=>r.mm).filter(finite);let tripleHits=0,tripleThrows=0,bullHits=0,nearHits=0,bullThrows=0;
for(const r of rows){if(Number.isInteger(r.triple)&&r.triple>=0&&r.triple<=3){tripleHits+=r.triple;tripleThrows+=3;}for(const m of (Array.isArray(r.bull)?r.bull.slice(0,3):[])){if(marks.includes(m)){bullThrows++;if(m==='☆')bullHits++;if(m==='☆'||m==='○')nearHits++;}}}
const sum=mm.reduce((a,b)=>a+b,0);
return {rounds:rows.length,throws:rows.length*3,days:new Set(rows.map(r=>r.date).filter(validDate)).size,mmN:mm.length,mmSum:sum,mean:mm.length?sum/mm.length:null,min:mm.length?Math.min(...mm):null,max:mm.length?Math.max(...mm):null,tripleHits,tripleThrows,triple:tripleThrows?100*tripleHits/tripleThrows:null,bullHits,nearHits,bullThrows,bull:bullThrows?100*bullHits/bullThrows:null,near:bullThrows?100*nearHits/bullThrows:null};
}
function groups(records,unit){const map=new Map();for(const r of unique(records)){if(!validDate(r.date))continue;const day=unit==='week'?monday(r.date):unit==='month'?r.date.slice(0,7):r.date;if(!map.has(day))map.set(day,[]);map.get(day).push(r);}return [...map].sort(([a],[b])=>a.localeCompare(b)).map(([date,rows])=>({date,...aggregate(rows)}));}
function comparison(records,mode,today=jstDate()){
let previous,label;
if(mode==='today'){const days=unique(records).map(r=>r.date).filter(d=>validDate(d)&&d<today).sort();const day=days.at(-1);previous={start:day||'0000-00-00',end:day||'0000-00-00'};label=day?'前回の練習日 '+day:'前回の練習日なし';}
else if(mode==='week'){const start=monday(today);previous={start:shift(start,-7),end:shift(start,-1)};label='先週 '+previous.start+'〜'+previous.end;}
else if(mode==='month'){const end=shift(today.slice(0,7)+'-01',-1);previous={start:end.slice(0,7)+'-01',end};label='先月 '+end.slice(0,7);}
else return null;
return {current:aggregate(select(records,period(mode,today))),previous:aggregate(select(records,previous)),label};
}
function bests(records){const rows=unique(records),daily=groups(rows,'day');const result={};const mm=rows.filter(r=>validDate(r.date)&&finite(r.mm)).sort((a,b)=>a.mm-b.mm||a.date.localeCompare(b.date)||recordId(a).localeCompare(recordId(b)));
result.min=mm.length?{value:mm[0].mm,date:mm[0].date,n:3,id:recordId(mm[0])}:null;
for(const key of ['bull','near','triple']){const den=key==='triple'?'tripleThrows':'bullThrows';const eligible=daily.filter(d=>d[den]>=30&&d[key]!==null).sort((a,b)=>b[key]-a[key]||a.date.localeCompare(b.date));result[key]=eligible.length?{value:eligible[0][key],date:eligible[0].date,n:eligible[0][den]}:null;}
return result;
}
function validate(records,strict=false){if(!Array.isArray(records))throw Error('記録の配列ではありません。');for(const r of records){if(!r||typeof r!=='object'||Array.isArray(r)||!validDate(r.date)||!((typeof r.id==='number'&&Number.isFinite(r.id))||(typeof r.id==='string'&&r.id.length))||(r.exportId!==undefined&&(typeof r.exportId!=='string'||!r.exportId.length)))throw Error('日付または記録IDが不正です。元のデータは変更していません。');if(strict){if(r.mm!=null&&!finite(r.mm))throw Error('最大間隔が不正です。');if(r.triple!=null&&!(Number.isInteger(r.triple)&&r.triple>=0&&r.triple<=3))throw Error('トリプルリング内の本数が不正です。');if(r.bull!=null&&(!Array.isArray(r.bull)||r.bull.length>3||r.bull.some(m=>m!=null&&!marks.includes(m))))throw Error('距離判定が不正です。');}}return records;}
function store(storage){
function read(){const raw=storage.getItem(KEY);return raw===null?[]:validate(JSON.parse(raw));}
function write(records){validate(records);const raw=storage.getItem(KEY);read();if(raw!==null){if(storage.getItem(INITIAL)===null)storage.setItem(INITIAL,raw);storage.setItem(PREVIOUS,raw);}storage.setItem(KEY,JSON.stringify(records));}
return {read,write,exportData(){return {format:'darts-practice-backup',version:1,exportedAt:new Date().toISOString(),records:read()};},merge(input){const incoming=validate(Array.isArray(input)?input:input&&input.format==='darts-practice-backup'&&input.version===1?input.records:null,true),current=read(),seen=new Set(current.map(recordId));let added=0,skipped=0;const merged=current.slice();for(const r of incoming){if(seen.has(recordId(r))){skipped++;continue;}seen.add(recordId(r));merged.push(r);added++;}if(added)write(merged);return {added,skipped};},previous(){const raw=storage.getItem(PREVIOUS);if(raw===null)throw Error('変更前バックアップはまだありません。');return {format:'darts-practice-backup',version:1,records:validate(JSON.parse(raw))};},initial(){const raw=storage.getItem(INITIAL);if(raw===null)throw Error('初回バックアップはまだありません。');return {format:'darts-practice-backup',version:1,records:validate(JSON.parse(raw))};}};
}
function num(v,unit=''){return v===null||v===undefined?'データなし':v.toLocaleString('ja-JP',{maximumFractionDigits:1})+unit;}
function summary(s){return ['練習日数：'+s.days+'日／ラウンド数：'+s.rounds+'／総投数：'+s.throws,'最大間隔 平均 '+num(s.mean,'mm')+'・最小 '+num(s.min,'mm')+'・最大 '+num(s.max,'mm')+'（有効 '+s.mmN+'ラウンド）','トリプルリング内率：'+num(s.triple,'%')+'（'+s.tripleHits+'/'+s.tripleThrows+'投）','ブル命中率：'+num(s.bull,'%')+'（'+s.bullHits+'/'+s.bullThrows+'投）','50mm以内率：'+num(s.near,'%')+'（'+s.nearHits+'/'+s.bullThrows+'投）'].join('\n');}
function comparisonLines(c){if(!c)return ['全期間の前期比較はありません。'];const a=c.current,b=c.previous;const lines=['比較先：'+c.label,'対象数：今回 '+a.rounds+'ラウンド・'+a.throws+'投／前期 '+b.rounds+'ラウンド・'+b.throws+'投'];for(const [key,title,den,unit,lower] of [['mean','最大間隔平均','mmN','mm',true],['bull','ブル命中率','bullThrows','ポイント',false],['near','50mm以内率','bullThrows','ポイント',false],['triple','トリプルリング内率','tripleThrows','ポイント',false],['throws','総投数','rounds','投',null]]){if(!a.rounds||!b.rounds||a[key]===null||b[key]===null){lines.push(title+'：比較データなし');continue;}const delta=a[key]-b[key];const change=lower===null?'':delta===0?'・同じ':(lower?delta<0:delta>0)?'・改善':'・低下';lines.push(title+'：'+num(b[key],key==='mean'?'mm':key==='throws'?'投':'%')+' → '+num(a[key],key==='mean'?'mm':key==='throws'?'投':'%')+'（'+(delta>0?'+':'')+num(delta,unit)+change+'／有効 '+b[den]+'→'+a[den]+(den==='mmN'?'ラウンド':den==='rounds'?'ラウンド':'投')+'）');}return lines;}
function bestLines(b){return [['min','最大間隔の最小'],['bull','ブル命中率'],['near','50mm以内率'],['triple','トリプルリング内率']].map(([k,label])=>label+'：'+(b[k]?num(b[k].value,k==='min'?'mm':'%')+'／'+b[k].date+'／対象 '+b[k].n+'投':'データなし'));}
const api={KEY,INITIAL,PREVIOUS,recordId,validDate,jstDate,shift,monday,period,unique,select,aggregate,groups,comparison,bests,validate,store,num,summary,comparisonLines,bestLines};root.Darts=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
