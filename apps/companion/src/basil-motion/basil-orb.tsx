import { useId } from 'react'

import { type BasilActorDragPose, deriveBasilActorDragPose } from './actor-drag-engine'
import { deriveBasilAntennaSignal } from './antenna-signal-engine'
import { deriveBasilAssetPhysics } from './asset-physics-engine'
import { deriveBasilContactKinematics } from './contact-kinematics-engine'
import { deriveBasilDirectTouchPose } from './direct-touch-engine'
import type { BasilDragCollaborationPose } from './drag-collaboration-engine'
import { deriveBasilEngagementPose } from './engagement-engine'
import {
  type BasilExternalActivityInput,
  type BasilExternalActivityPose,
  deriveBasilExternalActivityPose
} from './external-activity-engine'
import { deriveBasilFaceIntentPose } from './face-intent-engine'
import { type BasilBrowExpression, deriveBasilGazePose } from './gaze-engine'
import {
  type BasilHandoffPayloadKind,
  basilHandoffPayloadKindForTarget,
  createBasilHandoffPayload
} from './handoff-engine'
import { InteractionAccessory } from './interaction-accessory'
import { basilCarryPose, type BasilCarryPose, type BasilLimbPose, basilSceneLimbPose } from './limb-engine'
import { deriveBasilLocomotionPose } from './locomotion-engine'
import { applyBasilManipulationMotion, deriveBasilManipulationPose } from './manipulation-engine'
import type { BasilObjectAffordance } from './object-affordance'
import { BasilPersonalityCue } from './personality-cue'
import type { BasilPersonalityPose } from './personality-engine'
import type { BasilPointOfInterestPose } from './point-of-interest-engine'
import { type BasilPointerContactPose, deriveBasilPointerContact } from './pointer-contact-engine'
import { deriveBasilPointerDeparture, deriveBasilPointerReturn } from './pointer-departure-engine'
import { deriveBasilPointerIntent } from './pointer-intent-engine'
import { deriveBasilPropComposition } from './prop-composition-engine'
import type { BasilScenePhase } from './scene-choreography'
import { basilSceneMotion, type BasilSceneMotion } from './scene-motion'
import { deriveBasilShellLighting } from './shell-lighting-engine'
import { type BasilSpeechExpressionPose, deriveBasilSpeechExpression } from './speech-expression-engine'
import { applyBasilTaskActionMotion, type BasilTaskCue, deriveBasilTaskAction } from './task-action-engine'
import type {
  BasilMotionFrame,
  BasilSceneTarget,
  BasilState,
  BasilTaskJourneySnapshot,
  BasilTaskPhase,
  GenericAgentEvent
} from './types'
import type { BasilWorkspaceCoordinationPose } from './workspace-coordination-engine'

const PARTICLES = [
  [18, 38],
  [27, 101],
  [48, 18],
  [96, 20],
  [119, 43],
  [112, 103],
  [72, 121],
  [20, 70]
] as const

interface BasilOrbProps {
  dragCollaboration?: BasilDragCollaborationPose | null
  externalActivity?: BasilExternalActivityInput | null
  focusAffordance?: BasilObjectAffordance | null
  focusDirection?: { x: number; y: number }
  focusIntensity?: number
  focusPhase?: BasilScenePhase
  focusTarget?: BasilSceneTarget
  frame: BasilMotionFrame
  journey?: BasilTaskJourneySnapshot
  personality?: BasilPersonalityPose | null
  pointOfInterest?: BasilPointOfInterestPose | null
  size?: number
  taskKind?: GenericAgentEvent['kind']
  taskPhase?: BasilTaskPhase
  workspaceCoordination?: BasilWorkspaceCoordinationPose | null
}

function TaskPhaseCue({ cue, target }: { cue: BasilTaskCue; target?: BasilSceneTarget }) {
  if (cue === 'none') {
    return null
  }

  const upper = target === 'composer' || target === 'web'
  const transform = `translate(62 ${upper ? -34 : -7})`

  if (cue === 'dots') {
    return (
      <g data-basil-task-phase-cue="prepare" fill="currentColor" opacity="0.62" transform={transform}>
        <circle cx="-5" r="1.2" />
        <circle r="1.2" />
        <circle cx="5" r="1.2" />
      </g>
    )
  }

  if (cue === 'magnify') {
    return (
      <g
        data-basil-task-phase-cue="inspect"
        fill="none"
        opacity="0.7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.25"
        transform={transform}
      >
        <circle cx="-1" cy="-1" r="4" />
        <path d="M 2 2 L 6 6" />
      </g>
    )
  }

  if (cue === 'check') {
    return (
      <g
        data-basil-task-phase-cue="complete"
        fill="var(--ui-chat-surface-background)"
        opacity="0.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.25"
        transform={transform}
      >
        <circle r="6" />
        <path d="M -3 0 L -0.5 2.5 L 3.8 -2.5" fill="none" />
      </g>
    )
  }

  return (
    <g
      data-basil-task-phase-cue="execute"
      fill="none"
      opacity="0.48"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.1"
      transform={transform}
    >
      <path d="M -5 -2 L -8 -4 M -5 2 L -8 4 M 3 -4 L 7 -6" />
    </g>
  )
}

function ContextCue({ motion, target }: { motion: BasilSceneMotion; target?: BasilSceneTarget }) {
  if (!target || target === 'rest' || target === 'conversation') {
    return null
  }

  if (target === 'document') {
    return (
      <g
        data-basil-context="document"
        data-basil-scene-action="page-scan"
        transform={`translate(52 ${18 + motion.propLift}) rotate(${5 + motion.propRotation})`}
      >
        <path
          d="M -12 -13 L 5 -13 L 11 -7 L 11 14 L -12 14 Z"
          fill="var(--ui-chat-surface-background)"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path
          d="M 5 -13 L 5 -7 L 11 -7 M -7 -3 L 6 -3 M -7 2 L 6 2 M -7 7 L 2 7"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1"
        />
        <path
          d={`M -9 ${-7 + motion.progress * 15} H 7`}
          opacity={0.25 + motion.pulse * 0.45}
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
      </g>
    )
  }

  if (target === 'folder') {
    return (
      <g
        data-basil-context="folder"
        data-basil-scene-action="folder-open"
        transform={`translate(52 ${18 + motion.propLift}) rotate(${4 + motion.propRotation})`}
      >
        <path
          d="M -14 -8 H -4 L 0 -4 H 14 V 12 H -14 Z"
          fill="var(--ui-chat-surface-background)"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
        <path
          d="M -14 -3 H 14 L 11 13 H -11 Z"
          fill="var(--ui-chat-surface-background)"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.5"
          transform={`translate(0 ${motion.gesture * 1.3}) rotate(${-motion.gesture * 5} 0 12)`}
        />
        <path d="M -9 3 H 7" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.1" />
      </g>
    )
  }

  if (target === 'image') {
    const scanX = -11 + motion.progress * 22

    return (
      <g
        data-basil-context="image"
        data-basil-scene-action="image-inspect"
        transform={`translate(52 ${15 + motion.propLift}) rotate(${motion.propRotation})`}
      >
        <rect
          fill="var(--ui-chat-surface-background)"
          height="25"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.6"
          width="30"
          x="-15"
          y="-12"
        />
        <circle cx="7" cy="-5" fill="none" r="2.6" stroke="currentColor" strokeWidth="1.2" />
        <path
          d="M -12 9 L -5 1 L 0 6 L 5 1 L 12 9"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.3"
        />
        <path d={`M ${scanX} -9 V 10`} opacity={0.22 + motion.pulse * 0.58} stroke="currentColor" strokeWidth="1.35" />
        <path
          d="M -17 -8 V -14 H -11 M 17 -8 V -14 H 11 M -17 8 V 14 H -11 M 17 8 V 14 H 11"
          fill="none"
          opacity={0.35 + motion.pulse * 0.45}
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.1"
        />
      </g>
    )
  }

  if (target === 'data') {
    const cursorX = -10 + motion.progress * 20

    return (
      <g
        data-basil-context="data"
        data-basil-scene-action="data-analyze"
        transform={`translate(52 ${16 + motion.propLift}) rotate(${motion.propRotation})`}
      >
        <rect
          fill="var(--ui-chat-surface-background)"
          height="25"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.6"
          width="31"
          x="-15.5"
          y="-12"
        />
        <path d="M -11 9 V -7 M -11 9 H 12" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.1" />
        <path
          d={`M -8 7 V ${3 - motion.pulse * 3} M -3 7 V ${-1 - motion.pulse * 2} M 2 7 V ${2 - motion.pulse * 4} M 7 7 V ${-5 + motion.pulse * 2}`}
          stroke="currentColor"
          strokeWidth="2.4"
        />
        <path
          d="M -9 3 L -4 -1 L 1 1 L 8 -6"
          fill="none"
          opacity="0.7"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.1"
        />
        <circle cx={cursorX} cy={2 - motion.gesture} fill="currentColor" opacity={0.35 + motion.pulse * 0.55} r="1.7" />
      </g>
    )
  }

  if (target === 'editor') {
    return (
      <g
        data-basil-context="editor"
        data-basil-scene-action="code-typing"
        transform={`translate(52 ${17 + motion.propLift}) rotate(${-3 + motion.propRotation})`}
      >
        <rect
          fill="var(--ui-chat-surface-background)"
          height="23"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.6"
          width="29"
          x="-14"
          y="-11"
        />
        <path d="M -14 -5 H 15" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="-10" cy="-8" fill="currentColor" r="1" />
        <circle cx="-6.5" cy="-8" fill="currentColor" opacity="0.5" r="1" />
        <path
          d={`M -9 0 H ${-9 + motion.progress * 11} M -9 4 H ${-5 + motion.progress * 14} M -9 8 H ${-7 + motion.progress * 9}`}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.2"
        />
        <rect fill="currentColor" height="2" opacity={motion.pulse} width="1.2" x={-8 + motion.progress * 13} y="7" />
      </g>
    )
  }

  if (target === 'web') {
    return (
      <g
        data-basil-context="web"
        data-basil-scene-action="web-scan"
        transform={`translate(52 ${-17 + motion.propLift}) rotate(${motion.propRotation})`}
      >
        <rect
          fill="var(--ui-chat-surface-background)"
          height="18"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.6"
          width="25"
          x="-12"
          y="-9"
        />
        <path
          d="M -12 -3 L 13 -3 M -8 -6 L -7 -6 M -4 -6 L -3 -6 M 1 5 L 8 -1 M 4 -1 L 8 -1 L 8 3"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.2"
        />
        <path
          d={`M ${-10 + motion.progress * 18} -1 V 7`}
          opacity={0.2 + motion.pulse * 0.6}
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.4"
        />
        <circle
          cx={-10 + motion.progress * 18}
          cy="7"
          fill="currentColor"
          opacity={0.25 + motion.pulse * 0.5}
          r="1.5"
        />
      </g>
    )
  }

  if (target === 'tool') {
    return (
      <g
        data-basil-context="tool"
        data-basil-scene-action="tool-adjust"
        transform={`translate(52 ${17 + motion.propLift}) rotate(${motion.propRotation})`}
      >
        <rect
          fill="var(--ui-chat-surface-background)"
          height="22"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.6"
          width="28"
          x="-14"
          y="-11"
        />
        <path d="M -9 -5 H 9 M -9 1 H 9 M -9 7 H 9" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
        <circle
          cx={-5 + motion.progress * 10}
          cy="-5"
          fill="var(--ui-chat-surface-background)"
          r="2.1"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <circle
          cx={5 - motion.progress * 8}
          cy="1"
          fill="var(--ui-chat-surface-background)"
          r="2.1"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <circle
          cx={-2 + motion.progress * 7}
          cy="7"
          fill="var(--ui-chat-surface-background)"
          r="2.1"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </g>
    )
  }

  if (target === 'terminal') {
    return (
      <g
        data-basil-context="terminal"
        data-basil-scene-action="terminal-typing"
        transform={`translate(52 ${17 + motion.propLift}) rotate(${2 + motion.propRotation})`}
      >
        <rect fill="currentColor" height="22" rx="2" width="30" x="-15" y="-11" />
        <path d="M -15 -5 H 15" stroke="var(--ui-chat-surface-background)" strokeWidth="1" />
        <circle cx="-11" cy="-8" fill="var(--ui-chat-surface-background)" r="1" />
        <path
          d={`M -10 0 L -6 3 L -10 6 M -2 6 H ${-2 + motion.progress * 10}`}
          fill="none"
          stroke="var(--ui-chat-surface-background)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <rect
          fill="var(--ui-chat-surface-background)"
          height="1.5"
          opacity={motion.pulse}
          width="2"
          x={-1 + motion.progress * 10}
          y="5.25"
        />
      </g>
    )
  }

  if (target === 'composer') {
    return (
      <g
        data-basil-context="composer"
        data-basil-scene-action="compose"
        transform={`translate(52 ${-18 + motion.propLift}) rotate(${motion.propRotation})`}
      >
        <path
          d="M -13 -8 H 13 V 7 H 2 L -4 13 V 7 H -13 Z"
          fill="var(--ui-chat-surface-background)"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path d="M -8 -2 H 8 M -8 2 H 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.1" />
        <circle cx={-7 + motion.progress * 13} cy="2" fill="currentColor" opacity={motion.pulse} r="1.2" />
      </g>
    )
  }

  if (target === 'permission') {
    return (
      <path
        d="M 51 -27 L 60 -22 L 58 -9 L 51 -3 L 44 -9 L 42 -22 Z"
        data-basil-context="permission"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    )
  }

  return (
    <text
      data-basil-context="error"
      fill="currentColor"
      fontFamily="monospace"
      fontSize="17"
      fontWeight="800"
      x="51"
      y="-26"
    >
      !
    </text>
  )
}

