import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  open: boolean
  onClose: () => void
  title?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  width?: number | string
}

export function AppModal({ open, onClose, title, children, footer, width = 380 }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div role="dialog" aria-modal="true" style={{ position:'fixed', inset:0, zIndex: 2000 }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.35)' }} />
      <div className="card" style={{ position:'absolute', top:'22%', left:'50%', transform:'translateX(-50%)', width, maxWidth:'92vw', padding: 12 }}>
        {title ? (
          <div className="page-title" style={{ marginBottom: 8 }}>
            <h3 style={{ margin:0, fontSize: 14 }}>{title}</h3>
          </div>
        ) : null}
        <div style={{ padding:'4px 2px', fontSize: 13 }}>
          {children}
        </div>
        <div className="controls" style={{ justifyContent:'flex-end', gap: 8, marginTop: 8 }}>
          {footer}
        </div>
      </div>
    </div>,
    document.body
  )
}

