import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import AdminDashboard from './components/AdminDashboard.jsx'
import HealthCheck from './components/HealthCheck.jsx'
import JoinChatRoom from './components/JoinChatRoom.jsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/health" element={<HealthCheck />} />
        <Route path="/join/:inviteCode" element={<JoinChatRoom />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
