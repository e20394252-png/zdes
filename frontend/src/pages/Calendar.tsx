import { useEffect, useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameMonth, isToday } from 'date-fns'
import { ru } from 'date-fns/locale'
import { calendar, settings } from '../api/client'

type Slot = {
  hall_id: number
  hall_name: string
  date: string
  time_start: string
  time_end: string
  deal_id: number | null
  deal_title: string | null
  is_confirmed: boolean
}

export default function Calendar() {
  const [current, setCurrent] = useState(new Date())
  const [slots, setSlots] = useState<Slot[]>([])
  const [halls, setHalls] = useState<{ id: number; name: string }[]>([])
  const [selectedHall, setSelectedHall] = useState<number | null>(null)

  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  useEffect(() => {
    settings.halls().then((r) => setHalls(r.data))
  }, [])

  useEffect(() => {
    const from = format(monthStart, 'yyyy-MM-dd')
    const to = format(monthEnd, 'yyyy-MM-dd')
    calendar.slots(from, to, selectedHall ?? undefined).then((r) => {
      setSlots(r.data.slots || [])
      if (r.data.halls?.length && !selectedHall) setSelectedHall(r.data.halls[0]?.id ?? null)
    })
  }, [current, selectedHall, monthStart, monthEnd])

  const slotsByDate = (d: Date) => {
    const dateStr = format(d, 'yyyy-MM-dd')
    return slots.filter((s) => s.date === dateStr)
  }

  const firstDay = monthStart.getDay()
  const offset = firstDay === 0 ? 6 : firstDay - 1

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-800">Календарь залов</h1>
        <div className="flex items-center gap-2">
          <select
            value={selectedHall ?? ''}
            onChange={(e) => setSelectedHall(e.target.value ? Number(e.target.value) : null)}
            className="rounded-lg border border-slate-300 text-sm py-2 px-3"
          >
            <option value="">Все залы</option>
            {halls.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
          <button
            onClick={() => setCurrent(subMonths(current, 1))}
            className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50"
          >
            ←
          </button>
          <span className="font-medium text-slate-800 min-w-[140px] text-center">
            {format(current, 'LLLL yyyy', { locale: ru })}
          </span>
          <button
            onClick={() => setCurrent(addMonths(current, 1))}
            className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50"
          >
            →
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((w) => (
            <div key={w} className="py-2 text-center text-sm font-medium text-slate-600">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: offset }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[80px] md:min-h-[100px] border-b border-r border-slate-100 bg-slate-50/50" />
          ))}
          {days.map((d) => {
            const daySlots = slotsByDate(d)
            return (
              <div
                key={d.toISOString()}
                className={`min-h-[80px] md:min-h-[100px] border-b border-r border-slate-100 p-1 ${
                  isSameMonth(d, current) ? 'bg-white' : 'bg-slate-50/50'
                } ${isToday(d) ? 'ring-1 ring-primary-500 ring-inset' : ''}`}
              >
                <p className={`text-sm font-medium ${isToday(d) ? 'text-primary-600' : 'text-slate-700'}`}>
                  {format(d, 'd')}
                </p>
                <div className="mt-1 space-y-0.5">
                  {daySlots.slice(0, 3).map((s, i) => (
                    <div
                      key={i}
                      className={`text-xs truncate px-1 py-0.5 rounded ${
                        s.is_confirmed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                      title={`${s.hall_name} ${s.time_start}-${s.time_end} ${s.deal_title || ''} ${s.is_confirmed ? '✓' : '(ожидание задатка)'}`}
                    >
                      {s.time_start.slice(0, 5)} {s.deal_title || s.hall_name}
                    </div>
                  ))}
                  {daySlots.length > 3 && (
                    <p className="text-xs text-slate-500">+{daySlots.length - 3}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex gap-4 text-sm text-slate-600">
        <span><span className="inline-block w-3 h-3 rounded bg-emerald-100 align-middle mr-1" /> — задаток внесён</span>
        <span><span className="inline-block w-3 h-3 rounded bg-amber-100 align-middle mr-1" /> — ожидание задатка</span>
      </div>
    </div>
  )
}
