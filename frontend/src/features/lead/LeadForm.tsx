import React, { useEffect, useMemo, useState } from 'react'
import closeIcon from '../../assets/icons/close.svg'
import { useDraggableModal } from '../../ui/useDraggableModal'
import { LeadActivityCreateModal } from './LeadActivityCreateModal'

type Lead = {
  id?: number
  lead_status?: string
  lead_source?: string | null
  contact_name?: string | null
  email?: string | null
  company_name?: string | null
  biz_type?: string | null
  office_phone?: string | null
  biz_no?: string | null
  addr_province_name?: string | null
  address?: string | null
  fax_no?: string | null
  contact_phone?: string | null
  biz_longitude?: number | null
  biz_latitude?: number | null
  note?: string | null
  last_activity_at?: string | null
  owner_id?: number | null
  owner_name?: string | null
  assignee_id?: string | null
  created_by?: number | null
  created_by_name?: string | null
  created_at?: string | null
  updated_by?: number | null
  updated_by_name?: string | null
  updated_at?: string | null
}

export function LeadForm() {
  const [original, setOriginal] = useState<Lead | null>(null)
  const [form, setForm] = useState<Lead>({})
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ open: boolean; text: string }>({ open: false, text: '' })
  const [owners, setOwners] = useState<Array<{ emp_id: string; emp_name: string; dept_name: string; assignee_id: string }>>([])

  // Logged-in identity for readonly display fallbacks
  const loginAssigneeId = useMemo(() => {
    try { return localStorage.getItem('tnt.sales.assigneeId') || '' } catch { return '' }
  }, [])
  const loginEmpId = useMemo(() => {
    try { return localStorage.getItem('tnt.sales.empId') || '' } catch { return '' }
  }, [])

  // listen selection change from right panel
  useEffect(() => {
    const onSel = () => {
      try {
        const raw = localStorage.getItem('tnt.sales.selectedLead')
        const obj = raw ? JSON.parse(raw) : null
        setOriginal(obj)
        setForm({ ...(obj || {}) })
        setSaveMsg(null)
      } catch {
        setOriginal(null)
        setForm({})
        setSaveMsg(null)
      }
    }
    window.addEventListener('tnt.sales.lead.selected' as any, onSel)
    return () => window.removeEventListener('tnt.sales.lead.selected' as any, onSel)
  }, [])

  function update<K extends keyof Lead>(key: K, val: Lead[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
    if (saveMsg) setSaveMsg(null)
  }

  function reset() {
    setForm({ ...(original || {}) })
  }

  async function saveLead() {
    if (!form || form.id == null) return
    try {
      const payload = { ...form }
      // Do not send readonly/computed fields
      delete (payload as any).created_by_name
      delete (payload as any).updated_by_name
      delete (payload as any).created_at
      delete (payload as any).updated_at
      // Keep existing owner when user didn't select a new one
      // 조건: 기존 소유자명이 존재하고, 화면에서 소유자 선택(assignee_id)을 비워둔 경우
      try {
        const noSelection = !form.assignee_id || String(form.assignee_id).trim() === ''
        if (noSelection) {
          // 소유자 선택이 없으면 항상 소유자 관련 필드 제외 (값 유지)
          delete (payload as any).assignee_id
          delete (payload as any).owner_name
          delete (payload as any).owner_id
        }
      } catch {}
      // Set updated_by to current login assignee_id
      try {
        const aid = localStorage.getItem('tnt.sales.assigneeId') || ''
        if (aid) (payload as any).updated_by = aid
      } catch {}
      const res = await fetch(`/api/v1/leads/${form.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json().catch(() => ({}))
      if (data?.ok) {
        const cname = form.company_name || ''
        setNotice({ open: true, text: `${cname} 수정되었습니다.` })
        // Fetch latest row (to refresh updated_at, etc.) and propagate
        try {
          const r2 = await fetch(`/api/v1/leads/${form.id}`)
          const fresh = r2.ok ? await r2.json() : form
          setForm((prev) => ({ ...prev, ...(fresh || {}) }))
          setOriginal((prev) => ({ ...(prev || {}), ...(fresh || {}) }))
          localStorage.setItem('tnt.sales.selectedLead', JSON.stringify(fresh || form))
          window.dispatchEvent(new CustomEvent('tnt.sales.lead.selected', { detail: { lead: fresh || form } }) as any)
          window.dispatchEvent(new CustomEvent('tnt.sales.lead.updated', { detail: { lead: fresh || form } }) as any)
        } catch {
          // fallback: still notify others with current state
          try {
            localStorage.setItem('tnt.sales.selectedLead', JSON.stringify(form))
            window.dispatchEvent(new CustomEvent('tnt.sales.lead.selected', { detail: { lead: form } }) as any)
            window.dispatchEvent(new CustomEvent('tnt.sales.lead.updated', { detail: { lead: form } }) as any)
          } catch {}
        }
      } else {
        throw new Error('저장 실패')
      }
    } catch (e: any) {
      setSaveMsg(e?.message || '저장 중 오류가 발생했습니다')
    }
  }

  // Load owners (영업1/2 본부/팀) for assignee selection
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/v1/employees')
        if (!res.ok) return
        const data = await res.json()
        if (Array.isArray(data)) {
          let list: any[] = [...data]
          const hasYoon = list.some((o) => String(o?.emp_name || '') === '윤이랑')
          if (!hasYoon) {
            try {
              const resAll = await fetch('/api/v1/employees?depts=all')
              if (resAll.ok) {
                const all = await resAll.json()
                if (Array.isArray(all)) {
                  const found = all.find((o: any) => String(o?.emp_name || '') === '윤이랑')
                  if (found) list = [...list, found]
                }
              }
            } catch {}
          }
          setOwners(list as any)
        }
      } catch {}
    })()
  }, [])

  const disabled = !form || form.id == null
  const [tmOpen, setTmOpen] = useState(false)
  const [tmTitle, setTmTitle] = useState('')
  const [tmDesc, setTmDesc] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [newForm, setNewForm] = useState<Lead>({})
  const [activityOpen, setActivityOpen] = useState(false)
  const { ref: tmRef, style: tmStyle, bindHeader: tmBindHeader, bindContainer: tmBindContainer } = useDraggableModal('lead.tm', tmOpen, (el) => {
    // Place horizontally centered in center pane; vertically near bottom
    const pane = document.querySelector('.pane.center') as HTMLElement | null
    const rect = pane ? pane.getBoundingClientRect() : null
    const elRect = el.getBoundingClientRect()
    const w = elRect.width
    const h = elRect.height
    const x = rect ? (rect.left + (rect.width - w) / 2) : (window.innerWidth - w) / 2
    const y = Math.max(0, window.innerHeight - h - 16)
    // clamp
    const cx = Math.min(Math.max(0, x), window.innerWidth - w)
    const cy = Math.min(Math.max(0, y), window.innerHeight - h)
    return { x: cx, y: cy }
  }, { persist: false, resetOnOpen: true })
  const { ref: newRef, style: newStyle, bindHeader: newBindHeader, bindContainer: newBindContainer } = useDraggableModal('lead.new', newOpen, (el) => {
    const pane = document.querySelector('.pane.center') as HTMLElement | null
    const rect = pane ? pane.getBoundingClientRect() : null
    const elRect = el.getBoundingClientRect()
    const w = elRect.width
    const h = elRect.height
    const x = rect ? (rect.left + (rect.width - w) / 2) : (window.innerWidth - w) / 2
    const y = Math.max(0, window.innerHeight * 0.1)
    const cx = Math.min(Math.max(0, x), window.innerWidth - w)
    const cy = Math.min(Math.max(0, y), window.innerHeight - h)
    return { x: cx, y: cy }
  }, { persist: false, resetOnOpen: true })

  // ESC to close New Lead modal
  useEffect(() => {
    if (!newOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNewOpen(false) }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [newOpen])

  // ESC to close TM modal
  useEffect(() => {
    if (!tmOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setTmOpen(false) }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [tmOpen])

  function formatKoDate(input?: string | null): string {
    if (!input) return ''
    const d = new Date(input)
    if (isNaN(d.getTime())) return String(input)
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    }).format(d)
  }

  const header = useMemo(() => {
    const stages = ['신규등록', '접촉 중', '영업 접촉 중', '전환성공']
    const status = (form?.lead_status || '').trim()
    const isFailed = status === '자격미달' || status === '전환실패'
    let idx = stages.indexOf(status)
    if (status === '자격미달') idx = 1
    if (status === '전환실패') idx = stages.length - 1
    if (idx < 0) idx = 0
    const percent = Math.max(0, Math.min(100, Math.round((idx) / Math.max(1, stages.length - 1) * 100)))
    return (
      <div className="page-title">
        <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0, flex: '1 1 auto' }}>
          <h2 style={{ margin: 0 }}>잠재고객</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:4, flex: '0 1 520px' }}>
            <div className="progress" style={{ width: 'min(520px, 48vw)' }}>
              <div className="progress-bar" style={{ width: `${percent}%`, background: isFailed ? '#ef4444' : 'var(--accent)' }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', width: 'min(520px, 48vw)', fontSize: 11, color: 'var(--muted)' }}>
              {stages.map((s) => (
                <span key={s} style={{ fontWeight: status === s ? 700 as any : 400 }}>{s}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="controls" style={{ gap: 8 }}>
          <button className="btn" onClick={() => { setNewForm({}); setNewOpen(true) }}>신규</button>
          <button className="btn" onClick={() => setActivityOpen(true)} disabled={disabled}>영업활동 등록</button>
          <button className="btn" onClick={() => { setTmOpen(true); setSaveMsg(null) }} disabled={disabled}>TM활동 등록</button>
        </div>
      </div>
    )
  }, [disabled, form.lead_status])

  return (
    <section>
      {header}
      <div className="card" style={{ padding: 12 }}>
        {form && form.id != null ? (
          <>
          <div className="form-grid" style={{ columnGap: 10, rowGap: 6 }}>
            <div className="field inline-field"><label>상태</label>
              <select className="search-input" value={form.lead_status || ''} onChange={(e) => update('lead_status', e.target.value)}>
                <option value="">(선택)</option>
                <option value="신규등록">신규등록</option>
                <option value="자격미달">자격미달</option>
                <option value="접촉 중">접촉 중</option>
                <option value="영업 접촉 중">영업 접촉 중</option>
                <option value="전환성공">전환성공</option>
                <option value="전환실패">전환실패</option>
              </select>
            </div>
            <div className="field inline-field"><label>소스</label>
              <select className="search-input" value={form.lead_source || ''} onChange={(e) => update('lead_source', e.target.value)}>
                <option value="">(선택)</option>
                <option value="목록구매">목록구매</option>
                <option value="내부추천">내부추천</option>
                <option value="외부추천">외부추천</option>
                <option value="전시회/행사">전시회/행사</option>
              </select>
            </div>
            <div className="field inline-field"><label>회사</label><input className="search-input" type="text" value={form.company_name || ''} onChange={(e) => update('company_name', e.target.value)} /></div>
            <div className="field inline-field"><label>거래처 담당자</label><input className="search-input" type="text" value={form.contact_name || ''} onChange={(e) => update('contact_name', e.target.value)} /></div>
            <div className="field inline-field"><label>이메일</label><input className="search-input" type="text" value={form.email || ''} onChange={(e) => update('email', e.target.value)} /></div>
            <div className="field inline-field"><label>연락처</label><input className="search-input" type="text" value={form.contact_phone || ''} onChange={(e) => update('contact_phone', e.target.value)} /></div>
            <div className="field inline-field"><label>대표번호</label><input className="search-input" type="text" value={form.office_phone || ''} onChange={(e) => update('office_phone', e.target.value)} /></div>
            <div className="field inline-field"><label>업종</label>
              <select className="search-input" value={form.biz_type || ''} onChange={(e) => update('biz_type', e.target.value)}>
                <option value="">(선택)</option>
                <option value="가공">가공</option>
                <option value="시공">시공</option>
                <option value="가시공">가시공</option>
                <option value="유통">유통</option>
                <option value="알수없음">알수없음</option>
              </select>
            </div>
            <div className="field inline-field"><label>사업자번호</label><input className="search-input" type="text" value={form.biz_no || ''} onChange={(e) => update('biz_no', e.target.value)} /></div>
            <div className="field inline-field"><label>지역(도/광역)</label><input className="search-input" type="text" value={form.addr_province_name || ''} onChange={(e) => update('addr_province_name', e.target.value)} /></div>
            <div className="field inline-field row-2"><label>주소</label><input className="search-input" type="text" value={form.address || ''} onChange={(e) => update('address', e.target.value)} /></div>
            <div className="field inline-field"><label>팩스</label><input className="search-input" type="text" value={form.fax_no || ''} onChange={(e) => update('fax_no', e.target.value)} /></div>
            <div className="field inline-field row-2"><label>비고</label><textarea className="search-input" value={form.note || ''} onChange={(e) => update('note', e.target.value)} style={{ minHeight: 80 }} /></div>
            <div className="field inline-field"><label>소유자</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
                <select className="search-input" value={form.assignee_id || ''} onChange={(e)=> update('assignee_id', e.target.value || null)}>
                  <option value="">(선택)</option>
                  {owners.map(o => (
                    <option key={o.assignee_id} value={o.assignee_id}>{o.dept_name} · {o.emp_name}</option>
                  ))}
                </select>
                <div style={{ whiteSpace: 'nowrap', alignSelf: 'center', fontSize: 12 }}>
                  {(() => {
                    const byName = form.owner_name && String(form.owner_name).trim() ? String(form.owner_name) : ''
                    const a = form.assignee_id || ''
                    const found = owners.find(o => o.assignee_id === a)
                    const name = byName || (found ? found.emp_name : '') || '-'
                    return `현재소유자 : ${name}`
                  })()}
                </div>
              </div>
            </div>
            <div className="field inline-four row-2">
              <label>작성자</label>
              <div className="subject-input" style={{ padding: '6px 8px' }}>
                {(form.created_by_name || (form.created_by ?? '') || loginAssigneeId || loginEmpId)}
                {form.created_at ? `, ${formatKoDate(form.created_at)}` : ''}
              </div>
              <label>최종 수정자</label>
              <div className="subject-input" style={{ padding: '6px 8px' }}>
                {(form.updated_by_name || (form.updated_by ?? '') || loginAssigneeId || loginEmpId)}
                {form.updated_at ? `, ${formatKoDate(form.updated_at)}` : ''}
              </div>
            </div>
          </div>
            <div className="controls" style={{ justifyContent: 'space-between', marginTop: 10, gap: 8 }}>
              <div aria-live="polite" style={{ fontSize: 12, color: 'var(--accent)' }}>{saveMsg || ''}</div>
              <div>
                <div style={{ display:'inline-flex', gap:8 }}>
                  <button className="btn" onClick={saveLead} disabled={disabled}>저장</button>
                  {!disabled ? (
                  <button
                    className="btn btn-danger"
                    onClick={async () => {
                      if (!form?.id) return
                      const deleteSql = `DELETE FROM public.lead WHERE id = ${form.id}`
                      try {
                        const res = await fetch(`/api/v1/leads/${form.id}`, { method: 'DELETE' })
                        if (!res.ok) {
                          const errJson = await res.json().catch(() => null)
                          throw new Error(errJson?.message || `HTTP ${res.status}`)
                        }
                        setNotice({ open:true, text:'삭제되었습니다.' })
                        // Clear selection
                        setForm({})
                        setOriginal(null)
                        localStorage.removeItem('tnt.sales.selectedLead')
                        window.dispatchEvent(new CustomEvent('tnt.sales.lead.selected', { detail: { lead: null } }) as any)
                        window.dispatchEvent(new CustomEvent('tnt.sales.lead.updated', { detail: { lead: null } }) as any)
                      } catch (e: any) {
                        setSaveMsg(e?.message || '삭제 중 오류가 발생했습니다')
                      }
                    }}
                  >
                    삭제
                  </button>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">우측에서 잠재고객을 선택하세요.</div>
        )}
      </div>
      {tmOpen && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 10000, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.25)', pointerEvents: 'none' }} />
          <div
            ref={tmRef}
            className="card"
            style={{ ...tmStyle, width: 'min(720px, 92vw)', maxHeight: '80vh', overflow: 'auto', padding: 16, pointerEvents: 'auto' }}
            {...tmBindContainer}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, cursor: 'move' }} {...tmBindHeader}>
              <h3 style={{ margin: 0 }}>TM 활동 등록</h3>
              <span
                role="button"
                tabIndex={0}
                className="icon-button"
                aria-label="닫기"
                title="닫기"
                onClick={() => setTmOpen(false)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTmOpen(false) } }}
              >
                <img src={closeIcon} className="icon" alt="닫기" />
              </span>
            </div>
            <div className="field inline-field"><label>제목</label>
              <input className="search-input" type="text" value={tmTitle} onChange={(e) => setTmTitle(e.target.value)} placeholder="제목" />
            </div>
            <div className="field inline-field row-2"><label>활동 설명</label>
              <textarea className="search-input" value={tmDesc} onChange={(e) => setTmDesc(e.target.value)} placeholder="활동 설명" style={{ minHeight: 100 }} />
            </div>
            <div className="field inline-field row-2"><label>잠재고객</label>
              <div className="subject-input" style={{ padding: '6px 8px' }}>
                {(form.company_name || '')}
                {form.contact_name ? ` / ${form.contact_name}` : ''}
                {form.contact_phone ? ` / ${form.contact_phone}` : ''}
              </div>
            </div>
            <div className="controls" style={{ justifyContent: 'flex-end', marginTop: 10, gap: 8 }}>
              <button className="btn" onClick={() => setTmOpen(false)}>취소</button>
              <button className="btn" onClick={async () => {
                try {
                  const sfOwnerId = (localStorage.getItem('tnt.sales.assigneeId') || localStorage.getItem('tnt.sales.empId') || '')
                  if (!sfOwnerId) { setSaveMsg('로그인이 필요합니다'); return }
                  const payload: any = {
                    sfOwnerId,
                    subject: tmTitle || '',
                    description: tmDesc || '',
                    activityType: '전화',
                    activityStatus: '계획',
                    channel: '전화',
                    sfLeadId: form?.id != null ? String(form.id) : undefined,
                    createdBy: localStorage.getItem('tnt.sales.empId') || undefined,
                    updatedBy: localStorage.getItem('tnt.sales.empId') || undefined,
                  }
                  const r = await fetch('/api/v1/sales-activities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                  if (!r.ok) {
                    let msg = `HTTP ${r.status}`
                    try { const d = await r.json(); if ((d as any)?.error) msg = (d as any).error } catch {}
                    throw new Error(msg)
                  }
                  setTmOpen(false)
                  setTmTitle(''); setTmDesc('')
                  try { window.dispatchEvent(new CustomEvent('tnt.sales.activity.updated', { detail: { leadId: form?.id } }) as any) } catch {}
                  setNotice({ open: true, text: 'TM 활동이 등록되었습니다.' })
                } catch (e: any) {
                  setSaveMsg(e?.message || 'TM 활동 등록 실패')
                }
              }}>저장</button>
            </div>
          </div>
        </div>
      )}

      {newOpen && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 10000, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.25)', pointerEvents: 'none' }} />
          <div
            ref={newRef}
            className="card"
            style={{ ...newStyle, width: 'min(880px, 96vw)', maxHeight: '86vh', overflow: 'auto', padding: 16, pointerEvents: 'auto' }}
            {...newBindContainer}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, cursor: 'move' }} {...newBindHeader}>
              <h3 style={{ margin: 0 }}>잠재고객 신규</h3>
              <span role="button" tabIndex={0} className="icon-button" aria-label="닫기" title="닫기" onClick={() => setNewOpen(false)}>
                <img src={closeIcon} className="icon" alt="닫기" />
              </span>
            </div>
            <div className="form-grid" style={{ columnGap: 10, rowGap: 6 }}>
              <div className="field inline-field"><label>상태</label>
                <select className="search-input" value={newForm.lead_status || ''} onChange={(e) => setNewForm(prev => ({ ...prev, lead_status: e.target.value }))}>
                  <option value="">(선택)</option>
                  <option value="신규등록">신규등록</option>
                  <option value="자격미달">자격미달</option>
                  <option value="접촉 중">접촉 중</option>
                  <option value="영업 접촉 중">영업 접촉 중</option>
                  <option value="전환성공">전환성공</option>
                  <option value="전환실패">전환실패</option>
                </select>
              </div>
              <div className="field inline-field"><label>소스</label>
                <select className="search-input" value={newForm.lead_source || ''} onChange={(e) => setNewForm(prev => ({ ...prev, lead_source: e.target.value }))}>
                  <option value="">(선택)</option>
                  <option value="목록구매">목록구매</option>
                  <option value="내부추천">내부추천</option>
                  <option value="외부추천">외부추천</option>
                  <option value="전시회/행사">전시회/행사</option>
                </select>
              </div>
              <div className="field inline-field"><label>회사</label><input className="search-input" type="text" value={newForm.company_name || ''} onChange={(e) => setNewForm(prev => ({ ...prev, company_name: e.target.value }))} /></div>
              <div className="field inline-field"><label>거래처 담당자</label><input className="search-input" type="text" value={newForm.contact_name || ''} onChange={(e) => setNewForm(prev => ({ ...prev, contact_name: e.target.value }))} /></div>
              <div className="field inline-field"><label>이메일</label><input className="search-input" type="text" value={newForm.email || ''} onChange={(e) => setNewForm(prev => ({ ...prev, email: e.target.value }))} /></div>
              <div className="field inline-field"><label>연락처</label><input className="search-input" type="text" value={newForm.contact_phone || ''} onChange={(e) => setNewForm(prev => ({ ...prev, contact_phone: e.target.value }))} /></div>
              <div className="field inline-field"><label>대표번호</label><input className="search-input" type="text" value={newForm.office_phone || ''} onChange={(e) => setNewForm(prev => ({ ...prev, office_phone: e.target.value }))} /></div>
              <div className="field inline-field"><label>업종</label>
                <select className="search-input" value={newForm.biz_type || ''} onChange={(e) => setNewForm(prev => ({ ...prev, biz_type: e.target.value }))}>
                  <option value="">(선택)</option>
                  <option value="가공">가공</option>
                  <option value="시공">시공</option>
                  <option value="가시공">가시공</option>
                  <option value="유통">유통</option>
                  <option value="알수없음">알수없음</option>
                </select>
              </div>
              <div className="field inline-field"><label>사업자번호</label><input className="search-input" type="text" value={newForm.biz_no || ''} onChange={(e) => setNewForm(prev => ({ ...prev, biz_no: e.target.value }))} /></div>
              <div className="field inline-field"><label>지역(도/광역)</label><input className="search-input" type="text" value={newForm.addr_province_name || ''} onChange={(e) => setNewForm(prev => ({ ...prev, addr_province_name: e.target.value }))} /></div>
              <div className="field inline-field row-2"><label>주소</label><input className="search-input" type="text" value={newForm.address || ''} onChange={(e) => setNewForm(prev => ({ ...prev, address: e.target.value }))} /></div>
              <div className="field inline-field"><label>팩스</label><input className="search-input" type="text" value={newForm.fax_no || ''} onChange={(e) => setNewForm(prev => ({ ...prev, fax_no: e.target.value }))} /></div>
              <div className="field inline-field row-2"><label>비고</label><textarea className="search-input" value={newForm.note || ''} onChange={(e) => setNewForm(prev => ({ ...prev, note: e.target.value }))} style={{ minHeight: 80 }} /></div>
              <div className="field inline-field"><label>소유자</label>
                <select className="search-input" value={newForm.assignee_id || ''} onChange={(e)=> setNewForm(prev => ({ ...prev, assignee_id: e.target.value || null }))}>
                  <option value="">(선택)</option>
                  {owners.map(o => (
                    <option key={o.assignee_id} value={o.assignee_id}>{o.dept_name} · {o.emp_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="controls" style={{ justifyContent: 'flex-end', marginTop: 10, gap: 8 }}>
              <button className="btn" onClick={() => setNewOpen(false)}>취소</button>
              <button className="btn" onClick={async () => {
                try {
                  const payload = { ...newForm }
                  const empId = localStorage.getItem('tnt.sales.empId') || undefined
                  if (empId) { (payload as any).created_by = empId; (payload as any).updated_by = empId }
                  const r = await fetch('/api/v1/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                  const d = await r.json().catch(()=> ({} as any))
                  if (!r.ok || (d && d.error)) throw new Error(d?.error || `HTTP ${r.status}`)
                  const id = d?.id
                  const created = { ...(newForm || {}), id }
                  try {
                    localStorage.setItem('tnt.sales.selectedLead', JSON.stringify(created))
                    window.dispatchEvent(new CustomEvent('tnt.sales.lead.selected', { detail: { lead: created } }) as any)
                    window.dispatchEvent(new CustomEvent('tnt.sales.lead.updated', { detail: { lead: created } }) as any)
                  } catch {}
                  setNewOpen(false)
                  const cname = newForm.company_name || ''
                  setNotice({ open: true, text: `${cname} 신규 생성되었습니다.` })
                } catch (e) {
                  // ignore for now or show inline error
                }
              }}>저장</button>
            </div>
          </div>
        </div>
      )}

      <LeadActivityCreateModal
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        leadId={form?.id ?? null}
        leadName={form?.company_name || ''}
      />

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
