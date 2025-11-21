import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'

type Pos = { x: number; y: number }

export function useDraggableModal(
  storageKey: string,
  open: boolean,
  getInitialPos?: (el: HTMLElement) => Pos,
  options?: { persist?: boolean; resetOnOpen?: boolean }
) {
  const persist = options?.persist !== false
  const resetOnOpen = options?.resetOnOpen === true
  const ref = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<Pos | null>(() => {
    if (!persist) return null
    try {
      const raw = localStorage.getItem(`tnt.sales.modal.pos.${storageKey}`)
      if (raw) return JSON.parse(raw)
    } catch {}
    return null
  })
  const latestPos = useRef<Pos | null>(pos)
  useEffect(() => { latestPos.current = pos }, [pos])
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ dx: number; dy: number } | null>(null)

  // Initialize position when opened
  useEffect(() => {
    if (!open) return
    if (ref.current && getInitialPos) {
      try {
        if (resetOnOpen || !pos) setPos(getInitialPos(ref.current))
      } catch {}
    }
  }, [open])

  // Global drag listeners (stable during a drag)
  useEffect(() => {
    if (!dragging) return
    function onMove(e: MouseEvent) {
      if (!start.current || !ref.current) return
      const el = ref.current
      const rect = el.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      let x = e.clientX - start.current.dx
      let y = e.clientY - start.current.dy
      const maxX = Math.max(0, window.innerWidth - w)
      const maxY = Math.max(0, window.innerHeight - h)
      x = Math.min(Math.max(0, x), maxX)
      y = Math.min(Math.max(0, y), maxY)
      setPos({ x, y })
    }
    function onUp() {
      if (persist && latestPos.current) {
        try { localStorage.setItem(`tnt.sales.modal.pos.${storageKey}`, JSON.stringify(latestPos.current)) } catch {}
      }
      setDragging(false)
      start.current = null
      window.removeEventListener('mousemove', onMove, true)
      window.removeEventListener('mouseup', onUp, true)
    }
    window.addEventListener('mousemove', onMove, true)
    window.addEventListener('mouseup', onUp, true)
    return () => {
      window.removeEventListener('mousemove', onMove, true)
      window.removeEventListener('mouseup', onUp, true)
    }
  }, [dragging, persist, storageKey])

  function onHeaderMouseDown(e: ReactMouseEvent) {
    if (e.button !== 0) return // left only
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    start.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }
    setDragging(true)
    e.preventDefault()
  }

  function onContainerMouseDown(e: ReactMouseEvent) {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    const tag = (target?.tagName || '').toLowerCase()
    // avoid dragging when interacting with form controls/links/buttons
    if (['input', 'textarea', 'select', 'button', 'a', 'label'].includes(tag)) return
    onHeaderMouseDown(e)
  }

  const style: React.CSSProperties = pos && open
    ? { position: 'absolute', top: pos.y, left: pos.x, transform: 'none' }
    : { position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)' }

  return { ref, style, bindHeader: { onMouseDown: onHeaderMouseDown }, bindContainer: { onMouseDown: onContainerMouseDown } }
}
