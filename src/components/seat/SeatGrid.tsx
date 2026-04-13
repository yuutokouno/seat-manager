import { useRef, useState, useEffect, useMemo } from 'react'
import type { SeatWithSession } from '../../hooks/useSeats'
import type { FloorLabel } from '../../hooks/useLabels'
import type { Reservation } from '../../hooks/useReservations'
import { SeatCard, VIRTUAL_SEAT_SIZE } from './SeatCard'

const CANVAS_WIDTH = 1000
const CANVAS_HEIGHT = 750
const MIN_CANVAS_PX = 600

type SeatGridProps = {
  seats: SeatWithSession[]
  labels: FloorLabel[]
  reservations: Reservation[]
  rotation: number
  onSelect: (seat: SeatWithSession) => void
}

export function SeatGrid({ seats, labels, reservations, rotation, onSelect }: SeatGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth)
      }
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const displayWidth = Math.max(containerWidth, MIN_CANVAS_PX)
  const scale = displayWidth / CANVAS_WIDTH
  const seatSize = Math.max(28, VIRTUAL_SEAT_SIZE * scale)

  // Calculate the bounding box center of all seats + labels
  const contentCenter = useMemo(() => {
    const allX: number[] = []
    const allY: number[] = []

    seats.forEach((s) => {
      allX.push(s.x + VIRTUAL_SEAT_SIZE / 2)
      allY.push(s.y + VIRTUAL_SEAT_SIZE / 2)
    })
    labels.forEach((l) => {
      allX.push(l.x + l.width / 2)
      allY.push(l.y + l.height / 2)
    })

    if (allX.length === 0) return { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 }

    const minX = Math.min(...allX)
    const maxX = Math.max(...allX)
    const minY = Math.min(...allY)
    const maxY = Math.max(...allY)

    return {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
    }
  }, [seats, labels])

  const originX = contentCenter.x * scale
  const originY = contentCenter.y * scale
  const canvasHeight = CANVAS_HEIGHT * scale
  const normalizedRotation = ((rotation % 360) + 360) % 360
  const isRotated = normalizedRotation === 90 || normalizedRotation === 270

  // Calculate extra space needed when rotated 90/270
  const extraPadding = isRotated ? Math.abs(displayWidth - canvasHeight) / 2 + seatSize : 0
  const containerHeight = canvasHeight + extraPadding * 2

  const getReservation = (seatId: string) =>
    reservations.find((r) => r.seat_id === seatId) ?? null

  return (
    <div ref={containerRef} className="w-full overflow-auto">
      <div
        className="relative"
        style={{ width: displayWidth, height: containerHeight }}
      >
        <div
          style={{
            width: displayWidth,
            height: canvasHeight,
            transform: `rotate(${rotation}deg)`,
            transformOrigin: `${originX}px ${originY}px`,
            transition: 'transform 0.4s ease',
            position: 'absolute',
            top: extraPadding,
          }}
        >
          {/* Labels (SVG) */}
          <svg
            className="absolute inset-0"
            width={displayWidth}
            height={canvasHeight}
            viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
            preserveAspectRatio="none"
          >
            {labels.map((label) => (
              <g key={label.id}>
                <rect
                  x={label.x}
                  y={label.y}
                  width={label.width}
                  height={label.height}
                  fill="none"
                  stroke="#6b7280"
                  strokeWidth="2"
                  strokeDasharray="8 4"
                  rx="4"
                />
                <text
                  x={label.x + label.width / 2}
                  y={label.y + label.height / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#6b7280"
                  fontSize="20"
                  fontWeight="500"
                  transform={`rotate(${-normalizedRotation}, ${label.x + label.width / 2}, ${label.y + label.height / 2})`}
                >
                  {label.text}
                </text>
              </g>
            ))}
          </svg>

          {/* Seats (HTML) */}
          {seats.map((seat) => (
            <div
              key={seat.id}
              className="absolute"
              style={{
                left: seat.x * scale,
                top: seat.y * scale,
              }}
            >
              <div style={{
                transform: `rotate(${-normalizedRotation}deg)`,
                transition: 'transform 0.4s ease',
              }}>
                <SeatCard
                  seat={seat}
                  reservation={getReservation(seat.id)}
                  size={seatSize}
                  onSelect={onSelect}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export { CANVAS_WIDTH, CANVAS_HEIGHT }
