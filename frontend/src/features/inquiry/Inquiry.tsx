import React, { useEffect, useMemo, useState } from 'react'
import { InquiryList } from './InquiryList'
import { InquiryFormModal } from './InquiryFormModal'
import searchIcon from '../../assets/icons/search.svg'
import closeIcon from '../../assets/icons/close.svg'
import { AppModal } from '../../ui/AppModal'

export function Inquiry() {
  const [selected, setSelected] = useState<any>(() => {
    try { const raw = localStorage.getItem('tnt.sales.selectedInquiry'); return raw ? JSON.parse(raw) : null } catch { return null }
  })

  useEffect(() => {
    const onSel = () => {
      try { const raw = localStorage.getItem('tnt.sales.selectedInquiry'); setSelected(raw ? JSON.parse(raw) : null) } catch { setSelected(null) }
    }
    window.addEventListener('tnt.sales.inquiry.selected' as any, onSel)
    return () => window.removeEventListener('tnt.sales.inquiry.selected' as any, onSel)
  }, [])

  const [msg, setMsg] = useState<string | null>(null)
  const [warnMsg, setWarnMsg] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [infoMsg, setInfoMsg] = useState<string | null>(null)

  // Close app modals on ESC
  useEffect(() => {
    if (!warnMsg) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setWarnMsg(null) }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [warnMsg])
  useEffect(() => {
    if (!confirmOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setConfirmOpen(false) }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [confirmOpen])
  useEffect(() => {
    if (!infoMsg) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setInfoMsg(null) }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [infoMsg])

  const fmt = (v?: any) => {
    if (!v) return ''
    try {
      const d = new Date(v)
      if (isNaN(d.getTime())) return String(v)
      const yy = String(d.getFullYear() % 100).padStart(2, '0')
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      const mi = String(d.getMinutes()).padStart(2, '0')
      return `${yy}-${mm}-${dd} ${hh}:${mi}`
    } catch { return String(v) }
  }

  const toLocalInput = (v?: any) => {
    if (!v) return ''
    try {
      const d = new Date(v)
      if (isNaN(d.getTime())) return ''
      const yyyy = String(d.getFullYear())
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      const mi = String(d.getMinutes()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
    } catch { return '' }
  }

  const [form, setForm] = useState<any>({})
  const [customerLookupOpen, setCustomerLookupOpen] = useState(false)
  const [leadLookupOpen, setLeadLookupOpen] = useState(false)
  const [employeeLookupOpen, setEmployeeLookupOpen] = useState(false)
  useEffect(() => {
    if (!selected) { setForm({}); return }
    const loginName = (typeof window!=='undefined') ? (localStorage.getItem('tnt.sales.empName') || '') : ''
    const loginAssignee = (typeof window!=='undefined') ? (localStorage.getItem('tnt.sales.assigneeId') || '') : ''
    setForm({
      title: selected.title || '',
      inquiryCategory: selected.inquiryCategory || '',
      inquiryContent: selected.inquiryContent || '',
      answerContent: selected.answerContent || '',
      inquiryStatus: selected.inquiryStatus || '',
      severity: selected.severity || '',
      channel: selected.channel || '',
      leadId: selected.leadId || '',
      leadName: '',
      customerSeq: selected.customerSeq != null ? String(selected.customerSeq) : '',
      customerName: selected.customerName || '',
      contactName: selected.contactName || '',
      ownerName: loginName,
      ownerId: loginAssignee,
      assigneeName: selected.assigneeName || '',
      assigneeId: selected.assigneeId || '',
      openedAt: toLocalInput(selected.openedAt),
      closedAt: toLocalInput(selected.closedAt),
    })
  }, [selected])

  // Fetch lead name if only leadId is available
  useEffect(() => {
    const id = form.leadId
    if (!id || form.leadName) return
    let stop = false
    ;(async () => {
      try {
        const r = await fetch(`/api/v1/leads/${encodeURIComponent(String(id))}`)
        if (!r.ok) return
        const d = await r.json().catch(()=>null)
        if (!stop && d) setForm((s:any)=>({ ...s, leadName: d.company_name || s.leadName || '' }))
      } catch {}
    })()
    return () => { stop = true }
  }, [form.leadId, form.leadName])

  function change<K extends keyof typeof form>(k: K, v: any) { setForm((s: any) => ({ ...s, [k]: v })) }

  async function save() {
    if (!selected?.id) return
    const currentAssigneeId = (() => { try { return localStorage.getItem('tnt.sales.assigneeId') || '' } catch { return '' } })()
    // Validation: 제목, 상태, (거래처 또는 잠재고객)
    const titleOk = String(form.title || '').trim().length > 0
    const statusOk = String(form.inquiryStatus || '').trim().length > 0
    const hasCustomer = !!(form.customerSeq && Number(form.customerSeq))
    const hasLead = !!(form.leadId && String(form.leadId).trim())
    if (!titleOk) { setWarnMsg('제목을 입력해 주세요.'); return }
    if (!statusOk) { setWarnMsg('상태를 선택해 주세요.'); return }
    if (!(hasCustomer || hasLead)) { setWarnMsg('거래처 또는 잠재고객 중 하나를 선택해 주세요.'); return }
    const payload = {
      title: form.title,
      inquiryCategory: form.inquiryCategory,
      inquiryContent: form.inquiryContent,
      answerContent: form.answerContent,
      inquiryStatus: form.inquiryStatus,
      severity: form.severity,
      channel: form.channel,
      leadId: form.leadId,
      customerSeq: form.customerSeq ? Number(form.customerSeq) : null,
      contactName: form.contactName || null,
      ownerId: form.ownerId || null,
      assigneeId: form.assigneeId || null,
      updatedBy: (currentAssigneeId || form.ownerId || null),
      openedAt: form.openedAt || null,
      closedAt: form.closedAt || null,
    }
    try {
      const r = await fetch(`/api/v1/inquiries/${selected.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!r.ok) {
        const t = await r.text().catch(()=> '')
        setWarnMsg('수정 실패: ' + (t || r.status))
        return
      }
      try {
        setMsg('수정 되었습니다.')
        window.setTimeout(() => setMsg(null), 3000)
      } catch {}
      try { window.dispatchEvent(new CustomEvent('tnt.sales.inquiry.reload', { detail: { focusId: selected.id } }) as any) } catch {}
    } catch {
      alert('수정 중 오류가 발생했습니다')
    }
  }

  const details = useMemo(() => (
    <div className="card" style={{ padding: 12 }}>
      {selected ? (
        <>
          <div className="form-grid">
            <div className="inline-field"><label>제목<span className="req-dot" aria-hidden="true" /></label><input className="subject-input" value={form.title || ''} onChange={(e)=>change('title', e.target.value)} /></div>
            <div className="inline-field"><label>문의유형</label>
              <select className="subject-input" value={form.inquiryCategory || ''} onChange={(e)=>change('inquiryCategory', e.target.value)}>
                <option value="">선택</option>
                <option value="제품문의">제품문의</option>
                <option value="재고/배송문의">재고/배송문의</option>
                <option value="가격문의">가격문의</option>
                <option value="기타문의">기타문의</option>
              </select>
            </div>

            <div className="inline-field" style={{ gridColumn: '1 / -1' }}>
            <label>문의내용</label>
              <textarea className="subject-input" value={form.inquiryContent || ''} onChange={(e)=>change('inquiryContent', e.target.value)} style={{ minHeight: 80 }} />
            </div>
            <div className="inline-field" style={{ gridColumn: '1 / -1' }}>
            <label>답변내용</label>
              <textarea className="subject-input" value={form.answerContent || ''} onChange={(e)=>change('answerContent', e.target.value)} style={{ minHeight: 80 }} />
            </div>

            <div className="inline-field"><label>상태<span className="req-dot" aria-hidden="true" /></label>
              <select className="subject-input" value={form.inquiryStatus || ''} onChange={(e)=>change('inquiryStatus', e.target.value)}>
                <option value="">선택</option>
                <option value="신규접수">신규접수</option>
                <option value="확인 중">확인 중</option>
                <option value="완료">완료</option>
                <option value="보류">보류</option>
              </select>
            </div>
            <div className="inline-field"><label>난이도</label>
              <select className="subject-input" value={form.severity || ''} onChange={(e)=>change('severity', e.target.value)}>
                <option value="">선택</option>
                <option value="상">상</option>
                <option value="중">중</option>
                <option value="하">하</option>
              </select>
            </div>

            <div className="inline-field"><label>접수경로</label>
              <select className="subject-input" value={form.channel || ''} onChange={(e)=>change('channel', e.target.value)}>
                <option value="">선택</option>
                <option value="전화">전화</option>
                <option value="이메일">이메일</option>
                <option value="고객채널">고객채널</option>
                <option value="직접입력">직접입력</option>
              </select>
            </div>
            <div className="inline-field"><label>잠재고객</label><input className="subject-input" value={form.leadName || ''} readOnly placeholder="-" /></div>

            <div className="inline-field"><label>거래처</label>
              <div style={{ position:'relative' }}>
                <input
                  className="subject-input"
                  value={form.customerName || ''}
                  onChange={(e)=>{ change('customerName', e.target.value); change('customerSeq','') }}
                  placeholder="거래처명"
                  style={{ paddingRight: 28 }}
                />
                <button
                  type="button"
                  aria-label="거래처 검색"
                  title="거래처 검색"
                  onClick={()=>setCustomerLookupOpen(true)}
                  className="btn-plain no-focus-ring"
                  style={{ position:'absolute', right:4, top:'50%', transform:'translateY(-50%)', padding:4, cursor:'pointer' }}
                >
                  <img src={searchIcon} className="icon" alt="검색" />
                </button>
              </div>
            </div>
            <div className="inline-field"><label>거래처 담당자</label><input className="subject-input" value={form.contactName || ''} onChange={(e)=>change('contactName', e.target.value)} placeholder="이름" /></div>

            <div className="inline-field"><label>접수자</label><input className="subject-input" value={form.ownerName || ''} readOnly title="로그인 사용자" /></div>
            <div className="inline-field"><label>당사 담당자</label>
              <div style={{ position:'relative' }}>
                <input className="subject-input" value={form.assigneeName || ''} onChange={(e)=>{ change('assigneeName', e.target.value); change('assigneeId','') }} placeholder="이름" style={{ paddingRight: 28 }} />
                <button type="button" aria-label="직원 검색" title="직원 검색" onClick={()=>setEmployeeLookupOpen(true)} className="btn-plain no-focus-ring" style={{ position:'absolute', right:4, top:'50%', transform:'translateY(-50%)', padding:4, cursor:'pointer' }}>
                  <img src={searchIcon} className="icon" alt="검색" />
                </button>
              </div>
            </div>

            <div className="inline-field"><label>접수시각</label><input className="subject-input" type="datetime-local" value={form.openedAt || ''} onChange={(e)=>change('openedAt', e.target.value)} /></div>
            <div className="inline-field"><label>종료시각</label><input className="subject-input" type="datetime-local" value={form.closedAt || ''} onChange={(e)=>change('closedAt', e.target.value)} /></div>
          </div>
          <div className="controls" style={{ gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
            {msg && (<span className="success">{msg}</span>)}
            <button className="btn" onClick={save}>저장</button>
            <button className="btn" onClick={onDelete}>삭제</button>
          </div>
        </>
      ) : (
        <div className="empty-state">선택된 케이스가 없습니다.</div>
      )}
    </div>
  ), [selected, form, msg])

  const [showNew, setShowNew] = useState(false)

  async function handleCreate(payload: any) {
    try {
      const res = await fetch('/api/v1/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const t = await res.text().catch(()=> '')
        alert('저장 실패: ' + (t || res.status))
        return
      }
      const data = await res.json().catch(() => null)
      const focusId = data && data.id != null ? Number(data.id) : null
      setShowNew(false)
      try { window.dispatchEvent(new CustomEvent('tnt.sales.inquiry.reload', { detail: { focusId } }) as any) } catch {}
    } catch (e: any) {
      alert('저장 중 오류가 발생했습니다')
    }
  }

  async function doDelete() {
    try {
      const r = await fetch(`/api/v1/inquiries/${selected.id}`, { method: 'DELETE' })
      if (!r.ok) {
        const t = await r.text().catch(()=> '')
        setWarnMsg('삭제 실패: ' + (t || r.status))
        return
      }
      try {
        localStorage.removeItem('tnt.sales.selectedInquiry')
      } catch {}
      setSelected(null)
      setInfoMsg('삭제 되었습니다.')
      try { window.dispatchEvent(new CustomEvent('tnt.sales.inquiry.reload', { detail: { } }) as any) } catch {}
    } catch (e:any) {
      setWarnMsg('삭제 중 오류가 발생했습니다')
    }
  }
  async function onDelete() {
    if (!selected?.id) return
    setConfirmOpen(true)
  }

  return (
    <>
    <section>
      <div className="page-title">
        <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0, flex:'1 1 auto' }}>
          <h2 style={{ margin: 0 }}>문의</h2>
          {/* 상태 프로그레스바 */}
          {(() => {
            const stages = ['신규접수','확인 중','완료']
            const status = String(form.inquiryStatus || '').trim()
            const isHold = status === '보류'
            let idx = stages.indexOf(status)
            if (isHold) idx = 1
            if (idx < 0) idx = 0
            const percent = Math.max(0, Math.min(100, Math.round((idx) / Math.max(1, stages.length - 1) * 100)))
            return (
              <div style={{ display:'flex', flexDirection:'column', gap:4, flex: '0 1 520px' }}>
                <div className="progress" style={{ width: 'min(520px, 48vw)' }}>
                  <div className="progress-bar" style={{ width: `${percent}%`, background: isHold ? '#ef4444' : 'var(--accent)' }} />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', width: 'min(520px, 48vw)', fontSize: 11, color: 'var(--muted)' }}>
                  {stages.map((s) => (
                    <span key={s} style={{ fontWeight: status === s ? 700 as any : 400 }}>{s}</span>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
        <div className="controls" style={{ gap: 8 }}>
          <button className="btn" onClick={() => setShowNew(true)}>신규 등록</button>
        </div>
      </div>
      {customerLookupOpen && (
        <CustomerLookupModal
          defaultQuery={form.customerName}
          onClose={()=>setCustomerLookupOpen(false)}
          onSelect={(row)=>{ change('customerSeq', row.customerSeq ? String(row.customerSeq) : ''); change('customerName', row.customerName || ''); setCustomerLookupOpen(false) }}
        />
      )}
      {leadLookupOpen && (
        <LeadLookupModal
          defaultQuery={form.leadName}
          onClose={()=>setLeadLookupOpen(false)}
          onSelect={(row)=>{ change('leadId', row.id != null ? String(row.id) : ''); change('leadName', row.companyName || ''); setLeadLookupOpen(false) }}
        />
      )}
      {employeeLookupOpen && (
        <EmployeeLookupModal
          defaultQuery={form.assigneeName}
          onClose={()=>setEmployeeLookupOpen(false)}
          onSelect={(row)=>{ change('assigneeId', row.assigneeId || ''); change('assigneeName', row.empName || ''); setEmployeeLookupOpen(false) }}
        />
      )}
      <InquiryList compact maxHeight="21vh" />
      <section className="card" style={{ marginTop: 12, minHeight: 240 }}>
        {details}
      </section>
    </section>
    <InquiryFormModal open={showNew} onClose={() => setShowNew(false)} onSubmit={handleCreate} />
    {/* App modals: warn/confirm/info */}
    <AppModal open={!!warnMsg} onClose={()=>setWarnMsg(null)} width={380}
      footer={<button className="btn" onClick={()=>setWarnMsg(null)}>확인</button>}>
      {warnMsg}
    </AppModal>
    {confirmOpen && (
      <div role="dialog" aria-modal="true" style={{ position:'fixed', inset:0, zIndex:90 }}>
        <div onClick={()=>setConfirmOpen(false)} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.35)' }} />
        <div className="card" style={{ position:'absolute', top:'24%', left:'50%', transform:'translateX(-50%)', width: 380, maxWidth:'92vw', padding: 12 }}>
          <div style={{ padding:'4px 2px', fontSize: 13 }}>선택한 문의를 삭제하시겠습니까?</div>
          <div className="controls" style={{ justifyContent:'flex-end', gap: 8, marginTop: 8 }}>
            <button className="btn" onClick={()=>setConfirmOpen(false)}>취소</button>
            <button className="btn" onClick={()=>{ setConfirmOpen(false); doDelete() }}>삭제</button>
          </div>
        </div>
      </div>
    )}
    {infoMsg && (
      <div role="dialog" aria-modal="true" style={{ position:'fixed', inset:0, zIndex:90 }}>
        <div onClick={()=>setInfoMsg(null)} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.35)' }} />
        <div className="card" style={{ position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)', width: 360, maxWidth:'92vw', padding: 12 }}>
          <div className="page-title" style={{ marginBottom: 8 }}>
            <h3 style={{ margin:0, fontSize: 14 }}>알림</h3>
          </div>
          <div style={{ padding:'4px 2px', fontSize: 13 }}>{infoMsg}</div>
          <div className="controls" style={{ justifyContent:'flex-end', gap: 8, marginTop: 8 }}>
            <button className="btn" onClick={()=>setInfoMsg(null)}>확인</button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

type CustomerRow = { customerSeq?: number | null; customerId?: string | null; customerName?: string | null; telNo?: string | null; addrProvinceName?: string | null; addrCityName?: string | null; companyType?: string | null; ownerName?: string | null }
function CustomerLookupModal({ defaultQuery, onClose, onSelect }: { defaultQuery?: string; onClose: () => void; onSelect: (row: CustomerRow) => void }) {
  const [q, setQ] = useState(defaultQuery || '')
  const [items, setItems] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function search() {
    setLoading(true); setError(null)
    try {
      const url = new URL('/api/v1/customers', window.location.origin)
      if (q.trim()) url.searchParams.set('name', q.trim())
      url.searchParams.set('mineOnly', 'false')
      url.searchParams.set('limit', '100')
      const r = await fetch(url.toString())
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      const list: CustomerRow[] = Array.isArray(data) ? data.map((x:any)=>({
        customerSeq: (x?.customerSeq ?? x?.customer_seq) ?? null,
        customerId: x?.customerId ?? x?.customer_id ?? null,
        customerName: x?.customerName ?? x?.customer_name ?? null,
        telNo: x?.telNo ?? x?.tel_no ?? null,
        addrProvinceName: x?.addrProvinceName ?? x?.addr_province_name ?? null,
        addrCityName: x?.addrCityName ?? x?.addr_city_name ?? null,
        companyType: x?.companyType ?? x?.company_type ?? null,
        ownerName: x?.ownerName ?? x?.owner_name ?? null,
      })) : []
      setItems(list)
    } catch (e:any) { setError(e?.message || '조회 실패'); setItems([]) } finally { setLoading(false) }
  }
  useEffect(()=>{ search() }, [])
  useEffect(()=>{ const onKey=(e:KeyboardEvent)=>{ if(e.key==='Escape'){ e.preventDefault(); onClose() } }; window.addEventListener('keydown', onKey, true); return ()=>window.removeEventListener('keydown', onKey, true) }, [onClose])

  return (
    <div role="dialog" aria-modal="true" style={{ position:'fixed', inset:0, zIndex:1100 }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.4)' }} />
      <div className="card" style={{ position:'absolute', top:'10%', left:'50%', transform:'translateX(-50%)', width:'90%', maxWidth:800, maxHeight:'80%', overflow:'auto', padding:12 }}>
        <button aria-label="닫기" onClick={onClose} className="btn-plain" style={{ position:'absolute', top:8, right:8 }}><img src={closeIcon} className="icon" alt="닫기" /></button>
        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
          <input className="subject-input" placeholder="거래처명" value={q} onChange={(e)=>setQ(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter') search() }} style={{ flex:1 }} />
          <button className="btn" onClick={search}>조회</button>
        </div>
        <div className="table-container" style={{ height:360 }}>
          {items.length===0 ? (<div className="empty-state">{loading? '불러오는 중…' : (error || '결과가 없습니다')}</div>) : (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width:220 }}>거래처명</th>
                  <th style={{ width:140 }}>회사구분</th>
                  <th style={{ width:140 }}>대표자명</th>
                  <th style={{ width:180 }}>지역</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it,idx)=> (
                  <tr key={idx} onDoubleClick={()=>onSelect(it)} onClick={()=>onSelect(it)}>
                    <td>{it.customerName||''}</td>
                    <td>{it.companyType||''}</td>
                    <td>{it.ownerName||''}</td>
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

type LeadRow = { id?: number | null; companyName?: string | null; leadStatus?: string | null; ownerName?: string | null; addrProvinceName?: string | null }
function LeadLookupModal({ defaultQuery, onClose, onSelect }: { defaultQuery?: string; onClose: () => void; onSelect: (row: LeadRow) => void }) {
  const [q, setQ] = useState(defaultQuery || '')
  const [items, setItems] = useState<LeadRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function search(){
    setLoading(true); setError(null)
    try{ const url=new URL('/api/v1/leads', window.location.origin); if(q.trim()) url.searchParams.set('company_name', q.trim()); url.searchParams.set('limit','100'); const r=await fetch(url.toString()); if(!r.ok) throw new Error(`HTTP ${r.status}`); const data=await r.json(); const list:Array<LeadRow>=Array.isArray(data)?data.map((x:any)=>({ id:x?.id!=null?Number(x.id):null, companyName:x?.company_name??null, leadStatus:x?.lead_status??null, ownerName:(x as any)?.owner_name??null, addrProvinceName:x?.addr_province_name??null })):[]; setItems(list)}
    catch(e:any){ setError(e?.message||'조회 실패'); setItems([])} finally{ setLoading(false)} }
  useEffect(()=>{ search() }, [])
  useEffect(()=>{ const onKey=(e:KeyboardEvent)=>{ if(e.key==='Escape'){ e.preventDefault(); onClose() } }; window.addEventListener('keydown', onKey, true); return ()=>window.removeEventListener('keydown', onKey, true) }, [onClose])
  return (
    <div role="dialog" aria-modal="true" style={{ position:'fixed', inset:0, zIndex:1100 }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.4)' }} />
      <div className="card" style={{ position:'absolute', top:'10%', left:'50%', transform:'translateX(-50%)', width:'90%', maxWidth:800, maxHeight:'80%', overflow:'auto', padding:12 }}>
        <button aria-label="닫기" onClick={onClose} className="btn-plain" style={{ position:'absolute', top:8, right:8 }}><img src={closeIcon} className="icon" alt="닫기" /></button>
        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
          <input className="subject-input" placeholder="잠재고객명" value={q} onChange={(e)=>setQ(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter') search() }} style={{ flex:1 }} />
          <button className="btn" onClick={search}>조회</button>
        </div>
        <div className="table-container" style={{ height:360 }}>
          {items.length===0 ? (<div className="empty-state">{loading? '불러오는 중…' : (error || '결과가 없습니다')}</div>) : (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width:220 }}>잠재고객명</th>
                  <th style={{ width:120 }}>상태</th>
                  <th style={{ width:140 }}>소유자</th>
                  <th style={{ width:160 }}>지역</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it,idx)=> (
                  <tr key={idx} onDoubleClick={()=>onSelect(it)} onClick={()=>onSelect(it)}>
                    <td>{it.companyName||''}</td>
                    <td>{it.leadStatus||''}</td>
                    <td>{it.ownerName||''}</td>
                    <td>{it.addrProvinceName||''}</td>
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
  async function search(){ setLoading(true); setError(null); try{ const url=new URL('/api/v1/employees', window.location.origin); url.searchParams.set('depts','all'); const r=await fetch(url.toString()); if(!r.ok) throw new Error(`HTTP ${r.status}`); const data=await r.json(); const list = Array.isArray(data)? data.map((x:any)=>({ empId:x?.emp_id??null, empName:x?.emp_name??null, deptName:x?.dept_name??null, assigneeId:x?.assignee_id??null })) : []; const norm=q.trim().toLowerCase(); const filtered=(norm? list.filter((it:any)=>(it.empName||'').toLowerCase().includes(norm)||(it.empId||'').toLowerCase().includes(norm)||(it.deptName||'').toLowerCase().includes(norm)) : list).sort((a:any,b:any)=> (a.empName||'').localeCompare(b.empName||'', 'ko', { sensitivity:'base' })); setItems(filtered)} catch(e:any){ setError(e?.message||'조회 실패'); setItems([]) } finally{ setLoading(false) } }
  useEffect(()=>{ search() }, [])
  useEffect(()=>{ const onKey=(e:KeyboardEvent)=>{ if(e.key==='Escape'){ e.preventDefault(); onClose() } }; window.addEventListener('keydown', onKey, true); return ()=>window.removeEventListener('keydown', onKey, true) }, [onClose])
  return (
    <div role="dialog" aria-modal="true" style={{ position:'fixed', inset:0, zIndex:1100 }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.4)' }} />
      <div className="card" style={{ position:'absolute', top:'10%', left:'50%', transform:'translateX(-50%)', width:'90%', maxWidth:700, maxHeight:'80%', overflow:'auto', padding:12 }}>
        <button aria-label="닫기" onClick={onClose} className="btn-plain" style={{ position:'absolute', top:8, right:8 }}><img src={closeIcon} className="icon" alt="닫기" /></button>
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
