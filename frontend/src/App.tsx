import React, { useState, useEffect, Suspense, lazy } from 'react'
import { ResizableColumns } from './components/ResizableColumns'
import { Menu } from './features/menu/Menu'
import { ThemeToggle } from './ui/ThemeToggle'
import { useIsMobile } from './ui/useIsMobile'
import { ChevronLeft, ChevronRight, Building2 } from 'lucide-react'
import homeImgUrl from './home.jpg'

const MainView = lazy(() => import('./features/main/MainView').then((m) => ({ default: m.MainView })))
const DemandList = lazy(() => import('./features/demand/DemandList').then((m) => ({ default: m.DemandList })))
const VisitPlanPanel = lazy(() => import('./features/customer/VisitPlanPanel').then((m) => ({ default: m.VisitPlanPanel })))
const MissingTransactionsPanel = lazy(() =>
  import('./features/customer/MissingTransactionsPanel').then((m) => ({ default: m.MissingTransactionsPanel }))
)
const MyCustomerAnalysisPanel = lazy(() =>
  import('./features/customer/MyCustomerAnalysisPanel').then((m) => ({ default: m.MyCustomerAnalysisPanel }))
)
const DemandTargetsPanel = lazy(() =>
  import('./features/demand/DemandTargetsPanel').then((m) => ({ default: m.DemandTargetsPanel }))
)
const DemandOwnerStatsPanel = lazy(() =>
  import('./features/demand/DemandOwnerStatsPanel').then((m) => ({ default: m.DemandOwnerStatsPanel }))
)
const LeadRightPanel = lazy(() => import('./features/lead/LeadRightPanel').then((m) => ({ default: m.LeadRightPanel })))
const ChurnRightPanel = lazy(() =>
  import('./features/dashboard/ChurnRightPanel').then((m) => ({ default: m.ChurnRightPanel }))
)
const SalesStrategyPanel = lazy(() =>
  import('./features/sales_dashboard/SalesStrategyPanel').then((m) => ({ default: m.SalesStrategyPanel }))
)
const OrderSheetRightPanel = lazy(() =>
  import('./features/order/OrderSheetRightPanel').then((m) => ({ default: m.OrderSheetRightPanel }))
)
const CustomerC360RightPanel = lazy(() =>
  import('./features/customer/CustomerC360RightPanel').then((m) => ({ default: m.CustomerC360RightPanel }))
)
const InquiryRightPanel = lazy(() =>
  import('./features/inquiry/InquiryRightPanel').then((m) => ({ default: m.InquiryRightPanel }))
)
const SalesAssignTotalsRightPanel = lazy(() =>
  import('./features/sales_assign/SalesAssignTotalsRightPanel').then((m) => ({ default: m.SalesAssignTotalsRightPanel }))
)
const SalesMgmtActivitiesRightPanel = lazy(() =>
  import('./features/sales_mgmt/SalesMgmtActivitiesRightPanel').then((m) => ({ default: m.SalesMgmtActivitiesRightPanel }))
)
const TMMonthlyMatrixPanel = lazy(() =>
  import('./features/lead/TMMonthlyMatrix').then((m) => ({ default: m.TMMonthlyMatrix }))
)
const PromotionPanel = lazy(() =>
  import('./features/inventory/PromotionPanel').then((m) => ({ default: m.PromotionPanel }))
)
const StandardUI = React.lazy(() => import('./features/standard_ui/StandardUI').then(m => ({ default: m.StandardUI })))
const StandardInquiry = React.lazy(() => import('./features/lab/standard_inquiry/StandardInquiry').then(m => ({ default: m.StandardInquiry })))
const StandardUICD1 = React.lazy(() => import('./features/lab/StandardUICD1').then(m => ({ default: m.StandardUICD1 })))
const StandardUICD2 = React.lazy(() => import('./features/lab/StandardUICD2').then(m => ({ default: m.StandardUICD2 })))
const StandardUICD3 = React.lazy(() => import('./features/lab/StandardUICD3').then(m => ({ default: m.StandardUICD3 })))
const StandardNavigation1 = React.lazy(() => import('./features/lab/StandardNavigation1').then(m => ({ default: m.StandardNavigation1 })))
const StandardNavigation2 = React.lazy(() => import('./features/lab/StandardNavigation2').then(m => ({ default: m.StandardNavigation2 })))
const StandardNavigation3 = React.lazy(() => import('./features/lab/StandardNavigation3').then(m => ({ default: m.StandardNavigation3 })))
const StandardC360 = React.lazy(() => import('./features/lab/StandardC360').then(m => ({ default: m.StandardC360 })))
const StandardMap = React.lazy(() => import('./features/lab/StandardMap').then(m => ({ default: m.StandardMap })))
const QuotePage = React.lazy(() => import('./features/lab/quote/QuotePage').then(m => ({ default: m.QuotePage })))
const QuoteList = React.lazy(() => import('./features/quote/QuoteList').then(m => ({ default: m.QuoteList })))
const QuoteForm = React.lazy(() => import('./features/quote/QuoteForm').then(m => ({ default: m.QuoteForm })))
const TNTChatRightPanel = React.lazy(() => import('./features/lab/TNTChatRightPanel').then(m => ({ default: m.TNTChatRightPanel })))

