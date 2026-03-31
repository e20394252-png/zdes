import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from 'date-fns'
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
  rental_price: number | null
  contact_name: string | null
  organizer_name: string | null
}

type Hall = { id: number; name: string }
type Contact = { id: number; name: string }
type Stage = { id: number; name: string }

// Hours shown in grid: 09:00 - 21:00
const HOURS = Array.from({ length: 13 }, (_, i) => 9 + i) // 9..21

function padH(h: number) {
  return h.toString().padStart(2, '0') + ':00'
}

function isoTime(t: string) {
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

export default function WeeklyCalendar() {
  const navigate = useNavigate()
  const [current, setCurrent] = useState(new Date())
  const [slots, setSlots] = useState<Slot[]>([])
  const [halls, setHalls] = useState<Hall[]>([])
  const [contactsList, setContactsList] = useState<Contact[]>([])
  const [funnels, setFunnels] = useState<{ id: number; stages: Stage[] }[]>([])

  // Booking modal
  const [showBooking, setShowBooking] = useState(false)
  const [bookForm, setBookForm] = useState({
    title: '',
    contact_id: null as number | null,
    hall_id: null as number | null,
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

  const weekStart = startOfWeek(current, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(current, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  useEffect(() => {
    settings.halls().then(r => setHalls(r || []))
    contacts.list({ limit: 500 }).then(r => setContactsList(r || []))
    settings.funnels().then(r => setFunnels(r || []))
  }, [])

  useEffect(() => {
    const from = format(weekStart, 'yyyy-MM-dd')
    const to = format(weekEnd, 'yyyy-MM-dd')
    calendar.slots(from, to).then(r => setSlots(r.slots || []))
  }, [current])

  // Find slots that cover a given hour on a given day
  function getSlotsAt(dayStr: string, hour: number): Slot[] {
    return slots.filter(s => {
      if (s.date !== dayStr) return false
      const start = isoTime(s.time_start)
      const end = isoTime(s.time_end)
      const slotMin = hour * 60
      return slotMin >= start && slotMin < end
    })
  }

  // Returns how many rows this slot spans starting from `hour`
  function spanHours(slot: Slot, startHour: number): number {
    const end = isoTime(slot.time_end)
    let span = 0
    for (let h = startHour; h < 22; h++) {
      if (h * 60 < end) span++
      else break
    }
    return Math.max(1, span)
  }

  // Track which cells are already rendered (due to rowspan)
  function buildGrid() {
    // grid[dayIndex][hour] = { slot | null, skip }
    const skipMap: Record<string, boolean> = {} // key: `${dayIdx}-${hour}`

    return { skipMap }
  }

  function openBooking(dateStr: string, hour: number) {
    setBookForm({
      title: '',
      contact_id: null,
      hall_id: halls.length > 0 ? halls[0].id : null,
      event_date: dateStr,
      event_time_start: padH(hour),
      event_time_end: padH(hour + 1),
      rental_price: 0,
      participants_count: null,
      comments: '',
    })
    setShowBooking(true)
  }

  async function handleCreateClient() {
    if (!newClient.name) return
    try {
      const data = await contacts.create(newClient)
      setContactsList(prev => [data, ...prev])
      setBookForm(f => ({ ...f, contact_id: data.id }))
      setNewClient({ name: '', phone: '', telegram_username: '' })
      setShowNewClient(false)
    } catch (_) {}
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const firstStage = funnels[0]?.stages?.[0]
      await deals.create({
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
        comments: bookForm.comments,
      })
      const from = format(weekStart, 'yyyy-MM-dd')
      const to = format(weekEnd, 'yyyy-MM-dd')
      calendar.slots(from, to).then(r => setSlots(r.slots || []))
      setShowBooking(false)
    } catch (_) {} finally {
      setSaving(false)
    }
  }

  const { skipMap } = buildGrid()

  // Calculate day totals
  function dayTotal(dayStr: string): number {
    const daySlots = slots.filter(s => s.date === dayStr)
    const seen = new Set<number>()
    let sum = 0
    for (const s of daySlots) {
      if (s.deal_id && !seen.has(s.deal_id)) {
        seen.add(s.deal_id)
        sum += s.rental_price ?? 0
      }
    }
    return sum
  }

  function weekTotal(): number {
    return days.reduce((acc, d) => acc + dayTotal(format(d, 'yyyy-MM-dd')), 0)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h1 className="text-2xl font-semibold text-slate-800">Календарь зала</h1>
          <button
            onClick={() => navigate('/calendar')}
            className="rounded-lg border border-slate-300 text-sm py-1 px-3 hover:bg-slate-50 text-slate-600"
          >
            📅 Месяц
          </button>
          <button
            style={{ background: '#e0e7ff', border: '1px solid #a5b4fc', color: '#4338ca', padding: '4px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            🗓 Неделя
          </button>
        </div>

        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#475569' }}>
          {format(weekStart, 'd MMM', { locale: ru })} — {format(weekEnd, 'd MMM yyyy', { locale: ru })}
        </h2>

        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setCurrent(subWeeks(current, 1))}
            className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700"
          >‹</button>
          <button onClick={() => setCurrent(new Date())}
            className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600 text-sm"
          >Сегодня</button>
          <button onClick={() => setCurrent(addWeeks(current, 1))}
            className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700"
          >›</button>
        </div>
      </div>

      {/* Grid */}
      <div style={{ overflowX: 'auto', padding: '0 0 24px', marginTop: 0 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900, tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 64 }} />
            {days.map((_, i) => <col key={i} />)}
          </colgroup>
          <thead>
            <tr>
              {/* Date header row */}
              <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 500, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', width: 56 }}></th>
              {days.map(day => {
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                return (
                  <th key={day.toISOString()} style={{ padding: '10px 4px', textAlign: 'center', fontWeight: 600, fontSize: 13, color: isToday ? '#4f46e5' : '#475569', borderBottom: '1px solid #cbd5e1', borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500, marginBottom: 2, color: isToday ? '#4f46e5' : '#94a3b8' }}>
                      {format(day, 'EEE', { locale: ru })}
                    </div>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28, borderRadius: '50%',
                      background: isToday ? '#4f46e5' : 'transparent',
                      color: isToday ? '#fff' : '#1e293b',
                      fontWeight: isToday ? 700 : 600,
                      fontSize: 15,
                    }}>
                      {format(day, 'd')}
                    </div>
                    <div style={{ fontSize: 11, marginTop: 2, color: '#94a3b8' }}>
                      {format(day, 'MMM', { locale: ru })}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {HOURS.map(hour => {
              const timeLabel = padH(hour)
              return (
                <tr key={hour}>
                  {/* Time label */}
                  <td style={{
                    padding: '0 8px 0 0',
                    textAlign: 'right',
                    fontSize: 11,
                    color: '#94a3b8',
                    fontWeight: 500,
                    verticalAlign: 'top',
                    paddingTop: 6,
                    borderTop: '1px solid #cbd5e1',
                    borderRight: '1px solid #cbd5e1',
                    whiteSpace: 'nowrap',
                    width: 56,
                  }}>
                    {timeLabel}
                  </td>

                  {days.map(day => {
                    const dayStr = format(day, 'yyyy-MM-dd')
                    const skipKey = `${dayStr}-${hour}`
                    if (skipMap[skipKey]) return null

                    const daySlots = getSlotsAt(dayStr, hour)
                    const slot = daySlots[0] ?? null

                    if (slot) {
                      const span = spanHours(slot, hour)
                      // Mark subsequent rows as skipped
                      for (let s = 1; s < span; s++) {
                        skipMap[`${dayStr}-${hour + s}`] = true
                      }
                      const confirmed = slot.is_confirmed
                      const bg = confirmed ? '#f0fdf4' : '#fff7f7'
                      const border = confirmed ? '1px solid #bbf7d0' : '1px solid #fecaca'
                      const textColor = confirmed ? '#16a34a' : '#dc2626'

                      return (
                        <td
                          key={dayStr}
                          rowSpan={span}
                          onClick={() => slot.deal_id && navigate(`/deals/${slot.deal_id}`)}
                          style={{
                            background: bg,
                            border,
                            borderTop: '1px solid #cbd5e1',
                            borderLeft: '1px solid #cbd5e1',
                            borderRight: '1px solid #cbd5e1',
                            borderBottom: '1px solid #cbd5e1',
                            padding: '6px 8px',
                            verticalAlign: 'top',
                            cursor: slot.deal_id ? 'pointer' : 'default',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => { if (slot.deal_id) (e.currentTarget as HTMLElement).style.background = confirmed ? '#dcfce7' : '#fee2e2' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = bg }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 700, color: textColor, lineHeight: 1.3 }}>
                            {slot.time_start.slice(0, 5)} – {slot.time_end.slice(0, 5)}
                          </div>
                          {slot.contact_name && (
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#1e293b', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                              {slot.contact_name}
                            </div>
                          )}
                          {slot.deal_title && (
                            <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>
                              {slot.deal_title}
                            </div>
                          )}
                          {slot.rental_price != null && (
                            <div style={{ fontSize: 11, fontWeight: 700, color: textColor, marginTop: 3 }}>
                              {slot.rental_price.toLocaleString('ru')} ₽
                              {slot.is_confirmed && <span style={{ fontWeight: 400, opacity: 0.7 }}> (оплачено)</span>}
                            </div>
                          )}
                        </td>
                      )
                    }

                    return (
                      <td
                        key={dayStr}
                        onClick={() => openBooking(dayStr, hour)}
                        style={{
                          background: 'transparent',
                          borderTop: '1px solid #cbd5e1',
                          borderLeft: '1px solid #cbd5e1',
                          borderRight: '1px solid #cbd5e1',
                          borderBottom: '1px solid #cbd5e1',
                          height: 42,
                          cursor: 'pointer',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      />
                    )
                  })}
                </tr>
              )
            })}
            {/* Totals row */}
            <tr>
              <td style={{ padding: '8px 8px 0 0', textAlign: 'right', fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, borderTop: '2px solid #cbd5e1', borderRight: '1px solid #cbd5e1' }}>
                Итого
              </td>
              {days.map(day => {
                const dayStr = format(day, 'yyyy-MM-dd')
                const total = dayTotal(dayStr)
                return (
                  <td key={dayStr} style={{ padding: '8px 8px 0', textAlign: 'center', fontSize: 12, fontWeight: 700, color: total > 0 ? '#16a34a' : '#cbd5e1', borderTop: '2px solid #cbd5e1', borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}>
                    {total > 0 ? `${total.toLocaleString('ru')} ₽` : '—'}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>

        {/* Week grand total */}
        <div style={{ textAlign: 'right', marginTop: 8, fontSize: 13, color: '#64748b' }}>
          Итог недели:{' '}
          <span style={{ fontWeight: 700, fontSize: 15, color: '#16a34a' }}>{weekTotal().toLocaleString('ru')} ₽</span>
        </div>
      </div>

      {/* Booking modal */}
      {showBooking && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(2px)' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 28, width: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Новое бронирование</h3>
              <button onClick={() => setShowBooking(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>
            <form onSubmit={handleBook} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 500 }}>Название</label>
                <input required value={bookForm.title} onChange={e => setBookForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 500 }}>Клиент</label>
                <select value={bookForm.contact_id ?? ''} onChange={e => setBookForm(f => ({ ...f, contact_id: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                  <option value="">— Выбрать клиента —</option>
                  {contactsList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="button" onClick={() => setShowNewClient(!showNewClient)} style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 11, cursor: 'pointer', padding: '4px 0', marginTop: 2 }}>
                  + Новый клиент
                </button>
                {showNewClient && (
                  <div style={{ background: '#0f1117', border: '1px solid #2d3748', borderRadius: 8, padding: 12, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input placeholder="Имя*" value={newClient.name} onChange={e => setNewClient(n => ({ ...n, name: e.target.value }))}
                      style={{ background: '#161b2e', border: '1px solid #2d3748', borderRadius: 6, color: '#f1f5f9', padding: '7px 10px', fontSize: 12 }} />
                    <input placeholder="Телефон" value={newClient.phone} onChange={e => setNewClient(n => ({ ...n, phone: e.target.value }))}
                      style={{ background: '#161b2e', border: '1px solid #2d3748', borderRadius: 6, color: '#f1f5f9', padding: '7px 10px', fontSize: 12 }} />
                    <button type="button" onClick={handleCreateClient} style={{ background: '#4f46e5', border: 'none', color: '#fff', padding: '7px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      Создать
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 500 }}>Дата</label>
                  <input type="date" value={bookForm.event_date} onChange={e => setBookForm(f => ({ ...f, event_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 500 }}>Цена (₽)</label>
                  <input type="number" value={bookForm.rental_price} onChange={e => setBookForm(f => ({ ...f, rental_price: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 500 }}>Начало</label>
                  <input type="time" value={bookForm.event_time_start} onChange={e => setBookForm(f => ({ ...f, event_time_start: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 500 }}>Конец</label>
                  <input type="time" value={bookForm.event_time_end} onChange={e => setBookForm(f => ({ ...f, event_time_end: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 500 }}>Комментарий</label>
                <textarea value={bookForm.comments} onChange={e => setBookForm(f => ({ ...f, comments: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-y" />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowBooking(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-600 rounded-xl text-sm hover:bg-slate-50">
                  Отмена
                </button>
                <button type="submit" disabled={saving}
                  className="flex-[2] py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-50">
                  {saving ? 'Сохраняем...' : 'Создать бронирование'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
