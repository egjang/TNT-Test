import React, { useEffect, useMemo, useState } from 'react'

type Row = { salesRepName: string; customerCount: number; managedCount?: number }

export function DemandOwnerStatsPanel({ limit = 50 }: { limit?: number }) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/v1/demand/owner-stats?limit=${limit}`)
      if (!res.ok) {
        let msg = `HTTP ${res.status}`
        try { const d = await res.json(); if (d?.error) msg = d.error } catch {}
        throw new Error(msg)
      }
      const data = await res.json()
      const list: Row[] = Array.isArray(data) ? data.map((r:any)=>({
        salesRepName: String(r.salesRepName ?? '(미지정)'),
        customerCount: Number(r.customerCount ?? 0),
        managedCount: Number(r.managedCount ?? 0),
      })) : []
      setRows(list)
    } catch (e:any) {
      setError(e.message || '로드 중 오류가 발생했습니다')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const cards = useMemo(() => {
    if (loading) return <div className="muted">불러오는 중…</div>
    if (error) return <div className="error">{error}</div>
    if (rows.length === 0) return <div className="empty-state">데이터가 없습니다</div>
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
        {rows.map((r, i) => (
          <div key={i} className="card" style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{r.salesRepName}</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {r.customerCount.toLocaleString()}
              <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>
                (담당거래처 {Number(r.managedCount ?? 0).toLocaleString()})
              </span>
            </div>
          </div>
        ))}
      </div>
    )
  }, [rows, loading, error])

  return (
    <section className="card" style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <b>수요등록 현황</b>
      </div>
      <div style={{ marginTop: 8 }}>
        {cards}
      </div>
    </section>
  )
}
