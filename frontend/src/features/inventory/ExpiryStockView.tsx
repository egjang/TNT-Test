import React, { useState, useEffect } from 'react'

type ExpiryStockItem = {
  itemNo?: string
  itemName?: string
  spec?: string
  lotNo?: string
  whName?: string
  whSeq?: number
  stockQty?: number
  inDate?: string
  expDate?: string
  expPeriod?: number
  remainDay?: number
  remainRate?: number
  expChk?: string
  lastOutDate?: string
  itemCategory?: string
  itemSubcategory?: string
  itemSmallCategory?: string
  createDate?: string
  unitName?: string
  [key: string]: any
}

export function ExpiryStockView() {
  const [items, setItems] = useState<ExpiryStockItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [expChkFilter, setExpChkFilter] = useState<string>('all') // all, expired, warning, safe
  const [remainDayThreshold, setRemainDayThreshold] = useState<string>('30')
  const [whSeqFilter, setWhSeqFilter] = useState<string>('')
  const [itemNameSearch, setItemNameSearch] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')

  // Summary statistics
  const [summary, setSummary] = useState({
    totalItems: 0,
    expiredQty: 0,
    warningQty: 0,
    safeQty: 0,
    expiredCount: 0,
    warningCount: 0,
  })

  const fetchExpiryStock = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (expChkFilter !== 'all') params.append('expChk', expChkFilter)
      if (remainDayThreshold) params.append('remainDayThreshold', remainDayThreshold)
      if (whSeqFilter) params.append('whSeq', whSeqFilter)
      if (itemNameSearch) params.append('itemName', itemNameSearch)
      if (categoryFilter) params.append('category', categoryFilter)

      console.log('유통기한재고 조회 요청:', params.toString())

      const res = await fetch(`/api/v1/inventory/expiry-stock?${params.toString()}`)
      if (!res.ok) {
        throw new Error(`API 호출 실패: ${res.status}`)
      }
      const data = await res.json()

      console.log('유통기한재고 조회 응답:', data)

      // Check for error in response
      if (data.error) {
        setError(data.error)
        setItems([])
        setSummary({
          totalItems: 0,
          expiredQty: 0,
          warningQty: 0,
          safeQty: 0,
          expiredCount: 0,
          warningCount: 0,
        })
        return
      }

      const items = data.items || []
      setItems(items)

      // Calculate summary
      const expired = items.filter((it: ExpiryStockItem) => it.expChk === 'expired')
      const warning = items.filter((it: ExpiryStockItem) => it.expChk === 'warning')
      setSummary({
        totalItems: items.length,
        expiredQty: expired.reduce((sum: number, it: ExpiryStockItem) => sum + (it.stockQty || 0), 0),
        warningQty: warning.reduce((sum: number, it: ExpiryStockItem) => sum + (it.stockQty || 0), 0),
        safeQty: items.reduce((sum: number, it: ExpiryStockItem) => sum + (it.stockQty || 0), 0) - expired.reduce((sum: number, it: ExpiryStockItem) => sum + (it.stockQty || 0), 0) - warning.reduce((sum: number, it: ExpiryStockItem) => sum + (it.stockQty || 0), 0),
        expiredCount: expired.length,
        warningCount: warning.length,
      })
    } catch (err: any) {
      console.error('유통기한재고 조회 실패:', err)
      setError(err.message || '데이터 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExpiryStock()
  }, [])

  const formatNumber = (value: any) => {
    if (value === null || value === undefined || value === '') return '-'
    const num = Number(value)
    return Number.isFinite(num) ? num.toLocaleString('ko-KR') : String(value)
  }

  const formatDate = (value: any) => {
    if (!value) return '-'
    const str = String(value)
    if (str.length === 8) {
      return `${str.substring(0, 4)}-${str.substring(4, 6)}-${str.substring(6, 8)}`
    }
    return str
  }

  const getExpChkBadge = (expChk: string) => {
    if (expChk === 'expired') {
      return <span style={{ padding: '2px 8px', background: '#ef4444', color: 'white', borderRadius: 4, fontSize: 11 }}>만료</span>
    } else if (expChk === 'warning') {
      return <span style={{ padding: '2px 8px', background: '#f59e0b', color: 'white', borderRadius: 4, fontSize: 11 }}>주의</span>
    } else if (expChk === 'safe') {
      return <span style={{ padding: '2px 8px', background: '#10b981', color: 'white', borderRadius: 4, fontSize: 11 }}>안전</span>
    }
    return <span style={{ padding: '2px 8px', background: '#6b7280', color: 'white', borderRadius: 4, fontSize: 11 }}>-</span>
  }

  return (
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="pane-header">유통기한재고 조회</div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>전체 품목</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{formatNumber(summary.totalItems)}</div>
        </div>
        <div className="card" style={{ padding: 12, borderLeft: '3px solid #ef4444' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>만료 ({summary.expiredCount}건)</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#ef4444' }}>{formatNumber(summary.expiredQty)}</div>
        </div>
        <div className="card" style={{ padding: 12, borderLeft: '3px solid #f59e0b' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>주의 ({summary.warningCount}건)</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#f59e0b' }}>{formatNumber(summary.warningQty)}</div>
        </div>
        <div className="card" style={{ padding: 12, borderLeft: '3px solid #10b981' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>안전 재고</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#10b981' }}>{formatNumber(summary.safeQty)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>상태 필터</label>
            <select
              className="input"
              value={expChkFilter}
              onChange={(e) => setExpChkFilter(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="all">전체</option>
              <option value="expired">만료</option>
              <option value="warning">주의</option>
              <option value="safe">안전</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>잔여일수 기준</label>
            <input
              type="number"
              className="input"
              value={remainDayThreshold}
              onChange={(e) => setRemainDayThreshold(e.target.value)}
              placeholder="30"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>창고</label>
            <input
              type="text"
              className="input"
              value={whSeqFilter}
              onChange={(e) => setWhSeqFilter(e.target.value)}
              placeholder="창고 번호"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>품목명</label>
            <input
              type="text"
              className="input"
              value={itemNameSearch}
              onChange={(e) => setItemNameSearch(e.target.value)}
              placeholder="품목명 검색"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>카테고리</label>
            <input
              type="text"
              className="input"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              placeholder="대분류"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              className="button primary"
              onClick={fetchExpiryStock}
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? '조회 중...' : '조회'}
            </button>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {error ? (
          <div style={{ padding: 16, color: '#ef4444' }}>{error}</div>
        ) : items.length === 0 ? (
          <div className="empty-state">조회된 데이터가 없습니다</div>
        ) : (
          <div style={{ overflow: 'auto', flex: 1 }}>
            <table className="table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>#</th>
                  <th style={{ width: 80 }}>상태</th>
                  <th style={{ minWidth: 100 }}>품목코드</th>
                  <th style={{ minWidth: 160 }}>품목명</th>
                  <th style={{ minWidth: 100 }}>LOT번호</th>
                  <th style={{ minWidth: 100 }}>규격</th>
                  <th style={{ minWidth: 100 }}>창고</th>
                  <th style={{ minWidth: 80, textAlign: 'right' }}>재고수량</th>
                  <th style={{ minWidth: 100 }}>입고일</th>
                  <th style={{ minWidth: 100 }}>유통기한</th>
                  <th style={{ minWidth: 80, textAlign: 'right' }}>잔여일수</th>
                  <th style={{ minWidth: 80, textAlign: 'right' }}>잔여율(%)</th>
                  <th style={{ minWidth: 100 }}>최종출고일</th>
                  <th style={{ minWidth: 120 }}>대분류</th>
                  <th style={{ minWidth: 120 }}>중분류</th>
                  <th style={{ minWidth: 120 }}>소분류</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center', color: 'var(--muted)' }}>{idx + 1}</td>
                    <td>{getExpChkBadge(item.expChk || '')}</td>
                    <td>{item.itemNo || '-'}</td>
                    <td>{item.itemName || '-'}</td>
                    <td>{item.lotNo || '-'}</td>
                    <td>{item.spec || '-'}</td>
                    <td>{item.whName || '-'}</td>
                    <td style={{ textAlign: 'right' }}>{formatNumber(item.stockQty)}</td>
                    <td>{formatDate(item.inDate)}</td>
                    <td>{formatDate(item.expDate)}</td>
                    <td style={{ textAlign: 'right' }}>{formatNumber(item.remainDay)}</td>
                    <td style={{ textAlign: 'right' }}>{item.remainRate ? `${item.remainRate.toFixed(1)}%` : '-'}</td>
                    <td>{formatDate(item.lastOutDate)}</td>
                    <td>{item.itemCategory || '-'}</td>
                    <td>{item.itemSubcategory || '-'}</td>
                    <td>{item.itemSmallCategory || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
