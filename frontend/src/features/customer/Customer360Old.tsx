import React, { useEffect, useMemo, useState } from 'react'
import { SubjectInput } from '../../components/SubjectInput'
import { CustomerTransactions } from './CustomerTransactions'
import { CustomerActivitiesList } from './CustomerActivitiesList'
import { CustomerDemandPivot } from './CustomerDemandPivot'
import { CustomerDemandCharts } from './CustomerDemandCharts'
import { CustomerDemandEntry } from './CustomerDemandEntry'

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

export function Customer360Old() {
  const [ctx, setCtx] = useState<CustomerCtx | null>(() => {
    try {
      const raw = localStorage.getItem('tnt.sales.selectedCustomer')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })
  const [activeTab, setActiveTab] = useState<'transactions' | 'activities' | 'demand'>('transactions')
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

  const customerForm = useMemo(() => {
    if (!ctx) return <div className="empty-state">선택된 거래처가 없습니다.</div>
    return (
      <section className="card compact-form">
        {/* 상단 패널: 기존 C360 화면과 동일 유지 */}
        <div className="form-grid">
          <div className="field">
            <label>거래처번호</label>
            <SubjectInput value={ctx.customerId || ''} readOnly />
          </div>
          <div className="field">
            <label>거래처명</label>
            <SubjectInput value={ctx.customerName || ''} readOnly />
          </div>
          <div className="field">
            <label>정식명</label>
            <SubjectInput value={ctx.customerFullName || ''} readOnly />
          </div>
          <div className="field">
            <label>사업자번호</label>
            <SubjectInput value={ctx.bizNo || ''} readOnly />
          </div>
          <div className="field">
            <label>대표자명</label>
            <SubjectInput value={ctx.ownerName || ''} readOnly />
          </div>
          <div className="field">
            <label>전화번호</label>
            <SubjectInput value={ctx.telNo || ''} readOnly />
          </div>
          <div className="field">
            <label>고객유형</label>
            <SubjectInput value={ctx.customerTypeName || ''} readOnly />
          </div>
          <div className="field">
            <label>시/도</label>
            <SubjectInput value={ctx.addrProvinceName || ''} readOnly />
          </div>
          <div className="field">
            <label>시/군/구</label>
            <SubjectInput value={ctx.addrCityName || ''} readOnly />
          </div>
          <div className="field row-2">
            <label>비고</label>
            <SubjectInput value={ctx.customerRemark || ''} readOnly />
          </div>
        </div>
      </section>
    )
  }, [ctx])

  return (
    <section className="c360">
      {/* 기존 C360과 동일한 레이아웃 */}
      <div className="page-title" />

      {customerForm}

      <section className="card" style={{ marginTop: 12, minHeight: 240 }}>
        <div className="tabs c360-tabs">
          <button className={activeTab === 'transactions' ? 'tab active' : 'tab'} onClick={() => setActiveTab('transactions')}>거래 내역</button>
          <button className={activeTab === 'activities' ? 'tab active' : 'tab'} onClick={() => setActiveTab('activities')}>영업활동</button>
          <button className={activeTab === 'demand' ? 'tab active' : 'tab'} onClick={() => setActiveTab('demand')}>수요정보</button>
        </div>
        <div style={{ marginTop: 12 }}>
          {activeTab === 'transactions' && ctx?.customerSeq != null && (
            <CustomerTransactions customerSeq={ctx.customerSeq} />
          )}
          {activeTab === 'activities' && ctx?.customerSeq != null && (
            <CustomerActivitiesList customerSeq={ctx.customerSeq} customerId={ctx.customerId || ''} hideRefresh enableContextMenu />
          )}
          {activeTab === 'demand' && ctx?.customerName && (
            <>
              <CustomerDemandPivot customerName={ctx.customerName} refreshTick={demandRefresh} />
              <CustomerDemandCharts customerName={ctx.customerName} refreshTick={demandRefresh} />
              <CustomerDemandEntry
                customerName={ctx.customerName}
                customerSeq={ctx.customerSeq as number}
                empSeq={ctx.empSeq as number | undefined}
                empName={ctx.empName || undefined}
                onSuccess={() => setDemandRefresh((v) => v + 1)}
              />
            </>
          )}
          {(!ctx || ctx.customerSeq == null) && (
            <div className="empty-state">탭을 선택하세요</div>
          )}
        </div>
      </section>
    </section>
  )
}

