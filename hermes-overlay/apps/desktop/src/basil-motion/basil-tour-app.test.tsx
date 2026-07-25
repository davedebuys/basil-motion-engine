import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BasilTourApp } from './basil-tour-app'

describe('BasilTourApp', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  })

  it('renders the complete narrated tour and real first interaction', () => {
    const { container, getByText } = render(<BasilTourApp />)

    expect(getByText('Basil Motion Tour')).toBeTruthy()
    expect(getByText('100 interactions')).toBeTruthy()
    expect(container.querySelectorAll('[data-basil-tour-chapter-button]')).toHaveLength(12)
    expect(container.querySelector('[data-basil-tour]')?.getAttribute('data-basil-tour-chapter')).toBe('01-social')
    expect(container.querySelector('[data-basil-tour]')?.getAttribute('data-basil-tour-interaction')).toBe(
      'hello-basil'
    )
    expect(container.querySelector('audio')?.getAttribute('src')).toBe('./basil-motion/01-social.mp3')
  })

  it('switches chapters, narration, and rendered interaction from the chapter navigator', () => {
    const { container, getByText } = render(<BasilTourApp />)

    fireEvent.click(getByText('Reading'))

    expect(container.querySelector('[data-basil-tour]')?.getAttribute('data-basil-tour-chapter')).toBe('05-reading')
    expect(container.querySelector('[data-basil-tour]')?.getAttribute('data-basil-tour-interaction')).toBe('page-scan')
    expect(container.querySelector('audio')?.getAttribute('src')).toBe('./basil-motion/05-reading.mp3')
    expect(container.querySelector('[data-basil-interaction-accessory="book"]')).toBeTruthy()
  })

  it('exposes familiar playback, narration, and chapter controls', () => {
    const { getByLabelText } = render(<BasilTourApp />)

    fireEvent.click(getByLabelText('Play tour'))
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()

    fireEvent.click(getByLabelText('Mute narration'))
    expect(getByLabelText('Unmute narration')).toBeTruthy()
    expect(getByLabelText('Tour progress')).toBeTruthy()
    expect(getByLabelText('Next chapter')).toBeTruthy()
  })
})
