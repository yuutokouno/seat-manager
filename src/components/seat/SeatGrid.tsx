import type { SeatWithSession } from '../../hooks/useSeats'
import { SeatCard } from './SeatCard'

type SeatGridProps = {
  seats: SeatWithSession[]
  onSelect: (seat: SeatWithSession) => void
}

export function SeatGrid({ seats, onSelect }: SeatGridProps) {
  return (
    <div className="grid grid-cols-4 gap-3 justify-items-center">
      {seats.map((seat) => (
        <SeatCard key={seat.id} seat={seat} onSelect={onSelect} />
      ))}
    </div>
  )
}
