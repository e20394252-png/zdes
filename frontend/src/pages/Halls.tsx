import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { settings, api } from '../api/client'

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
    <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl border border-red-100">
      <p className="font-semibold">Ошибка подключения к серверу</p>
      <p className="text-sm opacity-80">{error}</p>
      <div className="mt-4 p-3 bg-white/50 rounded border border-red-100 text-xs font-mono break-all text-slate-500">
        Попытка подключения к: {api.defaults.baseURL}
      </div>
      <button 
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
      >
        Попробовать еще раз
      </button>
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
