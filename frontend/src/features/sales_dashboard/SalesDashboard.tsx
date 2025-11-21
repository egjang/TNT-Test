import React, { useEffect, useMemo, useRef, useState } from 'react'

type Emp = {
  key: string
  empId: string
  empName: string
  deptName: string
  assigneeId?: string
}

const TARGET_DEPTS = ['영업1본부','영업1팀','영업2본부','영업2팀']

export function SalesDashboard() {
  const [year, setYear] = useState<number>(() => {
    try { const v = localStorage.getItem('tnt.sales.assign.year'); return v ? Number(v) : new Date().getFullYear() } catch { return new Date().getFullYear() }
  })
  const [items, setItems] = useState<Emp[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [empOpen, setEmpOpen] = useState(false)
  const empBoxRef = useRef<HTMLDivElement | null>(null)
  const [yearRows, setYearRows] = useState<any[]>([])
  const [yearLoading, setYearLoading] = useState(false)
  const [yearError, setYearError] = useState<string | null>(null)
  const [planTotals, setPlanTotals] = useState<{ tnt:number; dys:number }>({ tnt: 0, dys: 0 })
  const [countRows, setCountRows] = useState<any[]>([])
  const [countLoading, setCountLoading] = useState(false)
  const [countError, setCountError] = useState<string | null>(null)
  const companyGoals = useMemo(() => {
    try {
      let tnt = 0, dys = 0
      for (const r of yearRows) {
        const comp = String((r?.company_name ?? r?.companyName ?? '')).toUpperCase()
        const mx = Number(r?.target_amount_max ?? 0) // already 억원 단위
        if (!Number.isFinite(mx)) continue
        if (comp === 'TNT') tnt += mx
        else if (comp === 'DYS') dys += mx
      }
      return { tnt, dys }
    } catch { return { tnt: 0, dys: 0 } }
  }, [yearRows])
  const planTotalsEok = useMemo(() => ({ tnt: planTotals.tnt/100000000, dys: planTotals.dys/100000000 }), [planTotals])
  const diffs = useMemo(() => ({ tnt: companyGoals.tnt - planTotalsEok.tnt, dys: companyGoals.dys - planTotalsEok.dys }), [companyGoals, planTotalsEok])
  const goalsTotal = useMemo(() => {
    try {
      const sum = (name:string) => yearRows.reduce((s:any, r:any)=>{
        const nm = String(r?.biz_area_name ?? r?.bizAreaName ?? '')
        const mx = Number(r?.target_amount_max ?? 0)
        return s + (nm === name && Number.isFinite(mx) ? mx : 0)
      }, 0)
      const totA = sum('복층유리')
      const totB = sum('건자재')
      const totC = sum('실란트')
      const total = (Number.isFinite(totA)?totA:0) + (Number.isFinite(totB)?totB:0) + (Number.isFinite(totC)?totC:0)
      return total
    } catch { return 0 }
  }, [yearRows])

  const years = useMemo(() => {
    const arr:number[] = []; for (let y=2030;y>=2026;y--) arr.push(y); return arr
  }, [])

  async function loadEmployees(yy:number) {
    setLoading(true); setError(null)
    try {
      // Prefer assigned list for the selected year
      const asn = new URL('/api/v1/targets/assigned', window.location.origin)
      asn.searchParams.set('year', String(yy))
      const r1 = await fetch(asn.toString())
      const d1 = r1.ok ? await r1.json() : []
      const assigned = Array.isArray(d1) ? d1 : []
      if (assigned.length > 0) {
        const arr: Emp[] = assigned.reduce((acc: Emp[], row: any) => {
          const empId = String(row.emp_id ?? row.empId ?? '').trim()
          const empName = String(row.emp_name ?? row.empName ?? '').trim()
          const deptName = String(row.dept_name ?? row.deptName ?? '')
          const key = empId || (empName ? `name:${empName}` : '')
          if (!key) return acc
          if (!acc.some(x => x.key === key)) acc.push({ key, empId, empName, deptName })
          return acc
        }, [])
        arr.sort((a,b)=> (a.deptName||'').localeCompare(b.deptName||'') || (a.empName||'').localeCompare(b.empName||''))
        setItems(arr)
        setLoading(false)
        return
      }
      // Fallback by department
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

  useEffect(() => { loadEmployees(year) }, [year])

  // Load sales_target_year rows for selected year
  useEffect(() => {
    async function loadYear() {
      setYearLoading(true); setYearError(null)
      try {
        const u = new URL('/api/v1/targets/year', window.location.origin)
        u.searchParams.set('year', String(year))
        const r = await fetch(u.toString())
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const arr = await r.json()
        setYearRows(Array.isArray(arr) ? arr : [])
      } catch (e:any) {
        setYearRows([])
        setYearError(e?.message || '조회 오류')
      } finally { setYearLoading(false) }
    }
    loadYear()
  }, [year])

  // Load per-employee company-type customer counts for selected employees
  useEffect(() => {
    async function loadCounts() {
      const selected = selectedKeys.length ? items.filter(it => selectedKeys.includes(it.key)) : items
      const empIds = selected.map(it => String(it.empId||'').trim()).filter(Boolean)
      const asgIds = selected.map(it => String(it.assigneeId||'').trim()).filter(Boolean)
      if (!year || (empIds.length===0 && asgIds.length===0)) { setCountRows([]); setCountError(null); return }
      setCountLoading(true); setCountError(null)
      try {
        const u = new URL('/api/v1/sales/plan/customer-counts', window.location.origin)
        u.searchParams.set('year', String(year))
        if (empIds.length>0) u.searchParams.set('empIds', empIds.join(','))
        if (asgIds.length>0) u.searchParams.set('assigneeIds', asgIds.join(','))
        const r = await fetch(u.toString())
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const arr = await r.json()
        setCountRows(Array.isArray(arr) ? arr : [])
      } catch (e:any) {
        setCountRows([])
        setCountError(e?.message || '고객수 요약 조회 오류')
      } finally { setCountLoading(false) }
    }
    loadCounts()
  }, [year, selectedKeys, items])

  // Load sales_plan totals by company (prefer P over B)
  useEffect(() => {
    async function loadTotals() {
      try {
        const u = new URL('/api/v1/sales/plan/totals', window.location.origin)
        u.searchParams.set('year', String(year))
        const r = await fetch(u.toString())
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const arr:any[] = await r.json().catch(()=> [])
        let tnt = 0, dys = 0
        if (Array.isArray(arr)) {
          arr.forEach(x => {
            const comp = String(x?.company || x?.company_type || x?.companyName || '').toUpperCase()
            const tot = Number(x?.total || x?.total_amount || 0)
            if (comp === 'TNT') tnt += (Number.isFinite(tot) ? tot : 0)
            else if (comp === 'DYS') dys += (Number.isFinite(tot) ? tot : 0)
          })
        }
        setPlanTotals({ tnt, dys })
      } catch {
        setPlanTotals({ tnt: 0, dys: 0 })
      }
    }
    loadTotals()
  }, [year])

  function onYearChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const y = Number(e.target.value)
    if (!Number.isFinite(y) || y<=0) return
    setYear(y)
    try { localStorage.setItem('tnt.sales.assign.year', String(y)) } catch {}
  }

  function persistSelected(values: string[]) {
    setSelectedKeys(values)
    const selectedItems = items.filter(it => values.includes(it.key))
    try { localStorage.setItem('tnt.sales.selectedEmployees', JSON.stringify(selectedItems)) } catch {}
    const first = selectedItems[0] || null
    try { if (first) localStorage.setItem('tnt.sales.selectedEmployee', JSON.stringify(first)); else localStorage.removeItem('tnt.sales.selectedEmployee') } catch {}
    try { window.dispatchEvent(new CustomEvent('tnt.sales.employees.selected', { detail: { items: selectedItems } }) as any) } catch {}
    try { if (first) window.dispatchEvent(new CustomEvent('tnt.sales.employee.selected') as any) } catch {}
  }
  function toggleAllEmp(checked: boolean) { if (checked) persistSelected(items.map(it => it.key)); else persistSelected([]) }
  function toggleOneEmp(key: string, checked: boolean) {
    const set = new Set(selectedKeys)
    if (checked) set.add(key); else set.delete(key)
    persistSelected(Array.from(set))
  }
  useEffect(() => {
    if (!empOpen) return
    const onClick = (e: MouseEvent) => { if (!empBoxRef.current) return; if (!empBoxRef.current.contains(e.target as Node)) setEmpOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setEmpOpen(false) }
    window.addEventListener('click', onClick, true)
    window.addEventListener('keydown', onKey, true)
    return () => { window.removeEventListener('click', onClick, true); window.removeEventListener('keydown', onKey, true) }
  }, [empOpen])
  const selectedEmpLabel = useMemo(() => {
    if (!selectedKeys.length) return '전체'
    const names = items.filter(it => selectedKeys.includes(it.key)).map(it => it.empName || it.empId || it.key)
    if (names.length <= 2) return names.join(', ')
    return `${names.slice(0,2).join(', ')} 외 ${names.length-2}명`
  }, [selectedKeys, items])

  return (
    <section>
      <div className="card" style={{ padding: 8, marginBottom: 12, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
          <div className="muted">목표년도</div>
          <select className="search-input" value={year} onChange={onYearChange} aria-label="목표년도" style={{ height: 28 }}>
            {years.map(y=> <option key={y} value={String(y)}>{y}년</option>)}
          </select>
        </div>
        <div ref={empBoxRef} style={{ position:'relative', display:'inline-flex', alignItems:'center', gap:8 }}>
          <div className="muted">영업사원</div>
          <button type="button" className="search-input" aria-haspopup="listbox" aria-expanded={empOpen} onClick={()=> setEmpOpen(o=>!o)} style={{ height: 28, minWidth: 260, display:'inline-flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
            <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{selectedEmpLabel}</span>
            <span aria-hidden>▾</span>
          </button>
          {empOpen && (
            <div role="listbox" className="card" style={{ position:'absolute', zIndex: 60, top: '100%', left: 0, width: 380, maxHeight: 260, overflow:'auto', background:'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: 8, marginTop: 6, fontSize: 11 }}>
              <label style={{ display:'flex', alignItems:'center', gap:8, padding: '4px 6px' }}>
                <input type="checkbox" checked={selectedKeys.length===items.length && items.length>0} onChange={(e)=> toggleAllEmp(e.target.checked)} />
                <span>전체</span>
              </label>
              {loading ? (
                <div className="muted" style={{ padding:'6px 6px' }}>불러오는 중…</div>
              ) : (items.length === 0 ? (
                <div className="muted" style={{ padding:'6px 6px' }}>목록이 없습니다</div>
              ) : items.map(it => {
                const checked = selectedKeys.includes(it.key)
                const label = `${it.deptName || '-'} / ${it.empName || ''}${it.empId ? ` (${it.empId})` : ''}`
                return (
                  <label key={it.key} style={{ display:'flex', alignItems:'center', gap:8, padding: '4px 6px', cursor:'pointer' }}>
                    <input type="checkbox" checked={checked} onChange={(e)=> toggleOneEmp(it.key, e.target.checked)} />
                    <span>{label}</span>
                  </label>
                )
              }))}
              {error ? <div className="error" style={{ padding:'6px 6px' }}>{error}</div> : null}
            </div>
          )}
        </div>
      </div>
      {/* Yearly targets by biz area cards */}
      <div className="card" style={{ padding: 8 }}>
        {yearError ? <div className="error" style={{ marginBottom: 8 }}>{yearError}</div> : null}
        {yearLoading ? (
          <div className="muted" style={{ padding:'8px 6px' }}>불러오는 중…</div>
        ) : (
          <div style={{ display:'flex', alignItems:'stretch', gap: 12 }}>
            <div style={{ flex: '1 1 auto', display:'flex', flexDirection:'column', gap: 6 }}>
              <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', margin: '0 2px' }}>
                <div className="muted" style={{ fontWeight: 800 }}>회사 목표</div>
                <div style={{ fontWeight: 800 }}>
                  {Number.isFinite(goalsTotal) ? `${Number(goalsTotal).toLocaleString(undefined, { maximumFractionDigits: 1 })} 억원` : '-'}
                </div>
              </div>
              {(() => {
                // Always render 2 cards: TNT(복층유리+건자재) and DYS(실란트), show 0 when missing
                let tntA = 0, tntB = 0, tntStage: string | undefined = undefined
                let dysSum = 0, dysStage: string | undefined = undefined
                yearRows.forEach((r:any) => {
                  const comp = String(r?.company_name ?? r?.companyName ?? '').toUpperCase()
                  const biz = String(r?.biz_area_name ?? r?.bizAreaName ?? '')
                  const mx = Number(r?.target_amount_max ?? 0)
                  const st = String(r?.target_stage ?? r?.targetStage ?? '') || undefined
                  if (comp === 'TNT') {
                    if (biz === '복층유리' && Number.isFinite(mx)) tntA += mx
                    else if (biz === '건자재' && Number.isFinite(mx)) tntB += mx
                    if (st) tntStage = st
                  } else if (comp === 'DYS' && biz === '실란트') {
                    if (Number.isFinite(mx)) dysSum += mx
                    if (st) dysStage = st
                  }
                })
                const rows: Array<{ company:string; biz:string; max:number; stage?:string }> = [
                  { company: 'TNT', biz: '복층유리+건자재', max: (tntA + tntB), stage: tntStage },
                  { company: 'DYS', biz: '실란트', max: dysSum, stage: dysStage },
                ]
                const cols = 2
                return (
                  <div style={{ display:'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 8 }}>
                {rows.map((r,i) => {
                  const company = r.company
                  const biz = r.biz
                  const max = r.max
                  const stage = r.stage || ''
                  return (
                    <div key={i} className="card" style={{ padding: 8, border: '1px solid var(--border)', borderRadius: 10, display:'flex', alignItems:'center', minHeight: 92, position:'relative' }}>
                      <div style={{ flex: 1 }}>
                        {/* stage badge on top */}
                        {stage ? (
                          <div style={{ position:'absolute', top: 6, left: 6 }}>
                            <span className="badge" style={{ fontSize: 8, padding: '0 4px', lineHeight: 1.1, border: '1px solid var(--border)', borderRadius: 6 }}>{stage}</span>
                          </div>
                        ) : null}
                        {company === 'TNT' && biz === '복층유리+건자재' ? (
                          (() => {
                            try {
                              let a = 0, b = 0
                              for (const rr of yearRows) {
                                const comp = String((rr?.company_name ?? rr?.companyName ?? '')).toUpperCase()
                                const bz = String(rr?.biz_area_name ?? rr?.bizAreaName ?? '')
                                const mx = Number(rr?.target_amount_max ?? 0)
                                if (comp === 'TNT' && Number.isFinite(mx)) {
                                  if (bz === '복층유리') a += mx
                                  else if (bz === '건자재') b += mx
                                }
                              }
                              const tot = Number.isFinite(max) ? Number(max) : (a+b)
                              return (
                                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, textAlign:'center' }}>
                                  <div style={{ fontWeight: 800, fontSize: 18, lineHeight: 1.1 }}>TNT {tot.toLocaleString(undefined, { maximumFractionDigits: 1 })}억원</div>
                                  <div className="muted" style={{ fontSize: 10, lineHeight: 1.1 }}>
                                    ({`복층${a.toLocaleString(undefined, { maximumFractionDigits: 1 })}억원+건자재${b.toLocaleString(undefined, { maximumFractionDigits: 1 })}억원`})
                                  </div>
                                </div>
                              )
                            } catch {
                              return (
                                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, textAlign:'center' }}>
                                  <div style={{ fontWeight: 700, fontSize: 11 }}>TNT</div>
                                  <div className="muted" style={{ fontSize: 11, lineHeight: 1.1 }}>데이터 없음</div>
                                </div>
                              )
                            }
                          })()
                        ) : (
                          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, textAlign:'center' }}>
                            {String(company||'').toUpperCase() === 'DYS' && biz === '실란트' ? (
                              <>
                                <div style={{ fontWeight: 800, fontSize: 18, lineHeight: 1.1 }}>DYS {Number(max).toLocaleString(undefined, { maximumFractionDigits: 1 })}억원</div>
                              </>
                            ) : (
                              <>
                                <div style={{ fontWeight: 700, fontSize: 11 }}>{biz || '-'}</div>
                                <div style={{ fontSize: 11, fontWeight: 800, lineHeight: 1.1 }}>
                                  {Number.isFinite(max) ? `${Number(max).toLocaleString(undefined, { maximumFractionDigits: 1 })} 억원` : '-'}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                  </div>
                )
              })()}
            </div>
            <div style={{ flex: '0 0 auto', width: 1, background:'var(--border)' }} />
            <aside style={{ flex: '0 0 260px', maxWidth: 320, paddingLeft: 8, display:'flex', flexDirection:'column', justifyContent:'center' }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>목표수립 현황</div>
              <div className="card" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10, display:'flex', alignItems:'center', justifyContent:'center', minHeight: 92 }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, width: '100%' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width: '100%' }}>
                    <strong style={{ fontSize: 18, lineHeight: 1.1 }}>
                      {`TNT ${planTotalsEok.tnt.toLocaleString(undefined, { maximumFractionDigits: 1 })} 억원`}
                    </strong>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width: '100%' }}>
                    <strong style={{ fontSize: 18, lineHeight: 1.1 }}>
                      {`DYS ${planTotalsEok.dys.toLocaleString(undefined, { maximumFractionDigits: 1 })} 억원`}
                    </strong>
                  </div>
                </div>
              </div>
            </aside>
            <div style={{ flex: '0 0 auto', width: 1, background:'var(--border)' }} />
            <aside style={{ flex: '0 0 260px', maxWidth: 320, paddingLeft: 8, display:'flex', flexDirection:'column', justifyContent:'center' }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>차액</div>
              <div className="card" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10, display:'flex', alignItems:'center', justifyContent:'center', minHeight: 92 }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, width: '100%' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width: '100%' }}>
                    <strong style={{ fontSize: 18, lineHeight: 1.1 }}>
                      {`TNT ${diffs.tnt.toLocaleString(undefined, { maximumFractionDigits: 1 })} 억원`}
                    </strong>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width: '100%' }}>
                    <strong style={{ fontSize: 18, lineHeight: 1.1 }}>
                      {`DYS ${diffs.dys.toLocaleString(undefined, { maximumFractionDigits: 1 })} 억원`}
                    </strong>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Customer counts summary by employee/company */}
      <div className="card" style={{ padding: 8, marginTop: 12 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 6 }}>
          <div style={{ fontWeight: 800 }}>고객수 요약</div>
          {countLoading ? <div className="muted" style={{ fontSize: 12 }}>불러오는 중…</div> : null}
        </div>
        {countError ? <div className="error" style={{ marginBottom: 8 }}>{countError}</div> : null}
        {(() => {
          const selected = selectedKeys.length ? items.filter(it => selectedKeys.includes(it.key)) : items
          // index by assigneeId or empId from API result
          const byKey = new Map<string, Array<any>>()
          for (const r of countRows) {
            const k = String(r?.assignee_id || r?.emp_id || '').trim()
            if (!k) continue
            const arr = byKey.get(k) || []
            arr.push(r)
            byKey.set(k, arr)
          }
          return (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
              {selected.map((emp) => {
                const k = String(emp.assigneeId||emp.empId||emp.key||'')
                const rows = byKey.get(k) || []
                const compOrder = ['TNT','DYS']
                const rowsSorted = [...rows].sort((a,b)=> compOrder.indexOf(String(a.company||'').toUpperCase()) - compOrder.indexOf(String(b.company||'').toUpperCase()))
                return (
                  <div key={k} className="card" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 10 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 6 }}>
                      <div style={{ fontWeight: 700 }}>{emp.deptName || '-'} / {emp.empName || emp.empId || emp.key}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{year}년</div>
                    </div>
                    {rowsSorted.length === 0 ? (
                      <div className="muted" style={{ fontSize: 12 }}>데이터가 없습니다</div>
                    ) : (
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                        {rowsSorted.map((r, idx) => (
                          <div key={idx} className="card" style={{ padding: 8, border: '1px solid var(--border)', borderRadius: 8, minHeight: 92, display:'flex', flexDirection:'column', justifyContent:'center' }}>
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>{String(r.company||'').toUpperCase()}</div>
                            <div style={{ display:'flex', gap: 16, fontSize: 12, justifyContent:'space-between' }}>
                              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1 }}>
                                <span className="muted">수립대상</span>
                                <strong>{Number(r.total_customers||0).toLocaleString()}</strong>
                              </div>
                              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1 }}>
                                <span className="muted">확정</span>
                                <strong>{Number(r.confirmed_customers||0).toLocaleString()}</strong>
                              </div>
                              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1 }}>
                                <span className="muted">진행 중</span>
                                <strong>{Number(r.planning_customers||0).toLocaleString()}</strong>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>
    </section>
  )
}
