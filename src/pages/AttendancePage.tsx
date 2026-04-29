import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AttendanceLog = {
  user_id: string
  date: string
}

type Profile = {
  id: string
  name: string | null
  avatar_url: string | null
}

type RankingEntry = {
  user_id: string
  name: string | null
  avatar_url: string | null
  count: number
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getMonthStart(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

// ---------------------------------------------------------------------------
// Streak calculation
// Weekdays (Mon–Fri): streak ends if attendance is missing.
// Weekends (Sat–Sun): skipped regardless.
// ---------------------------------------------------------------------------

function calcStreak(dates: string[]): number {
  const dateSet = new Set(dates)
  let streak = 0
  const d = new Date()

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const day = d.getDay() // 0=Sun, 6=Sat
    const dateStr = toLocalDateStr(d)

    if (day === 0 || day === 6) {
      d.setDate(d.getDate() - 1)
      continue
    }

    if (!dateSet.has(dateStr)) break

    streak++
    d.setDate(d.getDate() - 1)
  }

  return streak
}

// ---------------------------------------------------------------------------
// Heatmap helpers
// Build 53 weeks (371 cells) ending on today, padded with nulls for the future.
// ---------------------------------------------------------------------------

function buildHeatmapWeeks(attendedDates: Set<string>): (string | null)[][] {
  const today = new Date()
  // Align to Sunday (start of last week column)
  const endDate = new Date(today)
  endDate.setDate(today.getDate() + (6 - today.getDay()))

  const startDate = new Date(endDate)
  startDate.setDate(endDate.getDate() - 53 * 7 + 1)

  const weeks: (string | null)[][] = []
  const cursor = new Date(startDate)

  for (let w = 0; w < 53; w++) {
    const week: (string | null)[] = []
    for (let d = 0; d < 7; d++) {
      const dateStr = toLocalDateStr(cursor)
      // Future dates beyond today get null
      if (cursor > today) {
        week.push(null)
      } else {
        week.push(dateStr)
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }

  return weeks
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function HeatmapGrid({ attendedDates }: { attendedDates: Set<string> }) {
  const weeks = buildHeatmapWeeks(attendedDates)
  const DAY_LABELS = ['Sun', '', 'Tue', '', 'Thu', '', 'Sat']

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0.5 min-w-0">
        {/* Day-of-week labels */}
        <div className="flex flex-col gap-0.5 mr-1 mt-0">
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className="text-[9px] text-gray-500 h-3 flex items-center justify-end w-5"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Week columns */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((dateStr, di) => {
              if (dateStr === null) {
                // Future cell (blank placeholder)
                return <div key={di} className="w-3 h-3 rounded-sm bg-transparent" />
              }
              const attended = attendedDates.has(dateStr)
              return (
                <div
                  key={di}
                  className={`w-3 h-3 rounded-sm ${
                    attended ? 'bg-green-500' : 'bg-gray-700'
                  }`}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function AttendancePage() {
  const { user, isLoading: authLoading } = useAuth()

  // My attendance data (past 1 year)
  const [myDates, setMyDates] = useState<string[]>([])
  const [myLoading, setMyLoading] = useState(false)

  // Monthly ranking data
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [rankingLoading, setRankingLoading] = useState(true)

  const today = toLocalDateStr(new Date())
  const monthStart = getMonthStart()

  // Fetch the logged-in user's attendance for the past year
  useEffect(() => {
    if (!user) return

    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    const from = toLocalDateStr(oneYearAgo)

    setMyLoading(true)
    supabase
      .from('attendance_logs')
      .select('date')
      .eq('user_id', user.id)
      .gte('date', from)
      .lte('date', today)
      .then(({ data }) => {
        setMyDates((data ?? []).map((r) => r.date))
        setMyLoading(false)
      })
  }, [user, today])

  // Fetch this month's attendance for all users and join with profiles
  useEffect(() => {
    setRankingLoading(true)

    supabase
      .from('attendance_logs')
      .select('user_id, date, profiles(name, avatar_url)')
      .gte('date', monthStart)
      .lte('date', today)
      .then(({ data }) => {
        if (!data) {
          setRankingLoading(false)
          return
        }

        // Group by user_id
        const map = new Map<string, { count: number; profile: Profile | null }>()
        for (const row of data) {
          const existing = map.get(row.user_id)
          // profiles join returns object or array depending on FK direction;
          // handle both cases defensively.
          const profileRaw = row.profiles
          const profile: Profile | null = Array.isArray(profileRaw)
            ? (profileRaw[0] as Profile | undefined) ?? null
            : (profileRaw as Profile | null)

          if (existing) {
            existing.count++
          } else {
            map.set(row.user_id, { count: 1, profile })
          }
        }

        const entries: RankingEntry[] = Array.from(map.entries())
          .map(([user_id, { count, profile }]) => ({
            user_id,
            name: profile?.name ?? null,
            avatar_url: profile?.avatar_url ?? null,
            count,
          }))
          .sort((a, b) => b.count - a.count)

        setRanking(entries)
        setRankingLoading(false)
      })
  }, [monthStart, today])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    )
  }

  const attendedSet = new Set(myDates)
  const streak = calcStreak(myDates)

  // Current month label (e.g. "4月")
  const now = new Date()
  const monthLabel = `${now.getMonth() + 1}月`

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">出社統計</h1>
        <Link
          to="/"
          className="text-gray-400 text-sm hover:text-white transition-colors"
        >
          フロアマップに戻る
        </Link>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 1: My attendance heatmap (login required)                   */}
      {/* ------------------------------------------------------------------ */}
      {user ? (
        myLoading ? (
          <div className="bg-gray-900 rounded-xl p-4 mt-4">
            <p className="text-gray-400 text-sm">読み込み中...</p>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-400">
                自分の出社カレンダー（過去1年）
              </h2>
              <span className="text-sm font-semibold text-green-400">
                {myDates.length} 日出社
              </span>
            </div>
            <HeatmapGrid attendedDates={attendedSet} />
            <div className="flex items-center gap-2 mt-2 justify-end">
              <div className="w-3 h-3 rounded-sm bg-gray-700" />
              <span className="text-[10px] text-gray-500">なし</span>
              <div className="w-3 h-3 rounded-sm bg-green-500" />
              <span className="text-[10px] text-gray-500">出社</span>
            </div>
          </div>
        )
      ) : (
        <div className="bg-gray-900 rounded-xl p-4 mt-4 text-center">
          <p className="text-gray-400 text-sm">
            ログインすると自分の出社記録が見られます
          </p>
          <Link
            to="/login"
            className="inline-block mt-2 text-blue-400 text-sm hover:text-blue-300 transition-colors"
          >
            ログイン
          </Link>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Section 2: Streak (login required)                                  */}
      {/* ------------------------------------------------------------------ */}
      {user && (
        <div className="bg-gray-900 rounded-xl p-4 mt-4">
          <h2 className="text-sm font-medium text-gray-400 mb-2">
            連続出社日数
          </h2>
          <p className="text-2xl font-bold">
            🔥{' '}
            <span className="text-orange-400">{streak}</span>
            <span className="text-base font-medium text-gray-300 ml-1">
              日連続出社中
            </span>
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Section 3: Monthly ranking (visible to everyone)                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-gray-900 rounded-xl p-4 mt-4">
        <h2 className="text-sm font-medium text-gray-400 mb-3">
          {monthLabel}の出社ランキング
        </h2>

        {rankingLoading ? (
          <p className="text-gray-400 text-sm">読み込み中...</p>
        ) : ranking.length === 0 ? (
          <p className="text-gray-500 text-sm">今月の出社記録がありません</p>
        ) : (
          <ol className="space-y-2">
            {ranking.map((entry, index) => {
              const rank = index + 1
              const rankColor =
                rank === 1
                  ? 'text-yellow-400'
                  : rank === 2
                  ? 'text-gray-300'
                  : rank === 3
                  ? 'text-amber-600'
                  : 'text-gray-500'

              const isMe = user?.id === entry.user_id

              return (
                <li
                  key={entry.user_id}
                  className={`flex items-center gap-3 py-2 px-3 rounded-lg ${
                    isMe ? 'bg-gray-800' : ''
                  }`}
                >
                  {/* Rank number */}
                  <span
                    className={`text-sm font-bold w-6 text-center shrink-0 ${rankColor}`}
                  >
                    {rank}
                  </span>

                  {/* Avatar */}
                  {entry.avatar_url ? (
                    <img
                      src={entry.avatar_url}
                      alt={entry.name ?? ''}
                      className="w-8 h-8 rounded-full shrink-0 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-700 shrink-0 flex items-center justify-center text-xs text-gray-400">
                      {entry.name ? entry.name.charAt(0) : '?'}
                    </div>
                  )}

                  {/* Name */}
                  <span className="flex-1 text-sm text-white truncate">
                    {entry.name ?? '名無し'}
                    {isMe && (
                      <span className="ml-1.5 text-[10px] text-blue-400">
                        (自分)
                      </span>
                    )}
                  </span>

                  {/* Count */}
                  <span className="text-sm font-semibold text-green-400 shrink-0">
                    {entry.count} 日
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
