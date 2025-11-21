import React, { useEffect, useState } from 'react'

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

type ErpResult = {
  receivedPayload?: {
    DataBlock1?: InventoryItem[]
    [key: string]: any
  }
  status?: number
  error?: string
}

export function InventoryResultPanel() {
  const [result, setResult] = useState<ErpResult | null>(null)
  const [items, setItems] = useState<InventoryItem[]>([])

  const formatNumber = (value: any) => {
    if (value === null || value === undefined || value === '') return '-'
    const num = Number(value)
    return Number.isFinite(num) ? num.toLocaleString('ko-KR') : String(value)
  }

  // ERP 응답 형태가 달라져도 DataBlock1을 최대한 찾아내기 위한 헬퍼
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

    // fallback: 깊은 객체 순회하며 첫 배열(객체들) 혹은 행 모양 객체를 찾음
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

  useEffect(() => {
    // Load from sessionStorage on mount
    const loadFromStorage = () => {
      const stored = sessionStorage.getItem('tnt.sales.inventory.lastErpResult')
      if (stored) {
        try {
          const data = JSON.parse(stored)
          setResult(data)
          setItems(Array.isArray(data?.parsedItems) ? data.parsedItems : extractItems(data.receivedPayload || data))
        } catch (e) {
          console.error('Failed to parse stored result:', e)
        }
      }
    }

    loadFromStorage()

    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail) return

      setResult(detail)

      const rows = Array.isArray((detail as any)?.parsedItems)
        ? (detail as any).parsedItems
        : extractItems((detail as any).receivedPayload || detail)
      setItems(rows)
    }

    window.addEventListener('tnt.sales.inventory.erpResult' as any, onUpdate)
    return () => window.removeEventListener('tnt.sales.inventory.erpResult' as any, onUpdate)
  }, [])

  if (!result) {
    return (
      <div style={{ padding: 16 }}>
        <div className="empty-state">ERP 조회 결과가 없습니다</div>
      </div>
    )
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      <div>
        <div className="pane-header" style={{ marginBottom: 8 }}>
          ERP 수신 전문
        </div>
        <div className="card" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
          {items.length === 0 ? (
            <div className="empty-state">DataBlock1에 표시할 품목이 없습니다</div>
          ) : (
            <div className="table-container" style={{ maxHeight: '38vh', overflow: 'auto' }}>
              <table className="table" style={{ width: '100%', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ width: 40, textAlign: 'center' }}>#</th>
                    <th style={{ minWidth: 100 }}>품목코드</th>
                    <th style={{ minWidth: 140 }}>품목명</th>
                    <th style={{ minWidth: 140 }}>규격</th>
                    <th style={{ minWidth: 80 }}>단위</th>
                    <th style={{ minWidth: 120 }}>창고</th>
                    <th style={{ minWidth: 120, textAlign: 'right' }}>재고수량</th>
                    <th style={{ minWidth: 120, textAlign: 'right' }}>입고예정</th>
                    <th style={{ minWidth: 120, textAlign: 'right' }}>출고예정</th>
                    <th style={{ minWidth: 120, textAlign: 'right' }}>가용재고</th>
                    <th style={{ minWidth: 120, textAlign: 'right' }}>안전재고</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: 'center', color: 'var(--muted)' }}>{idx + 1}</td>
                      <td>{row.ItemNo || '-'}</td>
                      <td>{row.ItemName || '-'}</td>
                      <td>{row.Spec || '-'}</td>
                      <td>{row.UnitName || '-'}</td>
                      <td>{row.WHName || '-'}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(row.StockQty)}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(row.InQty)}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(row.OutQty)}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(row.AvailStock)}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(row.SafetyQty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div style={{ overflow: 'auto', flex: 1, border: '1px solid var(--border)', borderRadius: 8, padding: 16, background: '#1e1e1e' }}>
        <pre style={{ margin: 0, color: '#d4d4d4', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    </div>
  )
}
