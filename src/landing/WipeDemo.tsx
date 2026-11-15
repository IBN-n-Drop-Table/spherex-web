import { useRef, useState } from 'react'

interface Props {
  visible: string
  infrared: string
  alt: string
}

const clamp = (v: number) => Math.min(0.97, Math.max(0.03, v))
const KEY_STEP = 0.03

/**
 * The "eye vs infrared" bar, working on two still pictures: visible light on the left of the bar,
 * infrared on the right. Drag it, or focus it and use the arrow keys.
 */
export default function WipeDemo({ visible, infrared, alt }: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(0.46)
  const dragTo = (clientX: number) => {
    const r = boxRef.current?.getBoundingClientRect()
    if (r && r.width > 0) setPos(clamp((clientX - r.left) / r.width))
  }

  return (
    <div ref={boxRef} className="relative aspect-square select-none overflow-hidden border border-rule-strong bg-sunken">
      <img src={infrared} alt={alt} loading="lazy" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      <img
        src={visible}
        alt=""
        loading="lazy"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${(1 - pos) * 100}% 0 0)` }}
      />
      <span className="label-caps pointer-events-none absolute left-2 top-2 bg-ink/85 px-2 py-0.5 text-paper">What your eye sees</span>
      <span className="label-caps pointer-events-none absolute right-2 top-2 bg-ink/85 px-2 py-0.5 text-paper">What infrared sees</span>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Compare visible light and infrared"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos * 100)}
        className="group absolute inset-y-0 flex w-11 -translate-x-1/2 cursor-ew-resize touch-none justify-center focus-visible:outline-none"
        style={{ left: `${pos * 100}%` }}
        onPointerDown={e => {
          e.currentTarget.setPointerCapture(e.pointerId)
          dragTo(e.clientX)
        }}
        onPointerMove={e => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) dragTo(e.clientX)
        }}
        onKeyDown={e => {
          if (e.key === 'ArrowLeft') setPos(p => clamp(p - KEY_STEP))
          else if (e.key === 'ArrowRight') setPos(p => clamp(p + KEY_STEP))
          else return
          e.preventDefault()
        }}
      >
        <div className="h-full w-px bg-paper" />
        <div className="absolute top-1/2 flex h-11 w-7 -translate-y-1/2 items-center justify-center border border-paper bg-ink text-paper group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-accent">
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 4L2.5 8 6 12M10 4l3.5 4-3.5 4" />
          </svg>
        </div>
      </div>
    </div>
  )
}
