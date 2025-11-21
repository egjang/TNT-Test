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

export function SalesPlanNew() {
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
  const [simStep, setSimStep] = useState<'init' | 'sim' | 'apply' | 'confirm'>('init')
  const [recentMap, setRecentMap] = useState<Record<number, boolean>>({})
  const [companyType, setCompanyType] = useState<'TNT'|'DYS'>('TNT')
  // Infinite scroll for customer list
  const PAGE_SIZE = 100
  const [pageOffset, setPageOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const listRef = React.useRef<HTMLDivElement | null>(null)
  const [totalMineCount, setTotalMineCount] = useState<number>(0)
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

  // My assigned (by emp_name) for Simulation header
  function simYears() { const arr:number[] = []; for (let y=2030;y>=2026;y--) arr.push(y); return arr }
  const [simYear, setSimYear] = useState<string>('')
  const [simLoading, setSimLoading] = useState(false)
  const [simError, setSimError] = useState<string | null>(null)
  const [simAssigned, setSimAssigned] = useState<{ tnt:number; dys:number; tntStage?:string; dysStage?:string }>({ tnt:0, dys:0 })
  // 계획 금액(표시만, 계산 로직은 추후 적용)
  const [simPlan, setSimPlan] = useState<{ tnt:number; dys:number }>({ tnt:0, dys:0 })
  // 차액 금액(표시만, 계산 로직은 추후 적용)
  const [simDelta, setSimDelta] = useState<{ tnt:number; dys:number }>({ tnt:0, dys:0 })
  const nf = new Intl.NumberFormat('ko-KR')
  // Amount preview helper — replace logic once provided
  function computeAmount(qty:number, monthIndex:number): number {
    // TODO: replace with real amount calculation
    // Currently uses qty as-is for amount preview.
    return Number.isFinite(qty) ? qty : 0
  }
  function renderQtyAmtCell(q:number, i:number) {
    const qtyOk = Number.isFinite(q) && q>0
    const amt = qtyOk ? computeAmount(q, i) : 0
    return (
      <div style={{ textAlign:'right', lineHeight: 1.15 }}>
        <div>{qtyOk ? (q % 1 === 0 ? Math.round(q).toLocaleString() : q.toFixed(2)) : '-'}</div>
        <div className="muted" style={{ fontSize: 11 }}>{qtyOk ? `${nf.format(Math.round(amt))} 원` : ''}</div>
      </div>
    )
  }
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

  type InitRow = {
    itemSubcategorySeq: number
    salesMgmtUnitSeq: number
    itemSubcategory: string
    salesMgmtUnit: string
    month: number
    amount: number
  }
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
          const res = await fetch(`/api/v1/customers/${active.customerSeq}/invoice-monthly-by-dim?year=${yy}`)
          if (!res.ok) return
          const data = await res.json().catch(() => [])
          const norm = (v:any) => {
            const t = String(v ?? '').trim()
            return t.toLowerCase() === 'na' ? '' : t
          }
          const rows: InitRow[] = (Array.isArray(data) ? data : []).map((r: any) => ({
            itemSubcategorySeq: Number(r.itemSubcategorySeq ?? r.item_subcategory_seq ?? 0),
            salesMgmtUnitSeq: Number(r.salesMgmtUnitSeq ?? r.sales_mgmt_unit_seq ?? 0),
            itemSubcategory: norm((r.itemSubcategory ?? r.item_subcategory)),
            salesMgmtUnit: norm((r.salesMgmtUnit ?? r.sales_mgmt_unit)),
            month: Number(r.month ?? 0),
            amount: Number(r.amount ?? 0),
          }))
          all.push(...rows)
        } catch {}
      }))
      // Aggregate by (중분류, 영업관리단위) → monthly totals
      const map = new Map<string, { sub: string; unit: string; months: number[] }>()
      const keyOf = (sub:string, unit:string) => `${(sub||'').trim().toLowerCase()}||${(unit||'').trim().toLowerCase()}`
      for (const r of all) {
        const k = keyOf(r.itemSubcategory, r.salesMgmtUnit)
        let entry = map.get(k)
        if (!entry) {
          entry = { sub: (r.itemSubcategory || ''), unit: (r.salesMgmtUnit || ''), months: new Array(12).fill(0) }
          map.set(k, entry)
        }
        const m = Math.min(12, Math.max(1, Number(r.month) || 0)) - 1
        entry.months[m] += Number.isFinite(r.amount) ? Number(r.amount) : 0
      }
      // Sort by 중분류, 영업관리단위 label
      const rows = Array.from(map.values()).sort((a,b)=> (a.sub||'').localeCompare(b.sub||'') || (a.unit||'').localeCompare(b.unit||''))
      setGrouped(rows)
    } catch (e: any) {
      setInitError(e.message || '조회 중 오류가 발생했습니다')
      setGrouped([])
    } finally {
      setInitLoading(false)
    }
  }
  useEffect(() => { if (simStep === 'init') loadInitData() }, [simStep, active?.customerSeq, basePeriod])

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
  useEffect(() => { if (simStep === 'init') loadRecentFlag() }, [simStep, active?.customerSeq])

  const [grouped, setGrouped] = useState<Array<{ sub:string; unit:string; months:number[] }>>([])
  const groupedTable = useMemo(() => {
    return (
      <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: 8, marginTop: 8 }}>
        <table className="table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: 220, textAlign: 'left' }}>중분류</th>
              <th style={{ width: 220, textAlign: 'left' }}>영업관리단위</th>
              <th style={{ width: 120, textAlign: 'center' }}>목표입력</th>
              {Array.from({ length: 12 }, (_, i) => (
                <th key={i} style={{ width: 90, textAlign: 'right' }}>{String(i+1).padStart(2, '0')}월</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.length === 0 ? (
              <tr><td className="muted" colSpan={15} style={{ padding: '12px 10px' }}>{initLoading ? '불러오는 중…' : '데이터가 없습니다'}</td></tr>
            ) : grouped.map((g, idx) => (
              <tr key={idx}>
                <td>{g.sub}</td>
                <td>{g.unit}</td>
                <td style={{ textAlign: 'center' }}>
                  <button className="btn btn-card btn-3d" onClick={() => openTargetInput(g.sub, g.unit)}>목표입력</button>
                </td>
                {g.months.map((v, i) => (
                  <td key={i} style={{ textAlign: 'right' }}>{Math.round(v).toLocaleString()}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }, [grouped, initLoading])

  // Target input modal state and logic
  const [targetInput, setTargetInput] = useState<{ open:boolean; sub?:string; unit?:string; month?:string; qty?:string; dist:number[] }>({ open:false, dist: new Array(12).fill(0) })
  function openTargetInput(sub:string, unit:string) {
    setTargetInput({ open:true, sub, unit, month:'', qty:'', dist: new Array(12).fill(0) })
  }
  function closeTargetInput() { setTargetInput({ open:false, dist: new Array(12).fill(0) }) }
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

  // Bulk input modal state and logic
  type BulkRow = { key:string; sub:string; unit:string; month?:string; qty?:string; dist:number[] }
  const [bulkInput, setBulkInput] = useState<{ open:boolean; rows:BulkRow[] }>({ open:false, rows:[] })
  function openBulkInput() {
    const rows: BulkRow[] = (grouped || []).map((g, i) => ({ key: `${g.sub}||${g.unit}||${i}`, sub: g.sub, unit: g.unit, month:'', qty:'', dist: new Array(12).fill(0) }))
    setBulkInput({ open:true, rows })
  }
  function closeBulkInput() { setBulkInput({ open:false, rows:[] }) }
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
  const bulkDrag = useDraggableModal('sales-plan-bulk-input', !!bulkInput.open, bottomCenterOfViewport, { persist: false, resetOnOpen: true })
  
  // Bulk ratio modal: separate copy for future features
  type BulkRatioRow = { key:string; sub:string; unit:string; month?:string; qty?:string; dist:number[] }
  const [bulkRatio, setBulkRatio] = useState<{ open:boolean; rows:BulkRatioRow[] }>({ open:false, rows:[] })
  const [bulkRatioValue, setBulkRatioValue] = useState<string>('')
  function openBulkRatio() {
    const rows: BulkRatioRow[] = (grouped || []).map((g, i) => ({ key: `${g.sub}||${g.unit}||${i}`, sub: g.sub, unit: g.unit, month:'', qty:'', dist: new Array(12).fill(0) }))
    setBulkRatio({ open:true, rows })
  }
  function closeBulkRatio() { setBulkRatio({ open:false, rows:[] }) }
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
  const bulkRatioDrag = useDraggableModal('sales-plan-bulk-ratio', !!bulkRatio.open, bottomCenterOfViewport, { persist:false, resetOnOpen:true })

  // New Item modal: select sales_mgmt_unit and distribute quantity from selected month
  type UnitOpt = { itemSubcategory:string; salesMgmtUnit:string }
  type NewItemRow = { sub:string; unit:string; months:number[] }
  const [newItem, setNewItem] = useState<{ open:boolean; loading:boolean; error?:string|null; opts:UnitOpt[]; unit?:string; sub?:string; month?:string; qty?:string; dist:number[]; rows:NewItemRow[] }>({ open:false, loading:false, error:null, opts:[], dist: new Array(12).fill(0), rows: [] })
  const newItemDrag = useDraggableModal('sales-plan-new-item', !!newItem.open, bottomCenterOfViewport, { persist:false, resetOnOpen:true })
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
    } catch (e:any) {
      setNewItem(prev => ({ ...prev, loading:false, error: e?.message || '조회 오류', opts:[] }))
    }
  }
  function closeNewItem() { setNewItem({ open:false, loading:false, error:null, opts:[], dist:new Array(12).fill(0), rows: [] }) }
  function onNewItemUnitChange(val:string) {
    const opt = newItem.opts.find(o => o.salesMgmtUnit===val)
    setNewItem(prev => ({ ...prev, unit: val, sub: opt?.itemSubcategory || prev.sub }))
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
    setNewItem(prev => ({ ...prev, rows: [...prev.rows, row], unit:'', sub:'', month:'', qty:'', dist:new Array(12).fill(0) }))
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
      const savedAssigneeId = localStorage.getItem('tnt.sales.assigneeId')
      if (!savedAssigneeId) { setItems([]); setError(tone.loginRequired); return }
      const url = new URL('/api/v1/customers', window.location.origin)
      url.searchParams.set('mineOnly', 'true')
      url.searchParams.set('assigneeId', savedAssigneeId)
      url.searchParams.set('companyType', companyType)
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
    } catch (e: any) {
      setError(e.message || '조회 중 오류가 발생했습니다')
    } finally {
      if (reset) setLoading(false); else setLoadingMore(false)
    }
  }
  useEffect(() => { runSearch(true) }, [])
  useEffect(() => { runSearch(true) }, [companyType])

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
      const ha = !!recentMap[sa]
      const hb = !!recentMap[sb]
      if (ha !== hb) return hb ? 1 : -1
      const an = (a.customerName || '').toString()
      const bn = (b.customerName || '').toString()
      return an.localeCompare(bn, 'ko', { sensitivity: 'base' })
    })
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
                      return recentMap[seq] ? (<span>{it.customerName}{String.fromCharCode(160)}{String.fromCharCode(160)}$</span>) : it.customerName
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
  }, [items, menu, selected, bubble, active, recentMap, loading, loadingMore, hasMore])

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
  const [unitPopup, setUnitPopup] = useState<{ open:boolean; loading:boolean; error:string|null; rows: Array<{ unit:string; amount:number }> }>({ open:false, loading:false, error:null, rows:[] })
  const unitDrag = useDraggableModal('unit-amounts-by-emp', unitPopup.open, rightDockOfViewport, { persist:false, resetOnOpen:true })
  function openUnitPopup() {
    setUnitPopup({ open:true, loading:true, error:null, rows:[] })
    const name = (localStorage.getItem('tnt.sales.empName') || '').trim()
    if (!name) { setUnitPopup({ open:true, loading:false, error:'로그인이 필요합니다', rows:[] }); return }
    const url = new URL('/api/v1/dashboard/unit-amounts-by-emp', window.location.origin)
    url.searchParams.set('empName', name)
    fetch(url.toString()).then(async (res) => {
      if (!res.ok) {
        let msg = `HTTP ${res.status}`
        try { const d = await res.json(); if ((d as any)?.error) msg = (d as any).error } catch { const t = await res.text(); if (t) msg = t }
        throw new Error(msg)
      }
      const arr = await res.json()
      const rows: Array<{ unit:string; amount:number }> = (Array.isArray(arr) ? arr : []).map((r:any)=> ({ unit: String(r?.sales_mgmt_unit ?? r?.salesMgmtUnit ?? ''), amount: Number(r?.amount ?? 0) }))
      setUnitPopup({ open:true, loading:false, error:null, rows })
    }).catch((e:any) => setUnitPopup({ open:true, loading:false, error: e?.message || '조회 오류', rows:[] }))
  }
  function closeUnitPopup() { setUnitPopup(prev => ({ ...prev, open:false })) }
  useEffect(() => {
    if (!unitPopup.open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeUnitPopup() }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [unitPopup.open])

  // ESC-close for other modals
  useEffect(() => { if (!targetInput.open) return; const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeTargetInput() }; window.addEventListener('keydown', onKey, true); return () => window.removeEventListener('keydown', onKey, true) }, [targetInput.open])
  useEffect(() => { if (!bulkInput.open) return; const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeBulkInput() }; window.addEventListener('keydown', onKey, true); return () => window.removeEventListener('keydown', onKey, true) }, [bulkInput.open])
  useEffect(() => { if (!bulkRatio.open) return; const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeBulkRatio() }; window.addEventListener('keydown', onKey, true); return () => window.removeEventListener('keydown', onKey, true) }, [bulkRatio.open])
  useEffect(() => { if (!newItem.open) return; const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeNewItem() }; window.addEventListener('keydown', onKey, true); return () => window.removeEventListener('keydown', onKey, true) }, [newItem.open])

  return (
    <section>
      <div className="page-title" style={{ alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 18, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          목표 Simulation
          <select className="search-input" value={simYear} onChange={(e)=> setSimYear(e.target.value)} aria-label="목표년도">
            <option value="" disabled>선택</option>
            {simYears().map(y=> <option key={y} value={String(y)}>{y}년</option>)}
          </select>
          <span className="badge" title="내 목표 배정(TNT)">TNT(배정): {nf.format(simAssigned.tnt)} 억</span>
          <span className="badge" title="내 목표 배정(DYS)">DYS(배정): {nf.format(simAssigned.dys)} 억</span>
          <span aria-hidden="true" style={{ opacity:.4 }}>|</span>
          <span className="badge" title="내 목표 계획(TNT)">TNT(계획): {nf.format(simPlan.tnt)} 억</span>
          <span className="badge" title="내 목표 계획(DYS)">DYS(계획): {nf.format(simPlan.dys)} 억</span>
          <span aria-hidden="true" style={{ opacity:.4 }}>|</span>
          <span className="badge" title="내 목표 차액(TNT)">TNT(차액): {nf.format(simDelta.tnt)} 억</span>
          <span className="badge" title="내 목표 차액(DYS)">DYS(차액): {nf.format(simDelta.dys)} 억</span>
        </h2>
        <div className="muted count-text" style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button className="btn-plain" title="내 평균거래 단가" onClick={openUnitPopup} aria-label="평균거래 단가 팝업 열기">
            <img src={priceTagIcon} className="icon" alt="단가" />
          </button>
          {totalMineCount.toLocaleString()}개 거래처
        </div>
      </div>
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
          {table}
        </div>
        <aside className="card" style={{ flex: '1 1 83%', maxWidth: '83%', height: '100%', padding: 12, overflow: 'auto' }}>
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
                <div style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                  {initError && <span className="error">{initError}</span>}
                  <button className="btn btn-card btn-3d" onClick={openBulkRatio}>일괄비율</button>
                  <button className="btn btn-card btn-3d" onClick={openBulkInput}>일괄입력</button>
                  <button className="btn btn-card btn-3d" onClick={openNewItem}>신규품목</button>
                </div>
              </div>
              {groupedTable}
            </section>
          )}
        </aside>
      </div>
      {/* Target Input Modal */}
      {targetInput.open && (
        <div role="dialog" aria-modal="true" className="card" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:50 }}>
          <div ref={targetDrag.ref} className="card" style={{ ...(targetDrag.style as any), width: 720, maxWidth: '92vw', background:'var(--panel)', padding: 12 }}>
            <div {...targetDrag.bindHeader} style={{ position:'absolute', top:0, left:0, right:36, height: 32, cursor:'move' }} aria-hidden="true" />
            <button
              aria-label="닫기"
              onClick={closeTargetInput}
              className="btn-plain"
              style={{ position: 'absolute', top: 8, right: 8 }}
            >
              <img src={closeIcon} className="icon" alt="닫기" />
            </button>
            <div style={{ display:'grid', gridTemplateColumns:'120px 1fr 120px 1fr', gap: 8, alignItems:'center' }}>
              <div className="muted">중분류</div><div>{targetInput.sub||''}</div>
              <div className="muted">영업관리단위</div><div>{targetInput.unit||''}</div>
              <div className="muted">매출월</div>
              <div>
                <select className="search-input" value={targetInput.month||''} onChange={(e)=>recomputeDistribution(e.target.value, targetInput.qty)}>
                  <option value="" disabled>선택</option>
                  {Array.from({length:12},(_,i)=>i+1).map(m=> <option key={m} value={String(m)}>{m}월</option>)}
                </select>
              </div>
              <div className="muted">매출 수량</div>
              <div>
                <input className="assign-input" type="number" min={0} step={1} placeholder="0" value={targetInput.qty||''} onChange={(e)=>recomputeDistribution(targetInput.month, e.target.value)} />
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
                      {targetInput.dist.map((v,i)=> <td key={i}>{renderQtyAmtCell(v,i)}</td>)}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop: 8, gap:8 }}>
              <button className="btn btn-card btn-3d" onClick={()=> alert('목표등록(단건) — 추후 구현 예정')}>목표등록</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Input Modal */}
      {bulkInput.open && (
        <div role="dialog" aria-modal="true" className="card" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:50 }}>
          <div ref={bulkDrag.ref} className="card" style={{ ...(bulkDrag.style as any), width: '92vw', maxWidth: 1100, background:'var(--panel)', padding: 12 }}>
            <div {...bulkDrag.bindHeader} style={{ position:'absolute', top:0, left:0, right:36, height: 32, cursor:'move' }} aria-hidden="true" />
            <button aria-label="닫기" onClick={closeBulkInput} className="btn-plain" style={{ position:'absolute', top:8, right:8 }}>
              <img src={closeIcon} className="icon" alt="닫기" />
            </button>
            <div className="page-title" style={{ marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>목표 일괄입력</h2>
            </div>
          <div className="table-container" style={{ maxHeight: '70vh', overflow:'auto' }}>
            <table className="table" style={{ width:'100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 200, textAlign:'left' }}>중분류</th>
                    <th style={{ width: 220, textAlign:'left' }}>영업관리단위</th>
                    <th style={{ width: 120, textAlign:'left' }}>매출월</th>
                    <th style={{ width: 120, textAlign:'left' }}>매출 수량</th>
                    {Array.from({length:12},(_,i)=>i+1).map(m=> <th key={m} style={{ textAlign:'right' }}>{String(m).padStart(2,'0')}월</th>)}
                  </tr>
                </thead>
                <tbody>
                  {bulkInput.rows.length===0 ? (
                    <tr><td colSpan={16} className="muted" style={{ padding:'12px 10px' }}>데이터가 없습니다</td></tr>
                  ) : bulkInput.rows.map((r, idx) => (
                    <tr key={r.key}>
                      <td>{r.sub}</td>
                      <td>{r.unit}</td>
                      <td>
                        <select className="search-input" value={r.month||''} onChange={(e)=>recomputeBulk(idx, e.target.value, undefined)}>
                          <option value="" disabled>선택</option>
                          {Array.from({length:12},(_,i)=>i+1).map(m=> <option key={m} value={String(m)}>{m}월</option>)}
                        </select>
                      </td>
                      <td>
                        <input className="assign-input" type="number" min={0} step={1} placeholder="0" value={r.qty||''} onChange={(e)=>recomputeBulk(idx, undefined, e.target.value)} />
                      </td>
                      {r.dist.map((v,i)=> <td key={i}>{renderQtyAmtCell(v,i)}</td>)}
                    </tr>
                  ))}
                </tbody>
            </table>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop: 8, gap:8 }}>
            <button className="btn btn-card btn-3d" onClick={()=> alert('목표등록(일괄) — 추후 구현 예정')}>목표등록</button>
          </div>
          </div>
        </div>
      )}

      {/* Bulk Ratio Modal (copied from Bulk Input, separate state for future divergence) */}
      {bulkRatio.open && (
        <div role="dialog" aria-modal="true" className="card" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:50 }}>
          <div ref={bulkRatioDrag.ref} className="card" style={{ ...(bulkRatioDrag.style as any), width: '92vw', maxWidth: 1100, background:'var(--panel)', padding: 12 }}>
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
                <button className="btn btn-card btn-3d" onClick={() => alert('일괄비율 적용 — 추후 개발 예정')}>적용</button>
              </div>
            </div>
          <div className="table-container" style={{ maxHeight: '70vh', overflow:'auto' }}>
            <table className="table" style={{ width:'100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 200, textAlign:'left' }}>중분류</th>
                    <th style={{ width: 220, textAlign:'left' }}>영업관리단위</th>
                    <th style={{ width: 120, textAlign:'left' }}>매출월</th>
                    <th style={{ width: 120, textAlign:'left' }}>매출 수량</th>
                    {Array.from({length:12},(_,i)=>i+1).map(m=> <th key={m} style={{ textAlign:'right' }}>{String(m).padStart(2,'0')}월</th>)}
                  </tr>
                </thead>
                <tbody>
                  {bulkRatio.rows.length===0 ? (
                    <tr><td colSpan={16} className="muted" style={{ padding:'12px 10px' }}>데이터가 없습니다</td></tr>
                  ) : bulkRatio.rows.map((r, idx) => (
                    <tr key={r.key}>
                      <td>{r.sub}</td>
                      <td>{r.unit}</td>
                      <td>
                        <select className="search-input" value={r.month||''} onChange={(e)=>recomputeBulkRatio(idx, e.target.value, undefined)}>
                          <option value="" disabled>선택</option>
                          {Array.from({length:12},(_,i)=>i+1).map(m=> <option key={m} value={String(m)}>{m}월</option>)}
                        </select>
                      </td>
                      <td>
                        <input className="assign-input" type="number" min={0} step={1} placeholder="0" value={r.qty||''} onChange={(e)=>recomputeBulkRatio(idx, undefined, e.target.value)} />
                      </td>
                      {r.dist.map((v,i)=> <td key={i}>{renderQtyAmtCell(v,i)}</td>)}
                    </tr>
                  ))}
                </tbody>
            </table>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop: 8, gap:8 }}>
            <button className="btn btn-card btn-3d" onClick={()=> alert('목표등록(일괄비율) — 추후 구현 예정')}>목표등록</button>
          </div>
          </div>
        </div>
      )}

      {/* New Item Modal */}
      {newItem.open && (
        <div role="dialog" aria-modal="true" className="card" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:50 }}>
          <div ref={newItemDrag.ref} className="card" style={{ ...(newItemDrag.style as any), width: 820, maxWidth: '92vw', background:'var(--panel)', padding: 12 }}>
            <div {...newItemDrag.bindHeader} style={{ position:'absolute', top:0, left:0, right:36, height: 32, cursor:'move' }} aria-hidden="true" />
            <button aria-label="닫기" onClick={closeNewItem} className="btn-plain" style={{ position:'absolute', top:8, right:8 }}>
              <img src={closeIcon} className="icon" alt="닫기" />
            </button>
            <div className="page-title" style={{ marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>신규품목</h2>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'120px 1fr 120px 1fr', gap:8, alignItems:'center' }}>
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
                <input className="assign-input" type="number" min={0} step={1} placeholder="0" value={newItem.qty||''} onChange={(e)=>recomputeNewItem(undefined, e.target.value)} />
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
                      {newItem.dist.map((v,i)=> <td key={i}>{renderQtyAmtCell(v,i)}</td>)}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            {/* Rows preview within New Item popup */}
            <div style={{ marginTop: 12 }}>
              <div className="pane-header" style={{ margin: 0 }}>추가된 항목</div>
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
                      <tr><td colSpan={14} className="muted" style={{ padding:'12px 10px' }}>추가된 항목이 없습니다</td></tr>
                    ) : newItem.rows.map((r, idx) => (
                      <tr key={idx}>
                        <td>{r.sub}</td>
                        <td>{r.unit}</td>
                        {r.months.map((v,i)=> <td key={i}>{renderQtyAmtCell(v,i)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop: 8, gap:8 }}>
              <button className="btn btn-card btn-3d" onClick={commitNewItem}>추가</button>
              <button className="btn btn-card btn-3d" onClick={()=> alert('목표등록(신규품목) — 추후 구현 예정')}>목표등록</button>
            </div>
          </div>
        </div>
      )}

      {/* Unit Price Summary Modal */}
      {unitPopup.open && (
        <div role="dialog" aria-modal="true" style={{ position:'fixed', inset:0, zIndex:60 }}>
          {/* Right-side docked panel (draggable) */}
          <div ref={unitDrag.ref} className="card" style={{ ...(unitDrag.style as any), height:'66vh', width: 460, maxWidth:'92vw', background:'var(--panel)', padding: 12, borderLeft:'1px solid var(--border)', boxShadow:'-8px 0 24px rgba(0,0,0,0.18)', overflow:'auto' }}>
            <div {...unitDrag.bindHeader} style={{ position:'absolute', top:0, left:0, right:36, height: 32, cursor:'move' }} aria-hidden="true" />
            <button aria-label="닫기" onClick={closeUnitPopup} className="btn-plain" style={{ position:'absolute', top:8, right:8 }}>
              <img src={closeIcon} className="icon" alt="닫기" />
            </button>
            <div className="page-title" style={{ marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>내 평균거래 단가</h2>
            </div>
            {unitPopup.error ? (
              <div className="error" style={{ maxWidth: 420 }}>{unitPopup.error}</div>
            ) : (
              <div className="table-container">
                <table className="table" style={{ width:'100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 280, textAlign:'left' }}>영업관리단위</th>
                      <th style={{ width: 180, textAlign:'right' }}>합계(원)</th>
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
                        <td style={{ textAlign:'right' }}>{nf.format(Math.round(r.amount))} 원</td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
