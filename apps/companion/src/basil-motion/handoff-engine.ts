import type { BasilSceneTarget } from './types'

export type BasilHandoffPayloadKind =
  | 'code'
  | 'data'
  | 'document'
  | 'folder'
  | 'image'
  | 'message'
  | 'tool'
  | 'web'

export interface BasilHandoffPayload {
  kind: BasilHandoffPayloadKind
  source: BasilSceneTarget
  target: BasilSceneTarget
}

const PAYLOAD_KIND_BY_TARGET: Partial<Record<BasilSceneTarget, BasilHandoffPayloadKind>> = {
  composer: 'message',
  conversation: 'message',
  data: 'data',
  document: 'document',
  editor: 'code',
  folder: 'folder',
  image: 'image',
  terminal: 'code',
  tool: 'tool',
  web: 'web'
}

export function basilHandoffPayloadKindForTarget(
  target: BasilSceneTarget
): BasilHandoffPayloadKind | null {
  return PAYLOAD_KIND_BY_TARGET[target] ?? null
}

export function createBasilHandoffPayload(
  source: BasilSceneTarget | null | undefined,
  target: BasilSceneTarget
): BasilHandoffPayload | null {
  if (!source || source === target || target === 'error' || target === 'permission' || target === 'rest') {
    return null
  }

  const kind = basilHandoffPayloadKindForTarget(source)

  return kind ? { kind, source, target } : null
}
