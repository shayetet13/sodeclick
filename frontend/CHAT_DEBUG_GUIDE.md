# Chat Debug Guide

## ปัญหาที่พบ
ห้องแชทไม่แสดงข้อความ แม้ว่าการตั้งค่าใน admin dashboard จะมีอยู่แล้ว

## สาเหตุที่เป็นไปได้

### 1. **Socket.IO Connection Issues**
- Frontend ไม่สามารถเชื่อมต่อกับ backend Socket.IO server
- CORS policy blocking Socket.IO connection
- Environment variables ไม่ตรงกัน

### 2. **API Endpoint Issues**
- API calls ใช้ URL ไม่ตรงกัน
- Authentication headers ไม่ถูกต้อง
- API responses ไม่ถูกต้อง

### 3. **Message Loading Issues**
- ไม่สามารถโหลดข้อความเก่าได้
- Database queries ไม่ถูกต้อง
- Permission issues

## การแก้ไขที่ทำแล้ว

### 1. **Environment Variables**
```bash
# Development
VITE_API_BASE_URL=http://localhost:5000
VITE_API_URL=http://localhost:5000

# Production
VITE_API_BASE_URL=https://sodeclick-back-production.up.railway.app
VITE_API_URL=https://sodeclick-back-production.up.railway.app
```

### 2. **API Headers**
- เปลี่ยนจาก `credentials: 'include'` เป็น `Authorization: Bearer <token>`
- ใช้ `VITE_API_BASE_URL` แทน `VITE_API_URL` สำหรับ REST API calls

### 3. **Socket.IO Connection**
- ใช้ `VITE_API_URL` สำหรับ Socket.IO connection
- เพิ่ม error handling และ logging

## การ Debug

### 1. **ตรวจสอบ Console Logs**
เปิด Browser Developer Tools และดู Console:
```
🔍 Fetching messages for room: [roomId]
📨 Messages response: [data]
✅ Loaded [count] messages
```

### 2. **ตรวจสอบ Network Tab**
ดู Network requests ใน Developer Tools:
- `/api/messages/[roomId]` - โหลดข้อความเก่า
- `/api/chatroom/[roomId]` - โหลดข้อมูลห้อง
- `/api/chatroom/[roomId]/online-users` - โหลดคนออนไลน์

### 3. **ตรวจสอบ Socket.IO Connection**
ดู Console logs:
```
Connected to server
👤 User [userId] joined room [roomId]
📊 Room [roomId] online count: [count] users
```

## การทดสอบ

### 1. **Development**
```bash
npm run dev
```
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

### 2. **Production**
- Frontend: https://sodeclick-front-production.up.railway.app
- Backend: https://sodeclick-back-production.up.railway.app

## Troubleshooting

### ถ้ายังมีปัญหา:

#### 1. **ตรวจสอบ Backend Logs**
ดู backend console:
```
👤 User connected: [socketId]
👤 User [userId] joined room [roomId]
📊 Room [roomId] online count: [count] users
```

#### 2. **ตรวจสอบ Database**
- ข้อความใน database มีอยู่จริงหรือไม่
- ChatRoom model ถูกต้องหรือไม่
- User permissions ถูกต้องหรือไม่

#### 3. **ตรวจสอบ CORS**
- Backend CORS configuration ถูกต้องหรือไม่
- Frontend domain อยู่ใน allowed origins หรือไม่

## สิ่งที่ต้องตรวจสอบเพิ่มเติม

### 1. **Backend Socket.IO Events**
ตรวจสอบว่า backend ส่ง events ถูกต้อง:
- `new-message`
- `online-count-updated`
- `user-joined`
- `user-left`

### 2. **Frontend Event Listeners**
ตรวจสอบว่า frontend รับ events ถูกต้อง:
- `socket.on('new-message', ...)`
- `socket.on('online-count-updated', ...)`

### 3. **Message Model**
ตรวจสอบ Message schema และ data structure

## การรายงานปัญหา

เมื่อพบปัญหา ให้ส่งข้อมูลต่อไปนี้:
1. **Console Logs** จาก Browser
2. **Network Tab** screenshots
3. **Backend Logs** (ถ้ามี)
4. **Environment** (development/production)
5. **Steps to reproduce**
