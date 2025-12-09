import React, { useState } from 'react'
import { AlertCircle, Calendar, FileText, CheckCircle2 } from 'lucide-react'

interface UnblockRequestModalProps {
    customerSeq: number
    customerName: string
    requestId?: number            // Optional for Edit
    initialData?: {               // Optional for Edit
        reason: string
        collectionPlan: string
        targetDate: string
    }
    onClose: () => void
    onSuccess: () => void
}

export function UnblockRequestModal({ customerSeq, customerName, requestId, initialData, onClose, onSuccess }: UnblockRequestModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [reason, setReason] = useState(initialData?.reason || '')
    const [collectionPlan, setCollectionPlan] = useState(initialData?.collectionPlan || '')
    const [targetDate, setTargetDate] = useState(initialData?.targetDate || '')

    const handleSubmit = async () => {
        if (!reason || !collectionPlan || !targetDate) {
            setError('모든 필수 항목을 입력해주세요.')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const url = requestId
                ? `/api/v1/credit/unblock-requests/${requestId}`
                : '/api/v1/credit/unblock-requests'

            const method = requestId ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerSeq,
                    customerName,
                    // In real app, these should come from logged in context
                    companyType: 'TNT',
                    assigneeId: 'test_user',
                    createdBy: 'test_user',

                    reasonText: reason,
                    collectionPlan: collectionPlan,
                    targetUnblockDate: targetDate,

                    // These summaries would ideally be passed from the parent or recalculated backend
                    // Sending dummy/null for now as backend might recalculate or use what's passed
                    summaryTotalAging: 0,
                    summaryLast3Collect: 0,
                    summaryLast3mSalesAvg: 0
                }),
            })

            if (!res.ok) throw new Error('요청 처리 실패')
            const data = await res.json()

            if (data.success) {
                onSuccess()
            } else {
                throw new Error(data.error || '요청 처리 실패')
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}>
            <div style={{
                background: 'white', borderRadius: 16, width: '100%', maxWidth: 500,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb' }}>
                    <div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
                            {requestId ? '매출통제 해제 재상신(수정)' : '매출통제 해제 요청'}
                        </h3>
                        <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0 0' }}>{customerName}</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, color: '#9ca3af', cursor: 'pointer' }}>&times;</button>
                </div>

                {/* Body */}
                <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {error && (
                        <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 8, color: '#ef4444', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                            해제 사유 <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="예: 긴급 납품 요청, 담보 추가 제공 예정 등"
                            rows={3}
                            style={{
                                width: '100%', padding: 12, borderRadius: 8, border: '1px solid #d1d5db',
                                fontSize: 14, resize: 'none'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                            채권 회수 계획 <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <textarea
                            value={collectionPlan}
                            onChange={(e) => setCollectionPlan(e.target.value)}
                            placeholder="구체적인 입금 계획 및 일정을 입력하세요"
                            rows={3}
                            style={{
                                width: '100%', padding: 12, borderRadius: 8, border: '1px solid #d1d5db',
                                fontSize: 14, resize: 'none'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                            해제 목표일 <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            type="date"
                            value={targetDate}
                            onChange={(e) => setTargetDate(e.target.value)}
                            style={{
                                width: '100%', padding: '0 12px', height: 42, borderRadius: 8, border: '1px solid #d1d5db',
                                fontSize: 14
                            }}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 24px', background: '#f9fafb', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <button
                        onClick={onClose}
                        className="btn"
                        style={{
                            padding: '8px 16px', background: 'white', border: '1px solid #d1d5db',
                            borderRadius: 6, color: '#374151', fontWeight: 500, cursor: 'pointer'
                        }}
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="btn"
                        style={{
                            padding: '8px 16px', background: '#3b82f6', border: '1px solid #3b82f6',
                            borderRadius: 6, color: 'white', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6, opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? '처리 중...' : (
                            <>
                                <CheckCircle2 size={16} />
                                요청 제출
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
