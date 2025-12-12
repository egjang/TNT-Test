import { useState, useEffect } from 'react'
import {
  Plus,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  Play,
  Search,
  ArrowRight,
  Calendar,
  Download,
  Upload,
  UserCheck,
  ClipboardList,
  BarChart3,
  Send,
  Lock,
  Eye,
  Edit3,
  Check,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Building2,
  X,
  AlertTriangle,
  Info,
  MessageCircle,
  MessageSquare,
  Trash2,
  History
} from 'lucide-react'
import { useCreditWorkflow, SelectedCustomer } from './CreditWorkflowContext'
import { getAssigneeId } from '../../utils/auth'

type WorkflowStep = 'create' | 'review' | 'prepare' | 'progress' | 'close'

// DB의 meeting_status 값 타입
type MeetingStatusType = 'PLANNED' | 'DATA_GENERATED' | 'ON_GOING' | 'FINISHED' | 'POSTPONED'

type Meeting = {
  id: number
  meetingCode: string
  meetingName: string
  meetingDate: string
  status: 'PLANNED' | 'IN_PROGRESS' | 'CLOSED'
  meeting_status: MeetingStatusType  // DB 원본 상태값
  currentStep: WorkflowStep
  customerCount: number
  preparedCount: number
  reviewedCount: number
  closedCount: number
  remark?: string  // 회의 설명
}

// meeting_status를 한글로 변환하는 헬퍼 함수
const getMeetingStatusLabel = (status: MeetingStatusType): string => {
  const labels: Record<MeetingStatusType, string> = {
    'PLANNED': '회의 예정',
    'DATA_GENERATED': '자료 생성됨',
    'ON_GOING': '진행중',
    'FINISHED': '완료',
    'POSTPONED': '연기'
  }
  return labels[status] || status
}

// meeting_status에 따른 배지 색상
const getMeetingStatusColor = (status: MeetingStatusType): { bg: string, text: string } => {
  const colors: Record<MeetingStatusType, { bg: string, text: string }> = {
    'PLANNED': { bg: '#e0e7ff', text: '#4338ca' },
    'DATA_GENERATED': { bg: '#dbeafe', text: '#1d4ed8' },
    'ON_GOING': { bg: '#fef3c7', text: '#b45309' },
    'FINISHED': { bg: '#dcfce7', text: '#15803d' },
    'POSTPONED': { bg: '#fee2e2', text: '#b91c1c' }
  }
  return colors[status] || { bg: '#f3f4f6', text: '#6b7280' }
}

type StepConfig = {
  id: WorkflowStep
  title: string
  subtitle: string
  icon: any
  color: string
  bgColor: string
  borderColor: string
  actions: ActionConfig[]
}

type ActionConfig = {
  id: string
  label: string
  description: string
  icon: any
  disabled?: boolean
  primary?: boolean
}

type ArAgingSummary = {
  snapshotDate: string
  totalCustomers: number
  totalAr: number
  overdue30: number
  overdue60: number
  overdue90: number
  overdueOver90: number
  byChannel: { channelName: string; count: number; amount: number }[]
}

type PopupConfig = {
  show: boolean
  type: 'info' | 'success' | 'warning' | 'error' | 'confirm'
  title: string
  message: string
  onConfirm?: () => void
  onCancel?: () => void
}

const WORKFLOW_STEPS: StepConfig[] = [
  {
    id: 'create',
    title: '회의 생성',
    subtitle: 'Meeting Setup',
    icon: Plus,
    color: '#3b82f6',
    bgColor: '#eff6ff',
    borderColor: '#93c5fd',
    actions: [
      { id: 'new-meeting', label: '새 회의 생성', description: '월별 채권회의를 생성합니다', icon: Plus, primary: true },
      { id: 'select-meeting', label: '기존 회의 선택', description: '진행 중인 회의를 선택합니다', icon: ClipboardList },
    ]
  },
  {
    id: 'review',
    title: '지난 회의 Review',
    subtitle: 'Previous Meeting Review',
    icon: History,
    color: '#06b6d4',
    bgColor: '#ecfeff',
    borderColor: '#67e8f9',
    actions: [
      { id: 'view-previous', label: '지난 회의 조회', description: '이전 채권회의 결과를 확인합니다', icon: Eye, primary: true },
      { id: 'check-decisions', label: '결정사항 확인', description: '차단/해제/관찰 결정 이행을 확인합니다', icon: ClipboardList },
      { id: 'compare-status', label: '채권 변동 비교', description: '전월 대비 채권 현황을 비교합니다', icon: TrendingUp },
    ]
  },
  {
    id: 'prepare',
    title: '자료 생성',
    subtitle: 'Data Preparation',
    icon: FileSpreadsheet,
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
    borderColor: '#c4b5fd',
    actions: [
      { id: 'generate-ar', label: 'AR Aging 데이터 생성', description: 'ERP에서 채권 데이터를 가져옵니다', icon: Download, primary: true },
      { id: 'select-customers', label: '심사 대상 선정', description: '연체 기준으로 대상을 선정합니다', icon: UserCheck },
      { id: 'import-data', label: '추가 자료 업로드', description: '보충 자료를 업로드합니다', icon: Upload },
      { id: 'preview-report', label: '회의 자료 미리보기', description: '생성된 보고서를 확인합니다', icon: Eye },
    ]
  },
  {
    id: 'progress',
    title: '회의 진행',
    subtitle: 'Meeting in Progress',
    icon: Users,
    color: '#f59e0b',
    bgColor: '#fffbeb',
    borderColor: '#fcd34d',
    actions: [
      { id: 'start-meeting', label: '회의 시작', description: '채권회의를 시작합니다', icon: Play, primary: true },
      { id: 'review-customer', label: '거래처별 심사', description: '거래처별 채권 상태를 심사합니다', icon: ClipboardList },
      { id: 'decision-input', label: '심사 결정 입력', description: '차단/해제/관찰 결정을 입력합니다', icon: Edit3 },
      { id: 'realtime-status', label: '실시간 현황', description: '심사 진행 현황을 확인합니다', icon: BarChart3 },
    ]
  },
  {
    id: 'close',
    title: '회의 종료',
    subtitle: 'Meeting Closure',
    icon: CheckCircle2,
    color: '#10b981',
    bgColor: '#ecfdf5',
    borderColor: '#6ee7b7',
    actions: []
  }
]

// 직원 타입 정의 (담당자 검색용)
type Employee = {
  emp_id: string
  emp_name: string
  dept_name: string
  assignee_id: string
}

// 회의 의견(리마크) 타입 정의
type MeetingRemark = {
  id: number
  meetingId: number
  remarkType: '의견' | '지시'
  authorId: string
  authorName: string
  remarkText: string
  createdAt: string
}

// AR Aging Item 타입 정의
type ARAgingItem = {
  customerSeq?: number
  customerCode?: string
  customerName?: string
  channelName?: string
  companyType?: string
  salesRep?: string
  department?: string
  totalAr?: number
  overdue?: number
  aging030?: number
  aging3160?: number
  aging6190?: number
  aging91120?: number
  aging121150?: number
  aging151180?: number
  aging181210?: number
  aging211240?: number
  aging241270?: number
  aging271300?: number
  aging301330?: number
  aging331365?: number
  agingOver365?: number
  riskLevel?: string
}

// 회의 거래처 컨텍스트 메뉴 타입
type ContextMenuState = {
  visible: boolean
  x: number
  y: number
  customer: ARAgingItem | null
}

// 회의 거래처 등록 결정코드 타입
type DecisionCode = 'KEEP_BLOCK' | 'REVIEW_UNBLOCK' | 'WATCH' | 'APPROVED' | 'REJECTED'

const DECISION_CODE_LABELS: Record<DecisionCode, string> = {
  'KEEP_BLOCK': '차단 유지',
  'REVIEW_UNBLOCK': '해제 검토',
  'WATCH': '관찰',
  'APPROVED': '승인',
  'REJECTED': '거절'
}

