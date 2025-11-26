import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, Calendar, FileText } from 'lucide-react'

type OrderRow = {
  id?: number
  orderTextNo?: string
  customerName?: string
  orderText?: string
  orderRemark?: string
  createdAt?: string
  deliveryDueDate?: string
  companyCode?: string
  salesEmpName?: string
}

export function OrderSheetRightPanel() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Resolve both TNT and DYS emp_seq for current user
  async function resolveMyEmpSeqBoth(): Promise<{ tntEmpSeq: string; dysEmpSeq: string }> {
    try {
      const aid = localStorage.getItem('tnt.sales.assigneeId') || ''
      const eid = localStorage.getItem('tnt.sales.empId') || ''
      const p = new URLSearchParams()
      if (aid) p.set('assigneeId', aid)
      if (eid) p.set('empId', eid)
      const rs = await fetch(`/api/v1/employee/by-assignee?${p.toString()}`, { cache: 'no-store' })
      if (!rs.ok) return { tntEmpSeq: '', dysEmpSeq: '' }
      const j = await rs.json().catch(() => null as any)
      const tntSeq = j?.tnt_emp_seq
      const dysSeq = j?.dys_emp_seq
      return {
        tntEmpSeq: (tntSeq != null && String(tntSeq)) ? String(tntSeq) : '',
        dysEmpSeq: (dysSeq != null && String(dysSeq)) ? String(dysSeq) : ''
      }
    } catch { return { tntEmpSeq: '', dysEmpSeq: '' } }
  }

  // Format date for display
  const formatDateDisplay = (date: Date): string => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const days = ['일', '월', '화', '수', '목', '금', '토']
    const dayName = days[date.getDay()]
    return `${y}.${m}.${d} (${dayName})`
  }

  // Format date for API
  const formatDateApi = (date: Date): string => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}${m}${d}`
  }

  // Check if selected date is today
  const isToday = (): boolean => {
    const today = new Date()
    return selectedDate.toDateString() === today.toDateString()
  }

  // Navigate date
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1)
    } else {
      newDate.setDate(newDate.getDate() + 1)
    }
    setSelectedDate(newDate)
  }

  // Go to today
  const goToToday = () => {
    setSelectedDate(new Date())
  }

  // Load orders for selected date (TNT + DYS for current user)
  async function loadOrders() {
    setLoading(true)
    try {
      const dateStr = formatDateApi(selectedDate)
      // 날짜를 YY-MM-DD 형식으로 변환 (백엔드 API 형식)
      const dateYyMmDd = `${dateStr.slice(2, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`

      // Get both TNT and DYS emp_seq for current user
      const { tntEmpSeq, dysEmpSeq } = await resolveMyEmpSeqBoth()

      const params = new URLSearchParams()
      params.set('company', 'ALL')
      params.set('fromDate', dateYyMmDd)
      params.set('toDate', dateYyMmDd)
      // Pass both emp_seq for filtering
      if (tntEmpSeq) params.set('tntSalesEmpSeq', tntEmpSeq)
      if (dysEmpSeq) params.set('dysSalesEmpSeq', dysEmpSeq)

      const response = await fetch(`/api/v1/orders/external/tsl-order-text?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      let list: OrderRow[] = []

      // Parse the response structure
      if (data?.data?.ROOT?.DataBlock1) {
        list = data.data.ROOT.DataBlock1.map((item: any, idx: number) => ({
          id: idx,
          orderTextNo: item.OrderTextNo || item.orderTextNo,
          customerName: item.CustName || item.custName || item.customerName,
          orderText: item.OrderText || item.orderText,
          orderRemark: item.OrderRemark || item.orderRemark,
          createdAt: item.RegDate || item.regDate || item.createdAt,
          deliveryDueDate: item.DelvDate || item.delvDate || item.deliveryDueDate,
          companyCode: item.CompanyType || item.CompanyCode || item.companyCode || 'TNT',
          salesEmpName: item.SalesEmpName || item.salesEmpName,
        }))
      } else if (Array.isArray(data)) {
        list = data.map((item: any, idx: number) => ({
          id: idx,
          orderTextNo: item.orderTextNo || item.OrderTextNo,
          customerName: item.customerName || item.CustName || item.CustSeq,
          orderText: item.orderText || item.OrderText,
          orderRemark: item.orderRemark || item.OrderRemark,
          createdAt: item.createdAt || item.RegDate,
          deliveryDueDate: item.deliveryDueDate || item.DelvDate,
          companyCode: item.CompanyType || item.companyCode || 'TNT',
          salesEmpName: item.salesEmpName || item.SalesEmpName || item.SalesEmpSeq,
        }))
      }

      setOrders(list)
    } catch (e) {
      console.error('Failed to load orders:', e)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  // Load on mount and date change
  useEffect(() => {
    loadOrders()
  }, [selectedDate])

  // Listen for order created event
  useEffect(() => {
    const handleOrderCreated = () => {
      loadOrders()
    }
    window.addEventListener('tnt.sales.ordersheet.order.created' as any, handleOrderCreated)
    return () => {
      window.removeEventListener('tnt.sales.ordersheet.order.created' as any, handleOrderCreated)
    }
  }, [selectedDate])

  // Toggle expand order details
  const toggleExpand = (id: number | undefined) => {
    if (id === undefined) return
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--panel)' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} />
            <strong style={{ fontSize: 16 }}>내 수주장 등록 현황</strong>
          </div>
          <button
            onClick={loadOrders}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              padding: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              borderRadius: 4,
            }}
            title="새로고침"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Date Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: 'var(--bg-secondary)',
          borderRadius: 8,
          border: '1px solid var(--border)'
        }}>
          <button
            onClick={() => navigateDate('prev')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-primary)',
              borderRadius: 4,
            }}
            title="이전 날짜"
          >
            <ChevronLeft size={20} />
          </button>

          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: isToday() ? 'var(--primary)' : 'var(--text-primary)'
            }}>
              {formatDateDisplay(selectedDate)}
            </div>
            {isToday() && (
              <div style={{ fontSize: 11, color: 'var(--primary)' }}>
                오늘
              </div>
            )}
          </div>

          <button
            onClick={() => navigateDate('next')}
            disabled={isToday()}
            style={{
              background: 'none',
              border: 'none',
              cursor: isToday() ? 'not-allowed' : 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              color: isToday() ? 'var(--text-disabled)' : 'var(--text-primary)',
              borderRadius: 4,
            }}
            title="다음 날짜"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Quick Actions */}
        {!isToday() && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              className="btn btn-secondary"
              onClick={goToToday}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12 }}
            >
              <Calendar size={14} />
              오늘
            </button>
          </div>
        )}
      </div>

      {/* Order Count */}
      <div style={{
        padding: '8px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        fontSize: 13,
        color: 'var(--text-secondary)'
      }}>
        총 <strong style={{ color: 'var(--text-primary)' }}>{orders.length}</strong>건
      </div>

      {/* Order List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>
        {loading ? (
          <div style={{
            padding: 40,
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}>
            <RefreshCw size={24} className="animate-spin" style={{ marginBottom: 8 }} />
            <div>불러오는 중...</div>
          </div>
        ) : orders.length === 0 ? (
          <div style={{
            padding: 40,
            textAlign: 'center',
            color: 'var(--text-secondary)',
            background: 'var(--bg-secondary)',
            borderRadius: 8,
            border: '1px dashed var(--border)'
          }}>
            <FileText size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
            <div style={{ fontSize: 14, fontWeight: 500 }}>등록된 수주장이 없습니다</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              {isToday() ? '오늘 등록된 수주장이 없습니다' : '해당 날짜에 등록된 수주장이 없습니다'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {orders.map((order) => (
              <div
                key={order.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  background: 'var(--panel)',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {/* Order Header */}
                <div
                  onClick={() => toggleExpand(order.id)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: expandedId === order.id ? 'var(--bg-secondary)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {/* Circular T/D badge */}
                      <span style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        background: (order.companyCode === 'DYS' || order.companyCode === 'D') ? '#6366f1' : '#10b981',
                        color: '#fff',
                        flexShrink: 0,
                      }}>
                        {(order.companyCode === 'DYS' || order.companyCode === 'D') ? 'D' : 'T'}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {order.orderTextNo || '-'}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                        {order.customerName || '-'}
                      </span>
                      {order.deliveryDueDate && (
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 4 }}>
                          납품요청일 : {order.deliveryDueDate.length === 8
                            ? `${order.deliveryDueDate.slice(0, 4)}.${order.deliveryDueDate.slice(4, 6)}.${order.deliveryDueDate.slice(6, 8)}`
                            : order.deliveryDueDate}
                        </span>
                      )}
                    </div>
                    <ChevronRight
                      size={16}
                      style={{
                        transform: expandedId === order.id ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        color: 'var(--text-secondary)'
                      }}
                    />
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {order.orderText || '-'}
                  </div>
                </div>

                {/* Order Details (Expanded) */}
                {expandedId === order.id && (
                  <div style={{
                    padding: '12px 16px',
                    borderTop: '1px solid var(--border)',
                    background: 'var(--bg-secondary)',
                    fontSize: 13
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px 12px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>담당자</span>
                      <span>{order.salesEmpName || '-'}</span>

                      <span style={{ color: 'var(--text-secondary)' }}>주문내용</span>
                      <span style={{ whiteSpace: 'pre-wrap' }}>{order.orderText || '-'}</span>

                      {order.orderRemark && (
                        <>
                          <span style={{ color: 'var(--text-secondary)' }}>요청사항</span>
                          <span style={{ whiteSpace: 'pre-wrap' }}>{order.orderRemark}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div style={{
        padding: '8px 20px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        fontSize: 11,
        color: 'var(--text-tertiary)',
        textAlign: 'center'
      }}>
        좌우 화살표로 날짜를 이동할 수 있습니다
      </div>
    </div>
  )
}
