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
import { hashMoodName, hexToRgba, type MoodCardData } from '@/lib/moods/picker'

type MoodPickerOverlayProps = {
  cards: MoodCardData[]
  onSelect: (mood: string) => void
  onDismiss: () => void
}

const SWIPE_OFFSET = 88
const SWIPE_VELOCITY = 520
const SPRING = { type: 'spring' as const, stiffness: 340, damping: 30, mass: 0.75 }
const EXIT_SPRING = { type: 'spring' as const, stiffness: 240, damping: 24, mass: 0.85 }

const POSTER_FAN = [
  { z: 1, rotate: -16, x: -36 },
  { z: 3, rotate: 0, x: 0 },
  { z: 2, rotate: 14, x: 36 },
] as const

function peekPose(mood: string, layer: number) {
  const hash = hashMoodName(mood)
  const dir = layer % 2 === 0 ? -1 : 1
  return {
    rotate: dir * (12 + (hash % 11)),
    x: dir * (34 + (hash % 16)),
    y: 16 + ((hash >> 4) % 14),
    scale: 0.93 - layer * 0.03,
  }
}

function PosterFan({ posters }: { posters: (string | null)[] }) {
  return (
    <div className="relative mx-auto h-[9.25rem] w-[11.25rem]">
      {POSTER_FAN.map((style, index) => (
        <div
          key={index}
          className="absolute top-1/2 left-1/2 h-[8.1rem] w-[5.4rem] overflow-hidden rounded-2xl border border-white/20 shadow-[0_12px_28px_rgba(0,0,0,0.35)]"
          style={{
            zIndex: style.z,
            transform: `translate(-50%, -50%) translateX(${style.x}px) rotate(${style.rotate}deg)`,
            background:
              'linear-gradient(160deg, #3a3644 0%, #2a2633 50%, #1c1a20 100%)',
          }}
        >
          {posters[index] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={posters[index] ?? ''}
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

function glassStyle(card: MoodCardData, peek: boolean) {
  const strength = peek ? 0.34 : 0.42
  return {
    background: `linear-gradient(160deg, ${hexToRgba(card.gradient.from, strength + 0.1)} 0%, ${hexToRgba(card.gradient.via, strength)} 48%, ${hexToRgba(card.gradient.to, 0.36)} 100%)`,
    backdropFilter: 'blur(28px) saturate(1.4)',
    WebkitBackdropFilter: 'blur(28px) saturate(1.4)',
  }
}

function GlassCard({
  card,
  peek = false,
}: {
  card: MoodCardData
  peek?: boolean
}) {
  return (
    <div
      className="h-full w-full overflow-hidden rounded-[26px] border border-white/18 shadow-[0_18px_44px_rgba(0,0,0,0.38)]"
      style={glassStyle(card, peek)}
    >
      {peek ? null : (
        <div className="flex h-full flex-col px-5 pt-6 pb-5">
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
  const rotate = useTransform(x, [-240, 0, 240], [-14, 0, 14])
  const nearestScale = useTransform(x, [-200, 0, 200], [0.98, 0.93, 0.98])
  const nearestY = useTransform(x, [-200, 0, 200], [8, 16, 8])
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
  const firstBehind = remaining[1]
  const secondBehind = remaining[2]

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
      void animate(x, 0, SPRING)
      return
    }

    swiping.current = true
    const direction = info.offset.x + info.velocity.x > 0 ? 1 : -1
    await animate(x, direction * 560, {
      ...EXIT_SPRING,
      velocity: info.velocity.x,
    })
    advance()
  }

  if (!front) {
    return null
  }

  const secondPose = secondBehind ? peekPose(secondBehind.mood, 1) : null
  const firstPose = firstBehind ? peekPose(firstBehind.mood, 0) : null

  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black px-8">
      <div className="flex w-full max-w-[18.5rem] flex-col items-center">
        <h2 className="mb-8 w-full text-center text-[1.85rem] font-bold leading-[1.2] tracking-tight text-white">
          Welcome back, what&apos;s your mood for today?
        </h2>

        <div className="relative mb-8 h-[19.5rem] w-[15.25rem]">
          {secondBehind && secondPose ? (
            <motion.div
              key={secondBehind.mood}
              className="absolute inset-0"
              style={{ zIndex: 1 }}
              initial={false}
              animate={secondPose}
              transition={SPRING}
            >
              <GlassCard card={secondBehind} peek />
            </motion.div>
          ) : null}

          {firstBehind && firstPose ? (
            <motion.div
              key={firstBehind.mood}
              className="absolute inset-0"
              style={{
                zIndex: 2,
                rotate: firstPose.rotate,
                x: firstPose.x,
                scale: nearestScale,
                y: nearestY,
              }}
            >
              <GlassCard card={firstBehind} peek />
            </motion.div>
          ) : null}

          <motion.button
            key={front.mood}
            type="button"
            className="absolute inset-0 z-10 cursor-grab touch-none appearance-none border-0 bg-transparent p-0 text-left active:cursor-grabbing"
            style={{ x, rotate, touchAction: 'none' }}
            drag="x"
            dragElastic={0.22}
            dragMomentum={false}
            dragConstraints={{ left: -260, right: 260 }}
            dragTransition={{ bounceStiffness: 380, bounceDamping: 30 }}
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
            initial={{ scale: 0.94, y: 22, opacity: 0.88 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={SPRING}
            aria-label={`Choose mood ${moodLabel(front.mood)}`}
          >
            <GlassCard card={front} />
          </motion.button>
        </div>

        <Link
          href="/backlog"
          className="inline-flex min-w-[13.5rem] items-center justify-center rounded-full bg-accent px-8 py-3 text-sm font-semibold text-white transition duration-150 hover:brightness-110 active:scale-95"
        >
          View Full Backlog
        </Link>
      </div>
    </div>
  )
}
