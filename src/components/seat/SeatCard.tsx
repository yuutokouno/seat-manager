import type { SeatWithSession } from '../../hooks/useSeats'
import type { Reservation } from '../../hooks/useReservations'

type SeatCardProps = {
  seat: SeatWithSession
  reservation?: Reservation | null
  size: number
  onSelect: (seat: SeatWithSession) => void
}

const VIRTUAL_SEAT_SIZE = 60

export function SeatCard({ seat, reservation, size, onSelect }: SeatCardProps) {
  const isOccupied = seat.occupant !== null
  const isReserved = reservation !== null && reservation !== undefined
  const showAvatar = size >= 36

  const bgColor = isOccupied
    ? 'bg-gray-700 hover:bg-gray-600'
    : isReserved
      ? 'bg-yellow-600 hover:bg-yellow-500'
      : 'bg-green-600 hover:bg-green-500'

  const textColor = isOccupied ? 'text-gray-400' : 'text-white'

  const tooltipText = isReserved && reservation?.profile
    ? `${reservation.profile.name ?? '不明'} ${new Date(reservation.starts_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}〜`
    : undefined

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onSelect(seat)
      }}
      className={`rounded-lg flex flex-col items-center justify-center transition-colors cursor-pointer relative group ${bgColor}`}
      style={{ width: size, height: size }}
      title={tooltipText}
    >
      {showAvatar && isOccupied && seat.occupant?.profile?.avatar_url ? (
        <img
          src={seat.occupant.profile.avatar_url}
          alt=""
          className="rounded-full"
          style={{ width: size * 0.45, height: size * 0.45 }}
        />
      ) : null}
      <span
        className={`font-semibold leading-none ${textColor}`}
        style={{ fontSize: Math.max(8, size * 0.2) }}
      >
        {seat.name}
      </span>
    </button>
  )
}

export { VIRTUAL_SEAT_SIZE }
