import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useSeats } from '../hooks/useSeats'
import { useReservations } from '../hooks/useReservations'
import type { Reservation } from '../hooks/useReservations'

type ViewMode = 'day' | 'week' | 'month'

const HOURS = Array.from({ length: 24 }, (_, i) => i)

function getLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getWeekDates(baseDate: Date): Date[] {
  const day = baseDate.getDay()
  const monday = new Date(baseDate)
  monday.setDate(baseDate.getDate() - ((day + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function getMonthDates(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1)
  const startDay = (firstDay.getDay() + 6) % 7
  const weeks: Date[][] = []
  let current = new Date(year, month, 1 - startDay)

  for (let w = 0; w < 6; w++) {
    const week: Date[] = []
    for (let d = 0; d < 7; d++) {
      week.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    weeks.push(week)
    if (current.getMonth() !== month && w >= 4) break
  }
  return weeks
}

function userIdToColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsla(${hue}, 60%, 50%, 0.8)`
}

export function TimetablePage() {
  const { user } = useAuth()
  const { seats } = useSeats()
  const { reservations, reserve, cancelReservation } = useReservations()

  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const MAX_RESERVATIONS = 3
  const myReservations = user
    ? reservations.filter((r) => r.user_id === user.id)
    : []
  const remainingSlots = MAX_RESERVATIONS - myReservations.length

  // Modal state for creating reservation
  const [showModal, setShowModal] = useState(false)
  const [modalDate, setModalDate] = useState('')
  const [modalTime, setModalTime] = useState('09:00')
  const [modalEndTime, setModalEndTime] = useState('')
  const [modalSeatId, setModalSeatId] = useState('')

  const today = getLocalDateStr(new Date())

  const navigate = (delta: number) => {
    const d = new Date(currentDate)
    if (viewMode === 'day') d.setDate(d.getDate() + delta)
    else if (viewMode === 'week') d.setDate(d.getDate() + delta * 7)
    else d.setMonth(d.getMonth() + delta)
    setCurrentDate(d)
  }

  const dateLabel = useMemo(() => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' })
    } else if (viewMode === 'week') {
      const week = getWeekDates(currentDate)
      const start = week[0].toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
      const end = week[6].toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
      return `${start} 〜 ${end}`
    } else {
      return currentDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })
    }
  }, [currentDate, viewMode])

  const getReservationTime = (r: Reservation) =>
    new Date(r.starts_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false })

  const getSeatName = (seatId: string) =>
    seats.find((s) => s.id === seatId)?.name ?? '不明'

  const handleTimeClick = (dateStr: string, hour: number) => {
    if (!user) return
    setModalDate(dateStr)
    setModalTime(`${String(hour).padStart(2, '0')}:00`)
    setModalEndTime('')
    setModalSeatId(seats[0]?.id ?? '')
    setShowModal(true)
  }

  const handleReserve = async () => {
    if (!user || !modalSeatId) return

    const [hours, minutes] = modalTime.split(':').map(Number)
    const startsAt = new Date(`${modalDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`)

    let endsAt: Date | null = null
    if (modalEndTime) {
      const [eh, em] = modalEndTime.split(':').map(Number)
      endsAt = new Date(`${modalDate}T${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`)
    }

    const result = await reserve(modalSeatId, user.id, modalDate, startsAt, endsAt)
    if (result.success) {
      setMessage({ text: '予約しました', type: 'success' })
      setShowModal(false)
    } else {
      setMessage({ text: result.error ?? '予約に失敗しました', type: 'error' })
    }
    setTimeout(() => setMessage(null), 3000)
  }

  const handleCancel = async (id: string) => {
    if (!window.confirm('この予約を取り消しますか？')) return
    const result = await cancelReservation(id)
    if (result.success) {
      setMessage({ text: '予約を取り消しました', type: 'success' })
    }
    setTimeout(() => setMessage(null), 2000)
  }

  const sortedSeats = [...seats].sort((a, b) => a.name.localeCompare(b.name))

  // Time slots for select (filter past times if today)
  const allTimeSlots = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2)
    const m = i % 2 === 0 ? '00' : '30'
    return `${String(h).padStart(2, '0')}:${m}`
  })

  const getFilteredTimeSlots = (dateStr: string) => {
    if (dateStr === today) {
      const now = new Date()
      const h = now.getHours()
      const m = now.getMinutes() < 30 ? 30 : 0
      const nextH = now.getMinutes() < 30 ? h : h + 1
      const currentSlot = `${String(nextH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      return allTimeSlots.filter((slot) => slot >= currentSlot)
    }
    return allTimeSlots
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">予約カレンダー</h1>
        <div className="flex items-center gap-3">
          {user && (
            <span className="bg-yellow-600 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
              予約 {remainingSlots}/{MAX_RESERVATIONS}
            </span>
          )}
          <Link to="/" className="text-gray-400 text-sm hover:text-white transition-colors">
            フロアマップに戻る
          </Link>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`text-center text-sm mb-3 px-4 py-2 rounded-lg ${
          message.type === 'error' ? 'bg-red-600/20 text-red-400' : 'bg-green-600/20 text-green-400'
        }`}>{message.text}</div>
      )}

      {/* View Mode Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-900 rounded-lg p-1">
        {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === mode ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {mode === 'day' ? '日' : mode === 'week' ? '週' : '月'}
          </button>
        ))}
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white text-lg px-3 py-1">＜</button>
        <span className="text-lg font-medium min-w-[160px] text-center">{dateLabel}</span>
        <button onClick={() => navigate(1)} className="text-gray-400 hover:text-white text-lg px-3 py-1">＞</button>
      </div>

      {/* Today button */}
      <div className="flex justify-center mb-4">
        <button
          onClick={() => setCurrentDate(new Date())}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          今日に戻る
        </button>
      </div>

      {/* Calendar Views */}
      {viewMode === 'month' ? (
        <MonthView
          currentDate={currentDate}
          reservations={reservations}
          today={today}
          getSeatName={getSeatName}
          onDateClick={(dateStr) => {
            const [y, m, d] = dateStr.split('-').map(Number)
            setCurrentDate(new Date(y, m - 1, d))
            setViewMode('day')
          }}
        />
      ) : viewMode === 'week' ? (
        <WeekView
          currentDate={currentDate}
          reservations={reservations}
          user={user}
          getSeatName={getSeatName}
          getReservationTime={getReservationTime}
          onTimeClick={handleTimeClick}
          onCancel={handleCancel}
        />
      ) : (
        <DayView
          currentDate={currentDate}
          reservations={reservations}
          seats={sortedSeats}
          user={user}
          getReservationTime={getReservationTime}
          onSeatTimeClick={(seatId, hour) => {
            if (!user) return
            const dateStr = getLocalDateStr(currentDate)
            setModalDate(dateStr)
            setModalTime(`${String(hour).padStart(2, '0')}:00`)
            setModalEndTime('')
            setModalSeatId(seatId)
            setShowModal(true)
          }}
          onCancel={handleCancel}
        />
      )}

      {/* Reservation Modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowModal(false)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-gray-900 rounded-2xl p-6 z-50 max-w-md mx-auto">
            <h2 className="text-lg font-bold mb-4">予約を作成</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">日付</label>
                <input
                  type="date"
                  value={modalDate}
                  min={today}
                  onChange={(e) => {
                    setModalDate(e.target.value)
                    if (e.target.value === today) {
                      const slots = getFilteredTimeSlots(e.target.value)
                      if (slots.length > 0) setModalTime(slots[0])
                    }
                  }}
                  className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">開始時間</label>
                <select
                  value={modalTime}
                  onChange={(e) => setModalTime(e.target.value)}
                  className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                >
                  {getFilteredTimeSlots(modalDate).map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">終了時間（空欄 = 終日）</label>
                <select
                  value={modalEndTime}
                  onChange={(e) => setModalEndTime(e.target.value)}
                  className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">指定なし（終日）</option>
                  {allTimeSlots.filter((slot) => slot > modalTime).map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">席</label>
                <select
                  value={modalSeatId}
                  onChange={(e) => setModalSeatId(e.target.value)}
                  className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                >
                  {sortedSeats.map((seat) => (
                    <option key={seat.id} value={seat.id}>{seat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleReserve}
              className="w-full mt-6 bg-yellow-600 hover:bg-yellow-500 text-white py-3 rounded-lg font-medium transition-colors"
            >
              予約する
            </button>
            <button
              onClick={() => setShowModal(false)}
              className="w-full mt-2 text-gray-400 text-sm hover:text-white transition-colors py-2"
            >
              キャンセル
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ========== Day View ==========

function DayView({
  currentDate, reservations, seats, user, getReservationTime, onSeatTimeClick, onCancel,
}: {
  currentDate: Date
  reservations: Reservation[]
  seats: { id: string; name: string }[]
  user: { id: string } | null
  getReservationTime: (r: Reservation) => string
  onSeatTimeClick: (seatId: string, hour: number) => void
  onCancel: (id: string) => void
}) {
  const dateStr = getLocalDateStr(currentDate)
  const dayReservations = reservations.filter((r) => r.date === dateStr)
  const sortedSeats = [...seats].sort((a, b) => a.name.localeCompare(b.name))

  const TIME_SLOTS_30 = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2)
    const m = i % 2 === 0 ? '00' : '30'
    return `${String(h).padStart(2, '0')}:${m}`
  })

  const getCoveringReservation = (seatId: string, timeSlot: string) => {
    const seatReservations = dayReservations
      .filter((r) => r.seat_id === seatId)
      .map((r) => ({
        ...r,
        startSlot: getReservationTime(r),
        endSlot: r.ends_at
          ? new Date(r.ends_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false })
          : '24:00',
      }))
      .sort((a, b) => a.startSlot.localeCompare(b.startSlot))

    for (const r of seatReservations) {
      if (r.startSlot === timeSlot) return { reservation: r, isStart: true }
      if (r.startSlot < timeSlot && timeSlot < r.endSlot) return { reservation: r, isStart: false }
    }
    return null
  }

  return (
    <div className="bg-gray-900 rounded-xl overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
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
          {TIME_SLOTS_30.map((slot) => (
            <tr key={slot}>
              <td className="sticky left-0 bg-gray-900 z-10 px-3 py-1 text-xs text-gray-500 border-b border-gray-800/50 font-mono">
                {slot}
              </td>
              {sortedSeats.map((seat) => {
                const covering = getCoveringReservation(seat.id, slot)

                if (!covering) {
                  return (
                    <td
                      key={seat.id}
                      className="px-2 py-1 border-b border-gray-800/50 cursor-pointer hover:bg-gray-800 transition-colors"
                      onClick={() => onSeatTimeClick(seat.id, parseInt(slot.split(':')[0]))}
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
                          <img src={reservation.profile.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                        )}
                        <span className="truncate max-w-[60px] font-medium">
                          {reservation.profile?.name ?? '不明'}
                        </span>
                        {isOwner && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onCancel(reservation.id) }}
                            className="text-white/70 hover:text-white text-[10px]"
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
  )
}

// ========== Week View ==========

function WeekView({
  currentDate, reservations, user, getSeatName, getReservationTime, onTimeClick, onCancel,
}: {
  currentDate: Date
  reservations: Reservation[]
  user: { id: string } | null
  getSeatName: (id: string) => string
  getReservationTime: (r: Reservation) => string
  onTimeClick: (dateStr: string, hour: number) => void
  onCancel: (id: string) => void
}) {
  const weekDates = getWeekDates(currentDate)
  const dayNames = ['月', '火', '水', '木', '金', '土', '日']
  const today = getLocalDateStr(new Date())

  return (
    <div className="bg-gray-900 rounded-xl overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
      <table className="border-collapse w-full">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="sticky left-0 z-20 bg-gray-900 w-14 px-2 py-2 text-xs text-gray-400 border-b border-gray-800" />
            {weekDates.map((date, i) => {
              const dateStr = getLocalDateStr(date)
              const isToday = dateStr === today
              return (
                <th
                  key={i}
                  className={`bg-gray-900 px-1 py-2 text-xs font-medium border-b border-gray-800 min-w-[90px] ${
                    isToday ? 'text-blue-400' : 'text-gray-400'
                  }`}
                >
                  <div>{dayNames[i]}</div>
                  <div className={`text-lg ${isToday ? 'bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto' : ''}`}>
                    {date.getDate()}
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {HOURS.map((hour) => (
            <tr key={hour}>
              <td className="sticky left-0 bg-gray-900 z-5 px-2 py-1 text-xs text-gray-500 font-mono border-r border-gray-800/50 border-b border-gray-800/50">
                {String(hour).padStart(2, '0')}
              </td>
              {weekDates.map((date, i) => {
                const dateStr = getLocalDateStr(date)
                const hourStr = String(hour).padStart(2, '0')
                const hourReservations = reservations.filter((r) => {
                  if (r.date !== dateStr) return false
                  return getReservationTime(r).startsWith(hourStr + ':')
                })

                return (
                  <td
                    key={i}
                    className="px-1 py-1 border-b border-gray-800/50 border-r border-gray-800/50 align-top cursor-pointer hover:bg-gray-800/30 transition-colors min-h-[48px]"
                    onClick={() => onTimeClick(dateStr, hour)}
                  >
                    {hourReservations.map((r) => (
                      <ReservationBlock
                        key={r.id}
                        reservation={r}
                        getSeatName={getSeatName}
                        getTime={getReservationTime}
                        isOwner={user?.id === r.user_id}
                        onCancel={onCancel}
                        compact
                      />
                    ))}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ========== Month View ==========

function MonthView({
  currentDate, reservations, today, getSeatName, onDateClick,
}: {
  currentDate: Date
  reservations: Reservation[]
  today: string
  getSeatName: (id: string) => string
  onDateClick: (dateStr: string) => void
}) {
  const weeks = getMonthDates(currentDate.getFullYear(), currentDate.getMonth())
  const dayNames = ['月', '火', '水', '木', '金', '土', '日']
  const currentMonth = currentDate.getMonth()

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      <div className="grid grid-cols-7">
        {dayNames.map((name) => (
          <div key={name} className="py-2 text-center text-xs text-gray-400 font-medium border-b border-gray-800">
            {name}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((date, di) => {
            const dateStr = getLocalDateStr(date)
            const isToday = dateStr === today
            const isCurrentMonth = date.getMonth() === currentMonth
            const dayReservations = reservations.filter((r) => r.date === dateStr)

            return (
              <div
                key={di}
                className={`min-h-[80px] p-1 border-b border-r border-gray-800/50 cursor-pointer hover:bg-gray-800/30 transition-colors ${
                  !isCurrentMonth ? 'opacity-30' : ''
                }`}
                onClick={() => onDateClick(dateStr)}
              >
                <div className={`text-xs mb-1 ${
                  isToday ? 'bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-400 px-1'
                }`}>
                  {date.getDate()}
                </div>
                {dayReservations.slice(0, 3).map((r) => (
                  <div
                    key={r.id}
                    className="text-[10px] truncate rounded px-1 py-0.5 mb-0.5"
                    style={{ backgroundColor: userIdToColor(r.user_id) }}
                  >
                    {getSeatName(r.seat_id)}
                  </div>
                ))}
                {dayReservations.length > 3 && (
                  <div className="text-[10px] text-gray-500 px-1">
                    +{dayReservations.length - 3}件
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ========== Reservation Block Component ==========

function ReservationBlock({
  reservation, getSeatName, getTime, isOwner, onCancel, compact,
}: {
  reservation: Reservation
  getSeatName: (id: string) => string
  getTime: (r: Reservation) => string
  isOwner: boolean
  onCancel: (id: string) => void
  compact?: boolean
}) {
  return (
    <div
      className={`rounded px-2 py-1 text-xs ${compact ? 'mb-0.5' : 'mb-1'}`}
      style={{ backgroundColor: userIdToColor(reservation.user_id) }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="truncate">
          {!compact && reservation.profile?.avatar_url && (
            <img src={reservation.profile.avatar_url} alt="" className="w-4 h-4 rounded-full inline mr-1" />
          )}
          <span className="font-medium">{getSeatName(reservation.seat_id)}</span>
          <span className="ml-1 opacity-80">
            {getTime(reservation)}
            {reservation.ends_at ? `〜${new Date(reservation.ends_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false })}` : '〜終日'}
          </span>
          {!compact && <span className="ml-1 opacity-70">{reservation.profile?.name ?? ''}</span>}
        </div>
        {isOwner && (
          <button
            onClick={() => onCancel(reservation.id)}
            className="text-white/70 hover:text-white text-[10px] shrink-0"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
