# CORS Setup Guide

## ปัญหาที่เกิดขึ้น
```
Access to fetch at 'https://sodeclick-back-production.up.railway.app/api/profile/all' 
from origin 'https://sodeclick-front-production.up.railway.app' has been blocked by CORS policy
```

## วิธีแก้ไข

### 1. อัปเดต Environment Variables
ใน `env.production`:
```bash
FRONTEND_URL=https://sodeclick-front-production.up.railway.app
```

### 2. CORS Configuration
ไฟล์ `config/cors.js` ได้รับการตั้งค่าให้ยอมรับ:
- Localhost (development)
- Production frontend domain
- Railway domains

### 3. Deploy Backend
หลังจากแก้ไขแล้ว ต้อง deploy backend ใหม่ไปยัง Railway

## การทดสอบ

### Development
```bash
npm run dev
```
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

### Production
- Frontend: https://sodeclick-front-production.up.railway.app
- Backend: https://sodeclick-back-production.up.railway.app

## Troubleshooting

### ถ้ายังมี CORS error:
1. ตรวจสอบว่า backend ได้ deploy ใหม่แล้ว
2. ตรวจสอบ environment variables ใน Railway
3. ตรวจสอบ CORS configuration ใน `config/cors.js`

### Logs ที่ควรเห็น:
```
✅ CORS allowed origin: https://sodeclick-front-production.up.railway.app
```

### Logs ที่ไม่ควรเห็น:
```
🚫 CORS blocked origin: https://sodeclick-front-production.up.railway.app
```
