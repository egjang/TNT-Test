import React, { useEffect, useMemo, useState } from 'react'
import { tone } from '../../ui/tone'

type Row = {
  companyType: string
  customerName: string
  customerSeq?: number
  hasSalesY1?: boolean
  hasSalesY2?: boolean
  year1?: number
  year2?: number
}

export function DemandTargetsPanel() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [missing, setMissing] = useState<Row[]>([])
  const [q, setQ] = useState('')

  // derive display years from server or fallback to current/prev
  const nowYear = new Date().getFullYear()
  const y1 = missing[0]?.year1 ?? nowYear
  const y2 = missing[0]?.year2 ?? nowYear - 1

  async function load(name?: string) {
    setError(null)
    setLoading(true)
    try {
      const empId = localStorage.getItem('tnt.sales.empId')
      if (!empId) throw new Error('로그인이 필요합니다')
      const url = new URL('/api/v1/customers/missing-demand', window.location.origin)
      url.searchParams.set('mineOnly', 'true')
      url.searchParams.set('empId', empId)
      url.searchParams.set('limit', '500')
      if (name && name.trim()) url.searchParams.set('name', name.trim())
      const res = await fetch(url.toString())
      if (!res.ok) {
        let msg = `HTTP ${res.status}`
        try { const d = await res.json(); if (d?.error) msg = d.error } catch {}
        throw new Error(msg)
      }
      const data = await res.json()
      const miss = (Array.isArray(data) ? data : []) as Row[]
      setMissing(miss)
    } catch (e: any) {
      setError(e.message || '조회 중 오류가 발생했습니다')
      setMissing([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // debounce search
  useEffect(() => {
    const h = setTimeout(() => { load(q) }, 300)
    return () => clearTimeout(h)
  }, [q])

  const body = useMemo(() => {
    if (loading) return <div className="muted">{tone.loading}</div>
    if (error) return <div className="error">{error || tone.errorGeneric}</div>
    if (missing.length === 0) return <div className="empty-state">{tone.empty}</div>
    const Dollar = ({ on }: { on?: boolean }) => (
      <span style={{ fontWeight: 700, color: on ? '#059669' : '#94a3b8', opacity: on ? 1 : 0.35 }}>$</span>
    )
    return (
      <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
        <table className="table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: 140 }}>회사구분</th>
              <th style={{ width: 200 }}>거래처명</th>
              <th style={{ width: 80, textAlign: 'center' }}>{y2}</th>
              <th style={{ width: 80, textAlign: 'center' }}>{y1}</th>
            </tr>
          </thead>
          <tbody>
            {missing.map((r, idx) => (
              <tr key={`${r.customerName}-${idx}`}>
                <td>{r.companyType}</td>
                <td>{r.customerName}</td>
                <td style={{ textAlign: 'center' }}><Dollar on={r.hasSalesY2} /></td>
                <td style={{ textAlign: 'center' }}><Dollar on={r.hasSalesY1} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }, [loading, error, missing])

  return (
    <div style={{ padding: 8, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 400, fontSize: 12, lineHeight: '18px', whiteSpace: 'normal' }}>{tone.title.demandTargets}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="거래처명 검색"
            style={{ fontSize: 12, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6 }}
          />
          <div className="muted" style={{ fontSize: 12 }}>미수립 {missing.length}건</div>
        </div>
      </div>
      {body}
    </div>
  )
}
