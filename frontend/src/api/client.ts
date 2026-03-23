import axios from 'axios'

const API_BASE = '/api'

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
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
    api.post<{ access_token: string }>('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
}

export const dashboard = {
  stats: (days?: number) => api.get('/dashboard/stats', { params: { days } }),
}

export const deals = {
  list: (params?: { funnel_id?: number; stage_id?: number }) =>
    api.get('/deals', { params }),
  get: (id: number) => api.get(`/deals/${id}`),
  create: (data: object, auto_invoice?: boolean) =>
    api.post('/deals', data, { params: { auto_invoice } }),
  update: (id: number, data: object) => api.patch(`/deals/${id}`, data),
  moveStage: (id: number, stage_id: number) =>
    api.patch(`/deals/${id}/stage?stage_id=${stage_id}`),
  createInvoice: (id: number) => api.post(`/deals/${id}/invoice`),
}

export const contacts = {
  list: (params?: { search?: string; limit?: number; offset?: number }) =>
    api.get('/contacts', { params }),
  get: (id: number) => api.get(`/contacts/${id}`),
  create: (data: object) => api.post('/contacts', data),
  update: (id: number, data: object) => api.patch(`/contacts/${id}`, data),
  delete: (id: number) => api.delete(`/contacts/${id}`),
}

export const tasks = {
  list: (params?: { is_done?: boolean; deal_id?: number }) =>
    api.get('/tasks', { params }),
  create: (data: object) => api.post('/tasks', data),
  update: (id: number, data: object) => api.patch(`/tasks/${id}`, data),
  delete: (id: number) => api.delete(`/tasks/${id}`),
}

export const calendar = {
  slots: (from_date: string, to_date: string, hall_id?: number) =>
    api.get('/calendar/slots', { params: { from_date, to_date, hall_id } }),
  availability: (
    hall_id: number,
    event_date: string,
    time_start: string,
    time_end: string,
    exclude_deal_id?: number
  ) =>
    api.get('/calendar/availability', {
      params: { hall_id, event_date, time_start, time_end, exclude_deal_id },
    }),
}

export const settings = {
  funnels: () => api.get('/settings/funnels'),
  createFunnel: (data: object) => api.post('/settings/funnels', data),
  updateFunnel: (id: number, data: object) =>
    api.patch(`/settings/funnels/${id}`, data),
  halls: () => api.get('/settings/halls'),
  createHall: (data: object) => api.post('/settings/halls', data),
  updateHall: (id: number, data: object) =>
    api.patch(`/settings/halls/${id}`, data),
  managers: () => api.get('/settings/managers'),
  createManager: (data: object) => api.post('/settings/managers', data),
  telethon: () => api.get('/settings/telethon'),
  updateTelethon: (data: object) => api.patch('/settings/telethon', data),
}

export const telethon = {
  qr: () => api.get<{ url: string }>('/telethon/qr'),
  authorize: () => api.post('/telethon/authorize'),
  logout: () => api.post('/telethon/logout'),
}
