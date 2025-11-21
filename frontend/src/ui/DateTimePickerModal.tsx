import React, { useEffect, useMemo, useState } from 'react'
import closeIcon from '../assets/icons/close.svg'
import { useDraggableModal } from './useDraggableModal'

export function DateTimePickerModal({
  open,
  title = '일시 선택',
  value,
  onChange,
  onClose,
}: {
  open: boolean
  title?: string
  value?: string
  onChange: (v: string) => void
  onClose: () => void
}) {
  const [local, setLocal] = useState<string>('')

  useEffect(() => {
    if (open) setLocal(value || '')
  }, [open, value])

  const { ref, style, bindHeader, bindContainer } = useDraggableModal(
    'datetime-picker',
    open,
    (el) => {
      const rect = el.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      const x = (window.innerWidth - w) / 2
      const y = Math.max(24, (window.innerHeight - h) * 0.2)
      return { x, y }
    },
    { persist: false, resetOnOpen: true }
  )

  // ESC to close
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  if (!open) return null
  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 12000, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.25)', pointerEvents: 'none' }} />
      <div
        ref={ref}
        className="card"
        style={{ ...style, width: 'min(360px, 92vw)', padding: 12, pointerEvents: 'auto' }}
        {...bindContainer}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, cursor: 'move' }} {...bindHeader}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <span role="button" tabIndex={0} className="icon-button" aria-label="닫기" title="닫기" onClick={onClose}>
            <img src={closeIcon} className="icon" alt="닫기" />
          </span>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          <input
            type="datetime-local"
            className={local ? '' : 'empty'}
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            autoComplete="off"
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>취소</button>
            <button className="btn btn-card btn-3d" onClick={() => { if (local) onChange(local); onClose() }}>선택</button>
          </div>
        </div>
      </div>
    </div>
  )
}

