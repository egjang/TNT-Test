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
  const [cart, setCart] = useState<Array<{ itemSeq: any; itemName: string; itemSpec?: string; qty: number | ''; itemStdUnit?: string | null; companyType?: string | null }>>([])
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
  const [lastSent, setLastSent] = useState<string>('')
  const [lastReceived, setLastReceived] = useState<string>('')
  const [orderNo, setOrderNo] = useState<string>('')

  async function resolveSalesEmpSeq(companyCode: string): Promise<string> {
    const aid = assigneeId || ''
    const empId = (() => { try { return localStorage.getItem('tnt.sales.empId') || '' } catch { return '' } })()
    if (!aid && !empId) {
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
  useEffect(() => {
    const onSel = (e: any) => {
      const c = e?.detail?.customer ?? null
      setCust(c)
      if (c) {
        const province = c.addrProvinceName ?? c.addr_province_name ?? ''
        const city = c.addrCityName ?? c.addr_city_name ?? ''
        const rg = [province, city].filter((s: string) => !!s && String(s).trim().length > 0).join(' ')
        if (rg) setRegionGroup(String(rg))
      }
    }
    window.addEventListener('tnt.sales.ordersheet.customer.selected' as any, onSel)
    const onCart = (e: any) => {
      setCart(Array.isArray(e?.detail?.cart) ? e.detail.cart : [])
    }
    window.addEventListener('tnt.sales.ordersheet.cart.changed' as any, onCart)
    const onPrefetched = (e: any) => {
      try {
        const itemSeq = String(e?.detail?.itemSeq || '')
        const rows = Array.isArray(e?.detail?.rows) ? e.detail.rows : []
        const total = rows.reduce((s: number, r: any) => s + (Number(r?.avail||0) || 0), 0)
        const unit = rows.find((r: any) => (r?.unitName||'').trim().length>0)?.unitName || ''
        if (itemSeq) setAvailMap(prev => ({ ...prev, [itemSeq]: { rows, total, unitName: unit } }))
      } catch {}
    }
    window.addEventListener('tnt.sales.ordersheet.availstock.prefetched' as any, onPrefetched)
    return () => {
      window.removeEventListener('tnt.sales.ordersheet.customer.selected' as any, onSel)
      window.removeEventListener('tnt.sales.ordersheet.cart.changed' as any, onCart)
      window.removeEventListener('tnt.sales.ordersheet.availstock.prefetched' as any, onPrefetched)
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
    <div className="card order-form" style={{ padding: 12, height: '100%', overflow: 'auto', background: 'var(--sheet-bg)', marginTop: 3 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <img src={docIcon} className="icon" alt="수주장" />
        <strong>수주장</strong>
      </div>

      {/* 선택 품목 목록 (우측 수주장 상단에 배치) */}
      <div className="table-container" style={{ maxHeight: '45vh', minHeight: '24vh', marginBottom: 10 }}>
        {(!cart || cart.length === 0) ? null : (
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
                        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                          {(() => {
                            const ct = (it as any).companyType || (it as any).company_type || (cust?.companyType) || (cust?.companyCode)
                            const k = (ct || '').toString().toUpperCase()
                            const label = k === 'TNT' ? 'T' : (k === 'DYS' || k === 'DSY') ? 'D' : k === 'ALL' ? 'A' : ''
                            const color = k === 'TNT' ? '#2563eb' : (k === 'DYS' || k === 'DSY') ? '#10b981' : k === 'ALL' ? '#f59e0b' : '#9ca3af'
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
                            next[idx] = { ...next[idx], qty: (isFinite(v) && v >= 0) ? v : '' as any }
                          }
                          setCart(next)
                          try {
                            localStorage.setItem('tnt.sales.ordersheet.cart', JSON.stringify(next))
                            window.dispatchEvent(new CustomEvent('tnt.sales.ordersheet.cart.changed', { detail: { cart: next } }) as any)
                          } catch {}
                        }}
                        style={{ minWidth: 120, textAlign: 'right' }}
                      />
                      <span
                        role="button"
                        tabIndex={0}
                        className="icon-button"
                        aria-label="재고 조회"
                        title="재고 조회"
                        onClick={async () => {
                          try {
                            const key = String(it.itemSeq)
                            if (availMap[key]) { setAvailMap(prev => { const n = { ...prev }; delete (n as any)[key]; return n }); return }
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
                            const key = String(it.itemSeq)
                            if (availMap[key]) { setAvailMap(prev => { const n = { ...prev }; delete (n as any)[key]; return n }); return }
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
                        {(() => {
                          const info = availMap[String(it.itemSeq)]
                          const noStock = !!info && Array.isArray(info.rows) && info.rows.length === 0
                          const redFilter = 'invert(23%) sepia(92%) saturate(6579%) hue-rotate(357deg) brightness(91%) contrast(118%)'
                          return (
                            <img
                              src={warehouseIcon}
                              className="icon"
                              alt={noStock ? '재고 없음' : '재고'}
                              title={noStock ? '재고 없음' : '재고 조회'}
                              style={noStock ? ({ filter: redFilter } as React.CSSProperties) : undefined}
                            />
                          )
                        })()}
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
                    {(() => {
                      const info = availMap[String(it.itemSeq)]
                      if (!info) return null
                      if (!info.rows.length) return (
                        <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>재고 없음</div>
                      )
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

      {/* Top fields (restored) */}
      <div className="field inline-field"><label>수주장번호</label>
        <div className="subject-input" style={{ padding: '6px 8px' }}>{orderNo || d.orderNo || '-'}</div>
      </div>
      <div className="field inline-field"><label>회사코드</label>
        <div className="subject-input" style={{ padding: '6px 8px' }}>{(d.companyCode || cust?.companyCode || '-')}</div>
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

      <div className="controls" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
        <button
          className="btn btn-card btn-3d"
          disabled={saving || !cart || cart.length===0 || !cust}
          onClick={async () => {
            setSaving(true)
            try {
              const company = String(cust?.companyCode || d.companyCode || 'TNT')
              const seq = await resolveSalesEmpSeq(company)
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
              try { setLastSent(JSON.stringify(body, null, 2)) } catch {}
              const rs = await fetch('/api/v1/orders', { method:'POST', headers, body: JSON.stringify(body) })
              const resp = await rs.json().catch(()=> ({} as any))
              try { setLastReceived(JSON.stringify(resp, null, 2)) } catch {}
              if (!rs.ok) throw new Error(resp?.error || `HTTP ${rs.status}`)
              setOrderNo(String(resp?.orderTextNo || resp?.sendPayload?.ROOT?.data?.ROOT?.DataBlock1?.[0]?.OrderTextNo || ''))
              setNotice({ open:true, text:'주문 전송 완료' })
            } catch (e:any) {
              setNotice({ open:true, text: e?.message || '주문 전송 중 오류가 발생했습니다' })
            } finally { setSaving(false) }
          }}
        >
          {saving ? '주문 중…' : '주문'}
        </button>
      </div>
          {/* 외부 가용재고 표 제거됨 */}
      
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

      {/* debug preview removed for production send */}
    </div>
  )
}
