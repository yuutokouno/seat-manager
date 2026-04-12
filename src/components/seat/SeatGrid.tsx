import type { SeatWithSession } from '../../hooks/useSeats'
import { SeatCard } from './SeatCard'

type SeatGridProps = {
  seats: SeatWithSession[]
  onSelect: (seat: SeatWithSession) => void
}

export function SeatGrid({ seats, onSelect }: SeatGridProps) {
  return (
    <div className="relative w-full" style={{ paddingBottom: '75%' }}>
      {seats.map((seat) => (
        <div
          key={seat.id}
          className="absolute"
          style={{ left: `${seat.x}%`, top: `${seat.y}%` }}
        >
          <SeatCard seat={seat} onSelect={onSelect} />
        </div>
      ))}
    </div>
  )
}
