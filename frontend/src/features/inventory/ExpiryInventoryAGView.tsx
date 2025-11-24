import React, { useState, useEffect, useMemo } from 'react'
import {
    Package,
    AlertTriangle,
    Flame,
    Eye,
    Search,
    LayoutList,
    LayoutGrid,
    AlertCircle,
    ChevronDown,
    ChevronRight
} from 'lucide-react'
import { ItemSearchModal } from './ItemSearchModal'

type LgExpiryStock = {
    id: number
    srcStdDate?: string
    srcBizunit?: string
    itemName?: string
    itemNo?: string
    spec?: string
    itemSeq?: number
    unitName?: string
    expPeriod?: string
    remainDay?: number
    remainRate?: number
    expChk?: string
    expDate?: string
    createDate?: string
    inDate?: string
    lastOutDate?: string
    lotNo?: string
    whName?: string
    whSeq?: number
    stockQty?: number
    outNotUseDate?: number
    inNotUseDate?: number
    assetSeq?: number
    assetName?: string
    itemCategorySeq?: number
    itemCategory?: string
    itemSubcategorySeq?: number
    itemSubcategory?: string
    itemSmallCategorySeq?: number
    itemSmallCategory?: string
    loadedAt?: string
}

type TabType = 'all' | 'disposal' | 'clearance' | 'watch'
type ViewMode = 'item' | 'category'
type BizUnit = 'ALL' | 'TNT' | 'DYS'

