import { useEffect, useState } from 'react'
import { settings, telethon } from '../api/client'

type Funnel = { id: number; name: string; is_default: boolean; stages: { id: number; name: string; order: number }[] }
type Hall = { id: number; name: string; default_price: number; is_active: boolean }
type TelethonConfig = {
  is_authorized: boolean
  chat_id?: string
  chat_title?: string
  keywords?: string
  use_ai_context?: boolean
  ai_prompt?: string
  funnel_id?: number
}

export default function Settings() {
  const [funnels, setFunnels] = useState<Funnel[]>([])
  const [halls, setHalls] = useState<Hall[]>([])
  const [managers, setManagers] = useState<{ id: number; full_name: string; email: string }[]>([])
  const [telethonCfg, setTelethonCfg] = useState<TelethonConfig | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [tab, setTab] = useState<'funnels' | 'halls' | 'managers' | 'telethon'>('funnels')
  const [telethonForm, setTelethonForm] = useState({
    chat_id: '',
    keywords: '',
    use_ai_context: false,
    ai_prompt: '',
  })

  useEffect(() => {
    settings.funnels().then((r) => setFunnels(r.data))
    settings.halls().then((r) => setHalls(r.data))
    settings.managers().then((r) => setManagers(r.data))
    settings.telethon().then((r) => {
      setTelethonCfg(r.data)
      setTelethonForm({
        chat_id: r.data.chat_id || '',
        keywords: r.data.keywords || '',
        use_ai_context: r.data.use_ai_context || false,
        ai_prompt: r.data.ai_prompt || '',
      })
    })
  }, [])

  async function handleTelethonQr() {
    try {
      const { data } = await telethon.qr()
      setQrUrl(data.url)
      // User scans QR in Telegram, then clicks "Authorized" to confirm
    } catch (e) {
      console.error(e)
    }
  }

  async function handleTelethonAuthorize() {
    await telethon.authorize()
    setQrUrl(null)
    const r = await settings.telethon()
    setTelethonCfg(r.data)
  }

  async function handleTelethonSave() {
    await settings.updateTelethon({
      chat_id: telethonForm.chat_id || null,
      keywords: telethonForm.keywords || null,
      use_ai_context: telethonForm.use_ai_context,
      ai_prompt: telethonForm.ai_prompt || null,
    })
    const r = await settings.telethon()
    setTelethonCfg(r.data)
  }

  const tabs = [
    { id: 'funnels' as const, label: 'Воронки' },
    { id: 'halls' as const, label: 'Залы и цены' },
    { id: 'managers' as const, label: 'Менеджеры' },
    { id: 'telethon' as const, label: 'Telegram (Telethon)' },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-800">Настройки</h1>
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'funnels' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-800 mb-4">Воронки продаж</h2>
          <ul className="space-y-3">
            {funnels.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="font-medium text-slate-800">{f.name}</p>
                  <p className="text-xs text-slate-500">
                    Этапы: {f.stages?.map((s) => s.name).join(' → ')}
                  </p>
                </div>
                {f.is_default && (
                  <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">По умолчанию</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'halls' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-800 mb-4">Залы</h2>
          <ul className="space-y-3">
            {halls.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <span className="font-medium text-slate-800">{h.name}</span>
                <span className="text-slate-600">{Number(h.default_price).toLocaleString('ru-RU')} ₽</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'managers' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-800 mb-4">Менеджеры</h2>
          <ul className="space-y-2">
            {managers.map((m) => (
              <li key={m.id} className="text-slate-700">
                {m.full_name} <span className="text-slate-500">({m.email})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'telethon' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-medium text-slate-800">Сбор заявок из Telegram (Telethon)</h2>
          <p className="text-sm text-slate-600">
            Авторизация через QR-код. После входа укажите чат для мониторинга и ключевые слова или AI-контекст — по подходящим сообщениям будет создаваться сделка на первом этапе воронки.
          </p>
          <div className="flex flex-wrap gap-4 items-center">
            {telethonCfg?.is_authorized ? (
              <span className="text-emerald-600 font-medium">✓ Авторизован</span>
            ) : qrUrl ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Отсканируйте QR в Telegram, затем нажмите «Подтвердить»</p>
                <a
                  href={qrUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 underline"
                >
                  Открыть ссылку для входа
                </a>
                <button
                  onClick={handleTelethonAuthorize}
                  className="ml-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500"
                >
                  Подтвердить вход
                </button>
              </div>
            ) : (
              <button
                onClick={handleTelethonQr}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500"
              >
                Войти по QR-коду
              </button>
            )}
            {telethonCfg?.is_authorized && (
              <button
                onClick={async () => {
                  await telethon.logout()
                  setTelethonCfg((c) => (c ? { ...c, is_authorized: false } : null))
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Выйти
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ID или username чата</label>
              <input
                value={telethonForm.chat_id}
                onChange={(e) => setTelethonForm((f) => ({ ...f, chat_id: e.target.value }))}
                placeholder="@channel или -100..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ключевые слова (через запятую)</label>
              <input
                value={telethonForm.keywords}
                onChange={(e) => setTelethonForm((f) => ({ ...f, keywords: e.target.value }))}
                placeholder="аренда, зал, мероприятие"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={telethonForm.use_ai_context}
                  onChange={(e) => setTelethonForm((f) => ({ ...f, use_ai_context: e.target.checked }))}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Использовать AI для определения контекста заявки</span>
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Промпт для AI (когда включён контекст)</label>
              <textarea
                value={telethonForm.ai_prompt}
                onChange={(e) => setTelethonForm((f) => ({ ...f, ai_prompt: e.target.value }))}
                rows={2}
                placeholder="Сообщение считается заявкой на аренду зала, если в нём есть намерение провести мероприятие или арендовать помещение."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <button
                onClick={handleTelethonSave}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500"
              >
                Сохранить настройки
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
