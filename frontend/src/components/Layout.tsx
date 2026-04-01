import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { LayoutDashboard, Users, Calendar, Settings, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

function HealthIndicator() {
  const [status, setStatus] = useState<'ok' | 'fail' | 'loading'>('loading')
  
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await api.get('/health')
        setStatus(res.data.resilient_mode ? 'fail' : 'ok')
      } catch {
        setStatus('fail')
      }
    }
    checkHealth()
  }, [])

  return (
    <div className={`w-2 h-2 rounded-full ${
      status === 'ok' ? 'bg-green-500' : status === 'fail' ? 'bg-red-500 animate-pulse' : 'bg-slate-300'
    }`} title={status === 'fail' ? 'БД не подключена (Демо-режим)' : 'БД подключена'} />
  )
}

const nav = [
  { to: '/', label: 'Дашборд', icon: LayoutDashboard },
  { to: '/contacts', label: 'Контакты', icon: Users },
  { to: '/calendar', label: 'Календарь', icon: Calendar },
  { to: '/settings', label: 'Настройки', icon: Settings },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      <aside className={`bg-white border-b md:border-b-0 md:border-r border-slate-200 shrink-0 transition-all duration-300 ${isSidebarOpen ? 'w-full md:w-56' : 'w-full md:w-[72px]'}`}>
        <div className={`p-4 border-b border-slate-100 flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'} min-h-[65px]`}>
          {isSidebarOpen ? (
            <div className="flex items-center justify-between w-full">
              <h1 className="font-semibold text-lg text-slate-800 tracking-tight flex items-center gap-2">
                Event CRM
              </h1>
              <div className="flex items-center gap-3">
                <HealthIndicator />
                <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md" title="Свернуть меню">
                  <PanelLeftClose size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <button onClick={() => setIsSidebarOpen(true)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md" title="Развернуть меню">
                <PanelLeftOpen size={20} />
              </button>
              <HealthIndicator />
            </div>
          )}
        </div>
        <nav className="p-2 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible items-center md:items-stretch">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center ${isSidebarOpen ? 'justify-start px-3' : 'justify-center px-0 w-10'} py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-100 text-primary-600'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
              title={!isSidebarOpen ? label : undefined}
            >
              <Icon size={20} className={isSidebarOpen ? 'mr-3 shrink-0' : 'shrink-0'} />
              {isSidebarOpen && <span className="truncate">{label}</span>}
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
