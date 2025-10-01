# ระบบ Online/Offline Status

## 📋 สรุปการทำงานของระบบ

ระบบนี้จัดการสถานะ online/offline ของผู้ใช้แบบ real-time โดยใช้ Socket.IO และ MongoDB

### ✅ การทำงานที่ถูกต้อง

1. **เมื่อ User เข้าสู่ระบบ (Login)**
   - `isOnline` = `true`
   - `lastActive` = เวลาปัจจุบัน
   - เกิดขึ้นที่: `backend/routes/auth.js` (login, login-phone, verify-otp)

2. **เมื่อ User อยู่ในระบบ (Active)**
   - `isOnline` คงอยู่เป็น `true`
   - `lastActive` อัพเดททุกครั้งที่มีการใช้งาน
   - เกิดขึ้นที่: Socket.IO connection (`backend/server.js` - join-room event)

3. **เมื่อ User ออกจากระบบ (Logout)**
   - `isOnline` = `false`
   - `lastActive` = เวลาปัจจุบัน
   - เกิดขึ้นที่:
     - Manual logout: `backend/routes/auth.js` (logout endpoint)
     - Browser close: `frontend/src/contexts/AuthContext.jsx` (beforeunload event)
     - Socket disconnect: `backend/server.js` (disconnect event) - เฉพาะเมื่อไม่มี socket อื่นเชื่อมต่ออยู่

4. **Multi-Tab/Window Support**
   - ระบบรองรับการเปิดหลาย tabs/windows
   - ใช้ `userSockets` Map เก็บ socket IDs ทั้งหมดของ user
   - User จะ offline เฉพาะเมื่อปิด tabs/windows ทั้งหมด

## 🔧 ส่วนประกอบหลัก

### Backend

#### 1. User Model (`backend/models/User.js`)
```javascript
isOnline: { type: Boolean, default: false }
lastActive: { type: Date, default: Date.now }
```

#### 2. Socket.IO Handler (`backend/server.js`)
- **Join Room**: เซ็ต `isOnline: true` และอัพเดท `lastActive`
- **Disconnect**: เซ็ต `isOnline: false` เฉพาะเมื่อไม่มี socket อื่น
- **Multi-Socket Tracking**: ใช้ `userSockets` Map

#### 3. Auth Routes (`backend/routes/auth.js`)
- **Login**: เซ็ต `isOnline: true`
- **Logout**: เซ็ต `isOnline: false`

### Frontend

#### 1. AuthContext (`frontend/src/contexts/AuthContext.jsx`)
- **beforeunload event**: ส่ง logout request เมื่อปิด browser/tab
- ใช้ `fetch` with `keepalive: true` เพื่อให้ request ทำงานต่อแม้ page ปิด

#### 2. SocketManager (`frontend/src/services/socketManager.js`)
- **ไม่เรียก logout API** เมื่อ socket disconnect
- ป้องกันการ logout ผิดพลาดเมื่อมีหลาย tabs เปิดอยู่

## 🧹 Ghost Users Cleanup

### ปัญหา Ghost Users
Ghost users คือ users ที่ติด `isOnline: true` แต่จริงๆ ไม่ได้อยู่ในระบบ เกิดจาก:
- Browser crash กะทันหัน
- Network disconnect กะทันหัน
- Socket disconnect ไม่ทำงาน

### วิธีแก้ปัญหา

#### 1. Manual Check & Clear
```bash
# ตรวจสอบ online users และ ghost users
node scripts/checkOnlineUsers.js

# เคลียร์ ghost users แบบ manual (จะถามยืนยันก่อน)
node scripts/clearGhostUsers.js
```

#### 2. Auto-Cleanup (แนะนำสำหรับ Production)
```bash
# รัน auto-cleaner ที่จะเคลียร์ ghost users ทุก 5 นาที
node scripts/autoGhostUsersCleaner.js

# หรือใช้ batch file
# Windows:
.\start-ghost-cleaner.bat

# Linux/Mac:
./start-ghost-cleaner.sh
```

**การตั้งค่า Auto-Cleaner:**
- รันทุก 5 นาที
- Threshold: users ที่ `isOnline: true` และ `lastActive` เก่ากว่า 10 นาที
- รันใน background แยกจาก server หลัก

