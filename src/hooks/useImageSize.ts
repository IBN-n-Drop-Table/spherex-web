import { useEffect, useState } from 'react'

export interface ImageSize {
  width: number
  height: number
}

/**
 * Natural pixel size of the image at `url`. Keeps the last known size while a new
 * image loads, so swapping frames (autoplay) never blanks the view.
 */
export function useImageSize(url: string | null): ImageSize | null {
  const [size, setSize] = useState<ImageSize | null>(null)

  useEffect(() => {
    if (!url) return
    const img = new Image()
    img.onload = () => {
      setSize(prev =>
        prev?.width === img.naturalWidth && prev.height === img.naturalHeight
          ? prev
          : { width: img.naturalWidth, height: img.naturalHeight },
      )
    }
    img.src = url
    return () => {
      img.onload = null
    }
  }, [url])

  return size
}
