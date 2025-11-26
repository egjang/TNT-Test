import React, { useState, useEffect, useMemo } from 'react'
// Re-saving to force rebuild
import { Search, Plus } from 'lucide-react'
import { CompetitorRegister } from './CompetitorRegister'
import { CompetitorDetailPanel } from './CompetitorDetailPanel'

interface Competitor {
    competitorId: number
    competitorName: string
    country: string
    homepage: string
    foundedYear: number
    description: string
    marketPositionCd: string
    distributionModel: string
    createdAt: string
}

export function CompetitorManagement() {
    const [competitors, setCompetitors] = useState<Competitor[]>([])
    const [loading, setLoading] = useState(false)
    const [isRegisterOpen, setIsRegisterOpen] = useState(false)

    // Filters
    const [searchName, setSearchName] = useState('')
    const [filterPosition, setFilterPosition] = useState('')
    const [filterDistribution, setFilterDistribution] = useState('')

    const fetchCompetitors = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (searchName) params.append('name', searchName)
            if (filterPosition) params.append('marketPosition', filterPosition)
            if (filterDistribution) params.append('distributionModel', filterDistribution)

            const res = await fetch(`/api/v1/competitors?${params.toString()}`)
            if (res.ok) {
                const data = await res.json()
                setCompetitors(data)
                // Auto-select first competitor if none selected or current selection not in new list
                if (data.length > 0) {
                    const currentStillExists = selectedCompetitor && data.find((c: Competitor) => c.competitorId === selectedCompetitor.competitorId)
                    if (!currentStillExists) {
                        setSelectedCompetitor(data[0])
                    }
                } else {
                    setSelectedCompetitor(null)
                }
            }
        } catch (error) {
            console.error('Failed to fetch competitors', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCompetitors()
    }, [])



    const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null)

    // ... (existing code)

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8f9fa' }}>
            {/* Header & Filters */}
            <div style={{ padding: '12px 24px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
                {/* Search & Filters */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1, maxWidth: 240 }}>
                        <input
                            type="text"
                            placeholder="경쟁사명 검색"
                            value={searchName}
                            onChange={e => setSearchName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && fetchCompetitors()}
                            style={{ width: '100%', padding: '6px 12px 6px 36px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, height: 32 }}
                        />
                        <Search size={16} style={{ position: 'absolute', left: 10, top: 8, color: '#9ca3af' }} />
                    </div>

                    <select
                        value={filterPosition}
                        onChange={e => setFilterPosition(e.target.value)}
                        style={{ padding: '0 12px', borderRadius: 6, border: '1px solid #d1d5db', minWidth: 120, fontSize: 13, height: 32 }}
                    >
                        <option value="">시장 지위 (전체)</option>
                        <option value="기술 리더">기술 리더</option>
                        <option value="품질 강자">품질 강자</option>
                        <option value="가성비 중심">가성비 중심</option>
                        <option value="초저가 진입자">초저가 진입자</option>
                    </select>

                    <select
                        value={filterDistribution}
                        onChange={e => setFilterDistribution(e.target.value)}
                        style={{ padding: '0 12px', borderRadius: 6, border: '1px solid #d1d5db', minWidth: 120, fontSize: 13, height: 32 }}
                    >
                        <option value="">유통 모델 (전체)</option>
                        <option value="직판">직판</option>
                        <option value="총판">총판</option>
                        <option value="대리점">대리점</option>
                        <option value="온라인">온라인</option>
                    </select>

                    <button
                        onClick={fetchCompetitors}
                        style={{
                            padding: '0 16px', background: '#f3f4f6', color: '#374151',
                            border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', height: 32
                        }}
                    >
                        검색
                    </button>

                    <div style={{ flex: 1 }} />

                    <button
                        onClick={() => setIsRegisterOpen(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '0 16px', background: '#2563eb', color: 'white',
                            border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', height: 32
                        }}
                    >
                        <Plus size={16} />
                        경쟁사 등록
                    </button>
                </div>
            </div>

            {/* Content Area (Split Layout) */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* List Area */}
                <div style={{ flex: selectedCompetitor ? 1 : 1, padding: 24, paddingBottom: selectedCompetitor ? 12 : 24, overflow: 'hidden', transition: 'flex 0.3s' }}>
                    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ overflow: 'auto', flex: 1 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 10 }}>
                                    <tr>
                                        <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>경쟁사명</th>
                                        <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>국가</th>
                                        <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>설립연도</th>
                                        <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>시장 지위</th>
                                        <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>유통 모델</th>
                                        <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>홈페이지</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>로딩 중...</td></tr>
                                    ) : competitors.length === 0 ? (
                                        <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>데이터가 없습니다.</td></tr>
                                    ) : (
                                        competitors.map(comp => (
                                            <tr
                                                key={comp.competitorId}
                                                onClick={() => setSelectedCompetitor(comp)}
                                                style={{
                                                    borderBottom: '1px solid #e5e7eb',
                                                    cursor: 'pointer',
                                                    background: selectedCompetitor?.competitorId === comp.competitorId ? '#eff6ff' : 'transparent'
                                                }}
                                            >
                                                <td style={{ padding: '16px 24px', fontWeight: 600, color: '#111827' }}>{comp.competitorName}</td>
                                                <td style={{ padding: '16px 24px', color: '#4b5563' }}>{comp.country || '-'}</td>
                                                <td style={{ padding: '16px 24px', color: '#4b5563' }}>{comp.foundedYear || '-'}</td>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <span style={{
                                                        padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                                        background: comp.marketPositionCd === '기술 리더' ? '#ede9fe' :
                                                            comp.marketPositionCd === '품질 강자' ? '#d1fae5' :
                                                                comp.marketPositionCd === '가성비 중심' ? '#fef3c7' : '#f3f4f6',
                                                        color: comp.marketPositionCd === '기술 리더' ? '#7c3aed' :
                                                            comp.marketPositionCd === '품질 강자' ? '#059669' :
                                                                comp.marketPositionCd === '가성비 중심' ? '#d97706' : '#4b5563'
                                                    }}>
                                                        {comp.marketPositionCd || '-'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px 24px', color: '#4b5563' }}>{comp.distributionModel || '-'}</td>
                                                <td style={{ padding: '16px 24px' }}>
                                                    {comp.homepage ? (
                                                        <a
                                                            href={comp.homepage}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            onClick={e => e.stopPropagation()}
                                                            style={{ color: '#2563eb', textDecoration: 'none' }}
                                                        >
                                                            Link
                                                        </a>
                                                    ) : '-'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Details Area */}
                {selectedCompetitor && (
                    <div style={{ height: '600px', padding: '0 24px 24px 24px', borderTop: '1px solid #e5e7eb', background: '#f8f9fa', transition: 'height 0.3s' }}>
                        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: '100%', overflow: 'hidden' }}>
                            <CompetitorDetailPanel
                                competitor={selectedCompetitor}
                                onUpdate={() => {
                                    fetchCompetitors()
                                    // Optionally refresh selected competitor details if needed
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Registration Modal */}
            {isRegisterOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 50,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto' }}>
                        <CompetitorRegister
                            onSuccess={() => {
                                setIsRegisterOpen(false)
                                fetchCompetitors()
                            }}
                            onCancel={() => setIsRegisterOpen(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}


