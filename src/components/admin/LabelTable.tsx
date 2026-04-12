import { supabase } from '../../lib/supabase'
import type { FloorLabel } from '../../hooks/useLabels'

type LabelTableProps = {
  labels: FloorLabel[]
  onDeleted: () => void
}

export function LabelTable({ labels, onDeleted }: LabelTableProps) {
  const handleDelete = async (labelId: string, labelText: string) => {
    if (!window.confirm(`ラベル「${labelText}」を削除しますか？`)) return

    const { error } = await supabase.from('floor_labels').delete().eq('id', labelId)

    if (error) {
      alert('削除に失敗しました')
      return
    }

    onDeleted()
  }

  return (
    <div className="space-y-3">
      {labels.map((label) => (
        <div
          key={label.id}
          className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3"
        >
          <div>
            <span className="font-medium">{label.text}</span>
            <span className="text-gray-500 text-sm ml-2">({label.width}×{label.height})</span>
          </div>
          <button
            onClick={() => handleDelete(label.id, label.text)}
            className="text-red-400 text-sm hover:text-red-300 transition-colors"
          >
            削除
          </button>
        </div>
      ))}
    </div>
  )
}
