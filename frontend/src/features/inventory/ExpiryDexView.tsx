import React, { useEffect, useMemo, useState } from 'react'

type DexItem = {
  id: number
  item_no: string
  item_name: string
  spec: string
  lot_no: string
  wh_name: string
  wh_seq: number
  stock_qty: number
  exp_date: string
  exp_period: string
  remain_day: number
  remain_rate: number
  exp_chk: string
  last_out_date: string
  out_not_use_date?: number
  in_not_use_date?: number
  item_category?: string
  item_subcategory?: string
  item_small_category?: string
  loaded_at?: string
}

type DexResponse = {
  totalCount: number
  items: DexItem[]
  hasMore: boolean
  limit: number
  offset: number
  mode?: string
  error?: string
}

export function ExpiryDexView() {
  const [items, setItems] = useState<DexItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [mode, setMode] = useState('all') // all | expired | near | idle
  const [itemNo, setItemNo] = useState('')
  const [itemName, setItemName] = useState('')
  const [lotNo, setLotNo] = useState('')
  const [whSeq, setWhSeq] = useState('')
  const [expChk, setExpChk] = useState('')
  const [expDateFrom, setExpDateFrom] = useState('')
  const [expDateTo, setExpDateTo] = useState('')
  const [remainDayMin, setRemainDayMin] = useState('')
  const [remainDayMax, setRemainDayMax] = useState('')
  const [remainRateMin, setRemainRateMin] = useState('')
  const [remainRateMax, setRemainRateMax] = useState('')
  const [outNotUseMin, setOutNotUseMin] = useState('')
  const [outNotUseMax, setOutNotUseMax] = useState('')
  const [inNotUseMin, setInNotUseMin] = useState('')
  const [inNotUseMax, setInNotUseMax] = useState('')
  const [categorySeq, setCategorySeq] = useState('')
  const [subcategorySeq, setSubcategorySeq] = useState('')
  const [smallCategorySeq, setSmallCategorySeq] = useState('')

  const limit = 100

  const baseParams = useMemo(() => {
    const params = new URLSearchParams()
    params.set('limit', String(limit))
    if (mode !== 'all') params.set('mode', mode)
    if (itemNo) params.set('itemNo', itemNo.trim())
    if (itemName) params.set('itemName', itemName.trim())
    if (lotNo) params.set('lotNo', lotNo.trim())
    if (whSeq) params.set('whSeq', whSeq.trim())
    if (expChk) params.set('expChk', expChk)
    if (expDateFrom) params.set('expDateFrom', expDateFrom.replaceAll('-', ''))
    if (expDateTo) params.set('expDateTo', expDateTo.replaceAll('-', ''))
    if (remainDayMin) params.set('remainDayMin', remainDayMin)
    if (remainDayMax) params.set('remainDayMax', remainDayMax)
    if (remainRateMin) params.set('remainRateMin', remainRateMin)
    if (remainRateMax) params.set('remainRateMax', remainRateMax)
    if (outNotUseMin) params.set('outNotUseMin', outNotUseMin)
    if (outNotUseMax) params.set('outNotUseMax', outNotUseMax)
    if (inNotUseMin) params.set('inNotUseMin', inNotUseMin)
    if (inNotUseMax) params.set('inNotUseMax', inNotUseMax)
    if (categorySeq) params.set('categorySeq', categorySeq)
    if (subcategorySeq) params.set('subcategorySeq', subcategorySeq)
    if (smallCategorySeq) params.set('smallCategorySeq', smallCategorySeq)
    return params
  }, [
    limit,
    mode,
    itemNo,
    itemName,
    lotNo,
    whSeq,
    expChk,
    expDateFrom,
    expDateTo,
    remainDayMin,
    remainDayMax,
    remainRateMin,
    remainRateMax,
    outNotUseMin,
    outNotUseMax,
    inNotUseMin,
    inNotUseMax,
    categorySeq,
    subcategorySeq,
    smallCategorySeq,
  ])

  const fetchData = async (reset: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams(baseParams)
      params.set('offset', reset ? '0' : String(offset))
      const res = await fetch(`/api/v1/inventory/dex?${params.toString()}`)
      const data: DexResponse = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || `API 오류: ${res.status}`)

      setTotalCount(data.totalCount || 0)
      setHasMore(Boolean(data.hasMore))
      setOffset((data.offset ?? 0) + (data.items?.length || 0))
      setItems((prev) => (reset ? data.items || [] : [...prev, ...(data.items || [])]))
    } catch (err: any) {
      setError(err.message || '조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fmtNum = (value: any, digits = 0) => {
    if (value === null || value === undefined) return '-'
    const num = Number(value)
    if (!Number.isFinite(num)) return String(value)
    return num.toLocaleString('ko-KR', { maximumFractionDigits: digits, minimumFractionDigits: digits })
  }

  const fmtDate = (value: any) => {
    if (!value) return '-'
    const str = String(value)
    if (str.length === 8) return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`
    return str
  }

  const badge = (expChkValue: string) => {
    if (expChkValue === 'expired')
      return <span style={{ padding: '3px 8px', borderRadius: 6, background: '#ef4444', color: 'white', fontSize: 11 }}>만료</span>
    if (expChkValue === 'warning')
      return <span style={{ padding: '3px 8px', borderRadius: 6, background: '#f59e0b', color: 'white', fontSize: 11 }}>임박</span>
    return <span style={{ padding: '3px 8px', borderRadius: 6, background: '#4b5563', color: 'white', fontSize: 11 }}>정상</span>
  }

  const applyQuick = (preset: 'expired' | 'near14' | 'near21' | 'rate10' | 'idle30' | 'idle60') => {
    if (preset === 'expired') {
      setMode('expired')
      setRemainDayMax('0')
      setRemainRateMax('')
    } else if (preset === 'near14') {
      setMode('near')
      setRemainDayMax('14')
      setRemainRateMax('')
    } else if (preset === 'near21') {
      setMode('near')
      setRemainDayMax('21')
      setRemainRateMax('')
    } else if (preset === 'rate10') {
      setMode('near')
      setRemainRateMax('0.10')
      setRemainDayMax('')
    } else if (preset === 'idle30') {
      setMode('idle')
      setOutNotUseMin('30')
      setInNotUseMin('30')
    } else if (preset === 'idle60') {
      setMode('idle')
      setOutNotUseMin('60')
      setInNotUseMin('60')
    }
  }

  const clearFilters = () => {
    setMode('all')
    setItemNo('')
    setItemName('')
    setLotNo('')
    setWhSeq('')
    setExpChk('')
    setExpDateFrom('')
    setExpDateTo('')
    setRemainDayMin('')
    setRemainDayMax('')
    setRemainRateMin('')
    setRemainRateMax('')
    setOutNotUseMin('')
    setOutNotUseMax('')
    setInNotUseMin('')
    setInNotUseMax('')
    setCategorySeq('')
    setSubcategorySeq('')
    setSmallCategorySeq('')
    setOffset(0)
    setItems([])
  }

  return (
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="pane-header">유통기한재고(DEX)</div>

      <div className="card" style={{ padding: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{ color: 'var(--muted)', fontSize: 12, alignSelf: 'center' }}>빠른 조건</span>
          <button className="button" onClick={() => applyQuick('expired')}>판매금지(만료/0일 이하)</button>
          <button className="button" onClick={() => applyQuick('near14')}>임박 ≤14일</button>
          <button className="button" onClick={() => applyQuick('near21')}>임박 ≤21일</button>
          <button className="button" onClick={() => applyQuick('rate10')}>잔여율 ≤10%</button>
          <button className="button" onClick={() => applyQuick('idle30')}>미사용 ≥30일</button>
          <button className="button" onClick={() => applyQuick('idle60')}>미사용 ≥60일</button>
          <button className="button" onClick={clearFilters}>초기화</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <div>
            <label className="label">모드</label>
            <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="all">전체</option>
              <option value="expired">만료/판매금지</option>
              <option value="near">임박/신속처분</option>
              <option value="idle">장기미사용</option>
            </select>
          </div>
          <div>
            <label className="label">품목코드</label>
            <input className="input" value={itemNo} onChange={(e) => setItemNo(e.target.value)} />
          </div>
          <div>
            <label className="label">품목명</label>
            <input className="input" value={itemName} onChange={(e) => setItemName(e.target.value)} />
          </div>
          <div>
            <label className="label">창고</label>
            <input className="input" value={whSeq} onChange={(e) => setWhSeq(e.target.value)} placeholder="wh_seq" />
          </div>
          <div>
            <label className="label">LOT</label>
            <input className="input" value={lotNo} onChange={(e) => setLotNo(e.target.value)} />
          </div>
          <div>
            <label className="label">만료여부</label>
            <select className="input" value={expChk} onChange={(e) => setExpChk(e.target.value)}>
              <option value="">전체</option>
              <option value="expired">만료</option>
              <option value="warning">임박</option>
              <option value="safe">정상</option>
            </select>
          </div>
          <div>
            <label className="label">유통기한 From</label>
            <input type="date" className="input" value={expDateFrom} onChange={(e) => setExpDateFrom(e.target.value)} />
          </div>
            <div>
              <label className="label">유통기한 To</label>
              <input type="date" className="input" value={expDateTo} onChange={(e) => setExpDateTo(e.target.value)} />
            </div>
          <div>
            <label className="label">잔여일수 Min</label>
            <input className="input" value={remainDayMin} onChange={(e) => setRemainDayMin(e.target.value)} />
          </div>
          <div>
            <label className="label">잔여일수 Max</label>
            <input className="input" value={remainDayMax} onChange={(e) => setRemainDayMax(e.target.value)} />
          </div>
          <div>
            <label className="label">잔여율 Min</label>
            <input className="input" value={remainRateMin} onChange={(e) => setRemainRateMin(e.target.value)} placeholder="0.15" />
          </div>
          <div>
            <label className="label">잔여율 Max</label>
            <input className="input" value={remainRateMax} onChange={(e) => setRemainRateMax(e.target.value)} />
          </div>
          <div>
            <label className="label">출고미사용 Min</label>
            <input className="input" value={outNotUseMin} onChange={(e) => setOutNotUseMin(e.target.value)} placeholder="30" />
          </div>
          <div>
            <label className="label">출고미사용 Max</label>
            <input className="input" value={outNotUseMax} onChange={(e) => setOutNotUseMax(e.target.value)} />
          </div>
          <div>
            <label className="label">입고미사용 Min</label>
            <input className="input" value={inNotUseMin} onChange={(e) => setInNotUseMin(e.target.value)} />
          </div>
          <div>
            <label className="label">입고미사용 Max</label>
            <input className="input" value={inNotUseMax} onChange={(e) => setInNotUseMax(e.target.value)} />
          </div>
          <div>
            <label className="label">대분류 Seq</label>
            <input className="input" value={categorySeq} onChange={(e) => setCategorySeq(e.target.value)} />
          </div>
          <div>
            <label className="label">중분류 Seq</label>
            <input className="input" value={subcategorySeq} onChange={(e) => setSubcategorySeq(e.target.value)} />
          </div>
          <div>
            <label className="label">소분류 Seq</label>
            <input className="input" value={smallCategorySeq} onChange={(e) => setSmallCategorySeq(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="button primary" onClick={() => fetchData(true)} disabled={loading}>
            {loading ? '조회 중...' : '조회'}
          </button>
          <div style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>총 {fmtNum(totalCount)} 건</div>
        </div>
      </div>

      <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {error ? (
          <div style={{ padding: 12, color: '#ef4444' }}>{error}</div>
        ) : items.length === 0 ? (
          <div className="empty-state">조회된 데이터가 없습니다</div>
        ) : (
          <div style={{ overflow: 'auto' }}>
            <table className="table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th style={{ width: 80 }}>상태</th>
                  <th style={{ minWidth: 130 }}>품목</th>
                  <th style={{ minWidth: 80 }}>LOT</th>
                  <th style={{ minWidth: 120 }}>창고</th>
                  <th style={{ minWidth: 90, textAlign: 'right' }}>재고수량</th>
                  <th style={{ minWidth: 90, textAlign: 'right' }}>잔여일수</th>
                  <th style={{ minWidth: 90, textAlign: 'right' }}>잔여율</th>
                  <th style={{ minWidth: 110 }}>유통기한</th>
                  <th style={{ minWidth: 110 }}>최종출고</th>
                  <th style={{ minWidth: 110, textAlign: 'right' }}>출고미사용</th>
                  <th style={{ minWidth: 110, textAlign: 'right' }}>입고미사용</th>
                  <th style={{ minWidth: 110 }}>유통기한설정</th>
                  <th style={{ minWidth: 140 }}>분류(대/중/소)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id ?? `${item.item_no}-${item.lot_no}-${idx}`}>
                    <td>{idx + 1}</td>
                    <td>{badge(item.exp_chk)}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.item_no || '-'}</div>
                      <div style={{ color: 'var(--muted)' }}>{item.item_name || '-'}</div>
                    </td>
                    <td>{item.lot_no || '-'}</td>
                    <td>{item.wh_name || '-'}</td>
                    <td style={{ textAlign: 'right' }}>{fmtNum(item.stock_qty, 2)}</td>
                    <td style={{ textAlign: 'right' }}>{fmtNum(item.remain_day)}</td>
                    <td style={{ textAlign: 'right' }}>{item.remain_rate != null ? `${Number(item.remain_rate).toFixed(2)}%` : '-'}</td>
                    <td>{fmtDate(item.exp_date)}</td>
                    <td>{fmtDate(item.last_out_date)}</td>
                    <td style={{ textAlign: 'right' }}>{fmtNum(item.out_not_use_date)}</td>
                    <td style={{ textAlign: 'right' }}>{fmtNum(item.in_not_use_date)}</td>
                    <td>{item.exp_period || '-'}</td>
                    <td>
                      <div>{item.item_category || '-'}</div>
                      <div style={{ color: 'var(--muted)' }}>
                        {item.item_subcategory || '-'} / {item.item_small_category || '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {hasMore && !error && (
          <div style={{ padding: 12, display: 'flex', justifyContent: 'center' }}>
            <button className="button" onClick={() => fetchData(false)} disabled={loading}>
              {loading ? '불러오는 중...' : '더 보기'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
