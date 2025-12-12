import { useState, useEffect } from 'react'
import {
  Search,
  RefreshCw,
  Save,
  CheckCircle,
  Package,
  Calendar,
  Percent,
  AlertCircle,
  ChevronRight,
  Target,
  DollarSign,
  BarChart3,
  ArrowRight,
  TrendingDown,
  ShoppingCart,
  Tag,
  Settings,
  Play
} from 'lucide-react'

// 타입 정의
type ExpiryStock = {
  id: number
  itemSeq: number
  itemNo: string
  itemName: string
  lotNo: string
  whSeq: number
  whName: string
  expDate: string
  remainDay: number
  stockQty: number
  unitPrice: number
  salesMgmtUnit: string
  itemSubcategory: string
}

type PromotionItem = ExpiryStock & {
  selected: boolean
  promoPrice: number | null
  discountRate: number | null
  originalAmt: number
  promoAmt: number
}

type Warehouse = { whSeq: number; whName: string }
type SalesMgmtUnit = { salesMgmtUnit: string }

type PromotionStep = 'select' | 'price' | 'simulate'

type StepConfig = {
  id: PromotionStep
  step: 1 | 2 | 3
  title: string
  subtitle: string
  icon: any
  color: string
  bgColor: string
  borderColor: string
  description: string
}

type ActionConfig = {
  id: string
  label: string
  description: string
  icon: any
  primary?: boolean
  onClick: () => void
  disabled?: boolean
}

const WORKFLOW_STEPS: StepConfig[] = [
  {
    id: 'select',
    step: 1,
    title: '대상 선정',
    subtitle: 'Target Selection',
    icon: Target,
    color: '#3b82f6',
    bgColor: '#eff6ff',
    borderColor: '#93c5fd',
    description: '유통기한 임박 재고에서 프로모션 대상 품목을 선정합니다'
  },
  {
    id: 'price',
    step: 2,
    title: '가격 설정',
    subtitle: 'Price Configuration',
    icon: DollarSign,
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
    borderColor: '#c4b5fd',
    description: '대상 품목의 프로모션 가격과 할인율을 설정합니다'
  },
  {
    id: 'simulate',
    step: 3,
    title: '시뮬레이션',
    subtitle: 'Sales Simulation',
    icon: BarChart3,
    color: '#10b981',
    bgColor: '#ecfdf5',
    borderColor: '#6ee7b7',
    description: '예상 매출과 손익을 분석하고 프로모션을 확정합니다'
  }
]

