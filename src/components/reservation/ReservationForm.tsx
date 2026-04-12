import { useState, useMemo } from 'react'

type ReservationFormProps = {
  seatName: string
  onReserve: (date: string, startsAt: Date) => Promise<{ success: boolean; error: string | null }>
  onCancel: () => void
}

function getLocalToday(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function getCurrentTimeSlot(): string {
  const now = new Date()
  const h = now.getHours()
  const m = now.getMinutes() < 30 ? 30 : 0
  const nextH = now.getMinutes() < 30 ? h : h + 1
  return `${String(nextH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function generateAllTimeSlots(): string[] {
  const slots: string[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return slots
}

export function ReservationForm({ seatName, onReserve, onCancel }: ReservationFormProps) {
  const today = getLocalToday()
  const [date, setDate] = useState(today)
  const [time, setTime] = useState(getCurrentTimeSlot())
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const timeSlots = useMemo(() => {
    const allSlots = generateAllTimeSlots()
    if (date === today) {
      const currentSlot = getCurrentTimeSlot()
      return allSlots.filter((slot) => slot >= currentSlot)
    }
    return allSlots
  }, [date, today])

  const handleSubmit = async () => {
    setError(null)
    setIsSubmitting(true)

    const [hours, minutes] = time.split(':').map(Number)
    const startsAt = new Date(`${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`)

    const result = await onReserve(date, startsAt)
    if (!result.success) {
      setError(result.error)
    }
    setIsSubmitting(false)
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">{seatName} を予約</h2>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-400 block mb-1">日付</label>
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => {
              setDate(e.target.value)
              if (e.target.value === today) {
                setTime(getCurrentTimeSlot())
              } else {
                setTime('09:00')
              }
            }}
            className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm text-gray-400 block mb-1">開始時間</label>
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
          >
            {timeSlots.map((slot) => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full mt-4 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors"
      >
        {isSubmitting ? '予約中...' : '予約する'}
      </button>

      <button
        onClick={onCancel}
        className="w-full mt-2 text-gray-400 text-sm hover:text-white transition-colors py-2"
      >
        戻る
      </button>
    </div>
  )
}
