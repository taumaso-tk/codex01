(function(){
'use strict';
const D=Darts,$=id=>document.getElementById(id),periodSelect=$('stats-period'),unitSelect=$('chart-unit');
let currentDay=D.jstDate();
function text(tag,value,cls){const n=document.createElement(tag);n.textContent=value;if(cls)n.className=cls;return n;}
function card(title,value,detail){const n=document.createElement('div');n.className='card';n.append(text('span',title),text('strong',value),text('small',detail));return n;}
function info(){const all=D.unique(load()),p=D.period(periodSelect.value),rows=D.select(all,p);return {all,p,rows,s:D.aggregate(rows),c:D.comparison(all,periodSelect.value),b:D.bests(all),trend:D.groups(rows,unitSelect.value)};}
function drawChart(title,series,data,percent){
const panel=document.createElement('div');panel.append(text('h3',title));
if(!data.some(d=>series.some(s=>d[s.key]!==null))){panel.append(text('p','データなし'));return panel;}
panel.append(text('p',series.map(s=>s.name).join(' ／ ')+(percent?'（高いほど良い）':'（mm・低いほど良い）'),'notice'));
const total=data.reduce((n,d)=>n+d[series[0].den],0);panel.append(text('p','対象：'+data.length+'期間／有効 '+total+(series[0].den==='mmN'?'ラウンド':'投')+'。少数の記録では率が大きく変わります。','notice'));
const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 440 220');svg.setAttribute('role','img');svg.setAttribute('aria-label',title+'。期間ごとの数値と対象数は下の一覧で確認できます。');svg.classList.add('chart');
function el(tag,attrs){const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));svg.append(n);return n;}
const values=data.flatMap(d=>series.map(s=>d[s.key])).filter(v=>v!==null);const max=percent?100:Math.max(1,...values)*1.1;const x=i=>data.length===1?245:55+i*365/(data.length-1),y=v=>175-v/max*140;
for(let i=0;i<=4;i++){const v=max*i/4;el('line',{x1:55,x2:420,y1:y(v),y2:y(v),stroke:'#dce5df'});el('text',{x:48,y:y(v)+4,'text-anchor':'end','font-size':11,fill:'#61756b'}).textContent=D.num(v)+(percent?'%':'');}
for(const s of series){let path='';data.forEach((d,i)=>{const v=d[s.key];if(v===null){path+=' ';return;}const prev=i>0&&data[i-1][s.key]!==null;path+=(prev?'L':'M')+x(i)+' '+y(v)+' ';});el('path',{d:path,fill:'none',stroke:s.color,'stroke-width':2.5});data.forEach((d,i)=>{if(d[s.key]!==null){const dot=el('circle',{cx:x(i),cy:y(d[s.key]),r:data.length>40?2:4,fill:s.color});const t=document.createElementNS(ns,'title');t.textContent=d.date+' '+s.name+' '+D.num(d[s.key],percent?'%':'mm')+'／有効 '+d[s.den]+(s.den==='mmN'?'ラウンド':'投');dot.append(t);}});}
[...new Set([0,Math.floor((data.length-1)/2),data.length-1])].forEach(i=>{el('text',{x:x(i),y:198,'text-anchor':data.length===1?'middle':i===0?'start':i===data.length-1?'end':'middle','font-size':11,fill:'#61756b'}).textContent=data[i].date;});
panel.append(svg);const legend=document.createElement('p');legend.className='notice';for(const s of series){const item=text('span','● '+s.name+'　');item.style.color=s.color;legend.append(item);}panel.append(legend);
const details=document.createElement('details');details.className='chart-details';details.append(text('summary','数値と対象数（'+data.length+'期間）'));for(const d of data){details.append(text('div',d.date+'：'+series.map(s=>s.name+' '+D.num(d[s.key],percent?'%':'mm')+'（有効 '+d[s.den]+(s.den==='mmN'?'ラウンド':'投')+'）').join(' ／ '),'chart-row'));}panel.append(details);return panel;
}
function refreshDashboard(){try{
const {p,s,c,b,trend}=info();$('period-label').textContent=p.label+'／日本時間';const cards=$('stats-cards');cards.replaceChildren(
card('総ラウンド数',s.rounds?s.rounds+'回':'データなし','ID重複を除外'),card('総投数',s.rounds?s.throws+'投':'データなし','1ラウンド＝3投'),card('練習日数',s.days?s.days+'日':'データなし','期間内の練習日'),card('最大間隔の平均',D.num(s.mean,'mm'),'有効 '+s.mmN+'ラウンド・小さいほど良い'),card('最大間隔の最小',D.num(s.min,'mm'),'有効 '+s.mmN+'ラウンド'),card('最大間隔の最大',D.num(s.max,'mm'),'有効 '+s.mmN+'ラウンド'),card('トリプルリング内率',D.num(s.triple,'%'),s.tripleHits+' / '+s.tripleThrows+'有効投'),card('ブル命中率',D.num(s.bull,'%'),s.bullHits+' / '+s.bullThrows+'有効投'),card('50mm以内率',D.num(s.near,'%'),s.nearHits+' / '+s.bullThrows+'有効投（○＋☆）'));
$('comparisons').replaceChildren(...D.comparisonLines(c).map(line=>text('p',line,'comparison-row')));$('bests').replaceChildren(...D.bestLines(b).map(line=>text('p',line,'comparison-row')));
$('charts').replaceChildren(drawChart('A. グルーピングの推移',[{key:'mean',name:'最大間隔の平均',den:'mmN',color:'#176c50'}],trend,false),drawChart('B. ブル付近への精度',[{key:'bull',name:'ブル命中率',den:'bullThrows',color:'#176c50'},{key:'near',name:'50mm以内率',den:'bullThrows',color:'#a65c13'}],trend,true),drawChart('C. トリプルリング内率',[{key:'triple',name:'トリプルリング内率',den:'tripleThrows',color:'#3d64a0'}],trend,true));
$('copy-summary').disabled=!s.rounds;
}catch(err){showDataError(err);}}
window.refreshDashboard=refreshDashboard;
function summaryText(){const {p,s,c,b,trend}=info();return ['以下はダーツ練習記録アプリで集計したデータです。数値の変化を客観的に分析し、短い寸評と次回の練習アドバイスを日本語でお願いします。記録にないフォームの問題や原因は断定しないでください。事実と推測を区別してください。','',p.label+'（境界：日本時間）','同一IDは1回だけ集計。未記録は各指標の分母から除外。各期間は元ラウンド・有効投数から加重集計。50mm以内＝○＋☆。トリプルリング内はリング内側の本数でトリプル命中数ではありません。最大間隔は低いほど良い。','※この集計は生データではありません。他の集計結果と期間が重なる場合は合算しないでください。今週・今月の途中は前期の全期間との比較です。',D.summary(s),'','前期との比較',...D.comparisonLines(c),'','自己ベスト（全期間／率は各項目の有効30投以上の日、同率は最も早い日）',...D.bestLines(b),'','集計推移（'+({day:'日別',week:'週別・月曜始まり',month:'月別'})[unitSelect.value]+'／選択期間内のみ）',...trend.map(d=>d.date+'\n'+D.summary(d))].join('\n');}
$('copy-summary').onclick=async()=>{try{const value=summaryText();$('summary-text').value=value;$('summary-fallback').hidden=true;try{await navigator.clipboard.writeText(value);$('summary-status').textContent='集計結果をコピーしました。ChatGPTに貼り付けて送信してください。';}catch(err){$('summary-fallback').hidden=false;$('summary-text').focus();$('summary-text').select();$('summary-text').setSelectionRange(0,value.length);$('summary-status').textContent='下の文章を長押ししてコピーしてください。';}}catch(err){showDataError(err);}};
function clearSummary(){ $('summary-status').textContent='';$('summary-fallback').hidden=true;$('summary-text').value=''; }
window.clearSummary=clearSummary;
periodSelect.onchange=()=>{clearSummary();refreshDashboard();};unitSelect.onchange=()=>{clearSummary();refreshDashboard();};
function download(data,name){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name+'-'+D.jstDate()+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);$('backup-status').textContent='JSONを保存しました。iPhoneではダウンロード先も確認してください。';}
for(const [id,fn,name] of [['export-json',()=>database.exportData(),'darts-backup'],['export-previous',()=>database.previous(),'darts-before-last-change'],['export-initial',()=>database.initial(),'darts-before-dashboard']])$(id).onclick=()=>{try{download(fn(),name);}catch(err){$('backup-status').textContent=err.message;}};
$('import-json').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const input=JSON.parse(await file.text());D.validate(Array.isArray(input)?input:input&&input.format==='darts-practice-backup'&&input.version===1?input.records:null,true);if(!confirm('このJSONから記録を追加復元します。同じIDの既存記録は変更しません。よろしいですか？'))return;const result=database.merge(input);render();$('backup-status').textContent=result.added+'件を追加しました。同じID '+result.skipped+'件は既存記録を優先しました。';}catch(err){$('backup-status').textContent='復元できませんでした。既存データは変更していません。 '+err.message;}finally{e.target.value='';}};
function clockRefresh(){const day=D.jstDate();if(day!==currentDay){if(date.value===currentDay&&!editingId)date.value=day;currentDay=day;try{render();clearSummary();}catch(err){showDataError(err);}}else refreshDashboard();}
setInterval(clockRefresh,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)clockRefresh();});window.addEventListener('focus',clockRefresh);window.addEventListener('storage',e=>{if(e.key===D.KEY){try{render();}catch(err){showDataError(err);}}});refreshDashboard();
})();
