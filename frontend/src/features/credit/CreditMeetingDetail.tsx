import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Calendar, ClipboardList, Clock, FileText, UserCheck } from 'lucide-react'

type MeetingStatus = 'PLANNED' | 'DATA_GENERATED' | 'ON_GOING' | 'FINISHED' | 'POSTPONED'

type MeetingInfo = {
  id: number
  meeting_code: string
  meeting_name: string
  meeting_date: string
  meeting_status: MeetingStatus
  remark?: string
}

type MeetingCustomer = {
  id: number
  customer_seq: number
  customer_name: string
  total_ar?: number
  aging_31_60?: number
  aging_61_90?: number
  aging_91_120?: number
  decision_code?: string
  decision_comment?: string
}

type SalesOpinion = {
  id: number
  meeting_id: number
  customer_seq: number
  customer_name: string
  assignee_id: string
  emp_name: string
  opinion_type: string
  opinion_text: string
  promise_date?: string
  promise_amount?: number
  risk_level: string
  company_type: string
  created_at: string
  created_by: string
}

type Activity = {
  id: number
  subject: string
  description: string
  activity_type: string
  activity_status: string
  channel: string
  planned_start_at?: string
  actual_start_at?: string
  sf_owner_id?: string
  owner_name?: string
  created_at?: string
}

type UnblockRequest = {
  id: number
  customer_seq: number
  customer_name: string
  company_type?: string
  request_status: string
  request_date?: string
  target_unblock_date?: string
  reason_text?: string
  collection_plan?: string
  latest_decision?: string
  latest_decided_at?: string
}

type MeetingRemark = {
  id: number
  remark_type?: string
  author_id?: string
  author_name?: string
  remark_text?: string
  created_at?: string
}

const STATUS_META: Record<MeetingStatus, { label: string; bg: string; color: string }> = {
  PLANNED: { label: '회의 예정', bg: '#e0f2fe', color: '#0369a1' },
  DATA_GENERATED: { label: '자료 생성', bg: '#ede9fe', color: '#6d28d9' },
  ON_GOING: { label: '진행중', bg: '#fef3c7', color: '#b45309' },
  FINISHED: { label: '완료', bg: '#dcfce7', color: '#15803d' },
  POSTPONED: { label: '연기', bg: '#fee2e2', color: '#b91c1c' }
}

const fmtDate = (val?: string) => {
  if (!val) return '-'
  const d = new Date(val)
  return Number.isNaN(d.getTime()) ? val : d.toISOString().slice(0, 10)
}

const formatStatus = (status?: string) => {
  if (!status) return '-'
  const s = status.toUpperCase()
  const map: Record<string, string> = {
    REQUESTED: '요청',
    SUBMITTED: '제출',
    HOLD: '보류',
    APPROVED: '승인',
    REJECTED: '반려',
    CANCELLED: '취소',
    CANCELED: '취소',
    PENDING: '대기'
  }
  return map[s] || status
}

const formatDecision = (decision?: string) => {
  if (!decision) return '-'
  const d = decision.toUpperCase()
  const map: Record<string, string> = {
    APPROVE: '승인',
    APPROVED: '승인',
    REJECT: '반려',
    REJECTED: '반려',
    HOLD: '보류',
    PENDING: '대기'
  }
  return map[d] || decision
}

