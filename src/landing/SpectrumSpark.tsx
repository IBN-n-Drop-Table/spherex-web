import { CHEMICAL_BANDS, EPSILON_INDI_SPECTRUM } from '../data/landing'

const W = 520
const H = 190
const PAD = { left: 8, right: 8, top: 22, bottom: 26 }
const X0 = 0.7
const X1 = 5.05

/** The real SPHEREx spectrum of Epsilon Indi B as a plain line: brightness against wavelength. */
export default function SpectrumSpark() {
  const ys = EPSILON_INDI_SPECTRUM.map(p => p[1])
  const yMax = Math.max(...ys) * 1.08
  const x = (w: number) => PAD.left + ((w - X0) / (X1 - X0)) * (W - PAD.left - PAD.right)
  const y = (f: number) => H - PAD.bottom - (Math.max(f, 0) / yMax) * (H - PAD.top - PAD.bottom)
  const path = EPSILON_INDI_SPECTRUM.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p[0]).toFixed(1)} ${y(p[1]).toFixed(1)}`).join('')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Spectrum of Epsilon Indi B: brightness at each infrared wavelength from 0.75 to 5 micron" className="block w-full">
      {CHEMICAL_BANDS.map(b => (
        <g key={`${b.name}${b.from}`}>
          <rect x={x(b.from)} y={PAD.top - 6} width={x(b.to) - x(b.from)} height={H - PAD.bottom - PAD.top + 6} fill="#ece6d6" opacity={0.07} />
          <text x={(x(b.from) + x(b.to)) / 2} y={11} textAnchor="middle" fontSize={10} letterSpacing={0.6} fill="#aba390" fontFamily="IBM Plex Sans, sans-serif">
            {b.name}
          </text>
        </g>
      ))}
      <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="#4c483d" />
      {[1, 2, 3, 4, 5].map(t => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={H - PAD.bottom} y2={H - PAD.bottom + 4} stroke="#4c483d" />
          <text x={x(t)} y={H - 8} textAnchor="middle" fontSize={10} fill="#8b8473" fontFamily="IBM Plex Mono, monospace">
            {t} µm
          </text>
        </g>
      ))}
      <path d={path} fill="none" stroke="#ece6d6" strokeWidth={1.4} strokeLinejoin="round" />
    </svg>
  )
}
