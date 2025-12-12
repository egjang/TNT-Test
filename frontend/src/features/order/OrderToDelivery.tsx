import { useState, useEffect } from 'react'
import {
  Search,
  Building2,
  FileText,
  Package,
  Truck,
  FileCheck,
  CheckCircle2,
  Check,
  Plus,
  RefreshCw,
  ClipboardList,
  Unlock,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  List,
  FilePlus,
  Calendar,
  Clock,
  XCircle,
} from 'lucide-react'
import { OrderSheetForm } from './OrderSheetForm'

// 워크플로우 단계 정의
type WorkflowStepId = 'order-sheet' | 'unblock' | 'order' | 'shipment-request' | 'invoice' | 'delivery'

type WorkflowStep = {
  id: WorkflowStepId
  label: string
  subLabel: string
  icon: any
  color: string
  bgColor: string
  borderColor: string
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  { id: 'order-sheet', label: '수주장 등록', subLabel: 'Order Sheet', icon: FileText, color: '#3b82f6', bgColor: '#eff6ff', borderColor: '#93c5fd' },
  { id: 'unblock', label: '매출통제해제', subLabel: 'Unblock', icon: Unlock, color: '#ec4899', bgColor: '#fdf2f8', borderColor: '#f9a8d4' },
  { id: 'order', label: '수주', subLabel: 'Order', icon: Package, color: '#8b5cf6', bgColor: '#f5f3ff', borderColor: '#c4b5fd' },
  { id: 'shipment-request', label: '출하의뢰', subLabel: 'Shipment Request', icon: Truck, color: '#f59e0b', bgColor: '#fffbeb', borderColor: '#fcd34d' },
  { id: 'invoice', label: '거래명세서', subLabel: 'Invoice', icon: FileCheck, color: '#10b981', bgColor: '#ecfdf5', borderColor: '#6ee7b7' },
  { id: 'delivery', label: '출고', subLabel: 'Delivery', icon: CheckCircle2, color: '#06b6d4', bgColor: '#ecfeff', borderColor: '#67e8f9' },
]

// 거래처 타입
type Customer = {
  customerSeq: number
  customerName: string
  companyType: 'TNT' | 'DYS' | string
  customerId?: string
  addrProvinceName?: string
  addrCityName?: string
}

// 워크플로우 데이터 타입 (MVP - 실제 데이터 구조는 추후 정의)
type WorkflowData = {
  orderSheet: any | null
  unblock: any | null
  order: any | null
  shipmentRequest: any | null
  invoice: any | null
  delivery: any | null
}

// 매출통제 상태 타입
type SalesControlStatus = {
  loading: boolean
  checked: boolean
  isSalesControlled: boolean
  isUnblocked: boolean
  unblockUntilDate: string | null
  statusMessage: string
  salesControlReason: string | null
  error: string | null
}

// 메인 뷰 모드 타입: 워크플로우 화면 vs 수주진행목록 화면
type MainViewMode = 'workflow' | 'list'

