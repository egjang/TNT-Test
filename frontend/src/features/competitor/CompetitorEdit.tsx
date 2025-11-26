import React, { useState, useEffect } from 'react'

interface CompetitorEditProps {
    competitor: any
    onSuccess: () => void
}

export function CompetitorEdit({ competitor, onSuccess }: CompetitorEditProps) {
    const [formData, setFormData] = useState({
        competitorName: '',
        country: '',
        homepage: '',
        foundedYear: '',
        description: '',
        marketPositionCd: '기술 리더',
        distributionModel: '직판'
    })
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        if (competitor) {
            setFormData({
                competitorName: competitor.competitorName || '',
                country: competitor.country || '',
                homepage: competitor.homepage || '',
                foundedYear: competitor.foundedYear || '',
                description: competitor.description || '',
                marketPositionCd: competitor.marketPositionCd || '기술 리더',
                distributionModel: competitor.distributionModel || '직판'
            })
        }
    }, [competitor])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        try {
            const res = await fetch(`/api/v1/competitors/${competitor.competitorId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    foundedYear: formData.foundedYear ? parseInt(String(formData.foundedYear)) : null
                })
            })

            if (res.ok) {
                setMessage({ type: 'success', text: '저장되었습니다.' })
                onSuccess()
            } else {
                setMessage({ type: 'error', text: '저장에 실패했습니다.' })
            }
        } catch (err) {
            setMessage({ type: 'error', text: '오류가 발생했습니다.' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ padding: 24 }}>
            {message && (
                <div style={{
                    padding: '12px 16px',
                    marginBottom: 24,
                    borderRadius: 6,
                    background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
                    color: message.type === 'success' ? '#047857' : '#b91c1c',
                    border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`
                }}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>경쟁사명 *</label>
                        <input
                            type="text"
                            name="competitorName"
                            value={formData.competitorName}
                            onChange={handleChange}
                            required
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
                        />
                    </div>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>국가</label>
                        <input
                            type="text"
                            name="country"
                            value={formData.country}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>홈페이지</label>
                        <input
                            type="text"
                            name="homepage"
                            value={formData.homepage}
                            onChange={handleChange}
                            placeholder="https://"
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
                        />
                    </div>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>설립연도</label>
                        <select
                            name="foundedYear"
                            value={formData.foundedYear}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
                        >
                            <option value="">선택</option>
                            {Array.from({ length: new Date().getFullYear() - 2000 + 1 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                <option key={year} value={year}>{year}년</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>시장 지위</label>
                        <select
                            name="marketPositionCd"
                            value={formData.marketPositionCd}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
                        >
                            <option value="기술 리더">기술 리더</option>
                            <option value="품질 강자">품질 강자</option>
                            <option value="가성비 중심">가성비 중심</option>
                            <option value="초저가 진입자">초저가 진입자</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>유통 모델</label>
                        <select
                            name="distributionModel"
                            value={formData.distributionModel}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
                        >
                            <option value="직판">직판</option>
                            <option value="총판">총판</option>
                            <option value="대리점">대리점</option>
                            <option value="온라인">온라인</option>
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>설명</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={4}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '10px 24px',
                            background: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? '저장 중...' : '저장'}
                    </button>
                </div>
            </form>
        </div>
    )
}
