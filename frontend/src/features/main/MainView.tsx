import React from 'react'
import { flags } from '../../config/flags'
import { ExcelUpload } from '../demand/ExcelUpload'
import { DemandList } from '../demand/DemandList'
import { SalesTargets } from '../demand/SalesTargets'
import { SalesPlanNew } from '../sales_plan/SalesPlanNew'
import { SalesPlanS } from '../sales_plan/SalesPlanS'
import { SalesPlanOld } from '../sales_plan/SalesPlanOld'
import { CustomerSearch } from '../customer/CustomerSearch'
import { SalesActivityNew } from '../customer/SalesActivityNew'
import { Customer360 } from '../customer/Customer360'
import { ActivityPlan } from '../customer/ActivityPlan'
import { Customer360Old } from '../customer/Customer360Old'
import { CalendarView } from '../calendar/CalendarView'
import { Dashboard } from '../dashboard/Dashboard'
import { MyActivitiesList } from '../customer/MyActivitiesList'
import { Complaint } from '../complaint/Complaint'
import { Inquiry } from '../inquiry/Inquiry'
import { Estimate } from '../estimate/Estimate'
import { Settings } from '../settings/Settings'
import { Lead } from '../lead/Lead'
import { TMStatus } from '../lead/TMStatus'
import { OrderSheet } from '../order/OrderSheet'
import { SalesAssign } from '../sales_assign/SalesAssign'
import { OrderList } from '../order/OrderList'
import { Item360 } from '../item/Item360'
import { SalesDashboard } from '../sales_dashboard/SalesDashboard'
import { SalesMgmtSales } from '../sales_mgmt/SalesMgmtSales'
import { SalesMgmtReceivables } from '../sales_mgmt/SalesMgmtReceivables'
import { SalesMgmtActivities } from '../sales_mgmt/SalesMgmtActivities'
import { InventoryView } from '../inventory/InventoryView'
import { ExpiryStockView } from '../inventory/ExpiryStockView'
import { ExpiryDexView } from '../inventory/ExpiryDexView'

type Props = { selectedKey: string }

export function MainView({ selectedKey }: Props) {
  return (
    <div className="main-view">
      {selectedKey === 'dashboard' ? (
        <Dashboard />
      ) : selectedKey === 'calendar' ? (
        <CalendarView />
      ) : selectedKey === 'demand' && flags.demandManagement ? (
        <section>
          <h1>수요관리</h1>
          <p>여기에서 수요 데이터를 조회/분석/관리하는 기능이 표시됩니다.</p>
          <div className="empty-state">초기 버전: 메인 화면 스켈레톤</div>
        </section>
      ) : selectedKey === 'customer' && flags.customerManagement ? (
        <section>
          <h1>고객관리</h1>
          <p>고객관리 요구사항은 별도로 정의/입력됩니다. 현재는 플레이스홀더입니다.</p>
          <div className="empty-state">초기 버전: 고객관리 화면 스켈레톤</div>
        </section>
      ) : selectedKey === 'customer' && flags.customerManagement ? (
        <section>
          <h1>고객관리</h1>
          <p>고객관리 요구사항은 별도로 정의/입력됩니다. 현재는 플레이스홀더입니다.</p>
          <div className="empty-state">초기 버전: 고객관리 화면 스켈레톤</div>
        </section>
      ) : selectedKey === 'customer:list' && flags.customerManagement ? (
        <CustomerSearch />
      ) : selectedKey === 'customer:sales-activity-new' && flags.customerManagement ? (
        <SalesActivityNew />
      ) : selectedKey === 'customer:c360' && flags.customerManagement ? (
        <Customer360 />
      ) : selectedKey === 'sales-mgmt:activity-plan' ? (
        <ActivityPlan />
      ) : selectedKey === 'customer:c360-old' && flags.customerManagement ? (
        <Customer360Old />
      ) : selectedKey === 'customer:my-activities' && flags.customerManagement ? (
        <MyActivitiesList />
      ) : selectedKey === 'lead:register' || selectedKey === 'lead' ? (
        <Lead />
      ) : selectedKey === 'lead:tm-status' ? (
        <TMStatus />
      ) : selectedKey === 'order-sheet' ? (
        <OrderSheet />
      ) : selectedKey === 'order-list' ? (
        <OrderList />
      ) : selectedKey === 'inquiry' ? (
        <Inquiry />
      ) : selectedKey === 'estimate' ? (
        <Estimate />
      ) : selectedKey === 'item360' ? (
        <Item360 />
      ) : selectedKey === 'inventory' || selectedKey === 'inventory:old' ? (
        <InventoryView />
      ) : selectedKey === 'inventory:expiry' ? (
        <ExpiryStockView />
      ) : selectedKey === 'inventory:dex' ? (
        <ExpiryDexView />
      ) : selectedKey === 'complaint' ? (
        <Complaint />
      ) : selectedKey === 'settings' ? (
        <Settings />
      ) : selectedKey === 'sales-mgmt:sales' ? (
        <SalesMgmtSales />
      ) : selectedKey === 'sales-mgmt:receivables' ? (
        <SalesMgmtReceivables />
      ) : selectedKey === 'sales-mgmt:activities' ? (
        <SalesMgmtActivities />
      ) : selectedKey === 'demand:list' && flags.demandManagement ? (
        <DemandList />
      ) : selectedKey === 'sales-targets' && flags.demandManagement ? (
        // Fallback: route group selects first child (신규 목표수립)
        <SalesPlanNew />
      ) : selectedKey === 'sales-dashboard' && flags.demandManagement ? (
        <SalesDashboard />
      ) : selectedKey === 'sales-assign' && flags.demandManagement ? (
        <SalesAssign />
      ) : selectedKey === 'sales-plan' && flags.demandManagement ? (
        <SalesPlanOld />
      ) : selectedKey === 'sales-plan-new' && flags.demandManagement ? (
        <SalesPlanNew />
      ) : selectedKey === 'sales-plan-s' && flags.demandManagement ? (
        <SalesPlanS />
      ) : selectedKey === 'demand:excel-upload' && flags.demandManagement ? (
        <ExcelUpload />
      ) : (
        <section>
          <h1>{selectedKey}</h1>
          <div className="empty-state">콘텐츠가 준비중입니다.</div>
        </section>
      )}
    </div>
  )
}
