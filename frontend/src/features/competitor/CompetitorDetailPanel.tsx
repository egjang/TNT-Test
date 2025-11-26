import React, { useState } from 'react'
import { X } from 'lucide-react'
import { CompetitorEdit } from './CompetitorEdit'
import { CompetitorTrends } from './CompetitorTrends'

interface CompetitorDetailPanelProps {
    competitor: any
    onUpdate: () => void
}

export function CompetitorDetailPanel({ competitor, onUpdate }: CompetitorDetailPanelProps) {
    const [activeTab, setActiveTab] = useState<'info' | 'trends' | 'price'>('info')

    if (!competitor) return null

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', borderLeft: '1px solid #e5e7eb' }}>


            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
                <button
                    onClick={() => setActiveTab('info')}
                    style={{
                        flex: 1, padding: '12px', background: 'none', border: 'none',
                        borderBottom: activeTab === 'info' ? '2px solid #2563eb' : '2px solid transparent',
                        color: activeTab === 'info' ? '#2563eb' : '#6b7280',
                        fontWeight: 600, cursor: 'pointer'
                    }}
                >
                    정보수정
                </button>
                <button
                    onClick={() => setActiveTab('trends')}
                    style={{
                        flex: 1, padding: '12px', background: 'none', border: 'none',
                        borderBottom: activeTab === 'trends' ? '2px solid #2563eb' : '2px solid transparent',
                        color: activeTab === 'trends' ? '#2563eb' : '#6b7280',
                        fontWeight: 600, cursor: 'pointer'
                    }}
                >
                    동향정보
                </button>
                <button
                    onClick={() => setActiveTab('price')}
                    style={{
                        flex: 1, padding: '12px', background: 'none', border: 'none',
                        borderBottom: activeTab === 'price' ? '2px solid #2563eb' : '2px solid transparent',
                        color: activeTab === 'price' ? '#2563eb' : '#6b7280',
                        fontWeight: 600, cursor: 'pointer'
                    }}
                >
                    가격정보
                </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                {activeTab === 'info' ? (
                    <CompetitorEdit competitor={competitor} onSuccess={onUpdate} />
                ) : activeTab === 'trends' ? (
                    <CompetitorTrends competitorId={competitor.competitorId} />
                ) : (
                    <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                        가격정보 기능은 준비 중입니다.
                    </div>
                )}
            </div>
        </div>
    )
}
