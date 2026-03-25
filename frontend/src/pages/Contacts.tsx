import { useEffect, useState } from 'react'
import { contacts as contactsApi } from '../api/client'

type Contact = {
  id: number
  name: string
  company: string | null
  email: string | null
  phone: string | null
  total_events_count: number
  total_amount: number
}

export default function Contacts() {
  const [list, setList] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    telegram_username: ''
  })

  const load = () => {
    setLoading(true)
    contactsApi.list({ search: search || undefined, limit: 200 }).then((r) => {
      setList(r)
      setLoading(false)
    })
  }

  useEffect(() => {
    load()
  }, [search])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await contactsApi.create(form)
      setShowCreate(false)
      setForm({ name: '', company: '', phone: '', email: '', telegram_username: '' })
      load()
    } catch (err: any) {
      alert(err.message || 'Ошибка при создании контакта')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-800">Контакты</h1>
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <input
          type="search"
          placeholder="Поиск по имени, компании, email, телефону..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button 
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
        >
          + Новый контакт
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Новый контакт</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Имя *</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Компания</label>
                <input value={form.company} onChange={e => setForm({...form, company: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Телефон</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telegram username</label>
                <input value={form.telegram_username} onChange={e => setForm({...form, telegram_username: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="@username" />
              </div>
              <button type="submit" disabled={saving} className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50">
                {saving ? 'Сохранение...' : 'Создать'}
              </button>
            </form>
          </div>
        </div>
      )}
      {loading ? (
        <p className="text-slate-500">Загрузка...</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">Имя</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">Компания</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">Контакты</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-700">Мероприятий</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-700">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-medium text-slate-800">{c.name}</td>
                    <td className="py-3 px-4 text-slate-600">{c.company || '—'}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {[c.email, c.phone].filter(Boolean).join(' • ') || '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700">{c.total_events_count}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800">
                      {Number(c.total_amount).toLocaleString('ru-RU')} ₽
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.length === 0 && (
            <p className="text-center py-8 text-slate-500">Нет контактов</p>
          )}
        </div>
      )}
    </div>
  )
}
