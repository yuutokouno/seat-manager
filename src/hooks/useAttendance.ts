import { useState, useEffect } from 'react'

// Returns today's date in JST (UTC+9) as "YYYY-MM-DD"
function getTodayJST(): string {
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().split('T')[0]
}

export function useAttendance(userId: string | null) {
  const [atOffice, setAtOffice] = useState<boolean | null>(null)

  useEffect(() => {
    // Skip if user is not logged in
    if (!userId) return

    const date = getTodayJST()

    fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, date }),
    })
      .then((res) => res.json())
      .then((data: { at_office: boolean }) => {
        setAtOffice(data.at_office)
      })
      .catch(() => {
        // Silently fail — office detection is non-critical
        setAtOffice(false)
      })
  }, [userId])

  return { atOffice }
}
