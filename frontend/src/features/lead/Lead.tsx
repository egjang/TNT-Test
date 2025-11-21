import React, { useEffect, useMemo, useState } from 'react'
import { LeadForm } from './LeadForm'
import { LeadActivitiesList } from './LeadActivitiesList'

export function Lead() {
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    // 처음 진입 시 버퍼 제거: 이전 선택을 비워 초기엔 아무것도 표시하지 않음
    try { localStorage.removeItem('tnt.sales.selectedLead') } catch {}
    const onSel = () => {
      try { const raw = localStorage.getItem('tnt.sales.selectedLead'); setSelected(raw ? JSON.parse(raw) : null) } catch { setSelected(null) }
    }
    window.addEventListener('tnt.sales.lead.selected' as any, onSel)
    return () => window.removeEventListener('tnt.sales.lead.selected' as any, onSel)
  }, [])

  return (
    <section>
      <LeadForm />
      <section className="card" style={{ marginTop: 12, minHeight: 240 }}>
        <div className="tabs c360-tabs">
          <button className={'tab active'}>활동</button>
        </div>
        <div style={{ marginTop: 12 }}>
          {selected?.id ? (
            <LeadActivitiesList leadId={selected.id} />
          ) : (
            <div style={{ minHeight: 160 }} />
          )}
        </div>
      </section>
    </section>
  )
}
