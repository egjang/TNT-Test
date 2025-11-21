import React, { useMemo, useState } from 'react'

type Row = {
  customerId: string
  customerName: string
}

const options: { label: string; value: string }[] = [
  { label: '1개월', value: '1' },
  { label: '2개월', value: '2' },
  { label: '3개월', value: '3' },
  { label: '4개월', value: '4' },
  { label: '5개월', value: '5' },
  { label: '6개월', value: '6' },
  { label: '6개월 이상', value: '6_plus' },
]

export function MissingTransactionsPanel() {
  const [months, setMonths] = useState<string>('3')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])

  async function runSearch() {
    setError(null)
    setLoading(true)
    try {
      // 조회 방법/엔드포인트는 추후 지정 예정
      // 예: GET /api/v1/customers/missing-transactions?months=3&empId=...&mineOnly=true
      // 현재는 빈 결과로 표시
      setRows([])
    } catch (e: any) {
      setError(e.message || '조회 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const body = useMemo(() => {
    if (loading) return <div className="muted">불러오는 중…</div>
    if (error) return <div className="error">{error}</div>
    if (rows.length === 0) return <div className="empty-state">조회 결과가 없습니다.</div>
    return (
      <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
        <table className="table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: 140 }}>거래처번호</th>
              <th style={{ width: 220 }}>거래처명</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={`${r.customerId}-${idx}`}>
                <td>{r.customerId}</td>
                <td>{r.customerName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }, [loading, error, rows])

  return (
    <div style={{ padding: 8, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="pane-header" style={{ margin: 0 }}>거래미발생 · 내 거래처</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="search-input" value={months} onChange={(e) => setMonths(e.target.value)}>
            {options.map((op) => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
          <button className="btn" onClick={runSearch} disabled={loading}>{loading ? '조회 중…' : '조회'}</button>
        </div>
      </div>
      {body}
      <div className="muted" style={{ marginTop: 8 }}>조회 방법은 추후 연결 예정입니다.</div>
    </div>
  )
}
