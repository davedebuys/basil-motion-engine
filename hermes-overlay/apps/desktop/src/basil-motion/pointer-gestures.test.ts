import { describe, expect, it } from 'vitest'

import { createBasilPointerGestureTracker, sampleBasilPointerGesture } from './pointer-gestures'

describe('Basil pointer gestures', () => {
  it('recognizes a deliberate clockwise orbit around the actor', () => {
    const center = { x: 300, y: 240 }
    let tracker = createBasilPointerGestureTracker()
    let gesture = sampleBasilPointerGesture(tracker, { x: 380, y: 240 }, center, 0)
    let peakOrbit = 0

    tracker = gesture.tracker

    for (let step = 1; step <= 20; step += 1) {
      const angle = (step / 20) * Math.PI * 2
      gesture = sampleBasilPointerGesture(
        tracker,
        { x: center.x + Math.cos(angle) * 80, y: center.y + Math.sin(angle) * 80 },
        center,
        step * 45
      )
      tracker = gesture.tracker
      peakOrbit = Math.max(peakOrbit, gesture.gesture.orbit)
    }

    expect(peakOrbit).toBeGreaterThan(0.7)
    expect(gesture.gesture.orbitDirection).toBe(1)
    expect(gesture.gesture.swipe).toBe(0)
  })

  it('recognizes a fast linear swipe across the actor with direction', () => {
    const center = { x: 300, y: 240 }
    let tracker = createBasilPointerGestureTracker()
    let gesture = sampleBasilPointerGesture(tracker, { x: 130, y: 250 }, center, 0)

    tracker = gesture.tracker

    for (const [index, x] of [210, 290, 370, 450].entries()) {
      gesture = sampleBasilPointerGesture(tracker, { x, y: 250 }, center, (index + 1) * 35)
      tracker = gesture.tracker
    }

    expect(gesture.gesture.swipe).toBeGreaterThan(0.6)
    expect(gesture.gesture.swipeX).toBeGreaterThan(0.95)
    expect(Math.abs(gesture.gesture.swipeY)).toBeLessThan(0.1)
    expect(gesture.gesture.orbit).toBe(0)
  })

  it('recognizes repeated horizontal petting across the actor crown', () => {
    const center = { x: 300, y: 240 }
    let tracker = createBasilPointerGestureTracker()
    let gesture = sampleBasilPointerGesture(tracker, { x: 270, y: 205 }, center, 0)
    let peakPet = 0

    tracker = gesture.tracker

    for (const [index, x] of [330, 272, 332, 274, 329, 276, 326].entries()) {
      gesture = sampleBasilPointerGesture(tracker, { x, y: 203 + (index % 2) * 3 }, center, (index + 1) * 70)
      tracker = gesture.tracker
      peakPet = Math.max(peakPet, gesture.gesture.pet)
    }

    expect(peakPet).toBeGreaterThan(0.55)
    expect(Math.abs(gesture.gesture.petDirection)).toBe(1)
    expect(gesture.gesture.orbit).toBe(0)
    expect(gesture.gesture.swipe).toBe(0)
  })

  it('rejects similar reversals below the crown and outside the actor', () => {
    const center = { x: 300, y: 240 }

    for (const y of [240, 170]) {
      let tracker = createBasilPointerGestureTracker()

      for (const [index, x] of [270, 330, 272, 332, 274, 329, 276, 326].entries()) {
        tracker = sampleBasilPointerGesture(tracker, { x, y }, center, index * 70).tracker
      }

      expect(tracker.pet).toBe(0)
    }
  })

  it('does not confuse dwelling or an incomplete arc with a gesture', () => {
    const center = { x: 300, y: 240 }
    let tracker = createBasilPointerGestureTracker()
    let gesture = sampleBasilPointerGesture(tracker, { x: 360, y: 240 }, center, 0)

    tracker = gesture.tracker

    for (let step = 1; step <= 12; step += 1) {
      const angle = (step / 24) * Math.PI
      gesture = sampleBasilPointerGesture(
        tracker,
        { x: center.x + Math.cos(angle) * 60, y: center.y + Math.sin(angle) * 60 },
        center,
        step * 70
      )
      tracker = gesture.tracker
    }

    expect(gesture.gesture.orbit).toBe(0)
    expect(gesture.gesture.pet).toBe(0)
    expect(gesture.gesture.swipe).toBe(0)
  })

  it('decays gesture impulses without retaining an unbounded path', () => {
    const center = { x: 300, y: 240 }
    let tracker = createBasilPointerGestureTracker()

    for (const [index, x] of [130, 210, 290, 370, 450].entries()) {
      tracker = sampleBasilPointerGesture(tracker, { x, y: 240 }, center, index * 35).tracker
    }

    const triggered = tracker.swipe
    const decayed = sampleBasilPointerGesture(tracker, { x: 520, y: 240 }, center, 700)

    expect(triggered).toBeGreaterThan(0.5)
    expect(decayed.gesture.swipe).toBeLessThan(triggered)
    expect(decayed.gesture.pet).toBe(0)
    expect(decayed.tracker.samples.length).toBeLessThan(30)
  })
})
