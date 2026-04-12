import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { SeatWithSession } from '../../hooks/useSeats'
import type { FloorLabel } from '../../hooks/useLabels'

const CANVAS_WIDTH = 1000
const CANVAS_HEIGHT = 750

type DraggableItem = {
  id: string
  type: 'seat' | 'label'
  name: string
  x: number
  y: number
  width: number
  height: number
}

type LayoutEditorProps = {
  seats: SeatWithSession[]
  labels: FloorLabel[]
  onSaved: () => void
}

export function LayoutEditor({ seats, labels, onSaved }: LayoutEditorProps) {
  const [items, setItems] = useState<DraggableItem[]>([])
  const [dragging, setDragging] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const seatItems: DraggableItem[] = seats.map((s) => ({
      id: s.id,
      type: 'seat',
      name: s.name,
      x: s.x,
      y: s.y,
      width: 60,
      height: 60,
    }))
    const labelItems: DraggableItem[] = labels.map((l) => ({
      id: l.id,
      type: 'label',
      name: l.text,
      x: l.x,
      y: l.y,
      width: l.width,
      height: l.height,
    }))
    setItems([...seatItems, ...labelItems])
  }, [seats, labels])

  useEffect(() => {
    if (!isOpen) return
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [isOpen])

  const scale = Math.min(
    containerSize.width / CANVAS_WIDTH,
    containerSize.height / CANVAS_HEIGHT
  ) || 1

  const handlePointerDown = (itemId: string, e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(itemId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.round((e.clientX - rect.left) / scale)
    const y = Math.round((e.clientY - rect.top) / scale)

    const item = items.find((i) => i.id === dragging)
    if (!item) return

    const GRID_SIZE = 10
    const rawX = Math.max(0, Math.min(CANVAS_WIDTH - item.width, x - item.width / 2))
    const rawY = Math.max(0, Math.min(CANVAS_HEIGHT - item.height, y - item.height / 2))
    const clampedX = Math.round(rawX / GRID_SIZE) * GRID_SIZE
    const clampedY = Math.round(rawY / GRID_SIZE) * GRID_SIZE

    setItems((prev) =>
      prev.map((i) => (i.id === dragging ? { ...i, x: clampedX, y: clampedY } : i))
    )
  }

  const handlePointerUp = () => {
    setDragging(null)
  }

  const [columns, setColumns] = useState(5)

  const handleAutoAlign = () => {
    const GRID_SIZE = 10
    const seatItems = items.filter((i) => i.type === 'seat')
    const labelItems = items.filter((i) => i.type === 'label')

    const gap = 100
    const startX = 40
    const startY = 40

    const aligned = seatItems
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((item, index) => {
        const col = index % columns
        const row = Math.floor(index / columns)
        const x = Math.round((startX + col * gap) / GRID_SIZE) * GRID_SIZE
        const y = Math.round((startY + row * gap) / GRID_SIZE) * GRID_SIZE
        return { ...item, x, y }
      })

    setItems([...aligned, ...labelItems])
  }

  const handleSave = async () => {
    setIsSaving(true)

    const seatUpdates = items
      .filter((i) => i.type === 'seat')
      .map((i) => supabase.from('seats').update({ x: i.x, y: i.y }).eq('id', i.id))

    const labelUpdates = items
      .filter((i) => i.type === 'label')
      .map((i) => supabase.from('floor_labels').update({ x: i.x, y: i.y }).eq('id', i.id))

    await Promise.all([...seatUpdates, ...labelUpdates])

    setIsSaving(false)
    setIsOpen(false)
    onSaved()
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-medium transition-colors"
      >
        レイアウトを編集する
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      {/* Top bar */}
      <div className="flex flex-col gap-2 px-4 py-3 bg-gray-900 shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
          >
            キャンセル
          </button>
          <span className="text-white font-medium">レイアウト編集</span>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 transition-colors"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-gray-400 text-xs">列数</span>
          <input
            type="number"
            value={columns}
            onChange={(e) => setColumns(Math.max(1, Number(e.target.value)))}
            className="w-12 bg-gray-800 text-white text-center text-sm py-1.5 rounded-lg border border-gray-700 focus:border-green-500 focus:outline-none"
          />
          <button
            onClick={handleAutoAlign}
            className="px-4 py-1.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-500 transition-colors"
          >
            自動整列
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden touch-none select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div
          className="relative bg-gray-900"
          style={{
            width: CANVAS_WIDTH * scale,
            height: CANVAS_HEIGHT * scale,
          }}
        >
          {/* Grid lines */}
          <svg
            className="absolute inset-0"
            width={CANVAS_WIDTH * scale}
            height={CANVAS_HEIGHT * scale}
          >
            {Array.from({ length: 11 }).map((_, i) => (
              <line
                key={`v${i}`}
                x1={i * (CANVAS_WIDTH / 10) * scale}
                y1={0}
                x2={i * (CANVAS_WIDTH / 10) * scale}
                y2={CANVAS_HEIGHT * scale}
                stroke="#1f2937"
                strokeWidth="1"
              />
            ))}
            {Array.from({ length: 9 }).map((_, i) => (
              <line
                key={`h${i}`}
                x1={0}
                y1={i * (CANVAS_HEIGHT / 8) * scale}
                x2={CANVAS_WIDTH * scale}
                y2={i * (CANVAS_HEIGHT / 8) * scale}
                stroke="#1f2937"
                strokeWidth="1"
              />
            ))}
          </svg>

          {/* Items */}
          {items.map((item) => (
            <div
              key={item.id}
              className={`absolute flex items-center justify-center cursor-grab active:cursor-grabbing ${
                item.type === 'seat'
                  ? `rounded-lg ${dragging === item.id ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-green-600'}`
                  : `rounded border-2 border-dashed ${dragging === item.id ? 'border-blue-400' : 'border-gray-500'}`
              }`}
              style={{
                left: item.x * scale,
                top: item.y * scale,
                width: item.width * scale,
                height: item.height * scale,
              }}
              onPointerDown={(e) => handlePointerDown(item.id, e)}
            >
              <span
                className={`font-semibold ${item.type === 'seat' ? 'text-white' : 'text-gray-400'}`}
                style={{ fontSize: Math.max(8, 14 * scale) }}
              >
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
