import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useSeats } from '../hooks/useSeats'
import { useSession } from '../hooks/useSession'
import { SeatGrid } from '../components/seat/SeatGrid'
import { BottomSheet } from '../components/ui/BottomSheet'
import { supabase } from '../lib/supabase'
import type { SeatWithSession } from '../hooks/useSeats'

export function FloorMap() {
  const { user } = useAuth()
  const { seats, isLoading } = useSeats()
  const { occupy, leave } = useSession()
  const navigate = useNavigate()

  const [selectedSeat, setSelectedSeat] = useState<SeatWithSession | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const vacantCount = seats.filter((s) => s.occupant === null).length

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">🏢 3F フロア</h1>
        <div className="flex items-center gap-3">
          <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
            残り {vacantCount} 席
          </span>
          {user ? (
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-gray-400 text-sm hover:text-white transition-colors"
            >
              ログアウト
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="text-gray-400 text-sm hover:text-white transition-colors"
            >
              ログイン
            </button>
          )}
        </div>
      </div>

      {/* Seat Grid */}
      <div className="bg-gray-900 rounded-xl p-4">
        <SeatGrid seats={seats} onSelect={setSelectedSeat} />

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
        </div>
      </div>

      {/* Bottom Sheet */}
      <BottomSheet
        isOpen={selectedSeat !== null}
        onClose={() => {
          setSelectedSeat(null)
          setActionMessage(null)
        }}
      >
        {selectedSeat && (
          <div>
            <h2 className="text-lg font-bold mb-1">{selectedSeat.name}</h2>

            {actionMessage ? (
              <p className="text-green-400 mt-4">{actionMessage}</p>
            ) : selectedSeat.occupant ? (
              <>
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
            ) : (
              <>
                <p className="text-gray-400 text-sm">空席</p>

                {user ? (
                  <button
                    onClick={handleOccupy}
                    className="w-full mt-6 bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg font-medium transition-colors"
                  >
                    この席を使う
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-medium transition-colors"
                  >
                    ログインして着席する
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
