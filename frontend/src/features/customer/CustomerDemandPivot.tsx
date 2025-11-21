import React, { useEffect, useMemo, useState } from 'react'

type Row = {
  itemSubcategory: string | null
  supplierName: string | null
  salesMgmtUnit: string | null
  shareRate: number | null
}

type Props = { customerName: string; refreshTick?: number }

function formatPercent(v: number | null): string {
  if (v == null) return ''
  const n = Number(v)
  if (!isFinite(n)) return ''
  const p = n <= 1 ? n * 100 : n
  return `${p.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`
}

export function CustomerDemandPivot({ customerName, refreshTick = 0 }: Props) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!customerName?.trim()) return
    setLoading(true)
    setError(null)
    try {
      const q = new URLSearchParams({ customer: customerName, limit: '1000' })
      const res = await fetch(`/api/v1/demand?${q.toString()}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      const normalized: Row[] = (data || []).map((r: any) => ({
        itemSubcategory: r.itemSubcategory ?? null,
        supplierName: r.supplierName ?? null,
        salesMgmtUnit: r.salesMgmtUnit ?? null,
        shareRate: r.shareRate ?? null,
      }))
      setRows(normalized)
    } catch (e: any) {
      setError(e.message || '로드 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerName, refreshTick])

  const pivot = useMemo(() => {
    const rowKeys = new Set<string>()
    const colKeys = new Set<string>()
    const cell = new Map<string, number | null>()

    for (const r of rows) {
      const rk = r.itemSubcategory || '-'
      const ck = `${r.supplierName || '-'}|${r.salesMgmtUnit || '-'}`
      rowKeys.add(rk)
      colKeys.add(ck)
      const key = `${rk}::${ck}`
      cell.set(key, r.shareRate)
    }

    const sortedRows = Array.from(rowKeys).sort((a, b) => a.localeCompare(b))
    const sortedCols = Array.from(colKeys).sort((a, b) => a.localeCompare(b))
    return { rows: sortedRows, cols: sortedCols, cell }
  }, [rows])

  return (
    <section>
      {loading && (
        <div className="muted" style={{ marginBottom: 8 }}>불러오는 중…</div>
      )}
      {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}
      <div className="table-container" style={{ marginTop: 8, border: '1px solid var(--border)', borderRadius: 8 }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: 'var(--bg)', textAlign: 'left', padding: '8px 10px', zIndex: 1 }}>중분류</th>
              {pivot.cols.map((ck) => {
                const [supplier, unit] = ck.split('|')
                return (
                  <th key={ck} style={{ textAlign: 'center', padding: '8px 10px', whiteSpace: 'nowrap' }}>
                    <div>{supplier}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{unit}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {pivot.rows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(1, pivot.cols.length + 1)} className="muted" style={{ padding: '12px 10px' }}>
                  {loading ? '불러오는 중…' : '데이터가 없습니다'}
                </td>
              </tr>
            ) : (
              pivot.rows.map((rk) => (
                <tr key={rk}>
                  <td style={{ position: 'sticky', left: 0, background: 'var(--bg)', padding: '8px 10px' }}>{rk}</td>
                  {pivot.cols.map((ck) => {
                    const key = `${rk}::${ck}`
                    const v = pivot.cell.get(key) ?? null
                    return (
                      <td key={ck} style={{ textAlign: 'right', padding: '8px 10px' }}>{formatPercent(v)}</td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
