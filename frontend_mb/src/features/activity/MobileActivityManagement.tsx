import { useEffect, useMemo, useState } from 'react'

type WeekValue = { plan: number; actual: number }

type Person = {
  id: string
  name: string
  prevWeek: WeekValue
  thisWeek: WeekValue
  nextWeek: WeekValue
  achievementRate: number
}

type SortOption = 'default' | 'rate-high' | 'rate-low'

function HBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0))
  return (
    <div className="relative w-full h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
      <div className="absolute right-1.5 top-0 bottom-0 flex items-center text-[10px] font-semibold text-slate-700 dark:text-slate-200">
        {value}
      </div>
    </div>
  )
}

export function MobileActivityManagement({ onBack }: { onBack?: () => void }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Person[]>([])
  const [offset, setOffset] = useState<number>(0)
  const [sortBy, setSortBy] = useState<SortOption>('default')
  const [activeTab, setActiveTab] = useState<'sales' | 'region'>('sales')

  // Region activity plan data
  const [regionData, setRegionData] = useState<Person[]>([])
  const [regionLoading, setRegionLoading] = useState(true)
  const [regionError, setRegionError] = useState<string | null>(null)

  // Load sales activities
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const empRes = await fetch('/api/v1/employees')
        if (!empRes.ok) throw new Error(`EMP HTTP ${empRes.status}`)
        const empList = await empRes.json()
        if (cancelled) return
        const base: Person[] = (Array.isArray(empList) ? empList : []).map((e: any, i: number) => ({
          id: String(e.assignee_id ?? e.emp_id ?? i),
          name: String(e.emp_name ?? ''),
          prevWeek: { plan: 0, actual: 0 },
          thisWeek: { plan: 0, actual: 0 },
          nextWeek: { plan: 0, actual: 0 },
          achievementRate: 0,
        }))
        setData(base)

        try {
          const [curSummary, prevSummary] = await Promise.all([
            fetchSummary(offset),
            fetchSummary(offset - 1)
          ])
          if (cancelled) return
          const curMap = buildSummaryMap(curSummary)
          const prevMap = buildPrevMap(prevSummary)
          const dataWithRate = base.map((p) => {
            const cur = curMap.get(p.id)
            const prev = prevMap.get(p.id)
            const thisWeek = { plan: cur?.thisPlan ?? 0, actual: cur?.thisActual ?? 0 }
            const total = thisWeek.plan + thisWeek.actual
            const rate = total > 0 ? (thisWeek.actual / total) * 100 : 0
            return {
              ...p,
              prevWeek: { plan: prev?.plan ?? 0, actual: prev?.actual ?? 0 },
              thisWeek,
              nextWeek: { plan: cur?.nextPlan ?? 0, actual: cur?.nextActual ?? 0 },
              achievementRate: rate
            }
          })
          setData(dataWithRate)
        } catch (e) {
          setError('주간 활동 요약을 불러오지 못했습니다')
        }
      } catch (e: any) {
        if (cancelled) return
        setError('직원 목록을 불러오지 못했습니다')
        setData([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [offset])

  // Load region activity plans
  useEffect(() => {
    let cancelled = false
    async function loadRegion() {
      setRegionLoading(true)
      setRegionError(null)
      try {
        const [curSummary, prevSummary] = await Promise.all([
          fetchRegionSummary(offset),
          fetchRegionSummary(offset - 1)
        ])
        if (cancelled) return

        const curMap = buildSummaryMap(curSummary)
        const prevMap = buildPrevMap(prevSummary)

        const employeesWithData = new Set<string>()
        for (const row of [...curSummary, ...prevSummary]) {
          const id = String(row.assignee_id ?? row.emp_id ?? '')
          if (id) employeesWithData.add(id)
        }

        const people: Person[] = Array.from(employeesWithData).map(id => {
          const cur = curMap.get(id)
          const prev = prevMap.get(id)
          const nameRow = curSummary.find((r: any) => String(r.assignee_id ?? r.emp_id) === id) ||
                          prevSummary.find((r: any) => String(r.assignee_id ?? r.emp_id) === id)
          const name = nameRow ? String(nameRow.emp_name ?? id) : id
          const thisWeek = { plan: cur?.thisPlan ?? 0, actual: cur?.thisActual ?? 0 }
          const total = thisWeek.plan + thisWeek.actual
          const rate = total > 0 ? (thisWeek.actual / total) * 100 : 0

          return {
            id,
            name,
            prevWeek: { plan: prev?.plan ?? 0, actual: prev?.actual ?? 0 },
            thisWeek,
            nextWeek: { plan: cur?.nextPlan ?? 0, actual: cur?.nextActual ?? 0 },
            achievementRate: rate
          }
        })

        people.sort((a, b) => a.name.localeCompare(b.name))
        setRegionData(people)
      } catch (e: any) {
        if (cancelled) return
        setRegionError('지역 활동 계획을 불러오지 못했습니다')
        setRegionData([])
      } finally {
        if (!cancelled) setRegionLoading(false)
      }
    }
    loadRegion()
    return () => { cancelled = true }
  }, [offset])

  const sortedData = useMemo(() => {
    const copy = [...data]
    if (sortBy === 'rate-high') {
      return copy.sort((a, b) => b.achievementRate - a.achievementRate)
    } else if (sortBy === 'rate-low') {
      return copy.sort((a, b) => a.achievementRate - b.achievementRate)
    }
    return copy
  }, [data, sortBy])

  const sortedRegionData = useMemo(() => {
    const copy = [...regionData]
    if (sortBy === 'rate-high') {
      return copy.sort((a, b) => b.achievementRate - a.achievementRate)
    } else if (sortBy === 'rate-low') {
      return copy.sort((a, b) => a.achievementRate - b.achievementRate)
    }
    return copy
  }, [regionData, sortBy])

  const maxVal = useMemo(() => {
    let m = 1
    for (const p of data) {
      m = Math.max(m, p.prevWeek.plan, p.prevWeek.actual, p.thisWeek.plan, p.thisWeek.actual, p.nextWeek.plan, p.nextWeek.actual)
    }
    return m
  }, [data])

  const regionMaxVal = useMemo(() => {
    let m = 1
    for (const p of regionData) {
      m = Math.max(m, p.prevWeek.plan, p.prevWeek.actual, p.thisWeek.plan, p.thisWeek.actual, p.nextWeek.plan, p.nextWeek.actual)
    }
    return m
  }, [regionData])

  const PLAN_COLOR = '#3b82f6'
  const ACTL_COLOR = '#10b981'

  function formatRate(rate: number) {
    const color = rate >= 90 ? '#10b981' : rate >= 70 ? '#f59e0b' : '#ef4444'
    const display = rate > 0 ? `${Math.round(rate)}%` : '-'
    return { display, color }
  }

  function formatWeekRange(offset: number): string {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(now)
    monday.setDate(now.getDate() + diff + (offset * 7))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`
    return `${fmt(monday)} ~ ${fmt(sunday)}`
  }

  const currentData = activeTab === 'sales' ? sortedData : sortedRegionData
  const currentLoading = activeTab === 'sales' ? loading : regionLoading
  const currentError = activeTab === 'sales' ? error : regionError
  const currentMaxVal = activeTab === 'sales' ? maxVal : regionMaxVal

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-10">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <svg
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                  <line x1="9" y1="12" x2="21" y2="12" />
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">활동관리</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">주간 계획·실적</p>
            </div>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="px-4 pb-4 flex items-center justify-between bg-white dark:bg-slate-800">
          <button
            onClick={() => setOffset((v) => v - 1)}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="text-center">
            <p className="font-semibold text-slate-800 dark:text-slate-100">
              {offset === 0 ? '이번주' : offset > 0 ? `${offset}주 후` : `${-offset}주 전`}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{formatWeekRange(offset)}</p>
          </div>
          <button
            onClick={() => setOffset((v) => v + 1)}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </button>
        </div>

        {/* Tab & Controls */}
        <div className="px-4 pb-3 space-y-3">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('sales')}
              className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                activeTab === 'sales'
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              영업 활동
            </button>
            <button
              onClick={() => setActiveTab('region')}
              className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                activeTab === 'region'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              지역 활동 계획
            </button>
          </div>

          {/* Sort & Legend */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="default">정렬: 기본</option>
                <option value="rate-high">정렬: 달성률 높은순</option>
                <option value="rate-low">정렬: 달성률 낮은순</option>
              </select>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: PLAN_COLOR }}></span>
                <span className="text-slate-600 dark:text-slate-300">계획</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: ACTL_COLOR }}></span>
                <span className="text-slate-600 dark:text-slate-300">실적</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {currentLoading ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">불러오는 중…</div>
        ) : currentError ? (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg text-sm">
            {currentError}
          </div>
        ) : currentData.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            활동 데이터가 없습니다
          </div>
        ) : (
          currentData.map((p) => {
            const rateInfo = formatRate(p.achievementRate)
            const weeks = [
              { key: 'prev', label: '전주', data: p.prevWeek },
              { key: 'this', label: '이번주', data: p.thisWeek },
              { key: 'next', label: '차주', data: p.nextWeek }
            ]

            return (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-sm"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{p.name}</p>
                  <div
                    className="px-2 py-1 text-sm font-bold rounded-md"
                    style={{
                      backgroundColor: rateInfo.color + '20',
                      color: rateInfo.color
                    }}
                  >
                    <span className="mr-1 text-[11px] text-slate-500 dark:text-slate-300">금주 달성율</span>
                    {rateInfo.display}
                  </div>
                </div>

                {/* Week Grid */}
                <div className="grid grid-cols-3 gap-3 text-xs text-slate-500 dark:text-slate-400">
                  {weeks.map((wk) => (
                    <div key={wk.key}>
                      <p className="mb-1.5 font-medium">{wk.label}</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <HBar value={wk.data.plan} max={currentMaxVal} color={PLAN_COLOR} />
                        </div>
                        <div className="flex items-center justify-between">
                          <HBar value={wk.data.actual} max={currentMaxVal} color={ACTL_COLOR} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

async function fetchSummary(offset: number) {
  const res = await fetch(`/api/v1/sales-activities/summary/weekly?offsetWeeks=${encodeURIComponent(offset)}&depts=all`)
  if (!res.ok) throw new Error(`SUM HTTP ${res.status}`)
  const summary = await res.json()
  return Array.isArray(summary) ? summary : []
}

async function fetchRegionSummary(offset: number) {
  const res = await fetch(`/api/v1/region-activity-plans/summary/weekly?offsetWeeks=${encodeURIComponent(offset)}&depts=all`)
  if (!res.ok) throw new Error(`REGION HTTP ${res.status}`)
  const summary = await res.json()
  return Array.isArray(summary) ? summary : []
}

function buildSummaryMap(rows: any[]) {
  const map = new Map<string, { thisPlan: number; thisActual: number; nextPlan: number; nextActual: number }>()
  for (const row of rows) {
    const key = String(row.assignee_id ?? row.emp_id ?? '')
    if (!key) continue
    const tw = row.thisWeek || {}
    const nw = row.nextWeek || {}
    map.set(key, {
      thisPlan: Number(tw.plan ?? 0),
      thisActual: Number(tw.actual ?? 0),
      nextPlan: Number(nw.plan ?? 0),
      nextActual: Number(nw.actual ?? 0)
    })
  }
  return map
}

function buildPrevMap(rows: any[]) {
  const map = new Map<string, { plan: number; actual: number }>()
  for (const row of rows) {
    const key = String(row.assignee_id ?? row.emp_id ?? '')
    if (!key) continue
    const tw = row.thisWeek || {}
    map.set(key, {
      plan: Number(tw.plan ?? 0),
      actual: Number(tw.actual ?? 0)
    })
  }
  return map
}
