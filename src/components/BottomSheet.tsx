'use client'

import { useEffect, type ReactNode } from 'react'
import { motion, type PanInfo } from 'framer-motion'

const SHEET_SPRING = { type: 'spring' as const, stiffness: 420, damping: 38, mass: 0.85 }

type BottomSheetProps = {
  titleId?: string
  labelledBy?: string
  maxHeight?: string
  onClose: () => void
  children: ReactNode
}

export function BottomSheet({
  titleId,
  labelledBy,
  maxHeight = '90svh',
  onClose,
  children,
}: BottomSheetProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (info.offset.y > 110 || info.velocity.y > 700) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <motion.button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-page/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy ?? titleId}
        className="relative mx-auto flex w-full max-w-lg flex-col rounded-t-2xl bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-lg"
        style={{ maxHeight }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={SHEET_SPRING}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.02, bottom: 0.55 }}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sheet"
          className="flex w-full shrink-0 flex-col items-center pb-4"
        >
          <span className="h-1 w-10 rounded-full bg-muted" />
        </button>
        {children}
      </motion.div>
    </div>
  )
}
