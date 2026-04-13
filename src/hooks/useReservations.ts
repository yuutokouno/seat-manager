import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type Reservation = {
  id: string
  seat_id: string
  user_id: string
  date: string
  starts_at: string
  ends_at: string | null
  expires_at: string
  seated: boolean
  canceled_at: string | null
  cancel_type: string | null
  profile: {
    name: string | null
    avatar_url: string | null
  } | null
}

export function useReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([])

  const fetchReservations = async () => {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('seat_reservations')
      .select('*, profiles ( name, avatar_url )')
      .gte('date', today)
      .is('canceled_at', null)

    if (error) {
      console.error('Failed to fetch reservations:', error.message)
      return
    }

    const mapped: Reservation[] = (data ?? []).map((r) => ({
      id: r.id,
      seat_id: r.seat_id,
      user_id: r.user_id,
      date: r.date,
      starts_at: r.starts_at,
      ends_at: r.ends_at ?? null,
      expires_at: r.expires_at,
      seated: r.seated ?? false,
      canceled_at: r.canceled_at,
      cancel_type: r.cancel_type,
      profile: r.profiles as { name: string | null; avatar_url: string | null } | null,
    }))

    setReservations(mapped)
  }

  const MAX_RESERVATIONS = 3
  const PENALTY_THRESHOLD = 3
  const PENALTY_DAYS = 7

  const checkPenalty = async (userId: string) => {
    const since = new Date()
    since.setDate(since.getDate() - PENALTY_DAYS)

    const { count } = await supabase
      .from('seat_reservations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('cancel_type', 'auto')
      .gte('canceled_at', since.toISOString())

    return (count ?? 0) >= PENALTY_THRESHOLD
  }

  const reserve = async (seatId: string, userId: string, date: string, startsAt: Date, endsAt?: Date | null) => {
    const isPenalized = await checkPenalty(userId)
    if (isPenalized) {
      return { success: false, error: `直近${PENALTY_DAYS}日間に${PENALTY_THRESHOLD}回以上の無断キャンセルがあるため、予約できません` }
    }

    const { count } = await supabase
      .from('seat_reservations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('canceled_at', null)
      .eq('seated', false)

    if (count !== null && count >= MAX_RESERVATIONS) {
      return { success: false, error: `予約は${MAX_RESERVATIONS}枠までです` }
    }

    // Check if user already has a reservation on the same day at or before this time
    const { data: sameDayReservations } = await supabase
      .from('seat_reservations')
      .select('starts_at')
      .eq('user_id', userId)
      .eq('date', date)
      .is('canceled_at', null)

    if (sameDayReservations && sameDayReservations.length > 0) {
      const hasEarlierReservation = sameDayReservations.some(
        (r) => new Date(r.starts_at) <= startsAt
      )
      if (hasEarlierReservation) {
        return { success: false, error: '同じ日の既存予約以降の時間は予約できません' }
      }
    }

    // Check if this seat already has a reservation at or before this time on the same day
    const { data: seatReservations } = await supabase
      .from('seat_reservations')
      .select('starts_at')
      .eq('seat_id', seatId)
      .eq('date', date)
      .is('canceled_at', null)

    if (seatReservations && seatReservations.length > 0) {
      const hasEarlierSeatReservation = seatReservations.some(
        (r) => new Date(r.starts_at) <= startsAt
      )
      if (hasEarlierSeatReservation) {
        return { success: false, error: 'この席は既に予約されている時間以降は予約できません' }
      }
    }

    const expiresAt = new Date(startsAt.getTime() + 30 * 60 * 1000)

    // If no end time specified, auto-limit to the next reservation on the same seat
    let effectiveEndsAt = endsAt ? endsAt.toISOString() : null
    if (!endsAt && seatReservations && seatReservations.length > 0) {
      const laterReservations = seatReservations
        .filter((r) => new Date(r.starts_at) > startsAt)
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())

      if (laterReservations.length > 0) {
        effectiveEndsAt = laterReservations[0].starts_at
      }
    }

    const { error } = await supabase.from('seat_reservations').insert({
      seat_id: seatId,
      user_id: userId,
      date,
      starts_at: startsAt.toISOString(),
      ends_at: effectiveEndsAt,
      expires_at: expiresAt.toISOString(),
    })

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'この席は既に予約されています' }
      }
      return { success: false, error: '予約に失敗しました' }
    }

    await fetchReservations()
    return { success: true, error: null }
  }

  const cancelReservation = async (reservationId: string) => {
    const { error } = await supabase
      .from('seat_reservations')
      .update({
        canceled_at: new Date().toISOString(),
        cancel_type: 'manual',
      })
      .eq('id', reservationId)

    if (error) {
      return { success: false, error: '取り消しに失敗しました' }
    }

    await fetchReservations()
    return { success: true, error: null }
  }

  useEffect(() => {
    fetchReservations()

    const channel = supabase
      .channel('seat_reservations_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'seat_reservations' },
        () => { fetchReservations() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return { reservations, reserve, cancelReservation, refetchReservations: fetchReservations }
}
