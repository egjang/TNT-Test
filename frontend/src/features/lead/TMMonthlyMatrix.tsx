import React, { useEffect, useState } from 'react'
import chevronLeft from '../../assets/icons/chevron-left.svg'
import chevronRight from '../../assets/icons/chevron-right.svg'

type MonthlyAssignee = {
  assigneeId: string
  assigneeName: string
}

type MonthlyRow = {
  date: string
  counts: Record<string, number>
  total: number
}

type MonthlyGridResponse = {
  month: string
  startDate: string
  endDate: string
  assignees: MonthlyAssignee[]
  rows: MonthlyRow[]
  totals: Record<string, number>
  totalCount: number
}

function formatDateOnly(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeMonthInput(dateStr?: string) {
  const base = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date()
  base.setDate(1)
  return formatDateOnly(base)
}


export function TMMonthlyMatrix() {
  const [monthlyBaseDate, setMonthlyBaseDate] = useState<string>(() => normalizeMonthInput(new Date().toISOString().split('T')[0]))
  const [monthlyGrid, setMonthlyGrid] = useState<MonthlyGridResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const monthlyAssignees = monthlyGrid?.assignees ?? []
  const monthlyRows = monthlyGrid?.rows ?? []
  const monthlyTotals = monthlyGrid?.totals ?? {}
  const currentMonthLabel = monthlyGrid?.month || (monthlyBaseDate ? monthlyBaseDate.slice(0, 7) : '')
  const readableMonthLabel = currentMonthLabel ? `${currentMonthLabel.slice(0, 4)}년 ${currentMonthLabel.slice(5, 7)}월` : '월 선택'

  useEffect(() => {
    void loadMonthlyGrid(monthlyBaseDate)
  }, [])

  async function loadMonthlyGrid(targetDate?: string) {
    const reference = targetDate || monthlyBaseDate
    if (!reference) return
    const normalized = normalizeMonthInput(reference)
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ baseDate: normalized })
      const res = await fetch(`/api/v1/lead-stats/monthly/owner-matrix?${params.toString()}`)
      if (!res.ok) {
        throw new Error(`Failed to fetch monthly matrix: ${res.status}`)
      }
      const data: MonthlyGridResponse = await res.json()
      setMonthlyGrid(data)
      setMonthlyBaseDate(normalized)
    } catch (err) {
      console.error('월별 담당자 매트릭스 조회 실패', err)
      setError('월별 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function handleMonthlyNavigation(direction: 'prev' | 'next') {
    if (loading) return
    const reference = monthlyGrid?.startDate || monthlyBaseDate
    if (!reference) return
    const date = new Date(`${reference}T00:00:00`)
    date.setDate(1)
    date.setMonth(date.getMonth() + (direction === 'prev' ? -1 : 1))
    const target = formatDateOnly(date)
    void loadMonthlyGrid(target)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>월별 잠재고객 등록 현황 (담당자)</h3>
          {monthlyGrid?.startDate && monthlyGrid?.endDate && (
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              {monthlyGrid.startDate} ~ {monthlyGrid.endDate}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => handleMonthlyNavigation('prev')}
            className="btn btn-card"
            style={{ height: 32, width: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="이전달"
            aria-label="이전달"
            disabled={loading}
          >
            <img src={chevronLeft} alt="이전달" style={{ width: 14, height: 14 }} />
          </button>
          <div style={{ fontSize: 14, fontWeight: 600, minWidth: 100, textAlign: 'center', color: 'var(--text)' }}>{readableMonthLabel}</div>
          <button
            onClick={() => handleMonthlyNavigation('next')}
            className="btn btn-card"
            style={{ height: 32, width: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="다음달"
            aria-label="다음달"
            disabled={loading}
          >
            <img src={chevronRight} alt="다음달" style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, overflow: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>월별 데이터를 불러오는 중입니다...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#f97316', fontWeight: 600 }}>{error}</div>
        ) : !monthlyGrid ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 13 }}>데이터를 불러오려면 상단 버튼으로 월을 선택하세요.</div>
        ) : monthlyAssignees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 13 }}>선택한 월에는 잠재고객 등록 데이터가 없습니다.</div>
        ) : (
          <>
            <div style={{ overflow: 'auto', maxHeight: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, tableLayout: 'fixed', minWidth: 200 }}>
                <thead>
                  <tr>
                    <th style={{ padding: '2px 3px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', background: 'var(--background)', width: 40 }}>일자</th>
                    <th style={{ padding: '2px 3px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', background: 'var(--background)', width: 50 }}>합계</th>
                    {monthlyAssignees.map((assignee) => (
                      <th
                        key={assignee.assigneeId}
                        style={{
                          padding: '2px 3px',
                          borderBottom: '1px solid var(--border)',
                          borderRight: '1px solid var(--border)',
                          background: 'var(--background)',
                          whiteSpace: 'nowrap',
                          minWidth: 40,
                          width: Math.max(40, 150 / Math.max(monthlyAssignees.length, 1))
                        }}
                      >
                        {assignee.assigneeName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '2px 3px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', fontWeight: 700, color: '#2563eb', textAlign: 'center' }}>
                      열합계
                    </td>
                    <td style={{ padding: '2px 3px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', fontWeight: 700, color: '#2563eb', textAlign: 'center' }}>
                      {monthlyGrid?.totalCount ?? 0}
                    </td>
                    {monthlyAssignees.map((assignee) => {
                      const total = monthlyTotals[assignee.assigneeId] ?? 0
                      return (
                        <td
                          key={`top-total-${assignee.assigneeId}`}
                          style={{
                            padding: '2px 2px',
                            borderBottom: '1px solid var(--border)',
                            borderRight: '1px solid var(--border)',
                            textAlign: 'center',
                            fontWeight: 700,
                            color: total > 0 ? '#2563eb' : 'var(--text)',
                            fontVariantNumeric: 'tabular-nums'
                          }}
                        >
                          {total}
                        </td>
                      )
                    })}
                  </tr>
                  {monthlyRows.map((row) => (
                    <tr key={row.date}>
                      <td style={{ padding: '2px 3px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', textAlign: 'center', fontWeight: 600 }}>
                        {row.date.slice(-2)}일
                      </td>
                      <td style={{ padding: '2px 3px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                        {row.total}
                      </td>
                      {monthlyAssignees.map((assignee) => {
                        const value = row.counts[assignee.assigneeId] ?? 0
                        return (
                          <td
                            key={`${row.date}-${assignee.assigneeId}`}
                            style={{
                              padding: '2px 2px',
                              borderBottom: '1px solid var(--border)',
                              borderRight: '1px solid var(--border)',
                              textAlign: 'center',
                              fontVariantNumeric: 'tabular-nums',
                              color: value > 0 ? '#2563eb' : 'var(--text)'
                            }}
                          >
                            {value}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 8, textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>
              총 {monthlyGrid?.totalCount != null ? monthlyGrid.totalCount.toLocaleString() : '0'}건
            </div>
          </>
        )}
      </div>
    </div>
  )
}
