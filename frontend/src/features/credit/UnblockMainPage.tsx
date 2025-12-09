import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Calendar, RefreshCw, ChevronRight, CheckSquare, MessageSquare, FileText } from 'lucide-react'
import { useCreditWorkflow } from './CreditWorkflowContext'
import { CreditAlertModal } from './CreditAlertModal'

// --- Types ---
interface CreditMeeting {
    id: number
    meeting_code: string
    meeting_name: string
    meeting_date: string
    meeting_status: string // '계획', '자료생성', '진행중', '완료'
    remark?: string
}

interface PendingRequest {
    id: number
    customer_seq: number
    customer_name: string
    company_type?: string // Added for Right Panel
    request_date: string
    reason_text: string
    collection_plan: string
    target_unblock_date: string
    total_ar: number
    overdue: number
    current_risk_level: string
    created_by: string
    request_status: string // APPROVED, REJECTED, REQUESTED, HOLD
    approval_date?: string
    approver_name?: string
    approval_comment?: string
    requester_name?: string // New field
    // New fields for multi-level approval
    approver_1st_id?: string
    approver_1st_name?: string
    approved_1st_at?: string
    decision_1st?: string
    approver_2nd_id?: string
    approver_2nd_name?: string
    approved_2nd_at?: string
    decision_2nd?: string
}

interface UnblockStats {
    totalCount: number
    totalAmount: number
    statusBreakdown: Record<string, number>
}

interface ApprovalHistory {
    hist_id: number
    approval_id: number
    meeting_id: number
    approver_role: string
    approver_assignee_id: string
    approver_name: string
    decision_result: string
    decision_comment: string
    decided_at: string
    hist_created_at: string
    meeting_code: string
    meeting_name: string
}

