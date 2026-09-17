'use client'

import { useEffect, useId, useState } from 'react'
import { FIGMA_GLASS, createGlassMaps, type GlassMaps } from '@/lib/moods/figmaGlass'

type MoodGlassFilterProps = {
  width: number
  height: number
  radius: number
  filterId: string
}

const DISPLACE_SCALE = 18 + (FIGMA_GLASS.refraction / 100) * 70
const RED_SCALE = DISPLACE_SCALE * (1 + (FIGMA_GLASS.dispersion / 100) * 0.28)
const GREEN_SCALE = DISPLACE_SCALE
const BLUE_SCALE = DISPLACE_SCALE * (1 - (FIGMA_GLASS.dispersion / 100) * 0.22)

export function useMoodGlassFilterId() {
  const rawId = useId()
  return `mood-glass-${rawId.replace(/:/g, '')}`
}

export function MoodGlassFilter({
  width,
  height,
  radius,
  filterId,
}: MoodGlassFilterProps) {
  const [maps, setMaps] = useState<GlassMaps | null>(null)

  useEffect(() => {
    setMaps(createGlassMaps(width, height, radius))
  }, [width, height, radius])

  if (!maps) return null

  return (
    <svg width={0} height={0} className="absolute" aria-hidden>
      <filter
        id={filterId}
        x="-2%"
        y="-2%"
        width="104%"
        height="104%"
        colorInterpolationFilters="sRGB"
      >
        <feImage
          href={maps.displacement}
          result="dispMap"
          preserveAspectRatio="none"
        />
        <feColorMatrix
          in="SourceGraphic"
          type="matrix"
          values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
          result="red"
        />
        <feColorMatrix
          in="SourceGraphic"
          type="matrix"
          values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
          result="green"
        />
        <feColorMatrix
          in="SourceGraphic"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
          result="blue"
        />
        <feDisplacementMap
          in="red"
          in2="dispMap"
          scale={RED_SCALE}
          xChannelSelector="R"
          yChannelSelector="G"
          result="redD"
        />
        <feDisplacementMap
          in="green"
          in2="dispMap"
          scale={GREEN_SCALE}
          xChannelSelector="R"
          yChannelSelector="G"
          result="greenD"
        />
        <feDisplacementMap
          in="blue"
          in2="dispMap"
          scale={BLUE_SCALE}
          xChannelSelector="R"
          yChannelSelector="G"
          result="blueD"
        />
        <feBlend in="redD" in2="greenD" mode="screen" result="rg" />
        <feBlend in="rg" in2="blueD" mode="screen" result="refracted" />
        <feImage
          href={maps.specular}
          result="specMap"
          preserveAspectRatio="none"
        />
        <feBlend in="refracted" in2="specMap" mode="screen" />
      </filter>
    </svg>
  )
}
