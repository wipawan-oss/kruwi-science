/* ครูวิ สอนวิทย์ · M.3-only O-NET practice extension.
   Original practice questions, not official NIETS examinations. */
(() => {
'use strict';
const BANK = Array.isArray(window.KRUWI_BANK) ? window.KRUWI_BANK : [];

const META = {
  life: {name:'วิทยาศาสตร์ชีวภาพ', icon:'🧬', short:'สิ่งมีชีวิต'},
  physical: {name:'วิทยาศาสตร์กายภาพ', icon:'⚡', short:'สารและพลังงาน'},
  earth: {name:'โลกและอวกาศ', icon:'🌍', short:'โลกและจักรวาล'},
  technology: {name:'เทคโนโลยีและกระบวนการ', icon:'💡', short:'คิดอย่างเป็นระบบ'}
};
const allTopics = Object.keys(META);
const PREF = 'kruwi-onet-m3-v1';
const SESSION_KEY = 'kruwi-onet-m3-current-v2';
const EXAM_CONFIG = Object.freeze({mockQuestionsPerTopic:5,mockMinutes:40,practicePerTopic:6,practiceAllPerTopic:2});
let config = {mode:'practice', topic:'all'};
let session = null;
let timerID = null;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const safeText = s => String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gradeName = () => 'ม.3';
const label = topic => META[topic]?.name || 'ทุกสาระ';
const seconds = n => `${Math.floor(Math.max(0,n)/60).toString().padStart(2,'0')}:${Math.floor(Math.max(0,n)%60).toString().padStart(2,'0')}`;
function loadHistory(){
 try{const v=JSON.parse(localStorage.getItem(PREF));return Array.isArray(v)?v.filter(x=>x&&x.level==='m3'&&Number.isFinite(x.score)&&Number.isFinite(x.total)&&x.total>0&&x.total<=100).slice(-60):[]}
 catch{return []}
}
function addHistory(record){const h=loadHistory();h.push(record);try{localStorage.setItem(PREF,JSON.stringify(h.slice(-60)))}catch{}}
function saveSession(){try{if(session)localStorage.setItem(SESSION_KEY,JSON.stringify(session))}catch{}}
function clearSession(){try{localStorage.removeItem(SESSION_KEY)}catch{}}
function restoreSession(){
 try{
  const data=JSON.parse(localStorage.getItem(SESSION_KEY));
  if(!data||data.level!=='m3'||!['practice','mock'].includes(data.mode)||!Array.isArray(data.questions)||data.questions.length<1||data.questions.length>48||!Array.isArray(data.answers)||data.answers.length!==data.questions.length||!Number.isInteger(data.index)||data.index<0||data.index>=data.questions.length||!Number.isFinite(data.started)||data.questions.some(q=>!q||!Array.isArray(q.options)||q.options.length!==4||!Number.isInteger(q.correct)||q.correct<0||q.correct>3||!Object.hasOwn(META,q.topic))){clearSession();return false}
  if(data.answers.some(v=>v!==null&&(!Number.isInteger(v)||v<0||v>3))){clearSession();return false}
  session=data;config.mode=data.mode;config.topic=data.topic;
  $('#onetSetup').hidden=true;$('#onetTest').hidden=false;$('#onetResult').hidden=true;
  if(data.mode==='mock'&&(!Number.isFinite(data.deadline)||data.deadline<=Date.now())){finishTest(true);return true}
  renderQuestion();if(data.mode==='mock'){tick();timerID=setInterval(tick,1000)}
  scrollToTest();return true;
 }catch{clearSession();return false}
}
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function pickQuestions(){
 const pool=BANK.map((item,id)=>({id,level:item[0],topic:item[1],question:item[2],options:item[3],correct:item[4],explanation:item[5]})).filter(q=>q.level==='m3'&&META[q.topic]&&Array.isArray(q.options)&&q.options.length===4);
 if(config.mode==='mock')return shuffle(allTopics.flatMap(t=>shuffle(pool.filter(q=>q.topic===t)).slice(0,EXAM_CONFIG.mockQuestionsPerTopic)));
 if(config.topic==='all')return shuffle(allTopics.flatMap(t=>shuffle(pool.filter(q=>q.topic===t)).slice(0,EXAM_CONFIG.practiceAllPerTopic)));
 return shuffle(pool.filter(q=>q.topic===config.topic)).slice(0,EXAM_CONFIG.practicePerTopic);
}
function renderTopicTabs(){
 $('#onetTopics').innerHTML=`<button type="button" class="onet-topic ${config.topic==='all'?'active':''}" data-topic="all" aria-pressed="${config.topic==='all'}">✨ ทุกสาระ</button>`+allTopics.map(t=>`<button type="button" class="onet-topic ${config.topic===t?'active':''}" data-topic="${t}" aria-pressed="${config.topic===t}">${META[t].icon} ${META[t].name}</button>`).join('');
 $('#onetTopics').hidden=config.mode==='mock';
 $('#onetModeInfo').textContent=config.mode==='mock'?'ข้อสอบจำลอง 20 ข้อ · จำกัดเวลา 40 นาที · เฉลยหลังส่งคำตอบ':'ฝึกทุกสาระ 8 ข้อ หรือเลือกเฉพาะสาระ 6 ข้อ · เฉลยทันทีหลังตอบ';
 $('#onetStart').innerHTML=`เริ่ม${config.mode==='mock'?'จำลองสนามสอบ':'ฝึกทำโจทย์'} <span aria-hidden="true">→</span>`;
}
function renderStats(){
 const h=loadHistory();
 const best=h.length?Math.max(...h.map(x=>Math.round(x.score/x.total*100))):null;
 const last=h[h.length-1];
 const total=h.reduce((s,x)=>s+x.total,0);
 const correct=h.reduce((s,x)=>s+x.score,0);
 const avg=total?Math.round(correct/total*100):null;
 $('#onetAttempts').textContent=h.length.toLocaleString('th-TH');
 $('#onetBest').textContent=best===null?'—':`${best}%`;
 $('#onetLast').textContent=last?`${Math.round(last.score/last.total*100)}%`:'—';
 $('#onetAverage').textContent=avg===null?'—':`${avg}%`;
 $('#onetSolved').textContent=total.toLocaleString('th-TH');
 const badges=[{name:'Beginner',min:0,icon:'🌱'},{name:'Explorer',min:3,icon:'🔎'},{name:'Scientist',min:10,icon:'🔬'},{name:'Science Master',min:20,icon:'🏆'}];
 const badge=[...badges].reverse().find(x=>h.length>=x.min);
 $('#onetBadge').textContent=`${badge.icon} ${badge.name}`;
 const acc=Object.fromEntries(allTopics.map(t=>[t,{correct:0,total:0}]));
 h.forEach(x=>{if(x.breakdown){allTopics.forEach(t=>{const a=x.breakdown[t];if(a&&Number.isFinite(a.total)&&Number.isFinite(a.correct)){acc[t].total+=a.total;acc[t].correct+=a.correct}})}});
 const have=allTopics.filter(t=>acc[t].total);
 $('#onetStrengths').innerHTML=have.length?allTopics.map(t=>{const x=acc[t];return `<div class="onet-overview-row"><span>${META[t].icon} ${label(t)}</span><strong>${x.total?Math.round(x.correct/x.total*100)+'%':'—'}</strong></div>`}).join(''):'<div class="onet-history-empty">เมื่อฝึกทำโจทย์ ระบบจะวิเคราะห์คะแนนแยกตามสาระให้</div>';
 const weak=have.sort((a,b)=>acc[a].correct/acc[a].total-acc[b].correct/acc[b].total)[0];
 $('#onetAdvice').textContent=weak?`📖 ลองทบทวนเรื่อง ${label(weak)} เพิ่มเติม เพื่อเพิ่มความมั่นใจก่อนสอบ`:'✨ เริ่มฝึกชุดแรกเพื่อค้นหาสาระที่ควรทบทวน';
 const recent=h.slice(-8);
 $('#onetTrend').innerHTML=recent.length?recent.map((x,i)=>{const pct=Math.round(x.score/x.total*100);return `<div class="onet-trend-bar" title="รอบที่ ${h.length-recent.length+i+1}: ${pct}%"><span style="height:${Math.max(4,pct)}%"></span><small>${pct}%</small></div>`}).join(''):'<div class="onet-history-empty">กราฟคะแนนจะปรากฏเมื่อเริ่มฝึก</div>';
 $('#onetHistory').innerHTML=h.length?[...h].reverse().slice(0,5).map((x,i)=>{const original=h.length-1-i;return `<button type="button" class="onet-history-row onet-history-button" data-history-index="${original}" title="ดูผลคะแนนรอบนี้"><span>${x.mode==='mock'?'⏱️ สนามสอบ':'📚 ฝึก'} · ${x.topic==='all'?'ทุกสาระ':safeText(label(x.topic))}</span><strong>${x.score}/${x.total} <small>(${Math.round(x.score/x.total*100)}%)</small></strong></button>`}).join(''):'<div class="onet-history-empty">ยังไม่มีคะแนน ลองทำชุดฝึกชุดแรกกันเลย ✨</div>';
}
function selectSetting(kind,value){
 if(session)return;
 if(kind==='mode'&&['practice','mock'].includes(value)){config.mode=value;if(value==='mock')config.topic='all';}
 else if(kind==='topic'&&['all',...allTopics].includes(value))config.topic=value;
 $$('#onetModes [data-mode]').forEach(el=>{const active=el.dataset.mode===config.mode;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active))});
 renderTopicTabs();renderStats();
}
function scrollToTest(){const el=$('#onetTest');el.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
function stopTimer(){if(timerID!==null){clearInterval(timerID);timerID=null}}
function tick(){
 if(!session||session.mode!=='mock'){stopTimer();return;}
 const left=Math.max(0,Math.ceil((session.deadline-Date.now())/1000));
 const el=$('#onetTime');if(el){el.textContent=seconds(left);el.classList.toggle('urgent',left<300)}
 if(left===0)finishTest(true);
}
function startTest(){
 stopTimer();clearSession();
 const questions=pickQuestions();
 if(!questions.length){window.alert('ยังไม่มีโจทย์ในสาระนี้ กรุณาเลือกสาระอื่น');return}
 const now=Date.now();session={level:'m3',mode:config.mode,topic:config.mode==='mock'?'all':config.topic,questions,answers:Array(questions.length).fill(null),index:0,started:now,deadline:config.mode==='mock'?now+EXAM_CONFIG.mockMinutes*60*1000:null};
 $('#onetSetup').hidden=true;$('#onetTest').hidden=false;$('#onetResult').hidden=true;
 saveSession();renderQuestion();
 if(session.mode==='mock'){tick();timerID=setInterval(tick,1000)}
 scrollToTest();
}
function renderQuestion(){
 if(!session)return;
 const s=session,q=s.questions[s.index],choice=s.answers[s.index],answered=choice!==null;
 $('#onetQuestionProgress').textContent=`ข้อ ${s.index+1} จาก ${s.questions.length}`;
 $('#onetQuestionGrade').textContent=`O-NET ${gradeName(s.level)}`;
 $('#onetQuestionTopic').textContent=`${META[q.topic].icon} ${label(q.topic)}`;
 $('#onetQuestionTitle').textContent=q.question;
 const answeredCount=s.answers.filter(a=>a!==null).length;
 $('#onetProgressFill').style.width=`${answeredCount/s.questions.length*100}%`;
 $('#onetAnsweredCount').textContent=`ตอบแล้ว ${answeredCount}/${s.questions.length} ข้อ`;
 $('#onetTimerWrap').hidden=s.mode!=='mock';
 $('#onetOptions').innerHTML=q.options.map((opt,i)=>{
   const selected=choice===i;
   const correct=s.mode==='practice'&&answered&&i===q.correct;
   const wrong=s.mode==='practice'&&selected&&i!==q.correct;
   return `<button type="button" class="onet-option${selected?' selected':''}${correct?' correct':''}${wrong?' wrong':''}" data-onet-choice="${i}" aria-pressed="${selected}" ${s.mode==='practice'&&answered?'disabled':''}><span class="onet-choice-letter">${'กขคง'[i]}</span><span>${safeText(opt)}</span><span class="onet-choice-mark">${correct?'✓':wrong?'×':selected?'●':''}</span></button>`;
 }).join('');
 $('#onetAnswerBox').hidden=!(s.mode==='practice'&&answered);
 if(s.mode==='practice'&&answered){
   $('#onetAnswerBox').className='onet-explanation '+(choice===q.correct?'right':'wrong');
   $('#onetAnswerBox').innerHTML=`<strong>${choice===q.correct?'✅ ถูกต้อง!':'💡 คำตอบที่ถูกต้อง: '+safeText(q.options[q.correct])}</strong><p>${safeText(q.explanation)}</p>`;
 }
 $('#onetBack').disabled=s.index===0;
 $('#onetNext').textContent=s.index===s.questions.length-1?'ส่งคำตอบและดูคะแนน':'ข้อต่อไป →';
 $('#onetNext').disabled=s.mode==='practice'&&!answered;
 $('#onetNavigator').innerHTML=s.questions.map((_,i)=>`<button type="button" data-onet-go="${i}" class="onet-nav-dot ${i===s.index?'current':''} ${s.answers[i]!==null?'done':''}" aria-label="ไปข้อที่ ${i+1}${s.answers[i]!==null?' ตอบแล้ว':''}" aria-current="${i===s.index?'step':'false'}">${i+1}</button>`).join('');
 if(s.mode==='mock')tick();
}
function choose(index){
 if(!session||index<0||index>3)return;
 const s=session;if(s.mode==='practice'&&s.answers[s.index]!==null)return;
 s.answers[s.index]=index;saveSession();renderQuestion();
}
function changeQuestion(offset){
 if(!session)return;
 if(offset>0&&session.index===session.questions.length-1){
  if(session.mode==='mock'&&session.answers.some(x=>x===null)){
   const count=session.answers.filter(x=>x===null).length;
   if(!window.confirm(`ยังไม่ได้ตอบ ${count} ข้อ ต้องการส่งคำตอบตอนนี้หรือไม่?`))return;
  }
  finishTest(false);return;
 }
 const next=session.index+offset;
 if(next>=0&&next<session.questions.length){session.index=next;saveSession();renderQuestion()}
}
function finishTest(expired){
 if(!session)return;
 const s=session;stopTimer();session=null;clearSession();
 let correct=0;const perTopic=Object.fromEntries(allTopics.map(t=>[t,{correct:0,total:0}]));
 s.questions.forEach((q,i)=>{perTopic[q.topic].total++;if(s.answers[i]===q.correct){correct++;perTopic[q.topic].correct++}});
 const record={level:s.level,mode:s.mode,topic:s.topic,score:correct,total:s.questions.length,at:Date.now(),elapsed:Math.max(0,Math.round((Date.now()-s.started)/1000)),breakdown:perTopic,review:s.questions.map((q,i)=>({question:q.question,topic:q.topic,options:q.options,correct:q.correct,answer:s.answers[i],explanation:q.explanation}))};
 addHistory(record);showResult(record,expired);
}
function showResult(record,expired=false){
 $('#onetSetup').hidden=true;$('#onetTest').hidden=true;$('#onetResult').hidden=false;
 const {score:correct,total}=record,percent=Math.round(100*correct/total);
 $('#onetResultEmoji').textContent=percent>=80?'🏆':percent>=60?'🌟':'💪';
 $('#onetScore').textContent=`${correct}/${total}`;
 $('#onetPercent').textContent=`${percent}%`;
 const mins=Math.floor((record.elapsed||0)/60),secs=(record.elapsed||0)%60;
 $('#onetElapsed').textContent=`⏱ ใช้เวลา ${mins} นาที ${secs} วินาที`;
 $('#onetResultDescription').textContent=expired?'หมดเวลาจำลองสนามสอบแล้ว นี่คือผลคะแนนและจุดที่ควรทบทวน':percent>=80?'ยอดเยี่ยม! ลองทำชุดใหม่เพื่อฝึกโจทย์หลายรูปแบบ':percent>=60?'ทำได้ดีแล้ว ทบทวนข้อที่พลาดแล้วลองอีกครั้ง':'ดูเฉลยทีละข้อ แล้วกลับไปทบทวนก่อนลองใหม่';
 const breakdown=record.breakdown||{};
 const skills=allTopics.filter(t=>breakdown[t]?.total);
 $('#onetTopicReport').innerHTML=skills.length?skills.map(t=>{const x=breakdown[t];const pct=Math.round(x.correct/x.total*100);return `<div class="onet-skill"><div><span>${META[t].icon} ${label(t)}</span><strong>${x.correct}/${x.total}</strong></div><div class="onet-skill-track"><span style="width:${pct}%"></span></div></div>`}).join(''):'<div class="onet-history-empty">การสอบครั้งนี้ไม่ได้บันทึกผลแยกสาระ</div>';
 $('#onetReview').innerHTML=Array.isArray(record.review)?record.review.map((q,i)=>{const ok=q.answer===q.correct;return `<details class="onet-review-item"><summary><span class="onet-review-status">${ok?'✅':q.answer===null?'⚪':'❌'}</span><span>ข้อ ${i+1} · ${safeText(q.question)}</span></summary><div class="onet-review-body"><p><strong>คำตอบของคุณ:</strong> ${q.answer===null?'ไม่ได้ตอบ':safeText(q.options[q.answer]||'ไม่พบข้อมูล')}</p><p><strong>คำตอบที่ถูก:</strong> ${safeText(q.options[q.correct]||'ไม่พบข้อมูล')}</p><p><strong>อธิบาย:</strong> ${safeText(q.explanation)}</p></div></details>`}).join(''):'<div class="onet-history-empty">ประวัติรอบเก่ามีเฉพาะคะแนน ไม่มีรายละเอียดคำตอบ</div>';
 renderStats();$('#onetResult').scrollIntoView({behavior:'smooth',block:'start'});
}
function resetTest(){
 stopTimer();session=null;clearSession();
 $('#onetSetup').hidden=false;$('#onetTest').hidden=true;$('#onetResult').hidden=true;
 selectSetting('mode',config.mode);
 $('#onet').scrollIntoView({behavior:'smooth',block:'start'});
}
function exportHistory(){
 const data=loadHistory();if(!data.length){window.alert('ยังไม่มีประวัติการฝึกสำหรับส่งออก');return}
 const rows=[['วันที่','รูปแบบ','สาระ','คะแนน','คะแนนเต็ม','เปอร์เซ็นต์','เวลาวินาที'],...data.map(x=>[new Date(x.at).toLocaleString('th-TH'),x.mode==='mock'?'จำลองสอบ':'ฝึกทำโจทย์',label(x.topic),x.score,x.total,Math.round(x.score/x.total*100),x.elapsed||0])];
 const csv='\ufeff'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='kruwi-onet-m3-history.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function setup(){
 if(!$('#onet'))return;
 $('#onetBankCount').textContent=BANK.length.toString();
 $('#onetModes').addEventListener('click',e=>{const el=e.target.closest('[data-mode]');if(el)selectSetting('mode',el.dataset.mode)});
 $('#onetTopics').addEventListener('click',e=>{const el=e.target.closest('[data-topic]');if(el)selectSetting('topic',el.dataset.topic)});
 $('#onetStart').addEventListener('click',startTest);
 $('#onetOptions').addEventListener('click',e=>{const el=e.target.closest('[data-onet-choice]');if(el)choose(Number(el.dataset.onetChoice))});
 $('#onetBack').addEventListener('click',()=>changeQuestion(-1));
 $('#onetNext').addEventListener('click',()=>changeQuestion(1));
 $('#onetNavigator').addEventListener('click',e=>{const el=e.target.closest('[data-onet-go]');if(!el||!session)return;session.index=Number(el.dataset.onetGo);saveSession();renderQuestion()});
 $('#onetQuit').addEventListener('click',()=>{if(window.confirm('ต้องการออกจากการทำข้อสอบหรือไม่? คำตอบชุดนี้จะไม่ถูกบันทึก'))resetTest()});
 $('#onetTryAgain').addEventListener('click',startTest);
 $('#onetBackToSetup').addEventListener('click',resetTest);
 $('#onetHistory').addEventListener('click',e=>{const btn=e.target.closest('[data-history-index]');if(!btn||session)return;const x=loadHistory()[Number(btn.dataset.historyIndex)];if(x)showResult(x)});
 $('#onetExport').addEventListener('click',exportHistory);
 $('#onetClearHistory').addEventListener('click',()=>{if(!window.confirm('ลบประวัติการฝึก O-NET ในเบราว์เซอร์นี้ทั้งหมดหรือไม่?'))return;try{localStorage.removeItem(PREF)}catch{}renderStats()});
 selectSetting('mode','practice');
 restoreSession();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
