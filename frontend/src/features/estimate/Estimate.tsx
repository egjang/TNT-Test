import React, { useEffect, useMemo, useState } from 'react'
import { EstimateList } from './EstimateList'

export function Estimate() {
  const [selected, setSelected] = useState<any>(() => {
    try { const raw = localStorage.getItem('tnt.sales.selectedEstimate'); return raw ? JSON.parse(raw) : null } catch { return null }
  })

  useEffect(() => {
    const onSel = () => {
      try { const raw = localStorage.getItem('tnt.sales.selectedEstimate'); setSelected(raw ? JSON.parse(raw) : null) } catch { setSelected(null) }
    }
    window.addEventListener('tnt.sales.estimate.selected' as any, onSel)
    return () => window.removeEventListener('tnt.sales.estimate.selected' as any, onSel)
  }, [])

  const details = useMemo(() => (
    <div className="card" style={{ padding: 12 }}>
      {selected ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="field"><label>견적번호</label><div className="subject-input">{selected.estimateNumber || ''}</div></div>
          <div className="field"><label>상태</label><div className="subject-input">{selected.status || ''}</div></div>
          <div className="field"><label>제목</label><div className="subject-input">{selected.title || ''}</div></div>
          <div className="field"><label>소유자</label><div className="subject-input">{selected.owner || ''}</div></div>
        </div>
      ) : (
        <div className="empty-state">선택된 견적이 없습니다.</div>
      )}
    </div>
  ), [selected])

  const [activeTab, setActiveTab] = useState<'details' | 'items' | 'attachments'>('details')

  return (
    <section>
      <div className="page-title"><h2>견적</h2></div>
      <EstimateList compact maxHeight="32vh" />
      <section className="card" style={{ marginTop: 12, minHeight: 240 }}>
        <div className="tabs c360-tabs">
          <button className={activeTab === 'details' ? 'tab active' : 'tab'} onClick={() => setActiveTab('details')}>상세</button>
          <button className={activeTab === 'items' ? 'tab active' : 'tab'} onClick={() => setActiveTab('items')}>품목</button>
          <button className={activeTab === 'attachments' ? 'tab active' : 'tab'} onClick={() => setActiveTab('attachments')}>첨부</button>
        </div>
        <div style={{ marginTop: 12 }}>
          {activeTab === 'details' && details}
          {activeTab === 'items' && (
            <div className="empty-state">견적 품목(추후)</div>
          )}
          {activeTab === 'attachments' && (
            <div className="empty-state">첨부 파일(추후)</div>
          )}
        </div>
      </section>
    </section>
  )
}

