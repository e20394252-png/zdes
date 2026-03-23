import { NavLink } from 'react-router-dom'

const nav = [
  { to: '/', label: 'Дашборд' },
  { to: '/deals', label: 'Сделки' },
  { to: '/contacts', label: 'Контакты' },
  { to: '/tasks', label: 'Задачи' },
  { to: '/halls', label: 'Залы' },
  { to: '/calendar', label: 'Календарь' },
  { to: '/settings', label: 'Настройки' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      <aside className="w-full md:w-56 bg-white border-b md:border-b-0 md:border-r border-slate-200 shrink-0">
        <div className="p-4 border-b border-slate-100">
          <h1 className="font-semibold text-lg text-slate-800">Event CRM</h1>
        </div>
        <nav className="p-2 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
          {nav.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-100 text-primary-600'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}
