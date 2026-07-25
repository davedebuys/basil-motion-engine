import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BasilOrb } from './basil-orb'
import { BASIL_STATE_TARGETS } from './engine'
import { deriveBasilObjectAffordance } from './object-affordance'
import { sampleBasilPersonality } from './personality-engine'
import { BASIL_PERSONALITY_BY_ID } from './personality-pack'

describe('BasilOrb scene props', () => {
  it('renders a synchronized procedural interaction cue and transform', () => {
    const { container } = render(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.success,
          interactionAccessory: 'heart',
          interactionBeat: 2,
          interactionId: 'heart-pop',
          interactionProgress: 0.6,
          interactionRotation: 4,
          interactionScaleX: 1.08,
          interactionScaleY: 0.94,
          interactionX: 3,
          interactionY: -6,
          state: 'success'
        }}
      />
    )

    const svg = container.querySelector('svg')!

    expect(svg.getAttribute('data-basil-interaction')).toBe('heart-pop')
    expect(svg.getAttribute('data-basil-interaction-beat')).toBe('2')
    expect(container.querySelector('[data-basil-interaction-accessory="heart"]')).toBeTruthy()
    expect(container.querySelector('[data-basil-accessory="antenna"]')?.getAttribute('data-basil-antenna-signal')).toBe(
      'result'
    )
    expect(container.querySelector('[data-basil-interaction-accessory="heart"]')?.getAttribute('transform')).toContain(
      'scale('
    )
  })

  it('connects usable interaction props to Basil without gripping floating symbols', () => {
    const { container, rerender } = render(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.using_tool,
          interactionAccessory: 'terminal',
          interactionBeat: 1,
          interactionProgress: 0.35,
          interactionSide: 1,
          state: 'using_tool'
        }}
      />
    )

    expect(container.querySelector('[data-basil-interaction-accessory="terminal"]')?.getAttribute('data-basil-interaction-attachment')).toBe(
      'held'
    )
    expect(container.querySelector('[data-basil-interaction-grip="terminal"]')?.getAttribute('data-basil-interaction-grip-side')).toBe(
      '1'
    )
    expect(container.querySelector('svg')?.getAttribute('data-basil-prop-composition')).toBe('interaction')
    expect(container.querySelector('[data-basil-context-focus]')?.getAttribute('opacity')).toBe('0')

    rerender(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.success,
          interactionAccessory: 'heart',
          interactionBeat: 1,
          interactionProgress: 0.35,
          state: 'success'
        }}
      />
    )

    expect(container.querySelector('[data-basil-interaction-accessory="heart"]')?.getAttribute('data-basil-interaction-attachment')).toBe(
      'floating'
    )
    expect(container.querySelector('[data-basil-interaction-grip]')).toBeNull()
  })

  it('keeps a genuine object primary and removes the semantic badge grip', () => {
    const affordance = deriveBasilObjectAffordance(
      'terminal',
      { height: 320, width: 520, x: 320, y: 120 },
      { x: 440, y: 250 },
      { x: 100, y: 260 }
    )

    const { container } = render(
      <BasilOrb
        focusAffordance={affordance}
        focusDirection={affordance.direction}
        focusTarget="terminal"
        frame={{
          ...BASIL_STATE_TARGETS.using_tool,
          interactionAccessory: 'terminal',
          interactionBeat: 2,
          interactionProgress: 0.55,
          state: 'using_tool'
        }}
      />
    )

    expect(container.querySelector('svg')?.getAttribute('data-basil-prop-composition')).toBe('semantic_badge')
    expect(container.querySelector('[data-basil-interaction-accessory="terminal"]')?.getAttribute('data-basil-interaction-role')).toBe(
      'semantic_badge'
    )
    expect(container.querySelector('[data-basil-interaction-grip]')).toBeNull()
    expect(Number(container.querySelector('[data-basil-context-focus]')?.getAttribute('opacity'))).toBeGreaterThan(0)
    expect(container.querySelector('[data-basil-context="terminal"]')).toBeTruthy()
  })

  it('renders a dedicated code editor prop', () => {
    const { container } = render(
      <BasilOrb focusTarget="editor" frame={{ ...BASIL_STATE_TARGETS.idle, state: 'idle' }} />
    )

    expect(container.querySelector('[data-basil-context="editor"]')).toBeTruthy()
    expect(container.querySelector('[data-basil-dark-face]')).toBeNull()
  })

  it('renders terminal work with a retro dark face and terminal prop', () => {
    const { container } = render(
      <BasilOrb focusTarget="terminal" frame={{ ...BASIL_STATE_TARGETS.idle, state: 'idle' }} />
    )

    expect(container.querySelector('[data-basil-context="terminal"]')).toBeTruthy()
    expect(container.querySelector('[data-basil-dark-face]')).toBeTruthy()
  })

  it('animates an editor cue and task-aware gaze from the procedural phase', () => {
    const early = render(
      <BasilOrb focusTarget="editor" frame={{ ...BASIL_STATE_TARGETS.writing, motionPhase: 0.1, state: 'writing' }} />
    )

    const earlyCue = early.container.querySelector('[data-basil-context="editor"]')!
    const earlyEye = early.container.querySelector<SVGEllipseElement>('[data-basil-eye="left"] ellipse')!
    const earlyTransform = earlyCue.getAttribute('transform')
    const earlyEyeX = earlyEye.getAttribute('cx')
    early.unmount()

    const late = render(
      <BasilOrb focusTarget="editor" frame={{ ...BASIL_STATE_TARGETS.writing, motionPhase: 0.35, state: 'writing' }} />
    )

    const lateCue = late.container.querySelector('[data-basil-context="editor"]')!
    const lateEye = late.container.querySelector<SVGEllipseElement>('[data-basil-eye="left"] ellipse')!

    expect(lateCue.getAttribute('data-basil-scene-action')).toBe('code-typing')
    expect(lateCue.getAttribute('transform')).not.toBe(earlyTransform)
    expect(lateEye.getAttribute('cx')).not.toBe(earlyEyeX)
    expect(late.container.querySelector('[data-basil-hand="editor"]')?.getAttribute('data-basil-limb-intent')).toBe(
      'type'
    )
    expect(late.container.querySelectorAll('[data-basil-hand="editor"] [data-basil-limb]')).toHaveLength(2)
  })

  it('renders compact procedural speech phonemes with a brief happy eye emphasis', () => {
    const { container, rerender } = render(
      <BasilOrb frame={{ ...BASIL_STATE_TARGETS.speaking, motionPhase: 0.05, state: 'speaking' }} />
    )

    const earlyMouth = container.querySelector('[data-basil-mouth]')!
    const earlyPath = earlyMouth.getAttribute('d')
    const earlyShape = earlyMouth.getAttribute('data-basil-speech-shape')

    expect(earlyMouth.tagName.toLowerCase()).toBe('path')
    expect(Number(earlyMouth.getAttribute('data-basil-speech-openness'))).toBeGreaterThanOrEqual(0)
    expect(container.querySelector('[data-basil-eye="left"]')?.tagName.toLowerCase()).toBe('g')

    rerender(<BasilOrb frame={{ ...BASIL_STATE_TARGETS.speaking, motionPhase: 0.36, state: 'speaking' }} />)

    const emphasizedMouth = container.querySelector('[data-basil-mouth]')!

    expect(emphasizedMouth.getAttribute('d')).not.toBe(earlyPath)
    expect(emphasizedMouth.getAttribute('data-basil-speech-shape')).not.toBe(earlyShape)
    expect(container.querySelector('[data-basil-eye="left"]')?.tagName.toLowerCase()).toBe('path')

    rerender(<BasilOrb frame={{ ...BASIL_STATE_TARGETS.idle, motionPhase: 0.36, state: 'idle' }} />)

    expect(container.querySelector('[data-basil-speech-shape]')).toBeNull()
  })

  it('renders state and energy as a bounded antenna signal without replacing task props', () => {
    const { container, rerender } = render(
      <BasilOrb
        focusTarget="web"
        frame={{ ...BASIL_STATE_TARGETS.searching, energy: 0.82, motionPhase: 0.18, state: 'searching' }}
      />
    )

    const searchingAntenna = container.querySelector('[data-basil-accessory="antenna"]')!
    const searchingPulse = Number(searchingAntenna.getAttribute('data-basil-antenna-pulse'))

    expect(searchingAntenna.getAttribute('data-basil-antenna-signal')).toBe('scan')
    expect(searchingPulse).toBeGreaterThan(0.5)
    expect(container.querySelectorAll('[data-basil-antenna-ring]')).toHaveLength(2)
    expect(container.querySelector('[data-basil-context="web"]')).toBeTruthy()

    rerender(
      <BasilOrb frame={{ ...BASIL_STATE_TARGETS.sleeping, energy: 0.08, motionPhase: 0.18, state: 'sleeping' }} />
    )

    const sleepingAntenna = container.querySelector('[data-basil-accessory="antenna"]')!

    expect(sleepingAntenna.getAttribute('data-basil-antenna-signal')).toBe('sleep')
    expect(Number(sleepingAntenna.getAttribute('data-basil-antenna-lean'))).toBeGreaterThan(10)
    expect(container.querySelectorAll('[data-basil-antenna-ring]')).toHaveLength(0)
  })

  it('turns the antenna toward genuine pointer attention without changing agent state', () => {
    const { container, rerender } = render(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.idle,
          motionPhase: 0,
          pointerActive: true,
          pointerProximity: 1,
          pointerX: -1,
          state: 'idle'
        }}
      />
    )

    const leftAttention = Number(
      container.querySelector('[data-basil-accessory="antenna"]')?.getAttribute('data-basil-antenna-attention')
    )

    rerender(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.idle,
          motionPhase: 0,
          pointerActive: true,
          pointerProximity: 1,
          pointerX: 1,
          state: 'idle'
        }}
      />
    )

    const antenna = container.querySelector('[data-basil-accessory="antenna"]')!
    const rightAttention = Number(antenna.getAttribute('data-basil-antenna-attention'))

    expect(leftAttention).toBeLessThan(0)
    expect(rightAttention).toBeGreaterThan(0)
    expect(Number(antenna.getAttribute('opacity'))).toBeGreaterThan(0.4)
    expect(antenna.getAttribute('data-basil-antenna-signal')).toBe('calm')
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('Basil idle')
  })

  it('turns the full face toward a genuine point of interest when no pointer competes', () => {
    const { container } = render(
      <BasilOrb
        focusTarget="editor"
        frame={{ ...BASIL_STATE_TARGETS.idle, pointerActive: false, state: 'idle' }}
        pointOfInterest={{
          direction: { x: -0.82, y: -0.46 },
          id: 'editor:visible',
          intensity: 0.86,
          source: 'preferred',
          target: 'editor'
        }}
      />
    )

    const svg = container.querySelector('svg')!
    const [faceX, faceY] = svg.getAttribute('data-basil-face-vector')!.split(',').map(Number)

    expect(svg.getAttribute('data-basil-point-of-interest')).toBe('editor')
    expect(svg.getAttribute('data-basil-point-of-interest-source')).toBe('preferred')
    expect(svg.getAttribute('data-basil-gaze-source')).toBe('object')
    expect(faceX).toBeLessThan(-0.3)
    expect(faceY).toBeLessThan(-0.15)
  })

  it('reaches toward a genuine pointer dwell only in social states', () => {
    const { container, rerender } = render(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.idle,
          motionPhase: 0.15,
          pointerActive: true,
          pointerDwell: 0.82,
          pointerProximity: 0.95,
          pointerX: -1,
          pointerY: 0.4,
          state: 'idle'
        }}
      />
    )

    const contact = container.querySelector('g[data-basil-pointer-contact="touch"]')!

    expect(contact.getAttribute('data-basil-pointer-contact-side')).toBe('-1')
    expect(Number(contact.getAttribute('data-basil-pointer-contact-strength'))).toBeGreaterThan(0.7)
    expect(container.querySelector('[data-basil-pointer-contact-pulse]')).toBeTruthy()
    expect(container.querySelector('svg')?.getAttribute('data-basil-pointer-contact')).toBe('touch')

    rerender(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.using_tool,
          motionPhase: 0.15,
          pointerActive: true,
          pointerDwell: 0.82,
          pointerProximity: 0.95,
          pointerX: -1,
          pointerY: 0.4,
          state: 'using_tool'
        }}
      />
    )

    expect(container.querySelector('g[data-basil-pointer-contact="touch"]')).toBeNull()
    expect(container.querySelector('svg')?.getAttribute('data-basil-pointer-contact')).toBe('none')
  })

  it('opens a folder with its own procedural action', () => {
    const { container } = render(
      <BasilOrb focusTarget="folder" frame={{ ...BASIL_STATE_TARGETS.idle, motionPhase: 0.25, state: 'idle' }} />
    )

    expect(container.querySelector('[data-basil-context="folder"]')?.getAttribute('data-basil-scene-action')).toBe(
      'folder-open'
    )
    expect(container.querySelector('[data-basil-hand="folder"]')).toBeTruthy()
  })

  it('renders directional travel and novelty handoff cues only while interaction is active', () => {
    const { container, rerender } = render(
      <BasilOrb
        focusTarget="web"
        frame={{
          ...BASIL_STATE_TARGETS.searching,
          handoff: 0.8,
          motionPhase: 0.25,
          novelty: 1,
          state: 'searching',
          travel: 0.7,
          travelX: -1,
          travelY: 0.2
        }}
      />
    )

    expect(
      container.querySelector('[data-basil-transition="travel"]')?.getAttribute('data-basil-travel-direction')
    ).toBe('-1.000,0.200')
    expect(container.querySelector('[data-basil-transition="handoff"]')).toBeTruthy()

    rerender(
      <BasilOrb
        focusTarget="web"
        frame={{ ...BASIL_STATE_TARGETS.searching, handoff: 0, novelty: 0, state: 'searching', travel: 0 }}
      />
    )
    expect(container.querySelector('[data-basil-transition="travel"]')).toBeNull()
    expect(container.querySelector('[data-basil-transition="handoff"]')).toBeNull()
  })

  it('renders a procedural multi-surface task trail and return cue', () => {
    const { container, rerender } = render(
      <BasilOrb
        focusTarget="web"
        frame={{ ...BASIL_STATE_TARGETS.searching, motionPhase: 0.25, state: 'searching' }}
        journey={{
          currentTarget: 'web',
          eventKey: 'opaque',
          previousTarget: 'terminal',
          sessionKey: 'opaque-session',
          status: 'active',
          stepCount: 4,
          trail: ['document', 'editor', 'terminal', 'web'],
          transition: 'advance',
          visitedTargets: ['document', 'editor', 'terminal', 'web']
        }}
      />
    )

    const svg = container.querySelector('svg')!

    expect(svg.getAttribute('data-basil-journey-status')).toBe('active')
    expect(svg.getAttribute('data-basil-journey-step-count')).toBe('4')
    expect(container.querySelectorAll('[data-basil-journey-target]')).toHaveLength(4)
    expect(
      Array.from(container.querySelectorAll('[data-basil-journey-target]')).map(node =>
        node.getAttribute('data-basil-journey-target')
      )
    ).toEqual(['document', 'editor', 'terminal', 'web'])
    expect(container.querySelector('[data-basil-journey-connector]')).toBeTruthy()

    rerender(
      <BasilOrb
        focusTarget="document"
        frame={{ ...BASIL_STATE_TARGETS.reading, motionPhase: 0.4, state: 'reading' }}
        journey={{
          currentTarget: 'document',
          eventKey: 'opaque-return',
          previousTarget: 'web',
          sessionKey: 'opaque-session',
          status: 'active',
          stepCount: 5,
          trail: ['editor', 'terminal', 'web', 'document'],
          transition: 'return',
          visitedTargets: ['document', 'editor', 'terminal', 'web']
        }}
      />
    )

    expect(container.querySelector('[data-basil-journey-cue="return"]')).toBeTruthy()
    expect(container.querySelector('svg')?.getAttribute('data-basil-journey-transition')).toBe('return')
  })

  it('derives visible roll, hop, brake, and landing poses from genuine movement values', () => {
    const { container, rerender } = render(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.idle,
          motionPhase: 1 / 12,
          state: 'idle',
          travel: 0.9,
          travelAcceleration: 0.7,
          travelX: 1,
          travelY: 0
        }}
      />
    )

    expect(container.querySelector('svg')?.getAttribute('data-basil-locomotion')).toBe('roll')
    expect(container.querySelector('[data-basil-locomotion-shell]')).toBeTruthy()
    expect(container.querySelector('[data-basil-shadow="contact"]')?.getAttribute('rx')).not.toBe('23')

    rerender(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.idle,
          motionPhase: 1 / 12,
          state: 'idle',
          travel: 0.8,
          travelX: 0.1,
          travelY: -1
        }}
      />
    )
    expect(container.querySelector('svg')?.getAttribute('data-basil-locomotion')).toBe('hop')
    expect(Number(container.querySelector('svg')?.getAttribute('data-basil-locomotion-lift'))).toBeLessThan(-5)

    rerender(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.idle,
          motionPhase: 1 / 12,
          state: 'idle',
          travel: 0.45,
          travelAcceleration: -0.8,
          travelX: 1,
          travelY: 0
        }}
      />
    )
    expect(container.querySelector('svg')?.getAttribute('data-basil-locomotion')).toBe('brake')

    rerender(
      <BasilOrb frame={{ ...BASIL_STATE_TARGETS.idle, landing: 1, state: 'idle', travel: 0, travelX: 1, travelY: 0 }} />
    )
    expect(container.querySelector('svg')?.getAttribute('data-basil-locomotion')).toBe('land')
    expect(container.querySelector('[data-basil-locomotion-impact]')).toBeTruthy()
  })

  it('contacts a folder before the lid responds and then releases it', () => {
    const { container, rerender } = render(
      <BasilOrb
        focusPhase="engaged"
        focusTarget="folder"
        frame={{ ...BASIL_STATE_TARGETS.idle, landing: 1, motionPhase: 0.6, state: 'idle' }}
      />
    )

    const closedLid = container
      .querySelector('[data-basil-context="folder"] path:nth-of-type(2)')
      ?.getAttribute('transform')

    expect(container.querySelector('svg')?.getAttribute('data-basil-manipulation-stage')).toBe('contact')
    expect(container.querySelector('svg')?.getAttribute('data-basil-prop-response')).toBe('0.000')
    expect(container.querySelector('[data-basil-object-contact-feedback]')).toBeTruthy()
    expect(container.querySelector('[data-basil-hand="folder"]')?.getAttribute('data-basil-limb-intent')).toBe('hold')

    rerender(
      <BasilOrb
        focusPhase="engaged"
        focusTarget="folder"
        frame={{ ...BASIL_STATE_TARGETS.idle, landing: 0, motionPhase: 0.6, state: 'idle' }}
      />
    )

    expect(container.querySelector('svg')?.getAttribute('data-basil-manipulation-stage')).toBe('operate')
    expect(container.querySelector('svg')?.getAttribute('data-basil-prop-response')).toBe('1.000')
    expect(
      container.querySelector('[data-basil-context="folder"] path:nth-of-type(2)')?.getAttribute('transform')
    ).not.toBe(closedLid)

    rerender(
      <BasilOrb
        focusPhase="engaged"
        focusTarget="folder"
        frame={{ ...BASIL_STATE_TARGETS.idle, landing: 0, motionPhase: 0.93, state: 'idle' }}
      />
    )

    expect(container.querySelector('svg')?.getAttribute('data-basil-manipulation-stage')).toBe('release')
    expect(container.querySelector('[data-basil-hand="folder"]')?.getAttribute('data-basil-limb-intent')).toBe(
      'release'
    )
    expect(Number(container.querySelector('svg')?.getAttribute('data-basil-release'))).toBeGreaterThan(0.5)
  })

  it('renders genuine editor lifecycle as plan, compose, review, and save', () => {
    const frame = { ...BASIL_STATE_TARGETS.writing, motionPhase: 0.6, state: 'writing' as const }

    const { container, rerender } = render(
      <BasilOrb focusTarget="editor" frame={frame} taskKind="writing" taskPhase="prepare" />
    )

    const codePath = () =>
      container.querySelector('[data-basil-context="editor"] path:nth-of-type(2)')?.getAttribute('d')

    const plannedCode = codePath()

    expect(container.querySelector('svg')?.getAttribute('data-basil-task-action')).toBe('plan')
    expect(container.querySelector('[data-basil-task-phase-cue="prepare"]')).toBeTruthy()

    rerender(<BasilOrb focusTarget="editor" frame={frame} taskKind="writing" taskPhase="execute" />)
    const composedCode = codePath()

    expect(container.querySelector('svg')?.getAttribute('data-basil-task-action')).toBe('compose')
    expect(container.querySelector('[data-basil-task-phase-cue="execute"]')).toBeTruthy()
    expect(composedCode).not.toBe(plannedCode)

    rerender(<BasilOrb focusTarget="editor" frame={frame} taskKind="writing" taskPhase="inspect" />)

    expect(container.querySelector('svg')?.getAttribute('data-basil-task-action')).toBe('review')
    expect(container.querySelector('[data-basil-task-phase-cue="inspect"]')).toBeTruthy()
    expect(codePath()).not.toBe(composedCode)

    rerender(<BasilOrb focusTarget="editor" frame={frame} taskKind="tool_complete" taskPhase="complete" />)

    expect(container.querySelector('svg')?.getAttribute('data-basil-task-action')).toBe('save')
    expect(container.querySelector('[data-basil-task-phase-cue="complete"]')).toBeTruthy()
  })

  it('carries source-typed work during a genuine cross-surface handoff and delivers it on landing', () => {
    const { container, rerender } = render(
      <BasilOrb
        focusDirection={{ x: 1, y: 0 }}
        focusTarget="terminal"
        frame={{
          ...BASIL_STATE_TARGETS.using_tool,
          handoff: 1,
          handoffSource: 'editor',
          handoffTarget: 'terminal',
          motionPhase: 0.2,
          novelty: 1,
          state: 'using_tool',
          travel: 0.8,
          travelX: 1,
          travelY: 0
        }}
      />
    )

    expect(container.querySelector('[data-basil-carried-work="code"]')?.getAttribute('data-basil-handoff-route')).toBe(
      'editor:terminal'
    )
    expect(container.querySelector('[data-basil-carried-work="code"]')?.getAttribute('data-basil-carry-position')).toBe(
      'trailing'
    )
    expect(container.querySelector('[data-basil-transition="delivery"]')).toBeNull()
    expect(container.querySelector('[data-basil-hand="carried-work"]')?.getAttribute('data-basil-limb-intent')).toBe(
      'carry'
    )
    expect(container.querySelector('svg')?.getAttribute('data-basil-handoff-source')).toBe('editor')

    rerender(
      <BasilOrb
        focusDirection={{ x: 1, y: 0 }}
        focusTarget="terminal"
        frame={{
          ...BASIL_STATE_TARGETS.using_tool,
          handoff: 0.7,
          handoffSource: 'editor',
          handoffTarget: 'terminal',
          motionPhase: 0.4,
          novelty: 1,
          state: 'using_tool',
          travel: 0
        }}
      />
    )

    expect(container.querySelector('[data-basil-transition="delivery"]')).toBeTruthy()
    expect(container.querySelector('[data-basil-hand="carried-work"]')?.getAttribute('data-basil-limb-intent')).toBe(
      'deliver'
    )
    expect(container.querySelector('[data-basil-carried-work="code"]')?.getAttribute('data-basil-carry-position')).toBe(
      'delivery'
    )
    expect(container.querySelector('[data-basil-context="terminal"]')).toBeTruthy()
  })

  it("mirrors the working prop toward an object on Basil's left", () => {
    const { container } = render(
      <BasilOrb
        focusDirection={{ x: -1, y: 0 }}
        focusTarget="folder"
        frame={{ ...BASIL_STATE_TARGETS.idle, state: 'idle' }}
      />
    )

    const orb = container.querySelector('svg')!
    const cueWrapper = container.querySelector('[data-basil-context="folder"]')?.parentElement

    expect(orb.getAttribute('data-basil-focus-side')).toBe('left')
    expect(cueWrapper?.getAttribute('transform')).toContain('scale(-1 1)')
  })

  it('renders a restrained object cue while previewing a hovered surface', () => {
    const { container } = render(
      <BasilOrb
        focusDirection={{ x: 1, y: 0 }}
        focusIntensity={0.56}
        focusTarget="document"
        frame={{ ...BASIL_STATE_TARGETS.idle, state: 'idle' }}
      />
    )

    expect(container.querySelector('[data-basil-context="document"]')).toBeTruthy()
    expect(container.querySelector('[data-basil-context-focus]')?.getAttribute('opacity')).toBe('0.56')
    expect(container.querySelector('svg')?.getAttribute('data-basil-focus-intensity')).toBe('0.560')
  })

  it('renders distinct animated image inspection and data analysis props', () => {
    const image = render(
      <BasilOrb focusTarget="image" frame={{ ...BASIL_STATE_TARGETS.reading, motionPhase: 0.2, state: 'reading' }} />
    )

    expect(image.container.querySelector('[data-basil-context="image"]')?.getAttribute('data-basil-scene-action')).toBe(
      'image-inspect'
    )
    expect(image.container.querySelector('[data-basil-hand="image"]')).toBeTruthy()
    image.unmount()

    const data = render(
      <BasilOrb
        focusTarget="data"
        frame={{ ...BASIL_STATE_TARGETS.using_tool, motionPhase: 0.6, state: 'using_tool' }}
      />
    )

    expect(data.container.querySelector('[data-basil-context="data"]')?.getAttribute('data-basil-scene-action')).toBe(
      'data-analyze'
    )
    expect(data.container.querySelector('[data-basil-hand="data"]')).toBeTruthy()
  })

  it('aims gaze, stance, and reach at the genuine surface contact while yielding to a nearby pointer', () => {
    const bounds = { height: 400, width: 700, x: 200, y: 100 }
    const actor = { x: 80, y: 300 }
    const top = deriveBasilObjectAffordance('editor', bounds, { x: 240, y: 120 }, actor)
    const bottom = deriveBasilObjectAffordance('editor', bounds, { x: 860, y: 480 }, actor)
    const frame = { ...BASIL_STATE_TARGETS.writing, motionPhase: 0.25, pointerProximity: 0, state: 'writing' as const }

    const { container, rerender } = render(
      <BasilOrb focusAffordance={top} focusDirection={top.direction} focusTarget="editor" frame={frame} />
    )

    const topEyeY = container.querySelector<SVGEllipseElement>('[data-basil-eye="left"] ellipse')?.getAttribute('cy')
    const topBodyTransform = container.querySelector('[data-basil-body]')?.parentElement?.getAttribute('transform')
    const topHandTransform = container.querySelector('[data-basil-hand="editor"] path')?.getAttribute('d')

    rerender(<BasilOrb focusAffordance={bottom} focusDirection={bottom.direction} focusTarget="editor" frame={frame} />)

    expect(container.querySelector('svg')?.getAttribute('data-basil-object-contact')).toBe('0.886,0.900')
    expect(container.querySelector('svg')?.getAttribute('data-basil-object-shape')).toBe('surface')
    expect(container.querySelector<SVGEllipseElement>('[data-basil-eye="left"] ellipse')?.getAttribute('cy')).not.toBe(
      topEyeY
    )
    expect(container.querySelector('[data-basil-body]')?.parentElement?.getAttribute('transform')).not.toBe(
      topBodyTransform
    )
    expect(container.querySelector('[data-basil-hand="editor"] path')?.getAttribute('d')).not.toBe(topHandTransform)

    rerender(
      <BasilOrb
        focusAffordance={bottom}
        focusDirection={bottom.direction}
        focusTarget="editor"
        frame={{ ...frame, pointerProximity: 1 }}
      />
    )
    expect(container.querySelector('svg')?.getAttribute('data-basil-object-gaze-weight')).toBe('0.220')
  })

  it('changes balance, grip sag, and shadow for genuine asset geometry', () => {
    const compact = deriveBasilObjectAffordance(
      'editor',
      { height: 70, width: 100, x: 100, y: 100 },
      { x: 105, y: 130 },
      { x: 0, y: 130 }
    )

    const surface = deriveBasilObjectAffordance(
      'editor',
      { height: 500, width: 700, x: 100, y: 100 },
      { x: 780, y: 350 },
      { x: 0, y: 350 }
    )

    const frame = { ...BASIL_STATE_TARGETS.writing, motionPhase: 0.6, state: 'writing' as const }

    const { container, rerender } = render(
      <BasilOrb focusAffordance={compact} focusDirection={compact.direction} focusTarget="editor" frame={frame} />
    )

    const compactLoad = Number(container.querySelector('svg')?.getAttribute('data-basil-asset-load'))
    const compactBody = container.querySelector('[data-basil-body]')?.parentElement?.getAttribute('transform')
    const compactGrip = container.querySelector('[data-basil-context-focus]')?.getAttribute('transform')
    const compactShadow = Number(container.querySelector('[data-basil-shadow="contact"]')?.getAttribute('rx'))

    rerender(
      <BasilOrb focusAffordance={surface} focusDirection={surface.direction} focusTarget="editor" frame={frame} />
    )

    const surfaceLoad = Number(container.querySelector('svg')?.getAttribute('data-basil-asset-load'))

    expect(surfaceLoad).toBeGreaterThan(compactLoad + 0.15)
    expect(container.querySelector('svg')?.getAttribute('data-basil-asset-weight')).toBe('heavy')
    expect(container.querySelector('[data-basil-asset-effort-cue="heavy"]')).toBeTruthy()
    expect(container.querySelector('[data-basil-body]')?.parentElement?.getAttribute('transform')).not.toBe(compactBody)
    expect(container.querySelector('[data-basil-context-focus]')?.getAttribute('transform')).not.toBe(compactGrip)
    expect(Number(container.querySelector('[data-basil-shadow="contact"]')?.getAttribute('rx'))).toBeGreaterThan(
      compactShadow
    )
  })

  it('tracks the exact object contact with one hand while the other hand counter-braces', () => {
    const bounds = { height: 500, width: 700, x: 200, y: 100 }
    const actor = { x: 80, y: 350 }
    const upper = deriveBasilObjectAffordance('editor', bounds, { x: 850, y: 130 }, actor)
    const lower = deriveBasilObjectAffordance('editor', bounds, { x: 850, y: 570 }, actor)
    const frame = { ...BASIL_STATE_TARGETS.writing, motionPhase: 0.6, state: 'writing' as const }

    const { container, rerender } = render(
      <BasilOrb focusAffordance={upper} focusDirection={upper.direction} focusTarget="editor" frame={frame} />
    )

    const upperPrimary = container.querySelector('[data-basil-limb="primary"] path')?.getAttribute('d')
    const upperSecondary = container.querySelector('[data-basil-limb="secondary"] path')?.getAttribute('d')
    const upperPosture = container.querySelector('[data-basil-contact-posture]')?.getAttribute('transform')

    expect(container.querySelector('svg')?.getAttribute('data-basil-contact-orientation')).toBe('right')
    expect(Number(container.querySelector('svg')?.getAttribute('data-basil-contact-axis'))).toBeLessThan(-0.8)
    expect(Number(container.querySelector('svg')?.getAttribute('data-basil-contact-pressure'))).toBeGreaterThan(0.8)

    rerender(<BasilOrb focusAffordance={lower} focusDirection={lower.direction} focusTarget="editor" frame={frame} />)

    expect(Number(container.querySelector('svg')?.getAttribute('data-basil-contact-axis'))).toBeGreaterThan(0.8)
    expect(container.querySelector('[data-basil-limb="primary"] path')?.getAttribute('d')).not.toBe(upperPrimary)
    expect(container.querySelector('[data-basil-limb="secondary"] path')?.getAttribute('d')).not.toBe(upperSecondary)
    expect(container.querySelector('[data-basil-contact-posture]')?.getAttribute('transform')).not.toBe(upperPosture)
  })

  it('shifts an upright prop posture toward a genuine object above or below Basil', () => {
    const bounds = { height: 240, width: 520, x: 200, y: 260 }
    const point = { x: 460, y: 380 }
    const above = deriveBasilObjectAffordance('document', bounds, point, { x: 460, y: 760 })
    const below = deriveBasilObjectAffordance('document', bounds, point, { x: 460, y: 40 })
    const frame = { ...BASIL_STATE_TARGETS.reading, motionPhase: 0.6, state: 'reading' as const }

    const { container, rerender } = render(
      <BasilOrb focusAffordance={above} focusDirection={above.direction} focusTarget="document" frame={frame} />
    )

    const abovePosture = container.querySelector('[data-basil-contact-posture]')?.getAttribute('transform') ?? ''

    expect(container.querySelector('svg')?.getAttribute('data-basil-contact-orientation')).toBe('above')
    expect(abovePosture).toMatch(/translate\(0 -\d/)

    rerender(<BasilOrb focusAffordance={below} focusDirection={below.direction} focusTarget="document" frame={frame} />)

    expect(container.querySelector('svg')?.getAttribute('data-basil-contact-orientation')).toBe('below')
    expect(container.querySelector('[data-basil-contact-posture]')?.getAttribute('transform')).toMatch(
      /translate\(0 \d/
    )
  })

  it('moves the rendered eyes across the face with the genuine pointer', () => {
    const { container, rerender } = render(
      <BasilOrb
        frame={{ ...BASIL_STATE_TARGETS.idle, pointerActive: true, pointerX: -1, pointerY: 0, state: 'idle' }}
      />
    )

    const leftEyeX = Number(
      container.querySelector<SVGEllipseElement>('[data-basil-eye="left"] ellipse')?.getAttribute('cx')
    )

    rerender(
      <BasilOrb frame={{ ...BASIL_STATE_TARGETS.idle, pointerActive: true, pointerX: 1, pointerY: 0, state: 'idle' }} />
    )

    const rightEyeX = Number(
      container.querySelector<SVGEllipseElement>('[data-basil-eye="left"] ellipse')?.getAttribute('cx')
    )

    expect(container.querySelector('svg')?.getAttribute('data-basil-gaze-source')).toBe('pointer')
    expect(container.querySelector('svg')?.getAttribute('data-basil-face-intent')).toBe('check_in')
    expect(container.querySelector('svg')?.getAttribute('data-basil-face-depth')).not.toBe('1.000,1.000')
    expect(container.querySelector('[data-basil-face-rig]')?.getAttribute('style')).toContain('90ms')
    expect(rightEyeX - leftEyeX).toBeGreaterThan(3)
  })

  it('looks ahead of a fast real pointer and settles when it stops', () => {
    const { container, rerender } = render(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.idle,
          pointerActive: true,
          pointerSpeed: 0.9,
          pointerVelocityX: 0.9,
          pointerX: 0.1,
          pointerY: 0,
          state: 'idle'
        }}
      />
    )

    expect(container.querySelector('svg')?.getAttribute('data-basil-pointer-intent')).toBe('anticipate')
    expect(Number(container.querySelector('svg')?.getAttribute('data-basil-pointer-intent-lead'))).toBeGreaterThan(0.15)
    expect(
      Number(container.querySelector('svg')?.getAttribute('data-basil-pointer-intent-vector')?.split(',')[0])
    ).toBeGreaterThan(0.25)
    expect(container.querySelector('svg')?.getAttribute('data-basil-pointer-vector')).toBe('0.100,0.000')

    rerender(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.idle,
          pointerActive: true,
          pointerDwell: 0.9,
          pointerProximity: 1,
          pointerSpeed: 0,
          pointerVelocityX: 0,
          pointerX: 0.1,
          pointerY: 0,
          state: 'idle'
        }}
      />
    )

    expect(container.querySelector('svg')?.getAttribute('data-basil-pointer-intent')).toBe('settle')
    expect(container.querySelector('svg')?.getAttribute('data-basil-pointer-intent-lead')).toBe('0.000')
  })

  it('orients to an object before reaching, then checks in with a rapidly approaching pointer', () => {
    const affordance = deriveBasilObjectAffordance(
      'editor',
      { height: 320, width: 540, x: 80, y: 100 },
      { x: 120, y: 220 },
      { x: 780, y: 280 }
    )

    const { container, rerender } = render(
      <BasilOrb
        focusAffordance={affordance}
        focusDirection={affordance.direction}
        focusPhase="preview"
        focusTarget="editor"
        frame={{ ...BASIL_STATE_TARGETS.writing, motionPhase: 0.05, state: 'writing' }}
      />
    )

    expect(container.querySelector('svg')?.getAttribute('data-basil-face-intent')).toBe('orient')
    const objectVector = container.querySelector('svg')?.getAttribute('data-basil-face-vector')

    rerender(
      <BasilOrb
        focusAffordance={affordance}
        focusDirection={affordance.direction}
        focusPhase="engaged"
        focusTarget="editor"
        frame={{
          ...BASIL_STATE_TARGETS.writing,
          motionPhase: 0.6,
          pointerActive: true,
          pointerApproach: 1,
          pointerProximity: 0.9,
          pointerSpeed: 0.8,
          pointerX: 1,
          pointerY: 0,
          state: 'writing'
        }}
      />
    )

    expect(container.querySelector('svg')?.getAttribute('data-basil-face-intent')).toBe('check_in')
    expect(container.querySelector('svg')?.getAttribute('data-basil-face-vector')).not.toBe(objectVector)
  })

  it('switches from object focus to shared attention when the pointer comes close during work', () => {
    const affordance = deriveBasilObjectAffordance(
      'editor',
      { height: 320, width: 540, x: 80, y: 100 },
      { x: 120, y: 220 },
      { x: 780, y: 280 }
    )

    const frame = {
      ...BASIL_STATE_TARGETS.writing,
      pointerActive: true,
      pointerProximity: 0,
      pointerX: 1,
      pointerY: 0,
      state: 'writing' as const
    }

    const { container, rerender } = render(
      <BasilOrb
        focusAffordance={affordance}
        focusDirection={affordance.direction}
        focusPhase="engaged"
        focusTarget="editor"
        frame={frame}
      />
    )

    const objectVector = container.querySelector('svg')?.getAttribute('data-basil-gaze-vector')

    expect(container.querySelector('svg')?.getAttribute('data-basil-gaze-source')).toBe('object')
    expect(container.querySelector('[data-basil-brow="focused"]')).toBeTruthy()

    rerender(
      <BasilOrb
        focusAffordance={affordance}
        focusDirection={affordance.direction}
        focusPhase="engaged"
        focusTarget="editor"
        frame={{ ...frame, pointerProximity: 1 }}
      />
    )

    expect(container.querySelector('svg')?.getAttribute('data-basil-gaze-source')).toBe('shared')
    expect(container.querySelector('svg')?.getAttribute('data-basil-gaze-vector')).not.toBe(objectVector)
  })

  it('looks to the user with a curious expression when permission is required', () => {
    const { container } = render(
      <BasilOrb
        focusTarget="permission"
        frame={{
          ...BASIL_STATE_TARGETS.awaiting_permission,
          pointerActive: true,
          pointerX: -0.8,
          pointerY: -0.2,
          state: 'awaiting_permission'
        }}
      />
    )

    expect(container.querySelector('svg')?.getAttribute('data-basil-gaze-source')).toBe('pointer')
    expect(container.querySelector('[data-basil-brow="curious"]')).toBeTruthy()
    expect(container.querySelector('[data-basil-protection-ring] path')?.getAttribute('d')).toContain('49 -34')
    expect(container.querySelector('[data-basil-body]')?.tagName.toLowerCase()).toBe('circle')
  })

  it('reacts to a rapid pointer approach and a nearby dwell', () => {
    const { container } = render(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.idle,
          motionPhase: 1 / 6,
          pointerApproach: 0.9,
          pointerDwell: 1,
          pointerSpeed: 0,
          state: 'idle'
        }}
      />
    )

    expect(container.querySelector('[data-basil-pointer-reaction="surprise"]')).toBeTruthy()
    expect(container.querySelector('[data-basil-pointer-reaction="blush"]')).toBeTruthy()
    expect(container.querySelector('[data-basil-eye="right"]')?.tagName.toLowerCase()).toBe('path')
    expect(container.querySelector('svg')?.getAttribute('data-basil-pointer-dwell')).toBe('1.000')
  })

  it('shows a procedural affection response after a genuine tap impulse', () => {
    const { container } = render(
      <BasilOrb frame={{ ...BASIL_STATE_TARGETS.idle, affection: 1, motionPhase: 0.2, state: 'idle' }} />
    )

    expect(container.querySelector('[data-basil-pointer-reaction="affection"]')).toBeTruthy()
    expect(container.querySelector('[data-basil-eye="left"]')?.tagName.toLowerCase()).toBe('path')
    expect(container.querySelector('[data-basil-eye="right"]')?.tagName.toLowerCase()).toBe('path')
    expect(container.querySelector('svg')?.getAttribute('data-basil-affection')).toBe('1.000')
  })

  it('renders a directional whoosh for a real pointer swipe', () => {
    const { container } = render(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.idle,
          pointerSwipe: 0.9,
          pointerSwipeX: 1,
          pointerSwipeY: 0,
          state: 'idle'
        }}
      />
    )

    expect(container.querySelector('[data-basil-pointer-reaction="swipe"]')).toBeTruthy()
    expect(container.querySelector('[data-basil-pointer-reaction="surprise"]')).toBeTruthy()
    expect(container.querySelector('svg')?.getAttribute('data-basil-pointer-swipe-direction')).toBe('1.000,0.000')
  })

  it('renders a playful directional halo for a completed pointer orbit', () => {
    const { container } = render(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.idle,
          motionPhase: 0.25,
          pointerOrbit: 0.85,
          pointerOrbitDirection: -1,
          state: 'idle'
        }}
      />
    )

    expect(container.querySelector('[data-basil-pointer-reaction="orbit"]')).toBeTruthy()
    expect(container.querySelector('[data-basil-eye="right"]')?.tagName.toLowerCase()).toBe('path')
    expect(container.querySelector('svg')?.getAttribute('data-basil-pointer-orbit-direction')).toBe('-1.000')
  })

  it('renders a contented crown and antenna wag for genuine pointer petting', () => {
    const { container, rerender } = render(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.idle,
          motionPhase: 0.22,
          pointerPet: 0.86,
          pointerPetDirection: -1,
          state: 'idle'
        }}
      />
    )

    expect(container.querySelector('[data-basil-pointer-reaction="petting"]')).toBeTruthy()
    expect(container.querySelector('[data-basil-eye="left"]')?.tagName.toLowerCase()).toBe('path')
    expect(
      Number(container.querySelector('[data-basil-accessory="antenna"]')?.getAttribute('data-basil-antenna-wag'))
    ).toBeLessThan(0)
    expect(container.querySelector('svg')?.getAttribute('data-basil-pointer-pet')).toBe('0.860')

    rerender(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.awaiting_permission,
          motionPhase: 0.22,
          pointerPet: 0.86,
          pointerPetDirection: -1,
          state: 'awaiting_permission'
        }}
      />
    )

    expect(container.querySelector('[data-basil-pointer-reaction="petting"]')).toBeNull()
    expect(container.querySelector('svg')?.getAttribute('data-basil-pointer-pet')).toBe('0.000')
    expect(container.querySelector('[data-basil-protection-ring]')).toBeTruthy()
  })

  it('holds a curious edge glance after pointer departure without overriding authoritative states', () => {
    const { container, rerender } = render(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.idle,
          pointerDeparture: 0.84,
          pointerDepartureX: 1,
          pointerDepartureY: -0.5,
          state: 'idle'
        }}
      />
    )

    expect(container.querySelector('[data-basil-pointer-reaction="departure"]')).toBeTruthy()
    expect(container.querySelector('svg')?.getAttribute('data-basil-gaze-brow')).toBe('curious')
    expect(container.querySelector('svg')?.getAttribute('data-basil-pointer-departure')).toBe('0.840')
    expect(
      Number(container.querySelector('svg')?.getAttribute('data-basil-gaze-vector')?.split(',')[0])
    ).toBeGreaterThan(0.5)

    rerender(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.awaiting_permission,
          pointerDeparture: 0.84,
          pointerDepartureX: 1,
          pointerDepartureY: -0.5,
          state: 'awaiting_permission'
        }}
      />
    )

    expect(container.querySelector('[data-basil-pointer-reaction="departure"]')).toBeNull()
    expect(container.querySelector('svg')?.getAttribute('data-basil-pointer-departure')).toBe('0.000')
    expect(container.querySelector('[data-basil-protection-ring]')).toBeTruthy()
  })

  it('renders a compact welcome-back wave only in social resting states', () => {
    const { container, rerender } = render(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.idle,
          motionPhase: 0.18,
          pointerReturn: 0.9,
          pointerReturnX: -1,
          pointerReturnY: 0.2,
          state: 'idle'
        }}
      />
    )

    expect(container.querySelector('[data-basil-pointer-reaction="return"]')).toBeTruthy()
    expect(container.querySelector('[data-basil-eye="left"]')?.tagName.toLowerCase()).toBe('path')
    expect(container.querySelector('svg')?.getAttribute('data-basil-pointer-return')).toBe('0.900')
    expect(container.querySelector('svg')?.getAttribute('data-basil-pointer-return-side')).toBe('1')

    rerender(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.thinking,
          motionPhase: 0.18,
          pointerReturn: 0.9,
          pointerReturnX: -1,
          pointerReturnY: 0.2,
          state: 'thinking'
        }}
      />
    )

    expect(container.querySelector('[data-basil-pointer-reaction="return"]')).toBeNull()
    expect(container.querySelector('svg')?.getAttribute('data-basil-pointer-return')).toBe('0.000')
  })

  it('renders a compact direct-touch boop without overriding active work', () => {
    const { container, rerender } = render(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.idle,
          pointerBoop: 0.92,
          state: 'idle'
        }}
      />
    )

    expect(container.querySelector('[data-basil-pointer-reaction="boop"]')).toBeTruthy()
    expect(container.querySelector('[data-basil-pointer-reaction="surprise"]')).toBeTruthy()
    expect(container.querySelector('svg')?.getAttribute('data-basil-pointer-boop')).toBe('0.920')
    expect(container.querySelector('[data-basil-pointer-reaction="affection"]')).toBeNull()

    rerender(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.writing,
          pointerBoop: 0.92,
          state: 'writing'
        }}
      />
    )

    expect(container.querySelector('[data-basil-pointer-reaction="boop"]')).toBeNull()
    expect(container.querySelector('svg')?.getAttribute('data-basil-pointer-boop')).toBe('0.000')
  })

  it('renders a directional happy wiggle for genuine wheel tickling', () => {
    const { container } = render(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.idle,
          pointerTickle: 0.82,
          pointerTickleDirection: -1,
          state: 'idle'
        }}
      />
    )

    expect(container.querySelector('[data-basil-pointer-reaction="tickle"]')).toBeTruthy()
    expect(container.querySelector('[data-basil-eye="left"]')?.tagName.toLowerCase()).toBe('path')
    expect(container.querySelector('svg')?.getAttribute('data-basil-pointer-tickle')).toBe('0.820')
    expect(container.querySelector('svg')?.getAttribute('data-basil-pointer-tickle-direction')).toBe('-1.000')
  })

  it('moves procedural shell light and contact shadow with genuine gaze direction', () => {
    const { container, rerender } = render(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.idle,
          pointerActive: true,
          pointerX: -1,
          pointerY: 0,
          state: 'idle'
        }}
      />
    )

    const leftLight = container.querySelector('svg')?.getAttribute('data-basil-shell-light')
    const leftShadow = Number(container.querySelector('svg')?.getAttribute('data-basil-shell-shadow-offset'))
    const leftRim = container.querySelector('[data-basil-shell-rim]')?.getAttribute('transform')

    const leftEyeCenter = Number(
      container.querySelector('[data-basil-eye="left"] > ellipse:first-child')?.getAttribute('cx')
    )

    const leftGlintOffset =
      Number(container.querySelector('[data-basil-eye-glint="left"]')?.getAttribute('cx')) - leftEyeCenter

    rerender(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.idle,
          pointerActive: true,
          pointerX: 1,
          pointerY: 0,
          state: 'idle'
        }}
      />
    )

    expect(container.querySelector('svg')?.getAttribute('data-basil-shell-light')).not.toBe(leftLight)
    expect(Number(container.querySelector('svg')?.getAttribute('data-basil-shell-shadow-offset'))).toBeGreaterThan(
      leftShadow
    )
    expect(container.querySelector('[data-basil-shell-rim]')?.getAttribute('transform')).not.toBe(leftRim)

    const rightEyeCenter = Number(
      container.querySelector('[data-basil-eye="left"] > ellipse:first-child')?.getAttribute('cx')
    )

    const rightGlintOffset =
      Number(container.querySelector('[data-basil-eye-glint="left"]')?.getAttribute('cx')) - rightEyeCenter

    expect(rightGlintOffset).toBeLessThan(leftGlintOffset)
  })

  it('renders a personality cue as the single primary prop while retaining the antenna', () => {
    const behavior = BASIL_PERSONALITY_BY_ID.get('permission-guardian')!
    const personality = sampleBasilPersonality(behavior, behavior.durationMs * 0.5)

    const { container } = render(
      <BasilOrb
        frame={{
          ...BASIL_STATE_TARGETS.awaiting_permission,
          motionPhase: 0.5,
          state: 'awaiting_permission'
        }}
        personality={personality}
      />
    )

    expect(container.querySelector('svg')?.getAttribute('data-basil-personality')).toBe('permission-guardian')
    expect(container.querySelector('[data-basil-personality-cue="guardian"]')).toBeTruthy()
    expect(container.querySelector('[data-basil-accessory="antenna"]')).toBeTruthy()
    expect(container.querySelector('[data-basil-protection-ring]')).toBeNull()
  })
})
