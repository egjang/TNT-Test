import React, { useEffect, useRef, useState } from 'react'

type Row = { customerSeq: any; customerName: string; prevAmount: number }

export function ChurnRightPanel() {
  const [items, setItems] = useState<Row[]>([])
  const [title, setTitle] = useState('이탈거래처')
  const [amountKey, setAmountKey] = useState<'prevAmount' | 'curAmount'>('prevAmount')
  const [menu, setMenu] = useState<{ open: boolean; x: number; y: number; row: Row | null }>({ open: false, x: 0, y: 0, row: null })
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onShow = (e: any) => {
      const arr = Array.isArray(e?.detail?.items) ? e.detail.items : []
      setItems(arr)
      setTitle('이탈거래처')
      setAmountKey('prevAmount')
    }
    const onNew = (e: any) => {
      const arr = Array.isArray(e?.detail?.items) ? e.detail.items : []
      setItems(arr)
      setTitle('신규 거래처')
      setAmountKey('curAmount')
    }
    window.addEventListener('tnt.sales.dashboard.churn' as any, onShow)
    window.addEventListener('tnt.sales.dashboard.newcustomers' as any, onNew)
    return () => {
      window.removeEventListener('tnt.sales.dashboard.churn' as any, onShow)
      window.removeEventListener('tnt.sales.dashboard.newcustomers' as any, onNew)
    }
  }, [])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!menu.open) return
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenu({ open: false, x: 0, y: 0, row: null })
      }
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu({ open: false, x: 0, y: 0, row: null }) }
    document.addEventListener('click', close, true)
    document.addEventListener('contextmenu', close, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('click', close, true)
      document.removeEventListener('contextmenu', close, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [menu.open])

  const fmt = (v: number) => new Intl.NumberFormat('ko-KR').format(Math.round(v || 0))

  return (
    <div ref={rootRef} className="card" style={{ padding: 12, height: '100%', overflow: 'auto', position: 'relative' }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {(!items || items.length === 0) ? (
        <div className="empty-state">데이터가 없습니다</div>
      ) : (
        <div className="table-container" style={{ maxHeight: '70vh' }}>
          <table className="table">
            <thead>
              <tr>
                <th>거래처명</th>
                <th style={{ width: 160, textAlign: 'right' }}>{amountKey === 'prevAmount' ? '작년매출' : '올해매출'}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr
                  key={idx}
                  onClick={() => {
                    try {
                      const sel = { customerSeq: it.customerSeq, customerName: it.customerName }
                      localStorage.setItem('tnt.sales.selectedCustomer', JSON.stringify(sel))
                      window.dispatchEvent(new CustomEvent('tnt.sales.customer.selected', { detail: { source: 'dashboard-churn', customer: sel } }) as any)
                    } catch {}
                    const btn = document.querySelector('button[data-key="customer:sales-activity-new"]') as HTMLButtonElement | null
                    if (btn) btn.click()
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setMenu({ open: true, x: e.clientX, y: e.clientY, row: it })
                  }}
                  style={{ cursor: 'pointer' }}
                  title="클릭하면 영업활동 등록으로 이동"
                >
                  <td>{it.customerName || ''}</td>
                  <td style={{ textAlign: 'right' }}>{fmt((it as any)[amountKey] as any)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {menu.open && menu.row && (
        <div
          role="menu"
          style={{ position: 'fixed', left: menu.x, top: menu.y, zIndex: 9999, background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 10px 24px rgba(0,0,0,.2)' }}
        >
          <button
            role="menuitem"
            className="btn"
            style={{ display: 'block', width: '100%', padding: '8px 12px', background: 'transparent', color: 'inherit', border: 'none', borderRadius: 8 }}
            onClick={() => {
              const it = menu.row!
              try {
                const sel = { customerSeq: it.customerSeq, customerName: it.customerName }
                localStorage.setItem('tnt.sales.selectedCustomer', JSON.stringify(sel))
                window.dispatchEvent(new CustomEvent('tnt.sales.customer.selected', { detail: { source: 'dashboard-churn', customer: sel } }) as any)
                window.dispatchEvent(new CustomEvent('tnt.sales.navigate', { detail: { key: 'customer:sales-activity-new' } }) as any)
              } catch {}
              setMenu({ open: false, x: 0, y: 0, row: null })
            }}
          >영업활동 이동</button>
        </div>
      )}
    </div>
  )
}
