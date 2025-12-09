import { createContext, useContext, useState, ReactNode } from 'react'

// AR Aging Item 타입 정의
export type SelectedCustomer = {
  customerSeq?: number
  customerCode?: string
  customerName?: string
  companyType?: string
  salesRep?: string
  department?: string
  totalAr?: number
  overdue?: number
  aging030?: number
  aging3160?: number
  aging6190?: number
  aging91120?: number
  aging121150?: number
  aging151180?: number
  aging181210?: number
  aging211240?: number
  aging241270?: number
  aging271300?: number
  aging301330?: number
  aging331365?: number
  agingOver365?: number
  riskLevel?: string
  meetingCustomerId?: number  // credit_meeting_customer.id (회의 내에서 선택된 거래처 ID)
}

type CreditWorkflowContextType = {
  selectedCustomer: SelectedCustomer | null
  setSelectedCustomer: (customer: SelectedCustomer | null) => void
  meetingDate: string | null
  setMeetingDate: (date: string | null) => void
  meetingId: number | null
  setMeetingId: (id: number | null) => void
  meetingStatus: string | null
  setMeetingStatus: (status: string | null) => void
  opinionRefreshTrigger: number
  triggerOpinionRefresh: () => void
}

const CreditWorkflowContext = createContext<CreditWorkflowContextType | undefined>(undefined)

export function CreditWorkflowProvider({ children }: { children: ReactNode }) {
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null)
  const [meetingDate, setMeetingDate] = useState<string | null>(null)
  const [meetingId, setMeetingId] = useState<number | null>(null)
  const [meetingStatus, setMeetingStatus] = useState<string | null>(null)
  const [opinionRefreshTrigger, setOpinionRefreshTrigger] = useState(0)

  const triggerOpinionRefresh = () => {
    setOpinionRefreshTrigger(prev => prev + 1)
  }

  return (
    <CreditWorkflowContext.Provider value={{ selectedCustomer, setSelectedCustomer, meetingDate, setMeetingDate, meetingId, setMeetingId, meetingStatus, setMeetingStatus, opinionRefreshTrigger, triggerOpinionRefresh }}>
      {children}
    </CreditWorkflowContext.Provider>
  )
}

export function useCreditWorkflow() {
  const context = useContext(CreditWorkflowContext)
  if (context === undefined) {
    throw new Error('useCreditWorkflow must be used within a CreditWorkflowProvider')
  }
  return context
}
