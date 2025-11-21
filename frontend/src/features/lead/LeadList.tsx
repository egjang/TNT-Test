import React, { useEffect, useMemo, useState } from 'react'

type Lead = {
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
  biz_longitude?: number | null
  biz_latitude?: number | null
  note?: string | null
  last_activity_at?: string | null
  owner_id?: number | null
  owner_name?: string | null
  created_by?: number | null
  created_at: string
  updated_by?: number | null
  updated_at: string
}

export function LeadList({ compact = false, maxHeight }: { compact?: boolean; maxHeight?: string }) {
  const [items, setItems] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<number | null>(() => {
    try { const raw = localStorage.getItem('tnt.sales.selectedLead'); if (raw) { const o = JSON.parse(raw); const v = Number(o?.id); return Number.isFinite(v) ? v : null } } catch {}
    return null
  })

  async function load() {
    setError(null)
    setLoading(true)
    try {
      let data: any[] | null = null
      const endpoints = ['/api/v1/leads']
      for (const ep of endpoints) {
        try {
          const r = await fetch(ep)
          if (r.ok) { data = await r.json(); break }
        } catch {}
      }
      let list: Lead[] = []
      if (Array.isArray(data)) {
        list = data.map((x: any, i: number) => ({
          id: Number(x?.id ?? i + 1),
          lead_status: String(x?.lead_status ?? x?.status ?? ''),
          lead_source: (x?.lead_source ?? x?.source ?? null) as any,
          contact_name: (x?.contact_name ?? x?.name ?? null) as any,
          email: (x?.email ?? null) as any,
          company_name: (x?.company_name ?? x?.account_name ?? null) as any,
          biz_type: (x?.biz_type ?? x?.industry ?? null) as any,
          office_phone: (x?.office_phone ?? x?.main_phone ?? null) as any,
          biz_no: (x?.biz_no ?? x?.biz_reg_no ?? null) as any,
          addr_province_name: (x?.addr_province_name ?? x?.region ?? null) as any,
          address: (x?.address ?? null) as any,
          fax_no: (x?.fax_no ?? x?.fax ?? null) as any,
          contact_phone: (x?.contact_phone ?? x?.mobile ?? null) as any,
          biz_longitude: x?.biz_longitude != null ? Number(x.biz_longitude) : null,
          biz_latitude: x?.biz_latitude != null ? Number(x.biz_latitude) : null,
          note: (x?.note ?? null) as any,
          last_activity_at: (x?.last_activity_at ?? x?.lastActivityAt ?? null) as any,
          owner_id: x?.owner_id != null ? Number(x.owner_id) : null,
          owner_name: (x as any)?.owner_name ?? null,
          created_by: x?.created_by != null ? Number(x.created_by) : null,
          created_at: String(x?.created_at ?? new Date().toISOString()),
          updated_by: x?.updated_by != null ? Number(x.updated_by) : null,
          updated_at: String(x?.updated_at ?? new Date().toISOString()),
        }))
      } else {
        // sample rows
        list = [
          { id: 1, lead_status: 'new', lead_source: 'web', contact_name: '홍길동', email: 'lead1@example.com', company_name: '에이회사', biz_type: '제조', office_phone: '02-1234-5678', biz_no: '123-45-67890', addr_province_name: '서울', address: '강남구...', fax_no: '', contact_phone: '010-1111-2222', biz_longitude: 126.9784, biz_latitude: 37.5665, note: '', last_activity_at: '2025-01-02T09:00:00Z', owner_id: 1001, created_by: 1001, created_at: new Date().toISOString(), updated_by: 1001, updated_at: new Date().toISOString() },
          { id: 2, lead_status: 'contacted', lead_source: 'referral', contact_name: '이순신', email: 'lead2@example.com', company_name: '비회사', biz_type: '도소매', office_phone: '031-123-4567', biz_no: '987-65-43210', addr_province_name: '경기', address: '성남시...', fax_no: '', contact_phone: '010-3333-4444', biz_longitude: 127.0, biz_latitude: 37.4, note: '', last_activity_at: '2025-01-05T10:00:00Z', owner_id: 1002, created_by: 1002, created_at: new Date().toISOString(), updated_by: 1002, updated_at: new Date().toISOString() },
        ]
      }
      // sort by company_name asc
      list.sort((a, b) => (a.company_name || '').localeCompare(b.company_name || '', 'ko', { sensitivity: 'base' }))
      setItems(list)
      if (list.length > 0 && activeId == null) select(list[0])
    } catch (e: any) {
      setError(e?.message || '조회 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function select(row: Lead) {
    setActiveId(row.id)
    try {
      localStorage.setItem('tnt.sales.selectedLead', JSON.stringify(row))
      window.dispatchEvent(new CustomEvent('tnt.sales.lead.selected', { detail: { lead: row } }) as any)
    } catch {}
  }

  const table = useMemo(() => {
    const desired = maxHeight ?? (compact ? '32vh' : undefined)
    return (
    <div className="table-container" style={{ height: desired, minHeight: desired, maxHeight: desired, overflow: 'auto' }}>
      {items.length === 0 ? (
        <div className="empty-state">{loading ? '불러오는 중…' : (error || '데이터가 없습니다')}</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 80 }}>ID</th>
              <th style={{ width: 120 }}>상태</th>
              <th style={{ width: 140 }}>소스</th>
              <th style={{ width: 160 }}>회사</th>
              <th style={{ width: 140 }}>거래처 담당자</th>
              <th style={{ width: 200 }}>이메일</th>
              <th style={{ width: 120 }}>소유자</th>
              <th style={{ width: 180 }}>최근활동</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className={activeId === it.id ? 'selected' : undefined} onClick={() => select(it)}>
                <td>{it.id}</td>
                <td>{it.lead_status}</td>
                <td>{it.lead_source || ''}</td>
                <td>{it.company_name || ''}</td>
                <td>{it.contact_name || ''}</td>
                <td>{it.email || ''}</td>
                <td>{it.owner_name || (it.owner_id ?? '')}</td>
                <td>{it.last_activity_at || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )}, [items, activeId, loading, error, compact, maxHeight])

  return table
}
