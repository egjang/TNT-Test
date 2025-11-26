import React, { useEffect, useMemo, useState } from 'react'

type Row = {
  salesMgmtUnitSeq: number
  salesMgmtUnit: string
  itemStdUnit: string
  itemUnit: string
  itemCount: number
  missingCount: number
}

type DetailRow = {
  itemSeq: string | number | null
  itemName: string
  itemStdUnit: string
  itemUnit: string
  salesMgmtUnitSeq: string | number | null
  newStdUnit?: string
}

export function ItemUnitAnalysis() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<DetailRow[]>([])
  const [editedUnits, setEditedUnits] = useState<Map<string, string>>(new Map())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    fetch('/api/v1/items/unit-usage')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (!alive) return
        const cleaned: Row[] = Array.isArray(data)
          ? data.map((r) => ({
              salesMgmtUnitSeq: Number(r.salesMgmtUnitSeq ?? 0),
              salesMgmtUnit: String(r.salesMgmtUnit ?? '미지정'),
              itemStdUnit: String(r.itemStdUnit ?? '미지정'),
              itemUnit: String(r.itemUnit ?? '미지정'),
              itemCount: Number(r.itemCount ?? 0),
              missingCount: Number(r.missingCount ?? 0),
            }))
          : []
        setRows(cleaned)
      })
      .catch((err) => { if (alive) setError(err.message || '조회 중 오류가 발생했습니다') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const grouped = useMemo(() => {
    const m: Record<string, Row[]> = {}
    for (const r of rows) {
      const key = r.salesMgmtUnit
      if (!m[key]) m[key] = []
      m[key].push(r)
    }
    // Sort units by count desc
    Object.values(m).forEach((arr) => arr.sort((a, b) => b.itemCount - a.itemCount))
    // Asc by name, but place '미지정' at the end
    return Object.entries(m).sort((a, b) => {
      const A = a[0]
      const B = b[0]
      const isAUnspec = A === '미지정'
      const isBUnspec = B === '미지정'
      if (isAUnspec && !isBUnspec) return 1
      if (!isAUnspec && isBUnspec) return -1
      return A.localeCompare(B)
    })
  }, [rows])

  async function loadDetail(salesMgmtUnit: string, itemUnit?: string, itemStdUnit?: string) {
    setDetailLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('salesMgmtUnit', salesMgmtUnit)
      if (itemUnit) params.set('itemUnit', itemUnit)
      if (itemStdUnit) params.set('itemStdUnit', itemStdUnit)

      const res = await fetch(`/api/v1/items/unit-usage/items?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const mapped: DetailRow[] = Array.isArray(data)
        ? data.map((r) => ({
            itemSeq: r.itemSeq ?? null,
            itemName: String(r.itemName ?? ''),
            itemStdUnit: String(r.itemStdUnit ?? '미지정'),
            itemUnit: String(r.itemUnit ?? '미지정'),
            salesMgmtUnitSeq: r.salesMgmtUnitSeq ?? null,
            newStdUnit: r.newStdUnit ?? undefined,
          }))
        : []
      setDetail(mapped)
      setEditedUnits(new Map())
    } catch (e: any) {
      setError(e?.message || '상세 조회 중 오류가 발생했습니다')
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleSave() {
    if (editedUnits.size === 0) {
      alert('변경된 항목이 없습니다.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const requests = Array.from(editedUnits.entries()).map(([itemName, newStdUnit]) => {
        const item = detail.find(d => d.itemName === itemName)
        return {
          itemName,
          salesUnit: item?.itemUnit ?? '',
          stdUnit: item?.itemStdUnit ?? '',
          newStdUnit,
        }
      })

      const res = await fetch('/api/v1/items/unit-modify/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requests),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const result = await res.json()
      if (result.success) {
        alert(`${result.updated}개 항목이 저장되었습니다.`)
        // Update detail with saved values
        setDetail(prev => prev.map(d => {
          const edited = editedUnits.get(d.itemName)
          if (edited !== undefined) {
            return { ...d, newStdUnit: edited }
          }
          return d
        }))
        setEditedUnits(new Map())
      } else {
        throw new Error(result.error || '저장 실패')
      }
    } catch (e: any) {
      setError(e?.message || '저장 중 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  function handleNewStdUnitChange(itemName: string, value: string) {
    setEditedUnits(prev => {
      const next = new Map(prev)
      next.set(itemName, value)
      return next
    })
  }

  function getCurrentNewStdUnit(d: DetailRow): string {
    const edited = editedUnits.get(d.itemName)
    if (edited !== undefined) return edited
    return d.newStdUnit ?? ''
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>품목단위분석</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)' }}>
              item 테이블 기준으로 영업관리단위별 사용 단위(표준단위/판매단위) 분포를 확인합니다.
            </p>
          </div>
          {loading ? <span style={{ color: 'var(--muted)' }}>불러오는 중…</span> : null}
          {error ? <span style={{ color: 'crimson' }}>{error}</span> : null}
        </div>
        {detail.length > 0 && (
          <button
            onClick={handleSave}
            disabled={saving || editedUnits.size === 0}
            style={{
              padding: '8px 16px',
              background: editedUnits.size > 0 ? '#4CAF50' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: editedUnits.size > 0 ? 'pointer' : 'not-allowed',
              fontWeight: 600,
            }}
          >
            {saving ? '저장 중...' : `저장 (${editedUnits.size})`}
          </button>
        )}
      </div>

      {grouped.length === 0 && !loading ? (
        <div className="empty-state">데이터가 없습니다.</div>
      ) : (
        <div className="card" style={{ padding: 12, height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'right', padding: '6px 8px', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>No.</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>영업관리단위</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>판매단위(item_unit)</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>표준단위(item_std_unit)</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>품목수</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(([unit, arr], groupIdx) => (
                  <React.Fragment key={unit}>
                    {arr.map((r, idx) => {
                      const rowKey = `${unit}|${r.itemUnit}|${r.itemStdUnit}`
                      const unitKey = `${unit}`
                      const isRowOpen = openKey === rowKey
                      const isUnitOpen = openKey === unitKey
                      const unitHasMissing = arr.some(row => row.missingCount > 0)
                      const rowHasMissing = r.missingCount > 0
                      return (
                        <tr key={unit + idx} style={{ borderTop: '1px solid var(--border)' }}>
                          {idx === 0 ? (
                            <>
                              <td
                                rowSpan={arr.length}
                                style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}
                              >
                                {groupIdx + 1}
                              </td>
                              <td
                                rowSpan={arr.length}
                                style={{ padding: '6px 8px', fontWeight: 600, cursor: 'pointer', textDecoration: isUnitOpen ? 'underline' : 'none', color: unitHasMissing ? 'crimson' : undefined }}
                                onClick={() => {
                                  const next = isUnitOpen ? null : unitKey
                                  setOpenKey(next)
                                  if (next) loadDetail(unit)
                                }}
                              >
                                {unit}
                                <span style={{ marginLeft: 8, fontSize: 12, color: unitHasMissing ? 'crimson' : 'var(--muted)' }}>
                                  {isUnitOpen ? '닫기' : '전체 품목'}
                                </span>
                              </td>
                            </>
                          ) : null}
                          <td
                            style={{ padding: '6px 8px', cursor: 'pointer', textDecoration: isRowOpen ? 'underline' : 'none', color: rowHasMissing ? 'crimson' : undefined }}
                            onClick={() => {
                              const next = isRowOpen ? null : rowKey
                              setOpenKey(next)
                              if (next) loadDetail(unit, r.itemUnit, r.itemStdUnit)
                            }}
                          >
                            {r.itemUnit}
                            <span style={{ marginLeft: 8, fontSize: 12, color: rowHasMissing ? 'crimson' : 'var(--muted)' }}>
                              {isRowOpen ? '닫기' : '품목 보기'}
                            </span>
                          </td>
                          <td
                            style={{ padding: '6px 8px', cursor: 'pointer', textDecoration: isRowOpen ? 'underline' : 'none', color: rowHasMissing ? 'crimson' : undefined }}
                            onClick={() => {
                              const next = isRowOpen ? null : rowKey
                              setOpenKey(next)
                              if (next) loadDetail(unit, r.itemUnit, r.itemStdUnit)
                            }}
                          >
                            {r.itemStdUnit}
                            <span style={{ marginLeft: 8, fontSize: 12, color: rowHasMissing ? 'crimson' : 'var(--muted)' }}>
                              {isRowOpen ? '닫기' : '품목 보기'}
                            </span>
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{r.itemCount.toLocaleString()}</td>
                        </tr>
                      )
                    })}
                    {(openKey === unit || arr.some(r => openKey === `${unit}|${r.itemUnit}|${r.itemStdUnit}`)) ? (
                      <tr style={{ background: 'var(--muted-bg, #fafafa)' }}>
                        <td colSpan={5} style={{ padding: '8px 8px 12px' }}>
                          {detailLoading ? (
                            <div style={{ color: 'var(--muted)' }}>품목 불러오는 중…</div>
                          ) : detail.length === 0 ? (
                            <div style={{ color: 'var(--muted)' }}>해당 영업관리단위에 품목이 없습니다.</div>
                          ) : (
                            <div style={{ maxHeight: '50vh', minHeight: 200, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 6 }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ position: 'sticky', top: 0, background: 'var(--bg)' }}>
                                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>품목명</th>
                                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>판매단위</th>
                                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>표준단위</th>
                                    <th style={{ textAlign: 'left', padding: '6px 8px', width: 150 }}>새표준단위</th>
                                    <th style={{ textAlign: 'right', padding: '6px 8px' }}>품목SEQ</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {detail.map((d, i) => {
                                    const currentNewStdUnit = getCurrentNewStdUnit(d)
                                    const isEmpty = !currentNewStdUnit || currentNewStdUnit.trim() === ''
                                    return (
                                    <tr key={(d.itemSeq ?? 'na') + '-' + i} style={{ borderTop: '1px solid var(--border)' }}>
                                      <td style={{ padding: '6px 8px', color: isEmpty ? 'crimson' : undefined, fontWeight: isEmpty ? 600 : undefined }}>{d.itemName || '(이름 없음)'}</td>
                                      <td style={{ padding: '6px 8px', color: isEmpty ? 'crimson' : undefined }}>{d.itemUnit || '미지정'}</td>
                                      <td style={{ padding: '6px 8px' }}>{d.itemStdUnit || '미지정'}</td>
                                      <td style={{ padding: '6px 8px' }}>
                                        <input
                                          type="text"
                                          value={getCurrentNewStdUnit(d)}
                                          onChange={(e) => handleNewStdUnitChange(d.itemName, e.target.value)}
                                          placeholder="입력"
                                          style={{
                                            width: '100%',
                                            padding: '4px 8px',
                                            border: '1px solid var(--border)',
                                            borderRadius: 4,
                                            fontSize: 13,
                                          }}
                                        />
                                      </td>
                                      <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--muted)' }}>
                                        {d.itemSeq ?? ''}
                                      </td>
                                    </tr>
                                  )})}

                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
