import type { ReactNode } from 'react'

type BottomSheetProps = {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

export function BottomSheet({ isOpen, onClose, children }: BottomSheetProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl p-6 z-50 max-h-[60vh]">
        {/* Handle bar */}
        <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
        {children}
      </div>
    </>
  )
}
