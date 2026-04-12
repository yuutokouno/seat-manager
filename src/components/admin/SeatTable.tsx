import { supabase } from '../../lib/supabase'
import { QRCodePreview } from './QRCodePreview'
import type { SeatWithSession } from '../../hooks/useSeats'

type SeatTableProps = {
  seats: SeatWithSession[]
  onDeleted: () => void
}

export function SeatTable({ seats, onDeleted }: SeatTableProps) {
  const handleDelete = async (seatId: string, seatName: string) => {
    if (!window.confirm(`席「${seatName}」を削除しますか？`)) return

    const { error } = await supabase.from('seats').delete().eq('id', seatId)

    if (error) {
      alert('削除に失敗しました')
      return
    }

    onDeleted()
  }

  return (
    <div className="space-y-3">
      {seats.map((seat) => (
        <div
          key={seat.id}
          className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3"
        >
          <span className="font-medium">{seat.name}</span>
          <div className="flex items-center gap-4">
            <QRCodePreview seatName={seat.name} />
            <button
              onClick={() => handleDelete(seat.id, seat.name)}
              className="text-red-400 text-sm hover:text-red-300 transition-colors"
            >
              削除
            </button>
          </div>
        </div>
      ))}
      {seats.length === 0 && (
        <p className="text-gray-500 text-center py-8">席がありません</p>
      )}
    </div>
  )
}
