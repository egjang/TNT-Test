import React, { useEffect, useMemo, useState } from 'react'

type Row = { itemSeq?: number; itemName?: string; recentInvoiceDate?: string; curAmt?: number; qty?: number }

const TAB_KEYS = ['매출','가격','재고','경쟁사','Complaint','품질관리','공급사'] as const
type TabKey = typeof TAB_KEYS[number]

export function Item360() {
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string| null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('매출')
  const nf = new Intl.NumberFormat('ko-KR')

  async function load() {
    setLoading(true); setError(null)
    try {
      const url = new URL('/api/v1/items/search', window.location.origin)
      url.searchParams.set('q', q || '')
      url.searchParams.set('limit', '100')
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const rows: Row[] = Array.isArray(data) ? data.map((r:any)=>({
        itemSeq: Number(r.itemSeq ?? r.item_seq ?? 0),
        itemName: String(r.itemName ?? r.item_name ?? ''),
        recentInvoiceDate: String(r.recentInvoiceDate ?? r.recent_invoice_date ?? ''),
        curAmt: Number(r.curAmt ?? r.cur_amt ?? 0),
        qty: Number(r.qty ?? 0),
      })) : []
      setItems(rows)
    } catch (e:any) {
      setError(e?.message || '조회 오류'); setItems([])
    } finally { setLoading(false) }
  }

  useEffect(()=>{ load() }, [])

  return (
    <section>
      <div className="page-title" style={{ alignItems:'center' }}>
        <h2 style={{ margin:0, fontSize:18 }}>Item360</h2>
        <div className="controls" style={{ gap:8 }}>
          <input className="search-input" value={q} onChange={(e)=> setQ(e.target.value)} placeholder="품목명 검색" onKeyDown={(e)=> { if (e.key==='Enter') load() }} />
          <button className="btn btn-card btn-3d" onClick={load} disabled={loading}>검색</button>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="table-container" style={{ height: 300 }}>
        {loading ? (
          <div className="empty-state">불러오는 중…</div>
        ) : items.length === 0 ? (
          <div className="empty-state">데이터가 없습니다</div>
        ) : (
          <table className="table" style={{ width:'100%' }}>
            <thead>
              <tr>
                <th style={{ width: 120 }}>품목코드</th>
                <th style={{ textAlign:'left' }}>품목명</th>
                <th style={{ width: 140 }}>최근 매출일</th>
                <th style={{ width: 140, textAlign:'right' }}>매출금액</th>
                <th style={{ width: 120, textAlign:'right' }}>수량</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r, idx) => (
                <tr key={idx}>
                  <td>{r.itemSeq || ''}</td>
                  <td style={{ textAlign:'left' }}>{r.itemName || ''}</td>
                  <td>{r.recentInvoiceDate || ''}</td>
                  <td style={{ textAlign:'right' }}>{nf.format(Math.round(Number(r.curAmt||0)))} 원</td>
                  <td style={{ textAlign:'right' }}>{nf.format(Math.round(Number(r.qty||0)))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Tabs skeleton */}
      <div style={{ marginTop: 12 }}>
        <div style={{ display:'flex', gap:6, borderBottom:'1px solid var(--border)' }}>
          {TAB_KEYS.map(k => (
            <button key={k} className="btn btn-card" style={{ borderBottom: activeTab===k ? '2px solid var(--accent)' : '2px solid transparent' }} onClick={()=> setActiveTab(k)}>{k}</button>
          ))}
        </div>
        <div style={{ padding: 12 }}>
          <div className="empty-state">{activeTab} 탭은 준비중입니다.</div>
        </div>
      </div>
    </section>
  )
}
