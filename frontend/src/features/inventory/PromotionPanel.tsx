import { useState } from 'react'
import { Plus, Calendar, Check, ChevronDown, ChevronUp } from 'lucide-react'

interface Promotion {
    id: number
    name: string
    discountRate: number
    startDate: string
    endDate: string
    status: string
    description: string
}

interface PromotionPanelProps {
    selectedItemsCount: number
    onApplyPromotion: (promotionId: number) => void
}

export function PromotionPanel({ selectedItemsCount, onApplyPromotion }: PromotionPanelProps) {
    // Mock data for UI testing
    const [promotions, setPromotions] = useState<Promotion[]>([
        {
            id: 1,
            name: '유통기한 임박 긴급 세일',
            discountRate: 30,
            startDate: '2025-11-22',
            endDate: '2025-12-22',
            status: 'ACTIVE',
            description: '유통기한이 30일 이내로 남은 상품 30% 할인'
        },
        {
            id: 2,
            name: '시즌 오프 프로모션',
            discountRate: 20,
            startDate: '2025-11-22',
            endDate: '2026-01-21',
            status: 'ACTIVE',
            description: '계절 상품 재고 정리 20% 할인'
        },
        {
            id: 3,
            name: '대량 구매 할인',
            discountRate: 15,
            startDate: '2025-11-22',
            endDate: '2026-02-20',
            status: 'ACTIVE',
            description: '10개 이상 대량 구매시 15% 할인'
        }
    ])
    const [isCreating, setIsCreating] = useState(false)
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [newPromo, setNewPromo] = useState({
        name: '',
        discountRate: 0,
        startDate: '',
        endDate: '',
        description: ''
    })

    // Disabled API call for UI testing
    // useEffect(() => {
    //     fetchPromotions()
    // }, [])

    // const fetchPromotions = async () => {
    //     try {
    //         const res = await fetch('/api/v1/promotions')
    //         if (res.ok) {
    //             const data = await res.json()
    //             setPromotions(data)
    //         }
    //     } catch (err) {
    //         console.error('Failed to fetch promotions', err)
    //     }
    // }

    const handleCreate = () => {
        // Mock create for UI testing
        const newId = Math.max(...promotions.map(p => p.id), 0) + 1
        const newPromotion: Promotion = {
            id: newId,
            name: newPromo.name,
            discountRate: newPromo.discountRate,
            startDate: newPromo.startDate,
            endDate: newPromo.endDate,
            status: 'ACTIVE',
            description: newPromo.description
        }
        setPromotions([...promotions, newPromotion])
        setIsCreating(false)
        setNewPromo({ name: '', discountRate: 0, startDate: '', endDate: '', description: '' })

        // Disabled API call for UI testing
        // try {
        //     const res = await fetch('/api/v1/promotions', {
        //         method: 'POST',
        //         headers: { 'Content-Type': 'application/json' },
        //         body: JSON.stringify(newPromo)
        //     })
        //     if (res.ok) {
        //         setIsCreating(false)
        //         setNewPromo({ name: '', discountRate: 0, startDate: '', endDate: '', description: '' })
        //         fetchPromotions()
        //     }
        // } catch (err) {
        //     console.error('Failed to create promotion', err)
        // }
    }

    return (
        <div style={{ width: '100%', height: '100%', borderLeft: '1px solid #e5e7eb', background: '#fff', display: 'flex', flexDirection: 'column', fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif', fontSize: '0.95em' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: 'inherit' }}>프로모션 관리</h2>
                <button
                    onClick={() => setIsCreating(true)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }}
                >
                    <Plus size={20} />
                </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                {isCreating && (
                    <div style={{ background: '#f9fafb', padding: 12, borderRadius: 6, marginBottom: 16, border: '1px solid #e5e7eb' }}>
                        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>새 프로모션 등록</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <input
                                placeholder="프로모션 명"
                                value={newPromo.name}
                                onChange={e => setNewPromo({ ...newPromo, name: e.target.value })}
                                style={{ padding: '6px 8px', borderRadius: 4, border: '1px solid #d1d5db', fontSize: 12 }}
                            />
                            <div style={{ display: 'flex', gap: 6 }}>
                                <input
                                    type="number"
                                    placeholder="할인율(%)"
                                    value={newPromo.discountRate || ''}
                                    onChange={e => setNewPromo({ ...newPromo, discountRate: Number(e.target.value) })}
                                    style={{ flex: 1, padding: '6px 8px', borderRadius: 4, border: '1px solid #d1d5db', fontSize: 12 }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <input
                                    type="date"
                                    value={newPromo.startDate}
                                    onChange={e => setNewPromo({ ...newPromo, startDate: e.target.value })}
                                    style={{ flex: 1, padding: '6px 8px', borderRadius: 4, border: '1px solid #d1d5db', fontSize: 12 }}
                                />
                                <input
                                    type="date"
                                    value={newPromo.endDate}
                                    onChange={e => setNewPromo({ ...newPromo, endDate: e.target.value })}
                                    style={{ flex: 1, padding: '6px 8px', borderRadius: 4, border: '1px solid #d1d5db', fontSize: 12 }}
                                />
                            </div>
                            <textarea
                                placeholder="설명"
                                value={newPromo.description}
                                onChange={e => setNewPromo({ ...newPromo, description: e.target.value })}
                                style={{ padding: '6px 8px', borderRadius: 4, border: '1px solid #d1d5db', height: 50, fontSize: 12 }}
                            />
                            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                <button
                                    onClick={handleCreate}
                                    style={{ flex: 1, background: '#3b82f6', color: '#fff', padding: '6px', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                                >
                                    등록
                                </button>
                                <button
                                    onClick={() => setIsCreating(false)}
                                    style={{ flex: 1, background: '#fff', color: '#6b7280', padding: '6px', borderRadius: 4, border: '1px solid #d1d5db', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                                >
                                    취소
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {isCreating && <div style={{ borderTop: '1px solid #e5e7eb', margin: '16px 0' }} />}

                <div
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        marginBottom: 12,
                        marginTop: 0
                    }}
                >
                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>프로모션 현황</h3>
                    {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </div>
                {!isCollapsed && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {promotions.map(promo => (
                        <div key={promo.id} style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 12, background: '#fff' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{promo.name}</span>
                                <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '2px 6px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                                    {promo.discountRate}%
                                </span>
                            </div>
                            <div style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
                                <Calendar size={12} />
                                {promo.startDate} ~ {promo.endDate}
                            </div>
                            <button
                                onClick={() => onApplyPromotion(promo.id)}
                                disabled={selectedItemsCount === 0}
                                style={{
                                    width: '100%',
                                    padding: '6px',
                                    borderRadius: 4,
                                    border: 'none',
                                    background: selectedItemsCount > 0 ? '#10b981' : '#f3f4f6',
                                    color: selectedItemsCount > 0 ? '#fff' : '#9ca3af',
                                    cursor: selectedItemsCount > 0 ? 'pointer' : 'not-allowed',
                                    fontWeight: 600,
                                    fontSize: 12,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4
                                }}
                            >
                                <Check size={14} />
                                {selectedItemsCount > 0 ? `${selectedItemsCount}개 품목 적용` : '품목을 선택하세요'}
                            </button>
                        </div>
                    ))}
                    </div>
                )}
            </div>
        </div>
    )
}