const DECISION_CODE_COLORS: Record<DecisionCode, { bg: string, text: string, border: string }> = {
  'KEEP_BLOCK': { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  'REVIEW_UNBLOCK': { bg: '#fefce8', text: '#ca8a04', border: '#fef08a' },
  'WATCH': { bg: '#f0f9ff', text: '#0284c7', border: '#bae6fd' },
  'APPROVED': { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  'REJECTED': { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' }
}

// 지난 회의 결과 (remark) 타입 정의
type PreviousMeetingRemark = {
  id: number
  meeting_id: number
  remark_type: string
  author_id: string
  author_name: string
  remark_text: string
  created_at: string
  updated_at: string
}

// 회의별 연체 의견 타입 정의
type MeetingSalesOpinion = {
  id: number
  meeting_id: number
  customer_seq: number
  customer_name: string
  assignee_id: string
  emp_name: string
  opinion_type: string
  opinion_text: string
  promise_date: string | null
  promise_amount: number | null
  risk_level: string
  company_type: string
  created_at: string
  created_by: string
}

// 지난 회의 Review 컴포넌트
function PreviousMeetingReviewView({ activeMeeting }: { activeMeeting: Meeting }) {
  const [previousMeetings, setPreviousMeetings] = useState<Meeting[]>([])
  const [selectedPreviousMeeting, setSelectedPreviousMeeting] = useState<Meeting | null>(null)
  const [remarks, setRemarks] = useState<PreviousMeetingRemark[]>([])
  const [salesOpinions, setSalesOpinions] = useState<MeetingSalesOpinion[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingRemarks, setLoadingRemarks] = useState(false)
  const [loadingOpinions, setLoadingOpinions] = useState(false)

  // 이전 회의 목록 조회
  useEffect(() => {
    const fetchPreviousMeetings = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/v1/credit/meetings?status=FINISHED')
        if (response.ok) {
          const data = await response.json()
          const meetings = data.meetings || []
          setPreviousMeetings(meetings)
          if (meetings.length > 0) {
            setSelectedPreviousMeeting(meetings[0])
          }
        }
      } catch (error) {
        console.error('Failed to fetch previous meetings:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPreviousMeetings()
  }, [])

  // 선택된 이전 회의의 회의 결과(remark) 조회
  useEffect(() => {
    if (!selectedPreviousMeeting) return
    const fetchRemarks = async () => {
      setLoadingRemarks(true)
      try {
        const response = await fetch(`/api/v1/credit/meetings/${selectedPreviousMeeting.id}/remarks`)
        if (response.ok) {
          const data = await response.json()
          setRemarks(data.remarks || data || [])
        }
      } catch (error) {
        console.error('Failed to fetch remarks:', error)
      } finally {
        setLoadingRemarks(false)
      }
    }
    fetchRemarks()
  }, [selectedPreviousMeeting])

  // 선택된 이전 회의의 연체 의견(sales opinions) 조회
  useEffect(() => {
    if (!selectedPreviousMeeting) return
    const fetchOpinions = async () => {
      setLoadingOpinions(true)
      try {
        const response = await fetch(`/api/v1/credit/meetings/${selectedPreviousMeeting.id}/opinions`)
        if (response.ok) {
          const data = await response.json()
          setSalesOpinions(data.opinions || [])
        }
      } catch (error) {
        console.error('Failed to fetch sales opinions:', error)
      } finally {
        setLoadingOpinions(false)
      }
    }
    fetchOpinions()
  }, [selectedPreviousMeeting])

  // remark_type에 따른 스타일 반환
  const getRemarkTypeStyle = (type: string) => {
    switch (type) {
      case '지시': return { label: '지시', color: '#dc2626', bgColor: '#fef2f2' }
      case '의견': return { label: '의견', color: '#2563eb', bgColor: '#eff6ff' }
      case '결정': return { label: '결정', color: '#059669', bgColor: '#ecfdf5' }
      default: return { label: type || '기타', color: '#6b7280', bgColor: '#f3f4f6' }
    }
  }

  // 날짜 포맷팅
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Step Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
        padding: 16,
        background: '#ecfeff',
        borderRadius: 12,
        border: '1px solid #67e8f9'
      }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: '#06b6d4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white'
        }}>
          <History size={20} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, color: '#0e7490' }}>지난 회의 Review</h3>
          <p style={{ margin: 0, fontSize: 13, color: '#0891b2' }}>이전 채권회의 결과를 확인합니다</p>
        </div>
      </div>

      {/* 이전 회의 선택 드롭다운 */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#374151' }}>
          이전 회의 선택
        </label>
        <select
          value={selectedPreviousMeeting?.id || ''}
          onChange={(e) => {
            const meeting = previousMeetings.find(m => m.id === Number(e.target.value))
            setSelectedPreviousMeeting(meeting || null)
          }}
          style={{
            width: '100%',
            maxWidth: 400,
            padding: '10px 12px',
            fontSize: 14,
            border: '1px solid #d1d5db',
            borderRadius: 8,
            background: 'white',
            cursor: 'pointer'
          }}
        >
          {loading ? (
            <option>로딩 중...</option>
          ) : previousMeetings.length === 0 ? (
            <option>종료된 이전 회의가 없습니다</option>
          ) : (
            previousMeetings.map(meeting => (
              <option key={meeting.id} value={meeting.id}>
                {meeting.meeting_name} ({meeting.meeting_date})
              </option>
            ))
          )}
        </select>
      </div>

      {/* 회의 결과 요약 */}
      {selectedPreviousMeeting && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16
          }}>
            {[
              { type: '지시', label: '지시', color: '#dc2626', bgColor: '#fef2f2' },
              { type: '의견', label: '의견', color: '#2563eb', bgColor: '#eff6ff' },
              { type: '결정', label: '결정', color: '#059669', bgColor: '#ecfdf5' }
            ].map(item => (
              <div key={item.type} style={{
                padding: 16,
                background: item.bgColor,
                borderRadius: 12,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: item.color }}>
                  {remarks.filter(r => r.remark_type === item.type).length}
                </div>
                <div style={{ fontSize: 13, color: item.color }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 회의 결과 목록 */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '12px 16px',
          background: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          fontWeight: 600,
          fontSize: 14,
          color: '#374151'
        }}>
          회의 결과 목록
        </div>

        {loadingRemarks ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: 8 }}>로딩 중...</p>
          </div>
        ) : remarks.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            <ClipboardList size={40} strokeWidth={1} />
            <p style={{ marginTop: 8 }}>회의 결과가 없습니다</p>
          </div>
        ) : (
          <div style={{ padding: 16 }}>
            {remarks.map((remark, idx) => {
              const typeStyle = getRemarkTypeStyle(remark.remark_type)
              return (
                <div key={remark.id} style={{
                  padding: 16,
                  background: idx % 2 === 0 ? 'white' : '#f9fafb',
                  borderRadius: 8,
                  marginBottom: 12,
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 12,
                        color: typeStyle.color,
                        background: typeStyle.bgColor
                      }}>
                        {typeStyle.label}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
                        {remark.author_name}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>
                      {formatDate(remark.created_at)}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 13,
                    color: '#4b5563',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {remark.remark_text}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 연체 의견 목록 */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        marginTop: 24
      }}>
        <div style={{
          padding: '12px 16px',
          background: '#fef3c7',
          borderBottom: '1px solid #fcd34d',
          fontWeight: 600,
          fontSize: 14,
          color: '#92400e',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <MessageSquare size={16} />
          연체 의견 목록 ({salesOpinions.length}건)
        </div>

        {loadingOpinions ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: 8 }}>로딩 중...</p>
          </div>
        ) : salesOpinions.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            <MessageSquare size={40} strokeWidth={1} />
            <p style={{ marginTop: 8 }}>등록된 연체 의견이 없습니다</p>
          </div>
        ) : (
          <div style={{ padding: 16 }}>
            {salesOpinions.map((opinion, idx) => (
              <div key={opinion.id} style={{
                padding: 16,
                background: idx % 2 === 0 ? 'white' : '#fffbeb',
                borderRadius: 8,
                marginBottom: 12,
                border: '1px solid #fcd34d'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 12,
                      color: '#92400e',
                      background: '#fef3c7'
                    }}>
                      {opinion.opinion_type || '연체의견'}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
                      {opinion.customer_name || `고객 #${opinion.customer_seq}`}
                    </span>
                    {opinion.emp_name && (
                      <span style={{ fontSize: 12, color: '#6b7280' }}>
                        (담당: {opinion.emp_name})
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    {formatDate(opinion.created_at)}
                  </span>
                </div>
                <div style={{
                  fontSize: 13,
                  color: '#4b5563',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  marginBottom: 8
                }}>
                  {opinion.opinion_text}
                </div>
                {opinion.promise_date && (
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    약속일자: {opinion.promise_date}
                    {opinion.promise_amount && ` | 약속금액: ${opinion.promise_amount.toLocaleString()}원`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 회의 진행 단계 - 연체채권 현황 컴포넌트
function MeetingProgressView({ activeMeeting }: { activeMeeting: Meeting }) {
  const { selectedCustomer, setSelectedCustomer, setMeetingDate, setMeetingId, setMeetingStatus, triggerOpinionRefresh } = useCreditWorkflow()
  const [items, setItems] = useState<ARAgingItem[]>([])
  const [loading, setLoading] = useState(false)
  const [salesRepList, setSalesRepList] = useState<string[]>([])
  const [company, setCompany] = useState<string>('all')
  const [salesRep, setSalesRep] = useState<string>('all')
  const [customerName, setCustomerName] = useState<string>('')
  const [riskLevel, setRiskLevel] = useState<string>('all')
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [summary, setSummary] = useState({
    totalAr: 0,
    aging30Ar: 0,      // 30일 이내 (0~30일)
    aging60Ar: 0,      // 60일 이내 (31~60일)
    aging90Ar: 0,      // 90일 이내 (61~90일)
    over90Ar: 0,       // 90일 초과
  })

  // 컨텍스트 메뉴 상태
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    customer: null
  })

  // 거래처 등록 모달 상태
  const [registerModal, setRegisterModal] = useState<{
    show: boolean
    customer: ARAgingItem | null
  }>({ show: false, customer: null })
  const [registerForm, setRegisterForm] = useState({
    decisionCode: '' as DecisionCode | '',
    decisionComment: '',
    reviewFlag: true
  })
  const [saving, setSaving] = useState(false)
  const [alertPopup, setAlertPopup] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' }>({ show: false, message: '', type: 'success' })

  // 연체의견 요약 팝업 상태
  const [opinionSummaryPopup, setOpinionSummaryPopup] = useState<{
    show: boolean
    loading: boolean
    opinions: Array<{
      id: number
      emp_name: string
      customer_name: string
      opinion_text: string
      created_at: string
    }>
  }>({ show: false, loading: false, opinions: [] })

  // 채권활동 요약 팝업 상태
  const [activitySummaryPopup, setActivitySummaryPopup] = useState<{
    show: boolean
    loading: boolean
    activities: Array<{
      id: number
      emp_name: string
      customer_name: string
      subject: string
      description: string
      activity_date: string
    }>
  }>({ show: false, loading: false, activities: [] })

  // 통제해제 요약 팝업 상태
  const [unblockSummaryPopup, setUnblockSummaryPopup] = useState<{
    show: boolean
    loading: boolean
    requests: Array<{
      id: number
      emp_name: string
      customer_name: string
      reason_text: string
      collection_plan: string
    }>
  }>({ show: false, loading: false, requests: [] })

  // 알림 팝업 자동 닫기
  useEffect(() => {
    if (alertPopup.show) {
      const timer = setTimeout(() => {
        setAlertPopup({ show: false, message: '', type: 'success' })
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [alertPopup.show])

  // 연체의견 요약 조회
  const fetchOpinionSummary = async () => {
    setOpinionSummaryPopup({ show: true, loading: true, opinions: [] })
    try {
      const res = await fetch(`/api/v1/credit/meetings/${activeMeeting.id}/opinions`)
      if (!res.ok) throw new Error('API 호출 실패')
      const data = await res.json()
      setOpinionSummaryPopup({
        show: true,
        loading: false,
        opinions: data.opinions || []
      })
    } catch (e) {
      console.error('연체의견 조회 실패:', e)
      setOpinionSummaryPopup({ show: true, loading: false, opinions: [] })
    }
  }

  // 채권활동 요약 조회
  const fetchActivitySummary = async () => {
    setActivitySummaryPopup({ show: true, loading: true, activities: [] })
    try {
      const res = await fetch(`/api/v1/credit/meetings/${activeMeeting.id}/activities`)
      if (!res.ok) throw new Error('API 호출 실패')
      const data = await res.json()
      setActivitySummaryPopup({
        show: true,
        loading: false,
        activities: data.activities || []
      })
    } catch (e) {
      console.error('채권활동 조회 실패:', e)
      setActivitySummaryPopup({ show: true, loading: false, activities: [] })
    }
  }

  // 통제해제 요약 조회
  const fetchUnblockSummary = async () => {
    setUnblockSummaryPopup({ show: true, loading: true, requests: [] })
    try {
      const res = await fetch(`/api/v1/credit/meetings/${activeMeeting.id}/unblock-requests`)
      if (!res.ok) throw new Error('API 호출 실패')
      const data = await res.json()
      // 기존 API는 items로 반환하고 requester_name을 사용
      const items = data.items || []
      const mappedRequests = items.map((item: any) => ({
        ...item,
        emp_name: item.requester_name || item.emp_name || item.assignee_id
      }))
      setUnblockSummaryPopup({
        show: true,
        loading: false,
        requests: mappedRequests
      })
    } catch (e) {
      console.error('통제해제 조회 실패:', e)
      setUnblockSummaryPopup({ show: true, loading: false, requests: [] })
    }
  }

  // 우클릭 핸들러
  const handleContextMenu = (e: React.MouseEvent, item: ARAgingItem) => {
    e.preventDefault()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      customer: item
    })
  }

  // 컨텍스트 메뉴 닫기
  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, customer: null })
  }

  // 거래처 등록 모달 열기
  const openRegisterModal = () => {
    if (contextMenu.customer) {
      setRegisterModal({ show: true, customer: contextMenu.customer })
      setRegisterForm({ decisionCode: '', decisionComment: '', reviewFlag: true })
    }
    closeContextMenu()
  }

  // 거래처 등록 처리
  const handleRegisterCustomer = async () => {
    if (!registerModal.customer) return
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/credit/meetings/${activeMeeting.id}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_seq: registerModal.customer.customerSeq,
          customer_name: registerModal.customer.customerName,
          assignee_id: getAssigneeId() || '',
          emp_name: registerModal.customer.salesRep || '',
          decision_comment: registerForm.decisionComment,
          review_flag: registerForm.reviewFlag,
          created_by: getAssigneeId() || ''
        })
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || 'API 호출 실패')
      }

      setAlertPopup({ show: true, message: '거래처가 회의에 등록되었습니다.', type: 'success' })
      setRegisterModal({ show: false, customer: null })
      triggerOpinionRefresh()
    } catch (err: any) {
      console.error('거래처 등록 실패:', err)
      setAlertPopup({ show: true, message: err.message || '거래처 등록에 실패했습니다.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  // 문서 클릭시 컨텍스트 메뉴 닫기
  useEffect(() => {
    const handleClick = () => closeContextMenu()
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // 회의일자, 회의 ID, 회의 상태를 Context에 설정
  useEffect(() => {
    if (activeMeeting?.meetingDate) {
      setMeetingDate(activeMeeting.meetingDate)
    }
    if (activeMeeting?.id) {
      setMeetingId(activeMeeting.id)
    }
    if (activeMeeting?.meeting_status) {
      setMeetingStatus(activeMeeting.meeting_status)
    }
  }, [activeMeeting?.meetingDate, activeMeeting?.id, activeMeeting?.meeting_status, setMeetingDate, setMeetingId, setMeetingStatus])

  const fetchSalesReps = async () => {
    try {
      const res = await fetch('/api/v1/credit/sales-reps')
      if (!res.ok) return
      const data = await res.json()
      setSalesRepList(data.salesReps || [])
    } catch (err) {
      console.error('영업사원 목록 조회 실패:', err)
    }
  }

  const fetchARData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (company !== 'all') params.append('company', company)
      if (salesRep !== 'all') params.append('salesRep', salesRep)
      if (customerName) params.append('customerName', customerName)
      if (riskLevel !== 'all') params.append('riskLevel', riskLevel)
      params.append('meetingId', String(activeMeeting.id))

      const res = await fetch(`/api/v1/credit/ar-aging?${params.toString()}`)
      if (!res.ok) throw new Error(`API 호출 실패: ${res.status}`)
      const data = await res.json()

      const items = (data.items || []).map((item: any) => ({
        customerSeq: item.customer_seq,
        customerCode: item.customer_no,
        customerName: item.customer_name,
        channelName: item.channel_name,
        companyType: item.company_type,
        salesRep: item.emp_name,
        department: item.dept_name,
        totalAr: item.total_ar,
        overdue: item.overdue,
        aging030: item.aging_0_30,
        aging3160: item.aging_31_60,
        aging6190: item.aging_61_90,
        aging91120: item.aging_91_120,
        aging121150: item.aging_121_150,
        aging151180: item.aging_151_180,
        aging181210: item.aging_181_210,
        aging211240: item.aging_211_240,
        aging241270: item.aging_241_270,
        aging271300: item.aging_271_300,
        aging301330: item.aging_301_330,
        aging331365: item.aging_331_365,
        agingOver365: item.aging_over_365,
        riskLevel: item.riskLevel,
      }))
      setItems(items)

      // 30일 이내 (0~30일): aging_0_30
      const aging30 = items.reduce((sum: number, it: ARAgingItem) => sum + (it.aging030 || 0), 0)
      // 60일 이내 (31~60일): aging_31_60
      const aging60 = items.reduce((sum: number, it: ARAgingItem) => sum + (it.aging3160 || 0), 0)
      // 90일 이내 (61~90일): aging_61_90
      const aging90 = items.reduce((sum: number, it: ARAgingItem) => sum + (it.aging6190 || 0), 0)
      // 90일 초과: 91일 이상 모든 구간 합계
      const over90 = items.reduce((sum: number, it: ARAgingItem) =>
        sum + (it.aging91120 || 0) + (it.aging121150 || 0) +
        (it.aging151180 || 0) + (it.aging181210 || 0) + (it.aging211240 || 0) +
        (it.aging241270 || 0) + (it.aging271300 || 0) + (it.aging301330 || 0) +
        (it.aging331365 || 0) + (it.agingOver365 || 0), 0)

      setSummary({
        totalAr: items.reduce((sum: number, it: ARAgingItem) => sum + (it.totalAr || 0), 0),
        aging30Ar: aging30,       // 30일 이내 (0~30일)
        aging60Ar: aging60,       // 60일 이내 (31~60일)
        aging90Ar: aging90,       // 90일 이내 (61~90일)
        over90Ar: over90,         // 90일 초과
      })
    } catch (err) {
      console.error('AR Aging 조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSalesReps()
    fetchARData()
  }, [activeMeeting])

  const formatCurrency = (value: any) => {
    if (value === null || value === undefined || value === '') return '-'
    const num = Number(value)
    return Number.isFinite(num) ? `₩${num.toLocaleString('ko-KR')}` : String(value)
  }

  const getCompanyIcon = (companyType: string) => {
    if (companyType === 'TNT') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 18,
          height: 18,
          background: '#3b82f6',
          color: 'white',
          borderRadius: 3,
          fontSize: 10,
          fontWeight: 700,
          marginRight: 4,
        }}>
          T
        </span>
      )
    } else if (companyType === 'DYS') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 18,
          height: 18,
          background: '#10b981',
          color: 'white',
          borderRadius: 3,
          fontSize: 10,
          fontWeight: 700,
          marginRight: 4,
        }}>
          D
        </span>
      )
    }
    return null
  }

  const getRiskBadge = (riskLevel: string) => {
    const baseStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 20,
      height: 20,
      borderRadius: '50%',
      color: 'white',
      fontSize: 10,
      fontWeight: 700,
    }
    if (riskLevel === 'high') {
      return <span style={{ ...baseStyle, background: '#ef4444' }}>고</span>
    } else if (riskLevel === 'medium') {
      return <span style={{ ...baseStyle, background: '#f59e0b' }}>중</span>
    } else if (riskLevel === 'low') {
      return <span style={{ ...baseStyle, background: '#10b981' }}>저</span>
    }
    return <span style={{ ...baseStyle, background: '#6b7280' }}>-</span>
  }

  // 등급별 색상 (배지 스타일)
  const getGradeBadge = (grade: string | undefined) => {
    const gradeColors: Record<string, { bg: string; text: string }> = {
      'A등급': { bg: '#dcfce7', text: '#16a34a' },
      'B등급': { bg: '#dbeafe', text: '#2563eb' },
      'C등급': { bg: '#fef9c3', text: '#ca8a04' },
      'D등급': { bg: '#fed7aa', text: '#ea580c' },
      'E등급': { bg: '#fecaca', text: '#dc2626' },
      'F등급': { bg: '#f3e8ff', text: '#9333ea' },
    }
    const style = gradeColors[grade || ''] || { bg: '#f3f4f6', text: '#6b7280' }
    return (
      <span style={{
        display: 'inline-block',
        padding: '2px 6px',
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 700,
        background: style.bg,
        color: style.text,
      }}>
        {grade || '-'}
      </span>
    )
  }

  return (
    <>
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      {/* 메인: 연체채권 현황 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* 필터 & 요약 */}
        <div style={{
          background: '#fff',
          borderRadius: 10,
          border: '1px solid #e5e7eb',
          padding: 12,
          marginBottom: 12
        }}>
          {/* 필터 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }}
            >
              <option value="all">전체 회사</option>
              <option value="TNT">TNT</option>
              <option value="DYS">DYS</option>
            </select>
            <select
              value={salesRep}
              onChange={(e) => setSalesRep(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }}
            >
              <option value="all">전체 영업사원</option>
              {salesRepList.map((rep) => (
                <option key={rep} value={rep}>{rep}</option>
              ))}
            </select>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="거래처명 검색"
              style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, width: 120 }}
            />
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12 }}
            >
              <option value="all">전체 위험도</option>
              <option value="high">고위험</option>
              <option value="medium">중위험</option>
              <option value="low">저위험</option>
            </select>
            <button
              onClick={fetchARData}
              disabled={loading}
              style={{
                padding: '6px 12px',
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {loading ? '조회중...' : '조회'}
            </button>

            {/* 우측 요약 버튼들 */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button
                onClick={fetchOpinionSummary}
                style={{
                  padding: '6px 12px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                연체의견 요약
              </button>
              <button
                onClick={fetchActivitySummary}
                style={{
                  padding: '6px 12px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                채권활동 요약
              </button>
              <button
                onClick={fetchUnblockSummary}
                style={{
                  padding: '6px 12px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                통제해제 요약
              </button>
            </div>
          </div>

          {/* 요약 카드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            <div style={{ padding: 10, background: '#f8fafc', borderRadius: 6, borderLeft: '3px solid #3b82f6' }}>
              <div style={{ fontSize: 11, color: '#6b7280' }}>총채권액</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{formatCurrency(summary.totalAr)}</div>
            </div>
            <div style={{ padding: 10, background: '#ecfdf5', borderRadius: 6, borderLeft: '3px solid #10b981' }}>
              <div style={{ fontSize: 11, color: '#6b7280' }}>30일 이내 (0~30일)</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>{formatCurrency(summary.aging30Ar)}</div>
            </div>
            <div style={{ padding: 10, background: '#eff6ff', borderRadius: 6, borderLeft: '3px solid #3b82f6' }}>
              <div style={{ fontSize: 11, color: '#6b7280' }}>60일 이내 (31~60일)</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#3b82f6' }}>{formatCurrency(summary.aging60Ar)}</div>
            </div>
            <div style={{ padding: 10, background: '#fffbeb', borderRadius: 6, borderLeft: '3px solid #f59e0b' }}>
              <div style={{ fontSize: 11, color: '#6b7280' }}>90일 이내 (61~90일)</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(summary.aging90Ar)}</div>
            </div>
            <div style={{ padding: 10, background: '#fef2f2', borderRadius: 6, borderLeft: '3px solid #ef4444' }}>
              <div style={{ fontSize: 11, color: '#6b7280' }}>90일 초과</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#ef4444' }}>{formatCurrency(summary.over90Ar)}</div>
            </div>
          </div>
        </div>

        {/* 테이블 - 채권현황 두 줄로 */}
        <div style={{
          flex: 1,
          background: '#fff',
          borderRadius: 10,
          border: '1px solid #e5e7eb',
          overflow: 'auto'
        }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
              <p>데이터 로딩 중...</p>
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
              조회된 데이터가 없습니다
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th rowSpan={2} style={{ padding: '8px 6px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#374151', position: 'sticky', top: 0, background: '#f9fafb', zIndex: 10, width: 30 }}>#</th>
                  <th rowSpan={2} style={{ padding: '8px 6px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#374151', position: 'sticky', top: 0, background: '#f9fafb', zIndex: 10, width: 50 }}>위험</th>
                  <th rowSpan={2} style={{ padding: '8px 6px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#374151', position: 'sticky', top: 0, background: '#f9fafb', zIndex: 10, minWidth: 180 }}>거래처</th>
                  <th rowSpan={2} style={{ padding: '8px 6px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#374151', position: 'sticky', top: 0, background: '#f9fafb', zIndex: 10, width: 60 }}>등급</th>
                  <th rowSpan={2} style={{ padding: '8px 6px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#374151', position: 'sticky', top: 0, background: '#f9fafb', zIndex: 10, width: 90 }}>총채권</th>
                  <th rowSpan={2} style={{ padding: '8px 6px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#ef4444', position: 'sticky', top: 0, background: '#f9fafb', zIndex: 10, width: 70 }}>최고령</th>
                  <th style={{ padding: '4px 4px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 500, color: '#6b7280', fontSize: 10, position: 'sticky', top: 0, background: '#f9fafb', zIndex: 10, borderLeft: '1px solid #e5e7eb' }}>1개월미만</th>
                  <th style={{ padding: '4px 4px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 500, color: '#6b7280', fontSize: 10, position: 'sticky', top: 0, background: '#f9fafb', zIndex: 10 }}>2개월미만</th>
                  <th style={{ padding: '4px 4px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 500, color: '#6b7280', fontSize: 10, position: 'sticky', top: 0, background: '#f9fafb', zIndex: 10 }}>3개월미만</th>
                  <th style={{ padding: '4px 4px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 500, color: '#6b7280', fontSize: 10, position: 'sticky', top: 0, background: '#f9fafb', zIndex: 10 }}>4개월미만</th>
                  <th style={{ padding: '4px 4px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 500, color: '#6b7280', fontSize: 10, position: 'sticky', top: 0, background: '#f9fafb', zIndex: 10 }}>5개월미만</th>
                  <th style={{ padding: '4px 4px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 500, color: '#6b7280', fontSize: 10, position: 'sticky', top: 0, background: '#f9fafb', zIndex: 10 }}>6개월미만</th>
                  <th style={{ padding: '4px 4px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 500, color: '#6b7280', fontSize: 10, position: 'sticky', top: 0, background: '#f9fafb', zIndex: 10 }}>7개월미만</th>
                </tr>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '4px 4px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 500, color: '#6b7280', fontSize: 10, position: 'sticky', top: 24, background: '#f9fafb', zIndex: 10, borderLeft: '1px solid #e5e7eb' }}>8개월미만</th>
                  <th style={{ padding: '4px 4px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 500, color: '#6b7280', fontSize: 10, position: 'sticky', top: 24, background: '#f9fafb', zIndex: 10 }}>9개월미만</th>
                  <th style={{ padding: '4px 4px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 500, color: '#6b7280', fontSize: 10, position: 'sticky', top: 24, background: '#f9fafb', zIndex: 10 }}>10개월미만</th>
                  <th style={{ padding: '4px 4px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 500, color: '#6b7280', fontSize: 10, position: 'sticky', top: 24, background: '#f9fafb', zIndex: 10 }}>11개월미만</th>
                  <th style={{ padding: '4px 4px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 500, color: '#6b7280', fontSize: 10, position: 'sticky', top: 24, background: '#f9fafb', zIndex: 10 }}>12개월미만</th>
                  <th style={{ padding: '4px 4px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 500, color: '#ef4444', fontSize: 10, position: 'sticky', top: 24, background: '#f9fafb', zIndex: 10 }}>12개월+</th>
                  <th style={{ padding: '4px 4px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 500, color: '#6b7280', fontSize: 10, position: 'sticky', top: 24, background: '#f9fafb', zIndex: 10 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.flatMap((item, idx) => {
                  // 3개월미만(aging6190) 이상 기간에 값이 있는지 확인
                  const hasOverdueAging = (item.aging6190 || 0) > 0 ||
                    (item.aging91120 || 0) > 0 ||
                    (item.aging121150 || 0) > 0 ||
                    (item.aging151180 || 0) > 0 ||
                    (item.aging181210 || 0) > 0 ||
                    (item.aging211240 || 0) > 0 ||
                    (item.aging241270 || 0) > 0 ||
                    (item.aging271300 || 0) > 0 ||
                    (item.aging301330 || 0) > 0 ||
                    (item.aging331365 || 0) > 0 ||
                    (item.agingOver365 || 0) > 0;

                  // 최고령 미수 계산 (가장 오래된 기간 찾기)
                  const getOldestAging = () => {
                    if ((item.agingOver365 || 0) > 0) return '12개월+';
                    if ((item.aging331365 || 0) > 0) return '12개월미만';
                    if ((item.aging301330 || 0) > 0) return '11개월미만';
                    if ((item.aging271300 || 0) > 0) return '10개월미만';
                    if ((item.aging241270 || 0) > 0) return '9개월미만';
                    if ((item.aging211240 || 0) > 0) return '8개월미만';
                    if ((item.aging181210 || 0) > 0) return '7개월미만';
                    if ((item.aging151180 || 0) > 0) return '6개월미만';
                    if ((item.aging121150 || 0) > 0) return '5개월미만';
                    if ((item.aging91120 || 0) > 0) return '4개월미만';
                    if ((item.aging6190 || 0) > 0) return '3개월미만';
                    if ((item.aging3160 || 0) > 0) return '2개월미만';
                    if ((item.aging030 || 0) > 0) return '1개월미만';
                    return '-';
                  };

                  // 배경색 결정: 선택 > 호버 > 연체 > 기본
                  const getRowBackground = () => {
                    if (selectedCustomer?.customerSeq === item.customerSeq) return '#dbeafe';
                    if (hoveredIdx === idx) return hasOverdueAging ? '#fecaca' : '#f3f4f6';
                    if (hasOverdueAging) return '#fee2e2';
                    return 'transparent';
                  };

                  const oldestAging = getOldestAging();
                  const isOverdue = oldestAging !== '-' && oldestAging !== '1개월미만' && oldestAging !== '2개월미만';

                  return [
                  <tr
                    key={`${idx}-1`}
                    style={{
                      background: getRowBackground(),
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onClick={() => setSelectedCustomer(item as SelectedCustomer)}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                  >
                    <td rowSpan={2} style={{ padding: '6px', textAlign: 'center', color: '#9ca3af', borderBottom: '1px solid #f3f4f6' }}>{idx + 1}</td>
                    <td rowSpan={2} style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>{getRiskBadge(item.riskLevel || '')}</td>
                    <td rowSpan={2} style={{ padding: '6px', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {getCompanyIcon(item.companyType || '')}
                        <span style={{ fontWeight: 600, fontSize: 11 }}>{item.customerName || '-'}</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>{item.salesRep || '-'} · {item.department || '-'}</div>
                    </td>
                    <td rowSpan={2} style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>{getGradeBadge(item.channelName)}</td>
                    <td rowSpan={2} style={{ padding: '6px', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid #f3f4f6' }}>{formatCurrency(item.totalAr)}</td>
                    <td rowSpan={2} style={{ padding: '6px', textAlign: 'center', fontWeight: 600, fontSize: 10, color: isOverdue ? '#ef4444' : '#6b7280', borderBottom: '1px solid #f3f4f6' }}>{oldestAging}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', borderLeft: '1px solid #f3f4f6', fontSize: 10 }}>{formatCurrency(item.aging030)}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontSize: 10 }}>{formatCurrency(item.aging3160)}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontSize: 10 }}>{formatCurrency(item.aging6190)}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontSize: 10 }}>{formatCurrency(item.aging91120)}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontSize: 10 }}>{formatCurrency(item.aging121150)}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontSize: 10 }}>{formatCurrency(item.aging151180)}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontSize: 10 }}>{formatCurrency(item.aging181210)}</td>
                  </tr>,
                  <tr
                    key={`${idx}-2`}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      background: getRowBackground(),
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onClick={() => setSelectedCustomer(item as SelectedCustomer)}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                  >
                    <td style={{ padding: '4px 6px', textAlign: 'right', borderLeft: '1px solid #f3f4f6', fontSize: 10 }}>{formatCurrency(item.aging211240)}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontSize: 10 }}>{formatCurrency(item.aging241270)}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontSize: 10 }}>{formatCurrency(item.aging271300)}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontSize: 10 }}>{formatCurrency(item.aging301330)}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontSize: 10 }}>{formatCurrency(item.aging331365)}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', color: '#ef4444', fontWeight: 600, fontSize: 10 }}>{formatCurrency(item.agingOver365)}</td>
                    <td style={{ padding: '4px 6px' }}></td>
                  </tr>
                ]})}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>

      {/* 컨텍스트 메뉴 */}
      {contextMenu.visible && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: 160,
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', fontSize: 12, color: '#6b7280' }}>
            {contextMenu.customer?.customerName}
          </div>
          <button
            onClick={openRegisterModal}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: 'none',
              background: 'transparent',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <ClipboardList size={14} />
            연체 의견 등록
          </button>
        </div>
      )}

      {/* 거래처 등록 모달 */}
      {registerModal.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            width: 560,
            maxHeight: '85vh',
            overflow: 'auto'
          }}>
            <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>연체 의견 등록</h3>
                <button
                  onClick={() => setRegisterModal({ show: false, customer: null })}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                >
                  <X size={20} color="#6b7280" />
                </button>
              </div>
            </div>

            <div style={{ padding: 20 }}>
              {/* 거래처 정보 */}
              <div style={{ marginBottom: 20, padding: 16, background: '#f9fafb', borderRadius: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{registerModal.customer?.customerName}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  담당: {registerModal.customer?.salesRep || '-'} | 코드: {registerModal.customer?.customerCode || '-'}
                </div>
              </div>

              {/* 코멘트 */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>연체 의견</label>
                <textarea
                  value={registerForm.decisionComment}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, decisionComment: e.target.value }))}
                  placeholder="연체 의견을 입력하세요..."
                  style={{
                    width: '100%',
                    height: 120,
                    padding: 12,
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 13,
                    resize: 'none'
                  }}
                />
              </div>

              {/* 버튼 */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setRegisterModal({ show: false, customer: null })}
                  style={{
                    padding: '10px 16px',
                    border: '1px solid #d1d5db',
                    background: 'white',
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  취소
                </button>
                <button
                  onClick={handleRegisterCustomer}
                  disabled={saving}
                  style={{
                    padding: '10px 16px',
                    border: 'none',
                    background: '#3b82f6',
                    color: 'white',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? '저장중...' : '등록'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 알림 팝업 */}
      {alertPopup.show && (
        <div style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 20px',
          background: alertPopup.type === 'success' ? '#dcfce7' : alertPopup.type === 'error' ? '#fee2e2' : '#fef3c7',
          border: `1px solid ${alertPopup.type === 'success' ? '#86efac' : alertPopup.type === 'error' ? '#fecaca' : '#fde68a'}`,
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 1002,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          {alertPopup.type === 'success' ? <Check size={16} color="#16a34a" /> :
           alertPopup.type === 'error' ? <AlertCircle size={16} color="#dc2626" /> :
           <AlertTriangle size={16} color="#d97706" />}
          <span style={{ fontSize: 13, color: alertPopup.type === 'success' ? '#166534' : alertPopup.type === 'error' ? '#991b1b' : '#92400e' }}>
            {alertPopup.message}
          </span>
          <button
            onClick={() => setAlertPopup({ show: false, message: '', type: 'success' })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8 }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 연체의견 요약 팝업 */}
      {opinionSummaryPopup.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            width: 1000,
            height: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* 헤더 */}
            <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MessageSquare size={20} color="#ef4444" />
                  연체의견 요약
                </h3>
                <button
                  onClick={() => setOpinionSummaryPopup({ show: false, loading: false, opinions: [] })}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                >
                  <X size={20} color="#6b7280" />
                </button>
              </div>
            </div>

            {/* 내용 */}
            <div style={{ flex: 1, overflow: 'hidden', padding: 20, display: 'flex', flexDirection: 'column' }}>
              {opinionSummaryPopup.loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                  <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
                  <p>데이터 로딩 중...</p>
                </div>
              ) : opinionSummaryPopup.opinions.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                  등록된 연체의견이 없습니다.
                </div>
              ) : (
                <>
                  {/* 담당자별 요약 */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#374151' }}>담당자별 요약</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {Object.entries(
                        opinionSummaryPopup.opinions.reduce((acc, op) => {
                          const name = op.emp_name || '미지정'
                          acc[name] = (acc[name] || 0) + 1
                          return acc
                        }, {} as Record<string, number>)
                      ).map(([name, count]) => (
                        <div
                          key={name}
                          style={{
                            padding: '6px 12px',
                            background: '#f3f4f6',
                            borderRadius: 6,
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>{name}</span>
                          <span style={{
                            background: '#ef4444',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 600
                          }}>
                            {count}건
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 의견 목록 */}
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#374151' }}>
                    의견 목록 ({opinionSummaryPopup.opinions.length}건)
                  </div>
                  <div style={{ flex: 1, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 1 }}>
                        <tr>
                          <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', width: 120 }}>작성자</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', width: 180 }}>거래처명</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>의견 내용</th>
                        </tr>
                      </thead>
                      <tbody>
                        {opinionSummaryPopup.opinions.map((op) => (
                          <tr key={op.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 500 }}>{op.emp_name || '-'}</td>
                            <td style={{ padding: '10px 12px' }}>{op.customer_name || '-'}</td>
                            <td style={{ padding: '10px 12px', color: '#4b5563' }}>{op.opinion_text || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* 푸터 */}
            <div style={{ padding: 16, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setOpinionSummaryPopup({ show: false, loading: false, opinions: [] })}
                style={{
                  padding: '8px 16px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 채권활동 요약 팝업 */}
      {activitySummaryPopup.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            width: 1000,
            height: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* 헤더 */}
            <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ClipboardList size={20} color="#3b82f6" />
                  채권활동 요약
                </h3>
                <button
                  onClick={() => setActivitySummaryPopup({ show: false, loading: false, activities: [] })}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                >
                  <X size={20} color="#6b7280" />
                </button>
              </div>
            </div>

            {/* 내용 */}
            <div style={{ flex: 1, overflow: 'hidden', padding: 20, display: 'flex', flexDirection: 'column' }}>
              {activitySummaryPopup.loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                  <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
                  <p>데이터 로딩 중...</p>
                </div>
              ) : activitySummaryPopup.activities.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                  등록된 채권활동이 없습니다.
                </div>
              ) : (
                <>
                  {/* 담당자별 요약 */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#374151' }}>담당자별 요약</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {Object.entries(
                        activitySummaryPopup.activities.reduce((acc, act) => {
                          const name = act.emp_name || '미지정'
                          acc[name] = (acc[name] || 0) + 1
                          return acc
                        }, {} as Record<string, number>)
                      ).map(([name, count]) => (
                        <div
                          key={name}
                          style={{
                            padding: '6px 12px',
                            background: '#f3f4f6',
                            borderRadius: 6,
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>{name}</span>
                          <span style={{
                            background: '#3b82f6',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 600
                          }}>
                            {count}건
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 활동 목록 */}
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#374151' }}>
                    활동 목록 ({activitySummaryPopup.activities.length}건)
                  </div>
                  <div style={{ flex: 1, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 1 }}>
                        <tr>
                          <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', width: 100 }}>담당자</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', width: 140 }}>거래처명</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', width: 160 }}>활동제목</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>내용</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', width: 100 }}>활동일자</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activitySummaryPopup.activities.map((act) => (
                          <tr key={act.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 500 }}>{act.emp_name || '-'}</td>
                            <td style={{ padding: '10px 12px' }}>{act.customer_name || '-'}</td>
                            <td style={{ padding: '10px 12px' }}>{act.subject || '-'}</td>
                            <td style={{ padding: '10px 12px', color: '#4b5563' }}>{act.description || '-'}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: '#6b7280' }}>
                              {act.activity_date ? new Date(act.activity_date).toLocaleDateString('ko-KR') : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* 푸터 */}
            <div style={{ padding: 16, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setActivitySummaryPopup({ show: false, loading: false, activities: [] })}
                style={{
                  padding: '8px 16px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 통제해제 요약 팝업 */}
      {unblockSummaryPopup.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            width: 1000,
            height: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* 헤더 */}
            <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Lock size={20} color="#10b981" />
                  통제해제 요약
                </h3>
                <button
                  onClick={() => setUnblockSummaryPopup({ show: false, loading: false, requests: [] })}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                >
                  <X size={20} color="#6b7280" />
                </button>
              </div>
            </div>

            {/* 내용 */}
            <div style={{ flex: 1, overflow: 'hidden', padding: 20, display: 'flex', flexDirection: 'column' }}>
              {unblockSummaryPopup.loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                  <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
                  <p>데이터 로딩 중...</p>
                </div>
              ) : unblockSummaryPopup.requests.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                  등록된 통제해제 요청이 없습니다.
                </div>
              ) : (
                <>
                  {/* 담당자별 요약 */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#374151' }}>담당자별 요약</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {Object.entries(
                        unblockSummaryPopup.requests.reduce((acc, req) => {
                          const name = req.emp_name || '미지정'
                          acc[name] = (acc[name] || 0) + 1
                          return acc
                        }, {} as Record<string, number>)
                      ).map(([name, count]) => (
                        <div
                          key={name}
                          style={{
                            padding: '6px 12px',
                            background: '#f3f4f6',
                            borderRadius: 6,
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>{name}</span>
                          <span style={{
                            background: '#10b981',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 600
                          }}>
                            {count}건
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 요청 목록 */}
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#374151' }}>
                    요청 목록 ({unblockSummaryPopup.requests.length}건)
                  </div>
                  <div style={{ flex: 1, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 1 }}>
                        <tr>
                          <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', width: 100 }}>등록자</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', width: 140 }}>거래처명</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>해제 사유</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>수금 계획</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unblockSummaryPopup.requests.map((req) => (
                          <tr key={req.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 500 }}>{req.emp_name || '-'}</td>
                            <td style={{ padding: '10px 12px' }}>{req.customer_name || '-'}</td>
                            <td style={{ padding: '10px 12px', color: '#4b5563' }}>{req.reason_text || '-'}</td>
                            <td style={{ padding: '10px 12px', color: '#4b5563' }}>{req.collection_plan || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* 푸터 */}
            <div style={{ padding: 16, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setUnblockSummaryPopup({ show: false, loading: false, requests: [] })}
                style={{
                  padding: '8px 16px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// 회의 종료 단계 - 회의 의견 작성 및 목록 컴포넌트
function MeetingCloseView({ activeMeeting, onFinishMeeting }: { activeMeeting: Meeting; onFinishMeeting?: () => void }) {
  const [remarks, setRemarks] = useState<MeetingRemark[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [remarkType, setRemarkType] = useState<'의견' | '지시'>('의견')
  const [remarkText, setRemarkText] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [authorId, setAuthorId] = useState('')

  // 직원 검색 관련 state
  const [employees, setEmployees] = useState<Employee[]>([])
  const [authorSearch, setAuthorSearch] = useState('')
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false)

  // 수정 모달 state
  const [editingRemark, setEditingRemark] = useState<MeetingRemark | null>(null)
  const [editRemarkType, setEditRemarkType] = useState<'의견' | '지시'>('의견')
  const [editRemarkText, setEditRemarkText] = useState('')

  // 삭제 확인 팝업 state
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; remarkId: number | null }>({ show: false, remarkId: null })

  // 에러/알림 팝업 state
  const [alertPopup, setAlertPopup] = useState<{ show: boolean; message: string; type: 'error' | 'success' | 'warning' }>({ show: false, message: '', type: 'error' })

  // 직원 목록 로드
  const loadEmployees = async () => {
    try {
      const res = await fetch('/api/v1/employees?depts=all')
      if (res.ok) {
        const data = await res.json()
        setEmployees(data)
      }
    } catch (e) {
      console.error('Failed to load employees', e)
    }
  }

  // 컴포넌트 마운트시 직원 목록 로드
  useEffect(() => {
    loadEmployees()
  }, [])

  // 검색 필터링된 직원 목록
  const filteredEmployees = employees.filter(emp =>
    (emp.emp_name.toLowerCase().includes(authorSearch.toLowerCase()) ||
     emp.dept_name?.toLowerCase().includes(authorSearch.toLowerCase()))
  ).slice(0, 10)

  // 직원 선택 핸들러
  const selectAuthor = (emp: Employee) => {
    setAuthorId(emp.emp_id)
    setAuthorName(emp.emp_name)
    setAuthorSearch(emp.emp_name)
    setShowAuthorDropdown(false)
  }

  // 회의 의견 목록 조회
  const fetchRemarks = async () => {
    if (!activeMeeting?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/credit/meetings/${activeMeeting.id}/remarks`)
      if (!res.ok) throw new Error('API 호출 실패')
      const data = await res.json()
      const items = (data.remarks || []).map((r: any) => ({
        id: r.id,
        meetingId: r.meeting_id,
        remarkType: r.remark_type,
        authorId: r.author_id,
        authorName: r.author_name,
        remarkText: r.remark_text,
        createdAt: r.created_at
      }))
      setRemarks(items)
    } catch (err) {
      console.error('회의 의견 조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRemarks()
  }, [activeMeeting?.id])

  // 회의 의견 등록
  const handleSubmit = async () => {
    if (!remarkText.trim() || !authorName.trim() || !authorId) {
      setAlertPopup({ show: true, message: '의견 제기자를 선택하고 내용을 입력해주세요.', type: 'warning' })
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/v1/credit/meetings/${activeMeeting.id}/remarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remarkType,
          authorId: authorId,
          authorName: authorName.trim(),
          remarkText: remarkText.trim()
        })
      })

      if (!res.ok) throw new Error('등록 실패')
      const data = await res.json()
      if (data.success) {
        setRemarkText('')
        setAuthorName('')
        setAuthorId('')
        setAuthorSearch('')
        fetchRemarks()
      } else {
        setAlertPopup({ show: true, message: data.error || '등록에 실패했습니다.', type: 'error' })
      }
    } catch (err) {
      console.error('회의 의견 등록 실패:', err)
      setAlertPopup({ show: true, message: '등록 중 오류가 발생했습니다.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  // 수정 모달 열기
  const openEditModal = (remark: MeetingRemark) => {
    setEditingRemark(remark)
    setEditRemarkType(remark.remarkType as '의견' | '지시')
    setEditRemarkText(remark.remarkText)
  }

  // 수정 저장
  const handleUpdate = async () => {
    if (!editingRemark) return
    if (!editRemarkText.trim()) {
      setAlertPopup({ show: true, message: '내용을 입력해주세요.', type: 'warning' })
      return
    }

    try {
      const res = await fetch(`/api/v1/credit/meetings/${activeMeeting.id}/remarks/${editingRemark.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remarkType: editRemarkType,
          remarkText: editRemarkText
        })
      })

      if (!res.ok) throw new Error('수정 실패')
      const data = await res.json()
      if (data.success) {
        setEditingRemark(null)
        fetchRemarks()
        setAlertPopup({ show: true, message: '의견이 수정되었습니다.', type: 'success' })
      } else {
        setAlertPopup({ show: true, message: data.error || '수정에 실패했습니다.', type: 'error' })
      }
    } catch (err) {
      console.error('회의 의견 수정 실패:', err)
      setAlertPopup({ show: true, message: '수정 중 오류가 발생했습니다.', type: 'error' })
    }
  }

  // 삭제 확인 팝업 열기
  const openDeleteConfirm = (remarkId: number) => {
    setDeleteConfirm({ show: true, remarkId })
  }

  // 실제 삭제 실행
  const handleDelete = async () => {
    if (!deleteConfirm.remarkId) return

    try {
      const res = await fetch(`/api/v1/credit/meetings/${activeMeeting.id}/remarks/${deleteConfirm.remarkId}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('삭제 실패')
      const data = await res.json()
      if (data.success) {
        setDeleteConfirm({ show: false, remarkId: null })
        fetchRemarks()
        setAlertPopup({ show: true, message: '의견이 삭제되었습니다.', type: 'success' })
      } else {
        setAlertPopup({ show: true, message: data.error || '삭제에 실패했습니다.', type: 'error' })
      }
    } catch (err) {
      console.error('회의 의견 삭제 실패:', err)
      setAlertPopup({ show: true, message: '삭제 중 오류가 발생했습니다.', type: 'error' })
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Step Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
        padding: 16,
        background: '#ecfdf5',
        borderRadius: 12,
        border: '1px solid #6ee7b7'
      }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: '#10b981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <CheckCircle2 size={20} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
            회의 종료
          </h2>
          <p style={{ margin: '2px 0 0 0', color: '#6b7280', fontSize: 13 }}>
            Meeting Closure
          </p>
        </div>
        <div style={{
          padding: '6px 12px',
          background: 'rgba(255,255,255,0.8)',
          borderRadius: 6,
          fontSize: 12,
          color: '#374151'
        }}>
          <strong>{activeMeeting.meetingName}</strong>
        </div>
      </div>

      {/* 회의 의견 작성 폼 */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        border: '2px solid #10b981',
        padding: 20,
        marginBottom: 24
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MessageCircle size={20} color="#10b981" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
              회의 의견 작성
            </h3>
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving || !remarkText.trim() || !authorId || activeMeeting.meeting_status === 'FINISHED'}
            title={activeMeeting.meeting_status === 'FINISHED' ? '종료된 회의입니다' : ''}
            style={{
              padding: '8px 16px',
              background: saving || !remarkText.trim() || !authorId || activeMeeting.meeting_status === 'FINISHED' ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: saving || !remarkText.trim() || !authorId || activeMeeting.meeting_status === 'FINISHED' ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: activeMeeting.meeting_status === 'FINISHED' ? 0.7 : 1
            }}
          >
            {saving ? (
              <>
                <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                등록 중...
              </>
            ) : (
              <>
                <Plus size={14} />
                의견 등록
              </>
            )}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          {/* 의견 유형 선택 */}
          <div style={{ width: 120 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              유형
            </label>
            <select
              value={remarkType}
              onChange={(e) => setRemarkType(e.target.value as '의견' | '지시')}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 13,
                outline: 'none'
              }}
            >
              <option value="의견">의견</option>
              <option value="지시">지시</option>
            </select>
          </div>

          {/* 의견 제기자 - 검색 드롭다운 */}
          <div style={{ width: 200, position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              의견 제기자 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={authorSearch}
              onChange={(e) => {
                setAuthorSearch(e.target.value)
                setShowAuthorDropdown(true)
                if (!e.target.value) {
                  setAuthorId('')
                  setAuthorName('')
                }
              }}
              onFocus={() => setShowAuthorDropdown(true)}
              onBlur={() => setTimeout(() => setShowAuthorDropdown(false), 200)}
              placeholder="이름 또는 부서 검색"
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 13,
                outline: 'none'
              }}
            />
            {/* 검색 드롭다운 */}
            {showAuthorDropdown && authorSearch.length > 0 && filteredEmployees.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'white',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                maxHeight: 200,
                overflowY: 'auto',
                zIndex: 100
              }}>
                {filteredEmployees.map((emp) => (
                  <div
                    key={emp.emp_id}
                    onClick={() => selectAuthor(emp)}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f3f4f6',
                      fontSize: 13
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                  >
                    <div style={{ fontWeight: 500 }}>{emp.emp_name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{emp.dept_name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 의견 내용 */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
            내용 <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea
            value={remarkText}
            onChange={(e) => setRemarkText(e.target.value)}
            placeholder="의견 또는 지시 내용을 입력하세요"
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 13,
              outline: 'none',
              resize: 'none',
              lineHeight: 1.5
            }}
          />
        </div>
      </div>

      {/* 회의 의견 목록 */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '14px 20px',
          background: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={18} color="#374151" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>회의 의견 목록</span>
            <span style={{
              padding: '2px 8px',
              background: '#e5e7eb',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              color: '#374151'
            }}>
              {remarks.length}건
            </span>
          </div>
          <button
            onClick={fetchRemarks}
            disabled={loading}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 12,
              color: '#6b7280',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            새로고침
          </button>
        </div>

        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ marginTop: 8 }}>로딩 중...</p>
            </div>
          ) : remarks.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
              <MessageCircle size={32} strokeWidth={1} />
              <p style={{ marginTop: 8, fontSize: 14 }}>등록된 회의 의견이 없습니다</p>
            </div>
          ) : (
            remarks.map((remark, idx) => (
              <div
                key={remark.id}
                style={{
                  padding: '16px 20px',
                  borderBottom: idx < remarks.length - 1 ? '1px solid #f3f4f6' : 'none',
                  background: idx % 2 === 0 ? '#fff' : '#fafafa'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* 유형 배지 */}
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      background: remark.remarkType === '지시' ? '#fee2e2' : '#dbeafe',
                      color: remark.remarkType === '지시' ? '#dc2626' : '#2563eb'
                    }}>
                      {remark.remarkType}
                    </span>
                    {/* 작성자 */}
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                      {remark.authorName}
                    </span>
                    {/* 일시 */}
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>
                      {formatDate(remark.createdAt)}
                    </span>
                  </div>
                  {/* 수정/삭제 버튼 */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => { if (activeMeeting.meeting_status !== 'FINISHED') openEditModal(remark) }}
                      disabled={activeMeeting.meeting_status === 'FINISHED'}
                      style={{
                        padding: '4px 8px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 4,
                        color: activeMeeting.meeting_status === 'FINISHED' ? '#d1d5db' : '#9ca3af',
                        cursor: activeMeeting.meeting_status === 'FINISHED' ? 'not-allowed' : 'pointer',
                        opacity: activeMeeting.meeting_status === 'FINISHED' ? 0.5 : 1
                      }}
                      onMouseEnter={(e) => { if (activeMeeting.meeting_status !== 'FINISHED') e.currentTarget.style.color = '#3b82f6' }}
                      onMouseLeave={(e) => { if (activeMeeting.meeting_status !== 'FINISHED') e.currentTarget.style.color = '#9ca3af' }}
                      title={activeMeeting.meeting_status === 'FINISHED' ? '종료된 회의입니다' : '수정'}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => { if (activeMeeting.meeting_status !== 'FINISHED') openDeleteConfirm(remark.id) }}
                      disabled={activeMeeting.meeting_status === 'FINISHED'}
                      style={{
                        padding: '4px 8px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 4,
                        color: activeMeeting.meeting_status === 'FINISHED' ? '#d1d5db' : '#9ca3af',
                        cursor: activeMeeting.meeting_status === 'FINISHED' ? 'not-allowed' : 'pointer',
                        opacity: activeMeeting.meeting_status === 'FINISHED' ? 0.5 : 1
                      }}
                      onMouseEnter={(e) => { if (activeMeeting.meeting_status !== 'FINISHED') e.currentTarget.style.color = '#ef4444' }}
                      onMouseLeave={(e) => { if (activeMeeting.meeting_status !== 'FINISHED') e.currentTarget.style.color = '#9ca3af' }}
                      title={activeMeeting.meeting_status === 'FINISHED' ? '종료된 회의입니다' : '삭제'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {/* 내용 */}
                <p style={{
                  margin: 0,
                  fontSize: 13,
                  color: '#374151',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap'
                }}>
                  {remark.remarkText}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 회의 종료 버튼 - 아직 종료되지 않은 회의인 경우만 표시 */}
      {activeMeeting.meeting_status !== 'FINISHED' && onFinishMeeting && (
        <div style={{
          marginTop: 24,
          padding: 20,
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          borderRadius: 12,
          border: '2px solid #f59e0b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 size={20} color="#fff" />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#92400e' }}>
                회의 종료 준비가 완료되었나요?
              </h4>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#a16207' }}>
                모든 의견 작성이 완료되면 아래 버튼을 클릭하여 회의를 종료하세요.
              </p>
            </div>
          </div>
          <button
            onClick={onFinishMeeting}
            style={{
              padding: '10px 24px',
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
            }}
          >
            <CheckCircle2 size={16} />
            회의 종료
          </button>
        </div>
      )}

      {/* 이미 종료된 회의인 경우 완료 표시 */}
      {activeMeeting.meeting_status === 'FINISHED' && (
        <div style={{
          marginTop: 24,
          padding: 16,
          background: '#dcfce7',
          borderRadius: 12,
          border: '1px solid #86efac',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <CheckCircle2 size={24} color="#16a34a" />
          <div>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#166534' }}>
              회의가 종료되었습니다
            </h4>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#15803d' }}>
              이 회의의 모든 절차가 완료되었습니다.
            </p>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {editingRemark && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            width: 500,
            maxWidth: '90%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>의견 수정</h3>
              <button
                onClick={() => setEditingRemark(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} color="#6b7280" />
              </button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  유형
                </label>
                <select
                  value={editRemarkType}
                  onChange={(e) => setEditRemarkType(e.target.value as '의견' | '지시')}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 13
                  }}
                >
                  <option value="의견">의견</option>
                  <option value="지시">지시</option>
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  작성자
                </label>
                <input
                  type="text"
                  value={editingRemark.authorName}
                  disabled
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 13,
                    background: '#f9fafb',
                    color: '#6b7280'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  내용 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  value={editRemarkText}
                  onChange={(e) => setEditRemarkText(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 13,
                    resize: 'none',
                    lineHeight: 1.5
                  }}
                />
              </div>
            </div>
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8
            }}>
              <button
                onClick={() => setEditingRemark(null)}
                style={{
                  padding: '8px 16px',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={handleUpdate}
                disabled={!editRemarkText.trim()}
                style={{
                  padding: '8px 16px',
                  background: !editRemarkText.trim() ? '#9ca3af' : '#3b82f6',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  color: 'white',
                  cursor: !editRemarkText.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 팝업 */}
      {deleteConfirm.show && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            width: 400,
            maxWidth: '90%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16
              }}>
                <AlertTriangle size={24} color="#dc2626" />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 700, color: '#111827' }}>
                의견 삭제
              </h3>
              <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
                이 의견을 삭제하시겠습니까?<br />삭제 후에는 복구할 수 없습니다.
              </p>
            </div>
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'center',
              gap: 8
            }}>
              <button
                onClick={() => setDeleteConfirm({ show: false, remarkId: null })}
                style={{
                  padding: '8px 24px',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                style={{
                  padding: '8px 24px',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 알림 팝업 (에러/성공/경고) */}
      {alertPopup.show && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            width: 400,
            maxWidth: '90%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: alertPopup.type === 'error' ? '#fee2e2' : alertPopup.type === 'success' ? '#dcfce7' : '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16
              }}>
                {alertPopup.type === 'error' && <AlertCircle size={24} color="#dc2626" />}
                {alertPopup.type === 'success' && <CheckCircle2 size={24} color="#16a34a" />}
                {alertPopup.type === 'warning' && <AlertTriangle size={24} color="#d97706" />}
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 700, color: '#111827' }}>
                {alertPopup.type === 'error' ? '오류' : alertPopup.type === 'success' ? '완료' : '알림'}
              </h3>
              <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
                {alertPopup.message}
              </p>
            </div>
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => setAlertPopup({ show: false, message: '', type: 'error' })}
                style={{
                  padding: '8px 32px',
                  background: alertPopup.type === 'error' ? '#ef4444' : alertPopup.type === 'success' ? '#22c55e' : '#f59e0b',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function CreditMeetingWorkflow() {
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(false)
  const [activeStep, setActiveStep] = useState<WorkflowStep>('create')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newMeetingName, setNewMeetingName] = useState('')
  const [newMeetingDate, setNewMeetingDate] = useState(new Date().toISOString().split('T')[0])
  const [newMeetingRemark, setNewMeetingRemark] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [arSummary, setArSummary] = useState<ArAgingSummary | null>(null)
  const [generatingData, setGeneratingData] = useState(false)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [popup, setPopup] = useState<PopupConfig>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  })

  // 팝업 표시 헬퍼 함수
  const showPopup = (
    type: PopupConfig['type'],
    title: string,
    message: string,
    onConfirm?: () => void,
    onCancel?: () => void
  ) => {
    setPopup({ show: true, type, title, message, onConfirm, onCancel })
  }

  const closePopup = () => {
    setPopup(prev => ({ ...prev, show: false }))
  }

  // Fetch AR Aging Summary for meeting
  const fetchArAgingSummary = async () => {
    if (!activeMeeting) return

    setLoadingSummary(true)
    try {
      const res = await fetch(`/api/v1/credit/ar-aging/summary?meetingId=${activeMeeting.id}`)
      const data = await res.json()
      if (data.success && data.summary) {
        setArSummary(data.summary)
      } else {
        setArSummary(null)
      }
    } catch (err) {
      console.error(err)
      setArSummary(null)
    } finally {
      setLoadingSummary(false)
    }
  }

  // 실제 데이터 생성 API 호출
  const executeGenerateData = async (overwrite: boolean) => {
    if (!activeMeeting) return

    setGeneratingData(true)
    try {
      const res = await fetch(`/api/v1/credit/meetings/${activeMeeting.id}/generate-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingDate: activeMeeting.meetingDate,
          overwrite
        })
      })

      const data = await res.json()
      if (data.success) {
        showPopup(
          'success',
          '자료 생성 완료',
          `AR Aging 데이터가 성공적으로 생성되었습니다.\n\nTNT: ${data.tntCount}건\nDYS: ${data.dysCount}건\n총: ${data.totalCount}건`
        )
        // Refresh summary
        fetchArAgingSummary()
        // Refresh meetings list
        fetchMeetings()
      } else if (data.existsForMeeting) {
        // 해당 회의에 이미 데이터가 존재하는 경우 덮어쓰기 확인
        showPopup(
          'confirm',
          '기존 데이터 존재',
          `해당 회의에 AR Aging 데이터가 이미 존재합니다.\n\n기존 데이터를 삭제하고 새로 생성하시겠습니까?`,
          () => {
            closePopup()
            executeGenerateData(true) // overwrite=true로 재시도
          },
          closePopup
        )
      } else {
        showPopup('error', '자료 생성 실패', data.error || '자료 생성에 실패했습니다.')
      }
    } catch (err) {
      console.error(err)
      showPopup('error', '오류 발생', '자료 생성 중 오류가 발생했습니다.')
    } finally {
      setGeneratingData(false)
    }
  }

  // Generate AR Aging Data
  const handleGenerateData = () => {
    if (!activeMeeting) {
      showPopup('warning', '회의 미선택', '회의를 먼저 선택해주세요.')
      return
    }

    // 이미 데이터가 존재하는 경우 덮어쓰기 확인
    if (arSummary) {
      showPopup(
        'confirm',
        '기존 데이터 존재',
        `해당 회의 일자(${activeMeeting.meetingDate})로 이미 자료가 존재합니다.\n\n기존 데이터를 삭제하고 새로 생성하시겠습니까?`,
        () => {
          closePopup()
          executeGenerateData(true)
        },
        closePopup
      )
      return
    }

    // 새로 생성 확인
    showPopup(
      'confirm',
      'AR Aging 데이터 생성',
      `${activeMeeting.meetingDate} 일자로 AR Aging 데이터를 생성하시겠습니까?\n\nERP에서 데이터를 가져오며, 다소 시간이 소요될 수 있습니다.`,
      () => {
        closePopup()
        executeGenerateData(false)
      },
      closePopup
    )
  }

  // Fetch all meetings
  const fetchMeetings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/credit/meetings')
      const data = await res.json()
      // 상태값 매핑: DB 상태 -> UI 상태
      const statusMap: Record<string, 'PLANNED' | 'IN_PROGRESS' | 'CLOSED'> = {
        'PLANNED': 'PLANNED',
        'DATA_GENERATED': 'PLANNED',
        'ON_GOING': 'IN_PROGRESS',
        'FINISHED': 'CLOSED',
        'POSTPONED': 'PLANNED'
      }
      // DB 상태 -> 워크플로우 단계 매핑
      const stepMap: Record<string, WorkflowStep> = {
        'PLANNED': 'create',
        'DATA_GENERATED': 'prepare',
        'ON_GOING': 'progress',
        'FINISHED': 'close',
        'POSTPONED': 'create'
      }
      const mapped = (data.meetings || []).map((m: any) => ({
        id: m.id,
        meetingCode: m.meeting_code,
        meetingName: m.meeting_name,
        meetingDate: m.meeting_date,
        status: statusMap[m.meeting_status] || 'PLANNED',
        meeting_status: (m.meeting_status || 'PLANNED') as MeetingStatusType,
        currentStep: stepMap[m.meeting_status] || 'create',
        customerCount: m.customer_count || 0,
        preparedCount: m.prepared_count || 0,
        reviewedCount: m.reviewed_count || 0,
        closedCount: m.closed_count || 0,
        remark: m.remark || '',
      }))
      setMeetings(mapped)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMeetings()
  }, [])

  // Fetch AR summary when step changes to 'prepare'
  useEffect(() => {
    if (activeStep === 'prepare' && activeMeeting) {
      fetchArAgingSummary()
    }
  }, [activeStep, activeMeeting])

  const updateMeetingStatus = async (meetingId: number, status: string) => {
    try {
      const updatedBy = getAssigneeId()
      const res = await fetch(`/api/v1/credit/meetings/${meetingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, updatedBy })
      })
      const data = await res.json()
      if (data.success) {
        // Update local state
        setActiveMeeting(prev => prev ? { ...prev, meeting_status: status as MeetingStatusType } : null)
        fetchMeetings() // Refresh meeting list
        return true
      } else {
        console.error('Failed to update meeting status:', data.error)
        return false
      }
    } catch (err) {
      console.error('Error updating meeting status:', err)
      return false
    }
  }

  const handleGoToProgress = async () => {
    if (!activeMeeting) return

    // Update meeting status to ON_GOING
    const success = await updateMeetingStatus(activeMeeting.id, 'ON_GOING')
    if (success) {
      setActiveStep('progress')
    }
  }

  // 회의 종료 처리
  const handleFinishMeeting = async () => {
    if (!activeMeeting) return

    // Update meeting status to FINISHED
    const success = await updateMeetingStatus(activeMeeting.id, 'FINISHED')
    if (success) {
      showPopup('success', '회의 종료', '회의가 성공적으로 종료되었습니다.')
    }
  }

  // 회의 삭제 처리 (PLANNED 상태만 가능)
  const handleDeleteMeeting = async (meeting: Meeting, e: React.MouseEvent) => {
    e.stopPropagation() // 클릭 이벤트 전파 방지

    if (meeting.meeting_status !== 'PLANNED') {
      showPopup('error', '삭제 불가', 'PLANNED 상태의 회의만 삭제할 수 있습니다.')
      return
    }

    showPopup(
      'confirm',
      '회의 삭제',
      `"${meeting.meetingName}" 회의를 삭제하시겠습니까?\n\n삭제된 회의는 복구할 수 없습니다.`,
      async () => {
        closePopup()
        try {
          const res = await fetch(`/api/v1/credit/meetings/${meeting.id}`, {
            method: 'DELETE'
          })
          const data = await res.json()
          if (data.success) {
            showPopup('success', '삭제 완료', '회의가 삭제되었습니다.')
            // 삭제된 회의가 현재 선택된 회의인 경우 선택 해제
            if (activeMeeting?.id === meeting.id) {
              setActiveMeeting(null)
            }
            fetchMeetings() // 목록 새로고침
          } else {
            showPopup('error', '삭제 실패', data.error || '회의 삭제에 실패했습니다.')
          }
        } catch (err) {
          console.error('Error deleting meeting:', err)
          showPopup('error', '삭제 실패', '회의 삭제 중 오류가 발생했습니다.')
        }
      },
      closePopup
    )
  }

  const handleSelectMeeting = (meeting: Meeting) => {
    setActiveMeeting(meeting)
    // 회의 선택 시 항상 '자료 생성' 단계로 바로 이동
    setActiveStep('prepare')
  }

  const handleActionClick = (_stepId: WorkflowStep, actionId: string) => {
    switch (actionId) {
      case 'new-meeting':
        setShowCreateModal(true)
        break
      case 'select-meeting':
        window.location.hash = 'credit:meetings'
        window.dispatchEvent(new CustomEvent('tnt.sales.navigate', { detail: { key: 'credit:meetings' } }))
        break
      case 'start-meeting':
      case 'review-customer':
        if (activeMeeting) {
          window.location.hash = `credit:meeting:${activeMeeting.id}`
          window.dispatchEvent(new CustomEvent('tnt.sales.navigate', { detail: { key: `credit:meeting:${activeMeeting.id}` } }))
        }
        break
      default:
        alert(`${actionId} 기능은 준비 중입니다.`)
    }
  }

  const handleCreateMeeting = async () => {
    if (!newMeetingName || !newMeetingDate) {
      alert('회의명과 일자를 입력해주세요.')
      return
    }

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

      const data = await res.json()
      if (data.success) {
        // 생성된 회의를 자동 선택 (서버에서 생성한 고유 meetingCode 사용)
        const newMeeting: Meeting = {
          id: data.id,
          meetingCode: data.meetingCode || `MTG-${newMeetingDate.replace(/-/g, '')}`,
          meetingName: newMeetingName,
          meetingDate: newMeetingDate,
          status: 'PLANNED',
          meeting_status: 'PLANNED',
          currentStep: 'prepare',
          customerCount: 0,
          preparedCount: 0,
          reviewedCount: 0,
          closedCount: 0,
        }

        setShowCreateModal(false)
        setNewMeetingName('')
        setNewMeetingRemark('')
        fetchMeetings()
        setActiveMeeting(newMeeting)
        setActiveStep('review') // 회의 생성 후 지난회의 Review 화면으로 이동
      } else {
        alert(data.error || '회의 생성에 실패했습니다.')
      }
    } catch (err) {
      console.error(err)
      alert('회의 생성 중 오류가 발생했습니다.')
    }
  }

  // meeting_status에 따른 각 단계의 활성화 가능 여부 결정
  // PLANNED: create, review, prepare 가능 (회의 생성 완료 → 지난 회의 Review 가능)
  // DATA_GENERATED: create, review, prepare, progress 가능 (자료 생성 완료)
  // ON_GOING: create, review, prepare, progress, close 가능 (회의 진행 중)
  // FINISHED: 모든 단계 가능 (회의 종료)
  // POSTPONED: create, review, prepare 가능 (연기됨)
  const isStepEnabled = (stepId: WorkflowStep): boolean => {
    if (!activeMeeting) return stepId === 'create' // 회의 미선택 시 create만 가능

    const status = activeMeeting.meeting_status
    switch (status) {
      case 'PLANNED':
        return stepId === 'create' || stepId === 'review' || stepId === 'prepare'
      case 'DATA_GENERATED':
        return stepId === 'create' || stepId === 'review' || stepId === 'prepare' || stepId === 'progress'
      case 'ON_GOING':
        return stepId === 'create' || stepId === 'review' || stepId === 'prepare' || stepId === 'progress' || stepId === 'close'
      case 'FINISHED':
        return true // 모든 단계 접근 가능 (조회용)
      case 'POSTPONED':
        return stepId === 'create' || stepId === 'review' || stepId === 'prepare'
      default:
        return stepId === 'create'
    }
  }

  // meeting_status에 따른 워크플로우 단계 상태 결정
  const getStepStatus = (stepId: WorkflowStep): 'completed' | 'current' | 'upcoming' => {
    // 회의 미선택 시 기존 로직 사용
    if (!activeMeeting) {
      const stepOrder: WorkflowStep[] = ['create', 'review', 'prepare', 'progress', 'close']
      const currentIndex = stepOrder.indexOf(activeStep)
      const stepIndex = stepOrder.indexOf(stepId)

      if (stepIndex < currentIndex) return 'completed'
      if (stepIndex === currentIndex) return 'current'
      return 'upcoming'
    }

    // meeting_status에 따라 상태 결정
    const status = activeMeeting.meeting_status
    const stepOrder: WorkflowStep[] = ['create', 'review', 'prepare', 'progress', 'close']
    const stepIndex = stepOrder.indexOf(stepId)

    // 각 상태별로 어느 단계까지 완료되었는지 결정
    // review는 create와 prepare 사이에 있으므로 index 조정
    const statusToCompletedIndex: Record<MeetingStatusType, number> = {
      'PLANNED': 0,        // create만 완료 (review, prepare는 진행 가능)
      'DATA_GENERATED': 2, // prepare까지 완료
      'ON_GOING': 2,       // prepare까지 완료, progress 진행 중
      'FINISHED': 4,       // 모두 완료
      'POSTPONED': 0,      // create만 완료
    }

    const completedIndex = statusToCompletedIndex[status] ?? 0

    // 현재 active 단계 결정
    const statusToCurrentStep: Record<MeetingStatusType, WorkflowStep> = {
      'PLANNED': 'review',      // 회의 생성 후 → 지난 회의 Review
      'DATA_GENERATED': 'progress',
      'ON_GOING': 'progress',
      'FINISHED': 'close',
      'POSTPONED': 'review',    // 연기 시에도 review 가능
    }

    const currentStep = statusToCurrentStep[status] ?? 'create'
    const currentStepIndex = stepOrder.indexOf(currentStep)

    if (stepIndex < completedIndex) return 'completed'
    if (stepId === currentStep || stepIndex === currentStepIndex) return 'current'
    if (stepIndex <= completedIndex) return 'completed'
    return 'upcoming'
  }

  // Filter meetings by search keyword
  const filteredMeetings = meetings.filter(m =>
    m.meetingName.toLowerCase().includes(searchKeyword.toLowerCase())
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ padding: '20px 32px', background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
              채권회의 Workflow
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: 14, opacity: 0.9 }}>
              체계적인 채권 심사 프로세스를 진행하세요
            </p>
          </div>
          {/* Selected Meeting Badge */}
          {activeMeeting && (
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.3)',
            }}>
              <div style={{ fontSize: 10, opacity: 0.8, marginBottom: 2 }}>선택된 회의</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{activeMeeting.meetingName}</div>
            </div>
          )}
        </div>
      </div>

      {/* Workflow Progress Bar */}
      <div style={{ padding: '20px 32px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          {/* Progress Line */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: 60,
            right: 60,
            height: 4,
            background: '#e5e7eb',
            transform: 'translateY(-50%)',
            zIndex: 0
          }} />

          {WORKFLOW_STEPS.map((step) => {
            const status = getStepStatus(step.id)
            const Icon = step.icon
            const enabled = isStepEnabled(step.id)

            // meeting_status에 따라 해당 단계가 활성화되어 있어야만 클릭 가능
            // create 단계는 회의 선택 후에는 클릭 불가 (회의 생성은 이미 완료된 상태)
            const isClickable = enabled && step.id !== 'create'

            return (
              <div
                key={step.id}
                onClick={() => isClickable && setActiveStep(step.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: isClickable ? 'pointer' : 'default',
                  opacity: enabled ? 1 : 0.4,
                  zIndex: 1,
                  flex: 1
                }}
              >
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: status === 'completed' ? '#10b981' : status === 'current' ? step.color : enabled ? '#fff' : '#f3f4f6',
                  border: `3px solid ${status === 'completed' ? '#10b981' : status === 'current' ? step.color : enabled ? '#d1d5db' : '#e5e7eb'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s',
                  boxShadow: status === 'current' ? `0 0 0 4px ${step.bgColor}` : 'none'
                }}>
                  {status === 'completed' ? (
                    <Check size={20} color="#fff" strokeWidth={3} />
                  ) : (
                    <Icon size={20} color={status === 'current' ? '#fff' : enabled ? '#9ca3af' : '#d1d5db'} />
                  )}
                </div>
                <div style={{
                  marginTop: 8,
                  textAlign: 'center',
                  color: !enabled ? '#d1d5db' : status === 'upcoming' ? '#9ca3af' : '#111827',
                  fontWeight: status === 'current' ? 700 : 500
                }}>
                  <div style={{ fontSize: 13 }}>{step.title}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {/* Left: Meeting List (Vertical) - 회의 진행 단계에서는 숨김 */}
        {activeStep !== 'progress' && (
        <div style={{
          width: 320,
          background: '#fff',
          borderRight: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Search & New Button */}
          <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="회의명 검색..."
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  fontSize: 13,
                  outline: 'none'
                }}
              />
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <Plus size={16} /> 새 회의 생성
            </button>
          </div>

          {/* Meeting List */}
          <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
            {loading ? (
              <div style={{ padding: 20, color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>로딩 중...</div>
            ) : filteredMeetings.length === 0 ? (
              <div style={{ padding: 20, color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>
                {searchKeyword ? '검색 결과가 없습니다' : '등록된 회의가 없습니다'}
              </div>
            ) : (
              filteredMeetings.map(meeting => (
                <div
                  key={meeting.id}
                  onClick={() => handleSelectMeeting(meeting)}
                  style={{
                    padding: '12px 16px',
                    margin: '0 8px 4px 8px',
                    background: activeMeeting?.id === meeting.id ? '#eff6ff' : 'transparent',
                    borderRadius: 8,
                    border: activeMeeting?.id === meeting.id ? '1px solid #93c5fd' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      background: getMeetingStatusColor(meeting.meeting_status).bg,
                      color: getMeetingStatusColor(meeting.meeting_status).text
                    }}>
                      {getMeetingStatusLabel(meeting.meeting_status)}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {meeting.meeting_status === 'PLANNED' && (
                        <button
                          onClick={(e) => handleDeleteMeeting(meeting, e)}
                          title="회의 삭제"
                          style={{
                            padding: 4,
                            background: 'transparent',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#9ca3af',
                            transition: 'color 0.15s'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      {activeMeeting?.id === meeting.id && (
                        <Check size={14} color="#3b82f6" strokeWidth={3} />
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 2 }}>
                    {meeting.meetingName}
                  </div>
                  {meeting.remark && (
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, lineHeight: 1.3 }}>
                      {meeting.remark}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6b7280' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Calendar size={11} />
                      {meeting.meetingDate}
                    </span>
                    <span>·</span>
                    <span>{meeting.customerCount}개 업체</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        )}

        {/* Right: Actions Area */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {!activeMeeting ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#9ca3af'
            }}>
              <ClipboardList size={56} strokeWidth={1} />
              <p style={{ fontSize: 16, marginTop: 12 }}>왼쪽에서 회의를 선택하거나 새로 생성해주세요</p>
            </div>
          ) : activeStep === 'review' ? (
            /* 지난 회의 Review 단계 */
            <PreviousMeetingReviewView activeMeeting={activeMeeting} />
          ) : activeStep === 'progress' ? (
            /* 회의 진행 단계 - 연체채권 현황 */
            <MeetingProgressView activeMeeting={activeMeeting} />
          ) : activeStep === 'close' ? (
            /* 회의 종료 단계 - 회의 의견 작성 */
            <MeetingCloseView activeMeeting={activeMeeting} onFinishMeeting={handleFinishMeeting} />
          ) : activeStep === 'prepare' ? (
            /* 자료 생성 단계 전용 화면 */
            <div style={{ maxWidth: 1000 }}>
              {/* Step Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 24,
                padding: 16,
                background: '#f5f3ff',
                borderRadius: 12,
                border: '1px solid #c4b5fd'
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: '#8b5cf6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FileSpreadsheet size={20} color="#fff" />
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                    자료 생성
                  </h2>
                  <p style={{ margin: '2px 0 0 0', color: '#6b7280', fontSize: 13 }}>
                    Data Preparation
                  </p>
                </div>
                <div style={{
                  padding: '6px 12px',
                  background: 'rgba(255,255,255,0.8)',
                  borderRadius: 6,
                  fontSize: 12,
                  color: '#374151'
                }}>
                  <strong>{activeMeeting.meetingName}</strong>
                </div>
              </div>

              {/* 자료 생성 버튼 영역 */}
              <div style={{
                background: '#fff',
                borderRadius: 12,
                border: '2px solid #8b5cf6',
                padding: 24,
                marginBottom: 24
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
                      AR Aging 데이터 생성
                    </h3>
                    <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: 13 }}>
                      ERP에서 채권 데이터를 가져와 생성합니다 (기준일: {activeMeeting.meetingDate})
                    </p>
                  </div>
                  <button
                    onClick={() => handleGenerateData()}
                    disabled={generatingData}
                    style={{
                      padding: '12px 24px',
                      background: generatingData ? '#a78bfa' : '#8b5cf6',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: generatingData ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    {generatingData ? (
                      <>
                        <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        생성 중...
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        자료 생성
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 생성된 자료 요약 */}
              {loadingSummary ? (
                <div style={{
                  background: '#fff',
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                  padding: 40,
                  textAlign: 'center',
                  color: '#9ca3af'
                }}>
                  <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
                  <p style={{ marginTop: 12 }}>자료 요약 로딩 중...</p>
                </div>
              ) : arSummary ? (
                <div style={{
                  background: '#fff',
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                  overflow: 'hidden'
                }}>
                  {/* 요약 헤더 */}
                  <div style={{
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <CheckCircle2 size={20} />
                      <span style={{ fontWeight: 700 }}>생성된 자료 요약</span>
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.9 }}>
                      스냅샷 일자: {arSummary.snapshotDate}
                    </div>
                  </div>

                  {/* 주요 지표 */}
                  <div style={{ padding: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                      <div style={{
                        padding: 16,
                        background: '#f8fafc',
                        borderRadius: 10,
                        textAlign: 'center'
                      }}>
                        <Building2 size={24} color="#8b5cf6" style={{ marginBottom: 8 }} />
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>
                          {arSummary.totalCustomers.toLocaleString()}
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>총 거래처 수</div>
                      </div>
                      <div style={{
                        padding: 16,
                        background: '#f8fafc',
                        borderRadius: 10,
                        textAlign: 'center'
                      }}>
                        <TrendingUp size={24} color="#3b82f6" style={{ marginBottom: 8 }} />
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>
                          {(arSummary.totalAr / 100000000).toFixed(1)}억
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>총 채권액</div>
                      </div>
                      <div style={{
                        padding: 16,
                        background: '#fef3c7',
                        borderRadius: 10,
                        textAlign: 'center'
                      }}>
                        <AlertCircle size={24} color="#f59e0b" style={{ marginBottom: 8 }} />
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#b45309' }}>
                          {(arSummary.overdue60 / 100000000).toFixed(1)}억
                        </div>
                        <div style={{ fontSize: 12, color: '#92400e' }}>60일 초과 연체</div>
                      </div>
                      <div style={{
                        padding: 16,
                        background: '#fee2e2',
                        borderRadius: 10,
                        textAlign: 'center'
                      }}>
                        <AlertCircle size={24} color="#ef4444" style={{ marginBottom: 8 }} />
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#dc2626' }}>
                          {(arSummary.overdueOver90 / 100000000).toFixed(1)}억
                        </div>
                        <div style={{ fontSize: 12, color: '#991b1b' }}>90일 초과 연체</div>
                      </div>
                    </div>

                    {/* 등급별 현황 */}
                    {arSummary.byChannel && arSummary.byChannel.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 12 }}>
                          등급별 현황
                        </h4>
                        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                              <tr style={{ background: '#f9fafb' }}>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>등급</th>
                                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>거래처 수</th>
                                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>채권액</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...arSummary.byChannel]
                                .sort((a, b) => {
                                  // 빈 등급(null, undefined, '기타')은 맨 아래로
                                  const aEmpty = !a.channelName || a.channelName === '기타'
                                  const bEmpty = !b.channelName || b.channelName === '기타'
                                  if (aEmpty && !bEmpty) return 1
                                  if (!aEmpty && bEmpty) return -1
                                  // 나머지는 알파벳 순
                                  return (a.channelName || '').localeCompare(b.channelName || '')
                                })
                                .map((ch, idx) => (
                                <tr key={idx} style={{ borderTop: '1px solid #e5e7eb' }}>
                                  <td style={{ padding: '10px 12px', color: '#111827' }}>{ch.channelName || '-'}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#6b7280' }}>
                                    {ch.count.toLocaleString()}
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#111827', fontWeight: 500 }}>
                                    {ch.amount.toLocaleString()}원
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{
                  background: '#fff',
                  borderRadius: 12,
                  border: '1px dashed #d1d5db',
                  padding: 40,
                  textAlign: 'center',
                  color: '#9ca3af'
                }}>
                  <FileSpreadsheet size={40} strokeWidth={1} />
                  <p style={{ marginTop: 12, fontSize: 14 }}>
                    회의 일자({activeMeeting.meetingDate})로 생성된 자료가 없습니다.<br />
                    <span style={{ fontSize: 13 }}>'자료 생성' 버튼을 클릭하여 AR Aging 데이터를 생성하세요.</span>
                  </p>
                </div>
              )}

              {/* 다음 단계 안내 */}
              {arSummary && (
                <div style={{
                  marginTop: 20,
                  padding: 16,
                  background: '#ecfdf5',
                  borderRadius: 10,
                  border: '1px solid #6ee7b7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#065f46' }}>
                    <CheckCircle2 size={20} />
                    <span style={{ fontWeight: 600 }}>자료 생성이 완료되었습니다. 다음 단계로 진행하세요.</span>
                  </div>
                  <button
                    onClick={handleGoToProgress}
                    disabled={activeMeeting.meeting_status === 'FINISHED'}
                    style={{
                      padding: '8px 16px',
                      background: activeMeeting.meeting_status === 'FINISHED' ? '#9ca3af' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: activeMeeting.meeting_status === 'FINISHED' ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      opacity: activeMeeting.meeting_status === 'FINISHED' ? 0.6 : 1
                    }}
                    title={activeMeeting.meeting_status === 'FINISHED' ? '종료된 회의입니다' : ''}
                  >
                    회의 진행 <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ maxWidth: 900 }}>
              {/* Current Step Actions (create, progress, close) */}
              {WORKFLOW_STEPS.filter(s => s.id === activeStep).map(step => {
                const Icon = step.icon
                return (
                  <div key={step.id}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      marginBottom: 20,
                      padding: 16,
                      background: step.bgColor,
                      borderRadius: 12,
                      border: `1px solid ${step.borderColor}`
                    }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: step.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Icon size={20} color="#fff" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                          {step.title}
                        </h2>
                        <p style={{ margin: '2px 0 0 0', color: '#6b7280', fontSize: 13 }}>
                          {step.subtitle}
                        </p>
                      </div>
                      <div style={{
                        padding: '6px 12px',
                        background: 'rgba(255,255,255,0.8)',
                        borderRadius: 6,
                        fontSize: 12,
                        color: '#374151'
                      }}>
                        <strong>{activeMeeting.meetingName}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                      {step.actions.map(action => {
                        const ActionIcon = action.icon
                        return (
                          <div
                            key={action.id}
                            onClick={() => !action.disabled && handleActionClick(step.id, action.id)}
                            style={{
                              background: '#fff',
                              padding: 20,
                              borderRadius: 12,
                              border: action.primary ? `2px solid ${step.color}` : '1px solid #e5e7eb',
                              cursor: action.disabled ? 'not-allowed' : 'pointer',
                              opacity: action.disabled ? 0.5 : 1,
                              transition: 'all 0.2s',
                              position: 'relative'
                            }}
                            onMouseEnter={(e) => {
                              if (!action.disabled) {
                                e.currentTarget.style.transform = 'translateY(-2px)'
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)'
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'none'
                              e.currentTarget.style.boxShadow = 'none'
                            }}
                          >
                            {action.primary && (
                              <div style={{
                                position: 'absolute',
                                top: 10,
                                right: 10,
                                padding: '2px 6px',
                                background: step.color,
                                color: '#fff',
                                fontSize: 9,
                                fontWeight: 700,
                                borderRadius: 4
                              }}>
                                추천
                              </div>
                            )}
                            <div style={{
                              width: 36,
                              height: 36,
                              borderRadius: 8,
                              background: action.primary ? step.bgColor : '#f3f4f6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginBottom: 12
                            }}>
                              <ActionIcon size={18} color={action.primary ? step.color : '#6b7280'} />
                            </div>
                            <h3 style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: '#111827',
                              margin: '0 0 4px 0'
                            }}>
                              {action.label}
                            </h3>
                            <p style={{
                              fontSize: 12,
                              color: '#6b7280',
                              margin: 0,
                              lineHeight: 1.4
                            }}>
                              {action.description}
                            </p>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              marginTop: 12,
                              fontSize: 12,
                              fontWeight: 600,
                              color: step.color
                            }}>
                              실행 <ArrowRight size={12} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            width: '100%',
            maxWidth: 440,
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
              color: 'white'
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>새 채권회의 생성</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: 13, opacity: 0.9 }}>
                월별 채권 심사 회의를 생성합니다
              </p>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  회의명 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newMeetingName}
                  onChange={(e) => setNewMeetingName(e.target.value)}
                  placeholder="예: 2025년 1월 정기 채권회의"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    outline: 'none'
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  회의 일자 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={newMeetingDate}
                  onChange={(e) => setNewMeetingDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  회의 내용
                </label>
                <textarea
                  value={newMeetingRemark}
                  onChange={(e) => setNewMeetingRemark(e.target.value)}
                  placeholder="회의 안건, 주요 논의 사항 등을 입력하세요"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    outline: 'none',
                    resize: 'none',
                    lineHeight: 1.5
                  }}
                />
              </div>
            </div>

            <div style={{
              padding: '12px 20px',
              background: '#f9fafb',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10
            }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: '8px 16px',
                  background: '#fff',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={handleCreateMeeting}
                style={{
                  padding: '8px 20px',
                  background: '#3b82f6',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Plus size={14} /> 생성하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Popup Modal */}
      {popup.show && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            width: '100%',
            maxWidth: 400,
            overflow: 'hidden',
            animation: 'popupIn 0.2s ease-out'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              background: popup.type === 'success' ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' :
                         popup.type === 'error' ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' :
                         popup.type === 'warning' ? 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)' :
                         popup.type === 'confirm' ? 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)' :
                         'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              {popup.type === 'success' && <CheckCircle2 size={22} />}
              {popup.type === 'error' && <X size={22} />}
              {popup.type === 'warning' && <AlertTriangle size={22} />}
              {popup.type === 'confirm' && <Info size={22} />}
              {popup.type === 'info' && <Info size={22} />}
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{popup.title}</h3>
            </div>

            {/* Content */}
            <div style={{ padding: 20 }}>
              <p style={{
                fontSize: 14,
                color: '#374151',
                margin: 0,
                lineHeight: 1.6,
                whiteSpace: 'pre-line'
              }}>
                {popup.message}
              </p>
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 20px',
              background: '#f9fafb',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10
            }}>
              {popup.type === 'confirm' ? (
                <>
                  <button
                    onClick={() => popup.onCancel?.()}
                    style={{
                      padding: '8px 16px',
                      background: '#fff',
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    취소
                  </button>
                  <button
                    onClick={() => popup.onConfirm?.()}
                    style={{
                      padding: '8px 20px',
                      background: '#8b5cf6',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    확인
                  </button>
                </>
              ) : (
                <button
                  onClick={closePopup}
                  style={{
                    padding: '8px 20px',
                    background: popup.type === 'success' ? '#10b981' :
                               popup.type === 'error' ? '#ef4444' :
                               popup.type === 'warning' ? '#f59e0b' :
                               '#3b82f6',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  확인
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes popupIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}
