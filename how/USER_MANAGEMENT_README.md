# หน้าจัดการผู้ใช้ (User Management)

## ฟีเจอร์ที่ครบถ้วน

### 1. เพิ่มผู้ใช้ (Create User)
- สร้างผู้ใช้ใหม่โดยแอดมิน
- กรอกข้อมูลพื้นฐาน: username, email, password, ชื่อ-นามสกุล
- กำหนดระดับ: user, admin, superadmin
- กำหนดสมาชิก: member, silver, gold, vip, diamond, platinum
- ข้อมูลเพิ่มเติม: เพศ, วันเกิด, ที่อยู่

### 2. แก้ไขผู้ใช้ (Edit User)
- แก้ไขข้อมูลส่วนตัว: ชื่อ, นามสกุล, อีเมล
- เปลี่ยนระดับผู้ใช้
- อัปเกรด/ดาวน์เกรดสมาชิก
- บันทึกการเปลี่ยนแปลง

### 3. ลบผู้ใช้ (Delete User)
- ลบผู้ใช้ออกจากระบบ (เฉพาะ superadmin)
- ยืนยันก่อนลบ
- ลบข้อมูลทั้งหมดของผู้ใช้

### 4. แบนผู้ใช้ (Ban User)
- แบนแบบกำหนดเวลา: ชั่วโมง, วัน, เดือน, ถาวร
- ระบุเหตุผลในการแบน
- ปลดแบนผู้ใช้
- แสดงสถานะการแบน

### 5. ดูโปรไฟล์ (View Profile)
- ดูข้อมูลส่วนตัวครบถ้วน
- ข้อมูลสมาชิกและ coins
- ประวัติการใช้งาน
- สถานะการแบน (ถ้ามี)

### 6. ปรับระดับชั้น (Role Management)
- เปลี่ยนระดับ: user → admin → superadmin
- เปลี่ยนสมาชิก: member → silver → gold → vip → diamond → platinum
- แสดง badge สีตามระดับ

## UI/UX Features

### การออกแบบที่เรียบง่ายแต่สวยงาม
- **Gradient Background**: พื้นหลังไล่สีจาก slate-50 ไป white
- **Card Design**: ใช้ card component สำหรับจัดกลุ่มข้อมูล
- **Color Coding**: สี badge ตามสถานะและระดับ
- **Responsive**: รองรับทุกขนาดหน้าจอ
- **Loading States**: แสดง loading animation ขณะโหลดข้อมูล

### การจัดวาง
- **Header**: ชื่อหน้าและปุ่มเพิ่มผู้ใช้
- **Search Bar**: ค้นหาผู้ใช้แบบ real-time
- **Table**: แสดงรายชื่อผู้ใช้แบบตาราง
- **Pagination**: แบ่งหน้าข้อมูล
- **Modal Dialogs**: สำหรับเพิ่ม/แก้ไข/แบน/ดูโปรไฟล์

### สีและ Badge
- **สถานะ**: เขียว (ใช้งาน), เทา (ไม่ใช้งาน), แดง (ถูกแบน)
- **ระดับ**: น้ำเงิน (user), ม่วง (admin), แดง (superadmin)
- **สมาชิก**: เทา (member), เงิน (silver), ทอง (gold), ม่วง (vip), น้ำเงิน (diamond), เขียว (platinum)

## API Endpoints

### Backend Routes
```javascript
// Get users with pagination and filters
GET /api/admin/users?page=1&limit=20&search=term&status=active&role=user

// Get user profile
GET /api/admin/users/:id/profile

// Create new user
POST /api/admin/users

// Update user
PUT /api/admin/users/:id

// Ban/Unban user with duration
PATCH /api/admin/users/:id/ban-duration

// Update user role
PATCH /api/admin/users/:id/role

// Update user membership
PATCH /api/admin/users/:id/membership

// Delete user (superadmin only)
DELETE /api/admin/users/:id
```

### Request/Response Examples

#### Ban User Request
```json
{
  "isBanned": true,
  "banReason": "พฤติกรรมไม่เหมาะสม",
  "banDuration": 7,
  "banDurationType": "days"
}
```

#### Create User Request
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01",
  "gender": "male",
  "lookingFor": "female",
  "location": "กรุงเทพฯ",
  "role": "user",
  "membership": {
    "tier": "member"
  }
}
```

## การใช้งาน

### สำหรับแอดมิน
1. เข้าสู่ระบบด้วยบัญชีแอดมิน
2. ไปที่ Admin Dashboard
3. คลิก "จัดการผู้ใช้" หรือ "ดูรายชื่อผู้ใช้ทั้งหมด"
4. ใช้ฟีเจอร์ต่างๆ ตามต้องการ

### สำหรับซูเปอร์แอดมิน
- มีสิทธิ์เพิ่มเติมในการลบผู้ใช้
- สามารถจัดการแอดมินคนอื่นได้

## การติดตั้ง

### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd frontend
npm install
```

### Environment Variables
```env
# Backend
MONGODB_URI=mongodb://localhost:27017/love
JWT_SECRET=your_jwt_secret

# Frontend
VITE_API_BASE_URL=http://localhost:5000
```

## การรันโปรเจค

### Development
```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev
```

### Production
```bash
# Backend
cd backend && npm start

# Frontend
cd frontend && npm run build
```

## เทคโนโลยีที่ใช้

### Frontend
- React 18
- Tailwind CSS
- Lucide React (Icons)
- Custom UI Components

### Backend
- Node.js
- Express.js
- MongoDB
- JWT Authentication
- bcrypt (Password Hashing)

## การพัฒนาต่อ

### ฟีเจอร์ที่อาจเพิ่มในอนาคต
- Export ข้อมูลผู้ใช้เป็น CSV/Excel
- Bulk operations (แบน/ปลดแบนหลายคนพร้อมกัน)
- Advanced filters (อายุ, วันที่สมัคร, สถานะสมาชิก)
- User activity logs
- Email notifications
- Real-time updates

### การปรับปรุง UI
- Dark mode
- Advanced animations
- Better mobile responsiveness
- Custom themes
- Drag & drop functionality

## การแก้ไขปัญหา

### ปัญหาที่พบบ่อย
1. **ไม่สามารถเข้าถึงหน้าได้**: ตรวจสอบสิทธิ์แอดมิน
2. **ข้อมูลไม่โหลด**: ตรวจสอบ API connection
3. **การแบนไม่ทำงาน**: ตรวจสอบ token และสิทธิ์
4. **UI ไม่แสดงผล**: ตรวจสอบ Tailwind CSS installation

### Debug Tips
- เปิด Developer Tools ดู Network requests
- ตรวจสอบ Console สำหรับ errors
- ใช้ React DevTools สำหรับ debugging components
