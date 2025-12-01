import { useState, useEffect, useRef } from 'react'
import {
  ChevronRight, ChevronDown, Search, Filter, Plus, Edit3, Trash2, Save, X,
  Building2, User, Phone, MapPin, Star, TrendingUp, TrendingDown, FileText,
  ArrowRight, ArrowLeft, Eye, MoreHorizontal, RefreshCw, Download,
  BarChart3, PieChart, LineChart, Target, Calendar, Mail, Globe,
  Bot, Send, Sparkles, Lightbulb, AlertTriangle, CheckCircle, XCircle,
  MessageSquare, ThumbsUp, ThumbsDown, Copy, Zap, Loader2, List
} from 'lucide-react'

/**
 * Standard C360 - 통합 고객 360도 뷰
 *
 * Standard Navigation 표준 적용:
 * - 5가지 화면 상태: List → Detail → Edit → Analysis → AI Insight
 * - 단일 페이지 내 상태 전환 (SPA 방식)
 * - 컨텍스트 유지 (스크롤 위치, 필터, 선택 상태)
 * - 키보드 단축키 지원
 */

// 샘플 데이터
const SAMPLE_CUSTOMERS = [
  { id: 'C001', name: '삼성전자', grade: 'A', region: '서울', address: '서울시 강남구 삼성로 123', contact: '김담당', phone: '02-1234-5678', email: 'contact@samsung.com', sales: 125000000, trend: 12.5, lastTransaction: '2024-01-15' },
  { id: 'C002', name: 'LG전자', grade: 'A', region: '서울', address: '서울시 영등포구 여의대로 128', contact: '이담당', phone: '02-2345-6789', email: 'contact@lg.com', sales: 98000000, trend: -3.2, lastTransaction: '2024-01-10' },
  { id: 'C003', name: '현대자동차', grade: 'B', region: '경기', address: '경기도 화성시 현대로 1', contact: '박담당', phone: '031-345-6789', email: 'contact@hyundai.com', sales: 76000000, trend: 8.7, lastTransaction: '2024-01-12' },
  { id: 'C004', name: 'SK하이닉스', grade: 'A', region: '경기', address: '경기도 이천시 부발읍 SK로 1', contact: '최담당', phone: '031-456-7890', email: 'contact@skhynix.com', sales: 112000000, trend: 15.3, lastTransaction: '2024-01-08' },
  { id: 'C005', name: '포스코', grade: 'B', region: '부산', address: '부산시 남구 신선로 123', contact: '정담당', phone: '051-567-8901', email: 'contact@posco.com', sales: 65000000, trend: -1.8, lastTransaction: '2024-01-05' },
  { id: 'C006', name: '카카오', grade: 'C', region: '제주', address: '제주시 첨단로 242', contact: '강담당', phone: '064-678-9012', email: 'contact@kakao.com', sales: 42000000, trend: 22.1, lastTransaction: '2024-01-18' },
  { id: 'C007', name: '네이버', grade: 'B', region: '경기', address: '경기도 성남시 분당구 정자일로 95', contact: '조담당', phone: '031-789-0123', email: 'contact@naver.com', sales: 88000000, trend: 5.6, lastTransaction: '2024-01-14' },
  { id: 'C008', name: '쿠팡', grade: 'C', region: '서울', address: '서울시 송파구 송파대로 570', contact: '윤담당', phone: '02-890-1234', email: 'contact@coupang.com', sales: 35000000, trend: 31.2, lastTransaction: '2024-01-20' },
]

const MONTHLY_SALES = [
  { month: '1월', current: 12500000, previous: 11200000 },
  { month: '2월', current: 11800000, previous: 10500000 },
  { month: '3월', current: 13200000, previous: 11800000 },
  { month: '4월', current: 10500000, previous: 12000000 },
  { month: '5월', current: 14200000, previous: 11500000 },
  { month: '6월', current: 15800000, previous: 13200000 },
  { month: '7월', current: 12100000, previous: 12800000 },
  { month: '8월', current: 11500000, previous: 11000000 },
  { month: '9월', current: 13800000, previous: 12500000 },
  { month: '10월', current: 14500000, previous: 13000000 },
  { month: '11월', current: 16200000, previous: 14200000 },
  { month: '12월', current: 18900000, previous: 15800000 },
]

