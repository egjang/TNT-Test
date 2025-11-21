import React, { useMemo, useState } from 'react'

type Props = { style?: React.CSSProperties }

type AskResponse = any

export function MyCustomerAnalysisPanel({ style }: Props) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AskResponse | null>(null)

  const logged = useMemo(() => {
    try {
      return {
        id: localStorage.getItem('tnt.sales.empId') || '',
        seq: localStorage.getItem('tnt.sales.empSeq') || ''
      }
    } catch {
      return { id: '', seq: '' }
    }
  }, [])

  async function ask() {
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const payload: any = { question: question.trim(), mineOnly: true }
      if (logged.id) payload.empId = logged.id
      if (logged.seq) payload.empSeq = Number(logged.seq)
      const res = await fetch('/api/v1/analysis/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        let msg = `HTTP ${res.status}`
        try { const j = await res.json(); if (j?.error) msg = j.error } catch { const t = await res.text(); if (t) msg = t }
        throw new Error(msg)
      }
      const j = await res.json()
      setData(j)
    } catch (e: any) {
      setError(e?.message || '요청 처리 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  function renderResult(val: any): React.ReactNode {
    if (val == null) return null
    // If it is an array of row objects, render a table
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && val[0] != null) {
      const cols = Array.from(
        val.reduce((s: Set<string>, row: any) => {
          Object.keys(row || {}).forEach((k) => s.add(k));
          return s
        }, new Set<string>())
      )
      return (
        <div className="table-container" style={{ maxHeight: 360, overflow: 'auto' }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                {cols.map((c) => (
                  <th key={c} style={{ textAlign: 'left' }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {val.slice(0, 200).map((r: any, idx: number) => (
                <tr key={idx}>
                  {cols.map((c) => (
                    <td key={c}>{fmt(r?.[c])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
    // If has text field from proxy fallback
    if (typeof val === 'object' && val && 'text' in val) {
      return <pre className="muted" style={{ whiteSpace: 'pre-wrap' }}>{String(val.text || '')}</pre>
    }
    // Otherwise, generic JSON
    return <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(val, null, 2)}</pre>
  }

  return (
    <div style={{ padding: 8, ...style }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>내 거래처 분석 (AI)</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') ask() }}
          placeholder="예) 지난달 내 거래처 중 매출 상위 10개 알려줘"
          style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)' }}
        />
        <button className="btn" disabled={loading || !question.trim()} onClick={ask}>{loading ? '분석 중…' : '분석'}</button>
      </div>
      {error && <div className="error" style={{ marginBottom: 8 }}>{error}</div>}
      {data && (
        <div>
          {renderResult(data)}
        </div>
      )}
    </div>
  )
}

function fmt(v: any): string {
  if (v == null) return ''
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  if (v instanceof Date) return v.toISOString()
  return String(v)
}

