import React, { useEffect, useState } from 'react'
import closeIcon from '../../assets/icons/close.svg'
import docIcon from '../../assets/icons/doc.svg'
import warehouseIcon from '../../assets/icons/warehouse.svg'

type Props = {
  data?: {
    orderNo?: string
    companyCode?: string
    customer?: string
    createdBy?: string
    regionGroup?: string
    orderContent?: string
    requests?: string
    deliveryPlace?: string
    manager?: string
    deliveryDueDate?: string
  }
}

export function OrderSheetRightPanel({ data }: Props) {
  const [cust, setCust] = useState<any>(null)
  const [cart, setCart] = useState<Array<{ itemSeq: any; itemName: string; itemSpec?: string; qty: number | ''; itemStdUnit?: string; companyType?: string | null }>>([])
  const [availMap, setAvailMap] = useState<Record<string, { rows:Array<{ whName:string; avail:number; unitName:string }>; total:number; unitName:string }>>({})
  const [regionGroup, setRegionGroup] = useState<string>('')
  const [requests, setRequests] = useState<string>('')
  const [deliveryDueDate, setDeliveryDueDate] = useState<string>(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 10)
  })
  const empName = (() => { try { return localStorage.getItem('tnt.sales.empName') || localStorage.getItem('tnt.sales.empId') || '' } catch { return '' } })()
  const assigneeId = (() => { try { return localStorage.getItem('tnt.sales.assigneeId') || '' } catch { return '' } })()
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ open:boolean; text:string }>(()=>({ open:false, text:'' }))
  const [debugPayload, setDebugPayload] = useState<any | null>(null)
  const debugMode = false
  const [lastSent, setLastSent] = useState<string>('')
  const [lastReceived, setLastReceived] = useState<string>('')
  const [orderNo, setOrderNo] = useState<string>('')
  // order preview modal removed
  

  async function resolveSalesEmpSeq(companyCode: string): Promise<string> {
    const aid = assigneeId || ''
    const empId = (() => { try { return localStorage.getItem('tnt.sales.empId') || '' } catch { return '' } })()
    if (!aid && !empId) {
      // local fallback chain
      const localSeq = (() => { try { return localStorage.getItem('tnt.sales.empSeq') || '' } catch { return '' } })()
      return localSeq || '4'
    }
    try {
      const p = new URLSearchParams()
      if (aid) p.set('assigneeId', aid)
      if (empId) p.set('empId', empId)
      if (companyCode) p.set('companyCode', companyCode)
      const rs = await fetch(`/api/v1/employee/by-assignee?${p.toString()}`, { cache: 'no-store' })
      if (!rs.ok) {
        const localSeq = (() => { try { return localStorage.getItem('tnt.sales.empSeq') || '' } catch { return '' } })()
        return localSeq || '4'
      }
      const j = await rs.json().catch(()=>null as any)
      const v = j?.resolvedSalesEmpSeq ?? (companyCode?.toUpperCase()==='DYS' ? j?.dys_emp_seq : j?.tnt_emp_seq)
      const out = (v!=null && String(v)) ? String(v) : ''
      if (out) return out
      const localSeq = (() => { try { return localStorage.getItem('tnt.sales.empSeq') || '' } catch { return '' } })()
      return localSeq || '4'
    } catch {
      const localSeq = (() => { try { return localStorage.getItem('tnt.sales.empSeq') || '' } catch { return '' } })()
      return localSeq || '4'
    }
  }

  function buildPayload(opts?: { salesEmpSeq?: string }) {
    const d = data || {}
    const today = new Date(); const y = today.getFullYear(); const m = String(today.getMonth()+1).padStart(2,'0'); const dd = String(today.getDate()).padStart(2,'0')
    const todayYmd = `${y}${m}${dd}`
    const orderTextNo = `A${todayYmd}`
    // Build OrderText: one line per item (품목 - 수량 Unit). 요청 사항은 OrderRemark로 분리하여 전송.
    const orderTextItems = (cart||[]).map(it => {
      const qty = (Number(it.qty) || 0).toFixed(2)
      const unit = it.itemStdUnit ? ` ${it.itemStdUnit}` : ''
      return `${it.itemName}${it.itemSpec?` ${it.itemSpec}`:''} - ${qty}${unit}`
    }).join('\n')
    const orderText = orderTextItems
    const custEmpName = String(d.manager || cust?.ownerName || '')
    const companyCode = (cust?.companyCode || d.companyCode || 'TNT')
    const salesEmpSeqFinal = (opts?.salesEmpSeq && String(opts.salesEmpSeq)) || (() => { try { const v = localStorage.getItem('tnt.sales.empSeq'); return v ? String(v) : '' } catch { return '' } })()
    const cc = String(companyCode || 'TNT').toUpperCase()
    const certId = cc === 'DYS' ? 'DYS_CRM' : 'TNT_CRM'
    const dsnVal = cc === 'DYS' ? 'dys_bis' : 'tnt_bis'
    const dsnOperVal = cc === 'DYS' ? 'dys_oper' : 'tnt_oper'
    const dsnBisVal = dsnVal
    return {
      payload: {
        ROOT: {
          certId,
          certKey: '9836164F-3601-4DBB-9D6D-54685CD89B95',
          dsn: dsnVal,
          dsnOper: dsnOperVal,
          dsnBis: dsnBisVal,
          companySeq: '1',
          languageSeq: 1,
          securityType: 0,
          userId: empName || '',
          data: {
            ROOT: {
              DataBlock1: [
                {
                  WorkingTag: 'A', IDX_NO: 0, Status: '0', DataSeq: 1, Selected: 1,
                  TABLE_NAME: '', UserName: empName || '',
                  OrderTextNo: orderTextNo,
                  StdDate: todayYmd,
                  CustSeq: (cust?.customerSeq != null ? String(cust.customerSeq) : ''),
                  SalesEmpSeq: salesEmpSeqFinal,
                  CustEmpName: custEmpName,
                  WHSeq: '',
                  DelvDate: (deliveryDueDate||'').replaceAll('-', ''),
                  OrderText: orderText,
                  OrderRemark: requests || '',
                }
              ]
            }
          }
        }
      },
      orderText,
    }
  }
  useEffect(() => {
    const onSel = (e: any) => {
      const c = e?.detail?.customer ?? null
      setCust(c)
      if (c) {
        const province = c.addrProvinceName ?? c.addr_province_name ?? ''
        const city = c.addrCityName ?? c.addr_city_name ?? ''
        const rg = [province, city].filter((s: string) => !!s && String(s).trim().length > 0).join(' ')
        if (rg) setRegionGroup(String(rg))
        // Clear order sheet transient fields on customer change
        try { setOrderNo('') } catch {}
        try { setRequests('') } catch {}
        try { setCart([]); setAvailMap({}) } catch {}
        try {
          localStorage.setItem('tnt.sales.ordersheet.cart', JSON.stringify([]))
          window.dispatchEvent(new CustomEvent('tnt.sales.ordersheet.cart.changed', { detail: { cart: [] } }) as any)
        } catch {}
        try { localStorage.removeItem('tnt.sales.ordersheet.requests') } catch {}
      }
    }
    window.addEventListener('tnt.sales.ordersheet.customer.selected' as any, onSel)
    const onCart = (e: any) => {
      setCart(Array.isArray(e?.detail?.cart) ? e.detail.cart : [])
    }
    window.addEventListener('tnt.sales.ordersheet.cart.changed' as any, onCart)
    return () => {
      window.removeEventListener('tnt.sales.ordersheet.customer.selected' as any, onSel)
      window.removeEventListener('tnt.sales.ordersheet.cart.changed' as any, onCart)
    }
  }, [])
  const d = data || {}
  function extractAvailRows(jsonText: string): Array<{ whName:string; avail:number; unitName:string }> {
    try {
      const obj = JSON.parse(jsonText)
      const q:any[] = [obj]
      let arr:any[]|null = null
      while (q.length) {
        const cur = q.shift()
        if (Array.isArray(cur)) { if (cur.length && typeof cur[0] === 'object') { arr = cur; break } }
        else if (cur && typeof cur === 'object') for (const k of Object.keys(cur)) q.push(cur[k])
      }
      if (!arr) return []
      return arr.map((r:any) => {
        const wh = r?.WHName ?? r?.whName ?? r?.warehouseName ?? r?.WH_NM ?? r?.wh_nm ?? ''
        const avail = Number(r?.AvailStock ?? r?.availStock ?? r?.AVAIL_STOCK ?? r?.qty ?? 0) || 0
        const unit = r?.UnitName ?? r?.unitName ?? r?.UNIT_NAME ?? r?.salesMgmtUnit ?? ''
        return { whName: String(wh||''), avail, unitName: String(unit||'') }
      })
    } catch { return [] }
  }
  return (
    <div className="card" style={{ padding: 12, height: '100%', overflow: 'auto', background: 'var(--sheet-bg)', marginTop: 3 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <img src={docIcon} className="icon" alt="수주장" />
        <strong>수주장</strong>
      </div>

      {/* Top fields (restored) */}
      <div className="field inline-field"><label>수주장번호</label>
        <div className="subject-input" style={{ padding: '6px 8px' }}>{orderNo || d.orderNo || '-'}</div>
      </div>
      <div className="field inline-field"><label>회사코드</label>
        <div className="subject-input" style={{ padding: '6px 8px' }}>{(cust?.companyCode || d.companyCode || 'TNT')}</div>
      </div>
      <div className="field inline-field"><label>거래처</label>
        <div className="subject-input" style={{ padding: '6px 8px' }}>{d.customer || cust?.customerName || '-'}</div>
      </div>
      <div className="field inline-field"><label>등록자</label>
        <div className="subject-input" style={{ padding: '6px 8px' }}>{empName || '-'}</div>
      </div>
      <div className="field inline-field" style={{ marginBottom: 8 }}><label>지역 그룹</label>
        <input
          className="search-input"
          type="text"
          value={regionGroup}
          onChange={(e) => { setRegionGroup(e.target.value) }}
          placeholder="지역 그룹"
        />
      </div>
      <div className="field inline-field row-2" style={{ marginTop: 4 }}><label>요청 사항</label>
        <textarea
          className="search-input"
          value={requests}
          onChange={(e) => { setRequests(e.target.value) }}
          placeholder="요청 사항"
          style={{ minHeight: 80 }}
        />
      </div>
      <div className="field inline-field"><label>담당자</label>
        <div className="subject-input" style={{ padding: '6px 8px' }}>{d.manager || cust?.ownerName || '-'}</div>
      </div>
      <div className="field inline-field"><label>납품요청일</label>
        <input
          className="search-input"
          type="date"
          value={deliveryDueDate}
          onChange={(e) => { setDeliveryDueDate(e.target.value) }}
        />
      </div>

      {/* Order list + Order button (width aligned to sheet) */}
      <div style={{ fontSize: 12 }}>
        <div style={{ width: '100%', maxWidth: 820, margin: '0 auto' }}>
          <div className="table-container" style={{ maxHeight: '45vh', minHeight: '36vh', marginTop: 8 }}>
          {(!cart || cart.length === 0) ? (
            <div className="empty-state">담긴 품목이 없습니다</div>
          ) : (
            <table className="table" style={{ width: '100%' }}>
              <colgroup>
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th>품목</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((it, idx) => (
                  <tr
                    key={String(it.itemSeq)}
                    onDoubleClick={() => {
                      const next = cart.filter((_, i) => i !== idx)
                      setCart(next)
                      try {
                        localStorage.setItem('tnt.sales.ordersheet.cart', JSON.stringify(next))
                        window.dispatchEvent(new CustomEvent('tnt.sales.ordersheet.cart.changed', { detail: { cart: next } }) as any)
                      } catch {}
                    }}
                    title="더블클릭하면 목록에서 제외됩니다"
                    style={{ height: 48 }}
                  >
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                        <div style={{ fontWeight: 400, flex: 1 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            {(() => {
                              const ct = (it as any).companyType || (it as any).company_type || (selectedCustomer?.companyType) || (selectedCustomer?.companyCode)
                              const k = (ct || '').toString().toUpperCase()
                              const label = k === 'TNT' ? 'T' : k === 'DYS' ? 'D' : k === 'ALL' ? 'A' : ''
                              const color = k === 'TNT' ? '#2563eb' : k === 'DYS' ? '#10b981' : k === 'ALL' ? '#f59e0b' : '#9ca3af'
                              return label ? (
                                <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:18, height:18, borderRadius:'50%', background: color, color:'#fff', fontSize:11, fontWeight:800, boxShadow:'0 0 0 1px rgba(0,0,0,.08)' }}>
                                  {label}
                                </span>
                              ) : null
                            })()}
                            <span>{it.itemName}</span>
                            {it.itemStdUnit ? (<span style={{ fontSize:11, color:'var(--text-muted)' }}>({it.itemStdUnit})</span>) : null}
                          </div>
                        </div>
                        <input
                          className="search-input"
                          type="number"
                          min={0}
                          step="0.01"
                          value={it.qty === '' ? '' : String(it.qty)}
                          placeholder=""
                          onChange={(e) => {
                            const val = e.target.value
                            const next = cart.slice()
                            if (val === '') {
                              next[idx] = { ...next[idx], qty: '' as any }
                            } else {
                              const v = Number(val)
                              if (!isFinite(v) || v < 0) {
                                next[idx] = { ...next[idx], qty: '' as any }
                              } else {
                                // Limit to 2 decimal places
                                const limited = Math.floor(v * 100) / 100
                                next[idx] = { ...next[idx], qty: limited }
                              }
                            }
                            setCart(next)
                            try {
                              localStorage.setItem('tnt.sales.ordersheet.cart', JSON.stringify(next))
                              window.dispatchEvent(new CustomEvent('tnt.sales.ordersheet.cart.changed', { detail: { cart: next } }) as any)
                            } catch {}
                          }}
                          style={{ minWidth: 120, textAlign: 'right' }}
                        />
                        {it.itemStdUnit ? <span style={{ fontSize:12, color:'var(--text-muted)' }}>{it.itemStdUnit}</span> : null}
                        <span
                          role="button"
                          tabIndex={0}
                          className="icon-button"
                          aria-label="재고 조회"
                          title="재고 조회"
                          onClick={async () => {
                            try {
                              const body = {
                                bizUnit: '', stdDate: '', whSeq: '',
                                itemName: String(it.itemName||''), itemNo: '', itemSeq: String(it.itemSeq||''), pageNo: '', pageSize: ''
                              }
                              const rs = await fetch('/api/v1/items/avail-stock', { method:'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                              if (rs.ok) {
                                const resp = await rs.json().catch(()=> ({} as any))
                                const received = (resp && (resp.receivedPayload || resp))
                                const j = JSON.stringify(received, null, 2)
                                const rows = extractAvailRows(j)
                                const total = rows.reduce((s,r)=> s + (Number(r.avail)||0), 0)
                                const unit = rows.find(r=> (r.unitName||'').trim().length>0)?.unitName || ''
                                setAvailMap(prev => ({ ...prev, [String(it.itemSeq)]: { rows, total, unitName: unit } }))
                              }
                            } catch {}
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (async () => {
                            try {
                              const body = { bizUnit:'', stdDate:'', whSeq:'', itemName:String(it.itemName||''), itemNo:'', itemSeq:String(it.itemSeq||''), pageNo:'', pageSize:'' }
                              const rs = await fetch('/api/v1/items/avail-stock', { method:'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                              if (rs.ok) {
                                const resp = await rs.json().catch(()=> ({} as any))
                                const received = (resp && (resp.receivedPayload || resp))
                                const j = JSON.stringify(received, null, 2)
                                const rows = extractAvailRows(j)
                                const total = rows.reduce((s,r)=> s + (Number(r.avail)||0), 0)
                                const unit = rows.find(r=> (r.unitName||'').trim().length>0)?.unitName || ''
                                setAvailMap(prev => ({ ...prev, [String(it.itemSeq)]: { rows, total, unitName: unit } }))
                              }
                            } catch {}
                          })() } }}
                        >
                          <img src={warehouseIcon} className="icon" alt="재고" />
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          className="icon-button"
                          aria-label="담기 취소"
                          title="담기 취소"
                          onClick={() => {
                            const next = cart.filter((_, i) => i !== idx)
                            setCart(next)
                            try {
                              localStorage.setItem('tnt.sales.ordersheet.cart', JSON.stringify(next))
                              window.dispatchEvent(new CustomEvent('tnt.sales.ordersheet.cart.changed', { detail: { cart: next } }) as any)
                            } catch {}
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const next = cart.filter((_, i) => i !== idx); setCart(next); try { localStorage.setItem('tnt.sales.ordersheet.cart', JSON.stringify(next)); window.dispatchEvent(new CustomEvent('tnt.sales.ordersheet.cart.changed', { detail: { cart: next } }) as any) } catch {} } }}
                        >
                          <img src={closeIcon} className="icon" alt="취소" />
                        </span>
                      </div>
                      {/* 품목명 아래의 수량/단위 텍스트 제거 */}
                      {(() => {
                        const info = availMap[String(it.itemSeq)]
                        if (!info || !info.rows.length) return null
                        return (
                          <div style={{ marginTop: 6 }}>
                            <div className="table-container" style={{ maxHeight: 120, overflow: 'auto', border: 0 }}>
                              <table className="table" style={{ width:'100%', fontSize: 11 }}>
                                <thead>
                                  <tr>
                                    <th>창고명</th>
                                    <th style={{ width: 100, textAlign:'right' }}>가용재고</th>
                                    <th style={{ width: 120 }}>단위</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {info.rows.map((r, i2) => (
                                    <tr key={i2}>
                                      <td>{r.whName||'-'}</td>
                                      <td style={{ textAlign:'right' }}>{Number(r.avail||0).toLocaleString()}</td>
                                      <td>{r.unitName||info.unitName||''}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          </div>
          <div className="controls" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
            <button
              className="btn btn-card btn-3d"
              disabled={saving || !cart || cart.length===0 || !cust}
              onClick={async () => {
                setSaving(true)
                try {
                  const company = String(cust?.companyCode || d.companyCode || 'TNT')
                  const seq = await resolveSalesEmpSeq(company)
                  const { payload } = buildPayload({ salesEmpSeq: seq })
                  const headers: Record<string,string> = { 'Content-Type': 'application/json' }
                  if (assigneeId) headers['X-ASSIGNEE-ID'] = String(assigneeId)
                  const body: any = {
                    companyCode: company,
                    customerSeq: (cust?.customerSeq != null ? String(cust.customerSeq) : ''),
                    customerName: String(d.customer || cust?.customerName || ''),
                    assigneeId: assigneeId || '',
                    regionGroup,
                    requests,
                    deliveryDueDate,
                    createdBy: empName || '',
                    custEmpName: String(d.manager || cust?.ownerName || ''),
                    salesEmpSeq: seq || undefined,
                    items: (cart||[]).map(it => ({
                      itemSeq: String(it.itemSeq||''),
                      itemName: it.itemName,
                      itemSpec: it.itemSpec||'',
                      qty: Number(it.qty)||0,
                      itemStdUnit: it.itemStdUnit || undefined,
                      companyType: it.companyType || undefined
                    })),
                  }
                  const url = debugMode ? '/api/v1/orders?debug=true' : '/api/v1/orders'
                  if (debugMode) headers['X-ERP-DEBUG'] = 'true'
                  const rs = await fetch(url, { method:'POST', headers, body: JSON.stringify(body) })
                  const resp = await rs.json().catch(()=> ({} as any))
                  try { setLastSent(JSON.stringify(body, null, 2)) } catch {}
                  try { setLastReceived(JSON.stringify(resp, null, 2)) } catch {}
                  if (!rs.ok) throw new Error(resp?.error || `HTTP ${rs.status}`)
                  if (resp?.debug) {
                    setDebugPayload(resp.debugPayload)
                    setNotice({ open:true, text:'디버그 모드: ERP·Slack 전송은 중단되었습니다.' })
                    return
                  }
                  setOrderNo(String(resp?.orderTextNo || resp?.sendPayload?.ROOT?.data?.ROOT?.DataBlock1?.[0]?.OrderTextNo || ''))
                  setNotice({ open:true, text:'주문 전송 완료' })
                } catch (e:any) {
                  setNotice({ open:true, text: e?.message || '주문 전송 중 오류가 발생했습니다' })
                } finally { setSaving(false) }
              }}
            >
              주문
            </button>
          </div>
          {/* 외부 가용재고 표 제거됨 */}
        </div>
      </div>
      
      {notice.open ? (
        <div role="dialog" aria-modal="true" className="card" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 70 }}>
          <div className="card" style={{ background:'var(--panel)', padding: 12, border: '1px solid var(--border)', borderRadius: 10, minWidth: 260, maxWidth: '86vw' }}>
            <div style={{ marginBottom: 8, fontWeight: 700, textAlign:'center' }}>{notice.text}</div>
            <div style={{ display:'flex', justifyContent:'center', gap:8 }}>
              <button className="btn btn-card btn-3d" onClick={()=> setNotice({ open:false, text:'' })}>확인</button>
            </div>
          </div>
        </div>
      ) : null}

      {debugPayload ? (
        <div role="dialog" aria-modal="true" className="card" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.65)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 80 }}>
          <div className="card" style={{ background:'var(--panel)', padding: 16, border: '1px solid var(--border)', borderRadius: 12, minWidth: 'min(90vw, 640px)', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ marginBottom: 12, fontWeight: 700 }}>디버그: 전송 직전 payload</div>
            <div style={{ fontSize:12, marginBottom:16, whiteSpace:'pre-wrap', fontFamily:'monospace', maxHeight: '55vh', overflow:'auto', border:'1px dashed var(--border)', padding:8, background:'var(--panel-2)' }}>
              {JSON.stringify(debugPayload, null, 2)}
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button className="btn btn-card btn-3d" onClick={() => setDebugPayload(null)}>닫기</button>
            </div>
          </div>
        </div>
      ) : null}

      
    </div>
  )
}
