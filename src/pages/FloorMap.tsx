import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useSeats } from '../hooks/useSeats'
import { useLabels } from '../hooks/useLabels'
import { useSession } from '../hooks/useSession'
import { useReservations } from '../hooks/useReservations'
import { SeatGrid } from '../components/seat/SeatGrid'
import { BottomSheet } from '../components/ui/BottomSheet'
import { ReservationForm } from '../components/reservation/ReservationForm'
import { ReservationInfo } from '../components/reservation/ReservationInfo'
import { ReservationBanner } from '../components/reservation/ReservationBanner'
import { supabase } from '../lib/supabase'
import type { SeatWithSession } from '../hooks/useSeats'

type BottomSheetMode = 'info' | 'reserve'

export function FloorMap() {
  const { user, role } = useAuth()
  const { seats, isLoading } = useSeats()
  const { labels } = useLabels()
  const { occupy, leave } = useSession()
  const { reservations, reserve, cancelReservation } = useReservations()
  const navigate = useNavigate()

  const [selectedSeat, setSelectedSeat] = useState<SeatWithSession | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [sheetMode, setSheetMode] = useState<BottomSheetMode>('info')
  const [rotationStep, setRotationStep] = useState(0)

  const MAX_RESERVATIONS = 3
  const vacantCount = seats.filter((s) => s.occupant === null).length
  const myReservations = user
    ? reservations.filter((r) => r.user_id === user.id)
    : []
  const remainingSlots = MAX_RESERVATIONS - myReservations.length

  const currentSeatId = user
    ? seats.find((s) => s.occupant?.user_id === user.id)?.id ?? null
    : null

  const getReservation = (seatId: string) =>
    reservations.find((r) => r.seat_id === seatId) ?? null

  const handleOccupy = async () => {
    if (!user || !selectedSeat) return

    const result = await occupy(selectedSeat.id, user.id)
    if (result.success) {
      setActionMessage('着席しました')
      setTimeout(() => {
        setActionMessage(null)
        setSelectedSeat(null)
      }, 1500)
    } else {
      setActionMessage(result.error)
    }
  }

  const handleLeave = async () => {
    if (!user || !selectedSeat) return

    const result = await leave(selectedSeat.id, user.id)
    if (result.success) {
      setActionMessage('退席しました')
      setTimeout(() => {
        setActionMessage(null)
        setSelectedSeat(null)
      }, 1500)
    } else {
      setActionMessage(result.error)
    }
  }

  const handleReserve = async (date: string, startsAt: Date) => {
    if (!user || !selectedSeat) return { success: false, error: 'エラー' }

    const result = await reserve(selectedSeat.id, user.id, date, startsAt)
    if (result.success) {
      setActionMessage('予約しました')
      setSheetMode('info')
      setTimeout(() => {
        setActionMessage(null)
        setSelectedSeat(null)
      }, 1500)
    }
    return result
  }

  const handleCancelReservation = async (reservationId: string) => {
    const result = await cancelReservation(reservationId)
    if (result.success) {
      setActionMessage('予約を取り消しました')
      setTimeout(() => {
        setActionMessage(null)
        setSelectedSeat(null)
      }, 1500)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      {/* Reservation Banner */}
      <ReservationBanner currentSeatId={currentSeatId} reservations={reservations} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Seat Manager" className="w-16 h-16" />
          <span className="text-lg font-bold">Seat Manager</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className="bg-green-600 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
            残り {vacantCount} 席
          </span>
          {user && (
            <span className="bg-yellow-600 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
              予約 {remainingSlots}/{MAX_RESERVATIONS}
            </span>
          )}
          <button
            onClick={() => navigate('/timetable')}
            className="text-gray-400 text-xs hover:text-white transition-colors"
          >
            予約一覧
          </button>
          {role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="text-gray-400 text-xs hover:text-white transition-colors"
            >
              管理
            </button>
          )}
          {user ? (
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-gray-400 text-xs hover:text-white transition-colors"
            >
              ログアウト
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="text-gray-400 text-xs hover:text-white transition-colors"
            >
              ログイン
            </button>
          )}
        </div>
      </div>

      {/* Seat Grid */}
      <div className="bg-gray-900 rounded-xl p-4">
        <div className="flex justify-end mb-2">
          <button
            onClick={() => setRotationStep((s) => s + 1)}
            className="text-gray-400 text-sm hover:text-white transition-colors px-2 py-1"
          >
            🔄 回転
          </button>
        </div>
        <SeatGrid
          seats={seats}
          labels={labels}
          reservations={reservations}
          rotation={rotationStep * 90}
          onSelect={(seat) => {
            setSelectedSeat(seat)
            setSheetMode('info')
            setActionMessage(null)
          }}
        />

        {/* Legend */}
        <div className="flex gap-4 mt-4 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-green-600 rounded-sm" />
            <span className="text-gray-400 text-xs">空席</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-gray-700 rounded-sm" />
            <span className="text-gray-400 text-xs">使用中</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-yellow-600 rounded-sm" />
            <span className="text-gray-400 text-xs">予約済み</span>
          </div>
        </div>
      </div>

      {/* My Current Seat */}
      {user && currentSeatId && (() => {
        const currentSeat = seats.find((s) => s.id === currentSeatId)
        if (!currentSeat || !currentSeat.occupant) return null
        const startTime = new Date(currentSeat.occupant.started_at).toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
        })
        return (
          <div className="mt-4 bg-gray-900 rounded-xl p-4">
            <h2 className="text-sm font-medium text-gray-400 mb-3">現在の席</h2>
            <div className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                {currentSeat.occupant.profile?.avatar_url && (
                  <img src={currentSeat.occupant.profile.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                )}
                <div>
                  <span className="font-medium">{currentSeat.name}</span>
                  <span className="text-gray-400 text-sm ml-2">{startTime}〜</span>
                </div>
              </div>
              <button
                onClick={async () => {
                  const result = await leave(currentSeatId, user.id)
                  if (result.success) {
                    setActionMessage('退席しました')
                    setTimeout(() => setActionMessage(null), 1500)
                  }
                }}
                className="text-red-400 text-sm hover:text-red-300 transition-colors"
              >
                退席
              </button>
            </div>
          </div>
        )
      })()}

      {/* My Reservations */}
      {user && myReservations.length > 0 && (
        <div className="mt-4 bg-gray-900 rounded-xl p-4">
          <h2 className="text-sm font-medium text-gray-400 mb-3">自分の予約</h2>
          <div className="space-y-2">
            {myReservations.map((r) => {
              const seatName = seats.find((s) => s.id === r.seat_id)?.name ?? '不明'
              const startsAt = new Date(r.starts_at)
              const dateStr = startsAt.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
              const timeStr = startsAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })

              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3"
                >
                  <div>
                    <span className="font-medium">{seatName}</span>
                    <span className="text-gray-400 text-sm ml-2">{dateStr} {timeStr}〜</span>
                  </div>
                  <button
                    onClick={() => handleCancelReservation(r.id)}
                    className="text-red-400 text-sm hover:text-red-300 transition-colors"
                  >
                    取消
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Bottom Sheet */}
      <BottomSheet
        isOpen={selectedSeat !== null}
        onClose={() => {
          setSelectedSeat(null)
          setActionMessage(null)
          setSheetMode('info')
        }}
      >
        {selectedSeat && (
          <div>
            {actionMessage ? (
              <>
                <h2 className="text-lg font-bold mb-1">{selectedSeat.name}</h2>
                <p className="text-green-400 mt-4">{actionMessage}</p>
              </>
            ) : sheetMode === 'reserve' ? (
              <ReservationForm
                seatName={selectedSeat.name}
                onReserve={handleReserve}
                onCancel={() => setSheetMode('info')}
              />
            ) : selectedSeat.occupant ? (
              <>
                <h2 className="text-lg font-bold mb-1">{selectedSeat.name}（使用中）</h2>
                <div className="flex items-center gap-3 mt-4">
                  {selectedSeat.occupant.profile?.avatar_url && (
                    <img
                      src={selectedSeat.occupant.profile.avatar_url}
                      alt=""
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-medium">
                      {selectedSeat.occupant.profile?.name ?? '不明'}
                    </p>
                    <p className="text-sm text-gray-400">
                      {new Date(selectedSeat.occupant.started_at).toLocaleTimeString('ja-JP', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' '}から使用中
                    </p>
                  </div>
                </div>

                {user && selectedSeat.occupant.user_id === user.id && (
                  <button
                    onClick={handleLeave}
                    className="w-full mt-6 bg-red-600 hover:bg-red-500 text-white py-3 rounded-lg font-medium transition-colors"
                  >
                    退席する
                  </button>
                )}
              </>
            ) : (() => {
              const reservation = getReservation(selectedSeat.id)
              if (reservation) {
                const isOwner = user?.id === reservation.user_id
                const isBeforeStartTime = new Date() < new Date(reservation.starts_at)
                return (
                  <>
                    <h2 className="text-lg font-bold mb-1">{selectedSeat.name}（予約済み）</h2>
                    <ReservationInfo
                      reservation={reservation}
                      isOwner={isOwner}
                      onCancel={() => handleCancelReservation(reservation.id)}
                      onOccupy={handleOccupy}
                      isBeforeStartTime={isBeforeStartTime}
                    />
                    {user && isBeforeStartTime && !isOwner && (
                      <button
                        onClick={() => setSheetMode('reserve')}
                        className="w-full mt-2 bg-yellow-600 hover:bg-yellow-500 text-white py-3 rounded-lg font-medium transition-colors"
                      >
                        別の時間で予約する
                      </button>
                    )}
                  </>
                )
              }

              return (
                <>
                  <h2 className="text-lg font-bold mb-1">{selectedSeat.name}（空席）</h2>
                  {user ? (
                    <>
                      <button
                        onClick={handleOccupy}
                        className="w-full mt-4 bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg font-medium transition-colors"
                      >
                        この席を使う
                      </button>
                      <button
                        onClick={() => setSheetMode('reserve')}
                        className="w-full mt-2 bg-yellow-600 hover:bg-yellow-500 text-white py-3 rounded-lg font-medium transition-colors"
                      >
                        この席を予約する
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => navigate('/login')}
                      className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-medium transition-colors"
                    >
                      ログインして着席する
                    </button>
                  )}
                </>
              )
            })()}
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
