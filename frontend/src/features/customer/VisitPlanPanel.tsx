import React, { useEffect, useState, useMemo } from 'react'
import { tone } from '../../ui/tone'

type Activity = {
  id: number
  subject?: string
  customerId?: string
  customerName?: string
  plannedStartAt?: string
  plannedEndAt?: string
}

export function VisitPlanPanel() {
  const [items, setItems] = useState<Activity[]>([])
  const [selected, setSelected] = useState<Set<number>>(() => new Set())
  const [msg, setMsg] = useState<string | null>(null)
  const [simVisible, setSimVisible] = useState(false)
  const [simStops, setSimStops] = useState<Activity[]>([])

  function load() {
    try {
      const raw = localStorage.getItem('tnt.sales.visitPlanActivities')
      const arr = raw ? JSON.parse(raw) : []
      setItems(Array.isArray(arr) ? arr : [])
      setSelected(new Set())
    } catch { setItems([]) }
  }

  useEffect(() => {
    load()
    const onUpd = () => load()
    window.addEventListener('tnt.sales.visitPlanUpdated' as any, onUpd)
    return () => window.removeEventListener('tnt.sales.visitPlanUpdated' as any, onUpd)
  }, [])

  function toggleAll(checked: boolean) {
    if (!checked) { setSelected(new Set()); return }
    const all = new Set<number>()
    items.forEach(it => all.add(it.id))
    setSelected(all)
  }

  function toggleOne(id: number, checked: boolean) {
    setSelected(prev => {
      const next = new Set(prev)
      if (checked) next.add(id); else next.delete(id)
      return next
    })
  }

  function cancelVisits() {
    if (selected.size === 0) return
    const remain = items.filter(it => !selected.has(it.id))
    const canceled = items.filter(it => selected.has(it.id))
    try {
      localStorage.setItem('tnt.sales.visitPlanActivities', JSON.stringify(remain))
      // Merge canceled back into available list
      let available: Activity[] = []
      try {
        const raw = localStorage.getItem('tnt.sales.availableActivities')
        if (raw) {
          const arr = JSON.parse(raw)
          if (Array.isArray(arr)) available = arr as Activity[]
        }
      } catch {}
      const map = new Map<number, Activity>()
      available.forEach(a => map.set(a.id, a))
      canceled.forEach(a => map.set(a.id, a))
      const merged = Array.from(map.values())
      localStorage.setItem('tnt.sales.availableActivities', JSON.stringify(merged))
      setItems(remain)
      setSelected(new Set())
      setMsg('선택된 활동을 목록에서 제거했습니다')
      // notify others if needed
      window.dispatchEvent(new CustomEvent('tnt.sales.visitPlanUpdated'))
      window.dispatchEvent(new CustomEvent('tnt.sales.availableActivitiesUpdated'))
    } catch {
      setMsg('제거 중 오류가 발생했습니다')
    }
  }

  function simulateRoute() {
    setMsg(null)
    if (selected.size === 0) { setSimVisible(false); return }
    const route = items.filter(it => selected.has(it.id))
    setSimStops(route)
    setSimVisible(true)
  }

  return (
    <div style={{ padding: 8, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="pane-header" style={{ margin: 0 }}>{tone.title.visitTargets}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn" onClick={cancelVisits} disabled={selected.size === 0}>{tone.action.cancelVisit}</button>
          <button className="btn" onClick={simulateRoute} disabled={selected.size === 0}>{tone.action.simulate}</button>
          <div className="muted">{items.length}건{selected.size ? ` · 선택 ${selected.size}건` : ''}</div>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="empty-state">선택된 활동이 없습니다.</div>
      ) : (
        <div style={{ overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 36, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selected.size === items.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </th>
                <th style={{ width: 240, textAlign: 'left' }}>주제</th>
                <th style={{ width: 140 }}>거래처번호</th>
                <th style={{ width: 200, textAlign: 'left' }}>거래처명</th>
                <th style={{ width: 170 }}>예정 시작</th>
                <th style={{ width: 170 }}>예정 종료</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selected.has(it.id)}
                      onChange={(e) => toggleOne(it.id, e.target.checked)}
                    />
                  </td>
                  <td style={{ textAlign: 'left' }}>{it.subject || ''}</td>
                  <td>{it.customerId || ''}</td>
                  <td style={{ textAlign: 'left' }}>{it.customerName || ''}</td>
                  <td>{it.plannedStartAt || ''}</td>
                  <td>{it.plannedEndAt || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {simVisible && (
        <div className="card" style={{ marginTop: 8, padding: 12 }}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>방문동선 Simulatiom (지도)</h3>
          <div className="muted" style={{ marginBottom: 8 }}>
            선택한 방문 계획 수: {simStops.length}
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'center',
              minHeight: 80,
              padding: 8,
              border: '1px dashed var(--border)',
              borderRadius: 8,
              marginBottom: 12,
            }}
          >
            {simStops.length === 0 ? (
              <div className="muted">선택된 방문이 없습니다</div>
            ) : (
              simStops.map((_, idx) => (
                <div
                  key={idx}
                  title={`방문 ${idx + 1}`}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: 'var(--primary, #4e8cff)',
                    display: 'inline-block',
                  }}
                />
              ))
            )}
          </div>
          <button className="btn">{tone.action.sendKakao}</button>
        </div>
      )}
      {msg && <div className="muted" style={{ marginTop: 8 }}>{msg}</div>}
    </div>
  )
}
