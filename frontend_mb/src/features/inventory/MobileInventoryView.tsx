import React, { useEffect, useState } from 'react'

type StockAgingItem = {
  itemSeq: number
  lotNo: string
  itemName: string
  itemNo: string
  spec: string
  totalQty: number
  totalAmt: number
  days0to30Qty: number
  days31to60Qty: number
  days61to90Qty: number
  days91to180Qty: number
  days180PlusQty: number
}

type Warehouse = {
  WHSeq: number
  WHName: string
}

export function MobileInventoryView({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<StockAgingItem[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [selectedWH, setSelectedWH] = useState<string>('')
  const [itemNameSearch, setItemNameSearch] = useState<string>('')
  const [asOfDate, setAsOfDate] = useState<string>(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadWarehouses()
    loadStockAging()
  }, [])

  async function loadWarehouses() {
    try {
      const res = await fetch('/api/v1/inventory/warehouses')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const list = await res.json()
      setWarehouses(Array.isArray(list) ? list : [])
    } catch (e: any) {
      console.error('창고 목록 조회 실패:', e)
    }
  }

  async function loadStockAging() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (selectedWH) params.set('whSeq', selectedWH)
      if (itemNameSearch.trim()) params.set('itemName', itemNameSearch.trim())
      if (asOfDate) params.set('asOfDate', asOfDate)

      const res = await fetch(`/api/v1/inventory/stock-aging?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const list = await res.json()
      setData(Array.isArray(list) ? list : [])
    } catch (e: any) {
      setError(e?.message || '재고 조회 중 오류가 발생했습니다')
      setData([])
    } finally {
      setLoading(false)
    }
  }

  function formatNumber(num: number | null | undefined): string {
    if (num == null) return '0'
    return num.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
  }

  function formatAmount(amt: number | null | undefined): string {
    if (amt == null) return '0'
    return amt.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">
              arrow_back
            </span>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">재고현황</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">품목별 Aging 분석</p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
          >
            <span className="material-symbols-outlined text-primary">
              {showFilters ? 'close' : 'filter_list'}
            </span>
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                기준일자
              </label>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                창고
              </label>
              <select
                value={selectedWH}
                onChange={(e) => setSelectedWH(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              >
                <option value="">전체</option>
                {warehouses.map((wh) => (
                  <option key={wh.WHSeq} value={wh.WHSeq}>
                    {wh.WHName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                품목명 검색
              </label>
              <input
                type="text"
                value={itemNameSearch}
                onChange={(e) => setItemNameSearch(e.target.value)}
                placeholder="검색..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              />
            </div>

            <button
              onClick={() => {
                loadStockAging()
                setShowFilters(false)
              }}
              disabled={loading}
              className="w-full py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? '조회 중...' : '조회'}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">불러오는 중...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-slate-300 dark:text-slate-700" style={{ fontSize: 64 }}>
              inventory_2
            </span>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              조회된 재고가 없습니다
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Summary Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">품목 수</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{data.length}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">총 수량</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {formatNumber(data.reduce((sum, item) => sum + (item.totalQty || 0), 0))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">총 금액</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {formatAmount(data.reduce((sum, item) => sum + (item.totalAmt || 0), 0))}
                  </p>
                </div>
              </div>
            </div>

            {/* Item List */}
            {data.map((item, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800"
              >
                {/* Header */}
                <div className="mb-3">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                    {item.itemName || '(품목명 없음)'}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <span>{item.itemNo || '-'}</span>
                    {item.spec && (
                      <>
                        <span>•</span>
                        <span>{item.spec}</span>
                      </>
                    )}
                  </div>
                  {item.lotNo && (
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-slate-500 dark:text-slate-400">LOT:</span>
                      <span className="font-medium text-primary">{item.lotNo}</span>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600 dark:text-slate-400">총 재고수량</span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                      {formatNumber(item.totalQty)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-slate-600 dark:text-slate-400">총 재고금액</span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {formatAmount(item.totalAmt)}
                    </span>
                  </div>
                </div>

                {/* Aging Breakdown */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                    Aging 분석
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-slate-600 dark:text-slate-400">0-30일</span>
                    </div>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      {formatNumber(item.days0to30Qty)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span className="text-slate-600 dark:text-slate-400">31-60일</span>
                    </div>
                    <span className="font-medium text-yellow-600 dark:text-yellow-400">
                      {formatNumber(item.days31to60Qty)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                      <span className="text-slate-600 dark:text-slate-400">61-90일</span>
                    </div>
                    <span className="font-medium text-orange-600 dark:text-orange-400">
                      {formatNumber(item.days61to90Qty)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <span className="text-slate-600 dark:text-slate-400">91-180일</span>
                    </div>
                    <span className="font-medium text-red-500 dark:text-red-400">
                      {formatNumber(item.days91to180Qty)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-600" />
                      <span className="text-slate-600 dark:text-slate-400">180일+</span>
                    </div>
                    <span className="font-medium text-red-600 dark:text-red-500">
                      {formatNumber(item.days180PlusQty)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
