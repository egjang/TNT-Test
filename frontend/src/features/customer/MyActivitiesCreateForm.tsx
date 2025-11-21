import React, { useMemo, useState } from 'react'
import { SubjectInput } from '../../components/SubjectInput'


type Resp = { id?: number; error?: string }

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
const visibilities = ['public','team','private'] as const

export function MyActivitiesCreateForm({ bare = true }: { bare?: boolean }) {
  type SelectedCustomer = { customerSeq?: number; empSeq?: number; customerName?: string; customerId?: string }
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null)
  const [sfOwnerId, setSfOwnerId] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [isAllDay, setIsAllDay] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const [visibility, setVisibility] = useState<string>('public')
  const [channel, setChannel] = useState<string>('in_person')
  const [activityType, setActivityType] = useState<string>('site_visit')
  const [activityStatus, setActivityStatus] = useState<string>('scheduled')
  const [nextStep, setNextStep] = useState('')
  const [nextStepSelect, setNextStepSelect] = useState('')
  const [nextStepUseCustom, setNextStepUseCustom] = useState(false)
  const [nextStepDueAt, setNextStepDueAt] = useState('') // datetime-local
  const showFollowUp = false
  const [plannedStartAt, setPlannedStartAt] = useState('') // datetime-local
  const [plannedEndAt, setPlannedEndAt] = useState('')
  const [sfAccountId, setSfAccountId] = useState('')
  const [sfContactId, setSfContactId] = useState('')
  const [sfOpportunityId, setSfOpportunityId] = useState('')
  const [parentActivitySeq, setParentActivitySeq] = useState<string>('')
  const [parentOptions, setParentOptions] = useState<Array<{ id: number; subject?: string; activityType?: string; activityStatus?: string; plannedStartAt?: string }>>([])

  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null) // legacy
  const [error, setError] = useState<string | null>(null) // legacy
  const [notice, setNotice] = useState<{ open:boolean; text:string }>(()=>({ open:false, text:'' }))
  const [savedAt, setSavedAt] = useState<Date | null>(new Date())

  const loggedEmpId = useMemo(() => localStorage.getItem('tnt.sales.empId'), [])
  const loggedAssigneeId = useMemo(() => localStorage.getItem('tnt.sales.assigneeId'), [])

  useMemo(() => {
    try {
      const raw = localStorage.getItem('tnt.sales.selectedCustomer')
      if (raw) setSelectedCustomer(JSON.parse(raw))
    } catch {
      setSelectedCustomer(null)
    }
  }, [])

  // Load candidate parent activities (same account, only root = parent null)
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

  async function submit() {
    setError(null)
    setMsg(null)
    if (!loggedEmpId) {
      setError('로그인이 필요합니다')
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
      const body = {
        sfOwnerId: ownerId,
        subject: subject || undefined,
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
        plannedEndAt: toIso(plannedEndAt),
        parentActivitySeq: parentActivitySeq ? Number(parentActivitySeq) : undefined,
        // Use customer_id (거래처번호) for sf_account_id linkage
        sfAccountId: (selectedCustomer?.customerId ? String(selectedCustomer.customerId) : sfAccountId) || undefined,
        sfContactId: sfContactId || undefined,
        sfOpportunityId: sfOpportunityId || undefined,
        createdBy: loggedEmpId,
        updatedBy: loggedEmpId,
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
      setNotice({ open:true, text:'저장되었습니다.' })
      setSavedAt(new Date())
      // reset minimal fields
      setSubject('')
      setDescription('');
      setNextStep(''); setNextStepSelect(''); setNextStepUseCustom(false)
    } catch (e: any) {
      setNotice({ open:true, text: (e.message || '저장 중 오류가 발생했습니다') })
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
      <section className="card compact-form activity-form-card">
        <div className="form-grid">
          <div className="field row-2">
            <label>제목</label>
            <SubjectInput value={subject} onChange={setSubject} placeholder="제목을 입력하세요" />
          </div>

          <div className="field">
            <label>활동유형</label>
            <select value={activityType} onChange={(e)=> setActivityType(e.target.value)}>
              {activityTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>상태</label>
            <select value={activityStatus} onChange={(e)=> setActivityStatus(e.target.value)}>
              {activityStatusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>방법</label>
            <select value={channel} onChange={(e)=> setChannel(e.target.value)}>
              {channelOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>공개 범위</label>
            <select value={visibility} onChange={(e)=> setVisibility(e.target.value)}>
              {visibilities.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div className="field row-2">
            <label>설명</label>
            <textarea value={description} onChange={(e)=> setDescription(e.target.value)} placeholder="활동 내용을 입력하세요" rows={3} />
          </div>

          <div className="field">
            <label>시작</label>
            <div className="datetime-wrapper">
              <input className={!plannedStartAt ? 'empty' : ''} type="datetime-local" value={plannedStartAt} onChange={(e)=> setPlannedStartAt(e.target.value)} />
              {!plannedStartAt && <span className="datetime-placeholder">YYYY-MM-DD HH:MM</span>}
            </div>
          </div>
          <div className="field">
            <label>종료</label>
            <div className="datetime-wrapper">
              <input className={!plannedEndAt ? 'empty' : ''} type="datetime-local" value={plannedEndAt} onChange={(e)=> setPlannedEndAt(e.target.value)} />
              {!plannedEndAt && <span className="datetime-placeholder">YYYY-MM-DD HH:MM</span>}
            </div>
          </div>

          <div className="field">
            <label>상위활동</label>
            <select value={parentActivitySeq} onChange={(e)=> setParentActivitySeq(e.target.value)}>
              <option value="">없음</option>
              {parentOptions.map(p => (
                <option key={p.id} value={String(p.id)}>{p.subject || `#${p.id}`}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>종일</label>
            <select value={isAllDay ? 'true' : 'false'} onChange={(e)=> setIsAllDay(e.target.value === 'true')}>
              <option value="false">아니오</option>
              <option value="true">예</option>
            </select>
          </div>

          <div className="field">
            <label>거래처</label>
            <SubjectInput value={(selectedCustomer?.customerId ? String(selectedCustomer.customerId) : sfAccountId)} onChange={setSfAccountId} placeholder="거래처번호" />
          </div>
          <div className="field">
            <label>담당자</label>
            <SubjectInput value={sfOwnerId} onChange={setSfOwnerId} placeholder="사번 또는 emp_seq (미입력 시 로그인 사용자)" />
          </div>

          {showFollowUp && (
            <>
              <div className="field row-2">
                <label>후속조치</label>
                <SubjectInput value={nextStep} onChange={setNextStep} placeholder="후속 조치 내용을 입력" />
              </div>
              <div className="field">
                <label>예정일시</label>
                <div className="datetime-wrapper">
                  <input className={!nextStepDueAt ? 'empty' : ''} type="datetime-local" value={nextStepDueAt} onChange={(e)=> setNextStepDueAt(e.target.value)} />
                  {!nextStepDueAt && <span className="datetime-placeholder">YYYY-MM-DD HH:MM</span>}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="controls">
          <button className="btn" onClick={submit} disabled={busy}>저장</button>
          {msg && <span className="muted">{msg}</span>}
          {error && <span className="error">{error}</span>}
        </div>
      </section>
      {notice.open ? (
        <div role="dialog" aria-modal="true" className="card" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 70 }}>
          <div className="card" style={{ background:'var(--panel)', padding: 12, border: '1px solid var(--border)', borderRadius: 10, minWidth: 260, maxWidth: '86vw' }}>
            <div style={{ marginBottom: 8, fontWeight: 700, textAlign:'center' }}>{notice.text}</div>
            <div style={{ display:'flex', justifyContent:'center' }}>
              <button className="btn btn-card btn-3d" onClick={()=> setNotice({ open:false, text:'' })}>확인</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
