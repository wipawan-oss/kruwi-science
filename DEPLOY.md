# ติดตั้ง “ครูวิ สอนวิทย์” ด้วย GitHub + Cloudflare Pages

เว็บไซต์นี้เป็น **Static HTML/CSS/JavaScript** ไม่มี Build ขั้นตอนการเผยแพร่เริ่มต้นฟรีได้ตามโควตาของผู้ให้บริการ โดยไม่ต้องใช้ฐานข้อมูลหรือ API เสียเงิน

## 1) เปิดดูบนคอมพิวเตอร์

แตก ZIP แล้วดับเบิลคลิก `index.html` เปิดด้วย Chrome, Edge หรือ Firefox ส่วนหน้าสำหรับครูอยู่ที่ `teacher.html` (ไม่ใช่ระบบล็อกอิน)

## 2) นำขึ้น GitHub

1. เข้า [github.com](https://github.com) และเข้าสู่ระบบ
2. เลือก **New repository** ตั้งชื่อ เช่น `kruwi-science` สร้าง Repository เป็น Public หรือ Private ก็ได้
3. เปิด Repository ใหม่ เลือก **Add file → Upload files**
4. แตกไฟล์ ZIP จากชุดนี้แล้วอัปโหลดไฟล์ทั้งหมดจากโฟลเดอร์ `kruwi-science-github` ลงในรากของ Repository (สำคัญ: `index.html` ต้องอยู่ระดับบนสุด ไม่อยู่ในโฟลเดอร์ซ้อน)
5. กด **Commit changes** ให้ไฟล์อยู่ในสาขา `main`

หากใช้ Git ผ่านคอมพิวเตอร์:

```bash
git init
git add .
git commit -m "Initial Kru Wi Science Lab"
git branch -M main
git remote add origin https://github.com/USERNAME/kruwi-science.git
git push -u origin main
```

เปลี่ยน `USERNAME` เป็นชื่อผู้ใช้ GitHub ของคุณก่อนสั่ง Push (ต้องมีสิทธิ์การเข้าถึงและล็อกอิน Git)

## 3) เชื่อม Cloudflare Pages กับ GitHub

1. เข้า [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages**
2. เลือก **Create application → Pages → Connect to Git** (ชื่อปุ่มอาจเปลี่ยนตาม UI)
3. เชื่อมบัญชี GitHub และเลือก Repository `kruwi-science`
4. ตั้งค่า:

| รายการ | ค่าแนะนำ |
| --- | --- |
| Project name | `kruwi-science` (หากยังว่าง) |
| Production branch | `main` |
| Framework preset | None / No framework |
| Build command | เว้นว่าง (หากบังคับกรอก ใช้ `exit 0`) |
| Build output directory | `.` (จุด หมายถึงราก Repository ซึ่งมี `index.html`) |
| Root directory | `/` หรือค่าเริ่มต้นของ Repository |

5. กด **Save and Deploy** เมื่อสำเร็จเว็บจะมีลิงก์ลักษณะ `https://kruwi-science.pages.dev` **ทั้งนี้เป็นเพียงตัวอย่าง ไม่ใช่ URL ที่เผยแพร่จริง**
6. ทุกครั้งที่ Commit ไฟล์ขึ้นสาขา `main` Cloudflare Pages ที่เชื่อมไว้จะเริ่ม Deploy ใหม่อัตโนมัติ

**สำคัญ:** ต้องสร้างเป็น Pages แบบ **Connect to Git** ตั้งแต่แรก หากเลือก Direct Upload จะไม่สามารถสลับโครงการนั้นเป็น Git integration ในภายหลังได้โดยตรง

คู่มือทางการ: https://developers.cloudflare.com/pages/get-started/git-integration/

## 4) เพิ่มหรือแก้ไขข้อสอบ O-NET ม.3

1. เปิด `teacher.html` บนเว็บหรือบนเครื่อง (หน้านี้เป็นตัวช่วยจัดทำคลังข้อสอบ ไม่ใช่หน้า Admin แบบมีบัญชี)
2. แก้ไขข้อฝึกและกด **บันทึกฉบับร่าง**
3. กด **ดาวน์โหลด onet-bank.js**
4. นำไฟล์ `onet-bank.js` ไปแทนใน Repository ผ่าน GitHub Editor หรือ Git แล้ว Commit
5. รอ Cloudflare Pages Deploy ใหม่ นักเรียนที่เปิดเว็บหลังอัปเดตจะได้รับคลังข้อฝึกล่าสุด

หากแก้ใน `teacher.html` โดยไม่ส่งไฟล์ขึ้น GitHub จะเปลี่ยนเฉพาะสำเนาในเบราว์เซอร์ของครู **ไม่เปลี่ยนข้อสอบของนักเรียน**

## 5) ขอบเขตเวอร์ชันนี้และข้อมูลนักเรียน

- ไม่ต้องสมัครสมาชิก/ล็อกอิน คะแนนและความก้าวหน้าเก็บใน `localStorage` ของเบราว์เซอร์เท่านั้น
- ไม่ส่งคะแนนไปหาเซิร์ฟเวอร์ ไม่สามารถดูคะแนนนักเรียนจากคนละเครื่องหรือสรุปคะแนนทั้งห้องเรียนได้
- ในหน้า O-NET มีปุ่ม **ส่งออกผล CSV** สำหรับส่งออกผลของเบราว์เซอร์ปัจจุบัน
- เมื่อผู้ใช้ล้างข้อมูลเว็บไซต์หรือเปลี่ยนเครื่อง คะแนนในเครื่องเดิมจะไม่ตามไปด้วย
- `teacher.html` เผยแพร่พร้อมเว็บและใครก็เปิดได้ แต่ไม่มีสิทธิ์แก้โค้ดบน GitHub จากหน้าเว็บ และแก้ไขได้เฉพาะร่างในเครื่องของผู้ใช้
- การเพิ่มล็อกอินครู/นักเรียน ระบบดูคะแนนรายห้องเรียน หรือการแก้ข้อมูลแบบออนไลน์จำเป็นต้องมี Backend พร้อมการพิสูจน์ตัวตนและกำหนดสิทธิ์ เช่น Cloudflare Workers + D1
- ข้อสอบ O-NET ทั้ง 48 ข้อในชุดเริ่มต้นเป็นข้อฝึกแต่งใหม่ ไม่ใช่ข้อสอบทางการของ สทศ. การจำลอง 20 ข้อ/40 นาทีไม่ใช่รูปแบบเวลาสอบจริง

## 6) ปัญหาที่พบบ่อย

- **ขึ้น 404:** ตรวจว่า `index.html` อยู่ในราก Repo และ Build output directory เป็น `.`
- **แก้ไฟล์แล้วเว็บไม่เปลี่ยน:** ตรวจสาขา `main` และสถานะ Deployment บน Cloudflare Pages และลอง Refresh
- **สถิติหาย:** ข้อมูลเก็บในเบราว์เซอร์ที่ใช้ทำ ไม่ได้ส่งขึ้น Cloud
- **อักษรไทยแสดงผิด:** ตรวจว่าไฟล์ `.html`/`.js` บันทึก UTF-8
- **ทำงานออฟไลน์:** ส่วนโครงสร้างหลักไม่ต้องเชื่อม API แต่ฟอนต์จาก Google Fonts อาจเปลี่ยนเป็นฟอนต์สำรองเมื่อไม่มีอินเทอร์เน็ต
