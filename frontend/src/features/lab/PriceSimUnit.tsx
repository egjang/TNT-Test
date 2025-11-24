import React, { useEffect, useMemo, useState } from 'react'
import { DollarSign, RefreshCw } from 'lucide-react'

type Row = {
  salesYear: number
  salesUnit: string
  empName: string
  totalQty?: number
  totalAmt?: number
  avgPrice: number | null
}

type PivotRow = { salesUnit: string; yearly: Record<number, number | null> }

const COMPANY_TYPES = ['TNT', 'DYS'] as const

export function PriceSimUnit() {
  const [companyType, setCompanyType] = useState<(typeof COMPANY_TYPES)[number]>('TNT')
  const [fromYear, setFromYear] = useState('2022')
  const [data, setData] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.append('companyType', companyType)
      params.append('fromYear', fromYear || '2022')
      const res = await fetch(`/api/v1/analysis/price-sim?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.json()
      if (body.error) throw new Error(body.error)
      const mapped: Row[] = Array.isArray(body.data)
        ? body.data.map((r: any) => ({
            salesYear: Number(r.salesYear ?? r.salesyear ?? 0),
            salesUnit: String(r.salesUnit ?? r.salesunit ?? '미지정'),
            empName: String(r.empName ?? r.empname ?? '미지정'),
            totalQty: r.totalQty ?? r.totalqty,
            totalAmt: r.totalAmt ?? r.totalamt,
            avgPrice: r.avgPrice ?? r.avgprice ?? null,
          }))
        : []
      setData(mapped)
    } catch (e: any) {
      setError(e?.message || '조회 실패')
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const years = useMemo(() => Array.from(new Set(data.map((r) => r.salesYear))).sort((a, b) => b - a), [data])

  const pivotRows = useMemo<PivotRow[]>(() => {
    const map = new Map<string, { salesUnit: string; yearAmt: Record<number, number>; yearQty: Record<number, number> }>()
    for (const r of data) {
      const unit = r.salesUnit || '미지정'
      const key = unit
      const year = r.salesYear
      if (!map.has(key)) {
        map.set(key, { salesUnit: unit, yearAmt: {}, yearQty: {} })
      }
      const row = map.get(key)!
      row.yearAmt[year] = (row.yearAmt[year] || 0) + (Number(r.totalAmt) || 0)
      row.yearQty[year] = (row.yearQty[year] || 0) + (Number(r.totalQty) || 0)
    }
    const out: PivotRow[] = []
    for (const { salesUnit, yearAmt, yearQty } of map.values()) {
      const yearly: Record<number, number | null> = {}
      years.forEach((y) => {
        const amt = yearAmt[y] || 0
        const qty = yearQty[y] || 0
        yearly[y] = qty > 0 ? amt / qty : null
      })
      out.push({ salesUnit, yearly })
    }
    return out.sort((a, b) => {
      const ua = a.salesUnit === '미지정'
      const ub = b.salesUnit === '미지정'
      if (ua && !ub) return 1
      if (!ua && ub) return -1
      return a.salesUnit.localeCompare(b.salesUnit)
    })
  }, [data, years])

  const summary = useMemo(() => {
    const totalAmt = data.reduce((sum, r) => sum + (Number(r.totalAmt) || 0), 0)
    const totalQty = data.reduce((sum, r) => sum + (Number(r.totalQty) || 0), 0)
    const avgPrice = totalQty > 0 ? totalAmt / totalQty : 0
    return { totalAmt, totalQty, avgPrice }
  }, [data])

  const formatNumber = (v: any) => {
    if (v === null || v === undefined || v === '') return '-'
    const num = Number(v)
    return Number.isFinite(num) ? num.toLocaleString('ko-KR', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) : String(v)
  }
  const formatPrice = (v: any) => {
    if (v === null || v === undefined || v === '') return '-'
    const num = Number(v)
    return Number.isFinite(num) ? num.toLocaleString('ko-KR', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) : String(v)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8f9fa' }}>
      <div style={{ padding: '20px 24px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>판매단가 Sim (영업관리단위)</h1>
        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: 14 }}>영업관리단위별 연도별 평균단가 (직원 합산)</p>

        <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: '#6b7280', fontWeight: 500 }}>회사 구분</label>
            <div style={{ background: '#f3f4f6', padding: 4, borderRadius: 8, display: 'inline-flex', gap: 2 }}>
              {COMPANY_TYPES.map((ct) => (
                <button
                  key={ct}
                  onClick={() => setCompanyType(ct)}
                  style={{
                    background: companyType === ct ? '#fff' : 'transparent',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    color: companyType === ct ? '#111827' : '#6b7280',
                    boxShadow: companyType === ct ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {ct}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: '#6b7280', fontWeight: 500 }}>시작 연도</label>
            <input
              className="input"
              type="number"
              min={2000}
              max={new Date().getFullYear()}
              value={fromYear}
              onChange={(e) => setFromYear(e.target.value)}
              style={{
                width: 100,
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #d1d5db',
                fontSize: 13,
                textAlign: 'center',
                color: '#111827',
                background: '#fff'
              }}
            />
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setCompanyType('TNT'); setFromYear('2022'); setData([]); setError(null); }}
              style={{
                background: '#f3f4f6',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <RefreshCw size={14} />
              초기화
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              style={{
                background: loading ? '#93c5fd' : '#3b82f6',
                border: 'none',
                padding: '8px 20px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <DollarSign size={14} />
              {loading ? '조회 중...' : '분석 실행'}
            </button>
          </div>
        </div>

        {data.length > 0 && (
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <KpiCard title="총 판매 수량" value={formatNumber(summary.totalQty)} subtext="전체 기간 합계" color="#10b981" />
            <KpiCard title="총 판매 금액" value={formatNumber(summary.totalAmt)} subtext="원화 기준" color="#f59e0b" />
            <KpiCard title="평균 판매 단가" value={formatPrice(summary.avgPrice)} subtext="금액 ÷ 수량" color="#8b5cf6" />
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: 24, overflow: 'hidden' }}>
        <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          {error ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>{error}</div>
          ) : pivotRows.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>조건을 선택하고 분석을 실행하세요</div>
          ) : (
            <div style={{ overflow: 'auto', flex: 1, padding: 16 }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 10 }}>
                  <tr>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280', width: 200 }}>영업관리단위</th>
                    {years.map((y) => (
                      <th key={y} style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, color: '#6b7280' }}>{y}년 평균단가</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pivotRows.map((row, idx) => (
                    <tr key={row.salesUnit + idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>{row.salesUnit}</td>
                      {years.map((y) => (
                        <td key={y} style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>
                          {formatPrice(row.yearly[y])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiCard({ title, value, subtext, color }: any) {
  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid #e5e7eb`,
        borderRadius: 12,
        padding: 20,
        transition: 'all 0.2s'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>{title}</span>
        <span style={{ color }}>{<DollarSign size={20} />}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>{value}</div>
      {subtext && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{subtext}</div>}
    </div>
  )
}
