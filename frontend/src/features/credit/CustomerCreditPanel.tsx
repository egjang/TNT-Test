import React, { useState, useEffect } from 'react'

type CustomerCreditInfo = {
  customerSeq: number
  customerNo?: string
  customerName: string
  bizNo?: string
  channelName?: string
  deptName?: string
  assigneeId?: string
  empName?: string
  creditLimit?: number
  availableCredit?: number
  creditUsage?: number
  creditUsageRate?: number
  totalAr?: number
  overdue?: number
  aging30?: number
  aging60?: number
  aging90?: number
  aging180?: number
  aging365?: number
  agingOver365?: number
  riskLevel?: string
  isBlocked?: boolean
  blockReason?: string
  lastCollectionDate?: string
  lastOrderDate?: string
  salesYtd?: number
  salesLastYear?: number
  [key: string]: any
}

type SalesOpinion = {
  id: number
  opinionDate: string
  assigneeId: string
  empName: string
  opinionText: string
  actionPlan?: string
  nextReviewDate?: string
  createdAt: string
}

type UnblockRequest = {
  id: number
  requestCode: string
  requestDate: string
  requestReason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN'
  approvalDate?: string
  approverName?: string
  approvalComment?: string
}

interface CustomerCreditPanelProps {
  customerSeq: number
  onClose: () => void
}

