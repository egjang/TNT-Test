import React, { useState, useEffect } from 'react'
import {
  Search,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Calendar,
  DollarSign,
  FileText,
  ArrowRight
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line
} from 'recharts'

type CustomerCreditInfo = {
  customerSeq: number
  customerName: string
  totalAr: number
  weightedAgingDays: number
  overdue: number
  aging0_30: number
  aging31_60: number
  aging61_90: number
  recentCollections?: { date: string; amount: number }[]
  avgMonthlySales?: number
  lastMeetingOpinion?: string
}

const STEPS = [
  { id: 1, title: '거래처 선택 및 현황 분석', icon: Search },
  { id: 2, title: '해제 사유 및 계획 작성', icon: FileText },
  { id: 3, title: '요청 완료', icon: CheckCircle2 },
]

export function UnblockingRequestForm() {
  const [currentStep, setCurrentStep] = useState(1)
  const [customerSeq, setCustomerSeq] = useState('')
  const [customerData, setCustomerData] = useState<CustomerCreditInfo | null>(null)
  const [loadingCustomer, setLoadingCustomer] = useState(false)

  const [requestReason, setRequestReason] = useState('')
  const [expectedCollectionDate, setExpectedCollectionDate] = useState('')
  const [expectedAmount, setExpectedAmount] = useState('')
  const [collectionPlan, setCollectionPlan] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchCustomerData = async (seq: string) => {
    if (!seq) return
    setLoadingCustomer(true)
    setCustomerData(null)
    try {
      const res = await fetch(`/api/v1/credit/customers/${seq}`)
      if (!res.ok) throw new Error('거래처 정보를 찾을 수 없습니다')
      const data = await res.json()

      if (data.customer) {
        const c = data.customer
        setCustomerData({
          customerSeq: c.customer_seq,
          customerName: c.customer_name,
          totalAr: c.total_ar || 0,
          weightedAgingDays: 45,
          overdue: c.overdue || 0,
          aging0_30: c.aging_0_30 || 0,
          aging31_60: c.aging_31_60 || 0,
          aging61_90: c.aging_61_90 || 0,
          recentCollections: [
            { date: '2024-12-15', amount: 5000000 },
            { date: '2024-11-20', amount: 3000000 },
            { date: '2024-10-18', amount: 4000000 },
          ],
          avgMonthlySales: 25000000,
          lastMeetingOpinion: '고객사 자금 사정 어려움. 1월 중순 입금 약속.',
        })
      }
    } catch (err: any) {
      console.error('거래처 조회 실패:', err)
      alert(err.message)
    } finally {
      setLoadingCustomer(false)
    }
  }

  const handleSubmit = async () => {
    if (!customerSeq || !requestReason || !expectedCollectionDate || !expectedAmount || !collectionPlan) {
      alert('모든 필수 항목을 입력해주세요')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/credit/unblock-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerSeq: Number(customerSeq),
          requestCode: `REQ-${Date.now()}`,
          requestDate: new Date().toISOString().split('T')[0],
          requestReason,
          expectedCollectionDate,
          expectedAmount: Number(expectedAmount),
          collectionPlan,
          assigneeId: 'user1',
        }),
      })

      if (!res.ok) throw new Error('요청 제출 실패')

      const data = await res.json()
      if (data.success) {
        setCurrentStep(3)
      } else {
        throw new Error(data.error || '요청 제출 실패')
      }
    } catch (err: any) {
      alert('요청 제출 중 오류가 발생했습니다: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (value: number) => `₩${value.toLocaleString('ko-KR')}`

  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="card" style={{ padding: 24, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Search size={20} color="#3b82f6" /> 거래처 조회
        </h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
            <input
              type="number"
              value={customerSeq}
              onChange={(e) => setCustomerSeq(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchCustomerData(customerSeq)}
              placeholder="거래처 코드 (SEQ) 입력"
              className="search-input"
              style={{ width: '100%', height: 42, paddingLeft: 40, fontSize: 14 }}
              autoFocus
            />
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          </div>
          <button
            onClick={() => fetchCustomerData(customerSeq)}
            disabled={loadingCustomer || !customerSeq}
            className="btn"
            style={{
              height: 42,
              padding: '0 24px',
              fontSize: 14,
              fontWeight: 600,
              background: '#3b82f6',
              borderColor: '#3b82f6',
              color: 'white',
              opacity: (loadingCustomer || !customerSeq) ? 0.7 : 1
            }}
          >
            {loadingCustomer ? '조회 중...' : '조회'}
          </button>
        </div>
      </div>

      {customerData && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
          {/* Key Metrics */}
          <div className="card" style={{ padding: 24, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', gridColumn: 'span 2' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
              <div style={{ padding: 16, background: '#eff6ff', borderRadius: 12, border: '1px solid #dbeafe' }}>
                <div style={{ fontSize: 13, color: '#2563eb', fontWeight: 600, marginBottom: 4 }}>총 채권액</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{formatCurrency(customerData.totalAr)}</div>
              </div>
              <div style={{ padding: 16, background: '#fef2f2', borderRadius: 12, border: '1px solid #fee2e2' }}>
                <div style={{ fontSize: 13, color: '#dc2626', fontWeight: 600, marginBottom: 4 }}>연체 금액</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{formatCurrency(customerData.overdue)}</div>
              </div>
              <div style={{ padding: 16, background: '#fffbeb', borderRadius: 12, border: '1px solid #fef3c7' }}>
                <div style={{ fontSize: 13, color: '#d97706', fontWeight: 600, marginBottom: 4 }}>평균 결제일</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{customerData.weightedAgingDays}일</div>
              </div>
              <div style={{ padding: 16, background: '#f9fafb', borderRadius: 12, border: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, marginBottom: 4 }}>월 평균 매출</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{formatCurrency(customerData.avgMonthlySales || 0)}</div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="card" style={{ padding: 24, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', height: 320 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 16 }}>채권 연령 분석</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: '정상', value: customerData.totalAr - customerData.overdue },
                { name: '1개월', value: customerData.aging0_30 },
                { name: '2개월', value: customerData.aging31_60 },
                { name: '3개월+', value: customerData.aging61_90 },
              ]} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {[0, 1, 2, 3].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 3 ? '#ef4444' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ padding: 24, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', height: 320 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 16 }}>최근 수금 추이</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={customerData.recentCollections} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Line type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )

  const renderStep2 = () => (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="card" style={{ padding: 32, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={20} color="#3b82f6" /> 해제 요청 사유 작성
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>요청 사유 <span style={{ color: '#ef4444' }}>*</span></label>
            <textarea
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              rows={5}
              className="search-input"
              style={{ width: '100%', height: 'auto', padding: 12, resize: 'none', fontSize: 14 }}
              placeholder="매출통제 해제가 필요한 구체적인 사유를 입력해주세요."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>예상 수금일 <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="date"
                value={expectedCollectionDate}
                onChange={(e) => setExpectedCollectionDate(e.target.value)}
                className="search-input"
                style={{ width: '100%', height: 42 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>예상 수금액 <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: 14 }}>₩</span>
                <input
                  type="number"
                  value={expectedAmount}
                  onChange={(e) => setExpectedAmount(e.target.value)}
                  className="search-input"
                  style={{ width: '100%', height: 42, paddingLeft: 30 }}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>수금 계획 근거 <span style={{ color: '#ef4444' }}>*</span></label>
            <textarea
              value={collectionPlan}
              onChange={(e) => setCollectionPlan(e.target.value)}
              rows={3}
              className="search-input"
              style={{ width: '100%', height: 'auto', padding: 12, resize: 'none', fontSize: 14 }}
              placeholder="수금 계획의 신뢰성을 뒷받침할 근거를 입력해주세요 (예: 고객사 담당자 통화 내용, 지불각서 등)"
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="animate-in zoom-in-95 duration-500" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ width: 80, height: 80, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        <CheckCircle2 size={40} color="#16a34a" />
      </div>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 8 }}>요청이 완료되었습니다!</h2>
      <p style={{ fontSize: 16, color: '#6b7280', marginBottom: 32 }}>담당자 검토 후 승인 여부가 결정됩니다.</p>
      <button
        onClick={() => {
          setCurrentStep(1)
          setCustomerSeq('')
          setCustomerData(null)
          setRequestReason('')
          setExpectedCollectionDate('')
          setExpectedAmount('')
          setCollectionPlan('')
        }}
        className="btn"
        style={{
          height: 48,
          padding: '0 32px',
          fontSize: 15,
          fontWeight: 700,
          background: '#111827',
          borderColor: '#111827',
          color: 'white',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
      >
        새로운 요청 작성하기
      </button>
    </div>
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8f9fa' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', background: '#fff', borderBottom: '1px solid #e5e7eb', zIndex: 10 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>매출통제 해제 요청</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>연체 거래처의 일시적 매출 허용을 위한 승인 요청</p>
        </div>

        {/* Wizard Steps */}
        <div style={{ display: 'flex', alignItems: 'center', maxWidth: 600, margin: '0 auto', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 20, left: 0, width: '100%', height: 2, background: '#f3f4f6', zIndex: 0 }}></div>
          <div
            style={{
              position: 'absolute',
              top: 20,
              left: 0,
              height: 2,
              background: '#3b82f6',
              zIndex: 0,
              width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`,
              transition: 'width 0.3s ease'
            }}
          ></div>

          {STEPS.map((step) => {
            const isActive = currentStep >= step.id
            const isCurrent = currentStep === step.id
            return (
              <div key={step.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isActive ? '#3b82f6' : '#fff',
                    border: isActive ? 'none' : '2px solid #e5e7eb',
                    color: isActive ? '#fff' : '#9ca3af',
                    boxShadow: isActive ? '0 4px 6px -1px rgba(59, 130, 246, 0.3)' : 'none',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <step.icon size={20} />
                </div>
                <span style={{ marginTop: 8, fontSize: 13, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#3b82f6' : '#9ca3af', transition: 'color 0.3s ease' }}>
                  {step.title}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 32 }}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>

      {/* Footer Actions */}
      {currentStep < 3 && (
        <div style={{ padding: '16px 32px', background: '#fff', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className="btn"
            style={{
              background: 'transparent',
              borderColor: 'transparent',
              color: '#4b5563',
              opacity: currentStep === 1 ? 0.3 : 1,
              cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
              paddingLeft: 0
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <ChevronLeft size={18} /> 이전
            </div>
          </button>

          {currentStep === 1 ? (
            <button
              onClick={() => setCurrentStep(2)}
              disabled={!customerData}
              className="btn"
              style={{
                height: 42,
                padding: '0 24px',
                fontSize: 14,
                fontWeight: 600,
                background: '#3b82f6',
                borderColor: '#3b82f6',
                color: 'white',
                opacity: !customerData ? 0.5 : 1,
                cursor: !customerData ? 'not-allowed' : 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                다음 단계 <ChevronRight size={18} />
              </div>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn"
              style={{
                height: 42,
                padding: '0 24px',
                fontSize: 14,
                fontWeight: 600,
                background: '#3b82f6',
                borderColor: '#3b82f6',
                color: 'white',
                opacity: submitting ? 0.7 : 1
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {submitting ? '제출 중...' : '요청 제출하기'} <ArrowRight size={18} />
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
