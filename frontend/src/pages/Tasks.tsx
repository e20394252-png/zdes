import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { tasks as tasksApi } from '../api/client'

type Task = {
  id: number
  title: string
  description: string | null
  is_done: boolean
  reminder_at: string | null
  reminder_sent: boolean
  deal_id: number | null
  created_at: string
}

export default function Tasks() {
  const [list, setList] = useState<Task[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('active')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '',
    reminder_at: '',
  })

  function load() {
    const params: { is_done?: boolean } = {}
    if (filter === 'active') params.is_done = false
    if (filter === 'done') params.is_done = true
    tasksApi.list(params).then((r) => setList(r.data))
  }

  useEffect(() => {
    load()
  }, [filter])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await tasksApi.create({
      title: form.title,
      reminder_at: form.reminder_at || null,
    })
    setForm({ title: '', reminder_at: '' })
    setShowForm(false)
    load()
  }

  async function toggleDone(task: Task) {
    await tasksApi.update(task.id, { is_done: !task.is_done })
    load()
  }

  async function handleDelete(id: number) {
    await tasksApi.delete(id)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-800">Задачи</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              filter === 'active' ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Активные
          </button>
          <button
            onClick={() => setFilter('done')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              filter === 'done' ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Выполненные
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              filter === 'all' ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Все
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-500"
          >
            + Задача
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Название задачи"
              className="px-3 py-2 border border-slate-300 rounded-lg"
              required
            />
            <input
              type="datetime-local"
              value={form.reminder_at}
              onChange={(e) => setForm((f) => ({ ...f, reminder_at: e.target.value }))}
              placeholder="Напоминание (придёт в Telegram)"
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Укажите дату и время напоминания — уведомление придёт в Telegram, если у вас настроен telegram_user_id в профиле.
          </p>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500">
              Создать
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-300 rounded-lg">
              Отмена
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {list.length === 0 ? (
          <p className="p-6 text-center text-slate-500">Нет задач</p>
        ) : (
          list.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-4 p-4 hover:bg-slate-50/50"
            >
              <input
                type="checkbox"
                checked={task.is_done}
                onChange={() => toggleDone(task)}
                className="rounded border-slate-300"
              />
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${task.is_done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                  {task.title}
                </p>
                {task.reminder_at && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Напоминание: {format(new Date(task.reminder_at), 'dd.MM.yyyy HH:mm')}
                    {task.reminder_sent && ' • отправлено'}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleDelete(task.id)}
                className="text-slate-400 hover:text-red-600 text-sm"
              >
                Удалить
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
