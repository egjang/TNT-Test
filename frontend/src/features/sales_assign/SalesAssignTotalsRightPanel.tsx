import React, { useEffect, useMemo, useState } from 'react'

type EmpTotal = { key:string; empId:string; empName:string; deptName:string; amount:number }
const TARGET_DEPTS = ['영업1본부','영업1팀','영업2본부','영업2팀']

export function SalesAssignTotalsRightPanel() {
  const [year, setYear] = useState<number>(() => {
    const v = (typeof window !== 'undefined') ? localStorage.getItem('tnt.sales.assign.year') : null
    const n = v ? Number(v) : NaN
    return Number.isFinite(n) ? n : new Date().getFullYear()
  })
  const [items, setItems] = useState<EmpTotal[]>([])
  const [empList, setEmpList] = useState<Array<{ key?:string; empId?:string; empName?:string; deptName?:string }>>(() => {
    try {
      const raw = localStorage.getItem('tnt.sales.assign.empList')
      const arr = raw ? JSON.parse(raw) : []
      if (Array.isArray(arr)) return arr.map((x:any)=>({
        key: String(x.key ?? x.empId ?? (x.empName?`name:${x.empName}`:'')),
        empId: String(x.empId ?? ''),
        empName: String(x.empName ?? ''),
        deptName: String(x.deptName ?? ''),
      }))
      return []
    } catch { return [] }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fmt = new Intl.NumberFormat('ko-KR')
  const [aggMode, setAggMode] = useState<'cur'|'prev'|'cur_prev'|'last3'>('cur')

  useEffect(() => {
    const onYear = () => {
      try {
        const v = localStorage.getItem('tnt.sales.assign.year')
        const n = v ? Number(v) : NaN
        if (Number.isFinite(n)) setYear(n)
      } catch {}
    }
    const onEmps = () => {
      try {
        const rawList = localStorage.getItem('tnt.sales.assign.empList')
        const list = rawList ? JSON.parse(rawList) : []
        if (Array.isArray(list)) setEmpList(list.map((x:any)=>({
          key: String(x.key ?? x.empId ?? (x.empName?`name:${x.empName}`:'')),
          empId: String(x.empId ?? ''),
          empName: String(x.empName ?? ''),
          deptName: String(x.deptName ?? ''),
        })))
      } catch {}
    }
    window.addEventListener('tnt.sales.assign.year.changed' as any, onYear)
    window.addEventListener('tnt.sales.assign.emps.changed' as any, onEmps)
    return () => {
      window.removeEventListener('tnt.sales.assign.year.changed' as any, onYear)
      window.removeEventListener('tnt.sales.assign.emps.changed' as any, onEmps)
    }
  }, [])

  async function load() {
    setLoading(true); setError(null)
    try {
      const base = Number.isFinite(year) ? year : new Date().getFullYear()
      // Targets must mirror the visible labels in the select box
      const targets: number[] = aggMode === 'cur'
        ? [base - 1]
        : (aggMode === 'prev'
          ? [base - 2]
          : (aggMode === 'cur_prev'
            ? [base - 1, base - 2]
            : [base - 1, base - 2, base - 3]))

      // Use name-based grouping/join for right panel to avoid seq mismatch
      const names = (empList || []).map((e:any)=> String(e.empName||'').trim()).filter((s:string)=> !!s)
      const useName = names.length > 0

      const totalMap = new Map<number, EmpTotal & { tntAmount?:number; dysAmount?:number }>()
      const nameMap = new Map<string, { amount:number; tntAmount:number; dysAmount:number; anyRow?:any }>()
      const compMap = new Map<string, number>()

      // Single request with exact years list to match invoice year
      const url = new URL('/api/v1/sales/employee-yearly', window.location.origin)
      url.searchParams.set('year', String(year))
      url.searchParams.set('exact', 'true')
      url.searchParams.set('years', targets.join(','))
      if (useName) {
        url.searchParams.set('empNames', names.join(','))
        url.searchParams.set('joinKey', 'emp_name')
      }
      const r = await fetch(url.toString())
      const d = r.ok ? await r.json() : []
      const employees: any[] = Array.isArray(d) ? d : Array.isArray(d?.employees) ? d.employees : []
      if (Array.isArray(employees)) {
        employees.forEach((x:any) => {
          const n = String(x.emp_name ?? x.empName ?? '').trim()
          const amt = Number(x.amount ?? 0)
          const tntAmt = Number(x.tnt_amount ?? 0)
          const dysAmt = Number(x.dys_amount ?? 0)
          if (useName) {
            const cur = nameMap.get(n) || { amount:0, tntAmount:0, dysAmount:0, anyRow:x }
            const next = { amount: (cur.amount||0)+amt, tntAmount: (cur.tntAmount||0)+tntAmt, dysAmount: (cur.dysAmount||0)+dysAmt, anyRow: cur.anyRow || x }
            nameMap.set(n, next)
          }
        })
      }
      const compTotals: Array<{ company_type:string; amount:number }> = Array.isArray(d?.companyTotals) ? d.companyTotals : []
      compTotals.forEach((c:any) => {
        const k = String(c.company_type || c.companyType || '').toUpperCase()
        const v = Number(c.amount || 0)
        compMap.set(k, (compMap.get(k) || 0) + (Number.isFinite(v) ? v : 0))
      })
      // Build display list based on center-panel ordering (empList), defaulting amount to 0 for missing rows
      const baseList: Array<{ key?:string; empId?:string; empName?:string; deptName?:string }> = empList && empList.length
        ? empList
        : []
      const display: (EmpTotal & { tntAmount?:number; dysAmount?:number })[] = baseList.map((e:any) => {
        if (useName) {
          const nm = String(e.empName||'').trim()
          const it = nameMap.get(nm)
          const any = it?.anyRow || {}
          return {
            key: String(e.key || e.empId || (e.empName?`name:${e.empName}`:'')),
            empId: String(e.empId || any.emp_id || ''),
            empName: String(e.empName || any.emp_name || nm),
            deptName: String(e.deptName || any.dept_name || ''),
            amount: Number(it?.amount || 0),
            tntAmount: Number(it?.tntAmount || 0),
            dysAmount: Number(it?.dysAmount || 0),
          }
        }
      })
      setItems(display)
      const mergedCompTotals = Array.from(compMap.entries()).map(([company_type, amount]) => ({ company_type, amount }))
      setCompanyTotals(mergedCompTotals)
    } catch(e:any) {
      setError(e?.message || '조회 오류')
      setItems([])
    } finally { setLoading(false) }
  }

  useEffect(()=>{ load() }, [year, empList, aggMode])

  const [companyTotals, setCompanyTotals] = useState<Array<{ company_type:string; amount:number }>>([])
  const total = items.reduce((s, it)=> s + (Number(it.amount)||0), 0)
  const tnt = useMemo(()=> companyTotals.find(x=> String(x.company_type||'').toUpperCase()==='TNT')?.amount || 0, [companyTotals])
  const dys = useMemo(()=> companyTotals.find(x=> String(x.company_type||'').toUpperCase()==='DYS')?.amount || 0, [companyTotals])
  return (
    <div style={{ padding: 8, fontSize: 12 }}>
      {error && <div className="error">{error}</div>}
      {loading ? (
        <div className="empty-state">불러오는 중…</div>
      ) : (
        <>
          <div className="card" style={{ padding: 8, marginBottom: 6 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 6 }}>
              {(() => {
                const lbl = aggMode === 'cur'
                  ? `${year - 1}년 매출 합계`
                  : (aggMode === 'prev'
                    ? `${year - 2}년 매출 합계`
                    : (aggMode === 'cur_prev'
                      ? `${year - 1}년~${year - 2}년 매출 합계`
                      : `${year - 1}년~${year - 3}년 매출 합계`))
                return <div style={{ fontWeight: 700 }}>{lbl}</div>
              })()}
              <div style={{ display:'inline-flex', alignItems:'center', gap: 6 }}>
                <span className="muted">매출구간</span>
                <select className="search-input" value={aggMode} onChange={(e)=> setAggMode(e.target.value as any)} aria-label="집계 기간 선택" style={{ height: 26 }}>
                  <option value="cur">{`${year - 1}년`}</option>
                  <option value="prev">{`${year - 2}년`}</option>
                  <option value="cur_prev">{`${year - 1}년~${year - 2}년`}</option>
                  <option value="last3">{`${year - 1}년~${year - 3}년`}</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{fmt.format(Math.round(total))} 원</div>
              <div className="badge" style={{ fontSize: 11, padding: '2px 6px' }}>TNT: {fmt.format(Math.round(tnt))} 원</div>
              <div className="badge" style={{ fontSize: 11, padding: '2px 6px' }}>DYS: {fmt.format(Math.round(dys))} 원</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
            {items.map((it, idx) => (
              <div key={`${(it as any).key || it.empId || it.empName}-${idx}`} className="card" style={{ padding: 6 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ fontWeight: 700 }}>{it.empName}</div>
                  <div className="muted" style={{ fontSize: 11 }}>({it.empId})</div>
                  <div className="muted" style={{ marginLeft: 'auto', fontSize: 11 }}>{it.deptName}</div>
                </div>
                <div style={{ display:'flex', alignItems:'baseline', gap:8, marginTop: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{fmt.format(Math.round(it.amount))} 원</div>
                  <div className="badge" style={{ fontSize: 11, padding: '2px 6px' }}>TNT: {fmt.format(Math.round(Number((it as any).tntAmount || 0)))} 원</div>
                  <div className="badge" style={{ fontSize: 11, padding: '2px 6px' }}>DYS: {fmt.format(Math.round(Number((it as any).dysAmount || 0)))} 원</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
