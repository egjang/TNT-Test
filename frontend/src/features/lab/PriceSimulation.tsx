import React, { useState, useEffect } from 'react'
import { Search, Calendar, User, TrendingUp, AlertCircle, Award, ThumbsUp } from 'lucide-react'
import { CustomerSearchModal } from '../customer/CustomerSearchModal'

type SimulationData = {
    customerSeq: number
    customerName: string
    volumeYear2: number
    volumeYear1: number
    volumeCurrent: number
    volumeGrowthRate: number
    volumeScore: number
    totalAr: number
    overdueAr: number
    overdueRatio: number
    agingScore: number
    ratingAgency: string
    ratingGrade: string
    ratingScore: number
    assessmentScore: number
    assessmentComment: string
    totalScore: number
    suggestedIncreaseRate: number
    items: SimulationItem[]
}

type SimulationItem = {
    itemSeq: number
    itemName: string
    itemUnit: string
    recentUnitPrice: number
    recentQty: number
    simulatedUnitPrice: number
}

export function PriceSimulation() {
    const [customer, setCustomer] = useState<{ seq: number; name: string } | null>(null)
    const [startDate, setStartDate] = useState<string>(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0])
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [data, setData] = useState<SimulationData | null>(null)
    const [loading, setLoading] = useState(false)
    const [searchOpen, setSearchOpen] = useState(false)
    const [repScore, setRepScore] = useState(50)
    const [repComment, setRepComment] = useState('')

    // Auto-fetch removed per user request
    // useEffect(() => {
    //     if (customer) {
    //         fetchSimulationData()
    //     }
    // }, [customer, startDate, endDate])

    const fetchSimulationData = async () => {
        if (!customer) return
        setLoading(true)
        try {
            const res = await fetch(`/api/v1/lab/price-simulation/data?customerSeq=${customer.seq}&startDate=${startDate}&endDate=${endDate}`)
            if (res.ok) {
                const json = await res.json()
                setData(json)
                setRepScore(json.assessmentScore)
                setRepComment(json.assessmentComment || '')
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleSaveAssessment = async () => {
        if (!customer) return
        try {
            await fetch('/api/v1/lab/price-simulation/assessment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerSeq: customer.seq,
                    assessorId: 'current-user', // TODO: Get actual user ID
                    score: repScore,
                    comment: repComment
                })
            })
            fetchSimulationData() // Refresh to update total score
        } catch (err) {
            console.error(err)
        }
    }

    return (
        <div className="price-simulation" style={{ padding: 20, height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: 24, fontWeight: 'bold' }}>Price Simulation</h1>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f5f5f5', padding: '4px 12px', borderRadius: 8 }}>
                        <Calendar size={16} />
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ border: 'none', background: 'transparent' }} />
                        <span>~</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ border: 'none', background: 'transparent' }} />
                    </div>
                    <button
                        onClick={() => setSearchOpen(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#333', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer' }}
                    >
                        <User size={16} />
                        {customer ? customer.name : '거래처 선택'}
                    </button>
                    <button
                        onClick={fetchSimulationData}
                        disabled={!customer || loading}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                            background: (!customer || loading) ? '#ccc' : '#2563eb',
                            color: '#fff', borderRadius: 8, border: 'none', cursor: (!customer || loading) ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        SIMULATION
                    </button>
                </div>
            </header>

            {customer && data ? (
                <>
                    {/* Dashboard Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                        <Card title="거래규모 (성장성)" icon={<TrendingUp color="#4CAF50" />} score={data.volumeScore}>
                            <div style={{ fontSize: 12, color: '#666' }}>
                                <div>금년: {data.volumeCurrent?.toLocaleString()}</div>
                                <div>전년: {data.volumeYear1?.toLocaleString()}</div>
                                <div style={{ fontWeight: 'bold', color: data.volumeGrowthRate >= 0 ? '#4CAF50' : '#F44336' }}>
                                    YoY: {data.volumeGrowthRate?.toFixed(1)}%
                                </div>
                            </div>
                        </Card>
                        <Card title="채권 건전성" icon={<AlertCircle color="#FF9800" />} score={data.agingScore}>
                            <div style={{ fontSize: 12, color: '#666' }}>
                                <div>총채권: {data.totalAr?.toLocaleString()}</div>
                                <div>연체: {data.overdueAr?.toLocaleString()}</div>
                                <div style={{ fontWeight: 'bold', color: data.overdueRatio > 0 ? '#F44336' : '#4CAF50' }}>
                                    연체율: {data.overdueRatio?.toFixed(1)}%
                                </div>
                            </div>
                        </Card>
                        <Card title="대외 신용도" icon={<Award color="#2196F3" />} score={data.ratingScore}>
                            <div style={{ fontSize: 12, color: '#666' }}>
                                <div>기관: {data.ratingAgency || '-'}</div>
                                <div style={{ fontSize: 24, fontWeight: 'bold', margin: '4px 0' }}>{data.ratingGrade || '-'}</div>
                            </div>
                        </Card>
                        <Card title="영업 정성평가" icon={<ThumbsUp color="#9C27B0" />} score={data.assessmentScore}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <input
                                    type="range" min="0" max="100" step="20"
                                    value={repScore}
                                    onChange={e => setRepScore(Number(e.target.value))}
                                    style={{ width: '100%' }}
                                />
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <input
                                        type="text"
                                        value={repComment}
                                        onChange={e => setRepComment(e.target.value)}
                                        placeholder="평가 코멘트"
                                        style={{ flex: 1, padding: 4, borderRadius: 4, border: '1px solid #ddd', fontSize: 12 }}
                                    />
                                    <button onClick={handleSaveAssessment} style={{ fontSize: 10, padding: '4px 8px', background: '#333', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>저장</button>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Simulation Result Banner */}
                    <div style={{ background: 'linear-gradient(90deg, #1a237e 0%, #283593 100%)', padding: 20, borderRadius: 12, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: 18, opacity: 0.9 }}>Price Simulation Result</h2>
                            <p style={{ margin: '4px 0 0 0', fontSize: 14, opacity: 0.7 }}>종합 점수 {data.totalScore}점을 기반으로 산출된 권장 인상률입니다.</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 14, opacity: 0.8 }}>권장 인상률</div>
                            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#4CAF50' }}>+{data.suggestedIncreaseRate?.toFixed(2)}%</div>
                        </div>
                    </div>

                    {/* Item List */}
                    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f9f9f9', borderBottom: '1px solid #eee' }}>
                                <tr>
                                    <th style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#666' }}>품목명</th>
                                    <th style={{ padding: 12, textAlign: 'center', fontSize: 12, color: '#666' }}>단위</th>
                                    <th style={{ padding: 12, textAlign: 'right', fontSize: 12, color: '#666' }}>최근 판매량</th>
                                    <th style={{ padding: 12, textAlign: 'right', fontSize: 12, color: '#666' }}>최근 평균단가</th>
                                    <th style={{ padding: 12, textAlign: 'right', fontSize: 12, color: '#666', background: '#e8f5e9' }}>시뮬레이션 단가</th>
                                    <th style={{ padding: 12, textAlign: 'right', fontSize: 12, color: '#666' }}>예상 증분</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.items?.map(item => (
                                    <tr key={item.itemSeq} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                        <td style={{ padding: 12, fontSize: 14 }}>{item.itemName}</td>
                                        <td style={{ padding: 12, textAlign: 'center', fontSize: 12, color: '#888' }}>{item.itemUnit}</td>
                                        <td style={{ padding: 12, textAlign: 'right', fontSize: 14 }}>{item.recentQty?.toLocaleString()}</td>
                                        <td style={{ padding: 12, textAlign: 'right', fontSize: 14 }}>{item.recentUnitPrice?.toLocaleString()}</td>
                                        <td style={{ padding: 12, textAlign: 'right', fontSize: 14, fontWeight: 'bold', color: '#2E7D32', background: '#f1f8e9' }}>
                                            {item.simulatedUnitPrice?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </td>
                                        <td style={{ padding: 12, textAlign: 'right', fontSize: 12, color: '#4CAF50' }}>
                                            +{(item.simulatedUnitPrice - item.recentUnitPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </td>
                                    </tr>
                                ))}
                                {(!data.items || data.items.length === 0) && (
                                    <tr>
                                        <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#999' }}>
                                            해당 기간에 판매 이력이 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#999', gap: 16 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 32, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={32} color="#ccc" />
                    </div>
                    <p>상단에서 거래처를 선택하여 시뮬레이션을 시작하세요.</p>
                </div>
            )}

            {searchOpen && (
                <CustomerSearchModal
                    onClose={() => setSearchOpen(false)}
                    onSelect={(c) => {
                        setCustomer({ seq: c.customerSeq, name: c.customerName })
                        setSearchOpen(false)
                    }}
                />
            )}
        </div>
    )
}

function Card({ title, icon, score, children }: { title: string, icon: React.ReactNode, score: number, children: React.ReactNode }) {
    return (
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'bold', fontSize: 14 }}>
                    {icon}
                    {title}
                </div>
                <div style={{
                    padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 'bold',
                    background: score >= 80 ? '#E8F5E9' : score >= 50 ? '#FFF3E0' : '#FFEBEE',
                    color: score >= 80 ? '#2E7D32' : score >= 50 ? '#EF6C00' : '#C62828'
                }}>
                    {score}점
                </div>
            </div>
            <div style={{ height: 1, background: '#f0f0f0' }} />
            {children}
        </div>
    )
}