function LimbRig({ pose, target }: { pose: BasilLimbPose; target: BasilSceneTarget | 'carried-work' }) {
  const limbs = [pose.primary, pose.secondary].filter((item): item is BasilLimbPose['primary'] => Boolean(item))

  return (
    <g data-basil-hand={target} data-basil-limb-intent={pose.intent} opacity={pose.opacity}>
      {limbs.map((item, index) => (
        <g data-basil-limb={index === 0 ? 'primary' : 'secondary'} key={index}>
          <path
            d={`M ${item.shoulder.x} ${item.shoulder.y} Q ${item.elbow.x} ${item.elbow.y} ${item.hand.x} ${item.hand.y}`}
            fill="none"
            stroke="var(--ui-chat-surface-background)"
            strokeLinecap="round"
            strokeWidth="4.4"
          />
          <path
            d={`M ${item.shoulder.x} ${item.shoulder.y} Q ${item.elbow.x} ${item.elbow.y} ${item.hand.x} ${item.hand.y}`}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.65"
          />
          <g transform={`translate(${item.hand.x} ${item.hand.y}) rotate(${item.gripDegrees})`}>
            <circle fill="var(--ui-chat-surface-background)" r="2.7" stroke="currentColor" strokeWidth="1.25" />
            <path
              d="M 1 -1.5 Q 4 -3 5.2 -0.7 M 1 0.8 Q 4 2.5 5.1 0.6"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="0.9"
            />
          </g>
        </g>
      ))}
    </g>
  )
}

function ContactFeedback({ intensity, pose }: { intensity: number; pose: BasilLimbPose }) {
  if (intensity <= 0.035) {
    return null
  }

  return (
    <g
      data-basil-object-contact-feedback=""
      fill="none"
      opacity={Math.min(0.78, intensity * 0.9)}
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.05"
      transform={`translate(${pose.primary.hand.x} ${pose.primary.hand.y})`}
    >
      <path d="M -2 -5 L -3.5 -8 M 3 -4 L 5.5 -6 M 4 1 L 8 1.5" />
    </g>
  )
}

function DragCollaborationCue({ pose }: { pose: BasilDragCollaborationPose }) {
  if (!pose.active || pose.phase === 'idle') {
    return null
  }

  const carry = pose.phase === 'carry'
  const release = pose.phase === 'release'
  const opacity = Math.min(0.82, 0.3 + pose.strength * 0.56)

  return (
    <g
      data-basil-drag-assist={pose.phase}
      fill="none"
      opacity={opacity}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform={`scale(${pose.side} 1)`}
    >
      <path
        d="M 34 2 Q 43 -5 50 1"
        opacity={0.44 + pose.grip * 0.4}
        strokeDasharray={carry ? '2 2' : undefined}
        strokeWidth="1.15"
      />
      <path
        d="M 43 -7 L 47 -11 M 50 -5 L 56 -7 M 38 -2 L 34 -4"
        opacity={0.34 + pose.effort * 0.46}
        strokeWidth="1.05"
      />
      {release ? (
        <>
          <path d="M 48 5 L 55 1 M 50 10 L 58 10 M 45 13 L 49 18" strokeWidth="1.25" />
          <circle cx="58" cy="1" fill="currentColor" r="1.15" stroke="none" />
        </>
      ) : (
        <path
          d={`M 46 5 Q ${51 + pose.grip * 3} ${8 - pose.grip * 2} 57 4`}
          opacity={0.48 + pose.grip * 0.35}
          strokeWidth="1.35"
        />
      )}
    </g>
  )
}

function WorkspaceCoordinationCue({ pose }: { pose: BasilWorkspaceCoordinationPose }) {
  if (!pose.active) {
    return null
  }

  const pointerSide = pose.gazeX < 0 ? -1 : 1

  return (
    <g
      data-basil-workspace-cue="after-you"
      fill="none"
      opacity={0.38 + pose.acknowledgment * 0.48}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform={`scale(${pointerSide} 1)`}
    >
      <path d="M 35 7 Q 43 3 49 8 Q 52 10 56 7" strokeWidth="1.35" />
      <path d="M 49 8 L 52 3 M 52 9 L 56 5 M 54 11 L 59 9" strokeWidth="1.05" />
      <path
        d={`M 38 -8 Q ${45 + pose.strength * 3} -14 53 -9 M 49 -13 L 54 -9 L 49 -6`}
        opacity={0.42 + pose.strength * 0.38}
        strokeDasharray="2 2"
        strokeWidth="1.05"
      />
    </g>
  )
}

function ExternalActivityCue({ pose, side }: { pose: BasilExternalActivityPose; side: number }) {
  if (!pose.active || pose.kind === 'typing' || !pose.kind) {
    return null
  }

  const pop = 0.84 + pose.pulse * 0.16
  const lift = -pose.pulse * 2.4

  if (pose.kind === 'adjusting') {
    return (
      <g
        data-basil-adjustment-cue=""
        fill="none"
        opacity={0.36 + pose.intensity * 0.52}
        stroke="currentColor"
        strokeLinecap="round"
        transform={`scale(${side} 1) translate(49 ${-20 + lift}) scale(${pop})`}
      >
        <circle fill="white" r="9" strokeWidth="1.2" />
        <g transform={`rotate(${-55 + pose.progress * 110})`}>
          <path d="M 0 1 L 0 -6" strokeWidth="1.7" />
          <circle cy="1" fill="currentColor" r="1.5" stroke="none" />
        </g>
        <path d="M -7 5 A 8 8 0 0 0 7 5" opacity="0.55" strokeWidth="1" />
        <path d="M -11 -8 L -14 -11 M 11 -8 L 14 -11" opacity={pose.pulse} strokeWidth="1" />
      </g>
    )
  }

  if (pose.kind === 'departing') {
    return (
      <g
        data-basil-departing-cue=""
        fill="white"
        opacity={0.42 + pose.intensity * 0.48}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform={`scale(${side} 1) translate(48 ${-18 + lift}) rotate(${pose.propRotation}) scale(${pop})`}
      >
        <path
          d="M -3 7 C -7 2 -7 -4 -3 -7 C -1 -8 0 -6 0 -4 V -10 C 0 -12 3 -12 3 -9 V -4 V -8 C 3 -10 6 -10 6 -7 V -2 C 9 -5 11 -3 10 0 C 9 6 5 10 0 10 C -1 10 -2 9 -3 7 Z"
          strokeWidth="1.2"
        />
        <path d="M 12 -8 Q 16 -5 14 -1 M 15 -12 Q 22 -6 18 1" fill="none" opacity={pose.pulse} strokeWidth="1" />
      </g>
    )
  }

  if (pose.kind === 'invoking') {
    const press = Math.max(0, Math.sin(pose.progress * Math.PI)) * 2.2

    return (
      <g
        data-basil-invocation-cue=""
        fill="white"
        opacity={0.4 + pose.intensity * 0.5}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform={`scale(${side} 1) translate(49 ${-18 + lift}) scale(${pop})`}
      >
        <rect fill="currentColor" height="9" opacity="0.16" rx="4.5" width="22" x="-11" y={3 + press} />
        <g transform={`translate(0 ${press})`}>
          <rect height="12" rx="5.5" strokeWidth="1.25" width="22" x="-11" y="-8" />
          <circle cx="-4" cy="-2" fill="currentColor" r="1.4" stroke="none" />
          <path d="M 1 -2 H 6" strokeWidth="1.15" />
        </g>
        <path
          d="M 11 -12 L 12.5 -8.5 L 16 -7 L 12.5 -5.5 L 11 -2 L 9.5 -5.5 L 6 -7 L 9.5 -8.5 Z"
          fill="currentColor"
          opacity={pose.pulse}
          stroke="none"
        />
      </g>
    )
  }

  if (pose.kind === 'organizing') {
    const incoming = pose.variant === 'add'
    const outgoing = pose.variant === 'remove'
    const travel = incoming ? (1 - pose.progress) * 8 : outgoing ? pose.progress * 8 : 0

    return (
      <g
        data-basil-organizing-cue={pose.variant ?? 'reorder'}
        fill="white"
        opacity={0.36 + pose.intensity * 0.5}
        stroke="currentColor"
        strokeLinejoin="round"
        transform={`scale(${side} 1) translate(49 ${-18 + lift}) scale(${pop})`}
      >
        <rect height="12" rx="1.5" strokeWidth="1.1" transform="translate(-7 3)" width="14" />
        <rect height="12" rx="1.5" strokeWidth="1.1" transform="translate(-7 -2)" width="14" />
        <g
          transform={`translate(${incoming ? travel : outgoing ? -travel : Math.sin(pose.progress * Math.PI * 2) * 2} -7)`}
        >
          <rect height="12" rx="1.5" strokeWidth="1.2" width="14" x="-7" />
          <path d="M -4 4 H 4 M -4 7 H 2" fill="none" strokeLinecap="round" strokeWidth="0.9" />
        </g>
        <path
          d={
            incoming
              ? 'M 10 -8 H 16 M 13 -11 L 16 -8 L 13 -5'
              : outgoing
                ? 'M 16 -8 H 10 M 13 -11 L 10 -8 L 13 -5'
                : 'M 10 -10 L 16 -6 L 10 -2'
          }
          fill="none"
          opacity={pose.pulse}
          strokeLinecap="round"
          strokeWidth="1.2"
        />
      </g>
    )
  }

  if (pose.kind === 'resizing') {
    const reach = 7 + pose.pulse * 3

    return (
      <g
        data-basil-resizing-cue=""
        fill="none"
        opacity={0.38 + pose.intensity * 0.5}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform={`scale(${side} 1) translate(49 ${-20 + lift}) rotate(${pose.propRotation}) scale(${pop})`}
      >
        <path d="M -10 -3 V -9 H -4 M 10 3 V 9 H 4" strokeWidth="1.3" />
        <path d={`M -2 -1 L ${-reach} ${-reach + 1} M -2 -1 H -6 M -2 -1 V -5`} strokeWidth="1.1" />
        <path d={`M 2 1 L ${reach} ${reach - 1} M 2 1 H 6 M 2 1 V 5`} strokeWidth="1.1" />
        <circle cx="-10" cy="-9" fill="white" r="1.8" strokeWidth="1" />
        <circle cx="10" cy="9" fill="white" r="1.8" strokeWidth="1" />
      </g>
    )
  }

  if (pose.kind === 'surfing') {
    const trailSide = pose.directionX >= 0 ? -1 : 1
    const wave = Math.sin(pose.progress * Math.PI * 2) * 1.8

    return (
      <g
        data-basil-surfing-cue=""
        fill="none"
        opacity={0.34 + pose.intensity * 0.5}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform={`translate(0 ${pose.propLift * 0.25}) rotate(${pose.propRotation * 0.35})`}
      >
        <path d={`M -27 43 Q 0 ${49 + wave} 27 43 Q 16 49 0 49 Q -17 49 -27 43 Z`} fill="white" strokeWidth="1.15" />
        <path d={`M ${trailSide * 31} ${40 + wave} L ${trailSide * 40} ${38 + wave}`} strokeWidth="1.15" />
        <path
          d={`M ${trailSide * 29} ${46 + wave} L ${trailSide * 36} ${47 + wave}`}
          opacity={pose.pulse}
          strokeWidth="1"
        />
        <circle cx={-trailSide * 17} cy={46 + wave * 0.3} fill="currentColor" r="1.3" stroke="none" />
      </g>
    )
  }

  return (
    <g
      data-basil-selection-cue=""
      fill="none"
      opacity={0.38 + pose.intensity * 0.5}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform={`scale(${side} 1) translate(48 ${-23 + lift}) scale(${pop})`}
    >
      <circle fill="white" r="8.5" strokeWidth="1.2" />
      <path d="M -4 0 L -1 3 L 5 -4" strokeWidth="1.8" />
      <path d="M 8 -8 L 11 -11 M 10 -4 L 14 -4 M 5 -11 L 5 -14" opacity={pose.pulse} strokeWidth="1" />
    </g>
  )
}