export function UnblockMainPage() {
    const { meetingId, setMeetingId, setSelectedCustomer, setMeetingDate } = useCreditWorkflow()

    // -- Meeting List State --
    const [meetings, setMeetings] = useState<CreditMeeting[]>([])
    const [loadingMeetings, setLoadingMeetings] = useState(false)
    const [filterStatus, setFilterStatus] = useState<string>('all')

    // -- Request List State --
    const [requests, setRequests] = useState<PendingRequest[]>([])
    const [loadingRequests, setLoadingRequests] = useState(false)
    const [expandedId, setExpandedId] = useState<number | null>(null)


    // -- Decision Modal State --
    const [decisionModal, setDecisionModal] = useState<{
        id: number,
        type: 'APPROVE' | 'REJECT' | 'HOLD',
        customerName: string
    } | null>(null)
    const [comment, setComment] = useState('')
    const [processing, setProcessing] = useState(false)

    const [stats, setStats] = useState<UnblockStats | null>(null)

    // -- Row Decision Selection State (승인/반려 선택) --
    const [rowDecisions, setRowDecisions] = useState<Record<number, 'APPROVE' | 'REJECT' | null>>({})

    // -- 결재 카드 상태 (1차/최종 승인자의 승인/반려 선택) --
    const [approver1Decision, setApprover1Decision] = useState<'APPROVE' | 'REJECT' | null>(null)
    const [approver2Decision, setApprover2Decision] = useState<'APPROVE' | 'REJECT' | null>(null)

    // -- 결재 카드 모달 상태 --
    const [approvalModal, setApprovalModal] = useState<{
        approverLevel: '1st' | '2nd',
        type: 'APPROVE' | 'REJECT'
    } | null>(null)
    const [approvalComment, setApprovalComment] = useState('')

    // -- 승인자 이름 상태 --
    const [approver1Name, setApprover1Name] = useState<string>('')
    const [approver2Name, setApprover2Name] = useState<string>('')

    // -- 배치 승인 처리 중 상태 --
    const [batchProcessing, setBatchProcessing] = useState(false)

    // -- 알림 모달 상태 --
    const [alertModal, setAlertModal] = useState<{
        isOpen: boolean
        message: string
        type: 'success' | 'error' | 'info'
    }>({ isOpen: false, message: '', type: 'info' })

    // -- 결재 이력 모달 상태 --
    const [approvalHistoryModal, setApprovalHistoryModal] = useState(false)
    const [approvalHistory, setApprovalHistory] = useState<ApprovalHistory[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    // 0. Fetch Approver Names on Mount
    useEffect(() => {
        const fetchApproverNames = async () => {
            try {
                // 1차 승인자: 2019052701
                const res1 = await fetch('/api/v1/employee/by-assignee?assigneeId=2019052701')
                const data1 = await res1.json()
                if (data1.emp_name) {
                    setApprover1Name(data1.emp_name)
                }

                // 최종 승인자: 2015030601
                const res2 = await fetch('/api/v1/employee/by-assignee?assigneeId=2015030601')
                const data2 = await res2.json()
                if (data2.emp_name) {
                    setApprover2Name(data2.emp_name)
                }
            } catch (error) {
                console.error('Failed to fetch approver names', error)
            }
        }
        fetchApproverNames()
    }, [])

    // 1. Fetch Meetings on Mount
    useEffect(() => {
        setSelectedCustomer(null) // Clear panel selection on mount
        fetchMeetings()
    }, [])

    // 2. Fetch Requests when meeting changes
    useEffect(() => {
        if (meetingId) {
            setSelectedCustomer(null) // Clear panel selection when meeting changes
            fetchRequests(meetingId)
            fetchStats(meetingId)
        } else {
            setRequests([])
            setStats(null)
            setSelectedCustomer(null)
        }
    }, [meetingId])

    const fetchMeetings = async () => {
        setLoadingMeetings(true)
        try {
            const res = await fetch('/api/v1/credit/meetings')
            const data = await res.json()
            if (data.meetings) {
                setMeetings(data.meetings)
                // Auto-select first if none selected
                if (!meetingId && data.meetings.length > 0) {
                    setMeetingId(data.meetings[0].id)
                    setMeetingDate(data.meetings[0].meeting_date)
                }
            }
        } catch (error) {
            console.error('Failed to fetch meetings', error)
        } finally {
            setLoadingMeetings(false)
        }
    }

    const fetchStats = async (id: number) => {
        try {
            const res = await fetch(`/api/v1/credit/meetings/${id}/stats`)
            const data = await res.json()
            if (data.success) {
                setStats(data)

                // Update Approval UI State (새로운 구조: 미팅당 1건의 레코드)
                // approvalStatus.currentRole: 마지막으로 처리한 승인자 역할
                // approvalStatus.currentResult: 현재 상태
                if (data.approvalStatus) {
                    const currentRole = data.approvalStatus.currentRole
                    const currentResult = data.approvalStatus.currentResult

                    // 상태별 1차/2차 승인자 UI 결정
                    // - APPROVED_1ST + SALES_MANAGER: 1차 승인 완료 → 1차 APPROVE, 2차 null (enable)
                    // - APPROVED_FINAL + CEO: 최종 승인 완료 → 1차 APPROVE, 2차 APPROVE
                    // - REJECTED + SALES_MANAGER: 1차 반려 → 1차 REJECT, 2차 null
                    // - REJECTED + CEO: 2차 반려 → 둘 다 null (1차부터 다시 시작)
                    // - SUBMITTED 또는 null: 초기 상태 → 둘 다 null

                    if (currentResult === 'APPROVED_1ST' && currentRole === 'SALES_MANAGER') {
                        setApprover1Decision('APPROVE')
                        setApprover2Decision(null) // 2차 enable
                    } else if (currentResult === 'APPROVED_FINAL' && currentRole === 'CEO') {
                        setApprover1Decision('APPROVE')
                        setApprover2Decision('APPROVE')
                    } else if (currentResult === 'REJECTED' && currentRole === 'SALES_MANAGER') {
                        setApprover1Decision('REJECT')
                        setApprover2Decision(null)
                    } else if (currentResult === 'REJECTED' && currentRole === 'CEO') {
                        // 2차 반려: 1차부터 다시 시작
                        setApprover1Decision(null)
                        setApprover2Decision(null)
                    } else {
                        // SUBMITTED 또는 레코드 없음 → 초기 상태
                        setApprover1Decision(null)
                        setApprover2Decision(null)
                    }
                } else {
                    // Reset if no data
                    setApprover1Decision(null)
                    setApprover2Decision(null)
                }
            }
        } catch (error) {
            console.error('Failed to fetch stats', error)
        }
    }

    const fetchRequests = async (id: number) => {
        setLoadingRequests(true)
        try {
            const res = await fetch(`/api/v1/credit/meetings/${id}/unblock-requests`)
            const data = await res.json()
            if (data.success) {
                setRequests(data.items)
                // 기본값: 반려 건은 'REJECT', 나머지는 'APPROVE'로 초기화
                const initialDecisions: Record<number, 'APPROVE' | 'REJECT' | null> = {}
                data.items.forEach((item: PendingRequest) => {
                    if (item.request_status !== 'APPROVED_FINAL') {
                        // 반려 상태인 건은 반려로, 나머지는 승인으로 표시
                        initialDecisions[item.id] = item.request_status === 'REJECTED' ? 'REJECT' : 'APPROVE'
                    }
                })
                setRowDecisions(initialDecisions)
            }
        } catch (error) {
            console.error('Failed to fetch requests', error)
            setRequests([])
        } finally {
            setLoadingRequests(false)
        }
    }

    const fetchApprovalHistory = async (id: number) => {
        setLoadingHistory(true)
        try {
            const res = await fetch(`/api/v1/credit/meetings/${id}/approval-history`)
            const data = await res.json()
            if (data.success) {
                setApprovalHistory(data.history)
            }
        } catch (error) {
            console.error('Failed to fetch approval history', error)
            setApprovalHistory([])
        } finally {
            setLoadingHistory(false)
        }
    }

    const handleRowClick = (req: PendingRequest) => {
        // Toggle expansion
        setExpandedId(expandedId === req.id ? null : req.id)

        // Set Selected Customer for Right Panel
        setSelectedCustomer({
            customerSeq: req.customer_seq,
            customerName: req.customer_name,
            companyType: req.company_type, // Assuming API returns this
            totalAr: req.total_ar,
            overdue: req.overdue,
            riskLevel: req.current_risk_level
        })
    }

    const handleDecision = async () => {
        if (!decisionModal || !meetingId) return

        setProcessing(true)
        try {
            // Determine approver ID based on approval card selection
            let approverId = '2019052701' // 기본값: 1차 승인자

            const res = await fetch(`/api/v1/credit/unblock-requests/${decisionModal.id}/decision`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    decision: decisionModal.type,
                    comment: comment,
                    approverId: approverId
                })
            })

            const data = await res.json()
            if (data.success) {
                setDecisionModal(null)
                setComment('')
                fetchRequests(meetingId) // Refresh list
                fetchStats(meetingId) // Refresh stats
            } else {
                // alert(data.error || '처리 실패')
                setAlertModal({
                    isOpen: true,
                    message: data.error || '처리 실패',
                    type: 'error'
                })
            }
        } catch (error) {
            // alert('처리 중 오류 발생')
            setAlertModal({
                isOpen: true,
                message: '처리 중 오류가 발생했습니다.',
                type: 'error'
            })
            console.error(error)
        } finally {
            setProcessing(false)
        }
    }

    // Helpers
    const formatCurrency = (val: number) => `₩${(val || 0).toLocaleString()}`
    const formatDate = (val: string) => val ? val.substring(0, 10) : '-'

    const getStatusBadge = (status: string) => {
        if (status === 'APPROVED_FINAL') return <span style={{ color: '#059669', fontWeight: 600 }}>승인완료</span>
        if (status === 'APPROVED_1ST') return <span style={{ color: '#3b82f6', fontWeight: 600 }}>1차승인</span>
        if (status === 'REJECTED') return <span style={{ color: '#ef4444', fontWeight: 600 }}>반려됨</span>
        if (status === 'HOLD') return <span style={{ color: '#d97706', fontWeight: 600 }}>보류</span>
        return <span style={{ color: '#6b7280', fontWeight: 600 }}>요청중</span>
    }
    // Filter logic
    const filteredMeetings = meetings.filter(m =>
        filterStatus === 'all' || m.meeting_status === filterStatus
    )

    const selectedMeeting = meetings.find(m => m.id === meetingId)

    return (
        <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: '#f8fafc' }}>

            {/* --- Main Content Area --- */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white' }}>
                <div style={{ padding: 8, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Header with User Simulation */}
                    <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0, marginBottom: 4 }}>매출통제 해제 요청 관리</h1>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>
                                채권회의 해제 요청 건에 대한 검토 및 승인을 수행합니다.
                            </div>
                        </div>

                        {/* 결재 라인 영역 - Modern Step Process Flow (Large Size) */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: 'white',
                            borderRadius: 16,
                            padding: '10px 24px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                            border: '1px solid #e2e8f0',
                            height: 72
                        }}>
                            {/* 1차 승인 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ position: 'relative' }}>
                                    <div style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: '50%',
                                        background: approver1Decision === 'APPROVE' ? 'linear-gradient(135deg, #10b981, #059669)' :
                                            approver1Decision === 'REJECT' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : '#f1f5f9',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: approver1Decision ? 'white' : '#64748b',
                                        fontSize: 18,
                                        fontWeight: 700,
                                        border: '3px solid white',
                                        boxShadow: approver1Decision ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
                                    }}>
                                        {approver1Name ? approver1Name.charAt(0) : '?'}
                                    </div>
                                    <div style={{
                                        position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: '50%',
                                        background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        border: '2px solid #f1f5f9'
                                    }}>
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: approver1Decision === 'APPROVE' ? '#10b981' : approver1Decision === 'REJECT' ? '#ef4444' : '#cbd5e1' }} />
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 2 }}>1차 승인</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{approver1Name || '미지정'}</div>
                                        {/* Action Buttons */}
                                        {/* 1차 승인자: 미팅 완료 전이거나, 요청 건이 없거나, 이미 처리했으면 disable */}
                                        {(() => {
                                            const isMeetingNotFinished = selectedMeeting?.meeting_status !== 'FINISHED'
                                            const hasNoRequests = requests.length === 0
                                            const is1stDisabled = isMeetingNotFinished || hasNoRequests || approver1Decision !== null
                                            const disabledReason = isMeetingNotFinished ? "미팅 완료 후 결재 가능" : hasNoRequests ? "요청 건이 없습니다" : "승인"
                                            return (
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button
                                                onClick={() => {
                                                    if (!is1stDisabled) setApprovalModal({ approverLevel: '1st', type: 'APPROVE' });
                                                }}
                                                title={disabledReason}
                                                disabled={is1stDisabled}
                                                style={{
                                                    width: 28, height: 28, borderRadius: '50%', border: 'none',
                                                    cursor: is1stDisabled ? 'not-allowed' : 'pointer',
                                                    background: approver1Decision === 'APPROVE' ? '#dcfce7' : '#f1f5f9',
                                                    color: approver1Decision === 'APPROVE' ? '#166534' : '#94a3b8',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                                                    boxShadow: approver1Decision === 'APPROVE' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                                    opacity: is1stDisabled ? 0.6 : 1
                                                }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            </button>
                                            {/* 1차 승인자는 반려 불가 */}
                                        </div>
                                            )
                                        })()}
                                        {/* <button
                                                onClick={() => setApprovalModal({ approverLevel: '1st', type: 'REJECT' })}
                                                title="반려"
                                                style={{
                                                    width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer',
                                                    background: approver1Decision === 'REJECT' ? '#fee2e2' : '#f1f5f9',
                                                    color: approver1Decision === 'REJECT' ? '#991b1b' : '#94a3b8',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                                                    boxShadow: approver1Decision === 'REJECT' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                                                }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                            </button> */}
                                    </div>
                                </div>
                            </div>

                            {/* Divider Arrow */}
                            <div style={{ padding: '0 24px', display: 'flex', alignItems: 'center', opacity: 0.3 }}>
                                <ChevronRight size={24} color="#64748b" />
                            </div>

                            {/* 최종 승인 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ position: 'relative' }}>
                                    <div style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: '50%',
                                        background: approver2Decision === 'APPROVE' ? 'linear-gradient(135deg, #10b981, #059669)' :
                                            approver2Decision === 'REJECT' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : '#f1f5f9',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: approver2Decision ? 'white' : '#64748b',
                                        fontSize: 18,
                                        fontWeight: 700,
                                        border: '3px solid white',
                                        boxShadow: approver2Decision ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
                                    }}>
                                        {approver2Name ? approver2Name.charAt(0) : '?'}
                                    </div>
                                    <div style={{
                                        position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: '50%',
                                        background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        border: '2px solid #f1f5f9'
                                    }}>
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: approver2Decision === 'APPROVE' ? '#10b981' : approver2Decision === 'REJECT' ? '#ef4444' : '#cbd5e1' }} />
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 2 }}>최종 승인</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{approver2Name || '미지정'}</div>
                                        {/* 2차 승인자: 미팅 완료 + 요청 건 있음 + 1차 승인 완료 후에만 enable, 이미 처리했으면 disable */}
                                        {(() => {
                                            const isMeetingNotFinished = selectedMeeting?.meeting_status !== 'FINISHED'
                                            const hasNoRequests = requests.length === 0
                                            const is2ndDisabled = isMeetingNotFinished || hasNoRequests || approver1Decision !== 'APPROVE' || approver2Decision !== null
                                            const disabledReason = isMeetingNotFinished ? "미팅 완료 후 결재 가능" : hasNoRequests ? "요청 건이 없습니다" : "승인"
                                            const disabledReasonReject = isMeetingNotFinished ? "미팅 완료 후 결재 가능" : hasNoRequests ? "요청 건이 없습니다" : "반려"
                                            return (
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button
                                                onClick={() => {
                                                    if (!is2ndDisabled) setApprovalModal({ approverLevel: '2nd', type: 'APPROVE' });
                                                }}
                                                title={disabledReason}
                                                disabled={is2ndDisabled}
                                                style={{
                                                    width: 28, height: 28, borderRadius: '50%', border: 'none',
                                                    cursor: is2ndDisabled ? 'not-allowed' : 'pointer',
                                                    background: approver2Decision === 'APPROVE' ? '#dcfce7' : '#f1f5f9',
                                                    color: approver2Decision === 'APPROVE' ? '#166534' : '#94a3b8',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                                                    boxShadow: approver2Decision === 'APPROVE' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                                    opacity: is2ndDisabled ? 0.6 : 1
                                                }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (!is2ndDisabled) setApprovalModal({ approverLevel: '2nd', type: 'REJECT' });
                                                }}
                                                title={disabledReasonReject}
                                                disabled={is2ndDisabled}
                                                style={{
                                                    width: 28, height: 28, borderRadius: '50%', border: 'none',
                                                    cursor: is2ndDisabled ? 'not-allowed' : 'pointer',
                                                    background: approver2Decision === 'REJECT' ? '#fee2e2' : '#f1f5f9',
                                                    color: approver2Decision === 'REJECT' ? '#991b1b' : '#94a3b8',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                                                    boxShadow: approver2Decision === 'REJECT' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                                    opacity: is2ndDisabled ? 0.6 : 1
                                                }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                            </button>
                                        </div>
                                            )
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 결재 이력 조회 버튼 */}
                        <button
                            onClick={() => {
                                if (meetingId) {
                                    fetchApprovalHistory(meetingId)
                                    setApprovalHistoryModal(true)
                                }
                            }}
                            disabled={!meetingId}
                            style={{
                                padding: '8px 16px',
                                borderRadius: 8,
                                border: '1px solid #e2e8f0',
                                background: 'white',
                                color: '#475569',
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: meetingId ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                                opacity: meetingId ? 1 : 0.5
                            }}
                        >
                            <FileText size={16} />
                            결재 이력
                        </button>
                    </div>

                    {/* 미팅 미완료 시 경고 메시지 */}
                    {selectedMeeting && selectedMeeting.meeting_status !== 'FINISHED' && (
                        <div style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: 8,
                            padding: '8px 16px',
                            marginBottom: 8,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                        }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <span style={{ color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
                                미팅이 완료되지 않아 매출통제 해제 결재가 불가합니다. 미팅 완료 후 결재를 진행해 주세요.
                            </span>
                        </div>
                    )}

                    <div style={{ flex: 1, display: 'flex', gap: 8, minHeight: 0 }}>
                        {/* Meeting List Sidebar */}
                        <div style={{ width: 240, background: 'white', borderRadius: 8, border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div style={{ padding: '12px 12px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <Calendar size={16} color="#4b5563" />
                                    <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>채권회의 목록</h2>
                                </div>
                                {/* Meeting Filter Tabs */}
                                <div style={{ padding: '4px 0', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 4, overflowX: 'auto', marginTop: 8 }}>
                                    {[
                                        { value: 'all', label: '전체' },
                                        { value: 'ON_GOING', label: '진행중' },
                                        { value: 'FINISHED', label: '완료' }
                                    ].map(status => (
                                        <button
                                            key={status.value}
                                            onClick={() => setFilterStatus(status.value)}
                                            style={{
                                                padding: '2px 6px',
                                                borderRadius: 8,
                                                border: 'none',
                                                fontSize: 11,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                background: filterStatus === status.value ? '#3b82f6' : '#f1f5f9',
                                                color: filterStatus === status.value ? 'white' : '#64748b',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {status.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                                {loadingMeetings ? (
                                    <div style={{ padding: 12, textAlign: 'center', color: '#6b7280', fontSize: 12 }}>로딩 중...</div>
                                ) : filteredMeetings.length === 0 ? (
                                    <div style={{ padding: 12, textAlign: 'center', color: '#6b7280', fontSize: 12 }}>회의가 없습니다.</div>
                                ) : (
                                    filteredMeetings.map(meeting => (
                                        <div
                                            key={meeting.id}
                                            onClick={() => {
                                                setMeetingId(meeting.id)
                                                setMeetingDate(meeting.meeting_date)
                                            }}
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: 6,
                                                cursor: 'pointer',
                                                background: meetingId === meeting.id ? '#eff6ff' : 'transparent',
                                                border: meetingId === meeting.id ? '1px solid #bfdbfe' : '1px solid transparent',
                                                marginBottom: 4,
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <span style={{ fontSize: 13, fontWeight: 600, color: meetingId === meeting.id ? '#1e40af' : '#374151' }}>
                                                    {meeting.meeting_name}
                                                </span>
                                                {meetingId === meeting.id && <ChevronRight size={14} color="#3b82f6" />}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: 11, color: meetingId === meeting.id ? '#60a5fa' : '#9ca3af' }}>
                                                    {formatDate(meeting.meeting_date)}
                                                </span>
                                                {/* 상태 배지 */}
                                                {meeting.meeting_status === 'ON_GOING' ? (
                                                    <span style={{
                                                        padding: '2px 6px',
                                                        borderRadius: 4,
                                                        fontSize: 10,
                                                        fontWeight: 600,
                                                        background: '#dcfce7',
                                                        color: '#16a34a',
                                                        border: '1px solid #bbf7d0'
                                                    }}>진행중</span>
                                                ) : meeting.meeting_status === 'FINISHED' ? (
                                                    <span style={{
                                                        padding: '2px 6px',
                                                        borderRadius: 4,
                                                        fontSize: 10,
                                                        fontWeight: 600,
                                                        background: '#f1f5f9',
                                                        color: '#64748b',
                                                        border: '1px solid #e2e8f0'
                                                    }}>완료</span>
                                                ) : (
                                                    <span style={{
                                                        padding: '2px 6px',
                                                        borderRadius: 4,
                                                        fontSize: 10,
                                                        fontWeight: 600,
                                                        background: '#f1f5f9',
                                                        color: '#94a3b8',
                                                        border: '1px solid #e2e8f0'
                                                    }}>{meeting.meeting_status}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Request List Main Area */}
                        <div style={{ flex: 1, background: 'white', borderRadius: 8, border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <CheckSquare size={16} color="#4b5563" />
                                    <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>
                                        {selectedMeeting ? `${selectedMeeting.meeting_name} 해제 요청` : '회의를 선택해주세요'}
                                    </h2>
                                    {selectedMeeting && (
                                        <div style={{ display: 'flex' }}>
                                            {stats && (
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                    {/* Total Card */}
                                                    <div style={{
                                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                        background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '4px 12px', minWidth: 60,
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                    }}>
                                                        <span style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>전체</span>
                                                        <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{stats.totalCount}</span>
                                                    </div>

                                                    <div style={{ width: 1, height: 24, background: '#cbd5e1', margin: '0 4px' }}></div>

                                                    {/* Status Cards */}
                                                    {[
                                                        { code: 'SUBMITTED', label: '요청', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
                                                        { code: 'APPROVED_1ST', label: '1차승인', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
                                                        { code: 'APPROVED_FINAL', label: '최종승인', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
                                                        { code: 'HOLD', label: '보류', color: '#d97706', bg: '#fff7ed', border: '#fed7aa' },
                                                        { code: 'REJECTED', label: '반려', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
                                                    ].map(item => (
                                                        <div key={item.code} style={{
                                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                            background: item.bg, border: `1px solid ${item.border}`, borderRadius: 8, padding: '4px 12px', minWidth: 60
                                                        }}>
                                                            <span style={{ fontSize: 11, color: item.color, fontWeight: 600, marginBottom: 2 }}>{item.label}</span>
                                                            <span style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{stats.statusBreakdown[item.code] || 0}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => {
                                        if (meetingId) fetchRequests(meetingId)
                                    }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        padding: '6px 12px', borderRadius: 6, border: '1px solid #e5e7eb',
                                        background: 'white', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer'
                                    }}
                                >
                                    <RefreshCw size={14} /> 새로고침
                                </button>
                            </div>

                            <div style={{ flex: 1, overflow: 'auto' }}>
                                {loadingRequests ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#6b7280' }}>
                                        데이터 로딩 중...
                                    </div>
                                ) : !selectedMeeting ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                                        <MessageSquare size={48} strokeWidth={1} style={{ marginBottom: 16, opacity: 0.5 }} />
                                        <div style={{ fontSize: 15 }}>좌측 목록에서 회의를 선택해주세요.</div>
                                    </div>
                                ) : requests.length === 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: '#9ca3af' }}>
                                        <div style={{ fontSize: 14 }}>등록된 해제 요청이 없습니다.</div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                        {/* 대기 중인 요청 목록 */}
                                        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                                <thead>
                                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                                                        <th style={{ padding: '10px 12px', fontWeight: 600, color: '#64748b', width: 40 }}>No</th>
                                                        <th style={{ padding: '10px 12px', fontWeight: 600, color: '#64748b' }}>요청일시</th>
                                                        <th style={{ padding: '10px 12px', fontWeight: 600, color: '#64748b' }}>거래처</th>
                                                        <th style={{ padding: '10px 12px', fontWeight: 600, color: '#64748b' }}>요청자</th>
                                                        <th style={{ padding: '10px 12px', fontWeight: 600, color: '#64748b' }}>상태</th>
                                                        <th style={{ padding: '10px 12px', fontWeight: 600, color: '#64748b' }}>채권현황</th>
                                                        <th style={{ padding: '10px 12px', fontWeight: 600, color: '#64748b' }}>해제사유</th>
                                                        <th style={{ padding: '10px 12px', fontWeight: 600, color: '#64748b', textAlign: 'center' }}>승인/반려</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {requests.filter(r => r.request_status !== 'APPROVED_FINAL').map((req, idx) => (
                                                        <React.Fragment key={req.id}>
                                                            <tr
                                                                onClick={() => handleRowClick(req)}
                                                                style={{
                                                                    borderBottom: '1px solid #f1f5f9',
                                                                    cursor: 'pointer',
                                                                    background: expandedId === req.id ? '#f8fafc' : 'white'
                                                                }}
                                                            >
                                                                <td style={{ padding: 12, color: '#64748b' }}>{idx + 1}</td>
                                                                <td style={{ padding: 12 }}>
                                                                    <div style={{ color: '#0f172a' }}>{formatDate(req.request_date)}</div>
                                                                </td>
                                                                <td style={{ padding: 12, fontWeight: 500, color: '#0f172a' }}>{req.customer_name}</td>
                                                                <td style={{ padding: 12, color: '#475569' }}>{req.requester_name || '-'}</td>
                                                                <td style={{ padding: 12 }}>
                                                                    {getStatusBadge(req.request_status)}
                                                                </td>
                                                                {/* <td style={{ padding: 12 }}>{getRiskBadge(req.current_risk_level)}</td> */}
                                                                <td style={{ padding: 12 }}>
                                                                    <div style={{ fontWeight: 500 }}>{formatCurrency(req.total_ar)}</div>
                                                                    <div style={{ color: '#ef4444', fontSize: 12 }}>연체: {formatCurrency(req.overdue)}</div>
                                                                </td>
                                                                <td style={{ padding: 12, maxWidth: 300 }}>
                                                                    <div style={{
                                                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                                        color: '#334155'
                                                                    }} title={req.reason_text}>
                                                                        {req.reason_text}
                                                                    </div>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleRowClick(req);
                                                                        }}
                                                                        style={{
                                                                            marginTop: 4, background: 'none', border: 'none', padding: 0,
                                                                            fontSize: 11, color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2
                                                                        }}
                                                                    >
                                                                        {expandedId === req.id ? '접기' : '상세보기'}
                                                                        {expandedId === req.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                                    </button>
                                                                </td>
                                                                <td style={{ padding: 12, textAlign: 'center' }}>
                                                                    {req.request_status === 'APPROVED_FINAL' ? (
                                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                                                            <span style={{
                                                                                fontSize: 12, color: '#059669', fontWeight: 700,
                                                                                background: '#d1fae5', padding: '4px 8px', borderRadius: 4,
                                                                                border: '1px solid #a7f3d0', display: 'inline-flex', alignItems: 'center', gap: 4
                                                                            }}>
                                                                                <CheckSquare size={12} strokeWidth={3} />
                                                                                승인 완료
                                                                            </span>
                                                                            <div
                                                                                style={{
                                                                                    display: 'inline-flex',
                                                                                    border: '1px solid #e5e7eb',
                                                                                    borderRadius: 6,
                                                                                    overflow: 'hidden',
                                                                                    background: '#f9fafb',
                                                                                    opacity: 0.5,
                                                                                    pointerEvents: 'none'
                                                                                }}
                                                                            >
                                                                                <button
                                                                                    disabled
                                                                                    style={{
                                                                                        padding: '5px 12px',
                                                                                        fontSize: 12,
                                                                                        fontWeight: 600,
                                                                                        border: 'none',
                                                                                        borderRight: '1px solid #e5e7eb',
                                                                                        cursor: 'not-allowed',
                                                                                        background: '#e5e7eb',
                                                                                        color: '#9ca3af'
                                                                                    }}>
                                                                                    승인
                                                                                </button>
                                                                                <button
                                                                                    disabled
                                                                                    style={{
                                                                                        padding: '5px 12px',
                                                                                        fontSize: 12,
                                                                                        fontWeight: 600,
                                                                                        border: 'none',
                                                                                        cursor: 'not-allowed',
                                                                                        background: '#e5e7eb',
                                                                                        color: '#9ca3af'
                                                                                    }}>
                                                                                    반려
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (() => {
                                                                        // 1차 승인 후에는 disable, 2차 반려 후에는 enable
                                                                        const isDisabled = approver1Decision === 'APPROVE' && approver2Decision !== 'REJECT'
                                                                        return (
                                                                        <div
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            style={{
                                                                                display: 'inline-flex',
                                                                                border: '1px solid #e5e7eb',
                                                                                borderRadius: 6,
                                                                                overflow: 'hidden',
                                                                                background: '#f9fafb',
                                                                                opacity: isDisabled ? 0.5 : 1
                                                                            }}
                                                                        >
                                                                            <button
                                                                                onClick={() => setRowDecisions(prev => ({ ...prev, [req.id]: prev[req.id] === 'APPROVE' ? null : 'APPROVE' }))}
                                                                                disabled={isDisabled}
                                                                                style={{
                                                                                    padding: '5px 12px',
                                                                                    fontSize: 12,
                                                                                    fontWeight: 600,
                                                                                    border: 'none',
                                                                                    borderRight: '1px solid #e5e7eb',
                                                                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                                                    background: rowDecisions[req.id] === 'APPROVE' ? '#3b82f6' : 'transparent',
                                                                                    color: rowDecisions[req.id] === 'APPROVE' ? 'white' : '#6b7280',
                                                                                    transition: 'all 0.15s',
                                                                                    whiteSpace: 'nowrap',
                                                                                    height: 28,
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center'
                                                                                }}>
                                                                                승인
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setRowDecisions(prev => ({ ...prev, [req.id]: prev[req.id] === 'REJECT' ? null : 'REJECT' }))}
                                                                                disabled={isDisabled}
                                                                                style={{
                                                                                    padding: '5px 12px',
                                                                                    fontSize: 12,
                                                                                    fontWeight: 600,
                                                                                    border: 'none',
                                                                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                                                    background: rowDecisions[req.id] === 'REJECT' ? '#3b82f6' : 'transparent',
                                                                                    color: rowDecisions[req.id] === 'REJECT' ? 'white' : '#6b7280',
                                                                                    transition: 'all 0.15s',
                                                                                    whiteSpace: 'nowrap',
                                                                                    height: 28,
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center'
                                                                                }}>
                                                                                반려
                                                                            </button>
                                                                        </div>
                                                                        )
                                                                    })()}
                                                                </td>
                                                            </tr>
                                                            {expandedId === req.id && (
                                                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                                    <td colSpan={8} style={{ padding: '0 16px 16px 16px' }}>
                                                                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginTop: 8 }}>
                                                                            {/* Header bar */}
                                                                            <div style={{
                                                                                background: '#f8fafc',
                                                                                borderBottom: '1px solid #e2e8f0',
                                                                                padding: '12px 20px',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'space-between'
                                                                            }}>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                                    <FileText size={16} className="text-gray-400" color="#64748b" />
                                                                                    <h4 style={{ fontSize: 13, fontWeight: 700, color: '#334155', margin: 0 }}>상세 내용 및 회수 계획</h4>
                                                                                </div>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>목표 해제일:</span>
                                                                                    <span style={{
                                                                                        fontSize: 12,
                                                                                        fontWeight: 600,
                                                                                        color: '#0369a1',
                                                                                        background: '#e0f2fe',
                                                                                        padding: '2px 8px',
                                                                                        borderRadius: 4,
                                                                                        border: '1px solid #bae6fd'
                                                                                    }}>
                                                                                        {formatDate(req.target_unblock_date)}
                                                                                    </span>
                                                                                </div>
                                                                            </div>

                                                                            {/* Content body */}
                                                                            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                                                                {/* Left Column */}
                                                                                <div>
                                                                                    <h5 style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, marginTop: 0 }}>
                                                                                        해제 상세 사유
                                                                                    </h5>
                                                                                    <div style={{
                                                                                        fontSize: 13,
                                                                                        lineHeight: 1.6,
                                                                                        color: '#334155',
                                                                                        whiteSpace: 'pre-wrap',
                                                                                        background: '#fcfcfc',
                                                                                        padding: 16,
                                                                                        borderRadius: 6,
                                                                                        border: '1px solid #f1f5f9',
                                                                                        minHeight: 80
                                                                                    }}>
                                                                                        {req.reason_text}
                                                                                    </div>
                                                                                </div>

                                                                                {/* Right Column */}
                                                                                <div>
                                                                                    <h5 style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, marginTop: 0 }}>
                                                                                        채권 향후 계획
                                                                                    </h5>
                                                                                    <div style={{
                                                                                        fontSize: 13,
                                                                                        lineHeight: 1.6,
                                                                                        color: '#334155',
                                                                                        whiteSpace: 'pre-wrap',
                                                                                        background: '#fcfcfc',
                                                                                        padding: 16,
                                                                                        borderRadius: 6,
                                                                                        border: '1px solid #f1f5f9',
                                                                                        minHeight: 80
                                                                                    }}>
                                                                                        {req.collection_plan}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* 최종 승인 완료 목록 */}
                                        {requests.filter(r => r.request_status === 'APPROVED_FINAL').length > 0 && (
                                            <div style={{
                                                marginTop: 16,
                                                borderTop: '2px solid #10b981',
                                                background: '#f0fdf4',
                                                minHeight: 700,
                                                maxHeight: 700,
                                                overflow: 'auto'
                                            }}>
                                                <div style={{
                                                    padding: '10px 16px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    borderBottom: '1px solid #d1fae5'
                                                }}>
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                                    </svg>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>
                                                        최종 승인 완료 ({requests.filter(r => r.request_status === 'APPROVED_FINAL').length}건)
                                                    </span>
                                                </div>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                                    <tbody>
                                                        {requests.filter(r => r.request_status === 'APPROVED_FINAL').map((req, idx) => (
                                                            <React.Fragment key={req.id}>
                                                                <tr
                                                                    onClick={() => handleRowClick(req)}
                                                                    style={{
                                                                        borderBottom: '1px solid #d1fae5',
                                                                        cursor: 'pointer',
                                                                        background: expandedId === req.id ? '#dcfce7' : '#f0fdf4'
                                                                    }}
                                                                >
                                                                    <td style={{ padding: 12, color: '#059669', width: 40 }}>{idx + 1}</td>
                                                                    <td style={{ padding: 12 }}>
                                                                        <div style={{ color: '#059669' }}>{formatDate(req.request_date)}</div>
                                                                    </td>
                                                                    <td style={{ padding: 12, fontWeight: 500, color: '#166534' }}>{req.customer_name}</td>
                                                                    <td style={{ padding: 12, color: '#059669' }}>{req.requester_name || '-'}</td>
                                                                    <td style={{ padding: 12 }}>
                                                                        <span style={{
                                                                            padding: '4px 10px',
                                                                            background: '#dcfce7',
                                                                            color: '#166534',
                                                                            borderRadius: 4,
                                                                            fontSize: 12,
                                                                            fontWeight: 600
                                                                        }}>
                                                                            승인완료
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ padding: 12 }}>
                                                                        <div style={{ fontWeight: 500, color: '#059669' }}>{formatCurrency(req.total_ar)}</div>
                                                                        <div style={{ color: '#16a34a', fontSize: 12 }}>연체: {formatCurrency(req.overdue)}</div>
                                                                    </td>
                                                                    <td style={{ padding: 12, maxWidth: 300 }}>
                                                                        <div style={{
                                                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                                            color: '#166534'
                                                                        }} title={req.reason_text}>
                                                                            {req.reason_text}
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ padding: 12, textAlign: 'center' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                                <polyline points="20 6 9 17 4 12"></polyline>
                                                                            </svg>
                                                                            {expandedId === req.id ? <ChevronUp size={14} color="#059669" /> : <ChevronDown size={14} color="#059669" />}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                                {expandedId === req.id && (
                                                                    <tr style={{ background: '#ecfdf5', borderBottom: '1px solid #d1fae5' }}>
                                                                        <td colSpan={8} style={{ padding: '0 16px 16px 16px' }}>
                                                                            <div style={{ background: '#fff', border: '1px solid #bbf7d0', borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginTop: 8 }}>
                                                                                {/* Header bar */}
                                                                                <div style={{
                                                                                    background: '#f0fdf4',
                                                                                    borderBottom: '1px solid #bbf7d0',
                                                                                    padding: '12px 20px',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'space-between'
                                                                                }}>
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                                        <FileText size={16} color="#16a34a" />
                                                                                        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#166534', margin: 0 }}>상세 내용 및 회수 계획</h4>
                                                                                    </div>
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                                        <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 500 }}>목표 해제일:</span>
                                                                                        <span style={{
                                                                                            fontSize: 12,
                                                                                            fontWeight: 600,
                                                                                            color: '#166534',
                                                                                            background: '#dcfce7',
                                                                                            padding: '2px 8px',
                                                                                            borderRadius: 4,
                                                                                            border: '1px solid #bbf7d0'
                                                                                        }}>
                                                                                            {formatDate(req.target_unblock_date)}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Content body */}
                                                                                <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                                                                    {/* Left Column */}
                                                                                    <div>
                                                                                        <h5 style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, marginTop: 0 }}>
                                                                                            해제 상세 사유
                                                                                        </h5>
                                                                                        <div style={{
                                                                                            fontSize: 13,
                                                                                            lineHeight: 1.6,
                                                                                            color: '#334155',
                                                                                            whiteSpace: 'pre-wrap',
                                                                                            background: '#f0fdf4',
                                                                                            padding: 16,
                                                                                            borderRadius: 6,
                                                                                            border: '1px solid #dcfce7',
                                                                                            minHeight: 80
                                                                                        }}>
                                                                                            {req.reason_text}
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Right Column */}
                                                                                    <div>
                                                                                        <h5 style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, marginTop: 0 }}>
                                                                                            채권 향후 계획
                                                                                        </h5>
                                                                                        <div style={{
                                                                                            fontSize: 13,
                                                                                            lineHeight: 1.6,
                                                                                            color: '#334155',
                                                                                            whiteSpace: 'pre-wrap',
                                                                                            background: '#f0fdf4',
                                                                                            padding: 16,
                                                                                            borderRadius: 6,
                                                                                            border: '1px solid #dcfce7',
                                                                                            minHeight: 80
                                                                                        }}>
                                                                                            {req.collection_plan}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </React.Fragment>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
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
                                            {decisionModal.type === 'APPROVE' ? '해제 요청 승인' :
                                                decisionModal.type === 'REJECT' ? '해제 요청 반려' : '해제 요청 보류'}
                                        </h3>
                                        <p style={{ color: '#4b5563', fontSize: 14, lineHeight: 1.5, marginTop: 8 }}>
                                            <strong>{decisionModal.customerName}</strong> 업체의 매출통제 해제 요청을
                                            {decisionModal.type === 'APPROVE' ? ' 승인' :
                                                decisionModal.type === 'REJECT' ? ' 반려' : ' 보류'}하시겠습니까?
                                        </p>

                                        <div style={{ marginTop: 20 }}>
                                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>처리 코멘트 (선택)</label>
                                            <textarea
                                                value={comment}
                                                onChange={e => setComment(e.target.value)}
                                                placeholder={decisionModal.type === 'HOLD' ? '보류 사유를 입력하세요.' : "승인/반려 사유나 지시사항을 입력하세요."}
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
                                                    background: decisionModal.type === 'APPROVE' ? '#10b981' :
                                                        decisionModal.type === 'REJECT' ? '#ef4444' : '#d97706',
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
                    </div>
                </div>

                {/* 결재 승인/반려 모달 */}
                {
                    approvalModal && (
                        <div style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
                        }}>
                            <div style={{
                                background: 'white', borderRadius: 16, width: 420, padding: 0,
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                overflow: 'hidden'
                            }}>
                                {/* 모달 헤더 */}
                                <div style={{
                                    padding: '20px 24px',
                                    background: approvalModal.type === 'APPROVE'
                                        ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
                                        : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                                    borderBottom: `2px solid ${approvalModal.type === 'APPROVE' ? '#10b981' : '#ef4444'}`
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: '50%',
                                            background: approvalModal.type === 'APPROVE'
                                                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontSize: 18,
                                            fontWeight: 700,
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                        }}>
                                            {approvalModal.approverLevel === '1st'
                                                ? (approver1Name ? approver1Name.charAt(0) : '?')
                                                : (approver2Name ? approver2Name.charAt(0) : '?')}
                                        </div>
                                        <div>
                                            <div style={{
                                                fontSize: 11,
                                                color: approvalModal.type === 'APPROVE' ? '#059669' : '#dc2626',
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}>
                                                {approvalModal.approverLevel === '1st' ? '1차 승인' : '최종 승인'}
                                            </div>
                                            <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                                                {approvalModal.approverLevel === '1st' ? approver1Name : approver2Name}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 모달 본문 */}
                                <div style={{ padding: 24 }}>
                                    <h3 style={{
                                        marginTop: 0,
                                        marginBottom: 8,
                                        fontSize: 18,
                                        fontWeight: 700,
                                        color: '#111827'
                                    }}>
                                        {approvalModal.type === 'APPROVE' ? '결재 승인' : '결재 반려'}
                                    </h3>
                                    <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>
                                        {approvalModal.type === 'APPROVE'
                                            ? '선택된 해제 요청 건들을 승인 처리하시겠습니까?'
                                            : '선택된 해제 요청 건들을 반려 처리하시겠습니까?'}
                                    </p>

                                    <div>
                                        <label style={{
                                            display: 'block',
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: '#374151',
                                            marginBottom: 6
                                        }}>
                                            {approvalModal.type === 'APPROVE' ? '승인 코멘트' : '반려 사유'} (선택)
                                        </label>
                                        <textarea
                                            value={approvalComment}
                                            onChange={e => setApprovalComment(e.target.value)}
                                            placeholder={approvalModal.type === 'APPROVE'
                                                ? '승인 관련 코멘트를 입력하세요.'
                                                : '반려 사유를 입력하세요.'}
                                            rows={3}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                borderRadius: 8,
                                                border: '1px solid #d1d5db',
                                                fontSize: 14,
                                                resize: 'none',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* 모달 푸터 */}
                                <div style={{
                                    padding: '16px 24px',
                                    background: '#f9fafb',
                                    borderTop: '1px solid #e5e7eb',
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: 8
                                }}>
                                    <button
                                        onClick={() => {
                                            setApprovalModal(null)
                                            setApprovalComment('')
                                        }}
                                        style={{
                                            padding: '10px 20px',
                                            background: 'white',
                                            border: '1px solid #d1d5db',
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                            fontSize: 14,
                                            fontWeight: 500,
                                            color: '#374151'
                                        }}
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!meetingId) return

                                            setBatchProcessing(true)

                                            // rowDecisions에서 승인/반려 대상 분류
                                            let approveRequestIds: number[] = []
                                            let rejectRequestIds: number[] = []

                                            if (approvalModal.approverLevel === '1st') {
                                                // 1차 승인자: 레코드별 선택 기반으로 분류
                                                Object.entries(rowDecisions).forEach(([id, decision]) => {
                                                    const requestId = parseInt(id)
                                                    if (decision === 'APPROVE') {
                                                        approveRequestIds.push(requestId)
                                                    } else if (decision === 'REJECT') {
                                                        rejectRequestIds.push(requestId)
                                                    }
                                                })
                                            } else {
                                                // 2차 승인자: 승인/반려 여부만 전달 (credit_unblock_request 변경 없음)
                                                if (approvalModal.type === 'APPROVE') {
                                                    // 승인: approveRequestIds에 아무거나 하나만 넣어서 isApprove=true 판단용
                                                    approveRequestIds = [1]
                                                } else {
                                                    // 반려: rejectRequestIds에 아무거나 하나만 넣어서 isReject=true 판단용
                                                    rejectRequestIds = [1]
                                                }
                                            }

                                            try {
                                                const res = await fetch(`/api/v1/credit/meetings/${meetingId}/batch-approval`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        approveRequestIds,
                                                        rejectRequestIds,
                                                        approverLevel: approvalModal.approverLevel,
                                                        approverId: approvalModal.approverLevel === '1st' ? '2019052701' : '2015030601',
                                                        comment: approvalComment
                                                    })
                                                })

                                                const data = await res.json()

                                                if (data.success) {
                                                    // 결재 상태 업데이트 (서버 응답 기반)
                                                    const { approverRole, decisionResult } = data

                                                    if (decisionResult === 'APPROVED_1ST' && approverRole === 'SALES_MANAGER') {
                                                        // 1차 승인 완료
                                                        setApprover1Decision('APPROVE')
                                                        setApprover2Decision(null) // 2차 enable
                                                    } else if (decisionResult === 'APPROVED_FINAL' && approverRole === 'CEO') {
                                                        // 최종 승인 완료
                                                        setApprover1Decision('APPROVE')
                                                        setApprover2Decision('APPROVE')
                                                    } else if (decisionResult === 'REJECTED' && approverRole === 'SALES_MANAGER') {
                                                        // 1차 반려
                                                        setApprover1Decision('REJECT')
                                                        setApprover2Decision(null)
                                                    } else if (decisionResult === 'REJECTED' && approverRole === 'CEO') {
                                                        // 2차 반려: 1차부터 다시 시작
                                                        setApprover1Decision(null)
                                                        setApprover2Decision(null)
                                                    }

                                                    // 목록 새로고침
                                                    fetchRequests(meetingId)
                                                    fetchStats(meetingId)

                                                    // alert(data.message || '처리가 완료되었습니다.')
                                                    setAlertModal({
                                                        isOpen: true,
                                                        message: data.message || '처리가 완료되었습니다.',
                                                        type: 'success'
                                                    })
                                                } else {
                                                    // alert(data.error || '처리 실패')
                                                    setAlertModal({
                                                        isOpen: true,
                                                        message: data.error || '처리 실패',
                                                        type: 'error'
                                                    })
                                                }
                                            } catch (error) {
                                                // alert('처리 중 오류 발생')
                                                setAlertModal({
                                                    isOpen: true,
                                                    message: '처리 중 오류가 발생했습니다.',
                                                    type: 'error'
                                                })
                                                console.error('Batch approval error:', error)
                                            } finally {
                                                setBatchProcessing(false)
                                                setApprovalModal(null)
                                                setApprovalComment('')
                                            }
                                        }}
                                        disabled={batchProcessing}
                                        style={{
                                            padding: '10px 20px',
                                            borderRadius: 8,
                                            border: 'none',
                                            cursor: batchProcessing ? 'not-allowed' : 'pointer',
                                            fontSize: 14,
                                            fontWeight: 600,
                                            color: 'white',
                                            background: approvalModal.type === 'APPROVE'
                                                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                            boxShadow: approvalModal.type === 'APPROVE'
                                                ? '0 4px 12px rgba(16,185,129,0.3)'
                                                : '0 4px 12px rgba(239,68,68,0.3)',
                                            opacity: batchProcessing ? 0.7 : 1
                                        }}
                                    >
                                        {batchProcessing ? '처리 중...' : (approvalModal.type === 'APPROVE' ? '승인' : '반려')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
                {/* 결재 이력 모달 */}
                {approvalHistoryModal && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                    }}>
                        <div style={{
                            background: 'white', borderRadius: 12, width: 700, maxHeight: '80vh',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column'
                        }}>
                            {/* Header */}
                            <div style={{
                                padding: '16px 20px', borderBottom: '1px solid #e5e7eb',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <FileText size={20} color="#3b82f6" />
                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>결재 이력</h3>
                                </div>
                                <button
                                    onClick={() => setApprovalHistoryModal(false)}
                                    style={{
                                        width: 32, height: 32, borderRadius: '50%', border: 'none',
                                        background: '#f1f5f9', cursor: 'pointer', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', color: '#64748b'
                                    }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
                                {loadingHistory ? (
                                    <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                                        로딩 중...
                                    </div>
                                ) : approvalHistory.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                                        결재 이력이 없습니다.
                                    </div>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc' }}>
                                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>결재일시</th>
                                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>승인자</th>
                                                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>역할</th>
                                                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>결과</th>
                                                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>코멘트</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {approvalHistory.map((hist) => (
                                                <tr key={hist.hist_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '10px 12px', color: '#334155' }}>
                                                        {hist.decided_at ? new Date(hist.decided_at).toLocaleString('ko-KR') : '-'}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', color: '#334155', fontWeight: 500 }}>
                                                        {hist.approver_name || hist.approver_assignee_id}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                        <span style={{
                                                            padding: '2px 8px',
                                                            borderRadius: 4,
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            background: hist.approver_role === 'CEO' ? '#dbeafe' : '#f0fdf4',
                                                            color: hist.approver_role === 'CEO' ? '#1e40af' : '#166534'
                                                        }}>
                                                            {hist.approver_role === 'CEO' ? '최종승인자' : hist.approver_role === 'CREDIT_MANAGER' ? '1차승인자' : hist.approver_role}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                        <span style={{
                                                            padding: '2px 10px',
                                                            borderRadius: 12,
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            background: hist.decision_result === 'APPROVED_1ST' ? '#dcfce7' :
                                                                hist.decision_result === 'APPROVED_FINAL' ? '#dbeafe' :
                                                                    hist.decision_result === 'REJECTED' ? '#fee2e2' : '#f1f5f9',
                                                            color: hist.decision_result === 'APPROVED_1ST' ? '#166534' :
                                                                hist.decision_result === 'APPROVED_FINAL' ? '#1e40af' :
                                                                    hist.decision_result === 'REJECTED' ? '#991b1b' : '#475569'
                                                        }}>
                                                            {hist.decision_result === 'APPROVED_1ST' ? '1차 승인' :
                                                                hist.decision_result === 'APPROVED_FINAL' ? '최종 승인' :
                                                                    hist.decision_result === 'REJECTED' ? '반려' : hist.decision_result}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '10px 12px', color: '#64748b', maxWidth: 200 }}>
                                                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={hist.decision_comment || ''}>
                                                            {hist.decision_comment || '-'}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Footer */}
                            <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setApprovalHistoryModal(false)}
                                    style={{
                                        padding: '8px 20px', borderRadius: 6, border: 'none',
                                        background: '#f1f5f9', color: '#475569', fontSize: 13,
                                        fontWeight: 600, cursor: 'pointer'
                                    }}
                                >
                                    닫기
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 알림 모달 */}
                <CreditAlertModal
                    isOpen={alertModal.isOpen}
                    message={alertModal.message}
                    type={alertModal.type}
                    onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                />
            </div>
        </div>
    )
}
