import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { settings } from '../api/client'

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
  const navigate = useNavigate()

  useEffect(() => {
    settings.halls().then((r) => setHalls(r.data))
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Залы</h1>
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
    </div>
  )
}
