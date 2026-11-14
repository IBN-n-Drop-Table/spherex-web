import type { Anomaly } from '../types/api'
import { resolveAssetUrl } from '../api/http'
import { useImageSize } from '../hooks/useImageSize'
import { anomalyColorClass } from '../lib/anomalies'

interface Props {
  imageUrl: string
  alt: string
  anomalies?: Anomaly[]
}

/**
 * Shows one SPHEREx image full-screen. The SVG's coordinate system IS the image's pixel grid,
 * so any image size works and markers use pixel_x/pixel_y directly
 * (0-based, origin top-left, measured on the served image).
 */
export default function SkyViewer({ imageUrl, alt, anomalies = [] }: Props) {
  const src = resolveAssetUrl(imageUrl)
  const size = useImageSize(src)
  if (!size) return null // first frame still loading

  const { width, height } = size
  const radius = Math.max(width, height) / 70

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={alt}
      className="absolute inset-0 h-full w-full"
    >
      <image href={src} width={width} height={height} />
      {anomalies.map(a => (
        <circle
          key={a.anomaly_id}
          // +0.5: pixel_x/pixel_y index a pixel, its centre is half a pixel in
          cx={a.pixel_x + 0.5}
          cy={a.pixel_y + 0.5}
          r={radius}
          fill="none"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          className={anomalyColorClass(a)}
        >
          <title>{`${a.anomaly_id}${a.kind ? ` · ${a.kind}` : ''} · SNR ${a.snr_confidence}`}</title>
        </circle>
      ))}
    </svg>
  )
}
