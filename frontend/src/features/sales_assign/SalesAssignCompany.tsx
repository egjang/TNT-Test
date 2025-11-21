import React, { useEffect, useMemo, useState } from 'react'

type Row = { company: 'TNT' | 'DYS'; group: string; name: string; amount: number; stage?: string }

function yearOptions(): number[] {
  // Fixed range: 2026 ~ 2030 (descending)
  const arr: number[] = []
  for (let y = 2030; y >= 2026; y--) arr.push(y)
  return arr
}

export function SalesAssignCompany() {
  const [year, setYear] = useState<number>(2026)
  const [assignMode, setAssignMode] = useState<'Best' | 'Moderate'>(() => {
    try {
      const v = localStorage.getItem('tnt.sales.assign.mode')
      return v === 'Moderate' ? 'Moderate' : 'Best'
    } catch { return 'Best' }
  })
  const [rows, setRows] = useState<Row[]>([
    { company: 'TNT', group: 'TNT', name: '복층유리', amount: 0, stage: '' },
    { company: 'TNT', group: 'TNT', name: '건자재', amount: 0, stage: '' },
    { company: 'DYS', group: 'DYS', name: '실란트', amount: 0, stage: '' },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const fmt = new Intl.NumberFormat('ko-KR')

  async function load() {
    setLoading(true); setError(null)
    try {
      const url = new URL(`/api/v1/targets/year`, window.location.origin)
      url.searchParams.set('year', String(year))
      // Map mode to versionNo: Best -> 1, Moderate -> 2
      url.searchParams.set('versionNo', assignMode === 'Moderate' ? '2' : '1')
      const res = await fetch(url.toString())
      const data = res.ok ? await res.json() : []
      // Build latest-version map per (company, name)
      const latest = new Map<string, { ver:number; amt:number; stage:string; company:'TNT'|'DYS'; name:string }>()
      if (Array.isArray(data)) {
        for (const r of data) {
          const company = (String(r?.company_name || '').toUpperCase() === 'DYS' ? 'DYS' : 'TNT') as 'TNT'|'DYS'
          const name = String(r?.biz_area_name || '')
          const ver = Number(r?.version_no ?? 0)
          const amt = Number(r?.target_amount_max ?? r?.target_amount_min ?? 0)
          const stage = String(r?.target_stage ?? '')
          const key = `${company}||${name}`
          const cur = latest.get(key)
          if (!cur || ver > cur.ver) latest.set(key, { ver, amt: Number.isFinite(amt) ? amt : 0, stage, company, name })
        }
      }
      if (latest.size === 0) {
        // No targets for the selected year: clear values and show notice
        setRows(prev => prev.map(r => ({ ...r, amount: 0, stage: '' })))
        setNotice('영업목표가 수립되지 않았습니다.')
      } else {
        // Patch current rows without clearing to avoid flicker
        setRows(prev => prev.map(r => {
          const key = `${r.company}||${r.name}`
          const it = latest.get(key)
          return it ? { ...r, amount: it.amt, stage: it.stage } : r
        }))
        setNotice(null)
      }
    } catch (e:any) { setError(e?.message || '조회 오류'); }
    finally { setLoading(false) }
  }

  useEffect(()=>{ load() }, [year, assignMode])
  // Persist and broadcast assign mode changes
  useEffect(() => {
    try { localStorage.setItem('tnt.sales.assign.mode', assignMode) } catch {}
    try { window.dispatchEvent(new CustomEvent('tnt.sales.assign.mode.changed', { detail: { mode: assignMode } }) as any) } catch {}
  }, [assignMode])
  // Broadcast selected year for right panel consumers
  useEffect(() => {
    try {
      localStorage.setItem('tnt.sales.assign.year', String(year))
      window.dispatchEvent(new CustomEvent('tnt.sales.assign.year.changed') as any)
    } catch {}
  }, [year])

  const totalTNT = useMemo(()=> rows.filter(r=>r.company==='TNT').reduce((s,r)=> s+(Number(r.amount)||0),0), [rows])
  const totalDYS = useMemo(()=> rows.filter(r=>r.company==='DYS').reduce((s,r)=> s+(Number(r.amount)||0),0), [rows])

  // Broadcast company totals for allocation consumers (center/right panels)
  useEffect(() => {
    try {
      const payload = { tnt: Number(totalTNT)||0, dys: Number(totalDYS)||0, year }
      localStorage.setItem('tnt.sales.assign.companyTotals', JSON.stringify(payload))
      window.dispatchEvent(new CustomEvent('tnt.sales.assign.companyTotals.changed') as any)
    } catch {}
  }, [totalTNT, totalDYS, year])

  function onChange(i:number, v:string){
    const n = Number((v || '').replace(/[\s,]/g,''))
    setRows(rs => rs.map((r,idx)=> idx===i ? { ...r, amount: Number.isFinite(n)? n: 0 } : r))
  }

  async function save(confirm=false){
    try {
      const payload = rows.map(r => ({
        targetYear: `${year}-01-01`,
        versionNo: 1,
        companyName: r.company,
        bizAreaGroup: r.group,
        bizAreaName: r.name,
        targetAmountMin: r.amount,
        targetAmountMax: r.amount,
        targetStage: confirm ? '확정' : '기안중',
      }))
      // send directly without debug preview
      const empSeq = localStorage.getItem('tnt.sales.empSeq') || ''
      const headers: Record<string,string> = { 'Content-Type': 'application/json' }
      if (empSeq) headers['X-EMP-SEQ'] = String(empSeq)
      const res = await fetch('/api/v1/targets/year/upsert', { method:'POST', headers, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      if (confirm) {
        await fetch(`/api/v1/targets/year/confirm?year=${year}`, { method:'POST', headers })
      }
      await load()
      alert(confirm? '확정되었습니다.' : '저장되었습니다.')
    } catch (e:any) {
      alert(e?.message || '저장 중 오류')
    }
  }

  const stageTNT = useMemo(()=>{
    const v = rows.filter(r=>r.company==='TNT').map(r=> (r.stage||'').trim())
    return v.includes('확정') ? '확정' : (v.includes('기안중') ? '기안중' : '')
  }, [rows])
  const stageDYS = useMemo(()=>{
    const v = rows.filter(r=>r.company==='DYS').map(r=> (r.stage||'').trim())
    return v.includes('확정') ? '확정' : (v.includes('기안중') ? '기안중' : '')
  }, [rows])

  return (
    <section className="card" style={{ padding: 12 }}>
      <div className="page-title" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>회사별 목표 입력</h2>
        <div className="controls" style={{ gap: 8 }}>
          <div role="radiogroup" aria-label="목표 산정 모드" className="segmented">
            <label className={`seg ${assignMode==='Best' ? 'selected' : ''}`}>
              <input type="radio" name="assign-mode" checked={assignMode==='Best'} onChange={()=> setAssignMode('Best')} />
              <span>Best</span>
            </label>
            <label className={`seg ${assignMode==='Moderate' ? 'selected' : ''}`}>
              <input type="radio" name="assign-mode" checked={assignMode==='Moderate'} onChange={()=> setAssignMode('Moderate')} />
              <span>Moderate</span>
            </label>
          </div>
          <select className="search-input" value={year} onChange={(e)=>setYear(Number(e.target.value))}>
            {yearOptions().map(y=> <option key={y} value={y}>{y}년</option>)}
          </select>
          <button className="btn btn-3d btn-card" onClick={()=>save(false)}>저장</button>
          <button className="btn btn-3d btn-card" onClick={()=>save(true)}>확정</button>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      {notice && !error && (
        <div className="empty-state" style={{ marginBottom: 12 }}>{notice}</div>
      )}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'nowrap', width: '100%' }}>
          {/* TNT */}
          <div className="card" style={{ padding: 12, flex: '1 1 0', minWidth: 0 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, display:'flex', alignItems:'center', gap:8 }}>
              <span>TNT</span>
              {stageTNT ? <span className="badge">{stageTNT}</span> : null}
              {loading && <span className="muted" style={{ marginLeft: 'auto', fontSize: 12 }}>불러오는 중…</span>}
            </div>
            {rows.filter(r=>r.company==='TNT').map((r)=>{
              const i = rows.findIndex(x=>x.company===r.company && x.name===r.name)
              return (
                <div key={`TNT-${r.name}`} style={{ display:'grid', gridTemplateColumns:'180px 1fr 42px', alignItems:'center', gap: 8, marginBottom: 8 }}>
                  <div><span className="muted">{r.name}</span></div>
                  <input className="assign-input" style={{ textAlign:'right' }} value={r.amount? fmt.format(r.amount): ''} onChange={(e)=>onChange(i, e.target.value)} placeholder="0" disabled={assignMode==='Moderate'} title={assignMode==='Moderate' ? 'Moderate 모드에서는 회사별 목표 수정이 비활성화됩니다' : '값을 입력하세요'} />
                  <div className="muted" style={{ textAlign:'left' }}>억원</div>
                </div>
              )
            })}
            <div style={{ textAlign: 'right', fontWeight: 700 }}>합계: {fmt.format(totalTNT)} 억원</div>
          </div>
          {/* DYS */}
          <div className="card" style={{ padding: 12, flex: '1 1 0', minWidth: 0 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, display:'flex', alignItems:'center', gap:8 }}>
              <span>DYS</span>
              {stageDYS ? <span className="badge">{stageDYS}</span> : null}
              {loading && <span className="muted" style={{ marginLeft: 'auto', fontSize: 12 }}>불러오는 중…</span>}
            </div>
            {rows.filter(r=>r.company==='DYS').map((r)=>{
              const i = rows.findIndex(x=>x.company===r.company && x.name===r.name)
              return (
                <div key={`DYS-${r.name}`} style={{ display:'grid', gridTemplateColumns:'180px 1fr 42px', alignItems:'center', gap: 8, marginBottom: 8 }}>
                  <div><span className="muted">{r.name}</span></div>
                  <input className="assign-input" style={{ textAlign:'right' }} value={r.amount? fmt.format(r.amount): ''} onChange={(e)=>onChange(i, e.target.value)} placeholder="0" disabled={assignMode==='Moderate'} title={assignMode==='Moderate' ? 'Moderate 모드에서는 회사별 목표 수정이 비활성화됩니다' : '값을 입력하세요'} />
                  <div className="muted" style={{ textAlign:'left' }}>억원</div>
                </div>
              )
            })}
            <div style={{ textAlign: 'right', fontWeight: 700 }}>합계: {fmt.format(totalDYS)} 억원</div>
          </div>
        </div>
    </section>
  )
}
