import React, { useEffect, useMemo, useState, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, LineChart as RechartsLineChart, Line } from 'recharts'
import { ActivityAnalysisAG } from './ActivityAnalysisAG'
import { ArrearsAnalysis } from './ArrearsAnalysis'
import { MapContainer, GeoJSON, useMap, Marker, Tooltip as LeafletTooltip } from 'react-leaflet'
import type { FeatureCollection, Feature, Geometry } from 'geojson'
import type { Layer, PathOptions } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type Summary = {
  prevYearTotal: number
  prevYearToDate: number
  currentYearToDate: number
  prevYearMonthTotal: number
  prevYearMonthToDate: number
  currentYearMonthToDate: number
}

export function Dashboard() {
  const [date, setDate] = useState<string>(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 10)
  })
  const [companyType, setCompanyType] = useState<string>('ALL')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [seriesPrev, setSeriesPrev] = useState<number[]>(new Array(12).fill(0))
  const [seriesCur, setSeriesCur] = useState<number[]>(new Array(12).fill(0))
  const [dailyPrev, setDailyPrev] = useState<number[]>([])
  const [dailyCur, setDailyCur] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<'compare' | 'sales-status' | 'arrears' | 'activity-ag'>('compare')

  // 탭 변경 시 이벤트 발송 (우측 패널 연동)
  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab)
    try {
      window.dispatchEvent(new CustomEvent('tnt.sales.dashboard.tabChange', { detail: { tab } }) as any)
    } catch { }
  }

  async function load(d: string) {
    setLoading(true)
    setError(null)
    try {
      const companyParam = companyType !== 'ALL' ? `&companyType=${encodeURIComponent(companyType)}` : ''
      const r = await fetch(`/api/v1/dashboard/sales-summary?date=${encodeURIComponent(d)}${companyParam}`)
      const data = await r.json().catch(() => ({}))
      if (!r.ok || (data && data.error)) throw new Error(data.error || `HTTP ${r.status} `)
      setSummary(data)
      // Monthly series
      const dt = new Date(d)
      const y = dt.getFullYear()
      const prevY = y - 1
      const until = d
      const [rPrev, rCur] = await Promise.all([
        fetch(`/api/v1/dashboard/monthly?year=${prevY}${companyParam}`),
        fetch(`/api/v1/dashboard/monthly?year=${y}&until=${encodeURIComponent(until)}${companyParam}`)
      ])
      const prevRows = await rPrev.json().catch(() => [])
      const curRows = await rCur.json().catch(() => [])
      const toArr = (rows: any[]) => {
        const a = new Array(12).fill(0)
        if (Array.isArray(rows)) rows.forEach(r => { const m = Number(r?.month); const v = Number(r?.amount || 0); if (m >= 1 && m <= 12) a[m - 1] = v })
        return a
      }
      setSeriesPrev(toArr(prevRows))
      setSeriesCur(toArr(curRows))

      // Daily series for the selected month
      const month = dt.getMonth() + 1
      const [rdPrev, rdCur] = await Promise.all([
        fetch(`/api/v1/dashboard/daily?year=${prevY}&month=${month}${companyParam}`),
        fetch(`/api/v1/dashboard/daily?year=${y}&month=${month}&until=${encodeURIComponent(until)}${companyParam}`)
      ])
      const dPrevRows = await rdPrev.json().catch(() => [])
      const dCurRows = await rdCur.json().catch(() => [])
      const toDaily = (rows: any[], year: number, m: number) => {
        let maxDay = 31
        try { maxDay = new Date(year, m, 0).getDate() } catch { }
        const a = new Array(maxDay).fill(0)
        if (Array.isArray(rows)) rows.forEach(r => { const dd = Number(r?.day); const v = Number(r?.amount || 0); if (dd >= 1 && dd <= maxDay) a[dd - 1] = v })
        return a
      }
      setDailyPrev(toDaily(dPrevRows, prevY, month))
      setDailyCur(toDaily(dCurRows, y, month))
    } catch (e: any) {
      setError(e?.message || '조회 중 오류가 발생했습니다')
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(date) }, [companyType])

  const fmt = (v: number | null | undefined) => {
    if (v == null) return '-'
    try { return new Intl.NumberFormat('ko-KR').format(v) } catch { return String(v) }
  }

  const dObj = new Date(date)
  const y = dObj.getFullYear()
  const m = dObj.getMonth() + 1
  const dd = dObj.getDate()
  const pad2 = (n: number) => String(n).padStart(2, '0')
  const prevY = y - 1
  const prevMonthDays = new Date(prevY, m, 0).getDate()
  const prevDD = Math.min(dd, prevMonthDays)

  return (
    <section style={{ display: 'flex', flexDirection: 'column', fontSize: 12, height: '100%' }}>
      {/* Top tabs */}
      <div className="tabs" style={{ display: 'flex', gap: 8, padding: '6px 8px', marginBottom: 8 }}>
        <button className={activeTab === 'compare' ? 'tab active' : 'tab'} onClick={() => handleTabChange('compare')}>전년동기 매출비교</button>
        <button className={activeTab === 'sales-status' ? 'tab active' : 'tab'} onClick={() => handleTabChange('sales-status')}>매출현황분석</button>
        <button className={activeTab === 'activity-ag' ? 'tab active' : 'tab'} onClick={() => handleTabChange('activity-ag')}>활동분석</button>
        <button className={activeTab === 'arrears' ? 'tab active' : 'tab'} onClick={() => handleTabChange('arrears')}>미수 분석</button>
      </div>

      {activeTab === 'compare' ? (
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 12 }}>
          <div className="page-title">
            <h2>전년동기 매출비교</h2>
            <div className="controls" style={{ gap: 8 }}>
              <div style={{ background: '#f3f4f6', padding: 4, borderRadius: 8, display: 'flex' }}>
                {(['ALL', 'TNT', 'DYS'] as const).map(unit => (
                  <button
                    key={unit}
                    onClick={() => setCompanyType(unit)}
                    style={{
                      padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      background: companyType === unit ? '#fff' : 'transparent',
                      color: companyType === unit ? '#2563eb' : '#6b7280',
                      boxShadow: companyType === unit ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    {unit}
                  </button>
                ))}
              </div>
              <input type="date" className="subject-input" value={date} onChange={(e) => { setDate(e.target.value); load(e.target.value) }} />
            </div>
          </div>
          {error && (<div className="error" style={{ marginBottom: 8 }}>{error}</div>)}
          <div className="card" style={{ padding: 12 }}>
            {loading ? (
              <div className="empty-state">불러오는 중…</div>
            ) : summary ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
                <Metric label={`${prevY} 전체`} value={fmt(summary.prevYearTotal)} />
                <Metric label={`${prevY}-01-01 ~${prevY} -${pad2(m)} -${pad2(dd)} `} value={fmt(summary.prevYearToDate)} />
                <Metric label={`${y}-01-01 ~${y} -${pad2(m)} -${pad2(dd)} `} value={fmt(summary.currentYearToDate)} />

                <Metric label={`${prevY} -${pad2(m)} 전체`} value={fmt(summary.prevYearMonthTotal)} />
                <Metric label={`${prevY} -${pad2(m)}-01 ~${prevY} -${pad2(m)} -${pad2(prevDD)} `} value={fmt(summary.prevYearMonthToDate)} />
                <Metric label={`${y} -${pad2(m)}-01 ~${y} -${pad2(m)} -${pad2(dd)} `} value={fmt(summary.currentYearMonthToDate)} />
              </div>
            ) : (
              <div className="empty-state">데이터가 없습니다</div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>월별 매출 (올해 vs 전년)</div>
              <div style={{ flex: 1, minHeight: 280 }}>
                <ComparisonLineChart prev={seriesPrev} cur={seriesCur} upToMonth={(new Date(date)).getMonth() + 1} />
              </div>
            </div>
            <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>일별 매출 (해당 월: 올해 vs 전년)</div>
              <div style={{ flex: 1, minHeight: 280 }}>
                <DailyBars prev={dailyPrev} cur={dailyCur} upToDay={(new Date(date)).getDate()} />
              </div>
            </div>
          </div>
          <div className="controls" style={{ justifyContent: 'flex-start', marginTop: 12 }}>
            <button className="btn btn-card btn-3d" style={{ fontSize: 12, padding: '8px 12px', borderRadius: 10 }} onClick={async () => {
              try {
                const r = await fetch(`/api/v1/dashboard/churn?date=${encodeURIComponent(date)}`)
                const data = await r.json().catch(() => [])
                if (!r.ok || (data && data.error)) throw new Error(data.error || `HTTP ${r.status} `)
                try { window.dispatchEvent(new CustomEvent('tnt.sales.dashboard.churn', { detail: { items: data } }) as any) } catch { }
              } catch (e: any) {
                alert('이탈거래처 조회 실패')
              }
            }}>이탈거래처</button>
            <button className="btn btn-card btn-3d" style={{ fontSize: 12, padding: '8px 12px', borderRadius: 10, marginLeft: 12 }} onClick={async () => {
              try {
                const r = await fetch(`/api/v1/dashboard/newcustomers?date=${encodeURIComponent(date)}`)
                const data = await r.json().catch(() => [])
                if (!r.ok || (data && data.error)) throw new Error(data.error || `HTTP ${r.status} `)
                try { window.dispatchEvent(new CustomEvent('tnt.sales.dashboard.newcustomers', { detail: { items: data } }) as any) } catch { }
              } catch (e: any) {
                alert('신규 거래처 조회 실패')
              }
            }}>신규 거래처</button>
          </div>
        </div>
      ) : activeTab === 'sales-status' ? (
        <SalesStatusAnalysis companyType={companyType} setCompanyType={setCompanyType} />
      ) : activeTab === 'arrears' ? (
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 12 }}>
          <div className="page-title">
            <h2>미수 분석</h2>
            <div className="controls" style={{ gap: 8 }}>
              <div style={{ background: '#f3f4f6', padding: 4, borderRadius: 8, display: 'flex' }}>
                {(['ALL', 'TNT', 'DYS'] as const).map(unit => (
                  <button
                    key={unit}
                    onClick={() => setCompanyType(unit)}
                    style={{
                      padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      background: companyType === unit ? '#fff' : 'transparent',
                      color: companyType === unit ? '#2563eb' : '#6b7280',
                      boxShadow: companyType === unit ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <ArrearsAnalysis companyType={companyType} />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <ActivityAnalysisAG />
        </div>
      )}

      {/* End tabs */}
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: 12 }}>
      <div className="muted" style={{ fontSize: 10, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{value}</div>
    </div>
  )
}
function ComparisonLineChart({ prev, cur, upToMonth }: { prev: number[]; cur: number[]; upToMonth: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; month: number } | null>(null)
  const DEFAULT_HEIGHT = 320

  // 컨테이너 크기 감지
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width)
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const margin = { top: 30, right: 20, bottom: 40, left: 60 }
  const chartWidth = Math.max(0, width - margin.left - margin.right)
  const chartHeight = Math.max(0, DEFAULT_HEIGHT - margin.top - margin.bottom)

  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const maxVal = Math.max(1, ...prev, ...cur)

  const x = (i: number) => (i * chartWidth) / 11
  const y = (v: number) => chartHeight - (v / maxVal) * chartHeight

  const toPath = (arr: number[], limit?: number) => {
    const used = months.filter(m => !limit || m <= limit)
    return used.map((m, idx) => `${idx === 0 ? 'M' : 'L'} ${x(m - 1)} ${y(arr[m - 1] || 0)}`).join(' ')
  }

  const toAreaPath = (arr: number[], limit?: number) => {
    const used = months.filter(m => !limit || m <= limit)
    if (used.length === 0) return ''
    const linePath = used.map((m, idx) => `${idx === 0 ? 'M' : 'L'} ${x(m - 1)} ${y(arr[m - 1] || 0)}`).join(' ')
    const lastX = x(used[used.length - 1] - 1)
    const firstX = x(used[0] - 1)
    return `${linePath} L ${lastX} ${chartHeight} L ${firstX} ${chartHeight} Z`
  }

  const ticks = 5
  const gridVals = Array.from({ length: ticks }, (_, i) => Math.round((i + 1) * maxVal / ticks))
  const fmtMil = (v: number) => `${Math.round((v || 0) / 1_000_000)}`
  const fmtMilLabel = (v: number) => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format((v || 0) / 1_000_000)

  const COLORS = { prev: '#94a3b8', prevArea: '#94a3b8', cur: '#3b82f6', curArea: '#3b82f6' }

  if (width === 0) {
    return <div ref={containerRef} style={{ width: '100%', height: DEFAULT_HEIGHT }} />
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: DEFAULT_HEIGHT, position: 'relative' }}>
      {/* 범례 (우측 상단) */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        display: 'inline-flex',
        gap: 12,
        alignItems: 'center',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '6px 10px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
        zIndex: 2,
        fontSize: 11,
        color: '#64748b'
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 20, height: 2.5, background: COLORS.prev, borderRadius: 2, position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', border: `2px solid ${COLORS.prev}`, position: 'absolute' }} />
          </span>
          전년
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 20, height: 2.5, background: COLORS.cur, borderRadius: 2, position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', border: `2.5px solid ${COLORS.cur}`, position: 'absolute' }} />
          </span>
          올해
        </span>
      </div>

      <svg width={width} height={DEFAULT_HEIGHT}>
        <defs>
          <linearGradient id="prevAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={COLORS.prevArea} stopOpacity="0.3" />
            <stop offset="100%" stopColor={COLORS.prevArea} stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="curAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={COLORS.curArea} stopOpacity="0.4" />
            <stop offset="100%" stopColor={COLORS.curArea} stopOpacity="0.05" />
          </linearGradient>
          <filter id="lineShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15" />
          </filter>
        </defs>

        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* 수평 격자선 */}
          {[0, ...gridVals].map((v, i) => {
            const yy = y(v)
            return (
              <g key={i}>
                <line x1={0} y1={yy} x2={chartWidth} y2={yy} stroke="#e5e7eb" strokeDasharray={i === 0 ? '0' : '4 4'} />
                <text x={-10} y={yy + 4} textAnchor="end" fontSize={11} fill="#64748b">
                  {fmtMil(v)}
                </text>
              </g>
            )
          })}

          {/* Y축 라벨 */}
          <text x={-margin.left + 8} y={-10} fontSize={10} fill="#94a3b8">(백만원)</text>

          {/* 영역 채우기 */}
          <path d={toAreaPath(prev)} fill="url(#prevAreaGradient)" />
          <path d={toAreaPath(cur, upToMonth)} fill="url(#curAreaGradient)" />

          {/* 라인 */}
          <path d={toPath(prev)} fill="none" stroke={COLORS.prev} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          <path d={toPath(cur, upToMonth)} fill="none" stroke={COLORS.cur} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" filter="url(#lineShadow)" />

          {/* 데이터 포인트 (전년) */}
          {months.map((m) => {
            const v = prev[m - 1] || 0
            const cx = x(m - 1)
            const cy = y(v)
            const isHovered = hoveredMonth === m
            return (
              <g key={`prev-${m}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 6 : 4}
                  fill="#fff"
                  stroke={COLORS.prev}
                  strokeWidth={2}
                  style={{ transition: 'r 0.15s ease' }}
                />
              </g>
            )
          })}

          {/* 데이터 포인트 (올해) */}
          {months.filter(mm => mm <= upToMonth).map((m) => {
            const v = cur[m - 1] || 0
            const cx = x(m - 1)
            const cy = y(v)
            const isHovered = hoveredMonth === m
            return (
              <g key={`cur-${m}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 7 : 5}
                  fill="#fff"
                  stroke={COLORS.cur}
                  strokeWidth={2.5}
                  style={{ transition: 'r 0.15s ease', filter: 'drop-shadow(0 2px 3px rgba(59, 130, 246, 0.3))' }}
                />
              </g>
            )
          })}

          {/* 호버 영역 */}
          {months.map((m) => {
            const cx = x(m - 1)
            return (
              <rect
                key={`hover-${m}`}
                x={cx - chartWidth / 24}
                y={0}
                width={chartWidth / 12}
                height={chartHeight}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  setHoveredMonth(m)
                  const rect = containerRef.current?.getBoundingClientRect()
                  if (rect) {
                    setTooltip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      month: m
                    })
                  }
                }}
                onMouseMove={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect()
                  if (rect) {
                    setTooltip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      month: m
                    })
                  }
                }}
                onMouseLeave={() => {
                  setHoveredMonth(null)
                  setTooltip(null)
                }}
              />
            )
          })}

          {/* 호버 시 수직선 */}
          {hoveredMonth && (
            <line
              x1={x(hoveredMonth - 1)}
              y1={0}
              x2={x(hoveredMonth - 1)}
              y2={chartHeight}
              stroke="#cbd5e1"
              strokeDasharray="4 4"
              style={{ pointerEvents: 'none' }}
            />
          )}

          {/* X축 라벨 */}
          {months.map((m) => (
            <text
              key={m}
              x={x(m - 1)}
              y={chartHeight + 24}
              textAnchor="middle"
              fontSize={11}
              fill={hoveredMonth === m ? '#1e293b' : '#64748b'}
              fontWeight={hoveredMonth === m ? 600 : 400}
            >
              {m}월
            </text>
          ))}
        </g>
      </svg>

      {/* 툴팁 */}
      {tooltip && hoveredMonth && (
        <div style={{
          position: 'absolute',
          left: Math.min(tooltip.x + 12, width - 150),
          top: Math.max(tooltip.y - 80, 10),
          background: '#fff',
          padding: '10px 14px',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          fontSize: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          pointerEvents: 'none',
          zIndex: 1000,
          minWidth: 120
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
            {hoveredMonth}월
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.prev }} />
            <span style={{ color: '#64748b' }}>전년:</span>
            <span style={{ fontWeight: 600, color: '#475569' }}>{fmtMilLabel(prev[hoveredMonth - 1] || 0)}</span>
          </div>
          {hoveredMonth <= upToMonth && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.cur }} />
              <span style={{ color: '#64748b' }}>올해:</span>
              <span style={{ fontWeight: 600, color: '#3b82f6' }}>{fmtMilLabel(cur[hoveredMonth - 1] || 0)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DailyBars({ prev, cur, upToDay }: { prev: number[]; cur: number[]; upToDay: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; day: number } | null>(null)
  const DEFAULT_HEIGHT = 320

  // 컨테이너 크기 감지
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width)
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const margin = { top: 30, right: 20, bottom: 40, left: 60 }
  const chartWidth = Math.max(0, width - margin.left - margin.right)
  const chartHeight = Math.max(0, DEFAULT_HEIGHT - margin.top - margin.bottom)

  const days = 31
  const maxVal = Math.max(1, ...prev, ...cur)

  const groupWidth = chartWidth / days
  const barWidth = Math.max(2, groupWidth * 0.35)
  const barGap = 2

  const x = (i: number) => i * groupWidth + groupWidth / 2
  const y = (v: number) => chartHeight - (v / maxVal) * chartHeight

  const ticks = 5
  const gridVals = Array.from({ length: ticks }, (_, i) => Math.round((i + 1) * maxVal / ticks))
  const fmtMil = (v: number) => `${Math.round((v || 0) / 1_000_000)}`
  const fmtMilLabel = (v: number) => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format((v || 0) / 1_000_000)

  const COLORS = { prev: '#94a3b8', cur: '#3b82f6' }

  if (width === 0) {
    return <div ref={containerRef} style={{ width: '100%', height: DEFAULT_HEIGHT }} />
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: DEFAULT_HEIGHT, position: 'relative' }}>
      {/* 범례 (우측 상단) */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        display: 'inline-flex',
        gap: 12,
        alignItems: 'center',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '6px 10px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
        zIndex: 2,
        fontSize: 11,
        color: '#64748b'
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 2, background: '#94a3b8', border: '1px solid #cbd5e1' }} />
          전년
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 2, background: '#3b82f6', border: '1px solid #60a5fa' }} />
          올해
        </span>
      </div>

      <svg width={width} height={DEFAULT_HEIGHT}>
        <defs>
          <linearGradient id="barPrevGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id="barCurGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
          <filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.15" />
          </filter>
        </defs>

        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* 수평 격자선 */}
          {[0, ...gridVals].map((v, i) => {
            const yy = y(v)
            return (
              <g key={i}>
                <line x1={0} y1={yy} x2={chartWidth} y2={yy} stroke="#e5e7eb" strokeDasharray={i === 0 ? '0' : '4 4'} />
                <text x={-10} y={yy + 4} textAnchor="end" fontSize={11} fill="#64748b">
                  {fmtMil(v)}
                </text>
              </g>
            )
          })}

          {/* Y축 라벨 */}
          <text x={-margin.left + 8} y={-10} fontSize={10} fill="#94a3b8">(백만원)</text>

          {/* 바 차트 */}
          {Array.from({ length: days }, (_, i) => i).map(i => {
            const cx = x(i)
            const prevVal = prev[i] || 0
            const curVal = cur[i] || 0
            const hPrev = (prevVal / maxVal) * chartHeight
            const hCur = (curVal / maxVal) * chartHeight
            const isHovered = hoveredDay === i

            return (
              <g key={i}>
                {/* 전년 바 */}
                <rect
                  x={cx - barWidth - barGap / 2}
                  y={chartHeight - hPrev}
                  width={barWidth}
                  height={hPrev}
                  fill="url(#barPrevGradient)"
                  rx={2}
                  ry={2}
                  opacity={isHovered ? 1 : 0.85}
                  style={{ transition: 'opacity 0.15s ease' }}
                />
                {/* 올해 바 */}
                {i < upToDay && (
                  <rect
                    x={cx + barGap / 2}
                    y={chartHeight - hCur}
                    width={barWidth}
                    height={hCur}
                    fill="url(#barCurGradient)"
                    rx={2}
                    ry={2}
                    opacity={isHovered ? 1 : 0.85}
                    filter={isHovered ? 'url(#barShadow)' : undefined}
                    style={{ transition: 'opacity 0.15s ease' }}
                  />
                )}
                {/* 호버 영역 */}
                <rect
                  x={cx - groupWidth / 2}
                  y={0}
                  width={groupWidth}
                  height={chartHeight}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => {
                    setHoveredDay(i)
                    const rect = containerRef.current?.getBoundingClientRect()
                    if (rect) {
                      setTooltip({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        day: i + 1
                      })
                    }
                  }}
                  onMouseMove={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect()
                    if (rect) {
                      setTooltip({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        day: i + 1
                      })
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredDay(null)
                    setTooltip(null)
                  }}
                />
              </g>
            )
          })}

          {/* 호버 시 강조선 */}
          {hoveredDay !== null && (
            <line
              x1={x(hoveredDay)}
              y1={0}
              x2={x(hoveredDay)}
              y2={chartHeight}
              stroke="#cbd5e1"
              strokeDasharray="4 4"
              style={{ pointerEvents: 'none' }}
            />
          )}

          {/* X축 라벨 (5일 간격 + 마지막 날) */}
          {Array.from({ length: days }, (_, i) => i + 1)
            .filter(d => d === 1 || d % 5 === 0 || d === days)
            .map((d) => (
              <text
                key={d}
                x={x(d - 1)}
                y={chartHeight + 20}
                textAnchor="middle"
                fontSize={11}
                fill={hoveredDay === d - 1 ? '#1e293b' : '#64748b'}
                fontWeight={hoveredDay === d - 1 ? 600 : 400}
              >
                {d}
              </text>
            ))}
          <text x={chartWidth / 2} y={chartHeight + 34} textAnchor="middle" fontSize={10} fill="#94a3b8">(일)</text>
        </g>
      </svg>

      {/* 툴팁 */}
      {tooltip && hoveredDay !== null && (
        <div style={{
          position: 'absolute',
          left: Math.min(tooltip.x + 12, width - 150),
          top: Math.max(tooltip.y - 80, 10),
          background: '#fff',
          padding: '10px 14px',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          fontSize: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          pointerEvents: 'none',
          zIndex: 1000,
          minWidth: 120
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
            {tooltip.day}일
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS.prev }} />
            <span style={{ color: '#64748b' }}>전년:</span>
            <span style={{ fontWeight: 600, color: '#475569' }}>{fmtMilLabel(prev[hoveredDay] || 0)}</span>
          </div>
          {hoveredDay < upToDay && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS.cur }} />
              <span style={{ color: '#64748b' }}>올해:</span>
              <span style={{ fontWeight: 600, color: '#3b82f6' }}>{fmtMilLabel(cur[hoveredDay] || 0)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import { ChevronLeft, ChevronRight } from 'lucide-react'

function SalesStatusAnalysis({ companyType, setCompanyType }: { companyType: string; setCompanyType: (t: string) => void }) {
  const [type, setType] = useState<'MONTH' | 'WEEK'>('MONTH')
  const [date, setDate] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [trendData, setTrendData] = useState<any[]>([])
  const [viewType, setViewType] = useState<'TREND' | 'ITEM' | 'REGION' | 'SALESPERSON'>('TREND')

  // Helper to get ISO week number
  const getWeekNumber = (d: Date) => {
    const d2 = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    const dayNum = d2.getUTCDay() || 7
    d2.setUTCDate(d2.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d2.getUTCFullYear(), 0, 1))
    return Math.ceil((((d2.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }

  // Helper to get Date from ISO Week string "YYYY-WW"
  const getDateFromISOWeek = (isoWeekStr: string) => {
    if (!isoWeekStr || !isoWeekStr.includes('-')) return new Date()
    const [yearStr, weekStr] = isoWeekStr.split('-')
    const year = parseInt(yearStr, 10)
    const week = parseInt(weekStr, 10)
    const simple = new Date(year, 0, 1 + (week - 1) * 7)
    const dayOfWeek = simple.getDay()
    const isoWeekStart = simple
    if (dayOfWeek <= 4) isoWeekStart.setDate(simple.getDate() - simple.getDay() + 1)
    else isoWeekStart.setDate(simple.getDate() + 8 - simple.getDay())
    return isoWeekStart
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        if (viewType === 'TREND') {
          const now = new Date()
          let startDate: Date
          let endDate = now
          let groupBy = 'WEEKLY'

          if (type === 'MONTH') {
            // Monthly view: From Jan 1st of current year
            startDate = new Date(now.getFullYear(), 0, 1)
            groupBy = 'MONTHLY'
          } else {
            // Weekly view: From previous quarter
            const currentMonth = now.getMonth()
            const currentQuarter = Math.floor((currentMonth + 3) / 3)
            let prevQuarterYear = now.getFullYear()
            let prevQuarterStartMonth = (currentQuarter - 2) * 3 // 0-indexed

            if (prevQuarterStartMonth < 0) {
              prevQuarterStartMonth += 12
              prevQuarterYear -= 1
            }
            startDate = new Date(prevQuarterYear, prevQuarterStartMonth, 1)
          }

          const fmtDate = (d: Date) => {
            const y = d.getFullYear()
            const m = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')
            return `${y}-${m}-${day}`
          }

          const res = await fetch(`/api/v1/analysis/sales-trend?startDate=${fmtDate(startDate)}&endDate=${fmtDate(endDate)}&companyType=${companyType}&groupBy=${groupBy}`)
          if (!res.ok) throw new Error('Failed to fetch trend data')
          const json = await res.json()

          // Process data to add labels
          let lastMonth = -1
          const processedData = json.map((item: any) => {
            let displayDate = ''
            let labelAmount = null

            if (groupBy === 'MONTHLY') {
              // item.date is "YYYY-MM"
              const [y, m] = item.date.split('-')
              displayDate = `${parseInt(m, 10)}월`
              labelAmount = Math.round(item.amount / 1000000)
            } else {
              // WEEKLY: item.date is "YYYY-WW"
              const d = getDateFromISOWeek(item.date)
              const month = d.getMonth() + 1
              const week = parseInt(item.date.split('-')[1], 10)
              displayDate = `${month}월 ${week}주`

              if (month !== lastMonth) {
                labelAmount = Math.round(item.amount / 1000000)
                lastMonth = month
              }
            }

            return {
              ...item,
              displayDate,
              labelAmount
            }
          })

          setTrendData(processedData)

          // Also fetch summary data for the cards
          let url = `/api/v1/analysis/sales-status?type=${type}&year=${date.getFullYear()}`
          if (type === 'MONTH') {
            url += `&month=${date.getMonth() + 1}`
          } else {
            const week = getWeekNumber(date)
            url += `&week=${week}`
          }
          if (companyType && companyType !== 'ALL') {
            url += `&companyType=${companyType}`
          }
          const res2 = await fetch(url)
          if (res2.ok) {
            const json2 = await res2.json()
            setData(json2)
          }

        } else {
          let url = `/api/v1/analysis/sales-status?type=${type}&year=${date.getFullYear()}`
          if (type === 'MONTH') {
            url += `&month=${date.getMonth() + 1}`
          } else {
            const week = getWeekNumber(date)
            url += `&week=${week}`
          }
          if (companyType && companyType !== 'ALL') {
            url += `&companyType=${companyType}`
          }

          const res = await fetch(url)
          if (!res.ok) throw new Error('Failed to fetch')
          const json = await res.json()
          setData(json)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [type, date, companyType, viewType])

  const handlePrev = () => {
    const d = new Date(date)
    if (type === 'MONTH') d.setMonth(d.getMonth() - 1)
    else d.setDate(d.getDate() - 7)
    setDate(d)
  }

  const handleNext = () => {
    const d = new Date(date)
    if (type === 'MONTH') d.setMonth(d.getMonth() + 1)
    else d.setDate(d.getDate() + 7)
    setDate(d)
  }

  const formatLabel = () => {
    if (type === 'MONTH') return `${date.getFullYear()}년 ${date.getMonth() + 1}월`
    return `${date.getFullYear()}년 ${getWeekNumber(date)}주차`
  }

  const renderContent = () => {
    if (loading) {
      return <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>로딩중...</div>
    }

    const fmt = (v: number) => new Intl.NumberFormat('ko-KR').format(v)
    const summary = data?.summary || { totalAmt: 0, tntAmt: 0, dysAmt: 0 }

    return (
      <div style={{ flex: 1, height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, padding: '12px 12px 0' }}>
          <div className="card" style={{ padding: 12, background: '#f8fafc' }}>
            <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>전체 매출</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{fmt(summary.totalAmt || 0)}</div>
          </div>
          <div className="card" style={{ padding: 12, background: '#f0f9ff' }}>
            <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>TNT 매출</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0369a1' }}>{fmt(summary.tntAmt || 0)}</div>
          </div>
          <div className="card" style={{ padding: 12, background: '#fdf2f8' }}>
            <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>DYS 매출</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#be185d' }}>{fmt(summary.dysAmt || 0)}</div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {viewType === 'TREND' && (
            <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: 14, marginBottom: 12, fontWeight: 600 }}>{type === 'MONTH' ? '월별' : '주별'} 매출 추이 ({type === 'MONTH' ? '올해 1월 ~ 현재' : '전분기 ~ 현재'})</h3>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis
                      dataKey="displayDate"
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => (val / 1000000).toFixed(0)}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      formatter={(value: number) => [new Intl.NumberFormat('ko-KR').format(value) + ' 원', '매출액']}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    >
                      <LabelList
                        dataKey="labelAmount"
                        position="top"
                        style={{ fontSize: 11, fill: '#3b82f6', fontWeight: 600 }}
                        formatter={(val: number) => val ? val.toLocaleString() : ''}
                      />
                    </Line>
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {viewType === 'ITEM' && (
            <div style={{ padding: 12, height: '100%', overflowY: 'auto' }}>
              {/* Sales Management Unit Chart */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 14, marginBottom: 12, fontWeight: 600 }}>영업관리단위별 통계</h3>
                {data?.bySalesMgmtUnit && data.bySalesMgmtUnit.length > 0 ? (
                  <HorizontalBarChart
                    data={data.bySalesMgmtUnit.map((r: any) => ({ name: (r.unitName || '미지정').trim(), value: Number(r.totalAmt || 0) }))}
                    color="#f59e0b"
                    containerHeight={300}
                  />
                ) : <div className="muted">데이터 없음</div>}
              </div>

              {/* Item Chart */}
              <div>
                <h3 style={{ fontSize: 14, marginBottom: 12, fontWeight: 600 }}>품목별 통계</h3>
                {data?.byItem && data.byItem.length > 0 ? (
                  <HorizontalBarChart
                    data={data.byItem.map((r: any) => ({ name: (r.itemName || '미지정').trim(), value: Number(r.totalAmt || 0) }))}
                    color="#10b981"
                  />
                ) : <div className="muted">데이터 없음</div>}
              </div>
            </div>
          )}

          {viewType === 'REGION' && (
            <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: 14, marginBottom: 12, fontWeight: 600 }}>지역별 통계</h3>
              <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12 }}>
                {/* 지도 영역 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <RegionSalesMap
                    salesData={data?.byRegion?.map((r: any) => ({
                      region: r.region || '미지정',
                      totalAmt: Number(r.totalAmt || 0)
                    })) || []}
                  />
                </div>
                {/* 차트 영역 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {data?.byRegion && data.byRegion.length > 0 ? (
                    <HorizontalBarChart
                      data={data.byRegion.map((r: any) => ({ name: (r.region || '미지정').trim(), value: Number(r.totalAmt || 0) }))}
                      color="#3b82f6"
                      yAxisWidth={100}
                      containerHeight={640}
                    />
                  ) : <div className="muted">데이터 없음</div>}
                </div>
              </div>
            </div>
          )}

          {viewType === 'SALESPERSON' && (
            <div style={{ padding: 12 }}>
              <h3 style={{ fontSize: 14, marginBottom: 12, fontWeight: 600 }}>영업사원별 통계</h3>
              {data?.bySalesperson && data.bySalesperson.length > 0 ? (
                <HorizontalBarChart
                  data={data.bySalesperson.map((r: any) => ({ name: (r.salesperson || '미지정').trim(), value: Number(r.totalAmt || 0) }))}
                  color="#8b5cf6"
                  yAxisWidth={100}
                />
              ) : <div className="muted">데이터 없음</div>}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>매출현황분석</h2>
          <div style={{ background: '#f3f4f6', padding: 4, borderRadius: 8, display: 'flex' }}>
            {(['ALL', 'TNT', 'DYS'] as const).map(unit => (
              <button
                key={unit}
                onClick={() => setCompanyType(unit)}
                style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: companyType === unit ? '#fff' : 'transparent',
                  color: companyType === unit ? '#2563eb' : '#6b7280',
                  boxShadow: companyType === unit ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {unit}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* Period Type Selector - Button Group Pattern */}
          <div style={{ display: 'flex', gap: 0 }}>
            <button
              className={`btn ${type === 'MONTH' ? 'btn-primary' : 'btn-secondary'} `}
              onClick={() => setType('MONTH')}
              style={{ borderRadius: '4px 0 0 4px', height: 32, fontSize: 13 }}
            >
              월별
            </button>
            <button
              className={`btn ${type === 'WEEK' ? 'btn-primary' : 'btn-secondary'} `}
              onClick={() => setType('WEEK')}
              style={{ borderRadius: '0 4px 4px 0', borderLeft: 'none', height: 32, fontSize: 13 }}
            >
              주별
            </button>
          </div>

          {/* Date Navigator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button className="btn btn-ghost" onClick={handlePrev} style={{ padding: 4, height: 32, width: 32, justifyContent: 'center' }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: 14, fontWeight: 600, minWidth: 100, textAlign: 'center' }}>{formatLabel()}</span>
            <button className="btn btn-ghost" onClick={handleNext} style={{ padding: 4, height: 32, width: 32, justifyContent: 'center' }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs - Tab Form Pattern */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {[
            { id: 'TREND', label: '매출추이' },
            { id: 'ITEM', label: '품목별' },
            { id: 'REGION', label: '지역별' },
            { id: 'SALESPERSON', label: '영업사원별' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewType(tab.id as any)}
              style={{
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                borderBottom: viewType === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                color: viewType === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: viewType === tab.id ? 600 : 400,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {renderContent()}
      </div>
    </div>
  )
}

function HorizontalBarChart({ data, color, yAxisWidth = 100, containerHeight = 400 }: { data: { name: string; value: number }[]; color: string; yAxisWidth?: number; containerHeight?: number }) {
  // Dynamic height: at least 300px, or 32px per item
  const height = Math.max(300, data.length * 32)

  const formatMillion = (val: number) => {
    const millions = val / 1000000
    return new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(millions)
  }

  const formatWon = (val: number) => {
    return new Intl.NumberFormat('ko-KR').format(val)
  }

  // Canvas를 사용해 실제 텍스트 너비 측정
  const measureTextWidth = (text: string, font: string = '11px sans-serif'): number => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return text.length * 7
    ctx.font = font
    return ctx.measureText(text).width
  }

  const maxTextWidth = Math.max(...data.map(d => measureTextWidth(d.name || '')))
  const dynamicWidth = Math.min(350, Math.ceil(maxTextWidth) + 8)

  return (
    <div style={{ width: '100%', height: containerHeight, overflowY: 'auto', overflowX: 'hidden', paddingRight: 8 }}>
      <div style={{ textAlign: 'right', fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
        (단위: 백만원)
      </div>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 5, right: 50, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
            <XAxis type="number" domain={[0, 'dataMax']} tickCount={6} tick={false} axisLine={false} />
            <YAxis
              dataKey="name"
              type="category"
              width={dynamicWidth}
              tick={{ fontSize: 11, fill: '#374151' }}
              tickLine={false}
              axisLine={false}
              interval={0}
              tickMargin={0}
            />
            <Tooltip
              cursor={{ fill: '#f3f4f6' }}
              contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              formatter={(value: number) => [formatWon(value) + ' 원', '매출액']}
            />
            <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} barSize={18}>
              <LabelList dataKey="value" position="right" formatter={(val: number) => formatMillion(val)} style={{ fontSize: 11, fill: '#374151' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// 남한 경계 범위
const SOUTH_KOREA_BOUNDS: L.LatLngBoundsExpression = [
  [33.0, 125.8],
  [38.6, 130.0],
]

// 시도별 중심 좌표
const SIDO_CENTERS: Record<string, [number, number]> = {
  '서울특별시': [37.5665, 126.9780],
  '서울': [37.5665, 126.9780],
  '부산광역시': [35.1796, 129.0756],
  '부산': [35.1796, 129.0756],
  '대구광역시': [35.8714, 128.6014],
  '대구': [35.8714, 128.6014],
  '인천광역시': [37.4563, 126.7052],
  '인천': [37.4563, 126.7052],
  '광주광역시': [35.1595, 126.8526],
  '광주': [35.1595, 126.8526],
  '대전광역시': [36.3504, 127.3845],
  '대전': [36.3504, 127.3845],
  '울산광역시': [35.5384, 129.3114],
  '울산': [35.5384, 129.3114],
  '세종특별자치시': [36.4800, 127.2890],
  '세종': [36.4800, 127.2890],
  '경기도': [37.4138, 127.5183],
  '경기': [37.4138, 127.5183],
  '강원특별자치도': [37.8228, 128.1555],
  '강원도': [37.8228, 128.1555],
  '강원': [37.8228, 128.1555],
  '충청북도': [36.6357, 127.4914],
  '충북': [36.6357, 127.4914],
  '충청남도': [36.5184, 126.8000],
  '충남': [36.5184, 126.8000],
  '전북특별자치도': [35.7175, 127.1530],
  '전라북도': [35.7175, 127.1530],
  '전북': [35.7175, 127.1530],
  '전라남도': [34.8679, 126.9910],
  '전남': [34.8679, 126.9910],
  '경상북도': [36.4919, 128.8889],
  '경북': [36.4919, 128.8889],
  '경상남도': [35.4606, 128.2132],
  '경남': [35.4606, 128.2132],
  '제주특별자치도': [33.4890, 126.4983],
  '제주도': [33.4890, 126.4983],
  '제주': [33.4890, 126.4983],
}

// 지도 범위를 남한으로 맞추는 컴포넌트
function FitBounds() {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(SOUTH_KOREA_BOUNDS, { padding: [10, 10] })
    map.setZoom(map.getZoom() + 0.2)
  }, [map])
  return null
}

// 매출금액 포맷 (백만원 단위)
function formatSalesMillion(val: number) {
  const millions = val / 1000000
  return new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(millions) + 'M'
}

// 커스텀 마커 아이콘 생성 (원형 매출금액 표시)
function createSalesIcon(regionName: string, amount: number, maxAmount: number) {
  // 매출 비율에 따라 크기 조절 (최소 36, 최대 70)
  const ratio = maxAmount > 0 ? amount / maxAmount : 0
  const size = Math.max(36, Math.min(70, 36 + ratio * 34))

  // 매출 비율에 따라 색상 결정 (파란색 그라데이션)
  const hue = 210 // 파란색 계열
  const saturation = 70
  const lightness = Math.max(35, 55 - ratio * 20) // 높은 매출일수록 진한 색

  return L.divIcon({
    className: 'sales-marker',
    html: `<div style="
background: hsl(${hue}, ${saturation}%, ${lightness}%);
color: white;
border-radius: 50%;
width: ${size}px;
height: ${size}px;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
font-size: ${Math.max(9, size / 6)}px;
font-weight: bold;
border: 2px solid white;
box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
line-height: 1.1;
">
  <div style="font-size: ${Math.max(7, size / 7)}px; opacity: 0.85;">${regionName.replace(/특별시|광역시|특별자치시|특별자치도|도$/, '')}</div>
    <div>${formatSalesMillion(amount)}</div>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// 지역별 매출 지도 컴포넌트
function RegionSalesMap({ salesData }: { salesData: { region: string; totalAmt: number }[] }) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const geoJsonRef = useRef<any>(null)
  const [hovered, setHovered] = useState<string | null>(null)

  // API에서 오는 "시도 시군구" 형식에서 시도만 추출
  const extractSido = (region: string): string | null => {
    if (!region) return null
    const trimmed = region.trim()
    // "시도 시군구" 형식에서 첫 번째 단어(시도)를 추출
    const parts = trimmed.split(/\s+/)
    const first = parts[0]

    // 시도 매칭
    const sidoPatterns: Record<string, string> = {
      '서울특별시': '서울특별시',
      '서울': '서울특별시',
      '부산광역시': '부산광역시',
      '부산': '부산광역시',
      '대구광역시': '대구광역시',
      '대구': '대구광역시',
      '인천광역시': '인천광역시',
      '인천': '인천광역시',
      '광주광역시': '광주광역시',
      '광주': '광주광역시',
      '대전광역시': '대전광역시',
      '대전': '대전광역시',
      '울산광역시': '울산광역시',
      '울산': '울산광역시',
      '세종특별자치시': '세종특별자치시',
      '세종': '세종특별자치시',
      '경기도': '경기도',
      '경기': '경기도',
      '강원특별자치도': '강원특별자치도',
      '강원도': '강원특별자치도',
      '강원': '강원특별자치도',
      '충청북도': '충청북도',
      '충북': '충청북도',
      '충청남도': '충청남도',
      '충남': '충청남도',
      '전북특별자치도': '전북특별자치도',
      '전라북도': '전북특별자치도',
      '전북': '전북특별자치도',
      '전라남도': '전라남도',
      '전남': '전라남도',
      '경상북도': '경상북도',
      '경북': '경상북도',
      '경상남도': '경상남도',
      '경남': '경상남도',
      '제주특별자치도': '제주특별자치도',
      '제주도': '제주특별자치도',
      '제주': '제주특별자치도',
    }

    return sidoPatterns[first] || null
  }

  // 시도별로 매출 합산
  const salesBySido = useMemo(() => {
    const map: Record<string, number> = {}
    salesData.forEach(d => {
      const sido = extractSido(d.region)
      if (sido) {
        map[sido] = (map[sido] || 0) + d.totalAmt
      }
    })
    return map
  }, [salesData])

  // 시도별 매출 배열 (마커용)
  const sidoSalesArray = useMemo(() => {
    return Object.entries(salesBySido).map(([sido, totalAmt]) => ({
      sido,
      totalAmt,
      center: SIDO_CENTERS[sido],
    })).filter(d => d.center && d.totalAmt > 0)
  }, [salesBySido])

  const maxAmount = useMemo(() => Math.max(...Object.values(salesBySido), 1), [salesBySido])

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/sido_boundary_simplified.geojson`)
      .then(res => {
        if (!res.ok) throw new Error('지도 데이터를 불러올 수 없습니다.')
        return res.json()
      })
      .then((data: FeatureCollection) => {
        setGeoData(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const getStyle = (feature: Feature<Geometry, any> | undefined): PathOptions => {
    if (!feature) return {}
    const name = feature.properties?.CTP_KOR_NM || ''
    const isHovered = hovered === name
    const amount = salesBySido[name] || 0
    const ratio = maxAmount > 0 ? amount / maxAmount : 0

    // 매출액에 따른 색상 (파란색 그라데이션)
    const fillOpacity = amount > 0 ? 0.2 + ratio * 0.5 : 0.05

    return {
      fillColor: amount > 0 ? '#3b82f6' : '#e5e7eb',
      weight: isHovered ? 2 : 1,
      opacity: 1,
      color: isHovered ? '#1e40af' : '#6b7280',
      fillOpacity,
    }
  }

  const onEachFeature = (feature: Feature<Geometry, any>, layer: Layer) => {
    const name = feature.properties?.CTP_KOR_NM || '알 수 없음'
    const amount = salesBySido[name] || 0

    layer.on({
      mouseover: () => {
        setHovered(name)
        if (geoJsonRef.current) {
          geoJsonRef.current.setStyle((f: Feature<Geometry, any> | undefined) => getStyle(f))
        }
      },
      mouseout: () => {
        setHovered(null)
        if (geoJsonRef.current) {
          geoJsonRef.current.setStyle((f: Feature<Geometry, any> | undefined) => getStyle(f))
        }
      },
    })

    layer.bindTooltip(
      `<strong>${name}</strong><br />매출: ${formatSalesMillion(amount)}`,
      { permanent: false, direction: 'center', className: 'sales-map-tooltip' }
    )
  }

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        지도 로딩 중...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red' }}>
        {error}
      </div>
    )
  }

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <MapContainer
        center={[36.5, 127.5]}
        zoom={7}
        zoomSnap={0.1}
        style={{ height: '100%', width: '100%', background: '#fff' }}
        scrollWheelZoom={true}
      >
        {geoData && (
          <>
            <GeoJSON
              ref={geoJsonRef}
              data={geoData}
              style={getStyle}
              onEachFeature={onEachFeature}
            />
            <FitBounds />
          </>
        )}
        {/* 시도별 매출 마커 */}
        {sidoSalesArray.map(m => {
          const icon = createSalesIcon(m.sido, m.totalAmt, maxAmount)
          const formattedWon = new Intl.NumberFormat('ko-KR').format(m.totalAmt)
          return (
            <Marker key={m.sido} position={m.center} icon={icon}>
              <LeafletTooltip
                direction="top"
                offset={[0, -20]}
                className="sales-marker-tooltip-recharts"
              >
                <div style={{ padding: '4px 0' }}>
                  <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 6 }}>{m.sido}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: '#3b82f6',
                      display: 'inline-block'
                    }}></span>
                    <span style={{ color: '#374151', fontSize: 13 }}>매출액: </span>
                    <span style={{ color: '#374151', fontWeight: 600, fontSize: 13 }}>{formattedWon} 원</span>
                  </div>
                </div>
              </LeafletTooltip>
            </Marker>
          )
        })}
      </MapContainer>
      {/* 범례 */}
      <div style={{
        position: 'absolute',
        bottom: 10,
        right: 10,
        background: 'rgba(255,255,255,0.95)',
        padding: '8px 12px',
        borderRadius: 8,
        fontSize: 11,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        zIndex: 1000,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>매출 (백만원)</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 16, height: 16, background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #6b7280' }} />
          <span>낮음</span>
          <div style={{ width: 16, height: 16, background: 'rgba(59, 130, 246, 0.7)', border: '1px solid #6b7280', marginLeft: 8 }} />
          <span>높음</span>
        </div>
      </div>
      <style>{`
  .sales - map - tooltip {
  background: rgba(0, 0, 0, 0.85);
  border: none;
  border - radius: 6px;
  color: white;
  font - size: 12px;
  padding: 6px 10px;
}
        .sales - marker {
  background: transparent;
  border: none;
}
        .sales - marker - tooltip - recharts {
  background: #fff!important;
  border: none!important;
  border - radius: 8px!important;
  padding: 10px 14px!important;
  box - shadow: 0 4px 6px - 1px rgba(0, 0, 0, 0.1)!important;
  font - family: inherit!important;
}
        .sales - marker - tooltip - recharts::before {
  border - top - color: #fff!important;
}
        .leaflet - tooltip.sales - marker - tooltip - recharts {
  opacity: 1!important;
}
`}</style>
    </div>
  )
}
