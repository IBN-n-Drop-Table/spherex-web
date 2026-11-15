import { useSyncExternalStore } from 'react'

/** Whether a CSS media query matches right now (re-renders when that changes). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    cb => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Tailwind's `md` breakpoint: from here up there is room for a side rail. */
export const useIsWide = () => useMediaQuery('(min-width: 768px)')
