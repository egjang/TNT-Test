// Quote API 클라이언트
import { QuoteSummary, Quote, QuoteSearchParams, CompanyType } from './types'

const API_BASE = '/api/v1/quotes'

// 견적 목록 조회
export async function fetchQuotes(params: QuoteSearchParams): Promise<QuoteSummary[]> {
    const searchParams = new URLSearchParams()
    if (params.startDate) searchParams.append('startDate', params.startDate)
    if (params.endDate) searchParams.append('endDate', params.endDate)
    if (params.quoteStatus) searchParams.append('status', params.quoteStatus)
    if (params.quoteName || params.quoteId) searchParams.append('keyword', params.quoteName || params.quoteId || '')
    if (params.accountId) searchParams.append('customer', params.accountId)

    const response = await fetch(`${API_BASE}?${searchParams}`)
    if (!response.ok) throw new Error('Failed to fetch quotes')
    return response.json()
}

// 견적 상세 조회
export async function fetchQuote(id: string): Promise<Quote> {
    const response = await fetch(`${API_BASE}/${id}`)
    if (!response.ok) throw new Error('Failed to fetch quote')
    return response.json()
}

// 견적 생성
export async function createQuote(quoteData: Partial<Quote>): Promise<Quote> {
    const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteData)
    })
    if (!response.ok) throw new Error('Failed to create quote')
    return response.json()
}

// 견적 수정
export async function updateQuote(id: string, quoteData: Partial<Quote>): Promise<Quote> {
    const response = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteData)
    })
    if (!response.ok) throw new Error('Failed to update quote')
    return response.json()
}

// 승인 요청
export async function requestApproval(id: string): Promise<Quote> {
    const response = await fetch(`${API_BASE}/${id}/approval`, {
        method: 'POST'
    })
    if (!response.ok) throw new Error('Failed to request approval')
    return response.json()
}

// 마스터 데이터: 고객 목록 조회
export interface CustomerOption {
    customerId: string
    customerName: string
    region?: string
}

export async function fetchCustomers(companyType: CompanyType = 'TNT', keyword?: string): Promise<CustomerOption[]> {
    const params = new URLSearchParams({ companyType })
    if (keyword) params.append('keyword', keyword)

    const response = await fetch(`${API_BASE}/master/customers?${params}`)
    if (!response.ok) throw new Error('Failed to fetch customers')
    return response.json()
}

// 마스터 데이터: 품목 목록 조회
export interface ItemOption {
    itemNo: string
    itemName: string
    category?: string
    unit?: string
    listPrice?: number
}

export async function fetchItems(companyType: CompanyType = 'TNT', keyword?: string): Promise<ItemOption[]> {
    const params = new URLSearchParams({ companyType })
    if (keyword) params.append('keyword', keyword)

    const response = await fetch(`${API_BASE}/master/items?${params}`)
    if (!response.ok) throw new Error('Failed to fetch items')
    return response.json()
}

// 마스터 데이터: 프로젝트 목록 조회
export interface ProjectOption {
    projectId: string
    projectName: string
}

export async function fetchProjects(companyType: CompanyType = 'TNT', keyword?: string): Promise<ProjectOption[]> {
    const params = new URLSearchParams({ companyType })
    if (keyword) params.append('keyword', keyword)

    const response = await fetch(`${API_BASE}/master/projects?${params}`)
    if (!response.ok) throw new Error('Failed to fetch projects')
    return response.json()
}