export function CreditMeetingDetail() {
  const getMeetingIdFromUrl = () => {
    const key = window.location.hash.replace('#', '')
    const parts = key.split(':')
    return parts[2] || '0'
  }

  const meetingId = getMeetingIdFromUrl()
  const [meeting, setMeeting] = useState<MeetingInfo | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [unblocks, setUnblocks] = useState<UnblockRequest[]>([])
  const [customers, setCustomers] = useState<MeetingCustomer[]>([])
  const [remarks, setRemarks] = useState<MeetingRemark[]>([])
  const [salesOpinions, setSalesOpinions] = useState<SalesOpinion[]>([])
  const [loading, setLoading] = useState(false)

  const fetchDetail = async () => {
    if (!meetingId) return
    setLoading(true)
    try {
      // 기존 회의 상세 정보 조회
      const res = await fetch(`/api/v1/credit/meetings/${meetingId}`)
      const data = await res.json()

      if (data.meeting) {
        setMeeting(data.meeting)
      }
      setCustomers(data.customers || [])
      setActivities((data.activities || []).map((a: any) => ({
        ...a,
        owner_name: a.owner_name ?? a.ownerName,
        sf_owner_id: a.sf_owner_id ?? a.sfOwnerId,
      })))
      setUnblocks(data.unblockRequests || [])
      setRemarks(data.remarks || [])

      // 거래처별 회의 결과 (credit_sales_opinion) 조회
      const opinionsRes = await fetch(`/api/v1/credit/meetings/${meetingId}/opinions`)
      const opinionsData = await opinionsRes.json()
      setSalesOpinions(opinionsData.opinions || [])
    } catch (err) {
      console.error('회의 상세 조회 실패', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetail()
  }, [meetingId])

  const summary = useMemo(() => ({
    activityCount: activities.length,
    unblockCount: unblocks.length,
    customerCount: salesOpinions.length
  }), [activities.length, unblocks.length, salesOpinions.length])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8f9fa' }}>
      <div style={{ padding: '20px 24px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
          <button
            onClick={() => {
              window.location.hash = 'credit:meetings'
              window.dispatchEvent(new CustomEvent('tnt.sales.navigate', { detail: { key: 'credit:meetings' } }))
            }}
            style={{ padding: 8, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <ArrowLeft size={20} color="#4b5563" />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>{meeting?.meeting_name || '채권회의'}</h1>
              {meeting?.meeting_status && (
                <span style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  background: STATUS_META[meeting.meeting_status].bg,
                  color: STATUS_META[meeting.meeting_status].color
                }}>
                  {STATUS_META[meeting.meeting_status].label}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#6b7280', fontSize: 13 }}>
              <Calendar size={14} /> {meeting?.meeting_date ? fmtDate(meeting.meeting_date) : '-'}
            </div>
            {meeting?.remark && (
              <div style={{ marginTop: 6, color: '#4b5563', fontSize: 13, lineHeight: 1.5 }}>{meeting.remark}</div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <SummaryCard label="거래처별 회의 결과" value={`${summary.customerCount}건`} icon={<UserCheck size={16} color="#2563eb" />} />
          <SummaryCard label="회의 활동" value={`${summary.activityCount}건`} icon={<ClipboardList size={16} color="#16a34a" />} />
          <SummaryCard label="매출통제 해제 요청" value={`${summary.unblockCount}건`} icon={<FileText size={16} color="#b45309" />} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Meeting Remarks */}
        <Section title="회의 결과">
          {remarks.length === 0 ? (
            <EmptyRow text="등록된 회의 내용이 없습니다." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {remarks.map((r) => (
                <div key={r.id} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{r.author_name || r.author_id || '작성자 없음'}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{fmtDate(r.created_at)}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{r.remark_type || ''}</div>
                  <div style={{ fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{r.remark_text || '-'}</div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Activities */}
        <Section title="채권회의 활동">
          {activities.length === 0 ? (
            <EmptyRow text="등록된 활동이 없습니다." />
          ) : (
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>제목</th>
                  <th style={thStyle}>유형</th>
                  <th style={thStyle}>상태</th>
                  <th style={thStyle}>채널</th>
                  <th style={thStyle}>계획일시</th>
                  <th style={thStyle}>담당자</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => (
                  <tr key={a.id} style={trStyle}>
                    <td style={tdStyle}>{a.subject || '-'}</td>
                    <td style={tdStyle}>{a.activity_type || '-'}</td>
                    <td style={tdStyle}>{a.activity_status || '-'}</td>
                    <td style={tdStyle}>{a.channel || '-'}</td>
                    <td style={tdStyle}>{fmtDate(a.planned_start_at) || '-'}</td>
                    <td style={tdStyle}>{a.owner_name || a.sf_owner_id || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* Unblock Requests */}
        <Section title="매출통제 해제 품의 진행현황">
          {unblocks.length === 0 ? (
            <EmptyRow text="해제 요청이 없습니다." />
          ) : (
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>거래처</th>
                  <th style={thStyle}>상태</th>
                  <th style={thStyle}>요청일</th>
                  <th style={thStyle}>목표 해제일</th>
                  <th style={thStyle}>최근 결정</th>
                  <th style={thStyle}>사유</th>
                </tr>
              </thead>
              <tbody>
                {unblocks.map((u) => (
                  <tr key={u.id} style={trStyle}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{u.customer_name || '-'}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>{u.customer_seq}</div>
                    </td>
                    <td style={tdStyle}>{formatStatus(u.request_status)}</td>
                    <td style={tdStyle}>{fmtDate(u.request_date)}</td>
                    <td style={tdStyle}>{fmtDate(u.target_unblock_date)}</td>
                    <td style={tdStyle}>{formatDecision(u.latest_decision)}</td>
                    <td style={tdStyle}>{u.reason_text || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* Meeting Customers - credit_sales_opinion에서 조회 */}
        <Section title="거래처별 회의 결과">
          {salesOpinions.length === 0 ? (
            <EmptyRow text="등록된 연체 의견이 없습니다." />
          ) : (
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>거래처</th>
                  <th style={thStyle}>담당자</th>
                  <th style={thStyle}>연체 의견</th>
                </tr>
              </thead>
              <tbody>
                {salesOpinions.map((op, idx) => (
                  <tr key={op.id || idx} style={trStyle}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{op.customer_name}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>{op.customer_seq}</div>
                    </td>
                    <td style={tdStyle}>{op.emp_name || '-'}</td>
                    <td style={{ ...tdStyle, whiteSpace: 'pre-wrap' }}>{op.opinion_text || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>
      {loading && (
        <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 12, color: '#6b7280' }}>
          불러오는 중...
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', fontSize: 13 }
const tdStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #f3f4f6', fontSize: 13, color: '#374151', verticalAlign: 'top' }
const trStyle: React.CSSProperties = { transition: 'background 0.1s' }

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{value}</span>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
      <h2 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{title}</span>
      </h2>
      {children}
    </div>
  )
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div style={{ padding: 16, color: '#6b7280', fontSize: 13 }}>{text}</div>
  )
}