export function ExpiryInventoryAGView() {
    const [items, setItems] = useState<LgExpiryStock[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<TabType>('all')
    const [viewMode, setViewMode] = useState<ViewMode>('item')

    // Filters
    const [whNameFilter, setWhNameFilter] = useState<string>('')
    const [itemNameSearch, setItemNameSearch] = useState<string>('')
    const [categoryFilter, setCategoryFilter] = useState<string>('')
    const [bizUnitFilter, setBizUnitFilter] = useState<BizUnit>('ALL')

    // Advanced Filters
    const [remainDayMax, setRemainDayMax] = useState<string>('')
    const [predictionDate, setPredictionDate] = useState<number>(0)
    const [warehouseOptions, setWarehouseOptions] = useState<string[]>([])
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)

    const fetchExpiryStock = async () => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams()
            // if (activeTab === 'disposal') params.append('expChk', 'expired') // Optional: map activeTab to API params if desired, but for now removing undefined var
            if (whNameFilter) params.append('whName', whNameFilter)
            if (itemNameSearch) params.append('itemName', itemNameSearch)
            if (categoryFilter) params.append('category', categoryFilter)
            if (remainDayMax) params.append('remainDayMax', remainDayMax)
            if (predictionDate > 0) params.append('daysOffset', predictionDate.toString())
            if (bizUnitFilter !== 'ALL') params.append('bizUnit', bizUnitFilter)

            const response = await fetch(`/api/v1/inventory/expiry-stock-ag?${params.toString()}`)
            if (!response.ok) throw new Error(`API 호출 실패: ${response.status}`)
            const data = await response.json()

            if (Array.isArray(data)) {
                setItems(data)
            } else if (data.error) {
                setError(data.error)
                setItems([])
            } else {
                setItems([])
            }
        } catch (err: any) {
            console.error('유통기한재고(AG) 조회 실패:', err)
            setError(err.message || '데이터 조회 중 오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    const fetchWarehouseOptions = async () => {
        try {
            console.log("Fetching warehouse options...")
            const response = await fetch('/api/v1/inventory/warehouses-ag')
            console.log("Warehouse response status:", response.status)
            if (response.ok) {
                const data = await response.json()
                console.log("Warehouse data:", data)
                setWarehouseOptions(data)
            } else {
                console.error("Warehouse fetch failed:", response.statusText)
            }
        } catch (err) {
            console.error("Failed to fetch warehouse options", err)
        }
    }

    useEffect(() => {
        fetchWarehouseOptions()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Load initial analysis result on first render
    useEffect(() => {
        fetchExpiryStock()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Category Expansion
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

    // Item Expansion (for LOT details in item view)
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

    const toggleCategory = (categoryName: string) => {
        const newSet = new Set(expandedCategories)
        if (newSet.has(categoryName)) {
            newSet.delete(categoryName)
        } else {
            newSet.add(categoryName)
        }
        setExpandedCategories(newSet)
    }

    const toggleItem = (itemName: string) => {
        const newSet = new Set(expandedItems)
        if (newSet.has(itemName)) {
            newSet.delete(itemName)
        } else {
            newSet.add(itemName)
        }
        setExpandedItems(newSet)
    }

    // Promotion Selection
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

    const toggleItemSelection = (itemNo: string) => {
        const newSet = new Set(selectedItems)
        if (newSet.has(itemNo)) {
            newSet.delete(itemNo)
        } else {
            newSet.add(itemNo)
        }
        setSelectedItems(newSet)
    }

    // Broadcast selection changes to the right panel
    useEffect(() => {
        try {
            window.dispatchEvent(
                new CustomEvent('tnt.inventory.expiry.selection', {
                    detail: { count: selectedItems.size, items: Array.from(selectedItems) },
                })
            )
        } catch {
            // no-op
        }
    }, [selectedItems])

    // Handle promotion apply events coming from the right panel
    useEffect(() => {
        const handler = (event: CustomEvent<{ promotionId?: number }>) => {
            const promotionId = event.detail?.promotionId
            if (!promotionId) return
            const selected = Array.from(selectedItems)
            if (selected.length === 0) {
                alert('적용할 품목을 선택하세요.')
                return
            }
            alert(`프로모션 ${promotionId}을(를) ${selected.length}개 품목에 적용합니다.`)
        }

        window.addEventListener('tnt.inventory.apply-promotion', handler as EventListener)
        return () => window.removeEventListener('tnt.inventory.apply-promotion', handler as EventListener)
    }, [selectedItems])

    // --- Analysis Logic ---
    const analyzedData = useMemo(() => {
        return items.map(item => {
            const remain = item.remainDay || 0
            let status: 'expired' | 'critical' | 'warning' | 'good' = 'good'
            let action = 'Normal'
            let score = 100

            if (remain <= 0) {
                status = 'expired'
                action = '즉시 폐기'
                score = 0
            } else if (remain <= 60) {
                status = 'critical'
                action = '긴급 처분 (Clearance)'
                score = 20
            } else if (remain <= 120) {
                status = 'warning'
                action = '집중 모니터링'
                score = 50
            } else {
                action = '정상 판매'
            }

            return { ...item, _status: status, _action: action, _score: score }
        })
    }, [items])

    const filteredItems = useMemo(() => {
        return analyzedData.filter(item => {
            if (activeTab === 'disposal') return item._status === 'expired'
            if (activeTab === 'clearance') return item._status === 'critical'
            if (activeTab === 'watch') return item._status === 'warning'
            return true
        })
    }, [analyzedData, activeTab])

    // Group items by itemName for item view LOT expansion
    const itemGroups = useMemo(() => {
        const groups: Record<string, LgExpiryStock[]> = {}
        filteredItems.forEach(item => {
            const key = item.itemName || 'Unknown'
            if (!groups[key]) groups[key] = []
            groups[key].push(item)
        })
        // Sort LOTs within each group by expDate (earliest first)
        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => {
                const aDate = a.expDate || ''
                const bDate = b.expDate || ''
                return aDate.localeCompare(bDate)
            })
        })
        return groups
    }, [filteredItems])

    const categoryAnalysis = useMemo(() => {
        const groups: Record<string, {
            name: string,
            totalQty: number,
            expiredQty: number,
            criticalQty: number,
            warningQty: number,
            itemCount: number,
            totalScore: number,
            items: typeof analyzedData
        }> = {}

        analyzedData.forEach(item => {
            const cat = item.itemSubcategory || '미분류'
            if (!groups[cat]) {
                groups[cat] = {
                    name: cat,
                    totalQty: 0,
                    expiredQty: 0,
                    criticalQty: 0,
                    warningQty: 0,
                    itemCount: 0,
                    totalScore: 0,
                    items: []
                }
            }
            groups[cat].totalQty += (item.stockQty || 0)
            groups[cat].itemCount += 1
            groups[cat].totalScore += item._score
            groups[cat].items.push(item)

            if (item._status === 'expired') groups[cat].expiredQty += (item.stockQty || 0)
            if (item._status === 'critical') groups[cat].criticalQty += (item.stockQty || 0)
            if (item._status === 'warning') groups[cat].warningQty += (item.stockQty || 0)
        })

        return Object.values(groups).map(g => ({
            ...g,
            avgScore: g.itemCount > 0 ? Math.round(g.totalScore / g.itemCount) : 0,
            riskRatio: g.totalQty > 0 ? Math.round(((g.expiredQty + g.criticalQty) / g.totalQty) * 100) : 0,
            items: g.items.sort((a, b) => (a.itemName || '').localeCompare(b.itemName || '')) // Sort items by itemName ascending
        })).sort((a, b) => b.riskRatio - a.riskRatio) // Sort by risk ratio descending
    }, [analyzedData])

    const summary = useMemo(() => {
        const totalQty = analyzedData.reduce((sum, it) => sum + (it.stockQty || 0), 0)
        const expiredQty = analyzedData.filter(it => it._status === 'expired').reduce((sum, it) => sum + (it.stockQty || 0), 0)
        const criticalQty = analyzedData.filter(it => it._status === 'critical').reduce((sum, it) => sum + (it.stockQty || 0), 0)
        const warningQty = analyzedData.filter(it => it._status === 'warning').reduce((sum, it) => sum + (it.stockQty || 0), 0)

        return { totalQty, expiredQty, criticalQty, warningQty }
    }, [analyzedData])

    // --- UI Helpers ---
    const formatNumber = (val: any) => (val ? Number(val).toLocaleString('ko-KR') : '-')
    const formatDate = (val: any) => {
        if (!val) return '-'
        const s = String(val)
        return s.length === 8 ? `${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)}` : s
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8f9fa' }}>
            {/* Header & Filters */}
            <div style={{ padding: '20px 24px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
                {/* Title Row */}
                <div style={{ marginBottom: 24, display: 'flex', alignItems: 'baseline', gap: 12 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>재고 건전성 분석</h1>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>유통기한 기반 재고 리스크 분석 및 처분 제안</p>
                </div>

                {/* Controls Row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                    {/* Biz Unit Filter */}
                    <div style={{ background: '#f3f4f6', padding: 4, borderRadius: 8, display: 'flex', marginRight: 12 }}>
                        {(['ALL', 'TNT', 'DYS'] as BizUnit[]).map(unit => (
                            <button
                                key={unit}
                                onClick={() => setBizUnitFilter(unit)}
                                style={{
                                    padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                    background: bizUnitFilter === unit ? '#fff' : 'transparent',
                                    color: bizUnitFilter === unit ? '#2563eb' : '#6b7280',
                                    boxShadow: bizUnitFilter === unit ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {unit}
                            </button>
                        ))}
                    </div>

                    {/* View Mode Toggle */}
                    <div style={{ background: '#f3f4f6', padding: 4, borderRadius: 8, display: 'flex', marginRight: 12 }}>
                        <button
                            onClick={() => setViewMode('item')}
                            style={{
                                padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                background: viewMode === 'item' ? '#fff' : 'transparent',
                                color: viewMode === 'item' ? '#111827' : '#6b7280',
                                boxShadow: viewMode === 'item' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
                            }}
                        >
                            <LayoutList size={16} />
                            품목별 보기
                        </button>
                        <button
                            onClick={() => setViewMode('category')}
                            style={{
                                padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                background: viewMode === 'category' ? '#fff' : 'transparent',
                                color: viewMode === 'category' ? '#111827' : '#6b7280',
                                boxShadow: viewMode === 'category' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
                            }}
                        >
                            <LayoutGrid size={16} />
                            중분류 분석
                        </button>
                    </div>

                    {/* Basic Filters */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                            className="search-input"
                            placeholder="품목명 검색 (클릭)"
                            value={itemNameSearch}
                            readOnly
                            onClick={() => setIsSearchModalOpen(true)}
                            style={{ width: 180, paddingLeft: 12, paddingRight: 32, cursor: 'pointer' }}
                        />
                        <Search
                            size={14}
                            style={{ position: 'absolute', right: 10, color: '#9ca3af', pointerEvents: 'none' }}
                        />
                    </div>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <select
                            className="search-input"
                            value={whNameFilter}
                            onChange={e => setWhNameFilter(e.target.value)}
                            style={{ width: 150 }}
                        >
                            <option value="">전체 창고</option>
                            {warehouseOptions.map(wh => (
                                <option key={wh} value={wh}>{wh}</option>
                            ))}
                        </select>
                    </div>

                    {/* Advanced Filters */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 12, borderLeft: '1px solid #e5e7eb' }}>
                        <select
                            className="search-input"
                            value={predictionDate}
                            onChange={e => setPredictionDate(Number(e.target.value))}
                            style={{ width: 130, color: predictionDate > 0 ? '#ef4444' : 'inherit', fontWeight: predictionDate > 0 ? 600 : 400 }}
                        >
                            <option value={0}>현재 기준</option>
                            <option value={7}>1주 후 예측</option>
                            <option value={14}>2주 후 예측</option>
                            <option value={21}>3주 후 예측</option>
                            <option value={28}>4주 후 예측</option>
                            <option value={60}>2개월 후 예측</option>
                            <option value={90}>3개월 후 예측</option>
                            <option value={180}>6개월 후 예측</option>
                        </select>
                        <input
                            className="search-input"
                            type="number"
                            placeholder="잔여일수(이하)"
                            value={remainDayMax}
                            onChange={e => setRemainDayMax(e.target.value)}
                            style={{ width: 110 }}
                        />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                        <button
                            className="btn"
                            onClick={fetchExpiryStock}
                            disabled={loading}
                            style={{
                                height: 30,
                                padding: '0 16px',
                                fontSize: 13,
                                fontWeight: 600,
                                background: '#3b82f6',
                                borderColor: '#3b82f6',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {loading ? '분석 중...' : '분석 실행'}
                        </button>
                        <button
                            className="btn secondary"
                            onClick={() => {
                                setItemNameSearch('')
                                setWhNameFilter('')
                                setRemainDayMax('')
                                setPredictionDate(0)
                                setBizUnitFilter('ALL')
                                fetchExpiryStock()
                            }}
                            style={{ height: 30, padding: '0 12px', fontSize: 13, whiteSpace: 'nowrap' }}
                        >
                            초기화
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    <KpiCard
                        title="전체 재고"
                        value={formatNumber(summary.totalQty)}
                        icon={<Package size={24} />}
                        color="#3b82f6"
                    />
                    <KpiCard
                        title="폐기 대상 (만료)"
                        value={formatNumber(summary.expiredQty)}
                        subtext="즉시 조치 필요"
                        icon={<AlertCircle size={24} />}
                        color="#ef4444"
                        active={activeTab === 'disposal' && viewMode === 'item'}
                        onClick={() => { setActiveTab('disposal'); setViewMode('item'); }}
                    />
                    <KpiCard
                        title="긴급 처분 (<60일)"
                        value={formatNumber(summary.criticalQty)}
                        subtext="프로모션 권장"
                        icon={<Flame size={24} />}
                        color="#f97316"
                        active={activeTab === 'clearance' && viewMode === 'item'}
                        onClick={() => { setActiveTab('clearance'); setViewMode('item'); }}
                    />
                    <KpiCard
                        title="관심 품목 (<120일)"
                        value={formatNumber(summary.warningQty)}
                        subtext="모니터링 필요"
                        icon={<Eye size={24} />}
                        color="#eab308"
                        active={activeTab === 'watch' && viewMode === 'item'}
                        onClick={() => { setActiveTab('watch'); setViewMode('item'); }}
                    />
                </div>
            </div>

            {/* Tabs (Only for Item View) */}
            {viewMode === 'item' && (
                <div style={{ padding: '0 24px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', gap: 24 }}>
                        <TabButton label="전체 목록" active={activeTab === 'all'} onClick={() => setActiveTab('all')} />
                        <TabButton label="폐기 대상" count={summary.expiredQty} active={activeTab === 'disposal'} onClick={() => setActiveTab('disposal')} color="#ef4444" />
                        <TabButton label="긴급 처분" count={summary.criticalQty} active={activeTab === 'clearance'} onClick={() => setActiveTab('clearance')} color="#f97316" />
                        <TabButton label="관심 품목" count={summary.warningQty} active={activeTab === 'watch'} onClick={() => setActiveTab('watch')} color="#eab308" />
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div style={{ flex: 1, padding: 24, overflow: 'hidden', display: 'flex', gap: 24 }}>
                <div className="card" style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    {error ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>{error}</div>
                    ) : items.length === 0 && !loading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>데이터가 없습니다.</div>
                    ) : (
                        <div style={{ overflow: 'auto', flex: 1 }}>
                            {viewMode === 'item' ? (
                                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 10 }}>
                                        <tr>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280' }}>품목명 / 코드</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280' }}>중분류</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, color: '#6b7280' }}>전체 재고</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, color: '#6b7280' }}>LOT 수</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280' }}>최단 유통기한</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280' }}>위험 상태</th>
                                            <th style={{ width: 40 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(itemGroups).map(([itemName, lots]) => {
                                            const totalQty = lots.reduce((sum, lot) => sum + (lot.stockQty || 0), 0)
                                            const worstStatus = lots.some(l => l._status === 'expired') ? 'expired' :
                                                               lots.some(l => l._status === 'critical') ? 'critical' :
                                                               lots.some(l => l._status === 'warning') ? 'warning' : 'safe'
                                            const firstLot = lots[0]
                                            const isExpanded = expandedItems.has(itemName)

                                            return (
                                                <React.Fragment key={itemName}>
                                                    <tr style={{
                                                        borderBottom: '1px solid #e5e7eb',
                                                        background: isExpanded ? '#f9fafb' : '#fff',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => toggleItem(itemName)}
                                                    >
                                                        <td style={{ padding: '12px 16px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                {firstLot.srcBizunit === 'TNT' && (
                                                                    <span style={{
                                                                        background: '#e0f2fe', color: '#0369a1',
                                                                        width: 18, height: 18, borderRadius: 4,
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        fontSize: 11, fontWeight: 700
                                                                    }}>T</span>
                                                                )}
                                                                {firstLot.srcBizunit === 'DYS' && (
                                                                    <span style={{
                                                                        background: '#fce7f3', color: '#be185d',
                                                                        width: 18, height: 18, borderRadius: 4,
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        fontSize: 11, fontWeight: 700
                                                                    }}>D</span>
                                                                )}
                                                                <div style={{ fontWeight: 600, color: '#111827' }}>{itemName}</div>
                                                            </div>
                                                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{firstLot.itemNo} | {firstLot.spec}</div>
                                                        </td>
                                                        <td style={{ padding: '12px 16px', color: '#4b5563', fontSize: 12 }}>{firstLot.itemSubcategory}</td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>{formatNumber(totalQty)}</td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#6b7280' }}>{lots.length}</td>
                                                        <td style={{ padding: '12px 16px', color: '#4b5563' }}>{formatDate(firstLot.expDate)}</td>
                                                        <td style={{ padding: '12px 16px' }}>
                                                            <StatusBadge status={worstStatus} />
                                                        </td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                        </td>
                                                    </tr>
                                                    {isExpanded && (
                                                        <tr>
                                                            <td colSpan={7} style={{ padding: 0, background: '#f9fafb' }}>
                                                                <div style={{ padding: '12px 24px', borderBottom: '1px solid #e5e7eb' }}>
                                                                    <table style={{ width: '100%', fontSize: 13 }}>
                                                                        <thead>
                                                                            <tr>
                                                                                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#6b7280' }}>LOT No.</th>
                                                                                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#6b7280' }}>창고명</th>
                                                                                <th style={{ textAlign: 'right', padding: '8px 12px', color: '#6b7280' }}>재고</th>
                                                                                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#6b7280' }}>유통기한</th>
                                                                                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#6b7280' }}>잔여일수</th>
                                                                                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#6b7280' }}>상태</th>
                                                                                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#6b7280' }}>건전성</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {lots.map((lot, i) => (
                                                                                <tr key={i} style={{ borderTop: '1px solid #e5e7eb' }}>
                                                                                    <td style={{ padding: '8px 12px', color: '#6b7280', fontFamily: 'monospace' }}>{lot.lotNo || '-'}</td>
                                                                                    <td style={{ padding: '8px 12px', color: '#6b7280' }}>{lot.whName || '-'}</td>
                                                                                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{formatNumber(lot.stockQty)}</td>
                                                                                    <td style={{ padding: '8px 12px', color: '#4b5563' }}>{formatDate(lot.expDate)}</td>
                                                                                    <td style={{ padding: '8px 12px' }}>
                                                                                        <span style={{ fontWeight: 600, color: lot.remainDay && lot.remainDay <= 60 ? '#ef4444' : '#111827' }}>
                                                                                            {lot.remainDay}일
                                                                                        </span>
                                                                                    </td>
                                                                                    <td style={{ padding: '8px 12px' }}>
                                                                                        <StatusBadge status={lot._status} />
                                                                                    </td>
                                                                                    <td style={{ padding: '8px 12px' }}>
                                                                                        <HealthBar score={lot._score} />
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 10 }}>
                                        <tr>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280' }}>순위</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280' }}>중분류명</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, color: '#6b7280' }}>전체 재고</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, color: '#6b7280' }}>폐기 대상</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, color: '#6b7280' }}>긴급 처분</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, color: '#6b7280' }}>관심 품목</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, color: '#6b7280' }}>리스크 비율</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280' }}>평균 건전성</th>
                                            <th style={{ width: 40 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {categoryAnalysis.map((cat, idx) => (
                                            <React.Fragment key={cat.name}>
                                                <tr
                                                    onClick={() => toggleCategory(cat.name)}
                                                    style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: expandedCategories.has(cat.name) ? '#f9fafb' : '#fff' }}
                                                >
                                                    <td style={{ padding: '12px 16px', color: '#9ca3af', fontWeight: 500 }}>{idx + 1}</td>
                                                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>{cat.name}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>{formatNumber(cat.totalQty)}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right', color: cat.expiredQty > 0 ? '#ef4444' : '#d1d5db', fontWeight: cat.expiredQty > 0 ? 700 : 400 }}>{formatNumber(cat.expiredQty)}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right', color: cat.criticalQty > 0 ? '#f97316' : '#d1d5db', fontWeight: cat.criticalQty > 0 ? 700 : 400 }}>{formatNumber(cat.criticalQty)}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right', color: cat.warningQty > 0 ? '#eab308' : '#d1d5db', fontWeight: cat.warningQty > 0 ? 700 : 400 }}>{formatNumber(cat.warningQty)}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                        <span style={{
                                                            color: cat.riskRatio > 50 ? '#ef4444' : cat.riskRatio > 20 ? '#f97316' : '#10b981',
                                                            fontWeight: 700
                                                        }}>
                                                            {cat.riskRatio}%
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <HealthBar score={cat.avgScore} />
                                                    </td>
                                                    <td style={{ padding: '12px 16px', color: '#9ca3af' }}>
                                                        {expandedCategories.has(cat.name) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                    </td>
                                                </tr>
                                                {expandedCategories.has(cat.name) && (
                                                    <tr>
                                                        <td colSpan={9} style={{ padding: 0, background: '#f9fafb' }}>
                                                            <div style={{ padding: '12px 24px', borderBottom: '1px solid #e5e7eb' }}>
                                                                <table style={{ width: '100%', fontSize: 13 }}>
                                                                    <thead>
                                                                        <tr>
                                                                            <th style={{ textAlign: 'left', padding: '8px 12px', color: '#6b7280' }}>품목명</th>
                                                                            <th style={{ textAlign: 'left', padding: '8px 12px', color: '#6b7280' }}>LOT No.</th>
                                                                            <th style={{ textAlign: 'left', padding: '8px 12px', color: '#6b7280' }}>창고명</th>
                                                                            <th style={{ textAlign: 'right', padding: '8px 12px', color: '#6b7280' }}>재고</th>
                                                                            <th style={{ textAlign: 'center', padding: '8px 12px', color: '#6b7280' }}>폐기대상</th>
                                                                            <th style={{ textAlign: 'center', padding: '8px 12px', color: '#6b7280' }}>긴급처분</th>
                                                                            <th style={{ textAlign: 'center', padding: '8px 12px', color: '#6b7280' }}>관심품목</th>
                                                                            <th style={{ textAlign: 'center', padding: '8px 12px', color: '#6b7280' }}>정상재고</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {cat.items.map((item, i) => (
                                                                            <tr key={i} style={{ borderTop: '1px solid #e5e7eb' }}>
                                                                                <td style={{ padding: '8px 12px', color: '#111827', fontWeight: 500 }}>
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                                        {item.srcBizunit === 'TNT' && (
                                                                                            <span style={{
                                                                                                background: '#e0f2fe', color: '#0369a1',
                                                                                                width: 18, height: 18, borderRadius: 4,
                                                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                                fontSize: 11, fontWeight: 700
                                                                                            }}>T</span>
                                                                                        )}
                                                                                        {item.srcBizunit === 'DYS' && (
                                                                                            <span style={{
                                                                                                background: '#fce7f3', color: '#be185d',
                                                                                                width: 18, height: 18, borderRadius: 4,
                                                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                                fontSize: 11, fontWeight: 700
                                                                                            }}>D</span>
                                                                                        )}
                                                                                        {item.itemName}
                                                                                    </div>
                                                                                </td>
                                                                                <td style={{ padding: '8px 12px', color: '#6b7280', fontFamily: 'monospace' }}>{item.lotNo || '-'}</td>
                                                                                <td style={{ padding: '8px 12px', color: '#6b7280' }}>{item.whName || '-'}</td>
                                                                                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{formatNumber(item.stockQty)}</td>
                                                                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                                                    {item._status === 'expired' ? (
                                                                                        <span style={{ color: '#dc2626', fontWeight: 600 }}>●</span>
                                                                                    ) : (
                                                                                        <span style={{ color: '#d1d5db' }}>○</span>
                                                                                    )}
                                                                                </td>
                                                                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                                                    {item._status === 'critical' ? (
                                                                                        <span style={{ color: '#ea580c', fontWeight: 600 }}>●</span>
                                                                                    ) : (
                                                                                        <span style={{ color: '#d1d5db' }}>○</span>
                                                                                    )}
                                                                                </td>
                                                                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                                                    {item._status === 'warning' ? (
                                                                                        <span style={{ color: '#eab308', fontWeight: 600 }}>●</span>
                                                                                    ) : (
                                                                                        <span style={{ color: '#d1d5db' }}>○</span>
                                                                                    )}
                                                                                </td>
                                                                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                                                    {item._status === 'safe' || item._status === 'normal' || (!item._status || (item._status !== 'expired' && item._status !== 'critical' && item._status !== 'warning')) ? (
                                                                                        <span style={{ color: '#10b981', fontWeight: 600 }}>●</span>
                                                                                    ) : (
                                                                                        <span style={{ color: '#d1d5db' }}>○</span>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <ItemSearchModal
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                onSelect={(name) => {
                    setItemNameSearch(name)
                }}
            />
        </div>
    )
}

// --- Sub Components ---

function KpiCard({ title, value, subtext, icon, color, active, onClick }: any) {
    return (
        <div
            onClick={onClick}
            style={{
                background: active ? `${color}10` : '#fff',
                border: `1px solid ${active ? color : '#e5e7eb'}`,
                borderRadius: 12,
                padding: 20,
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.2s',
                boxShadow: active ? `0 4px 12px ${color}20` : 'none'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>{title}</span>
                <span style={{ color: color }}>{icon}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{value}</div>
            {subtext && <div style={{ fontSize: 12, color: color, marginTop: 4, fontWeight: 500 }}>{subtext}</div>}
        </div>
    )
}

function TabButton({ label, count, active, onClick, color = '#3b82f6' }: any) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '16px 0',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${active ? color : 'transparent'}`,
                color: active ? color : '#6b7280',
                fontWeight: active ? 600 : 500,
                cursor: 'pointer',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 6
            }}
        >
            {label}
            {count !== undefined && (
                <span style={{
                    background: active ? color : '#f3f4f6',
                    color: active ? '#fff' : '#6b7280',
                    padding: '2px 8px',
                    borderRadius: 99,
                    fontSize: 11,
                    fontWeight: 600
                }}>
                    {count > 999 ? '999+' : count}
                </span>
            )}
        </button>
    )
}

function StatusBadge({ status }: any) {
    const styles: any = {
        expired: { bg: '#fef2f2', text: '#ef4444', label: '만료' },
        critical: { bg: '#fff7ed', text: '#f97316', label: '위험' },
        warning: { bg: '#fefce8', text: '#eab308', label: '주의' },
        good: { bg: '#ecfdf5', text: '#10b981', label: '정상' },
    }
    const s = styles[status] || styles.good
    return (
        <span style={{
            background: s.bg, color: s.text,
            padding: '4px 8px', borderRadius: 6,
            fontSize: 11, fontWeight: 600,
            border: `1px solid ${s.text}20`
        }}>
            {s.label}
        </span>
    )
}

function HealthBar({ score }: any) {
    let color = '#10b981'
    if (score <= 20) color = '#ef4444'
    else if (score <= 50) color = '#eab308'

    return (
        <div style={{ width: 80, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 3 }} />
        </div>
    )
}
