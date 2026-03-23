import { useEffect, useState } from 'react'
import { dashboard } from '../api/client'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

export default function Dashboard() {
  const [stats, setStats] = useState<{
    deals_total: number
    deals_won: number
    deals_lost: number
    conversion_percent: number
    revenue_total: number
    funnel_stages: { stage_id: number; stage_name: string; count: number }[]
    by_managers: { user_id: number; full_name: string; deals_count: number; won_count: number; total_amount: number }[]
  } | null>(null)
  const [days, setDays] = useState(30)

  useEffect(() => {
    dashboard.stats(days).then((r) => setStats(r.data))
  }, [days])

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-slate-500">Загрузка...</div>
      </div>
    )
  }

  const pieData = [
    { name: 'Успешные', value: stats.deals_won, color: '#10b981' },
    { name: 'Отказы', value: stats.deals_lost, color: '#ef4444' },
    { name: 'В работе', value: stats.deals_total - stats.deals_won - stats.deals_lost, color: '#3b82f6' },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-800">Дашборд</h1>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-lg border border-slate-300 text-sm py-2 px-3"
        >
          <option value={7}>За 7 дней</option>
          <option value={30}>За 30 дней</option>
          <option value={90}>За 90 дней</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500">Всего сделок</p>
          <p className="text-2xl font-semibold text-slate-800">{stats.deals_total}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500">Успешные</p>
          <p className="text-2xl font-semibold text-emerald-600">{stats.deals_won}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500">Конверсия</p>
          <p className="text-2xl font-semibold text-slate-800">{stats.conversion_percent}%</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500">Выручка</p>
          <p className="text-2xl font-semibold text-slate-800">
            {Number(stats.revenue_total).toLocaleString('ru-RU')} ₽
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-lg font-medium text-slate-800 mb-4">Воронка продаж</h2>
          {stats.funnel_stages.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.funnel_stages} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="stage_name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-sm">Нет данных за период</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-lg font-medium text-slate-800 mb-4">Сделки по статусу</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={pieData[i].color} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-sm">Нет данных за период</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-lg font-medium text-slate-800 mb-4">По менеджерам</h2>
        {stats.by_managers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="text-left py-2">Менеджер</th>
                  <th className="text-right py-2">Сделок</th>
                  <th className="text-right py-2">Успешных</th>
                  <th className="text-right py-2">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {stats.by_managers.map((m) => (
                  <tr key={m.user_id} className="border-b border-slate-100">
                    <td className="py-2 font-medium text-slate-800">{m.full_name}</td>
                    <td className="text-right py-2">{m.deals_count}</td>
                    <td className="text-right py-2 text-emerald-600">{m.won_count}</td>
                    <td className="text-right py-2">{Number(m.total_amount).toLocaleString('ru-RU')} ₽</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 text-sm">Нет данных за период</p>
        )}
      </div>
    </div>
  )
}
