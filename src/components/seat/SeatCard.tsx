import type { SeatWithSession } from '../../hooks/useSeats'

type SeatCardProps = {
  seat: SeatWithSession
  onSelect: (seat: SeatWithSession) => void
}

export function SeatCard({ seat, onSelect }: SeatCardProps) {
  const isOccupied = seat.occupant !== null

  return (
    <button
      onClick={() => onSelect(seat)}
      className={`
        w-16 h-16 rounded-lg flex flex-col items-center justify-center
        transition-colors cursor-pointer
        ${isOccupied
          ? 'bg-gray-700 hover:bg-gray-600'
          : 'bg-green-600 hover:bg-green-500'
        }
      `}
    >
      {isOccupied && seat.occupant?.profile?.avatar_url ? (
        <img
          src={seat.occupant.profile.avatar_url}
          alt=""
          className="w-7 h-7 rounded-full"
        />
      ) : null}
      <span className={`text-xs font-semibold ${isOccupied ? 'text-gray-400' : 'text-white'}`}>
        {seat.name}
      </span>
    </button>
  )
}
