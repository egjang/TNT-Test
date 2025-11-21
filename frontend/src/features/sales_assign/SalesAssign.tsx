import React, { useEffect, useMemo, useState } from 'react'
import { SalesAssignCompany } from './SalesAssignCompany'

type Emp = {
  key: string
  empId: string
  empName: string
  deptName: string
  assigneeId?: string
}

const TARGET_DEPTS = ['영업1본부','영업1팀','영업2본부','영업2팀']

export function SalesAssign() {
  const [items, setItems] = useState<Emp[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allocating, setAllocating] = useState(false)
  const [assignYear, setAssignYear] = useState<number>(() => {
    try { const v = localStorage.getItem('tnt.sales.assign.year'); return v ? Number(v) : new Date().getFullYear() } catch { return new Date().getFullYear() }
  })
  // 이름 기준 전년 매출 합계(TNT/DYS 분리) for ratio display
  const [prevByName, setPrevByName] = useState<Record<string, { tnt: number; dys: number }>>({})
  // 검색 박스 제거 요청에 따라 상태 제거
  const [active, setActive] = useState<Emp | null>(null)
  // 매출목표 입력값(TNT/DYS)을 직원별로 보관 (empId/name key 기반)
  const [targets, setTargets] = useState<Record<string, { tnt: number; dys: number }>>({})
  // 연도 전체 단계 표시('기안중' | '확정')
  const [yearStage, setYearStage] = useState<string>('')
  const fmt = new Intl.NumberFormat('ko-KR')
  const [modeTick, setModeTick] = useState(0)
  useEffect(() => {
    const onMode = () => setModeTick(t => t + 1)
    window.addEventListener('tnt.sales.assign.mode.changed' as any, onMode)
    return () => window.removeEventListener('tnt.sales.assign.mode.changed' as any, onMode)
  }, [])
  const isModerate = useMemo(() => {
    try { return (localStorage.getItem('tnt.sales.assign.mode') || '').toLowerCase() === 'moderate' } catch { return false }
  }, [modeTick])

  async function load() {
    setLoading(true); setError(null)
    try {
      // 1) Try to load assignments for selected year
      const asn = new URL('/api/v1/targets/assigned', window.location.origin)
      asn.searchParams.set('year', String(assignYear))
      try {
        const mode = (localStorage.getItem('tnt.sales.assign.mode') || '').toLowerCase()
        const ver = mode === 'moderate' ? '2' : (mode === 'best' ? '1' : '')
        if (ver) asn.searchParams.set('versionNo', ver)
      } catch {}
      const r1 = await fetch(asn.toString())
      const d1 = r1.ok ? await r1.json() : []
      const assigned = Array.isArray(d1) ? d1 : []
      if (assigned.length > 0) {
        // Build employee list from assignments (joined with employee on backend)
        const arr: Emp[] = assigned.reduce((acc: Emp[], row: any) => {
          const empId = String(row.emp_id ?? row.empId ?? '').trim()
          const empName = String(row.emp_name ?? row.empName ?? '').trim()
          const deptName = String(row.dept_name ?? row.deptName ?? '')
          const key = empId || (empName ? `name:${empName}` : '')
          if (!key) return acc
          if (!acc.some(x => x.key === key)) {
            acc.push({ key, empId, empName, deptName })
          }
          return acc
        }, [])
        arr.sort((a,b)=> (a.deptName||'').localeCompare(b.deptName||'') || (a.empName||'').localeCompare(b.empName||''))
        setItems(arr)
        setLoading(false)
        return
      }
      // 2) Fallback: load employees by department
      const url = new URL('/api/v1/employees', window.location.origin)
      url.searchParams.set('depts', TARGET_DEPTS.join(','))
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const arr: Emp[] = Array.isArray(data) ? data.map((r:any)=>{
        const empId = String(r.empId ?? r.emp_id ?? '').trim()
        const empName = String(r.empName ?? r.emp_name ?? '').trim()
        const deptName = String(r.deptName ?? r.dept_name ?? '')
        const assigneeId = String(r.assignee_id ?? r.assigneeId ?? '').trim() || undefined
        const key = empId || assigneeId || (empName ? `name:${empName}` : '')
        return { key, empId, empName, deptName, assigneeId }
      }).filter((r:Emp)=> !!r.key) : []
      arr.sort((a,b)=> (a.deptName||'').localeCompare(b.deptName||'') || (a.empName||'').localeCompare(b.empName||''))
      setItems(arr)
    } catch (e:any) {
      setError(e?.message || '조회 중 오류')
      setItems([])
    } finally { setLoading(false) }
  }


  useEffect(()=>{ load() }, [])

  // Broadcast current employee list so right panel can show per-employee details
  useEffect(() => {
    try {
      // Also broadcast full employee list for debug (name + seq)
      localStorage.setItem('tnt.sales.assign.empList', JSON.stringify(items))
      window.dispatchEvent(new CustomEvent('tnt.sales.assign.emps.changed') as any)
    } catch {}
  }, [items])

  // Listen for year broadcast from company section
  useEffect(() => {
    const onYear = () => {
      try {
        const v = localStorage.getItem('tnt.sales.assign.year');
        if (v) setAssignYear(Number(v))
        // Clear previous targets/stage to avoid showing stale values for other years
        setTargets({})
        // clear year stage until loaded
        // @ts-ignore
        setYearStage && setYearStage('')
      } catch {}
    }
    window.addEventListener('tnt.sales.assign.year.changed' as any, onYear)
    return () => window.removeEventListener('tnt.sales.assign.year.changed' as any, onYear)
  }, [])

  // (removed seq-based prevTotals effect)

  // Load assigned targets for selected year and employees (prefill inputs + compute year stage)
  useEffect(() => {
    async function loadAssigned() {
      try {
        if (!items.length) { setTargets({}); /* clear while no items */ return }
        const url = new URL('/api/v1/targets/assigned', window.location.origin)
        url.searchParams.set('year', String(assignYear))
        try {
          const mode = (localStorage.getItem('tnt.sales.assign.mode') || '').toLowerCase()
          const ver = mode === 'moderate' ? '2' : (mode === 'best' ? '1' : '')
          if (ver) url.searchParams.set('versionNo', ver)
        } catch {}
        const r = await fetch(url.toString())
        const d = r.ok ? await r.json() : []
        const nextTargets: Record<string, { tnt:number; dys:number }> = {}
        let stageAny: string = ''
        if (Array.isArray(d)) {
          d.forEach((row:any) => {
            const empId = String(row.emp_id ?? row.empId ?? '').trim()
            const empName = String(row.emp_name ?? row.empName ?? '').trim()
            const key = empId || (empName ? `name:${empName}` : '')
            if (!key) return
            const comp = String(row.company_name ?? row.companyName ?? '').toUpperCase()
            const amt = Number(row.assigned_amount ?? row.assignedAmount ?? 0)
            const stg = String(row.target_stage ?? row.targetStage ?? '').trim()
            const cur = nextTargets[key] || { tnt: 0, dys: 0 }
            if (comp === 'TNT') { cur.tnt = Math.round(amt) }
            else if (comp === 'DYS') { cur.dys = Math.round(amt) }
            nextTargets[key] = cur
            if (stg === '확정') stageAny = '확정'; else if (!stageAny && stg === '기안중') stageAny = '기안중'
          })
        }
        // Replace targets with loaded values only; if no value for an emp, leave empty
        const replaced: Record<string, { tnt:number; dys:number }> = {}
        items.forEach(it => {
          const loaded = nextTargets[it.key]
          if (loaded) replaced[it.key] = { tnt: loaded.tnt || 0, dys: loaded.dys || 0 }
        })
        setTargets(replaced)
        setYearStage(stageAny)
      } catch {
        // ignore
      }
    }
    loadAssigned()
  }, [assignYear, items, modeTick])

  // Load per-name previous-year TNT/DYS amounts for ratio display
  useEffect(() => {
    async function loadPrevByName() {
      try {
        const names = Array.from(new Set(items.map(it => String(it.empName||'').trim()).filter(Boolean)))
        if (!names.length) { setPrevByName({}); return }
        const url = new URL('/api/v1/sales/employee-yearly', window.location.origin)
        url.searchParams.set('year', String(assignYear))
        url.searchParams.set('empNames', names.join(','))
        url.searchParams.set('joinKey', 'emp_name')
        const r = await fetch(url.toString())
        const d = r.ok ? await r.json() : []
        const rows: any[] = Array.isArray(d) ? d : (Array.isArray(d?.employees) ? d.employees : [])
        const by: Record<string, { tnt:number; dys:number }> = {}
        rows.forEach((x:any) => {
          const nm = String(x.emp_name ?? x.empName ?? '').trim()
          if (!nm) return
          const tnt = Number(x.tnt_amount ?? 0)
          const dys = Number(x.dys_amount ?? 0)
          const cur = by[nm] || { tnt: 0, dys: 0 }
          by[nm] = { tnt: cur.tnt + (Number.isFinite(tnt)?tnt:0), dys: cur.dys + (Number.isFinite(dys)?dys:0) }
        })
        setPrevByName(by)
      } catch { setPrevByName({}) }
    }
    loadPrevByName()
  }, [assignYear, items])

  function ratioPercent(targetEok:number, prevWon:number): string {
    const denom = Number(prevWon)
    if (!Number.isFinite(denom) || denom <= 0) return '-'
    const numerWon = Math.max(0, Number(targetEok||0)) * 100_000_000
    const p = (numerWon / denom) * 100
    return `${p.toFixed(1)}%`
  }

  const filtered = items

  function selectOne(it: Emp) {
    setActive(it)
    try { localStorage.setItem('tnt.sales.selectedEmployee', JSON.stringify(it)) } catch {}
    try { window.dispatchEvent(new CustomEvent('tnt.sales.employee.selected') as any) } catch {}
  }

  function updateTarget(empKey: string, kind: 'tnt' | 'dys', value: string) {
    const n = Number((value || '').replace(/[,\s]/g, ''))
    const v = Number.isFinite(n) ? n : 0
    setTargets(prev => {
      const cur = prev[empKey] || { tnt: 0, dys: 0 }
      const next = { ...cur, [kind]: v }
      return { ...prev, [empKey]: next }
    })
  }

  function largestRemainderAllocate(total: number, amounts: Array<{ key:string; value:number }>): Record<string, number> {
    const safeTotal = Math.max(0, Math.round(Number(total)||0))
    const sum = amounts.reduce((s,a)=> s + (Number(a.value)||0), 0)
    if (!Number.isFinite(sum) || sum <= 0 || safeTotal <= 0) {
      const zeros: Record<string, number> = {}
      amounts.forEach(a => { zeros[a.key] = 0 })
      return zeros
    }
    const exact = amounts.map(a => ({ key: a.key, exact: (safeTotal * ((Number(a.value)||0) / sum)) }))
    const floors = exact.map(e => ({ key: e.key, floor: Math.floor(e.exact), frac: e.exact - Math.floor(e.exact) }))
    let assigned = floors.reduce((s,f)=> s + f.floor, 0)
    let remain = safeTotal - assigned
    // Distribute remaining +1 to largest fractional parts
    floors.sort((a,b)=> b.frac - a.frac)
    for (let i=0; i<remain && floors.length>0; i++) {
      const idx = i % floors.length
      floors[idx].floor += 1
    }
    const out: Record<string, number> = {}
    floors.forEach(f => { out[f.key] = f.floor })
    return out
  }

  async function allocateBySales() {
    if (allocating) return
    setAllocating(true)
    try {
      // Read company totals (억원 단위) from top panel broadcast
      let totals: any = null
      try { const raw = localStorage.getItem('tnt.sales.assign.companyTotals'); totals = raw ? JSON.parse(raw) : null } catch {}
      const totalTNT = Math.round(Number(totals?.tnt || 0))
      const totalDYS = Math.round(Number(totals?.dys || 0))
      if (!Number.isFinite(totalTNT) || !Number.isFinite(totalDYS)) {
        alert('회사별 목표 합계를 찾을 수 없습니다. 상단 패널을 확인하세요.')
        return
      }

      const empNames = items.map(it => String(it.empName||'').trim()).filter(n=> !!n)
      if (!empNames.length) { alert('대상 직원이 없습니다.'); return }
      const url = new URL('/api/v1/sales/employee-yearly', window.location.origin)
      url.searchParams.set('year', String(assignYear))
      url.searchParams.set('empNames', empNames.join(','))
      url.searchParams.set('joinKey', 'emp_name')
      const r = await fetch(url.toString())
      const d = r.ok ? await r.json() : []
      const employees: any[] = Array.isArray(d) ? d : (Array.isArray(d?.employees) ? d.employees : [])

      // Build aggregated by emp_name from backend response
      const byName: Record<string, { tnt:number; dys:number }> = {}
      if (Array.isArray(employees)) {
        employees.forEach((x:any) => {
          const name = String(x.emp_name ?? x.empName ?? '').trim()
          if (!name) return
          const tntAmt = Number(x.tnt_amount ?? 0)
          const dysAmt = Number(x.dys_amount ?? 0)
          const cur = byName[name] || { tnt: 0, dys: 0 }
          byName[name] = { tnt: cur.tnt + (Number.isFinite(tntAmt)?tntAmt:0), dys: cur.dys + (Number.isFinite(dysAmt)?dysAmt:0) }
        })
      }
      // Count duplicates by name in center panel list
      const nameCount: Record<string, number> = {}
      items.forEach(it => { const n = String(it.empName||'').trim(); nameCount[n] = (nameCount[n]||0)+1 })
      // Per-row amount list uses name-aggregated amount divided by duplicate count
      const tntList: Array<{ key:string; value:number }> = []
      const dysList: Array<{ key:string; value:number }> = []
      items.forEach(it => {
        const n = String(it.empName||'').trim()
        const base = byName[n] || { tnt: 0, dys: 0 }
        const cnt = Math.max(1, nameCount[n]||1)
        tntList.push({ key: it.key, value: base.tnt / cnt })
        dysList.push({ key: it.key, value: base.dys / cnt })
      })

      const tntAssigned = largestRemainderAllocate(totalTNT, tntList)
      const dysAssigned = largestRemainderAllocate(totalDYS, dysList)

      // Apply to inputs
      setTargets(prev => {
        const next: Record<string, { tnt:number; dys:number }> = { ...prev }
        items.forEach(it => {
          next[it.key] = { tnt: tntAssigned[it.key] ?? 0, dys: dysAssigned[it.key] ?? 0 }
        })
        return next
      })

      // Quick UX feedback
      const sum = (m:Record<string,number>)=> Object.values(m||{}).reduce((s,v)=> s+(Number(v)||0),0)
      const checkMsg = `TNT 합계 ${fmt.format(sum(tntAssigned))} / 목표 ${fmt.format(totalTNT)}\nDYS 합계 ${fmt.format(sum(dysAssigned))} / 목표 ${fmt.format(totalDYS)}`
      if ((sum(tntAssigned)!==totalTNT) || (sum(dysAssigned)!==totalDYS)) {
        alert('배정 완료(합계 보정 필요):\n' + checkMsg)
      } else {
        alert('배정이 완료되었습니다.\n' + checkMsg)
      }
    } catch (e:any) {
      alert(e?.message || '배정 중 오류가 발생했습니다.')
    } finally {
      setAllocating(false)
    }
  }

  return (
    <section>
      {/* 회사별 목표 입력 영역 — 최상단 배치 */}
      <SalesAssignCompany />
      <div className="page-title" style={{ alignItems: 'center', marginTop: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, display:'flex', alignItems:'center', gap:8 }}>
          목표배정
          {yearStage ? <span className="badge" title="해당 연도 전체 단계">{yearStage}</span> : null}
        </h2>
        <div style={{ marginLeft:'auto', display:'inline-flex', alignItems:'center', gap:8 }}>
          <button className="btn btn-card btn-3d" onClick={()=> allocateBySales()} disabled={allocating} title="전년도 매출 비율로 자동 배정">할당(매출 기반)</button>
          <button className="btn btn-card btn-3d" onClick={()=> saveAssigned(false)} title="현재 배정값 저장">저장</button>
          <button className="btn btn-card btn-3d" onClick={()=> saveAssigned(true)} title="현재 배정값 확정">확정</button>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="table-container" style={{ height: 'calc(100vh - 140px)' }}>
        {loading ? (
          <div className="empty-state">불러오는 중…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">데이터가 없습니다</div>
        ) : (
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 140 }}>부서</th>
                <th style={{ width: 140 }}>사번</th>
                <th style={{ width: 180, textAlign: 'left' }}>이름</th>
                <th style={{ width: 140, textAlign: 'right' }}>TNT</th>
                <th style={{ width: 110, textAlign: 'right' }}>TNT 전년대비</th>
                <th style={{ width: 140, textAlign: 'right' }}>DYS</th>
                <th style={{ width: 110, textAlign: 'right' }}>DYS 전년대비</th>
                
              </tr>
            </thead>
            <tbody>
              {filtered.map((it, idx) => {
                const cur = targets[it.key] || { tnt: 0, dys: 0 }
                const nm = String(it.empName||'').trim()
                const prevT = Number(prevByName[nm]?.tnt || 0) // 원 단위
                const prevD = Number(prevByName[nm]?.dys || 0) // 원 단위
                return (
                  <tr key={idx} onClick={()=>selectOne(it)} aria-selected={active?.key===it.key?true:undefined} style={active?.key===it.key?{ background: 'rgba(59,130,246,.12)' }:undefined}>
                    <td>{it.deptName}</td>
                    <td>{it.empId}</td>
                    <td style={{ textAlign: 'left' }}>{it.empName}</td>
                    <td style={{ textAlign: 'right' }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9,]*"
                        value={cur.tnt ? fmt.format(cur.tnt) : ''}
                        onChange={(e)=> updateTarget(it.key, 'tnt', e.target.value)}
                        placeholder="0"
                        style={{ width: '100%', textAlign: 'right' }}
                        className="assign-input"
                        aria-label={`TNT 목표(${it.empName})`}
                        title={isModerate ? 'Moderate 모드에서는 목표 수정이 비활성화됩니다' : 'TNT 매출목표'}
                        disabled={isModerate}
                      />
                    </td>
                    <td style={{ textAlign: 'right' }} title="해당 직원 전년도 TNT 매출 대비 올해 목표 비율">
                      <span className="muted">{ratioPercent(cur.tnt, prevT)}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9,]*"
                        value={cur.dys ? fmt.format(cur.dys) : ''}
                        onChange={(e)=> updateTarget(it.key, 'dys', e.target.value)}
                        placeholder="0"
                        style={{ width: '100%', textAlign: 'right' }}
                        className="assign-input"
                        aria-label={`DYS 목표(${it.empName})`}
                        title={isModerate ? 'Moderate 모드에서는 목표 수정이 비활성화됩니다' : 'DYS 매출목표'}
                        disabled={isModerate}
                      />
                    </td>
                    <td style={{ textAlign: 'right' }} title="해당 직원 전년도 DYS 매출 대비 올해 목표 비율">
                      <span className="muted">{ratioPercent(cur.dys, prevD)}</span>
                    </td>
                    
                    
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )

  async function saveAssigned(confirm:boolean) {
    try {
      const targetStage = confirm ? '확정' : '기안중'
      const mode = (localStorage.getItem('tnt.sales.assign.mode') || '').toLowerCase()
      const versionNo = mode === 'moderate' ? 2 : 1
      const payload: Array<{ targetYear:string; empName:string; companyName:'TNT'|'DYS'; targetAmount:number; targetStage:string; versionNo:number }> = []
      const yearStr = `${assignYear}-01-01`
      items.forEach(it => {
        const cur = targets[it.key] || { tnt: 0, dys: 0 }
        payload.push({ targetYear: yearStr, empName: it.empName, companyName: 'TNT', targetAmount: Math.round(cur.tnt||0), targetStage, versionNo })
        payload.push({ targetYear: yearStr, empName: it.empName, companyName: 'DYS', targetAmount: Math.round(cur.dys||0), targetStage, versionNo })
      })
      // 디버그 미리보기 제거 (서버로 바로 저장)
      const empSeq = localStorage.getItem('tnt.sales.empSeq') || ''
      const headers: Record<string,string> = { 'Content-Type': 'application/json' }
      if (empSeq) headers['X-EMP-SEQ'] = String(empSeq)
      const res = await fetch('/api/v1/targets/assigned/upsert', { method:'POST', headers, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      if (confirm) {
        await fetch(`/api/v1/targets/assigned/confirm?year=${assignYear}`, { method:'POST', headers })
      }
      alert(confirm ? '배정이 확정되었습니다.' : '배정이 저장되었습니다.')
    } catch (e:any) {
      alert(e?.message || '배정 저장 중 오류가 발생했습니다.')
    }
  }
}
