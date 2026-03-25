import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday } from 'date-fns'
import { ru } from 'date-fns/locale'
import { calendar, settings, deals, contacts } from '../api/client'

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

type Hall = { id: number; name: string; description?: string }
type Contact = { id: number; name: string; company?: string }
type Stage = { id: number; name: string }

const HALL_COLORS: Record<string, string> = {
  'Большой': '#3b82f6',
  'Малый': '#8b5cf6',
  'Кафе': '#f59e0b',
  'Каминная': '#ef4444',
  'Массажная': '#10b981',
}

export default function HallCalendar() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const hallId = Number(id)

  const [current, setCurrent] = useState(new Date())
  const [slots, setSlots] = useState<Slot[]>([])
  const [hall, setHall] = useState<Hall | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  // Booking modal state
  const [showBooking, setShowBooking] = useState(false)
  const [contactsList, setContactsList] = useState<Contact[]>([])
  const [funnels, setFunnels] = useState<{ id: number; stages: Stage[] }[]>([])
  const [bookForm, setBookForm] = useState({
    title: '',
    contact_id: null as number | null,
    hall_id: hallId,
    event_date: '',
    event_time_start: '',
    event_time_end: '',
    rental_price: 0,
    participants_count: null as number | null,
    comments: '',
  })
  const [newClient, setNewClient] = useState({ name: '', phone: '', telegram_username: '' })
  const [showNewClient, setShowNewClient] = useState(false)
  const [saving, setSaving] = useState(false)

  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  useEffect(() => {
    settings.halls().then((r) => {
      const hallsArr = r || []
      const found = hallsArr.find((h: Hall) => h.id === hallId)
      setHall(found || null)
      if (found) setBookForm((f) => ({ ...f, rental_price: Number((found as any).default_price) || 0 }))
    })
  }, [hallId])

  useEffect(() => {
    const from = format(monthStart, 'yyyy-MM-dd')
    const to = format(monthEnd, 'yyyy-MM-dd')
    calendar.slots(from, to, hallId).then((r) => setSlots(r.slots || []))
  }, [current, hallId])

  useEffect(() => {
    contacts.list({ limit: 500 }).then((r) => setContactsList(r || []))
    settings.funnels().then((r) => setFunnels(r || []))
  }, [])

  const slotsByDate = (d: Date) => {
    const dateStr = format(d, 'yyyy-MM-dd')
    return slots.filter((s) => s.date === dateStr)
  }

  const daySlots = selectedDay ? slots.filter((s) => s.date === selectedDay) : []
  const color = hall ? (HALL_COLORS[hall.name] || '#6b7280') : '#6b7280'

  const firstDay = monthStart.getDay()
  const offset = firstDay === 0 ? 6 : firstDay - 1

  // Generate time slots for the day timeline (9:00 - 22:00)
  const timeSlots = Array.from({ length: 13 }, (_, i) => {
    const hour = 9 + i
    return `${hour.toString().padStart(2, '0')}:00`
  })

  function isSlotBusy(timeStr: string) {
    const t = timeStr
    return daySlots.find((s) => {
      const start = s.time_start.slice(0, 5)
      const end = s.time_end.slice(0, 5)
      return t >= start && t < end
    })
  }

  function openBooking(dateStr: string, startTime?: string) {
    let endTime = ''
    if (startTime) {
      const [h, m] = startTime.split(':').map(Number)
      endTime = `${(h + 1).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    }

    setBookForm((f) => ({
      ...f,
      event_date: dateStr,
      hall_id: hallId,
      title: '',
      contact_id: null,
      event_time_start: startTime || '',
      event_time_end: endTime,
      comments: '',
      participants_count: null,
    }))
    setShowBooking(true)
  }

  async function handleCreateClient() {
    if (!newClient.name) return
    try {
      const data = await contacts.create(newClient)
      setContactsList((prev) => [data, ...prev])
      setBookForm((f) => ({ ...f, contact_id: data.id }))
      setNewClient({ name: '', phone: '', telegram_username: '' })
      setShowNewClient(false)
    } catch (_) {}
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const firstStage = funnels[0]?.stages?.[0]
      const payload = {
        title: bookForm.title,
        contact_id: bookForm.contact_id,
        funnel_id: funnels[0]?.id ?? 1,
        stage_id: firstStage?.id ?? 1,
        hall_id: bookForm.hall_id,
        event_date: bookForm.event_date || null,
        event_time_start: bookForm.event_time_start || null,
        event_time_end: bookForm.event_time_end || null,
        rental_price: bookForm.rental_price,
        participants_count: bookForm.participants_count,
        comments: bookForm.comments || null,
      }
      await deals.create(payload)
      setShowBooking(false)
      // Refresh slots
      const from = format(monthStart, 'yyyy-MM-dd')
      const to = format(monthEnd, 'yyyy-MM-dd')
      const r = await calendar.slots(from, to, hallId)
      setSlots(r.data.slots || [])
      if (selectedDay) {
        // keep modal open to see updated schedule
      }
    } catch (_) {}
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/halls')} className="text-slate-600 hover:text-slate-800">
            ← Залы
          </button>
          <h1 className="text-2xl font-semibold text-slate-800">
            <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color }} />
            {hall?.name || 'Зал'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrent(subMonths(current, 1))} className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50">←</button>
          <span className="font-medium text-slate-800 min-w-[140px] text-center">
            {format(current, 'LLLL yyyy', { locale: ru })}
          </span>
          <button onClick={() => setCurrent(addMonths(current, 1))} className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50">→</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((w) => (
            <div key={w} className="py-2 text-center text-sm font-medium text-slate-600">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: offset }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[80px] md:min-h-[100px] border-b border-r border-slate-100 bg-slate-50/50" />
          ))}
          {days.map((d) => {
            const ds = slotsByDate(d)
            const dateStr = format(d, 'yyyy-MM-dd')
            const hasBookings = ds.length > 0
            return (
              <div
                key={d.toISOString()}
                onClick={() => setSelectedDay(dateStr)}
                className={`min-h-[80px] md:min-h-[100px] border-b border-r border-slate-100 p-1 cursor-pointer hover:bg-slate-50 transition-colors ${
                  isToday(d) ? 'ring-1 ring-primary-500 ring-inset' : ''
                } ${selectedDay === dateStr ? 'bg-primary-50' : 'bg-white'}`}
              >
                <p className={`text-sm font-medium ${isToday(d) ? 'text-primary-600' : 'text-slate-700'}`}>
                  {format(d, 'd')}
                </p>
                {hasBookings ? (
                  <div className="mt-1 space-y-0.5">
                    {ds.slice(0, 3).map((s, i) => (
                      <div key={i} className="text-xs truncate px-1 py-0.5 rounded" style={{ backgroundColor: color + '20', color }}>
                        {s.time_start.slice(0, 5)}–{s.time_end.slice(0, 5)}
                      </div>
                    ))}
                    {ds.length > 3 && <p className="text-xs text-slate-500">+{ds.length - 3}</p>}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-500 mt-1">свободен</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Day Detail Modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDay(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                {hall?.name} — {selectedDay}
              </h2>
              <button onClick={() => setSelectedDay(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-1">
              {timeSlots.map((t) => {
                const busy = isSlotBusy(t)
                return (
                  <div 
                    key={t} 
                    onClick={() => !busy && openBooking(selectedDay!, t)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      !busy ? 'hover:bg-slate-50 cursor-pointer group' : ''
                    }`}
                    style={busy ? { backgroundColor: color + '15', borderLeft: `3px solid ${color}` } : {}}
                  >
                    <span className="font-mono w-12 shrink-0 text-slate-500">{t}</span>
                    {busy ? (
                      <span className="font-medium" style={{ color }}>{busy.deal_title || 'Бронь'} ({busy.time_start.slice(0, 5)}–{busy.time_end.slice(0, 5)})</span>
                    ) : (
                      <div className="flex items-center justify-between flex-1">
                        <span className="text-slate-400 group-hover:text-primary-600">свободно</span>
                        <span className="text-primary-600 opacity-0 group-hover:opacity-100 text-xs font-medium">+ Забронировать</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="p-5 border-t border-slate-200">
              <button
                onClick={() => openBooking(selectedDay)}
                className="w-full px-4 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-500"
              >
                + Забронировать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBooking && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowBooking(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Новое бронирование</h2>
              <button onClick={() => setShowBooking(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleBook} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Мероприятие</label>
                <input
                  value={bookForm.title}
                  onChange={(e) => setBookForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                  placeholder="Название мероприятия"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-slate-700">Клиент</label>
                  <button type="button" onClick={() => setShowNewClient(!showNewClient)} className="text-xs text-primary-600 hover:underline">
                    {showNewClient ? 'Отмена' : '+ Создать клиента'}
                  </button>
                </div>
                {showNewClient ? (
                  <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <input placeholder="Имя *" value={newClient.name} onChange={(e) => setNewClient((c) => ({ ...c, name: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                    <input placeholder="Телефон" value={newClient.phone} onChange={(e) => setNewClient((c) => ({ ...c, phone: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                    <input placeholder="Telegram" value={newClient.telegram_username} onChange={(e) => setNewClient((c) => ({ ...c, telegram_username: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                    <button type="button" onClick={handleCreateClient} className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-500">Добавить</button>
                  </div>
                ) : (
                  <select
                    value={bookForm.contact_id ?? ''}
                    onChange={(e) => setBookForm((f) => ({ ...f, contact_id: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="">— Выберите —</option>
                    {contactsList.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Зал</label>
                <input value={hall?.name || ''} disabled className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-600" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Дата</label>
                  <input type="date" value={bookForm.event_date} onChange={(e) => setBookForm((f) => ({ ...f, event_date: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Начало</label>
                  <input type="time" value={bookForm.event_time_start} onChange={(e) => setBookForm((f) => ({ ...f, event_time_start: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Конец</label>
                  <input type="time" value={bookForm.event_time_end} onChange={(e) => setBookForm((f) => ({ ...f, event_time_end: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Цена аренды, ₽</label>
                  <input type="number" min={0} value={bookForm.rental_price || ''} onChange={(e) => setBookForm((f) => ({ ...f, rental_price: Number(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Участники</label>
                  <input type="number" min={0} value={bookForm.participants_count ?? ''} onChange={(e) => setBookForm((f) => ({ ...f, participants_count: e.target.value ? Number(e.target.value) : null }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Комментарии</label>
                <textarea value={bookForm.comments} onChange={(e) => setBookForm((f) => ({ ...f, comments: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <button type="submit" disabled={saving} className="w-full px-4 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-500 disabled:opacity-50">
                {saving ? 'Сохранение...' : 'Забронировать'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
