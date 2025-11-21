import React, { useEffect, useMemo, useState } from 'react'
import { CustomerSearch } from './CustomerSearch'
import { CustomerTransactions } from './CustomerTransactions'
import { CustomerActivitiesList } from './CustomerActivitiesList'
import { CustomerDemandPivot } from './CustomerDemandPivot'
import { CustomerDemandCharts } from './CustomerDemandCharts'
import { CustomerDemandEntry } from './CustomerDemandEntry'
import { CustomerSpecialNotes } from './CustomerSpecialNotes'

type CustomerCtx = {
  customerId?: string
  customerSeq?: number
  customerName?: string
  customerFullName?: string
  empSeq?: number
  empName?: string
  bizNo?: string
  ownerName?: string
  telNo?: string
  addrProvinceName?: string
  addrCityName?: string
  customerTypeName?: string
  customerRemark?: string
}

export function Customer360() {
  const [ctx, setCtx] = useState<CustomerCtx | null>(() => {
    try {
      const raw = localStorage.getItem('tnt.sales.selectedCustomer')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })
  const [activeTab, setActiveTab] = useState<'transactions' | 'activities' | 'demand' | 'complaint' | 'special-notes'>('transactions')
  const [demandRefresh, setDemandRefresh] = useState(0)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('tnt.sales.selectedCustomer')
      if (raw) setCtx(JSON.parse(raw))
      else setCtx(null)
    } catch {
      setCtx(null)
    }
  }, [])

  useEffect(() => {
    const onSelected = () => {
      try {
        const raw = localStorage.getItem('tnt.sales.selectedCustomer')
        setCtx(raw ? JSON.parse(raw) : null)
      } catch { setCtx(null) }
    }
    window.addEventListener('tnt.sales.customer.selected', onSelected as any)
    return () => window.removeEventListener('tnt.sales.customer.selected', onSelected as any)
  }, [])

  const customerForm = useMemo(() => {
    // 요청: 상단의 거래처 목록 높이를 내활동 목록 높이(약 32vh)로 제한
    // C360 컨텍스트로 전달하여 우클릭 컨텍스트 메뉴에서 C360 항목을 숨김
    return <CustomerSearch compact maxHeight="32vh" context="c360" />
  }, [])

  const renderTabContent = () => {
    if (!ctx || ctx.customerSeq == null) {
      return <div className="empty-state">거래처를 선택하세요.</div>
    }

    if (activeTab === 'transactions') {
      return <CustomerTransactions customerSeq={ctx.customerSeq} />
    }

    if (activeTab === 'activities') {
      return (
        <CustomerActivitiesList
          customerSeq={ctx.customerSeq}
          customerId={ctx.customerId || ''}
          hideRefresh
          enableContextMenu
        />
      )
    }

    if (activeTab === 'demand') {
      if (!ctx.customerName) {
        return <div className="empty-state">수요정보를 보려면 거래처명을 확인하세요.</div>
      }
      return (
        <div className="c360-demand-stack">
          <CustomerDemandPivot customerName={ctx.customerName} refreshTick={demandRefresh} />
          <CustomerDemandCharts customerName={ctx.customerName} refreshTick={demandRefresh} />
          <CustomerDemandEntry
            customerName={ctx.customerName}
            customerSeq={ctx.customerSeq}
            empSeq={ctx.empSeq as number | undefined}
            empName={ctx.empName || undefined}
            onSuccess={() => setDemandRefresh((v) => v + 1)}
          />
        </div>
      )
    }

    if (activeTab === 'special-notes') {
      return (
        <CustomerSpecialNotes
          customerSeq={ctx.customerSeq}
          customerId={ctx.customerId}
          empName={ctx.empName}
        />
      )
    }

    if (activeTab === 'complaint') {
      return (
        <div className="card" style={{ padding: 12 }}>
          <div className="muted">Complaint 기능은 추후 제공될 예정입니다.</div>
        </div>
      )
    }

    return null
  }

  return (
    <section className="c360">
      {customerForm}

      <section className="card c360-panel" style={{ marginTop: 12, minHeight: 240 }}>
        <div className="tabs c360-tabs">
          <button className={activeTab === 'transactions' ? 'tab active' : 'tab'} onClick={() => setActiveTab('transactions')}>거래 내역</button>
          <button className={activeTab === 'activities' ? 'tab active' : 'tab'} onClick={() => setActiveTab('activities')}>영업활동</button>
          <button className={activeTab === 'demand' ? 'tab active' : 'tab'} onClick={() => setActiveTab('demand')}>수요정보</button>
          <button className={activeTab === 'special-notes' ? 'tab active' : 'tab'} onClick={() => setActiveTab('special-notes')}>특이사항</button>
          <button className={activeTab === 'complaint' ? 'tab active' : 'tab'} onClick={() => setActiveTab('complaint')}>Complaint</button>
        </div>
        <div className={`c360-tab-panel-wrapper ${activeTab === 'demand' ? 'c360-demand-scroll' : ''}`}>
          <div className="c360-tab-panel">
            {renderTabContent()}
          </div>
        </div>
      </section>
    </section>
  )
}
