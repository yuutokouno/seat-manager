import { supabase } from '../lib/supabase'

export function useSession() {
  const leaveCurrentSeat = async (userId: string) => {
    await supabase
      .from('seat_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('ended_at', null)
  }

  const markReservationSeated = async (seatId: string, userId: string) => {
    await supabase
      .from('seat_reservations')
      .update({ seated: true })
      .eq('seat_id', seatId)
      .eq('user_id', userId)
      .is('canceled_at', null)
  }

  const occupy = async (seatId: string, userId: string) => {
    await leaveCurrentSeat(userId)

    const { error } = await supabase.from('seat_sessions').insert({
      seat_id: seatId,
      user_id: userId,
    })

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'この席は既に使用中です' }
      }
      return { success: false, error: '着席に失敗しました' }
    }

    await markReservationSeated(seatId, userId)

    return { success: true, error: null }
  }

  const leave = async (seatId: string, userId: string) => {
    const { error } = await supabase
      .from('seat_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('seat_id', seatId)
      .eq('user_id', userId)
      .is('ended_at', null)

    if (error) {
      return { success: false, error: '退席に失敗しました' }
    }

    return { success: true, error: null }
  }

  return { occupy, leave }
}
