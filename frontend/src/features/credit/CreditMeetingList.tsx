import React, { useState, useEffect } from 'react'
import {
  Calendar,
  Plus,
  Search,
  Filter,
  ChevronRight,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MoreHorizontal
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

type CreditMeeting = {
  id: number
  title: string
  meetingDate: string
  status: 'in_progress' | 'completed'
  customerCount: number
  highRiskCount: number
  mediumRiskCount: number
  lowRiskCount: number
  createdAt: string
  [key: string]: any
}

const COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
  default: '#e5e7eb'
}

export function CreditMeetingList() {
  const [meetings, setMeetings] = useState<CreditMeeting[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [keyword, setKeyword] = useState('')

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newMeetingName, setNewMeetingName] = useState('')
  const [newMeetingDate, setNewMeetingDate] = useState(new Date().toISOString().split('T')[0])
  const [newMeetingRemark, setNewMeetingRemark] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchMeetings = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (fromDate) params.append('fromDate', fromDate)
      if (toDate) params.append('toDate', toDate)

      const res = await fetch(`/api/v1/credit/meetings?${params.toString()}`)
      if (!res.ok) throw new Error(`API 호출 실패: ${res.status}`)
      const data = await res.json()

      // Map API response to component format
      const meetings = (data.meetings || []).map((m: any) => ({
        id: m.id,
        title: m.meeting_name,
        meetingDate: m.meeting_date,
        status: m.meeting_status?.toLowerCase() === 'closed' ? 'completed' : 'in_progress',
        customerCount: m.customer_count || 0,
        highRiskCount: m.high_risk_count || 0,
        mediumRiskCount: m.medium_risk_count || 0,
        lowRiskCount: m.low_risk_count || 0,
        createdAt: m.created_at,
      }))

      setMeetings(meetings)
    } catch (err: any) {
      console.error('채권회의 목록 조회 실패:', err)
      setError(err.message || '데이터 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMeetings()
  }, [])

  const formatDateTime = (dateTime: string) => {
    if (!dateTime) return '-'
    const dt = new Date(dateTime)
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    }).format(dt)
  }

  const handleCreateMeeting = async () => {
    if (!newMeetingName || !newMeetingDate) {
      alert('회의명과 일자를 입력해주세요.')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/v1/credit/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingCode: `MTG-${newMeetingDate.replace(/-/g, '')}`,
          meetingName: newMeetingName,
          meetingDate: newMeetingDate,
          remark: newMeetingRemark,
        }),
      })

      if (!res.ok) throw new Error('회의 생성 실패')

      const data = await res.json()
      if (data.success) {
        setShowCreateModal(false)
        setNewMeetingName('')
        setNewMeetingRemark('')
        fetchMeetings()
      } else {
        throw new Error(data.error || '회의 생성 실패')
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleOpenMeeting = (meetingId: number) => {
    const key = `credit:meeting:${meetingId}`
    window.location.hash = key
    window.dispatchEvent(new CustomEvent('tnt.sales.navigate', { detail: { key } }))
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8f9fa' }}>
      {/* Header & Filters */}
      <div style={{ padding: '20px 24px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        {/* Title Row */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'baseline', gap: 12, justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>채권회의</h1>
            <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>월별 채권 심사 및 리스크 관리 현황</p>
          </div>
          <button
            className="btn"
            onClick={() => setShowCreateModal(true)}
            style={{
              height: 36,
              padding: '0 16px',
              fontSize: 13,
              fontWeight: 600,
              background: '#3b82f6',
              borderColor: '#3b82f6',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Plus size={16} />
            새 회의 생성
          </button>
        </div>

        {/* Controls Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 0 }}>
          <select
            className="search-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{ width: 120 }}
          >
            <option value="all">전체 상태</option>
            <option value="in_progress">진행중</option>
            <option value="completed">완료</option>
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="date"
              className="search-input"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ width: 130 }}
            />
            <span style={{ color: '#9ca3af' }}>~</span>
            <input
              type="date"
              className="search-input"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ width: 130 }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="search-input"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="회의명 검색"
              style={{ width: 200, paddingLeft: 30 }}
            />
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <button
              className="btn"
              onClick={fetchMeetings}
              disabled={loading}
              style={{
                height: 30,
                padding: '0 16px',
                fontSize: 13,
                fontWeight: 600,
                background: '#3b82f6',
                borderColor: '#3b82f6',
                whiteSpace: 'nowrap',
              }}
            >
              {loading ? '조회 중...' : '조회'}
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {error ? (
          <div style={{ padding: 16, color: '#ef4444', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} />
              {error}
            </div>
          </div>
        ) : meetings.length === 0 ? (
          <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 16 }}>
            <Calendar size={48} style={{ opacity: 0.2 }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 18, fontWeight: 500, color: '#6b7280', margin: 0 }}>등록된 채권회의가 없습니다.</p>
              <p style={{ fontSize: 14, color: '#9ca3af', marginTop: 4 }}>새로운 회의를 생성하여 관리를 시작해보세요.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 24 }}>
            {meetings.map((meeting) => {
              const chartData = [
                { name: 'High', value: meeting.highRiskCount, color: COLORS.high },
                { name: 'Medium', value: meeting.mediumRiskCount, color: COLORS.medium },
                { name: 'Low', value: meeting.lowRiskCount, color: COLORS.low },
              ].filter(d => d.value > 0)

              if (chartData.length === 0) {
                chartData.push({ name: 'None', value: 1, color: COLORS.default })
              }

              return (
                <div
                  key={meeting.id}
                  onClick={() => handleOpenMeeting(meeting.id)}
                  className="card"
                  style={{
                    background: '#fff',
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    e.currentTarget.style.borderColor = '#93c5fd'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.borderColor = '#e5e7eb'
                  }}
                >
                  {/* Card Header */}
                  <div style={{ padding: 20, borderBottom: '1px solid #f3f4f6', background: 'linear-gradient(to right, #fff, #f9fafb)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {meeting.status === 'completed' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: '#dcfce7', color: '#15803d' }}>
                            <CheckCircle2 size={12} /> 완료됨
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: '#dbeafe', color: '#1d4ed8' }}>
                            <Clock size={12} /> 진행중
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>{meeting.createdAt.substring(0, 10)} 생성</span>
                      </div>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ChevronRight size={16} color="#9ca3af" />
                      </div>
                    </div>

                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 8px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {meeting.title}
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}>
                      <Calendar size={14} />
                      {formatDateTime(meeting.meetingDate)}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 24, flex: 1 }}>
                    {/* Chart */}
                    <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            innerRadius={25}
                            outerRadius={40}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af' }}>Total</span>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{meeting.customerCount}</span>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>고위험</span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#ef4444' }}>{meeting.highRiskCount}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>중위험</span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#f59e0b' }}>{meeting.mediumRiskCount}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>저위험</span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#10b981' }}>{meeting.lowRiskCount}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>심사대상</span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>{meeting.customerCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div style={{ padding: '12px 20px', background: '#f9fafb', borderTop: '1px solid #f3f4f6', fontSize: 12, color: '#6b7280', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>관리자: 홍길동</span>
                    <span style={{ color: '#3b82f6', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      상세보기 <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div
            style={{ background: '#fff', borderRadius: 16, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: 480, overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>새 채권회의 생성</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 4 }}
              >
                <span style={{ fontSize: 24, lineHeight: 1 }}>&times;</span>
              </button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>회의명 <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  value={newMeetingName}
                  onChange={(e) => setNewMeetingName(e.target.value)}
                  placeholder="예: 2025년 1월 정기 채권회의"
                  className="search-input"
                  style={{ width: '100%', height: 42 }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>회의 일자 <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="date"
                  value={newMeetingDate}
                  onChange={(e) => setNewMeetingDate(e.target.value)}
                  className="search-input"
                  style={{ width: '100%', height: 42 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>비고</label>
                <textarea
                  value={newMeetingRemark}
                  onChange={(e) => setNewMeetingRemark(e.target.value)}
                  rows={3}
                  placeholder="회의 관련 메모를 입력하세요"
                  className="search-input"
                  style={{ width: '100%', height: 'auto', padding: '12px', resize: 'none' }}
                />
              </div>
            </div>

            <div style={{ padding: '16px 24px', background: '#f9fafb', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn"
                style={{ background: '#f3f4f6', borderColor: '#e5e7eb', color: '#4b5563' }}
              >
                취소
              </button>
              <button
                onClick={handleCreateMeeting}
                disabled={creating}
                className="btn"
                style={{ background: '#3b82f6', borderColor: '#3b82f6', color: 'white', opacity: creating ? 0.7 : 1 }}
              >
                {creating ? '생성 중...' : '회의 생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
