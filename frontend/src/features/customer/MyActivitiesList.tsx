import React, { useEffect, useMemo, useState } from 'react'
import { tone } from '../../ui/tone'
import { MyActivitiesNewTabs } from './MyActivitiesNewTabs'

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
  plannedStartAt?: string
  plannedEndAt?: string
  createdAt?: string
  sfAccountId?: string
  customerName?: string
  parentSubject?: string
}

export function MyActivitiesList() {
  const [items, setItems] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<number>>(()=> new Set())
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const [statusSelected, setStatusSelected] = useState<string>('')
  const [active, setActive] = useState<Row | undefined>(undefined)
  const [bubble, setBubble] = useState<{ open: boolean; x: number; y: number; parent?: Row | null; siblings?: Row[] }>({ open: false, x: 0, y: 0 })

  function getVisitPlanIds(): Set<number> {
    try {
      const raw = localStorage.getItem('tnt.sales.visitPlanActivities')
      const arr = raw ? JSON.parse(raw) : []
      const ids = new Set<number>()
      if (Array.isArray(arr)) arr.forEach((x: any) => { if (x?.id != null) ids.add(Number(x.id)) })
      return ids
    } catch { return new Set() }
  }

  async function load() {
    setError(null)
    setLoading(true)
    try {
      const assigneeId = localStorage.getItem('tnt.sales.assigneeId')
      if (!assigneeId) throw new Error(tone.loginRequired)
      const url = new URL('/api/v1/sales-activities', window.location.origin)
      url.searchParams.set('mineOnly', 'true')
      url.searchParams.set('assigneeId', String(assigneeId))
      if (customerName && customerName.trim()) url.searchParams.set('customerName', customerName.trim())
      // Append single status param when selected
      if (statusSelected && statusSelected.trim()) url.searchParams.append('status', statusSelected.trim())
      const res = await fetch(url.toString())
      if (!res.ok) {
        let msg = `HTTP ${res.status}`
        try { const d = await res.json(); if (d?.error) msg = d.error } catch {}
        throw new Error(msg)
      }
      const data = await res.json()
      const all: Row[] = Array.isArray(data) ? data : []
      const planned = getVisitPlanIds()
      const list = all.filter(it => !planned.has(it.id))
      setItems(list)
      // Select first item by default when entering the screen
      setActive((prev) => {
        if (!list || list.length === 0) return undefined
        if (!prev) return list[0]
        // Keep previous if still exists; otherwise pick first
        return list.some(x => x.id === prev.id) ? prev : list[0]
      })
    } catch (e: any) {
      setError(e.message || '조회 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Always fetch fresh for "내활동" to match current login
    load()
    // Load statuses list
    ;(async () => {
      try {
        const r = await fetch('/api/v1/sales-activities/statuses')
        if (r.ok) {
          const arr = await r.json()
          const defaults = ['scheduled','completed','canceled','postponed']
          if (Array.isArray(arr) && arr.length > 0) setStatusOptions(arr as string[])
          else setStatusOptions(defaults)
        } else {
          setStatusOptions(['scheduled','completed','canceled','postponed'])
        }
      } catch {}
    })()
    const onAvail = () => {
      try {
        const raw = localStorage.getItem('tnt.sales.availableActivities')
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr)) {
            const list = arr as Row[]
            setItems(list)
            setActive((prev) => {
              if (!list || list.length === 0) return undefined
              if (!prev) return list[0]
              return list.some(x => x.id === prev.id) ? prev : list[0]
            })
          }
        }
      } catch {}
    }
    window.addEventListener('tnt.sales.availableActivitiesUpdated' as any, onAvail)
    const onUpdated = () => { load() }
    window.addEventListener('tnt.sales.activity.updated' as any, onUpdated)
    return () => window.removeEventListener('tnt.sales.availableActivitiesUpdated' as any, onAvail)
  }, [])

  // Close bubble on outside click / ESC
  useEffect(() => {
    if (!bubble.open) return
    const onDocClick = () => setBubble({ open: false, x: 0, y: 0 })
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setBubble({ open: false, x: 0, y: 0 }) }
    window.addEventListener('click', onDocClick)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('click', onDocClick); window.removeEventListener('keydown', onKey) }
  }, [bubble.open])

  function openGroupBubble(e: React.MouseEvent, it: Row) {
    e.preventDefault(); e.stopPropagation()
    const parentSubj = (it.parentSubject || '').trim()
    if (!parentSubj) { setBubble({ open: false, x: 0, y: 0 }); return }
    const parent = items.find(r => (r.subject || '').trim() === parentSubj) || null
    const siblings = items.filter(r => (r.parentSubject || '').trim() === parentSubj)
    setBubble({ open: true, x: e.clientX, y: e.clientY, parent, siblings })
  }

  function planVisits() {
    setActionMsg(null)
    if (selected.size === 0) { setActionMsg('선택된 활동이 없습니다'); return }
    const picked = items.filter(it => selected.has(it.id))
    const remain = items.filter(it => !selected.has(it.id))
    try {
      // Merge picked into existing plan list (append, dedupe by id)
      let existingPlan: Row[] = []
      try {
        const rawPlan = localStorage.getItem('tnt.sales.visitPlanActivities')
        if (rawPlan) {
          const arr = JSON.parse(rawPlan)
          if (Array.isArray(arr)) existingPlan = arr as Row[]
        }
      } catch {}
      const planMap = new Map<number, Row>()
      existingPlan.forEach(r => planMap.set(r.id, r))
      picked.forEach(r => planMap.set(r.id, r))
      const mergedPlan = Array.from(planMap.values())
      localStorage.setItem('tnt.sales.visitPlanActivities', JSON.stringify(mergedPlan))

      // Update available list = (existing available + current remain) - picked
      let existingAvail: Row[] = []
      try {
        const rawAvail = localStorage.getItem('tnt.sales.availableActivities')
        if (rawAvail) {
          const arr = JSON.parse(rawAvail)
          if (Array.isArray(arr)) existingAvail = arr as Row[]
        }
      } catch {}
      const availMap = new Map<number, Row>()
      existingAvail.forEach(r => availMap.set(r.id, r))
      remain.forEach(r => availMap.set(r.id, r))
      picked.forEach(r => availMap.delete(r.id))
      const mergedAvail = Array.from(availMap.values())
      localStorage.setItem('tnt.sales.availableActivities', JSON.stringify(mergedAvail))
      // Notify right panel to refresh
      window.dispatchEvent(new CustomEvent('tnt.sales.visitPlanUpdated'))
      window.dispatchEvent(new CustomEvent('tnt.sales.availableActivitiesUpdated'))
      setActionMsg(`방문 일정 대상 ${picked.length}건을 우측 패널에 추가했습니다`)
      setItems(mergedAvail)
      setSelected(new Set())
    } catch (e) {
      setActionMsg('저장 중 오류가 발생했습니다')
    }
  }

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

  const table = useMemo(() => {
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
        `거래처명: ${it.customerName || ''}`,
        `생성일시: ${fmt(it.createdAt)}`,
      ]
      return lines.join('\n')
    }
    return (
      <>
        <div className="table-container" style={{ maxHeight: '32vh' }}>
          {items.length === 0 ? (
            <div className="empty-state">{tone.empty}</div>
          ) : (
            <table className="table">
          <thead>
            <tr>
              <th style={{ width: 36, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selected.size === items.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const all = new Set<number>(); items.forEach(it => all.add(it.id)); setSelected(all)
                      } else {
                        setSelected(new Set())
                      }
                    }}
                  />
                </th>
                <th style={{ width: 240 }}>제목</th>
                <th style={{ width: 120 }}>활동방법</th>
                <th style={{ width: 200 }}>거래처명</th>
                <th style={{ width: 280 }}>활동설명</th>
                <th style={{ width: 220 }}>상위활동</th>
                <th style={{ width: 120 }}>활동유형</th>
                <th style={{ width: 120 }}>상태</th>
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
                  onClick={() => setActive(it)}
                  onContextMenu={(e) => openGroupBubble(e, it)}
                  aria-selected={active?.id === it.id ? true : undefined}
                  style={active?.id === it.id ? { background: 'var(--row-selected, rgba(0, 128, 255, 0.12))' } : undefined}
                >
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selected.has(it.id)}
                      onChange={(e) => {
                        setSelected(prev => {
                          const next = new Set(prev)
                          if (e.target.checked) next.add(it.id); else next.delete(it.id)
                          return next
                        })
                      }}
                    />
                  </td>
                  <td>{it.subject || ''}</td>
                  <td>{toKo(it.channel, 'channel')}</td>
                  <td>{it.customerName || ''}</td>
                  <td
                    title={it.description || ''}
                    style={{ maxWidth: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {it.description || ''}
                  </td>
                  <td>{it.parentSubject || ''}</td>
                  <td>{toKo(it.activityType, 'type')}</td>
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
      {bubble.open && (
        <div className="context-menu" style={{ left: bubble.x + 6, top: bubble.y + 6, maxWidth: 720, padding: 10, fontSize: 10 }} onClick={(e) => e.stopPropagation()}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>상위활동</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
            {bubble.parent && (
              <div className="card" style={{ padding: 8 }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', fontSize: 10 }}>
                    <thead>
                      <tr>
                        <th>제목</th>
                        <th>활동설명</th>
                        <th>활동유형</th>
                        <th>활동방법</th>
                        <th>상태</th>
                        <th>거래처명</th>
                        <th>계획 일시</th>
                        <th>종료 일시</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{bubble.parent.subject || ''}</td>
                        <td style={{ whiteSpace: 'pre-wrap', maxWidth: 360 }}>{bubble.parent.description || ''}</td>
                        <td>{toKo(bubble.parent.activityType, 'type')}</td>
                        <td>{toKo(bubble.parent.channel, 'channel')}</td>
                        <td>{toKo(bubble.parent.activityStatus, 'status')}</td>
                        <td>{bubble.parent.customerName || ''}</td>
                        <td>{fmt(bubble.parent.plannedStartAt)}</td>
                        <td>{fmt(bubble.parent.plannedEndAt)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="card" style={{ padding: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>관련활동</div>
              {bubble.siblings && bubble.siblings.length > 0 ? (
                <table className="table" style={{ width: '100%', fontSize: 10 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 240 }}>제목</th>
                      <th style={{ width: 120 }}>활동유형</th>
                      <th style={{ width: 120 }}>활동방법</th>
                      <th style={{ width: 120 }}>상태</th>
                      <th style={{ width: 180 }}>계획 일시</th>
                      <th style={{ width: 180 }}>종료 일시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bubble.siblings.map((r, idx) => (
                      <tr key={idx} onClick={() => { setActive(r); setBubble({ open: false, x: 0, y: 0 }) }}>
                        <td>{r.subject || ''}</td>
                        <td>{toKo(r.activityType, 'type')}</td>
                        <td>{toKo(r.channel, 'channel')}</td>
                        <td>{toKo(r.activityStatus, 'status')}</td>
                        <td>{fmt(r.plannedStartAt)}</td>
                        <td>{fmt(r.plannedEndAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="muted">하위 활동이 없습니다</div>
              )}
            </div>
          </div>
        </div>
      )}
      </>
    )
  }, [items, selected, active, bubble])

  return (
    <section>
      <div className="page-title" style={{ alignItems: 'center' }}>
        <input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !loading) load() }}
          placeholder="거래처명 입력"
          style={{ width: 220, height: 28, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 12 }}
        />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
          <label className="muted" style={{ fontSize: 12 }}>상태</label>
          <select
            value={statusSelected}
            onChange={(e)=> setStatusSelected(e.target.value)}
            style={{ minWidth: 140, height: 28, padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 12 }}
          >
            <option value="">전체</option>
            {statusOptions.map(s => (
              <option key={s} value={s}>{toKo(s as any, 'status')}</option>
            ))}
          </select>
        </div>
        <button className="btn" onClick={load} disabled={loading}>{loading ? '조회중…' : '조회'}</button>
        <button className="btn" onClick={planVisits} disabled={true} title="준비중 기능" style={{ marginLeft: 8, opacity: .6, cursor: 'not-allowed' }}>{tone.action.addToPlan}</button>
        {error && <span className="error">{error || tone.errorGeneric}</span>}
        {actionMsg && <span className="muted">{actionMsg}</span>}
        <div style={{ flex: 1 }} />
        <div className="muted count-text">총 {items.length}건{selected.size ? ` · 선택 ${selected.size}건` : ''}</div>
      </div>
      <div style={{ marginTop: 12 }}>{table}</div>
      <MyActivitiesNewTabs activity={active} />
    </section>
  )
}