export function CustomerCreditPanel({ customerSeq, onClose }: CustomerCreditPanelProps) {
  const [customer, setCustomer] = useState<CustomerCreditInfo | null>(null)
  const [opinions, setOpinions] = useState<SalesOpinion[]>([])
  const [requests, setRequests] = useState<UnblockRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'opinions' | 'requests'>('overview')

  const fetchCustomerCredit = async () => {
    setLoading(true)
    setError(null)
    try {
      // TODO: Replace with actual API endpoint
      // const res = await fetch(`/api/v1/credit/customers/${customerSeq}`)
      // if (!res.ok) throw new Error(`API 호출 실패: ${res.status}`)
      // const data = await res.json()

      // Mock data for now
      const mockCustomer: CustomerCreditInfo = {
        customerSeq: customerSeq,
        customerNo: 'C001',
        customerName: 'ABC 상사',
        bizNo: '123-45-67890',
        channelName: '직거래',
        deptName: '영업1팀',
        assigneeId: 'hong123',
        empName: '홍길동',
        creditLimit: 100000000,
        availableCredit: 50000000,
        creditUsage: 50000000,
        creditUsageRate: 50.0,
        totalAr: 50000000,
        overdue: 10000000,
        aging30: 20000000,
        aging60: 15000000,
        aging90: 5000000,
        aging180: 0,
        aging365: 0,
        agingOver365: 0,
        riskLevel: 'high',
        isBlocked: true,
        blockReason: '연체 채권 증가로 인한 영업 차단',
        lastCollectionDate: '2024-12-15',
        lastOrderDate: '2025-01-05',
        salesYtd: 300000000,
        salesLastYear: 450000000,
      }

      const mockOpinions: SalesOpinion[] = [
        {
          id: 1,
          opinionDate: '2025-01-15',
          assigneeId: 'hong123',
          empName: '홍길동',
          opinionText: '고객사 자금 사정 악화. 분할 상환 협의 중.',
          actionPlan: '월 1천만원씩 5개월 분할 상환 계획 수립',
          nextReviewDate: '2025-02-15',
          createdAt: '2025-01-15T14:30:00',
        },
        {
          id: 2,
          opinionDate: '2024-12-20',
          assigneeId: 'hong123',
          empName: '홍길동',
          opinionText: '연체 채권 지속 발생. 신규 출하 중단 필요.',
          actionPlan: '영업 차단 요청',
          nextReviewDate: '2025-01-20',
          createdAt: '2024-12-20T10:00:00',
        },
      ]

      const mockRequests: UnblockRequest[] = [
        {
          id: 1,
          requestCode: 'UBR-2025-001',
          requestDate: '2025-01-10',
          requestReason: '긴급 오더 발생. 선입금 조건으로 출하 필요.',
          status: 'REJECTED',
          approvalDate: '2025-01-11',
          approverName: '김부장',
          approvalComment: '연체 채권 회수 후 재검토',
        },
      ]

      setCustomer(mockCustomer)
      setOpinions(mockOpinions)
      setRequests(mockRequests)
    } catch (err: any) {
      console.error('거래처 채권 정보 조회 실패:', err)
      setError(err.message || '데이터 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomerCredit()
  }, [customerSeq])

  const formatCurrency = (value: any) => {
    if (value === null || value === undefined || value === '') return '-'
    const num = Number(value)
    return Number.isFinite(num) ? `₩${num.toLocaleString('ko-KR')}` : String(value)
  }

  const formatDate = (value: any) => {
    if (!value) return '-'
    const str = String(value)
    if (str.length === 8) {
      return `${str.substring(0, 4)}-${str.substring(4, 6)}-${str.substring(6, 8)}`
    }
    return str.substring(0, 10)
  }

  const formatDateTime = (dateTime: string) => {
    if (!dateTime) return '-'
    const dt = new Date(dateTime)
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
  }

  const getRiskBadge = (riskLevel: string) => {
    if (riskLevel === 'high') {
      return (
        <span style={{ padding: '4px 12px', background: '#ef4444', color: 'white', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>
          고위험
        </span>
      )
    } else if (riskLevel === 'medium') {
      return (
        <span style={{ padding: '4px 12px', background: '#f59e0b', color: 'white', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>
          중위험
        </span>
      )
    } else if (riskLevel === 'low') {
      return (
        <span style={{ padding: '4px 12px', background: '#10b981', color: 'white', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>
          저위험
        </span>
      )
    }
    return (
      <span style={{ padding: '4px 12px', background: '#6b7280', color: 'white', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>
        -
      </span>
    )
  }

  const getStatusBadge = (status: string) => {
    if (status === 'APPROVED') {
      return (
        <span style={{ padding: '2px 8px', background: '#10b981', color: 'white', borderRadius: 4, fontSize: 11 }}>
          승인
        </span>
      )
    } else if (status === 'REJECTED') {
      return (
        <span style={{ padding: '2px 8px', background: '#ef4444', color: 'white', borderRadius: 4, fontSize: 11 }}>
          거부
        </span>
      )
    } else if (status === 'WITHDRAWN') {
      return (
        <span style={{ padding: '2px 8px', background: '#6b7280', color: 'white', borderRadius: 4, fontSize: 11 }}>
          철회
        </span>
      )
    } else {
      return (
        <span style={{ padding: '2px 8px', background: '#f59e0b', color: 'white', borderRadius: 4, fontSize: 11 }}>
          대기중
        </span>
      )
    }
  }

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: '600px',
        background: '#fff',
        boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: 'var(--muted)' }}>로딩 중...</div>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: '600px',
        background: '#fff',
        boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16
      }}>
        <div style={{ color: '#ef4444' }}>{error || '거래처 정보를 찾을 수 없습니다.'}</div>
        <button className="button" onClick={onClose}>닫기</button>
      </div>
    )
  }

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 999
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: '600px',
        background: '#f8f9fa',
        boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0, marginBottom: 4 }}>
              {customer.customerName}
            </h2>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              {customer.customerNo} · {customer.bizNo}
            </div>
          </div>
          <button
            className="btn"
            onClick={onClose}
            style={{
              height: 32,
              padding: '0 16px',
              fontSize: 14,
              background: '#6b7280',
              borderColor: '#6b7280'
            }}
          >
            닫기
          </button>
        </div>

        {/* Status Bar */}
        <div style={{
          padding: '12px 20px',
          background: customer.isBlocked ? '#fef2f2' : '#f0fdf4',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            {customer.isBlocked ? (
              <>
                <span style={{ color: '#ef4444', fontWeight: 600 }}>🚫 영업 차단</span>
                <span style={{ color: '#6b7280' }}>·</span>
                <span style={{ color: '#6b7280' }}>{customer.blockReason}</span>
              </>
            ) : (
              <span style={{ color: '#10b981', fontWeight: 600 }}>✓ 정상 거래</span>
            )}
          </div>
          {getRiskBadge(customer.riskLevel || '')}
        </div>

        {/* Tabs */}
        <div style={{
          padding: '0 20px',
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          gap: 4
        }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'overview' ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === 'overview' ? '#3b82f6' : '#6b7280',
              fontWeight: activeTab === 'overview' ? 600 : 400,
              fontSize: 14,
              cursor: 'pointer'
            }}
          >
            개요
          </button>
          <button
            onClick={() => setActiveTab('opinions')}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'opinions' ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === 'opinions' ? '#3b82f6' : '#6b7280',
              fontWeight: activeTab === 'opinions' ? 600 : 400,
              fontSize: 14,
              cursor: 'pointer'
            }}
          >
            영업의견 ({opinions.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'requests' ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === 'requests' ? '#3b82f6' : '#6b7280',
              fontWeight: activeTab === 'requests' ? 600 : 400,
              fontSize: 14,
              cursor: 'pointer'
            }}
          >
            차단해제요청 ({requests.length})
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Credit Overview */}
              <div className="card" style={{ padding: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#111827' }}>
                  여신 현황
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 12px', fontSize: 13 }}>
                  <div style={{ color: '#6b7280' }}>여신한도</div>
                  <div style={{ fontWeight: 600 }}>{formatCurrency(customer.creditLimit)}</div>

                  <div style={{ color: '#6b7280' }}>사용금액</div>
                  <div style={{ fontWeight: 600, color: '#ef4444' }}>{formatCurrency(customer.creditUsage)}</div>

                  <div style={{ color: '#6b7280' }}>가용여신</div>
                  <div style={{ fontWeight: 600, color: '#10b981' }}>{formatCurrency(customer.availableCredit)}</div>

                  <div style={{ color: '#6b7280' }}>사용률</div>
                  <div>
                    <span style={{ fontWeight: 600 }}>{customer.creditUsageRate?.toFixed(1)}%</span>
                    <div style={{
                      height: 8,
                      background: '#e5e7eb',
                      borderRadius: 4,
                      marginTop: 4,
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${customer.creditUsageRate}%`,
                        height: '100%',
                        background: customer.creditUsageRate && customer.creditUsageRate > 80 ? '#ef4444' : '#3b82f6',
                        borderRadius: 4
                      }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* AR Aging */}
              <div className="card" style={{ padding: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#111827' }}>
                  채권 연령 분석
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 12px', fontSize: 13 }}>
                  <div style={{ color: '#6b7280' }}>총채권액</div>
                  <div style={{ fontWeight: 600 }}>{formatCurrency(customer.totalAr)}</div>

                  <div style={{ color: '#6b7280' }}>만기도과</div>
                  <div style={{ fontWeight: 600, color: '#ef4444' }}>{formatCurrency(customer.overdue)}</div>

                  <div style={{ color: '#6b7280' }}>30일 이내</div>
                  <div>{formatCurrency(customer.aging30)}</div>

                  <div style={{ color: '#6b7280' }}>60일 이내</div>
                  <div>{formatCurrency(customer.aging60)}</div>

                  <div style={{ color: '#6b7280' }}>90일 이내</div>
                  <div>{formatCurrency(customer.aging90)}</div>

                  <div style={{ color: '#6b7280' }}>180일 이내</div>
                  <div>{formatCurrency(customer.aging180)}</div>

                  <div style={{ color: '#6b7280' }}>365일 이내</div>
                  <div>{formatCurrency(customer.aging365)}</div>

                  <div style={{ color: '#6b7280' }}>365일 초과</div>
                  <div>{formatCurrency(customer.agingOver365)}</div>
                </div>
              </div>

              {/* Sales & Collection */}
              <div className="card" style={{ padding: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#111827' }}>
                  매출 및 수금 정보
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 12px', fontSize: 13 }}>
                  <div style={{ color: '#6b7280' }}>금년 매출</div>
                  <div style={{ fontWeight: 600 }}>{formatCurrency(customer.salesYtd)}</div>

                  <div style={{ color: '#6b7280' }}>전년 매출</div>
                  <div>{formatCurrency(customer.salesLastYear)}</div>

                  <div style={{ color: '#6b7280' }}>최근수금일</div>
                  <div>{formatDate(customer.lastCollectionDate)}</div>

                  <div style={{ color: '#6b7280' }}>최근주문일</div>
                  <div>{formatDate(customer.lastOrderDate)}</div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="card" style={{ padding: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#111827' }}>
                  거래처 정보
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 12px', fontSize: 13 }}>
                  <div style={{ color: '#6b7280' }}>유통구조</div>
                  <div>{customer.channelName || '-'}</div>

                  <div style={{ color: '#6b7280' }}>담당부서</div>
                  <div>{customer.deptName || '-'}</div>

                  <div style={{ color: '#6b7280' }}>담당자</div>
                  <div>{customer.empName || '-'}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'opinions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {opinions.length === 0 ? (
                <div className="empty-state" style={{ padding: 40 }}>
                  등록된 영업 의견이 없습니다
                </div>
              ) : (
                opinions.map((opinion) => (
                  <div key={opinion.id} className="card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                        {opinion.empName}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>
                        {formatDate(opinion.opinionDate)}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: '#374151', marginBottom: 8, lineHeight: 1.5 }}>
                      {opinion.opinionText}
                    </div>
                    {opinion.actionPlan && (
                      <div style={{
                        fontSize: 12,
                        color: '#6b7280',
                        padding: 8,
                        background: '#f9fafb',
                        borderRadius: 4,
                        marginBottom: 8
                      }}>
                        <strong>조치계획:</strong> {opinion.actionPlan}
                      </div>
                    )}
                    {opinion.nextReviewDate && (
                      <div style={{ fontSize: 12, color: '#6b7280' }}>
                        다음 검토일: {formatDate(opinion.nextReviewDate)}
                      </div>
                    )}
                  </div>
                ))
              )}
              <button
                className="button primary"
                onClick={() => alert('영업 의견 등록 기능 구현 예정')}
                style={{ marginTop: 8 }}
              >
                + 새 의견 등록
              </button>
            </div>
          )}

          {activeTab === 'requests' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {requests.length === 0 ? (
                <div className="empty-state" style={{ padding: 40 }}>
                  등록된 차단 해제 요청이 없습니다
                </div>
              ) : (
                requests.map((request) => (
                  <div key={request.id} className="card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                        {request.requestCode}
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                      요청일: {formatDate(request.requestDate)}
                    </div>
                    <div style={{ fontSize: 13, color: '#374151', marginBottom: 8, lineHeight: 1.5 }}>
                      {request.requestReason}
                    </div>
                    {request.status !== 'PENDING' && request.approvalDate && (
                      <div style={{
                        fontSize: 12,
                        color: '#6b7280',
                        padding: 8,
                        background: '#f9fafb',
                        borderRadius: 4
                      }}>
                        <div style={{ marginBottom: 4 }}>
                          <strong>{request.approverName}</strong> · {formatDate(request.approvalDate)}
                        </div>
                        {request.approvalComment && (
                          <div>{request.approvalComment}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
              {customer.isBlocked && (
                <button
                  className="button primary"
                  onClick={() => alert('차단 해제 요청 기능 구현 예정')}
                  style={{ marginTop: 8 }}
                >
                  + 차단 해제 요청
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