export default function App() {
  // selection key format example: 'calendar', 'demand', 'demand:excel-upload'
  const [selectedKey, setSelectedKey] = useState<string>('calendar')
  const [menuCollapsed, setMenuCollapsed] = useState<boolean>(false)
  const [loggedIn, setLoggedIn] = useState<boolean>(() => {
    try { return !!localStorage.getItem('tnt.sales.empId') } catch { return false }
  })
  const isMobile = useIsMobile(768)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expirySelectionCount, setExpirySelectionCount] = useState(0)
  const leftW = menuCollapsed ? 40 : 220
  const rightW = Math.round(leftW * 2.5)
  const mergeRight = selectedKey === 'sales-plan-new' || selectedKey === 'sales-plan-s' || selectedKey === 'sales-targets'
  const centerFallback = <div className="placeholder">화면을 불러오는 중…</div>
  const panelFallback = <div className="placeholder">패널을 불러오는 중…</div>

  // Global navigation event: allow programmatic screen changes
  useEffect(() => {
    const onNav = (e: any) => {
      const k = e?.detail?.key
      if (typeof k === 'string' && k) setSelectedKey(k)
    }
    window.addEventListener('tnt.sales.navigate' as any, onNav)
    return () => window.removeEventListener('tnt.sales.navigate' as any, onNav)
  }, [])

  // Reflect login state changes to lock/unlock UI panels
  useEffect(() => {
    const onLogin = (e: any) => {
      const v = !!(e?.detail?.loggedIn)
      setLoggedIn(v)
    }
    window.addEventListener('tnt.sales.login.changed' as any, onLogin)
    return () => window.removeEventListener('tnt.sales.login.changed' as any, onLogin)
  }, [])

  // Listen for expiry inventory selection count updates
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

  if (isMobile) {
    return (
      <div className="app-root">
        {/* Mobile top bar */}
        <div className="pane-header" style={{ position: 'sticky', top: 0, zIndex: 20 }}>
          <span
            role="button"
            tabIndex={0}
            className="icon-button"
            onClick={() => setMobileMenuOpen(true)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMobileMenuOpen(true) } }}
            title="메뉴 열기"
            aria-label="메뉴 열기"
            style={{ marginRight: 8 }}
          >
            <ChevronRight className="icon" size={20} />
          </span>
          <Building2 className="icon icon-lg" size={24} />
          <div style={{ marginLeft: 'auto' }}>
            <ThemeToggle />
          </div>
        </div>
        {/* Center content full width */}
        <div className="pane center" style={{ height: '100%', minHeight: 0 }}>
          <Suspense fallback={centerFallback}>
            <MainView selectedKey={selectedKey} />
          </Suspense>
        </div>
        {/* Slide-over drawer for menu */}
        {mobileMenuOpen && (
          <div className="mobile-drawer" role="dialog" aria-modal="true">
            <div className="mobile-drawer-backdrop" onClick={() => setMobileMenuOpen(false)} />
            <div className="mobile-drawer-panel">
              <div className="pane-header" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Building2 className="icon icon-lg" size={24} />
                  <strong>메뉴</strong>
                </div>
                <span
                  role="button"
                  tabIndex={0}
                  className="icon-button"
                  onClick={() => setMobileMenuOpen(false)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMobileMenuOpen(false) } }}
                  title="닫기"
                  aria-label="닫기"
                >
                  <ChevronLeft className="icon" size={20} />
                </span>
              </div>
              <div style={{ padding: 8 }}>
                <Menu
                  selectedKey={selectedKey}
                  onSelect={(k) => { setSelectedKey(k); setMobileMenuOpen(false) }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="app-root">
      <ResizableColumns fixedLeft={leftW} initialLeft={leftW} initialRight={rightW} minLeft={leftW} minRight={220} fixedRight={mergeRight ? 0 : undefined}>
        <div className="pane left">
          <div className="pane-header" style={{ padding: menuCollapsed ? '0 4px' as any : undefined }}>
            {!menuCollapsed && <Building2 className="icon icon-lg" size={24} />}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
              <span
                role="button"
                tabIndex={0}
                className="icon-button"
                onClick={() => setMenuCollapsed(!menuCollapsed)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMenuCollapsed(!menuCollapsed) } }}
                title={menuCollapsed ? '메뉴 펼치기' : '메뉴 숨기기'}
                aria-label={menuCollapsed ? '메뉴 펼치기' : '메뉴 숨기기'}
                style={menuCollapsed ? { width: 28, height: 28 } : undefined}
              >
                {menuCollapsed ? <ChevronRight className="icon" size={20} /> : <ChevronLeft className="icon" size={20} />}
              </span>
              {!menuCollapsed && <ThemeToggle />}
            </div>
          </div>
          {menuCollapsed ? (
            <Menu collapsed selectedKey={selectedKey} onSelect={setSelectedKey} onExpand={() => setMenuCollapsed(false)} disabled={!loggedIn} />
          ) : (
            <Menu selectedKey={selectedKey} onSelect={setSelectedKey} disabled={!loggedIn} />
          )}
        </div>
        <div className="pane center">
          <div className="pane-header" />
          {loggedIn ? (
            <Suspense fallback={centerFallback}>
              {selectedKey === 'demand:list' ? (<DemandList />) :
                selectedKey === 'lab:standard-ui' ? (<StandardUI />) :
                  selectedKey === 'lab:standard-inquiry' ? (<StandardInquiry />) :
                    selectedKey === 'lab:standard-ui-cd1' ? (<StandardUICD1 />) :
                      selectedKey === 'lab:standard-ui-cd2' ? (<StandardUICD2 />) :
                        selectedKey === 'lab:standard-ui-cd3' ? (<StandardUICD3 />) :
                          selectedKey === 'lab:standard-nav1' ? (<StandardNavigation1 />) :
                            selectedKey === 'lab:standard-nav2' ? (<StandardNavigation2 />) :
                              selectedKey === 'lab:standard-nav3' ? (<StandardNavigation3 />) :
                                selectedKey === 'lab:standard-c360' ? (<StandardC360 />) :
                                  selectedKey === 'lab:standard-map' ? (<StandardMap />) :
                                    selectedKey === 'lab:quote' ? (<QuotePage />) :
                                      selectedKey === 'quote' ? (<QuoteList />) :
                                        selectedKey === 'quote:new' ? (<QuoteForm />) :
                                          (<MainView selectedKey={selectedKey} />)}
            </Suspense>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
              <img src={homeImgUrl} alt="home" style={{ maxWidth: '90%', maxHeight: '80%', objectFit: 'contain', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,.15)' }} />
            </div>
          )}
        </div>
        <div className="pane right">
          <div className="pane-header">
            {selectedKey === 'sales-assign' ? '매출 조회' : ''}
          </div>
          {(!loggedIn) ? (
            <div style={{ flex: 1, minHeight: 0 }} />
          ) : mergeRight ? (
            <div className="placeholder">합쳐진 레이아웃 사용 중</div>
          ) : (
            <Suspense fallback={panelFallback}>
              {selectedKey === 'customer:my-activities' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <VisitPlanPanel />
                  </div>
                </div>
              ) : selectedKey === 'customer:list' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
                  <div style={{ height: '50%', minHeight: 0, overflow: 'hidden', borderBottom: '1px solid var(--border)' }}>
                    <MyCustomerAnalysisPanel style={{ height: '100%', overflow: 'auto' }} />
                  </div>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <MissingTransactionsPanel />
                  </div>
                </div>
              ) : selectedKey === 'lead:register' || selectedKey === 'lead' ? (
                <LeadRightPanel />
              ) : selectedKey === 'lead:tm-status' ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <TMMonthlyMatrixPanel />
                  </div>
                </div>
              ) : selectedKey === 'inquiry' ? (
                <InquiryRightPanel />
              ) : selectedKey === 'order-sheet' ? (
                <OrderSheetRightPanel />
              ) : selectedKey === 'customer:c360' ? (
                <CustomerC360RightPanel />
              ) : selectedKey === 'sales-assign' ? (
                // 목표배정: 우측 패널에 총합계만 표시
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
                  <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    <SalesAssignTotalsRightPanel />
                  </div>
                </div>
              ) : selectedKey === 'dashboard' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <ChurnRightPanel />
                  </div>
                </div>
              ) : selectedKey === 'sales-dashboard' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    {/** Sales strategy panel wireframe for 목표Dashboard */}
                    <SalesStrategyPanel />
                  </div>
                </div>
              ) : selectedKey.startsWith('demand') ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
                  <div style={{ height: '50%', minHeight: 0 }}>
                    <DemandTargetsPanel />
                  </div>
                  <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    <DemandOwnerStatsPanel />
                  </div>
                </div>
              ) : selectedKey === 'sales-mgmt:activities' ? (
                <SalesMgmtActivitiesRightPanel />
              ) : selectedKey === 'inventory:expiry-ag' ? (
                <div className="fill">
                  <PromotionPanel selectedItemsCount={expirySelectionCount} onApplyPromotion={handleApplyPromotion} />
                </div>
              ) : selectedKey === 'lab:tnt-chat' ? (
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  <TNTChatRightPanel />
                </div>
              ) : (
                <div className="placeholder">향후 기능을 위해 예약된 영역</div>
              )}
            </Suspense>
          )}
        </div>
      </ResizableColumns>
    </div>
  )
}
