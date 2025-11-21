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

type InventoryItem = {
  ItemSeq?: number
  ItemNo?: string
  ItemName?: string
  Spec?: string
  UnitName?: string
  WHName?: string
  WHSeq?: number
  StockQty?: number
  InQty?: number
  OutQty?: number
  SafetyQty?: number
  AvailStock?: number
  [key: string]: any
}

export function InventoryView() {
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

  // ERP JSON Preview
  const [jsonPreview, setJsonPreview] = useState<string | null>(null)
  const [erpResult, setErpResult] = useState<any>(null)
  const [parsedItems, setParsedItems] = useState<InventoryItem[]>([])
  const [showParsedPopup, setShowParsedPopup] = useState(false)

  useEffect(() => {
    loadWarehouses()
  }, [])

  // 화면 로드 시 자동 조회 비활성화
  // useEffect(() => {
  //   loadStockAging()
  // }, [selectedWH, itemNameSearch, asOfDate])

  useEffect(() => {
    if (!jsonPreview) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setJsonPreview(null)
        setErpResult(null)
      }
    }
    window.addEventListener('keydown', handleEsc, true)
    return () => window.removeEventListener('keydown', handleEsc, true)
  }, [jsonPreview])

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

  const extractItems = (payload: any): InventoryItem[] => {
    if (!payload) return []
    const rowKeys = [
      'BizUnit',
      'StdDate',
      'WHSeq',
      'ItemName',
      'ItemNo',
      'ItemSeq',
      'PAGE_NO',
      'PAGE_SIZE',
      'AvailStock',
      'StockQty',
      'InQty',
      'OutQty',
      'SafetyQty',
      'WHName',
      'UnitName'
    ]
    const candidates = [
      payload?.DataBlock1,
      payload?.ROOT?.DataBlock1,
      payload?.data?.ROOT?.DataBlock1,
      payload?.ROOT?.data?.ROOT?.DataBlock1
    ]
    for (const candidate of candidates) {
      if (!candidate) continue
      if (Array.isArray(candidate)) return candidate
      if (typeof candidate === 'object') return [candidate as InventoryItem]
    }
    const queue = [payload]
    while (queue.length) {
      const cur = queue.shift()
      if (Array.isArray(cur) && cur.length > 0 && typeof cur[0] === 'object') {
        return cur as InventoryItem[]
      }
      if (cur && typeof cur === 'object') {
        const keys = Object.keys(cur)
        if (keys.some((k) => rowKeys.includes(k))) {
          return [cur as InventoryItem]
        }
        Object.values(cur).forEach((v) => queue.push(v))
      }
    }
    return []
  }

  const formatCellNumber = (value: any) => {
    if (value === null || value === undefined || value === '') return '-'
    const num = Number(value)
    return Number.isFinite(num) ? num.toLocaleString('ko-KR') : String(value)
  }

  async function checkErpAvailStock() {
    try {
      // Build ERP request payload
      const stdDate = asOfDate.replace(/-/g, '') // YYYYMMDD format
      const payload = {
        bizUnit: '1',
        stdDate: stdDate,
        whSeq: selectedWH || '',
        itemName: itemNameSearch.trim(),
        itemNo: '',
        itemSeq: '',
        pageNo: '1',
        pageSize: '10000',
        userId: localStorage.getItem('tnt.sales.empId') || ''
      }

      // Show JSON preview popup
      setJsonPreview(JSON.stringify(payload, null, 2))
    } catch (e: any) {
      window.alert('JSON 생성 중 오류가 발생했습니다: ' + e.message)
    }
  }

  async function sendErpAvailStock() {
    setLoading(true)
    setError(null)
    setErpResult(null)
    try {
      const stdDate = asOfDate.replace(/-/g, '')
      const payload = {
        bizUnit: '1',
        stdDate: stdDate,
        whSeq: selectedWH || '',
        itemName: itemNameSearch.trim(),
        itemNo: '',
        itemSeq: '',
        pageNo: '1',
        pageSize: '10000',
        userId: localStorage.getItem('tnt.sales.empId') || ''
      }

      const res = await fetch('/api/v1/items/avail-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const result = await res.json()
      const items = extractItems(result.receivedPayload || result)
      const resultWithParsed = { ...result, parsedItems: items }
      setErpResult(resultWithParsed)
      setParsedItems(items)
      // Keep the popup open to show result
      setJsonPreview(JSON.stringify(payload, null, 2))

      // Save to sessionStorage for right panel
      sessionStorage.setItem('tnt.sales.inventory.lastErpResult', JSON.stringify(resultWithParsed))

      // Dispatch event to update right panel
      window.dispatchEvent(
        new CustomEvent('tnt.sales.inventory.erpResult', { detail: resultWithParsed })
      )
    } catch (e: any) {
      setError(e?.message || 'ERP 재고조회 중 오류가 발생했습니다')
      const errorResult = { error: e?.message || 'ERP 재고조회 중 오류가 발생했습니다' }
      setErpResult(errorResult)
      setParsedItems([])

      // Dispatch error event to update right panel
      window.dispatchEvent(
        new CustomEvent('tnt.sales.inventory.erpResult', { detail: errorResult })
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>재고현황 (품목별 Aging)</h2>
      </div>

      {/* Filters */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--panel)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>기준일자:</label>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            style={{ height: 32, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', fontSize: 13 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>창고:</label>
          <select
            value={selectedWH}
            onChange={(e) => setSelectedWH(e.target.value)}
            style={{ height: 32, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', fontSize: 13, minWidth: 120 }}
          >
            <option value="">전체</option>
            {warehouses.map((wh) => (
              <option key={wh.WHSeq} value={wh.WHSeq}>
                {wh.WHName}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>품목명:</label>
          <input
            type="text"
            value={itemNameSearch}
            onChange={(e) => setItemNameSearch(e.target.value)}
            placeholder="검색..."
            style={{ height: 32, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', fontSize: 13, minWidth: 200 }}
          />
        </div>

        <button
          onClick={loadStockAging}
          disabled={loading}
          className="btn btn-card btn-3d"
          style={{ height: 32, fontSize: 13, padding: '0 16px' }}
        >
          {loading ? '조회 중...' : '조회'}
        </button>

        <button
          onClick={checkErpAvailStock}
          disabled={loading}
          className="btn btn-card btn-3d"
          style={{
            height: 32,
            fontSize: 13,
            padding: '0 16px',
            background: '#3b82f6',
            color: '#ffffff',
            border: '1px solid #2563eb'
          }}
        >
          ERP 조회
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 20 }}>
        {error ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--error)' }}>
            {error}
          </div>
        ) : loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>
            재고 데이터를 불러오는 중...
          </div>
        ) : data.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>
            조회된 재고가 없습니다
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--panel)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap', color: 'var(--muted)', fontWeight: 600 }}>품목코드</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap', color: 'var(--muted)', fontWeight: 600 }}>품목명</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap', color: 'var(--muted)', fontWeight: 600 }}>LOT No.</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap', color: 'var(--muted)', fontWeight: 600 }}>규격</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap', color: 'var(--muted)', fontWeight: 600 }}>총재고수량</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap', color: 'var(--muted)', fontWeight: 600 }}>총재고금액</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap', color: 'var(--muted)', fontWeight: 600, background: '#e8f5e9' }}>0-30일</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap', color: 'var(--muted)', fontWeight: 600, background: '#fff9c4' }}>31-60일</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap', color: 'var(--muted)', fontWeight: 600, background: '#ffe0b2' }}>61-90일</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap', color: 'var(--muted)', fontWeight: 600, background: '#ffccbc' }}>91-180일</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap', color: 'var(--muted)', fontWeight: 600, background: '#ffcdd2' }}>180일+</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{item.itemNo || '-'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: 500 }}>{item.itemName || '-'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--primary)', fontWeight: 500, fontSize: 12 }}>{item.lotNo || '-'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: 12 }}>{item.spec || '-'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)', fontWeight: 600 }}>{formatNumber(item.totalQty)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>{formatAmount(item.totalAmt)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#2e7d32', background: '#f1f8e9' }}>{formatNumber(item.days0to30Qty)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#f57f17', background: '#fffde7' }}>{formatNumber(item.days31to60Qty)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#e65100', background: '#fff3e0' }}>{formatNumber(item.days61to90Qty)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#d84315', background: '#fbe9e7' }}>{formatNumber(item.days91to180Qty)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#c62828', background: '#ffebee', fontWeight: 600 }}>{formatNumber(item.days180PlusQty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      {data.length > 0 && !loading && (
        <div style={{ padding: '12px 20px', borderTop: '2px solid var(--border)', background: 'var(--panel)', display: 'flex', gap: 20, fontSize: 13, color: 'var(--muted)' }}>
          <div>총 <strong style={{ color: 'var(--text)' }}>{data.length}</strong>개 품목</div>
          <div>총 재고수량: <strong style={{ color: 'var(--text)' }}>{formatNumber(data.reduce((sum, item) => sum + (item.totalQty || 0), 0))}</strong></div>
          <div>총 재고금액: <strong style={{ color: 'var(--text)' }}>{formatAmount(data.reduce((sum, item) => sum + (item.totalAmt || 0), 0))}</strong></div>
        </div>
      )}

      {/* JSON Preview Modal */}
      {jsonPreview && (
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
            background: 'rgba(0,0,0,.5)'
          }}
          onClick={() => setJsonPreview(null)}
        >
          <div
            className="card"
            style={{
              width: 'min(800px, 90vw)',
              maxHeight: '80vh',
              overflow: 'auto',
              padding: 20,
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>ERP 재고조회</h3>
              <button
                onClick={() => {
                  setJsonPreview(null)
                  setErpResult(null)
                }}
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
                  fontSize: 20
                }}
                title="닫기 (ESC)"
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>전송 JSON</h4>
              <pre
                style={{
                  background: '#1e1e1e',
                  color: '#d4d4d4',
                  padding: 16,
                  borderRadius: 8,
                  overflow: 'auto',
                  fontSize: 13,
                  lineHeight: 1.6,
                  margin: 0,
                  maxHeight: erpResult ? '200px' : '400px'
                }}
              >
                {jsonPreview}
              </pre>
            </div>

            {erpResult && (
              <div style={{ marginBottom: 12 }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600, color: erpResult.error ? '#ef4444' : '#10b981' }}>
                  {erpResult.error ? '오류 발생' : 'ERP 응답'}
                </h4>
                <pre
                  style={{
                    background: '#1e1e1e',
                    color: '#d4d4d4',
                    padding: 16,
                    borderRadius: 8,
                    overflow: 'auto',
                    fontSize: 13,
                    lineHeight: 1.6,
                    margin: 0,
                    maxHeight: '400px'
                  }}
                >
                  {JSON.stringify(erpResult, null, 2)}
                </pre>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                className="btn btn-card btn-3d"
                onClick={() => {
                  setJsonPreview(null)
                  setErpResult(null)
                }}
                style={{ fontSize: 13, padding: '8px 16px' }}
              >
                닫기
              </button>
              {!erpResult && (
                <button
                  className="btn btn-card btn-3d"
                  onClick={() => {
                    sendErpAvailStock()
                  }}
                  disabled={loading}
                  style={{ fontSize: 13, padding: '8px 16px', background: '#3b82f6', color: '#fff', border: '1px solid #2563eb' }}
                >
                  {loading ? '전송 중...' : '전송'}
                </button>
              )}
              {erpResult && !erpResult.error && parsedItems.length > 0 && (
                <button
                  className="btn btn-card btn-3d"
                  onClick={() => setShowParsedPopup(true)}
                  style={{ fontSize: 13, padding: '8px 16px' }}
                >
                  테이블 보기
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Parsed ERP Result Popup */}
      {showParsedPopup && (
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
            background: 'rgba(0,0,0,.55)'
          }}
          onClick={() => setShowParsedPopup(false)}
        >
          <div
            className="card"
            style={{
              width: 'min(960px, 92vw)',
              maxHeight: '82vh',
              overflow: 'hidden',
              padding: 16,
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              boxShadow: '0 12px 32px rgba(0,0,0,.35)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>ERP 결과 (테이블)</h3>
              <button
                onClick={() => setShowParsedPopup(false)}
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
                  fontSize: 20
                }}
                title="닫기"
              >
                ×
              </button>
            </div>

            {parsedItems.length === 0 ? (
              <div className="empty-state">표시할 데이터가 없습니다</div>
            ) : (
              <div className="table-container" style={{ maxHeight: '68vh', overflow: 'auto' }}>
                <table className="table" style={{ width: '100%', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 50, textAlign: 'center' }}>#</th>
                      <th style={{ minWidth: 80 }}>품목코드</th>
                      <th style={{ minWidth: 140 }}>품목명</th>
                      <th style={{ minWidth: 120 }}>규격</th>
                      <th style={{ minWidth: 80 }}>단위</th>
                      <th style={{ minWidth: 120 }}>창고</th>
                      <th style={{ minWidth: 90, textAlign: 'right' }}>재고수량</th>
                      <th style={{ minWidth: 90, textAlign: 'right' }}>입고예정</th>
                      <th style={{ minWidth: 90, textAlign: 'right' }}>출고예정</th>
                      <th style={{ minWidth: 90, textAlign: 'right' }}>가용재고</th>
                      <th style={{ minWidth: 90, textAlign: 'right' }}>안전재고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedItems.map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ textAlign: 'center', color: 'var(--muted)' }}>{idx + 1}</td>
                        <td>{row.ItemNo || '-'}</td>
                        <td>{row.ItemName || '-'}</td>
                        <td>{row.Spec || '-'}</td>
                        <td>{row.UnitName || '-'}</td>
                        <td>{row.WHName || '-'}</td>
                        <td style={{ textAlign: 'right' }}>{formatCellNumber(row.StockQty)}</td>
                        <td style={{ textAlign: 'right' }}>{formatCellNumber(row.InQty)}</td>
                        <td style={{ textAlign: 'right' }}>{formatCellNumber(row.OutQty)}</td>
                        <td style={{ textAlign: 'right' }}>{formatCellNumber(row.AvailStock)}</td>
                        <td style={{ textAlign: 'right' }}>{formatCellNumber(row.SafetyQty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
