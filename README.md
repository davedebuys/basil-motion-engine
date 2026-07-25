# Basil Motion Engine

Basil is a procedural desktop companion for agent applications: a small
black-and-white retro-futurist orb that reacts to genuine runtime events,
follows points of interest, and can live inside an app or in a transparent
always-on-top Electron window.

This repository is the open-source integration snapshot of Basil built and
verified in Hermes Desktop. It is not a fork of Hermes. It contains:

- The complete procedural SVG motion source and automated tests.
- A generic agent-event contract and state reducer.
- 12 core states, 100 authored interactions, and 20 personality behaviours.
- Pointer gaze, touch reactions, spatial movement, props, task journeys, and
  external Windows object awareness.
- A transparent Electron overlay implementation.
- Local voice summon/hide using VAD, PocketSphinx name prefiltering, and strict
  local speech recognition.
- Procedural Web Audio summon/hide cues with mute and speech-conflict policy.
- A reproducible patch and overlay installer for Hermes Agent.

No Rive, Lottie, GIF, video, Three.js, or proprietary animation runtime is
used. Basil's character animation is rendered as SVG and synthesized in code.

## Status

`v0.1.0` is a source integration release pinned to Hermes Agent commit:

```text
f4df260f26c93f15694698869f3ea8e965eea301
```

That commit was current in the working Hermes checkout on 2026-07-21. The
installer can target another fork, but it deliberately stops if the tracked
patch or any overlay file conflicts. This keeps integration reviewable on
newer forks instead of silently overwriting host changes.

## Integrate With Hermes

From PowerShell:

```powershell
git clone https://github.com/simonbullows/basil-motion-engine.git
cd basil-motion-engine

# Dry-run first
.\scripts\install-hermes.ps1 -HermesPath C:\path\to\your\hermes-agent -Check

# Apply after the check succeeds
.\scripts\install-hermes.ps1 -HermesPath C:\path\to\your\hermes-agent
```

Then validate in the target fork:

```powershell
cd C:\path\to\your\hermes-agent\apps\desktop
npm run typecheck
npx eslint src\basil-motion electron\basil-*.ts
npx vitest run --project ui src\basil-motion
npm run build

cd ..\..\..
.\venv\Scripts\python.exe -m pytest tests\hermes_cli\test_basil_speech_prefilter.py
```

The broad jsdom animation suite is CPU-heavy. If a high-frequency stage test
times out under concurrent load, rerun that file alone before treating it as a
regression:

```powershell
npx vitest run --project ui src\basil-motion\basil-motion-stage.test.tsx
```

## Repository Layout

```text
hermes-overlay/
  apps/desktop/src/basil-motion/    Motion engine, SVG actor, React hosts, tests
  apps/desktop/electron/            Transparent overlay and Windows awareness
  apps/desktop/src/lib/             Shared microphone lease
  apps/desktop/public/basil-motion/ Optional narrated showcase audio
  hermes_cli/                       Local Basil-name speech prefilter
  tests/hermes_cli/                 Backend prefilter tests
patches/
  hermes-agent-f4df260f.patch       Tracked Hermes integration changes
scripts/
  install-hermes.ps1                Conflict-aware installer
  validate-package.ps1              Distribution integrity checks
docs/
  BASIL_MOTION.md                   Full implementation architecture
  INTEGRATION.md                    Host boundaries and upgrade guidance
```

The pure motion and policy modules do not depend on Hermes. Hermes-specific
event, DOM, command-palette, speech, and IPC wiring stays in adapters or in the
tracked integration patch.

## Genuine Event Model

The engine never fabricates agent activity with timers. A host adapter emits a
`GenericAgentEvent`; the reducer selects a state and interaction; the renderer
smoothly approaches target parameters. Development previews are explicitly
marked `dev-control` and do not enter the real agent event stream.

Hermes integration maps gateway lifecycle, streamed text, tool calls, tool
results, permissions, voice playback, and failures to Basil. Summon/hide
transitions originate from explicit UI commands or validated local speech.

## License

MIT. See [LICENSE](LICENSE). Hermes integration portions retain attribution to
Nous Research under Hermes Agent's MIT license.
