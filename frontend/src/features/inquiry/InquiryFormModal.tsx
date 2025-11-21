import React, { useEffect, useRef, useState } from 'react'
import closeIcon from '../../assets/icons/close.svg'
import searchIcon from '../../assets/icons/search.svg'
import { AppModal } from '../../ui/AppModal'

type Props = {
  open: boolean
  onClose: () => void
  onSubmit?: (payload: any) => void
}

export function InquiryFormModal({ open, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('')
  const [inquiryStatus, setInquiryStatus] = useState('')
  const [severity, setSeverity] = useState('')
  const [inquiryCategory, setInquiryCategory] = useState('')
  const [channel, setChannel] = useState('')
  const [customerSeq, setCustomerSeq] = useState<string>('')
  const [customerName, setCustomerName] = useState<string>('')
  const [customerLookupOpen, setCustomerLookupOpen] = useState(false)
  const [contactName, setContactName] = useState<string>('')
  const [ownerName, setOwnerName] = useState<string>('')
  const [ownerId, setOwnerId] = useState<string>('')
  const [assigneeName, setAssigneeName] = useState<string>('')
  const [assigneeId, setAssigneeId] = useState<string>('')
  const [employeeLookupOpen, setEmployeeLookupOpen] = useState(false)
  const [leadId, setLeadId] = useState('')
  const [leadName, setLeadName] = useState('')
  const [leadLookupOpen, setLeadLookupOpen] = useState(false)
  const [openedAt, setOpenedAt] = useState('')
  const [closedAt, setClosedAt] = useState('')
  const [inquiryContent, setInquiryContent] = useState('')
  const [answerContent, setAnswerContent] = useState('')
  const [warnMsg, setWarnMsg] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [moved, setMoved] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 })

  useEffect(() => {
    if (open) {
      // initialize defaults on open
      const d = new Date()
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
      setOpenedAt(d.toISOString().slice(0, 16)) // yyyy-MM-ddTHH:mm
      setClosedAt('')
      setTitle('')
      setInquiryStatus('')
      setSeverity('')
      setInquiryCategory('')
      setChannel('')
      setCustomerSeq('')
      setCustomerName('')
      setContactName('')
      // 접수자: 로그인 사용자 정보로 고정
      try {
        const nm = localStorage.getItem('tnt.sales.empName') || ''
        const aid = localStorage.getItem('tnt.sales.assigneeId') || ''
        setOwnerName(nm)
        setOwnerId(aid)
      } catch { setOwnerName(''); setOwnerId('') }
      setAssigneeName('')
      setAssigneeId('')
      setLeadId('')
      setLeadName('')
      setInquiryContent('')
      setAnswerContent('')
      setMoved(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // If a child lookup is open, do not close the parent modal
        if (customerLookupOpen || leadLookupOpen || employeeLookupOpen) return
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose, customerLookupOpen, leadLookupOpen, employeeLookupOpen])

  // Close inline warning popup on ESC
  useEffect(() => {
    if (!warnMsg) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setWarnMsg(null) }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [warnMsg])

  function onDragStart(e: React.MouseEvent) {
    e.preventDefault()
    const rect = panelRef.current?.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const initLeft = rect ? rect.left : pos.left
    const initTop = rect ? rect.top : pos.top
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      setPos({ left: initLeft + dx, top: initTop + dy })
      setMoved(true)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  if (!open) return null

  function submit() {
    // Validation: 제목, 상태, (거래처 또는 잠재고객)
    const titleOk = (title || '').trim().length > 0
    const statusOk = (inquiryStatus || '').trim().length > 0
    const hasCustomer = !!(customerSeq && Number(customerSeq))
    const hasLead = !!(leadId && String(leadId).trim())
    if (!titleOk) { setWarnMsg('제목을 입력해 주세요.'); return }
    if (!statusOk) { setWarnMsg('상태를 선택해 주세요.'); return }
    if (!(hasCustomer || hasLead)) { setWarnMsg('거래처 또는 잠재고객 중 하나를 선택해 주세요.'); return }
    const payload = {
      title,
      inquiryStatus,
      severity,
      inquiryCategory,
      channel,
      customerSeq: customerSeq ? Number(customerSeq) : null,
      contactName: contactName || null,
      ownerId: ownerId || null,
      assigneeId: assigneeId || null,
      createdBy: ownerId || null,
      updatedBy: ownerId || null,
      leadId,
      openedAt: openedAt || null,
      closedAt: closedAt || null,
      inquiryContent,
      answerContent,
    }
    onSubmit?.(payload)
  }

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.35)' }} />
      <div
        ref={panelRef}
        className="card"
        style={{
          position: 'absolute',
          zIndex: 1001,
          width: '90%',
          maxWidth: 900,
          maxHeight: '90%',
          overflow: 'auto',
          padding: 12,
          left: moved ? pos.left : '50%',
          top: moved ? pos.top : '50%',
          transform: moved ? 'none' as any : 'translate(-50%, -50%)'
        }}
      >
        <button
          aria-label="닫기"
          onClick={onClose}
          className="btn-plain"
          style={{ position: 'absolute', top: 8, right: 8 }}
        >
          <img src={closeIcon} className="icon" alt="닫기" />
        </button>
        <div onMouseDown={onDragStart} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'move' }}>
          <span className="muted" style={{ fontWeight: 700 }}>새 문의</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>
        <div className="form-grid">
          <div className="inline-field"><label>제목<span className="req-dot" aria-hidden="true" /></label><input className="subject-input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="제목" /></div>
          <div className="inline-field"><label>문의유형</label>
            <select className="subject-input" value={inquiryCategory} onChange={e=>setInquiryCategory(e.target.value)}>
              <option value="">선택</option>
              <option value="제품문의">제품문의</option>
              <option value="재고/배송문의">재고/배송문의</option>
              <option value="가격문의">가격문의</option>
              <option value="기타문의">기타문의</option>
            </select>
          </div>
          <div className="inline-field" style={{ gridColumn: '1 / -1' }}>
            <label>문의내용</label>
            <textarea className="subject-input" value={inquiryContent} onChange={e=>setInquiryContent(e.target.value)} placeholder="상세 설명" style={{ minHeight: 120 }} />
          </div>
          <div className="inline-field" style={{ gridColumn: '1 / -1' }}>
            <label>답변내용</label>
            <textarea className="subject-input" value={answerContent} onChange={e=>setAnswerContent(e.target.value)} placeholder="답변/조치" style={{ minHeight: 120 }} />
          </div>
          <div className="inline-field"><label>상태<span className="req-dot" aria-hidden="true" /></label>
            <select className="subject-input" value={inquiryStatus} onChange={e=>setInquiryStatus(e.target.value)}>
              <option value="">선택</option>
              <option value="신규접수">신규접수</option>
              <option value="확인 중">확인 중</option>
              <option value="완료">완료</option>
              <option value="보류">보류</option>
            </select>
          </div>

          <div className="inline-field"><label>난이도</label>
            <select className="subject-input" value={severity} onChange={e=>setSeverity(e.target.value)}>
              <option value="">선택</option>
              <option value="상">상</option>
              <option value="중">중</option>
              <option value="하">하</option>
            </select>
          </div>

          <div className="inline-field"><label>접수경로</label>
            <select className="subject-input" value={channel} onChange={e=>setChannel(e.target.value)}>
              <option value="">선택</option>
              <option value="전화">전화</option>
              <option value="이메일">이메일</option>
              <option value="고객채널">고객채널</option>
              <option value="직접입력">직접입력</option>
            </select>
          </div>
          <div className="inline-field"><label>잠재고객</label>
            <div style={{ position: 'relative' }}>
              <input
                className="subject-input"
                type="text"
                value={leadName}
                onChange={(e)=>{ setLeadName(e.target.value); setLeadId('') }}
                placeholder="잠재고객명"
                style={{ paddingRight: 28 }}
              />
              <button
                type="button"
                aria-label="잠재고객 검색"
                title="잠재고객 검색"
                onClick={() => setLeadLookupOpen(true)}
                className="btn-plain no-focus-ring"
                style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', padding: 4, cursor: 'pointer' }}
              >
                <img src={searchIcon} className="icon" alt="검색" />
              </button>
            </div>
            {leadId && (<div className="muted" style={{ fontSize: 11, marginTop: 4 }}>선택됨: id {leadId}</div>)}
          </div>

          <div className="inline-field"><label>거래처</label>
            <div style={{ position: 'relative' }}>
              <input
                className="subject-input"
                type="text"
                value={customerName}
                onChange={(e)=>{ setCustomerName(e.target.value); setCustomerSeq('') }}
                placeholder="거래처명"
                style={{ paddingRight: 28 }}
              />
              <button
                type="button"
                aria-label="거래처 검색"
                title="거래처 검색"
                onClick={() => setCustomerLookupOpen(true)}
                className="btn-plain no-focus-ring"
                style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', padding: 4, cursor: 'pointer' }}
              >
                <img src={searchIcon} className="icon" alt="검색" />
              </button>
            </div>
            {/* 선택된 거래처 식별자 유지 (전송용) */}
            {customerSeq && (<div className="muted" style={{ fontSize: 11, marginTop: 4 }}>선택됨: seq {customerSeq}</div>)}
          </div>
          <div className="inline-field"><label>거래처 담당자</label><input className="subject-input" type="text" value={contactName} onChange={e=>setContactName(e.target.value)} placeholder="이름" /></div>

          <div className="inline-field"><label>접수자</label><input className="subject-input" value={ownerName} readOnly title="로그인 사용자" /></div>
          <div className="inline-field"><label>당사 담당자</label>
            <div style={{ position: 'relative' }}>
              <input className="subject-input" type="text" value={assigneeName} onChange={e=>{ setAssigneeName(e.target.value); setAssigneeId('') }} placeholder="이름" style={{ paddingRight: 28 }} />
              <button type="button" aria-label="직원 검색" title="직원 검색" onClick={()=>setEmployeeLookupOpen(true)} className="btn-plain no-focus-ring" style={{ position:'absolute', right:4, top:'50%', transform:'translateY(-50%)', padding:4, cursor:'pointer' }}>
                <img src={searchIcon} className="icon" alt="검색" />
              </button>
            </div>
            {/* 선택된 assignee_id 표시 제거 요청에 따라 숨김 */}
          </div>

          <div className="inline-field"><label>접수시각</label><input className="subject-input" type="datetime-local" value={openedAt} onChange={e=>setOpenedAt(e.target.value)} /></div>
          <div className="inline-field"><label>종료시각</label><input className="subject-input" type="datetime-local" value={closedAt} onChange={e=>setClosedAt(e.target.value)} /></div>

        
        </div>
        <div className="controls" style={{ gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={submit}>저장</button>
          <button className="btn" onClick={onClose}>취소</button>
        </div>
      </div>
      {customerLookupOpen && (
        <CustomerLookupModal
          defaultQuery={customerName}
          onClose={() => setCustomerLookupOpen(false)}
          onSelect={(row) => {
            setCustomerSeq(row.customerSeq ? String(row.customerSeq) : '')
            setCustomerName(row.customerName || '')
            setCustomerLookupOpen(false)
          }}
        />
      )}
      {employeeLookupOpen && (
        <EmployeeLookupModal
          defaultQuery={assigneeName}
          onClose={() => setEmployeeLookupOpen(false)}
          onSelect={(row) => { setAssigneeId(row.assigneeId || ''); setAssigneeName(row.empName || ''); setEmployeeLookupOpen(false) }}
        />
      )}
      {leadLookupOpen && (
        <LeadLookupModal
          defaultQuery={leadName}
          onClose={() => setLeadLookupOpen(false)}
          onSelect={(row) => {
            setLeadId(row.id != null ? String(row.id) : '')
            setLeadName(row.companyName || '')
            setLeadLookupOpen(false)
          }}
        />
      )}
      <AppModal open={!!warnMsg} onClose={()=>setWarnMsg(null)} width={360}
        footer={<button className="btn" onClick={()=>setWarnMsg(null)}>확인</button>}>
        {warnMsg}
      </AppModal>
    </div>
  )
}

