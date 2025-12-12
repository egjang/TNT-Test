import React, { useEffect, useRef, useState } from 'react'
import { Search, Plus, Warehouse, X, FileText, ChevronDown, ChevronUp } from 'lucide-react'

// 거래처 정보 타입
type CustomerInfo = {
  customerSeq?: number
  customerName?: string
  ownerName?: string
  companyType?: string
  companyCode?: string
  addrProvinceName?: string
  addrCityName?: string
  bizNo?: string
  telNo?: string
}

type CartItem = {
  itemSeq: any
  itemName: string
  itemSpec?: string
  qty: number | ''
  itemStdUnit?: string
  companyType?: string | null
}

type OrderSheetFormProps = {
  customer: CustomerInfo
  onOrderCreated?: (orderNo: string) => void
}

export function OrderSheetForm({ customer, onOrderCreated }: OrderSheetFormProps) {
  // Item search states
  const [itemQ, setItemQ] = useState('')
  const [itemList, setItemList] = useState<Array<{ itemSeq: any; itemName: string; recentInvoiceDate?: string | null; curAmt?: any; qty?: any; srcPri?: number; itemStdUnit?: string | null; companyType?: string | null }>>([])
  const [itemLoading, setItemLoading] = useState(false)
  const [, setAdding] = useState(false)

  // Invoice summary for selected customer
  const [invSummary, setInvSummary] = useState<Array<{ itemSeq: any; itemName: string; companyType?: string | null; itemStdUnit?: string | null; recentDate: string; totalAmt: number; totalQty: number }>>([])

  // Stock availability map: itemSeq/itemName -> hasStock (true = has stock, false = no stock)
  const [stockStatusMap, setStockStatusMap] = useState<Record<string, boolean>>({})

  // Recent transaction summary expanded state
  const [invSummaryExpanded, setInvSummaryExpanded] = useState(true)

  // Inventory bubble
  const [invBubble, setInvBubble] = useState<{ open: boolean; x: number; y: number; loading?: boolean; error?: string | null; rows?: Array<{ whName: string; avail: number; unitName: string }> }>({ open: false, x: 0, y: 0 })
  const bubbleRef = useRef<HTMLDivElement | null>(null)

  // Order form states
  const [cart, setCart] = useState<CartItem[]>([])
  const [, setAvailMap] = useState<Record<string, { rows: Array<{ whName: string; avail: number; unitName: string }>; total: number; unitName: string }>>({})
  const [regionGroup, setRegionGroup] = useState<string>('')
  const [requests, setRequests] = useState<string>('')
  const [deliveryDueDate, setDeliveryDueDate] = useState<string>(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 10)
  })
  const empName = (() => { try { return localStorage.getItem('tnt.sales.empName') || localStorage.getItem('tnt.sales.empId') || '' } catch { return '' } })()
  const assigneeId = (() => { try { return localStorage.getItem('tnt.sales.assigneeId') || '' } catch { return '' } })()
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ open: boolean; text: string }>(() => ({ open: false, text: '' }))
  const [orderNo, setOrderNo] = useState<string>('')

  // Helper functions
  function extractAvailRows(jsonText: string): Array<{ whName: string; avail: number; unitName: string }> {
    try {
      const obj = JSON.parse(jsonText)
      const queue: any[] = [obj]
      let arr: any[] | null = null
      while (queue.length) {
        const cur = queue.shift()
        if (Array.isArray(cur)) { if (cur.length && typeof cur[0] === 'object') { arr = cur; break } }
        else if (cur && typeof cur === 'object') for (const k of Object.keys(cur)) queue.push(cur[k])
      }
      if (!arr) return []
      return arr.map((r: any) => {
        const wh = r?.WHName ?? r?.whName ?? r?.warehouseName ?? r?.WH_NM ?? r?.wh_nm ?? ''
        const avail = Number(r?.AvailStock ?? r?.availStock ?? r?.AVAIL_STOCK ?? r?.qty ?? 0) || 0
        const unit = r?.UnitName ?? r?.unitName ?? r?.UNIT_NAME ?? r?.salesMgmtUnit ?? ''
        return { whName: String(wh || ''), avail, unitName: String(unit || '') }
      })
    } catch { return [] }
  }

  async function resolveSalesEmpSeq(companyCode: string): Promise<string> {
    const aid = assigneeId || ''
    const empId = (() => { try { return localStorage.getItem('tnt.sales.empId') || '' } catch { return '' } })()
    if (!aid && !empId) {
      const localSeq = (() => { try { return localStorage.getItem('tnt.sales.empSeq') || '' } catch { return '' } })()
      return localSeq || '4'
    }
    try {
      const p = new URLSearchParams()
      if (aid) p.set('assigneeId', aid)
      if (empId) p.set('empId', empId)
      if (companyCode) p.set('companyCode', companyCode)
      const rs = await fetch(`/api/v1/employee/by-assignee?${p.toString()}`, { cache: 'no-store' })
      if (!rs.ok) {
        const localSeq = (() => { try { return localStorage.getItem('tnt.sales.empSeq') || '' } catch { return '' } })()
        return localSeq || '4'
      }
      const j = await rs.json().catch(() => null as any)
      const v = j?.resolvedSalesEmpSeq ?? (companyCode?.toUpperCase() === 'DYS' ? j?.dys_emp_seq : j?.tnt_emp_seq)
      const out = (v != null && String(v)) ? String(v) : ''
      if (out) return out
      const localSeq = (() => { try { return localStorage.getItem('tnt.sales.empSeq') || '' } catch { return '' } })()
      return localSeq || '4'
    } catch {
      const localSeq = (() => { try { return localStorage.getItem('tnt.sales.empSeq') || '' } catch { return '' } })()
      return localSeq || '4'
    }
  }

  // Load items for customer
  async function loadItems() {
    try {
      setItemLoading(true)
      const params2 = new URLSearchParams()
      params2.set('q', itemQ.trim())
      const compType = customer?.companyType || customer?.companyCode
      if (compType) params2.set('companyType', compType)
      if (customer?.customerSeq != null) params2.set('customerSeq', String(customer.customerSeq))
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
      if (list2.length > 0) {
        checkStockForItems(list2.map(x => ({ itemSeq: x.itemSeq, itemName: x.itemName })))
      }
    } catch {
      setItemList([])
    } finally {
      setItemLoading(false)
    }
  }

  // Add item to cart
  function addToCart(it: { itemSeq: any; itemName: string; invoiceDate?: string | null; itemStdUnit?: string | null; companyType?: string | null }) {
    if (it == null || it.itemName == null) return
    setAdding(true)
    try {
      const stdUnit = it.itemStdUnit ?? undefined
      const idx = cart.findIndex((x: any) => String(x.itemName) === String(it.itemName))
      if (idx >= 0) {
        alert('이미 주문에 포함되어 있습니다.')
        setAdding(false)
        return
      } else {
        const newItem = { itemSeq: it.itemSeq, itemName: it.itemName, itemSpec: '', qty: '' as any, itemStdUnit: stdUnit, companyType: it.companyType || null }
        setCart(prev => [...prev, newItem])
      }
    } catch { }
    finally { setAdding(false) }
  }

  // Check stock availability for multiple items
  async function checkStockForItems(items: Array<{ itemSeq: any; itemName: string }>) {
    const newStatusMap: Record<string, boolean> = {}
    await Promise.all(items.map(async (it) => {
      const key = it.itemSeq != null ? String(it.itemSeq) : it.itemName
      try {
        const body = {
          bizUnit: '',
          stdDate: '',
          whSeq: '',
          itemName: String(it.itemName || ''),
          itemNo: '',
          itemSeq: String(it.itemSeq || ''),
          pageNo: '',
          pageSize: ''
        }
        const rs = await fetch('/api/v1/items/avail-stock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        if (rs.ok) {
          const resp = await rs.json().catch(() => ({} as any))
          const received = (resp && (resp.receivedPayload || resp))
          const j = JSON.stringify(received, null, 2)
          const rows = extractAvailRows(j)
          const totalAvail = rows.reduce((sum, r) => sum + (r.avail || 0), 0)
          newStatusMap[key] = totalAvail > 0
        } else {
          newStatusMap[key] = false
        }
      } catch {
        newStatusMap[key] = false
      }
    }))
    setStockStatusMap(prev => ({ ...prev, ...newStatusMap }))
  }

  // Show availability popup
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
        itemName: String(it.itemName || ''),
        itemNo: '',
        itemSeq: String(it.itemSeq || ''),
        pageNo: '',
        pageSize: ''
      }
      const rs = await fetch('/api/v1/items/avail-stock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (rs.ok) {
        const resp = await rs.json().catch(() => ({} as any))
        const received = (resp && (resp.receivedPayload || resp))
        const j = JSON.stringify(received, null, 2)
        const rows = extractAvailRows(j)
        setInvBubble({ open: true, x, y, loading: false, error: null, rows })
      } else {
        setInvBubble({ open: true, x, y, loading: false, error: `HTTP ${rs.status}` })
      }
    } catch (err: any) {
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

  // Initialize when customer changes
  useEffect(() => {
    if (!customer) return

    // Set region group
    const province = customer.addrProvinceName ?? ''
    const city = customer.addrCityName ?? ''
    const rg = [province, city].filter((s: string) => !!s && String(s).trim().length > 0).join(' ')
    if (rg) setRegionGroup(String(rg))

    // Reset order form
    setOrderNo('')
    setRequests('')
    setCart([])
    setAvailMap({})
    setItemQ('')
    setItemList([])

    // Load invoice summary
    loadInvoiceSummary(customer.customerSeq)
  }, [customer?.customerSeq])

  // Load invoice summary
  async function loadInvoiceSummary(custSeq?: number) {
    try {
      setInvSummary([])
      const id = custSeq != null ? Number(custSeq) : NaN
      if (!Number.isFinite(id)) return
      const r = await fetch(`/api/v1/customers/${id}/transactions`, { cache: 'no-store' })
      if (!r.ok) return
      const arr = await r.json().catch(() => [])
      if (!Array.isArray(arr)) { setInvSummary([]); return }
      const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000
      const map: Record<string, { itemSeq: any; itemName: string; companyType: string | null; itemStdUnit: string | null; recent: number; totalAmt: number; totalQty: number }> = {}
      for (const x of arr) {
        const itemName = String(x?.itemName ?? x?.item_name ?? '').trim()
        if (!itemName) continue
        const itemSeq = x?.itemSeq ?? x?.item_seq ?? null
        const companyType = x?.companyType ?? x?.company_type ?? null
        const itemStdUnit = x?.itemStdUnit ?? x?.item_std_unit ?? null
        const amt = Number(x?.curAmt ?? x?.cur_amt ?? 0) || 0
        const qty = Number(x?.qty ?? 0) || 0
        const dstr = String(x?.invoiceDate ?? x?.invoice_date ?? '')
        const t = Date.parse(dstr) || Date.parse(dstr.replace(' ', 'T')) || NaN
        if (!Number.isFinite(t) || t < oneYearAgo) continue
        const key = itemSeq != null ? String(itemSeq) : itemName
        const rec = map[key] || { itemSeq, itemName, companyType: companyType || null, itemStdUnit: itemStdUnit || null, recent: 0, totalAmt: 0, totalQty: 0 }
        rec.totalAmt += amt
        rec.totalQty += qty
        if (t > rec.recent) rec.recent = t
        if (rec.itemSeq == null && itemSeq != null) rec.itemSeq = itemSeq
        if (!rec.companyType && companyType) rec.companyType = companyType
        if (!rec.itemStdUnit && itemStdUnit) rec.itemStdUnit = itemStdUnit
        map[key] = rec
      }
      const out = Object.values(map)
        .sort((a, b) => b.recent - a.recent || a.itemName.localeCompare(b.itemName, 'ko', { sensitivity: 'base' }))
        .map(it => ({ itemSeq: it.itemSeq, itemName: it.itemName, companyType: it.companyType, itemStdUnit: it.itemStdUnit, recentDate: new Date(it.recent).toISOString().slice(0, 10), totalAmt: it.totalAmt, totalQty: it.totalQty }))
      setInvSummary(out)
      if (out.length > 0) {
        checkStockForItems(out.map(x => ({ itemSeq: x.itemSeq, itemName: x.itemName })))
      }
    } catch { setInvSummary([]) }
  }

  // Resolve item by name
  async function resolveItemByName(name: string): Promise<{ itemSeq: any; itemName: string } | null> {
    const exact = itemList.find(x => String(x.itemName).trim() === String(name).trim())
    if (exact && exact.itemSeq != null) return { itemSeq: exact.itemSeq, itemName: exact.itemName }
    try {
      const params = new URLSearchParams()
      params.set('q', name)
      const compType = customer?.companyType || customer?.companyCode
      if (compType) params.set('companyType', compType)
      if (customer?.customerSeq != null) params.set('customerSeq', String(customer.customerSeq))
      const r = await fetch(`/api/v1/items/search?${params.toString()}`)
      const data = r.ok ? await r.json() : []
      const list = Array.isArray(data) ? data : []
      const it = list.find((x: any) => String(x?.itemName || '').trim() === String(name).trim()) || list[0]
      if (it && it.itemSeq != null) return { itemSeq: it.itemSeq, itemName: String(it.itemName || name) }
    } catch { }
    return null
  }

  async function showAvailFromSummary(e: React.MouseEvent, item: { itemSeq: any; itemName: string }) {
    if (item.itemSeq != null) {
      await showAvail(e, item)
    } else {
      const it = await resolveItemByName(item.itemName)
      if (it) { await showAvail(e, it as any) }
    }
  }

  async function addToCartFromSummary(it: { itemSeq: any; itemName: string; companyType?: string | null; itemStdUnit?: string | null }) {
    let resolved = it
    if (!resolved.itemSeq) {
      const found = await resolveItemByName(it.itemName)
      if (!found) return
      resolved = { ...resolved, ...found }
    }
    addToCart({ itemSeq: resolved.itemSeq, itemName: resolved.itemName, companyType: resolved.companyType || undefined, itemStdUnit: resolved.itemStdUnit || undefined })
  }

  // Remove item from cart
  function removeFromCart(idx: number) {
    setCart(prev => prev.filter((_, i) => i !== idx))
  }

  // Update item quantity
  function updateQty(idx: number, val: string) {
    setCart(prev => {
      const next = prev.slice()
      if (val === '') {
        next[idx] = { ...next[idx], qty: '' as any }
      } else {
        const v = Number(val)
        if (!isFinite(v) || v < 0) {
          next[idx] = { ...next[idx], qty: '' as any }
        } else {
          const limited = Math.floor(v * 100) / 100
          next[idx] = { ...next[idx], qty: limited }
        }
      }
      return next
    })
  }

  // Submit order
  async function submitOrder() {
    setSaving(true)
    try {
      const company = String(customer?.companyCode || customer?.companyType || 'TNT')
      const seq = await resolveSalesEmpSeq(company)
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (assigneeId) headers['X-ASSIGNEE-ID'] = String(assigneeId)
      const body: any = {
        companyCode: company,
        customerSeq: (customer?.customerSeq != null ? String(customer.customerSeq) : ''),
        customerName: String(customer?.customerName || ''),
        assigneeId: assigneeId || '',
        regionGroup,
        requests,
        deliveryDueDate,
        createdBy: empName || '',
        custEmpName: String(customer?.ownerName || ''),
        salesEmpSeq: seq || undefined,
        items: (cart || []).map(it => ({
          itemSeq: String(it.itemSeq || ''),
          itemName: it.itemName,
          itemSpec: it.itemSpec || '',
          qty: Number(it.qty) || 0,
          itemStdUnit: it.itemStdUnit || undefined,
          companyType: it.companyType || undefined
        })),
      }
      const rs = await fetch('/api/v1/orders', { method: 'POST', headers, body: JSON.stringify(body) })
      const resp = await rs.json().catch(() => ({} as any))
      if (!rs.ok) throw new Error(resp?.error || `HTTP ${rs.status}`)
      const newOrderNo = String(resp?.orderTextNo || resp?.sendPayload?.ROOT?.data?.ROOT?.DataBlock1?.[0]?.OrderTextNo || '')
      setOrderNo(newOrderNo)
      setNotice({ open: true, text: '주문 전송 완료' })

      // Callback
      if (onOrderCreated && newOrderNo) {
        onOrderCreated(newOrderNo)
      }

      // Dispatch event
      window.dispatchEvent(new CustomEvent('tnt.sales.ordersheet.order.created') as any)
    } catch (e: any) {
      setNotice({ open: true, text: e?.message || '주문 전송 중 오류가 발생했습니다' })
    } finally { setSaving(false) }
  }

  // Company type badge
  const CompanyBadge = ({ type }: { type?: string }) => {
    const k = (type || '').toUpperCase()
    const label = k === 'TNT' ? 'T' : k === 'DYS' ? 'D' : k === 'ALL' ? 'A' : ''
    const color = k === 'TNT' ? 'var(--primary)' : k === 'DYS' ? 'var(--success)' : k === 'ALL' ? 'var(--warning)' : 'var(--text-secondary)'
    if (!label) return null
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', background: color, color: 'var(--on-accent)', fontSize: 11, fontWeight: 800 }}>
        {label}
      </span>
    )
  }

  const fmt = new Intl.NumberFormat('ko-KR')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Left Column - Item Search & Transaction History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, overflow: 'hidden' }}>
          {/* Recent Transaction Summary */}
          {invSummary.length > 0 && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, flexShrink: 0 }}>
              <div
                style={{
                  padding: '8px 12px',
                  background: 'var(--bg-secondary)',
                  borderBottom: invSummaryExpanded ? '1px solid var(--border)' : 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
                onClick={() => setInvSummaryExpanded(!invSummaryExpanded)}
              >
                <span>최근 거래내역 ({invSummary.length}건)</span>
                {invSummaryExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              {invSummaryExpanded && <div style={{ maxHeight: '20vh', overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>품목</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--border)', width: 80 }}>최근거래일</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', width: 80 }}>총금액</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center', borderBottom: '1px solid var(--border)', width: 70 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invSummary.map((it, i) => (
                      <tr key={i}>
                        <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', color: 'var(--primary)', fontWeight: 500 }}>{it.itemName}</td>
                        <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)' }}>{it.recentDate}</td>
                        <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt.format(it.totalAmt)}</td>
                        <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            {(() => {
                              const stockKey = it.itemSeq != null ? String(it.itemSeq) : it.itemName
                              const hasStock = stockStatusMap[stockKey]
                              const noStock = hasStock === false
                              return (
                                <button
                                  className="btn btn-secondary"
                                  style={{
                                    width: 24,
                                    height: 24,
                                    padding: 0,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: noStock ? 'var(--error)' : undefined,
                                    borderColor: noStock ? 'var(--error)' : undefined
                                  }}
                                  onClick={(e) => showAvailFromSummary(e, { itemSeq: it.itemSeq, itemName: it.itemName })}
                                  title={noStock ? "재고 없음 - 클릭하여 상세 조회" : "재고 조회"}
                                >
                                  <Warehouse size={12} style={{ color: noStock ? 'var(--error)' : undefined }} />
                                </button>
                              )
                            })()}
                            <button
                              className="btn btn-primary"
                              style={{
                                width: 24,
                                height: 24,
                                padding: 0,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              onClick={() => addToCartFromSummary(it)}
                              title="담기"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>}
            </div>
          )}

          {/* Item Search Section */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: 12, borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="품목명 검색"
                    value={itemQ}
                    onChange={(e) => setItemQ(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') loadItems() }}
                    style={{ width: '100%', paddingLeft: 32, fontSize: 13 }}
                  />
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                </div>
                <button className="btn btn-primary" onClick={() => loadItems()} disabled={itemLoading} style={{ fontSize: 12, padding: '6px 12px' }}>
                  {itemLoading ? '검색 중...' : '품목 조회'}
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto' }}>
              {itemList.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                  {itemLoading ? '품목 불러오는 중…' : '품목을 검색해주세요'}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>품목명</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--border)', width: 80 }}>최근거래일</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid var(--border)', width: 80 }}>총금액</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center', borderBottom: '1px solid var(--border)', width: 70 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemList.map((it, idx) => (
                      <tr
                        key={idx}
                        onDoubleClick={() => addToCart(it)}
                        title="더블클릭하면 수주장에 담습니다"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CompanyBadge type={it.companyType} />
                            <span style={it.srcPri === 0 ? { color: 'var(--primary)', fontWeight: 500 } : undefined}>{it.itemName}</span>
                            {it.itemStdUnit && <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>({it.itemStdUnit})</span>}
                          </div>
                        </td>
                        <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)' }}>{it.recentInvoiceDate || ''}</td>
                        <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                          {it.curAmt != null && it.curAmt !== '' ? fmt.format(Number(it.curAmt)) : ''}
                        </td>
                        <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            {(() => {
                              const stockKey = it.itemSeq != null ? String(it.itemSeq) : it.itemName
                              const hasStock = stockStatusMap[stockKey]
                              const noStock = hasStock === false
                              return (
                                <button
                                  className="btn btn-secondary"
                                  style={{
                                    width: 24,
                                    height: 24,
                                    padding: 0,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: noStock ? 'var(--error)' : undefined,
                                    borderColor: noStock ? 'var(--error)' : undefined
                                  }}
                                  onClick={(e) => { e.stopPropagation(); showAvail(e, it as any) }}
                                  title={noStock ? "재고 없음 - 클릭하여 상세 조회" : "재고 조회"}
                                >
                                  <Warehouse size={12} style={{ color: noStock ? 'var(--error)' : undefined }} />
                                </button>
                              )
                            })()}
                            <button
                              className="btn btn-primary"
                              style={{
                                width: 24,
                                height: 24,
                                padding: 0,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              onClick={(e) => { e.stopPropagation(); addToCart(it) }}
                              title="담기"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Order Form */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Header */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={16} />
            <strong style={{ fontSize: 13 }}>수주장</strong>
          </div>

          {/* Order Info */}
          <div style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 6, fontSize: 12 }}>
              <span style={{ color: 'var(--text-secondary)' }}>수주장번호</span>
              <span style={{ fontWeight: 500 }}>{orderNo || '-'}</span>
              <span style={{ color: 'var(--text-secondary)' }}>회사코드</span>
              <span style={{ fontWeight: 500 }}>{customer?.companyCode || customer?.companyType || 'TNT'}</span>
              <span style={{ color: 'var(--text-secondary)' }}>거래처</span>
              <span style={{ fontWeight: 500 }}>
                {customer?.customerName || '-'}
                {customer?.ownerName && <span style={{ color: 'var(--text-secondary)', fontWeight: 400, marginLeft: 6 }}>({customer.ownerName})</span>}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>등록자</span>
              <span style={{ fontWeight: 500 }}>{empName || '-'}</span>
            </div>
          </div>

          {/* Form Fields */}
          <div style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 60, flexShrink: 0 }}>지역 그룹</label>
              <input
                type="text"
                className="input"
                value={regionGroup}
                onChange={(e) => setRegionGroup(e.target.value)}
                placeholder="지역 그룹"
                style={{ flex: 1, fontSize: 12, padding: '6px 8px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 60, flexShrink: 0 }}>납품요청일</label>
              <input
                type="date"
                className="input"
                value={deliveryDueDate}
                onChange={(e) => setDeliveryDueDate(e.target.value)}
                style={{ flex: 1, fontSize: 12, padding: '6px 8px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 60, flexShrink: 0, paddingTop: 6 }}>요청 사항</label>
              <textarea
                className="input"
                value={requests}
                onChange={(e) => setRequests(e.target.value)}
                placeholder="요청 사항"
                rows={3}
                style={{ flex: 1, resize: 'vertical', fontSize: 12, padding: '6px 8px' }}
              />
            </div>
          </div>

          {/* Cart Items */}
          <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
              담긴 품목 ({cart.length}건)
            </div>
            {cart.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 12 }}>
                담긴 품목이 없습니다
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {cart.map((it, idx) => (
                  <div key={idx} style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--panel)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <CompanyBadge type={it.companyType || customer?.companyType || customer?.companyCode} />
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{it.itemName}</span>
                      {it.itemStdUnit && <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>({it.itemStdUnit})</span>}
                      <button
                        onClick={() => removeFromCart(idx)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--error)' }}
                        title="삭제"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="number"
                        className="input"
                        min={0}
                        step="0.01"
                        value={it.qty === '' ? '' : String(it.qty)}
                        placeholder="수량"
                        onChange={(e) => updateQty(idx, e.target.value)}
                        style={{ width: 80, textAlign: 'right', fontSize: 12, padding: '4px 6px' }}
                      />
                      {it.itemStdUnit && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{it.itemStdUnit}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px 12px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              disabled={saving || !cart.length || !customer}
              onClick={submitOrder}
            >
              {saving ? '전송 중...' : '주문'}
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Bubble */}
      {invBubble.open && (
        <div
          ref={bubbleRef}
          style={{
            position: 'fixed', left: invBubble.x + 6, top: invBubble.y + 6,
            background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: 10, maxWidth: 350, zIndex: 100
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {invBubble.loading ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>재고 불러오는 중…</div>
          ) : invBubble.error ? (
            <div style={{ color: 'var(--error)', fontSize: 12 }}>{invBubble.error}</div>
          ) : (!invBubble.rows || invBubble.rows.length === 0) ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>재고 데이터가 없습니다</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th style={{ padding: '6px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>창고명</th>
                  <th style={{ padding: '6px', textAlign: 'right', borderBottom: '1px solid var(--border)', width: 70 }}>가용재고</th>
                  <th style={{ padding: '6px', textAlign: 'left', borderBottom: '1px solid var(--border)', width: 60 }}>단위</th>
                </tr>
              </thead>
              <tbody>
                {(invBubble.rows || []).map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '6px', borderBottom: '1px solid var(--border)' }}>{r.whName || '-'}</td>
                    <td style={{ padding: '6px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{fmt.format(r.avail)}</td>
                    <td style={{ padding: '6px', borderBottom: '1px solid var(--border)' }}>{r.unitName || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Notice Modal */}
      {notice.open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={() => setNotice({ open: false, text: '' })}>
          <div style={{
            background: 'var(--bg-primary)', borderRadius: 8, padding: 20, minWidth: 280,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: 14, fontSize: 13 }}>{notice.text}</div>
            <button className="btn btn-primary" onClick={() => setNotice({ open: false, text: '' })} style={{ fontSize: 12, padding: '6px 16px' }}>확인</button>
          </div>
        </div>
      )}
    </div>
  )
}
