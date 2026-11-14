import { useEffect, useState } from 'react'

/** Frame index + autoplay loop over `count` frames at `fps`. */
export function useAutoplay(count: number, fps: number) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing || count < 2) return
    const id = setInterval(() => setIndex(i => (i + 1) % count), 1000 / fps)
    return () => clearInterval(id)
  }, [playing, count, fps])

  const clamped = count > 0 ? Math.min(index, count - 1) : 0
  const step = (d: number) => setIndex((clamped + d + count) % count)

  return {
    index: clamped,
    setIndex,
    playing: playing && count > 1,
    toggle: () => setPlaying(p => !p),
    next: () => step(1),
    prev: () => step(-1),
  }
}
