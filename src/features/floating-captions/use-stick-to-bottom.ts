import { useCallback, useLayoutEffect, useRef, useState } from 'react'

type ScrollBox = {
  scrollHeight: number
  scrollTop: number
  clientHeight: number
}

export function isNearBottom(el: ScrollBox, threshold = 40): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold
}

/** Mantém a rolagem no fim enquanto eu não subir para reler (R4.5). */
export function useStickToBottom(dependency: unknown): {
  ref: React.RefObject<HTMLDivElement | null>
  stuck: boolean
  onScroll: () => void
  scrollToBottom: () => void
} {
  const ref = useRef<HTMLDivElement | null>(null)
  const [stuck, setStuck] = useState(true)

  useLayoutEffect(() => {
    const el = ref.current
    if (stuck && el) el.scrollTop = el.scrollHeight
  }, [dependency, stuck])

  const onScroll = useCallback(() => {
    if (ref.current) setStuck(isNearBottom(ref.current))
  }, [])

  const scrollToBottom = useCallback(() => {
    const el = ref.current
    if (el) el.scrollTop = el.scrollHeight
    setStuck(true)
  }, [])

  return { ref, stuck, onScroll, scrollToBottom }
}
