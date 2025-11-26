import React, { useMemo, useState } from 'react'
import { SubjectInput } from '../../components/SubjectInput'
import { Check } from 'lucide-react'


type Resp = { id?: number; error?: string }

export type SalesActivityInitial = Partial<{
  id: number
  subject: string
  description: string
  channel: string
  activityType: string
  activityStatus: string
  plannedStartAt: string
  actualStartAt: string
  sfAccountId: string
  customerName: string
  parentActivitySeq: number | string
  parentSubject: string
}>

const activityTypeOptions = [
  { value: '정기방문', label: '정기방문' },
  { value: '영업기회', label: '영업기회' },
  { value: '채권관리', label: '채권관리' },
] as const
const activityStatusOptions = [
  { value: '계획', label: '계획' },
  { value: '완료', label: '완료' },
  { value: '취소', label: '취소' },
  { value: '연기', label: '연기' },
  { value: '미방문', label: '미방문' },
] as const
const channelOptions = [
  { value: '방문', label: '방문' },
  { value: '전화', label: '전화' },
  { value: '문자/메일/팩스', label: '문자/메일/팩스' },
  { value: '기타', label: '기타' },
] as const
const visibilities = ['공개','팀공유','개인'] as const

export function SalesActivityForm({ bare = false, initial, editId, leadId, onSaved, onNoticeClose, lockSubject, planMode, multiTargets }: { bare?: boolean; initial?: SalesActivityInitial; editId?: number; leadId?: number | string; onSaved?: (id?: number) => void; onNoticeClose?: () => void; lockSubject?: boolean; planMode?: boolean; multiTargets?: Array<{ customerId?: string | null; customerSeq?: number | null; customerName?: string | null }> }) {
  type SelectedCustomer = { customerSeq?: number; empSeq?: number; customerName?: string; customerId?: string }
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null)
  const [sfOwnerId, setSfOwnerId] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [isAllDay, setIsAllDay] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const [visibility, setVisibility] = useState<string>('공개')
  const [channel, setChannel] = useState<string>('방문')
  const [activityType, setActivityType] = useState<string>('정기방문')
  const [activityStatus, setActivityStatus] = useState<string>('계획')
  const [nextStep, setNextStep] = useState('')
  const [nextStepSelect, setNextStepSelect] = useState('')
  const [nextStepUseCustom, setNextStepUseCustom] = useState(false)
  const [nextStepDueAt, setNextStepDueAt] = useState('') // datetime-local
  const showFollowUp = false
  const [plannedStartAt, setPlannedStartAt] = useState('') // datetime-local
  const [actualStartAt, setActualStartAt] = useState('') // 종료일시 (actual_start_at)
  const [originalActualStartAt, setOriginalActualStartAt] = useState('') // Store original value for reset
  const [sfAccountId, setSfAccountId] = useState('')
  // When editing an activity, prefer its customer over cached selection
  const [overrideAccount, setOverrideAccount] = useState<{ id?: string; name?: string } | null>(null)
  const [detailInitial, setDetailInitial] = useState<SalesActivityInitial | null>(initial ?? null)
  const [sfContactId, setSfContactId] = useState('')
  const [sfOpportunityId, setSfOpportunityId] = useState('')
  const [parentActivitySeq, setParentActivitySeq] = useState<string>('')
  const [parentOptions, setParentOptions] = useState<Array<{ id: number; subject?: string; activityType?: string; activityStatus?: string; plannedStartAt?: string; createdAt?: string }>>([])

  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null) // legacy (not rendered)
  const [error, setError] = useState<string | null>(null) // legacy (not rendered)
  const [notice, setNotice] = useState<{ open:boolean; text:string }>(()=>({ open:false, text:'' }))
  const [errorPopup, setErrorPopup] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(new Date())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQ, setPickerQ] = useState('')
  const [pickerLoading, setPickerLoading] = useState(false)
  const [pickerError, setPickerError] = useState<string | null>(null)
  const [pickerItems, setPickerItems] = useState<Array<{ customerId?: string; customerName?: string; companyType?: string; ownerName?: string }>>([])
  const lastInitialSource = React.useRef<string | number | null>(null)
  const currentInitial = detailInitial ?? initial
  const initSource = currentInitial?.id ?? editId ?? (planMode ? 'plan' : 'new')

  const loggedEmpId = useMemo(() => localStorage.getItem('tnt.sales.empId'), [])
  const loggedAssigneeId = useMemo(() => localStorage.getItem('tnt.sales.assigneeId'), [])

  // Load candidate parent activities (same account + my activities, only root)
  const loadParentOptions = React.useCallback(async () => {
    try {
      // Owner scoping: if no logged-in owner info, do not use mineOnly=true to avoid 401
      const ownerParam: Array<[string, string]> = []
      const haveOwner = !!(loggedAssigneeId || loggedEmpId)
      if (loggedAssigneeId) ownerParam.push(['assigneeId', String(loggedAssigneeId)])
      else if (loggedEmpId) ownerParam.push(['empId', String(loggedEmpId)])

      async function fetchByAccount(sfId?: string) {
        const url = new URL('/api/v1/sales-activities', window.location.origin)
        if (sfId) url.searchParams.set('sfAccountId', sfId)
        ownerParam.forEach(([k, v]) => url.searchParams.set(k, v))
        url.searchParams.set('mineOnly', haveOwner ? 'true' : 'false')
        url.searchParams.set('onlyRoot', 'true')
        url.searchParams.set('limit', '200')
        const res = await fetch(url.toString())
        if (!res.ok) return [] as any[]
        const data = await res.json()
        return Array.isArray(data) ? data : []
      }

      // If lead context is provided, fetch by lead and return
      if (leadId) {
        const url = new URL('/api/v1/sales-activities', window.location.origin)
        url.searchParams.set('sfLeadId', String(leadId))
        ownerParam.forEach(([k, v]) => url.searchParams.set(k, v))
        url.searchParams.set('mineOnly', haveOwner ? 'true' : 'false')
        url.searchParams.set('onlyRoot', 'true')
        url.searchParams.set('limit', '200')
        const res = await fetch(url.toString())
        const data = res.ok ? await res.json() : []
        const list = Array.isArray(data) ? data : []
        setParentOptions(list.slice(0, 200))
        return
      }

      // Build candidate account ids: override id, selected customer id or seq, and typed sfAccountId
      const accountIds: string[] = []
      if (overrideAccount?.id) accountIds.push(String(overrideAccount.id))
      if (selectedCustomer?.customerId) accountIds.push(String(selectedCustomer.customerId))
      if (selectedCustomer?.customerSeq != null) accountIds.push(String(selectedCustomer.customerSeq))
      if (sfAccountId) accountIds.push(String(sfAccountId))
      const uniqIds = Array.from(new Set(accountIds.filter(Boolean)))

      let rows: Array<{ id: number; subject?: string; activityType?: string; activityStatus?: string; plannedStartAt?: string; createdAt?: string }> = []
      if (uniqIds.length > 0) {
        const results = await Promise.all(uniqIds.map(id => fetchByAccount(id)))
        rows = results.flat()
      } else {
        // No account id context: fall back to owner-only root list or empty
        rows = await fetchByAccount(undefined)
      }
      // Dedupe by activity id
      const map = new Map<number, any>()
      rows.forEach(r => { if (r && r.id != null) map.set(Number(r.id), r) })
      let list = Array.from(map.values())

      // Ensure current parent (if any) is included even if it is not root or filtered out
      const init = initial || {}
      const pid = init.parentActivitySeq != null ? Number(init.parentActivitySeq) : undefined
      if (pid && !list.some(o => Number(o.id) === pid)) {
        list = [{ id: pid, subject: (init as any).parentSubject || '상위활동' }, ...list]
      }
      // Sort by createdAt DESC (최신 생성 순)
      list.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return tb - ta
      })
      setParentOptions(list.slice(0, 200))
    } catch {
      setParentOptions([])
    }
  }, [overrideAccount?.id, selectedCustomer?.customerSeq, selectedCustomer?.customerId, sfAccountId, loggedEmpId, loggedAssigneeId, initial?.parentActivitySeq, (initial as any)?.parentSubject, leadId])

  React.useEffect(() => {
    loadParentOptions()
  }, [loadParentOptions])

  React.useEffect(() => {
    if (!editId) {
      setDetailInitial(initial ?? null)
      return
    }
    let ignore = false
    ;(async () => {
      try {
        const res = await fetch(`/api/v1/sales-activities/${editId}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (ignore) return
        const detail: SalesActivityInitial = {
          id: data.id,
          subject: data.subject,
          description: data.description,
          channel: data.channel,
          activityType: data.activityType,
          activityStatus: data.activityStatus,
          plannedStartAt: data.plannedStartAt || data.planned_start_at,
          actualStartAt: data.actualStartAt || data.actual_start_at,
          sfAccountId: data.sfAccountId ?? data.sf_account_id,
          customerName: data.customerName ?? data.customer_name,
          parentActivitySeq: data.parentSeq ?? data.parent_activity_seq,
          parentSubject: data.parentSubject ?? data.parent_subject,
        }
        setDetailInitial(detail)
      } catch (err) {
        console.error('Failed to load activity detail for edit:', err)
      }
    })()
    return () => { ignore = true }
  }, [editId, initial])

  // Apply/overwrite all fields whenever a new activity is selected
  React.useEffect(() => {
    // Allow update when currentInitial changes, even if initSource is the same
    const shouldUpdate = lastInitialSource.current !== initSource || (editId && detailInitial)
    if (!shouldUpdate && lastInitialSource.current === initSource) return
    lastInitialSource.current = initSource
    const toLocalInput = (s?: string) => {
      if (!s) return ''
      const d = new Date(s)
      if (isNaN(d.getTime())) return ''
      const off = d.getTimezoneOffset()
      const local = new Date(d.getTime() - off * 60000)
      return local.toISOString().slice(0, 16)
    }
    const init = currentInitial || {}
    setSubject(init.subject ?? '')
    setDescription(init.description ?? '')
    const chMap: Record<string, string> = { in_person: '방문', phone: '전화', email: '문자/메일/팩스', other: '기타' }
    const typeMapEnToKo: Record<string, string> = {
      site_visit: '정기방문', opportunity: '영업기회', AR_mgmt: '채권관리',
      meeting: '미팅', call: '전화', email: '이메일', demo: '데모', task: '업무', other: '기타'
    }
    const statusMapEnToKo: Record<string, string> = {
      scheduled: '계획', completed: '완료', canceled: '취소', postponed: '연기', no_show: '미방문'
    }
    const visMapEnToKo: Record<string, string> = { public: '공개', team: '팀공유', private: '개인' }
    setChannel((init.channel && (chMap[init.channel] || init.channel)) || '방문')
    setActivityType((init.activityType && (typeMapEnToKo[init.activityType] || init.activityType)) || '정기방문')
    // 계획수립 모드에서는 상태를 강제로 '계획'으로 고정
    setActivityStatus(planMode ? '계획' : ((init.activityStatus && (statusMapEnToKo[init.activityStatus] || init.activityStatus)) || '계획'))
    setVisibility((init as any).visibility ? (visMapEnToKo[(init as any).visibility] || String((init as any).visibility)) : '공개')
    setPlannedStartAt(toLocalInput(init.plannedStartAt))
    const endAtValue = toLocalInput(init.actualStartAt)
    setActualStartAt(endAtValue)
    setOriginalActualStartAt(endAtValue) // Store original value for reset logic
    setSfAccountId(init.sfAccountId != null ? String(init.sfAccountId) : '')
    setParentActivitySeq(init.parentActivitySeq != null ? String(init.parentActivitySeq) : '')
    if ((init.sfAccountId && String(init.sfAccountId)) || (init as any).customerName) {
      setOverrideAccount({ id: (init.sfAccountId ? String(init.sfAccountId) : undefined), name: ((init as any).customerName ? String((init as any).customerName) : undefined) })
      setSelectedCustomer({ customerId: init.sfAccountId ? String(init.sfAccountId) : undefined, customerName: (init as any).customerName })
    } else {
      setOverrideAccount(null)
    }
  }, [currentInitial, initSource, planMode, editId, detailInitial])

  // Default plannedStartAt to current local datetime on new-create in standard mode (고객관리 > 영업활동 등록)
  React.useEffect(() => {
    if (editId || planMode) return
    setPlannedStartAt(prev => {
      if (prev && String(prev).trim() !== '') return prev
      const now = new Date()
      const off = now.getTimezoneOffset()
      const local = new Date(now.getTime() - off * 60000)
      return local.toISOString().slice(0, 16)
    })
  }, [editId, planMode])

  // Handle status change: auto-set end datetime when status is "완료", reset when other status
  const [prevActivityStatus, setPrevActivityStatus] = React.useState<string>('')
  const [isInitialLoad, setIsInitialLoad] = React.useState(true)

  React.useEffect(() => {
    // Mark initial load complete after first render
    if (isInitialLoad) {
      setPrevActivityStatus(activityStatus)
      setIsInitialLoad(false)
      return
    }

    // Skip if status hasn't changed or in plan mode
    if (prevActivityStatus === activityStatus || planMode) return

    if (activityStatus === '완료') {
      // Only suggest current time if 기존 값이 없을 때만 자동입력
      if (!originalActualStartAt || String(originalActualStartAt).trim() === '') {
        const now = new Date()
        const off = now.getTimezoneOffset()
        const localNow = new Date(now.getTime() - off * 60000)
        const nowStr = localNow.toISOString().slice(0, 16)
        setActualStartAt(nowStr)
      }
      // 기존 값이 있으면 그대로 유지
    } else {
      // 다른 상태로 바꿔도 사용자가 입력한 종료일시는 유지
    }

    setPrevActivityStatus(activityStatus)
  }, [activityStatus, originalActualStartAt, planMode, prevActivityStatus, isInitialLoad])

  // Handle actualStartAt change: auto-fill plannedStartAt if empty
  React.useEffect(() => {
    if (!actualStartAt || plannedStartAt) return
    // If actualStartAt is filled but plannedStartAt is empty, set plannedStartAt to actualStartAt
    setPlannedStartAt(actualStartAt)
  }, [actualStartAt, plannedStartAt])

  // Lock parent selection if editing and activity has children (cannot re-parent a node that has descendants)
  const [hasChildren, setHasChildren] = useState(false)
  React.useEffect(() => {
    let ignore = false
    async function checkChildren() {
      try {
        if (!editId) { if (!ignore) setHasChildren(false); return }
        const url = new URL('/api/v1/sales-activities', window.location.origin)
        url.searchParams.set('parentSeq', String(editId))
        // Avoid auth requirement for this check; we only need to know existence
        url.searchParams.set('mineOnly', 'false')
        // Keep result small
        url.searchParams.set('limit', '1')
        const res = await fetch(url.toString())
        if (!res.ok) { if (!ignore) setHasChildren(false); return }
        const data = await res.json()
        const arr = Array.isArray(data) ? data : []
        if (!ignore) setHasChildren(arr.length > 0)
      } catch {
        if (!ignore) setHasChildren(false)
      }
    }
    checkChildren()
    return () => { ignore = true }
  }, [editId])
  const parentLocked = !!(editId && hasChildren)

  // Customer picker
  const loadPicker = React.useCallback(async () => {
    setPickerError(null)
    setPickerLoading(true)
    try {
      const url = new URL('/api/v1/customers', window.location.origin)
      if (pickerQ.trim()) url.searchParams.set('name', pickerQ.trim())
      url.searchParams.set('mineOnly', 'false')
      url.searchParams.set('limit', '50')
      const res = await fetch(url.toString())
      if (!res.ok) {
        let msg = `HTTP ${res.status}`
        try { const d = await res.json(); if (d?.error) msg = d.error } catch {}
        throw new Error(msg)
      }
      const data = await res.json()
      const arr = Array.isArray(data) ? data : []
      setPickerItems(arr.map((x: any) => ({
        customerId: x?.customerId ?? x?.customer_id,
        customerName: x?.customerName ?? x?.customer_name,
        companyType: x?.companyType ?? x?.company_type,
        ownerName: x?.ownerName ?? x?.owner_name,
      })))
    } catch (e: any) {
      setPickerError(e?.message || '조회 중 오류가 발생했습니다')
      setPickerItems([])
    } finally {
      setPickerLoading(false)
    }
  }, [pickerQ])

  React.useEffect(() => {
    if (!pickerOpen) return
    loadPicker()
  }, [pickerOpen, loadPicker])

  React.useEffect(() => {
    if (!pickerOpen) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setPickerOpen(false)
      }
    }
    window.addEventListener('keydown', onEsc, true)
    return () => window.removeEventListener('keydown', onEsc, true)
  }, [pickerOpen])

  async function submit() {
    setError(null)
    setErrorPopup(null)
    setMsg(null)
    if (!loggedEmpId) {
      setError('로그인이 필요합니다')
      return
    }

    // Validation: Require actualStartAt when status is "완료/취소/미방문"
    let finalActualStartAt = actualStartAt
    if (['완료', '취소', '미방문'].includes(activityStatus) && (!actualStartAt || actualStartAt.trim() === '')) {
      setNotice({ open: true, text: '완료/취소/미방문 상태로 변경하려면 종료일시를 입력해주세요.' })
      setBusy(false)
      return
    }

    // Validation: If actualStartAt has value but status is NOT one of "완료/취소/미방문", show error
    if (finalActualStartAt && !['완료', '취소', '미방문'].includes(activityStatus)) {
      setNotice({ open: true, text: '종료일시가 입력된 경우 상태는 완료, 취소, 미방문 중 하나여야 합니다.' })
      setBusy(false)
      return
    }

    const ownerId = (sfOwnerId && sfOwnerId.trim()) || loggedAssigneeId || loggedEmpId || ''
    if (!ownerId || !activityType || !activityStatus) {
      setError('필수 항목: 활동유형, 상태 (로그인 필요)')
      return
    }
    setBusy(true)
    try {
      const toIso = (v: string) => (v ? new Date(v).toISOString() : undefined)
      let ok = false
      let id: number | undefined
      if (editId) {
        // Update existing activity
        const plannedStartISO = toIso(plannedStartAt)
        const actualInputValue = finalActualStartAt ? finalActualStartAt.trim() : ''
        const actualStartISO = toIso(actualInputValue)
        const actualPayload = actualInputValue ? actualStartISO : ''
        const body = {
          subject: subject || undefined,
          description: description || undefined,
          activityStatus: activityStatus || undefined,
          activityType: activityType || undefined,
          channel: channel || undefined,
          isAllDay,
          isPrivate,
          visibility,
          // If already has a parent, lock; otherwise allow setting
          parentActivitySeq: parentLocked ? undefined : (parentActivitySeq ? Number(parentActivitySeq) : undefined),
          plannedStartAt: plannedStartISO,
          actualStartAt: actualPayload,
        }
        const plannedMs = plannedStartAt ? new Date(plannedStartAt).getTime() : (plannedStartISO ? new Date(plannedStartISO).getTime() : NaN)
        const actualMs = actualInputValue ? new Date(actualInputValue).getTime() : (actualStartISO ? new Date(actualStartISO).getTime() : NaN)
        if (!isNaN(plannedMs) && !isNaN(actualMs) && actualMs < plannedMs) {
          const errMsg = '종료일시는 계획 일시보다 커야 합니다.'
          setBusy(false)
          setError(errMsg)
          setErrorPopup(errMsg)
          return
        }
        const res = await fetch(`/api/v1/sales-activities/${editId}` , {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data: Resp = await res.json().catch(() => ({}))
        if (!res.ok || data.error) {
          throw new Error(data.error || `HTTP ${res.status}`)
        }
        ok = true
        id = editId

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
            const updated = Array.isArray(activities) ? activities.find((a: any) => a.id === editId) : null
            if (updated) {
              // Update form with fresh data from server
              const toLocalInput = (s?: string) => {
                if (!s) return ''
                const d = new Date(s)
                if (isNaN(d.getTime())) return ''
                const off = d.getTimezoneOffset()
                const local = new Date(d.getTime() - off * 60000)
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

        setNotice({ open:true, text:'수정되었습니다.' })
        try {
          window.dispatchEvent(new CustomEvent('tnt.sales.activity.updated', { detail: { id } }))
        } catch {}
        try { if (onSaved) onSaved(id) } catch {}
      } else {
        // Create new activity
        // Multi-target creation when provided (plan mode)
        const nowIso = new Date().toISOString()
        const targets = (planMode && Array.isArray(multiTargets) && multiTargets.length > 0) ? multiTargets : null
        if (targets) {
          for (const t of targets) {
            const displayNameEach = (t?.customerName || '').trim()
            const effectiveSubjectEach = (displayNameEach ? `${displayNameEach} (활동계획)` : (subject || undefined))
            const accountEach = (t?.customerId ? String(t.customerId) : (t?.customerSeq != null ? String(t.customerSeq) : undefined))
            if (!accountEach) continue
            const bodyEach = {
              sfOwnerId: ownerId,
              subject: effectiveSubjectEach,
              description: description || undefined,
              isAllDay,
              isPrivate,
              visibility,
              channel,
              activityType,
              activityStatus,
              nextStep: nextStep || undefined,
              nextStepDueAt: toIso(nextStepDueAt),
              plannedStartAt: toIso(plannedStartAt),
              actualStartAt: toIso(finalActualStartAt) || nowIso,
              parentActivitySeq: parentActivitySeq ? Number(parentActivitySeq) : undefined,
              sfLeadId: leadId ? String(leadId) : undefined,
              sfAccountId: leadId ? undefined : accountEach,
              sfContactId: sfContactId || undefined,
              sfOpportunityId: sfOpportunityId || undefined,
              createdBy: loggedEmpId,
              updatedBy: loggedEmpId,
              createdAt: nowIso,
              updatedAt: nowIso,
            }
            const r = await fetch('/api/v1/sales-activities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyEach) })
            const j: Resp = await r.json().catch(() => ({}))
            if (!r.ok || j.error) { throw new Error(j.error || `HTTP ${r.status}`) }
            id = j.id
            try { window.dispatchEvent(new CustomEvent('tnt.sales.activity.updated', { detail: { id } })) } catch {}
          }
          ok = true
          setNotice({ open:true, text:'저장되었습니다.' })
          try { if (onSaved) onSaved(id) } catch {}
        } else {
          const displayName = (overrideAccount?.name || selectedCustomer?.customerName || '').trim()
          const effectiveSubject = planMode
            ? (displayName ? `${displayName} (활동계획)` : (subject || undefined))
            : (subject || undefined)
          const nowIso = new Date().toISOString()
          const effectiveAccountId =
            overrideAccount?.id
            ?? (selectedCustomer?.customerId ? String(selectedCustomer.customerId) : undefined)
            ?? (sfAccountId || undefined)
          const body = {
            sfOwnerId: ownerId,
            subject: effectiveSubject,
            description: description || undefined,
            isAllDay,
            isPrivate,
            visibility,
            channel,
            activityType,
            activityStatus,
            nextStep: nextStep || undefined,
            nextStepDueAt: toIso(nextStepDueAt),
            plannedStartAt: toIso(plannedStartAt),
            actualStartAt: toIso(finalActualStartAt) || nowIso,
            parentActivitySeq: parentActivitySeq ? Number(parentActivitySeq) : undefined,
            // Lead use-case: link by sfLeadId; otherwise link by customer_id (거래처번호)
            sfLeadId: leadId ? String(leadId) : undefined,
            sfAccountId: leadId ? undefined : (effectiveAccountId || undefined),
            sfContactId: sfContactId || undefined,
            sfOpportunityId: sfOpportunityId || undefined,
            createdBy: loggedEmpId,
            updatedBy: loggedEmpId,
            createdAt: nowIso,
            updatedAt: nowIso,
          }
          const res = await fetch('/api/v1/sales-activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
          const data: Resp = await res.json().catch(() => ({}))
          if (!res.ok || data.error) {
            throw new Error(data.error || `HTTP ${res.status}`)
          }
          ok = true
          id = data.id
          setNotice({ open:true, text:'저장되었습니다.' })
          try {
            window.dispatchEvent(new CustomEvent('tnt.sales.activity.updated', { detail: { id } }))
          } catch {}
          try { if (onSaved) onSaved(id) } catch {}
        }
      }
      setSavedAt(new Date())
      if (!editId) {
        // reset minimal fields on create only
        setSubject('')
        setDescription('');
        setNextStep(''); setNextStepSelect(''); setNextStepUseCustom(false)
      }
    } catch (e: any) {
      setNotice({ open:true, text: (e.message || '저장 중 오류가 발생했습니다') })
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!editId) return
    setDeleteConfirm(false)
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/sales-activities/${editId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      setNotice({ open: true, text: '삭제되었습니다.' })
      try {
        window.dispatchEvent(new CustomEvent('tnt.sales.activity.updated', { detail: { id: editId } }))
      } catch {}
      try { if (onSaved) onSaved(undefined) } catch {}
    } catch (e: any) {
      const errMsg = e.message || '삭제 중 오류가 발생했습니다'
      setError(errMsg)
      setErrorPopup(errMsg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      {!bare && (
        <div className="page-title">
          <h2>영업활동 등록</h2>
          <div className="meta">
            <span className="badge">Draft</span>
            <span className="badge">Last Saved: <time>{savedAt ? savedAt.toLocaleString() : '—'}</time></span>
          </div>
        </div>
      )}

      {!loggedEmpId && <div className="error" style={{ marginBottom: 8 }}>로그인이 필요합니다</div>}

      <section className={bare ? undefined : (planMode ? 'card plan-compact-card' : 'card')}>
        <div
          className={planMode ? 'plan-compact' : 'form-grid'}
          style={planMode ? { display: 'flex', flexDirection: 'column', gap: 6 } : { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}
        >
          {/** Row layout helper for label+control */}
          {/** Each field below uses a 2-column grid: 120px label + flexible control */}
          <div className="field" style={{ display:'grid', gridTemplateColumns: planMode ? '90px 260px' : '120px 1fr', gap: planMode ? 6 : 8, alignItems:'center', gridColumn: '1 / -1' }}>
            <label>제목</label>
            <SubjectInput value={subject} onChange={lockSubject ? undefined : setSubject} placeholder="예: 고객사 주간 미팅" readOnly={!!lockSubject} />
          </div>
          {!planMode && (
            <div className="field" style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:8, alignItems:'start', gridColumn: '1 / -1' }}>
              <label style={{ paddingTop: 8 }}>활동 설명</label>
              <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="활동 설명 입력" rows={3} />
            </div>
          )}
          <div className="field" style={{ display:'grid', gridTemplateColumns: planMode ? '90px 260px' : '120px 1fr', gap: planMode ? 6 : 8, alignItems:'center' }}>
            <label>활동유형 *</label>
            <select
              value={activityType}
              onChange={e=>{
                const v = e.target.value
                setActivityType(v)
                const map: Record<string, string> = {
                  '정기방문': '방문',
                  '영업기회': '방문',
                  '채권관리': '전화',
                }
                if (map[v]) setChannel(map[v])
              }}
            >
              {activityTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div className="field" style={{ display:'grid', gridTemplateColumns: planMode ? '90px 260px' : '120px 1fr', gap: planMode ? 6 : 8, alignItems:'center' }}>
            <label>활동방법</label>
            <select value={channel} onChange={e=>setChannel(e.target.value)}>
              {channelOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div className="field" style={{ display:'grid', gridTemplateColumns: planMode ? '90px 260px' : '120px 1fr', gap: planMode ? 6 : 8, alignItems:'center' }}>
            <label>상태 *</label>
            <select value={activityStatus} onChange={e=>setActivityStatus(e.target.value)} disabled={!!planMode}>
              {activityStatusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          {!planMode && (
            <div className="field" style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:8, alignItems:'center' }}>
              <label>상위 활동</label>
              <select
                value={parentActivitySeq}
                onChange={e=>setParentActivitySeq(e.target.value)}
                onFocus={() => { try { loadParentOptions() } catch {} }}
                onClick={() => { try { loadParentOptions() } catch {} }}
                disabled={parentLocked}
                title={parentLocked ? '하위활동이 존재하여 상위활동을 변경할 수 없습니다' : undefined}
              >
                <option value="">선택</option>
                {parentOptions.map(opt => {
                  const typeMap: Record<string,string> = {
                    site_visit: '정기방문', opportunity: '영업기회', AR_mgmt: '채권관리',
                    meeting: '미팅', call: '전화', email: '이메일', demo: '데모', task: '업무', other: '기타'
                  }
                  const statusMap: Record<string,string> = {
                    scheduled: '계획', completed: '완료', canceled: '취소', postponed: '연기', no_show: '미방문'
                  }
                  const t = opt.activityType ? (typeMap[opt.activityType] || opt.activityType) : ''
                  const s = opt.activityStatus ? (statusMap[opt.activityStatus] || opt.activityStatus) : ''
                  const label = `${opt.subject || ''}${t||s?` · ${t}${t&&s?' / ':''}${s}`:''}`
                  return (
                    <option key={opt.id} value={opt.id}>{label}</option>
                  )
                })}
              </select>
            </div>
          )}
          {/* 가시성은 맨 아래로 이동, 여기서는 제거 */}
          <div className="field" style={{ display:'grid', gridTemplateColumns: planMode ? '90px 260px' : '120px 1fr', gap: planMode ? 6 : 8, alignItems:'center' }}>
            <label>계획 일시</label>
            <div className="datetime-wrapper">
              <input
                type="datetime-local"
                className={plannedStartAt ? '' : 'empty'}
                value={plannedStartAt}
                onChange={e=>setPlannedStartAt(e.target.value)}
                autoComplete="off"
                disabled={!!planMode}
                title={planMode ? '달력에서 선택된 일시로 설정됩니다' : undefined}
              />
              {!plannedStartAt && <span className="datetime-placeholder">YYYY-MM-DD HH:MM</span>}
            </div>
          </div>
          {!planMode && (
            <div className="field" style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:8, alignItems:'center' }}>
              <label>종료 일시</label>
              <div className="datetime-wrapper">
                <input
                  type="datetime-local"
                  className={actualStartAt ? '' : 'empty'}
                  value={actualStartAt}
                  onChange={e=>setActualStartAt(e.target.value)}
                  autoComplete="off"
                />
                {!actualStartAt && <span className="datetime-placeholder">YYYY-MM-DD HH:MM</span>}
                </div>
              </div>
          )}
          {showFollowUp && (
            <>
              <div className="field" style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:8, alignItems:'center' }}>
                <label>후속 조치</label>
                <select
                  value={nextStepUseCustom ? '__custom__' : (nextStepSelect || nextStep || '')}
                  onChange={(e)=>{
                    const v = e.target.value
                    if (v === '__custom__') { setNextStepUseCustom(true); setNextStepSelect(''); setNextStep('') }
                    else { setNextStepUseCustom(false); setNextStepSelect(v); setNextStep(v) }
                  }}
                >
                  <option value="">— 선택 —</option>
                  <option value="견적 발송">견적 발송</option>
                  <option value="자료 전달">자료 전달</option>
                  <option value="후속 미팅 예약">후속 미팅 예약</option>
                  <option value="__custom__">직접입력…</option>
                </select>
                {nextStepUseCustom && (
                  <input value={nextStep} onChange={e=>setNextStep(e.target.value)} placeholder="직접 입력" />
                )}
              </div>
              <div className="field" style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:8, alignItems:'center' }}>
                <label>후속 기한</label>
                <div className="datetime-wrapper">
                  <input
                    type="datetime-local"
                    className={nextStepDueAt ? '' : 'empty'}
                    value={nextStepDueAt}
                    onChange={e=>setNextStepDueAt(e.target.value)}
                    autoComplete="off"
                  />
                  {!nextStepDueAt && <span className="datetime-placeholder">YYYY-MM-DD HH:MM</span>}
                </div>
              </div>
            </>
          )}
          {!planMode && !leadId && (
            <>
              <div className="field" style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:8, alignItems:'center', gridColumn: '1 / -1' }}>
                <label>거래처</label>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <SubjectInput
                    value={
                      overrideAccount
                        ? (overrideAccount.name || overrideAccount.id || '')
                      : (selectedCustomer ? (selectedCustomer.customerName || String(selectedCustomer.customerId || '')) : (sfAccountId || ''))
                      }
                    onChange={overrideAccount ? undefined : (selectedCustomer ? undefined : setSfAccountId)}
                    placeholder="거래처명 또는 ID"
                    readOnly={!!overrideAccount || !!selectedCustomer || !!editId}
                    style={{ flex:'1 1 auto' }}
                  />
                  {!editId && (
                    <button
                      className="btn secondary"
                      style={{ height:30, padding:'0 10px' }}
                      onClick={() => {
                        setPickerOpen(true)
                      }}
                      title="거래처 검색"
                    >
                      🔍
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
          {!planMode && (
            <>
              <div className="field" style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:8, alignItems:'center' }}>
                <label>종일 / 비공개</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <label className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <input className="checkbox-accent" type="checkbox" checked={isAllDay} onChange={e=>setIsAllDay(e.target.checked)} />
                    <span>종일</span>
                  </label>
                  <label className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <input className="checkbox-accent" type="checkbox" checked={isPrivate} onChange={e=>setIsPrivate(e.target.checked)} />
                    <span>비공개</span>
                  </label>
                </div>
              </div>
              <div className="field" style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:8, alignItems:'center' }}>
                <label>가시성</label>
                <select value={visibility} onChange={e=>setVisibility(e.target.value)}>
                  {visibilities.map(v=> <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </>
          )}
        </div>
        {error && (
          <div className="error" style={{ marginBottom: 8 }}>{error}</div>
        )}
        <div className="controls" style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={submit} disabled={busy || !loggedEmpId}>
            {busy ? (editId ? '수정 중…' : '저장 중…') : (editId ? '수정' : '저장')}
          </button>
          {editId && (
            <button
              className="btn"
              onClick={() => setDeleteConfirm(true)}
              disabled={busy}
              style={{ background: '#dc2626', borderColor: '#dc2626' }}
            >
              삭제
            </button>
          )}
        </div>
      </section>
      {notice.open ? (
        <div role="dialog" aria-modal="true" className="card" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 70 }}>
          <div className="card" style={{ background:'var(--panel)', padding: 12, border: '1px solid var(--border)', borderRadius: 10, minWidth: 260, maxWidth: '86vw' }}>
            <div style={{ marginBottom: 8, fontWeight: 700, textAlign:'center' }}>{notice.text}</div>
            <div style={{ display:'flex', justifyContent:'center' }}>
              <button className="btn btn-card btn-3d" onClick={()=> { setNotice({ open:false, text:'' }) }}>확인</button>
            </div>
          </div>
        </div>
      ) : null}

      {errorPopup ? (
        <div role="dialog" aria-modal="true" className="card" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.3)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 70 }}>
          <div className="card" style={{ background:'var(--panel)', padding: 12, border: '1px solid var(--border)', borderRadius: 10, minWidth: 260, maxWidth: '86vw' }}>
            <div style={{ marginBottom: 8, fontWeight: 700, textAlign:'center', color: '#b91c1c' }}>{errorPopup}</div>
            <div style={{ display:'flex', justifyContent:'center' }}>
              <button className="btn btn-card btn-3d" onClick={() => { setErrorPopup(null); setError(null) }}>확인</button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteConfirm ? (
        <div role="dialog" aria-modal="true" className="card" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 70 }}>
          <div className="card" style={{ background:'var(--panel)', padding: 12, border: '1px solid var(--border)', borderRadius: 10, minWidth: 260, maxWidth: '86vw' }}>
            <div style={{ marginBottom: 8, fontWeight: 700, textAlign:'center' }}>이 활동을 삭제하시겠습니까?</div>
            <div style={{ marginBottom: 12, fontSize: 13, textAlign:'center', color: '#6b7280' }}>삭제된 데이터는 복구할 수 없습니다.</div>
            <div style={{ display:'flex', justifyContent:'center', gap: 8 }}>
              <button className="btn btn-card btn-3d" onClick={() => setDeleteConfirm(false)} style={{ background: '#6b7280', borderColor: '#6b7280' }}>취소</button>
              <button className="btn btn-card btn-3d" onClick={handleDelete} style={{ background: '#dc2626', borderColor: '#dc2626' }}>삭제</button>
            </div>
          </div>
        </div>
      ) : null}

      {pickerOpen && !editId ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 80 }}
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="card"
            style={{ background:'var(--panel)', padding: 16, border: '1px solid var(--border)', borderRadius: 12, boxShadow:'0 8px 32px rgba(0,0,0,.2)', width:'min(720px, 92vw)', maxHeight:'80vh', overflow:'auto' }}
            onClick={(e)=> e.stopPropagation()}
          >
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 12 }}>
              <h3 style={{ margin:0, fontSize:16, fontWeight:700 }}>거래처 선택</h3>
              <button
                onClick={() => setPickerOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  fontSize: 20,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--panel-2)'
                  e.currentTarget.style.color = 'var(--text)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--muted)'
                }}
                title="닫기 (ESC)"
                aria-label="닫기"
              >
                ×
              </button>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
              <input
                className="search-input"
                value={pickerQ}
                onChange={(e)=> setPickerQ(e.target.value)}
                onKeyDown={(e)=> { if (e.key === 'Enter') loadPicker() }}
                placeholder="거래처명"
                style={{ flex:'1 1 auto', background:'#fff', border:'1px solid var(--border)' }}
              />
              <button className="btn" style={{ height:30, padding:'0 12px' }} onClick={loadPicker} disabled={pickerLoading}>
                {pickerLoading ? '조회중...' : '조회'}
              </button>
            </div>
            {pickerError && <div className="error" style={{ marginBottom:8 }}>{pickerError}</div>}
            <div className="table-container" style={{ maxHeight: '50vh' }}>
              {pickerItems.length === 0 && !pickerLoading ? (
                <div className="empty-state">검색 결과가 없습니다.</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 60, textAlign: 'center' }}>구분</th>
                      <th>거래처명</th>
                      <th style={{ width: 140 }}>대표자명</th>
                      <th style={{ width: 60, textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pickerItems.map((c, idx) => {
                      const companyType = (c.companyType || '').toString().trim().toUpperCase()
                      const isTNT = companyType.includes('TNT')
                      const isDYS = companyType.includes('DYS')
                      const iconLabel = isTNT ? 'T' : isDYS ? 'D' : (c.companyType || '거')[0]
                      const iconBg = isTNT ? '#1d4ed8' : isDYS ? '#059669' : '#6b7280'

                      return (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              title={c.companyType || ''}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: iconBg,
                                color: '#fff',
                                fontSize: 12,
                                fontWeight: 700
                              }}
                            >
                              {iconLabel}
                            </span>
                          </td>
                          <td>{c.customerName || ''}</td>
                          <td>{c.ownerName || ''}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              style={{
                                width: 32,
                                height: 32,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'transparent',
                                border: '1px solid var(--border)',
                                borderRadius: 6,
                                cursor: 'pointer',
                                color: 'var(--text)',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--accent)'
                                e.currentTarget.style.borderColor = 'var(--accent)'
                                e.currentTarget.style.color = '#fff'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent'
                                e.currentTarget.style.borderColor = 'var(--border)'
                                e.currentTarget.style.color = 'var(--text)'
                              }}
                              onClick={() => {
                                const idVal = c.customerId ? String(c.customerId) : ''
                                setOverrideAccount({ id: idVal, name: c.customerName || '' })
                                setSelectedCustomer({ customerId: idVal, customerName: c.customerName })
                                setSfAccountId(idVal)
                                setPickerOpen(false)
                              }}
                              title="선택"
                              aria-label="선택"
                            >
                              <Check size={18} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : null}


    </section>
  )
}
