import { useEffect, useRef } from 'react'

export interface Hotkey {
  /** `e.key` values; letters in lower case (`'s'`), `' '` for Space, `'ArrowRight'`, `'Escape'`… */
  keys: string[]
  run: () => void
  /** Off when false (e.g. no data yet): the key then does nothing, and the browser keeps it. */
  enabled?: boolean
}

// Where a key belongs to the page element, not to us.
const TYPING =
  'textarea, select, [contenteditable=""], [contenteditable="true"], input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"])'
const PRESSABLE = 'button, a[href], summary, [role="button"], input[type="checkbox"], input[type="radio"]'
const OWNS_ARROWS = '[role="slider"], input[type="range"], canvas, [role="listbox"]'

const keyName = (e: KeyboardEvent) => (e.key.length === 1 ? e.key.toLowerCase() : e.key)

/**
 * Keyboard shortcuts for the page. They stay out of the way: nothing fires while typing in a field,
 * while a dialog is open, with Ctrl/Cmd/Alt held, or when the focused control already uses the key
 * (Space on a button, arrows on a slider or on the sky map).
 */
export function useHotkeys(hotkeys: Hotkey[], active = true) {
  const latest = useRef(hotkeys)
  useEffect(() => {
    latest.current = hotkeys
  })

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return
      if (document.querySelector('[data-dialog]')) return // a dialog owns the keyboard
      const target = e.target instanceof Element ? e.target : null
      if (target?.closest(TYPING)) return
      if ((e.key === ' ' || e.key === 'Enter') && target?.closest(PRESSABLE)) return
      if (e.key.startsWith('Arrow') && target?.closest(OWNS_ARROWS)) return
      const key = keyName(e)
      const hit = latest.current.find(h => h.enabled !== false && h.keys.includes(key))
      if (!hit) return
      e.preventDefault()
      hit.run()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [active])
}
