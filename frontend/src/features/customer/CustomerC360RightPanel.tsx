import React, { useEffect, useMemo, useRef, useState } from 'react'

type MonthlyRow = { month: number; amount: number }

function yearOptions(): number[] {
  const arr: number[] = []
  for (let y = 2030; y >= 2022; y--) arr.push(y)
  return arr
}

export function CustomerC360RightPanel() {
  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState<number>(thisYear)
  const [cust, setCust] = useState<any>(() => {
    try { const raw = localStorage.getItem('tnt.sales.selectedCustomer'); return raw ? JSON.parse(raw) : null } catch { return null }
  })
  const [rows, setRows] = useState<MonthlyRow[]>([])
  const [prevRows, setPrevRows] = useState<MonthlyRow[]>([])
  const chartRef = useRef<HTMLDivElement | null>(null)
  const [chartW, setChartW] = useState<number>(0)
  const [centers, setCenters] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!cust || !cust.customerSeq) { setRows([]); setPrevRows([]); return }
    setLoading(true); setError(null)
    try {
      const [rCur, rPrev] = await Promise.all([
        fetch(`/api/v1/customers/${cust.customerSeq}/invoice-monthly?year=${year}`),
        fetch(`/api/v1/customers/${cust.customerSeq}/invoice-monthly?year=${year - 1}`),
      ])
      const dataCur = rCur.ok ? await rCur.json() : []
      const dataPrev = rPrev.ok ? await rPrev.json() : []
      // Aggregate per month for both years
      const aggCur: Record<number, number> = {}
      const aggPrev: Record<number, number> = {}
      if (Array.isArray(dataCur)) {
        for (const x of dataCur) {
          const m = Number(x?.month ?? 0)
          const amt = Number(x?.amount ?? 0)
          if (!Number.isFinite(m) || !Number.isFinite(amt)) continue
          aggCur[m] = (aggCur[m] || 0) + amt
        }
      }
      if (Array.isArray(dataPrev)) {
        for (const x of dataPrev) {
          const m = Number(x?.month ?? 0)
          const amt = Number(x?.amount ?? 0)
          if (!Number.isFinite(m) || !Number.isFinite(amt)) continue
          aggPrev[m] = (aggPrev[m] || 0) + amt
        }
      }
      const outCur: MonthlyRow[] = []
      const outPrev: MonthlyRow[] = []
      for (let m = 1; m <= 12; m++) {
        outCur.push({ month: m, amount: aggCur[m] || 0 })
        outPrev.push({ month: m, amount: aggPrev[m] || 0 })
      }
      setRows(outCur)
      setPrevRows(outPrev)
    } catch (e: any) {
      setError(e?.message || '월별 매출 조회 중 오류')
      setRows([])
      setPrevRows([])
    } finally { setLoading(false) }
  }

  useEffect(() => {
    const onSel = () => {
      try { const raw = localStorage.getItem('tnt.sales.selectedCustomer'); setCust(raw ? JSON.parse(raw) : null) } catch { setCust(null) }
    }
    window.addEventListener('tnt.sales.customer.selected' as any, onSel)
    return () => window.removeEventListener('tnt.sales.customer.selected' as any, onSel)
  }, [])

  useEffect(() => { load() }, [cust?.customerSeq, year])

  useEffect(() => {
    const el = chartRef.current
    if (!el) return
    const update = () => setChartW(el.clientWidth || 0)
    update()
    let ro: ResizeObserver | null = null
    try {
      // @ts-ignore
      ro = new ResizeObserver(() => update())
      ro.observe(el)
    } catch {
      window.addEventListener('resize', update)
    }
    return () => {
      if (ro) ro.disconnect()
      else window.removeEventListener('resize', update)
    }
  }, [])

  // Recompute bar center positions whenever rows render or width changes
  useEffect(() => {
    const el = chartRef.current
    if (!el) return
    const out: number[] = new Array(12).fill(0)
    const rect = el.getBoundingClientRect()
    // Find each month's column by data attribute
    for (let m = 1; m <= 12; m++) {
      const col = el.querySelector(`[data-month="${m}"]`) as HTMLElement | null
      if (!col) continue
      const r = col.getBoundingClientRect()
      const centerPx = (r.left - rect.left) + (r.width / 2)
      out[m - 1] = centerPx
    }
    setCenters(out)
  }, [rows, chartW])

  const maxAmt = useMemo(() => rows.reduce((mx, r) => Math.max(mx, r.amount), 0), [rows])
  const maxPrev = useMemo(() => prevRows.reduce((mx, r) => Math.max(mx, r.amount), 0), [prevRows])
  const maxBoth = Math.max(maxAmt, maxPrev)
  const fmt = new Intl.NumberFormat('ko-KR')
  const fmtMil = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 })
  const accentColor = (typeof window !== 'undefined') ? getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() : '#93c5fd'
  const prevColor = '#ef4444'
  const sumCur = useMemo(() => rows.reduce((s, r) => s + (Number(r?.amount) || 0), 0), [rows])
  const sumPrev = useMemo(() => prevRows.reduce((s, r) => s + (Number(r?.amount) || 0), 0), [prevRows])

  return (
    <div className="card" style={{ padding: 12, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <strong>월별 매출</strong>
        <select className="search-input" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 120 }}>
          {yearOptions().map((y) => (
            <option key={y} value={y}>{y}년</option>
          ))}
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>단위: 백만원</span>
      </div>
      {(!cust || !cust.customerSeq) ? (
        <div className="empty-state">거래처를 선택하세요</div>
      ) : loading ? (
        <div className="empty-state">불러오는 중…</div>
      ) : error ? (
        <div className="empty-state">{error}</div>
      ) : (
        <div style={{ marginTop: 38 }}>
          {/* Legend: current year (bar) vs previous year (diamond) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span aria-hidden style={{ width: 20, height: 12, background: accentColor, display: 'inline-block' }} />
              <span className="muted" style={{ fontSize: 12 }}>{year}년</span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden style={{ display: 'inline-block' }}>
                <polygon points="10,2 18,10 10,18 2,10" fill={prevColor} fillOpacity="0.9" />
              </svg>
              <span className="muted" style={{ fontSize: 12 }}>{year - 1}년</span>
            </div>
          </div>
          {/* Single-SVG chart to guarantee alignment of bars and previous-year markers */}
          {(() => {
            const vbW = 1200
            const topPad = 10
            const chartH = 160 // drawable height
            const monthLabelFont = 27
            const monthLabelPad = 6 // gap between baseline and month label top
            const baseY = topPad + chartH
            const vbH = baseY + monthLabelFont + monthLabelPad
            const slotW = vbW / 12
            const barW = Math.floor(slotW * 0.55)
            const prevColor = '#ef4444'
            const cssAccent = (typeof window !== 'undefined') ? getComputedStyle(document.documentElement).getPropertyValue('--accent') : ''
            const barColor = cssAccent?.trim() || '#93c5fd'

            const children: React.ReactNode[] = []

            // Baseline
            children.push(<line key="baseline" x1={0} y1={baseY} x2={vbW} y2={baseY} stroke="var(--border)" />)

            for (let i = 0; i < 12; i++) {
              const m = i + 1
              const curAmt = rows.find(r => r.month === m)?.amount ?? 0
              const prevAmt = prevRows.find(r => r.month === m)?.amount ?? 0
              const cx = (i + 0.5) * slotW
              const h = maxBoth > 0 ? Math.max(2, Math.round((curAmt / maxBoth) * chartH)) : 2
              const x = Math.round(cx - barW / 2)
              const y = Math.round(baseY - h)
              // Bar (current year)
              children.push(<rect key={`b-${m}`} x={x} y={y} width={barW} height={h} fill={barColor} />)
              // Label at bottom of bar (millions)
              children.push(<text key={`bl-${m}`} x={cx} y={baseY - 6} textAnchor="middle" fontSize={20} fill="#64748b">{fmtMil.format(curAmt / 1_000_000)}</text>)
              // Previous year diamond marker + value
              const py = baseY - (maxBoth > 0 ? Math.round((prevAmt / maxBoth) * chartH) : 0)
              const dy = Math.min(baseY - 2, Math.max(6, py))
                const s = 10
                const pts = `${Math.round(cx)},${Math.round(dy - s)} ${Math.round(cx + s)},${Math.round(dy)} ${Math.round(cx)},${Math.round(dy + s)} ${Math.round(cx - s)},${Math.round(dy)}`
                children.push(
                  <g key={`p-${m}`}>
                    <polygon points={pts} fill={prevColor} fillOpacity="0.9" />
                    <text x={cx} y={Math.max(16, dy - 16)} textAnchor="middle" fontSize={20} fill={prevColor}>{fmtMil.format(prevAmt / 1_000_000)}</text>
                  </g>
                )
              // Month labels under baseline (bigger and bold) - very tight to bottom
              children.push(
                <text
                  key={`m-${m}`}
                  x={cx}
                  y={baseY + monthLabelPad}
                  textAnchor="middle"
                  dominantBaseline="hanging"
                  fontSize={monthLabelFont}
                  fontWeight={700}
                  fill="var(--muted)"
                >
                  {String(m).padStart(2, '0')}
                </text>
              )
            }

            return (
              <svg viewBox={`0 0 ${vbW} ${vbH}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: vbH }}>
                {children}
              </svg>
            )
          })()}
          <div style={{ marginTop: 0, fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span aria-hidden style={{ width: 20, height: 12, background: accentColor, display: 'inline-block' }} />
              <span>{year}년 총액: {fmt.format(sumCur)} 원</span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden style={{ display: 'inline-block' }}>
                <polygon points="10,2 18,10 10,18 2,10" fill={prevColor} fillOpacity="0.9" />
              </svg>
              <span>{year - 1}년 총액: {fmt.format(sumPrev)} 원</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
