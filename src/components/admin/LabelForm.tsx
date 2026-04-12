import { useState } from 'react'
import { supabase } from '../../lib/supabase'

type LabelFormProps = {
  onAdded: () => void
}

export function LabelForm({ onAdded }: LabelFormProps) {
  const [text, setText] = useState('')
  const [width, setWidth] = useState(120)
  const [height, setHeight] = useState(60)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmed = text.trim()
    if (!trimmed) return

    const { error } = await supabase
      .from('floor_labels')
      .insert({ text: trimmed, x: 0, y: 0, width, height })

    if (error) {
      alert('ラベルの追加に失敗しました')
      return
    }

    setText('')
    setWidth(120)
    setHeight(60)
    onAdded()
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 mb-4 flex-wrap">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="ラベル（例: 入口）"
        className="flex-1 min-w-[120px] bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
      />
      <input
        type="number"
        value={width}
        onChange={(e) => setWidth(Number(e.target.value))}
        placeholder="幅"
        className="w-20 bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none text-center"
      />
      <input
        type="number"
        value={height}
        onChange={(e) => setHeight(Number(e.target.value))}
        placeholder="高さ"
        className="w-20 bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none text-center"
      />
      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
      >
        追加
      </button>
    </form>
  )
}
