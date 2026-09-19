const CARD_FAN = [
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

const THUMB_FAN = [
  [{ z: 3, rotate: 0, x: 0, y: 0 }],
  [
    { z: 1, rotate: -16, x: -7, y: 3 },
    { z: 2, rotate: 16, x: 7, y: 3 },
  ],
  [
    { z: 1, rotate: -18, x: -8, y: 4 },
    { z: 3, rotate: 0, x: 0, y: -2 },
    { z: 2, rotate: 18, x: 8, y: 4 },
  ],
] as const

type PosterFanProps = {
  posters: (string | null)[]
  variant?: 'card' | 'thumb'
}

export function PosterFan({ posters, variant = 'card' }: PosterFanProps) {
  const urls = posters.filter((url): url is string => Boolean(url))
  const layout = (variant === 'thumb' ? THUMB_FAN : CARD_FAN)[urls.length - 1]
  if (!layout) return null

  const isThumb = variant === 'thumb'

  return (
    <div
      className={
        isThumb
          ? 'relative h-full w-full'
          : 'relative mx-auto h-[12.5rem] w-[15rem]'
      }
    >
      {layout.map((style, index) => (
        <div
          key={`${urls[index]}-${index}`}
          className={`absolute top-1/2 left-1/2 overflow-hidden bg-surface shadow-[0_8px_18px_rgba(0,0,0,0.35)] ${
            isThumb ? 'w-[1.45rem] rounded-md' : 'w-[6.1rem] rounded-[1.35rem]'
          }`}
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
