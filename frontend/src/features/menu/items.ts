import { flags } from '../../config/flags'

export type MenuItem = { key: string; label: string; children?: MenuItem[] }

// Single source of truth for base (feature‑gated) menu items.
export function getAllMenuItems(): MenuItem[] {
  const items: (MenuItem | null)[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'calendar', label: '일정' },
    flags.demandManagement
      ? {
          key: 'demand',
          label: '수요관리',
          children: [
            { key: 'demand:list', label: '수요조회' },
            { key: 'demand:excel-upload', label: 'Excel Upload' },
          ],
        }
      : null,
    flags.demandManagement
      ? {
          key: 'sales-targets',
          label: '영업목표',
          children: [
            { key: 'sales-dashboard', label: '목표Dashboard' },
            { key: 'sales-assign', label: '목표배정' },
            { key: 'sales-plan-new', label: '목표수립' },
            { key: 'sales-plan-s', label: '목표수립(S)' },
            { key: 'sales-plan', label: '목표수립(Old)' },
          ],
        }
      : null,
    // 영업관리 (1레벨) — 영업목표 바로 아래 위치
    {
      key: 'sales-mgmt',
      label: '영업관리',
      children: [
        { key: 'sales-mgmt:sales', label: '매출관리' },
        { key: 'sales-mgmt:receivables', label: '미수관리' },
        { key: 'sales-mgmt:activities', label: '활동관리' },
        { key: 'sales-mgmt:activity-plan', label: '활동계획 수립' },
      ],
    },
    // 잠재고객 (1레벨) - 2레벨 구조로 변경
    {
      key: 'lead',
      label: '잠재고객',
      children: [
        { key: 'lead:register', label: '잠재고객 등록' },
        { key: 'lead:tm-status', label: 'TM현황' },
      ],
    },
    flags.customerManagement
      ? {
          key: 'customer',
          label: '고객관리',
          children: [
            { key: 'customer:c360', label: 'C360' },
            { key: 'customer:my-activities', label: '활동' },
            { key: 'customer:list', label: '거래처 분석' },
            { key: 'customer:sales-activity-new', label: '영업활동 등록' },
            { key: 'customer:c360-old', label: 'C360 (Old)' },
          ],
        }
      : null,
    // 1레벨 Item360 메뉴 추가
    { key: 'item360', label: 'Item360' },
    // 재고 메뉴 (OLD + 유통기간재고)
    {
      key: 'inventory',
      label: '재고',
      children: [
        { key: 'inventory:dex', label: '유통기한재고(DEX)' },
        { key: 'inventory:expiry', label: '유통기간재고' },
        { key: 'inventory:old', label: '재고(OLD)' },
      ],
    },
    {
      key: 'order',
      label: '수주장',
      children: [
        { key: 'order-list', label: '수주장 조회' },
        { key: 'order-sheet', label: '수주장 등록' },
      ],
    },
    { key: 'inquiry', label: '문의' },
    { key: 'estimate', label: '견적' },
    { key: 'complaint', label: 'Complaint' },
  ]
  return items.filter(Boolean) as MenuItem[]
}
