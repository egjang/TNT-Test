import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getWeekRange, formatRange } from '../../utils/week'
import { SalesActivityForm } from '../customer/SalesActivityForm'

type Selection = {
  assigneeId: string
  empName: string
  startIso: string
  endIso: string
  status?: 'scheduled' | 'completed'
  label?: string
  isRegion?: boolean
}

type Activity = {
  id: number
  subject?: string
  activityType?: string
  activityStatus?: string
  plannedStartAt?: string
  plannedEndAt?: string
  actualStartAt?: string
  customerName?: string
  sfAccountId?: string
  sfLeadId?: string
  companyType?: string | null
  description?: string
  channel?: string
}

type RegionPlan = {
  id: number
  subject?: string
  plannedStartAt?: string
  plannedEndAt?: string
  actualStartAt?: string | null
  actualEndAt?: string | null
  addrProvinceName?: string | null
  addrDistrictName?: string | null
  targetCount?: number
  targetLabels?: string | null
}

type AggregateStats = {
  empName: string
  assigneeId: string
  totalActivities: number
  completed: number
  scheduled: number
  completionRate: number
}

export function SalesMgmtActivitiesRightPanel() {
  const [sel, setSel] = useState<Selection | null>(null)
  const [items, setItems] = useState<Activity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Region activity plan data
  const [regionPlans, setRegionPlans] = useState<RegionPlan[]>([])
  const [regionLoading, setRegionLoading] = useState(false)
  const [regionError, setRegionError] = useState<string | null>(null)

  // Aggregate stats for all salespeople
  const [aggregateStats, setAggregateStats] = useState<AggregateStats[]>([])
  const [aggregateLoading, setAggregateLoading] = useState(true)
  const [aggregateError, setAggregateError] = useState<string | null>(null)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; activity: Activity } | null>(null)

  // Activity detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailActivity, setDetailActivity] = useState<Activity | null>(null)

  // Close context menu on click outside or ESC
  useEffect(() => {
    if (!contextMenu) return
    const handleClick = () => setContextMenu(null)
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setContextMenu(null) }
    window.addEventListener('click', handleClick)
    window.addEventListener('keydown', handleEsc)
    return () => {
      window.removeEventListener('click', handleClick)
      window.removeEventListener('keydown', handleEsc)
    }
  }, [contextMenu])

  // Handle right-click on activity row
  const handleActivityContextMenu = (e: React.MouseEvent, activity: Activity) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, activity })
  }

  // Open activity detail modal
  const openActivityDetail = (activity: Activity) => {
    setDetailActivity(activity)
    setDetailModalOpen(true)
    setContextMenu(null)
  }

  // Load aggregate stats for all salespeople on initial load
  useEffect(() => {
    let cancelled = false
    async function loadAggregate() {
      setAggregateLoading(true)
      setAggregateError(null)
      try {
        // Get current week range
        const r = getWeekRange(0)
        const p = new URLSearchParams()
        p.set('mineOnly', 'false')
        p.set('onlyRoot', 'true')
        p.set('start', r.start.toISOString())
        p.set('end', r.end.toISOString())

        const res = await fetch(`/api/v1/sales-activities?${p.toString()}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const activities = await res.json()
        if (cancelled) return

        // Group by assignee
        const byAssignee = new Map<string, Activity[]>()
        for (const activity of (Array.isArray(activities) ? activities : [])) {
          const aid = activity.sfOwnerId || activity.assigneeId
          if (!aid) continue
          const key = String(aid)
          if (!byAssignee.has(key)) {
            byAssignee.set(key, [])
          }
          byAssignee.get(key)!.push({
            id: Number(activity.id),
            subject: activity.subject,
            activityType: activity.activityType,
            activityStatus: activity.activityStatus,
            plannedStartAt: activity.plannedStartAt,
            plannedEndAt: activity.plannedEndAt,
            customerName: activity.customerName,
            sfAccountId: activity.sfAccountId,
          })
        }

        // Get employee list for names
        const empRes = await fetch('/api/v1/employees')
        const empList = empRes.ok ? await empRes.json() : []
        const empMap = new Map<string, string>()
        for (const emp of (Array.isArray(empList) ? empList : [])) {
          const id = String(emp.assignee_id ?? emp.emp_id)
          empMap.set(id, String(emp.emp_name ?? id))
        }

        // Calculate stats for each person
        const stats: AggregateStats[] = []
        for (const [assigneeId, activities] of byAssignee.entries()) {
          const total = activities.length
          const completed = activities.filter(a => a.activityStatus === '완료' || a.activityStatus === 'completed').length
          const scheduled = activities.filter(a => a.activityStatus === '계획' || a.activityStatus === 'scheduled').length
          const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

          stats.push({
            empName: empMap.get(assigneeId) || assigneeId,
            assigneeId,
            totalActivities: total,
            completed,
            scheduled,
            completionRate
          })
        }

        // Sort by total activities descending
        stats.sort((a, b) => b.totalActivities - a.totalActivities)
        setAggregateStats(stats)
      } catch (e: any) {
        if (cancelled) return
        setAggregateError('전체 활동 요약을 불러오지 못했습니다')
      } finally {
        if (!cancelled) setAggregateLoading(false)
      }
    }
    loadAggregate()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const onSel = (e: any) => {
      const d = e?.detail || {}
      if (!d.assigneeId || !d.startIso || !d.endIso) return
      setSel({
        assigneeId: String(d.assigneeId),
        empName: String(d.empName || ''),
        startIso: String(d.startIso),
        endIso: String(d.endIso),
        status: d.status === 'completed' ? 'completed' : d.status === 'scheduled' ? 'scheduled' : undefined,
        label: d.label,
        isRegion: d.isRegion || false,
      })
    }
    const onRegionSel = (e: any) => {
      const d = e?.detail || {}
      if (!d.assigneeId || !d.startIso || !d.endIso) return
      setSel({
        assigneeId: String(d.assigneeId),
        empName: String(d.empName || ''),
        startIso: String(d.startIso),
        endIso: String(d.endIso),
        label: d.label,
        isRegion: true,
      })
    }
    window.addEventListener('tnt.sales.activities.select' as any, onSel)
    window.addEventListener('tnt.sales.region-plans.select' as any, onRegionSel)
    return () => {
      window.removeEventListener('tnt.sales.activities.select' as any, onSel)
      window.removeEventListener('tnt.sales.region-plans.select' as any, onRegionSel)
    }
  }, [])

  // Load sales activities
  useEffect(() => {
    if (!sel || sel.isRegion) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const p = new URLSearchParams()
        p.set('mineOnly', 'true')
        p.set('assigneeId', sel.assigneeId)
        p.set('onlyRoot', 'true')
        p.set('start', sel.startIso)
        p.set('end', sel.endIso)
        const res = await fetch(`/api/v1/sales-activities?${p.toString()}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const list = await res.json()
        if (cancelled) return
        const arr: Activity[] = (Array.isArray(list) ? list : []).map((r: any) => ({
          id: Number(r.id),
          subject: r.subject,
          activityType: r.activityType,
          activityStatus: r.activityStatus,
          plannedStartAt: r.plannedStartAt,
          plannedEndAt: r.plannedEndAt,
          actualStartAt: r.actualStartAt,
          customerName: r.customerName,
          sfAccountId: r.sfAccountId,
          sfLeadId: r.sfLeadId,
          companyType: r.companyType,
          description: r.description,
          channel: r.channel,
        }))
        setItems(arr)
      } catch (e: any) {
        if (cancelled) return
        setError('활동 내역을 불러오지 못했습니다')
        setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [sel?.assigneeId, sel?.startIso, sel?.endIso, sel?.isRegion])

  // Load region activity plans
  useEffect(() => {
    if (!sel || !sel.isRegion) return
    let cancelled = false
    async function loadRegion() {
      setRegionLoading(true)
      setRegionError(null)
      try {
        const p = new URLSearchParams()
        p.set('assigneeId', sel.assigneeId)
        p.set('start', sel.startIso)
        p.set('end', sel.endIso)
        const res = await fetch(`/api/v1/region-activity-plans?${p.toString()}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const list = await res.json()
        if (cancelled) return
        const arr: RegionPlan[] = (Array.isArray(list) ? list : []).map((r: any) => ({
          id: Number(r.id),
          subject: r.subject,
          plannedStartAt: r.planned_start_at || r.plannedStartAt,
          plannedEndAt: r.planned_end_at || r.plannedEndAt,
          actualStartAt: r.actual_start_at || r.actualStartAt,
          actualEndAt: r.actual_end_at || r.actualEndAt,
          addrProvinceName: r.addr_province_name || r.addrProvinceName,
          addrDistrictName: r.addr_district_name || r.addrDistrictName,
          targetCount: typeof r.target_count === 'number' ? r.target_count : (typeof r.targetCount === 'number' ? r.targetCount : 0),
          targetLabels: r.target_labels || r.targetLabels || null
        }))
        setRegionPlans(arr)
      } catch (e: any) {
        if (cancelled) return
        setRegionError('지역 활동 계획을 불러오지 못했습니다')
        setRegionPlans([])
      } finally {
        if (!cancelled) setRegionLoading(false)
      }
    }
    loadRegion()
    return () => { cancelled = true }
  }, [sel?.assigneeId, sel?.startIso, sel?.endIso, sel?.isRegion])

  const title = useMemo(() => {
    if (!sel) return '활동 상세'
    return `${sel.empName || sel.assigneeId} — ${sel.label || ''}`.trim()
  }, [sel])

  function fmtLocal(dt?: string) {
    if (!dt) return ''
    const d = new Date(dt)
    if (isNaN(d.getTime())) return ''
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${mm}-${dd} ${hh}:${mi}`
  }

  // Chart state for 4-week trend (recent activity trend)
  const [chart, setChart] = useState<{ weeks: string[]; weekDates: string[]; counts: number[]; max: number; customerName?: string } | null>(null)
  const [chartLoading, setChartLoading] = useState(false)
  const [chartError, setChartError] = useState<string | null>(null)
  const chartRef = useRef<HTMLDivElement | null>(null)
  const [chartWidth, setChartWidth] = useState(0)

  useEffect(() => {
    const el = chartRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setChartWidth(entry.contentRect.width)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  function weekMonday(d: Date) {
    const base = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const day = base.getDay() // 0=Sun..6=Sat
    const diffToMon = (day + 6) % 7 // Mon=0
    const monday = new Date(base)
    monday.setDate(base.getDate() - diffToMon)
    monday.setHours(0,0,0,0)
    return monday
  }
  function weekKey(d: Date) {
    const monday = weekMonday(d)
    const mm = String(monday.getMonth() + 1).padStart(2, '0')
    const dd = String(monday.getDate()).padStart(2, '0')
    return `${mm}-${dd}`
  }
  function weekOfYear(d: Date) {
    // ISO 8601 week number calculation
    const target = new Date(d.valueOf())
    const dayNr = (d.getDay() + 6) % 7 // Mon=0, Sun=6
    target.setDate(target.getDate() - dayNr + 3) // Nearest Thursday
    const jan4 = new Date(target.getFullYear(), 0, 4)
    const dayDiff = (target.valueOf() - jan4.valueOf()) / 86400000
    const weekNum = 1 + Math.floor(dayDiff / 7)
    return weekNum
  }

  async function showCustomerWeekly(row: Activity) {
    setChart(null)
    setChartLoading(true)
    setChartError(null)
    try {
      // 4-week trend: recent 4 weeks ending last week (avoid partial current week)
      const prev = getWeekRange(-1)
      const end = new Date(prev.end)
      end.setHours(23,59,59,999)
      const startMonday = new Date(prev.start)
      startMonday.setDate(startMonday.getDate() - 7 * 3) // 4 weeks window
      startMonday.setHours(0,0,0,0)
      const p = new URLSearchParams()
      p.set('mineOnly', 'false')
      p.append('status', 'completed')
      p.set('start', startMonday.toISOString())
      p.set('end', end.toISOString())
      if (row.sfAccountId) {
        p.set('sfAccountId', String(row.sfAccountId))
      } else if (row.customerName) {
        p.set('customerName', String(row.customerName))
      }
      console.log('[Chart Debug] API params:', {
        customerName: row.customerName,
        sfAccountId: row.sfAccountId,
        start: startMonday.toISOString(),
        end: end.toISOString(),
        url: `/api/v1/sales-activities?${p.toString()}`
      })
      const res = await fetch(`/api/v1/sales-activities?${p.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const list = await res.json()
      console.log('[Chart Debug] API response:', list)
      const buckets = new Map<string, number>()
      // Initialize 4-week buckets from computed start Monday
      const weeks: string[] = []
      const weekDates: string[] = []
      const tmp = new Date(startMonday)
      for (let i = 0; i < 4; i++) {
        const monday = weekMonday(tmp)
        const label = weekKey(monday)
        weeks.push(label)
        weekDates.push(monday.toISOString())
        buckets.set(label, 0)
        tmp.setDate(tmp.getDate() + 7)
      }
      console.log('[Chart Debug] Week buckets initialized:', Array.from(buckets.keys()))
      for (const r of (Array.isArray(list) ? list : [])) {
        const dt = r.plannedStartAt ? new Date(r.plannedStartAt) : null
        if (!dt || isNaN(dt.getTime())) continue
        const label = weekKey(dt)
        console.log('[Chart Debug] Activity date:', r.plannedStartAt, '-> label:', label, 'has bucket:', buckets.has(label))
        if (buckets.has(label)) buckets.set(label, (buckets.get(label) || 0) + 1)
      }
      const counts = weeks.map((w) => buckets.get(w) || 0)
      const max = 20 // Fixed Y-axis max
      console.log('[Chart Debug] Final counts:', counts, 'max:', max)
      setChart({ weeks, weekDates, counts, max, customerName: row.customerName })
    } catch (e: any) {
      setChartError('최근 4주 완료 활동 집계를 불러오지 못했습니다')
    } finally {
      setChartLoading(false)
    }
  }

  // Performance summary stats for sales activities
  const stats = useMemo(() => {
    const total = items.length
    const completed = items.filter((it) => it.activityStatus === '완료' || it.activityStatus === 'completed').length
    const scheduled = items.filter((it) => it.activityStatus === '계획' || it.activityStatus === 'scheduled').length
    const cancelled = items.filter((it) => it.activityStatus === '취소' || it.activityStatus === 'cancelled').length
    const postponed = items.filter((it) => it.activityStatus === '연기' || it.activityStatus === 'postponed').length
    const noVisit = items.filter((it) => it.activityStatus === '미방문' || it.activityStatus === 'no_visit').length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    const typeDistribution = new Map<string, number>()
    for (const it of items) {
      const typ = it.activityType || '기타'
      typeDistribution.set(typ, (typeDistribution.get(typ) || 0) + 1)
    }
    return { total, completed, scheduled, cancelled, postponed, noVisit, completionRate, typeDistribution }
  }, [items])

  // Performance summary stats for region plans
  const regionStats = useMemo(() => {
    const total = regionPlans.length
    const completed = regionPlans.filter((it) => it.actualStartAt != null || it.actualEndAt != null).length
    const scheduled = regionPlans.filter((it) => it.actualStartAt == null && it.actualEndAt == null).length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, scheduled, completionRate }
  }, [regionPlans])

  // Show aggregate view if no selection
  if (!sel) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>영업사원 전체 활동 현황</h2>
          <div className="muted" style={{ fontSize: 11 }}>이번주</div>
        </div>

        {aggregateLoading ? (
          <div className="muted" style={{ fontSize: 12 }}>불러오는 중…</div>
        ) : aggregateError ? (
          <div className="error" style={{ fontSize: 12 }}>{aggregateError}</div>
        ) : aggregateStats.length === 0 ? (
          <div className="muted" style={{ fontSize: 12 }}>활동 데이터가 없습니다.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <div className="card" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8, textAlign: 'center' }}>
                <div className="muted" style={{ fontSize: 10, marginBottom: 4 }}>전체 활동</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>
                  {aggregateStats.reduce((sum, s) => sum + s.totalActivities, 0)}
                </div>
              </div>
              <div className="card" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8, textAlign: 'center' }}>
                <div className="muted" style={{ fontSize: 10, marginBottom: 4 }}>완료</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>
                  {aggregateStats.reduce((sum, s) => sum + s.completed, 0)}
                </div>
              </div>
              <div className="card" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8, textAlign: 'center' }}>
                <div className="muted" style={{ fontSize: 10, marginBottom: 4 }}>계획</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>
                  {aggregateStats.reduce((sum, s) => sum + s.scheduled, 0)}
                </div>
              </div>
            </div>

            {/* Individual salesperson stats */}
            <div className="card" style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <table className="table" style={{ width: '100%' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--panel)', zIndex: 1 }}>
                    <tr>
                      <th style={{ textAlign: 'left' }}>영업사원</th>
                      <th style={{ textAlign: 'center', width: 80 }}>전체</th>
                      <th style={{ textAlign: 'center', width: 80 }}>완료</th>
                      <th style={{ textAlign: 'center', width: 80 }}>계획</th>
                      <th style={{ textAlign: 'center', width: 80 }}>달성률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregateStats.map((stat) => {
                      const rateColor = stat.completionRate >= 80 ? '#10b981' : stat.completionRate >= 50 ? '#f59e0b' : '#ef4444'
                      return (
                        <tr key={stat.assigneeId}>
                          <td style={{ fontWeight: 500 }}>{stat.empName}</td>
                          <td style={{ textAlign: 'center', color: '#3b82f6', fontWeight: 600 }}>{stat.totalActivities}</td>
                          <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 600 }}>{stat.completed}</td>
                          <td style={{ textAlign: 'center', color: '#f59e0b', fontWeight: 600 }}>{stat.scheduled}</td>
                          <td style={{ textAlign: 'center', color: rateColor, fontWeight: 700 }}>{stat.completionRate}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="muted" style={{ fontSize: 11, padding: 8, textAlign: 'center' }}>
              좌측 그래프를 클릭하면 개별 영업사원의 상세 활동을 볼 수 있습니다.
            </div>
          </div>
        )}
      </div>
    )
  }

  // Show region plan details if isRegion is true
  if (sel?.isRegion) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
        <div style={{ padding: '6px 10px', fontWeight: 600, fontSize: 13, borderBottom: '1px solid var(--border)' }}>
          {sel.empName || sel.assigneeId}
        </div>
        {regionLoading ? <div className="muted" style={{ fontSize: 12, padding: 8 }}>불러오는 중…</div> : null}
        {regionError ? <div className="error" style={{ fontSize: 12, padding: 8 }}>{regionError}</div> : null}

        {/* Region Plan Summary */}
        {!regionLoading && !regionError && regionPlans.length > 0 && (
          <div className="card" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--panel)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div className="muted" style={{ fontSize: 10, marginBottom: 4 }}>전체</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6' }}>{regionStats.total}</div>
              </div>
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div className="muted" style={{ fontSize: 10, marginBottom: 4 }}>완료</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>{regionStats.completed}</div>
              </div>
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div className="muted" style={{ fontSize: 10, marginBottom: 4 }}>계획</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>{regionStats.scheduled}</div>
              </div>
              <div style={{ textAlign: 'center', padding: '8px 0', borderLeft: '1px solid var(--border)' }}>
                <div className="muted" style={{ fontSize: 10, marginBottom: 4 }}>달성률</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: regionStats.completionRate >= 80 ? '#10b981' : regionStats.completionRate >= 50 ? '#f59e0b' : '#ef4444' }}>
                  {regionStats.completionRate}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Region Plan List */}
        <div className="table-container" style={{ flex: 1, minHeight: 0 }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>제목</th>
                <th style={{ width: 160 }}>지역</th>
                <th style={{ width: 80 }}>상태</th>
                <th style={{ width: 120 }}>시작</th>
                <th style={{ width: 120 }}>거래처수</th>
                <th style={{ width: 140 }}>종료</th>
              </tr>
            </thead>
            <tbody>
              {regionPlans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted" style={{ textAlign: 'center' }}>데이터가 없습니다.</td>
                </tr>
              ) : regionPlans.map((plan) => {
                const isCompleted = !!(plan.actualStartAt || plan.actualEndAt)
                const regionLabel = [plan.addrProvinceName, plan.addrDistrictName].filter(Boolean).join(' ')
                const endIso = (() => {
                  if (plan.actualEndAt) return plan.actualEndAt
                  if (plan.actualStartAt) return plan.actualStartAt
                  return null
                })()
                const targets = (plan.targetLabels || '').split(/\n+/).map((line) => line.trim()).filter(Boolean)
                return (
                  <React.Fragment key={plan.id}>
                    <tr>
                      <td title={plan.subject || ''}>{plan.subject || ''}</td>
                      <td>{regionLabel || '-'}</td>
                      <td>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          background: isCompleted ? 'rgba(16,185,129,.15)' : 'rgba(245,158,11,.15)',
                          color: isCompleted ? '#10b981' : '#f59e0b'
                        }}>
                          {isCompleted ? '완료' : '계획'}
                        </span>
                      </td>
                      <td>{fmtLocal(plan.plannedStartAt)}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{plan.targetCount ?? 0}</td>
                      <td>{fmtLocal(endIso || undefined)}</td>
                    </tr>
                    {targets.length > 0 ? (
                      <tr>
                        <td colSpan={6} style={{ background: 'var(--panel-2)', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginLeft: 28 }}>
                            {targets.map((line, idx) => {
                              const typeChar = line.charAt(0)
                              const name = line.slice(1).trim()
                              const color = typeChar === 'T' ? '#3b82f6' : typeChar === 'D' ? '#f97316' : typeChar === '잠' ? '#a855f7' : '#6b7280'
                              const label = typeChar === '잠' ? '잠' : (typeChar === 'T' || typeChar === 'D' ? typeChar : '거')
                              return (
                                <span key={`${plan.id}-target-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                                  <span style={{
                                    width: 14,
                                    height: 14,
                                    borderRadius: '50%',
                                    background: color,
                                    color: '#fff',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 9,
                                    fontWeight: 700
                                  }}>
                                    {label}
                                  </span>
                                  <span>{name}</span>
                                </span>
                              )
                            })}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Show sales activity details
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      <div style={{ padding: '6px 10px', fontWeight: 600, fontSize: 13, borderBottom: '1px solid var(--border)' }}>
        {sel.empName || sel.assigneeId}
      </div>
      {loading ? <div className="muted" style={{ fontSize: 12, padding: 8 }}>불러오는 중…</div> : null}
      {error ? <div className="error" style={{ fontSize: 12, padding: 8 }}>{error}</div> : null}

      {/* Performance Summary Card - Detailed */}
      {!loading && !error && items.length > 0 && (
        <div className="card" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--panel)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
            <div style={{ textAlign: 'center', padding: '6px 0' }}>
              <div className="muted" style={{ fontSize: 10, marginBottom: 4 }}>전체</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6' }}>{stats.total}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '6px 0' }}>
              <div className="muted" style={{ fontSize: 10, marginBottom: 4 }}>완료</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>{stats.completed}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '6px 0' }}>
              <div className="muted" style={{ fontSize: 10, marginBottom: 4 }}>계획</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>{stats.scheduled}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            <div style={{ textAlign: 'center', padding: '6px 0' }}>
              <div className="muted" style={{ fontSize: 10, marginBottom: 4 }}>취소</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#6b7280' }}>{stats.cancelled}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '6px 0' }}>
              <div className="muted" style={{ fontSize: 10, marginBottom: 4 }}>연기</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#6b7280' }}>{stats.postponed}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '6px 0' }}>
              <div className="muted" style={{ fontSize: 10, marginBottom: 4 }}>미방문</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#6b7280' }}>{stats.noVisit}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '6px 0', borderLeft: '1px solid var(--border)' }}>
              <div className="muted" style={{ fontSize: 10, marginBottom: 4 }}>달성률</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: stats.completionRate >= 80 ? '#10b981' : stats.completionRate >= 50 ? '#f59e0b' : '#ef4444' }}>
                {stats.completionRate}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Type Distribution - Compact */}
      {!loading && !error && items.length > 0 && stats.typeDistribution.size > 0 && (
        <div className="card" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--panel)' }}>
          <div style={{ fontSize: 11, marginBottom: 6, color: 'var(--text-muted)', fontWeight: 600 }}>활동 유형</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Array.from(stats.typeDistribution.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([type, count]) => {
                const pct = Math.round((count / stats.total) * 100)
                return (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ minWidth: 70, fontSize: 11, color: 'var(--text)' }}>{type}</div>
                    <div style={{ flex: 1, position: 'relative', height: 18, background: 'rgba(0,0,0,.06)', borderRadius: 3 }}>
                      <div style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
                        borderRadius: 3,
                        transition: 'width .3s ease'
                      }} />
                      <div style={{
                        position: 'absolute',
                        right: 4,
                        top: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: 10,
                        fontWeight: 600,
                        color: 'var(--text)'
                      }}>
                        {count}
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      <div className="table-container" style={{ flex: '0 0 40%', minHeight: 0 }}>
        <table className="table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>거래처</th>
              <th>제목</th>
              <th style={{ width: 110 }}>유형</th>
              <th style={{ width: 110 }}>상태</th>
              <th style={{ width: 120 }}>시작</th>
              <th style={{ width: 120 }}>종료</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted" style={{ textAlign: 'center' }}>데이터가 없습니다.</td>
              </tr>
            ) : items.map((it) => (
              <tr
                key={it.id}
                onClick={() => showCustomerWeekly(it)}
                onContextMenu={(e) => handleActivityContextMenu(e, it)}
                style={{ cursor: 'pointer' }}
                title="좌클릭: 주간 완료 활동 집계 / 우클릭: 활동 상세"
              >
                <td title={it.customerName || ''}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {(() => {
                      const type = (it.companyType || '').toUpperCase()
                      const isLead = !!it.sfLeadId
                      if (type.includes('TNT')) {
                        return <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>T</span>
                      }
                      if (type.includes('DYS')) {
                        return <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#f97316', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>D</span>
                      }
                      if (isLead) {
                        return <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#a855f7', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>잠</span>
                      }
                      return null
                    })()}
                    <span>{it.customerName || '-'}</span>
                  </span>
                </td>
                <td title={it.subject || ''}>{it.subject || ''}</td>
                <td>{it.activityType || ''}</td>
                <td>{it.activityStatus || ''}</td>
                <td>{fmtLocal(it.plannedStartAt)}</td>
                <td>{fmtLocal(it.plannedEndAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Weekly completed chart */}
      <div style={{ marginTop: 8, flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {chartLoading ? <div className="muted" style={{ fontSize: 12 }}>주간 집계를 불러오는 중…</div> : null}
        {chartError ? <div className="error" style={{ fontSize: 12 }}>{chartError}</div> : null}
        {chart && (() => {
          const n = chart.weeks.length
          const gap = 6
          const yAxisW = 32
          const innerW = Math.max(0, chartWidth - yAxisW - 8)
          const barW = n > 0 ? Math.max(12, Math.min(36, Math.floor((innerW - gap * (n - 1)) / n))) : 14
          const barAreaH = 120 // drawable height for bars (align axes/lines)
          // Year-based week labels: N주차 based on each week's Monday
          const weekLabels = chart.weekDates.map((iso) => {
            const monday = new Date(iso)
            const n = weekOfYear(monday)
            return `${n}주차`
          })
          // Group consecutive weeks by month (year-aware) for exact alignment
          const weekMonth = chart.weekDates.map((iso) => {
            const d = new Date(iso)
            const y = d.getFullYear()
            const m = d.getMonth() + 1
            return { key: `${y}-${String(m).padStart(2, '0')}`, label: `${m}월` }
          })
          const groups: { key: string; label: string; start: number; count: number }[] = []
          for (let i = 0; i < weekMonth.length; i++) {
            if (i === 0) {
              groups.push({ key: weekMonth[i].key, label: weekMonth[i].label, start: 0, count: 1 })
            } else if (weekMonth[i].key === weekMonth[i - 1].key) {
              groups[groups.length - 1].count += 1
            } else {
              groups.push({ key: weekMonth[i].key, label: weekMonth[i].label, start: i, count: 1 })
            }
          }
          const groupWidth = (gCount: number) => gCount * barW + (gCount - 1) * gap
          return (
            <div ref={chartRef} className="card" style={{ padding: 8, border: '1px solid var(--border)', borderRadius: 10 }}>
              {/* Axis + Bars */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                {/* Y-axis (max and 0) */}
                <div style={{ height: barAreaH, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: 6, color: 'var(--muted)', fontSize: 10 }}>
                  <div>{chart.max}</div>
                  <div>0</div>
                </div>
                <div style={{ position: 'relative', flex: 1 }}>
                  {/* Baseline */}
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, background: 'var(--border)' }} />
                  {/* Bars grouped by month with month boundary line at group start */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', height: barAreaH }}>
                    {groups.map((g, gi) => (
                      <div key={`g-${g.key}-${gi}`} style={{ display: 'flex', flexDirection: 'column', position: 'relative', marginLeft: gi > 0 ? gap : 0 }}>
                        {gi > 0 ? (
                          <div style={{ position: 'absolute', left: 0, bottom: 0, height: barAreaH, width: 1, background: 'var(--border)', opacity: 0.5 }} />
                        ) : null}
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: gap, height: barAreaH }}>
                          {Array.from({ length: g.count }).map((_, j) => {
                            const idx = g.start + j
                            const w = chart.weeks[idx]
                            const v = chart.counts[idx]
                            const hPct = chart.max > 0 ? Math.round((v / chart.max) * 100) : 0
                            return (
                              <div key={w} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', width: barW, height: barAreaH }}>
                                {v > 0 && (
                                  <div style={{ height: `${hPct}%`, minHeight: 8, width: Math.max(8, barW - 6), background: '#3b82f6', borderRadius: 4 }} title={`${weekLabels[idx]}: ${v}건`} />
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Week labels grouped by month (keeps gap consistent) */}
                  <div style={{ display: 'flex', marginTop: 4 }}>
                    {groups.map((g, gi) => (
                      <div key={`gl-${g.key}-${gi}`} style={{ display: 'flex', gap: gap, marginLeft: gi > 0 ? gap : 0 }}>
                        {Array.from({ length: g.count }).map((_, j) => {
                          const idx = g.start + j
                          return (
                            <div key={`w-${idx}`} className="muted" style={{ minWidth: barW, textAlign: 'center', fontSize: 10, whiteSpace: 'nowrap' }}>{weekLabels[idx]}</div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                  {/* Month labels spanning each group width */}
                  <div style={{ display: 'flex', marginTop: 2 }}>
                    {groups.map((g, gi) => (
                      <div key={`gm-${g.key}-${gi}`} style={{ width: groupWidth(g.count), marginLeft: gi > 0 ? gap : 0, textAlign: 'center', fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{g.label}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,.15)',
            zIndex: 10000,
            minWidth: 160,
            padding: '4px 0'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="btn"
            onClick={() => openActivityDetail(contextMenu.activity)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '8px 16px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 0
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            활동 상세
          </button>
        </div>
      )}

      {/* Activity Detail Modal */}
      {detailModalOpen && detailActivity && (
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
          onClick={() => setDetailModalOpen(false)}
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
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>영업활동 상세</h3>
              <button
                className="btn"
                onClick={() => setDetailModalOpen(false)}
                style={{
                  padding: '4px 12px',
                  fontSize: 13,
                  background: 'var(--panel-2)',
                  border: '1px solid var(--border)'
                }}
              >
                닫기
              </button>
            </div>
            <SalesActivityForm
              bare
              editId={detailActivity.id}
              initial={{
                id: detailActivity.id,
                subject: detailActivity.subject,
                description: detailActivity.description,
                channel: detailActivity.channel,
                activityType: detailActivity.activityType,
                activityStatus: detailActivity.activityStatus,
                plannedStartAt: detailActivity.plannedStartAt,
                actualStartAt: detailActivity.actualStartAt,
                sfAccountId: detailActivity.sfAccountId,
                customerName: detailActivity.customerName,
              }}
              onSaved={() => {
                setDetailModalOpen(false)
                // Reload activities to reflect changes
                if (sel && !sel.isRegion) {
                  const p = new URLSearchParams()
                  p.set('mineOnly', 'true')
                  p.set('assigneeId', sel.assigneeId)
                  p.set('onlyRoot', 'true')
                  p.set('start', sel.startIso)
                  p.set('end', sel.endIso)
                  fetch(`/api/v1/sales-activities?${p.toString()}`)
                    .then((res) => res.ok ? res.json() : [])
                    .then((list) => {
                      const arr: Activity[] = (Array.isArray(list) ? list : []).map((r: any) => ({
                        id: Number(r.id),
                        subject: r.subject,
                        activityType: r.activityType,
                        activityStatus: r.activityStatus,
                        plannedStartAt: r.plannedStartAt,
                        plannedEndAt: r.plannedEndAt,
                        actualStartAt: r.actualStartAt,
                        customerName: r.customerName,
                        sfAccountId: r.sfAccountId,
                        sfLeadId: r.sfLeadId,
                        companyType: r.companyType,
                        description: r.description,
                        channel: r.channel,
                      }))
                      setItems(arr)
                    })
                    .catch(() => {})
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
