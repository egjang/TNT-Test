import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'

interface ArrearsData {
    customerName: string
    deptName: string
    empName: string
    totalAr: number
    m1: number
    m2: number
    m3: number
    m4: number
    m5: number
    m6: number
    m7: number
    m8: number
    m9: number
    m10: number
    m11: number
    m12: number
    over12: number
}

interface RiskMapCellSelection {
    xMin: number
    xMax: number
    yMin: number
    yMax: number
}

export function ArrearsAnalysis({ companyType }: { companyType: string }) {
    const [data, setData] = useState<ArrearsData[]>([])
    const [loading, setLoading] = useState(false)
    const [filterType, setFilterType] = useState<'ALL' | 'OVERDUE_1_3M' | 'OVERDUE_3_6M' | 'OVERDUE_6_12M' | 'OVERDUE_12M'>('ALL')
    const [selectedCell, setSelectedCell] = useState<RiskMapCellSelection | null>(null)
    const [selectedAgingBar, setSelectedAgingBar] = useState<string | null>(null)
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const [chartDimensions, setChartDimensions] = useState<{ width: number; height: number } | null>(null)

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                const res = await fetch(`/api/v1/dashboard/arrears?companyType=${companyType}`)
                if (res.ok) {
                    const json = await res.json()
                    setData(json)
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [companyType])

    const summary = useMemo(() => {
        // Helper functions
        const getSum1_3 = (d: ArrearsData) => (d.m1 || 0) + (d.m2 || 0) + (d.m3 || 0)
        const getSum3_6 = (d: ArrearsData) => (d.m4 || 0) + (d.m5 || 0) + (d.m6 || 0)
        const getSum6_12 = (d: ArrearsData) => (d.m7 || 0) + (d.m8 || 0) + (d.m9 || 0) + (d.m10 || 0) + (d.m11 || 0) + (d.m12 || 0)
        const getSum12 = (d: ArrearsData) => (d.over12 || 0)

        let total = 0
        let overdue1_3m = 0
        let overdue3_6m = 0
        let overdue6_12m = 0
        let overdue12m = 0

        data.forEach(d => {
            total += d.totalAr || 0

            // 1~3개월에만 연체가 있는 거래처 (3개월 초과 연체 없음)
            const has1_3 = getSum1_3(d) > 0
            const hasOlderThan3 = getSum3_6(d) + getSum6_12(d) + getSum12(d) > 0
            if (has1_3 && !hasOlderThan3) {
                overdue1_3m += getSum1_3(d)
            }

            // 3~6개월에만 연체가 있는 거래처 (1~3개월, 6개월 초과 연체 없음)
            const has3_6 = getSum3_6(d) > 0
            const hasNewerThan3 = getSum1_3(d) > 0
            const hasOlderThan6 = getSum6_12(d) + getSum12(d) > 0
            if (has3_6 && !hasNewerThan3 && !hasOlderThan6) {
                overdue3_6m += getSum3_6(d)
            }

            // 6~12개월에만 연체가 있는 거래처 (1~6개월, 1년 초과 연체 없음)
            const has6_12 = getSum6_12(d) > 0
            const hasNewerThan6 = getSum1_3(d) + getSum3_6(d) > 0
            const hasOlderThan12 = getSum12(d) > 0
            if (has6_12 && !hasNewerThan6 && !hasOlderThan12) {
                overdue6_12m += getSum6_12(d)
            }

            // 1년 초과에만 연체가 있는 거래처 (1~12개월 연체 없음)
            const has12 = getSum12(d) > 0
            const hasNewerThan12 = getSum1_3(d) + getSum3_6(d) + getSum6_12(d) > 0
            if (has12 && !hasNewerThan12) {
                overdue12m += getSum12(d)
            }
        })

        return { total, overdue1_3m, overdue3_6m, overdue6_12m, overdue12m }
    }, [data])

    const filteredData = useMemo(() => {
        let filtered = [...data]

        // Helper to calculate sums
        const getSum1_3 = (d: ArrearsData) => (d.m1 || 0) + (d.m2 || 0) + (d.m3 || 0)
        const getSum3_6 = (d: ArrearsData) => (d.m4 || 0) + (d.m5 || 0) + (d.m6 || 0)
        const getSum6_12 = (d: ArrearsData) => (d.m7 || 0) + (d.m8 || 0) + (d.m9 || 0) + (d.m10 || 0) + (d.m11 || 0) + (d.m12 || 0)
        const getSum12 = (d: ArrearsData) => (d.over12 || 0)

        if (filterType === 'OVERDUE_1_3M') {
            // 1~3개월: 1~3개월에만 연체가 있는 거래처 (3개월 초과 연체 없음)
            filtered = filtered.filter(d => {
                const has1_3 = getSum1_3(d) > 0
                const hasOlder = getSum3_6(d) + getSum6_12(d) + getSum12(d) > 0
                return has1_3 && !hasOlder
            }).sort((a, b) => getSum1_3(b) - getSum1_3(a))
        } else if (filterType === 'OVERDUE_3_6M') {
            // 3~6개월: 3~6개월에만 연체가 있는 거래처 (1~3개월, 6개월 초과 연체 없음)
            filtered = filtered.filter(d => {
                const has3_6 = getSum3_6(d) > 0
                const hasNewer = getSum1_3(d) > 0
                const hasOlder = getSum6_12(d) + getSum12(d) > 0
                return has3_6 && !hasNewer && !hasOlder
            }).sort((a, b) => getSum3_6(b) - getSum3_6(a))
        } else if (filterType === 'OVERDUE_6_12M') {
            // 6~12개월: 6~12개월에만 연체가 있는 거래처 (1~6개월, 1년 초과 연체 없음)
            filtered = filtered.filter(d => {
                const has6_12 = getSum6_12(d) > 0
                const hasNewer = getSum1_3(d) + getSum3_6(d) > 0
                const hasOlder = getSum12(d) > 0
                return has6_12 && !hasNewer && !hasOlder
            }).sort((a, b) => getSum6_12(b) - getSum6_12(a))
        } else if (filterType === 'OVERDUE_12M') {
            // 1년 이상: 1년 초과에만 연체가 있는 거래처 (1~12개월 연체 없음)
            filtered = filtered.filter(d => {
                const has12 = getSum12(d) > 0
                const hasNewer = getSum1_3(d) + getSum3_6(d) + getSum6_12(d) > 0
                return has12 && !hasNewer
            }).sort((a, b) => getSum12(b) - getSum12(a))
        } else {
            // ALL
            filtered = filtered.sort((a, b) => b.totalAr - a.totalAr)
        }
        return filtered
    }, [data, filterType])

    const agingChartData = useMemo(() => {
        const buckets = [
            { name: '1개월', key: 'm1', color: '#3b82f6' },
            { name: '2개월', key: 'm2', color: '#3b82f6' },
            { name: '3개월', key: 'm3', color: '#3b82f6' },
            { name: '4~6개월', keys: ['m4', 'm5', 'm6'], color: '#f59e0b' },
            { name: '7~12개월', keys: ['m7', 'm8', 'm9', 'm10', 'm11', 'm12'], color: '#ea580c' },
            { name: '12개월+', key: 'over12', color: '#ef4444' },
        ]

        return buckets.map(b => {
            let value = 0
            const customers: { name: string; totalAr: number; agingValue: number; dept: string; emp: string; original: ArrearsData }[] = []

            if (b.key) {
                data.forEach(cur => {
                    const agingValue = cur[b.key as keyof ArrearsData] as number || 0
                    value += agingValue
                    if (agingValue > 0) {
                        customers.push({
                            name: cur.customerName,
                            totalAr: cur.totalAr,
                            agingValue,
                            dept: cur.deptName,
                            emp: cur.empName,
                            original: cur
                        })
                    }
                })
            } else if (b.keys) {
                data.forEach(cur => {
                    let sub = 0
                    b.keys?.forEach(k => sub += (cur[k as keyof ArrearsData] as number || 0))
                    value += sub
                    if (sub > 0) {
                        customers.push({
                            name: cur.customerName,
                            totalAr: cur.totalAr,
                            agingValue: sub,
                            dept: cur.deptName,
                            emp: cur.empName,
                            original: cur
                        })
                    }
                })
            }
            // 해당 연령대 금액 기준 내림차순 정렬
            customers.sort((a, b) => b.agingValue - a.agingValue)
            return { name: b.name, value, color: b.color, customers }
        })
    }, [data])

    const riskMapData = useMemo(() => {
        return data.map(d => {
            const longTermAr = (d.m4 || 0) + (d.m5 || 0) + (d.m6 || 0) + (d.m7 || 0) + (d.m8 || 0) + (d.m9 || 0) + (d.m10 || 0) + (d.m11 || 0) + (d.over12 || 0)
            const ratio = d.totalAr > 0 ? (longTermAr / d.totalAr) * 100 : 0
            return {
                name: d.customerName,
                totalAr: d.totalAr,
                longTermAr,
                ratio: Math.round(ratio * 10) / 10,
                dept: d.deptName,
                emp: d.empName,
                original: d  // 원본 데이터 포함
            }
        }).filter(d => d.totalAr > 0)
    }, [data])

    // Risk Map 격자 범위 계산
    const riskMapBounds = useMemo(() => {
        if (riskMapData.length === 0) return { maxX: 100000000, xTicks: [], yTicks: [] }
        const maxX = Math.max(...riskMapData.map(d => d.totalAr))
        const xStep = maxX / 5  // 5개 격자
        const xTicks = [0, xStep, xStep * 2, xStep * 3, xStep * 4, xStep * 5]
        const yTicks = [0, 20, 40, 60, 80, 100]  // Y축은 0-100% 고정
        return { maxX, xTicks, yTicks }
    }, [riskMapData])


    // 차트 컨테이너 크기 관찰
    useEffect(() => {
        if (!chartContainerRef.current) return
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setChartDimensions({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                })
            }
        })
        observer.observe(chartContainerRef.current)
        return () => observer.disconnect()
    }, [])

    // 격자별 거래처 미리 계산 (5x5 = 25개 셀)
    const gridCellData = useMemo(() => {
        const { maxX } = riskMapBounds
        const xStep = maxX / 5
        const cells: { xIdx: number; yIdx: number; xMin: number; xMax: number; yMin: number; yMax: number; customers: typeof riskMapData }[] = []

        for (let xi = 0; xi < 5; xi++) {
            for (let yi = 0; yi < 5; yi++) {
                const xMin = xi * xStep
                const xMax = (xi + 1) * xStep
                const yMin = yi * 20
                const yMax = (yi + 1) * 20

                // 마지막 셀(xi=4, yi=4)은 경계값 포함 (<=)
                const isLastX = xi === 4
                const isLastY = yi === 4

                const customers = riskMapData.filter(d =>
                    d.totalAr >= xMin && (isLastX ? d.totalAr <= xMax : d.totalAr < xMax) &&
                    d.ratio >= yMin && (isLastY ? d.ratio <= yMax : d.ratio < yMax)
                )
                cells.push({ xIdx: xi, yIdx: yi, xMin, xMax, yMin, yMax, customers })
            }
        }
        return cells
    }, [riskMapData, riskMapBounds])

    // 격자 셀 클릭 핸들러
    const handleGridCellClick = useCallback((xIdx: number, yIdx: number) => {
        const cell = gridCellData.find(c => c.xIdx === xIdx && c.yIdx === yIdx)
        if (!cell) return

        const { xMin, xMax, yMin, yMax, customers } = cell
        setSelectedCell({ xMin, xMax, yMin, yMax })
        setSelectedAgingBar(null)  // Risk Map 클릭 시 연령대 선택 해제

        // custom event로 우측 패널에 전달
        window.dispatchEvent(new CustomEvent('tnt.sales.dashboard.arrearsCell', {
            detail: {
                customers: customers.sort((a, b) => b.totalAr - a.totalAr).map(c => ({
                    ...c,
                    cellInfo: { xMin, xMax, yMin, yMax }
                })),
                cellInfo: { xMin, xMax, yMin, yMax }
            }
        }) as any)
    }, [gridCellData])

    // 연령대 바 클릭 핸들러
    const handleAgingBarClick = useCallback((name: string, customers: any[], totalValue: number) => {
        setSelectedAgingBar(name)
        setSelectedCell(null)  // 연령대 클릭 시 Risk Map 선택 해제

        // custom event로 우측 패널에 전달
        window.dispatchEvent(new CustomEvent('tnt.sales.dashboard.agingBar', {
            detail: {
                name,
                customers,
                totalValue
            }
        }) as any)
    }, [])

    // 테이블용 포맷: 소수점 2자리까지 표시 (백만원 단위)
    const fmt = (v: number) => new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v / 1000000)

    if (loading) return <div style={{ padding: 20 }}>로딩중...</div>

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                <Card
                    label="총 미수채권"
                    value={fmt(summary.total)}
                    unit="백만원"
                    color="#0f172a"
                    active={filterType === 'ALL'}
                    onClick={() => setFilterType('ALL')}
                />
                <Card
                    label="1~3개월"
                    value={fmt(summary.overdue1_3m)}
                    unit="백만원"
                    color="#3b82f6"
                    active={filterType === 'OVERDUE_1_3M'}
                    onClick={() => setFilterType('OVERDUE_1_3M')}
                />
                <Card
                    label="3~6개월"
                    value={fmt(summary.overdue3_6m)}
                    unit="백만원"
                    color="#f59e0b"
                    active={filterType === 'OVERDUE_3_6M'}
                    onClick={() => setFilterType('OVERDUE_3_6M')}
                />
                <Card
                    label="6~12개월"
                    value={fmt(summary.overdue6_12m)}
                    unit="백만원"
                    color="#ea580c"
                    active={filterType === 'OVERDUE_6_12M'}
                    onClick={() => setFilterType('OVERDUE_6_12M')}
                />
                <Card
                    label="1년 초과"
                    value={fmt(summary.overdue12m)}
                    unit="백만원"
                    color="#dc2626"
                    active={filterType === 'OVERDUE_12M'}
                    onClick={() => setFilterType('OVERDUE_12M')}
                />
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right', marginTop: -4 }}>
                * 총 미수채권 금액과 각 카드의 합계는 다를 수 있습니다. (각 카드는 해당 기간에만 연체가 있는 거래처 기준)
            </div>

            <div style={{ display: 'flex', gap: 12, height: 320 }}>
                {/* Aging Distribution Chart - SVG 기반 */}
                <div className="card" style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600 }}>미수채권 연령 분포</h3>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>바 클릭 시 거래처 표시</div>
                    </div>
                    <div style={{ flex: 1, minHeight: 0 }}>
                        <SvgAgingChart
                            data={agingChartData}
                            selectedBar={selectedAgingBar}
                            onBarClick={handleAgingBarClick}
                        />
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 10, color: '#6b7280' }}>(단위: 억원)</div>
                </div>

                {/* Risk Map - Custom SVG Implementation */}
                <div className="card" style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600 }}>부실 위험도 분석 (Risk Map)</h3>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>격자 클릭 시 해당 영역 거래처 표시</div>
                    </div>
                    <div ref={chartContainerRef} style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                        <SvgRiskMap
                            data={riskMapData}
                            gridCellData={gridCellData}
                            bounds={riskMapBounds}
                            selectedCell={selectedCell}
                            onCellClick={handleGridCellClick}
                            fmt={fmt}
                        />
                    </div>
                    {selectedCell && (
                        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4, textAlign: 'center' }}>
                            선택 영역: 채권 {fmt(selectedCell.xMin)}~{fmt(selectedCell.xMax)}백만, 연체율 {selectedCell.yMin}~{selectedCell.yMax}%
                        </div>
                    )}
                </div>
            </div>

            {/* Detailed List */}
            <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600 }}>
                        거래처별 미수 현황 상세
                        {filterType !== 'ALL' && <span style={{ color: '#ef4444', marginLeft: 8 }}>
                            ({filterType === 'OVERDUE_1_3M' ? '1~3개월' :
                                filterType === 'OVERDUE_3_6M' ? '3~6개월' :
                                    filterType === 'OVERDUE_6_12M' ? '6~12개월' : '1년 초과'} 기준 정렬)
                        </span>}
                    </h3>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>총 {filteredData.length}개 업체</div>
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                            <tr>
                                <th style={thStyle}>거래처명</th>
                                <th style={thStyle}>부서/담당자</th>
                                <th style={thStyleRight}>총 미수액</th>
                                <th style={thStyleRight}>1개월</th>
                                <th style={thStyleRight}>2개월</th>
                                <th style={thStyleRight}>3개월</th>
                                <th style={thStyleRight}>4~6개월</th>
                                <th style={thStyleRight}>7~12개월</th>
                                <th style={thStyleRight}>12개월+</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((row, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={tdStyle}>{row.customerName}</td>
                                    <td style={tdStyle}>{row.deptName} / {row.empName}</td>
                                    <td style={{ ...tdStyleRight, fontWeight: 600 }}>{fmt(row.totalAr)}</td>
                                    <td style={tdStyleRight}>{fmt(row.m1)}</td>
                                    <td style={tdStyleRight}>{fmt(row.m2)}</td>
                                    <td style={tdStyleRight}>{fmt(row.m3)}</td>
                                    <td style={{ ...tdStyleRight, color: (row.m4 + row.m5 + row.m6) > 0 ? '#ea580c' : 'inherit' }}>{fmt(row.m4 + row.m5 + row.m6)}</td>
                                    <td style={{ ...tdStyleRight, color: (row.m7 + row.m8 + row.m9 + row.m10 + row.m11 + row.m12) > 0 ? '#dc2626' : 'inherit' }}>{fmt(row.m7 + row.m8 + row.m9 + row.m10 + row.m11 + row.m12)}</td>
                                    <td style={{ ...tdStyleRight, color: row.over12 > 0 ? '#991b1b' : 'inherit', fontWeight: row.over12 > 0 ? 600 : 400 }}>{fmt(row.over12)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

// SVG 기반 연령 분포 차트 컴포넌트
interface SvgAgingChartProps {
    data: { name: string; value: number; color: string; customers: any[] }[]
    selectedBar: string | null
    onBarClick: (name: string, customers: any[], value: number) => void
}

function SvgAgingChart({ data, selectedBar, onBarClick }: SvgAgingChartProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
    const [hoveredBar, setHoveredBar] = useState<string | null>(null)
    const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string; value: number } | null>(null)

    // 컨테이너 크기 감지
    useEffect(() => {
        if (!containerRef.current) return
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setDimensions({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                })
            }
        })
        observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [])

    // 차트 영역 계산
    const margin = { top: 15, right: 15, bottom: 45, left: 55 }
    const chartWidth = Math.max(0, dimensions.width - margin.left - margin.right)
    const chartHeight = Math.max(0, dimensions.height - margin.top - margin.bottom)

    // 바 차트 계산
    const maxValue = Math.max(...data.map(d => d.value), 1)
    const barCount = data.length
    const barPadding = 0.2
    const barGroupWidth = chartWidth / barCount
    const barWidth = barGroupWidth * (1 - barPadding)

    // 포맷 함수
    const fmt = (v: number) => new Intl.NumberFormat('ko-KR').format(Math.round(v / 1000000))
    const fmtAxis = (v: number) => (v / 100000000).toFixed(0)  // 억원 단위

    if (dimensions.width === 0 || dimensions.height === 0) {
        return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    }

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
            <svg width={dimensions.width} height={dimensions.height}>
                <g transform={`translate(${margin.left}, ${margin.top})`}>
                    {/* 수평 격자선 */}
                    {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
                        const y = chartHeight * (1 - ratio)
                        return (
                            <line
                                key={`grid-${ratio}`}
                                x1={0}
                                y1={y}
                                x2={chartWidth}
                                y2={y}
                                stroke="#e5e7eb"
                                strokeDasharray="3 3"
                            />
                        )
                    })}

                    {/* 바 차트 */}
                    {data.map((d, i) => {
                        const x = i * barGroupWidth + (barGroupWidth - barWidth) / 2
                        const barHeight = (d.value / maxValue) * chartHeight
                        const y = chartHeight - barHeight
                        const isSelected = selectedBar === d.name
                        const isHovered = hoveredBar === d.name

                        return (
                            <g key={d.name}>
                                <rect
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={barHeight}
                                    fill={d.color}
                                    fillOpacity={isSelected ? 1 : isHovered ? 0.85 : 0.75}
                                    stroke={isSelected ? '#1e40af' : 'none'}
                                    strokeWidth={isSelected ? 2 : 0}
                                    rx={4}
                                    ry={4}
                                    style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                                    onClick={() => onBarClick(d.name, d.customers, d.value)}
                                    onMouseEnter={(e) => {
                                        setHoveredBar(d.name)
                                        const rect = containerRef.current?.getBoundingClientRect()
                                        if (rect) {
                                            setTooltip({
                                                x: e.clientX - rect.left,
                                                y: e.clientY - rect.top,
                                                name: d.name,
                                                value: d.value
                                            })
                                        }
                                    }}
                                    onMouseMove={(e) => {
                                        const rect = containerRef.current?.getBoundingClientRect()
                                        if (rect) {
                                            setTooltip({
                                                x: e.clientX - rect.left,
                                                y: e.clientY - rect.top,
                                                name: d.name,
                                                value: d.value
                                            })
                                        }
                                    }}
                                    onMouseLeave={() => {
                                        setHoveredBar(null)
                                        setTooltip(null)
                                    }}
                                />
                                {/* 바 위에 금액 표시 (충분히 높을 때) */}
                                {barHeight > 20 && (
                                    <text
                                        x={x + barWidth / 2}
                                        y={y - 5}
                                        fill="#475569"
                                        fontSize={10}
                                        textAnchor="middle"
                                        style={{ pointerEvents: 'none' }}
                                    >
                                        {fmt(d.value)}
                                    </text>
                                )}
                            </g>
                        )
                    })}

                    {/* X축 */}
                    <line x1={0} y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#94a3b8" />
                    {data.map((d, i) => {
                        const x = i * barGroupWidth + barGroupWidth / 2
                        return (
                            <text
                                key={`x-label-${d.name}`}
                                x={x}
                                y={chartHeight + 18}
                                fill="#475569"
                                fontSize={11}
                                textAnchor="middle"
                            >
                                {d.name}
                            </text>
                        )
                    })}

                    {/* Y축 */}
                    <line x1={0} y1={0} x2={0} y2={chartHeight} stroke="#94a3b8" />
                    {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
                        const value = maxValue * ratio
                        const y = chartHeight * (1 - ratio)
                        return (
                            <g key={`y-tick-${ratio}`}>
                                <line x1={-5} y1={y} x2={0} y2={y} stroke="#94a3b8" />
                                <text x={-10} y={y + 4} fill="#64748b" fontSize={10} textAnchor="end">
                                    {fmtAxis(value)}
                                </text>
                            </g>
                        )
                    })}
                </g>
            </svg>

            {/* 툴팁 */}
            {tooltip && (
                <div style={{
                    position: 'absolute',
                    left: Math.min(tooltip.x + 10, dimensions.width - 120),
                    top: Math.max(tooltip.y - 60, 10),
                    background: '#fff',
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    fontSize: 11,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    pointerEvents: 'none',
                    zIndex: 1000
                }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, color: '#1e293b' }}>{tooltip.name}</div>
                    <div style={{ color: '#475569' }}>금액: <span style={{ fontWeight: 600 }}>{fmt(tooltip.value)}</span> 백만원</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>클릭하여 상세 보기</div>
                </div>
            )}
        </div>
    )
}

