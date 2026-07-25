import { describe, expect, it } from 'vitest'

import { basilHandoffPayloadKindForTarget, createBasilHandoffPayload } from './handoff-engine'

describe('Basil handoff payloads', () => {
  it('carries generic work types between different real surfaces', () => {
    expect(createBasilHandoffPayload('editor', 'terminal')).toEqual({
      kind: 'code',
      source: 'editor',
      target: 'terminal'
    })
    expect(createBasilHandoffPayload('web', 'document')?.kind).toBe('web')
    expect(createBasilHandoffPayload('image', 'data')?.kind).toBe('image')
    expect(createBasilHandoffPayload('conversation', 'composer')?.kind).toBe('message')
  })

  it('does not invent a payload for first visits, repeats, or safety scenes', () => {
    expect(createBasilHandoffPayload(null, 'editor')).toBeNull()
    expect(createBasilHandoffPayload('editor', 'editor')).toBeNull()
    expect(createBasilHandoffPayload('editor', 'permission')).toBeNull()
    expect(createBasilHandoffPayload('editor', 'error')).toBeNull()
    expect(createBasilHandoffPayload('editor', 'rest')).toBeNull()
  })

  it('exposes privacy-safe generic payload glyphs for task journey trails', () => {
    expect(basilHandoffPayloadKindForTarget('document')).toBe('document')
    expect(basilHandoffPayloadKindForTarget('editor')).toBe('code')
    expect(basilHandoffPayloadKindForTarget('terminal')).toBe('code')
    expect(basilHandoffPayloadKindForTarget('web')).toBe('web')
    expect(basilHandoffPayloadKindForTarget('permission')).toBeNull()
  })
})
