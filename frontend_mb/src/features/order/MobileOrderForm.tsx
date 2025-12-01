import { useEffect, useState } from 'react'

type Customer = {
  customerId?: string
  customerName?: string
  customerSeq?: number
  addrProvinceName?: string
  addrCityName?: string
  companyCode?: string
  ownerName?: string
  managerName?: string
}

type CartItem = {
  itemSeq: any
  itemName: string
  itemSpec?: string
  qty: number | ''
  companyType?: string | null
  itemStdUnit?: string | null
}

export function MobileOrderForm({ onBack }: { onBack?: () => void }) {
  const [step, setStep] = useState<'customer' | 'items' | 'review'>('customer')
  const [customerQuery, setCustomerQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [itemQuery, setItemQuery] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [regionGroup, setRegionGroup] = useState('')
  const [requests, setRequests] = useState('')
  const [deliveryDueDate, setDeliveryDueDate] = useState(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 10)
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ open: boolean; text: string; type?: 'success' | 'error' }>({ open: false, text: '' })
  const [orderNo, setOrderNo] = useState('')
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [showRecentTransactions, setShowRecentTransactions] = useState(true)
  // debug order/slack preview removed

  const empName = (() => {
    try {
      return localStorage.getItem('tnt.sales.empName') || localStorage.getItem('tnt.sales.empId') || ''
    } catch {
      return ''
    }
  })()

  const assigneeId = (() => {
    try {
      return localStorage.getItem('tnt.sales.assigneeId') || ''
    } catch {
      return ''
    }
  })()

  async function searchCustomers() {
    if (!customerQuery.trim()) {
      setNotice({ open: true, text: '거래처명을 입력해주세요', type: 'error' })
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('name', customerQuery.trim())
      params.set('mineOnly', 'false')
      const r = await fetch(`/api/v1/customers?${params.toString()}`, { cache: 'no-store' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      const list: Customer[] = Array.isArray(data)
        ? data.map((x: any) => ({
            customerId: x?.customerId ?? '',
            customerName: x?.customerName ?? '',
            customerSeq: x?.customerSeq != null ? Number(x.customerSeq) : undefined,
            addrProvinceName: x?.addrProvinceName ?? x?.addr_province_name ?? '',
            addrCityName: x?.addrCityName ?? x?.addr_city_name ?? '',
            companyCode: String(x?.companyCode ?? x?.company_code ?? x?.company_type ?? x?.companyType ?? x?.company ?? '').toUpperCase(),
            ownerName: x?.ownerName ?? x?.empName ?? '',
          }))
        : []
      list.sort((a, b) => String(a.customerName || '').localeCompare(String(b.customerName || ''), 'ko-KR'))
      setCustomers(list)
    } catch (e: any) {
      setNotice({ open: true, text: e?.message || '조회 중 오류가 발생했습니다', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function selectCustomer(cust: Customer) {
    setSelectedCustomer(cust)
    const province = cust.addrProvinceName ?? ''
    const city = cust.addrCityName ?? ''
    const rg = [province, city].filter((s) => !!s && String(s).trim().length > 0).join(' ')
    if (rg) setRegionGroup(rg)
    setStep('items')
    // Load recent transactions
    await loadRecentTransactions(cust.customerSeq)
  }

  async function loadRecentTransactions(custSeq?: number) {
    if (custSeq == null) {
      setRecentTransactions([])
      return
    }
    try {
      const r = await fetch(`/api/v1/customers/${custSeq}/transactions`, { cache: 'no-store' })
      if (!r.ok) {
        setRecentTransactions([])
        return
      }
      const arr = await r.json().catch(() => [])
      if (!Array.isArray(arr)) {
        setRecentTransactions([])
        return
      }
      const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000
      const map: Record<string, { itemSeq: any; itemName: string; companyType: string | null; itemStdUnit: string | null; recent: number; totalAmt: number; totalQty: number }> = {}
      for (const x of arr) {
        const itemName = String(x?.itemName ?? x?.item_name ?? '').trim()
        if (!itemName) continue
        const itemSeq = x?.itemSeq ?? x?.item_seq ?? null
        const companyType = x?.companyType ?? x?.company_type ?? null
        const itemStdUnit = (x?.itemStdUnit ?? x?.item_std_unit ?? '').trim()
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
        if (!rec.itemStdUnit && itemStdUnit) rec.itemStdUnit = itemStdUnit
        if (rec.itemSeq == null && itemSeq != null) rec.itemSeq = itemSeq
        if (!rec.companyType && companyType) rec.companyType = companyType
        map[itemName] = rec
      }
      const out = Object.values(map)
        .sort((a, b) => b.recent - a.recent || a.itemName.localeCompare(b.itemName, 'ko', { sensitivity: 'base' }))
        .map((it) => ({
          itemName: it.itemName,
          itemSeq: it.itemSeq,
          companyType: it.companyType,
          itemStdUnit: it.itemStdUnit,
          recentDate: new Date(it.recent).toISOString().slice(0, 10),
          totalAmt: it.totalAmt,
          totalQty: it.totalQty,
        }))
      setRecentTransactions(out)
    } catch {
      setRecentTransactions([])
    }
  }

  async function searchItems() {
    if (!itemQuery.trim()) {
      setNotice({ open: true, text: '품목명을 입력해주세요', type: 'error' })
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('q', itemQuery.trim())
      // Pass companyType and customerSeq for invoice filtering
      const compType = selectedCustomer?.companyCode
      if (compType) params.set('companyType', compType)
      if (selectedCustomer?.customerSeq != null) params.set('customerSeq', String(selectedCustomer.customerSeq))
      const r = await fetch(`/api/v1/items/search?${params.toString()}`)
      const data = r.ok ? await r.json() : []
      const list = Array.isArray(data)
        ? data.map((x: any) => ({
            itemSeq: x?.itemSeq,
            itemName: String(x?.itemName ?? ''),
            recentInvoiceDate: x?.recentInvoiceDate ?? x?.recent_invoice_date ?? null,
            curAmt: x?.curAmt ?? null,
            qty: x?.qty ?? null,
            itemStdUnit: x?.itemStdUnit ?? x?.item_std_unit ?? null,
            companyType: x?.companyType || x?.company_type || null
          }))
        : []
      setItems(list)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  async function addToCart(item: any) {
    if (cart.some((c) => String(c.itemName) === String(item.itemName))) {
      setNotice({ open: true, text: '이미 주문에 포함되어 있습니다.', type: 'error' })
      return
    }

    // Use selected item's itemSeq and companyType directly
    const itemSeq = item.itemSeq ?? null
    let itemStdUnit: string | null = item.itemStdUnit ?? null
    let itemSpec = ''
    const companyType: string | null = item.companyType ?? null

    // itemName으로 spec API 호출하여 itemSpec, itemStdUnit 조회
    if (item.itemName) {
      try {
        const r = await fetch(`/api/v1/items/spec?itemName=${encodeURIComponent(item.itemName)}`)
        if (r.ok) {
          const data = await r.json().catch(() => null)
          // spec API에서 itemSpec, itemStdUnit만 가져옴 (itemSeq, companyType은 선택된 품목 값 사용)
          if (!itemStdUnit && (data?.itemStdUnit || data?.item_std_unit)) {
            itemStdUnit = data?.itemStdUnit ?? data?.item_std_unit
          }
          if (data?.itemSpec || data?.item_spec) {
            itemSpec = data?.itemSpec ?? data?.item_spec ?? ''
          }
        }
      } catch {
        // ignore
      }
    }

    setCart([
      ...cart,
      {
        itemSeq,
        itemName: item.itemName,
        itemSpec: itemSpec || '',
        qty: '',
        companyType,
        itemStdUnit,
      },
    ])
    setNotice({ open: true, text: '담기 완료', type: 'success' })
  }

  function removeFromCart(idx: number) {
    setCart(cart.filter((_, i) => i !== idx))
  }

  function updateQty(idx: number, val: string) {
    const next = cart.slice()
    if (val === '') {
      next[idx] = { ...next[idx], qty: '' as any }
    } else {
      const v = Number(val)
      if (!isFinite(v) || v < 0) {
        next[idx] = { ...next[idx], qty: '' as any }
      } else {
        // Limit to max 2 decimal places
        const limited = Math.floor(v * 100) / 100
        next[idx] = { ...next[idx], qty: limited }
      }
    }
    setCart(next)
  }

  async function resolveSalesEmpSeq(companyCode: string): Promise<string> {
    const aid = assigneeId || ''
    const empId = (() => {
      try {
        return localStorage.getItem('tnt.sales.empId') || ''
      } catch {
        return ''
      }
    })()
    if (!aid && !empId) return '4'
    try {
      const p = new URLSearchParams()
      if (aid) p.set('assigneeId', aid)
      if (empId) p.set('empId', empId)
      if (companyCode) p.set('companyCode', companyCode)
      const rs = await fetch(`/api/v1/employee/by-assignee?${p.toString()}`, { cache: 'no-store' })
      if (!rs.ok) return '4'
      const j = (await rs.json().catch(() => null as any)) as any
      const v = j?.resolvedSalesEmpSeq ?? (companyCode?.toUpperCase() === 'DYS' ? j?.dys_emp_seq : j?.tnt_emp_seq)
      return v != null && String(v) ? String(v) : '4'
    } catch {
      return '4'
    }
  }

  // Swipe handlers
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      // Swipe left: go to next step
      if (step === 'customer' && selectedCustomer) {
        setStep('items')
      } else if (step === 'items' && cart.length > 0) {
        setStep('review')
      }
    } else if (isRightSwipe) {
      // Swipe right: go to previous step
      if (step === 'review') {
        setStep('items')
      } else if (step === 'items') {
        setStep('customer')
      }
    }
  }

  async function submitOrder() {
    if (!selectedCustomer) {
      setNotice({ open: true, text: '거래처를 선택해주세요', type: 'error' })
      return
    }
    if (cart.length === 0) {
      setNotice({ open: true, text: '품목을 추가해주세요', type: 'error' })
      return
    }
    // Check if all items have qty
    const missingQty = cart.some((it) => it.qty === '' || it.qty === 0)
    if (missingQty) {
      setNotice({ open: true, text: '모든 품목의 수량을 입력해주세요', type: 'error' })
      return
    }

    setSaving(true)
    try {
      const company = String(selectedCustomer?.companyCode || 'TNT')

      // Fetch order number before sending
      let generatedOrderNo = ''
      try {
        const params = new URLSearchParams()
        params.set('companyCode', company)
        params.set('createdBy', empName || '')
        const r = await fetch(`/api/v1/orders/next-order-text-no?${params.toString()}`)
        if (r.ok) {
          const data = await r.json().catch(() => ({}))
          if (data?.orderTextNo) {
            generatedOrderNo = String(data.orderTextNo)
          }
        }
      } catch {
        // ignore
      }

      const seq = await resolveSalesEmpSeq(company)
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (assigneeId) headers['X-ASSIGNEE-ID'] = String(assigneeId)
      const body: any = {
        companyCode: company,
        customerSeq: selectedCustomer?.customerSeq != null ? String(selectedCustomer.customerSeq) : '',
        customerName: String(selectedCustomer?.customerName || ''),
        assigneeId: assigneeId || '',
        regionGroup,
        requests,
        deliveryDueDate,
        createdBy: empName || '',
        custEmpName: String(selectedCustomer?.ownerName || ''),
        salesEmpSeq: seq || undefined,
        orderTextNo: generatedOrderNo || undefined,
        items: cart.map((it) => ({
          itemSeq: String(it.itemSeq || ''),
          itemName: it.itemName,
          itemSpec: it.itemSpec || '',
          qty: Number(it.qty) || 0,
          itemStdUnit: it.itemStdUnit || undefined,
          companyType: it.companyType || undefined,
        })),
      }
      const rs = await fetch('/api/v1/orders', { method: 'POST', headers, body: JSON.stringify(body) })
      const resp = await rs.json().catch(() => ({} as any))
      if (!rs.ok) throw new Error(resp?.error || `HTTP ${rs.status}`)

      const responseOrderNo = String(resp?.orderTextNo || resp?.sendPayload?.ROOT?.data?.ROOT?.DataBlock1?.[0]?.OrderTextNo || generatedOrderNo || '')
      if (responseOrderNo) setOrderNo(responseOrderNo)

      setTimeout(() => {
        setSelectedCustomer(null)
        setCart([])
        setRequests('')
        setRegionGroup('')
        setOrderNo('')
        setStep('customer')
        setCustomerQuery('')
        setItemQuery('')
        setCustomers([])
        setItems([])
        setRecentTransactions([])
      }, 1500)
    } catch (e: any) {
      setNotice({ open: true, text: e?.message || '주문 전송 중 오류가 발생했습니다', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (notice.open) {
      const timer = setTimeout(() => setNotice({ open: false, text: '' }), 2000)
      return () => clearTimeout(timer)
    }
  }, [notice.open])

  return (
    <div
      className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark overflow-x-hidden font-display"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined text-slate-900 dark:text-white" style={{ fontSize: 24 }}>
                  arrow_back
                </span>
              </button>
            )}
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 24 }}>
              receipt_long
            </span>
            <h1 className="text-slate-900 dark:text-white text-lg font-bold">수주장 입력</h1>
          </div>
          <div className="flex items-center gap-2">
            {selectedCustomer && (
              <button
                className="text-slate-600 dark:text-slate-400 text-sm hover:text-primary"
                onClick={() => {
                  setSelectedCustomer(null)
                  setCart([])
                  setStep('customer')
                }}
              >
                처음부터
              </button>
            )}
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2 mt-3">
          <div className={`flex-1 h-1 rounded-full ${step === 'customer' ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`} />
          <div className={`flex-1 h-1 rounded-full ${step === 'items' ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`} />
          <div className={`flex-1 h-1 rounded-full ${step === 'review' ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`} />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col grow p-4 pb-20">
        {/* Step 1: Customer Selection */}
        {step === 'customer' && (
          <div className="w-full max-w-md mx-auto">
            <h2 className="text-slate-900 dark:text-white text-xl font-bold mb-4">거래처 선택</h2>

            {/* Customer Search */}
            <label className="flex flex-col w-full mb-4">
              <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">거래처명</p>
              <div className="flex gap-2">
                <div className="flex flex-1 items-stretch rounded-lg">
                  <div className="text-slate-500 dark:text-slate-400 flex border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 items-center justify-center pl-4 rounded-l-lg border-r-0">
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                      store
                    </span>
                  </div>
                  <input
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 focus:border-primary h-12 placeholder:text-slate-500 dark:placeholder:text-slate-400 p-3 rounded-l-none text-base"
                    placeholder="거래처명 입력"
                    type="text"
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        searchCustomers()
                      }
                    }}
                  />
                </div>
                <button
                  className="flex items-center justify-center h-12 px-5 rounded-lg bg-primary text-slate-900 text-base font-bold leading-normal transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-dark focus:ring-primary"
                  onClick={searchCustomers}
                  disabled={loading}
                >
                  {loading ? '조회 중…' : '조회'}
                </button>
              </div>
            </label>

            {/* Customer List */}
            {customers.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-slate-300 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700">
                    <tr>
                      <th className="text-left py-3 px-4 text-slate-900 dark:text-white font-semibold">거래처명</th>
                      <th className="text-left py-3 px-4 text-slate-900 dark:text-white font-semibold">대표자</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {customers.map((cust, idx) => (
                      <tr
                        key={idx}
                        className="bg-slate-50 dark:bg-slate-800 hover:bg-primary/10 cursor-pointer transition-colors"
                        onClick={() => selectCustomer(cust)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {cust.companyCode && (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">
                                {cust.companyCode.charAt(0)}
                              </span>
                            )}
                            <span className="text-slate-900 dark:text-white font-medium">{cust.customerName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{cust.ownerName || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Item Selection */}
        {step === 'items' && selectedCustomer && (
          <div className="w-full max-w-md mx-auto pb-24">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-slate-900 dark:text-white text-xl font-bold">품목 선택</h2>
                <button
                  className="text-slate-600 dark:text-slate-400 text-sm hover:text-primary"
                  onClick={() => setStep('customer')}
                >
                  거래처 변경
                </button>
              </div>
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                <div className="text-slate-600 dark:text-slate-400 text-xs mb-1">선택된 거래처</div>
                <div className="text-slate-900 dark:text-white font-semibold">{selectedCustomer.customerName}</div>
              </div>
            </div>

            {/* Item Search */}
            <label className="flex flex-col w-full mb-4">
              <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">신규 품목명</p>
              <div className="flex gap-2">
                <div className="flex flex-1 items-stretch rounded-lg">
                  <div className="text-slate-500 dark:text-slate-400 flex border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 items-center justify-center pl-4 rounded-l-lg border-r-0">
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                      inventory_2
                    </span>
                  </div>
                  <input
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 focus:border-primary h-12 placeholder:text-slate-500 dark:placeholder:text-slate-400 p-3 rounded-l-none text-base"
                    placeholder="신규 품목명 입력"
                    type="text"
                    value={itemQuery}
                    onChange={(e) => setItemQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        searchItems()
                      }
                    }}
                  />
                </div>
                <button
                  className="flex items-center justify-center h-12 px-5 rounded-lg bg-primary text-slate-900 text-base font-bold leading-normal transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-dark focus:ring-primary"
                  onClick={searchItems}
                  disabled={loading}
                >
                  {loading ? '조회 중…' : '조회'}
                </button>
              </div>
            </label>

            {/* Recent Transactions */}
            {recentTransactions.length > 0 && (
              <div className="mb-4">
                <button
                  className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => setShowRecentTransactions(!showRecentTransactions)}
                >
                  <h3 className="text-slate-900 dark:text-white text-sm font-semibold">최근 거래내역 ({recentTransactions.length})</h3>
                  <span className="material-symbols-outlined text-slate-600 dark:text-slate-400" style={{ fontSize: 20 }}>
                    {showRecentTransactions ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {showRecentTransactions && (
                  <div className="mt-2 overflow-x-auto rounded-lg border border-slate-300 dark:border-slate-700">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700">
                        <tr>
                          <th className="text-left py-2 px-3 text-slate-900 dark:text-white font-semibold">품목</th>
                          <th className="text-left py-2 px-3 text-slate-900 dark:text-white font-semibold">최근거래일</th>
                          <th className="text-right py-2 px-3 text-slate-900 dark:text-white font-semibold">총금액</th>
                          <th className="text-center py-2 px-3 text-slate-900 dark:text-white font-semibold"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {recentTransactions.map((tx, idx) => (
                          <tr key={idx} className="bg-slate-50 dark:bg-slate-800 hover:bg-primary/10">
                            <td className="py-2 px-3 text-slate-900 dark:text-white">{tx.itemName}</td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{tx.recentDate}</td>
                            <td className="py-2 px-3 text-right text-slate-900 dark:text-white">
                              {Number(tx.totalAmt || 0).toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-slate-900 hover:bg-primary/90"
                                onClick={() => addToCart({
                                  itemSeq: tx.itemSeq ?? null,
                                  itemName: tx.itemName,
                                  companyType: tx.companyType ?? null,
                                  itemStdUnit: tx.itemStdUnit ?? null
                                })}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                                  add
                                </span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Item List */}
            {items.length > 0 && (
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-slate-900 dark:text-white text-sm font-semibold">조회 결과</h3>
                </div>
                {items.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-slate-900 dark:text-white font-medium mb-1 flex items-center gap-2">
                          {(() => {
                            const ct = (item.companyType || '').toUpperCase()
                            const label = ct === 'TNT' ? 'T' : ct === 'DYS' || ct === 'DSY' ? 'D' : ct === 'ALL' ? 'A' : ''
                            const color = ct === 'TNT' ? '#2563eb' : (ct === 'DYS' || ct === 'DSY') ? '#10b981' : ct === 'ALL' ? '#f59e0b' : '#9ca3af'
                            return label ? (
                              <span className="flex items-center justify-center" style={{ width:18, height:18, borderRadius:'50%', background: color, color:'#fff', fontSize:11, fontWeight:800, boxShadow:'0 0 0 1px rgba(0,0,0,.08)' }}>{label}</span>
                            ) : null
                          })()}
                          <span>{item.itemName}</span>
                          {item.itemStdUnit ? (<span className="text-slate-500 dark:text-slate-400 text-xs">({item.itemStdUnit})</span>) : null}
                        </div>
                        {item.recentInvoiceDate && (
                          <div className="text-slate-600 dark:text-slate-400 text-xs">{item.recentInvoiceDate}</div>
                        )}
                      </div>
                      <button
                        className="ml-2 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-slate-900 hover:bg-primary/90"
                        onClick={() => addToCart(item)}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                          add
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Fixed Cart Button at Bottom */}
            {cart.length > 0 && (
              <div className="fixed bottom-0 left-0 right-0 z-20 bg-slate-100 dark:bg-slate-900 border-t border-slate-300 dark:border-slate-700 p-4">
                <div className="w-full max-w-md mx-auto">
                  <button
                    className="w-full h-14 px-6 rounded-lg bg-primary text-slate-900 text-base font-bold leading-normal transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-dark focus:ring-primary flex items-center justify-center gap-2"
                    onClick={() => {
                      setStep('review')
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
                      shopping_cart
                    </span>
                    <span>장바구니 ({cart.length})</span>
                    <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
                      arrow_forward
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 'review' && selectedCustomer && (
          <div className="w-full max-w-md mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-slate-900 dark:text-white text-xl font-bold">주문 확인</h2>
              <button className="text-slate-600 dark:text-slate-400 text-sm hover:text-primary" onClick={() => setStep('items')}>
                수정
              </button>
            </div>

            <div className="space-y-4">
              {/* Order Number - Only show after submission */}
              {orderNo && (
                <div className="p-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <div className="text-slate-600 dark:text-slate-400 text-xs mb-1">수주장번호</div>
                  <div className="text-slate-900 dark:text-white font-semibold">{orderNo}</div>
                </div>
              )}

              {/* Company & Customer Info */}
              <div className="p-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-slate-600 dark:text-slate-400 text-xs mb-1">회사코드</div>
                    <div className="text-slate-900 dark:text-white font-semibold">{selectedCustomer.companyCode || 'TNT'}</div>
                  </div>
                  <div>
                    <div className="text-slate-600 dark:text-slate-400 text-xs mb-1">거래처</div>
                    <div className="text-slate-900 dark:text-white font-semibold">{selectedCustomer.customerName}</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-300 dark:border-slate-600">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-xs mb-1">등록자</div>
                      <div className="text-slate-900 dark:text-white font-medium">{empName}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 dark:text-slate-400 text-xs mb-1">담당자</div>
                      <div className="text-slate-900 dark:text-white font-medium">{selectedCustomer.ownerName || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Region Group */}
              <label className="flex flex-col w-full">
                <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">지역 그룹</p>
                <input
                  className="form-input flex w-full resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 focus:border-primary h-12 placeholder:text-slate-500 dark:placeholder:text-slate-400 p-3 text-base"
                  placeholder="지역 그룹"
                  type="text"
                  value={regionGroup}
                  onChange={(e) => setRegionGroup(e.target.value)}
                />
              </label>

              {/* Delivery Date */}
              <label className="flex flex-col w-full">
                <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">납품요청일</p>
                <input
                  className="form-input flex w-full resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 focus:border-primary h-12 placeholder:text-slate-500 dark:placeholder:text-slate-400 p-3 text-base"
                  type="date"
                  value={deliveryDueDate}
                  onChange={(e) => setDeliveryDueDate(e.target.value)}
                />
              </label>

              {/* Requests */}
              <label className="flex flex-col w-full">
                <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">요청 사항</p>
                <textarea
                  className="form-input flex w-full resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 focus:border-primary placeholder:text-slate-500 dark:placeholder:text-slate-400 p-3 text-base"
                  placeholder="요청 사항 입력"
                  rows={4}
                  value={requests}
                  onChange={(e) => setRequests(e.target.value)}
                />
              </label>

              {/* Cart Items with Quantity Input */}
              <div>
                <h3 className="text-slate-900 dark:text-white text-sm font-semibold mb-2">주문 품목 ({cart.length})</h3>
                <div className="space-y-2">
                  {cart.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                      <div className="flex items-start gap-2">
                        {/* Item Name */}
                        <div className="flex-1">
                          <div className="text-slate-900 dark:text-white font-medium mb-2 flex items-center gap-2">
                            {(() => {
                              const ct = (item.companyType || '').toUpperCase()
                              const label = ct === 'TNT' ? 'T' : ct === 'DYS' || ct === 'DSY' ? 'D' : ct === 'ALL' ? 'A' : ''
                              const color = ct === 'TNT' ? '#2563eb' : (ct === 'DYS' || ct === 'DSY') ? '#10b981' : ct === 'ALL' ? '#f59e0b' : '#9ca3af'
                              return label ? (
                                <span className="flex items-center justify-center" style={{ width:18, height:18, borderRadius:'50%', background: color, color:'#fff', fontSize:11, fontWeight:800, boxShadow:'0 0 0 1px rgba(0,0,0,.08)' }}>{label}</span>
                              ) : null
                            })()}
                            <span>{item.itemName}</span>
                            {item.itemStdUnit ? (<span className="text-slate-500 dark:text-slate-400 text-xs">({item.itemStdUnit})</span>) : null}
                          </div>
                          {/* Quantity Input */}
                          <div className="flex items-center gap-2">
                            <label className="text-slate-600 dark:text-slate-400 text-xs">수량:</label>
                            <input
                              type="number"
                              className="form-input flex-1 resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 focus:border-primary h-10 placeholder:text-slate-500 dark:placeholder:text-slate-400 px-3 text-sm"
                              placeholder="수량 입력"
                              value={item.qty}
                              onChange={(e) => updateQty(idx, e.target.value)}
                              min="0"
                              step="0.01"
                            />
                            {item.itemStdUnit ? <span className="text-slate-500 dark:text-slate-400 text-xs px-1">{item.itemStdUnit}</span> : null}
                          </div>
                        </div>
                        {/* Remove Button */}
                        <button
                          className="text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 mt-1"
                          onClick={() => removeFromCart(idx)}
                          aria-label="품목 삭제"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                className="w-full h-12 px-6 rounded-lg bg-primary text-slate-900 text-base font-bold leading-normal transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-dark focus:ring-primary"
                onClick={submitOrder}
                disabled={saving}
              >
                {saving ? '주문 중…' : '주문 전송'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {notice.open && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
          <div
            className={`px-6 py-3 rounded-lg shadow-lg ${
              notice.type === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-green-500 text-white'
            }`}
          >
            {notice.text}
          </div>
        </div>
      )}


    </div>
  )
}
