import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type SeatWithSession = {
  id: string
  name: string
  floor: string | null
  occupant: {
    user_id: string
    started_at: string
    profile: {
      name: string | null
      avatar_url: string | null
    } | null
  } | null
}

export function useSeats() {
  const [seats, setSeats] = useState<SeatWithSession[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchSeats = async () => {
    const { data, error } = await supabase
      .from('seats')
      .select(`
        id,
        name,
        floor,
        seat_sessions (
          user_id,
          started_at,
          profiles ( name, avatar_url )
        )
      `)
      .is('seat_sessions.ended_at', null)
      .order('name')

    if (error) {
      console.error('Failed to fetch seats:', error.message)
      return
    }

    const mapped: SeatWithSession[] = (data ?? []).map((seat) => {
      const sessions = seat.seat_sessions as Array<{
        user_id: string
        started_at: string
        profiles: { name: string | null; avatar_url: string | null } | null
      }>
      const active = sessions.length > 0 ? sessions[0] : null

      return {
        id: seat.id,
        name: seat.name,
        floor: seat.floor,
        occupant: active
          ? {
              user_id: active.user_id,
              started_at: active.started_at,
              profile: active.profiles,
            }
          : null,
      }
    })

    setSeats(mapped)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchSeats()

    // Subscribe to realtime changes on seat_sessions
    const channel = supabase
      .channel('seat_sessions_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'seat_sessions' },
        () => {
          fetchSeats()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { seats, isLoading }
}
