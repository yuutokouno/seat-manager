interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

export default {
  async scheduled(event: { cron: string }, env: Env, ctx: ExecutionContext) {
    const headers: Record<string, string> = {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    }

    const headersMinimal: Record<string, string> = {
      ...headers,
      'Prefer': 'return=minimal',
    }

    try {
      // Daily reset: close all active sessions + past reservations (runs at 0:00 JST / 15:00 UTC)
      if (event.cron === '0 15 * * *' || event.cron === '0 16 * * *') {
        const now = new Date()
        const today = now.toISOString().split('T')[0]

        // Close all active seat sessions
        const sessionResponse = await fetch(
          `${env.SUPABASE_URL}/rest/v1/seat_sessions?ended_at=is.null`,
          {
            method: 'PATCH',
            headers: headersMinimal,
            body: JSON.stringify({
              ended_at: now.toISOString(),
            }),
          }
        )

        if (!sessionResponse.ok) {
          console.error('Failed to reset seats:', await sessionResponse.text())
        } else {
          console.log('All seats reset successfully')
        }

        // Close all past reservations that are still active
        const reservationResponse = await fetch(
          `${env.SUPABASE_URL}/rest/v1/seat_reservations?canceled_at=is.null&date=lt.${today}`,
          {
            method: 'PATCH',
            headers: headersMinimal,
            body: JSON.stringify({
              canceled_at: now.toISOString(),
              cancel_type: 'auto',
            }),
          }
        )

        if (!reservationResponse.ok) {
          console.error('Failed to close past reservations:', await reservationResponse.text())
        } else {
          console.log('Past reservations closed successfully')
        }
      }

      // Runs every 10 minutes
      if (event.cron === '*/10 * * * *') {
        const now = new Date()

        // 1. Auto-cancel expired reservations (starts_at + 30min passed, not seated)
        const cancelResponse = await fetch(
          `${env.SUPABASE_URL}/rest/v1/seat_reservations?canceled_at=is.null&seated=eq.false&expires_at=lt.${now.toISOString()}`,
          {
            method: 'PATCH',
            headers: headersMinimal,
            body: JSON.stringify({
              canceled_at: now.toISOString(),
              cancel_type: 'auto',
            }),
          }
        )

        if (!cancelResponse.ok) {
          console.error('Failed to auto-cancel reservations:', await cancelResponse.text())
        } else {
          console.log('Expired reservations auto-canceled')
        }

        // 2. Evict occupants who are sitting in a reserved seat past the reservation start time
        // Find active reservations where starts_at has passed and seated=false
        const reservationsResponse = await fetch(
          `${env.SUPABASE_URL}/rest/v1/seat_reservations?select=id,seat_id,user_id,starts_at&canceled_at=is.null&seated=eq.false&starts_at=lt.${now.toISOString()}&expires_at=gt.${now.toISOString()}`,
          {
            method: 'GET',
            headers,
          }
        )

        if (reservationsResponse.ok) {
          const activeReservations = await reservationsResponse.json() as Array<{
            id: string
            seat_id: string
            user_id: string
            starts_at: string
          }>

          for (const reservation of activeReservations) {
            // Check if someone else is sitting in this seat
            const sessionResponse = await fetch(
              `${env.SUPABASE_URL}/rest/v1/seat_sessions?select=id,user_id&seat_id=eq.${reservation.seat_id}&ended_at=is.null`,
              {
                method: 'GET',
                headers,
              }
            )

            if (!sessionResponse.ok) continue

            const sessions = await sessionResponse.json() as Array<{
              id: string
              user_id: string
            }>

            const occupant = sessions[0]
            if (!occupant) continue
            if (occupant.user_id === reservation.user_id) continue // Reservation holder is sitting

            // Someone else is sitting → evict them
            const evictResponse = await fetch(
              `${env.SUPABASE_URL}/rest/v1/seat_sessions?id=eq.${occupant.id}`,
              {
                method: 'PATCH',
                headers: headersMinimal,
                body: JSON.stringify({
                  ended_at: now.toISOString(),
                }),
              }
            )

            if (evictResponse.ok) {
              console.log(`Evicted user ${occupant.user_id} from seat ${reservation.seat_id} for reservation ${reservation.id}`)

              // Record penalty for the evicted user by creating an auto-canceled "phantom" reservation
              await fetch(
                `${env.SUPABASE_URL}/rest/v1/seat_reservations`,
                {
                  method: 'POST',
                  headers: headersMinimal,
                  body: JSON.stringify({
                    seat_id: reservation.seat_id,
                    user_id: occupant.user_id,
                    date: now.toISOString().split('T')[0],
                    starts_at: now.toISOString(),
                    expires_at: now.toISOString(),
                    canceled_at: now.toISOString(),
                    cancel_type: 'auto',
                    seated: false,
                  }),
                }
              )

              console.log(`Penalty recorded for user ${occupant.user_id} (overstay)`)
            }
          }
        }
      }
    } catch (e) {
      console.error('Scheduled worker error:', e)
    }
  },
} satisfies ExportedHandler<Env>
