import React, { useEffect, useMemo, useState } from 'react'
import { ActivityAnalysisAG } from './ActivityAnalysisAG'

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

  const [activeTab, setActiveTab] = useState<'compare' | 'arrears' | 'activity-ag'>('compare')

  async function load(d: string) {
    setLoading(true)
    setError(null)
    try {
      const companyParam = companyType !== 'ALL' ? `&companyType=${encodeURIComponent(companyType)}` : ''
      const r = await fetch(`/api/v1/dashboard/sales-summary?date=${encodeURIComponent(d)}${companyParam}`)
      const data = await r.json().catch(() => ({}))
      if (!r.ok || (data && data.error)) throw new Error(data.error || `HTTP ${r.status}`)
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
    <section style={{ display: 'flex', flexDirection: 'column', fontSize: 12 }}>
      {/* Top tabs */}
      <div className="tabs" style={{ display: 'flex', gap: 8, padding: '6px 8px', marginBottom: 8 }}>
        <button className={activeTab === 'compare' ? 'tab active' : 'tab'} onClick={() => setActiveTab('compare')}>전년동기 매출비교</button>
        <button className={activeTab === 'activity-ag' ? 'tab active' : 'tab'} onClick={() => setActiveTab('activity-ag')}>활동분석</button>
        <button className={activeTab === 'arrears' ? 'tab active' : 'tab'} onClick={() => setActiveTab('arrears')}>미수 분석</button>
      </div>

      {activeTab === 'compare' ? (
        <>
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
                <Metric label={`${prevY}-01-01 ~ ${prevY}-${pad2(m)}-${pad2(dd)}`} value={fmt(summary.prevYearToDate)} />
                <Metric label={`${y}-01-01 ~ ${y}-${pad2(m)}-${pad2(dd)}`} value={fmt(summary.currentYearToDate)} />

                <Metric label={`${prevY}-${pad2(m)} 전체`} value={fmt(summary.prevYearMonthTotal)} />
                <Metric label={`${prevY}-${pad2(m)}-01 ~ ${prevY}-${pad2(m)}-${pad2(prevDD)}`} value={fmt(summary.prevYearMonthToDate)} />
                <Metric label={`${y}-${pad2(m)}-01 ~ ${y}-${pad2(m)}-${pad2(dd)}`} value={fmt(summary.currentYearMonthToDate)} />
              </div>
            ) : (
              <div className="empty-state">데이터가 없습니다</div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div className="card" style={{ padding: 12 }}>
              <div className="muted" style={{ marginBottom: 8 }}>월별 매출 (올해 vs 전년)</div>
              <LineChart prev={seriesPrev} cur={seriesCur} upToMonth={(new Date(date)).getMonth() + 1} />
            </div>
            <div className="card" style={{ padding: 12 }}>
              <div className="muted" style={{ marginBottom: 8 }}>일별 매출 (해당 월: 올해 vs 전년)</div>
              <DailyBars prev={dailyPrev} cur={dailyCur} upToDay={(new Date(date)).getDate()} />
            </div>
          </div>
          <div className="controls" style={{ justifyContent: 'flex-start', marginTop: 12 }}>
            <button className="btn btn-card btn-3d" style={{ fontSize: 12, padding: '8px 12px', borderRadius: 10 }} onClick={async () => {
              try {
                const r = await fetch(`/api/v1/dashboard/churn?date=${encodeURIComponent(date)}`)
                const data = await r.json().catch(() => [])
                if (!r.ok || (data && data.error)) throw new Error(data.error || `HTTP ${r.status}`)
                try { window.dispatchEvent(new CustomEvent('tnt.sales.dashboard.churn', { detail: { items: data } }) as any) } catch { }
              } catch (e: any) {
                alert('이탈거래처 조회 실패')
              }
            }}>이탈거래처</button>
            <button className="btn btn-card btn-3d" style={{ fontSize: 12, padding: '8px 12px', borderRadius: 10, marginLeft: 12 }} onClick={async () => {
              try {
                const r = await fetch(`/api/v1/dashboard/newcustomers?date=${encodeURIComponent(date)}`)
                const data = await r.json().catch(() => [])
                if (!r.ok || (data && data.error)) throw new Error(data.error || `HTTP ${r.status}`)
                try { window.dispatchEvent(new CustomEvent('tnt.sales.dashboard.newcustomers', { detail: { items: data } }) as any) } catch { }
              } catch (e: any) {
                alert('신규 거래처 조회 실패')
              }
            }}>신규 거래처</button>
          </div>
        </>
      ) : activeTab === 'arrears' ? (
        <>
          <div className="page-title"><h2>미수 분석</h2></div>
          <div className="card" style={{ padding: 12 }}>
            <div className="empty-state">미수 분석 콘텐츠가 준비 중입니다.</div>
          </div>
        </>
      ) : (
        <ActivityAnalysisAG />
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
function LineChart({ prev, cur, upToMonth }: { prev: number[]; cur: number[]; upToMonth: number }) {
  const width = 320, height = 240, pad = 36
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const maxVal = Math.max(1, ...prev, ...cur)
  const x = (i: number) => pad + (i * (width - 2 * pad) / 11)
  const y = (v: number) => height - pad - (v / maxVal) * (height - 2 * pad)
  const toPath = (arr: number[], limit?: number) => {
    const used = months.filter(m => !limit || m <= limit)
    return used.map((m, idx) => `${idx === 0 ? 'M' : 'L'} ${x(m - 1)} ${y(arr[m - 1] || 0)}`).join(' ')
  }
  const ticks = 4
  const gridVals = Array.from({ length: ticks }, (_, i) => Math.round((i + 1) * maxVal / (ticks)))
  const fmtMil = (v: number) => `${Math.round((v || 0) / 1_000_000)}`
  const fmtMilLabel = (v: number) => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(((v || 0) / 1_000_000))

  // Hover tooltip disabled per request

  const COLORS = { prev: '#64748b', cur: '#2563eb' }

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`}>
      <rect x={0} y={0} width={width} height={height} fill="transparent" />
      {/* Y grid and labels (백만원 단위) */}
      {gridVals.map((v, i) => {
        const yy = y(v)
        return (
          <g key={i}>
            <line x1={pad} y1={yy} x2={width - pad} y2={yy} stroke="var(--border)" />
            <text x={pad - 6} y={yy + 2} textAnchor="end" fontSize={4} fill="var(--muted)">{fmtMil(v)}</text>
          </g>
        )
      })}
      <text x={4} y={10} fontSize={4} fill="var(--muted)">단위: 백만원</text>
      {/* Series */}
      <path d={toPath(prev)} fill="none" stroke={COLORS.prev} strokeWidth={2} />
      <path d={toPath(cur, upToMonth)} fill="none" stroke={COLORS.cur} strokeWidth={2} />
      {/* Data labels (백만원 단위) */}
      {months.map((m) => {
        const v = prev[m - 1] || 0
        const yy = y(v) - 4
        return <text key={`p-${m}`} x={x(m - 1)} y={yy} textAnchor="middle" fontSize={4} fill={COLORS.prev}>{fmtMilLabel(v)}</text>
      })}
      {months.filter(mm => mm <= upToMonth).map((m) => {
        const v = cur[m - 1] || 0
        const yy = y(v) - 4
        return <text key={`c-${m}`} x={x(m - 1)} y={yy - 6} textAnchor="middle" fontSize={4} fill={COLORS.cur}>{fmtMilLabel(v)}</text>
      })}
      {/* Month labels */}
      {months.map((m) => (
        <text key={m} x={x(m - 1)} y={height - 6} textAnchor="middle" fontSize={4} fill="var(--muted)">{m}월</text>
      ))}
      {/* Legend */}
      <g>
        <circle cx={width - pad - 88} cy={14} r={4} fill={COLORS.prev} />
        <text x={width - pad - 78} y={18} fontSize={4} fill="var(--muted)">전년</text>
        <circle cx={width - pad - 34} cy={14} r={4} fill={COLORS.cur} />
        <text x={width - pad - 24} y={18} fontSize={4} fill="var(--muted)">올해</text>
      </g>
      {/* Hover tooltip removed */}
    </svg>
  )
}

function DailyBars({ prev, cur, upToDay }: { prev: number[]; cur: number[]; upToDay: number }) {
  const width = 320, height = 240, pad = 36
  const days = 31
  const maxVal = Math.max(1, ...prev, ...cur)
  const groupW = (width - 2 * pad) / days
  const barW = Math.max(1, Math.floor(groupW * 0.35))
  const x = (i: number) => pad + i * groupW
  const y = (v: number) => height - pad - (v / maxVal) * (height - 2 * pad)
  const fmtMil = (v: number) => `${Math.round((v || 0) / 1_000_000)}`
  const ticksX = Array.from({ length: days }, (_, i) => i + 1)
  const ticksYVals = Array.from({ length: 4 }, (_, i) => Math.round((i + 1) * maxVal / 4))

  const [hover, setHover] = React.useState<number | null>(null)
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = (e.currentTarget as SVGSVGElement)
    const rect = svg.getBoundingClientRect()
    const rx = e.clientX - rect.left
    const localX = Math.max(0, Math.min(width - 2 * pad, rx - pad))
    const idx = Math.max(0, Math.min(days - 1, Math.floor(localX / groupW)))
    setHover(idx)
  }

  const COLORS = { prev: '#94a3b8', cur: '#3b82f6' }

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <rect x={0} y={0} width={width} height={height} fill="transparent" />
      {/* Y grid and labels */}
      {ticksYVals.map((v, i) => {
        const yy = y(v)
        return (
          <g key={i}>
            <line x1={pad} y1={yy} x2={width - pad} y2={yy} stroke="var(--border)" />
            <text x={pad - 6} y={yy + 2} textAnchor="end" fontSize={4} fill="var(--muted)">{fmtMil(v)}</text>
          </g>
        )
      })}
      <text x={4} y={10} fontSize={4} fill="var(--muted)">단위: 백만원</text>
      {/* Bars */}
      {Array.from({ length: days }, (_, i) => i).map(i => {
        const px = x(i)
        const hPrev = (height - pad) - y(prev[i] || 0)
        const hCur = (height - pad) - y(cur[i] || 0)
        return (
          <g key={i}>
            <rect x={px - barW - 1} y={y(prev[i] || 0)} width={barW} height={hPrev} fill={COLORS.prev} />
            <rect x={px + 1} y={y(cur[i] || 0)} width={barW} height={hCur} fill={COLORS.cur} />
          </g>
        )
      })}
      {/* X ticks */}
      {ticksX.map((d) => (
        <text key={d} x={x(d - 1)} y={height - 8} textAnchor="middle" fontSize={3} fill="var(--muted)">{d}</text>
      ))}
      {/* Legend */}
      <g>
        <rect x={width - pad - 90} y={8} width={8} height={8} fill={COLORS.prev} />
        <text x={width - pad - 76} y={16} fontSize={4} fill="var(--muted)">전년</text>
        <rect x={width - pad - 40} y={8} width={8} height={8} fill={COLORS.cur} />
        <text x={width - pad - 26} y={16} fontSize={4} fill="var(--muted)">올해</text>
      </g>
      {/* Tooltip */}
      {hover != null && hover < days && (
        <g>
          <line x1={x(hover)} y1={pad - 4} x2={x(hover)} y2={height - pad + 4} stroke="var(--border)" />
          <g transform={`translate(${Math.min(width - pad - 110, Math.max(pad, x(hover) - 55))}, ${pad})`}>
            <rect x={0} y={0} width={110} height={38} rx={6} fill="var(--panel)" stroke="var(--border)" />
            <text x={6} y={12} fontSize={4} fill="var(--muted)">{hover + 1}일</text>
            <text x={6} y={22} fontSize={4} fill={COLORS.prev}>전년 {fmtMil(prev[hover] || 0)}</text>
            <text x={6} y={32} fontSize={4} fill={COLORS.cur}>올해 {hover + 1 <= upToDay ? fmtMil(cur[hover] || 0) : '-'}</text>
          </g>
        </g>
      )}
    </svg>
  )
}
