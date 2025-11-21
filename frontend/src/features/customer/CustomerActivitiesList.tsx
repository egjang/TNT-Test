import React, { useEffect, useMemo, useRef, useState } from 'react'

function fmt(input?: string | Date | null): string {
  if (!input) return ''
  const d = input instanceof Date ? input : new Date(input)
  if (isNaN(d.getTime())) return ''
  const yy = String(d.getFullYear() % 100).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yy}-${mm}-${dd} ${hh}:${mi}`
}

type Row = {
  id: number
  subject?: string
  description?: string
  activityType?: string
  activityStatus?: string
  channel?: string
  parentSubject?: string
  parentSeq?: number
  plannedStartAt?: string
  plannedEndAt?: string
  createdAt?: string
  customerName?: string
}

export function CustomerActivitiesList({ customerSeq, customerId, hideHeader = false, hideRefresh = false, enableContextMenu = false }: { customerSeq: number; customerId?: string; hideHeader?: boolean; hideRefresh?: boolean; enableContextMenu?: boolean }) {
  const [items, setItems] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [menu, setMenu] = useState<{ open: boolean; x: number; y: number; row?: Row }>({ open: false, x: 0, y: 0 })
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [related, setRelated] = useState<Row[] | null>(null)

  async function load() {
    setError(null)
    setLoading(true)
    try {
      const url = new URL('/api/v1/sales-activities', window.location.origin)
      url.searchParams.set('mineOnly', 'false')
      // Match by customer_id for account linkage
      const acctId = (customerId && customerId.trim()) || (() => {
        try { const raw = localStorage.getItem('tnt.sales.selectedCustomer'); if (raw) { const obj = JSON.parse(raw); return obj?.customerId || '' } } catch {}
        return ''
      })()
      url.searchParams.set('sfAccountId', acctId || '')
      const res = await fetch(url.toString())
      if (!res.ok) {
        let msg = `HTTP ${res.status}`
        try { const d = await res.json(); if (d?.error) msg = d.error } catch {}
        throw new Error(msg)
      }
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setError(e.message || '조회 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (customerSeq) load() }, [customerSeq, customerId])

  // Related activities by parentSeq
  async function loadRelated(parentSeq: number) {
    try {
      const url = new URL('/api/v1/sales-activities', window.location.origin)
      url.searchParams.set('mineOnly', 'false')
      const acctId = (customerId && customerId.trim()) || (() => {
        try { const raw = localStorage.getItem('tnt.sales.selectedCustomer'); if (raw) { const obj = JSON.parse(raw); return obj?.customerId || '' } } catch {}
        return ''
      })()
      url.searchParams.set('sfAccountId', acctId || '')
      url.searchParams.set('parentSeq', String(parentSeq))
      url.searchParams.set('includeParent', 'true')
      const res = await fetch(url.toString())
      if (!res.ok) return
      const data = await res.json()
      const arr: Row[] = Array.isArray(data) ? data as Row[] : []
      // Sort: parent row first (parentSeq absent), then children by createdAt desc
      arr.sort((a, b) => {
        const ap = !a.parentSeq, bp = !b.parentSeq
        if (ap && !bp) return -1
        if (!ap && bp) return 1
        const da = a.createdAt ? new Date(a.createdAt as any).getTime() : 0
        const db = b.createdAt ? new Date(b.createdAt as any).getTime() : 0
        return db - da
      })
      setRelated(arr)
    } catch {
      setRelated([])
    }
  }

  // Close context menu outside click
  useEffect(() => {
    if (!menu.open) return
    const onDoc = (e: MouseEvent) => {
      // Close only on primary button clicks outside the menu
      if (e.button !== 0) return
      const target = e.target as Node | null
      if (menuRef.current && target && menuRef.current.contains(target)) return
      setMenu({ open: false, x: 0, y: 0 })
    }
    window.addEventListener('mousedown', onDoc, true)
    return () => window.removeEventListener('mousedown', onDoc, true)
  }, [menu.open])

  // Close context menu with ESC key while open (capture phase to avoid being swallowed)
  useEffect(() => {
    if (!menu.open) return
    const onKey = (e: any) => {
      const isEsc = e?.key === 'Escape' || e?.key === 'Esc' || e?.keyCode === 27
      if (isEsc) setMenu({ open: false, x: 0, y: 0 })
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [menu.open])

  // Close related modal with ESC key
  useEffect(() => {
    if (!related) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setRelated(null)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [related])

  const toKo = (v?: string, kind?: 'type'|'status'|'channel') => {
    if (!v) return ''
    if (kind === 'type') {
      const map: Record<string,string> = { site_visit:'정기방문', opportunity:'영업기회', AR_mgmt:'채권관리', meeting:'미팅', call:'전화', email:'이메일', demo:'데모', task:'업무', other:'기타' }
      return map[v] || v
    }
    if (kind === 'status') {
      const map: Record<string,string> = { scheduled:'계획', completed:'완료', canceled:'취소', postponed:'연기', no_show:'미방문' }
      return map[v] || v
    }
    if (kind === 'channel') {
      const map: Record<string,string> = { in_person:'방문', phone:'전화', email:'문자/메일/팩스', other:'기타', video:'영상', chat:'채팅', sms:'문자' }
      return map[v] || v
    }
    return v
  }

  const buildBubble = (it: Row) => {
    const lines = [
      `제목: ${it.subject || ''}`,
      `활동설명: ${it.description || ''}`,
      `활동유형: ${toKo(it.activityType, 'type')}`,
      `활동방법: ${toKo(it.channel, 'channel')}`,
      `상태: ${toKo(it.activityStatus, 'status')}`,
      `상위활동: ${it.parentSubject || ''}`,
      `계획 일시: ${fmt(it.plannedStartAt)}`,
      `종료 일시: ${fmt(it.plannedEndAt)}`,
      `생성일시: ${fmt(it.createdAt)}`,
      (it.customerName ? `거래처명: ${it.customerName}` : ''),
    ].filter(Boolean)
    return lines.join('\n')
  }

  const table = useMemo(() => (
    <>
      {!hideHeader && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <div className="muted">{/* 라벨 숨김 요청: 공백 유지 */}</div>
          <div className="muted count-text">총 {items.length}건</div>
        </div>
      )}
      <div className="table-container">
      {items.length === 0 ? (
        <div className="empty-state">활동이 없습니다.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 240 }}>제목</th>
              <th style={{ width: 280 }}>활동설명</th>
              <th style={{ width: 120 }}>활동유형</th>
              <th style={{ width: 120 }}>활동방법</th>
              <th style={{ width: 120 }}>상태</th>
              <th style={{ width: 220 }}>상위활동</th>
              <th style={{ width: 180 }}>계획 일시</th>
              <th style={{ width: 180 }}>종료 일시</th>
              <th style={{ width: 180 }}>생성일시</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr
                key={i}
                title={buildBubble(it)}
                onContextMenu={(e) => {
                  if (!enableContextMenu) return
                  // Only show bubble menu when the activity has a parent
                  if (!it.parentSeq) return
                  e.preventDefault(); e.stopPropagation()
                  setMenu({ open: true, x: e.clientX, y: e.clientY, row: it })
                }}
              >
                <td>{it.subject || ''}</td>
                <td
                  title={it.description || ''}
                  style={{ maxWidth: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {it.description || ''}
                </td>
                <td>{toKo(it.activityType, 'type')}</td>
                <td>{toKo(it.channel, 'channel')}</td>
                <td>{toKo(it.activityStatus, 'status')}</td>
                <td>{it.parentSubject || ''}</td>
                <td>{fmt(it.plannedStartAt)}</td>
                <td>{fmt(it.plannedEndAt)}</td>
                <td>{fmt(it.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      </div>
    </>
  ), [items])

  return (
    <section>
      {!hideRefresh && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn" onClick={load} disabled={loading}>{loading ? '새로고침…' : '새로고침'}</button>
          {error && <span className="error">{error}</span>}
        </div>
      )}
      {hideRefresh && error && <div className="error">{error}</div>}
      <div style={{ marginTop: 12 }}>{table}</div>
      {menu.open && (
        <div ref={menuRef} className="context-menu" style={{ left: menu.x + 4, top: menu.y + 4 }} onClick={(e) => e.stopPropagation()}>
          <button
            className="context-item"
            onClick={() => {
              // If parentSeq exists, load siblings + parent; otherwise assume current as parent to fetch children
              if (menu.row?.parentSeq) { loadRelated(menu.row.parentSeq) }
              else if (menu.row?.id) { loadRelated(menu.row.id) }
              setMenu({ open: false, x: 0, y: 0 })
            }}
          >
            관련활동
          </button>
          
        </div>
      )}
      {related && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,.4)'
          }}
          onClick={() => setRelated(null)}
        >
          <div
            className="card"
            style={{
              width: 'min(1200px, 92vw)',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: 16,
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="list-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  focusable="false"
                  style={{ color: '#555' }}
                >
                  <circle cx="6" cy="6" r="3" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="18" cy="6" r="3" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="12" cy="18" r="3" stroke="currentColor" strokeWidth="1.8" />
                  <line x1="8.5" y1="7.4" x2="15.5" y2="7.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <line x1="7.2" y1="8.9" x2="10.8" y2="15.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <line x1="16.8" y1="8.9" x2="13.2" y2="15.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <span style={{ fontWeight: 600, fontSize: 14 }}>관련활동</span>
                <span className="muted count-text" style={{ marginLeft: 8 }}>총 {related.length}건</span>
              </div>
              <button
                onClick={() => setRelated(null)}
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
              >
                ×
              </button>
            </div>
            <div className="table-container">
              {related.length === 0 ? (
                <div className="empty-state">관련활동이 없습니다.</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 200 }}>상위활동</th>
                      <th style={{ width: 240 }}>제목</th>
                      <th style={{ width: 280 }}>활동설명</th>
                      <th style={{ width: 120 }}>활동유형</th>
                      <th style={{ width: 120 }}>활동방법</th>
                      <th style={{ width: 120 }}>상태</th>
                      <th style={{ width: 180 }}>계획 일시</th>
                      <th style={{ width: 180 }}>종료 일시</th>
                      <th style={{ width: 180 }}>생성일시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {related.map((it, i) => (
                      <tr key={`rel-${i}`} title={buildBubble(it)} className={!it.parentSeq ? 'row-parent' : undefined}>
                        <td>{it.parentSubject || ''}</td>
                        <td>{it.subject || ''}</td>
                        <td style={{ maxWidth: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.description || ''}</td>
                        <td>{toKo(it.activityType, 'type')}</td>
                        <td>{toKo(it.channel, 'channel')}</td>
                        <td>{toKo(it.activityStatus, 'status')}</td>
                        <td>{fmt(it.plannedStartAt)}</td>
                        <td>{fmt(it.plannedEndAt)}</td>
                        <td>{fmt(it.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
