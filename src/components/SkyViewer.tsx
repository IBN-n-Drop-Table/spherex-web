import type { Anomaly } from '../types/api'
import { resolveAssetUrl } from '../api/http'

const IMAGE_SIZE_PX = 1024

interface Props {
  imageUrl: string
  alt: string
  anomalies?: Anomaly[]
}

/**
 * Single entry point for showing the sky. Today: <img> + pixel overlay.
 * Later: swap internals for Aladin Lite v3 (use ra_deg/dec_deg instead of pixels).
 */
export default function SkyViewer({ imageUrl, alt, anomalies = [] }: Props) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <img src={resolveAssetUrl(imageUrl)} alt={alt} className="h-full w-full object-contain" />
      {anomalies.map(a => (
        <span
          key={a.anomaly_id}
          title={`${a.anomaly_id} · SNR ${a.snr_confidence}`}
          className={`absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
            a.is_clean_detection ? 'border-emerald-400' : 'border-amber-400'
          }`}
          style={{
            left: `${(a.pixel_x / IMAGE_SIZE_PX) * 100}%`,
            top: `${(a.pixel_y / IMAGE_SIZE_PX) * 100}%`,
          }}
        />
      ))}
    </div>
  )
}
