type Env = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env) {
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/seat_sessions?ended_at=is.null`,
      {
        method: 'PATCH',
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
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
  },
}
