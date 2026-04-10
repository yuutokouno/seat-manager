import { supabase } from '../lib/supabase'

export function useSession() {
  const occupy = async (seatId: string, userId: string) => {
    const { error } = await supabase.from('seat_sessions').insert({
      seat_id: seatId,
      user_id: userId,
    })

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'すでに着席中の席があります' }
      }
      return { success: false, error: '着席に失敗しました' }
    }

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
