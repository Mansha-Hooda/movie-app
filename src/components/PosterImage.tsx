import type { Title } from '@/types/database'

type PosterImageProps = {
  title: Title
  layoutId?: string
  className?: string
}

export function PosterImage({ title, className = '' }: PosterImageProps) {
  return (
    <div className={`overflow-hidden rounded-xl bg-surface ${className}`}>
      {title.poster_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={title.poster_url}
          alt=""
          className="aspect-[2/3] w-full object-cover"
        />
      ) : (
        <div
          className="aspect-[2/3] w-full"
          style={{
            background:
              'linear-gradient(160deg, #2a2633 0%, #1c1a20 45%, #332f3d 100%)',
          }}
        />
      )}
    </div>
  )
}
