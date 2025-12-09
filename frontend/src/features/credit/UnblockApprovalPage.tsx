import React, { useState, useEffect } from 'react'
import { ChevronRight, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

// Types
interface CreditMeeting {
    id: number
    meeting_code: string
    meeting_name: string
    meeting_date: string
    meeting_status: string
}

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
    request_status: string // APPROVED, REJECTED, REQUESTED
    approval_date?: string
    approver_name?: string
    approval_comment?: string
}

export function UnblockApprovalPage() {
    const [meetings, setMeetings] = useState<CreditMeeting[]>([])
    const [selectedMeetingId, setSelectedMeetingId] = useState<number | null>(null)
    const [requests, setRequests] = useState<PendingRequest[]>([])
    const [loadingMeetings, setLoadingMeetings] = useState(false)
    const [loadingRequests, setLoadingRequests] = useState(false)
    const [expandedId, setExpandedId] = useState<number | null>(null)

    // Decision Modal State
    const [decisionModal, setDecisionModal] = useState<{
        id: number,
        type: 'APPROVE' | 'REJECT',
        customerName: string
    } | null>(null)
    const [comment, setComment] = useState('')
    const [processing, setProcessing] = useState(false)

    // Fetch Meetings
    useEffect(() => {
        fetchMeetings()
    }, [])

    const fetchMeetings = async () => {
        setLoadingMeetings(true)
        try {
            const res = await fetch('/api/v1/credit/meetings')
            const data = await res.json()
            if (data.meetings) {
                setMeetings(data.meetings)
                // Select the first meeting by default if available
                if (data.meetings.length > 0 && !selectedMeetingId) {
                    setSelectedMeetingId(data.meetings[0].id)
                }
            }
        } catch (error) {
            console.error('Failed to fetch meetings', error)
        } finally {
            setLoadingMeetings(false)
        }
    }

    // Fetch Requests when meeting changes
    useEffect(() => {
        if (selectedMeetingId) {
            fetchRequests(selectedMeetingId)
        } else {
            setRequests([])
        }
    }, [selectedMeetingId])

    const fetchRequests = async (meetingId: number) => {
        setLoadingRequests(true)
        try {
            const res = await fetch(`/api/v1/credit/meetings/${meetingId}/unblock-requests`)
            const data = await res.json()
            if (data.success) {
                setRequests(data.items)
            }
        } catch (error) {
            console.error('Failed to fetch requests', error)
            setRequests([])
        } finally {
            setLoadingRequests(false)
        }
    }

    const handleDecision = async () => {
        if (!decisionModal || !selectedMeetingId) return

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
                fetchRequests(selectedMeetingId) // Refresh list
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
        <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
            {/* Left Sidebar: Meeting List */}
            <div style={{ width: 280, borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#1e293b' }}>채권회의 목록</h2>
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
                    {loadingMeetings ? (
                        <div style={{ padding: 16, color: '#64748b', fontSize: 14 }}>로딩 중...</div>
                    ) : meetings.map(meeting => (
                        <div
                            key={meeting.id}
                            onClick={() => setSelectedMeetingId(meeting.id)}
                            style={{
                                padding: '12px 14px',
                                borderRadius: 8,
                                cursor: 'pointer',
                                marginBottom: 4,
                                background: selectedMeetingId === meeting.id ? '#fff' : 'transparent',
                                boxShadow: selectedMeetingId === meeting.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                border: selectedMeetingId === meeting.id ? '1px solid #e2e8f0' : '1px solid transparent'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: selectedMeetingId === meeting.id ? '#0f172a' : '#475569' }}>
                                    {meeting.meeting_date}
                                </span>
                                {selectedMeetingId === meeting.id && <ChevronRight size={14} color="#3b82f6" />}
                            </div>
                            <div style={{ fontSize: 14, color: '#334155' }}>{meeting.meeting_name}</div>
                            <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>
                                상태: {meeting.meeting_status}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Content: Request List */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>
                            {meetings.find(m => m.id === selectedMeetingId)?.meeting_name || '전체 목록'}
                        </h2>
                        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: 14 }}>
                            해제 요청 {requests.length}건
                        </p>
                    </div>
                    <button onClick={() => selectedMeetingId && fetchRequests(selectedMeetingId)} className="btn" style={{ fontSize: 13 }}>목록 갱신</button>
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
                    {loadingRequests ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>로딩 중...</div>
                    ) : requests.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af', background: '#f9fafb', borderRadius: 12 }}>
                            해당 회의에 등록된 해제 요청이 없습니다.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            {/* 미처리 요청 (대기중/반려) - 위쪽 */}
                            {requests.filter(r => r.request_status !== 'APPROVED').length > 0 && (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                        <AlertTriangle size={18} color="#d97706" />
                                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#92400e' }}>
                                            미처리 요청 ({requests.filter(r => r.request_status !== 'APPROVED').length}건)
                                        </h3>
                                    </div>
                                    <div className="card" style={{ overflow: 'hidden', padding: 0, border: '1px solid #fcd34d' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                            <thead style={{ background: '#fffbeb', borderBottom: '1px solid #fcd34d' }}>
                                                <tr>
                                                    <th style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#92400e' }}>요청일시</th>
                                                    <th style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#92400e' }}>거래처</th>
                                                    <th style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#92400e' }}>리스크</th>
                                                    <th style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#92400e' }}>총채권 / 연체</th>
                                                    <th style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#92400e' }}>해제사유</th>
                                                    <th style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#92400e', textAlign: 'center' }}>승인/반려</th>
                                                </tr>
                                            </thead>
                                            <tbody style={{ fontSize: 14 }}>
                                                {requests.filter(r => r.request_status !== 'APPROVED').map(req => (
                                                    <React.Fragment key={req.id}>
                                                        <tr style={{ borderBottom: '1px solid #fef3c7', background: req.request_status === 'REJECTED' ? '#fef2f2' : '#fff' }}>
                                                            <td style={{ padding: 16, color: '#334155' }}>
                                                                <div>{formatDate(req.request_date)}</div>
                                                                <div style={{ fontSize: 12, color: '#94a3b8' }}>{req.created_by}</div>
                                                            </td>
                                                            <td style={{ padding: 16, fontWeight: 500, color: '#0f172a' }}>
                                                                {req.customer_name}
                                                                {req.request_status === 'REJECTED' && (
                                                                    <span style={{ marginLeft: 8, padding: '2px 6px', background: '#fee2e2', color: '#dc2626', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>반려됨</span>
                                                                )}
                                                            </td>
                                                            <td style={{ padding: 16 }}>{getRiskBadge(req.current_risk_level)}</td>
                                                            <td style={{ padding: 16 }}>
                                                                <div style={{ fontWeight: 500 }}>{formatCurrency(req.total_ar)}</div>
                                                                <div style={{ color: '#ef4444', fontSize: 13 }}>{formatCurrency(req.overdue)} (연체)</div>
                                                            </td>
                                                            <td style={{ padding: 16, maxWidth: 280 }}>
                                                                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#334155' }}>
                                                                    {req.reason_text}
                                                                </div>
                                                                <button
                                                                    onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                                                                    style={{
                                                                        marginTop: 4, background: 'none', border: 'none', padding: 0,
                                                                        fontSize: 12, color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2
                                                                    }}
                                                                >
                                                                    {expandedId === req.id ? '접기' : '상세보기'}
                                                                    {expandedId === req.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                                </button>
                                                            </td>
                                                            <td style={{ padding: 16, textAlign: 'center' }}>
                                                                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                                                    <button
                                                                        onClick={() => setDecisionModal({ id: req.id, type: 'APPROVE', customerName: req.customer_name })}
                                                                        style={{ padding: '6px 14px', background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                                                                    >
                                                                        승인
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setDecisionModal({ id: req.id, type: 'REJECT', customerName: req.customer_name })}
                                                                        style={{ padding: '6px 14px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                                                                    >
                                                                        반려
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        {expandedId === req.id && (
                                                            <tr style={{ background: '#fffbeb', borderBottom: '1px solid #fcd34d' }}>
                                                                <td colSpan={6} style={{ padding: '0 20px 20px 20px' }}>
                                                                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20, marginTop: 10 }}>
                                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                                                                            <div>
                                                                                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>해제 상세 사유</h4>
                                                                                <div style={{ fontSize: 14, lineHeight: 1.6, color: '#334155', whiteSpace: 'pre-wrap' }}>{req.reason_text}</div>
                                                                            </div>
                                                                            <div>
                                                                                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>채권 향후 계획</h4>
                                                                                <div style={{ fontSize: 14, lineHeight: 1.6, color: '#334155', whiteSpace: 'pre-wrap' }}>{req.collection_plan}</div>
                                                                                <div style={{ marginTop: 16, padding: '8px 12px', background: '#eff6ff', borderRadius: 6, border: '1px solid #dbeafe', display: 'inline-block' }}>
                                                                                    <span style={{ fontSize: 12, color: '#1e40af', fontWeight: 600 }}>목표 해제일: </span>
                                                                                    <span style={{ fontSize: 13, color: '#1e3a8a' }}>{formatDate(req.target_unblock_date)}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        {req.request_status === 'REJECTED' && req.approval_comment && (
                                                                            <div style={{ marginTop: 16, padding: 12, background: '#fef2f2', borderRadius: 6, border: '1px solid #fee2e2' }}>
                                                                                <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', marginBottom: 4 }}>반려 사유</div>
                                                                                <div style={{ fontSize: 14, color: '#991b1b' }}>{req.approval_comment}</div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* 승인된 요청 - 아래쪽 */}
                            {requests.filter(r => r.request_status === 'APPROVED').length > 0 && (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                        <CheckCircle2 size={18} color="#059669" />
                                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#065f46' }}>
                                            승인 완료 ({requests.filter(r => r.request_status === 'APPROVED').length}건)
                                        </h3>
                                    </div>
                                    <div className="card" style={{ overflow: 'hidden', padding: 0, border: '1px solid #86efac' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                            <thead style={{ background: '#ecfdf5', borderBottom: '1px solid #86efac' }}>
                                                <tr>
                                                    <th style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#065f46' }}>요청일시</th>
                                                    <th style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#065f46' }}>거래처</th>
                                                    <th style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#065f46' }}>리스크</th>
                                                    <th style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#065f46' }}>총채권 / 연체</th>
                                                    <th style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#065f46' }}>해제사유</th>
                                                    <th style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#065f46', textAlign: 'center' }}>승인정보</th>
                                                </tr>
                                            </thead>
                                            <tbody style={{ fontSize: 14 }}>
                                                {requests.filter(r => r.request_status === 'APPROVED').map(req => (
                                                    <React.Fragment key={req.id}>
                                                        <tr style={{ borderBottom: '1px solid #d1fae5', background: '#f0fdf4' }}>
                                                            <td style={{ padding: 16, color: '#334155' }}>
                                                                <div>{formatDate(req.request_date)}</div>
                                                                <div style={{ fontSize: 12, color: '#94a3b8' }}>{req.created_by}</div>
                                                            </td>
                                                            <td style={{ padding: 16, fontWeight: 500, color: '#0f172a' }}>{req.customer_name}</td>
                                                            <td style={{ padding: 16 }}>{getRiskBadge(req.current_risk_level)}</td>
                                                            <td style={{ padding: 16 }}>
                                                                <div style={{ fontWeight: 500 }}>{formatCurrency(req.total_ar)}</div>
                                                                <div style={{ color: '#ef4444', fontSize: 13 }}>{formatCurrency(req.overdue)} (연체)</div>
                                                            </td>
                                                            <td style={{ padding: 16, maxWidth: 280 }}>
                                                                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#334155' }}>
                                                                    {req.reason_text}
                                                                </div>
                                                                <button
                                                                    onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                                                                    style={{
                                                                        marginTop: 4, background: 'none', border: 'none', padding: 0,
                                                                        fontSize: 12, color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2
                                                                    }}
                                                                >
                                                                    {expandedId === req.id ? '접기' : '상세보기'}
                                                                    {expandedId === req.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                                </button>
                                                            </td>
                                                            <td style={{ padding: 16, textAlign: 'center' }}>
                                                                <div style={{ fontSize: 13, color: '#059669', fontWeight: 600 }}>
                                                                    <CheckCircle2 size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                                                                    승인됨
                                                                </div>
                                                                {req.approval_date && (
                                                                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{formatDate(req.approval_date)}</div>
                                                                )}
                                                                {req.approver_name && (
                                                                    <div style={{ fontSize: 11, color: '#64748b' }}>{req.approver_name}</div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                        {expandedId === req.id && (
                                                            <tr style={{ background: '#ecfdf5', borderBottom: '1px solid #86efac' }}>
                                                                <td colSpan={6} style={{ padding: '0 20px 20px 20px' }}>
                                                                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20, marginTop: 10 }}>
                                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                                                                            <div>
                                                                                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>해제 상세 사유</h4>
                                                                                <div style={{ fontSize: 14, lineHeight: 1.6, color: '#334155', whiteSpace: 'pre-wrap' }}>{req.reason_text}</div>
                                                                            </div>
                                                                            <div>
                                                                                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>채권 향후 계획</h4>
                                                                                <div style={{ fontSize: 14, lineHeight: 1.6, color: '#334155', whiteSpace: 'pre-wrap' }}>{req.collection_plan}</div>
                                                                                <div style={{ marginTop: 16, padding: '8px 12px', background: '#eff6ff', borderRadius: 6, border: '1px solid #dbeafe', display: 'inline-block' }}>
                                                                                    <span style={{ fontSize: 12, color: '#1e40af', fontWeight: 600 }}>목표 해제일: </span>
                                                                                    <span style={{ fontSize: 13, color: '#1e3a8a' }}>{formatDate(req.target_unblock_date)}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        {req.approval_comment && (
                                                                            <div style={{ marginTop: 16, padding: 12, background: '#ecfdf5', borderRadius: 6, border: '1px solid #d1fae5' }}>
                                                                                <div style={{ fontSize: 12, fontWeight: 600, color: '#059669', marginBottom: 4 }}>승인 코멘트</div>
                                                                                <div style={{ fontSize: 14, color: '#065f46' }}>{req.approval_comment}</div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {decisionModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
                }}>
                    <div style={{
                        background: 'white', borderRadius: 12, width: 440, padding: 24,
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}>
                        <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
                            {decisionModal.type === 'APPROVE' ? '해제 요청 승인' : '해제 요청 반려'}
                        </h3>
                        <p style={{ color: '#4b5563', fontSize: 14, lineHeight: 1.5, marginTop: 8 }}>
                            <strong>{decisionModal.customerName}</strong> 업체의 매출통제 해제 요청을
                            {decisionModal.type === 'APPROVE' ? ' 승인' : ' 반려'}하시겠습니까?
                        </p>

                        <div style={{ marginTop: 20 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>처리 코멘트 (선택)</label>
                            <textarea
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                placeholder="승인/반려 사유나 지시사항을 입력하세요."
                                rows={3}
                                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
                            />
                        </div>

                        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button
                                onClick={() => { setDecisionModal(null); setComment(''); }}
                                style={{
                                    padding: '8px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6,
                                    cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 500
                                }}
                            >
                                취소
                            </button>
                            <button
                                onClick={handleDecision}
                                disabled={processing}
                                style={{
                                    padding: '8px 16px', borderRadius: 6, color: 'white', fontWeight: 600, cursor: 'pointer', border: 'none',
                                    fontSize: 13,
                                    background: decisionModal.type === 'APPROVE' ? '#10b981' : '#ef4444',
                                    opacity: processing ? 0.7 : 1
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
