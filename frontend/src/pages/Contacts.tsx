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

  useEffect(() => {
    contactsApi.list({ search: search || undefined, limit: 200 }).then((r) => {
      setList(r.data)
      setLoading(false)
    })
  }, [search])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-800">Контакты</h1>
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="search"
          placeholder="Поиск по имени, компании, email, телефону..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
        />
      </div>
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
