import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
let errors=0;
function check(bool,description){if(bool)console.log(`PASS ${description}`);else{console.error(`FAIL ${description}`);errors++}}
const code=fs.readFileSync(path.join(root,'onet-bank.js'),'utf8');
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(code,ctx);
const bank=ctx.window.KRUWI_BANK;
check(Array.isArray(bank),'O-NET bank available');
check(bank.length>=48,`Question count ≥48 (actual ${bank?.length})`);
const topics=['life','physical','earth','technology'];
for(const t of topics)check(bank.filter(q=>q[1]===t).length>=12,`At least 12 items: ${t}`);
const fingerprints=new Set();
for(let i=0;i<bank.length;i++){
 const q=bank[i];
 const valid=Array.isArray(q)&&q.length===6&&q[0]==='m3'&&topics.includes(q[1])&&typeof q[2]==='string'&&q[2].length>10&&Array.isArray(q[3])&&q[3].length===4&&q[3].every(x=>typeof x==='string'&&x.trim())&&Number.isInteger(q[4])&&q[4]>=0&&q[4]<=3&&typeof q[5]==='string'&&q[5].length>10;
 check(valid,`Question ${i+1} schema and key`);
 const f=q[2].trim();check(!fingerprints.has(f),`Question ${i+1} unique text`);fingerprints.add(f);
}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const teacher=fs.readFileSync(path.join(root,'teacher.html'),'utf8');
check(html.includes('O-NET ม.3'),'Student site targets O-NET M.3');
check(!html.includes('O-NET ป.6'),'No O-NET P.6 navigation');
for(const file of ['styles.css','app.js','onet-bank.js','onet.css','onet.js','favicon.svg','teacher.html','teacher.css','teacher.js','404.html','DEPLOY.md'])check(fs.existsSync(path.join(root,file)),`Asset exists: ${file}`);
for(const file of ['styles.css','app.js','onet-bank.js','onet.css','onet.js','favicon.svg'])check(html.includes(file),`Student page refers to ${file}`);
for(const file of ['onet-bank.js','teacher.js','teacher.css'])check(teacher.includes(file),`Teacher page refers to ${file}`);
if(errors){console.error(`\n${errors} checks failed`);process.exit(1)}
console.log(`\nAll checks passed: ${bank.length} practice questions and site assets are ready.`);
