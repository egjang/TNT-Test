import React, { useCallback, useEffect } from 'react'
import closeIcon from '../../assets/icons/close.svg'
import { useDraggableModal } from '../../ui/useDraggableModal'
import { SalesActivityForm, SalesActivityInitial } from '../customer/SalesActivityForm'

type LeadActivityModalProps = {
  open: boolean
  onClose: () => void
  leadId?: number | null
  leadName?: string | null
  targetKind?: 'lead' | 'customer'
  targetCompanyType?: string | null
  editId?: number | null
  initial?: SalesActivityInitial
  onSaved?: () => void
}

export function LeadActivityCreateModal({ open, onClose, leadId, leadName, targetKind, targetCompanyType, editId, initial, onSaved }: LeadActivityModalProps) {
  const { ref, style, bindHeader, bindContainer } = useDraggableModal('lead.activity', open, (el) => {
    const pane = document.querySelector('.pane.center') as HTMLElement | null
    const rect = pane ? pane.getBoundingClientRect() : null
    const elRect = el.getBoundingClientRect()
    const w = elRect.width
    const h = elRect.height
    const x = rect ? (rect.left + (rect.width - w) / 2) : (window.innerWidth - w) / 2
    const y = rect ? (rect.top + Math.max(24, (rect.height - h) * 0.2)) : Math.max(24, (window.innerHeight - h) * 0.2)
    return { x, y }
  }, { persist: false, resetOnOpen: true })

  // ESC to close
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  const handleNoticeClose = useCallback(() => {
    if (!editId) {
      onClose()
    }
  }, [editId, onClose])

  const computedKind = targetKind || (leadId ? 'lead' : undefined)
  const normalizedName = (() => {
    const fromProp = (leadName ?? '').toString().trim()
    if (fromProp) return fromProp
    const fromInitial = (initial?.customerName ?? '').toString().trim()
    return fromInitial
  })()
  const companyTypeUpper = (targetCompanyType ?? '').toString().trim().toUpperCase()
  const badgeIcon = (() => {
    if (computedKind === 'lead') return '잠'
    if (companyTypeUpper.includes('TNT')) return 'T'
    if (companyTypeUpper.includes('DYS')) return 'D'
    if (companyTypeUpper) return companyTypeUpper.slice(0, 1)
    return '거'
  })()
  const badgeTitle = computedKind === 'lead'
    ? '잠재고객'
    : (companyTypeUpper || '거래처')

  const badgeNode = computedKind ? (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', fontSize: 12, fontWeight: 700, background: computedKind === 'lead' ? 'rgba(236,72,153,.2)' : 'rgba(59,130,246,.2)', color: computedKind === 'lead' ? '#be185d' : '#1d4ed8' }}
      title={badgeTitle}
    >
      {badgeIcon}
    </span>
  ) : null

  const titleText = editId ? '영업활동' : '영업활동 등록'

  if (!open) return null
  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 11000, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.25)', pointerEvents: 'none' }} />
      <div
        ref={ref}
        className="card"
        style={{ ...style, width: 'min(880px, 96vw)', maxHeight: '86vh', overflow: 'auto', padding: 16, pointerEvents: 'auto' }}
        {...bindContainer}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, cursor: 'move' }} {...bindHeader}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h3 style={{ margin: 0 }}>{titleText}</h3>
            {normalizedName || badgeNode ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                {normalizedName ? <span>{normalizedName}</span> : null}
                {badgeNode}
              </div>
            ) : null}
          </div>
          <span role="button" tabIndex={0} className="icon-button" aria-label="닫기" title="닫기" onClick={onClose}>
            <img src={closeIcon} className="icon" alt="닫기" />
          </span>
        </div>
        <SalesActivityForm
          bare
          editId={editId ?? undefined}
          leadId={leadId ?? undefined}
          initial={initial}
          onNoticeClose={handleNoticeClose}
          onSaved={(id) => {
            if (onSaved) onSaved()
            else onClose()
          }}
        />
      </div>
    </div>
  )
}
