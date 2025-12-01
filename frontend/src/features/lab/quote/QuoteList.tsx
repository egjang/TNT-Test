import React, { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Loader2 } from 'lucide-react'
import {
    QuoteSummary,
    QuoteStatus,
    RecordType,
    CompanyType,
    QuoteSearchParams,
    QUOTE_STATUS_STYLE,
    RECORD_TYPE_LABEL,
    COMPANY_TYPE_LABEL,
    formatCurrency,
    formatPercent
} from './types'
import { fetchQuotes } from './api'

interface QuoteListProps {
    onCreate: () => void
    onView: (quoteId: string) => void
}

export function QuoteList({ onCreate, onView }: QuoteListProps) {
    // 검색 조건
    const [searchParams, setSearchParams] = useState<QuoteSearchParams>({})
    const [currentPage, setCurrentPage] = useState(1)
    const [quotes, setQuotes] = useState<QuoteSummary[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const pageSize = 10

    // API 호출
    const loadQuotes = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await fetchQuotes(searchParams)
            setQuotes(data)
        } catch (err) {
            setError('견적 목록을 불러오는데 실패했습니다.')
            console.error('Failed to fetch quotes:', err)
        } finally {
            setLoading(false)
        }
    }, [searchParams])

    // 컴포넌트 마운트 시 데이터 로드
    useEffect(() => {
        loadQuotes()
    }, [])

    const totalCount = quotes.length
    const totalPages = Math.ceil(totalCount / pageSize) || 1
    const paginatedQuotes = quotes.slice((currentPage - 1) * pageSize, currentPage * pageSize)

    // 검색 초기화
    const handleReset = () => {
        setSearchParams({})
        setCurrentPage(1)
    }

    // 검색 실행
    const handleSearch = () => {
        setCurrentPage(1)
        loadQuotes()
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* 검색 조건 영역 - Standard UI 2 List View */}
            <div style={{ padding: 16, borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>회사구분</label>
                        <select
                            className="input"
                            style={{ width: '100%' }}
                            value={searchParams.companyType || ''}
                            onChange={(e) => setSearchParams({ ...searchParams, companyType: e.target.value as CompanyType || undefined })}
                        >
                            <option value="">전체</option>
                            <option value="TNT">TNT</option>
                            <option value="DYS">동양</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>견적상태</label>
                        <select
                            className="input"
                            style={{ width: '100%' }}
                            value={searchParams.quoteStatus || ''}
                            onChange={(e) => setSearchParams({ ...searchParams, quoteStatus: e.target.value as QuoteStatus || undefined })}
                        >
                            <option value="">전체</option>
                            <option value="DRAFT">작성중</option>
                            <option value="REQ_APPROVAL">승인요청</option>
                            <option value="APPROVED">승인완료</option>
                            <option value="NEGOTIATION">협의중</option>
                            <option value="CONFIRMED">확정</option>
                            <option value="REJECTED">반려</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>레코드유형</label>
                        <select
                            className="input"
                            style={{ width: '100%' }}
                            value={searchParams.recordType || ''}
                            onChange={(e) => setSearchParams({ ...searchParams, recordType: e.target.value as RecordType || undefined })}
                        >
                            <option value="">전체</option>
                            <option value="TNT_DOUBLE">TNT 복층</option>
                            <option value="TNT_MAT">TNT 자재</option>
                            <option value="DYS_SEALANT">DYS 실란트</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>견적명</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="견적명 검색"
                            style={{ width: '100%' }}
                            value={searchParams.quoteName || ''}
                            onChange={(e) => setSearchParams({ ...searchParams, quoteName: e.target.value || undefined })}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn btn-secondary" onClick={handleReset}>초기화</button>
                    <button className="btn btn-primary" onClick={handleSearch}>
                        <Search size={14} style={{ marginRight: 4 }} />
                        검색
                    </button>
                </div>
            </div>

            {/* 테이블 툴바 - Standard UI 2 */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    총 <strong style={{ color: 'var(--text-primary)' }}>{totalCount}</strong>건
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary">Excel</button>
                    <button className="btn btn-primary" onClick={onCreate}>
                        <Plus size={14} style={{ marginRight: 4 }} />
                        견적 작성
                    </button>
                </div>
            </div>

            {/* 테이블 */}
            <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 0, border: 'none' }}>
                <div style={{ overflow: 'auto', flex: 1 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'var(--panel)', zIndex: 1 }}>
                            <tr style={{ background: 'var(--bg-secondary)' }}>
                                <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)', width: 40 }}>
                                    <input type="checkbox" />
                                </th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>견적번호</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)', width: 60 }}>회사</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>상태</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>견적명</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>거래처</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>프로젝트</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', width: 100 }}>구분</th>
                                <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>총 견적금액</th>
                                <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', width: 80 }}>이익률</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)', width: 100 }}>등록일</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)', width: 80 }}>담당자</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedQuotes.map((quote) => {
                                const statusStyle = QUOTE_STATUS_STYLE[quote.quoteStatus]
                                return (
                                    <tr
                                        key={quote.id}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => onView(quote.quoteId)}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
                                            <input type="checkbox" />
                                        </td>
                                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontVariantNumeric: 'tabular-nums', color: 'var(--primary)', fontWeight: 500 }}>
                                            {quote.quoteId}
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                                            <span style={{
                                                padding: '2px 6px',
                                                borderRadius: 4,
                                                fontSize: 11,
                                                background: quote.companyType === 'TNT' ? 'var(--primary-bg)' : 'var(--warning-bg)',
                                                color: quote.companyType === 'TNT' ? 'var(--primary)' : 'var(--warning)'
                                            }}>
                                                {COMPANY_TYPE_LABEL[quote.companyType]}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                                            <span className="badge" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                                                {statusStyle.label}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>
                                            {quote.quoteName}
                                        </td>
                                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                                            {quote.accountNames || '-'}
                                        </td>
                                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                            {quote.projectName || '-'}
                                        </td>
                                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                            {RECORD_TYPE_LABEL[quote.recordType]}
                                        </td>
                                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                            {formatCurrency(quote.totalAmount)}
                                        </td>
                                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                            <span style={{
                                                color: (quote.expectedProfitRate || 0) >= 15 ? 'var(--success)' :
                                                    (quote.expectedProfitRate || 0) < 5 ? 'var(--error)' : 'inherit'
                                            }}>
                                                {formatPercent(quote.expectedProfitRate)}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                            {quote.createdAt}
                                        </td>
                                        <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                                            {quote.assigneeName || '-'}
                                        </td>
                                    </tr>
                                )
                            })}
                            {loading && (
                                <tr>
                                    <td colSpan={12} style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} />
                                        <div style={{ marginTop: 8 }}>로딩 중...</div>
                                    </td>
                                </tr>
                            )}
                            {!loading && error && (
                                <tr>
                                    <td colSpan={12} style={{ padding: 40, textAlign: 'center', color: 'var(--error)' }}>
                                        {error}
                                    </td>
                                </tr>
                            )}
                            {!loading && !error && paginatedQuotes.length === 0 && (
                                <tr>
                                    <td colSpan={12} style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        검색 결과가 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 페이지네이션 - Standard UI 2 */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
                    <button
                        className="btn btn-ghost"
                        style={{ padding: '4px 8px', minWidth: 32 }}
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(1)}
                    >
                        «
                    </button>
                    <button
                        className="btn btn-ghost"
                        style={{ padding: '4px 8px', minWidth: 32 }}
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    >
                        ‹
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i
                        if (pageNum > totalPages) return null
                        return (
                            <button
                                key={pageNum}
                                className={`btn ${currentPage === pageNum ? 'btn-primary' : 'btn-ghost'}`}
                                style={{ padding: '4px 8px', minWidth: 32 }}
                                onClick={() => setCurrentPage(pageNum)}
                            >
                                {pageNum}
                            </button>
                        )
                    })}
                    <button
                        className="btn btn-ghost"
                        style={{ padding: '4px 8px', minWidth: 32 }}
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    >
                        ›
                    </button>
                    <button
                        className="btn btn-ghost"
                        style={{ padding: '4px 8px', minWidth: 32 }}
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                    >
                        »
                    </button>
                </div>
            </div>
        </div>
    )
}