// SVG 기반 Risk Map 컴포넌트
interface SvgRiskMapProps {
    data: { name: string; totalAr: number; longTermAr: number; ratio: number; dept: string; emp: string; original: any }[]
    gridCellData: { xIdx: number; yIdx: number; xMin: number; xMax: number; yMin: number; yMax: number; customers: any[] }[]
    bounds: { maxX: number; xTicks: number[]; yTicks: number[] }
    selectedCell: { xMin: number; xMax: number; yMin: number; yMax: number } | null
    onCellClick: (xIdx: number, yIdx: number) => void
    fmt: (v: number) => string
}

function SvgRiskMap({ data, gridCellData, bounds, selectedCell, onCellClick, fmt }: SvgRiskMapProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
    const [hoveredCell, setHoveredCell] = useState<{ xIdx: number; yIdx: number } | null>(null)
    const [tooltip, setTooltip] = useState<{ x: number; y: number; data: any } | null>(null)

    // 컨테이너 크기 감지
    useEffect(() => {
        if (!containerRef.current) return
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setDimensions({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                })
            }
        })
        observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [])

    // 차트 영역 계산 (마진 포함)
    const margin = { top: 15, right: 20, bottom: 35, left: 55 }
    const chartWidth = Math.max(0, dimensions.width - margin.left - margin.right)
    const chartHeight = Math.max(0, dimensions.height - margin.top - margin.bottom)

    // 데이터 → 픽셀 변환 함수
    const xScale = useCallback((value: number) => {
        if (bounds.maxX === 0) return 0
        return (value / bounds.maxX) * chartWidth
    }, [bounds.maxX, chartWidth])

    const yScale = useCallback((value: number) => {
        // Y축은 0이 아래, 100이 위
        return chartHeight - (value / 100) * chartHeight
    }, [chartHeight])

    // 격자 셀 크기
    const cellWidth = chartWidth / 5
    const cellHeight = chartHeight / 5

    // 점 크기 계산 (장기연체액 기준)
    const getRadius = useCallback((longTermAr: number) => {
        const maxLongTermAr = Math.max(...data.map(d => d.longTermAr), 1)
        const minRadius = 4
        const maxRadius = 16
        return minRadius + (longTermAr / maxLongTermAr) * (maxRadius - minRadius)
    }, [data])

    // 점 색상 계산
    const getColor = useCallback((ratio: number) => {
        if (ratio > 50) return '#ef4444'  // 빨강
        if (ratio > 20) return '#f59e0b'  // 주황
        return '#3b82f6'  // 파랑
    }, [])

    if (dimensions.width === 0 || dimensions.height === 0) {
        return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    }

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
            <svg width={dimensions.width} height={dimensions.height}>
                <g transform={`translate(${margin.left}, ${margin.top})`}>
                    {/* 5x5 격자 셀 (클릭 가능) */}
                    {[0, 1, 2, 3, 4].map(yIdx =>
                        [0, 1, 2, 3, 4].map(xIdx => {
                            const cell = gridCellData.find(c => c.xIdx === xIdx && c.yIdx === yIdx)
                            const isSelected = selectedCell &&
                                selectedCell.xMin === cell?.xMin &&
                                selectedCell.yMin === cell?.yMin
                            const isHovered = hoveredCell?.xIdx === xIdx && hoveredCell?.yIdx === yIdx
                            const x = xIdx * cellWidth
                            const y = (4 - yIdx) * cellHeight  // Y축 반전 (0이 아래, 4가 위)

                            return (
                                <rect
                                    key={`cell-${xIdx}-${yIdx}`}
                                    x={x}
                                    y={y}
                                    width={cellWidth}
                                    height={cellHeight}
                                    fill={isSelected ? 'rgba(59, 130, 246, 0.15)' : isHovered ? 'rgba(59, 130, 246, 0.08)' : 'transparent'}
                                    stroke={isSelected ? 'rgba(59, 130, 246, 0.5)' : isHovered ? 'rgba(59, 130, 246, 0.3)' : '#e5e7eb'}
                                    strokeWidth={isSelected ? 2 : 1}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => onCellClick(xIdx, yIdx)}
                                    onMouseEnter={() => setHoveredCell({ xIdx, yIdx })}
                                    onMouseLeave={() => setHoveredCell(null)}
                                />
                            )
                        })
                    )}

                    {/* 격자선 */}
                    {[1, 2, 3, 4].map(i => (
                        <React.Fragment key={`grid-${i}`}>
                            <line
                                x1={i * cellWidth}
                                y1={0}
                                x2={i * cellWidth}
                                y2={chartHeight}
                                stroke="#e5e7eb"
                                strokeDasharray="3 3"
                            />
                            <line
                                x1={0}
                                y1={i * cellHeight}
                                x2={chartWidth}
                                y2={i * cellHeight}
                                stroke="#e5e7eb"
                                strokeDasharray="3 3"
                            />
                        </React.Fragment>
                    ))}

                    {/* 위험선 (50%) */}
                    <line
                        x1={0}
                        y1={yScale(50)}
                        x2={chartWidth}
                        y2={yScale(50)}
                        stroke="#ef4444"
                        strokeWidth={1.5}
                        strokeDasharray="5 3"
                    />
                    <text
                        x={chartWidth - 5}
                        y={yScale(50) - 5}
                        fill="#ef4444"
                        fontSize={10}
                        textAnchor="end"
                    >
                        위험 (50%)
                    </text>

                    {/* 데이터 점 (Scatter) */}
                    {data.map((d, i) => {
                        const cx = xScale(d.totalAr)
                        const cy = yScale(d.ratio)
                        const r = getRadius(d.longTermAr)
                        const color = getColor(d.ratio)

                        return (
                            <circle
                                key={`point-${i}`}
                                cx={cx}
                                cy={cy}
                                r={r}
                                fill={color}
                                fillOpacity={0.7}
                                stroke={color}
                                strokeWidth={1}
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={(e) => {
                                    const rect = containerRef.current?.getBoundingClientRect()
                                    if (rect) {
                                        setTooltip({
                                            x: e.clientX - rect.left,
                                            y: e.clientY - rect.top,
                                            data: d
                                        })
                                    }
                                }}
                                onMouseLeave={() => setTooltip(null)}
                            />
                        )
                    })}

                    {/* X축 */}
                    <line x1={0} y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#94a3b8" />
                    {[0, 1, 2, 3, 4, 5].map(i => {
                        const value = (bounds.maxX / 5) * i
                        const x = xScale(value)
                        return (
                            <g key={`x-tick-${i}`}>
                                <line x1={x} y1={chartHeight} x2={x} y2={chartHeight + 5} stroke="#94a3b8" />
                                <text x={x} y={chartHeight + 16} fill="#64748b" fontSize={10} textAnchor="middle">
                                    {(value / 1000000).toFixed(0)}
                                </text>
                            </g>
                        )
                    })}
                    <text x={chartWidth / 2} y={chartHeight + 30} fill="#475569" fontSize={11} textAnchor="middle">
                        총채권액 (백만)
                    </text>

                    {/* Y축 */}
                    <line x1={0} y1={0} x2={0} y2={chartHeight} stroke="#94a3b8" />
                    {[0, 20, 40, 60, 80, 100].map(value => {
                        const y = yScale(value)
                        return (
                            <g key={`y-tick-${value}`}>
                                <line x1={-5} y1={y} x2={0} y2={y} stroke="#94a3b8" />
                                <text x={-10} y={y + 4} fill="#64748b" fontSize={10} textAnchor="end">
                                    {value}
                                </text>
                            </g>
                        )
                    })}
                    <text
                        transform={`rotate(-90) translate(${-chartHeight / 2}, ${-40})`}
                        fill="#475569"
                        fontSize={11}
                        textAnchor="middle"
                    >
                        장기연체율 (%)
                    </text>
                </g>
            </svg>

            {/* 툴팁 */}
            {tooltip && (
                <div style={{
                    position: 'absolute',
                    left: tooltip.x + 10,
                    top: tooltip.y - 10,
                    background: '#fff',
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    borderRadius: 4,
                    fontSize: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    pointerEvents: 'none',
                    zIndex: 1000
                }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{tooltip.data.name}</div>
                    <div>총채권: {fmt(tooltip.data.totalAr)} 백만</div>
                    <div>장기연체: {fmt(tooltip.data.longTermAr)} 백만</div>
                    <div style={{ color: tooltip.data.ratio > 50 ? '#dc2626' : '#0f172a' }}>비중: {tooltip.data.ratio}%</div>
                    <div style={{ marginTop: 4, color: '#6b7280' }}>{tooltip.data.dept} / {tooltip.data.emp}</div>
                </div>
            )}

            {/* 호버된 셀 정보 */}
            {hoveredCell && (
                <div style={{
                    position: 'absolute',
                    bottom: 5,
                    left: 5,
                    background: 'rgba(255,255,255,0.95)',
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: 10,
                    color: '#475569',
                    border: '1px solid #e5e7eb'
                }}>
                    {(() => {
                        const cell = gridCellData.find(c => c.xIdx === hoveredCell.xIdx && c.yIdx === hoveredCell.yIdx)
                        if (!cell) return null
                        return `채권: ${fmt(cell.xMin)}~${fmt(cell.xMax)}백만 / 연체율: ${cell.yMin}~${cell.yMax}% / 거래처: ${cell.customers.length}개`
                    })()}
                </div>
            )}
        </div>
    )
}

function Card({ label, value, unit, color, active, onClick }: { label: string, value: string, unit: string, color: string, active?: boolean, onClick?: () => void }) {
    return (
        <div
            className="card"
            onClick={onClick}
            style={{
                padding: 16,
                cursor: onClick ? 'pointer' : 'default',
                border: active ? `2px solid ${color}` : '1px solid transparent',
                background: active ? `${color}08` : '#fff',
                transition: 'all 0.2s'
            }}
        >
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{unit}</div>
        </div>
    )
}

const thStyle: React.CSSProperties = { padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0' }
const thStyleRight: React.CSSProperties = { ...thStyle, textAlign: 'right' }
const tdStyle: React.CSSProperties = { padding: '8px 12px', color: '#334155' }
const tdStyleRight: React.CSSProperties = { ...tdStyle, textAlign: 'right' }
