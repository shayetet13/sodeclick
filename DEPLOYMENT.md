# Deployment Guide for Railway

## ปัญหาที่แก้ไขแล้ว

### MIME Type Error
- **ปัญหา**: Server ส่ง MIME type เป็น "text/html" แทนที่จะเป็น JavaScript modules
- **สาเหตุ**: Backend server ไม่ได้ serve static files ของ frontend
- **การแก้ไข**: เพิ่ม static file serving และ catch-all route สำหรับ SPA

## การแก้ไขที่ทำ

### 1. Backend Server (server.js)
```javascript
// เพิ่ม static file serving สำหรับ frontend
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use('/assets', express.static(path.join(frontendDistPath, 'assets'), {
  maxAge: '1y',
  etag: true,
  lastModified: true
}));

// Serve frontend index.html สำหรับ SPA routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || 
      req.path.startsWith('/health') || 
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/public') ||
      req.path.startsWith('/assets') ||
      req.path.startsWith('/vite.svg') ||
      req.path.startsWith('/favicon.ico') ||
      req.path === '/create-qr' ||
      req.path === '/webhook-endpoint' ||
      req.path === '/api/info') {
    return next();
  }
  
  const indexPath = path.join(__dirname, '../frontend/dist/index.html');
  res.sendFile(indexPath);
});
```

### 2. Frontend Configuration
- เพิ่ม `base: '/'` ใน `vite.config.ts`
- ตรวจสอบ environment variables ใน `env.production`

### 3. Build Scripts
- เพิ่ม `build:production` และ `start:production` ใน `package.json`
- สร้าง `railway-deploy.sh` script
- เพิ่ม `railway.json`, `Procfile`, และ `nixpacks.toml`

## การ Deploy

### วิธีที่ 1: ใช้ Railway CLI
```bash
# Build frontend
npm run build:production

# Deploy to Railway
railway up
```

### วิธีที่ 2: ใช้ Railway Dashboard
1. เชื่อมต่อ GitHub repository กับ Railway
2. Railway จะใช้ `nixpacks.toml` สำหรับ build configuration
3. Build process จะรัน:
   - `npm install` (root)
   - `cd frontend && npm install`
   - `cd ../backend && npm install`
   - `cd frontend && npm run build`
4. Start command: `cd backend && npm start`

## Environment Variables ที่ต้องตั้งค่า

### Backend (.env.production)
```
NODE_ENV=production
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
FRONTEND_URL=https://sodeclick-frontend-production-8907.up.railway.app

# Rabbit Gateway
RABBIT_API_URL=https://api.pgw.rabbit.co.th
RABBIT_APPLICATION_ID=163ce1ba-0a2e-4397-a3c9-d610b8303b32
RABBIT_PUBLIC_KEY=pk_production_...
RABBIT_COMPANY_ID=68a6d14dd9cf2b359ecad193
RABBIT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Frontend (env.production)
```
VITE_API_BASE_URL=https://sodeclick-backend-production-6036.up.railway.app
VITE_APP_ENV=production
VITE_RABBIT_API_URL=https://api.pgw.rabbit.co.th
VITE_RABBIT_APPLICATION_ID=163ce1ba-0a2e-4397-a3c9-d610b8303b32
VITE_RABBIT_PUBLIC_KEY=pk_production_...
VITE_RABBIT_COMPANY_ID=68a6d14dd9cf2b359ecad193
VITE_RABBIT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## การทดสอบ

### 1. ทดสอบ Local Production Build
```bash
# Build frontend
npm run build:production

# Start backend
cd backend && npm start

# เปิด browser ไปที่ http://localhost:5000
```

### 2. ทดสอบ API Endpoints
```bash
# Health check
curl https://sodeclick-backend-production-6036.up.railway.app/health

# API info
curl https://sodeclick-backend-production-6036.up.railway.app/api/info
```

### 3. ทดสอบ Static Files
```bash
# ทดสอบ JavaScript modules
curl https://sodeclick-frontend-production-8907.up.railway.app/assets/index-[hash].js

# ทดสอบ CSS
curl https://sodeclick-frontend-production-8907.up.railway.app/assets/index-[hash].css
```

## Troubleshooting

### ถ้ายังมี MIME Type Error
1. ตรวจสอบว่า frontend build สำเร็จ
2. ตรวจสอบว่า backend serve static files ถูกต้อง
3. ตรวจสอบ CORS configuration
4. ตรวจสอบ environment variables

### ถ้า Assets ไม่โหลด
1. ตรวจสอบ path ใน `frontend/dist/index.html`
2. ตรวจสอบ static file serving ใน backend
3. ตรวจสอบ cache headers

### ถ้า API ไม่ทำงาน
1. ตรวจสอบ CORS configuration
2. ตรวจสอบ environment variables
3. ตรวจสอบ database connection
4. ตรวจสอบ JWT secret

## ไฟล์ที่สำคัญ

- `backend/server.js` - Main server file with static serving
- `frontend/vite.config.ts` - Frontend build configuration
- `frontend/env.production` - Frontend environment variables
- `backend/env.production` - Backend environment variables
- `railway.json` - Railway deployment configuration
- `nixpacks.toml` - Build configuration for Railway
- `Procfile` - Start command for Railway
