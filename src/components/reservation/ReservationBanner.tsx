import { useEffect, useState } from 'react'
import type { Reservation } from '../../hooks/useReservations'

type ReservationBannerProps = {
  currentSeatId: string | null
  reservations: Reservation[]
}

export function ReservationBanner({ currentSeatId, reservations }: ReservationBannerProps) {
  const [showBanner, setShowBanner] = useState(false)
  const [bannerTime, setBannerTime] = useState<string | null>(null)

  useEffect(() => {
    if (!currentSeatId) {
      setShowBanner(false)
      return
    }

    const seatReservation = reservations.find(
      (r) => r.seat_id === currentSeatId && !r.seated
    )

    if (!seatReservation) {
      setShowBanner(false)
      return
    }

    const startsAt = new Date(seatReservation.starts_at)
    const warningTime = new Date(startsAt.getTime() - 10 * 60 * 1000) // 10分前
    const now = new Date()

    if (now >= warningTime) {
      setShowBanner(true)
      setBannerTime(
        startsAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
      )
      return
    }

    const delay = warningTime.getTime() - now.getTime()
    const timer = setTimeout(() => {
      setShowBanner(true)
      setBannerTime(
        startsAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
      )
    }, delay)

    return () => clearTimeout(timer)
  }, [currentSeatId, reservations])

  if (!showBanner) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-yellow-600 text-white text-center py-3 px-4 text-sm font-medium">
      この席は {bannerTime} から予約されています。移動してください
    </div>
  )
}
