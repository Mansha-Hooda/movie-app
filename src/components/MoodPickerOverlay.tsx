'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { moodLabel } from '@/lib/titles/moods'
import type { MoodCardData } from '@/lib/moods/picker'

type MoodPickerOverlayProps = {
  cards: MoodCardData[]
  onSelect: (mood: string) => void
  onDismiss: () => void
}

const SWIPE_OFFSET = 110
const SWIPE_VELOCITY = 650

function PosterFan({ posters }: { posters: (string | null)[] }) {
  const slots = [posters[0] ?? null, posters[1] ?? null, posters[2] ?? null]
  const layout = [
    { z: 1, rotate: -14, x: '-28%', y: 10, scale: 0.88 },
    { z: 3, rotate: 0, x: '0%', y: 0, scale: 1 },
    { z: 2, rotate: 13, x: '28%', y: 12, scale: 0.88 },
  ]

  return (
    <div className="relative mx-auto mt-6 h-52 w-[78%]">
      {layout.map((style, index) => (
        <div
          key={index}
          className="absolute top-0 left-1/2 h-full w-[42%] origin-bottom overflow-hidden rounded-xl border border-white/25 shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
          style={{
            zIndex: style.z,
            transform: `translateX(-50%) translateX(${style.x}) translateY(${style.y}px) rotate(${style.rotate}deg) scale(${style.scale})`,
            background:
              'linear-gradient(160deg, #2a2633 0%, #1c1a20 45%, #332f3d 100%)',
          }}
        >
          {slots[index] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={slots[index] ?? ''}
              alt=""
              draggable={false}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
      ))}
    </div>
  )
}

function GlassCard({
  card,
  peek,
}: {
  card: MoodCardData
  peek?: boolean
}) {
  return (
    <div
      className="h-full w-full overflow-hidden rounded-[28px] border border-white/25 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
      style={{
        background: `linear-gradient(165deg, ${card.gradient.from} 0%, ${card.gradient.via} 42%, ${card.gradient.to} 100%)`,
        opacity: peek ? 0.95 : 1,
      }}
    >
      <div
        className="h-full w-full px-6 pt-7 pb-8"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 38%, rgba(0,0,0,0.18) 100%)',
        }}
      >
        <h3 className="text-center text-[1.65rem] font-semibold tracking-tight text-white drop-shadow-sm">
          {moodLabel(card.mood)}
        </h3>
        <PosterFan posters={card.posters} />
      </div>
    </div>
  )
}

export function MoodPickerOverlay({
  cards,
  onSelect,
  onDismiss,
}: MoodPickerOverlayProps) {
  const [index, setIndex] = useState(0)
  const [exitX, setExitX] = useState(0)
  const dragDistance = useRef(0)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  const remaining = cards.slice(index)
  const front = remaining[0]
  const behind = remaining.slice(1, 3)

  function advance() {
    const next = index + 1
    if (next >= cards.length) {
      onDismiss()
      return
    }
    setIndex(next)
    setExitX(0)
  }

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const shouldSwipe =
      Math.abs(info.offset.x) > SWIPE_OFFSET || Math.abs(info.velocity.x) > SWIPE_VELOCITY

    if (shouldSwipe) {
      setExitX(info.offset.x > 0 ? 480 : -480)
    }
  }

  if (!front) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col px-6 pt-[max(3.5rem,env(safe-area-inset-top))] pb-10">
      <div className="absolute inset-0 bg-black/70" aria-hidden />

      <div className="relative z-10 mx-auto w-full max-w-sm flex-1">
        <h2 className="mb-8 max-w-[16rem] text-[1.65rem] font-semibold leading-tight tracking-tight text-white">
          Welcome back, what&apos;s your mood for today?
        </h2>

        <div className="relative mx-auto h-[26.5rem] w-full max-w-[19.5rem]">
          {behind
            .map((card, behindIndex) => {
              const depth = behindIndex + 1
              return (
                <div
                  key={card.mood}
                  className="absolute inset-0"
                  style={{
                    transform: `translateY(${depth * 14}px) scale(${1 - depth * 0.045})`,
                    zIndex: 2 - behindIndex,
                  }}
                >
                  <GlassCard card={card} peek />
                </div>
              )
            })
            .reverse()}

          <AnimatePresence mode="wait">
            <motion.button
              key={front.mood}
              type="button"
              className="absolute inset-0 z-10 cursor-grab touch-none appearance-none border-0 bg-transparent p-0 text-left active:cursor-grabbing"
              style={{ touchAction: 'none' }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.85}
              onDragStart={() => {
                dragDistance.current = 0
              }}
              onDrag={(_, info) => {
                dragDistance.current = info.offset.x
              }}
              onDragEnd={handleDragEnd}
              onTap={() => {
                if (Math.abs(dragDistance.current) < 10) {
                  onSelect(front.mood)
                }
              }}
              initial={{ scale: 0.96, opacity: 0.8 }}
              animate={{
                x: exitX,
                rotate: exitX === 0 ? 0 : exitX > 0 ? 18 : -18,
                opacity: exitX === 0 ? 1 : 0,
                scale: 1,
              }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              onAnimationComplete={() => {
                if (exitX !== 0) {
                  advance()
                }
              }}
              aria-label={`Choose mood ${moodLabel(front.mood)}`}
            >
              <GlassCard card={front} />
            </motion.button>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
