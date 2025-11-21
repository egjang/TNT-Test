import React, { useState, useEffect } from 'react'
import chevronLeft from '../../assets/icons/chevron-left.svg'
import chevronRight from '../../assets/icons/chevron-right.svg'

type PeriodType = 'daily' | 'weekly' | 'monthly'
type FilterType = 'owner' | 'creator'

type StatsCard = {
  label: string
  startDate: string
  endDate: string
  count: number
}

type LeadDetailItem = {
  id: number
  company_name?: string
  contact_name?: string
  lead_status?: string
  biz_type?: string
  addr_province_name?: string
  updated_at?: string
  activities?: ActivityItem[]
}

type ActivityItem = {
  id: number
  subject?: string
  description?: string
  activity_type?: string
  activity_status?: string
  planned_start_at?: string
  actual_start_at?: string
  updated_at?: string
}

function formatYYMMDDHHMM(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const pad = (n: number) => String(n).padStart(2, '0')
  const year = pad(date.getFullYear() % 100)
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hour = pad(date.getHours())
  const minute = pad(date.getMinutes())
  return `${year}-${month}-${day} ${hour}:${minute}`
}

export function TMStatus() {
  const [period, setPeriod] = useState<PeriodType>('weekly')
  const [filterType, setFilterType] = useState<FilterType>('owner')
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('')
  const [baseDate, setBaseDate] = useState<string>(() => new Date().toISOString().split('T')[0])

  const [regStats, setRegStats] = useState<StatsCard[]>([])
  const [actStats, setActStats] = useState<StatsCard[]>([])

  const [selectedRegCard, setSelectedRegCard] = useState<StatsCard | null>(null)

  const [regDetails, setRegDetails] = useState<LeadDetailItem[]>([])
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null)

  const [loading, setLoading] = useState(false)
  const [owners, setOwners] = useState<Array<{ emp_id: string; emp_name: string; dept_name: string; assignee_id: string }>>([])

  // Load owners (영업1/2 본부/팀) for assignee selection
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/v1/employees')
        if (!res.ok) return
        const data = await res.json()
        if (Array.isArray(data)) {
          let list: any[] = [...data]
          const hasYoon = list.some((o) => String(o?.emp_name || '') === '윤이랑')
          if (!hasYoon) {
            try {
              const resAll = await fetch('/api/v1/employees?depts=all')
              if (resAll.ok) {
                const all = await resAll.json()
                if (Array.isArray(all)) {
                  const found = all.find((o: any) => String(o?.emp_name || '') === '윤이랑')
                  if (found) list = [...list, found]
                }
              }
            } catch {}
          }
          setOwners(list as any)
        }
      } catch {}
    })()
  }, [])

  function generateDefaultCards(): StatsCard[] {
    const base = new Date(baseDate)
    if (period === 'daily') {
      const prev = new Date(base)
      prev.setDate(prev.getDate() - 1)
      const next = new Date(base)
      next.setDate(next.getDate() + 1)
      return [
        { label: '전일', startDate: prev.toISOString().split('T')[0], endDate: prev.toISOString().split('T')[0], count: 0 },
        { label: '금일', startDate: baseDate, endDate: baseDate, count: 0 },
        { label: '익일', startDate: next.toISOString().split('T')[0], endDate: next.toISOString().split('T')[0], count: 0 }
      ]
    } else if (period === 'weekly') {
      const current = new Date(base)
      const day = current.getDay()
      const diff = current.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(current.setDate(diff))

      const currentWeekStart = monday.toISOString().split('T')[0]
      const currentWeekEnd = new Date(monday)
      currentWeekEnd.setDate(currentWeekEnd.getDate() + 6)

      const prevWeekStart = new Date(monday)
      prevWeekStart.setDate(prevWeekStart.getDate() - 7)
      const prevWeekEnd = new Date(prevWeekStart)
      prevWeekEnd.setDate(prevWeekEnd.getDate() + 6)

      const nextWeekStart = new Date(monday)
      nextWeekStart.setDate(nextWeekStart.getDate() + 7)
      const nextWeekEnd = new Date(nextWeekStart)
      nextWeekEnd.setDate(nextWeekEnd.getDate() + 6)

      return [
        { label: '전주', startDate: prevWeekStart.toISOString().split('T')[0], endDate: prevWeekEnd.toISOString().split('T')[0], count: 0 },
        { label: '금주', startDate: currentWeekStart, endDate: currentWeekEnd.toISOString().split('T')[0], count: 0 },
        { label: '차주', startDate: nextWeekStart.toISOString().split('T')[0], endDate: nextWeekEnd.toISOString().split('T')[0], count: 0 }
      ]
    } else {
      const current = new Date(base)
      const currentMonthStart = new Date(current.getFullYear(), current.getMonth(), 1)
      const currentMonthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0)

      const prevMonthStart = new Date(current.getFullYear(), current.getMonth() - 1, 1)
      const prevMonthEnd = new Date(current.getFullYear(), current.getMonth(), 0)

      const nextMonthStart = new Date(current.getFullYear(), current.getMonth() + 1, 1)
      const nextMonthEnd = new Date(current.getFullYear(), current.getMonth() + 2, 0)

      return [
        { label: '전월', startDate: prevMonthStart.toISOString().split('T')[0], endDate: prevMonthEnd.toISOString().split('T')[0], count: 0 },
        { label: '금월', startDate: currentMonthStart.toISOString().split('T')[0], endDate: currentMonthEnd.toISOString().split('T')[0], count: 0 },
        { label: '익월', startDate: nextMonthStart.toISOString().split('T')[0], endDate: nextMonthEnd.toISOString().split('T')[0], count: 0 }
      ]
    }
  }

  async function loadStats() {
    setLoading(true)
    // Reset previous selections
    setSelectedRegCard(null)
    setRegDetails([])
    setSelectedLeadId(null)

    // Generate default cards with 0 count
    const defaultCards = generateDefaultCards()

    try {
      const params: any = {
        period,
        filterType,
        baseDate
      }
      // Only add empId if a specific employee is selected
      if (selectedAssigneeId) {
        params.empId = selectedAssigneeId
      }
      const searchParams = new URLSearchParams(params)

      const [regRes, actRes] = await Promise.all([
        fetch(`/api/v1/lead-stats/registration?${searchParams.toString()}`),
        fetch(`/api/v1/lead-stats/activity?${searchParams.toString()}`)
      ])
      if (regRes.ok && actRes.ok) {
        const regData = await regRes.json()
        const actData = await actRes.json()
        const normalizeCards = (data: any[], defaults: StatsCard[]) => {
          if (!Array.isArray(data) || data.length === 0) {
            return defaults
          }
          return data.map((item) => ({
            label: item.label,
            count: Number(item.count) || 0,
            startDate: item.startDate || baseDate,
            endDate: item.endDate || baseDate,
          }))
        }
        setRegStats(normalizeCards(regData, defaultCards))
        setActStats(normalizeCards(actData, defaultCards))
      } else {
        console.error('Failed to fetch stats. Reg:', regRes.status, 'Act:', actRes.status)
        if (!regRes.ok) {
          const regError = await regRes.text()
          console.error('Registration error:', regError)
        }
        if (!actRes.ok) {
          const actError = await actRes.text()
          console.error('Activity error:', actError)
        }
        // Set default cards even on error
        setRegStats(defaultCards)
        setActStats(defaultCards)
      }
    } catch (e) {
      console.error('Failed to load stats', e)
      // Set default cards even on exception
      setRegStats(defaultCards)
      setActStats(defaultCards)
    } finally {
      setLoading(false)
    }
  }

  async function loadRegDetails(card: StatsCard) {
    try {
      const ownerCondition = filterType === 'owner' && selectedAssigneeId
        ? `AND CAST(l.assignee_id AS TEXT) = '${selectedAssigneeId}'`
        : ''
      const creatorCondition = filterType === 'creator' && selectedAssigneeId
        ? `AND CAST(l.created_by AS TEXT) = '${selectedAssigneeId}'`
        : ''
      const params: any = {
        filterType,
        startDate: card.startDate,
        endDate: card.endDate
      }
      if (selectedAssigneeId) {
        params.empId = selectedAssigneeId
      }
      const searchParams = new URLSearchParams(params)
      const res = await fetch(`/api/v1/lead-stats/registration/details?${searchParams.toString()}`)
      if (res.ok) {
        const leads: LeadDetailItem[] = await res.json()
        // Backend already includes activities for each lead
        setRegDetails(leads)
        setSelectedRegCard(card)
        setSelectedLeadId(null) // Reset selected lead
      }
    } catch (e) {
      console.error('Failed to load registration details', e)
    }
  }


  function navigateDate(direction: 'prev' | 'next') {
    const current = new Date(baseDate)
    let newDate: Date

    if (period === 'daily') {
      newDate = direction === 'prev' ? new Date(current.setDate(current.getDate() - 1)) : new Date(current.setDate(current.getDate() + 1))
    } else if (period === 'weekly') {
      newDate = direction === 'prev' ? new Date(current.setDate(current.getDate() - 7)) : new Date(current.setDate(current.getDate() + 7))
    } else {
      newDate = direction === 'prev' ? new Date(current.setMonth(current.getMonth() - 1)) : new Date(current.setMonth(current.getMonth() + 1))
    }

    const newDateStr = newDate.toISOString().split('T')[0]
    setBaseDate(newDateStr)

    // Auto-reload stats with new date
    setTimeout(() => {
      loadStatsWithDate(newDateStr)
    }, 0)
  }

  async function loadStatsWithDate(date: string) {
    setLoading(true)
    setSelectedRegCard(null)
    setRegDetails([])
    setSelectedLeadId(null)

    // Generate default cards with the provided date
    const generateDefaultCardsForDate = (): StatsCard[] => {
      const base = new Date(date)
      if (period === 'daily') {
        const prev = new Date(base)
        prev.setDate(prev.getDate() - 1)
        const next = new Date(base)
        next.setDate(next.getDate() + 1)
        return [
          { label: '전일', startDate: prev.toISOString().split('T')[0], endDate: prev.toISOString().split('T')[0], count: 0 },
          { label: '금일', startDate: date, endDate: date, count: 0 },
          { label: '익일', startDate: next.toISOString().split('T')[0], endDate: next.toISOString().split('T')[0], count: 0 }
        ]
      } else if (period === 'weekly') {
        const current = new Date(base)
        const day = current.getDay()
        const diff = current.getDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(current.setDate(diff))

        const currentWeekStart = monday.toISOString().split('T')[0]
        const currentWeekEnd = new Date(monday)
        currentWeekEnd.setDate(currentWeekEnd.getDate() + 6)

        const prevWeekStart = new Date(monday)
        prevWeekStart.setDate(prevWeekStart.getDate() - 7)
        const prevWeekEnd = new Date(prevWeekStart)
        prevWeekEnd.setDate(prevWeekEnd.getDate() + 6)

        const nextWeekStart = new Date(monday)
        nextWeekStart.setDate(nextWeekStart.getDate() + 7)
        const nextWeekEnd = new Date(nextWeekStart)
        nextWeekEnd.setDate(nextWeekEnd.getDate() + 6)

        return [
          { label: '전주', startDate: prevWeekStart.toISOString().split('T')[0], endDate: prevWeekEnd.toISOString().split('T')[0], count: 0 },
          { label: '금주', startDate: currentWeekStart, endDate: currentWeekEnd.toISOString().split('T')[0], count: 0 },
          { label: '차주', startDate: nextWeekStart.toISOString().split('T')[0], endDate: nextWeekEnd.toISOString().split('T')[0], count: 0 }
        ]
      } else {
        const current = new Date(base)
        const currentMonthStart = new Date(current.getFullYear(), current.getMonth(), 1)
        const currentMonthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0)

        const prevMonthStart = new Date(current.getFullYear(), current.getMonth() - 1, 1)
        const prevMonthEnd = new Date(current.getFullYear(), current.getMonth(), 0)

        const nextMonthStart = new Date(current.getFullYear(), current.getMonth() + 1, 1)
        const nextMonthEnd = new Date(current.getFullYear(), current.getMonth() + 2, 0)

        return [
          { label: '전월', startDate: prevMonthStart.toISOString().split('T')[0], endDate: prevMonthEnd.toISOString().split('T')[0], count: 0 },
          { label: '금월', startDate: currentMonthStart.toISOString().split('T')[0], endDate: currentMonthEnd.toISOString().split('T')[0], count: 0 },
          { label: '익월', startDate: nextMonthStart.toISOString().split('T')[0], endDate: nextMonthEnd.toISOString().split('T')[0], count: 0 }
        ]
      }
    }

    const defaultCards = generateDefaultCardsForDate()

    try {
      const params: any = {
        period,
        filterType,
        baseDate: date
      }
      if (selectedAssigneeId) {
        params.empId = selectedAssigneeId
      }
      const searchParams = new URLSearchParams(params)

      const [regRes, actRes] = await Promise.all([
        fetch(`/api/v1/lead-stats/registration?${searchParams.toString()}`),
        fetch(`/api/v1/lead-stats/activity?${searchParams.toString()}`)
      ])

      if (regRes.ok && actRes.ok) {
        const regData = await regRes.json()
        const actData = await actRes.json()
        const normalizeCards = (data: any[], defaults: StatsCard[]) => {
          if (!Array.isArray(data) || data.length === 0) {
            return defaults
          }
          return data.map((item) => ({
            label: item.label,
            count: Number(item.count) || 0,
            startDate: item.startDate || date,
            endDate: item.endDate || date,
          }))
        }
        setRegStats(normalizeCards(regData, defaultCards))
        setActStats(normalizeCards(actData, defaultCards))
      } else {
        // Set default cards even on error
        setRegStats(defaultCards)
        setActStats(defaultCards)
      }
    } catch (e) {
      console.error('Failed to load stats', e)
      // Set default cards even on exception
      setRegStats(defaultCards)
      setActStats(defaultCards)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>TM현황</h2>
      </div>

      {/* Filters */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--panel)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>조회기간:</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodType)}
            style={{ height: 32, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', fontSize: 13 }}
          >
            <option value="daily">일별</option>
            <option value="weekly">주간</option>
            <option value="monthly">월간</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>구분:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FilterType)}
            style={{ height: 32, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', fontSize: 13 }}
          >
            <option value="owner">소유자</option>
            <option value="creator">등록자</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
            {filterType === 'owner' ? '소유자' : '등록자'}:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
            <select
              className="search-input"
              value={selectedAssigneeId || ''}
              onChange={(e) => setSelectedAssigneeId(e.target.value || '')}
              style={{ height: 32, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', fontSize: 13, minWidth: 160 }}
            >
              <option value="">전체</option>
              {owners.map(o => (
                <option key={o.assignee_id} value={o.assignee_id}>{o.dept_name} · {o.emp_name}</option>
              ))}
            </select>
            <div style={{ whiteSpace: 'nowrap', alignSelf: 'center', fontSize: 12, color: 'var(--muted)' }}>
              {(() => {
                const found = owners.find(o => o.assignee_id === selectedAssigneeId)
                const name = found ? found.emp_name : '전체'
                return `현재선택 : ${name}`
              })()}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>기준일자:</label>
          <input
            type="date"
            value={baseDate}
            onChange={(e) => setBaseDate(e.target.value)}
            style={{ height: 32, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', fontSize: 13 }}
          />
        </div>

        <button
          onClick={loadStats}
          disabled={loading}
          className="btn btn-card btn-3d"
          style={{ height: 32, fontSize: 13, padding: '0 20px', fontWeight: 600 }}
        >
          {loading ? '조회 중...' : '조회'}
        </button>

        {/* Navigation */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigateDate('prev')}
            className="btn btn-card"
            style={{ height: 32, width: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="이전"
            disabled={regStats.length === 0 && actStats.length === 0}
          >
            <img src={chevronLeft} alt="이전" style={{ width: 16, height: 16 }} />
          </button>
          <button
            onClick={() => navigateDate('next')}
            className="btn btn-card"
            style={{ height: 32, width: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="다음"
            disabled={regStats.length === 0 && actStats.length === 0}
          >
            <img src={chevronRight} alt="다음" style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>

      {/* Stats Cards Container */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 20 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
            데이터를 불러오는 중...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
            {/* Stats Cards Row */}
            <div style={{ flex: '0 0 auto', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {/* Left: Registration Stats */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                  잠재고객 등록현황
                </h3>
              {regStats.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📊</div>
                  <div style={{ fontSize: 15, color: 'var(--muted)', marginBottom: 8 }}>
                    조회 조건을 설정하고 조회 버튼을 클릭하세요
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {regStats.map((card, idx) => (
                      <button
                        key={idx}
                        onClick={() => loadRegDetails(card)}
                        className="btn btn-card btn-3d"
                        style={{
                          flex: 1,
                          minHeight: 120,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: 8,
                          background: selectedRegCard?.label === card.label ? 'var(--primary)' : 'var(--panel)',
                          color: selectedRegCard?.label === card.label ? '#fff' : 'var(--text)',
                          border: selectedRegCard?.label === card.label ? '2px solid var(--primary)' : '1px solid var(--border)'
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{card.label}</div>
                        <div style={{ fontSize: 28, fontWeight: 700 }}>{card.count}</div>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>
                          {card.startDate === card.endDate ? card.startDate : `${card.startDate} ~ ${card.endDate}`}
                        </div>
                      </button>
                    ))}
                  </div>

                </>
              )}
              </div>

              {/* Right: Activity Stats (Display only, no click) */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                  잠재고객 활동현황
                </h3>
                {actStats.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📊</div>
                    <div style={{ fontSize: 15, color: 'var(--muted)', marginBottom: 8 }}>
                      조회 조건을 설정하고 조회 버튼을 클릭하세요
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 12 }}>
                    {actStats.map((card, idx) => (
                      <div
                        key={idx}
                        className="btn-card btn-3d"
                        style={{
                          flex: 1,
                          minHeight: 120,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: 8,
                          background: 'var(--panel)',
                          color: 'var(--text)',
                          border: '1px solid var(--border)',
                          cursor: 'default',
                          opacity: 0.8
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{card.label}</div>
                        <div style={{ fontSize: 28, fontWeight: 700 }}>{card.count}</div>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>
                          {card.startDate === card.endDate ? card.startDate : `${card.startDate} ~ ${card.endDate}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {selectedRegCard && regDetails.length > 0 && (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12 }}>
                {/* Left: Lead List */}
                <div style={{ flex: 1, minWidth: 0, overflow: 'auto', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                      {selectedRegCard.label} 등록 목록 ({regDetails.length}건)
                    </h4>
                    <span style={{ fontSize: 12, color: '#e11d48', fontWeight: 600 }}>잠재고객 클릭시 활동 조회</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {regDetails.map((lead) => (
                      <button
                        key={lead.id}
                        onClick={() => setSelectedLeadId(lead.id)}
                        style={{
                          padding: 10,
                          background: selectedLeadId === lead.id ? 'var(--primary-light)' : 'var(--background)',
                          border: selectedLeadId === lead.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                          borderRadius: 6,
                          fontSize: 13,
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ fontWeight: 600, color: selectedLeadId === lead.id ? 'var(--primary)' : 'var(--text)', marginBottom: 4 }}>
                          {lead.company_name || '-'}
                          {lead.activities && lead.activities.length > 0 && (
                            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--muted)' }}>
                              (활동 {lead.activities.length}건)
                            </span>
                          )}
                        </div>
                        <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                          담당자: {lead.contact_name || '-'}
                        </div>
                        <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
                          상태: {lead.lead_status || '-'} | 업종: {lead.biz_type || '-'}
                        </div>
                        <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
                          지역: {lead.addr_province_name || '-'}
                        </div>
                        <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
                          최종수정: {formatYYMMDDHHMM(lead.updated_at)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right: Activities of Selected Lead */}
                {selectedLeadId && (() => {
                  const selectedLead = regDetails.find(l => l.id === selectedLeadId)
                  return selectedLead ? (
                    <div style={{ flex: 1, minWidth: 0, overflow: 'auto', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                      <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                        {selectedLead.company_name || '-'} 활동 목록 ({selectedLead.activities?.length || 0}건)
                      </h4>
                      {!selectedLead.activities || selectedLead.activities.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: 13 }}>
                          활동 데이터가 없습니다
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {selectedLead.activities.map((activity) => (
                            <div
                              key={activity.id}
                              style={{ padding: 10, background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }}
                            >
                              <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                                {activity.subject || '-'}
                              </div>
                              <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                                유형: {activity.activity_type || '-'} | 상태: {activity.activity_status || '-'}
                              </div>
                              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
                                계획: {activity.planned_start_at ? new Date(activity.planned_start_at).toLocaleString('ko-KR') : '-'}
                              </div>
                              {activity.actual_start_at && (
                                <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
                                  실제: {new Date(activity.actual_start_at).toLocaleString('ko-KR')}
                                </div>
                              )}
                              {activity.description && (
                                <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
                                  {activity.description}
                                </div>
                              )}
                              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
                                수정: {activity.updated_at ? new Date(activity.updated_at).toLocaleString('ko-KR') : '-'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null
                })()}
              </div>
            )}
          </div>
        )}
      </div>


    </div>
  )
}
