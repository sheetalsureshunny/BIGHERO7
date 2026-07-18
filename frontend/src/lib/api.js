// API layer — real backend (FastAPI on :8000, proxied via /api in dev).
import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

const TOKEN_KEY = 'bh7_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export async function register({ name, email, password }) {
  const fd = new FormData()
  fd.append('name', name)
  fd.append('email', email)
  fd.append('password', password)
  const { data } = await api.post('/auth/register', fd)
  setToken(data.token)
  return data.user
}

export async function login({ email, password }) {
  const fd = new FormData()
  fd.append('email', email)
  fd.append('password', password)
  const { data } = await api.post('/auth/login', fd)
  setToken(data.token)
  return data.user
}

export async function logout() {
  try {
    await api.post('/auth/logout')
  } finally {
    setToken(null)
  }
}

export async function getMe() {
  const { data } = await api.get('/auth/me')
  return data
}

export async function getMyComplaints() {
  const { data } = await api.get('/complaints/mine')
  return data
}

export async function redeemRide() {
  const { data } = await api.post('/wallet/redeem-ride')
  return data
}

export async function submitComplaint({ description, category, location, imageFile }) {
  const fd = new FormData()
  fd.append('description', description)
  fd.append('category', category)
  fd.append('lat', location.lat)
  fd.append('lng', location.lng)
  if (imageFile) fd.append('image', imageFile)
  const { data } = await api.post('/complaints', fd)
  return data
}

export async function listComplaints() {
  const { data } = await api.get('/complaints')
  return data
}

export async function getComplaint(id) {
  const { data } = await api.get(`/complaints/${id}`)
  return data
}

export async function getQueue() {
  const { data } = await api.get('/complaints/queue')
  return data
}

export async function updateStatus(id, status) {
  const fd = new FormData()
  fd.append('status', status)
  const { data } = await api.patch(`/complaints/${id}/status`, fd)
  return data
}

export async function verifyComplaint(id, { result, feedback, imageFile }) {
  const fd = new FormData()
  fd.append('result', result)
  fd.append('feedback', feedback ?? '')
  if (imageFile) fd.append('image', imageFile)
  const { data } = await api.post(`/complaints/${id}/verify`, fd)
  return data
}

export async function getStats() {
  const { data } = await api.get('/stats')
  return data
}

export async function getWallet() {
  const { data } = await api.get('/wallet')
  return data
}

export async function convertPoints(points) {
  const fd = new FormData()
  fd.append('points', points)
  const { data } = await api.post('/wallet/convert', fd)
  return data
}

export async function getLeaderboard() {
  const { data } = await api.get('/wallet/leaderboard')
  return data
}
