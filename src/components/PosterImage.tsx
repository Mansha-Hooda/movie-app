'use client'

import { motion } from 'framer-motion'
import type { Title } from '@/types/database'

type PosterImageProps = {
  title: Title
  layoutId?: string
  className?: string
}

export function PosterImage({ title, layoutId, className = '' }: PosterImageProps) {
  return (
    <motion.div
      layoutId={layoutId}
      className={`overflow-hidden rounded-xl bg-surface ${className}`}
      transition={{ type: 'spring', stiffness: 360, damping: 34 }}
    >
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
    </motion.div>
  )
}
