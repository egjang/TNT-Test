import React, { useEffect, useMemo, useRef, useState } from 'react'
import plusIcon from '../../assets/icons/plus.svg'
import warehouseIcon from '../../assets/icons/warehouse.svg'

type Row = {
  customerId?: string
  customerName?: string
  bizNo?: string
  ownerName?: string
  telNo?: string
  customerSeq?: number
  addrProvinceName?: string
  addrCityName?: string
  companyType?: string
  companyCode?: string
}

export function OrderSheet() {
  const [q, setQ] = useState('')
  const [itemQ, setItemQ] = useState('')
  const [items, setItems] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [itemList, setItemList] = useState<Array<{ itemSeq: any; itemName: string; recentInvoiceDate?: string | null; curAmt?: any; qty?: any; srcPri?: number; itemStdUnit?: string | null; companyType?: string | null }>>([])
  const [itemLoading, setItemLoading] = useState(false)
  // Removed invoice debug list per request
  const [adding, setAdding] = useState(false)
  // Inventory bubble (local to center panel)
  const [invBubble, setInvBubble] = useState<{ open: boolean; x: number; y: number; loading?: boolean; error?: string | null; rows?: Array<{ whName: string; avail: number; unitName: string }> }>({ open: false, x: 0, y: 0 })
  const bubbleRef = useRef<HTMLDivElement | null>(null)

  async function loadItems(forCustomerSeq?: number) {
    try {
      setItemLoading(true)
      const sel = activeIdx != null ? items[activeIdx] : null
      const params2 = new URLSearchParams()
      params2.set('q', (itemQ.trim() || q.trim()))
      const cseq = (forCustomerSeq != null ? forCustomerSeq : sel?.customerSeq)
      if (cseq != null) params2.set('customerSeq', String(cseq))
      const r2 = await fetch(`/api/v1/items/search?${params2.toString()}`)
      const data2 = r2.ok ? await r2.json() : []
      const list2 = Array.isArray(data2) ? data2.map((x: any) => ({
        itemSeq: x?.itemSeq,
        itemName: String(x?.itemName ?? ''),
        recentInvoiceDate: x?.recentInvoiceDate ?? x?.recent_invoice_date ?? null,
        curAmt: x?.curAmt ?? null,
        qty: x?.qty ?? null,
        srcPri: x?.srcPri != null ? Number(x.srcPri) : undefined,
        itemStdUnit: x?.itemStdUnit ?? x?.item_std_unit ?? null,
        companyType: x?.companyType || x?.company_type || null
      })) : []
      setItemList(list2)
    } catch {
      setItemList([])
    } finally {
      setItemLoading(false)
    }
  }

  const [invNotice, setInvNotice] = useState<{ open:boolean; text:string }>(()=>({ open:false, text:'' }))
  const [invSummary, setInvSummary] = useState<Array<{ itemSeq: any; itemName: string; companyType?: string | null; recentDate: string; totalAmt: number; totalQty: number }>>([])

  async function addToCart(it: { itemSeq: any; itemName: string; invoiceDate?: string | null; itemStdUnit?: string | null; companyType?: string | null }) {
    if (it == null || it.itemName == null) return
    setAdding(true)
    try {
      let spec: string | undefined = undefined
      let stdUnit: string | undefined = typeof it.itemStdUnit === 'string' ? it.itemStdUnit : undefined
      let apiStdUnit: string | undefined = undefined
      let apiCompanyType: string | undefined = undefined
      // Try to get spec via API using itemName
      const r = await fetch(`/api/v1/items/spec?itemName=${encodeURIComponent(String(it.itemName))}`)
      if (r.ok) {
        const data = await r.json().catch(() => ({}))
        if (data && data.itemSpec) spec = String(data.itemSpec)
        if (!stdUnit && data && data.itemStdUnit) {
          apiStdUnit = String(data.itemStdUnit)
          stdUnit = apiStdUnit
        }
        // Get companyType from spec API (overrides transaction companyType)
        if (data && data.companyType) {
          apiCompanyType = String(data.companyType)
        }
      }
      // 재고 조회는 아이콘 클릭 시 별도 호출로 변경됨
      const cartRaw = localStorage.getItem('tnt.sales.ordersheet.cart')
      const cart = cartRaw ? JSON.parse(cartRaw) : []
      // Do not add if same itemName already exists (exact match)
      const idx = Array.isArray(cart) ? cart.findIndex((x: any) => String(x.itemName) === String(it.itemName)) : -1
      if (idx >= 0) {
        // skip adding duplicate by name
        alert('이미 주문에 포함되어 있습니다.')
        setAdding(false)
        return
      } else {
        // Use apiCompanyType from item table, fallback to transaction companyType
        const finalCompanyType = apiCompanyType || it.companyType || null
        const newItem = { itemSeq: it.itemSeq, itemName: it.itemName, itemSpec: spec || '', qty: '', itemStdUnit: stdUnit || it.itemStdUnit || undefined, companyType: finalCompanyType }
        cart.push(newItem)
      }
      localStorage.setItem('tnt.sales.ordersheet.cart', JSON.stringify(cart))
      window.dispatchEvent(new CustomEvent('tnt.sales.ordersheet.cart.changed', { detail: { cart } }) as any)
    } catch {}
    finally { setAdding(false) }
  }
  
  function extractAvailRows(jsonText: string): Array<{ whName:string; avail:number; unitName:string }> {
    try {
      const obj = JSON.parse(jsonText)
      const q:any[] = [obj]
      let arr:any[]|null = null
      while (q.length) {
        const cur = q.shift()
        if (Array.isArray(cur)) { if (cur.length && typeof cur[0] === 'object') { arr = cur; break } }
        else if (cur && typeof cur === 'object') for (const k of Object.keys(cur)) q.push(cur[k])
      }
      if (!arr) return []
      return arr.map((r:any) => {
        const wh = r?.WHName ?? r?.whName ?? r?.warehouseName ?? r?.WH_NM ?? r?.wh_nm ?? ''
        const avail = Number(r?.AvailStock ?? r?.availStock ?? r?.AVAIL_STOCK ?? r?.qty ?? 0) || 0
        const unit = r?.UnitName ?? r?.unitName ?? r?.UNIT_NAME ?? r?.salesMgmtUnit ?? ''
        return { whName: String(wh||''), avail, unitName: String(unit||'') }
      })
    } catch { return [] }
  }

  async function showAvail(e: React.MouseEvent, it: { itemSeq: any; itemName: string }) {
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const x = rect.right
    const y = rect.bottom
    setInvBubble({ open: true, x, y, loading: true })
    try {
      const body = {
        bizUnit: '',
        stdDate: '',
        whSeq: '',
        itemName: String(it.itemName||''),
        itemNo: '',
        itemSeq: String(it.itemSeq||''),
        pageNo: '',
        pageSize: ''
      }
      const rs = await fetch('/api/v1/items/avail-stock', { method:'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (rs.ok) {
        const resp = await rs.json().catch(()=> ({} as any))
        const received = (resp && (resp.receivedPayload || resp))
        const j = JSON.stringify(received, null, 2)
        const rows = extractAvailRows(j)
        setInvBubble({ open: true, x, y, loading: false, error: null, rows })
      } else {
        setInvBubble({ open: true, x, y, loading: false, error: `HTTP ${rs.status}` })
      }
    } catch (err:any) {
      setInvBubble({ open: true, x, y, loading: false, error: err?.message || '재고 조회 실패' })
    }
  }

  // Close bubble on outside click or ESC
  useEffect(() => {
    if (!invBubble.open) return
    const onDoc = (ev: MouseEvent) => {
      const el = bubbleRef.current
      if (el && ev.target instanceof Node && !el.contains(ev.target)) {
        setInvBubble({ open: false, x: 0, y: 0 })
      }
    }
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') setInvBubble({ open: false, x: 0, y: 0 }) }
    document.addEventListener('mousedown', onDoc, true)
    window.addEventListener('keydown', onKey, true)
    return () => { document.removeEventListener('mousedown', onDoc, true); window.removeEventListener('keydown', onKey, true) }
  }, [invBubble.open])
  // No separate invoice list rendering anymore

  async function search() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set('name', q.trim())
      params.set('mineOnly', 'false')
      const r = await fetch(`/api/v1/customers?${params.toString()}`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      const list: Row[] = Array.isArray(data) ? data.map((x: any) => ({
        customerId: x?.customerId ?? '',
        customerName: x?.customerName ?? '',
        bizNo: x?.bizNo ?? '',
        ownerName: x?.ownerName ?? x?.empName ?? '',
        telNo: x?.telNo ?? '',
        customerSeq: (x?.customerSeq != null ? Number(x.customerSeq) : undefined),
        addrProvinceName: x?.addrProvinceName ?? x?.addr_province_name ?? '',
        addrCityName: x?.addrCityName ?? x?.addr_city_name ?? '',
        companyType: String(x?.company_type ?? x?.companyType ?? x?.company ?? '').toUpperCase(),
        companyCode: String(
          x?.companyCode ?? x?.company_code ?? x?.company_type ?? x?.companyType ?? x?.company ?? ''
        ).toUpperCase()
      })) : []
      // Sort by customerName ascending (Korean locale)
      list.sort((a, b) => String(a.customerName||'').localeCompare(String(b.customerName||''), 'ko-KR'))
      setItems(list)
      if (list.length > 0) {
        setActiveIdx(0)
        try {
          localStorage.setItem('tnt.sales.ordersheet.selectedCustomer', JSON.stringify(list[0]))
          window.dispatchEvent(new CustomEvent('tnt.sales.ordersheet.customer.selected', { detail: { customer: list[0] } }) as any)
        } catch {}
        await loadItems(list[0]?.customerSeq)
      } else {
        setActiveIdx(null)
        setItemList([])
      }
    } catch (e: any) {
      setError(e?.message || '조회 중 오류가 발생했습니다')
      setItems([])
    } finally {
      setLoading(false)
    }
    // items refreshed above when list available
  }

  // Clear any previously saved order-sheet state on first load
  useEffect(() => {
    try {
      localStorage.removeItem('tnt.sales.ordersheet.selectedCustomer')
      localStorage.removeItem('tnt.sales.ordersheet.cart')
      localStorage.removeItem('tnt.sales.ordersheet.regionGroup')
      localStorage.removeItem('tnt.sales.ordersheet.requests')
      localStorage.removeItem('tnt.sales.ordersheet.deliveryDueDate')
    } catch {}
  }, [])

  function select(row: Row, idx: number) {
    setActiveIdx(idx)
    try {
      localStorage.setItem('tnt.sales.ordersheet.selectedCustomer', JSON.stringify(row))
      window.dispatchEvent(new CustomEvent('tnt.sales.ordersheet.customer.selected', { detail: { customer: row } }) as any)
    } catch {}
    loadItems(row.customerSeq)
    loadInvoiceSummary(row.customerSeq)
  }

  async function loadInvoiceSummary(custSeq?: number) {
    try {
      setInvSummary([])
      const id = custSeq != null ? Number(custSeq) : NaN
      if (!Number.isFinite(id)) return
      const r = await fetch(`/api/v1/customers/${id}/transactions`, { cache: 'no-store' })
      if (!r.ok) return
      const arr = await r.json().catch(()=>[])
      if (!Array.isArray(arr)) { setInvSummary([]); return }
      const oneYearAgo = Date.now() - 365*24*60*60*1000
      const map: Record<string, { itemSeq: any; itemName: string; companyType: string | null; recent: number; totalAmt: number; totalQty: number }> = {}
      for (const x of arr) {
        const itemName = String(x?.itemName ?? x?.item_name ?? '').trim()
        if (!itemName) continue
        const itemSeq = x?.itemSeq ?? x?.item_seq ?? null
        const companyType = x?.companyType ?? x?.company_type ?? null
        const amt = Number(x?.curAmt ?? x?.cur_amt ?? 0) || 0
        const qty = Number(x?.qty ?? 0) || 0
        const dstr = String(x?.invoiceDate ?? x?.invoice_date ?? '')
        const t = Date.parse(dstr) || Date.parse(dstr.replace(' ', 'T')) || NaN
        if (!Number.isFinite(t) || t < oneYearAgo) continue
        const key = itemSeq != null ? String(itemSeq) : itemName
        const rec = map[key] || { itemSeq, itemName, companyType: companyType || null, recent: 0, totalAmt: 0, totalQty: 0 }
        rec.totalAmt += amt
        rec.totalQty += qty
        if (t > rec.recent) rec.recent = t
        if (rec.itemSeq == null && itemSeq != null) rec.itemSeq = itemSeq
        if (!rec.companyType && companyType) rec.companyType = companyType
        map[key] = rec
      }
      const out = Object.values(map)
        .sort((a,b)=> b.recent - a.recent || a.itemName.localeCompare(b.itemName, 'ko', { sensitivity:'base' }))
        .map(it => ({ itemSeq: it.itemSeq, itemName: it.itemName, companyType: it.companyType, recentDate: new Date(it.recent).toISOString().slice(0,10), totalAmt: it.totalAmt, totalQty: it.totalQty }))
      setInvSummary(out)
    } catch { setInvSummary([]) }
  }

  const table = useMemo(() => (
    <div className="table-container" style={{ maxHeight: '40vh' }}>
      {items.length === 0 ? (
        <div className="empty-state">{loading ? '불러오는 중…' : (error || '데이터가 없습니다')}</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>거래처명</th>
              <th style={{ width: 160 }}>대표자</th>
              <th style={{ width: 180 }}>사업자번호</th>
              <th style={{ width: 160 }}>대표번호</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx} className={activeIdx === idx ? 'selected' : undefined} onClick={() => select(it, idx)}>
                <td style={{ display:'flex', alignItems:'center', gap:6 }}>
                  {(() => {
                    const ct = it.companyType || it.companyCode || ''
                    const k = ct.toUpperCase()
                    const label = k === 'TNT' ? 'T' : k === 'DYS' ? 'D' : k === 'ALL' ? 'A' : ''
                    const color = k === 'TNT' ? '#2563eb' : k === 'DYS' ? '#10b981' : k === 'ALL' ? '#f59e0b' : '#9ca3af'
                    return label ? (
                      <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:18, height:18, borderRadius:'50%', background: color, color:'#fff', fontSize:11, fontWeight:800, boxShadow:'0 0 0 1px rgba(0,0,0,.08)' }}>
                        {label}
                      </span>
                    ) : null
                  })()}
                  <span>{it.customerName}</span>
                </td>
                <td>{it.ownerName}</td>
                <td>{it.bizNo}</td>
                <td>{it.telNo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  ), [items, loading, error, activeIdx])

  const summaryTable = useMemo(() => (
    invSummary.length === 0 ? null : (
      <>
        <div className="muted" style={{ fontSize: 12, marginTop: 8, marginBottom: 4 }}>최근거래내역</div>
        <div className="table-container" style={{ maxHeight: '24vh' }}>
          <table className="table">
            <thead>
              <tr>
                <th>품목</th>
                <th style={{ width: 120 }}>최근거래일</th>
                <th style={{ width: 140, textAlign:'right' }}>총금액</th>
                <th style={{ width: 100, textAlign:'right' }}>총수량</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {invSummary.map((it, i) => (
                <tr key={i}>
                  <td>{it.itemName}</td>
                  <td>{it.recentDate}</td>
                  <td style={{ textAlign:'right' }}>{Number(it.totalAmt||0).toLocaleString()}</td>
                  <td style={{ textAlign:'right' }}>{Number(it.totalQty||0).toLocaleString()}</td>
                  <td>
                  <span
                    role="button"
                    tabIndex={0}
                    className="icon-button"
                    aria-label="재고 조회"
                    title="재고 조회"
                    onClick={(e) => showAvailFromSummary(e, it.itemName)}
                    onKeyDown={(e) => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); showAvailFromSummary(e, it.itemName) } }}
                  >
                    <img src={warehouseIcon} className="icon" alt="재고" />
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    className="icon-button"
                    aria-label="담기"
                    title="담기"
                    onClick={() => addToCartFromSummary(it)}
                    onKeyDown={(e) => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); addToCartFromSummary(it) } }}
                  >
                    <img src={plusIcon} className="icon" alt="담기" />
                  </span>
                </td>
              </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    )
  ), [invSummary])

  // Resolve item by name to use existing handlers
  function getSelectedCustomerSeq(): number | null {
    try { const raw = localStorage.getItem('tnt.sales.ordersheet.selectedCustomer'); if (!raw) return null; const o = JSON.parse(raw); const v = Number(o?.customerSeq); return Number.isFinite(v) ? v : null } catch { return null }
  }

  async function resolveItemByName(name: string): Promise<{ itemSeq: any; itemName: string } | null> {
    const exact = itemList.find(x => String(x.itemName).trim() === String(name).trim())
    if (exact && exact.itemSeq != null) return { itemSeq: exact.itemSeq, itemName: exact.itemName }
    try {
      const params = new URLSearchParams()
      params.set('q', name)
      const cseq = getSelectedCustomerSeq(); if (cseq != null) params.set('customerSeq', String(cseq))
      const r = await fetch(`/api/v1/items/search?${params.toString()}`)
      const data = r.ok ? await r.json() : []
      const list = Array.isArray(data) ? data : []
      const it = list.find((x:any)=> String(x?.itemName||'').trim() === String(name).trim()) || list[0]
      if (it && it.itemSeq != null) return { itemSeq: it.itemSeq, itemName: String(it.itemName||name) }
    } catch {}
    return null
  }

  async function showAvailFromSummary(e: React.MouseEvent, itemName: string) {
    const it = await resolveItemByName(itemName)
    if (it) { await showAvail(e, it as any) }
  }

  async function addToCartFromSummary(it: { itemSeq: any; itemName: string; companyType?: string | null }) {
    let resolved = it
    if (!resolved.itemSeq) {
      const found = await resolveItemByName(it.itemName)
      if (!found) return
      resolved = { ...resolved, ...found }
    }
    await addToCart({ itemSeq: resolved.itemSeq, itemName: resolved.itemName, companyType: resolved.companyType || undefined })
  }

  const fmt = new Intl.NumberFormat('ko-KR')
  const itemTable = useMemo(() => (
    <div className="table-container" style={{ maxHeight: '32vh', marginTop: 12 }}>
      {itemList.length === 0 ? (
        <div className="empty-state">{itemLoading ? '품목 불러오는 중…' : '품목 데이터가 없습니다'}</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>품목명</th>
              <th style={{ width: 140 }}>최근거래일시</th>
              <th style={{ width: 120, textAlign: 'right' }}>총금액</th>
              <th style={{ width: 100, textAlign: 'right' }}>총수량</th>
              <th style={{ width: 90 }}></th>
            </tr>
          </thead>
          <tbody>
            {itemList.map((it, idx) => (
              <tr
                key={idx}
                className={it.srcPri === 0 ? 'inv-row' : undefined}
                onDoubleClick={() => addToCart(it)}
                title="더블클릭하면 우측 수주장에 담습니다"
              >
                <td style={{ display:'flex', alignItems:'center', gap:6 }}>
                  {(() => {
                    const ct = (it as any).companyType || (it as any).company_type || (it as any).companyCode || (it as any).company_code
                    const k = (ct || '').toString().toUpperCase()
                    const label = k === 'TNT' ? 'T' : k === 'DYS' ? 'D' : k === 'ALL' ? 'A' : ''
                    const color = k === 'TNT' ? '#2563eb' : k === 'DYS' ? '#10b981' : k === 'ALL' ? '#f59e0b' : '#9ca3af'
                    return label ? (
                      <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:18, height:18, borderRadius:'50%', background: color, color:'#fff', fontSize:11, fontWeight:800, boxShadow:'0 0 0 1px rgba(0,0,0,.08)' }}>
                        {label}
                      </span>
                    ) : null
                  })()}
                  <span>{it.itemName}</span>
                  {it.itemStdUnit ? (<span style={{ fontSize:11, color:'var(--text-muted)' }}>({it.itemStdUnit})</span>) : null}
                </td>
                <td>{it.recentInvoiceDate || ''}</td>
                <td style={{ textAlign: 'right' }}>{it.curAmt != null && it.curAmt !== '' ? fmt.format(Number(it.curAmt)) : ''}</td>
                <td style={{ textAlign: 'right' }}>{it.qty != null && it.qty !== '' ? fmt.format(Number(it.qty)) : ''}</td>
                <td>
                  <span
                    role="button"
                    tabIndex={0}
                    className="icon-button"
                    aria-label="재고 조회"
                    title="재고 조회"
                    onClick={(e) => showAvail(e, it as any)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showAvail(({ currentTarget: e.currentTarget } as any) as React.MouseEvent, it as any) } }}
                  >
                    <img src={warehouseIcon} className="icon" alt="재고" />
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    className="icon-button"
                    aria-label="담기"
                    title="담기"
                    onClick={() => addToCart(it)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addToCart(it) } }}
                  >
                    <img src={plusIcon} className="icon" alt="담기" />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  ), [itemList, itemLoading])

  // invoiceTable removed

  return (
    <section>
      <div className="page-title">
        <h2>수주장</h2>
        <div className="controls" style={{ gap: 8 }}>
          <input
            className="search-input"
            type="text"
            placeholder="거래처명"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') search() }}
            style={{ width: 240 }}
          />
          <button className="btn" onClick={search} disabled={loading}>조회</button>
        </div>
      </div>
      {table}
      {summaryTable}
      <div className="controls" style={{ gap: 8, marginTop: 10 }}>
        <input
          className="search-input"
          type="text"
          placeholder="품목명"
          value={itemQ}
          onChange={(e) => setItemQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') loadItems() }}
          style={{ width: 240 }}
        />
        <button className="btn" onClick={() => loadItems()} disabled={itemLoading}>품목 조회</button>
      </div>
      {itemTable}
      {/* Center panel inventory bubble */}
      {invBubble.open && (
        <div
          ref={bubbleRef}
          className="context-menu"
          style={{ left: invBubble.x + 6, top: invBubble.y + 6, position: 'fixed', maxWidth: 420, padding: 8 }}
          onClick={(e) => e.stopPropagation()}
        >
          {invBubble.loading ? (
            <div className="muted">재고 불러오는 중…</div>
          ) : invBubble.error ? (
            <div className="error">{invBubble.error}</div>
          ) : (!invBubble.rows || invBubble.rows.length === 0) ? (
            <div className="empty-state">재고 데이터가 없습니다</div>
          ) : (
            <div className="table-container" style={{ maxHeight: 200, overflow: 'auto', border: 0 }}>
              <table className="table" style={{ width:'100%', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>창고명</th>
                    <th style={{ width: 100, textAlign:'right' }}>가용재고</th>
                    <th style={{ width: 120 }}>단위</th>
                  </tr>
                </thead>
                <tbody>
                  {(invBubble.rows||[]).map((r, i) => (
                    <tr key={i}>
                      <td>{r.whName || '-'}</td>
                      <td style={{ textAlign:'right' }}>{Number(r.avail||0).toLocaleString()}</td>
                      <td>{r.unitName || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
