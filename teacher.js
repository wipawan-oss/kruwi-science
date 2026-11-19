/* Teacher-only local workspace. Saving here never changes published content. */
(() => {
'use strict';
const KEY = 'kruwi-teacher-draft-v1';
const TOPICS = {life:'วิทยาศาสตร์ชีวภาพ',physical:'วิทยาศาสตร์กายภาพ',earth:'โลกและอวกาศ',technology:'เทคโนโลยีและกระบวนการ'};
const published = Array.isArray(window.KRUWI_BANK) ? window.KRUWI_BANK : [];
const $ = id => document.getElementById(id);
const escapeHtml = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone = obj => JSON.parse(JSON.stringify(obj));
function valid(q){return Array.isArray(q) && q.length===6 && q[0]==='m3' && Object.hasOwn(TOPICS,q[1]) && typeof q[2]==='string' && q[2].trim().length>5 && Array.isArray(q[3]) && q[3].length===4 && q[3].every(x=>typeof x==='string' && x.trim().length>0) && Number.isInteger(q[4]) && q[4]>=0 && q[4]<=3 && typeof q[5]==='string' && q[5].trim().length>4}
function getDraft(){try{const v=JSON.parse(localStorage.getItem(KEY));return Array.isArray(v)&&v.length>0&&v.every(valid)?v:null}catch{return null}}
let bank = clone(getDraft() || published), selected = bank.length?0:-1;
const notice = msg => { $('editorHint').textContent = msg };
function saveDraft(){try{localStorage.setItem(KEY,JSON.stringify(bank));notice('✅ บันทึกร่างลงในเบราว์เซอร์เรียบร้อยแล้ว (ยังไม่ขึ้นเว็บไซต์นักเรียน)')}catch{notice('⚠️ เบราว์เซอร์ไม่อนุญาตให้บันทึก กรุณาส่งออกไฟล์ทันที')}}
function renderStats(){ $('totalCount').textContent=bank.length;Object.keys(TOPICS).forEach(t=>$(t+'Count').textContent=bank.filter(q=>q[1]===t).length) }
function renderList(){
 const term=$('searchQuestion').value.trim().toLowerCase(),topic=$('topicFilter').value;
 const visible = bank.map((q,i)=>({q,i})).filter(({q})=>(topic==='all'||q[1]===topic)&&(!term||q[2].toLowerCase().includes(term)||q[5].toLowerCase().includes(term)));
 $('filterSummary').textContent=`แสดง ${visible.length} / ${bank.length} ข้อ`;
 $('questionList').innerHTML=visible.length?visible.map(({q,i})=>`<button type="button" class="question-item ${i===selected?'selected':''}" data-index="${i}"><span class="number">${i+1}</span><span><small>${TOPICS[q[1]]}</small><strong>${escapeHtml(q[2])}</strong></span></button>`).join(''):'<div class="empty">ไม่พบคำถาม ลองเปลี่ยนคำค้นหรือสาระ</div>';
}
function renderForm(){
 if(selected<0||!bank[selected]){$('editForm').hidden=true;$('editTitle').textContent='ยังไม่มีโจทย์';$('editStatus').textContent='—';return}
 $('editForm').hidden=false;const q=bank[selected];$('editTitle').textContent='แก้ไขข้อฝึก';$('editStatus').textContent=`ข้อที่ ${selected+1}`;$('editTopic').value=q[1];$('editQuestion').value=q[2];q[3].forEach((v,i)=>$('choice'+i).value=v);$('editCorrect').value=q[4];$('editExplanation').value=q[5];
}
function render(){renderStats();renderList();renderForm()}
function readForm(){return ['m3',$('editTopic').value,$('editQuestion').value.trim(),[0,1,2,3].map(i=>$('choice'+i).value.trim()),Number($('editCorrect').value),$('editExplanation').value.trim()]}
function download(name,body,mime){const url=URL.createObjectURL(new Blob([body],{type:mime})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function validateAll(items){if(!Array.isArray(items)||!items.length||items.length>5000||!items.every(valid))throw new Error('รูปแบบไม่ถูกต้อง ต้องมีอย่างน้อย 1 ข้อ โดยแต่ละข้อมี 4 ตัวเลือก เฉลยและคำอธิบายครบถ้วน');return items}
$('questionList').addEventListener('click',e=>{const item=e.target.closest('[data-index]');if(item){selected=Number(item.dataset.index);renderList();renderForm();notice('')}});
$('topicFilter').addEventListener('change',renderList);
$('searchQuestion').addEventListener('input',renderList);
$('editForm').addEventListener('submit',e=>{e.preventDefault();const q=readForm();if(!valid(q)){notice('⚠️ กรุณากรอกคำถาม ตัวเลือกทั้ง 4 ข้อ และคำอธิบายให้ครบ');return}if(selected<0)return;bank[selected]=q;saveDraft();render()});
$('addQuestion').addEventListener('click',()=>{const q=['m3','life','เขียนคำถามวิทยาศาสตร์ ม.3 ที่นี่', ['ตัวเลือก ก','ตัวเลือก ข','ตัวเลือก ค','ตัวเลือก ง'],0,'เขียนคำอธิบายคำตอบที่ถูกต้อง'];bank.push(q);selected=bank.length-1;$('topicFilter').value='all';$('searchQuestion').value='';saveDraft();render();$('editQuestion').focus()});
$('deleteQuestion').addEventListener('click',()=>{if(selected<0||bank.length<=1){notice('ต้องมีข้อสอบอย่างน้อยหนึ่งข้อ');return}if(!confirm('ยืนยันลบข้อฝึกนี้จากฉบับร่าง?'))return;bank.splice(selected,1);selected=Math.min(selected,bank.length-1);saveDraft();render()});
$('exportJson').addEventListener('click',()=>{try{validateAll(bank);download('kruwi-onet-m3-questions.json',JSON.stringify(bank,null,2),'application/json;charset=utf-8')}catch(e){notice(e.message)}});
$('exportJs').addEventListener('click',()=>{try{validateAll(bank);download('onet-bank.js','/* KRU WI SCIENCE LAB | Original practice questions - not official NIETS exam items. */\nwindow.KRUWI_BANK = '+JSON.stringify(bank,null,2)+';\n','text/javascript;charset=utf-8');notice('✅ ดาวน์โหลดไฟล์เรียบร้อย นำไปแทน onet-bank.js ใน GitHub เพื่อเผยแพร่')}catch(e){notice(e.message)}});
$('importBtn').addEventListener('click',()=>$('importFile').click());
$('importFile').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>2_000_000)throw new Error('ไฟล์ใหญ่เกิน 2 MB');const data=JSON.parse(await f.text());bank=clone(validateAll(data));selected=0;saveDraft();$('searchQuestion').value='';$('topicFilter').value='all';render();notice(`✅ นำเข้าสำเร็จ ${bank.length} ข้อ`)}catch(err){notice('⚠️ นำเข้าไม่สำเร็จ: '+err.message)}finally{e.target.value=''}});
$('resetBank').addEventListener('click',()=>{if(!confirm('ยกเลิกร่างที่แก้ทั้งหมด และโหลดข้อสอบจากไฟล์เว็บไซต์ที่เผยแพร่อยู่?'))return;bank=clone(published);selected=0;try{localStorage.removeItem(KEY)}catch{}render();notice('กลับมาใช้คลังข้อฝึกต้นฉบับแล้ว')});
render();
})();
