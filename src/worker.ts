type Env = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    const headers = {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    }

    // Daily reset: close all active sessions (runs at 0:00 JST / 15:00 UTC)
    if (event.cron === '0 15 * * *') {
      const response = await fetch(
        `${env.SUPABASE_URL}/rest/v1/seat_sessions?ended_at=is.null`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            ended_at: new Date().toISOString(),
          }),
        }
      )

      if (!response.ok) {
        console.error('Failed to reset seats:', await response.text())
      } else {
        console.log('All seats reset successfully')
      }
    }

    // Auto-cancel expired reservations (runs every 10 minutes)
    if (event.cron === '*/10 * * * *') {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

      const response = await fetch(
        `${env.SUPABASE_URL}/rest/v1/seat_reservations?canceled_at=is.null&seated=eq.false&expires_at=lt.${thirtyMinAgo}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            canceled_at: new Date().toISOString(),
            cancel_type: 'auto',
          }),
        }
      )

      if (!response.ok) {
        console.error('Failed to auto-cancel reservations:', await response.text())
      } else {
        console.log('Expired reservations auto-canceled')
      }
    }
  },
}
