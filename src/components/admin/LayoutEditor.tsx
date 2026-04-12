import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import type { SeatWithSession } from '../../hooks/useSeats'

type SeatPosition = {
  id: string
  name: string
  x: number
  y: number
}

type LayoutEditorProps = {
  seats: SeatWithSession[]
  onSaved: () => void
}

export function LayoutEditor({ seats, onSaved }: LayoutEditorProps) {
  const [positions, setPositions] = useState<SeatPosition[]>(
    seats.map((s) => ({ id: s.id, name: s.name, x: s.x, y: s.y }))
  )
  const [dragging, setDragging] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handlePointerDown = (seatId: string) => {
    setDragging(seatId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100)
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100)

    const clampedX = Math.max(0, Math.min(95, x))
    const clampedY = Math.max(0, Math.min(95, y))

    setPositions((prev) =>
      prev.map((p) => (p.id === dragging ? { ...p, x: clampedX, y: clampedY } : p))
    )
  }

  const handlePointerUp = () => {
    setDragging(null)
  }

  const handleSave = async () => {
    setIsSaving(true)

    for (const pos of positions) {
      await supabase
        .from('seats')
        .update({ x: pos.x, y: pos.y })
        .eq('id', pos.id)
    }

    setIsSaving(false)
    onSaved()
  }

  return (
    <div>
      <div
        ref={containerRef}
        className="relative w-full bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 touch-none select-none"
        style={{ paddingBottom: '75%' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {positions.map((seat) => (
          <div
            key={seat.id}
            className={`absolute w-14 h-14 rounded-lg flex items-center justify-center text-xs font-semibold cursor-grab active:cursor-grabbing ${
              dragging === seat.id ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-green-600'
            }`}
            style={{ left: `${seat.x}%`, top: `${seat.y}%` }}
            onPointerDown={() => handlePointerDown(seat.id)}
          >
            {seat.name}
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="mt-4 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors"
      >
        {isSaving ? '保存中...' : 'レイアウトを保存'}
      </button>
    </div>
  )
}
