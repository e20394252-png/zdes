import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { settings, api, RAW_VITE_URL } from '../api/client'

type Hall = { id: number; name: string; description?: string; default_price?: number }

const HALL_COLORS: Record<string, string> = {
  'Большой': '#3b82f6',
  'Малый': '#8b5cf6',
  'Кафе': '#f59e0b',
  'Каминная': '#ef4444',
  'Массажная': '#10b981',
}

const HALL_ICONS: Record<string, string> = {
  'Большой': '🏛️',
  'Малый': '🏠',
  'Кафе': '☕',
  'Каминная': '🔥',
  'Массажная': '💆',
}

export default function Halls() {
  const [halls, setHalls] = useState<Hall[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [manualUrl, setManualUrl] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadHalls()
  }, [])

  const loadHalls = () => {
    setLoading(true)
    settings.halls()
      .then((r) => {
        setHalls(r.data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to fetch halls:', err)
        setError(err.message || 'Ошибка загрузки данных')
        setLoading(false)
      })
  }

  const handleSeed = async () => {
    try {
      setLoading(true)
      await api.get('/settings/seed-halls')
      const r = await settings.halls()
      setHalls(r.data)
      setLoading(false)
    } catch (err: any) {
      console.error('Failed to seed halls:', err)
      setError(err.message || 'Ошибка при создании залов')
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Загрузка залов...</div>
  
  if (error) return (
    <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl border border-red-100 max-w-2xl mx-auto shadow-sm">
      <p className="font-semibold text-xl mb-2 text-red-700">Ошибка подключения к серверу</p>
      <p className="text-sm opacity-80 mb-6 font-medium">{error}</p>
      
      <div className="bg-white/90 p-6 rounded-2xl border border-red-100 text-left space-y-4 shadow-inner mb-6">
        <h4 className="text-slate-800 font-semibold flex items-center gap-2">
          <span className="text-lg">🛠️</span> Расширенная диагностика
        </h4>
        <div className="grid grid-cols-1 gap-2 text-[11px] font-mono text-slate-500">
          <div className="flex justify-between border-b border-slate-100 pb-1">
            <span>Raw VITE_API_URL (Blueprint):</span>
            <span className="text-slate-700 font-bold">{RAW_VITE_URL || '(empty)'}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-1">
            <span>Final API_BASE:</span>
            <span className="text-slate-700 font-bold">{api.defaults.baseURL}</span>
          </div>
          <div className="flex justify-between">
            <span>Timeout Setting:</span>
            <span className="text-slate-700 font-bold">{api.defaults.timeout}ms</span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-600 mb-2 font-medium">Введите адрес бэкенда вручную (из Dashboard Render):</p>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="https://event-crm-backend-xxxx.onrender.com"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
            />
            <button 
              onClick={() => {
                let url = manualUrl.trim()
                if (!url) return
                if (!url.startsWith('http')) url = 'https://' + url
                if (!url.endsWith('/api')) url = url.replace(/\/$/, '') + '/api'
                localStorage.setItem('VITE_API_URL_OVERRIDE', url)
                window.location.reload()
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm"
            >
              Сохранить и обновить
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 italic">Например: https://event-crm-backend.onrender.com</p>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 shadow-md transition-all active:scale-95"
        >
          Попробовать еще раз
        </button>
        {localStorage.getItem('VITE_API_URL_OVERRIDE') && (
          <button 
            onClick={() => {
              localStorage.removeItem('VITE_API_URL_OVERRIDE')
              window.location.reload()
            }}
            className="px-4 py-2.5 bg-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-300 transition-all"
          >
            Сбросить адрес
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-slate-800">Залы</h1>
        {halls.length === 0 && (
          <button 
            onClick={handleSeed}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition"
          >
            Создать залы по умолчанию
          </button>
        )}
      </div>

      {halls.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <p className="text-slate-500">Залы не найдены. Нажмите на кнопку выше, чтобы создать их.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {halls.map((h) => {
            const color = HALL_COLORS[h.name] || '#6b7280'
            const icon = HALL_ICONS[h.name] || '📍'
            return (
              <div
                key={h.id}
                onClick={() => navigate(`/halls/${h.id}/calendar`)}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: color + '20' }}
                  >
                    {icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 group-hover:text-primary-600 transition-colors">
                      {h.name}
                    </h3>
                    {h.default_price != null && (
                      <p className="text-sm text-slate-500">
                        {Number(h.default_price).toLocaleString('ru-RU')} ₽
                      </p>
                    )}
                  </div>
                </div>
                {h.description && (
                  <p className="text-sm text-slate-600">{h.description}</p>
                )}
                <div className="mt-3 flex items-center gap-1 text-sm font-medium" style={{ color }}>
                  <span>Открыть календарь →</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
