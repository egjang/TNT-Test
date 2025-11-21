import React, { useEffect, useMemo, useRef, useState } from 'react'
import closeIcon from '../../assets/icons/close.svg'

type Row = {
  id: number
  subject?: string
  description?: string
  activityType?: string
  activityStatus?: string
  channel?: string
  plannedStartAt?: string
  plannedEndAt?: string
  createdAt?: string
  lastUpdateAt?: string
  ownerName?: string
}

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

export function LeadActivitiesList({ leadId }: { leadId?: number | null }) {
  const [items, setItems] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [menu, setMenu] = useState<{ open: boolean; x: number; y: number; row?: Row }>(()=>({ open:false, x:0, y:0 }))
  const [editOpen, setEditOpen] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [notice, setNotice] = useState<{ open: boolean; text: string }>({ open:false, text:'' })

  async function load() {
    if (!leadId) { setItems([]); return }
    setLoading(true)
    setError(null)
    try {
      const url = new URL('/api/v1/sales-activities', window.location.origin)
      url.searchParams.set('mineOnly', 'false')
      url.searchParams.set('sfLeadId', String(leadId))
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const list: Row[] = Array.isArray(data) ? data.map((x: any) => ({
        id: Number(x?.id),
        subject: x?.subject ?? '',
        description: x?.description ?? '',
        activityType: x?.activityType ?? '',
        activityStatus: x?.activityStatus ?? '',
        channel: x?.channel ?? '',
        plannedStartAt: x?.plannedStartAt ?? null,
        plannedEndAt: x?.plannedEndAt ?? null,
        createdAt: x?.createdAt ?? null,
        lastUpdateAt: x?.lastUpdateAt ?? null,
        ownerName: x?.ownerName ?? x?.owner_name ?? '',
      })) : []
      setItems(list)
    } catch (e: any) {
      setError(e?.message || '조회 중 오류가 발생했습니다')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [leadId])

  // Refresh when activities updated elsewhere (e.g., TM 활동 등록)
  useEffect(() => {
    const onUpdated = () => { load() }
    window.addEventListener('tnt.sales.activity.updated' as any, onUpdated)
    return () => window.removeEventListener('tnt.sales.activity.updated' as any, onUpdated)
  }, [leadId])

  // ESC to close edit modal
  useEffect(() => {
    if (!editOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setEditOpen(false) }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [editOpen])

  useEffect(() => {
    if (!editOpen) lastLoadedId.current = null
  }, [editOpen])

  // Close context menu on click elsewhere
  useEffect(() => {
    if (!menu.open) return
    const onClick = () => setMenu({ open:false, x:0, y:0 })
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu({ open:false, x:0, y:0 }) }
    // Use bubble phase so item onClick can run first; allow stopPropagation to prevent closing
    window.addEventListener('click', onClick, false)
    window.addEventListener('keydown', onEsc, true)
    return () => { window.removeEventListener('click', onClick, false); window.removeEventListener('keydown', onEsc, true) }
  }, [menu.open])

  const lastLoadedId = useRef<number | null>(null)

  function openEdit(row: Row) {
    setEditingId(row.id)
    if (lastLoadedId.current !== row.id) {
      setEditTitle(row.subject || '')
      setEditDesc(row.description || '')
      lastLoadedId.current = row.id
    }
    setEditOpen(true)
  }

  const table = useMemo(() => (
    <div className="table-container" style={{ maxHeight: '50vh', overflow: 'auto' }}>
      {items.length === 0 ? (
        <div className="empty-state">{loading ? '불러오는 중…' : (error || '활동이 없습니다.')}</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 120 }}>담당자</th>
              <th style={{ width: 260 }}>제목</th>
              <th>활동내역</th>
              <th style={{ width: 150 }}>계획일시</th>
              <th style={{ width: 150 }}>종료 일시</th>
              <th style={{ width: 120 }}>활동유형</th>
              <th style={{ width: 120 }}>활동상태</th>
              <th style={{ width: 180 }}>최종 수정일</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setMenu({ open:true, x:e.clientX, y:e.clientY, row: it }) }}
              >
                <td title={it.ownerName || ''} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.ownerName || ''}</td>
                <td title={it.subject || ''} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.subject || ''}</td>
                <td title={it.description || ''} style={{ maxWidth: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.description || ''}</td>
                <td>{fmt(it.plannedStartAt)}</td>
                <td>{fmt(it.plannedEndAt)}</td>
                <td>{it.activityType || ''}</td>
                <td>{it.activityStatus || ''}</td>
                <td>{fmt(it.lastUpdateAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
          {menu.open && menu.row && (
            <div className="context-menu" style={{ left: menu.x + 4, top: menu.y + 4 }} onClick={(e)=> e.stopPropagation()}>
              <button className="context-item" style={{ width: 96, padding: '4px 6px' }} onClick={(e) => {
                e.preventDefault(); e.stopPropagation()
                openEdit(menu.row!)
                setMenu({ open:false, x:0, y:0 })
              }}>수정</button>
            </div>
          )}
    </div>
  ), [items, loading, error, menu])

  return (
    <section>
      {table}

      {editOpen && (
        <div role="dialog" aria-modal="true" style={{ position:'fixed', inset:0, zIndex: 20000 }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.25)' }} />
          <div className="card" style={{ position:'absolute', left:'50%', top:'20%', transform:'translateX(-50%)', width:'min(720px, 92vw)', maxHeight:'80vh', overflow:'auto', padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <h3 style={{ margin:0 }}>TM 활동 수정</h3>
              <span role="button" tabIndex={0} className="icon-button" aria-label="닫기" title="닫기" onClick={()=> setEditOpen(false)}>
                <img src={closeIcon} className="icon" alt="닫기" />
              </span>
            </div>
            <div className="field inline-field"><label>제목</label>
              <input className="search-input" type="text" value={editTitle} onChange={(e)=> setEditTitle(e.target.value)} placeholder="제목" />
            </div>
            <div className="field inline-field row-2"><label>활동 설명</label>
              <textarea className="search-input" value={editDesc} onChange={(e)=> setEditDesc(e.target.value)} placeholder="활동 설명" style={{ minHeight: 100 }} />
            </div>
            <div className="controls" style={{ justifyContent:'flex-end', marginTop:10, gap:8 }}>
              <button className="btn" onClick={()=> setEditOpen(false)}>취소</button>
              <button className="btn" onClick={async () => {
                try {
                  if (!editingId) return
                  const body = { subject: editTitle || '', description: editDesc || '' }
                  const r = await fetch(`/api/v1/sales-activities/${editingId}`, { method:'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                  if (!r.ok) throw new Error(`HTTP ${r.status}`)
                  setEditOpen(false)
                  setNotice({ open:true, text: `${(editTitle || '').trim() || '(제목없음)'} 변경되었습니다.` })
                  try { window.dispatchEvent(new CustomEvent('tnt.sales.activity.updated', { detail: { id: editingId } }) as any) } catch {}
                } catch (e) { /* could show error inline */ }
              }}>저장</button>
            </div>
          </div>
        </div>
      )}

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
