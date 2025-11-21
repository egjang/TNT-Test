import React, { useEffect, useRef, useState } from 'react'

type Props = {
  initialLeft?: number
  initialRight?: number
  minLeft?: number
  minRight?: number
  fixedLeft?: number
  fixedRight?: number
  children: [React.ReactNode, React.ReactNode, React.ReactNode]
}

export function ResizableColumns({
  initialLeft = 240,
  initialRight = 300,
  minLeft = 160,
  minRight = 200,
  fixedLeft,
  fixedRight,
  children,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const resizerWidth = 3
  const centerMinWidth = 100

  const [leftWidth, setLeftWidth] = useState<number>(fixedLeft ?? initialLeft)
  const [rightWidth, setRightWidth] = useState<number>(fixedRight ?? initialRight)
  const [drag, setDrag] = useState<null | { side: 'left' | 'right'; startX: number; startLeft: number; startRight: number }>(null)

  // On first mount, set default 2/5/3 ratio regardless of prior adjustments (refresh resets)
  useEffect(() => {
    if (containerRef.current) {
      const total = containerRef.current.clientWidth
      const usable = total - 2 * resizerWidth
      // Honor requested initial widths (pixels), bounded by mins and center area
      let left = fixedLeft != null ? fixedLeft : Math.max(minLeft, initialLeft)
      let right = fixedRight != null ? fixedRight : Math.max(minRight, initialRight)
      // Ensure center keeps at least centerMinWidth
      const maxLeft = usable - right - centerMinWidth
      left = Math.min(left, Math.max(0, maxLeft))
      const maxRight = usable - left - centerMinWidth
      right = Math.min(right, Math.max(0, maxRight))
      setLeftWidth(left)
      setRightWidth(right)
    }
  }, [fixedLeft, fixedRight])

  // No persistence: refreshing always resets to the default ratio

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!drag || !containerRef.current) return
      const container = containerRef.current
      const total = container.clientWidth
      const dx = e.clientX - drag.startX
      if (drag.side === 'left') {
        const next = Math.max(minLeft, drag.startLeft + dx)
        // prevent overlap with center min and right panel + 2 resizers
        const maxLeft = total - rightWidth - centerMinWidth - 2 * resizerWidth
        setLeftWidth(Math.min(next, maxLeft))
      } else {
        // dragging the right resizer: moving left increases right width (dx negative)
        const next = Math.max(minRight, drag.startRight - dx)
        const maxRight = total - leftWidth - centerMinWidth - 2 * resizerWidth
        setRightWidth(Math.min(next, maxRight))
      }
    }
    function onUp() {
      setDrag(null)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    if (drag) {
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp, { once: true })
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [drag, leftWidth, rightWidth, minLeft, minRight])

  function startDrag(side: 'left' | 'right', e: React.MouseEvent) {
    setDrag({ side, startX: e.clientX, startLeft: leftWidth, startRight: rightWidth })
  }

  return (
    <div ref={containerRef} className="resizable-container">
      <div className="col left" style={{ width: leftWidth, flex: `0 0 ${leftWidth}px` }}>{children[0]}</div>
      {fixedLeft == null && (<div className="resizer" onMouseDown={(e) => startDrag('left', e)} />)}
      <div className="col center" style={{ minWidth: centerMinWidth, flex: '1 1 auto' }}>{children[1]}</div>
      {fixedRight == null && (<div className="resizer" onMouseDown={(e) => startDrag('right', e)} />)}
      <div className="col right" style={{ width: rightWidth, flex: `0 0 ${rightWidth}px` }}>{children[2]}</div>
    </div>
  )
}
