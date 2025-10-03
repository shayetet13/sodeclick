import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import AdminDashboard from './components/AdminDashboard'
import HealthCheck from './components/HealthCheck'
import JoinChatRoom from './components/JoinChatRoom'
import { ToastProvider, useToast } from './components/ui/toast'
import { AuthProvider } from './contexts/AuthContext'

// ลงทะเบียน Service Worker สำหรับ Auto Refresh
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // เลือกไฟล์ Service Worker ที่เหมาะสมกับ environment
    const swFile = import.meta.env.PROD ? '/sw-auto-refresh.js' : '/sw-auto-refresh-dev.js';

    navigator.serviceWorker.register(swFile)
      .then((registration) => {
        console.log('✅ Service Worker registered for Auto Refresh:', registration);
        console.log('📁 Service Worker file:', swFile);

        // ตรวจสอบการอัปเดต Service Worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🔄 New Service Worker available, reloading...');
                // สามารถแจ้งผู้ใช้ให้รีโหลดหน้าเว็บได้ที่นี่
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
        console.log('🔧 Falling back to polling-based auto refresh');
      });
  });
}

// Wrapper component to include ToastContainer
const AppWrapper = () => {
  const { ToastContainer } = useToast();
  
  return (
    <>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/health" element={<HealthCheck />} />
        <Route path="/join/:inviteCode" element={<JoinChatRoom />} />
      </Routes>
      <ToastContainer />
    </>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppWrapper />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
