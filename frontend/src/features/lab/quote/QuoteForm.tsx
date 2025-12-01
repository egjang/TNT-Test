import React, { useState, useEffect } from 'react'
import { ArrowLeft, Save, AlertTriangle, Search, Plus, Trash2, Loader2 } from 'lucide-react'
import {
    Quote,
    QuoteItem,
    QuoteCustomer,
    CompanyType,
    RecordType,
    RefTier,
    RECORD_TYPE_LABEL,
    COMPANY_TYPE_LABEL,
    APPROVAL_RULE_LABEL,
    formatCurrency,
    formatPercent
} from './types'
import {
    fetchCustomers,
    fetchItems,
    fetchProjects,
    createQuote,
    updateQuote,
    fetchQuote,
    CustomerOption,
    ItemOption,
    ProjectOption
} from './api'

interface QuoteFormProps {
    quoteId?: string
    onCancel: () => void
    onSuccess: () => void
}

export function QuoteForm({ quoteId, onCancel, onSuccess }: QuoteFormProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [formData, setFormData] = useState<Partial<Quote>>({
        companyType: 'TNT',
        recordType: 'TNT_DOUBLE',
        quoteName: '',
        customers: [],
        assigneeId: 'user001'  // 임시 사용자 ID
    })
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCustomer, setSelectedCustomer] = useState<QuoteCustomer | null>(null)

    // API 데이터 상태
    const [customers, setCustomers] = useState<CustomerOption[]>([])
    const [items, setItems] = useState<ItemOption[]>([])
    const [projects, setProjects] = useState<ProjectOption[]>([])
    const [loadingMaster, setLoadingMaster] = useState(false)
    const [saving, setSaving] = useState(false)

    // 마스터 데이터 로드
    useEffect(() => {
        const loadMasterData = async () => {
            setLoadingMaster(true)
            try {
                const companyType = formData.companyType || 'TNT'
                const [customersData, itemsData, projectsData] = await Promise.all([
                    fetchCustomers(companyType),
                    fetchItems(companyType),
                    fetchProjects(companyType)
                ])
                setCustomers(customersData)
                setItems(itemsData)
                setProjects(projectsData)
            } catch (err) {
                console.error('Failed to load master data:', err)
            } finally {
                setLoadingMaster(false)
            }
        }
        loadMasterData()
    }, [formData.companyType])

    // 기존 견적 로드 (수정 모드)
    useEffect(() => {
        if (quoteId) {
            const loadQuote = async () => {
                try {
                    const data = await fetchQuote(quoteId)
                    setFormData(data)
                } catch (err) {
                    console.error('Failed to load quote:', err)
                }
            }
            loadQuote()
        }
    }, [quoteId])

    // 견적 저장
    const handleSave = async () => {
        setSaving(true)
        try {
            if (quoteId) {
                await updateQuote(quoteId, formData as Quote)
            } else {
                await createQuote(formData as Quote)
            }
            onSuccess()
        } catch (err) {
            console.error('Failed to save quote:', err)
            alert('견적 저장에 실패했습니다.')
        } finally {
            setSaving(false)
        }
    }

    // Step 1: 기본 정보 입력
    const renderStep1 = () => (
        <div className="card" style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24 }}>1. 기본 정보 입력</h3>
            <div style={{ display: 'grid', gap: 20 }}>
                {/* 회사구분 */}
                <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 13 }}>
                        회사구분 <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', gap: 16 }}>
                        {(['TNT', 'DYS'] as CompanyType[]).map(type => (
                            <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="companyType"
                                    checked={formData.companyType === type}
                                    onChange={() => setFormData({ ...formData, companyType: type })}
                                    style={{ accentColor: 'var(--primary)' }}
                                />
                                {COMPANY_TYPE_LABEL[type]}
                            </label>
                        ))}
                    </div>
                </div>

                {/* 레코드 유형 */}
                <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 13 }}>
                        레코드 유형 <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', gap: 16 }}>
                        {(['TNT_DOUBLE', 'TNT_MAT', 'DYS_SEALANT'] as RecordType[]).map(type => (
                            <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="recordType"
                                    checked={formData.recordType === type}
                                    onChange={() => setFormData({ ...formData, recordType: type })}
                                    style={{ accentColor: 'var(--primary)' }}
                                />
                                {RECORD_TYPE_LABEL[type]}
                            </label>
                        ))}
                    </div>
                </div>

                {/* 견적명 */}
                <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 13 }}>
                        견적명 <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <input
                        type="text"
                        className="input"
                        value={formData.quoteName || ''}
                        onChange={e => setFormData({ ...formData, quoteName: e.target.value })}
                        placeholder="견적명 입력"
                        style={{ width: '100%' }}
                    />
                </div>

                {/* 프로젝트 */}
                <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 13 }}>프로젝트</label>
                    <select
                        className="input"
                        style={{ width: '100%' }}
                        value={formData.projectId || ''}
                        onChange={e => setFormData({ ...formData, projectId: e.target.value || undefined })}
                        disabled={loadingMaster}
                    >
                        <option value="">{loadingMaster ? '로딩 중...' : '프로젝트 선택 (선택사항)'}</option>
                        {projects.map(p => (
                            <option key={p.projectId} value={p.projectId}>{p.projectName}</option>
                        ))}
                    </select>
                </div>

                {/* 거래처 선택 */}
                <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 13 }}>
                        거래처 <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                        {formData.customers?.map(c => (
                            <span key={c.accountId} style={{
                                padding: '4px 8px',
                                background: 'var(--primary-bg)',
                                color: 'var(--primary)',
                                borderRadius: 4,
                                fontSize: 12,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                            }}>
                                {c.accountName}
                                <button
                                    onClick={() => setFormData({
                                        ...formData,
                                        customers: formData.customers?.filter(x => x.accountId !== c.accountId)
                                    })}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                >
                                    <Trash2 size={12} />
                                </button>
                            </span>
                        ))}
                    </div>
                    <select
                        className="input"
                        style={{ width: '100%' }}
                        disabled={loadingMaster}
                        onChange={e => {
                            const acc = customers.find(a => a.customerId === e.target.value)
                            if (acc && !formData.customers?.find(c => c.accountId === acc.customerId)) {
                                const newCustomer: QuoteCustomer = {
                                    id: Date.now(),
                                    quoteId: '',
                                    accountId: acc.customerId,
                                    accountName: acc.customerName,
                                    items: [],
                                    createdAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString()
                                }
                                setFormData({ ...formData, customers: [...(formData.customers || []), newCustomer] })
                            }
                            e.target.value = ''
                        }}
                    >
                        <option value="">{loadingMaster ? '로딩 중...' : '거래처 추가...'}</option>
                        {customers.filter(a => !formData.customers?.find(c => c.accountId === a.customerId))
                            .map(a => (
                                <option key={a.customerId} value={a.customerId}>{a.customerName} {a.region ? `(${a.region})` : ''}</option>
                            ))}
                    </select>
                </div>
            </div>
            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="btn btn-secondary" onClick={onCancel}>취소</button>
                <button
                    className="btn btn-primary"
                    onClick={() => setStep(2)}
                    disabled={!formData.quoteName || !formData.customers?.length}
                >
                    다음: 품목 선택
                </button>
            </div>
        </div>
    )

    // Step 2: 품목 선택
    const handleAddItem = (product: ItemOption, customer: QuoteCustomer) => {
        const listPrice = product.listPrice || 0
        const refCost = listPrice * 0.8  // 임시로 리스트 가격의 80%를 원가로 설정
        const newItem: QuoteItem = {
            id: Date.now(),
            itemId: `ITEM-${Date.now()}`,
            quoteCustomerId: customer.id,
            itemNo: product.itemNo,
            itemName: product.itemName,
            quantity: 1,
            unitPrice: listPrice,
            refTier: 'B' as RefTier,  // 기본값
            refCost: refCost,
            amount: listPrice,
            rowProfitRate: listPrice > 0 ? ((listPrice - refCost) / listPrice) * 100 : 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }

        const updatedCustomers = formData.customers?.map(c => {
            if (c.id === customer.id) {
                return { ...c, items: [...(c.items || []), newItem] }
            }
            return c
        })
        setFormData({ ...formData, customers: updatedCustomers })
    }

    const handleUpdateItem = (customerId: number, itemIndex: number, field: keyof QuoteItem, value: any) => {
        const updatedCustomers = formData.customers?.map(c => {
            if (c.id === customerId) {
                const items = [...(c.items || [])]
                const item = { ...items[itemIndex], [field]: value }
                if (field === 'quantity' || field === 'unitPrice') {
                    item.amount = item.quantity * item.unitPrice
                    item.rowProfitRate = item.refCost ? ((item.unitPrice - item.refCost) / item.unitPrice) * 100 : 0
                }
                items[itemIndex] = item
                return { ...c, items }
            }
            return c
        })
        setFormData({ ...formData, customers: updatedCustomers })
    }

    const handleRemoveItem = (customerId: number, itemIndex: number) => {
        const updatedCustomers = formData.customers?.map(c => {
            if (c.id === customerId) {
                const items = [...(c.items || [])]
                items.splice(itemIndex, 1)
                return { ...c, items }
            }
            return c
        })
        setFormData({ ...formData, customers: updatedCustomers })
    }

    const renderStep2 = () => {
        const currentCustomer = selectedCustomer || formData.customers?.[0]

        return (
            <div style={{ display: 'flex', gap: 24, height: '100%' }}>
                {/* Left: 품목 검색 */}
                <div className="card" style={{ width: 280, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
                        <h4 style={{ margin: 0, marginBottom: 12, fontSize: 14 }}>품목 검색</h4>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                            <input
                                type="text"
                                className="input"
                                placeholder="품목명/코드"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ width: '100%', paddingLeft: 36 }}
                            />
                        </div>
                    </div>
                    <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
                        {loadingMaster ? (
                            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
                                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                                <div style={{ marginTop: 8 }}>품목 로딩 중...</div>
                            </div>
                        ) : items.filter(p => (p.itemName || '').includes(searchTerm) || p.itemNo.includes(searchTerm))
                            .map(product => (
                                <div
                                    key={product.itemNo}
                                    style={{ padding: 12, borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                                    onClick={() => currentCustomer && handleAddItem(product, currentCustomer)}
                                >
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{product.itemName}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                        <span>{product.itemNo}</span>
                                        <span>{(product.listPrice || 0).toLocaleString()}원</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                                        {product.category || '-'} / {product.unit || '-'}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>

                {/* Right: 선택된 품목 */}
                <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* 거래처 탭 */}
                    <div style={{ borderBottom: '1px solid var(--border)', padding: '0 16px' }}>
                        <div style={{ display: 'flex', gap: 0 }}>
                            {formData.customers?.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => setSelectedCustomer(c)}
                                    style={{
                                        padding: '12px 20px',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: currentCustomer?.id === c.id ? '2px solid var(--primary)' : '2px solid transparent',
                                        color: currentCustomer?.id === c.id ? 'var(--primary)' : 'var(--text-secondary)',
                                        fontWeight: currentCustomer?.id === c.id ? 600 : 400,
                                        cursor: 'pointer',
                                        fontSize: 13,
                                    }}
                                >
                                    {c.accountName} ({c.items?.length || 0})
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 툴바 */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            선택된 품목: <strong style={{ color: 'var(--text-primary)' }}>{currentCustomer?.items?.length || 0}</strong>건
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-secondary" onClick={() => setStep(1)}>이전</button>
                            <button className="btn btn-primary" onClick={() => setStep(3)}>다음: 검토 및 저장</button>
                        </div>
                    </div>

                    {/* 품목 테이블 */}
                    <div style={{ flex: 1, overflow: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-secondary)' }}>
                                    <th style={{ padding: 10, textAlign: 'left' }}>품목명</th>
                                    <th style={{ padding: 10, textAlign: 'center', width: 60 }}>티어</th>
                                    <th style={{ padding: 10, textAlign: 'right', width: 80 }}>수량</th>
                                    <th style={{ padding: 10, textAlign: 'right', width: 120 }}>단가</th>
                                    <th style={{ padding: 10, textAlign: 'right', width: 100 }}>참조원가</th>
                                    <th style={{ padding: 10, textAlign: 'right', width: 120 }}>금액</th>
                                    <th style={{ padding: 10, textAlign: 'right', width: 70 }}>이익률</th>
                                    <th style={{ padding: 10, width: 50 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentCustomer?.items?.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>
                                            <div>{item.itemName}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.itemNo}</div>
                                        </td>
                                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: 4,
                                                fontSize: 11,
                                                background: item.refTier === 'A' ? 'var(--success-bg)' :
                                                    item.refTier === 'B' ? 'var(--info-bg)' : 'var(--bg-secondary)',
                                                color: item.refTier === 'A' ? 'var(--success)' :
                                                    item.refTier === 'B' ? 'var(--info)' : 'var(--text-secondary)'
                                            }}>
                                                {item.refTier}
                                            </span>
                                        </td>
                                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>
                                            <input
                                                type="number"
                                                className="input"
                                                value={item.quantity}
                                                onChange={e => handleUpdateItem(currentCustomer.id, idx, 'quantity', Number(e.target.value))}
                                                style={{ width: '100%', textAlign: 'right' }}
                                            />
                                        </td>
                                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>
                                            <input
                                                type="number"
                                                className="input"
                                                value={item.unitPrice}
                                                onChange={e => handleUpdateItem(currentCustomer.id, idx, 'unitPrice', Number(e.target.value))}
                                                style={{ width: '100%', textAlign: 'right' }}
                                            />
                                        </td>
                                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                            {formatCurrency(item.refCost)}
                                        </td>
                                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 600 }}>
                                            {formatCurrency(item.amount)}
                                        </td>
                                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                                            <span style={{
                                                color: (item.rowProfitRate || 0) >= 15 ? 'var(--success)' :
                                                    (item.rowProfitRate || 0) < 5 ? 'var(--error)' : 'inherit'
                                            }}>
                                                {formatPercent(item.rowProfitRate)}
                                            </span>
                                        </td>
                                        <td style={{ padding: 10, borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                                            <button
                                                className="btn btn-ghost"
                                                onClick={() => handleRemoveItem(currentCustomer.id, idx)}
                                                style={{ color: 'var(--error)', padding: 4 }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {(!currentCustomer?.items?.length) && (
                                    <tr>
                                        <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                                            왼쪽에서 품목을 클릭하여 추가하세요.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )
    }

    // Step 3: 검토 및 저장
    const renderStep3 = () => {
        const totalAmount = formData.customers?.reduce((sum, c) =>
            sum + (c.items?.reduce((s, i) => s + (i.amount || 0), 0) || 0), 0) || 0
        const totalCost = formData.customers?.reduce((sum, c) =>
            sum + (c.items?.reduce((s, i) => s + ((i.refCost || 0) * i.quantity), 0) || 0), 0) || 0
        const expectedProfitRate = totalAmount > 0 ? ((totalAmount - totalCost) / totalAmount) * 100 : 0

        // 승인 규칙 결정
        let approvalRule: 'AUTO' | 'TIER_AB' | 'LOSS' = 'AUTO'
        if (expectedProfitRate < 0) approvalRule = 'LOSS'
        else if (expectedProfitRate < 10) approvalRule = 'TIER_AB'

        return (
            <div className="card" style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24 }}>3. 검토 및 저장</h3>

                {/* 기본 정보 요약 */}
                <div style={{ marginBottom: 24, padding: 16, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>기본 정보</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                        <div>
                            <span style={{ color: 'var(--text-secondary)' }}>회사구분: </span>
                            <strong>{formData.companyType && COMPANY_TYPE_LABEL[formData.companyType]}</strong>
                        </div>
                        <div>
                            <span style={{ color: 'var(--text-secondary)' }}>레코드유형: </span>
                            <strong>{formData.recordType && RECORD_TYPE_LABEL[formData.recordType]}</strong>
                        </div>
                        <div>
                            <span style={{ color: 'var(--text-secondary)' }}>견적명: </span>
                            <strong>{formData.quoteName}</strong>
                        </div>
                        <div>
                            <span style={{ color: 'var(--text-secondary)' }}>거래처: </span>
                            <strong>{formData.customers?.map(c => c.accountName).join(', ')}</strong>
                        </div>
                    </div>
                </div>

                {/* 금액 정보 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                    <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>총 견적 금액</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(totalAmount)}</div>
                    </div>
                    <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>총 원가</div>
                        <div style={{ fontSize: 24, fontWeight: 700 }}>{formatCurrency(totalCost)}</div>
                    </div>
                    <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>예상 이익률</div>
                        <div style={{
                            fontSize: 24,
                            fontWeight: 700,
                            color: expectedProfitRate >= 15 ? 'var(--success)' :
                                expectedProfitRate < 5 ? 'var(--error)' : 'var(--warning)'
                        }}>
                            {formatPercent(expectedProfitRate)}
                        </div>
                    </div>
                </div>

                {/* 승인 예측 */}
                <div style={{
                    padding: 16,
                    border: `1px solid ${approvalRule === 'AUTO' ? 'var(--success)' : approvalRule === 'TIER_AB' ? 'var(--warning)' : 'var(--error)'}`,
                    background: approvalRule === 'AUTO' ? 'var(--success-bg)' : approvalRule === 'TIER_AB' ? 'var(--warning-bg)' : 'var(--error-bg)',
                    borderRadius: 8,
                    marginBottom: 32
                }}>
                    <h4 style={{ margin: 0, marginBottom: 8, color: approvalRule === 'AUTO' ? 'var(--success)' : approvalRule === 'TIER_AB' ? 'var(--warning)' : 'var(--error)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertTriangle size={16} /> 승인 규칙: {APPROVAL_RULE_LABEL[approvalRule]}
                    </h4>
                    <p style={{ margin: 0, fontSize: 13 }}>
                        {approvalRule === 'AUTO' && '현재 이익률이 기준(15%)을 충족합니다. 저장 시 자동 승인됩니다.'}
                        {approvalRule === 'TIER_AB' && '이익률이 기준 미달입니다. A/B 티어 승인이 필요합니다.'}
                        {approvalRule === 'LOSS' && '손실 견적입니다. 특별 승인이 필요합니다.'}
                    </p>
                </div>

                {/* 거래처별 품목 요약 */}
                <div style={{ marginBottom: 24 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>거래처별 품목 요약</h4>
                    {formData.customers?.map(c => (
                        <div key={c.id} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong>{c.accountName}</strong>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                    {c.items?.length || 0}건 / {formatCurrency(c.items?.reduce((s, i) => s + (i.amount || 0), 0))}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <button className="btn btn-secondary" onClick={() => setStep(2)} disabled={saving}>이전</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
                        {saving ? '저장 중...' : '견적 저장'}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* 헤더 - Standard UI Form View */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button className="btn btn-ghost" onClick={onCancel}><ArrowLeft size={16} /></button>
                    <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
                        {quoteId ? '견적 수정' : '새 견적 작성'}
                    </h2>
                </div>
            </div>

            {/* Stepper */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
                {[
                    { num: 1, label: '기본 정보' },
                    { num: 2, label: '품목 선택' },
                    { num: 3, label: '검토 및 저장' }
                ].map((s, idx) => (
                    <div key={s.num} style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: '50%',
                                background: step >= s.num ? 'var(--primary)' : 'var(--bg-secondary)',
                                color: step >= s.num ? 'white' : 'var(--text-secondary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12
                            }}>
                                {s.num}
                            </div>
                            <span style={{ fontSize: 13, color: step >= s.num ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                {s.label}
                            </span>
                        </div>
                        {idx < 2 && <div style={{ width: 40, height: 2, background: step > s.num ? 'var(--primary)' : 'var(--bg-secondary)', margin: '0 12px' }} />}
                    </div>
                ))}
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </div>
        </div>
    )
}
