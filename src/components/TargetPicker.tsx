import { useEffect, useRef, useState } from 'react'
import { TARGETS, type Target } from '../data/targets'

interface Props {
  onSelect: (target: Target) => void
}

/** Drop-down with the challenge's five test objects; picking one moves the map to it. */
export default function TargetPicker({ onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded bg-black/70 px-3 py-2 text-sm backdrop-blur hover:bg-slate-800"
      >
        <span>Challenge targets</span>
        <span aria-hidden="true" className={`text-xs transition-transform ${open ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Challenge targets"
          className="absolute left-0 top-full z-20 mt-1 w-72 overflow-hidden rounded bg-black/90 shadow-lg backdrop-blur"
        >
          {TARGETS.map(t => (
            <li key={t.id} role="option" aria-selected={false}>
              <button
                onClick={() => {
                  onSelect(t)
                  setOpen(false)
                }}
                className="block w-full px-3 py-2 text-left hover:bg-slate-800"
              >
                <span className="block text-sm">{t.name}</span>
                <span className="block text-xs text-slate-400">{t.note}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
