import axios from 'axios'

export const RAW_VITE_URL = (import.meta as any).env.VITE_API_URL
const VITE_API_URL = RAW_VITE_URL
let API_BASE = '/api'

// Logic to determine API_BASE
function determineBase() {
  const override = typeof window !== 'undefined' ? localStorage.getItem('VITE_API_URL_OVERRIDE') : null
  if (override) {
    let host = override.trim()
    if (!host.startsWith('http')) host = `https://${host}`
    // If it doesn't end with /api, append it
    if (!host.endsWith('/api') && !host.endsWith('/api/')) {
      host = host.endsWith('/') ? `${host}api` : `${host}/api`
    }
    return host
  }

  if (VITE_API_URL) {
    let host = VITE_API_URL.trim()
    if (!host.includes('.') && !host.includes('localhost') && !host.startsWith('http')) {
      host += '.onrender.com'
    }
    
    if (host.startsWith('http')) {
      return host.endsWith('/') ? `${host}api` : `${host}/api`
    } else {
      return `https://${host}/api`
    }
  }
  return '/api'
}

const API_BASE = determineBase()

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000, // 60 seconds timeout to handle Render cold starts
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      // localStorage.removeItem('token')
      // window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const auth = {
  login: (email: string, password: string) =>
    api.post<{ access_token: string }>('/auth/login', { email, password }).then(res => res.data),
  me: () => api.get('/auth/me').then(res => res.data),
}

export const dashboard = {
  stats: (days?: number) => api.get('/dashboard/stats', { params: { days } }).then(res => res.data),
}

export const deals = {
  list: (params?: { funnel_id?: number; stage_id?: number }) =>
    api.get('/deals', { params }).then(res => res.data),
  get: (id: number) => api.get(`/deals/${id}`).then(res => res.data),
  create: (data: object, auto_invoice?: boolean) =>
    api.post('/deals', data, { params: { auto_invoice } }).then(res => res.data),
  update: (id: number, data: object) => api.patch(`/deals/${id}`, data).then(res => res.data),
  moveStage: (id: number, stage_id: number) =>
    api.patch(`/deals/${id}/stage?stage_id=${stage_id}`).then(res => res.data),
  createInvoice: (id: number) => api.post(`/deals/${id}/invoice`).then(res => res.data),
}

export const contacts = {
  list: (params?: { search?: string; limit?: number; offset?: number }) =>
    api.get('/contacts', { params }).then(res => res.data),
  get: (id: number) => api.get(`/contacts/${id}`).then(res => res.data),
  create: (data: object) => api.post('/contacts', data).then(res => res.data),
  update: (id: number, data: object) => api.patch(`/contacts/${id}`, data).then(res => res.data),
  delete: (id: number) => api.delete(`/contacts/${id}`).then(res => res.data),
}

export const tasks = {
  list: (params?: { is_done?: boolean; deal_id?: number }) =>
    api.get('/tasks', { params }).then(res => res.data),
  create: (data: object) => api.post('/tasks', data).then(res => res.data),
  update: (id: number, data: object) => api.patch(`/tasks/${id}`, data).then(res => res.data),
  delete: (id: number) => api.delete(`/tasks/${id}`).then(res => res.data),
}

export const calendar = {
  slots: (from_date: string, to_date: string, hall_id?: number) =>
    api.get('/calendar/slots', { params: { from_date, to_date, hall_id } }).then(res => res.data),
  availability: (
    hall_id: number,
    event_date: string,
    time_start: string,
    time_end: string,
    exclude_deal_id?: number
  ) =>
    api.get('/calendar/availability', {
      params: { hall_id, event_date, time_start, time_end, exclude_deal_id },
    }).then(res => res.data),
}

export const settings = {
  funnels: () => api.get('/settings/funnels').then(res => res.data),
  createFunnel: (data: object) => api.post('/settings/funnels', data).then(res => res.data),
  updateFunnel: (id: number, data: object) =>
    api.patch(`/settings/funnels/${id}`, data).then(res => res.data),
  halls: () => api.get('/settings/halls').then(res => res.data),
  createHall: (data: object) => api.post('/settings/halls', data).then(res => res.data),
  updateHall: (id: number, data: object) =>
    api.patch(`/settings/halls/${id}`, data).then(res => res.data),
  managers: () => api.get('/settings/managers').then(res => res.data),
  createManager: (data: object) => api.post('/settings/managers', data).then(res => res.data),
  telethon: () => api.get('/settings/telethon').then(res => res.data),
  updateTelethon: (data: object) => api.patch('/settings/telethon', data).then(res => res.data),
  seedHalls: () => api.get('/settings/seed-halls').then(res => res.data), // Useful for the button
}

export const telethon = {
  qr: () => api.get<{ url: string }>('/telethon/qr').then(res => res.data),
  authorize: () => api.post('/telethon/authorize').then(res => res.data),
  logout: () => api.post('/telethon/logout').then(res => res.data),
}
