import { useEffect, useMemo, useState } from 'react'

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

const activityTypeOptions = [
  '정기방문',
  '영업기회',
  '채권관리',
] as const

const activityStatusOptions = [
  '계획',
  '완료',
  '취소',
  '연기',
  '미방문',
] as const

const channelOptions = [
  '방문',
  '전화',
  '문자/메일/팩스',
  '기타',
] as const

const visibilities = [
  '전체공개',
  '팀공개',
  '비공개',
] as const

export function MobileActivityPage({ onBack }: { onBack?: () => void }) {
  const [step, setStep] = useState<'customer' | 'list' | 'form'>('customer')
  const [customerQuery, setCustomerQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<{ open: boolean; text: string; type?: 'success' | 'error' }>({ open: false, text: '' })
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  // Editing activity
  const [editingActivity, setEditingActivity] = useState<any | null>(null)

  // Form fields
  const [formCustomerQuery, setFormCustomerQuery] = useState('')
  const [formCustomers, setFormCustomers] = useState<any[]>([])
  const [formSelectedCustomer, setFormSelectedCustomer] = useState<any>(null)
  const [leadQuery, setLeadQuery] = useState('')
  const [leads, setLeads] = useState<any[]>([])
  const [selectedLead, setSelectedLead] = useState<any | null>(null)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [isAllDay, setIsAllDay] = useState(false)
  const [visibility, setVisibility] = useState<string>('전체공개')
  const [channel, setChannel] = useState<string>('방문')
  const [activityType, setActivityType] = useState<string>('정기방문')
  const [activityStatus, setActivityStatus] = useState<string>('계획')
  const [plannedStartAt, setPlannedStartAt] = useState('')
  const [actualStartAt, setActualStartAt] = useState('') // 종료일시 (actual_start_at)
  const [originalActualStartAt, setOriginalActualStartAt] = useState('') // Store original value for reset logic
  const [parentActivitySeq, setParentActivitySeq] = useState<string>('')
  const [parentOptions, setParentOptions] = useState<Array<{ id: number; subject?: string }>>([])
  const [saving, setSaving] = useState(false)

  const loggedEmpId = useMemo(() => localStorage.getItem('tnt.sales.empId'), [])
  const loggedAssigneeId = useMemo(() => localStorage.getItem('tnt.sales.assigneeId'), [])

  const empName = (() => {
    try {
      return localStorage.getItem('tnt.sales.empName') || localStorage.getItem('tnt.sales.empId') || ''
    } catch {
      return ''
    }
  })()

  // Load parent activities when form customer changes
  useEffect(() => {
    async function load() {
      try {
        const url = new URL('/api/v1/sales-activities', window.location.origin)
        if (formSelectedCustomer?.customerId) {
          url.searchParams.set('sfAccountId', String(formSelectedCustomer.customerId))
          url.searchParams.set('mineOnly', 'false')
        } else if (loggedAssigneeId || loggedEmpId) {
          if (loggedAssigneeId) url.searchParams.set('assigneeId', String(loggedAssigneeId))
          else if (loggedEmpId) url.searchParams.set('empId', String(loggedEmpId))
          url.searchParams.set('mineOnly', 'true')
        }
        url.searchParams.set('onlyRoot', 'true')
        const res = await fetch(url.toString())
        if (!res.ok) return
        const data = await res.json()
        const list = Array.isArray(data) ? data : []
        setParentOptions(list.slice(0, 100))
      } catch {
        setParentOptions([])
      }
    }
    if (step === 'form') {
      load()
    }
  }, [step, formSelectedCustomer?.customerId, loggedEmpId, loggedAssigneeId])

  // Handle status change: auto-set end datetime when status is "완료", reset when other status
  const [prevActivityStatusMobile, setPrevActivityStatusMobile] = useState<string>('')
  const [isInitialLoadMobile, setIsInitialLoadMobile] = useState(true)

  useEffect(() => {
    // Only run when form is visible
    if (step !== 'form') return

    // Mark initial load complete after first render
    if (isInitialLoadMobile) {
      setPrevActivityStatusMobile(activityStatus)
      setIsInitialLoadMobile(false)
      return
    }

    // Skip if status hasn't changed
    if (prevActivityStatusMobile === activityStatus) return

    const toLocalInput = (date: Date): string => {
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      return local.toISOString().slice(0, 16)
    }

    if (activityStatus === '완료') {
      // Auto-set end datetime to current time only if no existing value
      if (!originalActualStartAt || String(originalActualStartAt).trim() === '') {
        const now = new Date()
        setActualStartAt(toLocalInput(now))
      }
    } else {
      // Reset to original value for other statuses
      setActualStartAt(originalActualStartAt)
    }

    setPrevActivityStatusMobile(activityStatus)
  }, [activityStatus, step, originalActualStartAt, prevActivityStatusMobile, isInitialLoadMobile])

  // Handle actualStartAt change: auto-fill plannedStartAt if empty
  useEffect(() => {
    if (!actualStartAt || plannedStartAt || step !== 'form') return
    // If actualStartAt is filled but plannedStartAt is empty, set plannedStartAt to actualStartAt
    setPlannedStartAt(actualStartAt)
  }, [actualStartAt, plannedStartAt, step])

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
      const r = await fetch(`/api/v1/customers?${params.toString()}`)
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

  async function selectCustomer(customer: Customer) {
    setSelectedCustomer(customer)
    // Don't clear customers and query - keep them for back navigation
    // Set form customer as well
    setFormSelectedCustomer({
      customerSeq: customer.customerSeq,
      customerId: customer.customerId,
      customerName: customer.customerName,
    })

    // Load activities for this customer
    setLoadingActivities(true)
    setStep('list')

    try {
      const params = new URLSearchParams()

      // Filter by assigneeId (logged in user's assigneeId matches sf_owner_id)
      if (loggedAssigneeId) {
        params.set('assigneeId', loggedAssigneeId)
      } else if (loggedEmpId) {
        params.set('empId', loggedEmpId)
      }

      // Filter by customer (sf_account_id matches customer_id)
      if (customer.customerId) {
        params.set('sfAccountId', customer.customerId)
      }

      const res = await fetch(`/api/v1/sales-activities?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const list = Array.isArray(data) ? data : []
      setActivities(list)
    } catch (e: any) {
      setNotice({ open: true, text: e?.message || '활동 조회 중 오류가 발생했습니다', type: 'error' })
      setActivities([])
    } finally {
      setLoadingActivities(false)
    }
  }

  async function searchFormCustomers() {
    if (!formCustomerQuery.trim()) {
      setNotice({ open: true, text: '거래처명을 입력해주세요', type: 'error' })
      return
    }
    try {
      const params = new URLSearchParams()
      params.set('q', formCustomerQuery.trim())
      const r = await fetch(`/api/v1/customers/search?${params.toString()}`)
      const data = r.ok ? await r.json() : []
      const list = Array.isArray(data) ? data : []
      setFormCustomers(list.slice(0, 50))
    } catch {
      setFormCustomers([])
    }
  }

  async function searchLeads() {
    if (!leadQuery.trim()) {
      setNotice({ open: true, text: '잠재고객명을 입력해주세요', type: 'error' })
      return
    }
    try {
      const params = new URLSearchParams()
      params.set('q', leadQuery.trim())
      const r = await fetch(`/api/v1/leads/search?${params.toString()}`)
      const data = r.ok ? await r.json() : []
      const list = Array.isArray(data) ? data : []
      setLeads(list.slice(0, 50))
    } catch {
      setLeads([])
    }
  }

  function selectFormCustomer(customer: any) {
    setFormSelectedCustomer({
      customerSeq: customer.customerSeq,
      customerId: customer.customerId,
      customerName: customer.customerName,
    })
    setFormCustomers([])
    setFormCustomerQuery('')
  }

  function selectLead(lead: any) {
    setSelectedLead(lead)
    setLeads([])
    setLeadQuery('')
  }

  function editActivity(activity: any) {
    // Load activity data into form
    setEditingActivity(activity)
    setFormSelectedCustomer({
      customerSeq: activity.customerSeq,
      customerId: activity.customerId || activity.sfAccountId,
      customerName: activity.customerName,
    })
    setSubject(activity.subject || '')
    setDescription(activity.description || '')
    setActivityType(activity.activityType || '정기방문')
    setActivityStatus(activity.activityStatus || '계획')
    setChannel(activity.channel || '방문')
    setVisibility(activity.visibility || '전체공개')
    setIsAllDay(activity.isAllDay || false)
    setParentActivitySeq(activity.parentSeq ? String(activity.parentSeq) : '')

    // Convert ISO (UTC) timestamps to datetime-local format (local) exactly once
    const toLocalInput = (iso?: any): string => {
      if (!iso) return ''
      const d = (typeof iso === 'string' || typeof iso === 'number') ? new Date(iso) : new Date(String(iso))
      if (isNaN(d.getTime())) return ''
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      return local.toISOString().slice(0, 16)
    }
    setPlannedStartAt(toLocalInput(activity.plannedStartAt))
    const endAtValue = toLocalInput(activity.actualStartAt)
    setActualStartAt(endAtValue)
    setOriginalActualStartAt(endAtValue) // Store original value for reset logic

    setStep('form')
  }

  async function submit() {
    if (!loggedEmpId) {
      setNotice({ open: true, text: '로그인이 필요합니다', type: 'error' })
      return
    }
    const ownerId = loggedAssigneeId || loggedEmpId || ''
    if (!ownerId || !activityType || !activityStatus) {
      setNotice({ open: true, text: '필수 항목: 활동유형, 상태', type: 'error' })
      return
    }

    // Auto-fill actualStartAt with current time if status is "완료/취소/미방문" and actualStartAt is empty
    let finalActualStartAt = actualStartAt
    if (['완료', '취소', '미방문'].includes(activityStatus) && (!actualStartAt || actualStartAt.trim() === '')) {
      const now = new Date()
      const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      finalActualStartAt = local.toISOString().slice(0, 16)
      setActualStartAt(finalActualStartAt)
    }

    // Validate: 종료일시가 시작일시보다 앞설 수 없음
    if (plannedStartAt && finalActualStartAt) {
      const start = new Date(plannedStartAt)
      const end = new Date(finalActualStartAt)
      if (end < start) {
        setNotice({ open: true, text: '종료일시는 시작일시보다 앞설 수 없습니다', type: 'error' })
        return
      }
    }

    // Validation: If actualStartAt has value but status is NOT one of "완료/취소/미방문", show error
    if (finalActualStartAt && !['완료', '취소', '미방문'].includes(activityStatus)) {
      setNotice({ open: true, text: '종료일시가 입력된 경우 상태는 완료, 취소, 미방문 중 하나여야 합니다.', type: 'error' })
      return
    }

    setSaving(true)
    try {
      // Convert datetime-local (local) to ISO UTC
      const toIsoUTC = (v: string) => {
        if (!v) return undefined
        const d = new Date(v)
        if (isNaN(d.getTime())) return undefined
        return d.toISOString()
      }

      // Update existing activity
      if (editingActivity && editingActivity.id) {
        const body = {
          subject: subject || undefined,
          description: description || undefined,
          activityStatus,
          activityType,
          channel,
          isAllDay,
          isPrivate: visibility === 'private',
          visibility,
          parentActivitySeq: parentActivitySeq ? Number(parentActivitySeq) : undefined,
          plannedStartAt: toIsoUTC(plannedStartAt),
          actualStartAt: toIsoUTC(finalActualStartAt),
        }

        const res = await fetch(`/api/v1/sales-activities/${editingActivity.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || data.error) {
          throw new Error(data.error || `HTTP ${res.status}`)
        }

        // Reload the activity data to get updated values from server
        try {
          const reloadUrl = new URL('/api/v1/sales-activities', window.location.origin)
          if (loggedAssigneeId) reloadUrl.searchParams.set('assigneeId', loggedAssigneeId)
          if (loggedEmpId) reloadUrl.searchParams.set('empId', loggedEmpId)
          reloadUrl.searchParams.set('mineOnly', 'true')
          reloadUrl.searchParams.set('_t', Date.now().toString()) // Cache buster
          const reloadRes = await fetch(reloadUrl.toString(), { cache: 'no-cache' })
          if (reloadRes.ok) {
            const activities = await reloadRes.json()
            const updated = Array.isArray(activities) ? activities.find((a: any) => a.id === editingActivity.id) : null
            if (updated) {
              // Update form with fresh data from server
              const toLocalInput = (s?: string) => {
                if (!s) return ''
                const d = new Date(s)
                if (isNaN(d.getTime())) return ''
                const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                return local.toISOString().slice(0, 16)
              }
              const endAtValue = toLocalInput(updated.actualStartAt || updated.actual_start_at)
              setActualStartAt(endAtValue)
              setOriginalActualStartAt(endAtValue)
            }
          }
        } catch (e) {
          console.error('Failed to reload activity data:', e)
        }

        setNotice({ open: true, text: '수정되었습니다', type: 'success' })
      } else {
        // Create new activity
        const body = {
          sfOwnerId: ownerId,
          subject: subject || undefined,
          description: description || undefined,
          isAllDay,
          isPrivate: visibility === 'private',
          visibility,
          channel,
          activityType,
          activityStatus,
          plannedStartAt: toIsoUTC(plannedStartAt),
          actualStartAt: toIsoUTC(finalActualStartAt),
          parentActivitySeq: parentActivitySeq ? Number(parentActivitySeq) : undefined,
          sfAccountId: (formSelectedCustomer?.customerId ? String(formSelectedCustomer.customerId) : undefined),
          sfContactId: (selectedLead?.id ? String(selectedLead.id) : undefined),
          createdBy: loggedEmpId,
          updatedBy: loggedEmpId,
        }

        const res = await fetch('/api/v1/sales-activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || data.error) {
          throw new Error(data.error || `HTTP ${res.status}`)
        }

        setNotice({ open: true, text: '저장되었습니다', type: 'success' })
      }

      // Reset form and reload activities
      setTimeout(async () => {
        setSubject('')
        setDescription('')
        setPlannedStartAt('')
        setActualStartAt('')
        setParentActivitySeq('')
        setEditingActivity(null)
        setSelectedLead(null)

        // Reload activities for the selected customer
        if (selectedCustomer) {
          await selectCustomer(selectedCustomer)
        }

        setStep('list')
      }, 1500)
    } catch (e: any) {
      setNotice({ open: true, text: e?.message || '저장 중 오류가 발생했습니다', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  // Swipe gestures
  const minSwipeDistance = 50
  function onTouchStart(e: React.TouchEvent) {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }
  function onTouchMove(e: React.TouchEvent) {
    setTouchEnd(e.targetTouches[0].clientX)
  }
  function onTouchEnd() {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      // Swipe left: go to next step
      if (step === 'customer' && selectedCustomer) {
        setStep('list')
      } else if (step === 'list') {
        setStep('form')
      }
    } else if (isRightSwipe) {
      // Swipe right: go to previous step
      if (step === 'form') {
        setStep('list')
      } else if (step === 'list') {
        setSelectedCustomer(null)
        setFormSelectedCustomer(null)
        setActivities([])
        setStep('customer')
      } else if (step === 'customer' && onBack) {
        // Swipe right from customer screen to go back to menu
        onBack()
      }
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
            {onBack && step === 'customer' && (
              <button
                onClick={onBack}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined text-slate-900 dark:text-white" style={{ fontSize: 24 }}>
                  arrow_back
                </span>
              </button>
            )}
            {step === 'list' && (
              <button
                onClick={() => {
                  setSelectedCustomer(null)
                  setFormSelectedCustomer(null)
                  setActivities([])
                  setStep('customer')
                }}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined text-slate-900 dark:text-white" style={{ fontSize: 24 }}>
                  arrow_back
                </span>
              </button>
            )}
            {step === 'form' && (
              <button
                onClick={() => setStep('list')}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined text-slate-900 dark:text-white" style={{ fontSize: 24 }}>
                  arrow_back
                </span>
              </button>
            )}
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 24 }}>
              event
            </span>
            <h1 className="text-slate-900 dark:text-white text-lg font-bold">
              {step === 'customer' ? '활동 등록' : step === 'list' ? '활동 목록' : editingActivity ? '영업활동 수정' : '영업활동 등록'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {selectedCustomer && step === 'list' && (
              <button
                className="text-slate-600 dark:text-slate-400 text-sm hover:text-primary"
                onClick={() => {
                  setSelectedCustomer(null)
                  setFormSelectedCustomer(null)
                  setActivities([])
                  setStep('customer')
                }}
              >
                처음부터
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-slate-100 dark:bg-slate-900 px-4 pb-3">
        <div className="flex items-center gap-2">
          <div className={`flex-1 h-1 rounded-full transition-colors ${step === 'customer' || step === 'list' || step === 'form' ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`} />
          <div className={`flex-1 h-1 rounded-full transition-colors ${step === 'list' || step === 'form' ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`} />
          <div className={`flex-1 h-1 rounded-full transition-colors ${step === 'form' ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`} />
        </div>
      </div>

      {/* Notice Toast */}
      {notice.open && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium animate-fade-in-down">
          {notice.text}
        </div>
      )}

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

        {/* Step 2: Activity List */}
        {step === 'list' && selectedCustomer && (
          <div className="w-full max-w-md mx-auto">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 mb-4 border border-slate-300 dark:border-slate-700">
              <div className="text-slate-600 dark:text-slate-400 text-xs mb-1">선택된 거래처</div>
              <div className="text-slate-900 dark:text-white font-semibold">{selectedCustomer.customerName}</div>
            </div>

            <h2 className="text-slate-900 dark:text-white text-xl font-bold mb-4">활동 목록</h2>

            {loadingActivities ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-slate-600 dark:text-slate-400">로딩 중...</div>
              </div>
            ) : activities.length === 0 ? (
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-6 text-center border border-slate-300 dark:border-slate-700 mb-4">
                <span className="material-symbols-outlined text-slate-400 mb-2" style={{ fontSize: 48 }}>
                  event_busy
                </span>
                <p className="text-slate-600 dark:text-slate-400">등록된 활동이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                {activities.map((activity, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 border border-slate-300 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => editActivity(activity)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-slate-900 dark:text-white font-semibold mb-1">
                          {activity.subject || '(제목 없음)'}
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary/20 text-primary">
                            {activity.activityType}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {activity.activityStatus}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {activity.channel}
                          </span>
                        </div>
                        {activity.description && (
                          <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2 mb-2">
                            {activity.description}
                          </p>
                        )}
                        {activity.plannedStartAt && (
                          <div className="text-slate-500 dark:text-slate-500 text-xs">
                            {(() => {
                              const date = new Date(activity.plannedStartAt)
                              if (isNaN(date.getTime())) return ''
                              const year = date.getFullYear()
                              const month = String(date.getMonth() + 1).padStart(2, '0')
                              const day = String(date.getDate()).padStart(2, '0')
                              const hours = String(date.getHours()).padStart(2, '0')
                              const minutes = String(date.getMinutes()).padStart(2, '0')
                              return `${year}-${month}-${day} ${hours}:${minutes}`
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* New Activity Button */}
            <button
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg bg-primary text-slate-900 text-base font-bold hover:bg-primary/90 transition-colors"
              onClick={() => {
                // Reset form for new activity
                setEditingActivity(null)
                setSubject('')
                setDescription('')
                setPlannedStartAt('')
                setActualStartAt('')
                setParentActivitySeq('')
                setActivityType('정기방문')
                setActivityStatus('계획')
                setChannel('방문')
                setVisibility('전체공개')
                setIsAllDay(false)
                setSelectedLead(null)
                setStep('form')
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>add</span>
              <span>새 활동 등록</span>
            </button>
          </div>
        )}

        {/* Step 3: Activity Form */}
        {step === 'form' && (
          <div className="w-full max-w-md mx-auto space-y-4">
            {/* Customer Search */}
            <div>
              <label className="flex flex-col w-full">
                <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">거래처</p>
                <div className="flex gap-2">
                  <input
                    className="form-input flex flex-1 resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 focus:border-primary h-12 placeholder:text-slate-500 dark:placeholder:text-slate-400 p-3 text-base disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder={formSelectedCustomer?.customerName || "거래처명 입력"}
                    type="text"
                    value={formCustomerQuery}
                    onChange={(e) => setFormCustomerQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        searchFormCustomers()
                      }
                    }}
                    disabled={!!formSelectedCustomer || !!editingActivity}
                  />
                  {formSelectedCustomer && !editingActivity ? (
                    <button
                      className="h-12 px-4 rounded-lg bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white font-medium hover:bg-slate-400 dark:hover:bg-slate-600"
                      onClick={() => setFormSelectedCustomer(null)}
                    >
                      변경
                    </button>
                  ) : !editingActivity ? (
                    <button
                      className="h-12 px-4 rounded-lg bg-primary text-slate-900 font-medium hover:bg-primary/90"
                      onClick={searchFormCustomers}
                    >
                      검색
                    </button>
                  ) : null}
                </div>
              </label>
              {/* Customer Results */}
              {formCustomers.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-300 dark:border-slate-700">
                  {formCustomers.map((c, idx) => (
                    <div
                      key={idx}
                      className="p-3 hover:bg-primary/10 cursor-pointer border-b border-slate-200 dark:border-slate-700 last:border-b-0"
                      onClick={() => selectFormCustomer(c)}
                    >
                      <div className="text-slate-900 dark:text-white font-medium">{c.customerName}</div>
                      <div className="text-slate-600 dark:text-slate-400 text-xs">{c.customerId}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lead Search */}
            <div>
              <label className="flex flex-col w-full">
                <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">잠재고객</p>
                <div className="flex gap-2">
                  <input
                    className="form-input flex flex-1 resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 focus:border-primary h-12 placeholder:text-slate-500 dark:placeholder:text-slate-400 p-3 text-base"
                    placeholder={selectedLead?.name || "잠재고객명 입력"}
                    type="text"
                    value={leadQuery}
                    onChange={(e) => setLeadQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        searchLeads()
                      }
                    }}
                    disabled={!!selectedLead}
                  />
                  {selectedLead ? (
                    <button
                      className="h-12 px-4 rounded-lg bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white font-medium hover:bg-slate-400 dark:hover:bg-slate-600"
                      onClick={() => setSelectedLead(null)}
                    >
                      변경
                    </button>
                  ) : (
                    <button
                      className="h-12 px-4 rounded-lg bg-primary text-slate-900 font-medium hover:bg-primary/90"
                      onClick={searchLeads}
                    >
                      검색
                    </button>
                  )}
                </div>
              </label>
              {/* Lead Results */}
              {leads.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-300 dark:border-slate-700">
                  {leads.map((l, idx) => (
                    <div
                      key={idx}
                      className="p-3 hover:bg-primary/10 cursor-pointer border-b border-slate-200 dark:border-slate-700 last:border-b-0"
                      onClick={() => selectLead(l)}
                    >
                      <div className="text-slate-900 dark:text-white font-medium">{l.name}</div>
                      <div className="text-slate-600 dark:text-slate-400 text-xs">{l.company || l.email || ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subject */}
            <label className="flex flex-col w-full">
              <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">제목</p>
              <input
                className="form-input flex w-full resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 focus:border-primary h-12 placeholder:text-slate-500 dark:placeholder:text-slate-400 p-3 text-base"
                placeholder="제목을 입력하세요"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>

            {/* Activity Type & Status */}
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col w-full">
                <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">활동유형</p>
                <select
                  className="form-input flex w-full resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 focus:border-primary h-12 p-3 text-base"
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                >
                  {activityTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>

              <label className="flex flex-col w-full">
                <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">상태</p>
                <select
                  className="form-input flex w-full resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 focus:border-primary h-12 p-3 text-base"
                  value={activityStatus}
                  onChange={(e) => setActivityStatus(e.target.value)}
                >
                  {activityStatusOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
            </div>

            {/* Channel & Visibility */}
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col w-full">
                <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">방법</p>
                <select
                  className="form-input flex w-full resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 focus:border-primary h-12 p-3 text-base"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                >
                  {channelOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>

              <label className="flex flex-col w-full">
                <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">공개범위</p>
                <select
                  className="form-input flex w-full resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 focus:border-primary h-12 p-3 text-base"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                >
                  {visibilities.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
            </div>

            {/* Description */}
            <label className="flex flex-col w-full">
              <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">설명</p>
              <textarea
                className="form-input flex w-full resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 focus:border-primary placeholder:text-slate-500 dark:placeholder:text-slate-400 p-3 text-base"
                placeholder="활동 내용을 입력하세요"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            {/* Start & End Time */}
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col w-full">
                <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">시작</p>
                <input
                  className="form-input flex w-full resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 focus:border-primary h-12 p-3 text-base"
                  type="datetime-local"
                  value={plannedStartAt}
                  onChange={(e) => setPlannedStartAt(e.target.value)}
                />
              </label>

              <label className="flex flex-col w-full">
                <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">종료</p>
                <input
                  className="form-input flex w-full resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 focus:border-primary h-12 p-3 text-base"
                  type="datetime-local"
                  value={actualStartAt}
                  onChange={(e) => setActualStartAt(e.target.value)}
                />
              </label>
            </div>

            {/* Parent Activity & All Day */}
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col w-full">
                <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">상위활동</p>
                <select
                  className="form-input flex w-full resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 focus:border-primary h-12 p-3 text-base"
                  value={parentActivitySeq}
                  onChange={(e) => setParentActivitySeq(e.target.value)}
                >
                  <option value="">없음</option>
                  {parentOptions.map(p => (
                    <option key={p.id} value={String(p.id)}>{p.subject || `#${p.id}`}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col w-full">
                <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">종일</p>
                <select
                  className="form-input flex w-full resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 focus:border-primary h-12 p-3 text-base"
                  value={isAllDay ? 'true' : 'false'}
                  onChange={(e) => setIsAllDay(e.target.value === 'true')}
                >
                  <option value="false">아니오</option>
                  <option value="true">예</option>
                </select>
              </label>
            </div>

            {/* Submit Button */}
            <button
              className="w-full h-12 px-6 rounded-lg bg-primary text-slate-900 text-base font-bold leading-normal transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-dark focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={submit}
              disabled={saving}
            >
              {saving ? (editingActivity ? '수정 중...' : '저장 중...') : (editingActivity ? '수정' : '저장')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