type CustomerRow = {
  customerSeq?: number | null
  customerId?: string | null
  customerName?: string | null
  telNo?: string | null
  addrProvinceName?: string | null
  addrCityName?: string | null
  companyType?: string | null
  ownerName?: string | null
}

function CustomerLookupModal({ defaultQuery, onClose, onSelect }: { defaultQuery?: string; onClose: () => void; onSelect: (row: CustomerRow) => void }) {
  const [q, setQ] = useState(defaultQuery || '')
  const [items, setItems] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function search(reset = true) {
    setLoading(true)
    setError(null)
    try {
      const url = new URL('/api/v1/customers', window.location.origin)
      if (q.trim()) url.searchParams.set('name', q.trim())
      url.searchParams.set('mineOnly', 'false')
      url.searchParams.set('limit', '100')
      const r = await fetch(url.toString())
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      if (Array.isArray(data)) {
        const list: CustomerRow[] = data.map((x: any) => ({
          customerSeq: (x?.customerSeq ?? x?.customer_seq) ?? null,
          customerId: x?.customerId ?? x?.customer_id ?? null,
          customerName: x?.customerName ?? x?.customer_name ?? null,
          telNo: x?.telNo ?? x?.tel_no ?? null,
          addrProvinceName: x?.addrProvinceName ?? x?.addr_province_name ?? null,
          addrCityName: x?.addrCityName ?? x?.addr_city_name ?? null,
          companyType: x?.companyType ?? x?.company_type ?? null,
          ownerName: x?.ownerName ?? x?.owner_name ?? null,
        }))
        setItems(list)
      } else {
        setItems([])
      }
    } catch (e: any) {
      setError(e?.message || '조회 중 오류가 발생했습니다')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { search(true) }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 1100 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)' }} />
      <div className="card" style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 800, maxHeight: '80%', overflow: 'auto', padding: 12 }}>
        <button
          aria-label="닫기"
          onClick={onClose}
          className="btn-plain"
          style={{ position: 'absolute', top: 8, right: 8 }}
        >
          <img src={closeIcon} className="icon" alt="닫기" />
        </button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <input className="subject-input" placeholder="거래처명" value={q} onChange={(e)=>setQ(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') search(true) }} style={{ flex: 1 }} />
          <button className="btn" onClick={()=>search(true)}>조회</button>
        </div>
        <div className="table-container" style={{ height: 360 }}>
          {items.length === 0 ? (
            <div className="empty-state">{loading ? '불러오는 중…' : (error || '결과가 없습니다')}</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 220 }}>거래처명</th>
                  <th style={{ width: 140 }}>회사구분</th>
                  <th style={{ width: 140 }}>대표자명</th>
                  <th style={{ width: 180 }}>지역</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} onDoubleClick={() => onSelect(it)} onClick={() => onSelect(it)}>
                    <td>{it.customerName || ''}</td>
                    <td>{it.companyType || ''}</td>
                    <td>{it.ownerName || ''}</td>
                    <td>{[it.addrProvinceName, it.addrCityName].filter(Boolean).join(' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

type LeadRow = {
  id?: number | null
  companyName?: string | null
  leadStatus?: string | null
  ownerName?: string | null
  addrProvinceName?: string | null
}

function LeadLookupModal({ defaultQuery, onClose, onSelect }: { defaultQuery?: string; onClose: () => void; onSelect: (row: LeadRow) => void }) {
  const [q, setQ] = useState(defaultQuery || '')
  const [items, setItems] = useState<LeadRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function search(reset = true) {
    setLoading(true)
    setError(null)
    try {
      const url = new URL('/api/v1/leads', window.location.origin)
      if (q.trim()) url.searchParams.set('company_name', q.trim())
      url.searchParams.set('limit', '100')
      const r = await fetch(url.toString())
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      if (Array.isArray(data)) {
        const list: LeadRow[] = data.map((x: any) => ({
          id: x?.id != null ? Number(x.id) : null,
          companyName: x?.company_name ?? null,
          leadStatus: x?.lead_status ?? null,
          ownerName: (x as any)?.owner_name ?? null,
          addrProvinceName: x?.addr_province_name ?? null,
        }))
        setItems(list)
      } else {
        setItems([])
      }
    } catch (e: any) {
      setError(e?.message || '조회 중 오류가 발생했습니다')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { search(true) }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 1100 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)' }} />
      <div className="card" style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 800, maxHeight: '80%', overflow: 'auto', padding: 12 }}>
        <button aria-label="닫기" onClick={onClose} className="btn-plain" style={{ position: 'absolute', top: 8, right: 8 }}>
          <img src={closeIcon} className="icon" alt="닫기" />
        </button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <input className="subject-input" placeholder="잠재고객명" value={q} onChange={(e)=>setQ(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') search(true) }} style={{ flex: 1 }} />
          <button className="btn" onClick={()=>search(true)}>조회</button>
        </div>
        <div className="table-container" style={{ height: 360 }}>
          {items.length === 0 ? (
            <div className="empty-state">{loading ? '불러오는 중…' : (error || '결과가 없습니다')}</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 220 }}>잠재고객명</th>
                  <th style={{ width: 120 }}>상태</th>
                  <th style={{ width: 140 }}>소유자</th>
                  <th style={{ width: 160 }}>지역</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} onDoubleClick={() => onSelect(it)} onClick={() => onSelect(it)}>
                    <td>{it.companyName || ''}</td>
                    <td>{it.leadStatus || ''}</td>
                    <td>{it.ownerName || ''}</td>
                    <td>{it.addrProvinceName || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

type EmployeeRow = { empId?: string | null; empName?: string | null; deptName?: string | null; assigneeId?: string | null }
function EmployeeLookupModal({ defaultQuery, onClose, onSelect }: { defaultQuery?: string; onClose: () => void; onSelect: (row: EmployeeRow) => void }) {
  const [q, setQ] = useState(defaultQuery || '')
  const [items, setItems] = useState<EmployeeRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function search() {
    setLoading(true); setError(null)
    try {
      const url = new URL('/api/v1/employees', window.location.origin)
      url.searchParams.set('depts', 'all')
      const r = await fetch(url.toString())
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      const list = Array.isArray(data) ? data.map((x:any)=>({ empId: x?.emp_id ?? null, empName: x?.emp_name ?? null, deptName: x?.dept_name ?? null, assigneeId: x?.assignee_id ?? null })) : []
      const norm = q.trim().toLowerCase()
      const filtered = (norm ? list.filter((it:any)=> (it.empName||'').toLowerCase().includes(norm) || (it.empId||'').toLowerCase().includes(norm) || (it.deptName||'').toLowerCase().includes(norm)) : list)
        .sort((a:any,b:any)=> (a.empName||'').localeCompare(b.empName||'', 'ko', { sensitivity:'base' }))
      setItems(filtered)
    } catch (e:any) { setError(e?.message || '조회 실패'); setItems([]) } finally { setLoading(false) }
  }

  useEffect(()=>{ search() }, [])
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{ if (e.key==='Escape'){ e.preventDefault(); onClose() } }
    window.addEventListener('keydown', onKey, true)
    return ()=> window.removeEventListener('keydown', onKey, true)
  },[onClose])

  return (
    <div role="dialog" aria-modal="true" style={{ position:'fixed', inset:0, zIndex:1100 }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.4)' }} />
      <div className="card" style={{ position:'absolute', top:'10%', left:'50%', transform:'translateX(-50%)', width:'90%', maxWidth:700, maxHeight:'80%', overflow:'auto', padding:12 }}>
        <button aria-label="닫기" onClick={onClose} className="btn-plain" style={{ position:'absolute', top:8, right:8 }}>
          <img src={closeIcon} className="icon" alt="닫기" />
        </button>
        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
          <input className="subject-input" placeholder="이름/사번/부서" value={q} onChange={(e)=>setQ(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter') search() }} style={{ flex:1 }} />
          <button className="btn" onClick={search}>조회</button>
        </div>
        <div className="table-container" style={{ height:320 }}>
          {items.length===0 ? (<div className="empty-state">{loading? '불러오는 중…' : (error || '결과가 없습니다')}</div>) : (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width:160 }}>이름</th>
                  <th style={{ width:160 }}>부서</th>
                  <th style={{ width:140 }}>사번</th>
                  <th style={{ width:140 }}>assignee_id</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it,idx)=> (
                  <tr key={idx} onDoubleClick={()=>onSelect(it)} onClick={()=>onSelect(it)}>
                    <td>{it.empName||''}</td>
                    <td>{it.deptName||''}</td>
                    <td>{it.empId||''}</td>
                    <td>{it.assigneeId||''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
