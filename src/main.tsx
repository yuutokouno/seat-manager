import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { FloorMap } from './pages/FloorMap'
import { SeatPage } from './pages/SeatPage'
import { LoginPage } from './pages/LoginPage'
import { AdminPage } from './pages/AdminPage'
import { TimetablePage } from './pages/TimetablePage'
import { AttendancePage } from './pages/AttendancePage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FloorMap />} />
        <Route path="/seat/:id" element={<SeatPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/timetable" element={<TimetablePage />} />
        <Route path="/attendance" element={<AttendancePage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