function HandoffGlyph({ kind }: { kind: BasilHandoffPayloadKind }) {
  if (kind === 'code') {
    return (
      <path
        d="M -6 -3 L -9 0 L -6 3 M 6 -3 L 9 0 L 6 3 M 2 -5 L -2 5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.25"
      />
    )
  }

  if (kind === 'data') {
    return (
      <path
        d="M -8 5 V 1 H -4 V 5 M -2 5 V -4 H 2 V 5 M 4 5 V -1 H 8 V 5 M -9 6 H 9"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.15"
      />
    )
  }

  if (kind === 'document') {
    return (
      <path
        d="M -7 -6 H 3 L 7 -2 V 6 H -7 Z M 3 -6 V -2 H 7 M -4 1 H 4 M -4 4 H 2"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.1"
      />
    )
  }

  if (kind === 'folder') {
    return (
      <path
        d="M -9 -4 H -2 L 0 -2 H 9 V 6 H -9 Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.25"
      />
    )
  }

  if (kind === 'image') {
    return (
      <path
        d="M -9 -6 H 9 V 6 H -9 Z M -7 4 L -2 -1 L 1 2 L 4 -2 L 8 4 M -5 -3 H -4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.1"
      />
    )
  }

  if (kind === 'message') {
    return (
      <path
        d="M -9 -5 H 9 V 4 H 1 L -4 7 L -3 4 H -9 Z M -5 -1 H 5 M -5 2 H 2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.1"
      />
    )
  }

  if (kind === 'tool') {
    return (
      <path
        d="M -8 -4 H 8 M -8 0 H 8 M -8 4 H 8 M -3 -6 V -2 M 4 -2 V 2 M -5 2 V 6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.1"
      />
    )
  }

  return (
    <path
      d="M -8 -6 H 8 V 6 H -8 Z M -8 -2 H 8 M -4 -6 V 6 M 3 -6 V 6"
      fill="none"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.05"
    />
  )
}

function TaskJourneyTrail({ journey, phase }: { journey: BasilTaskJourneySnapshot; phase: number }) {
  const count = journey.trail.length

  const positions = journey.trail.map((target, index) => {
    const angle = count === 1 ? -90 : -142 + (104 * index) / (count - 1)
    const radians = (angle * Math.PI) / 180

    return {
      kind: basilHandoffPayloadKindForTarget(target),
      target,
      x: Math.cos(radians) * 55,
      y: Math.sin(radians) * 55
    }
  })

  const connector = positions.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ')
  const current = positions.at(-1)!
  const pulse = journey.status === 'active' ? 1 + Math.sin(phase * Math.PI * 2) * 0.06 : 1
  const dashOffset = journey.status === 'active' ? -phase * 12 : 0

  return (
    <g
      data-basil-task-journey=""
      fill="none"
      opacity={journey.status === 'complete' ? 0.72 : 0.82}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform="translate(70 67)"
    >
      {positions.length > 1 && (
        <path
          d={connector}
          data-basil-journey-connector=""
          opacity="0.42"
          strokeDasharray="2.5 3"
          strokeDashoffset={dashOffset}
          strokeWidth="1"
        />
      )}

      {positions.map((point, index) => {
        const active = index === positions.length - 1

        return (
          <g
            data-basil-journey-target={point.target}
            key={`${point.target}-${index}`}
            opacity={active ? 1 : 0.62}
            transform={`translate(${point.x} ${point.y}) scale(${active ? pulse : 0.82})`}
          >
            <circle fill="var(--ui-chat-surface-background)" r={active ? 7 : 6} strokeWidth={active ? 1.35 : 1} />
            {point.kind && (
              <g transform={`scale(${active ? 0.42 : 0.34})`}>
                <HandoffGlyph kind={point.kind} />
              </g>
            )}
          </g>
        )
      })}

      {journey.transition === 'return' && (
        <path
          d={`M ${current.x - 10} ${current.y - 3} C ${current.x - 16} ${current.y - 13}, ${current.x + 10} ${current.y - 16}, ${current.x + 10} ${current.y - 5} M ${current.x + 10} ${current.y - 5} L ${current.x + 6} ${current.y - 8} M ${current.x + 10} ${current.y - 5} L ${current.x + 6} ${current.y - 2}`}
          data-basil-journey-cue="return"
          opacity="0.7"
          strokeWidth="1.1"
        />
      )}

      {journey.status === 'paused' && (
        <g data-basil-journey-cue="pause" transform={`translate(${current.x + 10} ${current.y - 9})`}>
          <circle fill="var(--ui-chat-surface-background)" r="5" strokeWidth="1" />
          <path d="M -1.5 -2.5 V 2.5 M 1.5 -2.5 V 2.5" strokeWidth="1.2" />
        </g>
      )}

      {journey.status === 'failed' && (
        <g data-basil-journey-cue="failed" transform={`translate(${current.x + 10} ${current.y - 9})`}>
          <circle fill="var(--ui-chat-surface-background)" r="5" strokeWidth="1" />
          <path d="M 0 -2.5 V 1 M 0 3 V 3.2" strokeWidth="1.25" />
        </g>
      )}

      {journey.status === 'complete' && (
        <g data-basil-journey-cue="complete" transform={`translate(${current.x + 10} ${current.y - 9})`}>
          <circle fill="var(--ui-chat-surface-background)" r="5" strokeWidth="1" />
          <path d="M -2.5 0 L -0.5 2 L 2.8 -2.2" strokeWidth="1.2" />
        </g>
      )}
    </g>
  )
}

function CarriedWork({
  delivery,
  kind,
  opacity,
  pose,
  source,
  target
}: {
  delivery: number
  kind: BasilHandoffPayloadKind
  opacity: number
  pose: BasilCarryPose
  source: BasilSceneTarget
  target: BasilSceneTarget
}) {
  return (
    <g
      data-basil-carried-work={kind}
      data-basil-carry-position={pose.limbs.intent === 'carry' ? 'trailing' : 'delivery'}
      data-basil-handoff-route={`${source}:${target}`}
      data-basil-transition="carry"
      opacity={opacity}
      transform={`translate(${pose.parcel.x} ${pose.parcel.y}) scale(${pose.parcel.scale})`}
    >
      <rect
        fill="var(--ui-chat-surface-background)"
        height="20"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.45"
        width="24"
        x="-12"
        y="-10"
      />
      <HandoffGlyph kind={kind} />
      {delivery > 0.12 && (
        <g
          data-basil-transition="delivery"
          fill="none"
          opacity={delivery}
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.1"
        >
          <path d="M -15 -7 L -19 -10 M -16 0 H -21 M -15 7 L -19 10" />
          <path d="M 15 -7 L 19 -10 M 16 0 H 21 M 15 7 L 19 10" />
        </g>
      )}
    </g>
  )
}

function Antenna({
  attentionStrength,
  attentionX,
  energy,
  opacity,
  petting,
  pettingDirection,
  phase,
  state
}: {
  attentionStrength: number
  attentionX: number
  energy: number
  opacity: number
  petting: number
  pettingDirection: number
  phase: number
  state: BasilState
}) {
  const signal = deriveBasilAntennaSignal({
    attentionStrength,
    attentionX,
    energy,
    petting,
    pettingDirection,
    phase,
    state
  })

  return (
    <g
      data-basil-accessory="antenna"
      data-basil-antenna-attention={signal.attentionBias.toFixed(3)}
      data-basil-antenna-lean={signal.lean.toFixed(3)}
      data-basil-antenna-pulse={signal.pulse.toFixed(3)}
      data-basil-antenna-signal={signal.signal}
      data-basil-antenna-wag={signal.petWag.toFixed(3)}
      opacity={opacity}
      transform={`rotate(${signal.lean} 0 -42)`}
    >
      {signal.ringCount > 0 && (
        <circle
          cx="0"
          cy="-57"
          data-basil-antenna-ring="near"
          fill="none"
          opacity={signal.ringOpacity}
          r={4.4 + signal.pulse * 1.8}
          stroke="currentColor"
          strokeWidth="1"
        />
      )}
      {signal.ringCount > 1 && (
        <circle
          cx="0"
          cy="-57"
          data-basil-antenna-ring="far"
          fill="none"
          opacity={signal.ringOpacity * 0.48}
          r={7 + signal.pulse * 2.5}
          stroke="currentColor"
          strokeWidth="0.8"
        />
      )}
      <path d="M 0 -42 L 0 -54" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <g transform={`translate(0 -57) scale(${signal.tipScale})`}>
        <circle fill="var(--ui-chat-surface-background)" r="2.8" stroke="currentColor" strokeWidth="1.5" />
        <circle fill="currentColor" opacity={0.08 + signal.pulse * 0.58} r="1.15" />
      </g>
      <path
        d="M 7 -52 C 11 -55 14 -51 12 -47"
        fill="none"
        opacity={0.28 + signal.pulse * 0.62}
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.2"
      />
    </g>
  )
}

