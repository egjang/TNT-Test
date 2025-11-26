import React, { useEffect, useState, useMemo } from 'react'

type MonthData = { month: number; planned: number; completed: number }
type EmployeeActivity = {
    empId: string
    empName: string
    deptName: string
    months: MonthData[]
}

// Helper to get ISO week number
function getWeekNumber(d: Date) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    var weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    return weekNo
}

function getDateRangeOfWeek(year: number, week: number) {
    const simple = new Date(year, 0, 1 + (week - 1) * 7)
    const dow = simple.getDay()
    const ISOweekStart = simple
    if (dow <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1)
    else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay())

    const start = new Date(ISOweekStart)
    const end = new Date(ISOweekStart)
    end.setDate(end.getDate() + 6)
    return { start, end }
}

type DailyData = {
    empId: string
    empName: string
    deptName: string
    date: string
    planned: number
    completed: number
}

type ChartItem = {
    label: string
    value: number
    subValue?: number // e.g. planned
    tooltip?: string
}

type CardItem = {
    empId: string
    empName: string
    deptName: string
    planned: number
    completed: number
    chartData: ChartItem[]
}

export function ActivityAnalysisAG() {
    // Default to current date
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const currentWeek = getWeekNumber(now)

    // Active Search State
    const [searchParams, setSearchParams] = useState<{
        year: number,
        month: number | 'all',
        week: number | 'all',
        activityType: 'all' | 'sales' | 'region'
    }>({ year: currentYear, month: currentMonth, week: currentWeek, activityType: 'all' })

    const [yearlyData, setYearlyData] = useState<EmployeeActivity[]>([]) // For Heatmap (Always Year)
    const [dailyData, setDailyData] = useState<DailyData[]>([]) // For Month/Week views

    const [loading, setLoading] = useState(false)

    // Load Yearly Data (Heatmap) - Always fetch on mount or year change
    useEffect(() => {
        async function loadYearly() {
            try {
                const res = await fetch(`/api/v1/dashboard/activity-analysis?year=${searchParams.year}&activityType=${searchParams.activityType.toUpperCase()}`)
                if (res.ok) {
                    const result = await res.json()
                    setYearlyData(Array.isArray(result) ? result : [])
                }
            } catch (e) { console.error(e) }
        }
        loadYearly()
    }, [searchParams.year, searchParams.activityType])

    // Load Specific Data based on View Mode
    useEffect(() => {
        async function loadSpecific() {
            setLoading(true)
            try {
                const { year, month, week } = searchParams

                if (week !== 'all') {
                    // Week Mode: Fetch Daily Data for that week
                    const { start, end } = getDateRangeOfWeek(year, week as number)
                    const from = start.toISOString().split('T')[0]
                    const to = end.toISOString().split('T')[0]
                    const res = await fetch(`/api/v1/dashboard/daily-activity?from=${from}&to=${to}`)
                    if (res.ok) setDailyData(await res.json())
                } else if (month !== 'all') {
                    // Month Mode: Fetch Daily Data for that month
                    const start = new Date(year, (month as number) - 1, 1)
                    const end = new Date(year, (month as number), 0)
                    const from = start.toISOString().split('T')[0]
                    const to = end.toISOString().split('T')[0]
                    const res = await fetch(`/api/v1/dashboard/daily-activity?from=${from}&to=${to}`)
                    if (res.ok) setDailyData(await res.json())
                } else {
                    // Year Mode: Already fetched in yearlyData, no extra fetch needed
                    setDailyData([])
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        loadSpecific()
    }, [searchParams])

    const handleSearch = () => {
        setSearchParams({ year: formYear, month: formMonth, week: formWeek, activityType: formActivityType })
    }

    // Form State
    const [formYear, setFormYear] = useState<number>(currentYear)
    const [formMonth, setFormMonth] = useState<number | 'all'>(currentMonth)
    const [formWeek, setFormWeek] = useState<number | 'all'>(currentWeek)
    const [formActivityType, setFormActivityType] = useState<'all' | 'sales' | 'region'>('all')

    function getWeeksInMonth(year: number, month: number) {
        const weeks: number[] = []
        const date = new Date(year, month - 1, 1)
        const endDate = new Date(year, month, 0)

        while (date <= endDate) {
            const w = getWeekNumber(date)
            if (weeks.length === 0 || weeks[weeks.length - 1] !== w) {
                weeks.push(w)
            }
            date.setDate(date.getDate() + 1)
        }
        return weeks
    }

    // Derived Data for Cards
    const cardData: CardItem[] = useMemo(() => {
        const { year, month, week } = searchParams

        // Group dailyData by employee for lookup
        const dailyMap = new Map<string, DailyData[]>()
        dailyData.forEach(d => {
            if (!dailyMap.has(d.empId)) dailyMap.set(d.empId, [])
            dailyMap.get(d.empId)?.push(d)
        })

        if (week !== 'all') {
            // Week Mode: Chart = Days (Mon-Sun)
            const { start } = getDateRangeOfWeek(year, week as number)
            const days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(start)
                d.setDate(d.getDate() + i)
                return {
                    date: d.toISOString().split('T')[0],
                    label: ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
                }
            })

            return yearlyData.map(emp => {
                const items = dailyMap.get(emp.empId) || []
                const totalPlanned = items.reduce((s, i) => s + i.planned, 0)
                const totalCompleted = items.reduce((s, i) => s + i.completed, 0)

                const chartData = days.map(day => {
                    const found = items.find(i => i.date === day.date)
                    return {
                        label: day.label,
                        value: found?.completed || 0,
                        subValue: found?.planned || 0,
                        tooltip: `${day.date}: ${found?.completed || 0}/${found?.planned || 0}`
                    }
                })

                return {
                    empId: emp.empId,
                    empName: emp.empName,
                    deptName: emp.deptName,
                    planned: totalPlanned,
                    completed: totalCompleted,
                    chartData
                }
            })

        } else if (month !== 'all') {
            // Month Mode: Chart = Weeks
            const allWeeks = getWeeksInMonth(year, month as number)

            return yearlyData.map(emp => {
                const items = dailyMap.get(emp.empId) || []
                const totalPlanned = items.reduce((s, i) => s + i.planned, 0)
                const totalCompleted = items.reduce((s, i) => s + i.completed, 0)

                // Aggregate by week
                const weeksMap = new Map<number, { p: number, c: number }>()
                items.forEach(i => {
                    const w = getWeekNumber(new Date(i.date))
                    if (!weeksMap.has(w)) weeksMap.set(w, { p: 0, c: 0 })
                    const v = weeksMap.get(w)!
                    v.p += i.planned
                    v.c += i.completed
                })

                const chartData = allWeeks.map(w => ({
                    label: `${w}주차`,
                    value: weeksMap.get(w)?.c || 0,
                    subValue: weeksMap.get(w)?.p || 0,
                    tooltip: `${w}주차: ${weeksMap.get(w)?.c || 0}/${weeksMap.get(w)?.p || 0}`
                }))

                return {
                    empId: emp.empId,
                    empName: emp.empName,
                    deptName: emp.deptName,
                    planned: totalPlanned,
                    completed: totalCompleted,
                    chartData
                }
            })

        } else {
            // Year Mode: Chart = Months (1-12)
            return yearlyData.map(y => ({
                empId: y.empId,
                empName: y.empName,
                deptName: y.deptName,
                planned: y.months.reduce((s, m) => s + m.planned, 0),
                completed: y.months.reduce((s, m) => s + m.completed, 0),
                chartData: Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                    const found = y.months.find(d => d.month === m)
                    return {
                        label: `${m}월`,
                        value: found?.completed || 0,
                        subValue: found?.planned || 0,
                        tooltip: `${m}월: ${found?.completed || 0}/${found?.planned || 0}`
                    }
                })
            }))
        }
    }, [searchParams, yearlyData, dailyData])

    // Calculate Global Stats
    const totalPlanned = cardData.reduce((s, c) => s + c.planned, 0)
    const totalCompleted = cardData.reduce((s, c) => s + c.completed, 0)
    const completionRate = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0
    const topPerformer = [...cardData].sort((a, b) => b.completed - a.completed)[0]

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: 'calc(100vh - 120px)' }}>
            <div className="page-title" style={{ marginBottom: 0, padding: '8px 0', minHeight: 'auto', height: 'auto' }}>
                <h2 style={{ background: 'linear-gradient(90deg, #2563eb, #9333ea)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0, fontSize: 18 }}>
                    영업 활동 분석
                </h2>
                <div className="controls" style={{ display: 'flex', gap: 8, marginRight: 380 }}>
                    <div style={{ background: '#f3f4f6', padding: 4, borderRadius: 8, display: 'flex' }}>
                        {(['all', 'sales', 'region'] as const).map(type => {
                            const label = type === 'all' ? '전체' : type === 'sales' ? '활동' : '지역활동'
                            const isActive = formActivityType === type
                            return (
                                <button
                                    key={type}
                                    onClick={() => setFormActivityType(type)}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: 6,
                                        border: 'none',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        background: isActive ? '#fff' : 'transparent',
                                        color: isActive ? '#2563eb' : '#6b7280',
                                        boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {label}
                                </button>
                            )
                        })}
                    </div>

                    <select
                        className="subject-input"
                        value={formYear}
                        onChange={(e) => {
                            setFormYear(Number(e.target.value))
                            setFormWeek('all')
                        }}
                        style={{ width: 100, height: 30 }}
                    >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                            <option key={y} value={y}>{y}년</option>
                        ))}
                    </select>

                    <select
                        className="subject-input"
                        value={formMonth}
                        onChange={(e) => {
                            setFormMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))
                            setFormWeek('all')
                        }}
                        disabled={formWeek !== 'all'}
                        style={{ width: 100, opacity: formWeek !== 'all' ? 0.5 : 1, height: 30 }}
                    >
                        <option value="all">전체 월</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>{m}월</option>
                        ))}
                    </select>

                    <select
                        className="subject-input"
                        value={formWeek}
                        onChange={(e) => {
                            setFormWeek(e.target.value === 'all' ? 'all' : Number(e.target.value))
                            // Don't clear month if week is selected, as week depends on month now
                        }}
                        style={{ width: 100, height: 30 }}
                    >
                        <option value="all">전체 주</option>
                        {formMonth !== 'all'
                            ? getWeeksInMonth(formYear, formMonth as number).map(w => (
                                <option key={w} value={w}>{w}주차</option>
                            ))
                            : Array.from({ length: 53 }, (_, i) => i + 1).map(w => (
                                <option key={w} value={w}>{w}주차</option>
                            ))
                        }
                    </select>

                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        style={{
                            height: 30, // Match typical input height
                            padding: '0 12px',
                            background: 'var(--panel)',
                            border: '1px solid var(--border)',
                            borderRadius: 4,
                            color: 'var(--text)',
                            fontSize: 12,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                        }}
                    >
                        {loading ? '조회중...' : '조회'}
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                <SummaryCard title="총 계획" value={totalPlanned.toLocaleString()} icon="📅" color="#64748b" />
                <SummaryCard title="총 완료" value={totalCompleted.toLocaleString()} icon="✅" color="#2563eb" />
                <SummaryCard title="달성률" value={`${completionRate}%`} icon="📈" color={completionRate >= 80 ? '#10b981' : '#f59e0b'} />
                <SummaryCard title="최우수 사원" value={topPerformer ? topPerformer.empName : '-'} icon="🏆" color="#8b5cf6" sub={topPerformer?.deptName} />
            </div>

            {loading && cardData.length === 0 ? (
                <div className="card" style={{ padding: 24, textAlign: 'center', color: '#666' }}>데이터 분석 중...</div>
            ) : (
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: 4 }}>
                    {/* Heatmap Section - Always Yearly Data */}
                    <div className="card" style={{ padding: 16, marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>월별 활동 히트맵 ({searchParams.year}년)</h3>
                            <div style={{ fontSize: 11, color: '#64748b' }}>* 히트맵은 항상 연간 데이터를 표시합니다</div>
                        </div>
                        <ActivityHeatmap data={yearlyData} />
                    </div>

                    {/* Detailed Cards Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 8 }}>
                        {cardData.map(item => (
                            <EmployeeCard
                                key={item.empId}
                                empName={item.empName}
                                deptName={item.deptName}
                                planned={item.planned}
                                completed={item.completed}
                                chartData={item.chartData}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function SummaryCard({ title, value, icon, color, sub }: { title: string, value: string, icon: string, color: string, sub?: string }) {
    return (
        <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16, borderLeft: `4px solid ${color}` }}>
            <div style={{ fontSize: 24, background: `${color}20`, width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{title}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>{value}</div>
                {sub && <div style={{ fontSize: 11, color: '#94a3b8' }}>{sub}</div>}
            </div>
        </div>
    )
}

function ActivityHeatmap({ data }: { data: EmployeeActivity[] }) {
    const months = Array.from({ length: 12 }, (_, i) => i + 1)

    // Find max value for color scaling
    let maxVal = 0
    data.forEach(emp => {
        emp.months.forEach(m => {
            if (m.completed > maxVal) maxVal = m.completed
        })
    })

    const getColor = (val: number) => {
        if (val === 0) return '#f1f5f9'
        const intensity = Math.min(1, val / Math.max(1, maxVal))
        // Blue scale
        return `rgba(37, 99, 235, ${0.1 + intensity * 0.9})`
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                    <tr>
                        <th style={{ textAlign: 'left', padding: 8, color: '#64748b' }}>Employee</th>
                        {months.map(m => <th key={m} style={{ padding: 8, color: '#64748b' }}>{m}월</th>)}
                        <th style={{ padding: 8, color: '#64748b' }}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map(emp => {
                        const total = emp.months.reduce((s, m) => s + m.completed, 0)
                        return (
                            <tr key={emp.empId} style={{ borderTop: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '8px 12px', fontWeight: 500 }}>
                                    {emp.empName} <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 4 }}>{emp.deptName}</span>
                                </td>
                                {months.map(m => {
                                    const monthData = emp.months.find(d => d.month === m)
                                    const val = monthData?.completed || 0
                                    return (
                                        <td key={m} style={{ padding: 4, textAlign: 'center' }}>
                                            <div style={{
                                                background: getColor(val),
                                                color: val > maxVal / 2 ? '#fff' : '#1e293b',
                                                borderRadius: 4,
                                                padding: '4px 0',
                                                fontSize: 11,
                                                fontWeight: 600
                                            }}>
                                                {val > 0 ? val : '-'}
                                            </div>
                                        </td>
                                    )
                                })}
                                <td style={{ padding: 8, textAlign: 'center', fontWeight: 700 }}>{total}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

type EmployeeCardProps = {
    empName: string
    deptName: string
    planned: number
    completed: number
    chartData: ChartItem[]
}

function EmployeeCard({ empName, deptName, planned, completed, chartData }: EmployeeCardProps) {
    const rate = planned > 0 ? Math.round((completed / planned) * 100) : 0

    // Find max value for chart scaling
    const maxVal = Math.max(...chartData.map(c => Math.max(c.value, c.subValue || 0)), 1)

    return (
        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{empName}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{deptName}</div>
                </div>
                <div style={{
                    background: rate >= 90 ? '#dcfce7' : rate >= 70 ? '#fef9c3' : '#fee2e2',
                    color: rate >= 90 ? '#166534' : rate >= 70 ? '#854d0e' : '#991b1b',
                    padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700
                }}>
                    {rate}%
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                <div style={{ flex: 1, background: '#f8fafc', padding: 8, borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ color: '#64748b', fontSize: 10 }}>Planned</div>
                    <div style={{ fontWeight: 600 }}>{planned}</div>
                </div>
                <div style={{ flex: 1, background: '#eff6ff', padding: 8, borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ color: '#3b82f6', fontSize: 10 }}>Completed</div>
                    <div style={{ fontWeight: 600, color: '#2563eb' }}>{completed}</div>
                </div>
            </div>

            <div style={{ height: 100, display: 'flex', alignItems: 'flex-end', gap: 4, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                {chartData.map((d, i) => {
                    const h = Math.min(100, (d.value / maxVal) * 100)
                    return (
                        <div key={i} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }} title={d.tooltip}>
                            {/* Bar */}
                            <div style={{ width: '100%', background: '#f1f5f9', height: '100%', maxHeight: 80, borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                                <div style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    background: d.value > 0 ? '#3b82f6' : 'transparent',
                                    height: `${h}%`,
                                    transition: 'height 0.3s ease',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    justifyContent: 'center',
                                    paddingTop: 4
                                }}>
                                    {d.value > 0 && (
                                        <span style={{ fontSize: 10, color: '#fff', fontWeight: 700, lineHeight: 1, textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                                            {d.value}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* X-Axis Label */}
                            <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                                {d.label}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
