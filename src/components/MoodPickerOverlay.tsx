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
import { FIGMA_GLASS } from '@/lib/moods/figmaGlass'
import {
  MoodGlassFilter,
  useMoodGlassFilterId,
} from '@/components/MoodGlassFilter'

type MoodPickerOverlayProps = {
  cards: MoodCardData[]
  onSelect: (mood: string) => void
  onDismiss: () => void
}

const SWIPE_OFFSET = 96
const SWIPE_VELOCITY = 650
const SNAP_BACK = { type: 'tween' as const, duration: 0.22, ease: [0.4, 0, 0.2, 1] as const }
const EXIT = { type: 'tween' as const, duration: 0.22, ease: [0.4, 0, 1, 1] as const }

function peekTransform(absoluteIndex: number) {
  if (absoluteIndex % 2 === 0) {
    return 'translate(-18px, 10px) rotate(-10deg)'
  }
  return 'translate(18px, 12px) rotate(10deg)'
}

const POSTER_FAN = [
  { z: 1, rotate: -16, x: -36 },
  { z: 3, rotate: 0, x: 0 },
  { z: 2, rotate: 14, x: 36 },
] as const

function PosterFan({ posters }: { posters: (string | null)[] }) {
  return (
    <div className="relative mx-auto h-[9.75rem] w-[11.5rem]">
      {POSTER_FAN.map((style, index) => (
        <div
          key={index}
          className="absolute top-1/2 left-1/2 w-[5.4rem] overflow-hidden rounded-xl bg-surface shadow-[0_12px_28px_rgba(0,0,0,0.35)]"
          style={{
            zIndex: style.z,
            aspectRatio: '2 / 3',
            transform: `translate(-50%, -50%) translateX(${style.x}px) rotate(${style.rotate}deg)`,
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
          ) : (
            <div
              className="h-full w-full"
              style={{
                background:
                  'linear-gradient(160deg, #2a2633 0%, #1c1a20 45%, #332f3d 100%)',
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

const CARD_RADIUS = 26

function glassStyle(color: string, filterId: string) {
  const filter = `blur(${FIGMA_GLASS.frost}px) url(#${filterId})`
  return {
    background: hexToRgba(color, 0.6),
    backdropFilter: filter,
    WebkitBackdropFilter: filter,
  }
}

function GlassCard({
  card,
  peek = false,
  filterId,
}: {
  card: MoodCardData
  peek?: boolean
  filterId: string
}) {
  return (
    <div
      className="mood-glass-card h-full w-full"
      style={glassStyle(card.color, filterId)}
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
  const stackRef = useRef<HTMLDivElement>(null)
  const filterId = useMoodGlassFilterId()
  const [cardSize, setCardSize] = useState({ width: 244, height: 312 })

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
    const node = stackRef.current
    if (!node) return

    function measure() {
      if (!node) return
      setCardSize({ width: node.clientWidth, height: node.clientHeight })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
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
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black px-8">
      <div className="flex w-full max-w-[18.5rem] flex-col items-center">
        <h2 className="mb-8 w-full text-center text-[1.85rem] font-bold leading-[1.2] tracking-tight text-white">
          Welcome back, what&apos;s your mood for today?
        </h2>

        <div ref={stackRef} className="relative mb-8 h-[19.5rem] w-[15.25rem]">
          <MoodGlassFilter
            width={cardSize.width}
            height={cardSize.height}
            radius={CARD_RADIUS}
            filterId={filterId}
          />
          {secondBehind ? (
            <div
              className="absolute inset-0"
              style={{ zIndex: 1, transform: peekTransform(index + 2) }}
            >
              <GlassCard card={secondBehind} peek filterId={filterId} />
            </div>
          ) : null}

          {firstBehind ? (
            <div
              className="absolute inset-0"
              style={{ zIndex: 2, transform: peekTransform(index + 1) }}
            >
              <GlassCard card={firstBehind} peek filterId={filterId} />
            </div>
          ) : null}

          <motion.button
            key={front.mood}
            type="button"
            className="absolute inset-0 z-10 cursor-grab touch-none appearance-none border-0 bg-transparent p-0 text-left active:cursor-grabbing"
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
            <GlassCard card={front} filterId={filterId} />
          </motion.button>
        </div>

        <Link href="/backlog" className="btn-primary">
          View Full Backlog
        </Link>
      </div>
    </div>
  )
}
