// DDL 기반 타입 정의 (quote, quote_customer, quote_item, project 테이블 참조)

// 회사구분
export type CompanyType = 'TNT' | 'DYS'

// 레코드 유형
export type RecordType = 'TNT_DOUBLE' | 'TNT_MAT' | 'DYS_SEALANT'

// 견적 상태
export type QuoteStatus = 'DRAFT' | 'REQ_APPROVAL' | 'APPROVED' | 'NEGOTIATION' | 'CONFIRMED' | 'REJECTED'

// 결재 규칙
export type ApprovalRule = 'AUTO' | 'TIER_AB' | 'LOSS'

// 참조 티어
export type RefTier = 'A' | 'B' | 'C' | 'D' | 'E'

// 프로젝트 상태
export type ProjectStatus = 'ACTIVE' | 'CLOSED' | 'CANCELLED'

// 프로젝트 (project 테이블)
export interface Project {
    id: number
    projectId: string           // 프로젝트 ID (예: PRJ-2024-001)
    projectName: string         // 프로젝트명
    companyType: CompanyType    // 회사구분
    description?: string        // 프로젝트 설명
    startDate?: string          // 시작일
    endDate?: string            // 종료일
    projectStatus: ProjectStatus // 프로젝트 상태
    createdBy?: string
    updatedBy?: string
    createdAt: string
    updatedAt: string
}

// 견적 마스터 (quote 테이블)
export interface Quote {
    id: number
    quoteId: string             // 견적번호 (예: 20241011001)
    companyType: CompanyType    // 회사구분
    quoteName: string           // 견적명
    projectId?: string          // 프로젝트 ID (FK)
    assigneeId: string          // 담당자 ID
    recordType: RecordType      // 레코드 유형
    quoteStatus: QuoteStatus    // 견적 상태
    approvalRule?: ApprovalRule // 결재 규칙
    totalAmount?: number        // 총 합계
    totalCost?: number          // 총 원가
    expectedProfitRate?: number // 예상 이익률
    erpSyncYn: 'Y' | 'N'        // ERP 동기화 여부
    createdBy?: string
    updatedBy?: string
    createdAt: string
    updatedAt: string
    // 조인 데이터
    customers?: QuoteCustomer[]
    project?: Project
    assigneeName?: string       // 담당자명 (조인)
}

// 견적 거래처 (quote_customer 테이블)
export interface QuoteCustomer {
    id: number
    quoteId: string             // 견적번호 (FK)
    accountId: string           // 거래처 ID
    subtotalAmount?: number     // 소계
    subtotalCost?: number       // 원가 소계
    subtotalProfitRate?: number // 이익률 소계
    remark?: string             // 비고
    createdBy?: string
    updatedBy?: string
    createdAt: string
    updatedAt: string
    // 조인 데이터
    accountName?: string        // 거래처명 (조인)
    items?: QuoteItem[]
}

// 견적 품목 (quote_item 테이블)
export interface QuoteItem {
    id: number
    itemId: string              // 품목 고유 ID (UUID)
    quoteCustomerId: number     // 견적 거래처 ID (FK)
    itemNo: string              // 품목 번호
    quantity: number            // 수량
    unitPrice: number           // 단가
    refTier?: RefTier           // 참조 티어
    refCost?: number            // 참조 원가
    refIndividualAvg?: number   // 참조 개별 평균가
    rowProfitRate?: number      // 행 이익률
    remark?: string             // 비고
    createdBy?: string
    updatedBy?: string
    createdAt: string
    updatedAt: string
    // 조인 데이터
    itemName?: string           // 품목명 (조인)
    amount?: number             // 금액 (계산: quantity * unitPrice)
}

// 검색 파라미터
export interface QuoteSearchParams {
    companyType?: CompanyType
    quoteStatus?: QuoteStatus
    recordType?: RecordType
    assigneeId?: string
    accountId?: string
    projectId?: string
    quoteName?: string
    quoteId?: string
    startDate?: string
    endDate?: string
}

// 목록 조회용 견적 요약
export interface QuoteSummary {
    id: number
    quoteId: string
    companyType: CompanyType
    quoteName: string
    recordType: RecordType
    quoteStatus: QuoteStatus
    totalAmount?: number
    expectedProfitRate?: number
    assigneeName?: string
    accountNames?: string       // 대표 거래처명 (복수시 외 N건)
    projectName?: string
    createdAt: string
}

// 상태 배지 스타일
export const QUOTE_STATUS_STYLE: Record<QuoteStatus, { bg: string; color: string; label: string }> = {
    DRAFT: { bg: 'var(--bg-secondary)', color: 'var(--text-secondary)', label: '작성중' },
    REQ_APPROVAL: { bg: 'var(--warning-bg)', color: 'var(--warning)', label: '승인요청' },
    APPROVED: { bg: 'var(--info-bg)', color: 'var(--info)', label: '승인완료' },
    NEGOTIATION: { bg: 'var(--primary-bg)', color: 'var(--primary)', label: '협의중' },
    CONFIRMED: { bg: 'var(--success-bg)', color: 'var(--success)', label: '확정' },
    REJECTED: { bg: 'var(--error-bg)', color: 'var(--error)', label: '반려' }
}

// 레코드 유형 라벨
export const RECORD_TYPE_LABEL: Record<RecordType, string> = {
    TNT_DOUBLE: 'TNT 복층',
    TNT_MAT: 'TNT 자재',
    DYS_SEALANT: 'DYS 실란트'
}

// 회사 유형 라벨
export const COMPANY_TYPE_LABEL: Record<CompanyType, string> = {
    TNT: 'TNT',
    DYS: '동양'
}

// 결재 규칙 라벨
export const APPROVAL_RULE_LABEL: Record<ApprovalRule, string> = {
    AUTO: '자동승인',
    TIER_AB: 'A/B티어 승인',
    LOSS: '손실 승인'
}

// 금액 포맷
export const formatCurrency = (value?: number): string => {
    if (value === undefined || value === null) return '-'
    return new Intl.NumberFormat('ko-KR').format(value) + '원'
}

// 퍼센트 포맷
export const formatPercent = (value?: number): string => {
    if (value === undefined || value === null) return '-'
    return value.toFixed(1) + '%'
}