function Accessory({
  antennaOnly = false,
  attentionStrength,
  attentionX,
  energy,
  focusTarget,
  opacity,
  petting,
  pettingDirection,
  phase,
  state
}: {
  antennaOnly?: boolean
  attentionStrength: number
  attentionX: number
  energy: number
  focusTarget?: BasilSceneTarget
  opacity: number
  petting: number
  pettingDirection: number
  phase: number
  state: BasilState
}) {
  if (opacity <= 0.03) {
    return null
  }

  const antenna = (
    <Antenna
      attentionStrength={attentionStrength}
      attentionX={attentionX}
      energy={energy}
      opacity={opacity}
      petting={petting}
      pettingDirection={pettingDirection}
      phase={phase}
      state={state}
    />
  )

  if (antennaOnly) {
    return antenna
  }

  if (
    (state === 'writing' &&
      (focusTarget === 'data' || focusTarget === 'document' || focusTarget === 'editor' || focusTarget === 'image')) ||
    (state === 'reading' && (focusTarget === 'data' || focusTarget === 'document' || focusTarget === 'image')) ||
    (state === 'searching' && focusTarget === 'web')
  ) {
    return antenna
  }

  if (state === 'searching') {
    return (
      <>
        {antenna}
        <g opacity={opacity} transform="translate(35 -1) rotate(7)">
          <circle
            cx="0"
            cy="0"
            fill="var(--ui-chat-surface-background)"
            r="11.5"
            stroke="currentColor"
            strokeWidth="2.4"
          />
          <circle cx="-2" cy="-2" fill="none" opacity="0.2" r="7.5" stroke="currentColor" strokeWidth="1" />
          <path d="M 8 9 L 18 20" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3.6" />
        </g>
      </>
    )
  }

  if (state === 'writing') {
    return (
      <>
        {antenna}
        <g opacity={opacity} transform="translate(38 15) rotate(-20)">
          <path d="M -2.8 -19 L 2.8 -19 L 2.8 13 L 0 20 L -2.8 13 Z" fill="currentColor" />
          <path d="M -2.8 -14 L 2.8 -14" stroke="var(--ui-chat-surface-background)" strokeWidth="1.2" />
          <path
            d="M -17 24 C -8 20 3 27 14 21"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.6"
          />
        </g>
      </>
    )
  }

  if (state === 'reading') {
    return (
      <>
        {antenna}
        <g opacity={opacity} transform="translate(0 34)">
          <path
            d="M -28 -3 C -18 -7 -9 -5 0 1 C 9 -5 18 -7 28 -3 L 27 16 C 17 13 9 15 0 20 C -9 15 -17 13 -27 16 Z"
            fill="var(--ui-chat-surface-background)"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path d="M 0 1 L 0 20" stroke="currentColor" strokeWidth="1.2" />
        </g>
      </>
    )
  }

  if (state === 'awaiting_permission') {
    return (
      <>
        {antenna}
        <g data-basil-protection-ring="" opacity={opacity}>
          <path
            d="M 0 -57 L 49 -34 L 43 29 L 0 57 L -43 29 L -49 -34 Z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
          <circle
            cx="-48"
            cy="-4"
            fill="var(--ui-chat-surface-background)"
            r="2"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <circle
            cx="48"
            cy="-4"
            fill="var(--ui-chat-surface-background)"
            r="2"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </g>
      </>
    )
  }

  if (state === 'sleeping') {
    return (
      <>
        {antenna}
        <g opacity={opacity}>
          <path
            d="M 38 -43 C 28 -39 27 -25 36 -19 C 26 -18 19 -28 23 -38 C 26 -44 33 -47 38 -43 Z"
            fill="currentColor"
          />
          <text fill="currentColor" fontFamily="monospace" fontSize="10" fontWeight="700" x="42" y="-22">
            z
          </text>
          <text fill="currentColor" fontFamily="monospace" fontSize="7" fontWeight="700" x="50" y="-32">
            z
          </text>
        </g>
      </>
    )
  }

  if (state === 'thinking') {
    return (
      <>
        {antenna}
        <g opacity={opacity}>
          <circle cx="29" cy="-27" fill="none" r="1.7" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="36" cy="-35" fill="none" r="2.5" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M 42 -42 C 37 -51 44 -59 52 -56 C 61 -62 70 -53 67 -44 C 73 -37 65 -28 56 -31 C 48 -25 39 -31 42 -40"
            fill="var(--ui-chat-surface-background)"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path d="M 53 -53 L 55 -45 L 62 -43 L 55 -40 L 53 -32 L 50 -40 L 44 -43 L 50 -45 Z" fill="currentColor" />
        </g>
      </>
    )
  }

  if (state === 'listening') {
    return (
      <>
        {antenna}
        <g opacity={opacity}>
          <path
            d="M -53 -12 C -60 -4 -60 9 -53 17 M 53 -12 C 60 -4 60 9 53 17"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2.2"
          />
          <path
            d="M -61 -20 C -72 -7 -72 20 -61 30 M 61 -20 C 72 -7 72 20 61 30"
            fill="none"
            opacity="0.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.6"
          />
        </g>
      </>
    )
  }

  if (state === 'speaking') {
    return (
      <>
        {antenna}
        <g opacity={opacity} transform="translate(46 3)">
          <path
            d="M 0 -11 L 15 -18 M 2 0 L 19 0 M 0 11 L 15 18"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2"
          />
        </g>
      </>
    )
  }

  if (state === 'success') {
    return (
      <>
        {antenna}
        <g opacity={opacity}>
          <path
            d="M -49 -26 L -45 -17 L -35 -13 L -45 -10 L -49 0 L -53 -10 L -63 -13 L -53 -17 Z"
            fill="currentColor"
          />
          <path d="M 47 -37 L 50 -29 L 59 -26 L 50 -23 L 47 -14 L 43 -23 L 35 -26 L 43 -29 Z" fill="currentColor" />
        </g>
      </>
    )
  }

  if (state === 'error') {
    return (
      <>
        {antenna}
        <text
          fill="currentColor"
          fontFamily="monospace"
          fontSize="24"
          fontWeight="800"
          opacity={opacity}
          x="35"
          y="-27"
        >
          ?
        </text>
      </>
    )
  }

  if (state === 'using_tool') {
    return antenna
  }

  return antenna
}

function Eye({
  blink,
  cx,
  cy,
  darkFace,
  glintX,
  glintY,
  happy,
  name,
  surprise,
  wink
}: {
  blink: number
  cx: number
  cy: number
  darkFace: boolean
  glintX: number
  glintY: number
  happy: boolean
  name: 'left' | 'right'
  surprise: number
  wink: number
}) {
  const ink = darkFace ? 'var(--ui-chat-surface-background)' : 'currentColor'
  const paper = darkFace ? 'currentColor' : 'var(--ui-chat-surface-background)'
  const liveBlink = Math.max(blink, wink)

  if (liveBlink > 0.72 || happy) {
    return (
      <path
        d={`M ${cx - 3.5} ${cy} Q ${cx} ${cy + (happy ? 3.5 : 1.9)} ${cx + 3.5} ${cy}`}
        data-basil-eye={name}
        fill="none"
        stroke={ink}
        strokeLinecap="round"
        strokeWidth="1.65"
      />
    )
  }

  const eyeHeight = Math.max(1, (5.3 + surprise * 0.6) * (1 - liveBlink))
  const eyeWidth = 3.3 + surprise * 0.42

  return (
    <g data-basil-eye={name}>
      <ellipse cx={cx} cy={cy} fill={ink} rx={eyeWidth} ry={eyeHeight} />
      {eyeHeight > 2.5 && (
        <ellipse
          cx={cx + 1 + glintX}
          cy={cy - 1.65 + glintY}
          data-basil-eye-glint={name}
          fill={paper}
          rx="0.72"
          ry="1.08"
        />
      )}
    </g>
  )
}

function Mouth({
  darkFace,
  expression,
  speech,
  state,
  surprise
}: {
  darkFace: boolean
  expression: number
  speech: BasilSpeechExpressionPose | null
  state: BasilState
  surprise: number
}) {
  const ink = darkFace ? 'var(--ui-chat-surface-background)' : 'currentColor'

  if (state === 'speaking' && speech) {
    const width = speech.mouthWidth
    const top = 13.2 - speech.cornerLift * 0.55
    const bottom = top + speech.mouthHeight * 2

    return (
      <path
        d={`M ${-width} ${top} Q ${-width * 0.42} ${top - speech.cornerLift} 0 ${top - speech.cornerLift * 0.28} Q ${width * 0.42} ${top - speech.cornerLift} ${width} ${top} Q 0 ${bottom} ${-width} ${top} Z`}
        data-basil-mouth=""
        data-basil-speech-openness={speech.openness.toFixed(3)}
        data-basil-speech-shape={speech.shape}
        fill={ink}
        stroke={ink}
        strokeLinejoin="round"
        strokeWidth="0.55"
      />
    )
  }

  if (
    surprise > 0.58 &&
    state !== 'awaiting_permission' &&
    state !== 'error' &&
    state !== 'sleeping' &&
    state !== 'success'
  ) {
    return (
      <ellipse
        cx="0"
        cy="14"
        data-basil-mouth=""
        data-basil-pointer-reaction="surprise"
        fill="none"
        rx="2.2"
        ry="2.7"
        stroke={ink}
        strokeWidth="1.5"
      />
    )
  }

  if (state === 'error' || expression < -0.25) {
    return (
      <path
        d="M -4.4 15.5 Q 0 11.2 4.4 15.5"
        data-basil-mouth=""
        fill="none"
        stroke={ink}
        strokeLinecap="round"
        strokeWidth="1.65"
      />
    )
  }

  if (expression > 0.48) {
    return (
      <path
        d="M -4.8 12.8 Q 0 17.8 4.8 12.8 Q 0 15.7 -4.8 12.8"
        data-basil-mouth=""
        fill={ink}
        stroke={ink}
        strokeLinejoin="round"
        strokeWidth="0.7"
      />
    )
  }

  const depth = 2.2 + Math.max(0, expression) * 3.4

  return (
    <path
      d={`M -5.2 12.8 Q 0 ${12.8 + depth} 5.2 12.8`}
      data-basil-mouth=""
      fill="none"
      stroke={ink}
      strokeLinecap="round"
      strokeWidth="1.65"
    />
  )
}

function Brows({
  darkFace,
  expression,
  eyeDx,
  eyeDy
}: {
  darkFace: boolean
  expression: BasilBrowExpression
  eyeDx: number
  eyeDy: number
}) {
  if (expression === 'neutral' || expression === 'soft') {
    return null
  }

  const ink = darkFace ? 'var(--ui-chat-surface-background)' : 'currentColor'

  const paths = {
    concerned: ['M -15.5 -17 Q -11.5 -19 -7.5 -18', 'M 7.5 -18 Q 11.5 -19 15.5 -17'],
    curious: ['M -15.5 -17 Q -11.5 -18 -7.5 -17', 'M 7.5 -19 Q 11.5 -21 15.5 -19'],
    focused: ['M -15.5 -18 Q -11.5 -18.5 -7.5 -16.5', 'M 7.5 -16.5 Q 11.5 -18.5 15.5 -18']
  } as const

  return (
    <g
      data-basil-brow={expression}
      fill="none"
      opacity="0.68"
      stroke={ink}
      strokeLinecap="round"
      strokeWidth="1.15"
      transform={`translate(${eyeDx * 0.24} ${eyeDy * 0.16})`}
    >
      {paths[expression].map(path => (
        <path d={path} key={path} />
      ))}
    </g>
  )
}

