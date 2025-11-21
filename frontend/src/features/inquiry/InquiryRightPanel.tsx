import React, { useState } from 'react'

type DelayRow = { id: number; title: string; inquiryStatus: string; assigneeName: string; openedAt?: string }

export function InquiryRightPanel() {
  const [openDelay, setOpenDelay] = useState(false)
  const [delayItems, setDelayItems] = useState<DelayRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openStats, setOpenStats] = useState(false)
  const [stats, setStats] = useState<Array<{ assigneeName: string; total: number; completed: number; pending: number; delayed: number }>>([])

  async function loadDelayed() {
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/v1/inquiries/delayed', { cache: 'no-store' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const arr = await r.json().catch(()=>[])
      const list: DelayRow[] = Array.isArray(arr) ? arr.map((x:any, i:number) => ({
        id: Number(x?.id ?? i+1),
        title: String(x?.title ?? ''),
        inquiryStatus: String(x?.inquiryStatus ?? x?.inquiry_status ?? ''),
        assigneeName: String(x?.assigneeName ?? x?.assignee_name ?? ''),
        openedAt: String(x?.openedAt ?? x?.opened_at ?? ''),
      })) : []
      setDelayItems(list)
    } catch (e:any) {
      setError(e?.message || '조회 실패')
      setDelayItems([])
    } finally { setLoading(false) }
  }

  async function loadStats() {
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/v1/inquiries', { cache: 'no-store' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const arr = await r.json().catch(()=>[])
      const now = Date.now()
      const oneDay = 24 * 60 * 60 * 1000
      const threshold = now - oneDay
      const map: Record<string, { assigneeName: string; total: number; completed: number; pending: number; delayed: number }> = {}
      if (Array.isArray(arr)) {
        for (const x of arr) {
          const name = String(x?.assigneeName ?? x?.assignee_name ?? '') || '(미지정)'
          const st = String(x?.inquiryStatus ?? x?.inquiry_status ?? '')
          const openedAt = String(x?.openedAt ?? x?.opened_at ?? '')
          const t = openedAt ? Date.parse(openedAt as any) : NaN
          const isCompleted = st === '완료'
          const isDelayed = !isCompleted && Number.isFinite(t) && t <= threshold
          if (!map[name]) map[name] = { assigneeName: name, total: 0, completed: 0, pending: 0, delayed: 0 }
          map[name].total += 1
          if (isCompleted) map[name].completed += 1
          else map[name].pending += 1
          if (isDelayed) map[name].delayed += 1
        }
      }
      const list = Object.values(map).sort((a,b)=> a.assigneeName.localeCompare(b.assigneeName, 'ko', { sensitivity:'base' }))
      setStats(list)
    } catch (e:any) { setError(e?.message || '조회 실패'); setStats([]) } finally { setLoading(false) }
  }


  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8, height:'100%' }}>
      <div className="card" style={{ padding: 10 }}>
        <div style={{ display:'flex', flexDirection:'row', gap:8, flexWrap:'wrap' }}>
          <button
            className="btn btn-card btn-3d"
            style={{ fontSize: 12, padding: '6px 10px' }}
            onClick={()=>{ setOpenStats(false); setOpenDelay(true); loadDelayed() }}
          >지연 건</button>
          <button
            className="btn btn-card btn-3d"
            style={{ fontSize: 12, padding: '6px 10px' }}
            onClick={()=>{ setOpenDelay(false); setOpenStats(true); loadStats() }}
          >담당자별 처리현황</button>
        </div>
      </div>
      {/* Inline delayed list area */}
      <div style={{ flex:1, minHeight:0, overflow:'auto' }}>
        {openDelay && (
          <div className="table-container" style={{ height: 360 }}>
            {delayItems.length === 0 ? (
              <div className="empty-state">{loading ? '불러오는 중…' : (error || '지연된 미완료 건이 없습니다')}</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 320 }}>제목</th>
                    <th style={{ width: 120 }}>상태</th>
                    <th style={{ width: 160 }}>담당자명</th>
                  </tr>
                </thead>
                <tbody>
                  {delayItems.map((it) => (
                    <tr key={it.id}>
                      <td>{it.title}</td>
                      <td>{it.inquiryStatus}</td>
                      <td>{it.assigneeName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {openStats && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap: 8, marginTop: 8 }}>
            {stats.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>{loading ? '불러오는 중…' : (error || '데이터가 없습니다')}</div>
            ) : (
              stats.map((it, idx) => (
                <div key={idx} className="card" style={{ padding: 10 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{it.assigneeName || '담당자 없음'}</div>
                  <div style={{ display:'grid', gridTemplateColumns:'80px 1fr', rowGap: 4, columnGap: 6, fontSize: 12 }}>
                    <span className="muted">합계</span><span>{it.total.toLocaleString()}건</span>
                    <span className="muted">완료</span><span>{it.completed.toLocaleString()}건</span>
                    <span className="muted">진행</span><span>{it.pending.toLocaleString()}건</span>
                    <span className="muted">지연</span><span style={{ color: it.delayed > 0 ? '#ef4444' : undefined }}>{it.delayed.toLocaleString()}건</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
