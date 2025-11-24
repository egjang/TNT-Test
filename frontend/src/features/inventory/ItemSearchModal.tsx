import React, { useState } from 'react'
import { X, Search } from 'lucide-react'

interface ItemSearchModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (itemName: string) => void
}

interface Item {
    itemName: string
    itemNo: string
    itemSubcategory: string
}

export const ItemSearchModal: React.FC<ItemSearchModalProps> = ({ isOpen, onClose, onSelect }) => {
    const [keyword, setKeyword] = useState('')
    const [subcategory, setSubcategory] = useState('')
    const [items, setItems] = useState<Item[]>([])
    const [loading, setLoading] = useState(false)
    const [subcategoryOptions, setSubcategoryOptions] = useState<string[]>([])

    // Fetch subcategories on mount and reset state
    React.useEffect(() => {
        if (isOpen) {
            // Reset state
            setKeyword('')
            setSubcategory('')
            setItems([])

            fetch('/api/v1/inventory/subcategories-ag')
                .then(res => res.ok ? res.json() : [])
                .then(data => setSubcategoryOptions(data))
                .catch(err => console.error('Failed to fetch subcategories', err))
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleSearch = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (keyword) params.append('keyword', keyword)
            if (subcategory) params.append('subcategory', subcategory)

            const response = await fetch(`/api/v1/inventory/items-popup?${params.toString()}`)
            if (response.ok) {
                const data = await response.json()
                setItems(data)
            }
        } catch (error) {
            console.error("Failed to search items", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                background: '#fff', borderRadius: 8,
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                width: 700, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 24px', borderBottom: '1px solid #e5e7eb',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>품목 검색</h2>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Filters */}
                <div style={{
                    padding: 16, borderBottom: '1px solid #e5e7eb', background: '#f9fafb',
                    display: 'flex', gap: 8
                }}>
                    <select
                        style={{
                            border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 12px', fontSize: 14, flex: 1,
                            outline: 'none', background: '#fff'
                        }}
                        value={subcategory}
                        onChange={e => setSubcategory(e.target.value)}
                    >
                        <option value="">전체 중분류</option>
                        {subcategoryOptions.map(sub => (
                            <option key={sub} value={sub}>{sub}</option>
                        ))}
                    </select>
                    <input
                        style={{
                            border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 12px', fontSize: 14, flex: 1,
                            outline: 'none'
                        }}
                        placeholder="품목명/품목코드"
                        value={keyword}
                        onChange={e => setKeyword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    />
                    <button
                        onClick={handleSearch}
                        style={{
                            background: '#2563eb', color: '#fff', padding: '8px 16px', borderRadius: 6,
                            fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6
                        }}
                    >
                        <Search size={16} />
                        검색
                    </button>
                </div>

                {/* Results */}
                <div style={{ flex: 1, overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f9fafb', position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>중분류</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>품목코드</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>품목명</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={3} style={{ padding: '32px', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
                                        검색 중...
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={3} style={{ padding: '32px', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
                                        검색 결과가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                items.map((item, idx) => (
                                    <tr
                                        key={idx}
                                        onClick={() => {
                                            onSelect(item.itemName)
                                            onClose()
                                        }}
                                        style={{ cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '12px 16px', fontSize: 14, color: '#6b7280' }}>{item.itemSubcategory}</td>
                                        <td style={{ padding: '12px 16px', fontSize: 14, color: '#6b7280' }}>{item.itemNo}</td>
                                        <td style={{ padding: '12px 16px', fontSize: 14, color: '#111827', fontWeight: 500 }}>{item.itemName}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
