import React, { useState } from 'react'
import { ChevronLeft, Save, Plus, Trash2 } from 'lucide-react'

export function QuoteForm() {
    const [activeTab, setActiveTab] = useState('basic')
    const [items, setItems] = useState<any[]>([])

    const addItem = () => {
        setItems([...items, { product: '', quantity: 1, price: 0, amount: 0 }])
    }

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index))
    }

    return (
        <div className="form-view" style={{ padding: 24, height: '100%', overflow: 'auto', background: 'var(--panel)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                        className="btn btn-ghost"
                        onClick={() => window.dispatchEvent(new CustomEvent('tnt.sales.navigate', { detail: { key: 'quote' } }))}
                        style={{ padding: 8 }}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>신규 견적 등록</h1>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary">임시저장</button>
                    <button className="btn btn-primary">
                        <Save size={16} style={{ marginRight: 4 }} />
                        저장
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 24 }}>
                    <button
                        onClick={() => setActiveTab('basic')}
                        style={{
                            padding: '12px 0',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'basic' ? '2px solid var(--primary)' : '2px solid transparent',
                            color: activeTab === 'basic' ? 'var(--primary)' : 'var(--text-secondary)',
                            fontWeight: activeTab === 'basic' ? 600 : 400,
                            cursor: 'pointer'
                        }}
                    >
                        기본 정보
                    </button>
                    <button
                        onClick={() => setActiveTab('items')}
                        style={{
                            padding: '12px 0',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'items' ? '2px solid var(--primary)' : '2px solid transparent',
                            color: activeTab === 'items' ? 'var(--primary)' : 'var(--text-secondary)',
                            fontWeight: activeTab === 'items' ? 600 : 400,
                            cursor: 'pointer'
                        }}
                    >
                        견적 품목
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="form-content">
                {activeTab === 'basic' && (
                    <div style={{ maxWidth: 800 }}>
                        <section style={{ marginBottom: 32 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>기본 정보</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text-secondary)' }}>견적명 <span style={{ color: 'var(--error)' }}>*</span></label>
                                    <input type="text" className="input" style={{ width: '100%' }} placeholder="견적명을 입력하세요" />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text-secondary)' }}>거래처 <span style={{ color: 'var(--error)' }}>*</span></label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input type="text" className="input" style={{ flex: 1 }} placeholder="거래처 검색" />
                                        <button className="btn btn-secondary">검색</button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text-secondary)' }}>레코드 유형 <span style={{ color: 'var(--error)' }}>*</span></label>
                                    <select className="input" style={{ width: '100%' }}>
                                        <option value="TNT_DOUBLE">TNT 복층</option>
                                        <option value="TNT_MAT">TNT 건자재</option>
                                        <option value="DYS_SEALANT">동양 실란트</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text-secondary)' }}>담당자</label>
                                    <input type="text" className="input" style={{ width: '100%' }} defaultValue="김영업" readOnly />
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'items' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>견적 품목 목록</h3>
                            <button className="btn btn-secondary" onClick={addItem}>
                                <Plus size={14} style={{ marginRight: 4 }} />
                                품목 추가
                            </button>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-secondary)' }}>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>품목명</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', width: 100 }}>수량</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', width: 150 }}>단가</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', width: 150 }}>금액</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)', width: 60 }}>삭제</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                                            등록된 품목이 없습니다. 품목 추가 버튼을 눌러주세요.
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                                                <input type="text" className="input" style={{ width: '100%' }} placeholder="품목 검색" />
                                            </td>
                                            <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                                                <input type="number" className="input" style={{ width: '100%', textAlign: 'right' }} defaultValue={1} />
                                            </td>
                                            <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                                                <input type="number" className="input" style={{ width: '100%', textAlign: 'right' }} placeholder="0" />
                                            </td>
                                            <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                                                0
                                            </td>
                                            <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                                                <button className="btn btn-ghost" style={{ color: 'var(--error)', padding: 4 }} onClick={() => removeItem(idx)}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
