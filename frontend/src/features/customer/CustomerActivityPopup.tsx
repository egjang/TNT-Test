import React from 'react'
import closeIcon from '../../assets/icons/close.svg'
import searchIcon from '../../assets/icons/search.svg'
import { useDraggableModal } from '../../ui/useDraggableModal'

type Row = { id: number; customerId?: string; customerName?: string; ownerName?: string; activityType?: string; subject?: string; description?: string }

export function CustomerActivityPopup({ open, onClose, start, end, initialCustomer }: { open: boolean; onClose: () => void; start: Date; end: Date; initialCustomer?: { customerId?: string | null; customerName?: string | null; ownerName?: string | null } }) {
  const [rows, setRows] = React.useState<Row[]>([])
  useSeedInitialCustomer(open, initialCustomer, (updater) => setRows(prev => updater(prev)))
  const [lookupOpen, setLookupOpen] = React.useState<{ open: boolean; rowId?: number }>({ open: false })
  const modal = useDraggableModal('customer-activity-popup', open, (el) => {
    const rect = el.getBoundingClientRect()
    const x = (window.innerWidth - rect.width) / 2
    const y = Math.max(24, (window.innerHeight - rect.height) * 0.2)
    return { x, y }
  }, { persist: false, resetOnOpen: true })

  // ESC to close
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  if (!open) return null
  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 12000, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.25)', pointerEvents: 'none' }} />
      <div ref={modal.ref} style={{ ...modal.style, width: 'min(920px, 96vw)', maxHeight: '84vh', overflow: 'auto', pointerEvents: 'auto' }} className="card" {...modal.bindContainer}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, cursor: 'move' }} {...modal.bindHeader}>
          <h3 style={{ margin: 0 }}>거래처 활동</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn" onClick={() => {
              setRows(prev => [{ id: Date.now() }, ...prev])
            }}>등록</button>
            <span role="button" tabIndex={0} className="icon-button" aria-label="닫기" title="닫기" onClick={onClose}>
              <img src={closeIcon} className="icon" alt="닫기" />
            </span>
          </div>
        </div>
        <div className="table-container" style={{ maxHeight: '60vh', overflow: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 140 }}>회사코드</th>
                <th style={{ width: 220 }}>거래처명</th>
                <th style={{ width: 120 }}>활동유형</th>
                <th style={{ width: 260 }}>제목</th>
                <th>활동설명</th>
                <th style={{ width: 140 }}>대표자</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="muted">데이터가 없습니다.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.customerId || ''}</td>
                  <td>
                    <span role="button" tabIndex={0} className="icon-button" title="거래처 조회" aria-label="거래처 조회">
                      <img src={searchIcon} className="icon" alt="조회" onClick={() => setLookupOpen({ open: true, rowId: r.id })} />
                    </span>
                    {r.customerName ? <span style={{ marginLeft: 6 }}>{r.customerName}</span> : null}
                  </td>
                  <td>{r.activityType || ''}</td>
                  <td style={{ maxWidth: 360, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.subject || ''}</td>
                  <td style={{ maxWidth: 560, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.description || ''}</td>
                  <td>{r.ownerName || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {lookupOpen.open && (
        <CustomerLookupModal
          onClose={() => setLookupOpen({ open: false })}
          onSelect={(row) => {
            setRows(prev => prev.map(it => it.id === lookupOpen.rowId ? ({ ...it, customerId: row.customerId || '', customerName: row.customerName || '', ownerName: row.ownerName || '' }) : it))
            setLookupOpen({ open: false })
          }}
        />
      )}
    </div>
  )
}

type CustomerRow = { customerSeq?: number | null; customerId?: string | null; customerName?: string | null; ownerName?: string | null }

function CustomerLookupModal({ onClose, onSelect }: { onClose: () => void; onSelect: (row: CustomerRow) => void }) {
  const [q, setQ] = React.useState('')
  const [items, setItems] = React.useState<CustomerRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function search() {
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
      const list: CustomerRow[] = Array.isArray(data) ? data.map((x: any) => ({
        customerSeq: (x?.customerSeq ?? x?.customer_seq) ?? null,
        customerId: x?.customerId ?? x?.customer_id ?? null,
        customerName: x?.customerName ?? x?.customer_name ?? null,
        ownerName: x?.ownerName ?? x?.owner_name ?? null,
      })) : []
      setItems(list)
    } catch (e: any) {
      setError(e?.message || '조회 중 오류가 발생했습니다')
      setItems([])
    } finally { setLoading(false) }
  }

  React.useEffect(() => { search() }, [])
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 13000 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.35)' }} />
      <div className="card" style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 'min(860px, 96vw)', maxHeight: '80vh', overflow: 'auto', padding: 12 }}>
        <button aria-label="닫기" className="btn-plain" onClick={onClose} style={{ position: 'absolute', top: 8, right: 8 }}>
          <img src={closeIcon} className="icon" alt="닫기" />
        </button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <input className="subject-input" placeholder="거래처명" value={q} onChange={(e)=>setQ(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') search() }} style={{ flex: 1 }} />
          <button className="btn" onClick={search}>조회</button>
        </div>
        <div className="table-container" style={{ maxHeight: 420, overflow: 'auto' }}>
          {items.length === 0 ? (
            <div className="empty-state">{loading ? '불러오는 중…' : (error || '결과가 없습니다')}</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 140 }}>회사코드</th>
                  <th style={{ width: 260 }}>거래처명</th>
                  <th style={{ width: 160 }}>대표자</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} onClick={() => onSelect(it)}>
                    <td>{it.customerId || ''}</td>
                    <td>{it.customerName || ''}</td>
                    <td>{it.ownerName || ''}</td>
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

// Seed initial row when opened with initialCustomer and no rows yet
export function useSeedInitialCustomer(open: boolean, initialCustomer: { customerId?: string | null; customerName?: string | null; ownerName?: string | null } | undefined, setRows: (updater: (prev: Row[]) => Row[]) => void) {
  React.useEffect(() => {
    if (!open) return
    if (!initialCustomer) return
    setRows(prev => {
      if (prev && prev.length > 0) return prev
      const nowId = Date.now()
      return [{ id: nowId, customerId: initialCustomer.customerId || undefined, customerName: initialCustomer.customerName || undefined, ownerName: initialCustomer.ownerName || undefined }]
    })
  }, [open, initialCustomer, setRows])
}
