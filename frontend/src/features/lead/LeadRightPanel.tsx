import React, { useEffect, useMemo, useState } from 'react'
import phoneIcon from '../../assets/icons/phone.svg'

type LeadRow = {
  id: number
  lead_status: string
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
  note?: string | null
  last_activity_at?: string | null
  has_activity?: boolean | null
  owner_id?: number | null
  owner_name?: string | null
  created_by?: number | null
  created_at?: string | null
  updated_by?: number | null
  updated_at?: string | null
}

export function LeadRightPanel() {
  // 검색 상태
  const [owner, setOwner] = useState<string>(() => {
    try {
      const aid = localStorage.getItem('tnt.sales.assigneeId') || ''
      return aid || ''
    } catch { return '' }
  }) // 선택된 소유자(assignee_id)
  const [owners, setOwners] = useState<Array<{ emp_id: string; emp_name: string; dept_name: string; assignee_id: string }>>([])
  const [contactChecked, setContactChecked] = useState(false) // 통화여부
  const [ownerChecked, setOwnerChecked] = useState(false) // 소유자확인 (추후개발)
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [status, setStatus] = useState('')
  const [region, setRegion] = useState('')

  const [items, setItems] = useState<LeadRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bubble, setBubble] = useState<{ open: boolean; x: number; y: number; row?: LeadRow }>({ open: false, x: 0, y: 0 })
  const [activeId, setActiveId] = useState<number | null>(null)
  const [lastInput, setLastInput] = useState<'mouse' | 'keyboard'>('mouse')

  // Track last input modality to avoid reopening bubble on mouse-triggered focus
  useEffect(() => {
    const onMouse = () => setLastInput('mouse')
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Tab' || e.key === 'Shift' || e.key === 'ArrowDown' || e.key === 'ArrowUp') setLastInput('keyboard') }
    window.addEventListener('mousedown', onMouse, true)
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('mousedown', onMouse, true)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (companyName.trim()) params.set('company_name', companyName.trim())
      if (contactName.trim()) params.set('contact_name', contactName.trim())
      if (status.trim()) params.set('lead_status', status.trim())
      if (region.trim()) params.set('region', region.trim())
      // assignee_id 필터 전달 (lead.assignee_id 기준)
      if (owner && owner.trim()) params.set('assignee_id', owner.trim())
      if (ownerChecked) params.set('lead_status', '영업 접촉 중')
      if (contactChecked) params.set('has_sales_activity', 'true')

      const res = await fetch(`/api/v1/leads?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        let list: LeadRow[] = data.map((x: any) => ({
          id: Number(x?.id),
          lead_status: String(x?.lead_status ?? ''),
          lead_source: x?.lead_source ?? null,
          contact_name: x?.contact_name ?? null,
          email: x?.email ?? null,
          company_name: x?.company_name ?? null,
          biz_type: x?.biz_type ?? null,
          office_phone: x?.office_phone ?? null,
          biz_no: x?.biz_no ?? null,
          addr_province_name: x?.addr_province_name ?? null,
          address: x?.address ?? null,
          fax_no: x?.fax_no ?? null,
          contact_phone: x?.contact_phone ?? null,
          note: x?.note ?? null,
          last_activity_at: x?.last_activity_at ?? null,
          has_activity: (x as any)?.has_activity === true,
          owner_id: x?.owner_id != null ? Number(x.owner_id) : null,
          owner_name: (x as any)?.owner_name ?? null,
          created_by: (x?.created_by ?? null) as any,
          created_at: x?.created_at ? String(x.created_at) : null,
          updated_by: (x?.updated_by ?? null) as any,
          updated_at: x?.updated_at ? String(x.updated_at) : null,
          // carry-through names when present
          created_by_name: (x as any)?.created_by_name ?? null,
          updated_by_name: (x as any)?.updated_by_name ?? null,
        }))
        if (contactChecked) {
          list = list.filter((it) => !!((it as any).has_activity === true || it.last_activity_at))
        }
        list.sort((a, b) => {
          const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0
          const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0
          return tb - ta
        })
        setItems(list)
        // 처음 로드시 자동 선택하지 않음. 사용자가 행을 클릭할 때까지 대기.
        setActiveId((prev) => (list.some(it => it.id === prev) ? prev : null))
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

  useEffect(() => { load() }, [])
  // 처음 진입 시 버퍼(직전 선택) 제거 → 비어있는 상태로 시작
  useEffect(() => { try { localStorage.removeItem('tnt.sales.selectedLead') } catch {} }, [])

  // 소유자 목록 로드 (영업1/2 본부/팀)
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
          // If owner is empty, pick logged-in assignee by default when present in list
          if (!owner) {
            try {
              const aid = localStorage.getItem('tnt.sales.assigneeId') || ''
              if (aid && data.some((o: any) => String(o?.assignee_id) === String(aid))) {
                setOwner(aid)
              }
            } catch {}
          }
        }
      } catch {}
    })()
  }, [])

  // Refresh list after a lead is updated elsewhere (center form)
  useEffect(() => {
    function onUpdated() { load() }
    window.addEventListener('tnt.sales.lead.updated' as any, onUpdated)
    return () => window.removeEventListener('tnt.sales.lead.updated' as any, onUpdated)
  }, [companyName, contactName, status, region, owner])

  function select(row: LeadRow) {
    setActiveId(row.id)
    try {
      localStorage.setItem('tnt.sales.selectedLead', JSON.stringify(row))
      window.dispatchEvent(new CustomEvent('tnt.sales.lead.selected', { detail: { lead: row } }) as any)
    } catch {}
  }

  function formatKoDate(input?: string | null): string {
    if (!input) return ''
    const d = new Date(input)
    if (isNaN(d.getTime())) return String(input)
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    }).format(d)
  }

  const result = useMemo(() => (
    <div className="table-container" style={{ height: 'calc(100% - 120px)', minHeight: 160, overflow: 'auto' }}>
      {items.length === 0 ? (
        <div className="empty-state">{loading ? '불러오는 중…' : (error || '결과가 없습니다')}</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 120 }}>상태</th>
              <th style={{ width: 60 }}>활동</th>
              <th style={{ width: 200 }}>회사</th>
              <th style={{ width: 120 }}>지역</th>
              <th style={{ width: 140 }}>업종</th>
              <th style={{ width: 140 }}>소유자</th>
              <th style={{ width: 160 }}>거래처담당자</th>
              <th style={{ width: 140 }}>소스</th>
            </tr>
          </thead>
          <tbody>
              {items.map((it) => {
                const hasOwner = !!((it as any).owner_name) || (it.owner_id != null)
                const st = String(it.lead_status || '')
                const stNorm = st.replace(/\s+/g, '')
                const highlight = hasOwner && (stNorm === '신규등록' || stNorm === '접촉중')
                return (
                <tr
                  key={it.id}
                  tabIndex={0}
                  className={activeId === it.id ? 'selected' : undefined}
                  onClick={() => { select(it); setBubble({ open: false, x: 0, y: 0 }) }}
                  onMouseEnter={(e) => setBubble({ open: true, x: e.clientX + 8, y: e.clientY + 8, row: it })}
                  onMouseMove={(e) => setBubble((b) => ({ ...b, x: e.clientX + 8, y: e.clientY + 8 }))}
                  onMouseLeave={() => setBubble({ open: false, x: 0, y: 0 })}
                  style={highlight ? { color: '#ef4444' } : undefined}
                >
                  <td>{it.lead_status}</td>
                  <td>{((it as any).has_activity === true || !!it.last_activity_at) ? <img className="icon" src={phoneIcon} alt="활동" title="최근 활동 있음" /> : ''}</td>
                  <td>{it.company_name || ''}</td>
                  <td>{it.addr_province_name || ''}</td>
                  <td>{it.biz_type || ''}</td>
                  <td>{(it as any).owner_name || (it.owner_id ?? '')}</td>
                  <td>{it.contact_name || ''}</td>
                  <td>{it.lead_source || ''}</td>
                </tr>
              )})}
          </tbody>
        </table>
      )}
      {bubble.open && bubble.row && (
        <div
          role="dialog"
          aria-label="리드 상세"
          style={{
            position: 'fixed',
            left: Math.min(bubble.x, window.innerWidth - 380),
            top: Math.min(bubble.y, window.innerHeight - 260),
            zIndex: 9999,
            maxWidth: 360,
            background: 'var(--panel)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: '0 12px 28px rgba(0,0,0,.25)',
            padding: 10,
            fontSize: 12,
            lineHeight: 1.4,
            pointerEvents: 'none'
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{bubble.row.company_name || '(잠재고객)'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', columnGap: 8, rowGap: 4 }}>
            <span className="muted">상태</span><span>{bubble.row.lead_status || ''}</span>
            <span className="muted">소스</span><span>{bubble.row.lead_source || ''}</span>
            <span className="muted">거래처 담당자</span><span>{bubble.row.contact_name || ''}</span>
            <span className="muted">연락처</span><span>{bubble.row.contact_phone || ''}</span>
            <span className="muted">업종</span><span>{bubble.row.biz_type || ''}</span>
            <span className="muted">지역</span><span>{bubble.row.addr_province_name || ''}</span>
            <span className="muted">이메일</span><span>{bubble.row.email || ''}</span>
            <span className="muted">대표번호</span><span>{bubble.row.office_phone || ''}</span>
            <span className="muted">사업자번호</span><span>{bubble.row.biz_no || ''}</span>
            <span className="muted">주소</span><span>{bubble.row.address || ''}</span>
            <span className="muted">비고</span><span>{bubble.row.note || ''}</span>
            <span className="muted">최근활동</span><span>{bubble.row.last_activity_at || ''}</span>
            <span className="muted">소유자</span><span>{(bubble.row as any).owner_name || (bubble.row.owner_id ?? '')}</span>
            <span className="muted">ID</span><span>{bubble.row.id}</span>
            <span className="muted">작성자</span>
            <span>{((bubble.row as any).created_by_name || (bubble.row.created_by ?? ''))}{bubble.row.created_at ? `, ${formatKoDate(bubble.row.created_at)}` : ''}</span>
            <span className="muted">최종 수정자</span>
            <span>{((bubble.row as any).updated_by_name || (bubble.row.updated_by ?? ''))}{bubble.row.updated_at ? `, ${formatKoDate(bubble.row.updated_at)}` : ''}</span>
          </div>
        </div>
      )}
    </div>
  ), [items, loading, error, bubble])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', fontSize: 12 }}>
      <div className="card" style={{ padding: 10 }}>
        {/* Row: Owner + Owner Checked */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'end', marginBottom: 8 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>소유자명</label>
            <select className="search-input" value={owner} onChange={(e) => setOwner(e.target.value)}>
              <option value="">(전체)</option>
              {owners.map(o => (
                <option key={o.assignee_id} value={o.assignee_id}>{o.dept_name} · {o.emp_name}</option>
              ))}
            </select>
          </div>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0 }}>
            <input type="checkbox" checked={contactChecked} onChange={(e) => setContactChecked(e.target.checked)} /> 통화여부
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0 }}>
            <input type="checkbox" checked={ownerChecked} onChange={(e) => setOwnerChecked(e.target.checked)} /> 소유자확인
          </label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="field">
            <input type="text" className="search-input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="잠재고객명" />
          </div>
          <div className="field">
            <input type="text" className="search-input" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="거래처 담당자" />
          </div>
          <div className="field">
            <select className="search-input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">상태</option>
              <option value="신규등록">신규등록</option>
              <option value="자격미달">자격미달</option>
              <option value="접촉 중">접촉 중</option>
              <option value="영업 접촉 중">영업 접촉 중</option>
              <option value="전환성공">전환성공</option>
              <option value="전환실패">전환실패</option>
            </select>
          </div>
          <div className="field">
            <input type="text" className="search-input" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="지역" />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button className="btn" onClick={load}>조회</button>
          <button className="btn" onClick={() => { setOwner(''); setOwnerChecked(false); setCompanyName(''); setContactName(''); setStatus(''); setRegion(''); load() }}>초기화</button>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {result}
      </div>
    </div>
  )
}