const AI_INSIGHTS = {
  keyFindings: [
    { type: 'positive', text: '매출이 전년 대비 12.5% 증가하여 성장세를 보이고 있습니다.' },
    { type: 'positive', text: '월 평균 13건의 거래로 활발한 거래 관계를 유지하고 있습니다.' },
    { type: 'warning', text: '4분기 매출 집중도가 높아 계절성 리스크가 있습니다.' },
    { type: 'negative', text: '제품 D의 매출 비중이 감소 추세입니다.' },
  ],
  recommendations: [
    { priority: 'high', title: '4분기 전략 강화', description: '매출 집중도가 높은 4분기에 대비하여 재고 확보 및 프로모션 계획을 수립하세요.' },
    { priority: 'medium', title: '제품 D 판매 전략 수정', description: '매출 감소 원인을 파악하고 대체 제품 또는 업셀링 기회를 모색하세요.' },
    { priority: 'low', title: '정기 방문 일정 조율', description: '월 1회 정기 방문 일정을 고객과 재확인하고 일정을 고정하세요.' },
  ],
}

type Customer = typeof SAMPLE_CUSTOMERS[0]
type ViewState = 'list' | 'detail' | 'edit' | 'analysis' | 'ai'
type Message = { role: 'user' | 'assistant'; content: string }

