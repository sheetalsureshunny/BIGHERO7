import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from './lib/auth.jsx'
import BaymaxAssistant from './components/BaymaxAssistant.jsx'

const linkClass = ({ isActive }) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-sakura-500/25 text-sakura-200'
      : 'text-sakura-100/60 hover:text-white hover:bg-white/5'
  }`

function App() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function onLogout() {
    await logout()
    navigate('/')
  }

  return (
    <div className="relative min-h-screen text-sakura-50">
      <header className="sticky top-0 z-[1000] border-b border-sakura-300/15 bg-plum-950/70 backdrop-blur-md">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3">
          <NavLink to="/" className="mr-4 text-lg font-bold">
            Big Hero <span className="text-sakura-400">7</span>
          </NavLink>
          <NavLink to="/" className={linkClass} end>
            Home
          </NavLink>
          <NavLink to="/report" className={linkClass}>
            Report Issue
          </NavLink>
          <NavLink to="/my-complaints" className={linkClass}>
            My Complaints
          </NavLink>
          <NavLink to="/map" className={linkClass}>
            City Map
          </NavLink>
          <NavLink to="/wallet" className={linkClass}>
            Wallet
          </NavLink>
          <NavLink to="/admin" className={linkClass}>
            Admin
          </NavLink>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden text-sm text-sakura-100/70 sm:inline">
                  {user.name}
                </span>
                <button
                  onClick={onLogout}
                  className="rounded-lg bg-white/5 px-3 py-1.5 text-sm text-sakura-100/80 hover:bg-white/10"
                >
                  Logout
                </button>
              </>
            ) : (
              <NavLink
                to="/login"
                className="rounded-lg bg-sakura-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-sakura-600"
              >
                Login
              </NavLink>
            )}
          </div>
        </nav>
      </header>
      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
      <BaymaxAssistant />
    </div>
  )
}

export default App
