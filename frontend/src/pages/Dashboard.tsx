import WeeklyOccupancy from '../components/WeeklyOccupancy'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-800">Дашборд</h1>
      </div>

      <WeeklyOccupancy />
    </div>
  )
}
