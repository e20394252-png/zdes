import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deals, settings } from '../api/client'

type Stage = { id: number; name: string; order: number; is_won: boolean; is_lost: boolean }
type Deal = {
  id: number
  title: string
  stage_id: number
  contact?: { name: string }
  rental_price: number
  deposit_paid: boolean
}

function DealTile({ deal, onOpen }: { deal: Deal; onOpen: () => void }) {
  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('dealId', String(deal.id))
    e.dataTransfer.effectAllowed = 'move'
  }
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onOpen}
      className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-primary-500 transition-colors"
    >
      <p className="font-medium text-slate-800 truncate">{deal.title}</p>
      {deal.contact && (
        <p className="text-xs text-slate-500 mt-0.5">{deal.contact.name}</p>
      )}
      <p className="text-xs text-slate-600 mt-1">
        {Number(deal.rental_price).toLocaleString('ru-RU')} ₽
        {deal.deposit_paid && ' • Задаток внесён'}
      </p>
    </div>
  )
}

function StageColumn({
  stage,
  stageDeals,
  onOpenDeal,
  onDrop,
}: {
  stage: Stage
  stageDeals: Deal[]
  onOpenDeal: (id: number) => void
  onDrop: (dealId: number, stageId: number) => void
}) {
  const [over, setOver] = useState(false)
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOver(true)
  }
  function handleDragLeave() {
    setOver(false)
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setOver(false)
    const dealId = parseInt(e.dataTransfer.getData('dealId'), 10)
    if (dealId && stage.id) onDrop(dealId, stage.id)
  }
  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`bg-slate-100/80 rounded-xl border-2 min-w-[260px] max-w-[280px] flex flex-col max-h-[calc(100vh-12rem)] transition-colors ${
        over ? 'border-primary-500 bg-primary-50/50' : 'border-slate-200'
      }`}
    >
      <div className="p-3 border-b border-slate-200">
        <h3 className="font-medium text-slate-800">{stage.name}</h3>
        <p className="text-xs text-slate-500">{stageDeals.length} сделок</p>
      </div>
      <div className="p-2 flex-1 overflow-y-auto space-y-2">
        {stageDeals.map((d) => (
          <DealTile key={d.id} deal={d} onOpen={() => onOpenDeal(d.id)} />
        ))}
      </div>
    </div>
  )
}

export default function Deals() {
  const [funnels, setFunnels] = useState<{ id: number; name: string; stages: Stage[] }[]>([])
  const [funnelId, setFunnelId] = useState<number | null>(null)
  const [dealsList, setDealsList] = useState<Deal[]>([])
  const navigate = useNavigate()

  const currentFunnel = funnels.find((f) => f.id === funnelId) || funnels[0]
  const stages = currentFunnel?.stages || []

  useEffect(() => {
    settings.funnels().then((r) => {
      setFunnels(r.data)
      if (r.data.length && !funnelId) setFunnelId(r.data[0].id)
    })
  }, [])

  useEffect(() => {
    if (funnelId) deals.list({ funnel_id: funnelId }).then((r) => setDealsList(r.data))
  }, [funnelId])

  async function handleDrop(dealId: number, stageId: number) {
    const deal = dealsList.find((d) => d.id === dealId)
    if (!deal || deal.stage_id === stageId) return
    try {
      await deals.moveStage(dealId, stageId)
      setDealsList((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, stage_id: stageId } : d))
      )
    } catch (_) {}
  }

  const dealsByStage = (stageId: number) =>
    dealsList.filter((d) => d.stage_id === stageId)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-semibold text-slate-800">Сделки</h1>
        {funnels.length > 1 && (
          <select
            value={funnelId ?? ''}
            onChange={(e) => setFunnelId(Number(e.target.value))}
            className="rounded-lg border border-slate-300 text-sm py-2 px-3"
          >
            {funnels.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={() => navigate('/deals/new')}
          className="ml-auto px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-500"
        >
          + Новое бронирование
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <StageColumn
            key={stage.id}
            stage={stage}
            stageDeals={dealsByStage(stage.id)}
            onOpenDeal={(id) => navigate(`/deals/${id}`)}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  )
}
