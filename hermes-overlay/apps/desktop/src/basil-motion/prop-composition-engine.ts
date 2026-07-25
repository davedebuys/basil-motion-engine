import { basilAccessoryAttachmentKind } from './accessory-attachment-engine'
import type { BasilInteractionAccessory } from './types'

export type BasilPropCompositionRole = 'context' | 'interaction' | 'none' | 'semantic_badge' | 'symbol' | 'worn'

export interface BasilPropCompositionInput {
  accessory?: BasilInteractionAccessory | null
  hasPhysicalContext: boolean
}

export interface BasilPropCompositionPose {
  accessoryOpacity: number
  accessoryRole: BasilPropCompositionRole
  contextOpacity: number
  gripOpacity: number
}

export function deriveBasilPropComposition({
  accessory,
  hasPhysicalContext
}: BasilPropCompositionInput): BasilPropCompositionPose {
  if (!accessory) {
    return {
      accessoryOpacity: 0,
      accessoryRole: 'none',
      contextOpacity: 1,
      gripOpacity: 0
    }
  }

  const attachment = basilAccessoryAttachmentKind(accessory)

  if (accessory === 'antenna') {
    return {
      accessoryOpacity: 0,
      accessoryRole: 'worn',
      contextOpacity: 1,
      gripOpacity: 0
    }
  }

  if (attachment === 'held') {
    if (hasPhysicalContext) {
      return {
        accessoryOpacity: 0.54,
        accessoryRole: 'semantic_badge',
        contextOpacity: 1,
        gripOpacity: 0
      }
    }

    return {
      accessoryOpacity: 0.9,
      accessoryRole: 'interaction',
      contextOpacity: 0,
      gripOpacity: 1
    }
  }

  return {
    accessoryOpacity: attachment === 'worn' ? 0.84 : 0.88,
    accessoryRole: attachment === 'worn' ? 'worn' : 'symbol',
    contextOpacity: 1,
    gripOpacity: 0
  }
}
