import { useMemo, useState } from 'react'

type SelectedCustomer = { customerSeq?: number; empSeq?: number; customerName?: string; customerId?: string }

const activityTypeOptions = [
  { value: 'site_visit', label: '정기방문' },
  { value: 'opportunity', label: '영업기회' },
  { value: 'AR_mgmt', label: '채권관리' },
] as const

const activityStatusOptions = [
  { value: 'scheduled', label: '계획' },
  { value: 'completed', label: '완료' },
  { value: 'canceled', label: '취소' },
  { value: 'postponed', label: '연기' },
  { value: 'no_show', label: '미방문' },
] as const

const channelOptions = [
  { value: 'in_person', label: '방문' },
  { value: 'phone', label: '전화' },
  { value: 'email', label: '문자/메일/팩스' },
  { value: 'other', label: '기타' },
] as const

const visibilities = [
  { value: 'public', label: '전체공개' },
  { value: 'team', label: '팀공개' },
  { value: 'private', label: '비공개' },
] as const

export function MobileActivityForm({ onClose, preselectedCustomer }: { onClose?: () => void; preselectedCustomer?: SelectedCustomer }) {
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(preselectedCustomer || null)
  const [customerQuery, setCustomerQuery] = useState('')
  const [customers, setCustomers] = useState<any[]>([])
  const [leadQuery, setLeadQuery] = useState('')
  const [leads, setLeads] = useState<any[]>([])
  const [selectedLead, setSelectedLead] = useState<any | null>(null)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [isAllDay, setIsAllDay] = useState(false)
  const [visibility, setVisibility] = useState<string>('public')
  const [channel, setChannel] = useState<string>('in_person')
  const [activityType, setActivityType] = useState<string>('site_visit')
  const [activityStatus, setActivityStatus] = useState<string>('scheduled')
  const [plannedStartAt, setPlannedStartAt] = useState('')
  const [plannedEndAt, setPlannedEndAt] = useState('')
  const [parentActivitySeq, setParentActivitySeq] = useState<string>('')
  const [parentOptions, setParentOptions] = useState<Array<{ id: number; subject?: string }>>([])

  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ open: boolean; text: string; type?: 'success' | 'error' }>({ open: false, text: '' })

  const loggedEmpId = useMemo(() => localStorage.getItem('tnt.sales.empId'), [])
  const loggedAssigneeId = useMemo(() => localStorage.getItem('tnt.sales.assigneeId'), [])

  // Load selected customer from localStorage
  useMemo(() => {
    try {
      const raw = localStorage.getItem('tnt.sales.selectedCustomer')
      if (raw) setSelectedCustomer(JSON.parse(raw))
    } catch {
      setSelectedCustomer(null)
    }
  }, [])

  // Load parent activities
  useMemo(() => {
    async function load() {
      try {
        const url = new URL('/api/v1/sales-activities', window.location.origin)
        if (selectedCustomer?.customerId) {
          url.searchParams.set('sfAccountId', String(selectedCustomer.customerId))
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
    load()
  }, [selectedCustomer?.customerId, loggedEmpId, loggedAssigneeId])

  async function searchCustomers() {
    if (!customerQuery.trim()) {
      setNotice({ open: true, text: '거래처명을 입력해주세요', type: 'error' })
      return
    }
    try {
      const params = new URLSearchParams()
      params.set('q', customerQuery.trim())
      const r = await fetch(`/api/v1/customers/search?${params.toString()}`)
      const data = r.ok ? await r.json() : []
      const list = Array.isArray(data) ? data : []
      setCustomers(list.slice(0, 50))
    } catch {
      setCustomers([])
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

  function selectCustomer(customer: any) {
    setSelectedCustomer({
      customerSeq: customer.customerSeq,
      customerId: customer.customerId,
      customerName: customer.customerName,
    })
    setCustomers([])
    setCustomerQuery('')
  }

  function selectLead(lead: any) {
    setSelectedLead(lead)
    setLeads([])
    setLeadQuery('')
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

    setSaving(true)
    try {
      const toIso = (v: string) => (v ? new Date(v).toISOString() : undefined)
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
        plannedStartAt: toIso(plannedStartAt),
        plannedEndAt: toIso(plannedEndAt),
        parentActivitySeq: parentActivitySeq ? Number(parentActivitySeq) : undefined,
        sfAccountId: (selectedCustomer?.customerId ? String(selectedCustomer.customerId) : undefined),
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

      // Reset form
      setTimeout(() => {
        setSubject('')
        setDescription('')
        setPlannedStartAt('')
        setPlannedEndAt('')
        setParentActivitySeq('')
        if (onClose) onClose()
      }, 1500)
    } catch (e: any) {
      setNotice({ open: true, text: e?.message || '저장 중 오류가 발생했습니다', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-slate-100 dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-300 dark:border-slate-700">
          <h3 className="text-slate-900 dark:text-white text-lg font-bold">영업활동 등록</h3>
          <button
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            onClick={onClose}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Customer Search */}
          <div>
            <label className="flex flex-col w-full">
              <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">거래처</p>
              <div className="flex gap-2">
                <input
                  className="form-input flex flex-1 resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 focus:border-primary h-12 placeholder:text-slate-500 dark:placeholder:text-slate-400 p-3 text-base"
                  placeholder={selectedCustomer?.customerName || "거래처명 입력"}
                  type="text"
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      searchCustomers()
                    }
                  }}
                  disabled={!!selectedCustomer}
                />
                {selectedCustomer ? (
                  <button
                    className="h-12 px-4 rounded-lg bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white font-medium hover:bg-slate-400 dark:hover:bg-slate-600"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    변경
                  </button>
                ) : (
                  <button
                    className="h-12 px-4 rounded-lg bg-primary text-slate-900 font-medium hover:bg-primary/90"
                    onClick={searchCustomers}
                  >
                    검색
                  </button>
                )}
              </div>
            </label>
            {/* Customer Results */}
            {customers.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-300 dark:border-slate-700">
                {customers.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-3 hover:bg-primary/10 cursor-pointer border-b border-slate-200 dark:border-slate-700 last:border-b-0"
                    onClick={() => selectCustomer(c)}
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
                {activityTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>

            <label className="flex flex-col w-full">
              <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">상태</p>
              <select
                className="form-input flex w-full resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 focus:border-primary h-12 p-3 text-base"
                value={activityStatus}
                onChange={(e) => setActivityStatus(e.target.value)}
              >
                {activityStatusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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
                {channelOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>

            <label className="flex flex-col w-full">
              <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal pb-2">공개범위</p>
              <select
                className="form-input flex w-full resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 focus:border-primary h-12 p-3 text-base"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
              >
                {visibilities.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
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
                value={plannedEndAt}
                onChange={(e) => setPlannedEndAt(e.target.value)}
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
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-300 dark:border-slate-700 flex gap-2">
          <button
            className="flex-1 h-12 px-6 rounded-lg bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white text-base font-bold leading-normal transition-colors hover:bg-slate-400 dark:hover:bg-slate-600"
            onClick={onClose}
          >
            취소
          </button>
          <button
            className="flex-1 h-12 px-6 rounded-lg bg-primary text-slate-900 text-base font-bold leading-normal transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-dark focus:ring-primary"
            onClick={submit}
            disabled={saving}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
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
    </div>
  )
}
