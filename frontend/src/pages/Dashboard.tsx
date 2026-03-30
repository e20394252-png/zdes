import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { format, addDays, startOfWeek, eachDayOfInterval } from 'date-fns'
import { ru } from 'date-fns/locale'

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8) // 08:00 - 22:00

export default function Dashboard() {
  const [data, setData] = useState<{ slots: any[], halls: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [bigHall, setBigHall] = useState<any>(null)
  const navigate = useNavigate()
  
  const start = startOfWeek(new Date(), { weekStartsOn: 1 })
  const end = addDays(start, 6)
  const weekDays = eachDayOfInterval({ start, end })

  useEffect(() => {
    const fromStr = format(start, 'yyyy-MM-dd')
    const toStr = format(end, 'yyyy-MM-dd')
    api.get(`/calendar/slots?from_date=${fromStr}&to_date=${toStr}`)
      .then(r => {
        setData(r.data)
        // Найти большой зал
        const bigHallData = r.data.halls.find((hall: any) => hall.name === 'Большой')
        setBigHall(bigHallData || r.data.halls[0]) // Если нет большого, берем первый
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center animate-pulse text-slate-400">Загрузка расписания...</div>
  if (!data || !bigHall) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-800">Дашборд</h1>
        <button 
          onClick={() => navigate(`/halls/${bigHall.id}/calendar`)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition"
        >
          Открыть полный календарь →
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-800">Большой зал - Занятость на неделю</h2>
          <div className="text-sm text-slate-500 font-medium">
            {format(start, 'd MMMM', { locale: ru })} — {format(end, 'd MMMM yyyy', { locale: ru })}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <div className="min-w-[1000px] p-5">
            <div className="grid grid-cols-[120px_repeat(7,1fr)] gap-4">
              {/* Header row */}
              <div />
              {weekDays.map(day => (
                <div key={day.toISOString()} className="text-center">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {format(day, 'eeeeee', { locale: ru })}
                  </div>
                  <div className="text-sm font-semibold text-slate-700">
                    {format(day, 'd MMM', { locale: ru })}
                  </div>
                </div>
              ))}

              {/* Big Hall row */}
              <div className="flex items-center font-medium text-slate-800 text-sm">
                🏛️ Большой зал
              </div>
              {weekDays.map(day => {
                const dayStr = format(day, 'yyyy-MM-dd')
                const daySlots = data.slots.filter(s => s.date === dayStr && s.hall_id === bigHall.id)
                
                return (
                  <div key={day.toISOString()} className="h-10 bg-slate-50 rounded-lg relative overflow-hidden border border-slate-100 group">
                    {/* Hour markers */}
                    <div className="absolute inset-0 flex justify-between px-1 pointer-events-none opacity-20">
                      {HOURS.filter((_, i) => i % 4 === 0).map(h => (
                         <div key={h} className="h-full w-[1px] bg-slate-300" />
                      ))}
                    </div>
                    
                    {/* Occupied slots */}
                    {daySlots.map((slot: any, idx: number) => {
                      const startH = parseInt(slot.time_start.split(':')[0])
                      const startM = parseInt(slot.time_start.split(':')[1])
                      const endH = parseInt(slot.time_end.split(':')[0])
                      const endM = parseInt(slot.time_end.split(':')[1])
                      
                      const startTotal = startH * 60 + startM
                      const endTotal = endH * 60 + endM
                      const minTime = 8 * 60
                      const maxTime = 23 * 60
                      const totalRange = maxTime - minTime
                      
                      const left = Math.max(0, ((startTotal - minTime) / totalRange) * 100)
                      const width = Math.min(100 - left, ((endTotal - startTotal) / totalRange) * 100)
                      
                      return (
                        <div 
                          key={idx}
                          className={`absolute top-1 bottom-1 rounded shadow-sm border ${slot.is_confirmed ? 'bg-emerald-500 border-emerald-600' : 'bg-amber-400 border-amber-500'}`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`${slot.time_start}-${slot.time_end}: ${slot.deal_title || 'Бронь'}`}
                        />
                      )
                    })}
                  </div>
                )
              })}
            </div>
            
            <div className="mt-6 flex items-center gap-6 text-xs text-slate-500 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-emerald-500 rounded border border-emerald-600" />
                <span>Подтверждено</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-amber-400 rounded border border-amber-500" />
                <span>Ожидает оплаты</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="italic">Рабочее время: 08:00 – 23:00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
