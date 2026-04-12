import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useSeats } from '../hooks/useSeats'
import { useReservations } from '../hooks/useReservations'
import type { Reservation } from '../hooks/useReservations'

function userIdToColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsla(${hue}, 60%, 40%, 0.3)`
}

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2)
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
})

export function TimetablePage() {
  const { user } = useAuth()
  const { seats } = useSeats()
  const { reservations, reserve, cancelReservation } = useReservations()
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  })

  const dateLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  })

  const changeDate = (delta: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const date = new Date(y, m - 1, d + delta)
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    setSelectedDate(`${yyyy}-${mm}-${dd}`)
  }

  const dayReservations = useMemo(() =>
    reservations.filter((r) => r.date === selectedDate),
    [reservations, selectedDate]
  )

  // Find the reservation that covers a given seat + time slot
  // A reservation covers from its start time until the next reservation's start time (or end of day)
  const getCoveringReservation = (seatId: string, timeSlot: string): { reservation: Reservation; isStart: boolean } | null => {
    const seatReservations = dayReservations
      .filter((r) => r.seat_id === seatId)
      .map((r) => ({
        ...r,
        startSlot: new Date(r.starts_at).toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
      }))
      .sort((a, b) => a.startSlot.localeCompare(b.startSlot))

    for (let i = 0; i < seatReservations.length; i++) {
      const r = seatReservations[i]
      const nextR = seatReservations[i + 1]
      const endSlot = nextR ? nextR.startSlot : '24:00'

      if (r.startSlot === timeSlot) {
        return { reservation: r, isStart: true }
      }

      if (r.startSlot < timeSlot && timeSlot < endSlot) {
        return { reservation: r, isStart: false }
      }
    }

    return null
  }

  const handleCancel = async (reservationId: string) => {
    if (!window.confirm('この予約を取り消しますか？')) return
    const result = await cancelReservation(reservationId)
    if (result.success) {
      setMessageType('success')
      setMessage('予約を取り消しました')
      setTimeout(() => setMessage(null), 1500)
    }
  }

  // Find the earliest reservation time for the current user on the selected date
  const myEarliestReservation = useMemo(() => {
    if (!user) return null
    const myDayReservations = dayReservations.filter((r) => r.user_id === user.id)
    if (myDayReservations.length === 0) return null

    return myDayReservations
      .map((r) => new Date(r.starts_at).toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }))
      .sort()[0]
  }, [user, dayReservations])

  const isSlotBlocked = (timeSlot: string) => {
    if (!myEarliestReservation) return false
    return timeSlot >= myEarliestReservation
  }

  const handleQuickReserve = async (seatId: string, timeSlot: string) => {
    if (!user) return

    const [hours, minutes] = timeSlot.split(':').map(Number)
    const startsAt = new Date(`${selectedDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`)

    const result = await reserve(seatId, user.id, selectedDate, startsAt)
    if (result.success) {
      setMessageType('success')
      setMessage('予約しました')
      setTimeout(() => setMessage(null), 1500)
    } else if (result.error) {
      setMessageType('error')
      setMessage(result.error)
      setTimeout(() => setMessage(null), 4000)
    }
  }

  const sortedSeats = [...seats].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">予約一覧</h1>
        <Link to="/" className="text-gray-400 text-sm hover:text-white transition-colors">
          フロアマップに戻る
        </Link>
      </div>

      {/* Message */}
      {message && (
        <div className={`text-center text-sm mb-3 px-4 py-2 rounded-lg ${
          messageType === 'error' ? 'bg-red-600/20 text-red-400' : 'bg-green-600/20 text-green-400'
        }`}>{message}</div>
      )}

      {/* Date navigation */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <button
          onClick={() => changeDate(-1)}
          className="text-gray-400 hover:text-white text-lg px-3 py-1 transition-colors"
        >
          ＜
        </button>
        <span className="text-lg font-medium min-w-[120px] text-center">{dateLabel}</span>
        <button
          onClick={() => changeDate(1)}
          className="text-gray-400 hover:text-white text-lg px-3 py-1 transition-colors"
        >
          ＞
        </button>
      </div>

      {/* Timetable */}
      <div className="overflow-auto bg-gray-900 rounded-xl flex-1" style={{ maxHeight: 'calc(100vh - 160px)' }}>
        <table className="border-collapse min-w-full">
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="sticky left-0 z-30 bg-gray-900 px-3 py-2 text-xs text-gray-400 font-medium border-b border-gray-800 min-w-[60px]">
                時間
              </th>
              {sortedSeats.map((seat) => (
                <th
                  key={seat.id}
                  className="bg-gray-900 px-2 py-2 text-xs text-gray-400 font-medium border-b border-gray-800 min-w-[72px] text-center"
                >
                  {seat.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((slot) => (
              <tr key={slot}>
                <td className="sticky left-0 bg-gray-900 z-10 px-3 py-1 text-xs text-gray-500 border-b border-gray-800/50 font-mono">
                  {slot}
                </td>
                {sortedSeats.map((seat) => {
                  const covering = getCoveringReservation(seat.id, slot)

                  if (!covering) {
                    const blocked = isSlotBlocked(slot)
                    return (
                      <td
                        key={seat.id}
                        className={`px-2 py-1 border-b border-gray-800/50 transition-colors ${
                          blocked
                            ? 'bg-gray-800/30 cursor-not-allowed'
                            : 'cursor-pointer hover:bg-gray-800'
                        }`}
                        onClick={blocked ? undefined : () => handleQuickReserve(seat.id, slot)}
                      />
                    )
                  }

                  const { reservation, isStart } = covering
                  const isOwner = user?.id === reservation.user_id

                  return (
                    <td
                      key={seat.id}
                      className="px-1 py-1 border-b border-gray-800/50 text-center text-xs"
                      style={{ backgroundColor: userIdToColor(reservation.user_id) }}
                    >
                      {isStart ? (
                        <div className="flex flex-col items-center gap-0.5">
                          {reservation.profile?.avatar_url && (
                            <img
                              src={reservation.profile.avatar_url}
                              alt=""
                              className="w-6 h-6 rounded-full"
                            />
                          )}
                          <span className="truncate max-w-[60px]">
                            {reservation.profile?.name ?? '不明'}
                          </span>
                          {isOwner && (
                            <button
                              onClick={() => handleCancel(reservation.id)}
                              className="text-red-400 hover:text-red-300 text-[10px] transition-colors"
                            >
                              取消
                            </button>
                          )}
                        </div>
                      ) : null}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
