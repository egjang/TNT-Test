import React, { useEffect, useMemo, useState } from 'react'
import { tone } from '../../ui/tone'

function fmt(input?: string | Date | null): string {
  if (!input) return ''
  const d = input instanceof Date ? input : new Date(input)
  if (isNaN(d.getTime())) return ''
  const yy = String(d.getFullYear() % 100).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yy}-${mm}-${dd} ${hh}:${mi}`
}

type Customer = {
  id: number
  companySeq?: number
  customerSeq?: number
  customerId: string
  customerName: string
  customerFullName?: string
  customerStatusSeq?: number
  bizNo?: string
  ownerName?: string
  bizKind?: string
  bizType?: string
  telNo?: string
  empSeq?: number
  wkDeptSeq?: number
  deptSeq?: number
  addrProvinceSeq?: number
  customerTypeName?: string
  customerTypeSeq?: number
  addrProvinceName?: string
  addrCitySeq?: number
  addrCityName?: string
  customerRemark?: string
  createdBy?: number
  updatedBy?: number
  createdAt?: string
  updatedAt?: string
  empName?: string
  deptName?: string
}

// Copy of CustomerSearch for Sales Plan usage
export function SalesPlan() {
  // Simplified UI: no search conditions per requirements
  const [q, setQ] = useState('') // unused
  const [provinceName, setProvinceName] = useState('') // unused
  const [cityName, setCityName] = useState('') // unused
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Customer[]>([])
  const [mineOnly, setMineOnly] = useState(false)
  const [companyType, setCompanyType] = useState<'TNT'|'DYS'>('TNT')
  const [menu, setMenu] = useState<{ open: boolean; x: number; y: number; row?: Customer }>({ open: false, x: 0, y: 0 })
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [bubble, setBubble] = useState<{ open: boolean; x: number; y: number; row?: Customer; loading?: boolean; error?: string | null; data?: any[] }>({ open: false, x: 0, y: 0 })
  const [active, setActive] = useState<Customer | undefined>(undefined)
  const [simStep, setSimStep] = useState<'init' | 'sim' | 'apply' | 'confirm'>('init')
  const [recentMap, setRecentMap] = useState<Record<number, boolean>>({})
  const stepOrder: Array<'init' | 'sim' | 'apply' | 'confirm'> = ['init', 'sim', 'apply', 'confirm']
  const steps: Array<{ key: 'init'|'sim'|'apply'|'confirm'; label: string }> = [
    { key: 'init', label: '초기설정' },
    { key: 'sim', label: 'Simulation' },
    { key: 'apply', label: '목표반영' },
    { key: 'confirm', label: '확정' },
  ]
  const curIdx = stepOrder.indexOf(simStep)
  const goPrev = () => { const i = Math.max(0, curIdx - 1); setSimStep(stepOrder[i]) }
  const goNext = () => { const i = Math.min(stepOrder.length - 1, curIdx + 1); setSimStep(stepOrder[i]) }

  // 기준매출: 선택된 거래처의 월별 매출 총액(전년/최근2년/최근3년 합산) 표시
  type InitRow = { month: number; amount: number }
  const [initLoading, setInitLoading] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const currentYear = new Date().getFullYear()
  const [basePeriod, setBasePeriod] = useState<'prev1' | 'last2' | 'last3'>('prev1')
  const [monthly, setMonthly] = useState<number[]>(() => new Array(12).fill(0))
  const [recentFlag, setRecentFlag] = useState<{ loading: boolean; hasRecent?: boolean; error?: string | null }>({ loading: false })
  async function loadInitData() {
    if (!active?.customerSeq) { setMonthly(new Array(12).fill(0)); return }
    setInitLoading(true); setInitError(null)
    try {
      const y = new Date().getFullYear()
      const years = basePeriod === 'prev1' ? [y - 1] : (basePeriod === 'last2' ? [y - 1, y - 2] : [y - 1, y - 2, y - 3])
      const all: InitRow[] = []
      await Promise.all(years.map(async (yy) => {
        try {
          const res = await fetch(`/api/v1/customers/${active.customerSeq}/invoice-monthly?year=${yy}`)
          if (!res.ok) return
          const data = await res.json().catch(() => [])
          const rows: InitRow[] = (Array.isArray(data) ? data : []).map((r: any) => ({
            month: Number(r.month ?? 0),
            amount: Number(r.amount ?? 0),
          }))
          all.push(...rows)
        } catch {}
      }))
      // Aggregate to monthly totals (1..12)
      const totals = new Array(12).fill(0)
      for (const r of all) {
        const m = Math.min(12, Math.max(1, Number(r.month) || 0)) - 1
        totals[m] += Number.isFinite(r.amount) ? Number(r.amount) : 0
      }
      setMonthly(totals)
    } catch (e: any) {
      setInitError(e.message || '조회 중 오류가 발생했습니다')
      setMonthly(new Array(12).fill(0))
    } finally {
      setInitLoading(false)
    }
  }
  useEffect(() => {
    if (simStep === 'init') loadInitData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simStep, active?.customerSeq, basePeriod])

  // Years dropdown removed; base period toggle controls fetching

  // Debug: recent invoice existence flag for selected customer (last 2 years)
  async function loadRecentFlag() {
    if (!active?.customerSeq) { setRecentFlag({ loading: false, hasRecent: undefined, error: null }); return }
    setRecentFlag({ loading: true, hasRecent: undefined, error: null })
    try {
      const url = new URL('/api/v1/customers/recent-invoice-flags', window.location.origin)
      url.searchParams.set('custSeq', String(active.customerSeq))
      url.searchParams.set('years', '2')
      const res = await fetch(url.toString())
      if (!res.ok) { let msg = `HTTP ${res.status}`; try { const d = await res.json(); if (d?.error) msg = d.error } catch {}; throw new Error(msg) }
      const arr = await res.json()
      const has = Array.isArray(arr) && arr.some((x: any) => Number(x?.customerSeq || x?.customerSeqText || 0) === Number(active.customerSeq) && !!x?.hasRecent)
      setRecentFlag({ loading: false, hasRecent: has, error: null })
    } catch (e: any) {
      setRecentFlag({ loading: false, hasRecent: undefined, error: e.message || '오류' })
    }
  }

  useEffect(() => {
    if (simStep === 'init') loadRecentFlag()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simStep, active?.customerSeq])

  const monthlyTable = useMemo(() => {
    return (
      <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: 8, marginTop: 8 }}>
        <table className="table" style={{ width: '100%' }}>
          <thead>
            <tr>
              {Array.from({ length: 12 }, (_, i) => (
                <th key={i} style={{ width: 100, textAlign: 'right' }}>{String(i+1).padStart(2, '0')}월</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {monthly.map((v, i) => (
                <td key={i} style={{ textAlign: 'right' }}>{Math.round(v).toLocaleString()}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    )
  }, [monthly])

  // Simulation: 내 할 목표 (sales_target_assigned) 조회
  function simYears() { const arr:number[] = []; for (let y=2030;y>=2026;y--) arr.push(y); return arr }
  const [simYear, setSimYear] = useState<number>(2030)
  const [simLoading, setSimLoading] = useState(false)
  const [simError, setSimError] = useState<string | null>(null)
  const [simAssigned, setSimAssigned] = useState<{ tnt: number; dys: number; tntStage?: string; dysStage?: string }>({ tnt:0, dys:0 })
  const nf = new Intl.NumberFormat('ko-KR')
  async function loadMyAssigned() {
    setSimLoading(true); setSimError(null)
    try {
      const myName = localStorage.getItem('tnt.sales.empName')?.trim() || ''
      if (!myName) { setSimAssigned({ tnt:0, dys:0 }); setSimError('로그인이 필요합니다'); return }
      const url = new URL('/api/v1/targets/assigned', window.location.origin)
      url.searchParams.set('year', String(simYear))
      url.searchParams.set('empNames', myName)
      try {
        const mode = (localStorage.getItem('tnt.sales.assign.mode') || '').toLowerCase()
        const ver = mode === 'moderate' ? '2' : (mode === 'best' ? '1' : '')
        if (ver) url.searchParams.set('versionNo', ver)
      } catch {}
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const arr = await res.json().catch(()=>[])
      const tntRow = Array.isArray(arr) ? arr.find((r:any)=> String(r.company_name||'').toUpperCase()==='TNT') : null
      const dysRow = Array.isArray(arr) ? arr.find((r:any)=> String(r.company_name||'').toUpperCase()==='DYS') : null
      setSimAssigned({
        tnt: Math.round(Number(tntRow?.assigned_amount||0)),
        dys: Math.round(Number(dysRow?.assigned_amount||0)),
        tntStage: String(tntRow?.target_stage||'').trim() || undefined,
        dysStage: String(dysRow?.target_stage||'').trim() || undefined,
      })
    } catch (e:any) { setSimError(e?.message || '조회 오류'); setSimAssigned({ tnt:0, dys:0 }) }
    finally { setSimLoading(false) }
  }
  useEffect(() => { if (simStep==='sim') loadMyAssigned() }, [simStep, simYear])
  // Also load my assigned totals for header display regardless of step
  useEffect(() => { loadMyAssigned() }, [simYear])

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleAll(checked: boolean) {
    if (!checked) { setSelected(new Set()); return }
    const all = new Set<string>()
    items.forEach(it => { if (it.customerId) all.add(it.customerId) })
    setSelected(all)
  }

  async function runSearch() {
    setError(null)
    setLoading(true)
    try {
      const savedAssigneeId = localStorage.getItem('tnt.sales.assigneeId')
      if (!savedAssigneeId) {
        setItems([])
        setError(tone.loginRequired)
        return
      }
      const url = new URL('/api/v1/customers', window.location.origin)
      // Always restrict to logged-in user's customers
      url.searchParams.set('mineOnly', 'true')
      url.searchParams.set('assigneeId', savedAssigneeId)
      url.searchParams.set('companyType', companyType)
      const res = await fetch(url.toString())
      if (!res.ok) {
        let msg = `HTTP ${res.status}`
        try {
          const data = await res.json()
          if (data?.error) msg = data.error
        } catch (_) {
          const txt = await res.text()
          if (txt) msg = txt
        }
        throw new Error(msg)
      }
      const data = await res.json()
      const list: Customer[] = Array.isArray(data) ? data : []
      setItems(list)
      // Fetch recent invoice flags (last 2 years) for visible customers
      try {
        const seqs = list.map(it => Number((it as any).customerSeq || 0)).filter(v => Number.isFinite(v) && v > 0)
        if (seqs.length > 0) {
          const url2 = new URL('/api/v1/customers/recent-invoice-flags', window.location.origin)
          url2.searchParams.set('custSeq', Array.from(new Set(seqs)).join(','))
          url2.searchParams.set('years', '2')
          const r2 = await fetch(url2.toString())
          if (r2.ok) {
            const arr = await r2.json()
            const map: Record<number, boolean> = {}
            if (Array.isArray(arr)) {
              arr.forEach((x: any) => { const k = Number(x?.customerSeq || x?.customerSeqText || 0); if (Number.isFinite(k)) map[k] = !!x?.hasRecent })
            }
            setRecentMap(map)
          } else {
            setRecentMap({})
          }
        } else {
          setRecentMap({})
        }
      } catch { setRecentMap({}) }
    } catch (e: any) {
      setError(e.message || '조회 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runSearch()
  }, [])

  useEffect(() => {
    // Re-query when company type toggles
    runSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyType])

  useEffect(() => {
    if (!menu.open) return
    const onDocClick = () => setMenu({ open: false, x: 0, y: 0 })
    window.addEventListener('click', onDocClick)
    return () => window.removeEventListener('click', onDocClick)
  }, [menu.open])

  useEffect(() => {
    if (!menu.open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu({ open: false, x: 0, y: 0 }) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menu.open])

  useEffect(() => {
    if (!bubble.open) return
    const onDocClick = () => setBubble({ open: false, x: 0, y: 0 })
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setBubble({ open: false, x: 0, y: 0 }) }
    window.addEventListener('click', onDocClick)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('click', onDocClick); window.removeEventListener('keydown', onKey) }
  }, [bubble.open])

  useEffect(() => {
    const onKey = (e: any) => {
      const isEsc = e?.key === 'Escape' || e?.key === 'Esc' || e?.keyCode === 27
      if (isEsc) {
        setMenu({ open: false, x: 0, y: 0 })
        setBubble({ open: false, x: 0, y: 0 })
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [])

  async function showTntBubble(e: React.MouseEvent, row: Customer) {
    e.preventDefault(); e.stopPropagation()
    setMenu({ open: false, x: 0, y: 0 })
    const x = e.clientX, y = e.clientY
    // Show customer details in bubble (no extra fetch)
    setBubble({ open: true, x, y, row, loading: false, error: null, data: [] })
  }

  const table = useMemo(() => {
    return (
      <>
        {/* 회사구분 라디오 (거래처명 조회 위) */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom: 8 }}>
          <label style={{ display:'inline-flex', alignItems:'center', gap:6, cursor:'pointer' }}>
            <input type="radio" name="companyType" checked={companyType==='TNT'} onChange={()=>setCompanyType('TNT')} />
            <span>TNT</span>
          </label>
          <label style={{ display:'inline-flex', alignItems:'center', gap:6, cursor:'pointer' }}>
            <input type="radio" name="companyType" checked={companyType==='DYS'} onChange={()=>setCompanyType('DYS')} />
            <span>DYS</span>
          </label>
        </div>
        <div className="table-container" onClick={() => setMenu({ open: false, x: 0, y: 0 })} style={{ height: '100%', overflow: 'auto' }}>
        {items.length === 0 ? (
          <div className="empty-state">{tone.empty}</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 'auto' }}>거래처명</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr
                  key={idx}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActive(it); setBubble({ open: false, x: 0, y: 0 }) }}
                  onContextMenu={(e) => showTntBubble(e, it)}
                  aria-selected={active?.customerId === it.customerId ? true : undefined}
                  style={active?.customerId === it.customerId ? { background: 'var(--row-selected, rgba(0, 128, 255, 0.12))' } : undefined}
                >
                  <td>
                    {(() => {
                      const seq = Number((it as any).customerSeq || 0)
                      return recentMap[seq]
                        ? (<span>{it.customerName}{String.fromCharCode(160)}{String.fromCharCode(160)}$</span>)
                        : it.customerName
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {/* Context menu removed per requirement; right-click shows same bubble as left-click. */}
        {bubble.open && (
          <div
            className="context-menu"
            style={{ left: bubble.x + 6, top: bubble.y + 6, maxWidth: 420, padding: 8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 600, marginBottom: 6 }}>거래처 상세</div>
            {bubble.error ? (
              <div className="error" style={{ maxWidth: 380 }}>{bubble.error}</div>
            ) : (
              <table className="table" style={{ width: '100%' }}>
                <tbody>
                  <tr><th style={{ width: 110, textAlign: 'left' }}>거래처번호</th><td>{bubble.row?.customerId || ''}</td></tr>
                  <tr><th style={{ textAlign: 'left' }}>사업자번호</th><td>{bubble.row?.bizNo || ''}</td></tr>
                  <tr><th style={{ textAlign: 'left' }}>대표자명</th><td>{bubble.row?.ownerName || ''}</td></tr>
                  <tr><th style={{ textAlign: 'left' }}>업태</th><td>{bubble.row?.bizKind || ''}</td></tr>
                  <tr><th style={{ textAlign: 'left' }}>종목</th><td>{bubble.row?.bizType || ''}</td></tr>
                  <tr><th style={{ textAlign: 'left' }}>전화번호</th><td>{bubble.row?.telNo || ''}</td></tr>
                  <tr><th style={{ textAlign: 'left' }}>담당자명</th><td>{bubble.row?.empName || ''}</td></tr>
                  <tr><th style={{ textAlign: 'left' }}>부서명</th><td>{bubble.row?.deptName || ''}</td></tr>
                  <tr><th style={{ textAlign: 'left' }}>시/도</th><td>{bubble.row?.addrProvinceName || ''}</td></tr>
                  <tr><th style={{ textAlign: 'left' }}>시/군/구</th><td>{bubble.row?.addrCityName || ''}</td></tr>
                  <tr><th style={{ textAlign: 'left' }}>고객유형</th><td>{bubble.row?.customerTypeName || ''}</td></tr>
                  <tr><th style={{ textAlign: 'left' }}>비고</th><td>{bubble.row?.customerRemark || ''}</td></tr>
                  <tr><th style={{ textAlign: 'left' }}>생성자</th><td>{bubble.row?.createdBy ?? ''}</td></tr>
                  <tr><th style={{ textAlign: 'left' }}>수정자</th><td>{bubble.row?.updatedBy ?? ''}</td></tr>
                  <tr><th style={{ textAlign: 'left' }}>생성일시</th><td>{fmt(bubble.row?.createdAt)}</td></tr>
                  <tr><th style={{ textAlign: 'left' }}>수정일시</th><td>{fmt(bubble.row?.updatedAt)}</td></tr>
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
      </>
    )
  }, [items, menu, selected, bubble, active])

  return (
    <section>
      <div className="page-title" style={{ alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>목표 Simulation</h2>
        <div className="muted count-text" style={{ display:'flex', alignItems:'center', gap:12 }}>
          {items.length.toLocaleString()}개 거래처
          <span aria-hidden="true" style={{ opacity: .4 }}>|</span>
          <select className="search-input" value={simYear} onChange={(e)=> setSimYear(Number(e.target.value))} aria-label="목표년도">
            {simYears().map(y=> <option key={y} value={y}>{y}년</option>)}
          </select>
          <span className="badge" title="내 목표(TNT)">TNT: {nf.format(simAssigned.tnt)} 억</span>
          <span className="badge" title="내 목표(DYS)">DYS: {nf.format(simAssigned.dys)} 억</span>
        </div>
      </div>
      {error && <div className="error">{error || tone.errorGeneric}</div>}
      <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'stretch', height: 'calc(100vh - 140px)' }}>
        <div style={{ flex: '0 0 25%', maxWidth: '25%', minWidth: 240, height: '100%', overflow: 'auto' }}>
          {table}
        </div>
        <aside className="card" style={{ flex: '1 1 75%', maxWidth: '75%', height: '100%', padding: 12, overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 16 }}>
            {/* Horizontal stepper */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              {steps.map((s, i) => {
                const completed = i < curIdx
                const current = i === curIdx
                return (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: i === steps.length - 1 ? '0 0 auto' : '1 1 0' }}>
                    <div
                      title={s.label}
                      onClick={() => setSimStep(s.key)}
                      style={{
                        width: 22, height: 22, borderRadius: 999,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: completed || current ? 'var(--accent)' : 'transparent',
                        border: `2px solid ${completed || current ? 'var(--accent)' : 'var(--border)'}`,
                        color: completed || current ? 'var(--on-accent)' : 'var(--muted)',
                        cursor: 'pointer', flex: '0 0 auto'
                      }}
                      aria-current={current ? 'step' : undefined}
                    >
                      {completed ? '✓' : i + 1}
                    </div>
                    <div style={{ fontSize: 12, color: current ? 'var(--text)' : (completed ? 'var(--text)' : 'var(--muted)') , whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
                    {i < steps.length - 1 && (
                      <div style={{ height: 2, background: i < curIdx ? 'var(--accent)' : 'var(--border)', flex: 1, borderRadius: 2 }} />
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <button className="btn btn-icon" onClick={goPrev} disabled={curIdx === 0} aria-label="이전 단계" title="이전 단계">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button className="btn btn-icon" onClick={goNext} disabled={curIdx === steps.length - 1} aria-label="다음 단계" title="다음 단계">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
          {/* Removed guidance text per request */}
          {simStep === 'init' && (
            <section style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                  <b>기준매출</b>
                  <select
                    value={basePeriod}
                    onChange={(e) => setBasePeriod(e.target.value as any)}
                    style={{ height: 28, padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 12 }}
                    aria-label="기준 기간 선택"
                  >
                    <option value="prev1">전년</option>
                    <option value="last2">최근2년</option>
                    <option value="last3">최근3년</option>
                  </select>
                </div>
                {initError && <span className="error">{initError}</span>}
              </div>
              {/* 월별 기준매출 표 */}
              {initLoading ? (
                <div className="empty-state" style={{ marginTop: 8 }}>불러오는 중…</div>
              ) : (
                monthlyTable
              )}
            </section>
          )}
          {simStep === 'sim' && (
            <section style={{ marginTop: 12 }}>
              <div className="page-title" style={{ marginBottom: 8 }}>
                <h2 style={{ margin: 0 }}>목표 Simulation</h2>
                <div className="controls" style={{ gap: 8 }}>
                  <button className="btn btn-card btn-3d" onClick={loadMyAssigned} disabled={simLoading}>새로고침</button>
                </div>
              </div>
              {simError && <div className="error">{simError}</div>}
              {simLoading ? (
                <div className="empty-state">불러오는 중…</div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
                  <div className="card" style={{ padding: 12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: 6 }}>
                      <b>TNT</b>
                      {simAssigned.tntStage ? <span className="badge">{simAssigned.tntStage}</span> : null}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{nf.format(simAssigned.tnt)} 억원</div>
                  </div>
                  <div className="card" style={{ padding: 12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: 6 }}>
                      <b>DYS</b>
                      {simAssigned.dysStage ? <span className="badge">{simAssigned.dysStage}</span> : null}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{nf.format(simAssigned.dys)} 억원</div>
                  </div>
                  <div className="card" style={{ gridColumn:'1 / -1', padding: 12, display:'flex', justifyContent:'flex-end' }}>
                    <div style={{ fontSize: 16 }}>합계: <b>{nf.format(simAssigned.tnt + simAssigned.dys)} 억원</b></div>
                  </div>
                </div>
              )}
            </section>
          )}
        </aside>
      </div>
    </section>
  )
}
