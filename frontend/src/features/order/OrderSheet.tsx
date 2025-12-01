import React, { useEffect, useRef, useState } from 'react'
import { Search, Plus, Warehouse, X, FileText, ChevronDown, ChevronUp } from 'lucide-react'

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

type CartItem = {
  itemSeq: any
  itemName: string
  itemSpec?: string
  qty: number | ''
  itemStdUnit?: string
  companyType?: string | null
}

export function OrderSheet() {
  // Customer search states
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [customerListExpanded, setCustomerListExpanded] = useState(true)

  // Item search states
  const [itemQ, setItemQ] = useState('')
  const [itemList, setItemList] = useState<Array<{ itemSeq: any; itemName: string; recentInvoiceDate?: string | null; curAmt?: any; qty?: any; srcPri?: number; itemStdUnit?: string | null; companyType?: string | null }>>([])
  const [itemLoading, setItemLoading] = useState(false)
  const [, setAdding] = useState(false)

  // Invoice summary for selected customer
  const [invSummary, setInvSummary] = useState<Array<{ itemSeq: any; itemName: string; companyType?: string | null; recentDate: string; totalAmt: number; totalQty: number }>>([])

  // Stock availability map: itemSeq/itemName -> hasStock (true = has stock, false = no stock)
  const [stockStatusMap, setStockStatusMap] = useState<Record<string, boolean>>({})

  // Recent transaction summary expanded state
  const [invSummaryExpanded, setInvSummaryExpanded] = useState(true)

  // Inventory bubble
  const [invBubble, setInvBubble] = useState<{ open: boolean; x: number; y: number; loading?: boolean; error?: string | null; rows?: Array<{ whName: string; avail: number; unitName: string }> }>({ open: false, x: 0, y: 0 })
  const bubbleRef = useRef<HTMLDivElement | null>(null)

  // Order form states (from right panel)
  const [cust, setCust] = useState<any>(null)
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

  // Load items for selected customer
  async function loadItems(forCustomer?: Row) {
    try {
      setItemLoading(true)
      // Use passed customer or fallback to selected customer from state
      const sel = forCustomer ?? (activeIdx != null ? items[activeIdx] : null)
      const params2 = new URLSearchParams()
      params2.set('q', (itemQ.trim() || q.trim()))
      // Pass companyType and customerSeq for invoice filtering
      const compType = sel?.companyType || sel?.companyCode
      if (compType) params2.set('companyType', compType)
      if (sel?.customerSeq != null) params2.set('customerSeq', String(sel.customerSeq))
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
      // Check stock for loaded items
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
  async function addToCart(it: { itemSeq: any; itemName: string; invoiceDate?: string | null; itemStdUnit?: string | null; companyType?: string | null }) {
    if (it == null || it.itemName == null) return
    setAdding(true)
    try {
      let spec: string | undefined = undefined
      let stdUnit: string | undefined = typeof it.itemStdUnit === 'string' ? it.itemStdUnit : undefined
      // Use selected item's companyType and itemSeq directly
      const r = await fetch(`/api/v1/items/spec?companyType=${encodeURIComponent(String(it.companyType || ''))}&itemSeq=${encodeURIComponent(String(it.itemSeq))}`)
      if (r.ok) {
        const data = await r.json().catch(() => ({}))
        if (data && data.itemSpec) spec = String(data.itemSpec)
        if (!stdUnit && data && data.itemStdUnit) {
          stdUnit = String(data.itemStdUnit)
        }
      }
      const cartRaw = localStorage.getItem('tnt.sales.ordersheet.cart')
      const currentCart = cartRaw ? JSON.parse(cartRaw) : []
      const idx = Array.isArray(currentCart) ? currentCart.findIndex((x: any) => String(x.itemName) === String(it.itemName)) : -1
      if (idx >= 0) {
        alert('이미 주문에 포함되어 있습니다.')
        setAdding(false)
        return
      } else {
        // Use itemSeq and companyType from selected item directly
        const newItem = { itemSeq: it.itemSeq, itemName: it.itemName, itemSpec: spec || '', qty: '', itemStdUnit: stdUnit || it.itemStdUnit || undefined, companyType: it.companyType || null }
        currentCart.push(newItem)
      }
      localStorage.setItem('tnt.sales.ordersheet.cart', JSON.stringify(currentCart))
      setCart(currentCart)
      window.dispatchEvent(new CustomEvent('tnt.sales.ordersheet.cart.changed', { detail: { cart: currentCart } }) as any)
    } catch { }
    finally { setAdding(false) }
  }

  // Check stock availability for multiple items and update stockStatusMap
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

  // Search customers
  async function search() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set('name', q.trim())
      params.set('mineOnly', 'false')
      const r = await fetch(`/api/v1/customers?${params.toString()}`, { cache: 'no-store' })
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
        companyCode: String(x?.companyCode ?? x?.company_code ?? x?.company_type ?? x?.companyType ?? x?.company ?? '').toUpperCase()
      })) : []
      list.sort((a, b) => String(a.customerName || '').localeCompare(String(b.customerName || ''), 'ko-KR'))
      setItems(list)
      if (list.length > 0) {
        setActiveIdx(0)
        selectCustomer(list[0], 0, false) // 검색 시에는 목록 접지 않음
        await loadItems(list[0])
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
  }

  // Clear state on mount
  useEffect(() => {
    try {
      localStorage.removeItem('tnt.sales.ordersheet.selectedCustomer')
      localStorage.removeItem('tnt.sales.ordersheet.cart')
      localStorage.removeItem('tnt.sales.ordersheet.regionGroup')
      localStorage.removeItem('tnt.sales.ordersheet.requests')
      localStorage.removeItem('tnt.sales.ordersheet.deliveryDueDate')
    } catch { }
  }, [])

  // Select customer
  function selectCustomer(row: Row, idx: number, collapse: boolean = true) {
    setActiveIdx(idx)
    setCust(row)
    if (collapse) setCustomerListExpanded(false) // 거래처 클릭 시에만 목록 접기
    try {
      localStorage.setItem('tnt.sales.ordersheet.selectedCustomer', JSON.stringify(row))
      window.dispatchEvent(new CustomEvent('tnt.sales.ordersheet.customer.selected', { detail: { customer: row } }) as any)
    } catch { }

    // Set region group
    const province = row.addrProvinceName ?? ''
    const city = row.addrCityName ?? ''
    const rg = [province, city].filter((s: string) => !!s && String(s).trim().length > 0).join(' ')
    if (rg) setRegionGroup(String(rg))

    // Reset order form
    setOrderNo('')
    setRequests('')
    setCart([])
    setAvailMap({})
    try {
      localStorage.setItem('tnt.sales.ordersheet.cart', JSON.stringify([]))
    } catch { }

    loadItems(row)
    loadInvoiceSummary(row.customerSeq)
  }

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
        .sort((a, b) => b.recent - a.recent || a.itemName.localeCompare(b.itemName, 'ko', { sensitivity: 'base' }))
        .map(it => ({ itemSeq: it.itemSeq, itemName: it.itemName, companyType: it.companyType, recentDate: new Date(it.recent).toISOString().slice(0, 10), totalAmt: it.totalAmt, totalQty: it.totalQty }))
      setInvSummary(out)
      // Check stock for invoice summary items
      if (out.length > 0) {
        checkStockForItems(out.map(x => ({ itemSeq: x.itemSeq, itemName: x.itemName })))
      }
    } catch { setInvSummary([]) }
  }

  // Resolve item by name
  function getSelectedCustomer(): { companyType?: string; companyCode?: string; customerSeq?: number } | null {
    try { const raw = localStorage.getItem('tnt.sales.ordersheet.selectedCustomer'); if (!raw) return null; return JSON.parse(raw) } catch { return null }
  }

  async function resolveItemByName(name: string): Promise<{ itemSeq: any; itemName: string } | null> {
    const exact = itemList.find(x => String(x.itemName).trim() === String(name).trim())
    if (exact && exact.itemSeq != null) return { itemSeq: exact.itemSeq, itemName: exact.itemName }
    try {
      const params = new URLSearchParams()
      params.set('q', name)
      const selCust = getSelectedCustomer()
      const compType = selCust?.companyType || selCust?.companyCode; if (compType) params.set('companyType', compType)
      if (selCust?.customerSeq != null) params.set('customerSeq', String(selCust.customerSeq))
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

  async function addToCartFromSummary(it: { itemSeq: any; itemName: string; companyType?: string | null }) {
    let resolved = it
    if (!resolved.itemSeq) {
      const found = await resolveItemByName(it.itemName)
      if (!found) return
      resolved = { ...resolved, ...found }
    }
    await addToCart({ itemSeq: resolved.itemSeq, itemName: resolved.itemName, companyType: resolved.companyType || undefined })
  }

  // Remove item from cart
  function removeFromCart(idx: number) {
    const next = cart.filter((_, i) => i !== idx)
    setCart(next)
    try {
      localStorage.setItem('tnt.sales.ordersheet.cart', JSON.stringify(next))
      window.dispatchEvent(new CustomEvent('tnt.sales.ordersheet.cart.changed', { detail: { cart: next } }) as any)
    } catch { }
  }

  // Update item quantity
  function updateQty(idx: number, val: string) {
    const next = cart.slice()
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
    setCart(next)
    try {
      localStorage.setItem('tnt.sales.ordersheet.cart', JSON.stringify(next))
      window.dispatchEvent(new CustomEvent('tnt.sales.ordersheet.cart.changed', { detail: { cart: next } }) as any)
    } catch { }
  }

  // Submit order
  async function submitOrder() {
    setSaving(true)
    try {
      const company = String(cust?.companyCode || 'TNT')
      const seq = await resolveSalesEmpSeq(company)
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (assigneeId) headers['X-ASSIGNEE-ID'] = String(assigneeId)
      const body: any = {
        companyCode: company,
        customerSeq: (cust?.customerSeq != null ? String(cust.customerSeq) : ''),
        customerName: String(cust?.customerName || ''),
        assigneeId: assigneeId || '',
        regionGroup,
        requests,
        deliveryDueDate,
        createdBy: empName || '',
        custEmpName: String(cust?.ownerName || ''),
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
      setOrderNo(String(resp?.orderTextNo || resp?.sendPayload?.ROOT?.data?.ROOT?.DataBlock1?.[0]?.OrderTextNo || ''))
      setNotice({ open: true, text: '주문 전송 완료' })

      // Dispatch event for right panel refresh
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
    <div style={{ padding: 24, height: '100%', overflow: 'auto', background: 'var(--panel)' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>수주장 등록</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24 }}>
        {/* Left Column - Customer & Item Search */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Customer Search Section */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
            {/* 선택된 거래처 표시 (목록 접힌 상태) */}
            {cust && !customerListExpanded ? (
              <div
                style={{
                  padding: '12px 16px',
                  background: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
                onClick={() => setCustomerListExpanded(true)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CompanyBadge type={cust.companyType || cust.companyCode} />
                  <span style={{ fontWeight: 600 }}>{cust.customerName}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {cust.ownerName && `| ${cust.ownerName}`}
                  </span>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={(e) => { e.stopPropagation(); setCustomerListExpanded(true) }}
                >
                  <ChevronDown size={14} />
                  변경
                </button>
              </div>
            ) : (
              <>
                {/* 검색 영역 */}
                <div style={{ padding: 16, borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        type="text"
                        className="input"
                        placeholder="거래처명 검색"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') search() }}
                        style={{ width: '100%', paddingLeft: 36 }}
                      />
                      <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                    </div>
                    <button className="btn btn-primary" onClick={search} disabled={loading}>
                      {loading ? '검색 중...' : '검색'}
                    </button>
                    {cust && (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '8px', display: 'flex', alignItems: 'center' }}
                        onClick={() => setCustomerListExpanded(false)}
                        title="목록 접기"
                      >
                        <ChevronUp size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* 거래처 목록 */}
                <div style={{ maxHeight: '30vh', overflow: 'auto' }}>
                  {items.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {loading ? '불러오는 중…' : (error || '거래처를 검색해주세요')}
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-secondary)' }}>
                          <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>거래처명</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', width: 120 }}>대표자</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', width: 140 }}>사업자번호</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it, idx) => (
                          <tr
                            key={idx}
                            onClick={() => selectCustomer(it, idx)}
                            style={{
                              cursor: 'pointer',
                              background: activeIdx === idx ? 'var(--bg-secondary)' : 'transparent'
                            }}
                            onMouseEnter={e => { if (activeIdx !== idx) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                            onMouseLeave={e => { if (activeIdx !== idx) e.currentTarget.style.background = 'transparent' }}
                          >
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <CompanyBadge type={it.companyType || it.companyCode} />
                                <span>{it.customerName}</span>
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{it.ownerName}</td>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{it.bizNo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Recent Transaction Summary */}
          {invSummary.length > 0 && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
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
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>품목</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', width: 100 }}>최근거래일</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', width: 100 }}>총금액</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)', width: 80 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invSummary.map((it, i) => (
                      <tr key={i}>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--primary)', fontWeight: 500 }}>{it.itemName}</td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>{it.recentDate}</td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmt.format(it.totalAmt)}</td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            {(() => {
                              const stockKey = it.itemSeq != null ? String(it.itemSeq) : it.itemName
                              const hasStock = stockStatusMap[stockKey]
                              const noStock = hasStock === false
                              return (
                                <button
                                  className="btn btn-secondary"
                                  style={{
                                    width: 28,
                                    height: 28,
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
                                  <Warehouse size={14} style={{ color: noStock ? 'var(--error)' : undefined }} />
                                </button>
                              )
                            })()}
                            <button
                              className="btn btn-primary"
                              style={{
                                width: 28,
                                height: 28,
                                padding: 0,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              onClick={() => addToCartFromSummary(it)}
                              title="담기"
                            >
                              <Plus size={14} />
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
          <div style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
            <div style={{ padding: 16, borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="품목명 검색"
                    value={itemQ}
                    onChange={(e) => setItemQ(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') loadItems() }}
                    style={{ width: '100%', paddingLeft: 36 }}
                  />
                  <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                </div>
                <button className="btn btn-primary" onClick={() => loadItems()} disabled={itemLoading}>
                  {itemLoading ? '검색 중...' : '품목 조회'}
                </button>
              </div>
            </div>

            <div style={{ maxHeight: '30vh', overflow: 'auto' }}>
              {itemList.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {itemLoading ? '품목 불러오는 중…' : '품목 데이터가 없습니다'}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>품목명</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', width: 100 }}>최근거래일</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', width: 100 }}>총금액</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)', width: 80 }}></th>
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
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CompanyBadge type={it.companyType} />
                            <span style={it.srcPri === 0 ? { color: 'var(--primary)', fontWeight: 500 } : undefined}>{it.itemName}</span>
                            {it.itemStdUnit && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>({it.itemStdUnit})</span>}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{it.recentInvoiceDate || ''}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                          {it.curAmt != null && it.curAmt !== '' ? fmt.format(Number(it.curAmt)) : ''}
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            {(() => {
                              const stockKey = it.itemSeq != null ? String(it.itemSeq) : it.itemName
                              const hasStock = stockStatusMap[stockKey]
                              const noStock = hasStock === false
                              return (
                                <button
                                  className="btn btn-secondary"
                                  style={{
                                    width: 28,
                                    height: 28,
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
                                  <Warehouse size={14} style={{ color: noStock ? 'var(--error)' : undefined }} />
                                </button>
                              )
                            })()}
                            <button
                              className="btn btn-primary"
                              style={{
                                width: 28,
                                height: 28,
                                padding: 0,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              onClick={(e) => { e.stopPropagation(); addToCart(it) }}
                              title="담기"
                            >
                              <Plus size={14} />
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
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} />
            <strong>수주장</strong>
          </div>

          {/* Order Info */}
          <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>수주장번호</span>
              <span style={{ fontWeight: 500 }}>{orderNo || '-'}</span>
              <span style={{ color: 'var(--text-secondary)' }}>회사코드</span>
              <span style={{ fontWeight: 500 }}>{cust?.companyCode || 'TNT'}</span>
              <span style={{ color: 'var(--text-secondary)' }}>거래처</span>
              <span style={{ fontWeight: 500 }}>
                {cust?.customerName || '-'}
                {cust?.ownerName && <span style={{ color: 'var(--text-secondary)', fontWeight: 400, marginLeft: 8 }}>({cust.ownerName})</span>}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>등록자</span>
              <span style={{ fontWeight: 500 }}>{empName || '-'}</span>
            </div>
          </div>

          {/* Form Fields */}
          <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 70, flexShrink: 0 }}>지역 그룹</label>
              <input
                type="text"
                className="input"
                value={regionGroup}
                onChange={(e) => setRegionGroup(e.target.value)}
                placeholder="지역 그룹"
                style={{ flex: 1 }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 70, flexShrink: 0 }}>납품요청일</label>
              <input
                type="date"
                className="input"
                value={deliveryDueDate}
                onChange={(e) => setDeliveryDueDate(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 70, flexShrink: 0, paddingTop: 8 }}>요청 사항</label>
              <textarea
                className="input"
                value={requests}
                onChange={(e) => setRequests(e.target.value)}
                placeholder="요청 사항"
                rows={6}
                style={{ flex: 1, resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Cart Items */}
          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
              담긴 품목 ({cart.length}건)
            </div>
            {cart.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                담긴 품목이 없습니다
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cart.map((it, idx) => (
                  <div key={idx} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--panel)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <CompanyBadge type={it.companyType || cust?.companyType || cust?.companyCode} />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{it.itemName}</span>
                      {it.itemStdUnit && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>({it.itemStdUnit})</span>}
                      <button
                        onClick={() => removeFromCart(idx)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--error)' }}
                        title="삭제"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number"
                        className="input"
                        min={0}
                        step="0.01"
                        value={it.qty === '' ? '' : String(it.qty)}
                        placeholder="수량"
                        onChange={(e) => updateQty(idx, e.target.value)}
                        style={{ width: 100, textAlign: 'right' }}
                      />
                      {it.itemStdUnit && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{it.itemStdUnit}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px 16px', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              disabled={saving || !cart.length || !cust}
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
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: 12, maxWidth: 400, zIndex: 100
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {invBubble.loading ? (
            <div style={{ color: 'var(--text-secondary)' }}>재고 불러오는 중…</div>
          ) : invBubble.error ? (
            <div style={{ color: 'var(--error)' }}>{invBubble.error}</div>
          ) : (!invBubble.rows || invBubble.rows.length === 0) ? (
            <div style={{ color: 'var(--text-secondary)' }}>재고 데이터가 없습니다</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>창고명</th>
                  <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid var(--border)', width: 80 }}>가용재고</th>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid var(--border)', width: 80 }}>단위</th>
                </tr>
              </thead>
              <tbody>
                {(invBubble.rows || []).map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>{r.whName || '-'}</td>
                    <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{fmt.format(r.avail)}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>{r.unitName || ''}</td>
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
            background: 'var(--bg-primary)', borderRadius: 8, padding: 24, minWidth: 300,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: 16, fontSize: 14 }}>{notice.text}</div>
            <button className="btn btn-primary" onClick={() => setNotice({ open: false, text: '' })}>확인</button>
          </div>
        </div>
      )}
    </div>
  )
}
