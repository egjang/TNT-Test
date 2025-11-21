import React, { useEffect, useMemo, useState } from 'react'

export type EstimateRow = {
  id: number
  estimateNumber?: string
  title?: string
  status?: string
  owner?: string
  issuedAt?: string
}

export function EstimateList({ compact = false, maxHeight }: { compact?: boolean; maxHeight?: string }) {
  const [items, setItems] = useState<EstimateRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<number | null>(() => {
    try { const raw = localStorage.getItem('tnt.sales.selectedEstimate'); if (raw) { const o = JSON.parse(raw); const v = Number(o?.id); return Number.isFinite(v) ? v : null } } catch {}
    return null
  })

  async function load() {
    setError(null)
    setLoading(true)
    try {
      // Try API if available; otherwise provide samples
      const endpoints = ['/api/v1/estimates', '/api/v1/quotes']
      let data: any[] | null = null
      for (const ep of endpoints) {
        try {
          const r = await fetch(ep)
          if (r.ok) { data = await r.json(); break }
        } catch {}
      }
      let list: EstimateRow[] = []
      if (Array.isArray(data)) {
        list = data.map((x: any, i: number) => ({
          id: Number(x?.id ?? i + 1),
          estimateNumber: String(x?.estimateNumber ?? x?.estimate_number ?? ''),
          title: String(x?.title ?? ''),
          status: String(x?.status ?? ''),
          owner: String(x?.owner ?? x?.ownerId ?? x?.owner_id ?? ''),
          issuedAt: String(x?.issuedAt ?? x?.issued_at ?? ''),
        }))
      } else {
        list = [
          { id: 1, estimateNumber: 'E-2025-0001', title: '제품 견적 A', status: 'draft', owner: 'kim', issuedAt: '2025-02-01T10:00:00Z' },
          { id: 2, estimateNumber: 'E-2025-0002', title: '서비스 견적 B', status: 'sent', owner: 'lee', issuedAt: '2025-02-03T11:00:00Z' },
        ]
      }
      list.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ko', { sensitivity: 'base' }))
      setItems(list)
      if (list.length > 0 && activeId == null) select(list[0])
    } catch (e: any) {
      setError(e?.message || '조회 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function select(row: EstimateRow) {
    setActiveId(row.id)
    try {
      localStorage.setItem('tnt.sales.selectedEstimate', JSON.stringify(row))
      window.dispatchEvent(new CustomEvent('tnt.sales.estimate.selected', { detail: { estimate: row } }) as any)
    } catch {}
  }

  const table = useMemo(() => (
    <div className="table-container" style={{ maxHeight: maxHeight ?? (compact ? '32vh' : undefined) }}>
      {items.length === 0 ? (
        <div className="empty-state">{loading ? '불러오는 중…' : (error || '데이터가 없습니다')}</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 140 }}>견적번호</th>
              <th>제목</th>
              <th style={{ width: 120 }}>상태</th>
              <th style={{ width: 140 }}>소유자</th>
              <th style={{ width: 180 }}>발행시각</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx} className={activeId === it.id ? 'selected' : undefined} onClick={() => select(it)}>
                <td>{it.estimateNumber || ''}</td>
                <td>{it.title || ''}</td>
                <td>{it.status || ''}</td>
                <td>{it.owner || ''}</td>
                <td>{it.issuedAt ? (()=>{ const d=new Date(it.issuedAt as any); if(isNaN(d.getTime())) return it.issuedAt as any; const yy=String(d.getFullYear()%100).padStart(2,'0'); const mm=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); const hh=String(d.getHours()).padStart(2,'0'); const mi=String(d.getMinutes()).padStart(2,'0'); return `${yy}-${mm}-${dd} ${hh}:${mi}` })() : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  ), [items, activeId, loading, error, compact, maxHeight])

  return table
}

