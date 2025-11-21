import React, { useEffect, useMemo, useState } from 'react'
import { tone } from '../../ui/tone'

type Row = {
  itemSubcategory: string | null
  supplierName: string | null
  salesMgmtUnit: string | null
  shareRate: number | null
}

type Props = {
  customerName: string
  refreshTick?: number
}

function toPercent(v: number | null): number {
  if (v == null) return 0
  const n = Number(v)
  if (!isFinite(n)) return 0
  return n <= 1 ? n * 100 : n
}

const palette = [
  '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc949',
  '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab', '#1f77b4', '#ff7f0e'
]

function PieChart({ data, size = 140 }: { data: { label: string; value: number }[]; size?: number }) {
  const radius = size / 2
  const cx = radius
  const cy = radius
  const positive = data.filter(d => (d.value || 0) > 0)
  const total = positive.reduce((s, d) => s + Math.max(0, d.value), 0) || 1
  // Special case: a single 100% (or only one positive) renders as a full circle
  if (positive.length === 1) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={radius} fill={palette[0]} stroke="#0b1324" strokeWidth={1} />
      </svg>
    )
  }
  let angle = -Math.PI / 2
  const arcs = positive.map((d, i) => {
    const v = Math.max(0, d.value)
    const portion = v / total
    const theta = portion * Math.PI * 2
    const x1 = cx + radius * Math.cos(angle)
    const y1 = cy + radius * Math.sin(angle)
    const x2 = cx + radius * Math.cos(angle + theta)
    const y2 = cy + radius * Math.sin(angle + theta)
    const largeArc = theta > Math.PI ? 1 : 0
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
    angle += theta
    return { path, color: palette[i % palette.length], label: d.label, value: d.value }
  })
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}> 
      {arcs.map((a, i) => (
        <path key={i} d={a.path} fill={a.color} stroke="#0b1324" strokeWidth={1} />
      ))}
    </svg>
  )
}

export function CustomerDemandCharts({ customerName, refreshTick = 0 }: Props) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const q = new URLSearchParams({ customer: customerName, limit: '1000' })
      const res = await fetch(`/api/v1/demand?${q.toString()}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      const normalized: Row[] = (data || []).map((r: any) => ({
        itemSubcategory: r.itemSubcategory ?? null,
        supplierName: r.supplierName ?? null,
        salesMgmtUnit: r.salesMgmtUnit ?? null,
        shareRate: r.shareRate ?? null,
      }))
      setRows(normalized)
    } catch (e: any) {
      setError(e.message || '로드 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (customerName) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerName, refreshTick])

  const byCategory = useMemo(() => {
    const m = new Map<string, { label: string; value: number }[]>()
    for (const r of rows) {
      const cat = r.itemSubcategory || '-'
      const key = `${r.supplierName || '-'} / ${r.salesMgmtUnit || '-'}`
      const val = toPercent(r.shareRate)
      if (!m.has(cat)) m.set(cat, [])
      const list = m.get(cat)!
      const existing = list.find((x) => x.label === key)
      if (existing) existing.value += val
      else list.push({ label: key, value: val })
    }
    // sort labels by value desc for nicer visuals
    for (const [k, list] of m) {
      list.sort((a, b) => b.value - a.value)
    }
    return m
  }, [rows])

  if (!customerName) return null

  return (
    <section className="card" style={{ marginTop: 12 }}>
      {loading && <div className="muted">{tone.loading}</div>}
      {error && <div className="error">{error || tone.errorGeneric}</div>}
      {!loading && !error && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {Array.from(byCategory.entries()).map(([cat, list]) => (
            <div key={cat} style={{ display: 'flex', gap: 12, alignItems: 'center', border: '1px solid var(--border)', borderRadius: 12, padding: 12, width: 'calc((100% - 16px) / 2)' }}>
              <div style={{ flex: '0 0 auto' }}>
                <PieChart data={list} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{cat}</div>
                <div style={{ fontSize: 12 }}>
                  {list.slice(0, 8).map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: palette[i % palette.length], display: 'inline-block' }} />
                      <span style={{ minWidth: 160 }}>{d.label}</span>
                      <span style={{ color: 'var(--muted)' }}>{d.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}%</span>
                    </div>
                  ))}
                  {list.length > 8 && <div className="muted">외 {list.length - 8}개…</div>}
                </div>
              </div>
            </div>
          ))}
          {byCategory.size === 0 && <div className="empty-state">데이터가 없습니다</div>}
        </div>
      )}
    </section>
  )
}
