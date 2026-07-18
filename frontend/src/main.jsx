import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import ReportComplaint from './pages/ReportComplaint.jsx'
import MyComplaints from './pages/MyComplaints.jsx'
import CityMap from './pages/CityMap.jsx'
import Admin from './pages/Admin.jsx'
import Wallet from './pages/Wallet.jsx'
import { AuthProvider, useAuth } from './lib/auth.jsx'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <p className="p-8 text-center text-sakura-100/60">Loading…</p>
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return children
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<App />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/report"
              element={
                <RequireAuth>
                  <ReportComplaint />
                </RequireAuth>
              }
            />
            <Route
              path="/my-complaints"
              element={
                <RequireAuth>
                  <MyComplaints />
                </RequireAuth>
              }
            />
            <Route path="/map" element={<CityMap />} />
            <Route path="/admin" element={<Admin />} />
            <Route
              path="/wallet"
              element={
                <RequireAuth>
                  <Wallet />
                </RequireAuth>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
