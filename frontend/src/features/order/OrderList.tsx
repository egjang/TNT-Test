import React, { useEffect, useMemo, useRef, useState } from 'react'

export function OrderList() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Single fetch (infinite scroll removed)
  const [company, setCompany] = useState<'TNT'|'DYS'|'ALL'>('ALL')
  const [scope, setScope] = useState<'mine'|'all'>('mine')
  function todayYyMmDd(): string {
    const d = new Date()
    const yy = String(d.getFullYear() % 100).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yy}-${mm}-${dd}`
  }
  const [fromDate, setFromDate] = useState(todayYyMmDd())
  const [toDate, setToDate] = useState(todayYyMmDd())
  const [hover, setHover] = useState<{ open:boolean; x:number; y:number; rec:any } | null>(null)
  const [ctx, setCtx] = useState<{ open:boolean; x:number; y:number; rec:any } | null>(null)
  const ctxRef = useRef<HTMLDivElement | null>(null)
  const [copied, setCopied] = useState<{ open:boolean; x:number; y:number; message?:string } | null>(null)
  const [fromErr, setFromErr] = useState<string | null>(null)
  const [toErr, setToErr] = useState<string | null>(null)
  const [custQuery, setCustQuery] = useState('')
  // employee 사번 해석은 조회 버튼 클릭 시점에만 수행

  async function resolveMyEmpSeqForCompany(co: 'TNT'|'DYS'|'ALL'): Promise<string> {
    if (co === 'ALL') return ''
    try {
      const aid = (typeof window !== 'undefined') ? (localStorage.getItem('tnt.sales.assigneeId') || '') : ''
      const eid = (typeof window !== 'undefined') ? (localStorage.getItem('tnt.sales.empId') || '') : ''
      const p = new URLSearchParams()
      if (aid) p.set('assigneeId', aid)
      if (eid) p.set('empId', eid)
      p.set('companyCode', co)
      const rs = await fetch(`/api/v1/employee/by-assignee?${p.toString()}`, { cache: 'no-store' })
      if (!rs.ok) return ''
      const j = await rs.json().catch(()=>null as any)
      const v = j?.resolvedSalesEmpSeq ?? (co==='DYS' ? j?.dys_emp_seq : j?.tnt_emp_seq)
      return (v!=null && String(v)) ? String(v) : ''
    } catch { return '' }
  }

  // Resolve both TNT and DYS emp_seq for ALL company query
  async function resolveMyEmpSeqBoth(): Promise<{ tntEmpSeq: string; dysEmpSeq: string }> {
    try {
      const aid = (typeof window !== 'undefined') ? (localStorage.getItem('tnt.sales.assigneeId') || '') : ''
      const eid = (typeof window !== 'undefined') ? (localStorage.getItem('tnt.sales.empId') || '') : ''
      const p = new URLSearchParams()
      if (aid) p.set('assigneeId', aid)
      if (eid) p.set('empId', eid)
      const rs = await fetch(`/api/v1/employee/by-assignee?${p.toString()}`, { cache: 'no-store' })
      if (!rs.ok) return { tntEmpSeq: '', dysEmpSeq: '' }
      const j = await rs.json().catch(()=>null as any)
      const tntSeq = j?.tnt_emp_seq
      const dysSeq = j?.dys_emp_seq
      return {
        tntEmpSeq: (tntSeq != null && String(tntSeq)) ? String(tntSeq) : '',
        dysEmpSeq: (dysSeq != null && String(dysSeq)) ? String(dysSeq) : ''
      }
    } catch { return { tntEmpSeq: '', dysEmpSeq: '' } }
  }

  function normalizeYyMmDd(input: string): string | null {
    if (!input) return ''
    let s = String(input).trim()
    // Replace separators with nothing, keep digits only
    const digits = s.replace(/[^0-9]/g, '')
    if (digits.length === 6) {
      // YYMMDD -> YY-MM-DD
      const yy = digits.slice(0,2)
      const mm = digits.slice(2,4)
      const dd = digits.slice(4,6)
      if (!isValidYyMmDd(yy, mm, dd)) return null
      return `${yy}-${mm}-${dd}`
    }
    if (digits.length === 8) {
      // YYYYMMDD -> take last 2 digits of year
      const yy = digits.slice(2,4)
      const mm = digits.slice(4,6)
      const dd = digits.slice(6,8)
      if (!isValidYyMmDd(yy, mm, dd)) return null
      return `${yy}-${mm}-${dd}`
    }
    // Try patterns like YY-MM-DD or YYYY-MM-DD
    const m1 = s.match(/^\s*(\d{2})[-/](\d{2})[-/](\d{2})\s*$/)
    if (m1) {
      const [, yy, mm, dd] = m1
      if (!isValidYyMmDd(yy, mm, dd)) return null
      return `${yy}-${mm}-${dd}`
    }
    const m2 = s.match(/^\s*(\d{4})[-/](\d{2})[-/](\d{2})\s*$/)
    if (m2) {
      const [, yyyy, mm, dd] = m2
      const yy = yyyy.slice(2)
      if (!isValidYyMmDd(yy, mm, dd)) return null
      return `${yy}-${mm}-${dd}`
    }
    return null
  }

  function isValidYyMmDd(yy: string, mm: string, dd: string): boolean {
    const y = Number(yy), m = Number(mm), d = Number(dd)
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false
    if (m < 1 || m > 12) return false
    if (d < 1 || d > 31) return false
    // Rough day cap per month
    const md = [31,28,31,30,31,30,31,31,30,31,30,31]
    if (d > md[m-1]) return false
    return true
  }

  function toFullYear(yyDashMmDashDd: string): string | null {
    // Convert YY-MM-DD to 20YY-MM-DD (for range compare only)
    const m = yyDashMmDashDd.match(/^(\d{2})-(\d{2})-(\d{2})$/)
    if (!m) return null
    return `20${m[1]}-${m[2]}-${m[3]}`
  }

  function textWithNewlines(v: any): string {
    try {
      let s = String(v ?? '')
      // Normalize real CRLF/CR to LF, then turn literal "\n" sequences into real newlines
      s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\\n/g, '\n')
      return s
    } catch { return String(v ?? '') }
  }

  function formatRequestDateDisplay(val: any): string {
    const raw = String(val ?? '').trim()
    if (!raw) return ''
    const digits = raw.replace(/[^0-9]/g, '')
    if (digits.length === 8) {
      return `${digits.slice(0,4)}-${digits.slice(4,6)}-${digits.slice(6,8)}`
    }
    if (digits.length === 6) {
      return `20${digits.slice(0,2)}-${digits.slice(2,4)}-${digits.slice(4,6)}`
    }
    return raw
  }

  async function runQuery(reset = false) {
    // Validate dates before querying
    const f = fromDate.trim()
    const t = toDate.trim()
    let fNorm: string | null = f ? normalizeYyMmDd(f) : ''
    let tNorm: string | null = t ? normalizeYyMmDd(t) : ''
    setFromErr(null); setToErr(null)
    if (f && !fNorm) { setFromErr('형식: YY-MM-DD'); return }
    if (t && !tNorm) { setToErr('형식: YY-MM-DD'); return }
    if (typeof fNorm === 'string') setFromDate(fNorm)
    if (typeof tNorm === 'string') setToDate(tNorm)
    // Range check when both present
    if (fNorm && tNorm) {
      const fFull = toFullYear(fNorm)!, tFull = toFullYear(tNorm)!
      if (fFull > tFull) { setToErr('종료일이 시작일보다 빠릅니다'); return }
    }
    setLoading(true)
    setError(null)
    try {
      const url = new URL('/api/v1/orders/external/tsl-order-text', window.location.origin)
      // single page
      url.searchParams.set('company', company)
      if (fNorm) url.searchParams.set('fromDate', fNorm)
      if (tNorm) url.searchParams.set('toDate', tNorm)
      // 거래처명 파라미터 전달 (백엔드에서 필터링)
      const hasCustQuery = custQuery.trim().length > 0
      if (hasCustQuery) {
        url.searchParams.set('custName', custQuery.trim())
      }
      if (scope === 'mine') {
        if (company === 'ALL') {
          if (!hasCustQuery) {
            // ALL + 내수주 + 거래처명 없음 → 각 회사별 emp_seq 전달
            const { tntEmpSeq, dysEmpSeq } = await resolveMyEmpSeqBoth()
            if (tntEmpSeq) url.searchParams.set('tntSalesEmpSeq', tntEmpSeq)
            if (dysEmpSeq) url.searchParams.set('dysSalesEmpSeq', dysEmpSeq)
          }
          // ALL + 거래처명 있음 → emp_seq 전달 안함, custName으로 백엔드 필터링
        } else {
          // TNT 또는 DYS → 해당 회사의 emp_seq 전달
          const seq = await resolveMyEmpSeqForCompany(company)
          if (seq) url.searchParams.set('salesEmpSeq', seq)
        }
      }
      const res = await fetch(url.toString(), { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json().catch(() => [])
      const arr = Array.isArray(data) ? data : []
      // 클라이언트 필터링 제거 - 백엔드에서 custName 필터링 수행
      setRows(arr)
    } catch (e:any) {
      setError(e?.message || '조회 실패')
      setRows([])
    } finally { setLoading(false) }
  }

  // 처음 로딩/회사 변경 시 자동 조회하지 않습니다. 조회 버튼으로만 실행.
  // useEffect(() => { setRows([]); runQuery(true) }, [company])

  // Close context menu on outside click / ESC
  useEffect(() => {
    if (!ctx?.open) return
    const onDoc = (ev: MouseEvent) => {
      const el = ctxRef.current
      if (el && ev.target instanceof Node && !el.contains(ev.target)) setCtx(null)
    }
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') setCtx(null) }
    document.addEventListener('mousedown', onDoc, true)
    window.addEventListener('keydown', onKey, true)
    return () => { document.removeEventListener('mousedown', onDoc, true); window.removeEventListener('keydown', onKey, true) }
  }, [ctx?.open])

  const cols = useMemo(() => {
    if (!rows.length) return [] as string[]
    const first = rows[0]
    return Object.keys(first)
  }, [rows])

  function headerLabel(key: string): string {
    const k = (key || '').toString()
    if (/^OrderTextNo$/i.test(k)) return '수주장번호'
    if (/^OrderTextDate$/i.test(k) || /^OrderTextDat$/i.test(k)) return '주문일자'
    if (/^CustSeq$/i.test(k) || /^CustName$/i.test(k) || /^CustomerName$/i.test(k)) return '거래처명'
    if (/^RegionGroup$/i.test(k) || /^region_group$/i.test(k)) return '지역그룹'
    if (/^SalesEmpSeq$/i.test(k)) return '영업'
    if (/^OrderText$/i.test(k)) return '수주내역'
    if (/^IsCancel$/i.test(k)) return '중단여부'
    if (/^CancelText$/i.test(k)) return '중단사유'
    if (/^Remark$/i.test(k)) return '비고'
    if (/^LastDateTime$/i.test(k)) return '최종수정일시'
    if (/^WHSeq$/i.test(k)) return '창고번호'
    if (/^DelvDate$/i.test(k)) return '납기예정일'
    if (/^CustEmpName$/i.test(k)) return '거래처담당'
    if (/^IsClaim$/i.test(k)) return 'Claim'
    if (/^OrderRemark$/i.test(k)) return '주문요청사항'
    if (/^Request(Date|Dt)$/i.test(k) || /^ReqDate$/i.test(k)) return '요청일자'
    return k
  }

  return (
    <section>
      <div className="page-title" style={{ alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>수주장 조회</h2>

        {/* Company Selection - Left Side */}
        <div style={{ marginLeft: 16, background: '#f3f4f6', padding: 4, borderRadius: 8, display: 'flex', gap: 0 }}>
          <button
            onClick={() => setCompany('ALL')}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              background: company === 'ALL' ? '#fff' : 'transparent',
              color: company === 'ALL' ? '#2563eb' : '#6b7280',
              boxShadow: company === 'ALL' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            ALL
          </button>
          <button
            onClick={() => setCompany('TNT')}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              background: company === 'TNT' ? '#fff' : 'transparent',
              color: company === 'TNT' ? '#2563eb' : '#6b7280',
              boxShadow: company === 'TNT' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            TNT
          </button>
          <button
            onClick={() => setCompany('DYS')}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              background: company === 'DYS' ? '#fff' : 'transparent',
              color: company === 'DYS' ? '#2563eb' : '#6b7280',
              boxShadow: company === 'DYS' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            DYS
          </button>
        </div>

        {/* Filters - Right Side */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
          <select
            className="search-input"
            value={scope}
            onChange={(e) => setScope((e.target.value as any) || 'all')}
            title="조회 범위"
            style={{ minWidth: 110 }}
          >
            <option value="mine">내수주</option>
            <option value="all">전체</option>
          </select>
          <label className="muted">수주일</label>
          <input
            className="search-input"
            placeholder="YY-MM-DD"
            value={fromDate}
            onChange={(e)=> { setFromDate(e.target.value); if (fromErr) setFromErr(null) }}
            onBlur={(e) => { const n = normalizeYyMmDd(e.target.value); if (n===null && e.target.value.trim()) setFromErr('형식: YY-MM-DD'); else if (typeof n==='string') setFromDate(n) }}
            style={{ width: 90 }}
          />
          {fromErr ? (<div className="error" style={{ fontSize: 11 }}>{fromErr}</div>) : null}
          <span className="muted">~</span>
          <input
            className="search-input"
            placeholder="YY-MM-DD"
            value={toDate}
            onChange={(e)=> { setToDate(e.target.value); if (toErr) setToErr(null) }}
            onBlur={(e) => { const n = normalizeYyMmDd(e.target.value); if (n===null && e.target.value.trim()) setToErr('형식: YY-MM-DD'); else if (typeof n==='string') setToDate(n) }}
            style={{ width: 90 }}
          />
          {toErr ? (<div className="error" style={{ fontSize: 11 }}>{toErr}</div>) : null}
          <label className="muted">거래처명</label>
          <input
            className="search-input"
            placeholder="검색어(공백으로 AND)"
            value={custQuery}
            onChange={(e)=> setCustQuery(e.target.value)}
            style={{ width: 200 }}
          />
          <button className="btn btn-card btn-3d" onClick={() => runQuery(true)} disabled={!!fromErr || !!toErr || loading}>조회</button>
        </div>
      </div>
      {error ? (<div className="error">{error}</div>) : null}
      <div className="table-container" style={{ height: 'calc(100vh - 160px)' }}>
        {loading ? (
          <div className="empty-state">불러오는 중…</div>
        ) : rows.length === 0 ? (
          <div className="empty-state">데이터가 없습니다</div>
        ) : (
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                {cols.map((c) => (<th key={c}>{headerLabel(c)}</th>))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                // Determine company type from CompanyType field
                const companyTypeField = Object.keys(r).find(k => k.toLowerCase() === 'companytype')
                const companyTypeValue = companyTypeField ? String(r[companyTypeField] || '').trim().toUpperCase() : ''

                return (
                  <tr
                    key={i}
                    onMouseEnter={(e) => {
                      const x = (e.clientX || 0) + 12
                      const y = (e.clientY || 0) + 12
                      if (!ctx?.open) setHover({ open: true, x, y, rec: r })
                    }}
                    onMouseMove={(e) => {
                      if (!hover?.open) return
                      const x = (e.clientX || 0) + 12
                      const y = (e.clientY || 0) + 12
                      if (!ctx?.open) setHover({ open: true, x, y, rec: r })
                    }}
                    onMouseLeave={() => setHover(null)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      const x = e.clientX, y = e.clientY
                      setCtx({ open: true, x, y, rec: r })
                    }}
                  >
                    {cols.map((c) => {
                      const isCustCol = /^(CustSeq|CustName|CustomerName|customer_name)$/i.test(c) || headerLabel(c) === '거래처명'
                      const cellValue = String(r?.[c] ?? '')

                      // 거래처 컬럼에 회사 아이콘 표시 (백엔드에서 전달된 CompanyType 사용)
                      if (isCustCol && companyTypeValue) {
                        const isTNT = companyTypeValue.includes('TNT')
                        const isDYS = companyTypeValue.includes('DYS')
                        const icon = isTNT ? 'T' : isDYS ? 'D' : ''
                        const iconBg = isTNT ? '#1d4ed8' : isDYS ? '#059669' : '#6b7280'

                        return (
                          <td key={c}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {icon && (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 20,
                                    height: 20,
                                    borderRadius: '50%',
                                    background: iconBg,
                                    color: '#fff',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    flexShrink: 0
                                  }}
                                  title={companyTypeValue}
                                >
                                  {icon}
                                </span>
                              )}
                              <span>{cellValue}</span>
                            </div>
                          </td>
                        )
                      }

                      return <td key={c}>{cellValue}</td>
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {/* Infinite scroll removed: omit end-of-data marker */}
        {/* {!loading && !hasMore && rows.length > 0 ? (
          <div className="empty-state">마지막 데이터입니다.</div>
        ) : null} */}
      </div>
      {hover?.open && !ctx?.open ? (
        <div
          role="dialog"
          aria-live="polite"
          style={{
            position: 'fixed',
            left: Math.min(Math.max(8, hover.x), window.innerWidth - 460),
            top: Math.min(Math.max(8, hover.y), window.innerHeight - 300),
            zIndex: 80,
            pointerEvents: 'none',
          }}
        >
          <div className="card" style={{ background:'var(--panel)', padding: 12, border: '1px solid var(--border)', borderRadius: 8, minWidth: 320, maxWidth: 600, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,.18)' }}>
            <div style={{ display:'flex', flexDirection:'column', gap: 6 }}>
              {cols.map((c) => {
                const value = (hover.rec||{})[c]
                const displayValue = textWithNewlines(value)
                return (
                  <div key={c} style={{ display:'flex', alignItems:'flex-start', gap: 10, paddingBottom: 6, borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ minWidth: 120, fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>{headerLabel(c)}</div>
                    <div style={{ flex: 1, whiteSpace:'pre-wrap', fontSize: 12, wordBreak: 'break-word' }}>
                      {displayValue || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>-</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}

      {ctx?.open ? (() => {
        const left = Math.min(Math.max(8, ctx.x), window.innerWidth - 220)
        const top = Math.min(Math.max(8, ctx.y), window.innerHeight - 120)
        async function copyAll() {
          try {
            // Resolve fields
            const orderKey = cols.find((c) => /^OrderText$/i.test(c)) || cols.find((c) => headerLabel(c) === '수주내역')
            const remarkKey = cols.find((c) => /^OrderRemark$/i.test(c)) || cols.find((c) => headerLabel(c) === '주문요청사항')
            // 거래처명: 우선 '거래처명' 라벨 컬럼, 없으면 흔한 키 + (백엔드가 이름으로 대체하는) CustSeq까지 포함
            const custKey =
              cols.find((c) => headerLabel(c) === '거래처명') ||
              cols.find((c) => /^(CustName|CustomerName|customer_name|CustSeq)$/i.test(c))
            const userKey = cols.find((c) => /^(UserName|CreatedBy|created_by)$/i.test(c))
            const regionKey = cols.find((c) => /^(RegionGroup|region_group)$/i.test(c))

            const companyCode = company
            const customerName = custKey ? String((ctx.rec || {})[custKey] ?? '') : ''
            let createdBy = userKey ? String((ctx.rec || {})[userKey] ?? '') : ''
            let regionGroup = regionKey ? String((ctx.rec || {})[regionKey] ?? '') : ''
            let orderText = orderKey ? textWithNewlines((ctx.rec || {})[orderKey]) : ''
            const orderRemark = remarkKey ? textWithNewlines((ctx.rec || {})[remarkKey]) : ''

            // Fallback for 등록자: '영업' 라벨 컬럼 값 사용
            if (!createdBy) {
              const salesCol = cols.find((c) => headerLabel(c) === '영업')
              if (salesCol) createdBy = String((ctx.rec || {})[salesCol] ?? '')
            }

            // Strip '지역그룹:' or '지역 그룹:' lines from 주문내용 and capture into regionGroup when empty
            if (orderText) {
              const linesRaw = String(orderText).split(/\n/)
              const kept: string[] = []
              for (const ln of linesRaw) {
                const m = ln.match(/^\s*지역\s*그룹\s*[:：]\s*(.*)\s*$/) || ln.match(/^\s*지역그룹\s*[:：]\s*(.*)\s*$/)
                if (m) {
                  const v = (m[1] || '').trim()
                  if (!regionGroup && v) regionGroup = v
                } else {
                  kept.push(ln)
                }
              }
              orderText = kept.join('\n')
            }

            let lines: string[] = []
            lines.push(`회사코드: ${companyCode}`)
            lines.push(`거래처: ${customerName}`)
            lines.push(`등록자: ${createdBy}`)
            lines.push(`지역 그룹: ${regionGroup}`)
            lines.push('주문내용:')
            lines.push(orderText)
            lines.push('요청사항:')
            lines.push(orderRemark)
            let txt = lines.join('\n')
            if (!orderText && !orderRemark) {
              // Fallback if expected keys are unavailable
              txt = JSON.stringify(ctx.rec ?? {}, null, 2)
            }
            if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(txt)
            } else {
              const ta = document.createElement('textarea')
              ta.value = txt
              ta.style.position = 'fixed'; ta.style.left = '-9999px'
              document.body.appendChild(ta)
              ta.focus(); ta.select()
              document.execCommand('copy')
              document.body.removeChild(ta)
            }
            setCopied({ open: true, x: left + 8, y: top + 8 })
            setTimeout(() => setCopied(null), 1200)
          } catch {}
          setCtx(null)
        }
        async function sendToSlack() {
          try {
            // Build same content as copy
            const orderKey = cols.find((c) => /^OrderText$/i.test(c)) || cols.find((c) => headerLabel(c) === '수주내역')
            const remarkKey = cols.find((c) => /^OrderRemark$/i.test(c)) || cols.find((c) => headerLabel(c) === '주문요청사항')
            const custKey =
              cols.find((c) => headerLabel(c) === '거래처명') ||
              cols.find((c) => /^(CustName|CustomerName|customer_name|CustSeq)$/i.test(c))
            const orderNoKey =
              cols.find((c) => headerLabel(c) === '수주장번호') ||
              cols.find((c) => /^OrderTextNo$/i.test(c))
            const requestKeys = [
              cols.find((c) => headerLabel(c) === '요청일자'),
              cols.find((c) => /^Request(Date|Dt)$/i.test(c)),
              cols.find((c) => /^DelvDate$/i.test(c)),
              cols.find((c) => /^OrderTextDate$/i.test(c)),
            ].filter(Boolean) as string[]

            let createdBy = ''
            const userKey = cols.find((c) => /^(UserName|CreatedBy|created_by)$/i.test(c))
            if (userKey) createdBy = String((ctx.rec || {})[userKey] ?? '')
            if (!createdBy) {
              const salesCol = cols.find((c) => headerLabel(c) === '영업')
              if (salesCol) createdBy = String((ctx.rec || {})[salesCol] ?? '')
            }
            let regionGroup = ''
            const regionKey = cols.find((c) => /^(RegionGroup|region_group)$/i.test(c))
            if (regionKey) regionGroup = String((ctx.rec || {})[regionKey] ?? '')
            let orderText = orderKey ? textWithNewlines((ctx.rec || {})[orderKey]) : ''
            const orderRemark = remarkKey ? textWithNewlines((ctx.rec || {})[remarkKey]) : ''
            if (orderText) {
              const linesRaw = String(orderText).split(/\n/)
              const kept: string[] = []
              for (const ln of linesRaw) {
                const m = ln.match(/^\s*지역\s*그룹\s*[:：]\s*(.*)\s*$/) || ln.match(/^\s*지역그룹\s*[:：]\s*(.*)\s*$/)
                if (m) {
                  const v = (m[1] || '').trim()
                  if (!regionGroup && v) regionGroup = v
                } else {
                  kept.push(ln)
                }
              }
              orderText = kept.join('\n')
            }
            const orderNoVal = orderNoKey ? String((ctx.rec || {})[orderNoKey] ?? '').trim() : ''
            let requestDateVal = ''
            for (const key of requestKeys) {
              const value = key ? String((ctx.rec || {})[key] ?? '').trim() : ''
              if (value) { requestDateVal = formatRequestDateDisplay(value); break }
            }
            const payload = {
              orderNo: orderNoVal,
              companyCode: company,
              customerName: custKey ? String((ctx.rec || {})[custKey] ?? '') : '',
              createdBy,
              regionGroup,
              orderText,
              orderRemark,
              requestDate: requestDateVal,
            }
            const response = await fetch('/api/v1/slack/send-order-copy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
            const result = await response.json().catch(()=> ({} as any))
            if (response.ok && result.success) {
              setCopied({ open: true, x: left + 8, y: top + 8, message: 'Slack 전송 완료' })
              setTimeout(() => setCopied(null), 1500)
            } else {
              alert(result.message || `Slack 전송 실패 (HTTP ${response.status})`)
            }
          } catch (e: any) {
            console.error('Slack 전송 실패:', e)
            alert('Slack 전송 중 오류가 발생했습니다.')
          }
          setCtx(null)
        }
        return (
          <div
            ref={ctxRef}
            role="menu"
            style={{ position:'fixed', left, top, zIndex: 90, minWidth: 180 }}
          >
            <div className="card" style={{ background:'var(--panel)', padding: 4, border:'1px solid var(--border)', borderRadius: 8, boxShadow:'0 8px 24px rgba(0,0,0,.18)', display:'flex', flexDirection:'column', gap: 2, fontSize: 13 }}>
              <button className="btn-plain" style={{ width: '100%', textAlign: 'left', padding: '4px 6px', fontSize: 13 }} onClick={sendToSlack}>
                Slack전송
              </button>
              <button className="btn-plain" style={{ width: '100%', textAlign: 'left', padding: '4px 6px', fontSize: 13 }} onClick={copyAll}>
                복사
              </button>
            </div>
          </div>
        )
      })() : null}

      {copied?.open ? (
        <div style={{ position:'fixed', left: copied.x, top: copied.y, zIndex: 95 }}>
          <div className="card" style={{ background:'var(--panel)', padding:'2px 6px', border:'1px solid var(--border)', borderRadius: 6, fontSize: 11 }}>
            {copied.message || '복사했습니다'}
          </div>
        </div>
      ) : null}

    </section>
  )
}
