import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Deals from './pages/Deals'
import DealCard from './pages/DealCard'
import Contacts from './pages/Contacts'
import Tasks from './pages/Tasks'
import Halls from './pages/Halls'
import HallCalendar from './pages/HallCalendar'
import Calendar from './pages/Calendar'
import Settings from './pages/Settings'

import ErrorBoundary from './components/ErrorBoundary'

function Protected() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/" element={<Protected />}>
        <Route index element={<Dashboard />} />
        <Route path="deals" element={<Deals />} />
        <Route path="deals/:id" element={<DealCard />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="halls" element={<Halls />} />
        <Route path="halls/:id/calendar" element={<HallCalendar />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ErrorBoundary>
  )
}
