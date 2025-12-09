import React, { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

// Types based on backend response
interface PendingRequest {
    id: number
    customer_seq: number
    customer_name: string
    request_date: string
    reason_text: string
    collection_plan: string
    target_unblock_date: string
    total_ar: number
    overdue: number
    current_risk_level: string
    created_by: string
}

export function UnblockApprovalList() {
    const [requests, setRequests] = useState<PendingRequest[]>([])
    const [loading, setLoading] = useState(false)
    const [expandedId, setExpandedId] = useState<number | null>(null)

    // Decision Modal State
    const [decisionModal, setDecisionModal] = useState<{
        id: number,
        type: 'APPROVE' | 'REJECT',
        customerName: string
    } | null>(null)
    const [comment, setComment] = useState('')
    const [processing, setProcessing] = useState(false)

    const fetchRequests = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/v1/credit/unblock-requests/pending')
            const data = await res.json()
            if (data.success) {
                setRequests(data.items)
            }
        } catch (error) {
            console.error('Failed to fetch requests', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRequests()
    }, [])

    const handleDecision = async () => {
        if (!decisionModal) return

        setProcessing(true)
        try {
            const res = await fetch(`/api/v1/credit/unblock-requests/${decisionModal.id}/decision`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    decision: decisionModal.type,
                    comment: comment,
                    approverId: 'manager_user' // In real app, from context
                })
            })

            const data = await res.json()
            if (data.success) {
                setDecisionModal(null)
                setComment('')
                fetchRequests() // Refresh list
            } else {
                alert(data.error || '처리 실패')
            }
        } catch (error) {
            alert('처리 중 오류 발생')
        } finally {
            setProcessing(false)
        }
    }

    const formatCurrency = (val: number) => `₩${(val || 0).toLocaleString()}`
    const formatDate = (val: string) => val ? val.substring(0, 10) : '-'

    const getRiskBadge = (level: string) => {
        const styles = {
            high: { bg: '#fee2e2', color: '#ef4444', label: '고위험' },
            medium: { bg: '#fef3c7', color: '#d97706', label: '중위험' },
            low: { bg: '#d1fae5', color: '#059669', label: '저위험' },
            default: { bg: '#f3f4f6', color: '#6b7280', label: '-' }
        }
        const style = styles[level as keyof typeof styles] || styles.default
        return (
            <span style={{
                padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                backgroundColor: style.bg, color: style.color
            }}>
                {style.label}
            </span>
        )
    }

    return (
        <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>매출통제 해제 승인</h2>
                    <p style={{ color: '#6b7280', marginTop: 4 }}>대기 중인 해제 요청 {requests.length}건</p>
                </div>
                <button onClick={fetchRequests} className="btn" style={{ padding: '8px 16px', fontSize: 13 }}>새로고침</button>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <tr>
                            <th style={{ padding: 16, fontSize: 13, fontWeight: 600, color: '#6b7280' }}>요청일</th>
                            <th style={{ padding: 16, fontSize: 13, fontWeight: 600, color: '#6b7280' }}>거래처</th>
                            <th style={{ padding: 16, fontSize: 13, fontWeight: 600, color: '#6b7280' }}>리스크</th>
                            <th style={{ padding: 16, fontSize: 13, fontWeight: 600, color: '#6b7280' }}>총채권 / 연체</th>
                            <th style={{ padding: 16, fontSize: 13, fontWeight: 600, color: '#6b7280' }}>사유</th>
                            <th style={{ padding: 16, fontSize: 13, fontWeight: 600, color: '#6b7280', textAlign: 'right' }}>액션</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
                                    대기 중인 요청이 없습니다.
                                </td>
                            </tr>
                        ) : (
                            requests.map(req => (
                                <React.Fragment key={req.id}>
                                    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: 16, fontSize: 14 }}>{formatDate(req.request_date)}</td>
                                        <td style={{ padding: 16, fontSize: 14, fontWeight: 500 }}>{req.customer_name}</td>
                                        <td style={{ padding: 16 }}>{getRiskBadge(req.current_risk_level)}</td>
                                        <td style={{ padding: 16, fontSize: 13 }}>
                                            <div style={{ fontWeight: 500 }}>{formatCurrency(req.total_ar)}</div>
                                            <div style={{ color: '#ef4444' }}>{formatCurrency(req.overdue)}</div>
                                        </td>
                                        <td style={{ padding: 16, fontSize: 14, maxWidth: 300 }}>
                                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {req.reason_text}
                                            </div>
                                            <button
                                                onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                                                style={{ color: '#3b82f6', background: 'none', border: 'none', padding: 0, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}
                                            >
                                                {expandedId === req.id ? '접기' : '더보기'}
                                                {expandedId === req.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                            </button>
                                        </td>
                                        <td style={{ padding: 16, textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => setDecisionModal({ id: req.id, type: 'APPROVE', customerName: req.customer_name })}
                                                    style={{ padding: '6px 12px', background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
                                                >
                                                    승인
                                                </button>
                                                <button
                                                    onClick={() => setDecisionModal({ id: req.id, type: 'REJECT', customerName: req.customer_name })}
                                                    style={{ padding: '6px 12px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
                                                >
                                                    반려
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedId === req.id && (
                                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                            <td colSpan={6} style={{ padding: '0 16px 16px 16px' }}>
                                                <div style={{ padding: 16, background: 'white', borderRadius: 8, border: '1px solid #e5e7eb', marginTop: 8 }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                                        <div>
                                                            <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>상세 사유</div>
                                                            <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{req.reason_text}</div>
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>채권 회수 계획</div>
                                                            <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{req.collection_plan}</div>
                                                            <div style={{ marginTop: 12, fontSize: 13, color: '#3b82f6', fontWeight: 500 }}>
                                                                해제 목표일: {formatDate(req.target_unblock_date)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {decisionModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
                }}>
                    <div style={{
                        background: 'white', borderRadius: 16, width: 400, padding: 24,
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}>
                        <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: 700 }}>
                            {decisionModal.type === 'APPROVE' ? '승인 처리' : '반려 처리'}
                        </h3>
                        <p style={{ color: '#6b7280', fontSize: 14 }}>
                            {decisionModal.customerName}의 요청을 {decisionModal.type === 'APPROVE' ? '승인' : '반려'}하시겠습니까?
                        </p>

                        <div style={{ marginTop: 16 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>코멘트 (선택)</label>
                            <textarea
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                placeholder="처리 사유를 입력하세요"
                                rows={3}
                                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
                            />
                        </div>

                        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button
                                onClick={() => { setDecisionModal(null); setComment(''); }}
                                style={{ padding: '8px 16px', background: 'white', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer' }}
                            >
                                취소
                            </button>
                            <button
                                onClick={handleDecision}
                                disabled={processing}
                                style={{
                                    padding: '8px 16px', borderRadius: 6, color: 'white', fontWeight: 600, cursor: 'pointer', border: 'none',
                                    background: decisionModal.type === 'APPROVE' ? '#10b981' : '#ef4444'
                                }}
                            >
                                {processing ? '처리 중...' : '확인'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
