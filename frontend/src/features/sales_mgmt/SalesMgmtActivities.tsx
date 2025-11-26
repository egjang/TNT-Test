import React, { useEffect, useMemo, useState } from 'react'
import { getWeekRange, formatRange } from '../../utils/week'
import chevronLeft from '../../assets/icons/chevron-left.svg'
import chevronRight from '../../assets/icons/chevron-right.svg'
import targetIcon from '../../assets/icons/target.svg'
import aiSparkle from '../../assets/icons/ai-sparkle.svg'
import { ActivityAnalysisAIModal } from './ActivityAnalysisAIModal'

type WeekValue = { plan: number; actual: number }

type Person = {
  id: string
  name: string
  prevWeek: WeekValue
  thisWeek: WeekValue
  nextWeek: WeekValue
}

type PersonWithRate = Person & { achievementRate: number; prevTotal: number }

type SortOption = 'default' | 'rate-high' | 'rate-low'

function HBar({ value, max, color, label }: { value: number; max: number; color: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0))
  return (
    <div
      aria-label={label}
      style={{
        position: 'relative',
        width: '100%',
        height: 11,
        background: 'rgba(0,0,0,.04)',
        borderRadius: 999,
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: 999,
          transition: 'width .2s ease'
        }}
      />
      <div style={{ position: 'absolute', right: 6, top: 0, bottom: 0, display: 'flex', alignItems: 'center', fontSize: 10, color: 'var(--text)' }}>{value}</div>
    </div>
  )
}

