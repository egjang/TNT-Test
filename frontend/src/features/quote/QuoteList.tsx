import React, { useState, useEffect } from 'react'
import { Plus, Search, FileText } from 'lucide-react'

export function QuoteList() {
    const [searchTerm, setSearchTerm] = useState('')
    const [customerSearch, setCustomerSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [quotes, setQuotes] = useState<any[]>([])

    const fetchQuotes = async () => {
        try {
            const params = new URLSearchParams()
            if (searchTerm) params.append('keyword', searchTerm)
            if (customerSearch) params.append('customer', customerSearch)
            if (statusFilter) params.append('status', statusFilter)

            const res = await fetch(`/api/v1/quotes?${params.toString()}`)
            if (res.ok) {
                const data = await res.json()
                setQuotes(data)
            }
        } catch (error) {
            console.error('Failed to fetch quotes:', error)
        }
    }

    useEffect(() => {
        fetchQuotes()
    }, []) // Initial load

    const handleSearch = () => {
        fetchQuotes()
    }

    return (
        <div className="list-view" style={{ padding: 24, height: '100%', overflow: 'auto', background: 'var(--panel)' }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={24} />
                견적 관리
            </h1>

            {/* Search Area */}
            <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8, marginBottom: 16, background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>견적명/견적번호</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="검색어 입력"
                            style={{ width: '100%' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>거래처명</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="거래처명 입력"
                            style={{ width: '100%' }}
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>상태</label>
                        <select
                            className="input"
                            style={{ width: '100%' }}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">전체</option>
                            <option value="DRAFT">작성중</option>
                            <option value="REQ_APPROVAL">승인요청</option>
                            <option value="APPROVED">승인완료</option>
                            <option value="REJECTED">반려</option>
                            <option value="CONFIRMED">확정</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>시작일</label>
                        <input type="date" className="input" style={{ width: '100%' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>종료일</label>
                        <input type="date" className="input" style={{ width: '100%' }} />
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn btn-secondary">초기화</button>
                    <button className="btn btn-primary" onClick={handleSearch}><Search size={14} style={{ marginRight: 4 }} />검색</button>
                </div>
            </div>

            {/* Table Toolbar */}
            <div style={{ padding: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    총 <strong style={{ color: 'var(--text-primary)' }}>{quotes.length}</strong>건
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" onClick={() => window.dispatchEvent(new CustomEvent('tnt.sales.navigate', { detail: { key: 'quote:new' } }))}>
                        <Plus size={14} style={{ marginRight: 4 }} />
                        신규 견적
                    </button>
                </div>
            </div>

            {/* Table */}
            <div style={{ overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-secondary)' }}>
                            <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)', width: 40 }}>
                                <input type="checkbox" />
                            </th>
                            <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>견적번호</th>
                            <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>견적명</th>
                            <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>거래처</th>
                            <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>담당자</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>상태</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>총 금액</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>등록일</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quotes.map((row, idx) => (
                            <tr key={idx} style={{ cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                                    <input type="checkbox" />
                                </td>
                                <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--primary)' }}>{row.quoteId || row.id}</td>
                                <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{row.quoteName}</td>
                                <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{row.customer}</td>
                                <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>{row.salesRep}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: 4,
                                        fontSize: 11,
                                        background: row.status === 'APPROVED' ? 'var(--success)' : row.status === 'REQ_APPROVAL' ? 'var(--warning)' : 'var(--bg-secondary)',
                                        color: row.status === 'APPROVED' ? 'var(--on-accent)' : row.status === 'REQ_APPROVAL' ? '#000' : 'var(--text-secondary)'
                                    }}>{row.status}</span>
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>{row.totalAmount}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{row.date}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div style={{ padding: '16px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
                <button className="btn btn-ghost" style={{ padding: '4px 8px', minWidth: 32 }}>«</button>
                <button className="btn btn-ghost" style={{ padding: '4px 8px', minWidth: 32 }}>‹</button>
                <button className="btn btn-primary" style={{ padding: '4px 8px', minWidth: 32 }}>1</button>
                <button className="btn btn-ghost" style={{ padding: '4px 8px', minWidth: 32 }}>2</button>
                <button className="btn btn-ghost" style={{ padding: '4px 8px', minWidth: 32 }}>›</button>
                <button className="btn btn-ghost" style={{ padding: '4px 8px', minWidth: 32 }}>»</button>
            </div>
        </div>
    )
}
