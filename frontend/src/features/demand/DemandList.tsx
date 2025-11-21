import React, { useEffect, useMemo, useState } from 'react'

type Row = {
  salesRepName: string
  customerId: string
  customerName: string
  supplierName?: string
  itemSubcategory?: string
  salesMgmtUnit?: string
  shareRate?: number
  createdAt?: string
  updatedAt?: string
}

export function DemandList() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mineOnly, setMineOnly] = useState<boolean>(true)

  async function load() {
    setLoading(true); setError(null)
    try {
      const url = new URL('/api/v1/demand', window.location.origin)
      url.searchParams.set('limit', '500')
      if (mineOnly) {
        const assigneeId = localStorage.getItem('tnt.sales.assigneeId') || ''
        if (assigneeId) url.searchParams.set('assigneeId', assigneeId)
      }
      const res = await fetch(url.toString())
      if (!res.ok) {
        let msg = `HTTP ${res.status}`
        try { const d = await res.json(); if (d?.error) msg = d.error } catch {}
        throw new Error(msg)
      }
      const data = await res.json()
      const list: Row[] = Array.isArray(data) ? data.map((r:any)=>({
        salesRepName: String(r.salesRepName ?? ''),
        customerId: String(r.customerId ?? ''),
        customerName: String(r.customerName ?? ''),
        supplierName: r.supplierName ?? '',
        itemSubcategory: r.itemSubcategory ?? '',
        salesMgmtUnit: r.salesMgmtUnit ?? '',
        shareRate: (r.shareRate != null ? Number(r.shareRate) : undefined),
        createdAt: r.createdAt ?? '',
        updatedAt: r.updatedAt ?? ''
      })) : []
      setRows(list)
    } catch (e:any) {
      setError(e.message || '조회 중 오류가 발생했습니다')
      setRows([])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [mineOnly])

  const body = useMemo(() => {
    if (loading) return <div className="muted">불러오는 중…</div>
    if (error) return <div className="error">{error}</div>
    if (rows.length === 0) return <div className="empty-state">데이터가 없습니다</div>
    return (
      <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
        <table className="table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>영업담당</th>
              <th style={{ width: 140 }}>거래처번호</th>
              <th>거래처명</th>
              <th>공급사</th>
              <th>품목중분류</th>
              <th>영업관리단위</th>
              <th style={{ width: 80, textAlign:'right' }}>점유율</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.salesRepName}</td>
                <td>{r.customerId}</td>
                <td>{r.customerName}</td>
                <td>{r.supplierName}</td>
                <td>{r.itemSubcategory}</td>
                <td>{r.salesMgmtUnit}</td>
                <td style={{ textAlign:'right' }}>{r.shareRate != null ? `${Number(r.shareRate).toFixed(2)}%` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }, [rows, loading, error])

  return (
    <section style={{ padding: 8 }}>
      <div className="page-title" style={{ display: 'flex', alignItems:'center', gap: 8, justifyContent:'space-between' }}>
        <h2>수요조회</h2>
        <label style={{ display:'inline-flex', alignItems:'center', gap: 6, fontSize: 12 }}>
          내거래처
          <input type="checkbox" checked={mineOnly} onChange={(e)=> setMineOnly(e.target.checked)} style={{ marginLeft: 4 }} />
        </label>
      </div>
      {body}
    </section>
  )
}
