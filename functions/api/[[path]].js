/* Cloudflare Pages Functions: student login and class-separated score ledger.
   Requires D1 binding DB and environment secret ADMIN_SETUP_TOKEN.
   This service does not expose teacher/student credentials in client-side code. */
const SESSION_SECONDS=604800;
const enc=new TextEncoder();
const data=(value,status=200,extra={})=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...extra}});
const fail=(message,status=400)=>data({error:message},status);
const now=()=>Math.floor(Date.now()/1000);
const clean=(value,max=120)=>typeof value==='string'?value.trim().slice(0,max):'';
const validUsername=s=>/^[a-z0-9._-]{4,32}$/i.test(s);
const validPassword=s=>typeof s==='string'&&s.length>=10&&s.length<=128;
const randomHex=(n=32)=>Array.from(crypto.getRandomValues(new Uint8Array(n)),x=>x.toString(16).padStart(2,'0')).join('');
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
const saltRandom=()=>randomHex(16);
async function hashPassword(password,salt){
 const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:180000,hash:'SHA-256'},key,256);
 return Array.from(new Uint8Array(bits),x=>x.toString(16).padStart(2,'0')).join('');
}
const equal=(a,b)=>{if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0};
const jsonBody=async req=>{if(Number(req.headers.get('content-length')||0)>16000)throw Error('ข้อมูลมีขนาดใหญ่เกินไป');return await req.json()};
const cookie=(req,name)=>{const value=req.headers.get('cookie')||'';return value.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1)||''};
function securePost(req){const origin=req.headers.get('origin');const site=req.headers.get('sec-fetch-site');return (!origin||origin===new URL(req.url).origin)&&(!site||!['cross-site'].includes(site))}
const authCookie=value=>'kruwi_session='+value+'; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age='+SESSION_SECONDS;
const removeCookie='kruwi_session=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
async function session(db,account){
 const token=randomHex(32);
 await db.prepare('INSERT INTO sessions(token_hash,account_id,expires_at) VALUES(?,?,?)').bind(await digest(token),account.id,now()+SESSION_SECONDS).run();
 return authCookie(token);
}
async function actor(db,request){
 const token=cookie(request,'kruwi_session');
 if(!/^[0-9a-f]{64}$/.test(token))return null;
 return await db.prepare(`SELECT a.id,a.username,a.display_name,a.role,a.active,a.must_change_password,s.class_id,c.grade,c.room,c.academic_year FROM sessions ss JOIN accounts a ON a.id=ss.account_id LEFT JOIN students s ON s.account_id=a.id LEFT JOIN classes c ON c.id=s.class_id WHERE ss.token_hash=? AND ss.expires_at>? AND a.active=1`).bind(await digest(token),now()).first()||null;
}
const profile=a=>({id:a.id,username:a.username,display_name:a.display_name,role:a.role,change_password:!!a.must_change_password,class_id:a.class_id||null,grade:a.grade||null,room:a.room||null,academic_year:a.academic_year||null});
function validClass(x){return ['ม.1','ม.2','ม.3'].includes(x.grade)&&/^[0-9ก-๙A-Za-z/-]{1,12}$/.test(x.room||'')&&Number.isInteger(Number(x.academic_year))&&Number(x.academic_year)>=2560&&Number(x.academic_year)<=2700}
const scoreValid=x=>['onet','quiz','manual'].includes(x.category)&&clean(x.topic,100).length>0&&Number.isFinite(Number(x.score))&&Number.isFinite(Number(x.max_score))&&Number(x.max_score)>0&&Number(x.max_score)<=1000&&Number(x.score)>=0&&Number(x.score)<=Number(x.max_score);
export async function onRequest({request,env}){
 const url=new URL(request.url),path=url.pathname.replace(/^\/api\/?/,'').replace(/\/$/,'');
 const method=request.method.toUpperCase();
 if(!env.DB)return fail('ยังไม่ได้เชื่อมฐานข้อมูล D1: เพิ่ม Binding ชื่อ DB ใน Cloudflare Pages',503);
 if(!['GET','POST'].includes(method))return fail('Method not allowed',405);
 if(method==='POST'&&!securePost(request))return fail('ไม่อนุญาตคำขอข้ามเว็บไซต์',403);
 const db=env.DB;
 try{
  if(method==='GET'&&path==='status'){
   const x=await db.prepare("SELECT COUNT(*) AS n FROM accounts WHERE role='teacher'").first();
   return data({ready:true,setup_required:x.n===0});
  }
  if(method==='POST'&&path==='setup'){
   const x=await db.prepare("SELECT COUNT(*) AS n FROM accounts WHERE role='teacher'").first();
   if(x.n>0)return fail('ตั้งค่าบัญชีครูครั้งแรกเรียบร้อยแล้ว',409);
   if(!env.ADMIN_SETUP_TOKEN||String(env.ADMIN_SETUP_TOKEN).length<20)return fail('กรุณาตั้งค่า Secret ADMIN_SETUP_TOKEN ความยาวอย่างน้อย 20 ตัวอักษร',503);
   const v=await jsonBody(request),username=clean(v.username,32),password=v.password,displayName=clean(v.display_name,100);
   if(!equal(clean(v.setup_token,256),String(env.ADMIN_SETUP_TOKEN)))return fail('รหัสตั้งค่าไม่ถูกต้อง',403);
   if(!validUsername(username)||!validPassword(password)||!displayName)return fail('ชื่อผู้ใช้ 4–32 ตัว, รหัสผ่าน 10 ตัวขึ้นไป และชื่อครูต้องไม่ว่าง');
   const salt=saltRandom(),hashed=await hashPassword(password,salt);
   // Unique username and a single-first-teacher safeguard: concurrent setups should be avoided by keeping setup secret private.
   const inserted=await db.prepare("INSERT INTO accounts(username,display_name,role,password_salt,password_hash) VALUES(?,?,'teacher',?,?)").bind(username,displayName,salt,hashed).run();
   const a={id:inserted.meta.last_row_id};
   return data({ok:true,role:'teacher'},201,{'set-cookie':await session(db,a)});
  }
  if(method==='POST'&&path==='login'){
   const v=await jsonBody(request),username=clean(v.username,32),password=v.password;
   if(!validUsername(username)||typeof password!=='string')return fail('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',401);
   const limit=await db.prepare('SELECT failures,locked_until FROM login_attempts WHERE username=?').bind(username).first();
   if(limit&&limit.locked_until>now())return fail('พยายามเข้าสู่ระบบหลายครั้งเกินไป โปรดลองใหม่ภายหลัง',429);
   const a=await db.prepare('SELECT * FROM accounts WHERE username=? AND active=1').bind(username).first();
   let good=false;
   if(a){const h=await hashPassword(password,a.password_salt);good=equal(h,a.password_hash)}
   if(!good){
    const count=(limit?.failures||0)+1;
    await db.prepare('INSERT INTO login_attempts(username,failures,locked_until) VALUES(?,?,?) ON CONFLICT(username) DO UPDATE SET failures=excluded.failures,locked_until=excluded.locked_until').bind(username,count,count>=5?now()+900:0).run();
    return fail('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',401);
   }
   await db.prepare('DELETE FROM login_attempts WHERE username=?').bind(username).run();
   return data({ok:true,role:a.role},200,{'set-cookie':await session(db,a)});
  }
  if(method==='POST'&&path==='logout'){
   const token=cookie(request,'kruwi_session');
   if(/^[0-9a-f]{64}$/.test(token))await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(token)).run();
   return data({ok:true},200,{'set-cookie':removeCookie});
  }
  const me=await actor(db,request);
  if(!me)return fail('กรุณาเข้าสู่ระบบ',401);
  if(method==='GET'&&path==='me')return data({user:profile(me)});
  if(method==='POST'&&path==='password'){
   const v=await jsonBody(request);
   if(!validPassword(v.new_password))return fail('รหัสผ่านใหม่ต้องมีอย่างน้อย 10 ตัวอักษร');
   const a=await db.prepare('SELECT password_hash,password_salt FROM accounts WHERE id=?').bind(me.id).first();
   if(!equal(await hashPassword(String(v.current_password||''),a.password_salt),a.password_hash))return fail('รหัสผ่านเดิมไม่ถูกต้อง',403);
   const salt=saltRandom();
   await db.prepare('UPDATE accounts SET password_hash=?,password_salt=?,must_change_password=0 WHERE id=?').bind(await hashPassword(v.new_password,salt),salt,me.id).run();
   await db.prepare('DELETE FROM sessions WHERE account_id=? AND token_hash!=?').bind(me.id,await digest(cookie(request,'kruwi_session'))).run();
   return data({ok:true});
  }
  if(me.role==='student'){
   if(method==='GET'&&path==='scores'){
    const rows=await db.prepare('SELECT id,category,topic,score,max_score,source,created_at FROM scores WHERE student_account_id=? ORDER BY id DESC LIMIT 200').bind(me.id).all();
    return data({scores:rows.results});
   }
   if(method==='POST'&&path==='practice-score'){
    const v=await jsonBody(request);
    if(v.category!=='onet'||!scoreValid(v)||v.category!=='onet'||Number(v.max_score)>48)return fail('ข้อมูลคะแนนฝึกไม่ถูกต้อง');
    await db.prepare("INSERT INTO scores(student_account_id,class_id,category,topic,score,max_score,source,recorded_by) VALUES(?,?,? ,?,?,?,'practice_unverified',?)").bind(me.id,me.class_id,'onet',clean(v.topic,100),Number(v.score),Number(v.max_score),me.id).run();
    return data({ok:true,note:'คะแนนฝึกจากอุปกรณ์นักเรียน ไม่ใช่คะแนนสอบที่ครูรับรอง'},201);
   }
   return fail('นักเรียนไม่มีสิทธิ์เข้าถึงข้อมูลของผู้อื่น',403);
  }
  if(me.role!=='teacher')return fail('ไม่อนุญาต',403);
  if(method==='GET'&&path==='classes'){
   const classes=await db.prepare('SELECT c.*,COUNT(s.account_id) AS student_count FROM classes c LEFT JOIN students s ON c.id=s.class_id GROUP BY c.id ORDER BY c.academic_year DESC,c.grade,c.room').all();
   return data({classes:classes.results});
  }
  if(method==='POST'&&path==='classes'){
   const v=await jsonBody(request);
   if(!validClass(v))return fail('ข้อมูลชั้น ห้อง หรือปีการศึกษาไม่ถูกต้อง');
   const q=await db.prepare('INSERT INTO classes(grade,room,academic_year) VALUES(?,?,?)').bind(v.grade,String(v.room),Number(v.academic_year)).run();
   return data({ok:true,id:q.meta.last_row_id},201);
  }
  if(method==='GET'&&path==='students'){
   const classId=Number(url.searchParams.get('class_id')||0);
   const sql="SELECT a.id,a.username,a.display_name,a.active,a.must_change_password,s.student_code,s.class_id,c.grade,c.room,c.academic_year FROM students s JOIN accounts a ON a.id=s.account_id JOIN classes c ON c.id=s.class_id";
   const q=classId?db.prepare(sql+' WHERE s.class_id=? ORDER BY s.student_code LIMIT 500').bind(classId):db.prepare(sql+' ORDER BY c.grade,c.room,s.student_code LIMIT 1000');
   const students=await q.all();return data({students:students.results});
  }
  if(method==='POST'&&path==='students'){
   const v=await jsonBody(request);
   const username=clean(v.username,32),displayName=clean(v.display_name,100),code=clean(v.student_code,32),classId=Number(v.class_id);
   if(!validUsername(username)||!validPassword(v.password)||!displayName||!/^[a-zA-Z0-9ก-๙_-]{1,32}$/.test(code)||!Number.isInteger(classId))return fail('ข้อมูลนักเรียนไม่ครบหรือรูปแบบไม่ถูกต้อง');
   const c=await db.prepare('SELECT id FROM classes WHERE id=?').bind(classId).first();if(!c)return fail('ไม่พบห้องเรียน');
   const salt=saltRandom(),hash=await hashPassword(v.password,salt);
   const insert=await db.prepare("INSERT INTO accounts(username,display_name,role,password_salt,password_hash,must_change_password) VALUES(?,?,'student',?,?,1)").bind(username,displayName,salt,hash).run();
   try{await db.prepare('INSERT INTO students(account_id,student_code,class_id) VALUES(?,?,?)').bind(insert.meta.last_row_id,code,classId).run();}
   catch(error){await db.prepare('DELETE FROM accounts WHERE id=?').bind(insert.meta.last_row_id).run();throw error}
   return data({ok:true,id:insert.meta.last_row_id},201);
  }
  if(method==='POST'&&path==='reset-student-password'){
   const v=await jsonBody(request),id=Number(v.student_id);
   if(!Number.isInteger(id)||!validPassword(v.password))return fail('ข้อมูลไม่ถูกต้อง');
   const s=await db.prepare('SELECT account_id FROM students WHERE account_id=?').bind(id).first();if(!s)return fail('ไม่พบนักเรียน');
   const salt=saltRandom();
   await db.prepare('UPDATE accounts SET password_salt=?,password_hash=?,must_change_password=1 WHERE id=?').bind(salt,await hashPassword(v.password,salt),id).run();
   await db.prepare('DELETE FROM sessions WHERE account_id=?').bind(id).run();
   return data({ok:true});
  }
  if(method==='GET'&&path==='scores'){
   const classId=Number(url.searchParams.get('class_id')||0);
   const sql="SELECT sc.id,sc.student_account_id AS student_id,a.display_name,s.student_code,c.grade,c.room,c.academic_year,sc.class_id,sc.category,sc.topic,sc.score,sc.max_score,sc.source,sc.created_at FROM scores sc JOIN accounts a ON a.id=sc.student_account_id JOIN students s ON s.account_id=a.id JOIN classes c ON c.id=sc.class_id";
   const q=classId?db.prepare(sql+' WHERE sc.class_id=? ORDER BY sc.id DESC LIMIT 1000').bind(classId):db.prepare(sql+' ORDER BY sc.id DESC LIMIT 1000');
   const scores=await q.all();return data({scores:scores.results});
  }
  if(method==='POST'&&path==='scores'){
   const v=await jsonBody(request),studentId=Number(v.student_id);
   if(!Number.isInteger(studentId)||!scoreValid(v))return fail('คะแนนต้องอยู่ระหว่าง 0 และคะแนนเต็ม');
   const s=await db.prepare('SELECT class_id FROM students WHERE account_id=?').bind(studentId).first();if(!s)return fail('ไม่พบนักเรียน');
   const q=await db.prepare("INSERT INTO scores(student_account_id,class_id,category,topic,score,max_score,source,recorded_by) VALUES(?,?,?,?,?,?,'teacher',?)").bind(studentId,s.class_id,v.category,clean(v.topic,100),Number(v.score),Number(v.max_score),me.id).run();
   return data({ok:true,id:q.meta.last_row_id},201);
  }
  return fail('ไม่พบ API นี้',404);
 }catch(error){
  console.error('KruWi D1 API error',error?.message);
  const conflict=/UNIQUE constraint|SQLITE_CONSTRAINT_UNIQUE/i.test(String(error));
  return fail(conflict?'ข้อมูลซ้ำ: ชื่อผู้ใช้ รหัสนักเรียน หรือห้องเรียนมีอยู่แล้ว':'เกิดข้อผิดพลาด โปรดตรวจสอบการตั้งค่า D1 หรือข้อมูล',conflict?409:500);
 }
}
