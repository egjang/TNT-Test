import React from 'react'
import { SalesActivityForm, SalesActivityInitial } from './SalesActivityForm'
import { LeadActivityCreateModal } from '../lead/LeadActivityCreateModal'
// (Registration popup deferred) import removed

type CustomerRow = { customerSeq?: number | null; customerId?: string | null; customerName?: string | null; ownerName?: string | null }
type TargetResult = {
  key: string;
  type: 'customer' | 'lead';
  name: string;
  companyType?: string | null;
  customerId?: string;
  leadId?: string;
}

type CalendarActivity = {
  id: number;
  subject?: string;
  description?: string;
  activityType?: string;
  activityStatus?: string;
  channel?: string;
  plannedStartAt?: string;
  plannedEndAt?: string;
  actualStartAt?: string;  // 종료일시 (actual_start_at)
  sfAccountId?: string;
  customerName?: string;
  leadId?: string | null;
  companyType?: string | null;
  isCompleted?: boolean;
}

function isoToDateInput(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateInputToIso(value?: string | null, defaultHour = 0): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const [year, month, day] = trimmed.split('-').map((part) => Number(part))
  if (!year || !month || !day) return undefined
  const date = new Date(year, month - 1, day, defaultHour, 0, 0, 0)
  if (isNaN(date.getTime())) return undefined
  return date.toISOString()
}

function getBadgeStyle(item: TargetResult): { label: string; bg: string; color: string; icon: string; iconBg: string } {
  if (item.type === 'customer') {
    const companyType = (item.companyType ?? '').toString().trim()
    const label = companyType || '거래처'
    const upper = companyType.toUpperCase()
    const icon = upper.includes('TNT') ? 'T'
      : upper.includes('DYS') ? 'D'
      : (upper || '거')[0]
    return { label, bg: 'rgba(59,130,246,.12)', color: '#1d4ed8', icon, iconBg: '#1d4ed8' }
  }
  return { label: '잠재', bg: 'rgba(236,72,153,.12)', color: '#be185d', icon: '잠', iconBg: '#be185d' }
}