export function StandardC360() {
  // 화면 상태 관리
  const [viewState, setViewState] = useState<ViewState>('list')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // 목록 상태 (컨텍스트 유지)
  const [searchTerm, setSearchTerm] = useState('')
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [listScrollPosition, setListScrollPosition] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  // 편집 상태
  const [editData, setEditData] = useState<Customer | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // AI 채팅 상태
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '안녕하세요! 선택한 고객에 대해 어떤 것이 궁금하신가요?' }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case 'Escape':
          if (viewState === 'detail') setViewState('list')
          else if (viewState === 'edit' || viewState === 'analysis' || viewState === 'ai') setViewState('detail')
          break
        case 'e':
          if (viewState === 'detail' && selectedCustomer) {
            setEditData({ ...selectedCustomer })
            setViewState('edit')
          }
          break
        case 'a':
          if (viewState === 'detail') setViewState('analysis')
          break
        case 'i':
          if (viewState === 'detail' || viewState === 'analysis') setViewState('ai')
          break
        case 'Enter':
          if (viewState === 'list' && selectedCustomer) setViewState('detail')
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewState, selectedCustomer])

  // 목록 스크롤 위치 저장/복원
  useEffect(() => {
    if (viewState === 'list' && listRef.current) {
      listRef.current.scrollTop = listScrollPosition
    }
  }, [viewState])

  const saveScrollPosition = () => {
    if (listRef.current) {
      setListScrollPosition(listRef.current.scrollTop)
    }
  }

  // 필터링된 고객 목록
  const filteredCustomers = SAMPLE_CUSTOMERS.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contact.toLowerCase().includes(searchTerm.toLowerCase())
    const matchGrade = gradeFilter === 'all' || c.grade === gradeFilter
    return matchSearch && matchGrade
  })

  // 유틸리티 함수
  const formatCurrency = (value: number) => new Intl.NumberFormat('ko-KR').format(value) + '원'
  const formatShortCurrency = (value: number) => {
    if (value >= 100000000) return (value / 100000000).toFixed(1) + '억'
    if (value >= 10000000) return (value / 10000000).toFixed(0) + '천만'
    return new Intl.NumberFormat('ko-KR').format(value)
  }

  const getGradeStyle = (grade: string) => {
    switch (grade) {
      case 'A': return { bg: 'var(--success-bg)', color: 'var(--success)' }
      case 'B': return { bg: 'var(--info-bg)', color: 'var(--info)' }
      case 'C': return { bg: 'var(--warning-bg)', color: 'var(--warning)' }
      default: return { bg: 'var(--surface)', color: 'var(--muted)' }
    }
  }

  // 화면 전환 핸들러
  const goToDetail = (customer: Customer) => {
    saveScrollPosition()
    setSelectedCustomer(customer)
    setViewState('detail')
  }

  const goToList = () => {
    setViewState('list')
  }

  const goToEdit = () => {
    if (selectedCustomer) {
      setEditData({ ...selectedCustomer })
      setHasChanges(false)
      setViewState('edit')
    }
  }

  const goToAnalysis = () => setViewState('analysis')
  const goToAI = () => setViewState('ai')

  const handleSave = () => {
    if (editData) {
      setSelectedCustomer(editData)
      setHasChanges(false)
      setViewState('detail')
    }
  }

  // AI 채팅
  const handleSendMessage = () => {
    if (!inputValue.trim()) return
    const userMessage: Message = { role: 'user', content: inputValue }
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    setTimeout(() => {
      const responses: Record<string, string> = {
        '매출': `${selectedCustomer?.name}의 최근 12개월 매출은 ${formatCurrency(selectedCustomer?.sales || 0)}입니다. 전년 대비 ${selectedCustomer?.trend}% ${(selectedCustomer?.trend || 0) >= 0 ? '증가' : '감소'}했습니다.`,
        '추천': '현재 가장 중요한 추천 액션은 4분기 전략 강화입니다. 재고 확보와 프로모션 계획을 미리 수립하시기 바랍니다.',
        '위험': '주요 리스크는 4분기 매출 집중도입니다. 다른 분기에도 매출을 분산시킬 수 있는 프로모션 전략을 검토해 보세요.',
      }
      let response = '해당 질문에 대한 분석 결과를 준비 중입니다. 잠시 후 다시 질문해 주세요.'
      for (const [keyword, answer] of Object.entries(responses)) {
        if (inputValue.includes(keyword)) { response = answer; break }
      }
      setMessages(prev => [...prev, { role: 'assistant', content: response }])
      setIsTyping(false)
    }, 1500)
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 상태 네비게이션 바
  const StateNavigation = () => (
    <div className="card" style={{ padding: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {[
        { key: 'list', label: 'LIST', icon: List },
        { key: 'detail', label: 'DETAIL', icon: FileText },
        { key: 'edit', label: 'EDIT', icon: Edit3 },
        { key: 'analysis', label: 'ANALYSIS', icon: BarChart3 },
        { key: 'ai', label: 'AI', icon: Bot },
      ].map((state, i) => {
        const Icon = state.icon
        const isActive = viewState === state.key
        const isAccessible = state.key === 'list' ||
          (state.key === 'detail' && selectedCustomer) ||
          (['edit', 'analysis', 'ai'].includes(state.key) && viewState !== 'list')
        return (
          <div key={state.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              className={isActive ? 'btn btn-primary' : 'btn'}
              style={{
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: isAccessible ? 1 : 0.4
              }}
              onClick={() => {
                if (state.key === 'list') goToList()
                else if (state.key === 'detail' && selectedCustomer) setViewState('detail')
                else if (state.key === 'edit') goToEdit()
                else if (state.key === 'analysis') goToAnalysis()
                else if (state.key === 'ai') goToAI()
              }}
              disabled={!isAccessible}
            >
              <Icon size={14} />
              {state.label}
            </button>
            {i < 4 && <ArrowRight size={12} style={{ color: 'var(--muted)' }} />}
          </div>
        )
      })}
      <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>
        Esc: 이전 | E: 수정 | A: 분석 | I: AI
      </div>
    </div>
  )

  // ==================== LIST VIEW ====================
  const ListView = () => (
    <div ref={listRef} style={{ height: '100%', overflow: 'auto' }}>
      {/* 검색/필터 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            type="text"
            placeholder="거래처명, 담당자 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            style={{ width: '100%', paddingLeft: 36 }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={16} style={{ color: 'var(--muted)' }} />
          <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="search-input" style={{ width: 100 }}>
            <option value="all">전체 등급</option>
            <option value="A">A 등급</option>
            <option value="B">B 등급</option>
            <option value="C">C 등급</option>
          </select>
        </div>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> 신규 등록
        </button>
      </div>

      {/* 목록 테이블 */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--surface)' }}>
              <th style={{ padding: 12, textAlign: 'left', borderBottom: '2px solid var(--border)', width: 60 }}>등급</th>
              <th style={{ padding: 12, textAlign: 'left', borderBottom: '2px solid var(--border)' }}>거래처명</th>
              <th style={{ padding: 12, textAlign: 'left', borderBottom: '2px solid var(--border)', width: 80 }}>지역</th>
              <th style={{ padding: 12, textAlign: 'left', borderBottom: '2px solid var(--border)', width: 80 }}>담당자</th>
              <th style={{ padding: 12, textAlign: 'right', borderBottom: '2px solid var(--border)', width: 120 }}>매출</th>
              <th style={{ padding: 12, textAlign: 'right', borderBottom: '2px solid var(--border)', width: 80 }}>증감</th>
              <th style={{ padding: 12, textAlign: 'center', borderBottom: '2px solid var(--border)', width: 80 }}>액션</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((customer) => {
              const gradeStyle = getGradeStyle(customer.grade)
              const isSelected = selectedCustomer?.id === customer.id
              return (
                <tr
                  key={customer.id}
                  style={{ cursor: 'pointer', background: isSelected ? 'var(--info-bg)' : 'transparent' }}
                  onClick={() => setSelectedCustomer(customer)}
                  onDoubleClick={() => goToDetail(customer)}
                >
                  <td style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
                    <span className="badge" style={{ background: gradeStyle.bg, color: gradeStyle.color }}>{customer.grade}</span>
                  </td>
                  <td style={{ padding: 12, borderBottom: '1px solid var(--border)', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Building2 size={16} style={{ color: 'var(--muted)' }} />
                      {customer.name}
                    </div>
                  </td>
                  <td style={{ padding: 12, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{customer.region}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>{customer.contact}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'monospace' }}>
                    {formatShortCurrency(customer.sales)}
                  </td>
                  <td style={{ padding: 12, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                    <span style={{ color: customer.trend >= 0 ? 'var(--success)' : 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                      {customer.trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {customer.trend >= 0 ? '+' : ''}{customer.trend}%
                    </span>
                  </td>
                  <td style={{ padding: 12, borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                    <button className="btn" style={{ padding: '4px 8px' }} onClick={(e) => { e.stopPropagation(); goToDetail(customer) }} title="상세보기">
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
        총 {filteredCustomers.length}건 | 행 클릭: 선택, 더블클릭/Enter: 상세보기
      </div>
    </div>
  )

  // ==================== DETAIL VIEW ====================
  const DetailView = () => {
    if (!selectedCustomer) return null
    const gradeStyle = getGradeStyle(selectedCustomer.grade)
    return (
      <div style={{ height: '100%', overflow: 'auto' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Building2 size={24} />
              {selectedCustomer.name}
              <span className="badge" style={{ ...gradeStyle }}>{selectedCustomer.grade} 등급</span>
            </h2>
            <p style={{ color: 'var(--muted)', marginTop: 4 }}>고객 ID: {selectedCustomer.id}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={goToEdit} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Edit3 size={16} /> 수정 (E)
            </button>
            <button className="btn" onClick={goToAnalysis} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <BarChart3 size={16} /> 분석 (A)
            </button>
            <button className="btn btn-primary" onClick={goToAI} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Bot size={16} /> AI (I)
            </button>
          </div>
        </div>

        {/* 정보 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={16} /> 기본 정보
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={14} style={{ color: 'var(--muted)' }} />
                <span style={{ color: 'var(--muted)', width: 50 }}>주소</span>
                <span>{selectedCustomer.address}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={14} style={{ color: 'var(--muted)' }} />
                <span style={{ color: 'var(--muted)', width: 50 }}>담당자</span>
                <span>{selectedCustomer.contact}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Phone size={14} style={{ color: 'var(--muted)' }} />
                <span style={{ color: 'var(--muted)', width: 50 }}>연락처</span>
                <span>{selectedCustomer.phone}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={14} style={{ color: 'var(--muted)' }} />
                <span style={{ color: 'var(--muted)', width: 50 }}>이메일</span>
                <span>{selectedCustomer.email}</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} /> 매출 현황
            </h4>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>연간 매출</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace' }}>{formatCurrency(selectedCustomer.sales)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>전년 대비</span>
              <span className="badge" style={{
                background: selectedCustomer.trend >= 0 ? 'var(--success-bg)' : 'var(--error-bg)',
                color: selectedCustomer.trend >= 0 ? 'var(--success)' : 'var(--error)'
              }}>
                {selectedCustomer.trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {selectedCustomer.trend >= 0 ? '+' : ''}{selectedCustomer.trend}%
              </span>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
              최근 거래일: {selectedCustomer.lastTransaction}
            </div>
          </div>
        </div>

        {/* AI Quick Insight */}
        <div className="card" style={{ padding: 16, background: 'linear-gradient(135deg, var(--accent-bg) 0%, var(--info-bg) 100%)' }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} /> AI Quick Insight
          </h4>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
            {selectedCustomer.name}은(는) {selectedCustomer.grade}등급 고객으로, 전년 대비 {selectedCustomer.trend}%
            {selectedCustomer.trend >= 0 ? ' 성장하며 안정적인 거래 관계를 유지' : ' 감소하여 관리가 필요'}하고 있습니다.
            {selectedCustomer.trend >= 10 && ' 우수 고객으로 VIP 혜택 검토를 권장합니다.'}
            {selectedCustomer.trend < 0 && ' 원인 파악 및 대응 전략 수립이 필요합니다.'}
          </p>
          <button className="btn" style={{ marginTop: 12 }} onClick={goToAI}>
            <Bot size={14} /> 자세한 AI 분석 보기
          </button>
        </div>
      </div>
    )
  }

  // ==================== EDIT VIEW ====================
  const EditView = () => {
    if (!editData) return null
    return (
      <div style={{ height: '100%', overflow: 'auto' }}>
        {hasChanges && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: 'var(--warning-bg)', borderRadius: 8, marginBottom: 16 }}>
            <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />
            <span style={{ fontSize: 13 }}>저장하지 않은 변경사항이 있습니다.</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>거래처 정보 수정</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => setViewState('detail')}>취소</button>
            <button className="btn btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={16} /> 저장 (Ctrl+S)
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 24 }}>
          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>기본 정보</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>거래처명 *</label>
                <input type="text" value={editData.name} onChange={(e) => { setEditData({ ...editData, name: e.target.value }); setHasChanges(true) }} className="search-input" style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>등급</label>
                  <select value={editData.grade} onChange={(e) => { setEditData({ ...editData, grade: e.target.value }); setHasChanges(true) }} className="search-input" style={{ width: '100%' }}>
                    <option value="A">A 등급</option>
                    <option value="B">B 등급</option>
                    <option value="C">C 등급</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>지역</label>
                  <input type="text" value={editData.region} onChange={(e) => { setEditData({ ...editData, region: e.target.value }); setHasChanges(true) }} className="search-input" style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>주소</label>
                <input type="text" value={editData.address} onChange={(e) => { setEditData({ ...editData, address: e.target.value }); setHasChanges(true) }} className="search-input" style={{ width: '100%' }} />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>담당자 정보</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>담당자명</label>
                <input type="text" value={editData.contact} onChange={(e) => { setEditData({ ...editData, contact: e.target.value }); setHasChanges(true) }} className="search-input" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>연락처</label>
                <input type="tel" value={editData.phone} onChange={(e) => { setEditData({ ...editData, phone: e.target.value }); setHasChanges(true) }} className="search-input" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>이메일</label>
                <input type="email" value={editData.email} onChange={(e) => { setEditData({ ...editData, email: e.target.value }); setHasChanges(true) }} className="search-input" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ==================== ANALYSIS VIEW ====================
  const AnalysisView = () => {
    if (!selectedCustomer) return null
    const maxSales = Math.max(...MONTHLY_SALES.map(m => Math.max(m.current, m.previous)))
    return (
      <div style={{ height: '100%', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={20} /> {selectedCustomer.name} 분석
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="search-input" style={{ width: 100 }}>
              <option>2024년</option>
              <option>2023년</option>
            </select>
            <button className="btn btn-primary" onClick={goToAI} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Bot size={16} /> AI 인사이트 (I)
            </button>
          </div>
        </div>

        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { icon: Target, label: '연간 매출', value: formatShortCurrency(selectedCustomer.sales), color: 'var(--primary)' },
            { icon: PieChart, label: '거래 건수', value: '156건', color: 'var(--info)' },
            { icon: LineChart, label: '평균 단가', value: '801만원', color: 'var(--accent)' },
            { icon: Calendar, label: '마지막 거래', value: '15일 전', color: 'var(--warning)' },
          ].map((kpi) => (
            <div key={kpi.label} className="card" style={{ padding: 12, textAlign: 'center' }}>
              <kpi.icon size={20} style={{ color: kpi.color, marginBottom: 8 }} />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{kpi.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* 월별 차트 */}
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <LineChart size={16} /> 월별 매출 추이
          </h4>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, background: 'var(--primary)', borderRadius: 2 }} /> 2024년
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, background: 'var(--error)', borderRadius: 2, opacity: 0.6 }} /> 2023년
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
            {MONTHLY_SALES.map((m, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 100 }}>
                  <div style={{ width: 8, height: `${(m.current / maxSales) * 100}%`, background: 'var(--primary)', borderRadius: '2px 2px 0 0' }} />
                  <div style={{ width: 8, height: `${(m.previous / maxSales) * 100}%`, background: 'var(--error)', borderRadius: '2px 2px 0 0', opacity: 0.6 }} />
                </div>
                <span style={{ fontSize: 9, color: 'var(--muted)' }}>{m.month.replace('월', '')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 인사이트 */}
        <div className="card" style={{ padding: 16, background: 'var(--info-bg)' }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lightbulb size={16} /> 분석 인사이트
          </h4>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.8 }}>
            <li>전년 대비 12.5% 매출 성장으로 우수한 실적</li>
            <li>4분기 매출 집중도가 높음 (계절성 주의)</li>
            <li>월 평균 13건 거래로 활발한 거래 관계 유지</li>
          </ul>
        </div>
      </div>
    )
  }

  // ==================== AI VIEW ====================
  const AIView = () => {
    if (!selectedCustomer) return null
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bot size={20} /> {selectedCustomer.name} AI 인사이트
          </h2>
          <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> 재분석
          </button>
        </div>

        {/* 핵심 발견 & 추천 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lightbulb size={16} /> 핵심 발견
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {AI_INSIGHTS.keyFindings.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
                  {f.type === 'positive' && <CheckCircle size={14} style={{ color: 'var(--success)', marginTop: 2 }} />}
                  {f.type === 'warning' && <AlertTriangle size={14} style={{ color: 'var(--warning)', marginTop: 2 }} />}
                  {f.type === 'negative' && <XCircle size={14} style={{ color: 'var(--error)', marginTop: 2 }} />}
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target size={16} /> 추천 액션
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {AI_INSIGHTS.recommendations.map((r, i) => (
                <div key={i} style={{ padding: 8, background: 'var(--surface)', borderRadius: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span className="badge" style={{
                      background: r.priority === 'high' ? 'var(--error-bg)' : r.priority === 'medium' ? 'var(--warning-bg)' : 'var(--info-bg)',
                      color: r.priority === 'high' ? 'var(--error)' : r.priority === 'medium' ? 'var(--warning)' : 'var(--info)',
                      fontSize: 10
                    }}>
                      {r.priority === 'high' ? '높음' : r.priority === 'medium' ? '중간' : '낮음'}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{r.title}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>{r.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 채팅 */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, minHeight: 200 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare size={16} /> AI 대화
          </h4>
          <div style={{ flex: 1, overflow: 'auto', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
                {msg.role === 'assistant' && <Bot size={16} style={{ color: 'var(--primary)', marginTop: 8 }} />}
                <div style={{
                  maxWidth: '70%', padding: 10, borderRadius: 8,
                  background: msg.role === 'user' ? 'var(--primary)' : 'var(--surface)',
                  color: msg.role === 'user' ? '#fff' : 'inherit',
                  fontSize: 13
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Bot size={16} style={{ color: 'var(--primary)' }} />
                <div style={{ padding: 10, background: 'var(--surface)', borderRadius: 8 }}>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="질문을 입력하세요..."
              className="search-input"
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={handleSendMessage} disabled={!inputValue.trim() || isTyping}>
              <Send size={16} />
            </button>
          </div>
        </div>

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ==================== MAIN RENDER ====================
  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--panel)' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Standard C360</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 16 }}>
        고객 360도 뷰 - Standard Navigation 표준 적용
      </p>

      <StateNavigation />

      <div style={{ flex: 1, minHeight: 0 }}>
        {viewState === 'list' && <ListView />}
        {viewState === 'detail' && <DetailView />}
        {viewState === 'edit' && <EditView />}
        {viewState === 'analysis' && <AnalysisView />}
        {viewState === 'ai' && <AIView />}
      </div>
    </div>
  )
}
