import type { Reservation } from '../../hooks/useReservations'

type ReservationInfoProps = {
  reservation: Reservation
  isOwner: boolean
  onCancel: () => void
  onOccupy: () => void
  isBeforeStartTime: boolean
}

export function ReservationInfo({
  reservation,
  isOwner,
  onCancel,
  onOccupy,
  isBeforeStartTime,
}: ReservationInfoProps) {
  const startsAt = new Date(reservation.starts_at)
  const startDate = startsAt.toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
  })
  const startTime = startsAt.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div>
      <div className="flex items-center gap-3 mt-4">
        {reservation.profile?.avatar_url && (
          <img
            src={reservation.profile.avatar_url}
            alt=""
            className="w-10 h-10 rounded-full"
          />
        )}
        <div>
          <p className="font-medium">
            {reservation.profile?.name ?? '不明'}
          </p>
          <p className="text-sm text-yellow-400">
            {startDate} {startTime}〜 予約済み
          </p>
        </div>
      </div>

      {isBeforeStartTime && (
        <button
          onClick={onOccupy}
          className="w-full mt-4 bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg font-medium transition-colors"
        >
          この席を使う（予約時間前）
        </button>
      )}

      {isOwner && (
        <button
          onClick={onCancel}
          className="w-full mt-2 bg-red-600 hover:bg-red-500 text-white py-3 rounded-lg font-medium transition-colors"
        >
          予約を取り消す
        </button>
      )}
    </div>
  )
}
