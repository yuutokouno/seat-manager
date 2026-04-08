import { useParams } from 'react-router-dom'

export function SeatPage() {
  const { id } = useParams()

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <h1 className="text-xl font-bold">Seat {id}</h1>
    </div>
  )
}
