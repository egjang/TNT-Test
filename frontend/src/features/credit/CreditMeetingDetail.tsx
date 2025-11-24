import React, { useState, useEffect } from 'react'
import {
  ArrowLeft,
  LayoutGrid,
  List,
  Search,
  Filter,
  MoreHorizontal,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  DollarSign,
  User,
  ChevronRight,
  BarChart2 as BarChartIcon
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'

type MeetingInfo = {
  id: number
  meetingCode: string
  meetingName: string
  meetingDate: string
  status: 'PLANNED' | 'IN_PROGRESS' | 'CLOSED'
  remark?: string
}

type MeetingCustomer = {
  id: number
  customerSeq: number
  customerName: string
  riskLevel: 'high' | 'medium' | 'low'
  totalAr: number
  overdue: number
  decisionCode?: 'KEEP_BLOCK' | 'REVIEW_UNBLOCK' | 'WATCH' | 'APPROVED' | 'REJECTED'
  decisionComment?: string
  reviewFlag: boolean
  [key: string]: any
}

const RISK_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981'
}

export function CreditMeetingDetail() {
  const getMeetingIdFromUrl = () => {
    const key = window.location.hash.replace('#', '') || 'credit:meeting:1'
    const parts = key.split(':')
    return parts[2] || '1'
  }

  const id = getMeetingIdFromUrl()
  const [meeting, setMeeting] = useState<MeetingInfo | null>(null)
  const [customers, setCustomers] = useState<MeetingCustomer[]>([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('kanban')
  const [selectedCustomer, setSelectedCustomer] = useState<MeetingCustomer | null>(null)

  // Slide-over panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [opinionText, setOpinionText] = useState('')
  const [decisionCode, setDecisionCode] = useState<string>('WATCH')

  const fetchMeetingDetail = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/credit/meetings/${id}`)
      const data = await res.json()

      if (data.meeting) {
        setMeeting({
          id: data.meeting.id,
          meetingCode: data.meeting.meeting_code,
          meetingName: data.meeting.meeting_name,
          meetingDate: data.meeting.meeting_date,
          status: data.meeting.meeting_status,
          remark: data.meeting.remark
        })
      }

      const customers = (data.customers || []).map((c: any) => ({
        id: c.id,
        customerSeq: c.customer_seq,
        customerName: c.customer_name,
        riskLevel: 'medium', // Mock logic
        totalAr: c.total_ar,
        overdue: c.overdue || 0,
        decisionCode: c.decision_code,
        decisionComment: c.decision_comment,
        reviewFlag: c.review_flag
      }))
      setCustomers(customers)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMeetingDetail()
  }, [id])

  const handleCustomerClick = (customer: MeetingCustomer) => {
    setSelectedCustomer(customer)
    setOpinionText(customer.decisionComment || '')
    setDecisionCode(customer.decisionCode || 'WATCH')
    setIsPanelOpen(true)
  }

  const handleSaveOpinion = async () => {
    if (!selectedCustomer) return
    // Mock save logic
    alert('의견이 저장되었습니다.')
    setIsPanelOpen(false)
    fetchMeetingDetail()
  }

  const formatCurrency = (val: number) => `₩${val.toLocaleString()}`

  // Kanban Columns
  const kanbanColumns = [
    { id: 'WATCH', title: '관찰 (Watch)', color: '#fef3c7', textColor: '#92400e', borderColor: '#f59e0b' },
    { id: 'REVIEW_UNBLOCK', title: '해제 검토', color: '#dbeafe', textColor: '#1e40af', borderColor: '#3b82f6' },
    { id: 'KEEP_BLOCK', title: '차단 유지', color: '#fee2e2', textColor: '#991b1b', borderColor: '#ef4444' },
    { id: 'APPROVED', title: '승인', color: '#dcfce7', textColor: '#166534', borderColor: '#22c55e' },
  ]

  const getUnassignedCustomers = () => customers.filter(c => !c.decisionCode)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8f9fa', overflow: 'hidden', position: 'relative' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', background: '#fff', borderBottom: '1px solid #e5e7eb', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <button
            onClick={() => window.history.back()}
            style={{ padding: 8, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <ArrowLeft size={20} color="#4b5563" />
          </button>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
              {meeting?.meetingName}
              <span style={{
                padding: '2px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: meeting?.status === 'CLOSED' ? '#dcfce7' : '#dbeafe',
                color: meeting?.status === 'CLOSED' ? '#15803d' : '#1d4ed8'
              }}>
                {meeting?.status}
              </span>
            </h1>
            <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: 14 }}>{meeting?.meetingCode} · {meeting?.meetingDate}</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <div style={{ display: 'flex', background: '#f3f4f6', padding: 4, borderRadius: 8 }}>
              <button
                onClick={() => setViewMode('kanban')}
                style={{
                  padding: 6,
                  borderRadius: 6,
                  border: 'none',
                  background: viewMode === 'kanban' ? '#fff' : 'transparent',
                  boxShadow: viewMode === 'kanban' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                  color: viewMode === 'kanban' ? '#2563eb' : '#6b7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  padding: 6,
                  borderRadius: 6,
                  border: 'none',
                  background: viewMode === 'grid' ? '#fff' : 'transparent',
                  boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                  color: viewMode === 'grid' ? '#2563eb' : '#6b7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <div style={{ background: 'linear-gradient(to bottom right, #eff6ff, #fff)', padding: 16, borderRadius: 12, border: '1px solid #dbeafe' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={12} /> 총 채권액
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>
              {formatCurrency(customers.reduce((sum, c) => sum + c.totalAr, 0))}
            </div>
          </div>
          <div style={{ background: 'linear-gradient(to bottom right, #fef2f2, #fff)', padding: 16, borderRadius: 12, border: '1px solid #fee2e2' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertCircle size={12} /> 총 연체액
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>
              {formatCurrency(customers.reduce((sum, c) => sum + c.overdue, 0))}
            </div>
          </div>
          <div style={{ background: 'linear-gradient(to bottom right, #fffbeb, #fff)', padding: 16, borderRadius: 12, border: '1px solid #fef3c7' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#d97706', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <User size={12} /> 심사 대상
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>
              {customers.filter(c => c.reviewFlag).length} <span style={{ fontSize: 14, fontWeight: 400, color: '#6b7280' }}>업체</span>
            </div>
          </div>
          <div style={{ background: 'linear-gradient(to bottom right, #ecfdf5, #fff)', padding: 16, borderRadius: 12, border: '1px solid #d1fae5' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#059669', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={12} /> 완료율
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>
              {Math.round((customers.filter(c => c.decisionCode).length / (customers.length || 1)) * 100)}%
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowX: 'auto', padding: 24 }}>
        {viewMode === 'kanban' ? (
          <div style={{ display: 'flex', gap: 24, height: '100%', minWidth: 'max-content' }}>
            {/* Unassigned Column */}
            <div style={{ width: 320, display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: 12, fontWeight: 600, color: '#6b7280', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                미결정 <span style={{ background: '#e5e7eb', padding: '2px 8px', borderRadius: 999, fontSize: 12 }}>{getUnassignedCustomers().length}</span>
              </div>
              <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
                {getUnassignedCustomers().map(customer => (
                  <div
                    key={customer.id}
                    onClick={() => handleCustomerClick(customer)}
                    className="card"
                    style={{
                      background: '#fff',
                      padding: 16,
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', marginTop: 6,
                        background: customer.riskLevel === 'high' ? '#ef4444' : customer.riskLevel === 'medium' ? '#f59e0b' : '#10b981'
                      }} />
                      <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#9ca3af' }}>#{customer.customerSeq}</span>
                    </div>
                    <h4 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>{customer.customerName}</h4>
                    <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 12 }}>
                      채권: {formatCurrency(customer.totalAr)}
                    </div>
                    {customer.reviewFlag && (
                      <div style={{ fontSize: 12, background: '#f3e8ff', color: '#7e22ce', padding: '2px 8px', borderRadius: 4, display: 'inline-block' }}>
                        심사필요
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Decision Columns */}
            {kanbanColumns.map(col => {
              const colCustomers = customers.filter(c => c.decisionCode === col.id)
              return (
                <div key={col.id} style={{ width: 320, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ marginBottom: 12, fontWeight: 600, color: '#374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {col.title}
                    <span style={{ background: col.color, color: col.textColor, padding: '2px 8px', borderRadius: 999, fontSize: 12 }}>
                      {colCustomers.length}
                    </span>
                  </div>
                  <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
                    {colCustomers.map(customer => (
                      <div
                        key={customer.id}
                        onClick={() => handleCustomerClick(customer)}
                        className="card"
                        style={{
                          background: '#fff',
                          padding: 16,
                          borderRadius: 8,
                          border: '1px solid #e5e7eb',
                          borderLeft: `4px solid ${col.borderColor}`,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        <h4 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>{customer.customerName}</h4>
                        <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          "{customer.decisionComment}"
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#9ca3af' }}>
                          <span>{formatCurrency(customer.totalAr)}</span>
                          <MoreHorizontal size={16} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '12px 24px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>거래처</th>
                  <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600, color: '#6b7280' }}>총 채권</th>
                  <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600, color: '#6b7280' }}>연체액</th>
                  <th style={{ padding: '12px 24px', textAlign: 'center', fontWeight: 600, color: '#6b7280' }}>위험도</th>
                  <th style={{ padding: '12px 24px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>결정</th>
                  <th style={{ padding: '12px 24px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>의견</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer, idx) => (
                  <tr
                    key={customer.id}
                    onClick={() => handleCustomerClick(customer)}
                    style={{ borderBottom: idx === customers.length - 1 ? 'none' : '1px solid #f3f4f6', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{customer.customerName}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>{customer.customerSeq}</div>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(customer.totalAr)}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'right', fontFamily: 'monospace', color: '#dc2626' }}>{formatCurrency(customer.overdue)}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                        background: customer.riskLevel === 'high' ? '#ef4444' : customer.riskLevel === 'medium' ? '#f59e0b' : '#10b981'
                      }} />
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      {customer.decisionCode ? (
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 500, background: '#f3f4f6', color: '#374151' }}>
                          {kanbanColumns.find(c => c.id === customer.decisionCode)?.title || customer.decisionCode}
                        </span>
                      ) : (
                        <span style={{ color: '#d1d5db' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 24px', color: '#6b7280', maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {customer.decisionComment || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-over Panel */}
      {isPanelOpen && selectedCustomer && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(2px)', zIndex: 40 }}
            onClick={() => setIsPanelOpen(false)}
          />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 500, background: '#fff',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', zIndex: 50, display: 'flex', flexDirection: 'column',
            animation: 'slideIn 0.3s ease-out'
          }}>
            <div style={{ padding: 24, borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#f9fafb' }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>{selectedCustomer.customerName}</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#6b7280' }}>#{selectedCustomer.customerSeq} · {selectedCustomer.riskLevel.toUpperCase()} Risk</p>
              </div>
              <button
                onClick={() => setIsPanelOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 32 }}>
              {/* Charts Section */}
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BarChartIcon size={16} color="#2563eb" /> 채권 Aging 분석
                </h3>
                <div style={{ height: 200, background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', padding: 8 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: '정상', value: selectedCustomer.totalAr - selectedCustomer.overdue },
                      { name: '1개월', value: selectedCustomer.overdue * 0.5 }, // Mock
                      { name: '2개월', value: selectedCustomer.overdue * 0.3 },
                      { name: '3개월+', value: selectedCustomer.overdue * 0.2 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}
                        formatter={(val: number) => formatCurrency(val)}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {
                          [0, 1, 2, 3].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 3 ? '#ef4444' : '#3b82f6'} />
                          ))
                        }
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Form Section */}
              <div style={{ background: '#f9fafb', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 16 }}>심사 결정 및 의견</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>결정 (Decision)</label>
                    <select
                      value={decisionCode}
                      onChange={(e) => setDecisionCode(e.target.value)}
                      className="search-input"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
                    >
                      <option value="WATCH">관찰 (Watch)</option>
                      <option value="REVIEW_UNBLOCK">해제 검토</option>
                      <option value="KEEP_BLOCK">차단 유지</option>
                      <option value="APPROVED">승인</option>
                      <option value="REJECTED">거부</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>의견 (Opinion)</label>
                    <textarea
                      value={opinionText}
                      onChange={(e) => setOpinionText(e.target.value)}
                      rows={4}
                      className="search-input"
                      style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, resize: 'none' }}
                      placeholder="심사 의견을 상세히 입력하세요..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: 24, borderTop: '1px solid #f3f4f6', background: '#f9fafb' }}>
              <button
                onClick={handleSaveOpinion}
                className="btn"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#2563eb',
                  color: 'white',
                  fontWeight: 700,
                  borderRadius: 12,
                  border: 'none',
                  fontSize: 15,
                  boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
                }}
              >
                저장하기
              </button>
            </div>
          </div>
        </>
      )}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