function CustomerMineLookupModal({ onClose, onSelect }: { onClose: () => void; onSelect: (row: CustomerRow) => void }) {
  const [q, setQ] = React.useState('')
  const [items, setItems] = React.useState<CustomerRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  async function search() {
    setLoading(true); setError(null)
    try {
      const url = new URL('/api/v1/customers', window.location.origin)
      // 전체 거래처 대상 조회 (명시적으로 mineOnly=false)
      url.searchParams.set('mineOnly','false')
      if (q.trim()) url.searchParams.set('name', q.trim())
      url.searchParams.set('limit','100')
      const r = await fetch(url.toString())
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      const list: CustomerRow[] = Array.isArray(data) ? data.map((x:any)=>({
        customerSeq: x?.customerSeq ?? x?.customer_seq ?? null,
        customerId: x?.customerId ?? x?.customer_id ?? null,
        customerName: x?.customerName ?? x?.customer_name ?? null,
        ownerName: x?.ownerName ?? x?.owner_name ?? null,
      })) : []
      setItems(list)
    } catch(e:any) { setError(e?.message || '조회 실패'); setItems([]) }
    finally { setLoading(false) }
  }
  React.useEffect(()=>{ search() }, [])
  React.useEffect(()=>{ const onKey=(e:KeyboardEvent)=>{ if(e.key==='Escape') onClose() }; window.addEventListener('keydown', onKey, true); return ()=> window.removeEventListener('keydown', onKey, true) }, [onClose])
  return (
    <div role="dialog" aria-modal="true" style={{ position:'fixed', inset:0, zIndex: 13000 }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.35)' }} />
      <div className="card" style={{ position:'absolute', top:'10%', left:'50%', transform:'translateX(-50%)', width:'min(860px,96vw)', maxHeight:'80vh', overflow:'auto', padding:12 }}>
        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
          <input className="subject-input" placeholder="거래처명" value={q} onChange={(e)=>setQ(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter') search() }} style={{ flex:1 }} />
          <button className="btn" onClick={search}>조회</button>
        </div>
        <div className="table-container" style={{ maxHeight:420, overflow:'auto' }}>
          {items.length===0 ? (
            <div className="empty-state">{loading ? '불러오는 중…' : (error || '결과가 없습니다')}</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width:140 }}>회사코드</th>
                  <th style={{ width:260 }}>거래처명</th>
                  <th style={{ width:160 }}>대표자</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx)=> (
                  <tr key={idx} onClick={()=> onSelect(it)}>
                    <td>{it.customerId || ''}</td>
                    <td>{it.customerName || ''}</td>
                    <td>{it.ownerName || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function CustomerActivityRegisterModal({ onClose, prefillAt }: { onClose: () => void; prefillAt?: string | null }) {
  const [q, setQ] = React.useState('')
  const [results, setResults] = React.useState<CustomerRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [cart, setCart] = React.useState<CustomerRow[]>([])
  const [selected, setSelected] = React.useState<CustomerRow | null>(null)

  async function search() {
    setLoading(true); setError(null)
    try {
      const url = new URL('/api/v1/customers', window.location.origin)
      url.searchParams.set('mineOnly', 'false')
      if (q.trim()) url.searchParams.set('name', q.trim())
      url.searchParams.set('limit','100')
      try { console.debug('[customer search]', url.toString()) } catch {}
      const r = await fetch(url.toString())
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      const list: CustomerRow[] = Array.isArray(data) ? data.map((x:any)=>({
        customerSeq: x?.customerSeq ?? x?.customer_seq ?? null,
        customerId: x?.customerId ?? x?.customer_id ?? null,
        customerName: x?.customerName ?? x?.customer_name ?? null,
        ownerName: x?.ownerName ?? x?.owner_name ?? null,
        companyType: x?.companyType ?? x?.company_type ?? null,
      })).sort((a,b)=> String(a.customerName||'').localeCompare(String(b.customerName||''), 'ko-KR')) : []
      setResults(list)
    } catch(e:any) { setError(e?.message || '조회 실패'); setResults([]) }
    finally { setLoading(false) }
  }

  function addToCart(row: CustomerRow) {
    setCart(prev => {
      const exists = prev.some(it => (it.customerId||'') === (row.customerId||''))
      const next = exists ? prev : [row, ...prev]
      if (!selected && next.length > 0) selectCustomer(next[0])
      return next
    })
  }
  function removeFromCart(row: CustomerRow) {
    setCart(prev => prev.filter(it => (it.customerId||'') !== (row.customerId||'')))
    if (selected && (selected.customerId||'') === (row.customerId||'')) {
      const rest = cart.filter(it => (it.customerId||'') !== (row.customerId||''))
      selectCustomer(rest[0] || null)
    }
  }
  function selectCustomer(row: CustomerRow | null) {
    setSelected(row || null)
    try {
      if (row) localStorage.setItem('tnt.sales.selectedCustomer', JSON.stringify({ customerId: row.customerId || '', customerName: row.customerName || '' }))
    } catch {}
  }

  // 처음에는 자동 조회하지 않음. 검색 버튼 클릭 시만 조회.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <div role="dialog" aria-modal="true" style={{ position:'fixed', inset:0, zIndex: 12000 }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.35)' }} />
      <div className="card" style={{ position:'absolute', top:'6%', left:'50%', transform:'translateX(-50%)', width:'min(1200px,96vw)', maxHeight:'88vh', overflow:'auto', padding:12 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <h3 style={{ margin:0 }}>거래처 활동계획수립</h3>
          <button
            className="btn-plain"
            aria-label="닫기"
            title="닫기"
            onClick={onClose}
            style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12, minHeight: 520, alignItems:'start' }}>
          {/* Left: search + cart */}
          <div className="card" style={{ padding:12, overflow:'auto' }}>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
              <input
                className="subject-input"
                placeholder="거래처명"
                value={q}
                onChange={(e)=>setQ(e.target.value)}
                onKeyDown={(e)=>{ if (e.key==='Enter') search() }}
                style={{ flex: '0 0 220px', height: 28, fontSize: 12 }}
              />
              <span
                role="button"
                tabIndex={0}
                className="icon-button"
                title="조회"
                aria-label="조회"
                onClick={search}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
              </span>
            </div>
            <div className="table-container" style={{ maxHeight: 240, overflowY:'auto', overflowX:'hidden', fontSize: 12 }}>
              {results.length === 0 ? (
                <div className="empty-state">{loading ? '불러오는 중…' : (error || '검색 결과가 없습니다')}</div>
              ) : (
                <table className="table" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 100 }}>회사구분</th>
                      <th style={{ width: 180 }}>거래처명</th>
                      <th style={{ width: 120 }}>대표자명</th>
                      <th style={{ width: 48 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((it, idx) => (
                      <tr key={idx}>
                        <td title={(it as any).companyType || ''} style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{(it as any).companyType || ''}</td>
                        <td title={it.customerName || ''} style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{it.customerName || ''}</td>
                        <td title={it.ownerName || ''} style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{it.ownerName || ''}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            role="button"
                            tabIndex={0}
                            className="icon-button"
                            title="계획수립대상 담기"
                            aria-label="계획수립대상 담기"
                            onClick={() => addToCart(it)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
                              <line x1="12" y1="5" x2="12" y2="19"></line>
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ marginTop:12, fontWeight:700 }}>계획수립대상({cart.length})</div>
            <div className="table-container" style={{ maxHeight: 220, overflowY:'auto', overflowX:'hidden', fontSize: 12 }}>
              {cart.length === 0 ? (
                <div className="empty-state">담긴 거래처가 없습니다.</div>
              ) : (
                <table className="table" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 100 }}>회사구분</th>
                      <th style={{ width: 180 }}>거래처명</th>
                      <th style={{ width: 120 }}>대표자명</th>
                      <th style={{ width: 60 }}>작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((it, idx) => (
                      <tr key={idx} className={selected && (selected.customerId||'')===(it.customerId||'') ? 'selected' : ''} onClick={() => selectCustomer(it)}>
                        <td title={(it as any).companyType || ''} style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{(it as any).companyType || ''}</td>
                        <td title={it.customerName || ''} style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{it.customerName || ''}</td>
                        <td title={it.ownerName || ''} style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{it.ownerName || ''}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            role="button"
                            tabIndex={0}
                            className="icon-button"
                            title="삭제"
                            aria-label="삭제"
                            onClick={(e) => { e.stopPropagation(); removeFromCart(it) }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          {/* Right: activity form (single target: selected) */}
          <div className="card plan-compact-card" style={{ overflow:'auto' }}>
            {!selected && (
              <div className="empty-state">좌측에서 거래처를 선택해 주세요.</div>
            )}
            <SalesActivityForm
              bare
              initial={{
                plannedStartAt: prefillAt || undefined,
                ...(selected ? {
                  sfAccountId: selected.customerId || '',
                  customerName: selected.customerName || '',
                  subject: selected?.customerName ? `${selected.customerName} (활동계획) 으로 저장됩니다.` : ''
                } : {})
              }}
              lockSubject={true}
              planMode={true}
              multiTargets={cart}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = x.getDay() || 7 // Sun=0 -> 7
  if (day !== 1) x.setDate(x.getDate() - (day - 1)) // Monday start
  x.setHours(0, 0, 0, 0)
  return x
}

// ISO week number (Mon-based weeks, week 1 is the week with Jan 4th)
function isoWeekNumber(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  // Thursday in current week decides the year
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return { year: date.getUTCFullYear(), week: weekNo }
}

function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  return `${year}년 ${month}월`
}

function formatDay(d: Date): string { return String(d.getDate()) }

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const BASE_HOUR_HEIGHT = 60
const EVENT_HEIGHT = 18
const EVENT_STACK_OFFSET = 18

export function ActivityPlan() {
  const [anchor, setAnchor] = React.useState<Date>(() => new Date())

  const iso = React.useMemo(() => isoWeekNumber(anchor), [anchor])
  const s = React.useMemo(() => startOfWeek(anchor), [anchor])
  const e = React.useMemo(() => { const x = new Date(s); x.setDate(s.getDate()+6); x.setHours(23,59,59,999); return x }, [s])
  const days = React.useMemo(() => Array.from({ length: 7 }).map((_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return d }), [s])
  const scrollRef = React.useRef<HTMLDivElement | null>(null)
  const [menu, setMenu] = React.useState<{ open: boolean; x: number; y: number }>(() => ({ open: false, x: 0, y: 0 }))
  const menuRef = React.useRef<HTMLDivElement | null>(null)
  const [blankPopupOpen, setBlankPopupOpen] = React.useState(false)
  const [regionPopupOpen, setRegionPopupOpen] = React.useState(false)
  const [provinces, setProvinces] = React.useState<string[]>([])
  const [selectedProvince, setSelectedProvince] = React.useState<string>('')
  const [districts, setDistricts] = React.useState<string[]>([])
  const [selectedDistrict, setSelectedDistrict] = React.useState<string>('')
  const [regionSubject, setRegionSubject] = React.useState('')
  const [regionDescription, setRegionDescription] = React.useState('')
  const [regionPlannedStart, setRegionPlannedStart] = React.useState('')
  const [regionPlannedEnd, setRegionPlannedEnd] = React.useState('')
  const [regionCompletionStart, setRegionCompletionStart] = React.useState('')
  const [regionCompletionEnd, setRegionCompletionEnd] = React.useState('')
  const [regionSaving, setRegionSaving] = React.useState(false)
  const [regionError, setRegionError] = React.useState<string | null>(null)
  const [regionSuccess, setRegionSuccess] = React.useState<string | null>(null)
  const [editingPlanId, setEditingPlanId] = React.useState<number | null>(null)
  const [targetQuery, setTargetQuery] = React.useState('')
  const [targetResults, setTargetResults] = React.useState<TargetResult[]>([])
  const [targetLoading, setTargetLoading] = React.useState(false)
  const [targetError, setTargetError] = React.useState<string | null>(null)
  const [selectedTargets, setSelectedTargets] = React.useState<TargetResult[]>([])
  // Prefill datetime for plan form (UTC ISO string), derived from calendar cell
  const [prefillAt, setPrefillAt] = React.useState<string | null>(null)
  // Weekly events (mine only) for display
  const [events, setEvents] = React.useState<CalendarActivity[]>([])
  const [regionPlans, setRegionPlans] = React.useState<Array<{ id: number; subject?: string; plannedStartAt?: string; plannedEndAt?: string; actualStartAt?: string | null; actualEndAt?: string | null; isCompleted?: boolean }>>([])
  const [activityEditId, setActivityEditId] = React.useState<number | null>(null)
  const [activityEditLeadId, setActivityEditLeadId] = React.useState<string | null>(null)
  const [activityEditLeadName, setActivityEditLeadName] = React.useState<string>('')
  const [activityEditTargetKind, setActivityEditTargetKind] = React.useState<'lead' | 'customer' | null>(null)
  const [activityEditCompanyType, setActivityEditCompanyType] = React.useState<string>('')
  const [activityEditInitial, setActivityEditInitial] = React.useState<SalesActivityInitial | undefined>(undefined)
  const [activityEditOpen, setActivityEditOpen] = React.useState(false)
  const lastActivityLoadedId = React.useRef<number | null>(null)

  // Compute dynamic row heights based on max stacked events per hour across the week
  const rowHeights: number[] = React.useMemo(() => {
    const arr = new Array(24).fill(0).map(() => BASE_HOUR_HEIGHT)
    if (!events || events.length === 0) return arr
    // Count max stack by hour across days
    const stackByHour: number[] = new Array(24).fill(0)
    const startDay = new Date(s.getFullYear(), s.getMonth(), s.getDate())
    for (let h = 0; h < 24; h++) {
      let maxStack = 0
      for (let d = 0; d < 7; d++) {
        const day = new Date(startDay)
        day.setDate(day.getDate() + d)
        const keyY = day.getFullYear(), keyM = day.getMonth(), keyD = day.getDate()
        const count = events.reduce((acc, ev) => {
          if (!ev.plannedStartAt) return acc
          const t = new Date(ev.plannedStartAt)
          if (t.getFullYear()===keyY && t.getMonth()===keyM && t.getDate()===keyD && t.getHours()===h) return acc+1
          return acc
        }, 0)
        if (count > maxStack) maxStack = count
      }
      stackByHour[h] = maxStack
    }
    // Height rule: base + EVENT_STACK_OFFSET per extra stacked item (beyond 1), clamp to [BASE, BASE+64]
    for (let h = 0; h < 24; h++) {
      const stacks = Math.max(0, stackByHour[h] - 1)
      arr[h] = Math.min(BASE_HOUR_HEIGHT + stacks * EVENT_STACK_OFFSET, BASE_HOUR_HEIGHT + 64)
    }
    return arr
  }, [events, s])

  // Precompute cumulative offsets for variable row heights
  const rowOffsets: number[] = React.useMemo(() => {
    const off: number[] = [0]
    for (let i = 0; i < 24; i++) off[i+1] = off[i] + (rowHeights[i] || BASE_HOUR_HEIGHT)
    return off
  }, [rowHeights])

  const loadWeekEvents = React.useCallback(async () => {
    try {
      const assigneeId = localStorage.getItem('tnt.sales.assigneeId') || ''
      const empId = localStorage.getItem('tnt.sales.empId') || ''
      const url = new URL('/api/v1/sales-activities', window.location.origin)
      if (assigneeId) url.searchParams.set('assigneeId', assigneeId)
      else if (empId) url.searchParams.set('empId', empId)
      url.searchParams.set('mineOnly', 'true')
      url.searchParams.set('start', s.toISOString())
      url.searchParams.set('end', e.toISOString())
      url.searchParams.set('onlyRoot', 'true')
      url.searchParams.set('_t', Date.now().toString()) // Cache buster
      const res = await fetch(url.toString(), { cache: 'no-cache' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const list = Array.isArray(data) ? data : []
      setEvents(list.map((x:any)=>{
        const plannedStart = x.plannedStartAt || x.planned_start_at
        const status = (x.activityStatus || x.activity_status || '').toString().toLowerCase()
        const isCompleted = status === 'completed' || status === '완료'
        return {
          id: Number(x.id),
          subject: x.subject,
          description: x.description,
          activityType: x.activityType || x.activity_type,
          activityStatus: x.activityStatus || x.activity_status,
          channel: x.channel,
          plannedStartAt: plannedStart ? new Date(plannedStart).toISOString() : undefined,
          plannedEndAt: x.plannedEndAt || x.planned_end_at || null,
          actualStartAt: x.actualStartAt || x.actual_start_at || undefined,  // 종료일시 (actual_start_at)
          sfAccountId: x.sfAccountId || x.sf_account_id || undefined,
          customerName: x.customerName || x.customer_name || '',
          leadId: x.sfLeadId || x.sf_lead_id || null,
          companyType: x.companyType || x.company_type || x.companyTypeName || x.company_type_name || null,
          isCompleted
        } as CalendarActivity
      }))
    } catch {
      setEvents([])
    }
  }, [s, e])

  const loadRegionPlans = React.useCallback(async () => {
    try {
      const assigneeId = localStorage.getItem('tnt.sales.assigneeId') || localStorage.getItem('tnt.sales.empId') || ''
      if (!assigneeId) { setRegionPlans([]); return }
      const url = new URL('/api/v1/region-activity-plans', window.location.origin)
      url.searchParams.set('assigneeId', assigneeId)
      url.searchParams.set('start', s.toISOString())
      url.searchParams.set('end', e.toISOString())
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const list = Array.isArray(data) ? data : []
      setRegionPlans(list.map((x:any)=>({
        id: Number(x.id),
        subject: x.subject,
        plannedStartAt: x.planned_start_at || x.plannedStartAt || null,
        plannedEndAt: x.planned_end_at || x.plannedEndAt || null,
        actualStartAt: x.actual_start_at || x.actualStartAt || null,
        actualEndAt: x.actual_end_at || x.actualEndAt || null,
        isCompleted: !!(x.actual_start_at || x.actualStartAt || x.actual_end_at || x.actualEndAt)
      })))
    } catch {
      setRegionPlans([])
    }
  }, [s, e])

  React.useEffect(() => { loadWeekEvents() }, [loadWeekEvents])
  React.useEffect(() => { loadRegionPlans() }, [loadRegionPlans])
  React.useEffect(() => {
    const onU = () => { try { loadWeekEvents() } catch {} }
    window.addEventListener('tnt.sales.activity.updated' as any, onU)
    return () => window.removeEventListener('tnt.sales.activity.updated' as any, onU)
  }, [loadWeekEvents])

  const weekLabel = `${iso.week}주차`
  const monthLabel = formatDate(anchor)

  const prevWeek = React.useCallback(() => {
    setAnchor((d) => { const x = new Date(d); x.setDate(x.getDate() - 7); return x })
  }, [])

  const nextWeek = React.useCallback(() => {
    setAnchor((d) => { const x = new Date(d); x.setDate(x.getDate() + 7); return x })
  }, [])

  const thisWeek = React.useCallback(() => { setAnchor(new Date()) }, [])

  // Keyboard navigation
  React.useEffect(() => {
    function isInteractive(el: HTMLElement | null): boolean {
      let cur: HTMLElement | null = el
      while (cur) {
        const tag = (cur.tagName || '').toLowerCase()
        if (['input','textarea','select','button','label','a'].includes(tag)) return true
        if ((cur as any)?.isContentEditable) return true
        cur = cur.parentElement
      }
      return false
    }
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (isInteractive(target) || isInteractive(document.activeElement as HTMLElement | null)) return
      if (e.key === 'ArrowLeft') { e.preventDefault(); prevWeek() }
      else if (e.key === 'ArrowRight') { e.preventDefault(); nextWeek() }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [prevWeek, nextWeek])

  // calendar removed: no grid, no scroll container
  const didInitScroll = React.useRef(false)
  React.useEffect(() => {
    if (didInitScroll.current) return
    const el = scrollRef.current
    if (!el) return
    const y = rowOffsets[7] || (7 * BASE_HOUR_HEIGHT)
    let attempts = 0
    const maxAttempts = 30
    const tryScroll = () => {
      if (!el) return
      el.scrollTop = y
      attempts += 1
      // If applied (or tried enough), stop
      if (Math.abs(el.scrollTop - y) < 2 || attempts >= maxAttempts) {
        didInitScroll.current = true
        return
      }
      // Keep nudging until layout stabilizes
      setTimeout(() => requestAnimationFrame(tryScroll), 50)
    }
    requestAnimationFrame(tryScroll)
  }, [rowOffsets])

  // Close custom context menu on click outside or ESC
  React.useEffect(() => {
    if (!menu.open) return
    const close = (e?: Event) => {
      // Ignore clicks inside the menu container
      const target = (e?.target as HTMLElement) || null
      if (menuRef.current && target && menuRef.current.contains(target)) return
      setMenu({ open: false, x: 0, y: 0 })
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('click', close, true)
    window.addEventListener('contextmenu', close, true)
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('click', close, true)
      window.removeEventListener('contextmenu', close, true)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [menu.open])

  const loadProvinces = React.useCallback(async () => {
    try {
      const r = await fetch('/api/v1/address/provinces')
      const data = r.ok ? await r.json() : []
      const list: string[] = Array.isArray(data) ? data.filter(Boolean) : []
      setProvinces(list)
    } catch { setProvinces([]) }
  }, [])
  const loadDistricts = React.useCallback(async (pv: string) => {
    try {
      if (!pv) { setDistricts([]); return }
      const url = new URL('/api/v1/address/districts', window.location.origin)
      url.searchParams.set('province', pv)
      const r = await fetch(url.toString())
      const data = r.ok ? await r.json() : []
      const list: string[] = Array.isArray(data) ? data.filter(Boolean) : []
      setDistricts(list)
    } catch { setDistricts([]) }
  }, [])

  const resetRegionFormValues = React.useCallback(() => {
    setRegionSubject('')
    setRegionDescription('')
    setRegionPlannedStart('')
    setRegionPlannedEnd('')
    setRegionCompletionStart('')
    setRegionCompletionEnd('')
    setRegionError(null)
    setSelectedTargets([])
    setEditingPlanId(null)
  }, [])

  const openRegionPopup = React.useCallback(() => {
    resetRegionFormValues()
    const defaultStart = prefillAt ? isoToDateInput(prefillAt) : ''
    setRegionPlannedStart(defaultStart)
    setSelectedProvince('')
    setSelectedDistrict('')
    setDistricts([])
    setRegionPopupOpen(true)
    loadProvinces()
  }, [prefillAt, loadProvinces, resetRegionFormValues])

  const closeRegionPopup = React.useCallback(() => {
    resetRegionFormValues()
    setRegionSuccess(null)
    setRegionPopupOpen(false)
  }, [resetRegionFormValues])

  React.useEffect(() => {
    if (!regionPopupOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeRegionPopup()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [regionPopupOpen, closeRegionPopup])

  const getCurrentAssigneeId = React.useCallback(() => {
    try {
      return localStorage.getItem('tnt.sales.assigneeId') || localStorage.getItem('tnt.sales.empId') || ''
    } catch {
      return ''
    }
  }, [])

  React.useEffect(() => {
    if (!regionPopupOpen) return
    if (regionSubject && regionSubject.trim().length > 0) return
    if (!selectedProvince) return
    const base = selectedDistrict ? `${selectedProvince} ${selectedDistrict}` : selectedProvince
    setRegionSubject(`${base} 지역활동`)
  }, [regionPopupOpen, regionSubject, selectedProvince, selectedDistrict])

  async function openRegionPlanForEdit(planId: number) {
    try {
      const res = await fetch(`/api/v1/region-activity-plans/${planId}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      resetRegionFormValues()
      setEditingPlanId(planId)
      setRegionSubject(data?.subject || '')
      setRegionDescription(data?.description || '')
      const province = data?.addrProvinceName || data?.addr_province_name || ''
      const district = data?.addrDistrictName || data?.addr_district_name || ''
      await loadProvinces()
      setSelectedProvince(province)
      if (province) {
        await loadDistricts(province)
      } else {
        setDistricts([])
      }
      setSelectedDistrict(district)
      setRegionPlannedStart(data?.planned_start_at ? isoToDateInput(data.planned_start_at) : '')
      setRegionPlannedEnd(data?.planned_end_at ? isoToDateInput(data.planned_end_at) : '')
      setRegionCompletionStart(data?.actual_start_at ? isoToDateInput(data.actual_start_at) : '')
      setRegionCompletionEnd(data?.actual_end_at ? isoToDateInput(data.actual_end_at) : '')
      const targets = Array.isArray(data?.targets) ? data.targets : []
      setSelectedTargets(targets.map((t:any, idx:number) => {
        const customerId = t?.customerId || t?.customer_id || ''
        const leadId = t?.leadId || t?.lead_id || ''
        const type: 'customer' | 'lead' = customerId ? 'customer' : 'lead'
        const key = customerId ? `customer-${customerId}` : (leadId ? `lead-${leadId}` : `target-${idx}-${planId}`)
        return {
          key,
          type,
          name: t?.displayName || t?.display_name || customerId || leadId || '(대상)',
          companyType: t?.companyType || t?.company_type || null,
          customerId: customerId || undefined,
          leadId: leadId || undefined
        }
      }))
      setRegionPopupOpen(true)
    } catch (e:any) {
      window.alert(e?.message || '지역활동 계획을 불러오지 못했습니다.')
    }
  }


  async function handleRegionPlanSubmit() {
    const subject = regionSubject.trim()
    if (!subject) {
      setRegionError('제목을 입력해 주세요.')
      setRegionSuccess(null)
      return
    }
    if (!selectedProvince) {
      setRegionError('방문 도(Province)를 선택해 주세요.')
      setRegionSuccess(null)
      return
    }
    if (!selectedDistrict) {
      setRegionError('방문 시/군/구(District)를 선택해 주세요.')
      setRegionSuccess(null)
      return
    }
    const assigneeId = getCurrentAssigneeId().trim()
    if (!assigneeId) {
      setRegionError('담당자 정보를 확인할 수 없습니다. 다시 로그인해 주세요.')
      setRegionSuccess(null)
      return
    }
    const payload: Record<string, any> = {
      subject,
      addrProvinceName: selectedProvince,
      addrDistrictName: selectedDistrict,
      assigneeId
    }
    const desc = regionDescription?.trim()
    if (desc) payload.description = desc
    const plannedStartAt = dateInputToIso(regionPlannedStart, 8)
    const plannedEndAt = dateInputToIso(regionPlannedEnd)
    if (plannedStartAt) payload.plannedStartAt = plannedStartAt
    if (plannedEndAt) payload.plannedEndAt = plannedEndAt
    const completionStartIso = dateInputToIso(regionCompletionStart)
    const completionEndIso = dateInputToIso(regionCompletionEnd)
    if (completionStartIso) payload.actualStartAt = completionStartIso
    if (completionEndIso) payload.actualEndAt = completionEndIso
    const targetPayload = selectedTargets
      .map((t) => {
        if (t.type === 'customer' && t.customerId) {
          return { customerId: t.customerId }
        }
        if (t.type === 'lead' && t.leadId) {
          return { leadId: t.leadId }
        }
        return null
      })
      .filter(Boolean) as Array<{ customerId?: string; leadId?: string }>
    if (targetPayload.length > 0) payload.targets = targetPayload
    const auditId = Number(assigneeId)
    if (!Number.isNaN(auditId)) {
      if (!editingPlanId) payload.createdBy = auditId
      payload.updatedBy = auditId
    }

    setRegionSaving(true)
    setRegionError(null)
    setRegionSuccess(null)
    try {
      const endpoint = editingPlanId ? `/api/v1/region-activity-plans/${editingPlanId}` : '/api/v1/region-activity-plans'
      const method = editingPlanId ? 'PUT' : 'POST'
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      let data: any = null
      try { data = await res.json() } catch { data = null }
      if (!res.ok) {
        const msg = data?.message || data?.error || `HTTP ${res.status}`
        throw new Error(msg)
      }
      const okMsg = editingPlanId ? '지역활동 계획이 수정되었습니다.' : '지역활동 계획이 등록되었습니다.'
      setRegionSuccess(okMsg)
      setRegionError(null)
      await loadRegionPlans()
    } catch (e: any) {
      setRegionError(e?.message || '등록에 실패했습니다.')
      setRegionSuccess(null)
    } finally {
      setRegionSaving(false)
    }
  }

  async function searchTargets() {
    const query = targetQuery.trim()
    if (!query) {
      setTargetError('검색어를 입력해 주세요.')
      setTargetResults([])
      return
    }
    setTargetLoading(true)
    setTargetError(null)
    try {
      const [customerList, leadList] = await Promise.all([
        (async () => {
          const url = new URL('/api/v1/customers', window.location.origin)
          url.searchParams.set('mineOnly','false')
          url.searchParams.set('limit','50')
          url.searchParams.set('name', query)
          const res = await fetch(url.toString())
          if (!res.ok) throw new Error(`거래처 조회 실패 (HTTP ${res.status})`)
          const data = await res.json()
          return Array.isArray(data) ? data : []
        })(),
        (async () => {
          const url = new URL('/api/v1/leads', window.location.origin)
          url.searchParams.set('limit','50')
          url.searchParams.set('company_name', query)
          const res = await fetch(url.toString())
          if (!res.ok) throw new Error(`잠재고객 조회 실패 (HTTP ${res.status})`)
          const data = await res.json()
          return Array.isArray(data) ? data : []
        })()
      ])
      const combined: TargetResult[] = [
        ...customerList.map((it: any, idx: number) => {
          const rawId = it?.customerId ?? it?.customer_id ?? it?.customerSeq ?? it?.customer_seq ?? ''
          const customerId = rawId != null ? String(rawId).trim() : ''
          const key = customerId ? `customer-${customerId}` : `customer-${idx}-${Math.random().toString(36).slice(2)}`
          const companyTypeRaw =
            it?.companyType ?? it?.company_type ??
            it?.companyTypeName ?? it?.company_type_name ??
            it?.companyClass ?? it?.company_class ??
            it?.companyGroup ?? it?.company_group ?? null
          return {
            key,
            type: 'customer' as const,
            name: it?.customerName ?? it?.customer_name ?? '(이름 없음)',
            companyType: companyTypeRaw != null ? String(companyTypeRaw) : null,
            customerId: customerId || undefined
          }
        }),
        ...leadList.map((it: any, idx: number) => {
          const rawLeadId = it?.id ?? it?.lead_id ?? ''
          const leadId = rawLeadId != null ? String(rawLeadId).trim() : ''
          const key = leadId ? `lead-${leadId}` : `lead-${idx}-${Math.random().toString(36).slice(2)}`
          return {
            key,
            type: 'lead' as const,
            name: it?.company_name ?? it?.companyName ?? it?.contact_name ?? '(이름 없음)',
            leadId: leadId || undefined
          }
        })
      ]
      setTargetResults(combined)
      if (combined.length === 0) {
        setTargetError('조회 결과가 없습니다.')
      }
    } catch (e: any) {
      setTargetError(e?.message || '조회에 실패했습니다.')
      setTargetResults([])
    } finally {
      setTargetLoading(false)
    }
  }

  function addTarget(target: TargetResult) {
    setSelectedTargets(prev => {
      if (prev.some(it => it.key === target.key)) return prev
      return [...prev, target]
    })
  }

  function removeTarget(key: string) {
    setSelectedTargets(prev => prev.filter(it => it.key !== key))
  }

  const openActivityModal = React.useCallback((activity: CalendarActivity) => {
    setActivityEditId(activity.id)
    const kind = activity.leadId ? 'lead' : 'customer'
    if (lastActivityLoadedId.current !== activity.id) {
      setActivityEditLeadId(activity.leadId ?? null)
      setActivityEditLeadName(activity.customerName || '')
      setActivityEditTargetKind(kind)
      setActivityEditCompanyType(kind === 'customer' ? (activity.companyType || '') : '')
    setActivityEditInitial({
      id: activity.id,
      subject: activity.subject,
        description: activity.description,
        activityType: activity.activityType,
        activityStatus: activity.activityStatus,
        channel: activity.channel,
        plannedStartAt: activity.plannedStartAt,
        actualStartAt: activity.actualStartAt,
        sfAccountId: activity.sfAccountId,
        customerName: activity.customerName
      })
      lastActivityLoadedId.current = activity.id
    } else {
      setActivityEditTargetKind(kind)
    }
    setActivityEditOpen(true)
  }, [])

  const closeActivityModal = React.useCallback(() => {
    setActivityEditOpen(false)
    setActivityEditId(null)
    setActivityEditLeadId(null)
    setActivityEditLeadName('')
    setActivityEditTargetKind(null)
    setActivityEditCompanyType('')
    setActivityEditInitial(undefined)
    lastActivityLoadedId.current = null
  }, [])

  // Compute weekly statistics
  const weekStats = React.useMemo(() => {
    const customerTotal = events.length
    const customerCompleted = events.filter(e => e.isCompleted).length
    const regionTotal = regionPlans.length
    const regionCompleted = regionPlans.filter(p => p.isCompleted).length
    const totalPlanned = customerTotal + regionTotal
    const totalCompleted = customerCompleted + regionCompleted
    const achievementRate = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0
    return {
      customerTotal,
      customerCompleted,
      regionTotal,
      regionCompleted,
      totalPlanned,
      totalCompleted,
      achievementRate
    }
  }, [events, regionPlans])

  return (
    <section className="activity-plan-page">
      {/* Navigation */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button
            onClick={prevWeek}
            title="이전 주"
            style={{
              width: 32,
              height: 32,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              color: 'var(--text)',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button
            onClick={nextWeek}
            title="다음 주"
            style={{
              width: 32,
              height: 32,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              color: 'var(--text)',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
          <button className="btn" onClick={thisWeek} style={{ marginLeft: 4 }}>오늘</button>
          <span className="badge" style={{ marginLeft: 'auto' }}>{monthLabel} {weekLabel}</span>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="activity-kpi-grid">
        {/* Total Achievement */}
        <div className="card kpi-card" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(147,51,234,0.1) 100%)' }}>
          <div className="kpi-label">주간 달성률</div>
          <div className="kpi-value">
            <span className="kpi-number">{weekStats.achievementRate}</span>
            <span className="kpi-unit">%</span>
          </div>
          <div className="kpi-desc">
            목표 {weekStats.totalPlanned}건 / 완료 {weekStats.totalCompleted}건
          </div>
        </div>

        {/* Customer Activities */}
        <div className="card kpi-card">
          <div className="kpi-label">거래처 활동</div>
          <div className="kpi-stats">
            <div>
              <div className="kpi-stat-label" style={{ color: '#dc2626' }}>목표</div>
              <div className="kpi-stat-value" style={{ color: '#dc2626' }}>{weekStats.customerTotal}</div>
            </div>
            <div className="kpi-arrow">→</div>
            <div>
              <div className="kpi-stat-label" style={{ color: '#2563eb' }}>완료</div>
              <div className="kpi-stat-value" style={{ color: '#2563eb' }}>{weekStats.customerCompleted}</div>
            </div>
          </div>
          <div className="kpi-progress">
            <div style={{ width: `${weekStats.customerTotal > 0 ? (weekStats.customerCompleted / weekStats.customerTotal) * 100 : 0}%`, background: 'linear-gradient(90deg, #dc2626 0%, #2563eb 100%)' }} />
          </div>
        </div>

        {/* Region Activities */}
        <div className="card kpi-card">
          <div className="kpi-label">지역 활동</div>
          <div className="kpi-stats">
            <div>
              <div className="kpi-stat-label" style={{ color: '#dc2626' }}>목표</div>
              <div className="kpi-stat-value" style={{ color: '#dc2626' }}>{weekStats.regionTotal}</div>
            </div>
            <div className="kpi-arrow">→</div>
            <div>
              <div className="kpi-stat-label" style={{ color: '#10b981' }}>완료</div>
              <div className="kpi-stat-value" style={{ color: '#10b981' }}>{weekStats.regionCompleted}</div>
            </div>
          </div>
          <div className="kpi-progress">
            <div style={{ width: `${weekStats.regionTotal > 0 ? (weekStats.regionCompleted / weekStats.regionTotal) * 100 : 0}%`, background: 'linear-gradient(90deg, #dc2626 0%, #10b981 100%)' }} />
          </div>
        </div>
      </div>

      {/* Weekly time grid */}
      <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Fixed header inside card (not in scroll area) */}
        <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', background: 'var(--panel)', borderBottom: '1px solid var(--border)', flex: '0 0 auto' }}>
          <div style={{ padding: 8, fontSize: 12, color: 'var(--text-muted)' }}>시간</div>
          {days.map((d, i) => (
            <div key={i} style={{ padding: 8, textAlign: 'center', borderLeft: i>0 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{['월','화','수','목','금','토','일'][i]} {formatDay(d)}</div>
            </div>
          ))}
        </div>

        {/* Single scroll container for the whole week grid */}
        <div
          ref={scrollRef}
          className="calendar-scroll"
          onContextMenu={(e) => {
            e.preventDefault()
            // Try to detect hovered cell or event to compute focused date/time
            const target = e.target as HTMLElement | null
            let dayIdx: number | null = null
            let hour: number | null = null
            const pickFromEl = (el: HTMLElement | null) => {
              if (!el) return false
              const dayIdxStr = el.getAttribute('data-day') || (el as any).dataset?.day
              const hourStr = el.getAttribute('data-hour') || (el as any).dataset?.hour
              const d = dayIdxStr ? parseInt(dayIdxStr, 10) : NaN
              const h = hourStr ? parseInt(hourStr, 10) : NaN
              if (!Number.isNaN(d) && !Number.isNaN(h)) { dayIdx = d; hour = h; return true }
              return false
            }
            // Prefer week-event (overlay), then week-cell
            const evEl = target ? (target.closest('.week-event') as HTMLElement | null) : null
            const cellEl = target ? (target.closest('.week-cell') as HTMLElement | null) : null
            if (!(pickFromEl(evEl) || pickFromEl(cellEl))) {
              // Fallback: compute from mouse position within scroll container
              const sc = scrollRef.current
              if (sc) {
                const rect = sc.getBoundingClientRect()
                const x = e.clientX - rect.left
                const y = e.clientY - rect.top + sc.scrollTop
                const dayAreaX = x - 60 // minus time column
                const dayWidth = Math.max(1, (rect.width - 60) / 7)
                const d = Math.floor(dayAreaX / dayWidth)
                // Map y to hour by cumulative variable row heights
                let h = 0
                for (let i = 0; i < 24; i++) { if (y >= rowOffsets[i]) h = i; else break }
                if (d >= 0 && d <= 6 && h >= 0 && h <= 23) { dayIdx = d; hour = h }
              }
            }
            if (dayIdx != null && hour != null) {
              const base = new Date(s)
              base.setDate(base.getDate() + dayIdx)
              base.setHours(hour, 0, 0, 0)
              setPrefillAt(new Date(base).toISOString())
            }
            setMenu({ open: true, x: e.clientX, y: e.clientY })
          }}
          style={{ flex: 1, overflowY: 'scroll', overflowX: 'hidden', minHeight: 0 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', gridTemplateRows: rowHeights.map(h=>`${h}px`).join(' '), position: 'relative' }}>
            {HOURS.map((h) => (
              <React.Fragment key={h}>
                <div style={{ gridColumn: '1', gridRow: `${h+1}`, height: rowHeights[h] || BASE_HOUR_HEIGHT, padding: '4px 8px', fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
                  {String(h).padStart(2,'0')}:00
                </div>
                {days.map((_, idx) => (
                  <div
                    key={`${h}-${idx}`}
                    className="week-cell"
                    data-day={idx}
                    data-hour={h}
                    style={{ gridColumn: `${idx+2}`, gridRow: `${h+1}`, borderTop: '1px solid var(--border)', borderLeft: '1px solid var(--border)' }}
                  />
                ))}
              </React.Fragment>
            ))}
            {/* Week activities overlay: show subject in each day/hour slot for the current week */}
            {(() => {
              // Simple stacking per cell key to avoid exact overlap
              const stackCount = new Map<string, number>()
              const eventBlocks = events.map((ev) => {
                if (!ev.plannedStartAt) return null
                const d = new Date(ev.plannedStartAt)
                // Column by weekday index relative to current week start
                const dayIdx = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime()) / 86400000)
                if (dayIdx < 0 || dayIdx > 6) return null
                const hour = d.getHours()
                const key = `${dayIdx}-${hour}`
                const idx = (stackCount.get(key) || 0)
                stackCount.set(key, idx + 1)
                const label = ev.isCompleted ? '(완)' : '(계)'
                const labelColor = ev.isCompleted ? '#2563eb' : '#dc2626'
                return (
                  <div key={`ev-${ev.id}-${idx}`}
                       className="week-event"
                       data-day={dayIdx}
                       data-hour={hour}
                       onDoubleClick={(e)=>{ e.stopPropagation(); openActivityModal(ev) }}
                       style={{
                         gridColumn: `${dayIdx + 2}`,
                         gridRow: `${hour + 1}`,
                         height: EVENT_HEIGHT,
                         padding: '0 6px',
                         fontSize: 10,
                         background: 'rgba(59,130,246,.12)',
                         border: '1px solid var(--accent)',
                         borderRadius: 6,
                         margin: 1,
                         marginTop: idx * EVENT_STACK_OFFSET,
                         display: 'flex',
                         alignItems: 'center',
                         justifyContent: 'flex-start',
                         whiteSpace: 'nowrap',
                         overflow: 'hidden',
                         textOverflow: 'ellipsis',
                         textAlign: 'left'
                       }}
                       title={ev.subject || ''}
                  >
                    <span style={{ color: labelColor, fontWeight:700, marginRight:4 }}>{label}</span>
                    <span>{ev.subject || '(제목 없음)'}</span>
                  </div>
                )
              })
              const weekStartMidnight = new Date(s.getFullYear(), s.getMonth(), s.getDate())
              const regionBlocks = regionPlans.map((plan) => {
                if (!plan.plannedStartAt) return null
                const start = new Date(plan.plannedStartAt)
                if (isNaN(start.getTime())) return null
                const dayIdx = Math.floor((new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() - weekStartMidnight.getTime()) / 86400000)
                if (dayIdx < 0 || dayIdx > 6) return null
                const hour = start.getHours()
                const key = `${dayIdx}-${hour}`
                const idx = stackCount.get(key) || 0
                stackCount.set(key, idx + 1)
                const isCompleted = plan.isCompleted || !!plan.actualEndAt
                const label = isCompleted ? '(완)' : '(계)'
                const labelColor = isCompleted ? '#2563eb' : '#dc2626'
                return (
                  <div
                    key={`region-${plan.id}-${dayIdx}-${hour}-${idx}`}
                    className="week-event"
                    data-day={dayIdx}
                    data-hour={hour}
                    onDoubleClick={(e) => { e.stopPropagation(); openRegionPlanForEdit(plan.id) }}
                    style={{
                      gridColumn: `${dayIdx + 2}`,
                      gridRow: `${hour + 1}`,
                      height: EVENT_HEIGHT,
                      padding: '0 6px',
                      fontSize: 10,
                      background: 'rgba(16,185,129,.18)',
                      border: '1px solid rgba(16,185,129,.6)',
                      borderRadius: 6,
                      margin: 1,
                      marginTop: idx * EVENT_STACK_OFFSET,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      textAlign: 'left'
                    }}
                    title={plan.subject || ''}
                  >
                    <span style={{ color: labelColor, fontWeight:700, marginRight:4 }}>{label}</span>
                    <span>{plan.subject || '(지역활동)'}</span>
                  </div>
                )
              }).filter(Boolean)
              return [...eventBlocks, ...regionBlocks]
            })()}
          </div>
        </div>
      </div>

      {/* Context menu: 거래처활동 / 지역활동 */}
      {menu.open && (
        <div
          className="context-menu"
          role="menu"
          ref={menuRef}
          style={{ position: 'fixed', left: menu.x + 6, top: menu.y + 6, zIndex: 20050 }}
        >
          <button className="context-item" role="menuitem" onClick={() => { setMenu({ open: false, x: 0, y: 0 }); setBlankPopupOpen(true) }}>거래처활동</button>
          <button className="context-item" role="menuitem" onClick={() => { setMenu({ open: false, x: 0, y: 0 }); openRegionPopup() }}>지역활동</button>
        </div>
      )}
      {/* Registration popup: left=customer search & cart, right=activity form */}
      {blankPopupOpen && (
        <CustomerActivityRegisterModal onClose={() => setBlankPopupOpen(false)} prefillAt={prefillAt} />
      )}
      {regionPopupOpen && (
        <div role="dialog" aria-modal="true" style={{ position:'fixed', inset:0, zIndex: 13000 }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.35)' }} />
          <div style={{ position:'absolute', top:'8%', left:'50%', transform:'translateX(-50%)', width:'min(920px,96vw)', maxHeight:'84vh' }}>
            <div
              className="card plan-compact-card"
              style={{ height:'100%', overflow:'auto', padding:12, position:'relative' }}
            >
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <h3 style={{ margin:0 }}>지역활동 계획</h3>
                <span
                  role="button"
                  tabIndex={0}
                  className="icon-button"
                  aria-label="닫기"
                  title="닫기"
                  onClick={closeRegionPopup}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </span>
              </div>
            <div style={{ display:'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,380px)', gap:12 }}>
              <div className="plan-compact" style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div className="field" style={{ display:'grid', gridTemplateColumns:'90px 1fr', gap:6, alignItems:'center' }}>
                  <label>제목</label>
                  <input
                    className="subject-input"
                    value={regionSubject}
                  onChange={(e)=> setRegionSubject(e.target.value)}
                  placeholder="예: 서울 강남구 지역활동"
                />
              </div>
              <div className="field" style={{ display:'grid', gridTemplateColumns:'90px 1fr', gap:6, alignItems:'center' }}>
                <label>도 선택</label>
                <select value={selectedProvince} onChange={(e)=>{ const v=e.target.value; setSelectedProvince(v); setSelectedDistrict(''); loadDistricts(v) }} style={{ height: 32 }}>
                  <option value="">— 선택 —</option>
                  {provinces.map((p, i)=>(<option key={`${p}-${i}`} value={p}>{p}</option>))}
                </select>
              </div>
              <div className="field" style={{ display:'grid', gridTemplateColumns:'90px 1fr', gap:6, alignItems:'center' }}>
                <label>시군 선택</label>
                <select value={selectedDistrict} onChange={(e)=> setSelectedDistrict(e.target.value)} disabled={!selectedProvince} style={{ height: 32 }}>
                  <option value="">— 선택 —</option>
                  {districts.map((d, i)=>(<option key={`${d}-${i}`} value={d}>{d}</option>))}
                </select>
              </div>
              <div className="field" style={{ display:'grid', gridTemplateColumns:'90px 1fr', gap:6, alignItems:'center' }}>
                <label>계획 일정</label>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                    <div style={{ flex:1, minWidth:160, display:'flex', gap:4 }}>
                      <input
                        className="subject-input"
                        type="date"
                        value={regionPlannedStart}
                        onChange={(e)=> setRegionPlannedStart(e.target.value)}
                        style={{ flex:1 }}
                      />
                    </div>
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>~</span>
                    <div style={{ flex:1, minWidth:160, display:'flex', gap:4 }}>
                      <input
                        className="subject-input"
                        type="date"
                        value={regionPlannedEnd}
                        onChange={(e)=> setRegionPlannedEnd(e.target.value)}
                        style={{ flex:1 }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="field" style={{ display:'grid', gridTemplateColumns:'90px 1fr', gap:6, alignItems:'center' }}>
                <label>완료일</label>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                    <div style={{ flex:1, minWidth:160, display:'flex', gap:4 }}>
                      <input
                        className="subject-input"
                        type="date"
                        value={regionCompletionStart}
                        onChange={(e)=> setRegionCompletionStart(e.target.value)}
                        style={{ flex:1 }}
                      />
                    </div>
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>~</span>
                    <div style={{ flex:1, minWidth:160, display:'flex', gap:4 }}>
                      <input
                        className="subject-input"
                        type="date"
                        value={regionCompletionEnd}
                        onChange={(e)=> setRegionCompletionEnd(e.target.value)}
                        style={{ flex:1 }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="field" style={{ display:'flex', flexDirection:'column', gap:4 }}>
                <label>활동계획/설명</label>
                <textarea
                  value={regionDescription}
                  onChange={(e)=> setRegionDescription(e.target.value)}
                  placeholder="방문 목적, 세부 활동계획, 비고 등을 입력해 주세요."
                  rows={4}
                  style={{ resize:'vertical', padding:8 }}
                />
              </div>
              </div>
              <div className="card" style={{ padding:10, background:'var(--panel-2)', borderRadius:12, display:'flex', flexDirection:'column', gap:8, minHeight:0 }}>
                <div style={{ fontWeight:600, fontSize:13 }}>영업대상 조회/등록</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <input
                    className="subject-input"
                    placeholder="거래처 또는 잠재고객명으로 검색"
                    value={targetQuery}
                    onChange={(e)=> setTargetQuery(e.target.value)}
                    onKeyDown={(e)=> { if (e.key === 'Enter') { e.preventDefault(); searchTargets() } }}
                  />
                  <button className="btn" type="button" onClick={searchTargets} disabled={targetLoading}>조회</button>
                </div>
                <div className="table-container" style={{ maxHeight:220, overflowY:'auto', overflowX:'hidden', background:'var(--panel)', borderRadius:8, padding:6 }}>
                  {targetLoading ? (
                    <div className="empty-state">조회 중…</div>
                  ) : targetResults.length === 0 ? (
                    <div className="empty-state">{targetError || '조회 결과가 없습니다.'}</div>
                  ) : (
                    targetResults.map(item => {
                      const badge = getBadgeStyle(item)
                      return (
                        <div key={item.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 4px', borderBottom:'1px solid var(--border)' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:0 }}>
                            <span title={item.name} style={{ fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', flex:1 }}>{item.name}</span>
                            <span
                              title={badge.label}
                              style={{ width:22, height:22, borderRadius:'50%', background: badge.bg, color: badge.color, fontWeight:700, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:12 }}
                            >
                              <span style={{ width:18, height:18, borderRadius:'50%', background: badge.iconBg, color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>{badge.icon}</span>
                            </span>
                          </div>
                          <button
                            className="btn-ghost"
                            type="button"
                            onClick={()=> addTarget(item)}
                            style={{ width:28, height:28, display:'inline-flex', alignItems:'center', justifyContent:'center', border:'none' }}
                            aria-label="등록"
                          >
                            <span style={{ fontSize:18, lineHeight:1 }}>+</span>
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
                <div style={{ fontWeight:600, fontSize:12 }}>등록된 대상 ({selectedTargets.length})</div>
                <div className="table-container" style={{ maxHeight:140, overflowY:'auto', background:'var(--panel)', borderRadius:8, padding:6 }}>
                  {selectedTargets.length === 0 ? (
                    <div className="empty-state">등록된 대상이 없습니다.</div>
                  ) : (
                    selectedTargets.map(item => {
                      const badge = getBadgeStyle(item)
                      return (
                        <div key={`selected-${item.key}`} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 2px', borderBottom:'1px dashed var(--border)' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:0 }}>
                            <span title={item.name} style={{ fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', flex:1 }}>{item.name}</span>
                            <span
                              title={badge.label}
                              style={{ width:22, height:22, borderRadius:'50%', background: badge.bg, color: badge.color, fontWeight:700, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:12 }}
                            >
                              <span style={{ width:18, height:18, borderRadius:'50%', background: badge.iconBg, color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>{badge.icon}</span>
                            </span>
                          </div>
                          <button
                            className="btn-ghost"
                            type="button"
                            onClick={()=> removeTarget(item.key)}
                            style={{ width:28, height:28, display:'inline-flex', alignItems:'center', justifyContent:'center', border:'none' }}
                            aria-label="삭제"
                          >
                            <span style={{ fontSize:22, lineHeight:1 }}>−</span>
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
            {regionError && <div style={{ color:'#dc2626', fontSize:12, marginTop:8 }}>{regionError}</div>}
            {regionSuccess && (
              <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:8, border:'1px solid #10b981', background:'#ecfdf5', padding:'6px 10px', borderRadius:6 }}>
                <span style={{ color:'#047857', fontWeight:600 }}>{regionSuccess}</span>
                <button className="btn btn-plain" type="button" onClick={() => setRegionSuccess(null)} style={{ padding:'2px 8px', fontSize:12 }}>확인</button>
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:12 }}>
              <button className="btn" type="button" onClick={closeRegionPopup}>취소</button>
              <button className="btn btn-accent" type="button" onClick={handleRegionPlanSubmit} disabled={regionSaving}>
                {regionSaving ? '저장 중…' : '저장'}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
      <LeadActivityCreateModal
        open={activityEditOpen && activityEditId != null}
        onClose={closeActivityModal}
        editId={activityEditId ?? undefined}
        leadId={activityEditLeadId && /^\d+$/.test(activityEditLeadId) ? Number(activityEditLeadId) : undefined}
        leadName={activityEditLeadName}
        targetKind={activityEditTargetKind ?? undefined}
        targetCompanyType={activityEditCompanyType || undefined}
        initial={activityEditInitial}
        onSaved={() => {
          setTimeout(() => loadWeekEvents(), 50)
        }}
      />
    </section>
  )
}
