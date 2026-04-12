import { useRef, useState, type ReactNode } from 'react'

type ZoomableContainerProps = {
  children: ReactNode
}

export function ZoomableContainer({ children }: ZoomableContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const lastPanRef = useRef({ x: 0, y: 0 })
  const lastPinchRef = useRef(0)

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale((s) => Math.max(0.5, Math.min(3, s * delta)))
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return
    setIsPanning(true)
    lastPanRef.current = { x: e.clientX, y: e.clientY }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning) return
    const dx = e.clientX - lastPanRef.current.x
    const dy = e.clientY - lastPanRef.current.y
    lastPanRef.current = { x: e.clientX, y: e.clientY }
    setOffset((o) => ({ x: o.x + dx, y: o.y + dy }))
  }

  const handlePointerUp = () => {
    setIsPanning(false)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = getTouchDistance(e.touches)
      lastPinchRef.current = dist
    } else if (e.touches.length === 1) {
      lastPanRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const dist = getTouchDistance(e.touches)
      const delta = dist / lastPinchRef.current
      lastPinchRef.current = dist
      setScale((s) => Math.max(0.5, Math.min(3, s * delta)))
    } else if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - lastPanRef.current.x
      const dy = e.touches[0].clientY - lastPanRef.current.y
      lastPanRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      setOffset((o) => ({ x: o.x + dx, y: o.y + dy }))
    }
  }

  const handleDoubleClick = () => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  return (
    <div
      ref={containerRef}
      className="overflow-hidden"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onDoubleClick={handleDoubleClick}
    >
      <div
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function getTouchDistance(touches: React.TouchList) {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}
