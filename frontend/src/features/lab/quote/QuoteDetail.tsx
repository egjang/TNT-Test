import React, { useState } from 'react'
import { ArrowLeft, Edit3, Copy, Send, MessageSquare, FileText, Clock, User } from 'lucide-react'
import {
    Quote,
    QuoteCustomer,
    QuoteItem,
    QUOTE_STATUS_STYLE,
    RECORD_TYPE_LABEL,
    COMPANY_TYPE_LABEL,
    APPROVAL_RULE_LABEL,
    formatCurrency,
    formatPercent
} from './types'

interface QuoteDetailProps {
    quoteId: string
    onBack: () => void
    onEdit: () => void
}

export function QuoteDetail({ quoteId, onBack, onEdit }: QuoteDetailProps) {
    const [activeTab, setActiveTab] = useState<'items' | 'history'>('items')
    const [selectedCustomerIndex, setSelectedCustomerIndex] = useState(0)

    // Mock Data - DDL 기반 구조
    const quote: Quote = {
        id: 1,
        quoteId: quoteId,
        companyType: 'TNT',
        quoteName: '2025년 상반기 정기 납품',
        projectId: 'PRJ-001',
        assigneeId: 'USER-001',
        recordType: 'TNT_DOUBLE',
        quoteStatus: 'DRAFT',
        approvalRule: 'AUTO',
        totalAmount: 150000000,
        totalCost: 120000000,
        expectedProfitRate: 20.0,
        erpSyncYn: 'N',
        createdBy: '홍길동',
        updatedBy: '홍길동',
        createdAt: '2024-11-29T10:30:00',
        updatedAt: '2024-11-29T14:20:00',
        assigneeName: '홍길동',
        project: {
            id: 1,
            projectId: 'PRJ-001',
            projectName: '삼성 평택 공장 증설',
            companyType: 'TNT',
            projectStatus: 'ACTIVE',
            createdAt: '2024-01-01',
            updatedAt: '2024-11-29'
        },
        customers: [
            {
                id: 1,
                quoteId: quoteId,
                accountId: 'ACC-001',
                accountName: '삼성전자',
                subtotalAmount: 100000000,
                subtotalCost: 80000000,
                subtotalProfitRate: 20.0,
                createdAt: '2024-11-29',
                updatedAt: '2024-11-29',
                items: [
                    { id: 1, itemId: 'ITEM-UUID-1', quoteCustomerId: 1, itemNo: 'ITEM-001', itemName: '복층유리 24mm', quantity: 1000, unitPrice: 42000, refTier: 'A', refCost: 36000, refIndividualAvg: 40000, rowProfitRate: 14.3, amount: 42000000, createdAt: '2024-11-29', updatedAt: '2024-11-29' },
                    { id: 2, itemId: 'ITEM-UUID-2', quoteCustomerId: 1, itemNo: 'ITEM-002', itemName: '강화유리 12mm', quantity: 500, unitPrice: 33000, refTier: 'B', refCost: 28000, refIndividualAvg: 31000, rowProfitRate: 15.2, amount: 16500000, createdAt: '2024-11-29', updatedAt: '2024-11-29' },
                    { id: 3, itemId: 'ITEM-UUID-3', quoteCustomerId: 1, itemNo: 'ITEM-003', itemName: '실란트 300ml', quantity: 2000, unitPrice: 4500, refTier: 'C', refCost: 4000, refIndividualAvg: 4300, rowProfitRate: 11.1, amount: 9000000, createdAt: '2024-11-29', updatedAt: '2024-11-29' },
                ]
            },
            {
                id: 2,
                quoteId: quoteId,
                accountId: 'ACC-002',
                accountName: 'LG전자',
                subtotalAmount: 50000000,
                subtotalCost: 40000000,
                subtotalProfitRate: 20.0,
                createdAt: '2024-11-29',
                updatedAt: '2024-11-29',
                items: [
                    { id: 4, itemId: 'ITEM-UUID-4', quoteCustomerId: 2, itemNo: 'ITEM-001', itemName: '복층유리 24mm', quantity: 800, unitPrice: 41000, refTier: 'A', refCost: 36000, refIndividualAvg: 40000, rowProfitRate: 12.2, amount: 32800000, createdAt: '2024-11-29', updatedAt: '2024-11-29' },
                    { id: 5, itemId: 'ITEM-UUID-5', quoteCustomerId: 2, itemNo: 'ITEM-004', itemName: '알루미늄 바', quantity: 1500, unitPrice: 11500, refTier: 'B', refCost: 9600, refIndividualAvg: 11000, rowProfitRate: 16.5, amount: 17250000, createdAt: '2024-11-29', updatedAt: '2024-11-29' },
                ]
            }
        ]
    }

    // Mock 이력 데이터
    const approvalHistory = [
        { date: '2024-11-29 14:20', user: '홍길동', action: '견적 수정', detail: '단가 조정' },
        { date: '2024-11-29 10:30', user: '홍길동', action: '견적 생성', detail: '초기 작성' },
    ]

    const statusStyle = QUOTE_STATUS_STYLE[quote.quoteStatus]
    const currentCustomer = quote.customers?.[selectedCustomerIndex]

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* 헤더 - Standard UI Form View */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button className="btn btn-ghost" onClick={onBack}><ArrowLeft size={16} /></button>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{quote.quoteId}</h2>
                            <span style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 11,
                                background: quote.companyType === 'TNT' ? 'var(--primary-bg)' : 'var(--warning-bg)',
                                color: quote.companyType === 'TNT' ? 'var(--primary)' : 'var(--warning)'
                            }}>
                                {COMPANY_TYPE_LABEL[quote.companyType]}
                            </span>
                            <span className="badge" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                                {statusStyle.label}
                            </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{quote.quoteName}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Copy size={14} /> 복제
                    </button>
                    <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MessageSquare size={14} /> Slack
                    </button>
                    <button className="btn btn-primary" onClick={onEdit} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Edit3 size={14} /> 수정
                    </button>
                    {quote.quoteStatus === 'DRAFT' && (
                        <button className="btn btn-success" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Send size={14} /> 승인요청
                        </button>
                    )}
                </div>
            </div>

            {/* 메인 컨텐츠 */}
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, flex: 1, overflow: 'hidden', padding: 20 }}>
                {/* Left: 기본 정보 */}
                <div className="card" style={{ padding: 0, overflow: 'auto' }}>
                    {/* 기본 정보 섹션 */}
                    <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
                        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileText size={16} /> 기본 정보
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block' }}>레코드 유형</label>
                                <div style={{ fontWeight: 500, fontSize: 13 }}>{RECORD_TYPE_LABEL[quote.recordType]}</div>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block' }}>프로젝트</label>
                                <div style={{ fontWeight: 500, fontSize: 13 }}>{quote.project?.projectName || '-'}</div>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block' }}>승인 규칙</label>
                                <div style={{ fontWeight: 500, fontSize: 13 }}>{quote.approvalRule ? APPROVAL_RULE_LABEL[quote.approvalRule] : '-'}</div>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block' }}>ERP 동기화</label>
                                <div style={{ fontWeight: 500, fontSize: 13 }}>
                                    <span style={{
                                        padding: '2px 6px',
                                        borderRadius: 4,
                                        fontSize: 11,
                                        background: quote.erpSyncYn === 'Y' ? 'var(--success-bg)' : 'var(--bg-secondary)',
                                        color: quote.erpSyncYn === 'Y' ? 'var(--success)' : 'var(--text-secondary)'
                                    }}>
                                        {quote.erpSyncYn === 'Y' ? '동기화됨' : '미동기화'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 금액 정보 섹션 */}
                    <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
                        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>금액 정보</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block' }}>총 견적 금액</label>
                                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>
                                    {formatCurrency(quote.totalAmount)}
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block' }}>총 원가</label>
                                <div style={{ fontSize: 16, fontWeight: 600 }}>
                                    {formatCurrency(quote.totalCost)}
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block' }}>예상 이익률</label>
                                <div style={{
                                    fontSize: 20,
                                    fontWeight: 700,
                                    color: (quote.expectedProfitRate || 0) >= 15 ? 'var(--success)' :
                                        (quote.expectedProfitRate || 0) < 5 ? 'var(--error)' : 'var(--warning)'
                                }}>
                                    {formatPercent(quote.expectedProfitRate)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 거래처 정보 섹션 */}
                    <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
                        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>거래처 ({quote.customers?.length || 0})</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {quote.customers?.map((c, idx) => (
                                <div key={c.id} style={{
                                    padding: 12,
                                    background: selectedCustomerIndex === idx ? 'var(--primary-bg)' : 'var(--bg-secondary)',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    border: selectedCustomerIndex === idx ? '1px solid var(--primary)' : '1px solid transparent'
                                }}
                                    onClick={() => setSelectedCustomerIndex(idx)}
                                >
                                    <div style={{ fontWeight: 500, fontSize: 13 }}>{c.accountName}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                                        {c.items?.length || 0}건 / {formatCurrency(c.subtotalAmount)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 담당자/등록 정보 섹션 */}
                    <div style={{ padding: 20 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <User size={16} /> 담당자 정보
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block' }}>담당자</label>
                                <div style={{ fontWeight: 500, fontSize: 13 }}>{quote.assigneeName}</div>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block' }}>등록일</label>
                                <div style={{ fontWeight: 500, fontSize: 13 }}>{quote.createdAt.split('T')[0]}</div>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block' }}>최종 수정</label>
                                <div style={{ fontWeight: 500, fontSize: 13 }}>{quote.updatedAt.replace('T', ' ')}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: 품목/이력 */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* 탭 */}
                    <div style={{ borderBottom: '1px solid var(--border)', padding: '0 16px' }}>
                        <div style={{ display: 'flex', gap: 0 }}>
                            {[
                                { key: 'items', label: '품목 목록' },
                                { key: 'history', label: '승인 이력' }
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key as 'items' | 'history')}
                                    style={{
                                        padding: '12px 20px',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
                                        color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-secondary)',
                                        fontWeight: activeTab === tab.key ? 600 : 400,
                                        cursor: 'pointer',
                                        fontSize: 14,
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 탭 컨텐츠 */}
                    {activeTab === 'items' && (
                        <>
                            {/* 거래처 서브탭 */}
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {quote.customers?.map((c, idx) => (
                                        <button
                                            key={c.id}
                                            onClick={() => setSelectedCustomerIndex(idx)}
                                            className={`btn ${selectedCustomerIndex === idx ? 'btn-primary' : 'btn-secondary'}`}
                                            style={{ fontSize: 12, padding: '4px 12px' }}
                                        >
                                            {c.accountName}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 테이블 툴바 */}
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                    <strong>{currentCustomer?.accountName}</strong> - {currentCustomer?.items?.length || 0}건 / 소계: <strong style={{ color: 'var(--primary)' }}>{formatCurrency(currentCustomer?.subtotalAmount)}</strong>
                                </div>
                                <button className="btn btn-secondary" style={{ fontSize: 12 }}>Excel</button>
                            </div>

                            {/* 품목 테이블 */}
                            <div style={{ flex: 1, overflow: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ background: 'var(--bg-secondary)' }}>
                                            <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>품목명</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)', width: 60 }}>티어</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', width: 80 }}>수량</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', width: 100 }}>단가</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', width: 100 }}>참조원가</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', width: 100 }}>개별평균가</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', width: 120 }}>금액</th>
                                            <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', width: 70 }}>이익률</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentCustomer?.items?.map((item) => (
                                            <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <div style={{ fontWeight: 500 }}>{item.itemName}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.itemNo}</div>
                                                </td>
                                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '2px 8px',
                                                        borderRadius: 4,
                                                        fontSize: 11,
                                                        background: item.refTier === 'A' ? 'var(--success-bg)' :
                                                            item.refTier === 'B' ? 'var(--info-bg)' : 'var(--bg-secondary)',
                                                        color: item.refTier === 'A' ? 'var(--success)' :
                                                            item.refTier === 'B' ? 'var(--info)' : 'var(--text-secondary)'
                                                    }}>
                                                        {item.refTier}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{item.quantity.toLocaleString()}</td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{item.unitPrice.toLocaleString()}</td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>{formatCurrency(item.refCost)}</td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>{formatCurrency(item.refIndividualAvg)}</td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.amount)}</td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                                    <span style={{
                                                        color: (item.rowProfitRate || 0) >= 15 ? 'var(--success)' :
                                                            (item.rowProfitRate || 0) < 5 ? 'var(--error)' : 'inherit'
                                                    }}>
                                                        {formatPercent(item.rowProfitRate)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ background: 'var(--bg-secondary)', fontWeight: 600 }}>
                                            <td colSpan={6} style={{ padding: '10px 12px', textAlign: 'right' }}>소계</td>
                                            <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--primary)' }}>
                                                {formatCurrency(currentCustomer?.subtotalAmount)}
                                            </td>
                                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                                {formatPercent(currentCustomer?.subtotalProfitRate)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </>
                    )}

                    {activeTab === 'history' && (
                        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {approvalHistory.map((item, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex',
                                        gap: 16,
                                        padding: 16,
                                        background: 'var(--bg-secondary)',
                                        borderRadius: 8,
                                        alignItems: 'flex-start'
                                    }}>
                                        <div style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: '50%',
                                            background: 'var(--primary-bg)',
                                            color: 'var(--primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            <Clock size={14} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                <span style={{ fontWeight: 600, fontSize: 13 }}>{item.action}</span>
                                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.date}</span>
                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                                {item.user} - {item.detail}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