function ActorDragCue({ pose }: { pose: BasilActorDragPose }) {
  if (!pose.active) {
    return null
  }

  if (pose.stage === 'release') {
    return (
      <g
        data-basil-actor-drag-cue="release"
        fill="none"
        opacity={Math.min(0.7, pose.release * 0.76)}
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.15"
      >
        <path d="M -28 38 Q -35 39 -39 44 M 28 38 Q 35 39 39 44" />
        <path d="M -21 42 L -27 47 M 21 42 L 27 47" opacity="0.58" />
      </g>
    )
  }

  return (
    <g
      data-basil-actor-drag-cue="held"
      fill="none"
      opacity={Math.min(0.72, pose.grip * 0.78)}
      stroke="currentColor"
      strokeLinecap="round"
    >
      <path d="M -18 -41 Q 0 -48 18 -41" opacity="0.42" strokeWidth="1.1" />
      <path d="M -31 8 Q -37 18 -31 28 M 31 8 Q 37 18 31 28" strokeWidth="1.35" />
      <path d="M -34 27 L -31 31 L -28 27 M 28 27 L 31 31 L 34 27" strokeWidth="1" />
    </g>
  )
}

function PointerContactCue({ pose }: { pose: BasilPointerContactPose }) {
  if (pose.stage === 'none') {
    return null
  }

  const handX = 46 + pose.reach * 11
  const handY = 8 + pose.handY

  return (
    <g
      data-basil-pointer-contact={pose.stage}
      data-basil-pointer-contact-side={pose.side}
      data-basil-pointer-contact-strength={pose.strength.toFixed(3)}
      fill="none"
      opacity={0.28 + pose.strength * 0.68}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      transform={`translate(70 67) scale(${pose.side} 1)`}
    >
      <path d={`M 32 12 Q ${39 + pose.reach * 3} ${7 + pose.handY * 0.35} ${handX} ${handY}`} strokeWidth="1.7" />
      <g transform={`translate(${handX} ${handY}) rotate(${pose.wave})`}>
        <path
          d="M -2 4 Q 3 7 7 3 L 8 -2 Q 8 -5 6 -5 Q 4 -5 5 -1 L 4 -7 Q 3 -10 1 -8 L 1 -2 L -1 -7 Q -3 -9 -4 -6 L -3 0 Q -6 -3 -7 0 Q -6 4 -2 4 Z"
          fill="var(--ui-chat-surface-background)"
          strokeWidth="1.25"
        />
        <path d="M -2 3 Q 2 5 5 2" opacity="0.46" strokeWidth="0.8" />
      </g>
      {pose.stage === 'touch' && (
        <g data-basil-pointer-contact-pulse="" opacity={pose.contactPulse}>
          <path d={`M ${handX + 12} ${handY - 5} L ${handX + 16} ${handY - 8}`} strokeWidth="1.2" />
          <path d={`M ${handX + 13} ${handY + 1} H ${handX + 18}`} strokeWidth="1" />
          <circle cx={handX + 9} cy={handY - 1} fill="currentColor" r="1.2" stroke="none" />
        </g>
      )}
    </g>
  )
}

