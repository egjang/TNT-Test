import { flags } from '../../config/flags'
import {
  LayoutDashboard,
  Calendar,
  TrendingUp,
  Target,
  Briefcase,
  UserPlus,
  Users,
  Package,
  Warehouse,
  ShoppingCart,
  HelpCircle,
  FileText,
  AlertCircle,
  FlaskConical,
  CircleDollarSign,
  type LucideIcon,
} from 'lucide-react'

export type MenuItem = {
  key: string
  label: string
  icon?: LucideIcon
  children?: MenuItem[]
  disabled?: boolean
}

// Single source of truth for base (feature‑gated) menu items.
export function getAllMenuItems(): MenuItem[] {
  const items: (MenuItem | null)[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'calendar', label: '일정', icon: Calendar },
    flags.demandManagement
      ? {
        key: 'demand',
        label: '수요관리',
        icon: TrendingUp,
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
        icon: Target,
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
      icon: Briefcase,
      children: [
        { key: 'sales-mgmt:sales', label: '매출관리', disabled: true },
        { key: 'sales-mgmt:receivables', label: '미수관리', disabled: true },
        { key: 'sales-mgmt:activities', label: '활동관리' },
        { key: 'sales-mgmt:activity-plan', label: '활동계획 수립' },
      ],
    },
    // 잠재고객 (1레벨) - 2레벨 구조로 변경
    {
      key: 'lead',
      label: '잠재고객',
      icon: UserPlus,
      children: [
        { key: 'lead:register', label: '잠재고객 등록' },
        { key: 'lead:tm-status', label: 'TM현황' },
      ],
    },
    flags.customerManagement
      ? {
        key: 'customer',
        label: '고객관리',
        icon: Users,
        children: [
          { key: 'customer:c360', label: 'C360' },
          { key: 'customer:my-activities', label: '활동' },
          { key: 'customer:list', label: '거래처 분석' },
          // { key: 'customer:sales-activity-new', label: '영업활동 등록' },
          { key: 'customer:c360-old', label: 'C360 (Old)' },
        ],
      }
      : null,
    // 경쟁사정보 (1레벨)
    {
      key: 'competitor',
      label: '경쟁사정보',
      icon: Users, // Using Users icon as a placeholder, similar to customer
      children: [
        { key: 'competitor:register', label: '경쟁사 등록' },
        { key: 'competitor:trends', label: '경쟁사 동향' },
      ],
    },
    // 1레벨 Item360 메뉴 추가
    { key: 'item360', label: 'Item360', icon: Package },
    // 재고 메뉴
    flags.inventory
      ? {
        key: 'inventory',
        label: '재고',
        icon: Warehouse,
        children: [
          { key: 'inventory:expiry-ag', label: '유통기한재고' },
        ],
      }
      : null,
    {
      key: 'order',
      label: '수주장',
      icon: ShoppingCart,
      children: [
        { key: 'order-list', label: '수주장 조회' },
        { key: 'order-sheet', label: '수주장 등록' },
      ],
    },
    { key: 'inquiry', label: '문의', icon: HelpCircle },
    {
      key: 'sales-receivables',
      label: '매출/채권',
      icon: CircleDollarSign,
      children: [
        { key: 'credit:meetings', label: '채권회의' },
        { key: 'credit:ar-aging', label: '연체채권 현황' },
        { key: 'credit:unblocking', label: '매출통제 해제' },
      ],
    },
    { key: 'estimate', label: '견적', icon: FileText },
    { key: 'complaint', label: 'Complaint', icon: AlertCircle },
    {
      key: 'workspace',
      label: 'Lab',
      icon: FlaskConical,
      children: [
        { key: 'lab:vibe-workspace', label: 'VIBE Workspace' },
        { key: 'lab:unit-analysis', label: '품목단위분석' },
        { key: 'lab:price-sim', label: '판매단가 Sim (직원)' },
        { key: 'lab:price-sim-unit', label: '판매단가 Sim (영업관리단위)' },
        { key: 'lab:price-simulation', label: 'Pricing Agent' },
        { key: 'lab:standard-inquiry', label: 'Standard Inquiry' },
        { key: 'lab:standard-ui', label: 'Standard UI System' },
        { key: 'lab:standard-ui-cd', label: 'Standard UI (CD)' },
      ],
    },
  ]
  return items.filter(Boolean) as MenuItem[]
}
