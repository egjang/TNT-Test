import React, { useEffect, useMemo, useState } from 'react'

type Row = { invoiceNo: string; invoiceDate: string; minorName: string; itemName: string; curAmt: number; qty?: number; companyType?: string; itemSeq?: number; itemStdUnit?: string }

export function CustomerTransactions({ customerSeq }: { customerSeq?: number }) {
  const [items, setItems] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<{ name: string; qty: number; amt: number }[]>([])

  async function load() {
    setError(null)
    setLoading(true)
    try {
      const seq = (customerSeq != null) ? customerSeq : (() => {
        try { const raw = localStorage.getItem('tnt.sales.selectedCustomer'); if (raw) { const obj = JSON.parse(raw); return Number(obj?.customerSeq) } } catch {}
        return undefined
      })()
      if (!seq || Number.isNaN(seq)) { setItems([]); setSummary([]); setLoading(false); return }
      const url = new URL(`/api/v1/customers/${seq}/transactions`, window.location.origin)
      const res = await fetch(url.toString())
      if (!res.ok) {
        let msg = `HTTP ${res.status}`
        try { const d = await res.json(); if (d?.error) msg = d.error } catch {}
        throw new Error(msg)
      }
      const data = await res.json()
      const list: Row[] = Array.isArray(data) ? data : []
      setItems(list)

      // Provisional summary from detail rows for immediate chart rendering
      let provisional: { name: string; qty: number; amt: number }[] = []
      if (list.length > 0) {
        const map = new Map<string, { qty: number; amt: number }>()
        list.forEach(r => {
          const key = (r.minorName || 'na') as string
          const prev = map.get(key) || { qty: 0, amt: 0 }
          prev.qty += Number((r as any).qty ?? r.qty ?? 0) || 0
          prev.amt += Number(r.curAmt || 0) || 0
          map.set(key, prev)
        })
        provisional = Array.from(map.entries()).map(([name, v]) => ({ name, qty: v.qty, amt: v.amt }))
        provisional.sort((a, b) => (b.qty - a.qty) || (b.amt - a.amt))
        setSummary(provisional)
      } else {
        setSummary([])
      }

      // Then try summary (DB-aggregated) to replace provisional when available
      const sumRes = await fetch(`/api/v1/customers/${seq}/transactions/summary`)
      let arr: { name: string; qty: number; amt: number }[] = []
      if (sumRes.ok) {
        try {
          const s = await sumRes.json()
          arr = (Array.isArray(s) ? s : []).map((r: any) => ({ name: r.minorName || 'na', qty: Number(r.qty || 0), amt: Number(r.amt || 0) }))
        } catch { arr = [] }
      }
      // If summary provided, replace provisional
      // sort by qty desc, then amt desc
      arr.sort((a, b) => (b.qty - a.qty) || (b.amt - a.amt))
      if (arr.length > 0) setSummary(arr)
    } catch (e: any) {
      setError(e.message || '조회 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [customerSeq])

  const byMinorQty = useMemo(() => {
    const arr = [...summary]
    arr.sort((a, b) => (b.qty - a.qty) || (b.amt - a.amt))
    return arr
  }, [summary])

  const byMinorAmt = useMemo(() => {
    const arr = [...summary]
    arr.sort((a, b) => (b.amt - a.amt) || (b.qty - a.qty))
    return arr
  }, [summary])

  function BarChart({ data, type }: { data: { name: string; value: number }[]; type: 'amt' | 'qty' }) {
    const height = 180
    const padding = { top: 10, right: 10, bottom: 60, left: 10 }
    const width = Math.max(360, data.length * 80)
    const innerW = width - padding.left - padding.right
    const innerH = height - padding.top - padding.bottom
    const max = Math.max(1, ...data.map(d => d.value))
    const band = innerW / Math.max(1, data.length)
    return (
      <div style={{ overflowX: 'auto' }}>
        <svg width={width} height={height}>
          <g transform={`translate(${padding.left},${padding.top})`}>
            {data.map((d, i) => {
              const x = i * band + band * 0.15
              const w = band * 0.7
              const h = Math.max(0, (d.value / max) * innerH)
              const y = innerH - h
              return (
                <g key={i} transform={`translate(${x},0)`}>
                  <rect x={0} y={y} width={w} height={h} fill={type === 'amt' ? '#4e79a7' : '#f28e2b'} />
                  <text x={w / 2} y={innerH + 14} fontSize={11} textAnchor="middle" fill="var(--muted)" transform={`rotate(25 ${w/2},${innerH + 14})`}>
                    {d.name}
                  </text>
                  <text x={w / 2} y={y - 4} fontSize={11} textAnchor="middle" fill="var(--text)">
                    {type === 'amt' ? d.value.toLocaleString() : d.value.toLocaleString()}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
      </div>
    )
  }

  const table = useMemo(() => (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
        <div className="muted count-text">총 {items.length}건</div>
      </div>
      {items.length > 0 && (
        <div className="card" style={{ padding: 12, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <b>중분류별 금액/수량</b>
            <span className="muted" style={{ fontSize: 12 }}>가로축: 중분류</span>
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ marginBottom: 12 }}>
              <div className="muted" style={{ marginBottom: 4 }}>금액</div>
              <BarChart type="amt" data={byMinorAmt.map(d => ({ name: d.name, value: d.amt }))} />
            </div>
            <div>
              <div className="muted" style={{ marginBottom: 4 }}>수량</div>
              <BarChart type="qty" data={byMinorQty.map(d => ({ name: d.name, value: d.qty }))} />
            </div>
          </div>
        </div>
      )}
      <div className="table-container">
      {items.length === 0 ? (
        <div className="empty-state">거래 내역이 없습니다.</div>
      ) : (
        <table className="table transactions">
          <thead>
            <tr>
              <th style={{ width: 160 }}>전표번호</th>
              <th style={{ width: 160 }}>중분류</th>
              <th>품목명</th>
              <th style={{ width: 100, textAlign: 'right' }}>수량</th>
              <th style={{ width: 160, textAlign: 'right' }}>금액</th>
              <th style={{ width: 140 }}>전표일자</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              let lastInv = ''
              let lastDateInInv = ''
              let lastMinorInInv = ''
              const elements: JSX.Element[] = []

              items.forEach((it, i) => {
                const isNewInvoice = it.invoiceNo !== lastInv
                let showInv = ''
                let showDate = ''
                let showMinor = ''
                let rowClass: string | undefined

                if (isNewInvoice) {
                  // Insert an explicit separator row BEFORE the new invoice (not for the very first row)
                  if (i > 0) {
                    elements.push(
                      <tr key={`sep-${i}`} className="sep-row"><td colSpan={6}></td></tr>
                    )
                  }
                  // Show representative values for the first row of the invoice
                  showInv = it.invoiceNo
                  showDate = it.invoiceDate
                  showMinor = it.minorName || 'na'
                  rowClass = undefined
                  lastInv = it.invoiceNo
                  lastDateInInv = it.invoiceDate
                  lastMinorInInv = it.minorName
                } else {
                  // Within same invoice, only show if changed
                  if (it.invoiceDate !== lastDateInInv) {
                    showDate = it.invoiceDate
                    lastDateInInv = it.invoiceDate
                  }
                  if (it.minorName !== lastMinorInInv) {
                    showMinor = it.minorName || 'na'
                    lastMinorInInv = it.minorName
                  }
                  rowClass = 'same-invoice'
                }

                elements.push(
                  <tr key={`row-${i}`} className={rowClass}>
                    <td className="col-invno">{showInv}</td>
                    <td>{showMinor}</td>
                    <td>{it.itemName}</td>
                    <td style={{ textAlign: 'right' }}>{Number((it as any).qty ?? it.qty ?? 0).toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>{Number(it.curAmt || 0).toLocaleString()}</td>
                    <td className="col-invdate">{showDate ? (()=>{ const d = new Date(showDate as any); if(isNaN(d.getTime())) return showDate as any; const yy=String(d.getFullYear()%100).padStart(2,'0'); const mm=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); const hh=String(d.getHours()).padStart(2,'0'); const mi=String(d.getMinutes()).padStart(2,'0'); return `${yy}-${mm}-${dd} ${hh}:${mi}` })() : ''}</td>
                  </tr>
                )
              })

              return elements
            })()}
          </tbody>
        </table>
      )}
    </div>
    </>
  ), [items])

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        {error && <span className="error">{error}</span>}
      </div>
      {table}
    </div>
  )
}
