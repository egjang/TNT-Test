import React, { useCallback, useEffect, useMemo, useState } from 'react'

type ReceivableRowRaw = {
  CustName?: string
  CustNo?: string
  CustSeq?: number | string
  IsCreditCheck?: string
  CurrName?: string
  PrevCreditAmt?: number | string
  SalesAmt?: number | string
  SalesVat?: number | string
  TotSalesAmt?: number | string
  ReceiptAmt?: number | string
  NoReceiptAmt?: number | string
}

type ReceivableRow = {
  CustName: string
  CustNo: string
  CustSeq: string
  IsCreditCheck: 'Y' | 'N' | ''
  CurrName: string
  PrevCreditAmt: number
  SalesAmt: number
  SalesVat: number
  TotSalesAmt: number
  ReceiptAmt: number
  NoReceiptAmt: number
}

type PaginationInfo = {
  PAGE_NO: number
  PAGE_SIZE: number
  TotalData: number
  TotalPage: number
}

const ENDPOINT =
  'http://220.73.213.73/Angkor.Ylw.Common.HttpExecute/RestOutsideService.svc/OpenApi/IsStoredProcedure/tnt_SWAPISLCustCreditListInfo'

const CERT_PAYLOAD = {
  certId: 'TNT_CRM',
  certKey: '9836164F-3601-4DBB-9D6D-54685CD89B95',
  dsn: 'tnt_bis',
  dsnOper: 'tnt_oper',
  securityType: 0,
  CompanySeq: 1,
}

const pageSizeOptions = [20, 50, 100]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(value || 0))

const normalizeRow = (row: ReceivableRowRaw): ReceivableRow => {
  const toNumber = (value: number | string | undefined) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return {
    CustName: String(row.CustName ?? ''),
    CustNo: String(row.CustNo ?? ''),
    CustSeq: String(row.CustSeq ?? ''),
    IsCreditCheck: row.IsCreditCheck === 'Y' ? 'Y' : row.IsCreditCheck === 'N' ? 'N' : '',
    CurrName: String(row.CurrName ?? ''),
    PrevCreditAmt: toNumber(row.PrevCreditAmt),
    SalesAmt: toNumber(row.SalesAmt),
    SalesVat: toNumber(row.SalesVat),
    TotSalesAmt: toNumber(row.TotSalesAmt),
    ReceiptAmt: toNumber(row.ReceiptAmt),
    NoReceiptAmt: toNumber(row.NoReceiptAmt),
  }
}

const buildPayload = ({
  stdDate,
  custSeq,
  empSeq,
  pageNo,
  pageSize,
}: {
  stdDate: string
  custSeq: string
  empSeq: string
  pageNo: number
  pageSize: number
}) => ({
  ROOT: {
    ...CERT_PAYLOAD,
    data: {
      ROOT: {
        DataBlock1: {
          StdDate: stdDate.replace(/-/g, ''),
          CustSeq: custSeq.trim() ? Number(custSeq) : '',
          EmpSeq: empSeq.trim() ? Number(empSeq) : '',
          SMQryType: 1078004,
          IncludeMiNote: 1,
          PAGE_NO: pageNo,
          PAGE_SIZE: pageSize,
        },
      },
    },
  },
})

