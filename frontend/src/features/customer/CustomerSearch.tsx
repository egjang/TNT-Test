import React, { useEffect, useMemo, useState } from 'react'
import moneyIconUrl from '../../assets/icons/money.svg'
import demandIconUrl from '../../assets/icons/demand.svg'
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
  companyType?: string
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

type Props = { compact?: boolean; maxHeight?: string; context?: 'c360' | 'list' }
export function CustomerSearch({ compact = false, maxHeight, context = 'list' }: Props) {
  const [q, setQ] = useState('') // customer_name
  const [provinceName, setProvinceName] = useState('')
  const [cityName, setCityName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Customer[]>([])
  type FilterMode = 'mine' | 'hq' | 'all'
  const [filterMode, setFilterMode] = useState<FilterMode>('mine')
  const [menu, setMenu] = useState<{ open: boolean; x: number; y: number; row?: Customer }>({ open: false, x: 0, y: 0 })
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  // Removed demand presence prefetch to improve performance
  const [bubble, setBubble] = useState<{ open: boolean; x: number; y: number; row?: Customer; loading?: boolean; error?: string | null; data?: any[] }>({ open: false, x: 0, y: 0 })
  const [recentMap, setRecentMap] = useState<Record<number, boolean>>({})
  const [demandMap, setDemandMap] = useState<Record<number, boolean>>({})
  const [initialized, setInitialized] = useState(false)
  const [totalMineCount, setTotalMineCount] = useState<number>(0)
  // Infinite scroll state
  const PAGE_SIZE = 100
  const [pageOffset, setPageOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const listRef = React.useRef<HTMLDivElement | null>(null)
  const [activeCustomerSeq, setActiveCustomerSeq] = useState<number | null>(() => {
    try { const raw = localStorage.getItem('tnt.sales.selectedCustomer'); if (raw) { const o = JSON.parse(raw); const v = Number(o?.customerSeq); return Number.isFinite(v) ? v : null } } catch {}
    return null
  })
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(() => {
    try { const raw = localStorage.getItem('tnt.sales.selectedCustomer'); if (raw) { const o = JSON.parse(raw); const v = String(o?.customerId || ''); return v || null } } catch {}
    return null
  })
  const userDisplay = useMemo(() => {
    const name = (typeof window !== 'undefined') ? localStorage.getItem('tnt.sales.empName') : ''
    const id = (typeof window !== 'undefined') ? localStorage.getItem('tnt.sales.assigneeId') : ''
    return name || id || ''
  }, [])

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

  async function runSearch(reset = true) {
    setError(null)
    if (reset) { setLoading(true); setPageOffset(0); setHasMore(true) } else { setLoadingMore(true) }
    try {
      const savedAssigneeId = localStorage.getItem('tnt.sales.assigneeId')
      if (!savedAssigneeId) {
        setItems([])
        setError(tone.loginRequired)
        return
      }
      const url = new URL('/api/v1/customers', window.location.origin)
      if (q.trim()) url.searchParams.set('name', q.trim())
      if (provinceName.trim()) url.searchParams.set('provinceName', provinceName.trim())
      if (cityName.trim()) url.searchParams.set('cityName', cityName.trim())
      const mine = filterMode === 'mine'
      url.searchParams.set('mineOnly', mine ? 'true' : 'false')
      if (mine && savedAssigneeId) url.searchParams.set('assigneeId', savedAssigneeId)
      url.searchParams.set('limit', String(PAGE_SIZE))
      url.searchParams.set('offset', String(reset ? 0 : pageOffset))
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
      const sorted = [...list].sort((a, b) => {
        const an = (a.customerName || '').toString()
        const bn = (b.customerName || '').toString()
        return an.localeCompare(bn, 'ko', { sensitivity: 'base' })
      })
      // Prefetch flags BEFORE displaying list so icons appear immediately
      const seqs = (reset ? sorted : list)
        .map(it => Number((it as any).customerSeq || 0))
        .filter(v => Number.isFinite(v) && v > 0)
      const uniqSeqCsv = Array.from(new Set(seqs)).join(',')
      try {
        if (seqs.length > 0) {
          const urlRecent = new URL('/api/v1/customers/recent-invoice-flags', window.location.origin)
          urlRecent.searchParams.set('custSeq', uniqSeqCsv)
          urlRecent.searchParams.set('years', '2')
          const urlDemand = new URL('/api/v1/customers/demand-flags', window.location.origin)
          urlDemand.searchParams.set('custSeq', uniqSeqCsv)
          const [r2, r3] = await Promise.all([fetch(urlRecent.toString()), fetch(urlDemand.toString())])
          // recent
          if (r2.ok) {
            const arr = await r2.json()
            const map: Record<number, boolean> = {}
            if (Array.isArray(arr)) arr.forEach((x: any) => { const k = Number(x?.customerSeq || 0); if (Number.isFinite(k)) map[k] = !!x?.hasRecent })
            setRecentMap(prev => reset ? map : ({ ...prev, ...map }))
          } else if (reset) { setRecentMap({}) }
          // demand
          if (r3.ok) {
            const arr = await r3.json()
            const map: Record<number, boolean> = {}
            if (Array.isArray(arr)) arr.forEach((x: any) => { const k = Number(x?.customerSeq || 0); if (Number.isFinite(k)) map[k] = !!x?.hasDemand })
            setDemandMap(prev => reset ? map : ({ ...prev, ...map }))
          } else if (reset) { setDemandMap({}) }
        } else {
          if (reset) { setRecentMap({}); setDemandMap({}) }
        }
      } catch {
        if (reset) { setRecentMap({}); setDemandMap({}) }
      }

      // Now set the list so icons are ready when rendering
      if (reset) setItems(sorted)
      else setItems(prev => [...prev, ...sorted])
      // hasMore detection
      setHasMore(list.length >= PAGE_SIZE)
      if (!reset) setPageOffset(prev => prev + PAGE_SIZE)
      else setPageOffset(PAGE_SIZE)
      // Select first row on initial load only
      if (reset && !initialized && sorted.length > 0) {
        selectCustomer(sorted[0])
        setInitialized(true)
      }

      // Fetch total count of my customers (independent of current filters)
      try {
        if (savedAssigneeId && filterMode === 'mine') {
          const urlCnt = new URL('/api/v1/customers/count', window.location.origin)
          urlCnt.searchParams.set('mineOnly', 'true')
          urlCnt.searchParams.set('assigneeId', savedAssigneeId)
          const rc = await fetch(urlCnt.toString())
          if (rc.ok) {
            const obj = await rc.json().catch(()=> ({} as any))
            const n = Number((obj as any)?.total ?? 0)
            setTotalMineCount(Number.isFinite(n) ? n : 0)
          } else { setTotalMineCount(0) }
        } else {
          setTotalMineCount(0)
        }
      } catch { setTotalMineCount(0) }
    } catch (e: any) {
      setError(e.message || '조회 중 오류가 발생했습니다')
    } finally {
      if (reset) setLoading(false); else setLoadingMore(false)
    }
  }

  useEffect(() => {
    // initial empty search to show first page
    runSearch(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Track external selection changes (e.g., from other panels)
  useEffect(() => {
    const onSelected = () => {
      try {
        const raw = localStorage.getItem('tnt.sales.selectedCustomer')
        if (raw) {
          const o = JSON.parse(raw)
          const seq = Number(o?.customerSeq)
          setActiveCustomerSeq(Number.isFinite(seq) ? seq : null)
          setActiveCustomerId(o?.customerId || null)
        }
      } catch {}
    }
    window.addEventListener('tnt.sales.customer.selected' as any, onSelected)
    return () => window.removeEventListener('tnt.sales.customer.selected' as any, onSelected)
  }, [])

  // Re-run search immediately when filter mode changes
  useEffect(() => {
    runSearch(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMode])

  // Infinite scroll: observer on table container
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
  }, [hasMore, loadingMore, loading, pageOffset, q, provinceName, cityName, filterMode])

  // Close context menu when clicking anywhere outside
  useEffect(() => {
    if (!menu.open) return
    const onDocClick = () => setMenu({ open: false, x: 0, y: 0 })
    window.addEventListener('click', onDocClick)
    return () => window.removeEventListener('click', onDocClick)
  }, [menu.open])

  // Close context menu with ESC key
  useEffect(() => {
    if (!menu.open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu({ open: false, x: 0, y: 0 })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menu.open])

  // Bubble lifecycle: close on outside click / ESC
  useEffect(() => {
    if (!bubble.open) return
    const onDocClick = () => setBubble({ open: false, x: 0, y: 0 })
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setBubble({ open: false, x: 0, y: 0 }) }
    window.addEventListener('click', onDocClick)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('click', onDocClick); window.removeEventListener('keydown', onKey) }
  }, [bubble.open])

  // Global ESC: close all menus/bubbles at once (capture phase to avoid being swallowed)
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

  function selectCustomer(row: Customer) {
    try {
      localStorage.setItem('tnt.sales.selectedCustomer', JSON.stringify(row || {}))
      window.dispatchEvent(new CustomEvent('tnt.sales.customer.selected', { detail: { source: 'customer-search', customer: row } }) as any)
    } catch {}
    setActiveCustomerSeq((() => { const v = Number((row as any).customerSeq); return Number.isFinite(v) ? v : null })())
    setActiveCustomerId(row.customerId || null)
    // Close any open menus/bubbles
    setMenu({ open: false, x: 0, y: 0 })
    setBubble({ open: false, x: 0, y: 0 })
  }

  // Hover bubble: show full customer info on mouse enter
  function showInfoBubble(e: React.MouseEvent, row: Customer) {
    const x = e.clientX, y = e.clientY
    setBubble({ open: true, x, y, row, loading: false, error: null, data: [] })
  }
  function moveInfoBubble(e: React.MouseEvent) {
    if (!bubble.open) return
    setBubble((b) => ({ ...b, x: e.clientX, y: e.clientY }))
  }
  function hideInfoBubble() {
    setBubble({ open: false, x: 0, y: 0 })
  }

  const table = useMemo(() => {
    const buildBubble = (row: Customer) => {
      const lines = [
        `거래처번호: ${row.customerId || ''}`,
        `거래처명: ${row.customerName || ''}`,
        row.customerFullName ? `정식명: ${row.customerFullName}` : '',
        row.bizNo ? `사업자번호: ${row.bizNo}` : '',
        row.ownerName ? `대표자명: ${row.ownerName}` : '',
        row.bizKind ? `업태: ${row.bizKind}` : '',
        row.bizType ? `종목: ${row.bizType}` : '',
        row.telNo ? `전화번호: ${row.telNo}` : '',
        row.empName ? `담당자명: ${row.empName}` : '',
        row.deptName ? `부서명: ${row.deptName}` : '',
        row.addrProvinceName ? `시/도: ${row.addrProvinceName}` : '',
        row.addrCityName ? `시/군/구: ${row.addrCityName}` : '',
        row.customerTypeName ? `고객유형: ${row.customerTypeName}` : '',
        row.customerRemark ? `비고: ${row.customerRemark}` : '',
        row.createdAt ? `생성일시: ${fmt(row.createdAt)}` : '',
        row.updatedAt ? `수정일시: ${fmt(row.updatedAt)}` : '',
      ].filter(Boolean)
      return lines.join('\n')
    }
    return (
      <>
        <div ref={listRef} className="table-container" onClick={() => setMenu({ open: false, x: 0, y: 0 })} style={{ maxHeight: maxHeight ?? (compact ? '32vh' : undefined), overflow: 'auto' }}>
        {items.length === 0 ? (
          <div className="empty-state">{tone.empty}</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 36, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selected.size === items.length}
                    indeterminate={(undefined as any)}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </th>
                <th style={{ width: 140 }}>{context === 'c360' ? '회사구분' : '거래처번호'}</th>
                <th style={{ width: 200 }}>거래처명</th>
                <th style={{ width: 80 }}>추가정보</th>
                
                <th style={{ width: 140 }}>사업자번호</th>
                <th style={{ width: 120 }}>대표자명</th>
                <th style={{ width: 120 }}>업태</th>
                <th style={{ width: 120 }}>종목</th>
                <th style={{ width: 130 }}>전화번호</th>
                <th style={{ width: 120 }}>담당자명</th>
                <th style={{ width: 140 }}>부서명</th>
                <th style={{ width: 120 }}>시/도</th>
                <th style={{ width: 120 }}>시/군/구</th>
                <th style={{ width: 120 }}>고객유형</th>
                <th>비고</th>
                <th style={{ width: 120 }}>생성자</th>
                <th style={{ width: 120 }}>수정자</th>
                <th style={{ width: 180 }}>생성일시</th>
                <th style={{ width: 180 }}>수정일시</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr
                  key={idx}
                  className={(Number((it as any).customerSeq || 0) === (activeCustomerSeq || -1) || (!!activeCustomerId && it.customerId === activeCustomerId)) ? 'selected' : undefined}
                  onClick={() => selectCustomer(it)}
                  onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); hideInfoBubble(); setMenu({ open: true, x: e.clientX, y: e.clientY, row: it }) }}
                >
                  <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(it.customerId)}
                      onChange={(e) => toggleOne(it.customerId, e.target.checked)}
                    />
                  </td>
                  <td onMouseEnter={(e) => showInfoBubble(e, it)} onMouseMove={moveInfoBubble} onMouseLeave={hideInfoBubble}>
                    {context === 'c360' ? (it.companyType || '') : it.customerId}
                  </td>
                  <td>{it.customerName}</td>
                  <td>{(() => {
                    const seq = Number((it as any).customerSeq || 0)
                    const hasSales = !!recentMap[seq]
                    const hasDemand = !!demandMap[seq]
                    if (!hasSales && !hasDemand) return ''
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {hasSales && (
                          <img src={moneyIconUrl} className="icon" alt="" title="최근2년 매출 있음" style={{ width: 14, height: 14 }} />
                        )}
                        {hasDemand && (
                          <img src={demandIconUrl} className="icon" alt="" title="수요 있음" style={{ width: 14, height: 14 }} />
                        )}
                      </div>
                    )
                  })()}</td>
                  
                  
                  <td>{it.bizNo || ''}</td>
                  <td>{it.ownerName || ''}</td>
                  <td>{it.bizKind || ''}</td>
                  <td>{it.bizType || ''}</td>
                  <td>{it.telNo || ''}</td>
                  <td>{it.empName || ''}</td>
                  <td>{it.deptName || ''}</td>
                  <td>{it.addrProvinceName || ''}</td>
                  <td>{it.addrCityName || ''}</td>
                  <td>{it.customerTypeName || ''}</td>
                  <td>{it.customerRemark || ''}</td>
                  <td>{it.createdBy ?? ''}</td>
                  <td>{it.updatedBy ?? ''}</td>
                  <td>{fmt(it.createdAt)}</td>
                  <td>{fmt(it.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {loadingMore && <div className="muted" style={{ padding: '6px 8px' }}>{tone.loading}</div>}
        {!loading && !loadingMore && !hasMore && items.length > 0 && (
          <div className="muted" style={{ padding: '8px 10px', textAlign: 'center' }}>마지막 데이터입니다.</div>
        )}
        {menu.open && (
          <div className="context-menu" style={{ left: menu.x + 4, top: menu.y + 4 }} onClick={(e) => e.stopPropagation()}>
            {context !== 'c360' ? (
              <>
                <button className="context-item" onClick={() => {
                  try { localStorage.setItem('tnt.sales.selectedCustomer', JSON.stringify(menu.row || {})); window.dispatchEvent(new CustomEvent('tnt.sales.customer.selected', { detail: { source: 'customer-search', customer: menu.row } })) } catch {}
                  const btn = document.querySelector('button[data-key="customer:c360"]') as HTMLButtonElement | null
                  if (btn) btn.click()
                  setMenu({ open: false, x: 0, y: 0 })
                }}>C360</button>
                <button className="context-item" onClick={() => {
                  try { localStorage.setItem('tnt.sales.selectedCustomer', JSON.stringify(menu.row || {})); window.dispatchEvent(new CustomEvent('tnt.sales.customer.selected', { detail: { source: 'customer-search', customer: menu.row } })) } catch {}
                  window.dispatchEvent(new CustomEvent('tnt.sales.navigate', { detail: { key: 'sales-mgmt:receivables' } }) as any)
                  setMenu({ open: false, x: 0, y: 0 })
                }}>미수현황</button>
              </>
            ) : null}
            <button className="context-item" onClick={() => {
              try { localStorage.setItem('tnt.sales.selectedCustomer', JSON.stringify(menu.row || {})); window.dispatchEvent(new CustomEvent('tnt.sales.customer.selected', { detail: { source: 'customer-search', customer: menu.row } })) } catch {}
              const btn = document.querySelector('button[data-key="customer:sales-activity-new"]') as HTMLButtonElement | null
              if (btn) btn.click()
              setMenu({ open: false, x: 0, y: 0 })
            }}>활동등록</button>
          </div>
        )}
        {bubble.open && bubble.row && (
          <div
            className="context-menu"
            style={{ left: bubble.x + 6, top: bubble.y + 6, maxWidth: 500, padding: 10 }}
            onClick={(e) => e.stopPropagation()}
            onMouseLeave={hideInfoBubble}
          >
            <div style={{ fontWeight: 600, marginBottom: 6 }}>거래처 정보</div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 6, maxWidth: 480 }}>
              <div className="muted">거래처번호</div><div>{bubble.row.customerId || ''}</div>
              <div className="muted">거래처명</div><div>{bubble.row.customerName || ''}</div>
              {bubble.row.customerFullName ? (<><div className="muted">정식명</div><div>{bubble.row.customerFullName}</div></>) : null}
              {bubble.row.bizNo ? (<><div className="muted">사업자번호</div><div>{bubble.row.bizNo}</div></>) : null}
              {bubble.row.ownerName ? (<><div className="muted">대표자명</div><div>{bubble.row.ownerName}</div></>) : null}
              {bubble.row.bizKind ? (<><div className="muted">업태</div><div>{bubble.row.bizKind}</div></>) : null}
              {bubble.row.bizType ? (<><div className="muted">종목</div><div>{bubble.row.bizType}</div></>) : null}
              {bubble.row.telNo ? (<><div className="muted">전화번호</div><div>{bubble.row.telNo}</div></>) : null}
              {bubble.row.empName ? (<><div className="muted">담당자명</div><div>{bubble.row.empName}</div></>) : null}
              {bubble.row.deptName ? (<><div className="muted">부서명</div><div>{bubble.row.deptName}</div></>) : null}
              {bubble.row.addrProvinceName ? (<><div className="muted">시/도</div><div>{bubble.row.addrProvinceName}</div></>) : null}
              {bubble.row.addrCityName ? (<><div className="muted">시/군/구</div><div>{bubble.row.addrCityName}</div></>) : null}
              {bubble.row.customerTypeName ? (<><div className="muted">고객유형</div><div>{bubble.row.customerTypeName}</div></>) : null}
              {bubble.row.customerRemark ? (<><div className="muted">비고</div><div>{bubble.row.customerRemark}</div></>) : null}
              {bubble.row.createdAt ? (<><div className="muted">생성일시</div><div>{fmt(bubble.row.createdAt)}</div></>) : null}
              {bubble.row.updatedAt ? (<><div className="muted">수정일시</div><div>{fmt(bubble.row.updatedAt)}</div></>) : null}
            </div>
          </div>
        )}
      </div>
      </>
    )
  }, [items, menu, selected, bubble])

  return (
    <section>
      <div className="page-title" style={{ alignItems: 'center' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', flex: '1 1 auto', minWidth: 0 }}>
          <select
            value={filterMode}
            onChange={(e)=> setFilterMode(e.target.value as FilterMode)}
            style={{
              height: 30,
              padding: '2px 8px',
              fontSize: 11,
              background: filterMode === 'mine' ? 'rgba(59,130,246,.15)' : '#fff',
              borderRadius: 8,
              border: filterMode === 'mine' ? '1px solid var(--accent)' : '1px solid var(--border)'
            }}
          >
            <option value="mine">내 거래처</option>
            <option value="hq">본부 거래처</option>
            <option value="all">전체</option>
          </select>
          <input
            className="search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') runSearch() }}
            placeholder="거래처명"
            style={{ background: '#fff', borderRadius: 8, border: '1px solid var(--border)' }}
          />
          <input
            className="search-input"
            value={provinceName}
            onChange={(e) => setProvinceName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') runSearch() }}
            placeholder="시/도"
            style={{ background: '#fff', borderRadius: 8, border: '1px solid var(--border)', minWidth: 100 }}
          />
          <input
            className="search-input"
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') runSearch() }}
            placeholder="시/군/구"
            style={{ background: '#fff', borderRadius: 8, border: '1px solid var(--border)', minWidth: 120 }}
          />
          <button className="btn" onClick={runSearch} disabled={loading} style={{ height: 30, padding: '0 12px' }}>조회</button>
          {loading && <span className="muted" style={{ lineHeight: '30px' }}>{tone.loading}</span>}
        </div>
        <div className="meta" style={{ gap: 0 }}>
          <span className="muted count-text">
            {filterMode === 'mine' && userDisplay ? `${userDisplay} · ` : ''}
            {(filterMode === 'mine' ? totalMineCount : items.length).toLocaleString()}개 거래처{selected.size ? ` · 선택 ${selected.size}건` : ''}
          </span>
        </div>
      </div>

      {error && <div className="error">{error || tone.errorGeneric}</div>}
      <div style={{ marginTop: 12 }}>
        {table}
      </div>
    </section>
  )
}