export default function PromotionPlanning() {
  const [companyType, setCompanyType] = useState<'TNT' | 'DYS'>('TNT')

  // 검색 조건
  const [remainDays, setRemainDays] = useState<number>(60)
  const [selectedWh, setSelectedWh] = useState<string>('')
  const [selectedSalesMgmt, setSelectedSalesMgmt] = useState<string>('')
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [salesMgmtUnits, setSalesMgmtUnits] = useState<SalesMgmtUnit[]>([])

  // 프로모션 데이터
  const [items, setItems] = useState<PromotionItem[]>([])
  const [promoName, setPromoName] = useState('')
  const [promoDescription, setPromoDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [promoId, setPromoId] = useState<number | null>(null)
  const [promoCode, setPromoCode] = useState('')
  const [status, setStatus] = useState('DRAFT')

  // UI 상태
  const [loading, setLoading] = useState(false)
  const [globalDiscountRate, setGlobalDiscountRate] = useState<number>(30)
  const [selectAll, setSelectAll] = useState(true)
  const [activeStep, setActiveStep] = useState<PromotionStep>('select')

  // 초기 데이터 로드
  useEffect(() => {
    fetchWarehouses()
    fetchSalesMgmtUnits()
  }, [companyType])

  const fetchWarehouses = async () => {
    try {
      const res = await fetch(`/api/v1/promotion/warehouses?companyType=${companyType}`)
      const data = await res.json()
      if (data.success) setWarehouses(data.warehouses || [])
    } catch (e) {
      console.error('창고 목록 조회 실패:', e)
    }
  }

  const fetchSalesMgmtUnits = async () => {
    try {
      const res = await fetch(`/api/v1/promotion/sales-mgmt-units?companyType=${companyType}`)
      const data = await res.json()
      if (data.success) setSalesMgmtUnits(data.units || [])
    } catch (e) {
      console.error('영업관리단위 목록 조회 실패:', e)
    }
  }

  // 대상 품목 검색
  const handleSearch = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ companyType, remainDays: remainDays.toString() })
      if (selectedWh) params.append('whSeq', selectedWh)
      if (selectedSalesMgmt) params.append('salesMgmtUnit', selectedSalesMgmt)

      const res = await fetch(`/api/v1/promotion/expiry-stocks?${params}`)
      const data = await res.json()

      if (data.success) {
        const newItems: PromotionItem[] = (data.stocks || []).map((stock: ExpiryStock) => ({
          ...stock,
          selected: true,
          promoPrice: null,
          discountRate: null,
          originalAmt: stock.stockQty * (stock.unitPrice || 0),
          promoAmt: 0,
        }))
        setItems(newItems)
        setSelectAll(true)
      }
    } catch (e) {
      console.error('대상 품목 검색 실패:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setRemainDays(60)
    setSelectedWh('')
    setSelectedSalesMgmt('')
  }

  // 전체 선택/해제
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked)
    setItems(items.map(item => ({ ...item, selected: checked })))
  }

  // 개별 선택
  const handleSelectItem = (index: number, checked: boolean) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], selected: checked }
    setItems(newItems)
  }

  // 전체 할인율 적용
  const applyGlobalDiscount = () => {
    setItems(items.map(item => {
      const promoPrice = item.unitPrice * (1 - globalDiscountRate / 100)
      return {
        ...item,
        discountRate: globalDiscountRate,
        promoPrice,
        promoAmt: item.stockQty * promoPrice,
      }
    }))
  }

  // 개별 품목 프로모션 가격 수정
  const handlePromoPriceChange = (index: number, price: number) => {
    const newItems = [...items]
    const item = newItems[index]
    const discountRate = item.unitPrice > 0 ? ((item.unitPrice - price) / item.unitPrice) * 100 : 0
    newItems[index] = { ...item, promoPrice: price, discountRate, promoAmt: item.stockQty * price }
    setItems(newItems)
  }

  // 시뮬레이션 계산
  const calculateSimulation = () => {
    const selectedItems = items.filter(item => item.selected)
    return {
      totalStockQty: selectedItems.reduce((sum, item) => sum + item.stockQty, 0),
      totalOriginalAmt: selectedItems.reduce((sum, item) => sum + item.originalAmt, 0),
      totalPromoAmt: selectedItems.reduce((sum, item) => sum + item.promoAmt, 0),
      expectedLoss: selectedItems.reduce((sum, item) => sum + item.promoAmt, 0) - selectedItems.reduce((sum, item) => sum + item.originalAmt, 0),
      selectedCount: selectedItems.length,
    }
  }

  // 프로모션 저장
  const handleSave = async () => {
    if (!promoName) {
      alert('프로모션명을 입력해주세요.')
      return
    }
    setLoading(true)
    try {
      const sim = calculateSimulation()
      const payload = {
        id: promoId,
        promoCode,
        promoName,
        companyType,
        discountRate: globalDiscountRate,
        startDate,
        endDate,
        status: 'DRAFT',
        description: promoDescription,
        items,
        totalStockQty: sim.totalStockQty,
        totalOriginalAmt: sim.totalOriginalAmt,
        totalPromoAmt: sim.totalPromoAmt,
        expectedLoss: sim.expectedLoss,
        searchRemainDays: remainDays,
        searchWhSeq: selectedWh ? parseInt(selectedWh) : null,
        searchSalesMgmtUnit: selectedSalesMgmt || null,
      }

      const res = await fetch(`/api/v1/promotion/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (data.success) {
        alert('프로모션이 저장되었습니다.')
        setPromoId(data.promotionId)
        setPromoCode(data.promoCode)
      } else {
        alert('저장 실패: ' + data.error)
      }
    } catch (e) {
      console.error('저장 실패:', e)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 프로모션 확정
  const handleConfirm = async () => {
    if (!promoName) {
      alert('프로모션명을 입력해주세요.')
      return
    }
    if (!startDate || !endDate) {
      alert('프로모션 기간을 설정해주세요.')
      return
    }
    if (!confirm('프로모션을 확정하시겠습니까?')) return

    setLoading(true)
    try {
      const sim = calculateSimulation()
      const payload = {
        id: promoId,
        promoCode,
        promoName,
        companyType,
        discountRate: globalDiscountRate,
        startDate,
        endDate,
        status: 'CONFIRMED',
        description: promoDescription,
        items,
        totalStockQty: sim.totalStockQty,
        totalOriginalAmt: sim.totalOriginalAmt,
        totalPromoAmt: sim.totalPromoAmt,
        expectedLoss: sim.expectedLoss,
        searchRemainDays: remainDays,
        searchWhSeq: selectedWh ? parseInt(selectedWh) : null,
        searchSalesMgmtUnit: selectedSalesMgmt || null,
      }

      const res = await fetch(`/api/v1/promotion/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (data.success) {
        alert('프로모션이 확정되었습니다.')
        setStatus('CONFIRMED')
      } else {
        alert('확정 실패: ' + data.error)
      }
    } catch (e) {
      console.error('확정 실패:', e)
      alert('확정 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const sim = calculateSimulation()

  const getRemainDayStyle = (day: number) => {
    if (day <= 30) return { background: '#fef2f2', color: '#dc2626', border: '#fecaca' }
    if (day <= 60) return { background: '#fffbeb', color: '#d97706', border: '#fcd34d' }
    return { background: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' }
  }

  const currentStepConfig = WORKFLOW_STEPS.find(s => s.id === activeStep)!
  const currentStepIndex = WORKFLOW_STEPS.findIndex(s => s.id === activeStep)

  const canProceedToPrice = sim.selectedCount > 0
  const canProceedToSimulate = sim.totalPromoAmt > 0

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto', background: 'var(--bg)' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Tag size={22} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text)' }}>프로모션 기획</h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                유통기한 임박 재고 기반 프로모션 대상 선정 및 시뮬레이션
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginRight: 4 }}>회사</span>
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 8, padding: 4 }}>
            <button
              onClick={() => setCompanyType('TNT')}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                background: companyType === 'TNT' ? 'var(--primary)' : 'transparent',
                color: companyType === 'TNT' ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}
            >
              TNT
            </button>
            <button
              onClick={() => setCompanyType('DYS')}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                background: companyType === 'DYS' ? 'var(--primary)' : 'transparent',
                color: companyType === 'DYS' ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}
            >
              DYS
            </button>
          </div>
        </div>
      </div>

      {/* Workflow Steps 진행 표시 */}
      <div style={{
        display: 'flex',
        gap: 0,
        marginBottom: 24,
        background: 'var(--bg-secondary)',
        borderRadius: 12,
        padding: 4,
        border: '1px solid var(--border)'
      }}>
        {WORKFLOW_STEPS.map((step, idx) => {
          const isActive = step.id === activeStep
          const isCompleted = idx < currentStepIndex
          const Icon = step.icon

          return (
            <div key={step.id} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <button
                onClick={() => {
                  if (step.id === 'select') setActiveStep('select')
                  else if (step.id === 'price' && canProceedToPrice) setActiveStep('price')
                  else if (step.id === 'simulate' && canProceedToSimulate) setActiveStep('simulate')
                }}
                disabled={
                  (step.id === 'price' && !canProceedToPrice) ||
                  (step.id === 'simulate' && !canProceedToSimulate)
                }
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  border: 'none',
                  borderRadius: 8,
                  cursor: (step.id === 'price' && !canProceedToPrice) || (step.id === 'simulate' && !canProceedToSimulate) ? 'not-allowed' : 'pointer',
                  background: isActive ? step.bgColor : 'transparent',
                  transition: 'all 0.2s',
                  opacity: (step.id === 'price' && !canProceedToPrice) || (step.id === 'simulate' && !canProceedToSimulate) ? 0.5 : 1
                }}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: isActive ? step.color : isCompleted ? '#10b981' : 'var(--bg)',
                  border: isActive ? 'none' : `2px solid ${isCompleted ? '#10b981' : 'var(--border)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}>
                  {isCompleted ? (
                    <CheckCircle size={18} color="white" />
                  ) : (
                    <Icon size={18} color={isActive ? 'white' : 'var(--text-secondary)'} />
                  )}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: isActive ? step.color : isCompleted ? '#10b981' : 'var(--text)'
                  }}>
                    Step {step.step}: {step.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{step.subtitle}</div>
                </div>
                {step.id === 'select' && items.length > 0 && (
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: 11,
                    fontWeight: 600,
                    background: step.color,
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: 10
                  }}>
                    {sim.selectedCount}/{items.length}
                  </span>
                )}
              </button>
              {idx < WORKFLOW_STEPS.length - 1 && (
                <ChevronRight size={20} style={{ color: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step Content Area */}
      <div style={{
        background: 'var(--bg)',
        borderRadius: 12,
        border: `2px solid ${currentStepConfig.borderColor}`,
        overflow: 'hidden'
      }}>
        {/* Step Header */}
        <div style={{
          padding: '16px 20px',
          background: currentStepConfig.bgColor,
          borderBottom: `1px solid ${currentStepConfig.borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: currentStepConfig.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <currentStepConfig.icon size={20} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: currentStepConfig.color }}>
                Step {currentStepConfig.step}: {currentStepConfig.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{currentStepConfig.description}</div>
            </div>
          </div>
          {activeStep === 'select' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-secondary"
                onClick={handleReset}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <RefreshCw size={14} />
                초기화
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSearch}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Search size={14} />
                {loading ? '검색 중...' : '대상 조회'}
              </button>
            </div>
          )}
          {activeStep === 'price' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Settings size={16} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>일괄 할인율</span>
              <select
                className="input"
                value={globalDiscountRate}
                onChange={e => setGlobalDiscountRate(parseInt(e.target.value))}
                style={{ width: 80 }}
              >
                {[10, 20, 30, 40, 50, 60, 70].map(rate => (
                  <option key={rate} value={rate}>{rate}%</option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={applyGlobalDiscount} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Play size={14} />
                전체 적용
              </button>
            </div>
          )}
        </div>

        {/* Step 1: 대상 선정 */}
        {activeStep === 'select' && (
          <>
            {/* 검색 조건 */}
            <div style={{ padding: 16, borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    <Calendar size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    잔여일수
                  </label>
                  <select className="input" value={remainDays} onChange={e => setRemainDays(parseInt(e.target.value))} style={{ width: '100%' }}>
                    <option value={30}>30일 이하</option>
                    <option value={60}>60일 이하</option>
                    <option value={90}>90일 이하</option>
                    <option value={120}>120일 이하</option>
                    <option value={180}>180일 이하</option>
                    <option value={99999}>전체</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    <Package size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    창고
                  </label>
                  <select className="input" value={selectedWh} onChange={e => setSelectedWh(e.target.value)} style={{ width: '100%' }}>
                    <option value="">전체</option>
                    {warehouses.map(wh => (
                      <option key={wh.whSeq} value={wh.whSeq}>{wh.whName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    <ShoppingCart size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    영업관리단위
                  </label>
                  <select className="input" value={selectedSalesMgmt} onChange={e => setSelectedSalesMgmt(e.target.value)} style={{ width: '100%' }}>
                    <option value="">전체</option>
                    {salesMgmtUnits.map(unit => (
                      <option key={unit.salesMgmtUnit} value={unit.salesMgmtUnit}>{unit.salesMgmtUnit}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 테이블 툴바 */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 13 }}>
                  총 <strong style={{ color: 'var(--text)', fontSize: 15 }}>{items.length}</strong>건
                </span>
                <span style={{ color: 'var(--border)' }}>|</span>
                <span style={{ fontSize: 13 }}>
                  선택 <strong style={{ color: currentStepConfig.color, fontSize: 15 }}>{sim.selectedCount}</strong>건
                </span>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setActiveStep('price')}
                disabled={!canProceedToPrice}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                다음: 가격 설정
                <ArrowRight size={14} />
              </button>
            </div>

            {/* 테이블 */}
            <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 500px)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)', width: 40 }}>
                      <input type="checkbox" checked={selectAll} onChange={e => handleSelectAll(e.target.checked)} />
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>품목명</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', width: 100 }}>LOT</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', width: 120 }}>창고</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', width: 80 }}>재고</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)', width: 100 }}>유통기한</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)', width: 80 }}>잔여일수</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', width: 100 }}>단가</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', width: 120 }}>영업관리단위</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const dayStyle = getRemainDayStyle(item.remainDay)
                    return (
                      <tr
                        key={`${item.id}-${idx}`}
                        style={{ opacity: item.selected ? 1 : 0.5 }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                          <input type="checkbox" checked={item.selected} onChange={e => handleSelectItem(idx, e.target.checked)} />
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{item.itemName}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 12 }}>{item.lotNo}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{item.whName}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{item.stockQty?.toLocaleString()}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)', fontSize: 12 }}>{item.expDate}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            background: dayStyle.background,
                            color: dayStyle.color,
                            border: `1px solid ${dayStyle.border}`
                          }}>
                            {item.remainDay}일
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{item.unitPrice?.toLocaleString()}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>{item.salesMgmtUnit}</td>
                      </tr>
                    )
                  })}
                  {items.length === 0 && !loading && (
                    <tr>
                      <td colSpan={9} style={{ padding: '60px 12px', textAlign: 'center' }}>
                        <Package size={48} style={{ color: 'var(--border)', marginBottom: 12 }} />
                        <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                          검색 조건을 설정하고 "대상 조회" 버튼을 클릭하세요.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Step 2: 가격 설정 */}
        {activeStep === 'price' && (
          <>
            {/* 테이블 툴바 */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 13 }}>
                  선택 품목 <strong style={{ color: currentStepConfig.color, fontSize: 15 }}>{sim.selectedCount}</strong>건
                </span>
                <span style={{ color: 'var(--border)' }}>|</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  개별 품목의 프로모션 가격을 직접 수정할 수 있습니다
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => setActiveStep('select')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  ← 이전
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setActiveStep('simulate')}
                  disabled={!canProceedToSimulate}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  다음: 시뮬레이션
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* 가격 설정 테이블 */}
            <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 450px)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>품목명</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', width: 80 }}>재고</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', width: 100 }}>원가(단가)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', width: 120 }}>원가금액</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)', width: 130 }}>프로모션가</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)', width: 80 }}>할인율</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', width: 130 }}>프로모션금액</th>
                  </tr>
                </thead>
                <tbody>
                  {items.filter(item => item.selected).map((item, _idx) => {
                    const originalIdx = items.findIndex(i => i.id === item.id && i.lotNo === item.lotNo)
                    return (
                      <tr
                        key={`price-${item.id}-${item.lotNo}`}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{item.itemName}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{item.stockQty?.toLocaleString()}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{item.unitPrice?.toLocaleString()}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{item.originalAmt?.toLocaleString()}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                          <input
                            type="number"
                            className="input"
                            style={{ width: 100, textAlign: 'right' }}
                            value={item.promoPrice || ''}
                            onChange={e => handlePromoPriceChange(originalIdx, parseFloat(e.target.value) || 0)}
                            placeholder="가격 입력"
                          />
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                          {item.discountRate ? (
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              background: currentStepConfig.bgColor,
                              color: currentStepConfig.color
                            }}>
                              {item.discountRate.toFixed(0)}%
                            </span>
                          ) : '-'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600, color: currentStepConfig.color }}>
                          {item.promoAmt ? item.promoAmt.toLocaleString() : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Step 3: 시뮬레이션 및 확정 */}
        {activeStep === 'simulate' && (
          <>
            {/* 프로모션 정보 입력 */}
            <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Tag size={16} style={{ color: currentStepConfig.color }} />
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>프로모션 정보</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    프로모션명 <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    style={{ width: '100%' }}
                    value={promoName}
                    onChange={e => setPromoName(e.target.value)}
                    placeholder="예: 12월 유통기한 임박 재고 할인전"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    설명
                  </label>
                  <input
                    type="text"
                    className="input"
                    style={{ width: '100%' }}
                    value={promoDescription}
                    onChange={e => setPromoDescription(e.target.value)}
                    placeholder="프로모션 상세 설명"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    <Calendar size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    시작일 <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input type="date" className="input" style={{ width: '100%' }} value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    <Calendar size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    종료일 <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input type="date" className="input" style={{ width: '100%' }} value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>
            </div>

            {/* 시뮬레이션 결과 카드 */}
            <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <BarChart3 size={16} style={{ color: currentStepConfig.color }} />
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>시뮬레이션 결과</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {/* 선택 품목 카드 */}
                <div style={{
                  padding: 20,
                  borderRadius: 12,
                  background: '#eff6ff',
                  border: '1px solid #93c5fd'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Package size={16} style={{ color: '#3b82f6' }} />
                    <span style={{ fontSize: 12, color: '#3b82f6', fontWeight: 500 }}>선택 품목 / 총 수량</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#1e40af' }}>
                    {sim.selectedCount}개
                  </div>
                  <div style={{ fontSize: 13, color: '#3b82f6', marginTop: 4 }}>
                    {sim.totalStockQty.toLocaleString()} EA
                  </div>
                </div>

                {/* 원가 총액 카드 */}
                <div style={{
                  padding: 20,
                  borderRadius: 12,
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <DollarSign size={16} style={{ color: '#6b7280' }} />
                    <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>원가 기준 총액</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#374151' }}>
                    {(sim.totalOriginalAmt / 10000).toFixed(0)}만원
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                    {sim.totalOriginalAmt.toLocaleString()}원
                  </div>
                </div>

                {/* 프로모션 예상 매출 카드 */}
                <div style={{
                  padding: 20,
                  borderRadius: 12,
                  background: '#ecfdf5',
                  border: '1px solid #6ee7b7'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <TrendingDown size={16} style={{ color: '#10b981' }} />
                    <span style={{ fontSize: 12, color: '#10b981', fontWeight: 500 }}>프로모션 예상 매출</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#047857' }}>
                    {(sim.totalPromoAmt / 10000).toFixed(0)}만원
                  </div>
                  <div style={{ fontSize: 13, color: '#10b981', marginTop: 4 }}>
                    {sim.totalPromoAmt.toLocaleString()}원
                  </div>
                </div>

                {/* 예상 손익 카드 */}
                <div style={{
                  padding: 20,
                  borderRadius: 12,
                  background: sim.expectedLoss < 0 ? '#fef2f2' : '#ecfdf5',
                  border: `1px solid ${sim.expectedLoss < 0 ? '#fecaca' : '#6ee7b7'}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <AlertCircle size={16} style={{ color: sim.expectedLoss < 0 ? '#dc2626' : '#10b981' }} />
                    <span style={{ fontSize: 12, color: sim.expectedLoss < 0 ? '#dc2626' : '#10b981', fontWeight: 500 }}>예상 손익</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: sim.expectedLoss < 0 ? '#b91c1c' : '#047857' }}>
                    {(sim.expectedLoss / 10000).toFixed(0)}만원
                  </div>
                  <div style={{ fontSize: 13, color: sim.expectedLoss < 0 ? '#dc2626' : '#10b981', marginTop: 4 }}>
                    {sim.expectedLoss.toLocaleString()}원
                  </div>
                </div>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
              <button className="btn btn-secondary" onClick={() => setActiveStep('price')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                ← 이전
              </button>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleSave}
                  disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Save size={14} />
                  임시저장
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleConfirm}
                  disabled={loading || status === 'CONFIRMED'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: status === 'CONFIRMED' ? '#10b981' : undefined,
                    padding: '10px 24px'
                  }}
                >
                  <CheckCircle size={16} />
                  {status === 'CONFIRMED' ? '확정 완료' : '프로모션 확정'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
