import React, { useEffect, useState } from 'react'
import { useCreditWorkflow } from './CreditWorkflowContext'

type UnblockStats = {
    totalCount: number
    totalAmount: number
    statusBreakdown: Record<string, number>
    topRequesters: { emp_name: string; cnt: number }[]
}

export function UnblockStatsRightPanel() {
    const { meetingId } = useCreditWorkflow()
    const [stats, setStats] = useState<UnblockStats | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (meetingId) {
            fetchStats()
        } else {
            setStats(null)
        }
    }, [meetingId])

    const fetchStats = async () => {
        if (!meetingId) return
        setLoading(true)
        try {
            const res = await fetch(`/api/v1/credit/meetings/${meetingId}/stats`)
            const data = await res.json()
            if (data.success) {
                setStats(data)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (val: number) => `₩${(val || 0).toLocaleString()}`

    if (!meetingId) {
        return (
            <div className="placeholder">
                회의를 선택하면 통계가 표시됩니다.
            </div>
        )
    }

    if (loading) {
        return <div className="placeholder">통계 불러오는 중...</div>
    }

    if (!stats) {
        return <div className="placeholder">데이터가 없습니다.</div>
    }

    // Status Colors
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED_FINAL': return '#059669'
            case 'APPROVED_1ST': return '#3b82f6'
            case 'REJECTED': return '#ef4444'
            case 'HOLD': return '#d97706'
            default: return '#6b7280'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'APPROVED_FINAL': return '최종승인'
            case 'APPROVED_1ST': return '1차승인'
            case 'REJECTED': return '반려됨'
            case 'HOLD': return '보류'
            case 'SUBMITTED': return '요청됨'
            case 'DRAFT': return '작성중'
            default: return status
        }
    }

    return (
        <div style={{ height: '100%', overflowY: 'auto', padding: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 0, marginBottom: 16, color: '#111827' }}>매출통제 해제 현황</h3>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>총 요청 건수</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{stats.totalCount}건</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>총 대상 채권액</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', wordBreak: 'break-all' }}>{formatCurrency(stats.totalAmount)}</div>
                </div>
            </div>

            {/* Status Breakdown with Bars */}
            <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 12 }}>진행 상태별 현황</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries(stats.statusBreakdown).map(([status, count]) => {
                        const percentage = (count / stats.totalCount) * 100
                        return (
                            <div key={status}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                                    <span style={{ color: '#334155' }}>{getStatusLabel(status)}</span>
                                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{count}건</span>
                                </div>
                                <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${percentage}%`, background: getStatusColor(status), borderRadius: 3 }}></div>
                                </div>
                            </div>
                        )
                    })}
                    {Object.keys(stats.statusBreakdown).length === 0 && (
                        <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: 8 }}>데이터 없음</div>
                    )}
                </div>
            </div>

            {/* Top Requesters */}
            <div>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 12 }}>주요 요청자 Top 5</h4>
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                    {stats.topRequesters.map((req, idx) => (
                        <div key={idx} style={{ padding: '8px 12px', borderBottom: idx < stats.topRequesters.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: 18, height: 18, borderRadius: '50%', background: '#f1f5f9',
                                    fontSize: 10, fontWeight: 600, color: '#64748b'
                                }}>{idx + 1}</span>
                                <span style={{ fontSize: 13, color: '#334155' }}>{req.emp_name}</span>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{req.cnt}건</span>
                        </div>
                    ))}
                    {stats.topRequesters.length === 0 && (
                        <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: 12 }}>데이터 없음</div>
                    )}
                </div>
            </div>
        </div>
    )
}
