import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BasilPersonalityShowcase } from './basil-personality-showcase'

describe('BasilPersonalityShowcase', () => {
  it('exposes every personality behaviour and the real procedural cue', () => {
    const { container, getByLabelText, getByText } = render(<BasilPersonalityShowcase />)

    expect(getByText('Basil Personality Lab')).toBeTruthy()
    expect(getByText('20 behaviours')).toBeTruthy()
    expect(container.querySelectorAll('[data-basil-personality-button]')).toHaveLength(20)
    fireEvent.change(getByLabelText('Behaviour progress'), { target: { value: '0.5' } })
    expect(container.querySelector('[data-basil-personality="window-peekaboo"]')).toBeTruthy()
    expect(container.querySelector('[data-basil-personality-cue="peek"]')).toBeTruthy()
  })

  it('switches to a distinct behaviour and supports reduced motion', () => {
    const { container, getByLabelText } = render(<BasilPersonalityShowcase />)

    fireEvent.click(getByLabelText('Show Bedtime Negotiation'))
    fireEvent.click(getByLabelText('Reduced motion'))
    fireEvent.change(getByLabelText('Behaviour progress'), { target: { value: '0.5' } })

    expect(container.querySelector('[data-basil-personality-showcase-id="bedtime-negotiation"]')).toBeTruthy()
    expect(container.querySelector('[data-basil-personality-cue="bedtime"]')).toBeTruthy()
  })

  it('provides playback, phase, direction, and navigation controls', () => {
    const { getByLabelText } = render(<BasilPersonalityShowcase />)

    expect(getByLabelText('Pause behaviour')).toBeTruthy()
    expect(getByLabelText('Restart behaviour')).toBeTruthy()
    expect(getByLabelText('Behaviour progress')).toBeTruthy()
    expect(getByLabelText('Mirror behaviour')).toBeTruthy()
    expect(getByLabelText('Next behaviour')).toBeTruthy()
  })
})
