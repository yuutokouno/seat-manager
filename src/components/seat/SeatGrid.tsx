import { useRef, useState, useEffect } from 'react'
import type { SeatWithSession } from '../../hooks/useSeats'
import type { FloorLabel } from '../../hooks/useLabels'
import type { Reservation } from '../../hooks/useReservations'
import { SeatCard, VIRTUAL_SEAT_SIZE } from './SeatCard'

const CANVAS_WIDTH = 1000
const CANVAS_HEIGHT = 750

type SeatGridProps = {
  seats: SeatWithSession[]
  labels: FloorLabel[]
  reservations: Reservation[]
  onSelect: (seat: SeatWithSession) => void
}

export function SeatGrid({ seats, labels, reservations, onSelect }: SeatGridProps) {
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

  const scale = containerWidth / CANVAS_WIDTH
  const seatSize = Math.max(28, VIRTUAL_SEAT_SIZE * scale)

  const getReservation = (seatId: string) =>
    reservations.find((r) => r.seat_id === seatId) ?? null

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: CANVAS_HEIGHT * scale }}
    >
      {/* Labels (SVG) */}
      <svg
        className="absolute inset-0 w-full h-full"
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
          <SeatCard
            seat={seat}
            reservation={getReservation(seat.id)}
            size={seatSize}
            onSelect={onSelect}
          />
        </div>
      ))}
    </div>
  )
}

export { CANVAS_WIDTH, CANVAS_HEIGHT }