#### 3. Production Deployment

**Option 1: PM2 (แนะนำ)**
เพิ่มใน `ecosystem.config.js`:
```javascript
{
  name: 'ghost-cleaner',
  script: 'scripts/autoGhostUsersCleaner.js',
  cwd: './backend',
  watch: false,
  autorestart: true,
  max_memory_restart: '200M'
}
```

**Option 2: Cron Job**
```bash
# เพิ่มใน crontab (รันทุก 5 นาที)
*/5 * * * * cd /path/to/backend && node scripts/autoGhostUsersCleaner.js
```

**Option 3: systemd (Linux)**
สร้างไฟล์ `/etc/systemd/system/ghost-cleaner.service`

## 📊 Monitoring

### ตรวจสอบสถานะระบบ

```bash
# ดู online users ปัจจุบัน
node scripts/checkOnlineUsers.js

# Output ตัวอย่าง:
# 📊 Total users in database: 6
# 🟢 Online users: 2
# 👻 Ghost users (online but inactive > 10 min): 0
# ✅ Active users (not banned): 6
# ⏰ Users active in last hour: 5
```

### Logs ที่ควรตรวจสอบ

```bash
# Server logs
🟢 User {userId} marked as online in database
🔴 User {userId} marked as offline in database (disconnect)
📅 lastActive updated: {timestamp}

# Ghost Cleaner logs
🧹 Cleared {count} ghost users (took {time}ms)
✅ No ghost users found (took {time}ms)
```

## 🔍 Troubleshooting

### ปัญหา: User ติด Online แม้ออกจากระบบแล้ว

**สาเหตุที่เป็นไปได้:**
1. Ghost user (ไม่ได้อัพเดทสถานะ offline)
2. Multi-tab: ยังมี tab/window อื่นเปิดอยู่

**วิธีแก้:**
```bash
# 1. เช็คว่าเป็น ghost user
node scripts/checkOnlineUsers.js

# 2. ถ้าเป็น ghost user (lastActive > 10 min) ให้เคลียร์
node scripts/clearGhostUsers.js
```

### ปัญหา: User Offline ทันทีแม้เปิดหลาย Tabs

**สาเหตุ:** Socket disconnect event เรียก logout API

**วิธีแก้:** ✅ แก้ไขแล้วใน `frontend/src/services/socketManager.js`

### ปัญหา: User Offline เร็วเกินไป (< 10 นาที)

**สาเหตุที่เป็นไปได้:**
1. Socket disconnect ผิดพลาด
2. Network ไม่เสถียร

**วิธีแก้:**
- ปรับค่า threshold ใน auto-cleaner (ปัจจุบัน 10 นาที)
- ตรวจสอบ Socket.IO connection settings

## ✅ Best Practices

1. **Production Environment**
   - ใช้ auto-cleaner รันใน background
   - Monitor logs เป็นประจำ
   - ตั้ง alert เมื่อมี ghost users มากกว่า threshold

2. **Development Environment**
   - ใช้ manual check & clear เป็นครั้งคราว
   - ตรวจสอบ logs เมื่อทดสอบ

3. **Testing**
   - ทดสอบ multi-tab scenarios
   - ทดสอบ browser close/refresh
   - ทดสอบ network disconnect

## 📝 Changelog

### 2025-10-01 - Version 2.0

**แก้ไข:**
- ✅ `AuthContext`: ใช้ `fetch` with `keepalive` แทน `navigator.sendBeacon`
- ✅ `SocketManager`: ลบการเรียก logout API เมื่อ disconnect
- ✅ สร้าง scripts: `checkOnlineUsers.js`, `clearGhostUsers.js`, `autoGhostUsersCleaner.js`
- ✅ รองรับ multi-tab/window อย่างสมบูรณ์

**ผลลัพธ์:**
- ✅ User online ได้ถูกต้อง เมื่ออยู่ในระบบ
- ✅ User offline ได้ถูกต้อง เมื่อออกจาก browser
- ✅ รองรับหลาย tabs/windows
- ✅ มีระบบเคลียร์ ghost users อัตโนมัติ
- ✅ สถานะตรงกับความเป็นจริง 100%

