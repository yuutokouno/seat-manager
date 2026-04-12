import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'

type QRCodePreviewProps = {
  seatName: string
}

const BASE_URL = import.meta.env.VITE_APP_URL ?? window.location.origin

export function QRCodePreview({ seatName }: QRCodePreviewProps) {
  const canvasRef = useRef<HTMLDivElement>(null)

  const url = `${BASE_URL}/seat/${seatName}`

  const handleDownload = () => {
    const canvas = canvasRef.current?.querySelector('canvas')
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `seat-${seatName}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="flex items-center gap-3">
      <div ref={canvasRef}>
        <QRCodeCanvas value={url} size={48} bgColor="#1f2937" fgColor="#ffffff" />
      </div>
      <button
        onClick={handleDownload}
        className="text-blue-400 text-sm hover:text-blue-300 transition-colors"
      >
        DL
      </button>
    </div>
  )
}
