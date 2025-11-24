import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { SalesActivityForm, type SalesActivityInitial } from '../customer/SalesActivityForm'

type Day = { date: Date; inMonth: boolean; isToday: boolean }
type CalendarActivity = {
  id: number
  subject?: string
  customerName?: string
  plannedStartAt?: string
  plannedEndAt?: string | null
  activityStatus?: string
  leadId?: string | null
  source?: 'sales' | 'region'
}
type CalendarEvent = {
  id: number
  subject?: string
  customerName?: string
  status?: string
  time?: string
  endTime?: string
  start: Date
  end: Date
  leadId?: string | null
  source?: 'sales' | 'region'
}

function startOfMonth(d: Date) { const x = new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x }
function addMonths(d: Date, m: number) { const x = new Date(d); x.setMonth(x.getMonth() + m); return x }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function isSameDay(a: Date, b: Date) { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate() }

export function CalendarView() {
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()))
  const today = new Date()
  const [salesItems, setSalesItems] = useState<CalendarActivity[]>([])
  const [regionItems, setRegionItems] = useState<CalendarActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'month'|'week'|'day'>('month')
  const [menu, setMenu] = useState<{ open: boolean; x: number; y: number; event?: CalendarEvent; date?: Date }>({ open: false, x: 0, y: 0, event: undefined, date: undefined })
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null)
  const [createInitial, setCreateInitial] = useState<SalesActivityInitial | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; event?: CalendarEvent; customerName?: string }>({ open: false })

  const days: Day[] = useMemo(() => {
    const list: Day[] = []
    if (view === 'month') {
      const first = startOfMonth(cursor)
      const firstWeekday = first.getDay()
      const start = new Date(first)
      start.setDate(first.getDate() - firstWeekday)
      for (let i=0;i<42;i++) {
        const d = new Date(start); d.setDate(start.getDate() + i)
        list.push({ date: d, inMonth: d.getMonth()===cursor.getMonth(), isToday: isSameDay(d, today) })
      }
    } else if (view === 'week') {
      // week of cursor: from Sunday to Saturday
      const base = new Date(cursor); const wd = base.getDay()
      const start = new Date(base); start.setDate(base.getDate() - wd)
      for (let i=0;i<7;i++) {
        const d = new Date(start); d.setDate(start.getDate() + i)
        list.push({ date: d, inMonth: true, isToday: isSameDay(d, today) })
      }
    } else {
      // day view: single day (cursor date)
      const d = new Date(cursor)
      list.push({ date: d, inMonth: true, isToday: isSameDay(d, today) })
    }
    return list
  }, [cursor, view])

  const viewLabel = useMemo(() => {
    const y = cursor.getFullYear(); const m = String(cursor.getMonth()+1).padStart(2,'0'); const dd = String(cursor.getDate()).padStart(2,'0')
    if (view === 'month') return `${y}.${m}`
    if (view === 'week') {
      const wd = cursor.getDay(); const start = addDays(new Date(cursor), -wd); const end = addDays(new Date(start), 6)
      const sm = String(start.getMonth()+1).padStart(2,'0'); const sd = String(start.getDate()).padStart(2,'0')
      const em = String(end.getMonth()+1).padStart(2,'0'); const ed = String(end.getDate()).padStart(2,'0')
      return `${y}.${sm}.${sd} ~ ${end.getFullYear()}.${em}.${ed}`
    }
    return `${y}.${m}.${dd}`
  }, [cursor, view])

  useEffect(() => {
    // Load my activities (sales + region) for the calendar
    const assigneeId = localStorage.getItem('tnt.sales.assigneeId')
    if (!assigneeId) {
      setError('로그인이 필요합니다')
      setSalesItems([])
      setRegionItems([])
      setLoading(false)
      return
    }
    setError(null)
    setLoading(true)
    ;(async () => {
      const errors: string[] = []
      const first = new Date(days[0].date); first.setHours(0,0,0,0)
      const last = new Date(days[days.length-1].date); last.setHours(23,59,59,999)

      // Sales activities
      try {
        const url = new URL('/api/v1/sales-activities', window.location.origin)
        url.searchParams.set('mineOnly', 'true')
        url.searchParams.set('assigneeId', String(assigneeId))
        url.searchParams.set('start', first.toISOString())
        url.searchParams.set('end', last.toISOString())
        const res = await fetch(url.toString())
        if (!res.ok) {
          let msg = `HTTP ${res.status}`
          try { const d = await res.json(); if (d?.error) msg = d.error } catch {}
          throw new Error(msg)
        }
        const data = await res.json()
        const list = Array.isArray(data) ? data.map((x: any) => ({
          id: Number(x?.id),
          subject: x?.subject ?? undefined,
          customerName: x?.customerName ?? x?.customer_name ?? undefined,
          plannedStartAt: x?.plannedStartAt ?? x?.planned_start_at ?? undefined,
          plannedEndAt: x?.plannedEndAt ?? x?.planned_end_at ?? null,
          activityStatus: x?.activityStatus ?? x?.activity_status ?? undefined,
          leadId: x?.sfLeadId ?? x?.sf_lead_id ?? x?.leadId ?? x?.lead_id ?? null,
          source: 'sales' as const,
        })) : []
        setSalesItems(list)
      } catch (e: any) {
        errors.push(e?.message || '활동 조회 중 오류가 발생했습니다')
        setSalesItems([])
      }

      // Region activity plans
      try {
        const url = new URL('/api/v1/region-activity-plans', window.location.origin)
        url.searchParams.set('assigneeId', String(assigneeId))
        url.searchParams.set('start', first.toISOString())
        url.searchParams.set('end', last.toISOString())
        const res = await fetch(url.toString())
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const list = Array.isArray(data) ? data.map((x: any) => {
          const plannedStartAt = x?.plannedStartAt ?? x?.planned_start_at ?? null
          const plannedEndAt = x?.plannedEndAt ?? x?.planned_end_at ?? null
          const hasActual = !!(x?.actualStartAt || x?.actual_start_at || x?.actualEndAt || x?.actual_end_at)
          const subject = x?.subject ? `[지역] ${x.subject}` : '지역활동'
          return {
            id: Number(x?.id),
            subject,
            plannedStartAt: plannedStartAt || undefined,
            plannedEndAt: plannedEndAt || null,
            activityStatus: hasActual ? 'completed' : 'region',
            leadId: null,
            source: 'region' as const,
          }
        }) : []
        setRegionItems(list)
      } catch (e: any) {
        errors.push(e?.message || '지역활동 조회 중 오류가 발생했습니다')
        setRegionItems([])
      }

      setError(errors.length ? errors.join(' / ') : null)
      setLoading(false)
    })()
  }, [cursor, view, days, refreshKey])

  // Group activities by day within the visible range
  const dayEvents = useMemo(() => {
        const map = new Map<string, CalendarEvent[]>()
    const all = [...salesItems, ...regionItems]
    if (!all || all.length === 0) return map
    // visible range
    const first = new Date(days[0].date)
    const last = new Date(days[days.length - 1].date)
    last.setHours(23,59,59,999)
    for (const it of all) {
      if (!it.plannedStartAt && !it.plannedEndAt) continue
      const start = it.plannedStartAt ? new Date(it.plannedStartAt) : null
      const end = it.plannedEndAt ? new Date(it.plannedEndAt) : start
      if (!start) continue
      // if intersects visible range
      const s = start
      const e = end || start
      if (e < first || s > last) continue
      // pin to the start day for simple display (local date key)
      const key = `${s.getFullYear()}-${String(s.getMonth()+1).padStart(2,'0')}-${String(s.getDate()).padStart(2,'0')}`
      const time = s.toTimeString().slice(0,5)
      const endTime = e.toTimeString().slice(0,5)
      const arr = map.get(key) || []
      arr.push({
        id: it.id,
        subject: it.subject,
        customerName: it.customerName,
        time,
        endTime,
        status: it.activityStatus,
        start: s,
        end: e,
        leadId: it.leadId ?? null,
        source: it.source,
      })
      map.set(key, arr)
    }
    return map
  }, [salesItems, regionItems, days])

  function minutesSinceMidnight(dt: Date) { return dt.getHours()*60 + dt.getMinutes() }
  function toTimeLabel(m: number) { const hh = Math.floor(m/60).toString().padStart(2,'0'); const mm = (m%60).toString().padStart(2,'0'); return `${hh}:${mm}` }
  const eventsForDay = React.useCallback((date: Date) => {
    const dayStart = new Date(date); dayStart.setHours(0,0,0,0)
    const dayEnd = new Date(date); dayEnd.setHours(23,59,59,999)
    const arr: CalendarEvent[] = []
    const all = [...salesItems, ...regionItems]
    for (const it of all) {
      const s = it.plannedStartAt ? new Date(it.plannedStartAt) : null
      const e = it.plannedEndAt ? new Date(it.plannedEndAt) : s
      if (!s) continue
      const ee = e || s
      if (ee < dayStart || s > dayEnd) continue
      const clipStart = s < dayStart ? dayStart : s
      const clipEnd = ee > dayEnd ? dayEnd : ee
      arr.push({
        id: it.id,
        subject: it.subject,
        customerName: it.customerName,
        status: it.activityStatus,
        start: clipStart,
        end: clipEnd,
        leadId: it.leadId ?? null,
        source: it.source,
      })
    }
    arr.sort((a,b)=> a.start.getTime() - b.start.getTime())
    return arr
  }, [salesItems, regionItems])

  const closeMenu = useCallback(() => {
    setMenu({ open: false, x: 0, y: 0, event: undefined, date: undefined })
  }, [])

  useEffect(() => {
    if (!menu.open) return
    const onAnyClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Don't close if clicking inside the context menu
      if (target.closest('.context-menu')) return
      closeMenu()
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMenu() }
    window.addEventListener('click', onAnyClick, true)
    window.addEventListener('contextmenu', onAnyClick, false)
    window.addEventListener('keydown', onEsc, true)
    return () => {
      window.removeEventListener('click', onAnyClick, true)
      window.removeEventListener('contextmenu', onAnyClick, true)
      window.removeEventListener('keydown', onEsc, true)
    }
  }, [menu.open, closeMenu])

  function onContextMenu(e: React.MouseEvent<HTMLDivElement>, event: CalendarEvent) {
    if (event.source === 'region') return
    e.preventDefault()
    e.stopPropagation()
    setMenu({ open: true, x: e.clientX, y: e.clientY, event, date: event.start })
  }

  async function handleDeleteActivity(event: CalendarEvent) {
    const activityId = event?.id
    if (!activityId) {
      return
    }

    // Fetch activity detail to get customer name
    try {
      const detailRes = await fetch(`/api/v1/sales-activities/${activityId}`)
      if (!detailRes.ok) throw new Error(`HTTP ${detailRes.status}`)
      const detail = await detailRes.json()
      const customerName = detail?.customerName || detail?.customer_name || ''

      // Show custom confirmation dialog
      setDeleteConfirm({ open: true, event, customerName })
    } catch (err: any) {
      console.error('활동 상세 조회 실패:', err)
      // Fallback to simple confirmation
      setDeleteConfirm({ open: true, event, customerName: '' })
    }
  }

  async function confirmDelete() {
    const activityId = deleteConfirm.event?.id
    if (!activityId) {
      setDeleteConfirm({ open: false })
      return
    }

    try {
      const res = await fetch(`/api/v1/sales-activities/${activityId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      // 로컬 state에서 즉시 제거
      setSalesItems((prev) => prev.filter((item) => item.id !== activityId))

      try { window.dispatchEvent(new CustomEvent('tnt.sales.activity.updated', { detail: { id: activityId } }) as any) } catch {}
      setDeleteConfirm({ open: false })
      closeMenu()
    } catch (err: any) {
      window.alert(err?.message || '삭제 중 오류가 발생했습니다')
      setDeleteConfirm({ open: false })
    }
  }

  function cancelDelete() {
    setDeleteConfirm({ open: false })
  }

  useEffect(() => {
    if (view === 'week' || view === 'day') {
      // wait for render
      setTimeout(() => {
        document.querySelectorAll<HTMLDivElement>('.day-timeline').forEach(el => {
          el.scrollTop = 7 * 40 // 07:00 at base 40px per hour (approximate)
        })
      }, 0)
    }
  }, [view, days])

  function openActivitiesPanel(activityId?: number) {
    if (activityId != null) {
      try { localStorage.setItem('tnt.sales.selectedActivityId', String(activityId)) } catch {}
    }
    const btn = document.querySelector('button[data-key="customer:my-activities"]') as HTMLButtonElement | null
    if (btn) btn.click()
  }

  async function navigateToLead(leadId?: string | null): Promise<boolean> {
    const plainId = leadId ? String(leadId).trim() : ''
    if (!plainId) return false
    try {
      const url = new URL(`/api/v1/leads/${encodeURIComponent(plainId)}`, window.location.origin)
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (!data || (data.id == null && data.lead_id == null)) throw new Error('잠재고객 데이터를 찾을 수 없습니다')
      window.dispatchEvent(new CustomEvent('tnt.sales.navigate', { detail: { key: 'lead' } }) as any)
      const applySelection = () => {
        try { localStorage.setItem('tnt.sales.selectedLead', JSON.stringify(data)) } catch {}
        try { window.dispatchEvent(new CustomEvent('tnt.sales.lead.selected', { detail: { lead: data } }) as any) } catch {}
      }
      applySelection()
      window.setTimeout(applySelection, 180)
      return true
    } catch (err) {
      console.error('잠재고객 이동 실패:', err)
      return false
    }
  }

  async function handleActivityClick(event: CalendarEvent) {
    if (event.source === 'region') return
    if (!event?.id) return
    setEditingActivityId(event.id)
  }

  // Sync scroll across all day columns in week view
  useEffect(() => {
    if (view !== 'week') return
    const timelines = Array.from(document.querySelectorAll<HTMLDivElement>('.day-timeline'))
    if (timelines.length === 0) return
    const onScroll = (e: Event) => {
      const src = e.target as HTMLDivElement
      const top = src.scrollTop
      timelines.forEach(t => { if (t !== src) t.scrollTop = top })
    }
    timelines.forEach(t => t.addEventListener('scroll', onScroll))
    return () => timelines.forEach(t => t.removeEventListener('scroll', onScroll))
  }, [view, days])

  // Handle ESC key to close activity edit modal
  useEffect(() => {
    if (!editingActivityId) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setEditingActivityId(null)
      }
    }
    window.addEventListener('keydown', handleEsc, true)
    return () => window.removeEventListener('keydown', handleEsc, true)
  }, [editingActivityId])

  // Handle ESC key to close create modal
  useEffect(() => {
    if (!createInitial) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setCreateInitial(null)
      }
    }
    window.addEventListener('keydown', handleEsc, true)
    return () => window.removeEventListener('keydown', handleEsc, true)
  }, [createInitial])

  const openCreateAt = useCallback((date: Date, customer?: any) => {
    const d = new Date(date)
    d.setHours(9, 0, 0, 0)
    const toLocal = (dt: Date) => {
      const yy = dt.getFullYear()
      const mm = String(dt.getMonth() + 1).padStart(2, '0')
      const dd = String(dt.getDate()).padStart(2, '0')
      const hh = String(dt.getHours()).padStart(2, '0')
      const mi = String(dt.getMinutes()).padStart(2, '0')
      return `${yy}-${mm}-${dd}T${hh}:${mi}`
    }
    const custId = customer?.customerId ?? customer?.customer_id ?? undefined
    const custName = customer?.customerName ?? customer?.customer_name ?? undefined
    setCreateInitial({ plannedStartAt: toLocal(d), sfAccountId: custId, customerName: custName })
  }, [])

  // External request to open create modal (e.g., from C360)
  useEffect(() => {
    const handler = (e: any) => {
      const detailDate = e?.detail?.date ? new Date(e.detail.date) : new Date()
      const cust = e?.detail?.customer
      openCreateAt(detailDate, cust)
    }
    window.addEventListener('tnt.sales.calendar.create' as any, handler as any)
    window.addEventListener('tnt.sales.activity.create.inline' as any, handler as any)
    return () => {
      window.removeEventListener('tnt.sales.calendar.create' as any, handler as any)
      window.removeEventListener('tnt.sales.activity.create.inline' as any, handler as any)
    }
  }, [openCreateAt])

  return (
    <>
      <section>
      <div className="page-title">
        <h2>일정</h2>
        <div className="meta">
          <button className="btn" onClick={() => setCursor(startOfMonth(new Date()))}>오늘</button>
        </div>
      </div>

      <div className="card" style={{ padding: 12 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button className="btn" onClick={() => setCursor(c => view==='month' ? addMonths(c, -1) : (view==='week' ? addDays(c, -7) : addDays(c, -1)))}>{'〈'}</button>
            <div style={{ fontWeight: 700 }}>{viewLabel}</div>
            <button className="btn" onClick={() => setCursor(c => view==='month' ? addMonths(c, 1) : (view==='week' ? addDays(c, 7) : addDays(c, 1)))}>{'〉'}</button>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button className="btn" onClick={() => { setView('month'); setCursor(startOfMonth(new Date())) }} disabled={view==='month'}>월</button>
            <button className="btn" onClick={() => { setView('week'); setCursor(new Date()) }} disabled={view==='week'}>주</button>
            <button className="btn" onClick={() => { setView('day'); setCursor(new Date()) }} disabled={view==='day'}>일</button>
          </div>
        </div>
        {error && <div className="error" style={{ marginBottom: 8 }}>{error}</div>}
        {loading && <div className="muted" style={{ marginBottom: 8 }}>활동 불러오는 중…</div>}
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${view==='day'?1:7}, 1fr)`, gap: 4 }}>
          {(view==='day'? [''] : ['일','월','화','수','목','금','토']).map((w,i)=>(
            <div key={i} style={{ textAlign:'center', color:'var(--muted)', padding:'6px 0' }}>{w}</div>
          ))}
          {view==='month' && days.map((d, i) => (
            <div key={i} style={{
              position: 'relative',
              border:'1px solid var(--border)', borderRadius: 8, padding: 8,
              height: 120, overflow: 'hidden', display: 'flex', flexDirection: 'column',
              background: d.inMonth ? 'transparent' : 'var(--panel-2)',
              outline: d.isToday ? '2px solid var(--accent)' : 'none'
            }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setMenu({ open: true, x: e.clientX, y: e.clientY, date: d.date, event: undefined }) }}>
              <div style={{ fontWeight: 600, marginBottom: 6, opacity: d.inMonth ? 1 : 0.6 }}>{d.date.getDate()}</div>
              {(() => {
                const key = `${d.date.getFullYear()}-${String(d.date.getMonth()+1).padStart(2,'0')}-${String(d.date.getDate()).padStart(2,'0')}`
                const evts = dayEvents.get(key) || []
                if (!evts.length) return null
                return (
                  <>
                    <div style={{ position:'absolute', top:6, right:8, fontSize:11, fontWeight:700, color:'#dc2626' }}>{evts.length}</div>
                    <div className="cal-events" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {evts.map((evt, idx) => {
                        const label = evt.customerName || evt.subject || '활동'
                        const tooltip = evt.customerName && evt.subject ? `${evt.customerName} · ${evt.subject}` : (evt.customerName || evt.subject || '')
                        return (
                        <div key={idx} className={`cal-pill status-${(evt.status||'scheduled').replaceAll(' ','_')}`} title={tooltip}
                          onClick={() => { if (evt.source !== 'region') void handleActivityClick(evt) }}
                          onContextMenu={(e) => { if (evt.source !== 'region') onContextMenu(e, evt) }}
                          style={{ cursor: evt.source === 'region' ? 'default' : 'pointer' }}
                        >
                          <span className="time">{evt.time}</span>
                          <span className="subj">{label}</span>
                        </div>
                      )})}
                    </div>
                  </>
                )
              })()}
            </div>
          ))}
          {(view==='week' || view==='day') && (() => {
            const baseHourHeight = 40
            const eventHeight = 18
            const eventSpacing = 20

            return days.map((d, i) => {
              const key = `${d.date.getFullYear()}-${String(d.date.getMonth()+1).padStart(2,'0')}-${String(d.date.getDate()).padStart(2,'0')}`
              const evtsRaw = (dayEvents.get(key) || []).sort((a,b)=> (a.start!.getTime()-b.start!.getTime()))
              const evts = view==='day' ? eventsForDay(d.date) : evtsRaw

              // Group events by hour
              const eventsByHour: CalendarEvent[][] = Array.from({ length: 24 }, () => [])
              evts.forEach(evt => {
                const startMin = minutesSinceMidnight(evt.start!)
                const endMinRaw = minutesSinceMidnight(evt.end!)
                const endMin = endMinRaw > startMin ? endMinRaw : startMin
                const startHour = Math.floor(startMin / 60)
                const endHour = Math.floor(endMin / 60)

                // Add to all hours this event spans
                for (let h = startHour; h <= Math.min(endHour, 23); h++) {
                  eventsByHour[h].push(evt)
                }
              })

              // Calculate hour heights based on number of events in each hour
              const hourHeights = eventsByHour.map(hourEvts => {
                if (hourEvts.length === 0) return baseHourHeight
                return baseHourHeight + (hourEvts.length - 1) * eventSpacing
              })

              const hourPositions = [0]
              for (let h = 0; h < 24; h++) {
                hourPositions.push(hourPositions[h] + hourHeights[h])
              }
              const dayPx = hourPositions[24]

              return (
                <div key={i} style={{ border:'1px solid var(--border)', borderRadius: 8, padding: 8 }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setMenu({ open: true, x: e.clientX, y: e.clientY, date: d.date, event: undefined }) }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{d.date.getDate()}</div>
                  <div className="day-timeline" style={{ position:'relative', height: dayPx, borderTop:'1px solid var(--border)', overflowY:'auto', maxHeight: 640 }}>
                    {/* Render each hour block */}
                    {[...Array(24)].map((_,h) => {
                      const hourEvts = eventsByHour[h]
                      const hourTop = hourPositions[h]
                      const hourHeight = hourHeights[h]

                      return (
                        <div key={h} style={{ position:'absolute', top: hourTop, left:0, right:0, height: hourHeight }}>
                          {/* Hour marker */}
                          <div style={{ position:'absolute', top: 0, left:0, right:0, borderTop:'1px dashed var(--border)', fontSize:10, color:'var(--muted)' }}>
                            <span style={{ position:'absolute', left:0, transform:'translateY(-50%)', paddingLeft:4 }}>{h}:00</span>
                          </div>

                          {/* Events in this hour */}
                          {hourEvts.map((evt, evtIdx) => {
                            const startMin = minutesSinceMidnight(evt.start!)
                            const endMinRaw = minutesSinceMidnight(evt.end!)
                            const endMin = endMinRaw > startMin ? endMinRaw : startMin
                            const startHour = Math.floor(startMin / 60)

                            // Only render if this is the starting hour
                            if (startHour !== h) return null

                            const startMinInHour = startMin % 60
                            const baseOffset = (startMinInHour / 60) * baseHourHeight
                            const top = baseOffset + (evtIdx * eventSpacing)

                            const durationMin = endMin - startMin
                            const height = durationMin > 0 ? Math.max(eventHeight, (durationMin / 60) * baseHourHeight) : eventHeight

                            const label = evt.customerName || evt.subject || '활동'
                            const tooltip = evt.customerName && evt.subject ? `${evt.customerName} · ${evt.subject}` : (evt.customerName || evt.subject || '')

                            return (
                              <div key={evt.id} className={`cal-pill status-${(evt.status||'scheduled').replaceAll(' ','_')}`}
                                style={{
                                  position:'absolute',
                                  top,
                                  left: '60px',
                                  width: 'calc(100% - 64px)',
                                  height,
                                  zIndex: evtIdx
                                }}
                                title={`${toTimeLabel(startMin)}~${toTimeLabel(endMin)} ${tooltip}`}
                                onClick={() => { if (evt.source !== 'region') void handleActivityClick(evt) }}
                                onContextMenu={(e) => { if (evt.source !== 'region') onContextMenu(e, evt) }}
                                aria-disabled={evt.source === 'region' ? true : undefined}
                              >
                                <span className="time">{toTimeLabel(startMin)}</span>
                                <span className="subj">{label}</span>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          })()}
      </div>
        {menu.open && (
          <div className="context-menu" style={{ left: menu.x + 4, top: menu.y + 4 }} onClick={(e)=> e.stopPropagation()}>
            <button className="context-item" onClick={() => { if (menu.date) { openCreateAt(menu.date); closeMenu() } }} disabled={!menu.date}>활동 등록</button>
            <button
              className="context-item"
              onClick={() => { if (menu.event) { setEditingActivityId(menu.event.id); closeMenu() } }}
              disabled={!menu.event}
              style={!menu.event ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
            >활동 수정</button>
            <button
              className="context-item"
              onClick={() => { if (menu.event) { closeMenu(); void handleDeleteActivity(menu.event) } }}
              disabled={!menu.event}
              style={!menu.event ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
            >활동 삭제</button>
          </div>
        )}
      </div>
    </section>
    {editingActivityId && (
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
          onClick={() => setEditingActivityId(null)}
        >
        <div
          className="card"
          style={{
              width: 'min(920px, 92vw)',
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>영업활동 수정</h3>
              <button
                onClick={() => setEditingActivityId(null)}
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
            <SalesActivityForm
              bare
              editId={editingActivityId}
              onSaved={() => {
                setEditingActivityId(null)
                setRefreshKey((prev) => prev + 1)
              }}
              onNoticeClose={() => setEditingActivityId(null)}
            />
          </div>
        </div>
      )}
    {createInitial && (
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
        onClick={() => setCreateInitial(null)}
      >
        <div
          className="card"
          style={{
            width: 'min(920px, 92vw)',
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>영업활동 등록</h3>
            <button
              onClick={() => setCreateInitial(null)}
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
          <SalesActivityForm
            bare
            initial={createInitial}
            onSaved={() => {
              setCreateInitial(null)
              setRefreshKey((prev) => prev + 1)
            }}
            onNoticeClose={() => setCreateInitial(null)}
          />
        </div>
      </div>
    )}
    {deleteConfirm.open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,.5)'
          }}
          onClick={cancelDelete}
        >
          <div
            className="card"
            style={{
              background: 'var(--panel)',
              padding: 20,
              border: '1px solid var(--border)',
              borderRadius: 12,
              minWidth: 320,
              maxWidth: '86vw',
              boxShadow: '0 8px 32px rgba(0,0,0,.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: 16, fontSize: 16, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>
              활동 삭제
            </div>
            <div style={{ marginBottom: 20, fontSize: 14, color: 'var(--text)', textAlign: 'center', lineHeight: 1.6 }}>
              {deleteConfirm.customerName && (
                <div style={{ marginBottom: 8, fontWeight: 600, color: 'var(--primary)' }}>
                  {deleteConfirm.customerName}
                </div>
              )}
              <div>정말로 삭제하시겠습니까?</div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                className="btn"
                onClick={cancelDelete}
                style={{
                  minWidth: 80,
                  background: 'var(--panel-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                취소
              </button>
              <button
                className="btn"
                onClick={confirmDelete}
                style={{
                  minWidth: 80,
                  background: '#dc2626',
                  border: '1px solid #b91c1c',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
