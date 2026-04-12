import type { SeatWithSession } from '../../hooks/useSeats'

type SeatCardProps = {
  seat: SeatWithSession
  size: number
  onSelect: (seat: SeatWithSession) => void
}

const VIRTUAL_SEAT_SIZE = 60

export function SeatCard({ seat, size, onSelect }: SeatCardProps) {
  const isOccupied = seat.occupant !== null
  const showAvatar = size >= 36

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onSelect(seat)
      }}
      className={`
        rounded-lg flex flex-col items-center justify-center
        transition-colors cursor-pointer
        ${isOccupied
          ? 'bg-gray-700 hover:bg-gray-600'
          : 'bg-green-600 hover:bg-green-500'
        }
      `}
      style={{ width: size, height: size }}
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
        className={`font-semibold leading-none ${isOccupied ? 'text-gray-400' : 'text-white'}`}
        style={{ fontSize: Math.max(8, size * 0.2) }}
      >
        {seat.name}
      </span>
    </button>
  )
}

export { VIRTUAL_SEAT_SIZE }