export function OrderToDelivery() {
  const [company, setCompany] = useState<'TNT' | 'DYS' | 'ALL'>('ALL')
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedStep, setSelectedStep] = useState<WorkflowStepId | null>(null)
  const [loading, setLoading] = useState(false)
  // 메인 뷰 모드: 거래처 선택 시 list(수주진행목록), 수주장 등록 버튼 클릭 시 workflow
  const [mainViewMode, setMainViewMode] = useState<MainViewMode>('list')
  // 선택된 수주장 번호 (수주진행목록에서 선택 시)
  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(null)
  const [workflowData, setWorkflowData] = useState<WorkflowData>({
    orderSheet: null,
    unblock: null,
    order: null,
    shipmentRequest: null,
    invoice: null,
    delivery: null,
  })

  // 매출통제 상태
  const [salesControlStatus, setSalesControlStatus] = useState<SalesControlStatus>({
    loading: false,
    checked: false,
    isSalesControlled: false,
    isUnblocked: false,
    unblockUntilDate: null,
    statusMessage: '',
    salesControlReason: null,
    error: null,
  })

  // 매출통제 확인 API 호출
  const checkSalesControl = async (customer: Customer) => {
    setSalesControlStatus(prev => ({ ...prev, loading: true, error: null }))
    try {
      const params = new URLSearchParams({
        customerSeq: String(customer.customerSeq),
        companyType: customer.companyType || 'TNT',
      })
      const response = await fetch(`/api/v1/orders/sales-control/check?${params}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()
      if (data.success) {
        setSalesControlStatus({
          loading: false,
          checked: true,
          isSalesControlled: data.isSalesControlled || false,
          isUnblocked: data.isUnblocked || false,
          unblockUntilDate: data.unblockUntilDate || null,
          statusMessage: data.statusMessage || '',
          salesControlReason: data.salesControlReason || null,
          error: null,
        })
      } else {
        throw new Error(data.error || '매출통제 확인 실패')
      }
    } catch (err: any) {
      console.error('매출통제 확인 실패:', err)
      setSalesControlStatus(prev => ({
        ...prev,
        loading: false,
        checked: true,
        error: err.message || '매출통제 확인 중 오류 발생',
      }))
    }
  }

  // 수주장 등록 단계 선택 시 매출통제 확인
  // 거래처가 변경되면 먼저 상태를 초기화하고, 조건이 맞으면 바로 확인 API 호출
  useEffect(() => {
    // 거래처가 없거나 수주장 등록 단계가 아니면 상태만 초기화
    if (!selectedCustomer || selectedStep !== 'order-sheet') {
      setSalesControlStatus({
        loading: false,
        checked: false,
        isSalesControlled: false,
        isUnblocked: false,
        unblockUntilDate: null,
        statusMessage: '',
        salesControlReason: null,
        error: null,
      })
      return
    }

    // 수주장 등록 단계이고 거래처가 있으면 매출통제 확인
    checkSalesControl(selectedCustomer)
  }, [selectedStep, selectedCustomer])

  // 거래처 검색
  const handleCustomerSearch = async () => {
    if (!customerSearch.trim()) return
    setLoading(true)
    try {
      const empId = localStorage.getItem('tnt.sales.empId') || ''
      const assigneeId = localStorage.getItem('tnt.sales.assigneeId') || ''

      const params = new URLSearchParams()
      params.set('name', customerSearch.trim())
      params.set('mineOnly', 'false') // 전체 검색
      params.set('limit', '50')
      if (empId) params.set('empId', empId)
      if (assigneeId) params.set('assigneeId', assigneeId)
      if (company !== 'ALL') params.set('companyType', company)

      const response = await fetch(`/api/v1/customers?${params.toString()}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()
      const mapped: Customer[] = (Array.isArray(data) ? data : []).map((row: any) => ({
        customerSeq: row.customerSeq,
        customerName: row.customerName,
        companyType: row.companyType || 'TNT',
        customerId: row.customerId,
        addrProvinceName: row.addrProvinceName,
        addrCityName: row.addrCityName,
      }))
      setCustomers(mapped)
    } catch (err) {
      console.error('거래처 검색 실패:', err)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  // 거래처 선택 시 → 수주진행목록 보기 (기본)
  const handleSelectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer)
    setSelectedStep(null)
    setSelectedOrderNo(null)
    setMainViewMode('list') // 거래처 선택 시 수주진행목록 먼저
    // 거래처 선택 시 워크플로우는 초기 상태 (모두 null)
    setWorkflowData({
      orderSheet: null,
      unblock: null,
      order: null,
      shipmentRequest: null,
      invoice: null,
      delivery: null,
    })
  }

  // 신규 수주장 등록 버튼 클릭 시 → 워크플로우 보기
  const handleNewOrderSheet = (customer: Customer) => {
    setSelectedCustomer(customer)
    setSelectedOrderNo(null)
    setMainViewMode('workflow')
    setSelectedStep('order-sheet')
    setWorkflowData({
      orderSheet: null,
      unblock: null,
      order: null,
      shipmentRequest: null,
      invoice: null,
      delivery: null,
    })
  }

  // 수주진행목록에서 수주장 선택 시 → 워크플로우 보기
  const handleSelectOrder = (orderNo: string) => {
    setSelectedOrderNo(orderNo)
    setMainViewMode('workflow')
    setSelectedStep('order-sheet')
    // TODO: 선택된 수주장의 워크플로우 데이터 로드
    console.log('수주장 선택:', orderNo)
  }

  // 단계별 완료 여부 확인
  const isStepCompleted = (stepId: WorkflowStepId): boolean => {
    switch (stepId) {
      case 'order-sheet': return !!workflowData.orderSheet
      case 'unblock': return !!workflowData.unblock
      case 'order': return !!workflowData.order
      case 'shipment-request': return !!workflowData.shipmentRequest
      case 'invoice': return !!workflowData.invoice
      case 'delivery': return !!workflowData.delivery
      default: return false
    }
  }

  // 현재 진행 단계 확인
  const getCurrentStep = (): WorkflowStepId | null => {
    for (const step of WORKFLOW_STEPS) {
      if (!isStepCompleted(step.id)) return step.id
    }
    return 'delivery' // 모두 완료
  }

  // 완료된 단계 수
  const getCompletedCount = () => {
    return WORKFLOW_STEPS.filter(step => isStepCompleted(step.id)).length
  }

  return (
    <section style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 - 파란색 그라데이션 */}
      <div style={{
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #1e3a8a 100%)',
        padding: '20px 24px',
        borderRadius: 12,
        marginBottom: 16,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#fff' }}>수주~배송</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
              {selectedCustomer
                ? `${selectedCustomer.customerName} - 주문에서 배송까지의 진행 상황을 확인합니다`
                : '주문에서 배송까지의 진행 상황을 확인합니다'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Company Selection */}
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: 4, borderRadius: 8, display: 'flex', gap: 0 }}>
              {(['ALL', 'TNT', 'DYS'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCompany(c)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: company === c ? '#fff' : 'transparent',
                    color: company === c ? '#1e40af' : 'rgba(255,255,255,0.9)',
                    transition: 'all 0.2s'
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* 선택된 거래처 정보 */}
            {selectedCustomer && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(255,255,255,0.15)',
                padding: '8px 16px',
                borderRadius: 8,
              }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: selectedCustomer.companyType === 'TNT' ? '#fff' : '#10b981',
                    color: selectedCustomer.companyType === 'TNT' ? '#1e40af' : '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {selectedCustomer.companyType === 'TNT' ? 'T' : 'D'}
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{selectedCustomer.customerName}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                    {selectedCustomer.addrProvinceName} {selectedCustomer.addrCityName}
                  </div>
                </div>
                <div style={{
                  padding: '4px 10px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: 6,
                  fontSize: 12,
                  color: '#fff',
                  marginLeft: 4
                }}>
                  <strong>{getCompletedCount()}</strong> / {WORKFLOW_STEPS.length}
                </div>
                <button
                  onClick={() => handleSelectCustomer(selectedCustomer)}
                  style={{
                    padding: '6px 10px',
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 11,
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div style={{ flex: 1, display: 'flex', gap: 16, padding: '16px 0', minHeight: 0, overflow: 'hidden' }}>
        {/* 좌측: 거래처 검색/선택 */}
        <div style={{
          width: 280,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={18} color="#374151" />
              거래처 선택
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="거래처명 검색"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomerSearch()}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 13,
                  outline: 'none'
                }}
              />
              <button
                onClick={handleCustomerSearch}
                disabled={loading}
                style={{
                  padding: '8px 12px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Search size={16} />
              </button>
            </div>
          </div>

          {/* 거래처 목록 */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: 8, fontSize: 13 }}>검색 중...</p>
              </div>
            ) : customers.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                <Building2 size={32} strokeWidth={1} />
                <p style={{ marginTop: 8, fontSize: 13 }}>거래처를 검색하세요</p>
              </div>
            ) : (
              <div style={{ padding: 8 }}>
                {customers.map((cust) => (
                  <div
                    key={`${cust.companyType}-${cust.customerSeq}`}
                    onClick={() => handleSelectCustomer(cust)}
                    style={{
                      padding: '12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      marginBottom: 4,
                      background: selectedCustomer?.customerSeq === cust.customerSeq ? '#eff6ff' : 'transparent',
                      border: selectedCustomer?.customerSeq === cust.customerSeq ? '1px solid #3b82f6' : '1px solid transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 24,
                          height: 24,
                          borderRadius: 4,
                          background: cust.companyType === 'TNT' ? '#3b82f6' : '#10b981',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {cust.companyType === 'TNT' ? 'T' : 'D'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{cust.customerName}</div>
                        {cust.addrProvinceName && (
                          <div style={{ fontSize: 11, color: '#6b7280' }}>{cust.addrProvinceName} {cust.addrCityName}</div>
                        )}
                      </div>
                      {/* 신규 수주장 등록 버튼 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleNewOrderSheet(cust)
                        }}
                        title="수주장 등록"
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          border: '2px solid #3b82f6',
                          background: '#fff',
                          color: '#3b82f6',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#3b82f6'
                          e.currentTarget.style.color = '#fff'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#fff'
                          e.currentTarget.style.color = '#3b82f6'
                        }}
                      >
                        <Plus size={14} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 우측: 뷰 모드에 따라 다른 화면 표시 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          {/* 거래처 미선택 시 */}
          {!selectedCustomer ? (
            <div style={{
              flex: 1,
              background: '#fff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af'
            }}>
              <div style={{ textAlign: 'center' }}>
                <Building2 size={48} strokeWidth={1} />
                <p style={{ marginTop: 12, fontSize: 14 }}>거래처를 선택하세요</p>
                <p style={{ fontSize: 12, color: '#d1d5db' }}>거래처를 선택하면 수주진행목록이 표시됩니다</p>
              </div>
            </div>
          ) : mainViewMode === 'list' ? (
            /* 수주진행목록 뷰 */
            <div style={{
              flex: 1,
              background: '#fff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}>
              <OrderProgressListPanel
                customer={selectedCustomer}
                onSelectOrder={handleSelectOrder}
                onNewOrderSheet={() => handleNewOrderSheet(selectedCustomer)}
              />
            </div>
          ) : (
            /* 워크플로우 뷰 */
            <>
              {/* 워크플로우 단계 표시 */}
              <div style={{
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                padding: 20,
              }}>
                {/* 헤더: 뒤로가기 + 수주장 정보 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <button
                    onClick={() => setMainViewMode('list')}
                    style={{
                      padding: '6px 12px',
                      background: '#f3f4f6',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12,
                      color: '#374151',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <List size={14} />
                    목록으로
                  </button>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                      {selectedOrderNo ? `수주장 #${selectedOrderNo}` : '신규 수주장 등록'}
                    </span>
                    <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 8 }}>
                      {selectedCustomer.customerName}
                    </span>
                  </div>
                </div>

                {/* 워크플로우 스텝 - 가로 프로그레스 바 스타일 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                  {/* Progress Line (배경) */}
                  <div style={{
                    position: 'absolute',
                    top: 24,
                    left: 60,
                    right: 60,
                    height: 4,
                    background: '#e5e7eb',
                    zIndex: 0
                  }} />
                  {/* Progress Line (완료된 부분) */}
                  {selectedCustomer && (
                    <div style={{
                      position: 'absolute',
                      top: 24,
                      left: 60,
                      width: `calc(${(getCompletedCount() / WORKFLOW_STEPS.length) * 100}% - ${60 * 2 / WORKFLOW_STEPS.length}px)`,
                      height: 4,
                      background: '#22c55e',
                      zIndex: 0,
                      transition: 'width 0.3s'
                    }} />
                  )}

                  {WORKFLOW_STEPS.map((step) => {
                    const completed = selectedCustomer ? isStepCompleted(step.id) : false
                    const current = selectedCustomer ? getCurrentStep() === step.id : false
                    const isSelected = selectedStep === step.id
                    const Icon = step.icon

                    return (
                      <div
                        key={step.id}
                        onClick={() => setSelectedStep(step.id)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          cursor: 'pointer',
                          zIndex: 1,
                          flex: 1
                        }}
                      >
                        <div style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: completed ? '#22c55e' : isSelected ? step.color : current ? '#fff' : '#fff',
                          border: `3px solid ${completed ? '#22c55e' : isSelected ? step.color : current ? step.color : '#e5e7eb'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.3s',
                          boxShadow: isSelected || current ? `0 0 0 4px ${step.bgColor}` : 'none'
                        }}>
                          {completed ? (
                            <Check size={22} color="#fff" strokeWidth={3} />
                          ) : (
                            <Icon size={22} color={isSelected ? '#fff' : current ? step.color : '#9ca3af'} />
                          )}
                        </div>
                        <div style={{
                          marginTop: 10,
                          textAlign: 'center',
                          color: completed ? '#16a34a' : isSelected || current ? '#111827' : '#9ca3af',
                          fontWeight: isSelected || current ? 700 : 500
                        }}>
                          <div style={{ fontSize: 13 }}>{step.label}</div>
                          <div style={{ fontSize: 10, color: completed ? '#22c55e' : '#9ca3af', marginTop: 2 }}>
                            {completed ? '완료' : step.subLabel}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 단계별 상세 정보 */}
              <div style={{
                flex: 1,
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
              }}>
                {!selectedStep ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                    <div style={{ textAlign: 'center' }}>
                      <ClipboardList size={40} strokeWidth={1} />
                      <p style={{ marginTop: 12, fontSize: 14 }}>워크플로우 단계를 클릭하여 상세 정보를 확인하세요</p>
                    </div>
                  </div>
                ) : (
                  <StepDetailPanel
                    step={selectedStep}
                    customer={selectedCustomer}
                    data={workflowData}
                    salesControlStatus={salesControlStatus}
                    onRefreshSalesControl={() => selectedCustomer && checkSalesControl(selectedCustomer)}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

// 상태 타입: completed(완료), pending(대기), cancelled(취소), none(미진행)
type ProgressStatus = 'completed' | 'pending' | 'cancelled' | 'none'

// 수주진행목록 데이터 타입 (6개 컬럼: 수주장, 매출통제해제, 수주, 출하의뢰, 거래명세서, 출고)
type OrderProgressItem = {
  // 수주장
  orderSheetNo: string
  orderSheetDate: string
  orderSheetStatus: ProgressStatus
  isCancel: boolean
  // 매출통제해제
  unblockStatus: ProgressStatus
  // 수주
  orderNo: string
  orderDate: string
  orderStatus: ProgressStatus
  // 출하의뢰
  shipmentRequestNo: string
  shipmentRequestDate: string
  shipmentRequestStatus: ProgressStatus
  // 거래명세서
  invoiceNo: string
  invoiceStatus: ProgressStatus
  // 출고
  deliveryStatus: ProgressStatus
}

// 날짜 유틸리티 함수
function todayYyMmDd(): string {
  const d = new Date()
  const yy = String(d.getFullYear() % 100).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

function monthAgoYyMmDd(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  const yy = String(d.getFullYear() % 100).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

// 다양한 날짜 형식을 YYYY-MM-DD로 변환
// 지원 형식: "YYYYMMDD", "YY-MM-DD", "YY-MM-DD HH:MM"
function toYyyyMmDd(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const s = String(dateStr).trim()

  // "YYYYMMDD" 형식 (예: "20250526")
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  }

  // "YY-MM-DD" 또는 "YY-MM-DD HH:MM" 형식
  const datePart = s.split(' ')[0] // "25-01-15"
  const parts = datePart.split('-')
  if (parts.length === 3 && parts[0].length === 2) {
    const yy = parts[0]
    const mm = parts[1]
    const dd = parts[2]
    const yyyy = parseInt(yy) >= 50 ? `19${yy}` : `20${yy}`
    return `${yyyy}-${mm}-${dd}`
  }

  return s
}

// 상태 배지 컴포넌트
function StatusBadge({ status }: { status: ProgressStatus }) {
  if (status === 'none') {
    return <span style={{ color: '#d1d5db', fontSize: 11 }}>-</span>
  }
  if (status === 'completed') {
    return (
      <div style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: '#dcfce7',
        border: '2px solid #22c55e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Check size={14} color="#16a34a" strokeWidth={3} />
      </div>
    )
  }
  if (status === 'cancelled') {
    // 취소 상태 - 빨간색 X 표시
    return (
      <div style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: '#fee2e2',
        border: '2px solid #ef4444',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <XCircle size={14} color="#dc2626" strokeWidth={3} />
      </div>
    )
  }
  // pending
  return (
    <div style={{
      width: 24,
      height: 24,
      borderRadius: '50%',
      background: '#fef3c7',
      border: '2px solid #f59e0b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Clock size={12} color="#d97706" />
    </div>
  )
}

// 수주진행목록 패널 컴포넌트
function OrderProgressListPanel({
  customer,
  onSelectOrder,
  onNewOrderSheet
}: {
  customer: Customer
  onSelectOrder: (orderNo: string) => void
  onNewOrderSheet: () => void
}) {
  const [orders, setOrders] = useState<OrderProgressItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState(monthAgoYyMmDd())
  const [toDate, setToDate] = useState(todayYyMmDd())

  // 수주장 목록 조회
  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        custSeq: String(customer.customerSeq),
        companyType: customer.companyType || 'TNT',
      })
      if (fromDate) params.set('fromDate', fromDate)
      if (toDate) params.set('toDate', toDate)

      const response = await fetch(`/api/v1/orders/external/order-progress-list?${params.toString()}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()

      // API 응답을 OrderProgressItem 형태로 변환
      // IsCancel 값이 있으면 취소, 없으면 완료
      const items: OrderProgressItem[] = (Array.isArray(data) ? data : []).map((row: any) => {
        const isCancel = !!row.IsCancel // IsCancel에 값이 있으면 취소
        const orderSheetStatus: ProgressStatus = !row.OrderTextNo ? 'none' : isCancel ? 'cancelled' : 'completed'
        // 수주번호가 있으면 완료, 없으면 미진행
        const hasOrderNo = !!row.OrderNo && row.OrderNo !== ''
        const orderStatus: ProgressStatus = hasOrderNo ? 'completed' : 'none'
        // 출하의뢰번호가 있으면 완료, 없으면 미진행
        const hasDVReqNo = !!row.DVReqNo && row.DVReqNo !== ''
        const shipmentRequestStatus: ProgressStatus = hasDVReqNo ? 'completed' : 'none'
        return {
          orderSheetNo: row.OrderTextNo || '',
          orderSheetDate: row.OrderTextDate || '',
          orderSheetStatus,
          isCancel,
          unblockStatus: 'none' as ProgressStatus, // TODO: 매출통제해제 상태 조회
          orderNo: row.OrderNo || '',
          orderDate: row.OrderDate || '',
          orderStatus,
          shipmentRequestNo: row.DVReqNo || '',
          shipmentRequestDate: row.DVReqDate || '',
          shipmentRequestStatus,
          invoiceNo: '', // TODO: 거래명세서번호 조회
          invoiceStatus: 'none' as ProgressStatus,
          deliveryStatus: 'none' as ProgressStatus, // TODO: 출고 상태 조회
        }
      })
      setOrders(items)
    } catch (err: any) {
      setError(err.message || '조회 실패')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  // 거래처 변경 시 자동 조회
  useEffect(() => {
    fetchOrders()
  }, [customer.customerSeq])

  // 컬럼 헤더 스타일
  const headerStyle: React.CSSProperties = {
    padding: '12px 8px',
    textAlign: 'center',
    fontWeight: 700,
    fontSize: 13,
    color: '#fff',
    background: '#3b82f6',
    borderRight: '1px solid #60a5fa',
  }

  // 셀 스타일
  const cellStyle: React.CSSProperties = {
    padding: '10px 6px',
    textAlign: 'center',
    fontSize: 12,
    borderBottom: '1px solid #f3f4f6',
    borderRight: '1px solid #f3f4f6',
    verticalAlign: 'middle',
  }

  return (
    <>
      {/* 헤더 */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <List size={20} color="#fff" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
              수주진행목록
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#6b7280' }}>
              {customer.customerName} - 수주장 번호 기준 진행 현황
            </p>
          </div>
        </div>
        <button
          onClick={onNewOrderSheet}
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <FilePlus size={16} />
          신규 수주장 등록
        </button>
      </div>

      {/* 검색 조건 */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: '#f9fafb'
      }}>
        <Calendar size={16} color="#6b7280" />
        <span style={{ fontSize: 13, color: '#6b7280' }}>수주일</span>
        <input
          type="text"
          placeholder="YY-MM-DD"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          style={{
            padding: '6px 10px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 13,
            width: 100
          }}
        />
        <span style={{ color: '#9ca3af' }}>~</span>
        <input
          type="text"
          placeholder="YY-MM-DD"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          style={{
            padding: '6px 10px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 13,
            width: 100
          }}
        />
        <button
          onClick={fetchOrders}
          disabled={loading}
          style={{
            padding: '6px 14px',
            background: '#374151',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          조회
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>
          {orders.length}건
        </span>
      </div>

      {/* 목록 테이블 - 6개 컬럼 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
        {error ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>
            <XCircle size={40} strokeWidth={1} />
            <p style={{ marginTop: 12, fontSize: 14 }}>{error}</p>
          </div>
        ) : loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            <Loader2 size={40} strokeWidth={1} className="animate-spin" />
            <p style={{ marginTop: 12, fontSize: 14 }}>조회 중...</p>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            <ClipboardList size={48} strokeWidth={1} />
            <p style={{ marginTop: 12, fontSize: 14 }}>조회된 수주장이 없습니다</p>
            <p style={{ fontSize: 12, color: '#d1d5db' }}>
              기간을 변경하거나 신규 수주장을 등록하세요
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            {/* 메인 헤더 (6개 컬럼 - 상태와 번호 합침) */}
            <thead>
              <tr>
                <th style={{ ...headerStyle, width: '20%' }}>수주장</th>
                <th style={{ ...headerStyle, width: '12%' }}>매출통제해제</th>
                <th style={{ ...headerStyle, width: '18%' }}>수주</th>
                <th style={{ ...headerStyle, width: '18%' }}>출하의뢰</th>
                <th style={{ ...headerStyle, width: '18%' }}>거래명세서</th>
                <th style={{ ...headerStyle, width: '14%', borderRight: 'none' }}>출고</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, idx) => (
                <tr
                  key={order.orderSheetNo || idx}
                  onClick={() => onSelectOrder(order.orderSheetNo)}
                  style={{
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f3f4f6'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {/* 수주장 - 상태 + 번호 + 수주일 합침 */}
                  <td style={cellStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                      <StatusBadge status={order.orderSheetStatus} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: 12 }}>
                          {order.orderSheetNo || '-'}
                        </div>
                        {order.orderSheetDate && (
                          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                            {toYyyyMmDd(order.orderSheetDate)}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  {/* 매출통제해제 - 상태 */}
                  <td style={cellStyle}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <StatusBadge status={order.unblockStatus} />
                    </div>
                  </td>
                  {/* 수주 - 상태 + 번호 + 수주일자 합침 */}
                  <td style={cellStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                      <StatusBadge status={order.orderStatus} />
                      {order.orderNo && (
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 500, color: '#374151', fontSize: 12 }}>{order.orderNo}</div>
                          {order.orderDate && (
                            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                              {toYyyyMmDd(order.orderDate)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  {/* 출하의뢰 - 상태 + 번호 + 일자 합침 */}
                  <td style={cellStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                      <StatusBadge status={order.shipmentRequestStatus} />
                      {order.shipmentRequestNo && (
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 500, color: '#374151', fontSize: 12 }}>{order.shipmentRequestNo}</div>
                          {order.shipmentRequestDate && (
                            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                              {toYyyyMmDd(order.shipmentRequestDate)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  {/* 거래명세서 - 상태 + 번호 합침 */}
                  <td style={cellStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                      <StatusBadge status={order.invoiceStatus} />
                      {order.invoiceNo && (
                        <span style={{ color: '#374151', fontSize: 12 }}>{order.invoiceNo}</span>
                      )}
                    </div>
                  </td>
                  {/* 출고 - 상태 */}
                  <td style={{ ...cellStyle, borderRight: 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <StatusBadge status={order.deliveryStatus} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

// 단계별 상세 정보 패널
function StepDetailPanel({
  step,
  customer,
  data,
  salesControlStatus,
  onRefreshSalesControl
}: {
  step: WorkflowStepId
  customer: Customer | null
  data: WorkflowData
  salesControlStatus: SalesControlStatus
  onRefreshSalesControl: () => void
}) {
  const stepConfig = WORKFLOW_STEPS.find(s => s.id === step)
  if (!stepConfig) return null

  const stepData = customer ? (() => {
    switch (step) {
      case 'order-sheet': return data.orderSheet
      case 'unblock': return data.unblock
      case 'order': return data.order
      case 'shipment-request': return data.shipmentRequest
      case 'invoice': return data.invoice
      case 'delivery': return data.delivery
      default: return null
    }
  })() : null

  const Icon = stepConfig.icon

  // 매출통제 상태 배지 렌더링 (수주장 등록 단계에서만)
  const renderSalesControlBadge = () => {
    if (step !== 'order-sheet' || !customer) return null

    if (salesControlStatus.loading) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          background: '#f3f4f6',
          borderRadius: 8,
          fontSize: 12,
          color: '#6b7280'
        }}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          매출통제 확인 중...
        </div>
      )
    }

    if (salesControlStatus.error) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          background: '#fef3c7',
          borderRadius: 8,
          fontSize: 12,
          color: '#b45309',
          cursor: 'pointer'
        }}
        onClick={onRefreshSalesControl}
        title="다시 확인"
        >
          <AlertTriangle size={14} />
          확인 실패 (클릭하여 재시도)
        </div>
      )
    }

    if (!salesControlStatus.checked) return null

    // 매출통제 중 (해제되지 않음)
    if (salesControlStatus.isSalesControlled && !salesControlStatus.isUnblocked) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          background: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          fontSize: 12,
          color: '#dc2626',
          fontWeight: 600
        }}>
          <ShieldAlert size={14} />
          매출통제 중
        </div>
      )
    }

    // 매출통제 해제됨
    if (salesControlStatus.isSalesControlled && salesControlStatus.isUnblocked) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          background: '#fef3c7',
          border: '1px solid #fde68a',
          borderRadius: 8,
          fontSize: 12,
          color: '#b45309',
          fontWeight: 600
        }}>
          <Unlock size={14} />
          해제됨 ({salesControlStatus.unblockUntilDate}까지)
        </div>
      )
    }

    // 정상 (매출통제 없음)
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        background: '#dcfce7',
        border: '1px solid #bbf7d0',
        borderRadius: 8,
        fontSize: 12,
        color: '#16a34a',
        fontWeight: 600
      }}>
        <ShieldCheck size={14} />
        정상
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Step Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        background: stepConfig.bgColor,
        borderBottom: `1px solid ${stepConfig.borderColor}`
      }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: stepConfig.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={20} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
            {stepConfig.label}
          </h3>
          <p style={{ margin: '2px 0 0 0', fontSize: 12, color: stepConfig.color }}>
            {stepConfig.subLabel}{customer ? ` - ${customer.customerName}` : ''}
          </p>
        </div>
        {/* 매출통제 상태 배지 */}
        {renderSalesControlBadge()}
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {!customer ? (
          // 거래처 미선택 시
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: '#9ca3af' }}>
              <Building2 size={48} strokeWidth={1} />
              <p style={{ marginTop: 12, fontSize: 14 }}>거래처를 선택하면 상세 정보가 표시됩니다</p>
            </div>
          </div>
        ) : stepData ? (
          <div>
            {/* 수주장 등록 단계에서 매출통제 상태 상세 표시 */}
            {step === 'order-sheet' && customer && salesControlStatus.checked && (
              <div style={{ marginBottom: 16 }}>
                {/* 매출통제 중인 경우 경고 배너 */}
                {salesControlStatus.isSalesControlled && !salesControlStatus.isUnblocked && (
                  <div style={{
                    padding: 16,
                    background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                    border: '1px solid #fecaca',
                    borderRadius: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: '#dc2626',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <ShieldAlert size={20} color="#fff" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#dc2626' }}>
                          매출통제 중인 거래처입니다
                        </h4>
                        <p style={{ margin: '6px 0 0 0', fontSize: 13, color: '#991b1b', lineHeight: 1.5 }}>
                          해당 거래처는 현재 매출통제 상태입니다.
                          {salesControlStatus.salesControlReason && (
                            <span style={{ display: 'block', marginTop: 4, fontWeight: 600 }}>
                              사유: {salesControlStatus.salesControlReason}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 매출통제 해제된 경우 정보 배너 */}
                {salesControlStatus.isSalesControlled && salesControlStatus.isUnblocked && (
                  <div style={{
                    padding: 16,
                    background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                    border: '1px solid #fde68a',
                    borderRadius: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: '#f59e0b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Unlock size={20} color="#fff" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#b45309' }}>
                          매출통제 임시 해제 중
                        </h4>
                        <p style={{ margin: '6px 0 0 0', fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>
                          해당 거래처는 <strong>{salesControlStatus.unblockUntilDate}</strong>까지 매출통제가 해제되어 있습니다.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 정상인 경우 안내 */}
                {!salesControlStatus.isSalesControlled && (
                  <div style={{
                    padding: 16,
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    border: '1px solid #bbf7d0',
                    borderRadius: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: '#16a34a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <ShieldCheck size={20} color="#fff" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#16a34a' }}>
                          정상 거래처
                        </h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#15803d' }}>
                          매출통제 대상이 아닙니다.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 상태 요약 카드 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginBottom: 20
            }}>
              <div style={{
                padding: 16,
                background: '#f0fdf4',
                borderRadius: 10,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a' }}>완료</div>
                <div style={{ fontSize: 12, color: '#22c55e' }}>상태</div>
              </div>
              <div style={{
                padding: 16,
                background: '#f9fafb',
                borderRadius: 10,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#374151' }}>{stepData.date || '-'}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>처리일</div>
              </div>
              <div style={{
                padding: 16,
                background: '#f9fafb',
                borderRadius: 10,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#374151' }}>#{stepData.id || '-'}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>문서번호</div>
              </div>
            </div>

            {/* 상세 내역 테이블 */}
            <div style={{
              background: '#fff',
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '12px 16px',
                background: '#f9fafb',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <ClipboardList size={16} color="#374151" />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>상세 내역</span>
              </div>
              <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                <FileText size={32} strokeWidth={1} />
                <p style={{ marginTop: 8, fontSize: 13 }}>데이터 테이블 정의 후 구현 예정</p>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* 수주장 등록 단계에서 매출통제 상태 상세 표시 */}
            {step === 'order-sheet' && customer && salesControlStatus.checked && (
              <div style={{ marginBottom: 20 }}>
                {/* 매출통제 중인 경우 경고 배너 */}
                {salesControlStatus.isSalesControlled && !salesControlStatus.isUnblocked && (
                  <div style={{
                    padding: 16,
                    background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                    border: '1px solid #fecaca',
                    borderRadius: 12,
                    marginBottom: 16
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: '#dc2626',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <ShieldAlert size={20} color="#fff" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#dc2626' }}>
                          매출통제 중인 거래처입니다
                        </h4>
                        <p style={{ margin: '6px 0 0 0', fontSize: 13, color: '#991b1b', lineHeight: 1.5 }}>
                          해당 거래처는 현재 매출통제 상태입니다. 수주장 등록 전 매출통제 해제 품의를 진행해 주세요.
                          {salesControlStatus.salesControlReason && (
                            <span style={{ display: 'block', marginTop: 4, fontWeight: 600 }}>
                              사유: {salesControlStatus.salesControlReason}
                            </span>
                          )}
                        </p>
                        <button
                          style={{
                            marginTop: 12,
                            padding: '8px 16px',
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <Unlock size={14} />
                          매출통제 해제 품의
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 매출통제 해제된 경우 정보 배너 */}
                {salesControlStatus.isSalesControlled && salesControlStatus.isUnblocked && (
                  <div style={{
                    padding: 16,
                    background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                    border: '1px solid #fde68a',
                    borderRadius: 12,
                    marginBottom: 16
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: '#f59e0b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Unlock size={20} color="#fff" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#b45309' }}>
                          매출통제 임시 해제 중
                        </h4>
                        <p style={{ margin: '6px 0 0 0', fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>
                          해당 거래처는 <strong>{salesControlStatus.unblockUntilDate}</strong>까지 매출통제가 해제되어 있습니다.
                          해제 기간 내에 수주장을 등록해 주세요.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 정상인 경우 안내 */}
                {!salesControlStatus.isSalesControlled && (
                  <div style={{
                    padding: 16,
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    border: '1px solid #bbf7d0',
                    borderRadius: 12,
                    marginBottom: 16
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: '#16a34a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <ShieldCheck size={20} color="#fff" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#16a34a' }}>
                          정상 거래처
                        </h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#15803d' }}>
                          매출통제 대상이 아닙니다. 수주장을 등록할 수 있습니다.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 수주장 등록 단계: OrderSheetForm 표시 */}
            {step === 'order-sheet' && customer ? (
              <div style={{ flex: 1, minHeight: 0 }}>
                <OrderSheetForm
                  customer={{
                    customerSeq: customer.customerSeq,
                    customerName: customer.customerName,
                    companyType: customer.companyType,
                    companyCode: customer.companyType,
                    addrProvinceName: customer.addrProvinceName,
                    addrCityName: customer.addrCityName,
                  }}
                  onOrderCreated={(orderNo) => {
                    console.log('주문 생성됨:', orderNo)
                  }}
                />
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                  <Icon size={48} strokeWidth={1} />
                  <p style={{ marginTop: 12, fontSize: 14 }}>아직 진행되지 않은 단계입니다</p>
                  <p style={{ fontSize: 12, color: '#d1d5db' }}>이전 단계가 완료되면 진행됩니다</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

