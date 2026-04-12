import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type FloorLabel = {
  id: string
  text: string
  x: number
  y: number
  width: number
  height: number
}

export function useLabels() {
  const [labels, setLabels] = useState<FloorLabel[]>([])

  const fetchLabels = async () => {
    const { data } = await supabase
      .from('floor_labels')
      .select('*')
      .order('text')

    const mapped: FloorLabel[] = (data ?? []).map((l) => ({
      id: l.id,
      text: l.text,
      x: l.x ?? 0,
      y: l.y ?? 0,
      width: l.width ?? 120,
      height: l.height ?? 60,
    }))
    setLabels(mapped)
  }

  useEffect(() => {
    fetchLabels()
  }, [])

  return { labels, refetchLabels: fetchLabels }
}
