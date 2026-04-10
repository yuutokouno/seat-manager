import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useSession } from '../hooks/useSession'
import { supabase } from '../lib/supabase'

type SeatInfo = {
  id: string
  name: string
  occupant: {
    user_id: string
    started_at: string
    profile: {
      name: string | null
      avatar_url: string | null
    } | null
  } | null
}

export function SeatPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isLoading: isAuthLoading } = useAuth()
  const { occupy, leave } = useSession()

  const [seat, setSeat] = useState<SeatInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const fetchSeat = async () => {
    if (!id) return

    const { data, error } = await supabase
      .from('seats')
      .select(`
        id,
        name,
        seat_sessions (
          user_id,
          started_at,
          profiles ( name, avatar_url )
        )
      `)
      .eq('name', id)
      .is('seat_sessions.ended_at', null)
      .single()

    if (error || !data) {
      setSeat(null)
      setIsLoading(false)
      return
    }

    const sessions = data.seat_sessions as Array<{
      user_id: string
      started_at: string
      profiles: { name: string | null; avatar_url: string | null } | null
    }>
    const active = sessions.length > 0 ? sessions[0] : null

    setSeat({
      id: data.id,
      name: data.name,
      occupant: active
        ? {
            user_id: active.user_id,
            started_at: active.started_at,
            profile: active.profiles,
          }
        : null,
    })
    setIsLoading(false)
  }

  useEffect(() => {
    fetchSeat()
  }, [id])

  const handleOccupy = async () => {
    if (!user || !seat) return

    const result = await occupy(seat.id, user.id)
    if (result.success) {
      setMessage('着席しました')
      await fetchSeat()
    } else {
      setMessage(result.error)
    }
  }

  const handleLeave = async () => {
    if (!user || !seat) return

    const result = await leave(seat.id, user.id)
    if (result.success) {
      setMessage('退席しました')
      await fetchSeat()
    } else {
      setMessage(result.error)
    }
  }

  if (isLoading || isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    )
  }

  if (!seat) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">席が見つかりません</p>
        <Link to="/" className="text-blue-400 underline">フロアマップに戻る</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2">{seat.name}</h1>

        {message ? (
          <p className="text-green-400 mt-4">{message}</p>
        ) : seat.occupant ? (
          <>
            <div className="flex items-center gap-3 mt-4">
              {seat.occupant.profile?.avatar_url && (
                <img
                  src={seat.occupant.profile.avatar_url}
                  alt=""
                  className="w-10 h-10 rounded-full"
                />
              )}
              <div>
                <p className="font-medium">
                  {seat.occupant.profile?.name ?? '不明'}
                </p>
                <p className="text-sm text-gray-400">
                  {new Date(seat.occupant.started_at).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {' '}から使用中
                </p>
              </div>
            </div>

            {user && seat.occupant.user_id === user.id && (
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
                onClick={() => navigate(`/login?redirect=/seat/${id}`)}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-medium transition-colors"
              >
                ログインして着席する
              </button>
            )}
          </>
        )}

        <Link
          to="/"
          className="block text-center mt-8 text-gray-400 text-sm underline"
        >
          フロアマップを見る
        </Link>
      </div>
    </div>
  )
}