export function BasilOrb({
  dragCollaboration,
  externalActivity,
  focusAffordance,
  focusDirection,
  focusIntensity = 1,
  focusPhase = 'engaged',
  focusTarget,
  frame,
  journey,
  personality,
  pointOfInterest,
  size = 92,
  taskKind,
  taskPhase,
  workspaceCoordination
}: BasilOrbProps) {
  const id = useId().replace(/:/g, '')
  const bodyGradientId = `basil-body-${id}`
  const darkFaceGradientId = `basil-face-${id}`
  const squashY = 1 - frame.squash * 0.1
  const squashX = 1 + frame.squash * 0.07
  const focusSide = (focusDirection?.x ?? 1) < -0.15 ? -1 : 1
  const activeAffordance = focusAffordance && focusAffordance.target === focusTarget ? focusAffordance : null

  const propComposition = deriveBasilPropComposition({
    accessory: frame.interactionAccessory,
    hasPhysicalContext: Boolean(activeAffordance)
  })

  const engagement = deriveBasilEngagementPose(focusTarget, focusPhase)
  const travel = frame.travel ?? 0
  const travelX = frame.travelX ?? 0
  const travelY = frame.travelY ?? 0

  const externalActivityPose = deriveBasilExternalActivityPose(
    externalActivity
      ? {
          ...externalActivity,
          motionPhase: frame.motionPhase ?? externalActivity.motionPhase,
          target: focusTarget ?? externalActivity.target
        }
      : null
  )

  const baseSceneMotion = basilSceneMotion(focusTarget, frame.motionPhase ?? 0, frame.energy)

  const rawSceneMotion = externalActivityPose.active
    ? {
        ...baseSceneMotion,
        attentionY: baseSceneMotion.attentionY + externalActivityPose.attentionY,
        gesture: Math.max(baseSceneMotion.gesture, externalActivityPose.gesture),
        progress: externalActivityPose.progress,
        propLift: baseSceneMotion.propLift + externalActivityPose.propLift,
        propRotation: baseSceneMotion.propRotation + externalActivityPose.propRotation,
        pulse: Math.max(baseSceneMotion.pulse, externalActivityPose.pulse)
      }
    : baseSceneMotion

  const taskAction = deriveBasilTaskAction({ eventKind: taskKind, phase: taskPhase, target: focusTarget ?? 'rest' })
  const taskSceneMotion = applyBasilTaskActionMotion(rawSceneMotion, taskAction)

  const manipulation = deriveBasilManipulationPose({
    engagement: engagement?.stage ?? null,
    landing: frame.landing ?? 0,
    motionPhase: frame.motionPhase ?? 0,
    target: focusTarget ?? 'rest',
    travel
  })

  const sceneMotion = applyBasilManipulationMotion(taskSceneMotion, manipulation)

  const contactKinematics = deriveBasilContactKinematics({
    affordance: activeAffordance,
    manipulation,
    target: focusTarget ?? 'rest',
    travel
  })

  const pointerApproach = frame.pointerApproach ?? 0
  const pointerDwell = frame.pointerDwell ?? 0
  const pointerOrbit = frame.pointerOrbit ?? 0
  const pointerOrbitDirection = frame.pointerOrbitDirection ?? 0
  const pointerPet = frame.pointerPet ?? 0
  const pointerPetDirection = frame.pointerPetDirection ?? 0
  const pointerProximity = frame.pointerProximity ?? 0
  const pointerSwipe = frame.pointerSwipe ?? 0
  const pointerSwipeX = frame.pointerSwipeX ?? 0
  const pointerSwipeY = frame.pointerSwipeY ?? 0
  const collaborationActive = Boolean(dragCollaboration?.active && dragCollaboration.phase !== 'idle')
  const collaborationStrength = collaborationActive ? (dragCollaboration?.strength ?? 0) : 0
  const pointInterestActive = Boolean(pointOfInterest && pointOfInterest.intensity > 0.01)

  const gazeEngagement = activeAffordance
    ? (engagement?.stage ?? null)
    : pointInterestActive
      ? focusPhase === 'engaged' && ['reading', 'searching', 'thinking', 'using_tool', 'writing'].includes(frame.state)
        ? 'act'
        : focusPhase === 'approach'
          ? 'prepare'
          : 'notice'
      : null

  const objectGazeWeight = activeAffordance
    ? focusIntensity * (1 - pointerProximity * 0.78)
    : (pointOfInterest?.intensity ?? 0) * (1 - pointerProximity * 0.42)

  const objectGazeX = activeAffordance
    ? activeAffordance.direction.x * 0.78 + activeAffordance.contact.x * 0.22
    : (pointOfInterest?.direction.x ?? 0)

  const objectGazeY = activeAffordance
    ? activeAffordance.direction.y * 0.72 + activeAffordance.contact.y * 0.2 + (engagement?.eyeLift ?? 0) / 1.8
    : (pointOfInterest?.direction.y ?? 0)

  const pointerActive =
    collaborationActive ||
    (frame.pointerActive ??
      (pointerProximity > 0 ||
        pointerApproach > 0 ||
        pointerDwell > 0 ||
        Math.abs(frame.pointerX ?? 0) > 0.001 ||
        Math.abs(frame.pointerY ?? 0) > 0.001))

  const pointerIntent = deriveBasilPointerIntent({
    active: pointerActive,
    approach: pointerApproach,
    dwell: pointerDwell,
    objectCommitment: activeAffordance
      ? Math.max(manipulation.contact, manipulation.operationProgress) * focusIntensity
      : 0,
    pointerX: collaborationActive ? dragCollaboration!.gazeX : (frame.pointerX ?? frame.eyeX),
    pointerY: collaborationActive ? dragCollaboration!.gazeY : (frame.pointerY ?? frame.eyeY),
    proximity: pointerProximity,
    speed: frame.pointerSpeed ?? 0,
    state: frame.state,
    velocityX: frame.pointerVelocityX ?? 0,
    velocityY: frame.pointerVelocityY ?? 0
  })

  const pointerDeparture = deriveBasilPointerDeparture({
    directionX: frame.pointerDepartureX ?? 0,
    directionY: frame.pointerDepartureY ?? 0,
    state: frame.state,
    strength: frame.pointerDeparture ?? 0
  })

  const pointerReturn = deriveBasilPointerReturn({
    directionX: frame.pointerReturnX ?? 0,
    directionY: frame.pointerReturnY ?? 0,
    state: frame.state,
    strength: frame.pointerReturn ?? 0
  })

  const directTouch = deriveBasilDirectTouchPose({
    boop: frame.pointerBoop ?? 0,
    state: frame.state,
    tickle: frame.pointerTickle ?? 0,
    tickleDirection: frame.pointerTickleDirection ?? 0
  })

  const gaze = deriveBasilGazePose({
    ambientX:
      frame.eyeX + (sceneMotion.attentionX * focusSide) / 2.3 + pointerDeparture.eyeX * 0.82 + pointerReturn.eyeX,
    ambientY: frame.eyeY + sceneMotion.attentionY / 1.8 + pointerDeparture.eyeY * 0.72 + pointerReturn.eyeY,
    engagement: gazeEngagement,
    motionPhase: frame.motionPhase ?? 0,
    objectIntensity: activeAffordance ? focusIntensity : (pointOfInterest?.intensity ?? 0),
    objectX: objectGazeX,
    objectY: objectGazeY,
    pointerActive,
    pointerApproach,
    pointerDwell,
    pointerProximity,
    pointerX: pointerIntent.gazeX,
    pointerY: pointerIntent.gazeY,
    state: frame.state
  })

  const face = deriveBasilFaceIntentPose({
    gaze,
    manipulation,
    objectX: objectGazeX,
    objectY: objectGazeY,
    pointerActive,
    pointerApproach,
    pointerDwell,
    pointerProximity,
    pointerSpeed: frame.pointerSpeed ?? 0,
    pointerX: pointerIntent.gazeX,
    pointerY: pointerIntent.gazeY,
    state: frame.state
  })

  const shellLighting = deriveBasilShellLighting({
    energy: frame.energy,
    gazeX: gaze.eyeX,
    gazeY: gaze.eyeY
  })

  const eyeDx = face.eyeX * 3.35
  const eyeDy = face.eyeY * 2.65
  const leftEyeCx = -11.4 * face.eyeSpacing + eyeDx
  const rightEyeCx = 11.4 * face.eyeSpacing + eyeDx
  const eyeCy = -7.8 + eyeDy

  const accessoryOpacity = Math.max(
    frame.accessoryVisibility,
    frame.state === 'listening' || frame.state === 'speaking' ? 1 : 0
  )

  const darkFace = frame.state === 'searching' || frame.state === 'using_tool' || focusTarget === 'terminal'
  const affection = directTouch.active ? 0 : (frame.affection ?? 0)

  const speechExpression =
    frame.state === 'speaking'
      ? deriveBasilSpeechExpression({
          energy: frame.energy,
          expression: frame.mouth,
          phase: frame.motionPhase ?? 0
        })
      : null

  const affectionAllowed =
    frame.state !== 'awaiting_permission' &&
    frame.state !== 'error' &&
    frame.state !== 'sleeping' &&
    frame.state !== 'speaking'

  const pettingAllowed = frame.state !== 'awaiting_permission' && frame.state !== 'error' && frame.state !== 'sleeping'

  const petting = pettingAllowed ? pointerPet : 0

  const pointerContact = deriveBasilPointerContact({
    directInteraction: Math.max(
      directTouch.strength,
      directTouch.tickle,
      pointerOrbit,
      pointerSwipe,
      petting,
      affection
    ),
    dwell: pointerDwell,
    objectCommitment: activeAffordance
      ? Math.max(manipulation.contact, manipulation.operationProgress) * focusIntensity
      : 0,
    phase: frame.motionPhase ?? 0,
    pointerX: pointerIntent.gazeX,
    pointerY: pointerIntent.gazeY,
    proximity: pointerProximity,
    state: frame.state
  })

  const actorDragPose = deriveBasilActorDragPose({
    directionX: travelX,
    directionY: travelY,
    hold: frame.actorHold ?? 0,
    release: frame.actorRelease ?? 0,
    travel
  })

  const happyEyes =
    frame.state === 'success' ||
    (personality?.happyEyes ?? 0) > 0.5 ||
    (affectionAllowed && affection > 0.58) ||
    Boolean(speechExpression && speechExpression.eyeSmile > 0.62) ||
    petting > 0.18 ||
    pointerReturn.strength > 0.5 ||
    directTouch.tickle > 0.42 ||
    (actorDragPose.stage === 'release' && actorDragPose.release > 0.52)

  const travelAngle = Math.atan2(travelY, travelX || 0.0001) * (180 / Math.PI)
  const locomotionTravel = actorDragPose.stage === 'held' ? 0 : travel

  const locomotion = deriveBasilLocomotionPose({
    acceleration: frame.travelAcceleration ?? 0,
    directionX: travelX,
    directionY: travelY,
    landing: frame.landing ?? 0,
    phase: frame.motionPhase ?? 0,
    travel: locomotionTravel
  })

  const handoffOpacity = Math.max(0, (frame.handoff ?? 0) * (frame.novelty ?? 0) * 0.52)
  const handoffRotation = (frame.motionPhase ?? 0) * 360
  const handoffPayload = createBasilHandoffPayload(frame.handoffSource, frame.handoffTarget ?? focusTarget ?? 'rest')
  const carriedWorkOpacity = handoffPayload ? Math.min(0.92, (frame.handoff ?? 0) * (0.38 + travel * 0.7)) : 0
  const delivery = 1 - Math.min(1, travel * 1.55)

  const assetPhysics = deriveBasilAssetPhysics({
    affordance: activeAffordance,
    delivery,
    focusSide,
    manipulation,
    payloadKind: handoffPayload && carriedWorkOpacity > 0.025 ? handoffPayload.kind : null,
    target: focusTarget ?? 'rest',
    travel
  })

  const carryPose = handoffPayload
    ? basilCarryPose(focusSide, travel, delivery, frame.motionPhase ?? 0, assetPhysics.load, assetPhysics.carrySag)
    : null

  const sceneLimbPose = basilSceneLimbPose(
    focusTarget,
    sceneMotion,
    focusIntensity,
    travel,
    activeAffordance,
    engagement,
    manipulation,
    contactKinematics
  )

  const contextOpacity =
    Math.min(focusIntensity, engagement?.propIntensity ?? 1) *
    (1 - carriedWorkOpacity * Math.min(1, travel * 1.3) * 0.72)

  const objectStanceY = (activeAffordance?.contact.y ?? 0) * objectGazeWeight * 1.2 + contactKinematics.bodyLift

  const objectTilt =
    ((activeAffordance?.contact.y ?? 0) * 1.6 + (activeAffordance?.direction.y ?? 0) * 1.2) *
      objectGazeWeight *
      focusSide +
    (engagement?.bodyLean ?? 0) * focusSide +
    contactKinematics.bodyLean

  const faceBrow: BasilBrowExpression =
    collaborationActive && dragCollaboration?.phase !== 'release'
      ? 'focused'
      : assetPhysics.effort > 0.4 && (gaze.brow === 'neutral' || gaze.brow === 'soft')
        ? 'focused'
        : pointerDeparture.active && (gaze.brow === 'neutral' || gaze.brow === 'soft')
          ? 'curious'
          : gaze.brow

  const pointerStartle = Math.max(pointerApproach, pointerSwipe * 0.72, directTouch.surprise)
  const winkStrength = Math.max(0, Math.min(1, (pointerDwell - 0.48) / 0.52))
  const winkPulse = Math.max(0, Math.sin((frame.motionPhase ?? 0) * Math.PI * 3))
  const orbitWink = pointerOrbit * Math.max(0, Math.sin((frame.motionPhase ?? 0) * Math.PI * 2))
  const rightWink = Math.max(winkStrength * winkPulse, orbitWink)

  const cheekOpacity = Math.min(
    0.88,
    0.16 + frame.energy * 0.22 + pointerDwell * 0.44 + petting * 0.28 + directTouch.cheekBoost
  )

  const affectionRise = (1 - affection) * 10
  const affectionPulse = 0.88 + Math.sin((frame.motionPhase ?? 0) * Math.PI * 4) * 0.12
  const pointerSwipeAngle = Math.atan2(pointerSwipeY, pointerSwipeX || 0.0001) * (180 / Math.PI)
  const orbitRotation = (frame.motionPhase ?? 0) * 360 * (pointerOrbitDirection || 1)
  const pettingPulse = 0.9 + Math.sin((frame.motionPhase ?? 0) * Math.PI * 6) * 0.1

  const welcomeWave = Math.sin((frame.motionPhase ?? 0) * Math.PI * 8) * pointerReturn.strength * 13
  const welcomeLift = pointerReturn.strength * 2.6

  const gestureTilt =
    pointerSwipe * pointerSwipeX * 9 +
    pointerOrbit * pointerOrbitDirection * Math.sin((frame.motionPhase ?? 0) * Math.PI * 4) * 3.5 +
    petting * pointerPetDirection * (1.6 + Math.sin((frame.motionPhase ?? 0) * Math.PI * 6) * 1.2)

  const gestureScaleX = (squashX + pointerSwipe * Math.abs(pointerSwipeX) * 0.08 + petting * 0.025) * directTouch.scaleX

  const gestureScaleY =
    (squashY + pointerSwipe * Math.abs(pointerSwipeY) * 0.08 - pointerSwipe * 0.035 - petting * 0.018) *
    directTouch.scaleY

  const interactionRotation = frame.interactionRotation ?? 0
  const interactionScaleX = frame.interactionScaleX ?? 1
  const interactionScaleY = frame.interactionScaleY ?? 1
  const interactionX = frame.interactionX ?? 0
  const interactionY = frame.interactionY ?? 0
  const collaborationLean = dragCollaboration?.bodyLean ?? 0
  const collaborationLift = dragCollaboration?.lift ?? 0
  const collaborationScaleX = 1 + (dragCollaboration?.grip ?? 0) * 0.035
  const collaborationScaleY = 1 - (dragCollaboration?.grip ?? 0) * 0.025
  const coordinationLean = workspaceCoordination?.bodyLean ?? 0

  const coordinationLift = workspaceCoordination?.active ? -1.5 - workspaceCoordination.acknowledgment * 2.5 : 0

  return (
    <svg
      aria-label={`Basil ${frame.state}`}
      data-basil-actor-drag={actorDragPose.stage}
      data-basil-actor-drag-grip={actorDragPose.grip.toFixed(3)}
      data-basil-actor-drag-release={actorDragPose.release.toFixed(3)}
      data-basil-affection={affection.toFixed(3)}
      data-basil-asset-effort={assetPhysics.effort.toFixed(3)}
      data-basil-asset-load={assetPhysics.load.toFixed(3)}
      data-basil-asset-weight={assetPhysics.weight}
      data-basil-attention-direction={`${travelX.toFixed(3)},${travelY.toFixed(3)}`}
      data-basil-contact-axis={contactKinematics.axis.toFixed(3)}
      data-basil-contact-coupling={contactKinematics.coupling.toFixed(3)}
      data-basil-contact-orientation={contactKinematics.orientation}
      data-basil-contact-pressure={contactKinematics.pressure.toFixed(3)}
      data-basil-contact-strength={manipulation.contact.toFixed(3)}
      data-basil-drag-assist={dragCollaboration?.phase ?? 'idle'}
      data-basil-drag-effort={(dragCollaboration?.effort ?? 0).toFixed(3)}
      data-basil-drag-grip={(dragCollaboration?.grip ?? 0).toFixed(3)}
      data-basil-drag-release={(dragCollaboration?.release ?? 0).toFixed(3)}
      data-basil-drag-strength={collaborationStrength.toFixed(3)}
      data-basil-engagement={engagement?.stage ?? ''}
      data-basil-external-activity={externalActivityPose.kind ?? ''}
      data-basil-external-activity-intensity={externalActivityPose.intensity.toFixed(3)}
      data-basil-face-depth={`${face.leftEyeScaleX.toFixed(3)},${face.rightEyeScaleX.toFixed(3)}`}
      data-basil-face-intent={face.intent}
      data-basil-face-vector={`${face.eyeX.toFixed(3)},${face.eyeY.toFixed(3)}`}
      data-basil-familiarity={(frame.familiarity ?? 0).toFixed(3)}
      data-basil-focus-intensity={focusIntensity.toFixed(3)}
      data-basil-focus-side={focusSide < 0 ? 'left' : 'right'}
      data-basil-gaze-brow={faceBrow}
      data-basil-gaze-object-weight={gaze.objectWeight.toFixed(3)}
      data-basil-gaze-pointer-weight={gaze.pointerWeight.toFixed(3)}
      data-basil-gaze-source={gaze.source}
      data-basil-gaze-vector={`${gaze.eyeX.toFixed(3)},${gaze.eyeY.toFixed(3)}`}
      data-basil-handoff-source={handoffPayload?.source ?? ''}
      data-basil-handoff-target={handoffPayload?.target ?? ''}
      data-basil-interaction={frame.interactionId ?? ''}
      data-basil-interaction-beat={frame.interactionBeat ?? ''}
      data-basil-interaction-progress={(frame.interactionProgress ?? 0).toFixed(3)}
      data-basil-journey-status={journey?.status ?? ''}
      data-basil-journey-step-count={journey?.stepCount ?? 0}
      data-basil-journey-transition={journey?.transition ?? ''}
      data-basil-landing={(frame.landing ?? 0).toFixed(3)}
      data-basil-limb-intent={carryPose?.limbs.intent ?? sceneLimbPose?.intent ?? ''}
      data-basil-locomotion={locomotion.mode}
      data-basil-locomotion-lift={locomotion.lift.toFixed(3)}
      data-basil-manipulation-stage={manipulation.stage}
      data-basil-motion-phase={(frame.motionPhase ?? 0).toFixed(3)}
      data-basil-object-contact={
        activeAffordance ? `${activeAffordance.contact.x.toFixed(3)},${activeAffordance.contact.y.toFixed(3)}` : ''
      }
      data-basil-object-depth={activeAffordance?.depth.toFixed(3) ?? ''}
      data-basil-object-gaze-weight={objectGazeWeight.toFixed(3)}
      data-basil-object-shape={activeAffordance?.shape ?? ''}
      data-basil-personality={personality?.id ?? ''}
      data-basil-personality-intensity={(personality?.intensity ?? 0).toFixed(3)}
      data-basil-personality-stage={personality?.stage ?? ''}
      data-basil-point-of-interest={pointOfInterest?.target ?? ''}
      data-basil-point-of-interest-intensity={(pointOfInterest?.intensity ?? 0).toFixed(3)}
      data-basil-point-of-interest-source={pointOfInterest?.source ?? ''}
      data-basil-pointer-approach={pointerApproach.toFixed(3)}
      data-basil-pointer-boop={directTouch.strength.toFixed(3)}
      data-basil-pointer-contact={pointerContact.stage}
      data-basil-pointer-contact-strength={pointerContact.strength.toFixed(3)}
      data-basil-pointer-departure={pointerDeparture.strength.toFixed(3)}
      data-basil-pointer-departure-direction={`${pointerDeparture.eyeX.toFixed(3)},${pointerDeparture.eyeY.toFixed(3)}`}
      data-basil-pointer-dwell={pointerDwell.toFixed(3)}
      data-basil-pointer-intent={pointerIntent.mode}
      data-basil-pointer-intent-lead={pointerIntent.lead.toFixed(3)}
      data-basil-pointer-intent-vector={`${pointerIntent.gazeX.toFixed(3)},${pointerIntent.gazeY.toFixed(3)}`}
      data-basil-pointer-orbit={pointerOrbit.toFixed(3)}
      data-basil-pointer-orbit-direction={pointerOrbitDirection.toFixed(3)}
      data-basil-pointer-pet={petting.toFixed(3)}
      data-basil-pointer-pet-direction={pointerPetDirection.toFixed(3)}
      data-basil-pointer-return={pointerReturn.strength.toFixed(3)}
      data-basil-pointer-return-side={pointerReturn.side}
      data-basil-pointer-speed={(frame.pointerSpeed ?? 0).toFixed(3)}
      data-basil-pointer-swipe={pointerSwipe.toFixed(3)}
      data-basil-pointer-swipe-direction={`${pointerSwipeX.toFixed(3)},${pointerSwipeY.toFixed(3)}`}
      data-basil-pointer-tickle={directTouch.tickle.toFixed(3)}
      data-basil-pointer-tickle-direction={(frame.pointerTickleDirection ?? 0).toFixed(3)}
      data-basil-pointer-vector={`${(frame.pointerX ?? frame.eyeX).toFixed(3)},${(frame.pointerY ?? frame.eyeY).toFixed(3)}`}
      data-basil-pointer-velocity={`${(frame.pointerVelocityX ?? 0).toFixed(3)},${(frame.pointerVelocityY ?? 0).toFixed(3)}`}
      data-basil-prop-composition={propComposition.accessoryRole}
      data-basil-prop-response={manipulation.propResponse.toFixed(3)}
      data-basil-release={manipulation.release.toFixed(3)}
      data-basil-shell-light={`${shellLighting.gradientCx.toFixed(3)},${shellLighting.gradientCy.toFixed(3)}`}
      data-basil-shell-shadow-offset={shellLighting.shadowOffsetX.toFixed(3)}
      data-basil-task-action={taskAction.action}
      data-basil-task-phase={taskAction.phase}
      data-basil-travel-acceleration={(frame.travelAcceleration ?? 0).toFixed(3)}
      data-basil-workspace-coordination={workspaceCoordination?.active ? 'yield' : 'none'}
      data-basil-workspace-current-clearance={(workspaceCoordination?.currentClearance ?? 0).toFixed(3)}
      data-basil-workspace-pointer-clearance={(workspaceCoordination?.pointerClearance ?? 0).toFixed(3)}
      data-basil-workspace-side={workspaceCoordination?.side ?? ''}
      data-basil-workspace-strength={(workspaceCoordination?.strength ?? 0).toFixed(3)}
      height={size}
      role="img"
      style={{ display: 'block', overflow: 'visible' }}
      viewBox="0 0 140 140"
      width={size}
    >
      <defs>
        <radialGradient
          cx={`${shellLighting.gradientCx}%`}
          cy={`${shellLighting.gradientCy}%`}
          id={bodyGradientId}
          r="72%"
        >
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.62" stopColor="#fbfaf6" />
          <stop offset="0.86" stopColor="#f0ede6" />
          <stop offset="1" stopColor="#d3cec4" />
        </radialGradient>
        <radialGradient cx="34%" cy="24%" id={darkFaceGradientId} r="72%">
          <stop offset="0" stopColor="#282828" />
          <stop offset="0.7" stopColor="#080808" />
          <stop offset="1" stopColor="#000000" />
        </radialGradient>
        <filter height="160%" id={`basil-shadow-${id}`} width="160%" x="-30%" y="-30%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>

      <ellipse
        cx={70 - travelX * travel * 2 + shellLighting.shadowOffsetX}
        cy="116.5"
        data-basil-shadow="soft"
        fill="currentColor"
        filter={`url(#basil-shadow-${id})`}
        opacity={0.22 * (locomotion.shadowOpacity / 0.72) * actorDragPose.shadowOpacity}
        rx={31 * locomotion.shadowScaleX * assetPhysics.shadowScaleX * actorDragPose.shadowScale}
        ry={4.2 * locomotion.shadowScaleY}
      />
      <ellipse
        cx={70 - travelX * travel * 2 + shellLighting.shadowOffsetX}
        cy="115.5"
        data-basil-shadow="contact"
        fill="currentColor"
        opacity={locomotion.shadowOpacity * actorDragPose.shadowOpacity}
        rx={23 * locomotion.shadowScaleX * assetPhysics.shadowScaleX * actorDragPose.shadowScale}
        ry={2.4 * locomotion.shadowScaleY}
      />

      {journey && <TaskJourneyTrail journey={journey} phase={frame.motionPhase ?? 0} />}

      {locomotion.mode === 'land' && (frame.landing ?? 0) > 0.06 && (
        <g
          data-basil-locomotion-impact=""
          fill="none"
          opacity={Math.min(0.7, (frame.landing ?? 0) * 0.72)}
          stroke="currentColor"
          strokeLinecap="round"
          transform="translate(70 113)"
        >
          <path d="M -31 0 Q -39 -3 -44 -8 M -24 2 L -36 4" strokeWidth="1.25" />
          <path d="M 31 0 Q 39 -3 44 -8 M 24 2 L 36 4" strokeWidth="1.25" />
        </g>
      )}

      {locomotionTravel > 0.045 && (
        <g
          data-basil-transition="travel"
          data-basil-travel-direction={`${travelX.toFixed(3)},${travelY.toFixed(3)}`}
          fill="none"
          opacity={Math.min(0.62, travel * 0.72)}
          stroke="currentColor"
          strokeLinecap="round"
          transform={`translate(70 67) rotate(${travelAngle})`}
        >
          <path d="M -47 -12 H -62" strokeWidth="1.8" />
          <path d="M -51 0 H -70" opacity="0.7" strokeWidth="1.3" />
          <path d="M -47 12 H -59" opacity="0.45" strokeWidth="1" />
        </g>
      )}

      {handoffOpacity > 0.025 && (
        <g
          data-basil-transition="handoff"
          fill="currentColor"
          opacity={handoffOpacity}
          transform={`translate(70 67) rotate(${handoffRotation})`}
        >
          <circle cx="0" cy="-51" r="1.7" />
          <circle cx="35" cy="-35" opacity="0.65" r="1.25" />
          <circle cx="-35" cy="35" opacity="0.35" r="1" />
        </g>
      )}

      <PointerContactCue pose={pointerContact} />

      {pointerDeparture.active && (
        <g
          data-basil-pointer-reaction="departure"
          fill="none"
          opacity={Math.min(0.62, pointerDeparture.strength * 0.68)}
          stroke="currentColor"
          strokeLinecap="round"
          transform={`translate(70 67) rotate(${pointerDeparture.angle})`}
        >
          <path d="M 45 -8 Q 52 -6 59 -3" strokeWidth="1.35" />
          <path d="M 47 0 H 65" opacity="0.75" strokeWidth="1.1" />
          <path d="M 45 8 Q 52 6 58 3" opacity="0.48" strokeWidth="0.9" />
        </g>
      )}

      {pointerReturn.active && (
        <g
          data-basil-pointer-reaction="return"
          fill="currentColor"
          opacity={Math.min(0.88, pointerReturn.strength)}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform={`translate(70 67) scale(${pointerReturn.side} 1)`}
        >
          <g transform={`rotate(${pointerReturn.waveRotation + welcomeWave} 40 16)`}>
            <path
              d="M 36 13 Q 44 8 47 1 Q 49 -4 52 -1 L 51 5 Q 54 -3 57 0 L 55 7 Q 58 1 61 4 Q 61 12 55 18 Q 48 23 39 20 Z"
              strokeWidth="1.3"
            />
            <path d="M 42 15 Q 49 19 55 14" fill="none" opacity="0.74" stroke="#ffffff" strokeWidth="1" />
            <path d="M 53 -9 L 53 -14 M 49 -12 L 46 -16 M 57 -12 L 60 -16" fill="none" opacity="0.66" strokeWidth="1" />
          </g>
        </g>
      )}

      {directTouch.active && (
        <g
          data-basil-pointer-reaction="boop"
          fill="none"
          opacity={Math.min(0.86, directTouch.strength)}
          stroke="currentColor"
          strokeLinecap="round"
          transform="translate(70 28)"
        >
          <circle r={4 + directTouch.strength * 4} strokeWidth="1.1" />
          <path d="M 0 -13 V -18 M 9 -9 L 13 -13 M -9 -9 L -13 -13" strokeWidth="1.2" />
        </g>
      )}

      {directTouch.tickle > 0.025 && (
        <g
          data-basil-pointer-reaction="tickle"
          fill="none"
          opacity={Math.min(0.76, directTouch.tickle)}
          stroke="currentColor"
          strokeLinecap="round"
          transform="translate(70 67)"
        >
          <path d="M -47 3 Q -54 -2 -49 -9 M 47 3 Q 54 -2 49 -9" strokeWidth="1.3" />
          <path d="M -51 12 Q -58 8 -55 3 M 51 12 Q 58 8 55 3" opacity="0.58" strokeWidth="1" />
        </g>
      )}

      {pointerSwipe > 0.035 && (
        <g
          data-basil-pointer-reaction="swipe"
          fill="none"
          opacity={Math.min(0.72, pointerSwipe * 0.82)}
          stroke="currentColor"
          strokeLinecap="round"
          transform={`translate(70 67) rotate(${pointerSwipeAngle})`}
        >
          <path d="M -46 -12 H -64" strokeWidth="1.8" />
          <path d="M -50 0 H -73" opacity="0.72" strokeWidth="1.35" />
          <path d="M -45 12 H -59" opacity="0.46" strokeWidth="1" />
        </g>
      )}

      {pointerOrbit > 0.035 && (
        <g
          data-basil-pointer-reaction="orbit"
          fill="currentColor"
          opacity={Math.min(0.68, pointerOrbit * 0.78)}
          transform={`translate(70 67) rotate(${orbitRotation})`}
        >
          <path
            d="M -43 -30 C -20 -57 22 -57 45 -28"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.2"
          />
          <path d="M 45 -28 L 39 -29 L 43 -34 Z" />
          <circle cx="-51" cy="5" r="1.7" />
          <circle cx="48" cy="14" opacity="0.66" r="1.35" />
          <circle cx="3" cy="-53" opacity="0.42" r="1.1" />
        </g>
      )}

      {petting > 0.035 && (
        <g
          data-basil-pointer-reaction="petting"
          fill="none"
          opacity={Math.min(0.8, petting * 0.9)}
          stroke="currentColor"
          strokeLinecap="round"
          transform={`translate(70 21) scale(${pettingPulse})`}
        >
          <path d="M -15 1 Q 0 -7 15 1" opacity="0.58" strokeWidth="1.15" />
          <path d="M -23 -6 L -23 -13 M -27 -9.5 H -19" strokeWidth="1.25" />
          <path d="M 23 -7 L 23 -12 M 20.5 -9.5 H 25.5" opacity="0.72" strokeWidth="1" />
        </g>
      )}

      {affection > 0.035 && (
        <g
          data-basil-pointer-reaction="affection"
          fill="currentColor"
          opacity={Math.min(0.82, affection * 0.9)}
          transform={`translate(70 ${67 - affectionRise}) scale(${affectionPulse})`}
        >
          <path d="M -42 -27 C -48 -33 -56 -24 -42 -14 C -28 -24 -36 -33 -42 -27 Z" />
          <path d="M 42 -34 C 36 -40 28 -31 42 -21 C 56 -31 48 -40 42 -34 Z" transform="scale(0.78) translate(12 -8)" />
          <path
            d="M 48 7 C 43 2 36 10 48 18 C 60 10 53 2 48 7 Z"
            opacity="0.5"
            transform="scale(0.62) translate(31 8)"
          />
        </g>
      )}

      <g opacity={frame.particleIntensity}>
        {PARTICLES.map(([x, y], index) => (
          <path
            d={
              index % 2
                ? `M ${x - 3.5} ${y} L ${x + 3.5} ${y} M ${x} ${y - 3.5} L ${x} ${y + 3.5}`
                : `M ${x} ${y - 4.5} L ${x + 1.8} ${y - 1} L ${x + 5} ${y} L ${x + 1.8} ${y + 1} L ${x} ${y + 4.5} L ${x - 1.8} ${y + 1} L ${x - 5} ${y} L ${x - 1.8} ${y - 1} Z`
            }
            fill={index % 2 ? 'none' : 'currentColor'}
            key={`${x}-${y}`}
            opacity={0.18 + frame.energy * 0.42}
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth={index % 2 ? 1.2 : 0}
          />
        ))}
      </g>

      <g
        transform={`translate(${70 + pointerSwipeX * pointerSwipe * 2.5 + interactionX} ${67 + frame.float * 9 + pointerSwipeY * pointerSwipe * 2.5 + objectStanceY + locomotion.lift - actorDragPose.lift - welcomeLift + interactionY + assetPhysics.bodyDrop + collaborationLift + coordinationLift}) rotate(${frame.rotation * 16 + gestureTilt + directTouch.tickleRotation + objectTilt + locomotion.bodyRotation + gaze.headTilt * 2.2 + interactionRotation + assetPhysics.bodyLean + collaborationLean + coordinationLean + externalActivityPose.bodyLean + actorDragPose.bodyLean}) scale(${gestureScaleX * locomotion.scaleX * interactionScaleX * assetPhysics.scaleX * collaborationScaleX * actorDragPose.scaleX} ${gestureScaleY * locomotion.scaleY * interactionScaleY * assetPhysics.scaleY * collaborationScaleY * actorDragPose.scaleY})`}
      >
        <circle
          fill="none"
          opacity={frame.glow * 0.11}
          r={46 + frame.glow * 6}
          stroke="currentColor"
          strokeWidth={2 + frame.glow * 3}
        />

        <circle data-basil-body="" fill={`url(#${bodyGradientId})`} r="43" stroke="currentColor" strokeWidth="2" />
        <path
          d="M -36 13 C -41 -7 -33 -31 -13 -40"
          fill="none"
          opacity="0.32"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.2"
        />
        <path
          d="M -32 18 C -36 6 -33 -11 -25 -24"
          fill="none"
          opacity="0.18"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="0.9"
        />
        <path
          d="M -25 35 C -8 45 15 44 29 31"
          fill="none"
          opacity="0.15"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.3"
        />
        <path
          d="M -25 -31 C -13 -39 4 -41 17 -36"
          fill="none"
          opacity="0.62"
          stroke="#ffffff"
          strokeLinecap="round"
          strokeWidth="2.2"
          transform={`translate(${shellLighting.highlightX} ${shellLighting.highlightY})`}
        />
        <path
          d="M 27 -30 C 39 -17 42 4 34 22"
          data-basil-shell-rim=""
          fill="none"
          opacity={shellLighting.rimOpacity}
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.1"
          transform={`scale(${gaze.eyeX < 0 ? -1 : 1} 1)`}
        />

        {locomotionTravel > 0.045 && (
          <g
            data-basil-locomotion-shell=""
            fill="none"
            opacity={Math.min(0.42, travel * 0.46)}
            stroke="currentColor"
            strokeLinecap="round"
            transform={`rotate(${locomotion.shellRotation})`}
          >
            <path d="M -39 -12 A 41 41 0 0 1 -20 -35" strokeWidth="1.15" />
            <path d="M 34 23 A 41 41 0 0 1 14 39" opacity="0.62" strokeWidth="0.9" />
          </g>
        )}

        {darkFace && <circle data-basil-dark-face="" fill={`url(#${darkFaceGradientId})`} r="29.5" />}

        <g
          data-basil-face-rig=""
          style={{
            transform: `translate(${face.faceX}px, ${face.faceY}px)`,
            transition: 'transform 90ms cubic-bezier(0.22, 0.8, 0.32, 1)'
          }}
        >
          <Brows darkFace={darkFace} expression={faceBrow} eyeDx={eyeDx} eyeDy={eyeDy} />

          <g
            data-basil-eye-depth="left"
            transform={`translate(${leftEyeCx} ${eyeCy}) scale(${face.leftEyeScaleX} ${face.eyeScaleY * pointerIntent.eyeOpen}) translate(${-leftEyeCx} ${-eyeCy})`}
          >
            <Eye
              blink={frame.blink}
              cx={leftEyeCx}
              cy={eyeCy}
              darkFace={darkFace}
              glintX={shellLighting.highlightX * 0.12}
              glintY={shellLighting.highlightY * 0.1}
              happy={happyEyes}
              name="left"
              surprise={pointerStartle}
              wink={0}
            />
          </g>
          <g
            data-basil-eye-depth="right"
            transform={`translate(${rightEyeCx} ${eyeCy}) scale(${face.rightEyeScaleX} ${face.eyeScaleY * pointerIntent.eyeOpen}) translate(${-rightEyeCx} ${-eyeCy})`}
          >
            <Eye
              blink={frame.blink}
              cx={rightEyeCx}
              cy={eyeCy}
              darkFace={darkFace}
              glintX={shellLighting.highlightX * 0.12}
              glintY={shellLighting.highlightY * 0.1}
              happy={happyEyes}
              name="right"
              surprise={pointerStartle}
              wink={rightWink}
            />
          </g>
          <Mouth
            darkFace={darkFace}
            expression={Math.max(
              -1,
              Math.min(
                1,
                frame.mouth +
                  (engagement?.mouthLift ?? 0) -
                  assetPhysics.effort * 0.16 +
                  (dragCollaboration?.phase === 'release' ? 0.3 : collaborationStrength * 0.08)
              )
            )}
            speech={speechExpression}
            state={frame.state}
            surprise={pointerStartle}
          />

          {frame.state !== 'error' && frame.state !== 'sleeping' && (
            <g data-basil-pointer-reaction={pointerDwell > 0.48 ? 'blush' : undefined} opacity={cheekOpacity}>
              <path
                d="M -20.5 7.5 L -23.5 9 M -18.5 10 L -21.5 11.5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="0.8"
              />
              <path
                d="M 20.5 7.5 L 23.5 9 M 18.5 10 L 21.5 11.5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="0.8"
              />
            </g>
          )}
        </g>

        {assetPhysics.effort > 0.18 && (
          <g
            data-basil-asset-effort-cue={assetPhysics.weight}
            fill="none"
            opacity={Math.min(0.62, assetPhysics.effort * 0.74)}
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.05"
            transform={`scale(${focusSide} 1)`}
          >
            <path d="M 37 -29 L 42 -33 M 41 -23 L 47 -24" />
            {assetPhysics.weight === 'heavy' && <path d="M 32 -35 L 35 -41" opacity="0.72" />}
          </g>
        )}

        {engagement?.stage === 'notice' && (
          <g
            data-basil-transition="anticipation"
            fill="none"
            opacity={0.34 + sceneMotion.pulse * 0.22}
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.15"
            transform={`scale(${focusSide} 1)`}
          >
            <path d="M 43 -28 L 46 -32 M 49 -23 L 54 -25 M 40 -20 L 43 -20" />
          </g>
        )}

        {dragCollaboration && <DragCollaborationCue pose={dragCollaboration} />}
        {workspaceCoordination && <WorkspaceCoordinationCue pose={workspaceCoordination} />}
        <ExternalActivityCue pose={externalActivityPose} side={focusSide} />
        <ActorDragCue pose={actorDragPose} />

        {handoffPayload && carryPose && carriedWorkOpacity > 0.025 && (
          <CarriedWork
            delivery={delivery}
            kind={handoffPayload.kind}
            opacity={carriedWorkOpacity}
            pose={carryPose}
            source={handoffPayload.source}
            target={handoffPayload.target}
          />
        )}

        {carryPose && carriedWorkOpacity > 0.025 && (
          <g opacity={carriedWorkOpacity}>
            <LimbRig pose={carryPose.limbs} target="carried-work" />
          </g>
        )}

        <Accessory
          antennaOnly={Boolean(
            (frame.interactionAccessory && frame.state !== 'awaiting_permission') ||
              (personality && personality.intensity > 0.05)
          )}
          attentionStrength={Math.max(gaze.objectWeight, gaze.pointerWeight)}
          attentionX={gaze.eyeX}
          energy={frame.energy}
          focusTarget={focusTarget}
          opacity={Math.max(accessoryOpacity, petting, Math.max(gaze.objectWeight, gaze.pointerWeight) * 0.52)}
          petting={petting}
          pettingDirection={pointerPetDirection}
          phase={frame.motionPhase ?? 0}
          state={frame.state}
        />
        {frame.interactionAccessory && (
          <InteractionAccessory
            accessory={frame.interactionAccessory}
            beat={frame.interactionBeat ?? 0}
            gripOpacity={propComposition.gripOpacity}
            opacity={propComposition.accessoryOpacity}
            progress={frame.interactionProgress ?? 0}
            role={propComposition.accessoryRole}
            side={frame.interactionSide}
          />
        )}
        <g
          data-basil-contact-posture=""
          data-basil-context-focus=""
          opacity={contextOpacity * propComposition.contextOpacity}
          transform={`translate(${contactKinematics.context.x} ${-frame.float * 0.6 - (1 - focusIntensity) * 2 + assetPhysics.handSag + contactKinematics.context.y}) rotate(${contactKinematics.propTiltDegrees}) scale(${focusSide} 1)`}
        >
          <ContextCue motion={sceneMotion} target={focusTarget} />
          {sceneLimbPose && <LimbRig pose={sceneLimbPose} target={focusTarget ?? 'rest'} />}
          {sceneLimbPose && <ContactFeedback intensity={manipulation.contactPulse} pose={sceneLimbPose} />}
          <TaskPhaseCue cue={taskAction.cue} target={focusTarget} />
        </g>
      </g>
      <BasilPersonalityCue pose={personality} />
    </svg>
  )
}
