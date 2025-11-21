import React, { useEffect, useMemo, useState } from 'react'
import { SubjectInput } from '../../components/SubjectInput'
import { SalesActivityForm } from './SalesActivityForm'
import { CustomerActivitiesList } from './CustomerActivitiesList'

type CustomerCtx = {
  customerId?: string
  customerName?: string
  customerFullName?: string
  bizNo?: string
  ownerName?: string
  addrProvinceName?: string
  addrCityName?: string
  customerTypeName?: string
  customerRemark?: string
}

export function SalesActivityNew() {
  const [ctx, setCtx] = useState<CustomerCtx | null>(null)
  const [activeTab, setActiveTab] = useState<'form'|'list'>('form')

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
    if (!ctx) return null
    return (
      <section className="card compact-form">
        {/* 제목 라벨 제거 요청 반영: h3 없음 */}
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
    <section style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-title" style={{ alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>영업활동</h2>
        <div className="muted count-text" />
      </div>
      {customerForm}
      {/* Tabs like C360: 영업활동 등록 / 목록 조회 (standardized) */}
      <section className="card sales-activity-panel" style={{ marginTop: 12 }}>
        <div className="tabs c360-tabs">
          <button className={activeTab === 'form' ? 'tab active' : 'tab'} onClick={() => setActiveTab('form')}>영업활동 등록</button>
          <button className={activeTab === 'list' ? 'tab active' : 'tab'} onClick={() => setActiveTab('list')}>영업활동</button>
        </div>
        <div className="sales-activity-content">
          {activeTab === 'form' ? (
            <SalesActivityForm bare />
          ) : (
            <CustomerActivitiesList
              customerSeq={((): number => { try { const raw = localStorage.getItem('tnt.sales.selectedCustomer'); if (raw) { const o = JSON.parse(raw); return Number(o?.customerSeq)||0 } } catch{} return 0 })()}
              customerId={((): string => { try { const raw = localStorage.getItem('tnt.sales.selectedCustomer'); if (raw) { const o = JSON.parse(raw); return String(o?.customerId||'') } } catch{} return '' })()}
              hideRefresh
              enableContextMenu
            />
          )}
        </div>
      </section>
    </section>
  )
}
