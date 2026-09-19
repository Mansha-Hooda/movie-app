'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, type PanInfo } from 'framer-motion'
import { moodLabel } from '@/lib/titles/moods'
import { hexToRgba, type MoodCardData } from '@/lib/moods/picker'
import { PosterFan } from '@/components/PosterFan'

type MoodPickerOverlayProps = {
  cards: MoodCardData[]
  onSelect: (mood: string) => void
  onViewFullBacklog: () => void
  onDismiss: () => void
}

const CARD_ASPECT = 15.25 / 19.5
const GAP = 12
const HEADING_MAX_PX = 18.5 * 16
const SIDE_INSET = 64
const SNAP = { type: 'spring' as const, stiffness: 380, damping: 36, mass: 0.85 }
const ACTIVE_FILL = '#7A5AF8'
const PEEK_FILL = '#B8A9FC'
const TAP_SLOP = 10

function MoodCard({
  card,
  active,
}: {
  card: MoodCardData
  active: boolean
}) {
  const hex = active ? ACTIVE_FILL : PEEK_FILL
  return (
    <div
      className="mood-card"
      style={{
        ['--mood-fill' as string]: hexToRgba(hex, active ? 0.7 : 0.48),
        ['--mood-fill-fallback' as string]: hexToRgba(hex, active ? 0.85 : 0.62),
      }}
    >
      <div className="relative z-[1] flex h-full flex-col px-5 pt-6 pb-5">
        <h3 className="text-center text-[1.3rem] font-bold tracking-tight text-white">
          {moodLabel(card.mood)}
        </h3>
        <div className="flex flex-1 items-center justify-center">
          <PosterFan posters={card.posters} />
        </div>
      </div>
    </div>
  )
}

export function MoodPickerOverlay({
  cards,
  onSelect,
  onViewFullBacklog,
}: MoodPickerOverlayProps) {
  const [index, setIndex] = useState(0)
  const [cardW, setCardW] = useState(HEADING_MAX_PX)
  const [viewportW, setViewportW] = useState(HEADING_MAX_PX)
  const viewportRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const dragDistance = useRef(0)
  const swiping = useRef(false)
  const indexRef = useRef(0)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.classList.add('mood-picker-open')
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.classList.remove('mood-picker-open')
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useLayoutEffect(() => {
    function measure() {
      const node = viewportRef.current
      if (!node) return
      const viewport = node.getBoundingClientRect().width
      const nextCardW = Math.min(HEADING_MAX_PX, Math.max(0, viewport - SIDE_INSET))
      setViewportW(viewport)
      setCardW(nextCardW)
    }

    const observed = viewportRef.current
    if (!observed) return
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(observed)
    return () => observer.disconnect()
  }, [])

  const step = cardW + GAP
  const pad = Math.max(0, (viewportW - cardW) / 2)
  const minX = -Math.max(0, cards.length - 1) * step

  useLayoutEffect(() => {
    x.set(-indexRef.current * step)
  }, [step, x])

  function snapTo(next: number, info?: PanInfo) {
    const clamped = Math.max(0, Math.min(cards.length - 1, next))
    indexRef.current = clamped
    setIndex(clamped)
    void animate(x, -clamped * step, SNAP)
    if (info && Math.abs(info.offset.x) > TAP_SLOP) {
      swiping.current = true
    }
  }

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const current = -x.get() / Math.max(step, 1)
    let next = Math.round(current)
    if (info.velocity.x < -500) next += 1
    else if (info.velocity.x > 500) next -= 1
    else {
      const projected = x.get() + info.velocity.x * 0.18
      next = Math.round(-projected / Math.max(step, 1))
    }
    snapTo(next, info)
  }

  const active = cards[index]
  if (!active) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-x-hidden" style={{ background: '#1C1C1E' }}>
      <div className="relative mx-auto flex h-full w-[min(18.5rem,calc(100vw-4rem))] flex-col items-center overflow-visible pt-[64px] pb-[64px]">
        <h2 className="w-full shrink-0 text-center text-[1.85rem] font-bold leading-[1.2] tracking-tight text-white">
          Welcome back, what&apos;s your mood for today?
        </h2>

        <div className="flex min-h-0 w-full flex-1 flex-col">
          <div className="min-h-0 flex-1" />
          <div className="w-full shrink-0">
            <div ref={viewportRef} className="relative overflow-x-hidden" style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)' }}>
              <motion.div
                className="flex cursor-grab items-stretch active:cursor-grabbing"
                style={{ x, gap: GAP, paddingLeft: pad, paddingRight: pad, touchAction: 'none' }}
                drag={cards.length > 1 ? 'x' : false}
                dragConstraints={{ left: minX, right: 0 }}
                dragElastic={0.12}
                dragMomentum={false}
                onDragStart={() => {
                  dragDistance.current = 0
                  swiping.current = false
                }}
                onDrag={(_, info) => {
                  dragDistance.current = info.offset.x
                  const nearest = Math.round(-x.get() / Math.max(step, 1))
                  const clamped = Math.max(0, Math.min(cards.length - 1, nearest))
                  if (clamped !== indexRef.current) {
                    indexRef.current = clamped
                    setIndex(clamped)
                  }
                }}
                onDragEnd={handleDragEnd}
              >
                {cards.map((card, i) => (
                  <motion.button
                    key={card.mood}
                    type="button"
                    className="shrink-0 appearance-none border-0 bg-transparent p-0 text-left"
                    style={{ width: cardW, aspectRatio: CARD_ASPECT }}
                    onClick={() => {
                      if (swiping.current) return
                      if (Math.abs(dragDistance.current) >= TAP_SLOP) return
                      if (i === indexRef.current) {
                        onSelect(card.mood)
                        return
                      }
                      snapTo(i)
                    }}
                    aria-label={`Choose mood ${moodLabel(card.mood)}`}
                  >
                    <MoodCard card={card} active={i === index} />
                  </motion.button>
                ))}
              </motion.div>
            </div>

            <p className="mt-4 text-center text-xs text-muted" aria-live="polite">
              {active.count} {active.count === 1 ? 'item' : 'items'}
            </p>
            <div className="mt-3 flex items-center justify-center gap-1.5" aria-hidden>
              {cards.map((card, i) => (
                <span
                  key={card.mood}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    i === index ? 'w-5 bg-accent' : 'w-1.5 bg-border'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1" />
        </div>

        <button
          type="button"
          onClick={onViewFullBacklog}
          className="w-full shrink-0 rounded-xl bg-accent py-3.5 text-center text-base font-semibold text-white transition duration-150 hover:brightness-110 active:scale-95"
        >
          View Full Backlog
        </button>
      </div>
    </div>
  )
}
