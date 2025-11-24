import React, { useEffect, useMemo, useState } from 'react'
import { DollarSign, FileText, Package } from 'lucide-react'

type Row = {
  salesYear: number
  salesUnit: string
  empName: string
  salesCount?: number
  totalQty?: number
  totalAmt?: number
  avgPrice: number | null
}

type CompanyAvg = {
  salesUnit: string
  avgPrice: number | null
}

const COMPANY_TYPES = ['TNT', 'DYS'] as const

export function PriceSim() {
  const [companyType, setCompanyType] = useState<(typeof COMPANY_TYPES)[number]>('TNT')
  const [fromYear, setFromYear] = useState<string>('2022')
  const [employees, setEmployees] = useState<string[]>([])
  const [empName, setEmpName] = useState<string>('all')
  const [data, setData] = useState<Row[]>([])
  const [companyAvg, setCompanyAvg] = useState<CompanyAvg[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadEmployees()
  }, [companyType, fromYear])

  const loadEmployees = async () => {
    const fy = Number(fromYear) || 2022
    try {
      const params = new URLSearchParams()
      params.append('companyType', companyType)
      params.append('fromYear', String(fy))
      const res = await fetch(`/api/v1/analysis/price-sim/employees?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const names: string[] = await res.json()
      setEmployees(names)
      setEmpName(names.length ? 'all' : '')
    } catch (e: any) {
      setEmployees([])
      setEmpName('')
      setError(e?.message || '영업사원 목록 조회 실패')
    }
  }

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    const fy = Number(fromYear) || 2022
    try {
      const params = new URLSearchParams()
      if (companyType !== 'ALL') params.append('companyType', companyType)
      params.append('fromYear', String(fy))
      if (empName && empName !== 'all') params.append('empName', empName)

      const res = await fetch(`/api/v1/analysis/price-sim?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.json()
      if (body.error) throw new Error(body.error)
      const mapped: Row[] = Array.isArray(body.data)
        ? body.data.map((r: any) => ({
            salesYear: Number(r.salesYear ?? r.salesyear ?? 0),
            salesUnit: String(r.salesUnit ?? r.salesunit ?? '미지정'),
            empName: String(r.empName ?? r.empname ?? '미지정'),
            salesCount: r.salesCount ?? r.salescount,
            totalQty: r.totalQty ?? r.totalqty,
            totalAmt: r.totalAmt ?? r.totalamt,
            avgPrice: (() => {
              const qty = Number(r.totalQty ?? r.totalqty ?? 0)
              const ap = r.avgPrice ?? r.avgprice ?? null
              if (!Number.isFinite(qty) || qty <= 0) return null
              const num = Number(ap)
              return Number.isFinite(num) ? num : null
            })(),
          }))
        : []
      setData(mapped)
      const comp: CompanyAvg[] = Array.isArray(body.companyAvg)
        ? body.companyAvg.map((r: any) => ({
            salesUnit: String(r.salesUnit ?? r.salesunit ?? '미지정'),
            avgPrice: r.avgPrice ?? r.avgprice ?? null,
          }))
        : []
      setCompanyAvg(comp)
    } catch (e: any) {
      setData([])
      setCompanyAvg([])
      setError(e?.message || '조회 실패')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setCompanyType('TNT')
    setFromYear('2022')
    setEmpName('all')
    setData([])
    setError(null)
  }

  const sorted = useMemo(() => {
    const copy = [...data]
    copy.sort((a, b) => {
      if (b.salesYear !== a.salesYear) return b.salesYear - a.salesYear
      const unitA = a.salesUnit || '미지정'
      const unitB = b.salesUnit || '미지정'
      const ua = unitA === '미지정'
      const ub = unitB === '미지정'
      if (ua && !ub) return 1
      if (!ua && ub) return -1
      return unitA.localeCompare(unitB)
    })
    return copy
  }, [data])

  const years = useMemo(() => Array.from(new Set(sorted.map((r) => r.salesYear))).sort((a, b) => b - a), [sorted])

  const companyAvgMap = useMemo(() => {
    const m = new Map<string, number | null>()
    for (const r of companyAvg) {
      m.set(r.salesUnit || '미지정', r.avgPrice ?? null)
    }
    return m
  }, [companyAvg])

  const pivotRows = useMemo(() => {
    const map = new Map<string, { empName: string; salesUnit: string; yearly: Record<number, number | null> }>()
    for (const r of sorted) {
      const key = `${r.empName}__${r.salesUnit}`
      if (!map.has(key)) {
        const init: Record<number, number | null> = {}
        years.forEach((y) => { init[y] = null })
        map.set(key, { empName: r.empName || '미지정', salesUnit: r.salesUnit || '미지정', yearly: init })
      }
      const row = map.get(key)!
      row.yearly[r.salesYear] = r.avgPrice
    }
    return Array.from(map.values()).sort((a, b) => {
      const ua = a.salesUnit === '미지정'
      const ub = b.salesUnit === '미지정'
      if (ua && !ub) return 1
      if (!ua && ub) return -1
      const unitCmp = a.salesUnit.localeCompare(b.salesUnit)
      if (unitCmp !== 0) return unitCmp
      return a.empName.localeCompare(b.empName)
    })
  }, [sorted, years])

  const summary = useMemo(() => {
    const totalSalesCount = sorted.reduce((sum, r) => sum + (r.salesCount || 0), 0)
    const totalQty = sorted.reduce((sum, r) => sum + (r.totalQty || 0), 0)
    const totalAmt = sorted.reduce((sum, r) => sum + (r.totalAmt || 0), 0)
    const avgPrice = totalQty > 0 ? totalAmt / totalQty : 0
    return { totalSalesCount, totalQty, totalAmt, avgPrice }
  }, [sorted])

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
      {/* Header */}
      <div style={{ padding: '20px 24px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>판매단가 시뮬레이션</h1>

        {/* Filters */}
        <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          {/* Company Type Toggle */}
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

          {/* Employee Select */}
          <div style={{ flex: 1, maxWidth: 240 }}>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 6, color: '#6b7280', fontWeight: 500 }}>영업사원</label>
            <select
              className="input"
              value={empName}
              onChange={(e) => setEmpName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #d1d5db',
                fontSize: 13,
                color: '#111827',
                background: '#fff'
              }}
            >
              <option value="all">전체</option>
              {employees.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {/* From Year */}
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

          {/* Action Buttons */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
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

        {/* KPI Cards */}
        {data.length > 0 && (
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <KpiCard
              title="총 거래 건수"
              value={formatNumber(summary.totalSalesCount)}
              subtext="Invoice 기준"
              icon={<FileText size={24} />}
              color="#3b82f6"
            />
            <KpiCard
              title="총 판매 수량"
              value={formatNumber(summary.totalQty)}
              subtext="전체 기간 합계"
              icon={<Package size={24} />}
              color="#10b981"
            />
            <KpiCard
              title="총 판매 금액"
              value={formatNumber(summary.totalAmt)}
              subtext="원화 기준"
              icon={<DollarSign size={24} />}
              color="#f59e0b"
            />
            <KpiCard
              title="평균 판매 단가"
              value={formatPrice(summary.avgPrice)}
              subtext="금액 ÷ 수량"
              icon={<DollarSign size={24} />}
              color="#8b5cf6"
            />
          </div>
        )}
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, padding: 24, overflow: 'hidden' }}>
        <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          {error ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>{error}</div>
          ) : sorted.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>조건을 선택하고 분석을 실행하세요</div>
          ) : (
            <div style={{ overflow: 'auto', flex: 1, padding: 16 }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 10 }}>
                  <tr>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280', width: 160 }}>영업사원</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280', width: 160 }}>영업관리단위</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, color: '#6b7280', width: 120 }}>회사 평균단가</th>
                    {years.map((y) => (
                      <th key={y} style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, color: '#6b7280' }}>{y}년 평균단가</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pivotRows.map((row, idx) => (
                    <tr key={row.empName + row.salesUnit + idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: '#111827' }}>{row.empName || '-'}</td>
                      <td style={{ padding: '12px 16px', color: '#4b5563' }}>{row.salesUnit || '미지정'}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#6b7280' }}>{formatPrice(companyAvgMap.get(row.salesUnit || '미지정'))}</td>
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

// --- Sub Components ---

function KpiCard({ title, value, subtext, icon, color }: any) {
  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid #e5e7eb`,
        borderRadius: 8,
        padding: 12,
        transition: 'all 0.2s'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>{title}</span>
        <span style={{ color: color }}>{React.cloneElement(icon, { size: 16 })}</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{value}</div>
      {subtext && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{subtext}</div>}
    </div>
  )
}
