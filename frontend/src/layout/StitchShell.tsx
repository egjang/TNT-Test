import React, { useEffect, useState } from 'react'
import { Menu } from '../features/menu/Menu'
import { MainView } from '../features/main/MainView'
import { VisitPlanPanel } from '../features/customer/VisitPlanPanel'
import { MissingTransactionsPanel } from '../features/customer/MissingTransactionsPanel'
import { DemandTargetsPanel } from '../features/demand/DemandTargetsPanel'
import { InventoryResultPanel } from '../features/inventory/InventoryResultPanel'
import { PromotionPanel } from '../features/inventory/PromotionPanel'

type Props = {
  selectedKey: string
  onSelect: (key: string) => void
}

export function StitchShell({ selectedKey, onSelect }: Props) {
  const [expirySelectionCount, setExpirySelectionCount] = useState(0)

  // Debug logging
  useEffect(() => {
    console.log('[StitchShell] selectedKey:', selectedKey)
    console.log('[StitchShell] is inventory:expiry-ag?', selectedKey === 'inventory:expiry-ag')
  }, [selectedKey])

  useEffect(() => {
    const handler = (event: CustomEvent<{ count?: number }>) => {
      const count = Number(event.detail?.count ?? 0)
      setExpirySelectionCount(Number.isFinite(count) ? count : 0)
    }

    window.addEventListener('tnt.inventory.expiry.selection', handler as EventListener)
    return () => window.removeEventListener('tnt.inventory.expiry.selection', handler as EventListener)
  }, [])

  const handleApplyPromotion = (promotionId: number) => {
    try {
      window.dispatchEvent(
        new CustomEvent('tnt.inventory.apply-promotion', {
          detail: { promotionId },
        })
      )
    } catch (err) {
      console.error('프로모션 적용 이벤트 전파 실패:', err)
    }
  }

  return (
    <div className="stitch-shell">
      <aside className="stitch-aside">
        <div className="stitch-aside-header">
          <div className="title">업무용 앱</div>
          <div className="subtitle">팀 협업 및 문서 관리</div>
        </div>
        <div className="stitch-aside-menu">
          <Menu selectedKey={selectedKey} onSelect={onSelect} />
        </div>
      </aside>
      <main className="stitch-main">
        <div className="stitch-main-header">업무</div>
        <div className="stitch-main-toolbar">
          <div className="search-wrap">
            <span className="material-symbols-outlined icon">search</span>
            <input className="search-input" placeholder="검색" />
          </div>
          <div className="tabs-wrap">
            <a className="tab">모두</a>
            <a className="tab active">내 노트북</a>
            <a className="tab">팀 노트북</a>
          </div>
        </div>
        <div className="stitch-main-body">
          <MainView selectedKey={selectedKey} />
        </div>
      </main>
      <section className="stitch-right">
        <div className="stitch-right-header">우측 패널</div>
        <div className="stitch-right-body">
          {selectedKey === 'customer:my-activities' ? (
            <div className="fill">
              <VisitPlanPanel />
            </div>
          ) : selectedKey === 'customer:list' ? (
            <div className="fill">
              <MissingTransactionsPanel />
            </div>
          ) : selectedKey.startsWith('demand') ? (
            <div className="fill">
              <DemandTargetsPanel />
            </div>
          ) : selectedKey === 'inventory:expiry-ag' ? (
            <div className="fill">
              <PromotionPanel selectedItemsCount={expirySelectionCount} onApplyPromotion={handleApplyPromotion} />
            </div>
          ) : selectedKey === 'inventory' || selectedKey.includes('재고') ? (
            <div className="fill">
              <InventoryResultPanel />
            </div>
          ) : (
            <div className="placeholder">
              향후 기능을 위해 예약된 영역
              <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>현재 selectedKey: {selectedKey}</div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
