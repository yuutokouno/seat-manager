import { useState } from 'react'
import { supabase } from '../../lib/supabase'

type SeatFormProps = {
  onAdded: () => void
}

export function SeatForm({ onAdded }: SeatFormProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmed = name.trim()
    if (!trimmed) return

    const { error: insertError } = await supabase
      .from('seats')
      .insert({ name: trimmed, x: 0, y: 0 })

    if (insertError) {
      if (insertError.code === '23505') {
        setError('この席名は既に使われています')
      } else {
        setError('席の追加に失敗しました')
      }
      return
    }

    setName('')
    onAdded()
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="席名（例: A-1）"
        className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
      />
      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
      >
        追加
      </button>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </form>
  )
}
