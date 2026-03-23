import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { deals, contacts, settings } from '../api/client'

type Contact = { id: number; name: string; company?: string; email?: string; phone?: string }
type Hall = { id: number; name: string }
type Stage = { id: number; name: string }
type DealData = {
  id: number
  title: string
  contact_id: number | null
  responsible_id: number | null
  contact?: Contact
  stage_id: number
  stage?: Stage
  hall_id: number | null
  hall?: Hall
  event_date: string | null
  event_time_start: string | null
  event_time_end: string | null
  event_organizer_name: string | null
  rental_price: number
  deposit_amount: number
  deposit_paid: boolean
  participants_count: number | null
  comments: string | null
  extra_tasks: { id: number; title: string; is_done: boolean }[]
}

export default function DealCard() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = id === 'new'
  const [deal, setDeal] = useState<DealData | null>(null)
  const [contactsList, setContactsList] = useState<Contact[]>([])
  const [halls, setHalls] = useState<Hall[]>([])
  const [funnels, setFunnels] = useState<{ id: number; stages: Stage[] }[]>([])
  const [saving, setSaving] = useState(false)
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', phone: '', telegram_username: '' })
  const [form, setForm] = useState({
    title: '',
    contact_id: null as number | null,
    stage_id: 0,
    hall_id: null as number | null,
    event_date: '',
    event_time_start: '',
    event_time_end: '',
    event_organizer_name: '',
    rental_price: 0,
    deposit_amount: 0,
    deposit_paid: false,
    participants_count: null as number | null,
    comments: '',
  })

  useEffect(() => {
    contacts.list({ limit: 500 }).then((r) => setContactsList(r.data))
    settings.halls().then((r) => setHalls(r.data))
    settings.funnels().then((r) => {
      setFunnels(r.data)
      if (r.data[0]?.stages?.length && isNew)
        setForm((f) => ({ ...f, stage_id: r.data[0].stages[0].id }))
    })
  }, [isNew])

  useEffect(() => {
    if (!isNew && id) {
      deals.get(Number(id)).then((r) => {
        const d = r.data
        setDeal(d)
        setForm({
          title: d.title,
          contact_id: d.contact_id,
          stage_id: d.stage_id,
          hall_id: d.hall_id,
          event_date: d.event_date ? d.event_date.slice(0, 10) : '',
          event_time_start: d.event_time_start ? d.event_time_start.slice(0, 5) : '',
          event_time_end: d.event_time_end ? d.event_time_end.slice(0, 5) : '',
          event_organizer_name: d.event_organizer_name || '',
          rental_price: Number(d.rental_price),
          deposit_amount: Number(d.deposit_amount),
          deposit_paid: d.deposit_paid,
          participants_count: d.participants_count,
          comments: d.comments || '',
        })
      })
    }
  }, [id, isNew])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        contact_id: form.contact_id,
        stage_id: form.stage_id,
        funnel_id: currentFunnel?.id ?? funnels[0]?.id ?? 1,
        hall_id: form.hall_id,
        event_date: form.event_date || null,
        event_time_start: form.event_time_start || null,
        event_time_end: form.event_time_end || null,
        event_organizer_name: form.event_organizer_name || null,
        rental_price: form.rental_price,
        deposit_amount: form.deposit_amount,
        participants_count: form.participants_count,
        comments: form.comments || null,
      }
      if (isNew) {
        const { data } = await deals.create(payload)
        navigate(`/deals/${data.id}`)
      } else {
        await deals.update(Number(id), {
          ...payload,
          deposit_paid: form.deposit_paid,
        })
        setDeal((prev) => (prev ? { ...prev, ...form } : null))
      }
    } catch (_) {}
    setSaving(false)
  }

  async function handleCreateInvoice() {
    if (!id || isNew) return
    try {
      await deals.createInvoice(Number(id))
      if (deal) setDeal({ ...deal })
    } catch (_) {}
  }

  const currentFunnel = funnels.find((f) => f.stages?.some((s) => s.id === form.stage_id))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/deals')}
          className="text-slate-600 hover:text-slate-800"
        >
          ← Назад
        </button>
        <h1 className="text-2xl font-semibold text-slate-800">
          {isNew ? 'Новое бронирование' : deal?.title || 'Бронирование'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Мероприятие</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              required
              placeholder="Название мероприятия"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <button type="button" onClick={async () => {
                    if (!newClient.name) return
                    try {
                      const { data } = await contacts.create(newClient)
                      setContactsList((prev) => [data, ...prev])
                      setForm((f) => ({ ...f, contact_id: data.id }))
                      setNewClient({ name: '', phone: '', telegram_username: '' })
                      setShowNewClient(false)
                    } catch (_) {}
                  }} className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-500">Добавить</button>
                </div>
              ) : (
                <select
                  value={form.contact_id ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, contact_id: e.target.value ? Number(e.target.value) : null }))}
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Этап воронки</label>
              <select
                value={form.stage_id}
                onChange={(e) => setForm((f) => ({ ...f, stage_id: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                {currentFunnel?.stages?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Зал</label>
            <select
              value={form.hall_id ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, hall_id: e.target.value ? Number(e.target.value) : null }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="">— Не выбран —</option>
              {halls.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Дата мероприятия</label>
              <input
                type="date"
                value={form.event_date}
                onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Время начала</label>
              <input
                type="time"
                value={form.event_time_start}
                onChange={(e) => setForm((f) => ({ ...f, event_time_start: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Время окончания</label>
              <input
                type="time"
                value={form.event_time_end}
                onChange={(e) => setForm((f) => ({ ...f, event_time_end: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Имя проводящего мероприятие</label>
            <input
              value={form.event_organizer_name}
              onChange={(e) => setForm((f) => ({ ...f, event_organizer_name: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Цена аренды, ₽</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.rental_price || ''}
                onChange={(e) => setForm((f) => ({ ...f, rental_price: Number(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Задаток, ₽</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.deposit_amount || ''}
                onChange={(e) => setForm((f) => ({ ...f, deposit_amount: Number(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            {!isNew && (
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.deposit_paid}
                    onChange={(e) => setForm((f) => ({ ...f, deposit_paid: e.target.checked }))}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">Задаток внесён</span>
                </label>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Количество участников</label>
            <input
              type="number"
              min={0}
              value={form.participants_count ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, participants_count: e.target.value ? Number(e.target.value) : null }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Комментарии</label>
            <textarea
              value={form.comments}
              onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          {deal?.extra_tasks?.length ? (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">Доп. задачи</p>
              <ul className="list-disc list-inside text-slate-600 text-sm">
                {deal.extra_tasks.map((t) => (
                  <li key={t.id}>{t.title} {t.is_done ? '✓' : ''}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-500 disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          {!isNew && (
            <button
              type="button"
              onClick={handleCreateInvoice}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              Сформировать счёт
            </button>
          )}
          {!isNew && (
            <button
              type="button"
              onClick={() => navigate('/deals')}
              className="px-4 py-2 text-slate-600 hover:text-slate-800"
            >
              К списку сделок
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
