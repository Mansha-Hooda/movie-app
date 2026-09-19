'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from 'framer-motion'
import { moodLabel } from '@/lib/titles/moods'
import { hexToRgba, type MoodCardData } from '@/lib/moods/picker'

type MoodPickerOverlayProps = {
  cards: MoodCardData[]
  onSelect: (mood: string) => void
  onDismiss: () => void
}

const SWIPE_OFFSET = 96
const SWIPE_VELOCITY = 650
const SNAP_BACK = { type: 'tween' as const, duration: 0.22, ease: [0.4, 0, 0.2, 1] as const }
const EXIT = { type: 'tween' as const, duration: 0.22, ease: [0.4, 0, 1, 1] as const }

function peekPose(depth: number) {
  if (depth <= 1) return { rotate: 0, x: 0, y: 0 }
  if (depth === 2) return { rotate: 10, x: 28, y: 10 }
  return { rotate: -10, x: -28, y: 10 }
}

const POSTER_FAN = [
  [{ z: 3, rotate: 0, x: 0, y: 0 }],
  [
    { z: 1, rotate: -18, x: -42, y: 14 },
    { z: 2, rotate: 18, x: 42, y: 14 },
  ],
  [
    { z: 1, rotate: -20, x: -52, y: 18 },
    { z: 3, rotate: 0, x: 0, y: -6 },
    { z: 2, rotate: 20, x: 52, y: 18 },
  ],
] as const

function PosterFan({ posters }: { posters: (string | null)[] }) {
  const urls = posters.filter((url): url is string => Boolean(url))
  const layout = POSTER_FAN[urls.length - 1]
  if (!layout) return null

  return (
    <div className="relative mx-auto h-[12.5rem] w-[15rem]">
      {layout.map((style, index) => (
        <div
          key={urls[index]}
          className="absolute top-1/2 left-1/2 w-[6.1rem] overflow-hidden rounded-[1.35rem] bg-surface shadow-[0_12px_28px_rgba(0,0,0,0.35)]"
          style={{
            zIndex: style.z,
            aspectRatio: '2 / 3',
            transform: `translate(-50%, -50%) translate(${style.x}px, ${style.y}px) rotate(${style.rotate}deg)`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urls[index]}
            alt=""
            draggable={false}
            className="h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
  )
}

function MoodCard({
  card,
  peek = false,
}: {
  card: MoodCardData
  peek?: boolean
}) {
  return (
    <div
      className="mood-card"
      style={{
        ['--mood-fill' as string]: hexToRgba(card.color, 0.7),
        ['--mood-fill-fallback' as string]: hexToRgba(card.color, 0.85),
      }}
    >
      {peek ? null : (
        <div className="relative z-[1] flex h-full flex-col px-5 pt-6 pb-5">
          <h3 className="text-center text-[1.3rem] font-bold tracking-tight text-white">
            {moodLabel(card.mood)}
          </h3>
          <div className="flex flex-1 items-center justify-center">
            <PosterFan posters={card.posters} />
          </div>
        </div>
      )}
    </div>
  )
}

export function MoodPickerOverlay({
  cards,
  onSelect,
  onDismiss,
}: MoodPickerOverlayProps) {
  const [index, setIndex] = useState(0)
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-280, 0, 280], [-12, 0, 12])
  const dragDistance = useRef(0)
  const swiping = useRef(false)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.classList.add('mood-picker-open')
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.classList.remove('mood-picker-open')
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    x.set(0)
    swiping.current = false
  }, [index, x])

  const remaining = cards.slice(index)
  const front = remaining[0]

  function advance() {
    const next = index + 1
    if (next >= cards.length) {
      onDismiss()
      return
    }
    setIndex(next)
  }

  async function handleDragEnd(
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) {
    const shouldSwipe =
      Math.abs(info.offset.x) > SWIPE_OFFSET ||
      Math.abs(info.velocity.x) > SWIPE_VELOCITY

    if (!shouldSwipe) {
      void animate(x, 0, SNAP_BACK)
      return
    }

    swiping.current = true
    const direction = info.offset.x + info.velocity.x > 0 ? 1 : -1
    await animate(x, direction * 640, EXIT)
    advance()
  }

  if (!front) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[80] px-8" style={{ background: '#1C1C1E' }}>
      <div className="relative mx-auto flex h-full w-full max-w-[18.5rem] flex-col items-center overflow-visible pt-[64px] pb-[64px]">
        <h2 className="w-full shrink-0 text-center text-[1.85rem] font-bold leading-[1.2] tracking-tight text-white">
          Welcome back, what&apos;s your mood for today?
        </h2>

        <div className="flex min-h-0 w-full flex-1 flex-col">
          <div className="min-h-0 flex-1" />
          <div className="relative mx-auto h-[19.5rem] w-[15.25rem] shrink-0 overflow-visible">
            {remaining.slice(1, 4).map((card, offset) => {
              const depth = offset + 1
              return (
                <motion.div
                  key={card.mood}
                  className="absolute inset-0 overflow-visible"
                  style={{ zIndex: 4 - depth }}
                  initial={false}
                  animate={peekPose(depth)}
                  transition={SNAP_BACK}
                >
                  <MoodCard card={card} peek />
                </motion.div>
              )
            })}

            <motion.button
              key={front.mood}
              type="button"
              className="absolute inset-0 z-10 cursor-grab overflow-visible appearance-none border-0 bg-transparent p-0 text-left active:cursor-grabbing"
              style={{ x, rotate, touchAction: 'none' }}
              drag="x"
              dragElastic={0}
              dragMomentum={false}
              onDragStart={() => {
                dragDistance.current = 0
              }}
              onDrag={(_, info) => {
                dragDistance.current = info.offset.x
              }}
              onDragEnd={handleDragEnd}
              onTap={() => {
                if (swiping.current) return
                if (Math.abs(dragDistance.current) < 12) {
                  onSelect(front.mood)
                }
              }}
              aria-label={`Choose mood ${moodLabel(front.mood)}`}
            >
              <MoodCard card={front} />
            </motion.button>
          </div>
          <div className="min-h-0 flex-1" />
        </div>

        <Link
          href="/backlog"
          className="w-full shrink-0 rounded-xl bg-accent py-3.5 text-center text-base font-semibold text-white transition duration-150 hover:brightness-110 active:scale-95"
        >
          View Full Backlog
        </Link>
      </div>
    </div>
  )
}
