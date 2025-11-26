import React, { useState, useEffect } from 'react'
import { Plus, ExternalLink } from 'lucide-react'

interface CompetitorTrendsProps {
    competitorId: number
}

export function CompetitorTrends({ competitorId }: CompetitorTrendsProps) {
    const [insights, setInsights] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        insightCategoryCd: 'NEWS',
        description: '',
        evidenceUrl: ''
    })

    const fetchInsights = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/v1/competitors/${competitorId}/insights`)
            if (res.ok) {
                const data = await res.json()
                setInsights(data)
            }
        } catch (error) {
            console.error('Failed to fetch insights', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (competitorId) {
            fetchInsights()
        }
    }, [competitorId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const res = await fetch(`/api/v1/competitors/${competitorId}/insights`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            if (res.ok) {
                setFormData({ title: '', insightCategoryCd: 'NEWS', description: '', evidenceUrl: '' })
                setIsAdding(false)
                fetchInsights()
            }
        } catch (error) {
            console.error('Failed to add insight', error)
        }
    }

    return (
        <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>동향 목록</h3>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', background: '#f3f4f6', border: '1px solid #d1d5db',
                        borderRadius: 6, fontSize: 13, cursor: 'pointer'
                    }}
                >
                    <Plus size={14} />
                    {isAdding ? '취소' : '등록'}
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} style={{ marginBottom: 24, padding: 16, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'grid', gap: 12 }}>
                        <input
                            type="text"
                            placeholder="제목"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            required
                            style={{ padding: '8px', borderRadius: 4, border: '1px solid #d1d5db' }}
                        />
                        <select
                            value={formData.insightCategoryCd}
                            onChange={e => setFormData({ ...formData, insightCategoryCd: e.target.value })}
                            style={{ padding: '8px', borderRadius: 4, border: '1px solid #d1d5db' }}
                        >
                            <option value="NEWS">뉴스</option>
                            <option value="RUMOR">루머</option>
                            <option value="ANNOUNCEMENT">공시</option>
                        </select>
                        <textarea
                            placeholder="내용"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            style={{ padding: '8px', borderRadius: 4, border: '1px solid #d1d5db' }}
                        />
                        <input
                            type="text"
                            placeholder="관련 URL"
                            value={formData.evidenceUrl}
                            onChange={e => setFormData({ ...formData, evidenceUrl: e.target.value })}
                            style={{ padding: '8px', borderRadius: 4, border: '1px solid #d1d5db' }}
                        />
                        <button
                            type="submit"
                            style={{
                                padding: '8px', background: '#2563eb', color: 'white',
                                border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600
                            }}
                        >
                            저장
                        </button>
                    </div>
                </form>
            )}

            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {loading ? (
                    <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>로딩 중...</div>
                ) : insights.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>등록된 동향 정보가 없습니다.</div>
                ) : (
                    insights.map(insight => (
                        <div key={insight.insightId} style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{
                                    fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                                    background: '#eff6ff', color: '#1d4ed8'
                                }}>
                                    {insight.insightCategoryCd}
                                </span>
                                <span style={{ fontSize: 12, color: '#6b7280' }}>
                                    {new Date(insight.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600 }}>{insight.title}</h4>
                            <p style={{ margin: 0, fontSize: 13, color: '#4b5563', whiteSpace: 'pre-wrap' }}>{insight.description}</p>
                            {insight.evidenceUrl && (
                                <a
                                    href={insight.evidenceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        marginTop: 8, fontSize: 12, color: '#2563eb', textDecoration: 'none'
                                    }}
                                >
                                    <ExternalLink size={12} /> 관련 링크
                                </a>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
