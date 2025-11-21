import React, { useEffect, useMemo, useState } from 'react'

export type InquiryRow = {
  id: number
  title?: string
  customerSeq?: number | null
  customerName?: string | null
  inquiryStatus?: string
  assigneeSeq?: number | null
  assigneeName?: string | null
  assigneeId?: string | null
  openedAt?: string
  updatedAt?: string
  inquiryCategory?: string
  ownerSeq?: number | null
  ownerName?: string | null
  channel?: string
  contactSeq?: number | null
  contactName?: string | null
  leadId?: string
  severity?: string
  closedAt?: string
  inquiryContent?: string
  answerContent?: string
}

export function InquiryList({ compact = false, maxHeight }: { compact?: boolean; maxHeight?: string }) {
  const [items, setItems] = useState<InquiryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bubble, setBubble] = useState<{ open: boolean; x: number; y: number; row?: InquiryRow }>({ open: false, x: 0, y: 0 })
  const [activeId, setActiveId] = useState<number | null>(() => {
    try { const raw = localStorage.getItem('tnt.sales.selectedInquiry'); if (raw) { const o = JSON.parse(raw); const v = Number(o?.id); return Number.isFinite(v) ? v : null } } catch {}
    return null
  })

  async function load(targetId?: number | null) {
    setError(null)
    setLoading(true)
    try {
      // Read only from inquiry API (no fallbacks, no samples)
      let data: any[] | null = null
      try {
        const r = await fetch('/api/v1/inquiries')
        if (r.ok) { data = await r.json() }
      } catch {}
      let list: InquiryRow[] = []
      if (Array.isArray(data)) {
        list = data.map((x: any, i: number) => ({
          id: Number(x?.id ?? i + 1),
          title: x?.title != null ? String(x.title) : '',
          customerSeq: x?.customerSeq != null ? Number(x.customerSeq) : (x?.customer_seq != null ? Number(x.customer_seq) : null),
          customerName: x?.customerName ?? x?.customer_name ?? null,
          inquiryStatus: x?.inquiryStatus ?? x?.inquiry_status ?? x?.status ?? '',
          assigneeSeq: x?.assigneeSeq != null ? Number(x.assigneeSeq) : (x?.assignee_seq != null ? Number(x.assignee_seq) : null),
          assigneeName: x?.assigneeName ?? x?.assignee_name ?? null,
          assigneeId: x?.assigneeId ?? x?.assignee_id ?? null,
          openedAt: x?.openedAt ?? x?.opened_at ?? '',
          updatedAt: x?.updatedAt ?? x?.updated_at ?? '',
          inquiryCategory: x?.inquiryCategory ?? x?.inquiry_category ?? '',
          ownerSeq: x?.ownerSeq != null ? Number(x.ownerSeq) : (x?.owner_seq != null ? Number(x.owner_seq) : null),
          ownerName: x?.ownerName ?? x?.owner_name ?? null,
          channel: x?.channel ?? '',
          contactSeq: x?.contactSeq != null ? Number(x.contactSeq) : (x?.contact_seq != null ? Number(x.contact_seq) : null),
          contactName: x?.contactName ?? x?.contact_name ?? null,
          leadId: x?.leadId ?? '',
          severity: x?.severity ?? '',
          closedAt: x?.closedAt ?? x?.closed_at ?? '',
          inquiryContent: x?.inquiryContent ?? x?.inquiry_content ?? '',
          answerContent: x?.answerContent ?? x?.answer_content ?? '',
        }))
      } else {
        list = []
      }
      // sort by updatedAt desc then title
      list.sort((a, b) => {
        const ta = a.updatedAt ? Date.parse(a.updatedAt as any) : 0
        const tb = b.updatedAt ? Date.parse(b.updatedAt as any) : 0
        if (tb !== ta) return tb - ta
        return (a.title || '').localeCompare(b.title || '', 'ko', { sensitivity: 'base' })
      })
      setItems(list)
      if (targetId != null) {
        const row = list.find(r => r.id === targetId)
        if (row) { select(row); return }
      }
      if (list.length > 0 && activeId == null) {
        select(list[0])
      }
    } catch (e: any) {
      setError(e?.message || '조회 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const fn = (e: any) => {
      const fid = e?.detail?.focusId != null ? Number(e.detail.focusId) : null
      load(fid)
    }
    window.addEventListener('tnt.sales.inquiry.reload' as any, fn)
    return () => window.removeEventListener('tnt.sales.inquiry.reload' as any, fn)
  }, [])

  function select(row: InquiryRow) {
    setActiveId(row.id)
    try {
      localStorage.setItem('tnt.sales.selectedInquiry', JSON.stringify(row))
      window.dispatchEvent(new CustomEvent('tnt.sales.inquiry.selected', { detail: { inquiry: row } }) as any)
    } catch {}
  }

  const table = useMemo(() => (
    <div
      className="table-container"
      style={{
        height: maxHeight ?? (compact ? '32vh' : undefined),
        maxHeight: maxHeight ?? (compact ? '32vh' : undefined),
      }}
    >
      {items.length === 0 ? (
        <div className="empty-state">{loading ? '불러오는 중…' : (error || '데이터가 없습니다')}</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>제목</th>
              <th style={{ width: 200 }}>거래처명</th>
              <th style={{ width: 120 }}>문의유형</th>
              <th style={{ width: 120 }}>접수자</th>
              <th style={{ width: 120 }}>당사담당자</th>
              <th style={{ width: 160 }}>접수시간</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const isDelayed = (() => {
                const st = String(it.inquiryStatus || '').trim()
                if (st === '완료') return false
                const t = it.openedAt ? Date.parse(it.openedAt as any) : NaN
                if (!Number.isFinite(t)) return false
                return t <= (Date.now() - 24*60*60*1000)
              })()
              return (
              <tr
                key={idx}
                className={activeId === it.id ? 'selected' : undefined}
                onClick={() => select(it)}
                onMouseEnter={(e) => setBubble({ open: true, x: e.clientX + 8, y: e.clientY + 8, row: it })}
                onMouseMove={(e) => setBubble((b) => ({ ...b, x: e.clientX + 8, y: e.clientY + 8 }))}
                onMouseLeave={() => setBubble({ open: false, x: 0, y: 0 })}
                style={isDelayed ? { color: '#ef4444' } : undefined}
              >
                <td>{it.title || ''}</td>
                <td>{it.customerName || (it.customerSeq != null ? String(it.customerSeq) : '')}</td>
                <td>{it.inquiryCategory || ''}</td>
                <td>{it.ownerName || (it.ownerSeq != null ? String(it.ownerSeq) : '')}</td>
                <td>{it.assigneeName || (it.assigneeSeq != null ? String(it.assigneeSeq) : '')}</td>
                <td>{it.openedAt ? (()=>{ const d=new Date(it.openedAt as any); if(isNaN(d.getTime())) return it.openedAt as any; const yy=String(d.getFullYear()%100).padStart(2,'0'); const mm=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); const hh=String(d.getHours()).padStart(2,'0'); const mi=String(d.getMinutes()).padStart(2,'0'); return `${yy}-${mm}-${dd} ${hh}:${mi}` })() : ''}</td>
              </tr>
            )})}
          </tbody>
        </table>
      )}
      {bubble.open && bubble.row && (
        <div
          role="dialog"
          aria-label="문의 상세"
          style={{
            position: 'fixed',
            left: Math.min(bubble.x, (typeof window!=='undefined'?window.innerWidth:1200) - 420),
            top: Math.min(bubble.y, (typeof window!=='undefined'?window.innerHeight:800) - 320),
            zIndex: 9999,
            maxWidth: 400,
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
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{bubble.row.title || '(문의)'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', columnGap: 8, rowGap: 4 }}>
            <span className="muted">거래처</span><span>{bubble.row.customerName || (bubble.row.customerSeq != null ? String(bubble.row.customerSeq) : '')}</span>
            <span className="muted">문의유형</span><span>{bubble.row.inquiryCategory || ''}</span>
            <span className="muted">상태</span><span>{bubble.row.inquiryStatus || ''}</span>
            <span className="muted">난이도</span><span>{bubble.row.severity || ''}</span>
            <span className="muted">접수자</span><span>{bubble.row.ownerName || (bubble.row.ownerSeq != null ? String(bubble.row.ownerSeq) : '')}</span>
            <span className="muted">당사담당자</span><span>{bubble.row.assigneeName || (bubble.row.assigneeSeq != null ? String(bubble.row.assigneeSeq) : '')}</span>
            <span className="muted">리드ID</span><span>{bubble.row.leadId || ''}</span>
            <span className="muted">채널</span><span>{bubble.row.channel || ''}</span>
            <span className="muted">접수시각</span><span>{bubble.row.openedAt ? (()=>{ const d=new Date(bubble.row.openedAt as any); if(isNaN(d.getTime())) return String(bubble.row.openedAt); const yy=String(d.getFullYear()%100).padStart(2,'0'); const mm=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); const hh=String(d.getHours()).padStart(2,'0'); const mi=String(d.getMinutes()).padStart(2,'0'); return `${yy}-${mm}-${dd} ${hh}:${mi}` })() : ''}</span>
            <span className="muted">종료시각</span><span>{bubble.row.closedAt ? (()=>{ const d=new Date(bubble.row.closedAt as any); if(isNaN(d.getTime())) return String(bubble.row.closedAt); const yy=String(d.getFullYear()%100).padStart(2,'0'); const mm=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); const hh=String(d.getHours()).padStart(2,'0'); const mi=String(d.getMinutes()).padStart(2,'0'); return `${yy}-${mm}-${dd} ${hh}:${mi}` })() : ''}</span>
            <span className="muted">문의내용</span><span style={{ whiteSpace: 'pre-wrap' }}>{bubble.row.inquiryContent || ''}</span>
            <span className="muted">답변내용</span><span style={{ whiteSpace: 'pre-wrap' }}>{bubble.row.answerContent || ''}</span>
            <span className="muted">수정시각</span><span>{bubble.row.updatedAt ? (()=>{ const d=new Date(bubble.row.updatedAt as any); if(isNaN(d.getTime())) return String(bubble.row.updatedAt); const yy=String(d.getFullYear()%100).padStart(2,'0'); const mm=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); const hh=String(d.getHours()).padStart(2,'0'); const mi=String(d.getMinutes()).padStart(2,'0'); return `${yy}-${mm}-${dd} ${hh}:${mi}` })() : ''}</span>
            <span className="muted">ID</span><span>{bubble.row.id}</span>
          </div>
        </div>
      )}
    </div>
  ), [items, activeId, loading, error, compact, maxHeight, bubble])

  return table
}