export function SalesMgmtReceivables() {
  const today = new Date().toISOString().slice(0, 10)
  const [filters, setFilters] = useState({
    stdDate: today,
    custSeq: '',
    empSeq: '',
  })
  const [activeFilters, setActiveFilters] = useState(filters)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(pageSizeOptions[0])
  const [rows, setRows] = useState<ReceivableRow[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    PAGE_NO: 1,
    PAGE_SIZE: pageSizeOptions[0],
    TotalData: 0,
    TotalPage: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [payloadPreview, setPayloadPreview] = useState<string | null>(null)
  const [showPayloadPreview, setShowPayloadPreview] = useState(false)
  const [returnInfo, setReturnInfo] = useState<string | null>(null)

  const handleInputChange = (field: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const handleSearch = () => {
    setActiveFilters(filters)
    setPage(1)
  }

  const handlePageSizeChange = (value: number) => {
    setPageSize(value)
    setPage(1)
  }

  const incrementPage = (direction: 'next' | 'prev') => {
    setPage((prev) => {
      if (direction === 'next') {
        if (pagination.TotalPage && prev >= pagination.TotalPage) {
          return prev
        }
        return prev + 1
      }
      return Math.max(1, prev - 1)
    })
  }

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.sales += row.SalesAmt
        acc.receipt += row.ReceiptAmt
        acc.noReceipt += row.NoReceiptAmt
        return acc
      },
      { sales: 0, receipt: 0, noReceipt: 0 }
    )
  }, [rows])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const payload = buildPayload({
        stdDate: activeFilters.stdDate,
        custSeq: activeFilters.custSeq,
        empSeq: activeFilters.empSeq,
        pageNo: page,
        pageSize,
      })
      const serializedPayload = JSON.stringify(payload, null, 2)
      setPayloadPreview(serializedPayload)
      setShowPayloadPreview(true)

      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=utf-8' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`서버 응답이 존재하지 않거나 상태값 ${response.status}`)
      }

      const json = await response.json()
      const root = json?.ROOT
      const code = root?.ReturnCode
      if (code !== '0000') {
        const info = `ReturnCode: ${code ?? 'N/A'}${root?.ReturnMessage ? ` • ${root.ReturnMessage}` : ''}`
        setReturnInfo(info)
        throw new Error(root?.ReturnMessage ?? '데이터를 불러오는 데 실패했습니다.')
      }
      setReturnInfo(
        `ReturnCode: ${code ?? 'N/A'}${root?.ReturnMessage ? ` • ${root.ReturnMessage}` : ''}`
      )

      const rawRows: ReceivableRowRaw[] = Array.isArray(root?.DataBlock1) ? root.DataBlock1 : []
      setRows(rawRows.map(normalizeRow))

      const block2 = Array.isArray(root?.DataBlock2) ? root.DataBlock2[0] : null
      if (block2) {
        setPagination({
          PAGE_NO: Number(block2.PAGE_NO ?? page),
          PAGE_SIZE: Number(block2.PAGE_SIZE ?? pageSize),
          TotalData: Number(block2.TotalData ?? rawRows.length),
          TotalPage: Number(block2.TotalPage ?? 0),
        })
      } else {
        setPagination((prev) => ({
          ...prev,
          PAGE_NO: page,
          PAGE_SIZE: pageSize,
          TotalData: rawRows.length,
          TotalPage: Math.max(1, Math.ceil(rawRows.length / pageSize)),
        }))
      }
      setLastUpdated(new Date().toLocaleString())
    } catch (err: any) {
      setError(err.message ?? '데이터를 불러오는 중 알 수 없는 오류가 발생했습니다.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [activeFilters, page, pageSize])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <section className="receivables-page">
      <div className="page-title">
        <h1>미수현황</h1>
        <p>기준일/필터를 설정하고 서버에서 고객 미수/판매/수금 데이터를 조회하세요.</p>
      </div>

      <div className="filters-grid">
        <label className="field">
          <span>기준일</span>
          <input
            type="date"
            value={filters.stdDate}
            onChange={(event) => handleInputChange('stdDate', event.target.value)}
            className="search-input"
          />
        </label>
        <label className="field">
          <span>거래처 코드(CustSeq)</span>
          <input
            type="number"
            placeholder="전체"
            value={filters.custSeq}
            min={0}
            onChange={(event) => handleInputChange('custSeq', event.target.value)}
            className="search-input"
          />
        </label>
        <label className="field">
          <span>사원 코드(EmpSeq)</span>
          <input
            type="number"
            placeholder="전체"
            value={filters.empSeq}
            min={0}
            onChange={(event) => handleInputChange('empSeq', event.target.value)}
            className="search-input"
          />
        </label>
        <label className="field">
          <span>페이지 크기</span>
          <select
            value={pageSize}
            onChange={(event) => handlePageSizeChange(Number(event.target.value))}
            className="search-input"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}개
              </option>
            ))}
          </select>
        </label>
        <div className="field actions">
          <button type="button" className="btn" onClick={handleSearch} disabled={loading}>
            조회하기
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => setPage(1)}
            disabled={page === 1}
          >
            첫 페이지
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => payloadPreview && setShowPayloadPreview(true)}
            disabled={!payloadPreview}
          >
            최근 전문 보기
          </button>
        </div>
      </div>

      <div className="summary-cards">
        <article className="summary-card">
          <div>
            <p className="muted">총 데이터</p>
            <strong>{pagination.TotalData.toLocaleString()}건</strong>
          </div>
          <span className="muted">
            {pagination.PAGE_NO} / {Math.max(1, pagination.TotalPage)} 페이지
          </span>
        </article>
        <article className="summary-card">
          <div>
            <p className="muted">금월 판매</p>
            <strong>{formatCurrency(totals.sales)} 원</strong>
          </div>
          <span className="muted">합계</span>
        </article>
        <article className="summary-card">
          <div>
            <p className="muted">금월 수금</p>
            <strong>{formatCurrency(totals.receipt)} 원</strong>
          </div>
          <span className="muted">합계</span>
        </article>
        <article className="summary-card highlight">
          <div>
            <p className="muted">현미수액</p>
            <strong>{formatCurrency(totals.noReceipt)} 원</strong>
          </div>
          <span className="muted">수금과 대비</span>
        </article>
      </div>

      <div className="table-panel">
        <div className="table-panel-header">
          <div>
            <p className="muted">마지막 업데이트: {lastUpdated ?? '—'}</p>
          </div>
          <div className="pagination-controls">
            <button
              type="button"
              className="btn secondary"
              onClick={() => incrementPage('prev')}
              disabled={page === 1}
            >
              이전
            </button>
            <span>
              {page} page / {Math.max(1, pagination.TotalPage)} page
            </span>
            <button
              type="button"
              className="btn secondary"
              onClick={() => incrementPage('next')}
              disabled={pagination.TotalPage > 0 ? page >= pagination.TotalPage : rows.length < pageSize}
            >
              다음
            </button>
          </div>
        </div>

      {error && <div className="empty-state">{error}</div>}

      <div className="table-container receivables-table">
        <table className="table">
            <thead>
              <tr>
                <th>거래처 코드</th>
                <th>거래처명</th>
                <th>통화</th>
                <th>전월이월</th>
                <th>금월판매</th>
                <th>부가세</th>
                <th>금월판매계</th>
                <th>금월수금</th>
                <th>현미수액</th>
                <th>미수 여부</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10}>
                    <div className="empty-state">데이터를 불러오는 중입니다…</div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <div className="empty-state">조회 결과가 없습니다.</div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={`${row.CustSeq}-${row.CustNo}`}>
                    <td>{row.CustSeq}</td>
                    <td>{row.CustName}</td>
                    <td>{row.CurrName}</td>
                    <td>{formatCurrency(row.PrevCreditAmt)} 원</td>
                    <td>{formatCurrency(row.SalesAmt)} 원</td>
                    <td>{formatCurrency(row.SalesVat)} 원</td>
                    <td>{formatCurrency(row.TotSalesAmt)} 원</td>
                    <td>{formatCurrency(row.ReceiptAmt)} 원</td>
                    <td className="highlight-cell">{formatCurrency(row.NoReceiptAmt)} 원</td>
                    <td>{row.IsCreditCheck || 'N'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {showPayloadPreview && payloadPreview ? (
        <div className="json-modal-backdrop" role="dialog" aria-modal="true">
          <div className="json-modal">
            <div className="json-modal-header">
              <strong>직전 요청 전문</strong>
            </div>
            <p className="muted" style={{ fontSize: 12 }}>
              요청 URL: {ENDPOINT}
            </p>
            <pre>{payloadPreview}</pre>
            {returnInfo ? (
              <p className="muted" style={{ wordBreak: 'break-all' }}>
                {returnInfo}
              </p>
            ) : null}
            <div className="json-modal-actions">
              <button type="button" className="btn secondary" onClick={() => setShowPayloadPreview(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