export function SalesMgmtActivities() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Person[]>([])
  const [offset, setOffset] = useState<number>(0)
  const [sortBy, setSortBy] = useState<SortOption>('default')
  const [showAIModal, setShowAIModal] = useState(false)

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
        // 1) Load employees (authoritative order and membership)
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
        }))
        setData(base)

        // 2) Overlay weekly summary (if available). Keep employee array even on failure/empty.
        try {
          const [curSummary, prevSummary] = await Promise.all([
            fetchSummary(offset),
            fetchSummary(offset - 1)
          ])
          if (cancelled) return
          const curMap = buildSummaryMap(curSummary)
          const prevMap = buildPrevMap(prevSummary)
          setData(base.map((p) => {
            const cur = curMap.get(p.id)
            const prev = prevMap.get(p.id)
            return {
              ...p,
              prevWeek: { plan: prev?.plan ?? 0, actual: prev?.actual ?? 0 },
              thisWeek: { plan: cur?.thisPlan ?? 0, actual: cur?.thisActual ?? 0 },
              nextWeek: { plan: cur?.nextPlan ?? 0, actual: cur?.nextActual ?? 0 }
            }
          }))
        } catch (e) {
          // Keep base employees with zero values
          setError('주간 활동 요약을 불러오지 못했습니다')
        }
      } catch (e: any) {
        if (cancelled) return
        setError('직원 목록을 불러오지 못했습니다')
        // Fallback: attempt to use summary as last resort
        try {
          const summary = await fetchSummary(offset)
          const prevSummary = await fetchSummary(offset - 1).catch(() => [])
          if (cancelled) return
          const prevMap = buildPrevMap(prevSummary)
          const people: Person[] = (Array.isArray(summary) ? summary : []).map((e: any, i: number) => {
            const id = String(e.assignee_id ?? e.emp_id ?? i)
            const prev = prevMap.get(id)
            return {
              id,
              name: String(e.emp_name ?? ''),
              prevWeek: { plan: prev?.plan ?? 0, actual: prev?.actual ?? 0 },
              thisWeek: { plan: Number(e.thisWeek?.plan ?? 0), actual: Number(e.thisWeek?.actual ?? 0) },
              nextWeek: { plan: Number(e.nextWeek?.plan ?? 0), actual: Number(e.nextWeek?.actual ?? 0) },
            }
          })
          setData(people)
        } catch {
          // Final fallback minimal demo
          setData([
            { id: 'e01', name: '김영업', prevWeek: { plan: 0, actual: 0 }, thisWeek: { plan: 0, actual: 0 }, nextWeek: { plan: 0, actual: 0 } },
            { id: 'e02', name: '박세일', prevWeek: { plan: 0, actual: 0 }, thisWeek: { plan: 0, actual: 0 }, nextWeek: { plan: 0, actual: 0 } },
          ])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [offset])

  // Load region activity plans - only show employees with data
  useEffect(() => {
    let cancelled = false
    async function loadRegion() {
      setRegionLoading(true)
      setRegionError(null)
      try {
        // Fetch region activity weekly summary
        const [curSummary, prevSummary] = await Promise.all([
          fetchRegionSummary(offset),
          fetchRegionSummary(offset - 1)
        ])
        if (cancelled) return

        // Build maps
        const curMap = buildSummaryMap(curSummary)
        const prevMap = buildPrevMap(prevSummary)

        // Only include employees who have region activity data
        const employeesWithData = new Set<string>()
        for (const row of [...curSummary, ...prevSummary]) {
          const id = String(row.assignee_id ?? row.emp_id ?? '')
          if (id) employeesWithData.add(id)
        }

        // Build person list from summary data only
        const people: Person[] = Array.from(employeesWithData).map(id => {
          const cur = curMap.get(id)
          const prev = prevMap.get(id)
          // Get name from current or previous summary
          const nameRow = curSummary.find((r: any) => String(r.assignee_id ?? r.emp_id) === id) ||
                          prevSummary.find((r: any) => String(r.assignee_id ?? r.emp_id) === id)
          const name = nameRow ? String(nameRow.emp_name ?? id) : id

          return {
            id,
            name,
            prevWeek: { plan: prev?.plan ?? 0, actual: prev?.actual ?? 0 },
            thisWeek: { plan: cur?.thisPlan ?? 0, actual: cur?.thisActual ?? 0 },
            nextWeek: { plan: cur?.nextPlan ?? 0, actual: cur?.nextActual ?? 0 }
          }
        })

        // Sort by name
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

  // Calculate achievement rate for each person - sales activities (전주 기준)
  const dataWithRate = useMemo<PersonWithRate[]>(() => {
    return data.map((p) => {
      const plan = p.prevWeek.plan
      const actual = p.prevWeek.actual
      const rate = plan > 0 ? (actual / plan) * 100 : 0
      return { ...p, achievementRate: rate, prevTotal: plan }
    })
  }, [data])

  // Calculate achievement rate for region activities (전주 기준)
  const regionDataWithRate = useMemo<PersonWithRate[]>(() => {
    return regionData.map((p) => {
      const plan = p.prevWeek.plan
      const actual = p.prevWeek.actual
      const rate = plan > 0 ? (actual / plan) * 100 : 0
      return { ...p, achievementRate: rate, prevTotal: plan }
    })
  }, [regionData])

  // Sort data based on selected option
  const sortedData = useMemo(() => {
    const copy = [...dataWithRate]
    if (sortBy === 'rate-high') {
      return copy.sort((a, b) => b.achievementRate - a.achievementRate)
    } else if (sortBy === 'rate-low') {
      return copy.sort((a, b) => a.achievementRate - b.achievementRate)
    }
    return copy // default order
  }, [dataWithRate, sortBy])

  // Sort region data based on selected option
  const sortedRegionData = useMemo(() => {
    const copy = [...regionDataWithRate]
    if (sortBy === 'rate-high') {
      return copy.sort((a, b) => b.achievementRate - a.achievementRate)
    } else if (sortBy === 'rate-low') {
      return copy.sort((a, b) => a.achievementRate - b.achievementRate)
    }
    return copy // default order
  }, [regionDataWithRate, sortBy])

  const PLAN_COLOR = '#3b82f6' // 계획: blue-500
  const ACTL_COLOR = '#10b981' // 실적: emerald-500

  const handleWeekClick = React.useCallback((person: Person, relativeOffset: number, label: string, isRegion?: boolean) => {
    const r = getWeekRange(offset + relativeOffset)
    try {
      window.dispatchEvent(new CustomEvent(isRegion ? 'tnt.sales.region-plans.select' : 'tnt.sales.activities.select', {
        detail: {
          assigneeId: person.id,
          empName: person.name,
          startIso: r.start.toISOString(),
          endIso: r.end.toISOString(),
          label: `${person.name} · ${label} 계획/실적`,
          isRegion: isRegion || false
        }
      }) as any)
    } catch {}
  }, [offset])

  const baseRange = useMemo(() => formatRange(getWeekRange(offset)), [offset])

  // Helper to format achievement rate with color
  function formatRate(rate: number, hasData: boolean) {
    const color = rate >= 90 ? '#10b981' : rate >= 70 ? '#f59e0b' : '#ef4444'
    const display = hasData ? `${Math.round(rate)}%` : '-'
    return { display, color }
  }

  return (
    <section className="sales-activities-panel" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header Section */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        paddingBottom: 12,
        borderBottom: '2px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>활동관리</h1>
          <div className="muted" style={{ fontSize: 13, fontWeight: 500 }}>주간 계획·실적</div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Week Navigation */}
          <div className="card" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 12px',
            border: '1px solid var(--border)',
            borderRadius: 10,
            background: 'var(--panel)',
            boxShadow: '0 1px 3px rgba(0,0,0,.05)',
            height: 44
          }}>
            <button
              className="icon-button"
              title="전주"
              aria-label="전주"
              onClick={() => setOffset((v) => v - 1)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOffset((v) => v - 1) } }}
              style={{ width: 30, height: 30, borderRadius: 6 }}
            >
              <img src={chevronLeft} className="icon" alt="전주" />
            </button>
            <button
              className="icon-button"
              title="이번주로"
              aria-label="이번주로"
              onClick={() => setOffset(0)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOffset(0) } }}
              style={{ width: 30, height: 30, borderRadius: 6 }}
            >
              <img src={targetIcon} className="icon" alt="이번주로" />
            </button>
            <button
              className="icon-button"
              title="다음주"
              aria-label="다음주"
              onClick={() => setOffset((v) => v + 1)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOffset((v) => v + 1) } }}
              style={{ width: 30, height: 30, borderRadius: 6 }}
            >
              <img src={chevronRight} className="icon" alt="다음주" />
            </button>
            <span className="muted" style={{
              fontSize: 12,
              marginLeft: 4,
              whiteSpace: 'nowrap',
              fontWeight: 600,
              minWidth: 140,
              textAlign: 'center'
            }}>
              {baseRange}
            </span>
          </div>

          {/* Sort Selector */}
          <div className="card" style={{
            padding: '0 12px',
            border: '1px solid var(--border)',
            borderRadius: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--panel)',
            boxShadow: '0 1px 3px rgba(0,0,0,.05)',
            height: 44
          }}>
            <label htmlFor="sort-select" style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center' }}>정렬</label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              style={{
                fontSize: 12,
                padding: '4px 8px',
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--panel)',
                color: 'var(--text)',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              <option value="default">기본</option>
              <option value="rate-high">달성률 높은순</option>
              <option value="rate-low">달성률 낮은순</option>
            </select>
          </div>

          {/* Compact Legend */}
          <div className="card" style={{
            padding: '0 14px',
            border: '1px solid var(--border)',
            borderRadius: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 11,
            background: 'var(--panel)',
            boxShadow: '0 1px 3px rgba(0,0,0,.05)',
            height: 44
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, background: PLAN_COLOR, borderRadius: 2 }} />
              <span style={{ fontWeight: 500 }}>계획</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, background: ACTL_COLOR, borderRadius: 2 }} />
              <span style={{ fontWeight: 500 }}>실적</span>
            </div>
          </div>

          {/* AI Agent Button */}
          <button
            className="btn"
            onClick={() => setShowAIModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 16px',
              height: 44,
              border: '1px solid var(--accent)',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)'
            }}
          >
            <img src={aiSparkle} className="icon" alt="AI" style={{ filter: 'brightness(0) invert(1)', width: 18, height: 18 }} />
            <span>AI Agent(Beta)</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="muted" style={{ padding: 12, textAlign: 'center', fontSize: 13 }}>직원 목록을 불러오는 중…</div>
      ) : null}
      {error ? (
        <div className="error" style={{ padding: 12, borderRadius: 8, background: 'rgba(239,68,68,.1)', fontSize: 13 }}>{error}</div>
      ) : null}

      {/* Sales Activities Section */}
      <div style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,.04)'
      }}>
        <div style={{
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--text)',
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <span style={{
            width: 4,
            height: 18,
            background: '#3b82f6',
            borderRadius: 2
          }} />
          영업 활동
        </div>

        {sortedData.length === 0 ? (
          <div className="empty-state" style={{ padding: 16 }}>조회된 활동 데이터가 없습니다.</div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '140px 90px repeat(3, minmax(0, 1fr))',
              gap: '6px 12px',
              alignItems: 'center'
            }}
          >
            <div className="muted" style={{ fontSize: 12, fontWeight: 700 }}>영업사원</div>
            <div className="muted" style={{ fontSize: 12, textAlign: 'center', fontWeight: 700 }}>전주 달성률</div>
            <div className="muted" style={{ fontSize: 12, fontWeight: 700 }}>전주</div>
            <div className="muted" style={{ fontSize: 12, fontWeight: 700 }}>이번주</div>
            <div className="muted" style={{ fontSize: 12, fontWeight: 700 }}>차주</div>
            {sortedData.map((p) => {
              const rateInfo = formatRate(p.achievementRate, p.prevTotal > 0)
              const weeks = [
                { key: 'prev', label: '전주', data: p.prevWeek, offset: -1 },
                { key: 'this', label: '이번주', data: p.thisWeek, offset: 0 },
                { key: 'next', label: '차주', data: p.nextWeek, offset: 1 }
              ]
              return (
                <React.Fragment key={p.id}>
                  <div style={{ padding: '3px 0', fontWeight: 600, fontSize: 12 }}>{p.name}</div>
                  <div style={{ padding: '3px 0', textAlign: 'center', fontWeight: 700, color: rateInfo.color }}>
                    {rateInfo.display}
                  </div>
                  {weeks.map((wk) => (
                    <div
                      key={`${p.id}-${wk.key}`}
                      role="button"
                      tabIndex={0}
                      title={`${wk.label} 계획/실적 (클릭하여 상세보기)`}
                      style={{ cursor: 'pointer', padding: '3px 0' }}
                      onClick={() => handleWeekClick(p, wk.offset, wk.label)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleWeekClick(p, wk.offset, wk.label) } }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, pointerEvents: 'none' }}>
                        <HBar value={wk.data.plan} max={maxVal} color={PLAN_COLOR} label={`${p.name} ${wk.label} 계획`} />
                        <HBar value={wk.data.actual} max={maxVal} color={ACTL_COLOR} label={`${p.name} ${wk.label} 실적`} />
                      </div>
                    </div>
                  ))}
                </React.Fragment>
              )
            })}
          </div>
        )}
      </div>

      {/* Region Activity Plan Section */}
      <div style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,.04)'
      }}>
        <div style={{
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--text)',
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <span style={{
            width: 4,
            height: 18,
            background: '#10b981',
            borderRadius: 2
          }} />
          지역 활동 계획
        </div>

        {regionLoading ? (
          <div className="muted" style={{ padding: 12, textAlign: 'center', fontSize: 13 }}>지역 활동 계획을 불러오는 중…</div>
        ) : regionError ? (
          <div className="error" style={{ padding: 12, borderRadius: 8, background: 'rgba(239,68,68,.1)', fontSize: 13 }}>{regionError}</div>
        ) : sortedRegionData.length === 0 ? (
          <div className="muted" style={{ padding: 12, textAlign: 'center', fontSize: 13 }}>지역 활동 계획 데이터가 없습니다.</div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '140px 90px repeat(3, minmax(0, 1fr))',
              gap: '6px 12px',
              alignItems: 'center'
            }}
          >
            <div className="muted" style={{ fontSize: 12, fontWeight: 700 }}>영업사원</div>
            <div className="muted" style={{ fontSize: 12, textAlign: 'center', fontWeight: 700 }}>전주 달성률</div>
            <div className="muted" style={{ fontSize: 12, fontWeight: 700 }}>전주</div>
            <div className="muted" style={{ fontSize: 12, fontWeight: 700 }}>이번주</div>
            <div className="muted" style={{ fontSize: 12, fontWeight: 700 }}>차주</div>
            {sortedRegionData.map((p) => {
              const rateInfo = formatRate(p.achievementRate, p.prevTotal > 0)
              const weeks = [
                { key: 'prev', label: '전주', data: p.prevWeek, offset: -1 },
                { key: 'this', label: '이번주', data: p.thisWeek, offset: 0 },
                { key: 'next', label: '차주', data: p.nextWeek, offset: 1 }
              ]
              return (
                <React.Fragment key={p.id}>
                  <div style={{ padding: '3px 0', fontWeight: 600, fontSize: 12 }}>{p.name}</div>
                  <div style={{ padding: '3px 0', textAlign: 'center', fontWeight: 700, color: rateInfo.color }}>
                    {rateInfo.display}
                  </div>
                  {weeks.map((wk) => (
                    <div
                      key={`${p.id}-${wk.key}`}
                      role="button"
                      tabIndex={0}
                      title={`${wk.label} 계획/실적 (클릭하여 상세보기)`}
                      style={{ cursor: 'pointer', padding: '3px 0' }}
                      onClick={() => handleWeekClick(p, wk.offset, wk.label, true)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleWeekClick(p, wk.offset, wk.label, true) } }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, pointerEvents: 'none' }}>
                        <HBar value={wk.data.plan} max={regionMaxVal} color={PLAN_COLOR} label={`${p.name} ${wk.label} 계획`} />
                        <HBar value={wk.data.actual} max={regionMaxVal} color={ACTL_COLOR} label={`${p.name} ${wk.label} 실적`} />
                      </div>
                    </div>
                  ))}
                </React.Fragment>
              )
            })}
          </div>
        )}
      </div>

      {/* AI Analysis Modal */}
      <ActivityAnalysisAIModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
      />
    </section>
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
