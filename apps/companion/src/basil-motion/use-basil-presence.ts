import { useStore } from '@nanostores/react'
import { useEffect, useState } from 'react'

import { $basilPresence } from './presence'
import { basilPresenceDuration, type BasilPresencePose, sampleBasilPresence } from './presence-engine'

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

export function useBasilPresence(): BasilPresencePose {
  const snapshot = useStore($basilPresence)

  const [pose, setPose] = useState(() =>
    sampleBasilPresence(snapshot.phase, Date.now() - snapshot.startedAt, prefersReducedMotion())
  )

  useEffect(() => {
    const reducedMotion = prefersReducedMotion()
    const duration = basilPresenceDuration(snapshot.phase)

    if (duration === 0) {
      setPose(sampleBasilPresence(snapshot.phase, duration, reducedMotion))

      return
    }

    let frame = 0

    const update = () => {
      const elapsed = Date.now() - snapshot.startedAt
      setPose(sampleBasilPresence(snapshot.phase, elapsed, reducedMotion))

      if (elapsed < duration) {
        frame = window.requestAnimationFrame(update)
      }
    }

    update()

    return () => window.cancelAnimationFrame(frame)
  }, [snapshot.nonce, snapshot.phase, snapshot.startedAt])

  return pose
}
