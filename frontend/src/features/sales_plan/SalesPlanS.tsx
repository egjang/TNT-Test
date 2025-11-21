import React, { useEffect, useMemo, useState } from 'react'
import closeIcon from '../../assets/icons/close.svg'
import priceTagIcon from '../../assets/icons/price-tag.svg'
import { tone } from '../../ui/tone'
import { useDraggableModal } from '../../ui/useDraggableModal'

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

export function SalesPlanS() {
  const [q, setQ] = useState('')
  const [provinceName, setProvinceName] = useState('')
  const [cityName, setCityName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Customer[]>([])
  const [custNameQ, setCustNameQ] = useState('')
  const [mineOnly, setMineOnly] = useState(false)
  const [menu, setMenu] = useState<{ open: boolean; x: number; y: number; row?: Customer }>({ open: false, x: 0, y: 0 })
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [bubble, setBubble] = useState<{ open: boolean; x: number; y: number; row?: Customer; loading?: boolean; error?: string | null; data?: any[] }>({ open: false, x: 0, y: 0 })
  const [active, setActive] = useState<Customer | undefined>(undefined)
  const [simStep, setSimStep] = useState<'init' | 'sim' | 'confirm'>('init')
  const [recentMap, setRecentMap] = useState<Record<number, boolean>>({})
  const [companyType, setCompanyType] = useState<'TNT'|'DYS'>('TNT')
  const [stageMap, setStageMap] = useState<Record<number, string>>({})
  // Infinite scroll for customer list
  const PAGE_SIZE = 100
  const [pageOffset, setPageOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const listRef = React.useRef<HTMLDivElement | null>(null)
  const [totalMineCount, setTotalMineCount] = useState<number>(0)
  const [initInfo, setInitInfo] = useState<{ show:boolean; name:string; tnt:number; dys:number; year:number; label?:string; hasP?:boolean; hasC?:boolean; hasI?:boolean }>({ show:false, name:'', tnt:0, dys:0, year:0 })
  const [planStatusLoaded, setPlanStatusLoaded] = useState(false)
  const [myCounts, setMyCounts] = useState<{ tnt:number; dys:number }>({ tnt: 0, dys: 0 })
  const stepOrder: Array<'init' | 'sim' | 'confirm'> = ['init', 'sim', 'confirm']
  const steps: Array<{ key: 'init'|'sim'|'confirm'; label: string }> = [
    { key: 'init', label: '초기설정' },
    { key: 'sim', label: '계획 수립 중' },
    { key: 'confirm', label: '확정' },
  ]
  const curIdx = stepOrder.indexOf(simStep)
  // 단계는 자동 판정/직접 클릭으로만 이동 (선후 조정 버튼 제거)

  // My assigned (by emp_name) for Simulation header
  function simYears() { const arr:number[] = []; for (let y=2030;y>=2026;y--) arr.push(y); return arr }
  const [simYear, setSimYear] = useState<string>('')
  const [simLoading, setSimLoading] = useState(false)
  const [simError, setSimError] = useState<string | null>(null)
  const [simAssigned, setSimAssigned] = useState<{ tnt:number; dys:number; tntStage?:string; dysStage?:string }>({ tnt:0, dys:0 })
  // 계획 금액(표시만, 계산 로직은 추후 적용)
  const [simPlan, setSimPlan] = useState<{ tnt:number; dys:number }>({ tnt:0, dys:0 })
  const [planTotals, setPlanTotals] = useState<{ tnt:number; dys:number }>({ tnt:0, dys:0 })
  // 차액 금액(표시만, 계산 로직은 추후 적용)
  const [simDelta, setSimDelta] = useState<{ tnt:number; dys:number }>({ tnt:0, dys:0 })
  // Totals breakdown popup (TNT chip click)
  const [totalsPopup, setTotalsPopup] = useState<{ open:boolean; company:'TNT'|'DYS'; group:'customer'|'unit'; loading:boolean; error?:string|null; rows:Array<{ key:string; label?:string; amount:number }> }>({ open:false, company: 'TNT', group: 'customer', loading:false, error:null, rows: [] })
  const [lastClick, setLastClick] = useState<{ x:number; y:number }>({ x: 0, y: 0 })
  const nf = new Intl.NumberFormat('ko-KR')
  const nf2 = new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const [confirmMsg, setConfirmMsg] = useState<string|null>(null)
  // Plan remark (목표수립의견)
  const [planRemark, setPlanRemark] = useState<{ val:string; loading:boolean; saving:boolean; error:string|null; success:string|null }>({ val:'', loading:false, saving:false, error:null, success:null })
  async function loadPlanRemark() {
    try {
      const y = Number(simYear)
      const custSeq = Number((active as any)?.customerSeq || 0)
      const aid = (localStorage.getItem('tnt.sales.assigneeId') || '').trim()
      if (!aid || !Number.isFinite(y) || y<=0 || !custSeq) { setPlanRemark(prev=>({ ...prev, val:'', loading:false, error:null })); return }
      setPlanRemark(prev=>({ ...prev, loading:true, error:null }))
      const u = new URL('/api/v1/sales/plan/plan-remark', window.location.origin)
      u.searchParams.set('year', String(y))
      u.searchParams.set('customerSeq', String(custSeq))
      const res = await fetch(u.toString(), { headers: { 'X-ASSIGNEE-ID': aid } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const obj = await res.json().catch(()=> ({} as any))
      const txt = String((obj as any)?.remark ?? '')
      setPlanRemark({ val: txt, loading:false, saving:false, error:null, success:null })
    } catch (e:any) {
      setPlanRemark(prev=>({ ...prev, loading:false, error: e?.message || '조회 오류' }))
    }
  }
  async function savePlanRemark() {
    try {
      const y = Number(simYear)
      const custSeq = Number((active as any)?.customerSeq || 0)
      const aid = (localStorage.getItem('tnt.sales.assigneeId') || '').trim()
      if (!aid) { alert('로그인이 필요합니다.'); return }
      if (!Number.isFinite(y) || y<=0) { alert('연도를 선택하세요.'); return }
      if (!custSeq) { alert('거래처를 선택하세요.'); return }
      setPlanRemark(prev=>({ ...prev, saving:true, error:null, success:null }))
      const headers: Record<string,string> = { 'Content-Type': 'application/json', 'X-ASSIGNEE-ID': aid }
      const body = JSON.stringify({ year: y, customerSeq: custSeq, remark: planRemark.val })
      const res = await fetch('/api/v1/sales/plan/plan-remark', { method:'POST', headers, body })
      if (!res.ok) { let t = await res.text().catch(()=> ''); throw new Error(t||('HTTP '+res.status)) }
      setPlanRemark(prev=>({ ...prev, saving:false, success:'저장되었습니다.' }))
      setTimeout(()=> setPlanRemark(prev=>({ ...prev, success:null })), 1200)
    } catch (e:any) {
      setPlanRemark(prev=>({ ...prev, saving:false, error: e?.message || '저장 오류' }))
    }
  }
  useEffect(() => { if (active?.customerSeq && simYear) loadPlanRemark() }, [active?.customerSeq, simYear])
  async function confirmCustomerStage() {
    try {
      const y = Number(simYear)
      const aid = (localStorage.getItem('tnt.sales.assigneeId') || '').trim()
      const custSeq = Number((active as any)?.customerSeq || 0)
      if (!aid) { alert('로그인이 필요합니다.'); return }
      if (!Number.isFinite(y) || y<=0) { alert('연도를 선택하세요.'); return }
      if (!custSeq) { alert('거래처를 선택하세요.'); return }
      const payload = { year: y, companyType, assigneeId: aid, customerSeq: custSeq }
      const headers: Record<string,string> = { 'Content-Type': 'application/json', 'X-ASSIGNEE-ID': aid }
      const empId = (localStorage.getItem('tnt.sales.empId') || '').trim(); if (empId) headers['X-EMP-ID'] = empId
      const r = await fetch('/api/v1/sales/plan/confirm-customer', { method:'POST', headers, body: JSON.stringify(payload) })
      if (!r.ok) { let t=await r.text().catch(()=> ''); throw new Error(t||('HTTP '+r.status)) }
      await r.json().catch(()=> ({}))
      setSimStep('confirm')
      setRowsReloadTick(t => t+1)
      try {
        const custName = String((active as any)?.customerName || '')
        const yLabel = String(simYear || '')
        if (custName && yLabel) setConfirmMsg(`${custName} ${yLabel}년 목표 수립이 완료되었습니다.`)
        else setConfirmMsg(`목표 수립이 완료되었습니다.`)
      } catch { setConfirmMsg(`목표 수립이 완료되었습니다.`) }
    } catch (e:any) {
      alert(e?.message || '확정 처리 중 오류가 발생했습니다')
    }
  }
  // Global block/progress while initializing
  const [initWorking, setInitWorking] = useState(false)
  const [initMessage, setInitMessage] = useState<string>('')
  // Company tabs (TNT / DYS)
  const [activeCompanyTab, setActiveCompanyTab] = useState<'TNT'|'DYS'>('TNT')
  // Amount preview helper — replace logic once provided
  function computeAmount(qty:number, monthIndex:number): number {
    // TODO: replace with real amount calculation
    // Currently uses qty as-is for amount preview.
    return Number.isFinite(qty) ? qty : 0
  }
  function renderQtyAmtCell(q:number, i:number, amtOpt?: number, color?: string, bold?: boolean) {
    const qtyOk = Number.isFinite(q) && q>0
    const hasAmt = qtyOk && Number.isFinite(amtOpt as any)
    const amt = hasAmt ? Number(amtOpt) : (qtyOk ? computeAmount(q, i) : 0)
    const qtyStr = qtyOk ? nf2.format(Number(q)) : '-'
    const amtStr = qtyOk ? (hasAmt ? `${nf2.format(Number(amt))} 원` : '-') : ''
    return (
      <div style={{ textAlign:'right', lineHeight: 1.15, color: color || undefined }}>
        <div style={{ fontWeight: bold ? 700 as any : undefined }}>{qtyStr}</div>
        <div className={bold ? undefined : 'muted'} style={{ fontSize: 11, color: color || undefined, fontWeight: bold ? 700 as any : undefined }}>{amtStr}</div>
      </div>
    )
  }

  // Totals breakdown loader
  async function loadTotalsBreakdown(company: 'TNT'|'DYS', group: 'customer'|'unit') {
    try {
      const y = Number(simYear)
      const aid = (localStorage.getItem('tnt.sales.assigneeId') || '').trim()
      if (!aid || !Number.isFinite(y) || y<=0) { setTotalsPopup(prev=>({ ...prev, rows:[], error:null, loading:false })); return }
      setTotalsPopup(prev => ({ ...prev, loading:true, error:null }))
      const u = new URL('/api/v1/sales/plan/totals-breakdown', window.location.origin)
      u.searchParams.set('year', String(y))
      u.searchParams.set('assigneeId', aid)
      u.searchParams.set('companyType', company)
      u.searchParams.set('groupBy', group)
      const r = await fetch(u.toString())
      if (!r.ok) { let t = await r.text().catch(()=> ''); throw new Error(t||('HTTP '+r.status)) }
      const arr:any[] = await r.json().catch(()=> [])
      const rows = (Array.isArray(arr) ? arr : []).map(x => ({ key: String(x?.key ?? ''), label: (x?.label ? String(x.label) : undefined), amount: Number(x?.amount ?? 0) }))
      setTotalsPopup(prev => ({ ...prev, rows, loading:false, error:null }))
    } catch (e:any) {
      setTotalsPopup(prev => ({ ...prev, loading:false, error: e?.message || '조회 오류', rows: [] }))
    }
  }
  function openTotalsPopup(company:'TNT'|'DYS', e?: React.MouseEvent) {
    if (e) { try { setLastClick({ x: (e.clientX||0), y: (e.clientY||0) }) } catch {} }
    setTotalsPopup({ open:true, company, group:'customer', loading:false, error:null, rows: [] });
    loadTotalsBreakdown(company, 'customer')
  }
  function closeTotalsPopup() { setTotalsPopup(prev => ({ ...prev, open:false })) }
  async function loadMyAssigned() {
    setSimLoading(true); setSimError(null)
    try {
      const myName = (localStorage.getItem('tnt.sales.empName') || '').trim()
      if (!myName) { setSimAssigned({ tnt:0, dys:0 }); setSimError('로그인이 필요합니다'); return }
      if (!simYear || isNaN(Number(simYear))) { setSimAssigned({ tnt:0, dys:0 }); return }
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
  const [modeTick, setModeTick] = useState(0)
  useEffect(() => {
    const onMode = () => setModeTick((t) => t + 1)
    window.addEventListener('tnt.sales.assign.mode.changed' as any, onMode)
    return () => window.removeEventListener('tnt.sales.assign.mode.changed' as any, onMode)
  }, [])
  useEffect(() => { loadMyAssigned() }, [simYear, modeTick])
  useEffect(() => {
    (async () => {
      try {
        const y = Number(simYear)
        const aid = (localStorage.getItem('tnt.sales.assigneeId') || '').trim()
        if (!aid || !Number.isFinite(y) || y<=0) { setPlanTotals({ tnt:0, dys:0 }); return }
        const u = new URL('/api/v1/sales/plan/totals-by-assignee', window.location.origin)
        u.searchParams.set('year', String(y))
        u.searchParams.set('assigneeId', aid)
        const r = await fetch(u.toString())
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const arr = await r.json().catch(()=> [])
        let tnt=0, dys=0
        if (Array.isArray(arr)) {
          arr.forEach((x:any) => {
            const ct = String(x?.company_type || x?.companyType || '').toUpperCase()
            const amt = Number(x?.amount || 0)
            if (ct==='TNT') tnt += amt; else if (ct==='DYS') dys += amt
          })
        }
        setPlanTotals({ tnt: Math.round(tnt), dys: Math.round(dys) })
      } catch {
        setPlanTotals({ tnt:0, dys:0 })
      }
    })()
  }, [simYear])
  // Load plan status (sales_plan presence) on year change
  useEffect(() => {
    async function loadPlanStatus() {
      try {
        setPlanStatusLoaded(false)
        const y = Number(simYear)
        if (!Number.isFinite(y) || y<=0) { setInitInfo(prev=>({ ...prev, show:false })); setPlanStatusLoaded(true); return }
        const aid = localStorage.getItem('tnt.sales.assigneeId') || ''
        const eid = localStorage.getItem('tnt.sales.empId') || ''
        const u = new URL('/api/v1/sales/plan/status', window.location.origin)
        u.searchParams.set('year', String(y))
        if (aid) u.searchParams.set('assigneeId', aid)
        else if (eid) u.searchParams.set('empId', eid)
        const r = await fetch(u.toString())
        if (!r.ok) { setInitInfo(prev=>({ ...prev, show:false })); setPlanStatusLoaded(true); return }
        const o:any = await r.json().catch(()=> ({}))
        const name = (localStorage.getItem('tnt.sales.empName') || '').trim() || '사용자'
        const tnt = Number(o?.tnt || 0)
        const dys = Number(o?.dys || 0)
        const hasP = !!o?.hasP
        const hasC = !!o?.hasC
        const hasI = !!o?.hasI // treats stage 'I' or 'B' (backend)
        let label = ''
        if (hasC && !hasP && !hasI) label = '목표수립완료'
        else if (hasI && !hasP && !hasC) label = '초기설정완료'
        else if (hasP || (hasC && hasI)) label = '계획수립 중'
        setInitInfo({ show: !!label, name, tnt, dys, year: y, label, hasP, hasC, hasI })
        // Update current step based on sales_plan status for the user/year
        if (hasC && !hasP && !hasI) setSimStep('confirm')
        else if (hasP) setSimStep('sim')
        else if (hasI && !hasP && !hasC) setSimStep('init')
        else setSimStep('init')
        setPlanStatusLoaded(true)
      } catch (err:any) { setInitInfo(prev=>({ ...prev, show:false })); setPlanStatusLoaded(true) }
    }
    loadPlanStatus()
  }, [simYear])

  // Selected customer's monthly plan rows (by subcategory/unit) from sales_plan
  const [rowsReloadTick, setRowsReloadTick] = useState(0)
  const [custPlanRows, setCustPlanRows] = useState<{ loading:boolean; error?:string|null; rows:Array<{ sub:string; unit:string; months:number[]; amounts:number[]; type?:'P'|'B'; stage?:string }> }>({ loading:false, error:null, rows:[] })
  useEffect(() => {
    const seq = Number((active as any)?.customerSeq || 0)
    const y = Number(simYear)
    if (!seq || !Number.isFinite(y) || y<=0) { setCustPlanRows({ loading:false, error:null, rows:[] }); return }
    let stop = false
    ;(async () => {
      try {
        setCustPlanRows(prev => ({ ...prev, loading:true, error:null }))
        const aid = localStorage.getItem('tnt.sales.assigneeId') || ''
        const u = new URL('/api/v1/sales/plan/customer-monthly-rows', window.location.origin)
        u.searchParams.set('year', String(y))
        u.searchParams.set('customerSeq', String(seq))
        if (companyType) u.searchParams.set('companyType', companyType)
        if (aid) u.searchParams.set('assigneeId', aid)
        const r = await fetch(u.toString())
        if (!r.ok) { let msg = `HTTP ${r.status}`; try { const d=await r.json(); if (d?.error) msg=d.error } catch {}; throw new Error(msg) }
        const arr:any[] = await r.json().catch(()=> [])
        const rows = (Array.isArray(arr) ? arr : []).map((x:any) => ({
          sub: String(x?.item_subcategory ?? x?.itemSubcategory ?? ''),
          unit: String(x?.sales_mgmt_unit ?? x?.salesMgmtUnit ?? ''),
          months: Array.from({length:12},(_,i)=> Number(x?.[`qty_${String(i+1).padStart(2,'0')}`] ?? 0)),
          amounts: Array.from({length:12},(_,i)=> Number(x?.[`amount_${String(i+1).padStart(2,'0')}`] ?? 0)),
          type: (String(x?.plan_type || x?.planType || '').toUpperCase()==='P' ? 'P' : 'B'),
          stage: String(x?.target_stage || x?.targetStage || '').toUpperCase() || undefined,
        }))
        if (!stop) setCustPlanRows({ loading:false, error:null, rows })
      } catch (e:any) {
        if (!stop) setCustPlanRows({ loading:false, error: e?.message || '오류', rows:[] })
      }
    })()
    return () => { stop = true }
  }, [active?.customerSeq, simYear, companyType, rowsReloadTick])
  // Per-customer step status: derive from selected customer's rows
  useEffect(() => {
    try {
      const seq = Number((active as any)?.customerSeq || 0)
      if (!seq) return
      const rows:any[] = Array.isArray(custPlanRows.rows) ? custPlanRows.rows : []
      if (!rows.length) { setSimStep('init'); return }
      const hasP = rows.some(r => String((r as any)?.type || '').toUpperCase() === 'P')
      const stages = rows.map(r => String((r as any)?.stage || '').toUpperCase()).filter(Boolean)
      const allC = stages.length>0 && stages.every(s => s === 'C')
      if (allC) setSimStep('confirm')
      else if (hasP) setSimStep('sim')
      else setSimStep('init')
    } catch { /* ignore */ }
  }, [active?.customerSeq, custPlanRows.rows])
  // 기준매출 표 제거됨

  // Target input modal state and logic
  const [targetInput, setTargetInput] = useState<{ open:boolean; sub?:string; unit?:string; stage?:string; month?:string; qty?:string; dist:number[]; curMonths:number[]; curAmounts:number[]; success?: string|null }>({ open:false, dist: new Array(12).fill(0), curMonths: new Array(12).fill(0), curAmounts: new Array(12).fill(0), success: null })
  // Cache of avg unit prices by (assigneeId|companyType|year-1) => { unit: avg_price }
  const [avgUnitCache, setAvgUnitCache] = useState<Record<string, Record<string, number>>>({})
  // Global avg unit prices (companyType|prevYear)
  const [avgUnitGlobalCache, setAvgUnitGlobalCache] = useState<Record<string, Record<string, number>>>({})
  const [unitMetaCache, setUnitMetaCache] = useState<Record<string, Record<string, { itemUnit?: string; itemStdUnit?: string }>>>({})
  function normUnit(u?: string) { return String(u || '').trim().toUpperCase() }
  function avgPriceForUnitRaw(unit?: string): number|undefined {
    try {
      const k1 = avgKey(); const m1 = avgUnitCache[k1] || {}; const v1 = m1[normUnit(unit)]
      if (Number.isFinite(v1 as any) && Number(v1)>0) return Number(v1)
      const k2 = globalAvgKey(); const m2 = (avgUnitGlobalCache as any)?.[k2] || {}
      const v2 = m2[normUnit(unit)]
      return (Number.isFinite(v2 as any) && Number(v2)>0) ? Number(v2) : undefined
    } catch { return undefined }
  }
  function metaForUnitRaw(unit?: string): { itemUnit?: string; itemStdUnit?: string }|undefined {
    try { const key=avgKey(); const mm=unitMetaCache[key]||{}; return mm[normUnit(unit)] } catch { return undefined }
  }
  function avgKey() {
    const aid = (localStorage.getItem('tnt.sales.assigneeId') || '').trim()
    const y = Number(simYear)
    const fallbackPrev = (new Date().getFullYear() - 1)
    const prev = Number.isFinite(y) && y>0 ? (y - 1) : fallbackPrev
    const comp = companyType || ''
    return `${aid}|${comp}|${prev}`
  }
  async function ensureAvgUnitMap() {
    try {
      const key = avgKey()
      if (!key) return
      if (avgUnitCache[key]) return
      const [aid, comp, prevStr] = key.split('|')
      const prev = Number(prevStr)
      if (!aid || !comp || !Number.isFinite(prev) || prev <= 0) return
      const u = new URL('/api/v1/dashboard/avg-unit-price-by-emp', window.location.origin)
      u.searchParams.set('assigneeId', aid)
      u.searchParams.set('companyType', comp)
      u.searchParams.set('year', String(prev))
      const r = await fetch(u.toString())
      if (!r.ok) return
      const arr = await r.json().catch(()=> [])
      const map: Record<string, number> = {}
      const meta: Record<string, { itemUnit?: string; itemStdUnit?: string }> = {}
      if (Array.isArray(arr)) {
        arr.forEach((x:any) => {
          const unit = normUnit(x?.sales_mgmt_unit || x?.salesMgmtUnit)
          const avg = Number(x?.avg_unit_price || x?.avgUnitPrice || 0)
          if (unit) map[unit] = avg
          if (unit) meta[unit] = {
            itemUnit: String(x?.item_unit || x?.itemUnit || ''),
            itemStdUnit: String(x?.item_std_unit || x?.itemStdUnit || ''),
          }
        })
      }
      setAvgUnitCache(prevCache => ({ ...prevCache, [key]: map }))
      setUnitMetaCache(prev => ({ ...prev, [key]: meta }))
    } catch {}
  }
  // Global avg map key: companyType|prevYear
  function globalAvgKey() {
    const y = Number(simYear)
    const fallbackPrev = (new Date().getFullYear() - 1)
    const prev = Number.isFinite(y) && y>0 ? (y - 1) : fallbackPrev
    const comp = companyType || ''
    return `${comp}|${prev}`
  }
  // Ensure global average unit price map (no assignee filter)
  async function ensureGlobalAvgUnitMap() {
    try {
      const key = globalAvgKey()
      if (!key) return
      if (avgUnitGlobalCache[key]) return
      const [comp, prevStr] = key.split('|')
      const prev = Number(prevStr)
      if (!comp || !Number.isFinite(prev) || prev <= 0) return
      const u = new URL('/api/v1/dashboard/avg-unit-price', window.location.origin)
      u.searchParams.set('companyType', comp)
      u.searchParams.set('year', String(prev))
      const r = await fetch(u.toString())
      if (!r.ok) return
      const arr = await r.json().catch(()=> [])
      const map: Record<string, number> = {}
      if (Array.isArray(arr)) {
        arr.forEach((x:any) => {
          const unit = normUnit(x?.sales_mgmt_unit || x?.salesMgmtUnit)
          const avg = Number(x?.avg_unit_price || x?.avgUnitPrice || 0)
          if (unit) map[unit] = avg
        })
      }
      setAvgUnitGlobalCache(prevCache => ({ ...prevCache, [key]: map }))
    } catch {}
  }
  async function fetchGlobalAvgForUnit(selUnit: string) { try { await ensureGlobalAvgUnitMap() } catch {} }
  // Fetch/merge avg unit price for a single unit into cache (fallback when not present)
  async function fetchAvgForUnit(selUnit:string) {
    try {
      const key = avgKey();
      if (!key) return;
      const [aid, comp, prevStr] = key.split('|');
      const prev = Number(prevStr);
      if (!aid || !comp || !Number.isFinite(prev) || prev <= 0) return;
      const u = new URL('/api/v1/dashboard/avg-unit-price-by-emp', window.location.origin)
      u.searchParams.set('assigneeId', aid)
      u.searchParams.set('companyType', comp)
      u.searchParams.set('year', String(prev))
      const r = await fetch(u.toString())
      if (!r.ok) return;
      const arr = await r.json().catch(()=> [])
      let found: any = null
      if (Array.isArray(arr)) {
        const unitKey = normUnit(selUnit)
        found = arr.find((x:any) => normUnit(x?.sales_mgmt_unit || x?.salesMgmtUnit) === unitKey)
      }
      if (found) {
        const unit = normUnit(found?.sales_mgmt_unit || found?.salesMgmtUnit)
        const avg = Number(found?.avg_unit_price || found?.avgUnitPrice || 0)
        const meta = {
          itemUnit: String(found?.item_unit || found?.itemUnit || ''),
          itemStdUnit: String(found?.item_std_unit || found?.itemStdUnit || ''),
        }
        setAvgUnitCache(prev => ({ ...prev, [key]: { ...(prev[key]||{}), [unit]: avg } }))
        setUnitMetaCache(prev => ({ ...prev, [key]: { ...(prev[key]||{}), [unit]: meta } }))
      }
    } catch {}
  }
  function openTargetInput(sub:string, unit:string) {
    const row = (custPlanRows.rows || []).find(r => r.sub === sub && r.unit === unit)
    const curMonths = row?.months ? row.months.slice() : new Array(12).fill(0)
    const curAmounts = (row as any)?.amounts ? (row as any).amounts.slice() : new Array(12).fill(0)
    setTargetInput({ open:true, sub, unit, stage: (row as any)?.stage, month:'', qty:'', dist: new Array(12).fill(0), curMonths, curAmounts, success: null })
    // Preload avg unit prices for preview amounts (my + global)
    try { ensureAvgUnitMap() } catch {}
    try { ensureGlobalAvgUnitMap() } catch {}
  }
  function closeTargetInput() { setTargetInput({ open:false, dist: new Array(12).fill(0), curMonths: new Array(12).fill(0), curAmounts: new Array(12).fill(0), success: null }) }
  function recomputeDistribution(monthStr?:string, qtyStr?:string) {
    const m = Number(monthStr)
    const q = Number(qtyStr)
    const arr = new Array(12).fill(0)
    if (Number.isFinite(m) && m>=1 && m<=12 && Number.isFinite(q) && q>0) {
      const cnt = 12 - m + 1
      const per = q / cnt
      for (let i=m-1;i<12;i++) arr[i] = per
    }
    setTargetInput(prev => ({ ...prev, month: monthStr, qty: qtyStr, dist: arr }))
  }

  async function commitTargetInput() {
    try {
      const y = Number(simYear)
      const comp = companyType
      const aid = (localStorage.getItem('tnt.sales.assigneeId') || '').trim()
      const custSeq = Number((active as any)?.customerSeq || 0)
      const sub = (targetInput.sub||'').trim()
      const unit = (targetInput.unit||'').trim()
      if (!Number.isFinite(y) || y<=0) { alert('연도를 선택하세요.'); return }
      if (!aid) { alert('로그인이 필요합니다.'); return }
      if (!custSeq || !sub || !unit) { alert('거래처/중분류/영업관리단위가 필요합니다.'); return }
      const qty = (targetInput.dist||[]).map(v => {
        const n = Number(v)
        if (!Number.isFinite(n) || n <= 0) return 0
        return Math.round(n * 100) / 100
      })
      // 허용: 매출월만 선택하고 수량 0인 경우에도 저장(분배 결과 0으로 upsert)
      if (!qty.some(v => v>0) && !(targetInput.month && Number(targetInput.month)>0)) {
        alert('매출월을 선택하세요.');
        return;
      }
      const payload = { year: y, companyType: comp, assigneeId: aid, customerSeq: custSeq, itemSubcategory: sub, salesMgmtUnit: unit, qty }
      const headers: Record<string,string> = { 'Content-Type': 'application/json', 'X-ASSIGNEE-ID': aid }
      const empId = (localStorage.getItem('tnt.sales.empId') || '').trim(); if (empId) headers['X-EMP-ID'] = empId
      const res = await fetch('/api/v1/sales/plan/upsert-row', { method: 'POST', headers, body: JSON.stringify(payload) })
      if (!res.ok) { let t = await res.text().catch(()=> ''); throw new Error(t||('HTTP '+res.status)) }
      setTargetInput(prev => ({ ...prev, success: '목표가 변경되었습니다' }))
    } catch (e:any) {
      alert(e?.message || '저장 중 오류가 발생했습니다')
    }
  }

  async function confirmAfterSave() {
    try {
      // Extra refresh to ensure latest data (e.g., stage changes)
      const y = Number(simYear)
      const aid = (localStorage.getItem('tnt.sales.assigneeId') || '').trim()
      const custSeq = Number((active as any)?.customerSeq || 0)
      if (Number.isFinite(y) && y>0 && aid && custSeq) {
        const u = new URL('/api/v1/sales/plan/customer-monthly-rows', window.location.origin)
        u.searchParams.set('year', String(y))
        u.searchParams.set('customerSeq', String(custSeq))
        if (companyType) u.searchParams.set('companyType', companyType)
        u.searchParams.set('assigneeId', aid)
        const r = await fetch(u.toString())
        if (r.ok) {
          const arr:any[] = await r.json().catch(()=> [])
          const rows = (Array.isArray(arr) ? arr : []).map((x:any) => ({
            sub: String(x?.item_subcategory ?? x?.itemSubcategory ?? ''),
            unit: String(x?.sales_mgmt_unit ?? x?.salesMgmtUnit ?? ''),
            months: Array.from({length:12},(_,i)=> Number(x?.[`qty_${String(i+1).padStart(2,'0')}`] ?? 0)),
            amounts: Array.from({length:12},(_,i)=> Number(x?.[`amount_${String(i+1).padStart(2,'0')}`] ?? 0)),
            type: (String(x?.plan_type || x?.planType || '').toUpperCase()==='P' ? 'P' : 'B'),
            stage: String(x?.target_stage || x?.targetStage || '').toUpperCase() || undefined,
          }))
          setCustPlanRows({ loading:false, error:null, rows })
        }
      }
    } catch {}
    // Close all related popups
    closeTargetInput()
    try { closeBulkInput() } catch {}
    try { closeBulkRatio() } catch {}
    try { closeNewItem() } catch {}
  }

  // Bulk input modal state and logic
  type BulkRow = { key:string; sub:string; unit:string; stage?:string; type?:'P'|'B'; month?:string; qty?:string; dist:number[]; curMonths:number[]; curAmounts:number[] }
  const [bulkInput, setBulkInput] = useState<{ open:boolean; rows:BulkRow[]; success?: string|null }>({ open:false, rows:[], success: null })
  function openBulkInput() {
    const rows: BulkRow[] = (custPlanRows.rows || []).map((g: any, i) => ({
      key: `${g.sub}||${g.unit}||${i}`,
      sub: g.sub,
      unit: g.unit,
      stage: (g as any).stage,
      type: (g as any).type,
      month:'', qty:'',
      dist: new Array(12).fill(0),
      curMonths: (g as any).months ? (g as any).months.slice() : new Array(12).fill(0),
      curAmounts: (g as any).amounts ? (g as any).amounts.slice() : new Array(12).fill(0),
    }))
    setBulkInput({ open:true, rows, success: null })
    try { ensureAvgUnitMap() } catch {}
    try { ensureGlobalAvgUnitMap() } catch {}
  }
  function closeBulkInput() { setBulkInput({ open:false, rows:[], success: null }) }
  function recomputeBulk(idx:number, monthStr?:string, qtyStr?:string) {
    setBulkInput(prev => {
      const rows = prev.rows.slice()
      const row = { ...rows[idx] }
      const m = Number(monthStr ?? row.month)
      const q = Number(qtyStr ?? row.qty)
      const arr = new Array(12).fill(0)
      if (Number.isFinite(m) && m>=1 && m<=12 && Number.isFinite(q) && q>0) {
        const cnt = 12 - m + 1
        const per = q / cnt
        for (let i=m-1;i<12;i++) arr[i] = per
      }
      row.month = monthStr ?? row.month
      row.qty = qtyStr ?? row.qty
      row.dist = arr
      rows[idx] = row
      return { ...prev, rows }
    })
  }
  async function commitBulkInput() {
    try {
      const y = Number(simYear)
      const comp = companyType
      const aid = (localStorage.getItem('tnt.sales.assigneeId') || '').trim()
      const custSeq = Number((active as any)?.customerSeq || 0)
      if (!Number.isFinite(y) || y<=0) { alert('연도를 선택하세요.'); return }
      if (!aid) { alert('로그인이 필요합니다.'); return }
      if (!custSeq) { alert('거래처를 선택하세요.'); return }
      const headers: Record<string,string> = { 'Content-Type': 'application/json', 'X-ASSIGNEE-ID': aid }
      const empId = (localStorage.getItem('tnt.sales.empId') || '').trim(); if (empId) headers['X-EMP-ID'] = empId
      // Filter rows with a selected month (save even if qty=0 as per requirement)
      const rowsToSave = (bulkInput.rows||[]).filter(r => !!r.month && Number(r.month)>0)
      if (rowsToSave.length===0) { alert('매출월을 선택한 행이 없습니다.'); return }
      for (const r of rowsToSave) {
        const m = Number(r.month)
        const q = Number(r.qty||0)
        const dist = new Array(12).fill(0)
        if (Number.isFinite(m) && m>=1 && m<=12) {
          const cnt = 12 - m + 1
          const per = (Number.isFinite(q) && q>0) ? (q / cnt) : 0
          for (let i=m-1;i<12;i++) dist[i] = per
        }
        const qty = dist.map(v => {
          const n = Number(v)
          if (!Number.isFinite(n) || n <= 0) return 0
          return Math.round(n * 100) / 100
        })
        const payload = { year: y, companyType: comp, assigneeId: aid, customerSeq: custSeq, itemSubcategory: r.sub, salesMgmtUnit: r.unit, qty }
        const res = await fetch('/api/v1/sales/plan/upsert-row', { method: 'POST', headers, body: JSON.stringify(payload) })
        if (!res.ok) { let t = await res.text().catch(()=> ''); throw new Error(t||('HTTP '+res.status)) }
      }
      setBulkInput(prev => ({ ...prev, success: '목표가 변경되었습니다' }))
    } catch (e:any) {
      alert(e?.message || '저장 중 오류가 발생했습니다')
    }
  }
  // Draggable modals (hooks must be called unconditionally after states are defined)
  // Position helper: bottom-center of viewport with a small margin
  function bottomCenterOfViewport(el: HTMLElement) {
    try {
      const rect = el.getBoundingClientRect()
      const w = rect?.width || el.offsetWidth || 600
      const h = rect?.height || el.offsetHeight || 400
      const x = Math.max(0, Math.round((window.innerWidth - w) / 2))
      const margin = 40
      const y = Math.max(0, Math.round(window.innerHeight - h - margin))
      return { x, y }
    } catch {
      const x = Math.max(0, Math.round((window.innerWidth - 600) / 2))
      const margin = 40
      const y = Math.max(0, Math.round(window.innerHeight - 400 - margin))
      return { x, y }
    }
  }
  // Center of viewport for modal initial position
  function centerOfViewport(el: HTMLElement) {
    try {
      const rect = el.getBoundingClientRect()
      const w = rect?.width || el.offsetWidth || 600
      const h = rect?.height || el.offsetHeight || 400
      const x = Math.max(0, Math.round((window.innerWidth - w) / 2))
      const y = Math.max(0, Math.round((window.innerHeight - h) / 2))
      return { x, y }
    } catch {
      const w = 600
      const h = 400
      const x = Math.max(0, Math.round((window.innerWidth - w) / 2))
      const y = Math.max(0, Math.round((window.innerHeight - h) / 2))
      return { x, y }
    }
  }
  // Initial position helper: right-docked vertical panel (66vh tall, aligned to right edge)
  function rightDockOfViewport(el: HTMLElement) {
    try {
      const rect = el.getBoundingClientRect()
      const w = rect?.width || el.offsetWidth || 460
      const x = Math.max(0, Math.round(window.innerWidth - w))
      const y = Math.max(0, Math.round(window.innerHeight * 0.17))
      return { x, y }
    } catch {
      const w = 460
      const x = Math.max(0, Math.round(window.innerWidth - w))
      const y = Math.max(0, Math.round(window.innerHeight * 0.17))
      return { x, y }
    }
  }
  const targetDrag = useDraggableModal('sales-plan-target-input', !!targetInput.open, bottomCenterOfViewport, { persist: false, resetOnOpen: true })
  const bulkDrag = useDraggableModal('sales-plan-bulk-input', !!bulkInput.open, centerOfViewport, { persist: false, resetOnOpen: true })
  
  // Bulk ratio modal: separate copy for future features
  type BulkRatioRow = { key:string; sub:string; unit:string; stage?:string; type?:'P'|'B'; month?:string; qty?:string; dist:number[]; curMonths:number[]; curAmounts:number[] }
  const [bulkRatio, setBulkRatio] = useState<{ open:boolean; rows:BulkRatioRow[]; success?: string|null }>({ open:false, rows:[], success: null })
  const [bulkRatioValue, setBulkRatioValue] = useState<string>('')
  function openBulkRatio() {
    const rows: BulkRatioRow[] = (custPlanRows.rows || []).map((g: any, i) => ({
      key: `${g.sub}||${g.unit}||${i}`,
      sub: g.sub,
      unit: g.unit,
      stage: (g as any).stage,
      type: (g as any).type,
      month:'', qty:'',
      dist: new Array(12).fill(0),
      curMonths: (g as any).months ? (g as any).months.slice() : new Array(12).fill(0),
      curAmounts: (g as any).amounts ? (g as any).amounts.slice() : new Array(12).fill(0),
    }))
    setBulkRatio({ open:true, rows, success: null })
    try { ensureAvgUnitMap() } catch {}
    try { ensureGlobalAvgUnitMap() } catch {}
  }
  function closeBulkRatio() { setBulkRatio({ open:false, rows:[], success: null }) }
  function applyBulkRatio() {
    const r = Number(bulkRatioValue)
    if (!Number.isFinite(r)) { alert('적용 비율(%)을 입력하세요.'); return }
    // e.g., 20 -> 120% => 1 + 0.20 = 1.2, 100 -> 200% => 2.0
    let ratio = 1 + (r / 100)
    if (!Number.isFinite(ratio) || ratio < 0) ratio = 0
    setBulkRatio(prev => {
      const rows = (prev.rows || []).map(row => {
        const cur = (row.curMonths || [])
        const dist = Array.from({ length: 12 }, (_, i) => {
          const v = Number(cur[i] || 0)
          return Number.isFinite(v) ? v * ratio : 0
        })
        return { ...row, dist }
      })
      return { ...prev, rows }
    })
  }
  function recomputeBulkRatio(idx:number, monthStr?:string, qtyStr?:string) {
    setBulkRatio(prev => {
      const rows = prev.rows.slice()
      const row = { ...rows[idx] }
      const m = Number(monthStr ?? row.month)
      const q = Number(qtyStr ?? row.qty)
      const arr = new Array(12).fill(0)
      if (Number.isFinite(m) && m>=1 && m<=12 && Number.isFinite(q) && q>0) {
        const cnt = 12 - m + 1
        const per = q / cnt
        for (let i=m-1;i<12;i++) arr[i] = per
      }
      row.month = monthStr ?? row.month
      row.qty = qtyStr ?? row.qty
      row.dist = arr
      rows[idx] = row
      return { ...prev, rows }
    })
  }
  const bulkRatioDrag = useDraggableModal('sales-plan-bulk-ratio', !!bulkRatio.open, centerOfViewport, { persist:false, resetOnOpen:true })
  async function commitBulkRatio() {
    try {
      const y = Number(simYear)
      const comp = companyType
      const aid = (localStorage.getItem('tnt.sales.assigneeId') || '').trim()
      const custSeq = Number((active as any)?.customerSeq || 0)
      if (!Number.isFinite(y) || y<=0) { alert('연도를 선택하세요.'); return }
      if (!aid) { alert('로그인이 필요합니다.'); return }
      if (!custSeq) { alert('거래처를 선택하세요.'); return }
      const headers: Record<string,string> = { 'Content-Type': 'application/json', 'X-ASSIGNEE-ID': aid }
      const empId = (localStorage.getItem('tnt.sales.empId') || '').trim(); if (empId) headers['X-EMP-ID'] = empId
      const rowsToSave = (bulkRatio.rows||[]).filter(r => (r.dist||[]).some(v => Number(v)>0))
      if (rowsToSave.length===0) { alert('적용 비율을 먼저 적용하세요.'); return }
      for (const r of rowsToSave) {
        const qty = (r.dist||[]).map(v => {
          const n = Number(v)
          if (!Number.isFinite(n) || n <= 0) return 0
          return Math.round(n * 100) / 100
        })
        const payload = { year: y, companyType: comp, assigneeId: aid, customerSeq: custSeq, itemSubcategory: r.sub, salesMgmtUnit: r.unit, qty }
        const res = await fetch('/api/v1/sales/plan/upsert-row', { method: 'POST', headers, body: JSON.stringify(payload) })
        if (!res.ok) { let t = await res.text().catch(()=> ''); throw new Error(t||('HTTP '+res.status)) }
      }
      setBulkRatio(prev => ({ ...prev, success: '목표가 변경되었습니다' }))
    } catch (e:any) {
      alert(e?.message || '저장 중 오류가 발생했습니다')
    }
  }

  // New Item modal: select sales_mgmt_unit and distribute quantity from selected month
  type UnitOpt = { itemSubcategory:string; salesMgmtUnit:string }
  type NewItemRow = { sub:string; unit:string; months:number[] }
  const [newItem, setNewItem] = useState<{ open:boolean; loading:boolean; error?:string|null; success?:string|null; opts:UnitOpt[]; unit?:string; sub?:string; month?:string; qty?:string; dist:number[]; rows:NewItemRow[] }>({ open:false, loading:false, error:null, success:null, opts:[], dist: new Array(12).fill(0), rows: [] })
  const newItemDrag = useDraggableModal('sales-plan-new-item', !!newItem.open, centerOfViewport, { persist:false, resetOnOpen:true })
  function nearClickOfViewport(el: HTMLElement) {
    try {
      const rect = el.getBoundingClientRect()
      const w = rect?.width || el.offsetWidth || 480
      const h = rect?.height || el.offsetHeight || 300
      // Position slightly below and left-adjusted from last click
      const pad = 12
      let x = Math.round(lastClick.x - Math.min(w/2, 240))
      let y = Math.round(lastClick.y + pad)
      x = Math.max(8, Math.min(x, window.innerWidth - w - 8))
      y = Math.max(8, Math.min(y, window.innerHeight - h - 8))
      return { x, y }
    } catch {
      const x = Math.max(8, Math.min(lastClick.x, window.innerWidth - 500))
      const y = Math.max(8, Math.min(lastClick.y, window.innerHeight - 320))
      return { x, y }
    }
  }
  const totalsDrag = useDraggableModal('plan-totals-breakdown', totalsPopup.open, nearClickOfViewport, { persist:false, resetOnOpen:true })
  async function openNewItem() {
    setNewItem(prev => ({ ...prev, open:true, loading:true, error:null, unit:'', sub:'', month:'', qty:'', dist:new Array(12).fill(0), rows: [] }))
    try {
      const res = await fetch('/api/v1/items/dim')
      const data = res.ok ? await res.json() : []
      const opts: UnitOpt[] = Array.isArray(data) ? data.map((r:any)=>({ itemSubcategory:String(r.itemSubcategory||r.item_subcategory||''), salesMgmtUnit:String(r.salesMgmtUnit||r.sales_mgmt_unit||'') })) : []
      // unique by salesMgmtUnit
      const uniq: Record<string,UnitOpt> = {}
      opts.forEach(o => { const k = o.salesMgmtUnit.trim(); if (k && !uniq[k]) uniq[k]=o })
      const list = Object.values(uniq).sort((a,b)=> a.salesMgmtUnit.localeCompare(b.salesMgmtUnit))
      setNewItem(prev => ({ ...prev, loading:false, opts:list }))
      try { ensureAvgUnitMap() } catch {}
    } catch (e:any) {
      setNewItem(prev => ({ ...prev, loading:false, error: e?.message || '조회 오류', opts:[] }))
    }
  }
  // Ensure average unit map is ready while popup is open and when year/company changes
  useEffect(() => { if (newItem.open) { try { ensureAvgUnitMap() } catch {}; try { ensureGlobalAvgUnitMap() } catch {} } }, [newItem.open, simYear, companyType])
  function closeNewItem() { setNewItem({ open:false, loading:false, error:null, success:null, opts:[], dist:new Array(12).fill(0), rows: [] }) }
  function onNewItemUnitChange(val:string) {
    const opt = newItem.opts.find(o => o.salesMgmtUnit===val)
    setNewItem(prev => ({ ...prev, unit: val, sub: opt?.itemSubcategory || prev.sub }))
    try { ensureAvgUnitMap() } catch {}
    try { fetchAvgForUnit(val) } catch {}
    try { fetchGlobalAvgForUnit(val) } catch {}
  }
  function recomputeNewItem(monthStr?:string, qtyStr?:string) {
    const m = Number(monthStr ?? newItem.month)
    const q = Number(qtyStr ?? newItem.qty)
    const arr = new Array(12).fill(0)
    if (Number.isFinite(m) && m>=1 && m<=12 && Number.isFinite(q) && q>0) {
      const cnt = 12 - m + 1
      const per = q / cnt
      for (let i=m-1;i<12;i++) arr[i] = per
    }
    setNewItem(prev => ({ ...prev, month: monthStr ?? prev.month, qty: qtyStr ?? prev.qty, dist: arr }))
  }
  function commitNewItem() {
    const unit = (newItem.unit||'').trim(); const sub=(newItem.sub||'').trim(); const m=newItem.month; const q=newItem.qty
    if (!unit || !m || !q) { alert('영업관리단위, 매출월, 매출 수량을 입력하세요.'); return }
    const row: NewItemRow = { sub: sub || '(신규)', unit, months: newItem.dist.slice() }
    setNewItem(prev => {
      const rows = prev.rows.slice()
      const idx = rows.findIndex(r => (r.unit||'').trim() === unit && (r.sub||'').trim() === (row.sub||'').trim())
      if (idx >= 0) {
        rows[idx] = { ...rows[idx], sub: row.sub, unit: row.unit, months: row.months.slice() }
      } else {
        rows.push(row)
      }
      return { ...prev, rows, unit:'', sub:'', month:'', qty:'', dist:new Array(12).fill(0) }
    })
  }

  async function commitNewItemSubmit() {
    try {
      const y = Number(simYear)
      const comp = companyType
      const aid = (localStorage.getItem('tnt.sales.assigneeId') || '').trim()
      const custSeq = Number((active as any)?.customerSeq || 0)
      if (!Number.isFinite(y) || y<=0) { alert('연도를 선택하세요.'); return }
      if (!aid) { alert('로그인이 필요합니다.'); return }
      if (!custSeq) { alert('거래처를 선택하세요.'); return }
      const rows = (newItem.rows||[])
      if (!rows.length) { alert('추가된 영업관리단위가 없습니다.'); return }
      // Check conflicts against existing plan rows
      const existingPairs = new Set<string>((custPlanRows.rows||[])
        .map(r => `${String((r as any).sub||'').trim()}||${String((r as any).unit||'').trim()}`)
        .filter(s => !!s && s !== '||'))
      const conflicts = rows
        .map(r => ({ sub: String(r.sub||'').trim(), unit: String(r.unit||'').trim() }))
        .filter(x => x.sub && x.unit && existingPairs.has(`${x.sub}||${x.unit}`))
        .map(x => x.unit)
      if (conflicts.length > 0) {
        setNewItem(prev => ({ ...prev, error: `${conflicts.join(', ')} 이미 목표에 등록되어 있습니다. 목표 수정을 통해 작업 하세요.` }))
        return
      }
      const headers: Record<string,string> = { 'Content-Type': 'application/json', 'X-ASSIGNEE-ID': aid }
      const empId = (localStorage.getItem('tnt.sales.empId') || '').trim(); if (empId) headers['X-EMP-ID'] = empId
      for (const r of rows) {
        const qty = (r.months||[]).map(v => { const n = Number(v); if (!Number.isFinite(n) || n<=0) return 0; return Math.round(n*100)/100 })
        // Compute amounts using fallback-aware avgPriceForUnitRaw (round unit price to int)
        const unitKey = String(r.unit||'').trim()
        const upRaw = avgPriceForUnitRaw(unitKey)
        const unitPrice = Number.isFinite(upRaw as any) ? Math.round(Number(upRaw)) : 0
        const amount = qty.map(q => (Number.isFinite(q) && unitPrice>0) ? Math.round(Number(q) * unitPrice) : 0)
        const payload = { year: y, companyType: comp, assigneeId: aid, customerSeq: custSeq, itemSubcategory: r.sub, salesMgmtUnit: r.unit, qty, amount }
        const res = await fetch('/api/v1/sales/plan/upsert-row', { method:'POST', headers, body: JSON.stringify(payload) })
        if (!res.ok) { let t = await res.text().catch(()=> ''); throw new Error(t||('HTTP '+res.status)) }
      }
      setNewItem(prev => ({ ...prev, success: '목표가 변경되었습니다' }))
    } catch (e:any) {
      alert(e?.message || '저장 중 오류가 발생했습니다')
    }
  }

  // ESC key to close modals (X와 동일한 패턴)
  useEffect(() => {
    if (!targetInput.open && !bulkInput.open && !newItem.open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (targetInput.open) closeTargetInput()
        if (bulkInput.open) closeBulkInput()
        if (newItem.open) closeNewItem()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [targetInput.open, bulkInput.open, newItem.open])

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

  async function runSearch(reset: boolean = true) {
    setError(null)
    if (reset) { setLoading(true); setPageOffset(0); setHasMore(true) } else { setLoadingMore(true) }
    try {
      const y = Number(simYear)
      if (!Number.isFinite(y) || y <= 0) {
        if (reset) { setItems([]); setHasMore(true); setPageOffset(0); setRecentMap({}); setStageMap({}); }
        return
      }
      const savedAssigneeId = localStorage.getItem('tnt.sales.assigneeId')
      if (!savedAssigneeId) { setItems([]); setError(tone.loginRequired); return }
      const url = new URL('/api/v1/customers', window.location.origin)
      url.searchParams.set('mineOnly', 'true')
      url.searchParams.set('assigneeId', savedAssigneeId)
      url.searchParams.set('companyType', companyType)
      if (simYear) url.searchParams.set('year', String(simYear))
      if (custNameQ.trim()) url.searchParams.set('name', custNameQ.trim())
      url.searchParams.set('limit', String(PAGE_SIZE))
      url.searchParams.set('offset', String(reset ? 0 : pageOffset))
      const res = await fetch(url.toString())
      if (!res.ok) {
        let msg = `HTTP ${res.status}`
        try { const data = await res.json(); if (data?.error) msg = data.error } catch { const txt = await res.text(); if (txt) msg = txt }
        throw new Error(msg)
      }
      const data = await res.json()
      const list: Customer[] = Array.isArray(data) ? data : []
      if (reset) setItems(list)
      else setItems(prev => [...prev, ...list])
      setHasMore(list.length >= PAGE_SIZE)
      setPageOffset(prev => (reset ? PAGE_SIZE : prev + PAGE_SIZE))
      // Fetch total my-customer count (independent of current page)
      try {
        if (savedAssigneeId) {
          const urlCnt = new URL('/api/v1/customers/count', window.location.origin)
          urlCnt.searchParams.set('mineOnly', 'true')
          urlCnt.searchParams.set('assigneeId', savedAssigneeId)
          const rc = await fetch(urlCnt.toString())
          if (rc.ok) {
            const obj = await rc.json().catch(()=> ({} as any))
            const n = Number((obj as any)?.total ?? 0)
            setTotalMineCount(Number.isFinite(n) ? n : 0)
          } else { setTotalMineCount(0) }
        } else { setTotalMineCount(0) }
      } catch { setTotalMineCount(0) }
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
            if (Array.isArray(arr)) { arr.forEach((x: any) => { const k = Number(x?.customerSeq || x?.customerSeqText || 0); if (Number.isFinite(k)) map[k] = !!x?.hasRecent }) }
            setRecentMap(prev => reset ? map : ({ ...prev, ...map }))
          } else { if (reset) setRecentMap({}) }
        } else { if (reset) setRecentMap({}) }
      } catch { setRecentMap({}) }

      // Load target_stage per customer from sales_plan for current tab/company type
      try {
        const y = Number(simYear)
        const year = Number.isFinite(y) && y > 0 ? y : new Date().getFullYear()
        const savedAssigneeId = localStorage.getItem('tnt.sales.assigneeId') || ''
        const seqs = list.map(it => Number((it as any).customerSeq || 0)).filter(v => Number.isFinite(v) && v > 0)
        if (savedAssigneeId && seqs.length > 0) {
          const u = new URL('/api/v1/sales/plan/stages', window.location.origin)
          u.searchParams.set('year', String(year))
          if (companyType) u.searchParams.set('companyType', companyType)
          u.searchParams.set('assigneeId', savedAssigneeId)
          u.searchParams.set('customerSeqs', Array.from(new Set(seqs)).join(','))
          const r = await fetch(u.toString())
          if (r.ok) {
            const arr = await r.json()
            const m: Record<number, string> = {}
            if (Array.isArray(arr)) {
              arr.forEach((x:any) => { const k = Number(x?.customer_seq ?? x?.customerSeq ?? 0); const s = String(x?.target_stage ?? x?.targetStage ?? '').trim(); if (Number.isFinite(k) && s) m[k] = s })
            }
            setStageMap(prev => reset ? m : ({ ...prev, ...m }))
          } else {
            if (reset) setStageMap({})
          }
        } else { if (reset) setStageMap({}) }
      } catch { if (reset) setStageMap({}) }
    } catch (e: any) {
      setError(e.message || '조회 중 오류가 발생했습니다')
    } finally {
      if (reset) setLoading(false); else setLoadingMore(false)
    }
  }
  // Run search only after selecting a year; re-run on tab/company change
  useEffect(() => { if (simYear) runSearch(true) }, [simYear, companyType])
  // Clear list when year cleared
  useEffect(() => { if (!simYear) { setItems([]); setHasMore(true); setPageOffset(0); setRecentMap({}); setStageMap({}); } }, [simYear])

  // Load my counts per company type that have any invoice in previous year of the selected year
  useEffect(() => {
    async function loadMyCounts() {
      try {
        const savedAssigneeId = localStorage.getItem('tnt.sales.assigneeId')
        if (!savedAssigneeId) { setMyCounts({ tnt: 0, dys: 0 }); return }
        const y = Number(simYear)
        if (!Number.isFinite(y) || y <= 0) { setMyCounts({ tnt: 0, dys: 0 }); return }
        const u = new URL('/api/v1/customers/with-invoice-count', window.location.origin)
        u.searchParams.set('assigneeId', savedAssigneeId)
        u.searchParams.set('year', String(y))
        const r = await fetch(u.toString())
        if (!r.ok) { setMyCounts({ tnt: 0, dys: 0 }); return }
        const o:any = await r.json().catch(()=> ({}))
        const tnt = Number(o?.tnt ?? 0)
        const dys = Number(o?.dys ?? 0)
        setMyCounts({ tnt: Number.isFinite(tnt) ? tnt : 0, dys: Number.isFinite(dys) ? dys : 0 })
      } catch { setMyCounts({ tnt: 0, dys: 0 }) }
    }
    loadMyCounts()
  }, [simYear])

  const prevYearLabel = useMemo(() => {
    const y = Number(simYear)
    return Number.isFinite(y) && y > 0 ? `${y - 1}년` : '전년도'
  }, [simYear])
  const userName = useMemo(() => (localStorage.getItem('tnt.sales.empName') || '').trim() || '사용자', [])
  const accentColor = '#1e3a8a'

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
    const onKey = (e: any) => {
      const isEsc = e?.key === 'Escape' || e?.key === 'Esc' || e?.keyCode === 27
      if (isEsc) { setMenu({ open: false, x: 0, y: 0 }); setBubble({ open: false, x: 0, y: 0 }) }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [])

  async function showTntBubble(e: React.MouseEvent, row: Customer) {
    e.preventDefault(); e.stopPropagation()
    setMenu({ open: false, x: 0, y: 0 })
    const x = e.clientX, y = e.clientY
    setBubble({ open: true, x, y, row, loading: false, error: null, data: [] })
  }

  const table = useMemo(() => {
    const ordered = [...items].sort((a, b) => {
      const sa = Number((a as any).customerSeq || 0)
      const sb = Number((b as any).customerSeq || 0)
      const pa = !!stageMap[sa]
      const pb = !!stageMap[sb]
      if (pa !== pb) return pa ? -1 : 1 // 1차: sales_plan 등록 여부 우선
      const an = (a.customerName || '').toString()
      const bn = (b.customerName || '').toString()
      return an.localeCompare(bn, 'ko', { sensitivity: 'base' }) // 2차: 이름 ASC
    })
    return (
      <>
        <div ref={listRef} className="table-container" onClick={() => setMenu({ open: false, x: 0, y: 0 })} style={{ height: '100%', overflow: 'auto' }}>
        {ordered.length === 0 ? (
          <div className="empty-state">{tone.empty}</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 'auto' }}>거래처명</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((it, idx) => (
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
                      const stg = stageMap[seq]
                      const style: React.CSSProperties = {}
                      if (stg === 'P') style.color = '#dc2626'
                      if (stg === 'C') style.fontWeight = 700
                      return (
                        <span>
                          <span style={style}>{it.customerName}</span>
                          {stg ? <span className="badge stage-badge" style={{ marginLeft: 6 }}>{stg}</span> : null}
                        </span>
                      )
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {loadingMore && <div className="muted" style={{ padding: '6px 8px' }}>{tone.loading}</div>}
        {!loading && !loadingMore && !hasMore && items.length > 0 && (
          <div className="muted" style={{ padding: '8px 10px', textAlign: 'center' }}>마지막 데이터입니다.</div>
        )}
        {bubble.open && (
          <div className="context-menu" style={{ left: bubble.x + 6, top: bubble.y + 6, maxWidth: 420, padding: 8 }} onClick={(e) => e.stopPropagation()}>
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
                </tbody>
              </table>
            )}
          </div>
        )}
        </div>
      </>
    )
  }, [items, menu, selected, bubble, active, stageMap, loading, loadingMore, hasMore])

  // Infinite scroll handler for left customer list
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    function onScroll() {
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 48
      if (nearBottom && hasMore && !loadingMore && !loading) {
        runSearch(false)
      }
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [hasMore, loadingMore, loading, pageOffset])

  // Unit price summary popup (by logged-in employee)
  const [unitPopup, setUnitPopup] = useState<{ open:boolean; loading:boolean; error:string|null; rows: Array<{ unit:string; amountMy:number; amountGlobal:number; itemUnit?:string; itemStdUnit?:string }> }>({ open:false, loading:false, error:null, rows:[] })
  const [upliftPct, setUpliftPct] = useState<number>(10)
  const [unitYear, setUnitYear] = useState<number | ''>('')
  const [unitCompanyType, setUnitCompanyType] = useState<'TNT'|'DYS'>('TNT')
  const unitDrag = useDraggableModal('unit-amounts-by-emp', unitPopup.open, rightDockOfViewport, { persist:false, resetOnOpen:true })
  // Overall customer counts (수립대상/확정/진행 중)
  const [custSummary, setCustSummary] = useState<{ total:number; confirmed:number; inprogress:number; loading:boolean; error:string|null }>({ total:0, confirmed:0, inprogress:0, loading:false, error:null })
  // Confirmed totals (target_stage C-only customers) by company for header
  const [confirmedTotals, setConfirmedTotals] = useState<{ tnt:number; dys:number; loading:boolean; error:string|null }>({ tnt:0, dys:0, loading:false, error:null })
  useEffect(() => {
    async function loadSummary() {
      const y = Number(simYear)
      const aid = (localStorage.getItem('tnt.sales.assigneeId') || '').trim()
      const eid = (localStorage.getItem('tnt.sales.empId') || '').trim()
      if (!Number.isFinite(y) || y<=0 || (!aid && !eid)) { setCustSummary({ total:0, confirmed:0, inprogress:0, loading:false, error:null }); return }
      setCustSummary(prev=>({ ...prev, loading:true, error:null }))
      try {
        const u = new URL('/api/v1/sales/plan/customer-counts-overall', window.location.origin)
        u.searchParams.set('year', String(y))
        if (aid) u.searchParams.set('assigneeId', aid); else if (eid) u.searchParams.set('empId', eid)
        const r = await fetch(u.toString())
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const d = await r.json()
        const total = Number(d?.total_customers ?? 0) || 0
        const confirmed = Number(d?.confirmed_customers ?? 0) || 0
        const inprogress = Number(d?.inprogress_customers ?? 0) || 0
        setCustSummary({ total, confirmed, inprogress, loading:false, error:null })
      } catch (e:any) {
        setCustSummary({ total:0, confirmed:0, inprogress:0, loading:false, error: e?.message || '요약 조회 오류' })
      }
    }
    loadSummary()
  }, [simYear, modeTick])
  async function fetchUnitAvg() {
    try {
      const savedAssigneeId = localStorage.getItem('tnt.sales.assigneeId')
      if (!savedAssigneeId || !unitYear) { setUnitPopup(prev=>({ ...prev, loading:false })); return }
      const u = new URL('/api/v1/dashboard/avg-unit-price-by-emp', window.location.origin)
      u.searchParams.set('assigneeId', savedAssigneeId)
      u.searchParams.set('companyType', unitCompanyType)
      u.searchParams.set('year', String(unitYear))
      const res = await fetch(u.toString())
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const arr = await res.json()
      // Global averages
      const ug = new URL('/api/v1/dashboard/avg-unit-price', window.location.origin)
      ug.searchParams.set('companyType', unitCompanyType)
      ug.searchParams.set('year', String(unitYear))
      const rg = await fetch(ug.toString())
      const arrG = rg.ok ? await rg.json() : []
      // Build maps
      const myMap: Record<string, { amount:number; itemUnit?:string; itemStdUnit?:string }> = {}
      const gMap: Record<string, { amount:number; itemUnit?:string; itemStdUnit?:string }> = {}
      if (Array.isArray(arr)) {
        arr.forEach((r:any) => {
          const unit = String(r?.sales_mgmt_unit ?? r?.salesMgmtUnit ?? '')
          const key = unit.trim().toUpperCase()
          if (!key) return
          myMap[key] = {
            amount: Number(r?.avg_unit_price ?? r?.avgUnitPrice ?? 0),
            itemUnit: String(r?.item_unit ?? r?.itemUnit ?? ''),
            itemStdUnit: String(r?.item_std_unit ?? r?.itemStdUnit ?? ''),
          }
        })
      }
      if (Array.isArray(arrG)) {
        arrG.forEach((r:any) => {
          const unit = String(r?.sales_mgmt_unit ?? r?.salesMgmtUnit ?? '')
          const key = unit.trim().toUpperCase()
          if (!key) return
          gMap[key] = {
            amount: Number(r?.avg_unit_price ?? r?.avgUnitPrice ?? 0),
            itemUnit: String(r?.item_unit ?? r?.itemUnit ?? ''),
            itemStdUnit: String(r?.item_std_unit ?? r?.itemStdUnit ?? ''),
          }
        })
      }
      const keys = Array.from(new Set<string>([...Object.keys(myMap), ...Object.keys(gMap)])).sort()
      const rows: Array<{ unit:string; amountMy:number; amountGlobal:number; itemUnit?:string; itemStdUnit?:string }> = keys.map(k => ({
        unit: k,
        amountMy: Number(myMap[k]?.amount ?? 0),
        amountGlobal: Number(gMap[k]?.amount ?? 0),
        itemUnit: myMap[k]?.itemUnit || gMap[k]?.itemUnit || '',
        itemStdUnit: myMap[k]?.itemStdUnit || gMap[k]?.itemStdUnit || '',
      }))
      setUnitPopup({ open:true, loading:false, error:null, rows })
    } catch (e:any) {
      setUnitPopup({ open:true, loading:false, error: e?.message || '조회 오류', rows:[] })
    }
  }

  function openUnitPopup() {
    setUnitPopup({ open:true, loading:true, error:null, rows:[] })
    // Default year: (selected simYear - 1), clamped to 2025~2030
    const sy = Number(simYear)
    const def = (Number.isFinite(sy) && sy > 0) ? (sy - 1) : new Date().getFullYear() - 1
    const clamped = Math.max(2025, Math.min(2030, def))
    setUnitYear(clamped)
    // Default company type to TNT when opening the popup
    setUnitCompanyType('TNT')
    // fetch is triggered by useEffect([unitYear, unitCompanyType]) when popup is open
  }
  function onSimYearChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    setSimYear(val)
  }
  function closeUnitPopup() { setUnitPopup(prev => ({ ...prev, open:false })) }
  useEffect(() => {
    if (!unitPopup.open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeUnitPopup() }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [unitPopup.open])
  useEffect(() => {
    if (!unitPopup.open) return
    if (!unitYear) return
    setUnitPopup(prev=>({ ...prev, loading:true }))
    fetchUnitAvg()
  }, [unitPopup.open, unitYear, unitCompanyType])

  // Load confirmed totals by company (C-only customers) for header
  useEffect(() => {
    (async () => {
      try {
        setConfirmedTotals(prev=>({ ...prev, loading:true, error:null }))
        const y = Number(simYear)
        const aid = (localStorage.getItem('tnt.sales.assigneeId') || '').trim()
        const eid = (localStorage.getItem('tnt.sales.empId') || '').trim()
        if (!Number.isFinite(y) || y<=0 || (!aid && !eid)) { setConfirmedTotals({ tnt:0, dys:0, loading:false, error:null }); return }
        const u = new URL('/api/v1/sales/plan/totals-confirmed-by-assignee', window.location.origin)
        u.searchParams.set('year', String(y))
        if (aid) u.searchParams.set('assigneeId', aid); else if (eid) u.searchParams.set('empId', eid)
        const r = await fetch(u.toString())
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const arr = await r.json().catch(()=> [])
        let tnt=0, dys=0
        if (Array.isArray(arr)) {
          for (const x of arr) {
            const ct = String(x?.company_type || x?.companyType || '').toUpperCase()
            const amt = Number(x?.amount || 0)
            if (ct==='TNT') tnt += amt; else if (ct==='DYS') dys += amt
          }
        }
        setConfirmedTotals({ tnt: Math.round(tnt), dys: Math.round(dys), loading:false, error:null })
      } catch (e:any) {
        setConfirmedTotals({ tnt:0, dys:0, loading:false, error: e?.message || '확정 합계 조회 오류' })
      }
    })()
  }, [simYear])

  // ESC-close for other modals
  useEffect(() => { if (!targetInput.open) return; const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeTargetInput() }; window.addEventListener('keydown', onKey, true); return () => window.removeEventListener('keydown', onKey, true) }, [targetInput.open])
  useEffect(() => { if (!bulkInput.open) return; const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeBulkInput() }; window.addEventListener('keydown', onKey, true); return () => window.removeEventListener('keydown', onKey, true) }, [bulkInput.open])
  useEffect(() => { if (!bulkRatio.open) return; const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeBulkRatio() }; window.addEventListener('keydown', onKey, true); return () => window.removeEventListener('keydown', onKey, true) }, [bulkRatio.open])
  useEffect(() => { if (!newItem.open) return; const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeNewItem() }; window.addEventListener('keydown', onKey, true); return () => window.removeEventListener('keydown', onKey, true) }, [newItem.open])
  // ESC-close for totals popup
  useEffect(() => { if (!totalsPopup.open) return; const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeTotalsPopup() }; window.addEventListener('keydown', onKey, true); return () => window.removeEventListener('keydown', onKey, true) }, [totalsPopup.open])

  return (
    <section aria-busy={initWorking || undefined}>
      <div className="page-title" style={{ alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>목표 Simulation</h2>
        <div className="muted count-text" style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <span style={{ fontWeight: 700 }}>현재목표</span>
          <span onClick={(e)=> openTotalsPopup('TNT', e)} style={{
            display:'inline-flex', alignItems:'baseline', gap:8,
            padding:'6px 10px', border:'2px solid #3b82f6', borderRadius: 999,
            fontWeight: 800, fontSize: 16, background:'transparent', cursor:'pointer'
          }} title="TNT 계획 합계 (클릭하여 상세)">
            <span style={{ fontSize:12, color:'#3b82f6', fontWeight:700 }}>TNT</span>
            <span style={{ color:'#3b82f6' }}>{nf.format(planTotals.tnt)}</span>
            <span style={{ fontSize:12, color:'#3b82f6' }}>원</span>
          </span>
          <span onClick={(e)=> openTotalsPopup('DYS', e)} style={{
            display:'inline-flex', alignItems:'baseline', gap:8,
            padding:'6px 10px', border:'2px solid #10b981', borderRadius: 999,
            fontWeight: 800, fontSize: 16, background:'transparent', cursor:'pointer'
          }} title="DYS 계획 합계 (클릭하여 상세)">
            <span style={{ fontSize:12, color:'#10b981', fontWeight:700 }}>DYS</span>
            <span style={{ color:'#10b981' }}>{nf.format(planTotals.dys)}</span>
            <span style={{ fontSize:12, color:'#10b981' }}>원</span>
          </span>
          {/* divider and confirmed totals */}
          <span aria-hidden style={{ width: 1, height: 20, background: 'var(--border)', display:'inline-block' }} />
          <span style={{ fontWeight: 700 }}>목표확정</span>
          {confirmedTotals.loading ? (
            <span className="muted" style={{ fontSize: 12 }}>불러오는 중…</span>
          ) : confirmedTotals.error ? (
            <span className="error" style={{ fontSize: 12 }}>{confirmedTotals.error}</span>
          ) : (
            <>
              <span title="확정된 고객 합계 (TNT)" style={{
                display:'inline-flex', alignItems:'baseline', gap:8,
                padding:'6px 10px', border:'2px solid #3b82f6', borderRadius: 999,
                fontWeight: 800, fontSize: 16, background:'transparent'
              }}>
                <span style={{ fontSize:12, color:'#3b82f6', fontWeight:700 }}>TNT</span>
                <span style={{ color:'#3b82f6' }}>{nf.format(confirmedTotals.tnt)}</span>
                <span style={{ fontSize:12, color:'#3b82f6' }}>원</span>
              </span>
              <span title="확정된 고객 합계 (DYS)" style={{
                display:'inline-flex', alignItems:'baseline', gap:8,
                padding:'6px 10px', border:'2px solid #10b981', borderRadius: 999,
                fontWeight: 800, fontSize: 16, background:'transparent'
              }}>
                <span style={{ fontSize:12, color:'#10b981', fontWeight:700 }}>DYS</span>
                <span style={{ color:'#10b981' }}>{nf.format(confirmedTotals.dys)}</span>
                <span style={{ fontSize:12, color:'#10b981' }}>원</span>
              </span>
            </>
          )}
          <button className="btn-plain" title="내 평균거래 단가" onClick={openUnitPopup} aria-label="평균거래 단가 팝업 열기">
            <img src={priceTagIcon} className="icon" alt="단가" />
          </button>
          {totalMineCount.toLocaleString()}개 거래처
        </div>
      </div>
      {/* 추가 패널: 목표년도 */}
      <div className="card" style={{ padding: 8, marginTop: 8, display: 'flex', alignItems: 'center', gap: 12, flexWrap:'wrap' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
          <div className="muted">목표년도</div>
          <select className="search-input" value={simYear} onChange={onSimYearChange} aria-label="목표년도" style={{ height: 28 }}>
            <option value="" disabled>선택</option>
            {simYears().map(y=> <option key={y} value={String(y)}>{y}년</option>)}
          </select>
          <div className="muted" style={{ marginLeft: 12 }}>가중치</div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
            <input className="search-input" value={String(upliftPct)} onChange={(e)=>{
              const n = Number((e.target.value||'').replace(/[^0-9]/g,''));
              if (Number.isFinite(n)) setUpliftPct(Math.max(0, Math.min(999, n)));
            }} inputMode="numeric" aria-label="가중치(%)" style={{ width: 72, height: 28, textAlign: 'right' }} />
            <span className="muted">%</span>
          </div>
        </div>
        {(() => {
          const statusC = !!(initInfo.hasC && !initInfo.hasP && !initInfo.hasI)
          const statusI = !!(initInfo.hasI && !initInfo.hasP && !initInfo.hasC)
          const statusP = !!(initInfo.hasP || (initInfo.hasC && initInfo.hasI))
          const label = statusC ? '목표수립완료' : statusI ? '초기설정완료' : statusP ? '계획수립 중' : '초기설정'
          const isDisabled = statusC || statusI || statusP
          const style = (isDisabled || initWorking) ? { opacity: .6, cursor:'not-allowed', background:'var(--border)', color:'var(--muted)' } as React.CSSProperties : undefined
          return (
            <button className="btn btn-card btn-3d" onClick={initPlan} disabled={isDisabled || initWorking} style={style}>{label}</button>
          )
        })()}
        {simYear ? (
          initInfo.show ? (
            <div className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 12 }}>
              <span style={{ fontSize: 12 }}>{initInfo.name}님</span>
              <span style={{ color: accentColor, fontWeight: 700, fontSize: 14, whiteSpace:'pre' }}>{initInfo.year}년</span>
              <span style={{ fontSize: 12 }}> </span>
              <span style={{ color: accentColor, fontWeight: 700, fontSize: 14 }}>TNT {initInfo.tnt.toLocaleString()}개</span>
              <span style={{ fontSize: 12 }}>,</span>
              <span style={{ color: accentColor, fontWeight: 700, fontSize: 14 }}> DYS {initInfo.dys.toLocaleString()}개</span>
              <span style={{ fontSize: 12 }}>{initInfo.label || ''}</span>
            </div>
          ) : (planStatusLoaded ? (
            <div className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 12 }}>
              <span style={{ fontSize: 12 }}>{userName}님,</span>
              <span style={{ color: accentColor, fontWeight: 700, fontSize: 14 }}>{prevYearLabel}</span>
              <span style={{ fontSize: 12 }}>매출 기준으로 담당 거래처</span>
              <span style={{ color: accentColor, fontWeight: 700, fontSize: 14 }}>TNT</span>
              <span style={{ color: accentColor, fontWeight: 700, fontSize: 14 }}>{myCounts.tnt.toLocaleString()}</span>
              <span style={{ fontSize: 12 }}>개,</span>
              <span style={{ color: accentColor, fontWeight: 700, fontSize: 14 }}>DYS</span>
              <span style={{ color: accentColor, fontWeight: 700, fontSize: 14 }}>{myCounts.dys.toLocaleString()}</span>
              <span style={{ fontSize: 12 }}>개에 대해</span>
              <span style={{ color: accentColor, fontWeight: 700, fontSize: 14 }}>{upliftPct}%</span>
              <span style={{ fontSize: 12 }}>추가하여 목표 설정합니다.</span>
            </div>
          ) : null)
        ) : null}
        <div className="muted" style={{ marginLeft: 'auto' }}>
          {custSummary.loading ? '요약 불러오는 중…' : (
            custSummary.error ? <span className="error">{custSummary.error}</span> : (
              <>
                수립대상 {custSummary.total.toLocaleString()}개, 확정 {custSummary.confirmed.toLocaleString()}개, 진행 중 {custSummary.inprogress.toLocaleString()}개
              </>
            )
          )}
        </div>
      </div>

      {/* Plan totals breakdown popup */}
      {totalsPopup.open && (
        <div role="dialog" aria-modal="true" className="card" style={{ position:'fixed', inset:0, background:'transparent', zIndex:60 }}>
          <div ref={totalsDrag.ref} className="card" style={{ ...(totalsDrag.style as any), width: 720, maxWidth: '92vw', background:'var(--panel)', padding: 12, fontSize: 12 }}>
            <div {...totalsDrag.bindHeader} style={{ position:'absolute', top:0, left:0, right:36, height: 32, cursor:'move' }} aria-hidden="true" />
            <button aria-label="닫기" onClick={closeTotalsPopup} className="btn-plain" style={{ position:'absolute', top:8, right:8 }}>
              <img src={closeIcon} className="icon" alt="닫기" />
            </button>
            <div className="page-title" style={{ marginBottom: 8, alignItems:'center' }}>
              <h2 style={{ margin:0 }}>{totalsPopup.company} 계획 합계 상세</h2>
              <div className="controls" style={{ gap: 8 }}>
                <label style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                  <input type="radio" name="totals-group" checked={totalsPopup.group==='customer'} onChange={()=>{ setTotalsPopup(prev=>({ ...prev, group:'customer' })); loadTotalsBreakdown(totalsPopup.company, 'customer') }} />
                  거래처별
                </label>
                <label style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                  <input type="radio" name="totals-group" checked={totalsPopup.group==='unit'} onChange={()=>{ setTotalsPopup(prev=>({ ...prev, group:'unit' })); loadTotalsBreakdown(totalsPopup.company, 'unit') }} />
                  영업관리단위별
                </label>
              </div>
            </div>
            {totalsPopup.error ? (<div className="error">{totalsPopup.error}</div>) : null}
            <div className="table-container" style={{ maxHeight:'66vh', overflow:'auto' }}>
              <table className="table" style={{ width:'100%' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign:'left', width: 380 }}>{totalsPopup.group==='customer' ? '거래처' : '영업관리단위'}</th>
                    <th style={{ textAlign:'right', width: 200 }}>금액(원)</th>
                  </tr>
                </thead>
                <tbody>
                  {totalsPopup.loading ? (
                    <tr><td colSpan={2} className="muted" style={{ padding:'12px 10px' }}>불러오는 중…</td></tr>
                  ) : (totalsPopup.rows.length === 0 ? (
                    <tr><td colSpan={2} className="muted" style={{ padding:'12px 10px' }}>데이터가 없습니다</td></tr>
                  ) : totalsPopup.rows.map((r, i) => {
                    const label = (totalsPopup.group==='customer' ? (r.label || r.key) : r.key)
                    return (
                      <tr key={i}>
                        <td>{label}</td>
                        <td className="sum-cell" style={{ textAlign:'right' }}>{nf.format(Math.round(r.amount))}</td>
                      </tr>
                    )
                  }))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Confirm success message */}
      {confirmMsg ? (
        <div role="dialog" aria-modal="true" className="card" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:80, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div className="card" style={{ background:'var(--panel)', padding: 12, border: '1px solid var(--border)', borderRadius: 10, minWidth: 280, maxWidth: '86vw' }}>
            <div style={{ marginBottom: 8, fontWeight: 700, textAlign:'center' }}>{confirmMsg}</div>
            <div style={{ display:'flex', justifyContent:'center' }}>
              <button className="btn btn-card btn-3d" onClick={() => setConfirmMsg(null)}>확인</button>
            </div>
          </div>
        </div>
      ) : null}
      {/* Company Tabs */}
      <div className="c360-tabs" role="tablist" aria-label="회사 구분 탭" style={{ marginTop: 8 }}>
        {(['TNT','DYS'] as const).map(ct => (
          <button
            key={ct}
            role="tab"
            aria-selected={activeCompanyTab===ct}
            className={`tab ${activeCompanyTab===ct ? 'active' : ''}`}
            onClick={() => { setActiveCompanyTab(ct); try { setCompanyType(ct) } catch {} }}
          >{ct}</button>
        ))}
      </div>
      {activeCompanyTab === 'TNT' ? (
        <>
        {error && <div className="error">{error || tone.errorGeneric}</div>}
        <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'stretch', height: 'calc(100vh - 140px)' }}>
        <div style={{ flex: '0 0 17%', maxWidth: '17%', minWidth: 240, height: '100%', overflow: 'auto' }}>
          <div className="card" style={{ padding: 8, marginBottom: 8 }}>
            <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
              <input
                className="search-input"
                placeholder="거래처명"
                value={custNameQ}
                onChange={(e)=> setCustNameQ(e.target.value)}
                onKeyDown={(e)=> { if (e.key === 'Enter') runSearch(true) }}
                style={{ flex: 1 }}
              />
              <button className="btn" onClick={()=> runSearch(true)} disabled={loading} style={{ flex: '0 0 auto' }}>조회</button>
            </div>
          </div>
              {simYear ? table : <div className="muted" style={{ padding: '12px 10px' }}>연도를 먼저 선택하세요.</div>}
        </div>
        <aside className="card" style={{ flex: '1 1 83%', maxWidth: '83%', height: '100%', padding: 12, overflow: 'auto' }}>
          {/* Progress bar moved above the list panel */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 16 }}>
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
            {/* 확정 버튼: 선택 거래처의 모든 영업관리단위 target_stage='C' */}
            <div>
              <button className="btn btn-card btn-3d" onClick={confirmCustomerStage} disabled={!active?.customerSeq || !simYear} title="해당 거래처 목표 확정">확정</button>
            </div>
          </div>
          {/* Monthly plan qty by subcategory/unit for selected customer */}
          {active?.customerSeq && simYear ? (
            <div className="card" style={{ marginBottom: 12, padding: 8 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', marginBottom:8, gap:8, flexWrap:'wrap' }}>
                <button className="btn btn-card btn-3d" style={{ fontSize: 12, padding: '4px 8px' }} onClick={openBulkRatio}>일괄비율</button>
                <button className="btn btn-card btn-3d" style={{ fontSize: 12, padding: '4px 8px' }} onClick={openBulkInput}>일괄입력</button>
                <button className="btn btn-card btn-3d" style={{ fontSize: 12, padding: '4px 8px' }} onClick={openNewItem}>신규 영업관리단위</button>
              </div>
              {custPlanRows.error ? (
                <div className="error">{custPlanRows.error}</div>
              ) : (
                <div className="table-container">
                  <table className="table" style={{ width:'100%' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign:'left', width: 220 }}>중분류</th>
                        <th style={{ textAlign:'left', width: 220 }}>영업관리단위</th>
                        <th style={{ textAlign:'center', width: 120 }}>목표입력</th>
                        <th className="sum-head" style={{ textAlign:'right', width: 140 }}>합계</th>
                        {Array.from({length:12},(_,i)=>i+1).map(m=> <th key={m} style={{ textAlign:'right' }}>{String(m).padStart(2,'0')}월</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {custPlanRows.rows.length === 0 ? (
                        <tr><td className="muted" colSpan={16} style={{ padding:'12px 10px' }}>{custPlanRows.loading ? '불러오는 중…' : '데이터가 없습니다'}</td></tr>
                      ) : custPlanRows.rows.map((row, idx) => {
                        const rowQtyTotal = (row.months||[]).reduce((s,n)=> s + (Number.isFinite(n)? Number(n):0), 0)
                        const rowAmtTotal = (row.amounts||[]).reduce((s,n)=> s + (Number.isFinite(n)? Number(n):0), 0)
                        return (
                          <tr key={idx}>
                            <td>{row.sub}</td>
                          <td>
                            <span>{row.unit}</span>
                            {((row as any).stage) ? (
                              <span className="stage-badge" style={{ marginLeft: 6 }} title={String((row as any).stage)}>{(row as any).stage}</span>
                            ) : null}
                          </td>
                            <td style={{ textAlign:'center' }}>
                            <button type="button" className="btn btn-card btn-3d" style={{ fontSize: 12, padding: '4px 8px' }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openTargetInput(row.sub, row.unit) }}>입력</button>
                            </td>
                            <td className="sum-cell" style={{ textAlign:'right' }}>{renderQtyAmtCell(rowQtyTotal, 0, rowAmtTotal)}</td>
                          {row.months.map((v,i)=> (
                            <td key={i} style={{ textAlign:'right' }}>{renderQtyAmtCell(
                              v,
                              i,
                              (row as any).amounts?.[i],
                              ((row as any).stage==='P' ? '#dc2626' : undefined),
                              ((row as any).stage==='C')
                            )}</td>
                          ))}
                          </tr>
                        )
                      })}
                    </tbody>
                    {(() => {
                      if (!custPlanRows.rows || custPlanRows.rows.length===0) return null
                      const monthQtyTotals = Array.from({length:12},(_,i)=> custPlanRows.rows.reduce((s,r)=> s + (Number(r.months?.[i])||0), 0))
                      const monthAmtTotals = Array.from({length:12},(_,i)=> custPlanRows.rows.reduce((s,r)=> s + (Number(r.amounts?.[i])||0), 0))
                      const grandQty = monthQtyTotals.reduce((s,n)=> s + (Number(n)||0), 0)
                      const grandAmt = monthAmtTotals.reduce((s,n)=> s + (Number(n)||0), 0)
                      return (
                        <tfoot>
                          <tr className="sum-row">
                            <td colSpan={3} style={{ textAlign:'center', fontWeight:700 }}>합계</td>
                            <td className="sum-cell" style={{ textAlign:'right' }}>{renderQtyAmtCell(grandQty, 0, grandAmt)}</td>
                            {monthQtyTotals.map((q,i)=> (
                              <td key={i} className="sum-cell" style={{ textAlign:'right' }}>{renderQtyAmtCell(q, i, monthAmtTotals[i])}</td>
                            ))}
                          </tr>
                        </tfoot>
                      )
                    })()}
                  </table>
                </div>
              )}
            </div>
          ) : null}
          {/* 기준매출 및 선택 기능 제거됨 */}
        </aside>
      </div>
        </>
      ) : (
        <>
          {error && <div className="error">{error || tone.errorGeneric}</div>}
          <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'stretch', height: 'calc(100vh - 140px)' }}>
            <div style={{ flex: '0 0 17%', maxWidth: '17%', minWidth: 240, height: '100%', overflow: 'auto' }}>
              <div className="card" style={{ padding: 8, marginBottom: 8 }}>
                <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                  <input
                    className="search-input"
                    placeholder="거래처명"
                    value={custNameQ}
                    onChange={(e)=> setCustNameQ(e.target.value)}
                    onKeyDown={(e)=> { if (e.key === 'Enter') runSearch(true) }}
                    style={{ flex: 1 }}
                  />
                  <button className="btn" onClick={()=> runSearch(true)} disabled={loading} style={{ flex: '0 0 auto' }}>조회</button>
                </div>
              </div>
              {simYear ? table : <div className="muted" style={{ padding: '12px 10px' }}>연도를 먼저 선택하세요.</div>}
            </div>
            <aside className="card" style={{ flex: '1 1 83%', maxWidth: '83%', height: '100%', padding: 12, overflow: 'auto' }}>
              {/* Progress bar moved above the list panel (DYS) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 16 }}>
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
                {/* 확정 버튼: 선택 거래처의 모든 영업관리단위 target_stage='C' (DYS 패널) */}
                <div>
                  <button className="btn btn-card btn-3d" onClick={confirmCustomerStage} disabled={!active?.customerSeq || !simYear} title="해당 거래처 목표 확정">확정</button>
                </div>
              </div>
              {/* Monthly plan qty by subcategory/unit for selected customer (DYS) */}
              {active?.customerSeq && simYear ? (
                <div className="card" style={{ marginBottom: 12, padding: 8 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', marginBottom:8, gap:8, flexWrap:'wrap' }}>
                    <button className="btn btn-card btn-3d" style={{ fontSize: 12, padding: '4px 8px' }} onClick={openBulkRatio}>일괄비율</button>
                    <button className="btn btn-card btn-3d" style={{ fontSize: 12, padding: '4px 8px' }} onClick={openBulkInput}>일괄입력</button>
                    <button className="btn btn-card btn-3d" style={{ fontSize: 12, padding: '4px 8px' }} onClick={openNewItem}>신규 영업관리단위</button>
                  </div>
                  {custPlanRows.error ? (
                    <div className="error">{custPlanRows.error}</div>
                  ) : (
                    <div className="table-container">
                      <table className="table" style={{ width:'100%' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign:'left', width: 220 }}>중분류</th>
                            <th style={{ textAlign:'left', width: 220 }}>영업관리단위</th>
                            <th style={{ textAlign:'center', width: 120 }}>목표입력</th>
                            <th className="sum-head" style={{ textAlign:'right', width: 140 }}>합계</th>
                            {Array.from({length:12},(_,i)=>i+1).map(m=> <th key={m} style={{ textAlign:'right' }}>{String(m).padStart(2,'0')}월</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {custPlanRows.rows.length === 0 ? (
                            <tr><td className="muted" colSpan={16} style={{ padding:'12px 10px' }}>{custPlanRows.loading ? '불러오는 중…' : '데이터가 없습니다'}</td></tr>
                          ) : custPlanRows.rows.map((row, idx) => {
                            const rowQtyTotal = (row.months||[]).reduce((s,n)=> s + (Number.isFinite(n)? Number(n):0), 0)
                            const rowAmtTotal = (row.amounts||[]).reduce((s,n)=> s + (Number.isFinite(n)? Number(n):0), 0)
                            return (
                              <tr key={idx}>
                                <td>{row.sub}</td>
                                <td>
                                  <span>{row.unit}</span>
                                  {((row as any).stage) ? (
                                    <span className="badge stage-badge" style={{ marginLeft: 6 }}>{(row as any).stage}</span>
                                  ) : null}
                                </td>
                                <td style={{ textAlign:'center' }}>
                                <button type="button" className="btn btn-card btn-3d" style={{ fontSize: 12, padding: '4px 8px' }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openTargetInput(row.sub, row.unit) }}>입력</button>
                                </td>
                                <td className="sum-cell" style={{ textAlign:'right' }}>{renderQtyAmtCell(rowQtyTotal, 0, rowAmtTotal)}</td>
                          {row.months.map((v,i)=> (
                            <td key={i} style={{ textAlign:'right' }}>{renderQtyAmtCell(
                              v,
                              i,
                              (row as any).amounts?.[i],
                              ((row as any).stage==='P' ? '#dc2626' : undefined),
                              ((row as any).stage==='C')
                            )}</td>
                          ))}
                              </tr>
                            )
                          })}
                        </tbody>
                        {(() => {
                          if (!custPlanRows.rows || custPlanRows.rows.length===0) return null
                          const monthQtyTotals = Array.from({length:12},(_,i)=> custPlanRows.rows.reduce((s,r)=> s + (Number(r.months?.[i])||0), 0))
                          const monthAmtTotals = Array.from({length:12},(_,i)=> custPlanRows.rows.reduce((s,r)=> s + (Number(r.amounts?.[i])||0), 0))
                          const grandQty = monthQtyTotals.reduce((s,n)=> s + (Number(n)||0), 0)
                          const grandAmt = monthAmtTotals.reduce((s,n)=> s + (Number(n)||0), 0)
                          return (
                            <tfoot>
                              <tr className="sum-row">
                                <td colSpan={3} style={{ textAlign:'center', fontWeight:700 }}>합계</td>
                                <td className="sum-cell" style={{ textAlign:'right' }}>{renderQtyAmtCell(grandQty, 0, grandAmt)}</td>
                                {monthQtyTotals.map((q,i)=> (
                                  <td key={i} className="sum-cell" style={{ textAlign:'right' }}>{renderQtyAmtCell(q, i, monthAmtTotals[i])}</td>
                                ))}
                              </tr>
                            </tfoot>
                          )
                        })()}
                      </table>
                    </div>
                  )}
                </div>
              ) : null}
              {/* Plan Remark Panel */}
              {active?.customerSeq && simYear ? (
                <div className="card" style={{ marginBottom: 12, padding: 8 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                    <div className="muted" style={{ fontWeight:700, lineHeight: '28px', fontSize: 14 }}>목표수립의견</div>
                    <textarea
                      className="search-input"
                      value={planRemark.val}
                      onChange={(e)=> setPlanRemark(prev=>({ ...prev, val: e.target.value }))}
                      placeholder="목표수립에 대한 의견을 입력하세요"
                      rows={6}
                      style={{ flex: 1, resize:'vertical', height: 80, minHeight: 80, fontSize: 12 }}
                    />
                  </div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:8, marginTop: 8 }}>
                    {planRemark.loading ? <span className="muted" style={{ fontSize: 12 }}>(읽는 중…)</span> : null}
                    {planRemark.error ? <span className="error" style={{ fontSize: 12 }}>{planRemark.error}</span> : null}
                    {planRemark.success ? <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight:700 }}>{planRemark.success}</span> : null}
                    <button className="btn btn-card btn-3d" onClick={savePlanRemark} disabled={planRemark.saving}>{planRemark.saving ? '저장중…' : '저장'}</button>
                  </div>
                </div>
              ) : null}
            </aside>
          </div>
        </>
      )}

      {/* Target Input Modal (global, both tabs) */}
      {targetInput.open && (
        <div role="dialog" aria-modal="true" className="card" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:50 }}>
          <div ref={targetDrag.ref} className="card compact" style={{ ...(targetDrag.style as any), position:'relative', width: 900, maxWidth: '92vw', background:'var(--panel)', padding: 12 }}>
            <div {...targetDrag.bindHeader} style={{ position:'absolute', top:0, left:0, right:36, height: 32, cursor:'move' }} aria-hidden="true" />
            <button aria-label="닫기" onClick={closeTargetInput} className="btn-plain" style={{ position: 'absolute', top: 8, right: 8 }}>
              <img src={closeIcon} className="icon" alt="닫기" />
            </button>
            <div style={{ display:'grid', gridTemplateColumns:'120px 1.6fr 120px 1fr', gap: 8, alignItems:'center' }}>
              <div className="muted form-label">영업관리단위</div>
              <div>{targetInput.unit||''}</div>
              <div className="muted form-label">중분류</div><div>{targetInput.sub||''}</div>
              <div className="muted form-label">매출 수량</div>
              <div style={{ gridColumn: '2 / 5' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'nowrap', minWidth:0 }}>
                  <input className="assign-input" type="number" min={0} step={1} placeholder="0" value={targetInput.qty||''} onChange={(e)=>recomputeDistribution(targetInput.month, e.target.value)} />
                  {(() => {
                    const key = avgKey();
                    const u = (targetInput.unit||'').trim();
                    const unitKey = normUnit(u)
                    const myMap = avgUnitCache[key] || {}
                    const my = Number(myMap[unitKey] || 0)
                    const gKey = globalAvgKey();
                    const gMap = (avgUnitGlobalCache as any)?.[gKey] || {}
                    const g = Number(gMap[unitKey] || 0)
                    const myLabel = (Number.isFinite(my) && my>0) ? nf.format(Math.round(my)) : '-'
                    const gLabel = (Number.isFinite(g) && g>0) ? nf.format(Math.round(g)) : '-'
                    const col = (Number.isFinite(my) && Number.isFinite(g)) ? (my >= g ? accentColor : '#dc2626') : accentColor
                    return (
                      <span className="muted" style={{ fontSize: 12, whiteSpace:'nowrap' }}>
                        <span style={{ color: col, fontWeight: 700 }}>내단가 {myLabel} 원</span> | 전체단가 {gLabel} 원/단위
                      </span>
                    )
                  })()}
                </div>
              </div>
              <div className="muted form-label">매출월</div>
              <div>
                <select className="search-input" value={targetInput.month||''} onChange={(e)=>recomputeDistribution(e.target.value, targetInput.qty)}>
                  <option value="" disabled>선택</option>
                  {Array.from({length:12},(_,i)=>i+1).map(m=> <option key={m} value={String(m)}>{m}월</option>)}
                </select>
              </div>
            </div>
            {/* 현재 목표 (해당 품목/단위의 기존 월별 수량/금액) */}
            <div style={{ marginTop: 12 }}>
              <div className="pane-header" style={{ margin: 0 }}>현재 목표</div>
              <div className="table-container">
                <table className="table" style={{ width:'100%' }}>
                  <thead>
                    <tr>
                      <th className="sum-head" style={{ textAlign:'right', width: 120 }}>합계</th>
                      {Array.from({length:12},(_,i)=>i+1).map(m=> <th key={m} style={{ textAlign:'right' }}>{String(m).padStart(2,'0')}월</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {(() => {
                        const curQtyTot = (targetInput.curMonths||[]).reduce((s,v)=> s + (Number.isFinite(v)? Number(v):0), 0)
                        const curAmtTot = (targetInput.curAmounts||[]).reduce((s,v)=> s + (Number.isFinite(v)? Number(v):0), 0)
                        return (
                          <>
                            <td className="sum-cell" style={{ textAlign:'right' }}>{renderQtyAmtCell(curQtyTot, 0, curAmtTot)}</td>
                            {targetInput.curMonths.map((v,i)=> <td key={i}>{renderQtyAmtCell(
                              v,
                              i,
                              targetInput.curAmounts?.[i],
                              (targetInput.stage==='P' ? '#dc2626' : undefined),
                              (targetInput.stage==='C')
                            )}</td>)}
                          </>
                        )
                      })()}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="pane-header" style={{ margin: 0 }}>분배 미리보기</div>
               <div className="table-container">
                  <table className="table" style={{ width:'100%' }}>
                    <thead>
                      <tr>
                        <th className="sum-head" style={{ textAlign:'right', width: 120 }}>합계</th>
                        {Array.from({length:12},(_,i)=>i+1).map(m=> <th key={m} style={{ textAlign:'right' }}>{String(m).padStart(2,'0')}월</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                      {(() => {
                        const key = avgKey()
                        const map = avgUnitCache[key] || {}
                        const unit = (targetInput.unit||'').trim()
                        const upRaw = avgPriceForUnitRaw(unit); const up = Number.isFinite(upRaw as any) ? Number(upRaw) : 0
                        const distQtyTot = (targetInput.dist||[]).reduce((s,v)=> s + (Number.isFinite(v)? Number(v):0), 0)
                        const u = Number.isFinite(up) ? Math.round(up) : 0
                        const distAmtTot = (targetInput.dist||[]).reduce((s,v)=> s + ((Number.isFinite(v) && u>0) ? Number(v)*u : 0), 0)
                        return (
                          <>
                            <td className="sum-cell" style={{ textAlign:'right' }}>{renderQtyAmtCell(distQtyTot, 0, distAmtTot)}</td>
                            {targetInput.dist.map((v,i)=> {
                              const u2 = Number.isFinite(up) ? Math.round(up) : 0
                              const amt = (Number.isFinite(v) && u2>0) ? (Number(v) * u2) : undefined
                              return <td key={i}>{renderQtyAmtCell(
                                v,
                                i,
                                amt,
                                (targetInput.stage==='P' ? '#dc2626' : undefined),
                                (targetInput.stage==='C')
                              )}</td>
                            })}
                          </>
                        )
                      })()}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop: 8, gap:8 }}>
              <button className="btn btn-card btn-3d" onClick={commitTargetInput}>목표등록</button>
            </div>
            {/* Success confirmation modal (overlay) */}
            {targetInput.success ? (
              <div role="dialog" aria-modal="true" className="card" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 70 }}>
                <div className="card" style={{ background:'var(--panel)', padding: 12, border: '1px solid var(--border)', borderRadius: 10, minWidth: 260, maxWidth: '86vw' }}>
                  <div style={{ marginBottom: 8, fontWeight: 700, textAlign:'center' }}>{targetInput.success}</div>
                  <div style={{ display:'flex', justifyContent:'center' }}>
                    <button className="btn btn-card btn-3d" onClick={confirmAfterSave}>확인</button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Bulk Input Modal */}
      {bulkInput.open && (
        <div role="dialog" aria-modal="true" className="card" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:50 }}>
          <div ref={bulkDrag.ref} className="card compact" style={{ ...(bulkDrag.style as any), width: '92vw', maxWidth: 1100, background:'var(--panel)', padding: 12 }}>
            <div {...bulkDrag.bindHeader} style={{ position:'absolute', top:0, left:0, right:36, height: 32, cursor:'move' }} aria-hidden="true" />
            <button aria-label="닫기" onClick={closeBulkInput} className="btn-plain" style={{ position:'absolute', top:8, right:8 }}>
              <img src={closeIcon} className="icon" alt="닫기" />
            </button>
            <div className="page-title" style={{ marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>목표 일괄입력</h2>
            </div>
          <div className="table-container" style={{ maxHeight: '70vh', overflow:'auto', position:'relative' }}>
            <table className="table" style={{ width:'100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 200, textAlign:'left' }}>중분류</th>
                  <th style={{ width: 220, textAlign:'left' }}>영업관리단위</th>
                  <th style={{ width: 68, textAlign:'center' }}>구분</th>
                  <th style={{ width: 160, textAlign:'left' }}>내 평균단가</th>
                  <th className="sum-head" style={{ textAlign:'right', width: 120 }}>합계</th>
                  {Array.from({length:12},(_,i)=>i+1).map(m=> <th key={m} style={{ textAlign:'right' }}>{String(m).padStart(2,'0')}월</th>)}
                </tr>
              </thead>
              <tbody>
                {bulkInput.rows.length===0 ? (
                  <tr><td colSpan={19} className="muted" style={{ padding:'12px 10px' }}>데이터가 없습니다</td></tr>
                ) : bulkInput.rows.map((r, idx) => {
                  const key = avgKey(); const map = avgUnitCache[key] || {}; const upRaw = avgPriceForUnitRaw((r.unit||'').trim()); const up = Number.isFinite(upRaw as any) ? Number(upRaw) : 0
                  const m = Number(r.month||0); const q = Number(r.qty||0);
                  const dist = new Array(12).fill(0);
                  if (Number.isFinite(m) && m>=1 && m<=12 && Number.isFinite(q) && q>0) {
                    const cnt = 12 - m + 1; const per = q / cnt; for (let i=m-1;i<12;i++) dist[i]=per;
                  }
                  const preview = dist;
                  const curQtyTot = (r.curMonths||[]).reduce((s,n)=> s + (Number.isFinite(n)? Number(n):0), 0)
                  const curAmtTot = (r.curAmounts||[]).reduce((s,n)=> s + (Number.isFinite(n)? Number(n):0), 0)
                  const prevQtyTot = dist.reduce((s,n)=> s + (Number.isFinite(n)? Number(n):0), 0)
                  const prevAmtTot = dist.reduce((s,n)=> s + ((Number.isFinite(n)&&Number.isFinite(up))? Number(n)*up : 0), 0)
                  return (
                    <>
                      <tr key={r.key+':cur'}>
                        <td><span style={{ fontSize: 12 }}>{r.sub}</span></td>
                        <td>
                          <span style={{ fontSize: 12 }}>{r.unit}</span>
                          {r.stage ? (
                            <span className="stage-badge" style={{ marginLeft: 6 }} title={String(r.stage)}>{String(r.stage)}</span>
                          ) : null}
                        </td>
                        <td style={{ textAlign:'center' }} className="muted">현재</td>
                        <td className="muted">-</td>
                        <td className="muted">-</td>
                        <td className="sum-cell" style={{ textAlign:'right' }}>{renderQtyAmtCell(curQtyTot, 0, curAmtTot)}</td>
                        {r.curMonths.map((v,i)=> <td key={i}>{renderQtyAmtCell(
                          v,
                          i,
                          (r as any).curAmounts?.[i],
                          ((r as any).stage==='P' ? '#dc2626' : undefined),
                          ((r as any).stage==='C')
                        )}</td>)}
                      </tr>
                      <tr key={r.key+':prev'} style={{ background:'var(--panel-2)' }}>
                        <td></td>
                        <td></td>
                        <td style={{ textAlign:'center' }} className="sum-head">적용</td>
                        <td>
                          <select className="search-input" value={r.month||''} onChange={(e)=>recomputeBulk(idx, e.target.value, undefined)}>
                            <option value="" disabled>선택</option>
                            {Array.from({length:12},(_,i)=>i+1).map(mv=> <option key={mv} value={String(mv)}>{mv}월</option>)}
                          </select>
                        </td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <input className="assign-input" type="number" min={0} step={1} placeholder="0" value={r.qty||''} onChange={(e)=>recomputeBulk(idx, undefined, e.target.value)} />
                            {(() => {
                              const key=avgKey(); const metaMap=unitMetaCache[key]||{}; const ms=(metaMap[(r.unit||'').trim()]?.itemStdUnit||'').trim();
                              const unitKey = normUnit((r.unit||''))
                              const myMap = avgUnitCache[key] || {}
                              const my = Number(myMap[unitKey] || 0)
                              const gKey = globalAvgKey(); const gMap = (avgUnitGlobalCache as any)?.[gKey] || {}
                              const g = Number(gMap[unitKey] || 0)
                              const myLabel = (Number.isFinite(my) && my>0) ? nf.format(Math.round(my)) : '-'
                              const gLabel = (Number.isFinite(g) && g>0) ? nf.format(Math.round(g)) : '-'
                              const col = (Number.isFinite(my) && Number.isFinite(g)) ? (my >= g ? accentColor : '#dc2626') : accentColor
                              return (
                                <span className="muted" style={{ fontSize: 12 }}>
                                  <span style={{ color: col, fontWeight: 700 }}>내단가 {myLabel} 원</span> | 전체단가 {gLabel} 원/{ms || '단위'}
                                </span>
                              )
                            })()}
                          </div>
                        </td>
                        <td className="sum-cell" style={{ textAlign:'right' }}>{renderQtyAmtCell(prevQtyTot, 0, prevAmtTot)}</td>
                        {preview.map((v,i)=> { const ui=Number.isFinite(up)?Math.round(up):0; const amt=(Number.isFinite(v)&&ui>0)? Number(v)*ui:undefined; return <td key={i}>{renderQtyAmtCell(
                          v,
                          i,
                          amt,
                          ((r as any).stage==='P' ? '#dc2626' : undefined),
                          ((r as any).stage==='C')
                        )}</td> })}
                      </tr>
                    </>
                  )
                })}
              </tbody>
              {(() => {
                if (!bulkInput.rows || bulkInput.rows.length===0) return null
                const key = avgKey(); const map = avgUnitCache[key] || {}
                // 현재 합계 (원본)
                const monthQtyTotalsCur = Array.from({length:12},(_,i)=> bulkInput.rows.reduce((s,r)=> s + (Number(r.curMonths?.[i])||0), 0))
                const monthAmtTotalsCur = Array.from({length:12},(_,i)=> bulkInput.rows.reduce((s,r)=> s + (Number(r.curAmounts?.[i])||0), 0))
                const grandQtyCur = monthQtyTotalsCur.reduce((s,n)=> s + (Number(n)||0), 0)
                const grandAmtCur = monthAmtTotalsCur.reduce((s,n)=> s + (Number(n)||0), 0)
                // 적용 합계 (분배)
                const monthQtyTotalsApp = Array.from({length:12},(_,i)=> bulkInput.rows.reduce((s,r)=> s + (Number(r.dist?.[i])||0), 0))
                const monthAmtTotalsApp = Array.from({length:12},(_,i)=> bulkInput.rows.reduce((s,r)=> { const upRaw = avgPriceForUnitRaw((r.unit||'').trim()); const u = Number.isFinite(upRaw as any)?Math.round(Number(upRaw)):0; const v = Number(r.dist?.[i]||0); return s + ((Number.isFinite(v)&&u>0) ? v*u : 0) }, 0))
                const grandQtyApp = monthQtyTotalsApp.reduce((s,n)=> s + (Number(n)||0), 0)
                const grandAmtApp = monthAmtTotalsApp.reduce((s,n)=> s + (Number(n)||0), 0)
                return (
                  <tfoot>
                    <tr className="sum-row-current">
                      <td colSpan={5} style={{ textAlign:'center', fontWeight:700 }}>[현재] 합계</td>
                      <td className="sum-cell" style={{ textAlign:'right' }}>{renderQtyAmtCell(grandQtyCur, 0, grandAmtCur)}</td>
                      {monthQtyTotalsCur.map((q,i)=> (
                        <td key={i} className="sum-cell" style={{ textAlign:'right' }}>{renderQtyAmtCell(q, i, monthAmtTotalsCur[i])}</td>
                      ))}
                    </tr>
                    <tr className="sum-row-apply" style={{ background:'var(--panel-2)' }}>
                      <td colSpan={5} style={{ textAlign:'center', fontWeight:700 }}>[적용] 합계</td>
                      <td className="sum-cell" style={{ textAlign:'right' }}>{renderQtyAmtCell(grandQtyApp, 0, grandAmtApp)}</td>
                      {monthQtyTotalsApp.map((q,i)=> (
                        <td key={i} className="sum-cell" style={{ textAlign:'right' }}>{renderQtyAmtCell(q, i, monthAmtTotalsApp[i])}</td>
                      ))}
                    </tr>
                  </tfoot>
                )
              })()}
            </table>
          </div>
          
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop: 8, gap:8 }}>
            <button className="btn btn-card btn-3d" onClick={commitBulkInput}>목표등록</button>
          </div>
          {bulkInput.success ? (
            <div role="dialog" aria-modal="true" className="card" style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 80 }}>
              <div className="card" style={{ background:'var(--panel)', padding: 12, border: '1px solid var(--border)', borderRadius: 10, minWidth: 260, maxWidth: '86vw' }}>
                <div style={{ marginBottom: 8, fontWeight: 700, textAlign:'center' }}>{bulkInput.success}</div>
                <div style={{ display:'flex', justifyContent:'center' }}>
                  <button className="btn btn-card btn-3d" onClick={confirmAfterSave}>확인</button>
                </div>
              </div>
            </div>
          ) : null}
          </div>
        </div>
      )}

      {/* Bulk Ratio Modal (copied from Bulk Input, separate state for future divergence) */}
      {bulkRatio.open && (
        <div role="dialog" aria-modal="true" className="card" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:50 }}>
          <div ref={bulkRatioDrag.ref} className="card compact" style={{ ...(bulkRatioDrag.style as any), width: '92vw', maxWidth: 1100, background:'var(--panel)', padding: 12 }}>
            <div {...bulkRatioDrag.bindHeader} style={{ position:'absolute', top:0, left:0, right:36, height: 32, cursor:'move' }} aria-hidden="true" />
            <button aria-label="닫기" onClick={closeBulkRatio} className="btn-plain" style={{ position:'absolute', top:8, right:8 }}>
              <img src={closeIcon} className="icon" alt="닫기" />
            </button>
            <div className="page-title" style={{ marginBottom: 8, alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>목표 일괄비율</h2>
              <div className="controls" style={{ gap: 8 }}>
                <span className="muted">적용 비율(%)</span>
                <input
                  className="assign-input"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  placeholder="0"
                  value={bulkRatioValue}
                  onChange={(e) => setBulkRatioValue(e.target.value)}
                  style={{ width: 100 }}
                  aria-label="일괄 비율 입력"
                />
                <button className="btn btn-card btn-3d" onClick={applyBulkRatio}>적용</button>
              </div>
            </div>
          <div className="table-container" style={{ maxHeight: '70vh', overflow:'auto' }}>
            <table className="table" style={{ width:'100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 200, textAlign:'left' }}>중분류</th>
                  <th style={{ width: 220, textAlign:'left' }}>영업관리단위</th>
                  <th style={{ width: 68, textAlign:'center' }}>구분</th>
                  <th style={{ width: 160, textAlign:'left' }}>내 평균단가</th>
                  <th className="sum-head" style={{ textAlign:'right', width: 120 }}>합계</th>
                  {Array.from({length:12},(_,i)=>i+1).map(m=> <th key={m} style={{ textAlign:'right' }}>{String(m).padStart(2,'0')}월</th>)}
                </tr>
              </thead>
              <tbody>
                {bulkRatio.rows.length===0 ? (
                  <tr><td colSpan={19} className="muted" style={{ padding:'12px 10px' }}>데이터가 없습니다</td></tr>
                ) : bulkRatio.rows.map((r, idx) => {
                  const key = avgKey(); const map = avgUnitCache[key] || {}; const upRaw = avgPriceForUnitRaw((r.unit||'').trim()); const up = Number.isFinite(upRaw as any) ? Number(upRaw) : 0
                  const preview: number[] = Array.isArray((r as any).dist) ? ((r as any).dist as number[]).slice() : new Array(12).fill(0)
                  const curQtyTot = (r.curMonths||[]).reduce((s,n)=> s + (Number.isFinite(n)? Number(n):0), 0)
                  const curAmtTot = (r.curAmounts||[]).reduce((s,n)=> s + (Number.isFinite(n)? Number(n):0), 0)
                  const prevQtyTot = preview.reduce((s,n)=> s + (Number.isFinite(n)? Number(n):0), 0)
                  const prevAmtTot = preview.reduce((s,n)=> s + ((Number.isFinite(n)&&Number.isFinite(up))? Number(n)*up : 0), 0)
                  return (
                    <>
                      <tr key={r.key+':cur'}>
                        <td><span style={{ fontSize: 12 }}>{r.sub}</span></td>
                        <td>
                          <span style={{ fontSize: 12 }}>{r.unit}</span>
                          {r.stage ? (
                            <span className="stage-badge" style={{ marginLeft: 6 }} title={String(r.stage)}>{String(r.stage)}</span>
                          ) : null}
                        </td>
                        <td style={{ textAlign:'center' }} className="muted">현재</td>
                        <td className="muted" style={{ textAlign:'left' }}>
                          {(() => {
                            const key=avgKey(); const metaMap=unitMetaCache[key]||{}; const ms=(metaMap[(r.unit||'').trim()]?.itemStdUnit||'').trim();
                            const unitKey = normUnit((r.unit||''))
                            const myMap = avgUnitCache[key] || {}
                            const my = Number(myMap[unitKey] || 0)
                            const gKey = globalAvgKey(); const gMap = (avgUnitGlobalCache as any)?.[gKey] || {}
                            const g = Number(gMap[unitKey] || 0)
                            const myLabel = (Number.isFinite(my) && my>0) ? nf.format(Math.round(my)) : '-'
                            const gLabel = (Number.isFinite(g) && g>0) ? nf.format(Math.round(g)) : '-'
                              const col = (Number.isFinite(my) && Number.isFinite(g)) ? (my >= g ? accentColor : '#dc2626') : accentColor
                              return (
                              <span>
                                <span style={{ color: col, fontWeight: 700 }}>내단가 {myLabel} 원</span> | 전체단가 {gLabel} 원/{ms || '단위'}
                              </span>
                            )
                          })()}
                        </td>
                        <td className="sum-cell" style={{ textAlign:'right' }}>{renderQtyAmtCell(curQtyTot, 0, curAmtTot)}</td>
                        {r.curMonths.map((v,i)=> <td key={i}>{renderQtyAmtCell(
                          v,
                          i,
                          (r as any).curAmounts?.[i],
                          ((r as any).stage==='P' ? '#dc2626' : undefined),
                          ((r as any).stage==='C')
                        )}</td>)}
                      </tr>
                      <tr key={r.key+':prev'} style={{ background:'var(--panel-2)' }}>
                        <td></td>
                        <td></td>
                        <td style={{ textAlign:'center' }} className="sum-head">적용</td>
                        <td className="muted" style={{ textAlign:'left' }}>
                          {(() => {
                            const key=avgKey(); const metaMap=unitMetaCache[key]||{}; const ms=(metaMap[(r.unit||'').trim()]?.itemStdUnit||'').trim();
                            const unitKey = normUnit((r.unit||''))
                            const myMap = avgUnitCache[key] || {}
                            const my = Number(myMap[unitKey] || 0)
                            const gKey = globalAvgKey(); const gMap = (avgUnitGlobalCache as any)?.[gKey] || {}
                            const g = Number(gMap[unitKey] || 0)
                            const myLabel = (Number.isFinite(my) && my>0) ? nf.format(Math.round(my)) : '-'
                            const gLabel = (Number.isFinite(g) && g>0) ? nf.format(Math.round(g)) : '-'
                              const col = (Number.isFinite(my) && Number.isFinite(g)) ? (my >= g ? accentColor : '#dc2626') : accentColor
                              return (
                              <span>
                                <span style={{ color: col, fontWeight: 700 }}>내단가 {myLabel} 원</span> | 전체단가 {gLabel} 원/{ms || '단위'}
                              </span>
                            )
                          })()}
                        </td>
                        <td className="sum-cell" style={{ textAlign:'right' }}>{renderQtyAmtCell(prevQtyTot, 0, prevAmtTot)}</td>
                        {preview.map((v,i)=> { const ui=Number.isFinite(up)?Math.round(up):0; const amt=(Number.isFinite(v)&&ui>0)? Number(v)*ui:undefined; return <td key={i}>{renderQtyAmtCell(
                          v,
                          i,
                          amt,
                          ((r as any).stage==='P' ? '#dc2626' : undefined),
                          ((r as any).stage==='C')
                        )}</td> })}
                      </tr>
                    </>
                  )
                })}
              </tbody>
              {(() => {
                  if (!bulkRatio.rows || bulkRatio.rows.length===0) return null
                  const key = avgKey(); const map = avgUnitCache[key] || {}
                  // 현재 합계
                  const monthQtyTotalsCur = Array.from({length:12},(_,i)=> bulkRatio.rows.reduce((s,r)=> s + (Number(r.curMonths?.[i])||0), 0))
                  const monthAmtTotalsCur = Array.from({length:12},(_,i)=> bulkRatio.rows.reduce((s,r)=> s + (Number(r.curAmounts?.[i])||0), 0))
                  const grandQtyCur = monthQtyTotalsCur.reduce((s,n)=> s + (Number(n)||0), 0)
                  const grandAmtCur = monthAmtTotalsCur.reduce((s,n)=> s + (Number(n)||0), 0)
                  // 적용 합계
                  const monthQtyTotalsApp = Array.from({length:12},(_,i)=> bulkRatio.rows.reduce((s,r)=> s + (Number(r.dist?.[i])||0), 0))
                const monthAmtTotalsApp = Array.from({length:12},(_,i)=> bulkRatio.rows.reduce((s,r)=> { const upRaw = avgPriceForUnitRaw((r.unit||'').trim()); const u = Number.isFinite(upRaw as any)?Math.round(Number(upRaw)):0; const v = Number(r.dist?.[i]||0); return s + ((Number.isFinite(v)&&u>0)? v*u : 0) }, 0))
                  const grandQtyApp = monthQtyTotalsApp.reduce((s,n)=> s + (Number(n)||0), 0)
                  const grandAmtApp = monthAmtTotalsApp.reduce((s,n)=> s + (Number(n)||0), 0)
                  return (
                    <tfoot>
                    <tr className="sum-row-current">
                      <td colSpan={4} style={{ textAlign:'center', fontWeight:700 }}>[현재] 합계</td>
                      <td className="sum-cell" style={{ textAlign:'right' }}>{renderQtyAmtCell(grandQtyCur, 0, grandAmtCur)}</td>
                      {monthQtyTotalsCur.map((q,i)=> (
                        <td key={i} className="sum-cell" style={{ textAlign:'right' }}>{renderQtyAmtCell(q, i, monthAmtTotalsCur[i])}</td>
                      ))}
                    </tr>
                    <tr className="sum-row-apply" style={{ background:'var(--panel-2)' }}>
                      <td colSpan={4} style={{ textAlign:'center', fontWeight:700 }}>[적용] 합계</td>
                      <td className="sum-cell" style={{ textAlign:'right' }}>{renderQtyAmtCell(grandQtyApp, 0, grandAmtApp)}</td>
                      {monthQtyTotalsApp.map((q,i)=> (
                        <td key={i} className="sum-cell" style={{ textAlign:'right' }}>{renderQtyAmtCell(q, i, monthAmtTotalsApp[i])}</td>
                      ))}
                    </tr>
                    </tfoot>
                  )
                })()}
            </table>
          </div>
          
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop: 8, gap:8 }}>
            <button className="btn btn-card btn-3d" onClick={commitBulkRatio}>목표등록</button>
          </div>
          {bulkRatio.success ? (
            <div role="dialog" aria-modal="true" className="card" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 70 }}>
              <div className="card" style={{ background:'var(--panel)', padding: 12, border: '1px solid var(--border)', borderRadius: 10, minWidth: 260, maxWidth: '86vw' }}>
                <div style={{ marginBottom: 8, fontWeight: 700, textAlign:'center' }}>{bulkRatio.success}</div>
                <div style={{ display:'flex', justifyContent:'center' }}>
                  <button className="btn btn-card btn-3d" onClick={confirmAfterSave}>확인</button>
                </div>
              </div>
            </div>
          ) : null}
          </div>
        </div>
      )}

      {/* New Item Modal */}
      {newItem.open && (
        <div role="dialog" aria-modal="true" className="card" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:50 }}>
          <div ref={newItemDrag.ref} className="card" style={{ ...(newItemDrag.style as any), width: 984, maxWidth: '92vw', background:'var(--panel)', padding: 12 }}>
            <div {...newItemDrag.bindHeader} style={{ position:'absolute', top:0, left:0, right:36, height: 32, cursor:'move' }} aria-hidden="true" />
            <button aria-label="닫기" onClick={closeNewItem} className="btn-plain" style={{ position:'absolute', top:8, right:8 }}>
              <img src={closeIcon} className="icon" alt="닫기" />
            </button>
            {/* SQL debug popup removed */}
            <div className="page-title" style={{ marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>신규 영업관리단위</h2>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'120px 1fr 120px 1fr', gap:8, alignItems:'center', fontSize: 12 }}>
              <div className="muted">영업관리단위</div>
              <div>
                <select className="search-input" value={newItem.unit||''} onChange={(e)=> onNewItemUnitChange(e.target.value)}>
                  <option value="" disabled>선택</option>
                  {newItem.opts.map((o, i)=> <option key={i} value={o.salesMgmtUnit}>{o.salesMgmtUnit}</option>)}
                </select>
              </div>
              <div className="muted">중분류</div>
              <div>
                <input className="assign-input" value={newItem.sub||''} readOnly placeholder="자동" />
              </div>
              <div className="muted">매출월</div>
              <div>
                <select className="search-input" value={newItem.month||''} onChange={(e)=>recomputeNewItem(e.target.value, undefined)}>
                  <option value="" disabled>선택</option>
                  {Array.from({length:12},(_,i)=>i+1).map(m=> <option key={m} value={String(m)}>{m}월</option>)}
                </select>
              </div>
              <div className="muted">매출 수량</div>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <input className="assign-input" type="number" min={0} step={1} placeholder="0" value={newItem.qty||''} onChange={(e)=>recomputeNewItem(undefined, e.target.value)} />
                  {(() => {
                    const key = avgKey();
                    const map = avgUnitCache[key] || {};
                    const metaMap = unitMetaCache[key] || {};
                    const u = (newItem.unit||'').trim();
                    const unitKey = normUnit(u)
                    const my = Number((map as any)?.[unitKey] || 0)
                    const gKey = globalAvgKey(); const gMap = (avgUnitGlobalCache as any)?.[gKey] || {}
                    const g = Number(gMap[unitKey] || 0)
                    const std = (metaMap[u]?.itemStdUnit || '').trim();
                    const myLabel = (Number.isFinite(my) && my>0) ? nf.format(Math.round(my)) : '-'
                    const gLabel = (Number.isFinite(g) && g>0) ? nf.format(Math.round(g)) : '-'
                    const col = (Number.isFinite(my) && Number.isFinite(g)) ? (my >= g ? accentColor : '#dc2626') : accentColor
                    return (
                      <span className="muted" style={{ fontSize: 12, whiteSpace:'nowrap' }}>
                        <span style={{ color: col, fontWeight: 700 }}>내단가 {myLabel} 원</span> | 전체단가 {gLabel} 원/{std || '단위'}
                      </span>
                    )
                  })()}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="table-container">
                <table className="table" style={{ width:'100%' }}>
                  <thead>
                    <tr>
                      {Array.from({length:12},(_,i)=>i+1).map(m=> <th key={m} style={{ textAlign:'right' }}>{String(m).padStart(2,'0')}월</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {newItem.dist.map((v,i)=> {
                        const key = avgKey(); const map = avgUnitCache[key] || {}; const upRaw = avgPriceForUnitRaw((newItem.unit||'').trim()); const up = Number.isFinite(upRaw as any) ? Number(upRaw) : 0
                        const u = Number.isFinite(up)?Math.round(up):0
                        const amt = (Number.isFinite(v) && u>0) ? Number(v)*u : undefined
                        return <td key={i}>{renderQtyAmtCell(v,i, amt)}</td>
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            {/* Rows preview within New Item popup */}
            <div style={{ marginTop: 12 }}>
              <div className="pane-header" style={{ margin: 0 }}>추가된 영업관리단위</div>
              <div className="table-container">
                <table className="table" style={{ width:'100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 200, textAlign:'left' }}>중분류</th>
                      <th style={{ width: 220, textAlign:'left' }}>영업관리단위</th>
                      {Array.from({length:12},(_,i)=>i+1).map(m=> <th key={m} style={{ textAlign:'right' }}>{String(m).padStart(2,'0')}월</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {newItem.rows.length===0 ? (
                      <tr><td colSpan={14} className="muted" style={{ padding:'12px 10px' }}>추가된 영업관리단위가 없습니다</td></tr>
                    ) : newItem.rows.map((r, idx) => (
                      <tr key={idx}>
                        <td>
                          <button
                            className="btn-plain"
                            aria-label="삭제"
                            title="삭제"
                            onClick={() => setNewItem(prev => ({ ...prev, rows: prev.rows.filter((_, i) => i !== idx) }))}
                            style={{ marginRight: 6, verticalAlign: 'middle' }}
                          >
                            <img src={closeIcon} className="icon" alt="삭제" />
                          </button>
                          {r.sub}
                        </td>
                        <td>{r.unit}</td>
                        {r.months.map((v,i)=> {
                          const key = avgKey(); const map = avgUnitCache[key] || {}; const upRaw = avgPriceForUnitRaw((r.unit||'').trim()); const up = Number.isFinite(upRaw as any) ? Number(upRaw) : 0
                          const u = Number.isFinite(up)?Math.round(up):0
                          const amt = (Number.isFinite(v) && u>0) ? Number(v)*u : undefined
                          return <td key={i}>{renderQtyAmtCell(v,i, amt)}</td>
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop: 8, gap:8 }}>
              <button className="btn btn-card btn-3d" onClick={commitNewItem}>추가</button>
              <button className="btn btn-card btn-3d" onClick={commitNewItemSubmit}>목표등록</button>
            </div>
            {newItem.error ? (
              <div role="dialog" aria-modal="true" className="card" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 70 }}>
                <div className="card" style={{ background:'var(--panel)', padding: 12, border: '1px solid var(--border)', borderRadius: 10, minWidth: 260, maxWidth: '86vw' }}>
                  <div style={{ marginBottom: 8, fontWeight: 700, textAlign:'center' }}>{newItem.error}</div>
                  <div style={{ display:'flex', justifyContent:'center' }}>
                    <button className="btn btn-card btn-3d" onClick={()=> setNewItem(prev => ({ ...prev, error: null }))}>확인</button>
                  </div>
                </div>
              </div>
            ) : null}
            {newItem.success ? (
              <div role="dialog" aria-modal="true" className="card" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 70 }}>
                <div className="card" style={{ background:'var(--panel)', padding: 12, border: '1px solid var(--border)', borderRadius: 10, minWidth: 260, maxWidth: '86vw' }}>
                  <div style={{ marginBottom: 8, fontWeight: 700, textAlign:'center' }}>{newItem.success}</div>
                  <div style={{ display:'flex', justifyContent:'center' }}>
                    <button className="btn btn-card btn-3d" onClick={confirmAfterSave}>확인</button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Unit Price Summary Modal */}
      {unitPopup.open && (
        <div role="dialog" aria-modal="true" style={{ position:'fixed', inset:0, zIndex:60 }}>
          {/* Right-side docked panel (draggable) */}
          <div ref={unitDrag.ref} className="card" style={{ ...(unitDrag.style as any), height:'66vh', width: 760, maxWidth:'96vw', background:'var(--panel)', padding: 12, borderLeft:'1px solid var(--border)', boxShadow:'-8px 0 24px rgba(0,0,0,0.18)', overflow:'hidden' }}>
            <div {...unitDrag.bindHeader} style={{ position:'absolute', top:0, left:0, right:36, height: 32, cursor:'move' }} aria-hidden="true" />
            <button aria-label="닫기" onClick={closeUnitPopup} className="btn-plain" style={{ position:'absolute', top:8, right:8 }}>
              <img src={closeIcon} className="icon" alt="닫기" />
            </button>
            <div className="page-title" style={{ marginBottom: 8, display:'flex', alignItems:'center' }}>
              <h2 style={{ margin: 0, display:'flex', alignItems:'center', gap:6, fontSize: 14 }}>
                {unitYear ? (
                  <>
                    <span style={{ color: accentColor, fontWeight: 700, fontSize: 14 }}>{unitYear}년</span>
                    <span style={{ fontSize: 12 }}>내 평균거래 단가</span>
                  </>
                ) : (
                  <span style={{ fontSize: 12 }}>내 평균거래 단가</span>
                )}
              </h2>
              <div style={{ marginLeft: 'auto', display:'inline-flex', alignItems:'center', gap:8, flexWrap:'nowrap' }}>
                <select className="search-input" value={unitYear} onChange={(e)=> setUnitYear(Number(e.target.value))} aria-label="평균단가 조회 연도" style={{ height: 28 }}>
                  {[2025,2026,2027,2028,2029,2030].map(y => (
                    <option key={y} value={y}>{y}년</option>
                  ))}
                </select>
                <div role="radiogroup" aria-label="회사 구분" className="segmented" style={{ display:'inline-flex', alignItems:'center', gap:8, height:28, border:'1px solid var(--border)', borderRadius:6, padding:'0 6px' }}>
                  <label style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize: 12, height:'100%' }}>
                    <input type="radio" name="unit-company" value="TNT" checked={unitCompanyType==='TNT'} onChange={()=> setUnitCompanyType('TNT')} />
                    <span style={{ fontSize: 12 }}>TNT</span>
                  </label>
                  <label style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize: 12, height:'100%' }}>
                    <input type="radio" name="unit-company" value="DYS" checked={unitCompanyType==='DYS'} onChange={()=> setUnitCompanyType('DYS')} />
                    <span style={{ fontSize: 12 }}>DYS</span>
                  </label>
                </div>
              </div>
            </div>
            {unitPopup.error ? (
              <div className="error" style={{ maxWidth: 420 }}>{unitPopup.error}</div>
            ) : (
              <div className="table-container" style={{ height: 'calc(66vh - 120px)', overflow: 'auto' }}>
                <table className="table" style={{ width:'100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 180, textAlign:'left' }}>영업관리단위</th>
                      <th style={{ width: 120, textAlign:'left' }}>판매단위</th>
                      <th style={{ width: 120, textAlign:'left' }}>표준단위</th>
                      <th style={{ width: 120, textAlign:'right' }}>내평균단가(원)</th>
                      <th style={{ width: 120, textAlign:'right' }}>전체단가(원)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unitPopup.loading ? (
                      <tr><td colSpan={2} className="muted" style={{ padding:'12px 10px' }}>불러오는 중…</td></tr>
                    ) : (unitPopup.rows.length === 0 ? (
                      <tr><td colSpan={2} className="muted" style={{ padding:'12px 10px' }}>데이터가 없습니다</td></tr>
                    ) : unitPopup.rows.map((r, i) => (
                      <tr key={i}>
                        <td>{r.unit || 'na'}</td>
                        <td>{r.itemUnit || '-'}</td>
                        <td>{r.itemStdUnit || '-'}</td>
                        {(() => { const my = Number(r.amountMy||0), g = Number(r.amountGlobal||0); const col = (Number.isFinite(my) && Number.isFinite(g)) ? (my >= g ? accentColor : '#dc2626') : accentColor; return (
                          <td style={{ textAlign:'right', color: col, fontWeight: 700 }}>{Number.isFinite(my) && my>0 ? `${nf.format(Math.round(my))} 원` : '-'}</td>
                        )})()}
                        <td style={{ textAlign:'right' }}>{Number.isFinite(Number(r.amountGlobal)) && Number(r.amountGlobal)>0 ? `${nf.format(Math.round(Number(r.amountGlobal)))} 원` : '-'}</td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global blocking overlay during initialization */}
      {initWorking && (
        <div role="alert" aria-live="assertive" aria-busy="true" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 100 }}>
          <div className="card" style={{ padding: 16, background: 'var(--panel)', minWidth: 280, textAlign:'center', boxShadow:'0 4px 16px rgba(0,0,0,.3)' }}>
            <div style={{ marginBottom: 8, fontWeight: 700 }}>초기설정 진행 중</div>
            <div className="muted" style={{ marginBottom: 12 }}>{initMessage || '작업을 준비 중입니다…'}</div>
            <div className="muted" style={{ fontSize: 12 }}>작업이 완료될 때까지 다른 동작을 할 수 없습니다.</div>
          </div>
        </div>
      )}
    </section>
  )

  async function initPlan() {
    try {
      setInitWorking(true)
      setInitMessage('초기설정 요청 중입니다…')
      if (!simYear || isNaN(Number(simYear))) { alert('연도를 선택하세요.'); return }
      const assigneeId = localStorage.getItem('tnt.sales.assigneeId') || ''
      if (!assigneeId) { alert('로그인이 필요합니다.'); return }
      const payload = {
        year: Number(simYear),
        companyType: companyType,
        upliftPercent: Math.max(0, Math.min(999, Number(upliftPct) || 0)),
        versionNo: 1,
        assigneeId
      }
      const empSeq = localStorage.getItem('tnt.sales.empSeq') || ''
      const empId = localStorage.getItem('tnt.sales.empId') || ''
      const headers: Record<string,string> = { 'Content-Type': 'application/json' }
      if (empSeq) headers['X-EMP-SEQ'] = empSeq
      if (empId) headers['X-EMP-ID'] = empId
      headers['X-ASSIGNEE-ID'] = assigneeId
      const res = await fetch('/api/v1/sales/plan/init', { method:'POST', headers, body: JSON.stringify(payload) })
      setInitMessage('초기 목표를 저장하고 있습니다…')
      if (!res.ok) {
        let msg = `HTTP ${res.status}`
        try { const d = await res.json(); if ((d as any)?.error) msg = (d as any).error } catch { const t = await res.text(); if (t) msg = t }
        throw new Error(msg)
      }
      await res.json().catch(()=> ({} as any))
      const name = (localStorage.getItem('tnt.sales.empName') || '').trim() || '사용자'
      const y = Number(simYear)
      setInitInfo({ show: true, name, tnt: myCounts.tnt, dys: myCounts.dys, year: Number.isFinite(y) && y>0 ? y : 0, hasP:false, hasC:false, hasI:true, label:'초기설정완료' })
      // 초기설정 완료 후 거래처 목록을 최신 상태로 다시 조회
      try { await runSearch(true) } catch {}
    } catch (e:any) {
      alert(e?.message || '초기설정 중 오류가 발생했습니다.')
    } finally {
      setInitWorking(false)
      setInitMessage('')
    }
  }
}
