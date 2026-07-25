# Hermes Integration Guide

## Boundary

Basil is split into three practical layers:

1. **Host-neutral engine**
   - Pure TypeScript reducers, interpolation, choreography, geometry, gaze,
     locomotion, personality, presence, audio-score, and policy modules.
   - Generic `GenericAgentEvent` and `AgentEventAdapter` contracts.
   - No Electron or Hermes imports.

2. **React presentation**
   - Procedural SVG actor, props, presence effects, frame hooks, showcase, and
     development controls.
   - Nanostores hold local presentation state.

3. **Hermes host integration**
   - `adapters/hermes*.ts(x)` maps Hermes gateway and UI events.
   - `basil-motion-controller.tsx` owns the main-renderer event subscription.
   - Electron main/preload code owns the detached overlay, cursor sampling, and
     privacy-minimized Windows UI Automation bridge.
   - Python routes provide the optional local Basil-name speech prefilter.

The overlay mirrors state but does not subscribe to Hermes independently and
does not play presence audio. This prevents duplicate events and sounds.

## Installer Operation

`scripts/install-hermes.ps1` performs a complete preflight before writing:

1. Confirms the target is a Git checkout with Hermes Desktop.
2. Checks every overlay destination for a conflicting existing file.
3. Runs `git apply --check` for the tracked integration patch.
4. Applies the tracked patch.
5. Copies the new Basil-owned overlay files.

Use `-Check` to perform steps 1-3 only. Use `-Force` only when intentionally
replacing existing Basil-owned overlay files; it does not bypass patch checks.

## Integrating A Newer Fork

The patch is intentionally pinned to one upstream commit. If `-Check` fails:

1. Do not force the patch.
2. Copy `hermes-overlay/apps/desktop/src/basil-motion` into the fork.
3. Review `patches/hermes-agent-f4df260f.patch` one host file at a time.
4. Recreate the small renderer entry and wiring changes first.
5. Port preload/global IPC types and main-process overlay handlers together.
6. Port microphone lease changes as one unit.
7. Port backend speech-prefilter routes and dependencies as one unit.
8. Run the target fork's existing tests after each unit.

The largest conflict surface is `apps/desktop/electron/main.ts`. The desired
long-term extraction is a dedicated `electron/basil-overlay-controller.ts`
owned by Basil, leaving only construction and IPC registration in Hermes main.

## Presence Audio Policy

Summon and hide sounds are Web Audio oscillator scores, not media files.

- Only a new `summoning` or `hiding` nonce can play.
- Initial state and remounts are silent.
- Secondary/overlay renderers are silent.
- Hermes read-aloud and voice-conversation playback suppress cues.
- A 45 ms score lead lets presence lifecycle release the microphone first.
- The persisted command-palette preference can mute all presence cues.

## Windows Privacy Boundary

The external-object listener sends geometry and structural control metadata
only. It does not transmit names, labels, values, text, help text, or automation
IDs. It is active only while the detached Basil overlay needs external object
awareness.

## Optional Pieces

- Remove `public/basil-motion/*.mp3` and the tour route if the narrated showcase
  is not required.
- Do not install PocketSphinx or the backend routes if local voice summon/hide
  is not required.
- External Windows object awareness is platform-specific; the embedded SVG
  actor and generic engine remain cross-platform.
