# Basil Motion Engine

## Hermes Desktop Architecture

- Electron main process: `electron/main.ts`, bundled by `scripts/bundle-electron-main.mjs` to `dist/electron-main.mjs` (the `package.json` `main` entry). It owns `BrowserWindow` instances, backend lifecycle, native desktop services, and Basil overlay IPC/UI Automation.
- Preload bridge: `electron/preload.ts` uses Electron `contextBridge` to expose the typed `window.hermesDesktop` API. Basil has an isolated `hermes:basil-overlay:*` channel family for open/close, bounds, cursor position, state mirroring, controls, and external targets.
- Renderer: React with TypeScript, mounted by `src/main.tsx`, bundled by Vite and styled with the existing Hermes CSS/Tailwind stack. The regular Hermes UI and the `?win=basil-overlay` renderer share the same procedural engine.
- Agent stream: `src/hermes.ts` owns the gateway WebSocket; `src/app/gateway/hooks/use-gateway-boot.ts` connects it to app boot; `src/app/contrib/wiring.tsx` receives each `RpcEvent`, fans it out through `src/contrib/events.ts`, then preserves Hermes' existing stream handling.
- Build entry points: `npm run dev` starts Vite and Electron together; `npm run build` builds the renderer, bundles main/preload, and stages native dependencies; `npm run start` builds and launches Electron; `npm run dist:win` produces Windows installers.

## Architecture

Basil Motion Engine is a renderer-side procedural animation layer for Hermes Desktop. It is intentionally split into two parts:

- `src/basil-motion/*`: independent, Hermes-free motion types, state targets, interpolation, spatial physics, generic DOM anchoring, scene choreography, procedural scene actions, SVG renderer, store, development controls, and the shared screen-space route planner.
- `src/basil-motion/adapters/hermes.ts`: translates Hermes gateway events into generic agent events and reusable scene intent.
- `src/basil-motion/adapters/hermes-scene.ts`: the only Hermes DOM knowledge. It maps Hermes UI landmarks to generic Basil scene anchors.

The engine renders Basil as a black-and-white retro-futurist smiling orb using SVG. It does not use Rive, Lottie, GIFs, video, Three.js, or proprietary animation runtimes. `requestAnimationFrame` is used only for interpolation and procedural motion such as blinking/floating; Basil state changes come from real agent events or the development control panel.

`interaction-pack.ts` is the independent v1 animation-pack contract and catalog. It contains exactly 100 named interactions in ten categories: social, listening, focus, search, reading, writing, tools, permission, results, and rest/error. Each entry composes one of 25 procedural motion motifs with a semantic state, generic scene, expression tone, one of 25 SVG props, duration, amplitude, direction, loop policy, and four inspectable beats. `sampleBasilInteraction()` is a pure elapsed-time sampler; it returns facial parameters plus body translation, scale, and rotation without importing React, Electron, Hermes, or the DOM. One-shot result cues settle at their final beat, while genuine active work cues can cycle until another event replaces them.

`basil-tour-data.ts` and `basil-tour-app.tsx` provide an independent narrated showcase at `?win=basil-tour`. The first ten chapters partition all 100 catalog interactions exactly once; two additional chapters demonstrate pointer reactions and desktop intelligence. The tour samples the same real interaction catalog, state targets, procedural `BasilOrb`, props, limbs, expressions, and motion parameters used by Hermes. Twelve local MP3 chapter tracks drive the timeline through an HTML audio element, including automatic chapter advance, seeking, play/pause, restart, mute, captions, and chapter navigation. The tour contains no alternate animation runtime and does not fake Hermes activity: its manual playback is an explicit showcase surface, while the embedded production actor remains driven only by genuine events.

The personality layer is a second portable composition contract rather than a Hermes feature embedded in the renderer. `personality-pack.ts` defines 20 unique behaviours and motifs; `personality-engine.ts` is the pure enter/perform/exit sampler; `personality-scheduler.ts` applies Quiet, Balanced, or Playful cadence, per-behaviour cooldowns, recent-history anti-repetition, and priority interruption; and `personality-cue.tsx` draws every prop and foreground occluder as original monochrome SVG. `use-basil-personality.ts` is the host adapter. It converts genuine agent state transitions, scene engagement, drag collaboration, workspace density, copy/paste, captured editor typing, scrolling, pointer return, visibility return, resizing, and overlay host signals into the generic scheduler contract. No timer invents activity: time is used only to sample a behaviour after a real signal starts it. Embedded and detached renderers use the same hook and engine.

The 20 v1 behaviours are Window Peekaboo, Folder Fort, Caught Hiding, Cursor Chase, Scroll Elevator, Tab Surfing, Window Surfing, Typing Mimic, Copy & Paste Courier, Drag Assistant, Download Watch, Loading Hypnosis, Thinking Detective, Error First Aid, Permission Guardian, Success High Five, Welcome Back Ambush, Focus Companion, Desktop Tidy-Up, and Bedtime Negotiation. The responsive Personality Lab at `?win=basil-personality` exposes all 20, playback phase, mirroring, reduced-motion sampling, and frequency modes without changing production agent state. Production keeps the development override separate and responds only to real host signals.

`interaction-router.ts` selects pack cues only from the generic event contract. Hermes remains outside the catalog: the existing Hermes adapter first converts a gateway event to `GenericAgentEvent`, preserving only the privacy-safe session ID, event/tool label, scene, task phase, and structural payload fields needed by the router. Arbitrary message, command, result, and content fields are never scanned. The router maps task semantics and lifecycle to appropriate cues, such as web `web-scout -> link-hop -> scan-results -> found-a-lead` and patching `pencil-ready -> fix-patch -> careful-edit -> final-polish`. Independent sessions get deterministic variety within compatible cue subsets, while repeated events in one session stay stable. The selected ID, replay nonce, and optional development-only phase offset travel inside `BasilStateSnapshot`, so embedded and detached renderers stay synchronized. `interaction-accessory.tsx` renders every pack prop as original monochrome SVG geometry. No cue starts autonomously; only a genuine agent event or explicit development-panel command changes the active interaction.

`accessory-attachment-engine.ts` gives the interaction pack a portable physical prop contract. It classifies all 25 accessories as `held`, `worn`, or `floating`, then derives bounded shoulder, elbow, hand, grip, prop position, rotation, and scale values from only accessory kind, interaction beat/progress, and direction. The existing interaction mirror is now preserved through `sampleBasilInteraction()`, `BasilMotionFrame`, and `useBasilFrame()`, keeping prop side aligned with the real cue's gaze and body lean. Books, charts, code panels, compasses, folders, keys, keyboards, links, magnifiers, pencils, shields, and terminals receive a small procedural arm and grip behind the prop. Held tools use function-specific ergonomic heights rather than one crown position: books stay near the upper cheek, magnifiers and compasses sit at face level, panels/folders/terminals sit at the side, and pencils/keys/keyboards drop toward the lower cheek. Hearts, questions, speech bubbles, warnings, celebration marks, and other symbolic cues remain intentionally floating. Worn cues have dedicated anchors: glasses align to the compact eye centers without covering the pupils, ears mirror at the shell edge, and antenna interactions reuse the state-aware crown signal instead of drawing a duplicate stalk. Worn cues never invent a hand. The solver imports no React, SVG, Hermes, Electron, DOM, or timing source.

`prop-composition-engine.ts` prevents the semantic interaction prop and a physical context object from becoming two competing objects. A held accessory is the single primary object when no genuine geometric target exists, suppressing the synthetic scene prop while retaining the interaction grip. If a real DOM/UIA affordance exists, its context prop and geometry-driven limbs remain primary; the semantic accessory becomes a restrained hand-free badge. Worn and floating symbolic cues can accompany a context without adding a second grip. The decision uses only accessory kind and a `hasPhysicalContext` boolean, so it remains portable and does not inspect Hermes events, DOM/UIA objects, labels, content, or time. `data-basil-prop-composition` and `data-basil-interaction-role` expose the resolved policy for host-independent verification.

## Visual Language

The v1 character follows the supplied Basil reference sheet: a softly shaded white spherical shell, thin black ink outline, small oval eyes with pin highlights, a restrained mouth, sketch accents, and a compact floor shadow. The face deliberately occupies less than half of the shell so expressions remain friendly at the 92 px in-app size. State and scene props are procedural SVG paths: thought bubble, magnifier, book, pencil, code editor, terminal prompt, tool controls, permission shield, status antenna, stars, listening/speaking marks, error question mark, and sleep moon. Terminal scenes use the reference sheet's dark-face variant.

`locomotion-engine.ts` converts only genuine travel, direction, acceleration, arrival impulse, and animation phase into a renderer-independent pose. Horizontal movement rolls the shell accents while keeping the face readable; predominantly vertical movement hops; real deceleration leans and widens the contact shadow; arrival briefly compresses the orb and emits two ink impact marks. The face does not spin with the shell. `use-basil-frame.ts` derives acceleration from consecutive real spatial travel values, while embedded spring arrival and external UIA landing events supply the short-lived landing impulse. With no genuine movement or arrival, the solver returns an exactly grounded pose.

`gaze-engine.ts` is a pure joint-attention arbiter. It receives separate raw pointer direction/proximity/approach/dwell, object direction and engagement stage, ambient task gaze, agent state, and motion phase. It selects `pointer`, `object`, `shared`, or `ambient` attention rather than using a fixed blend: distant pointers remain visible, noticed/worked objects hold focus, a genuinely close pointer can share attention during work, user-facing permission/error/listening/speaking states favor social eye contact, and sleeping suppresses both signals. Shared attention smoothly exchanges a small amount of weight only while both real inputs exist. The resulting eye vector, subtle orb tilt, and restrained `focused`, `curious`, or `concerned` brow are renderer diagnostics as well as visible SVG behavior.

`point-of-interest-engine.ts` adds host-neutral visual-interest selection without reading labels, content, or commands. It receives only Basil's rectangle, viewport geometry, a preferred generic scene target, and the same visible structural anchor rectangles already supplied by the host adapter. Urgent permission/error surfaces outrank ordinary focus, the current scene target outranks unrelated anchors, and the composer is a restrained idle fallback. Its bounded direction and intensity enter the existing gaze arbiter as object attention, so a moving or stationary real pointer remains visually clear, nearby pointers share attention with genuine work, and protected agent states retain their established priority. The full face rig now follows the resolved vector through eye translation, compact eye-depth parallax, face translation, shell light, contact shadow, and antenna bias while preserving the supplied small-eye proportions.

`face-intent-engine.ts` turns that gaze plus the causal manipulation stage into a readable character intention: `orient`, `focus`, `coordinate`, `check_in`, `ambient`, or `sleep`. The previously unused manipulation `gazeLead` now makes Basil look at the genuine object contact before his hands reach it. Contact/operation retain focused eye shape; a rapidly approaching real pointer can earn a user check-in without discarding work focus; release returns attention toward the user; sleep rejects both. Horizontal gaze also creates restrained face translation, eye-spacing compression, and asymmetric near/far eye scale, producing a soft 3D head turn while keeping the supplied small-eye proportions. The SVG face rig eases each real target change over 90 ms. No clock chooses an intent and no autonomous saccade invents attention.

`shell-lighting-engine.ts` extends the same genuine gaze into portable procedural depth. It clamps eye direction and energy, then derives radial-gradient center, shell-highlight translation, far-rim opacity, and floor-shadow offset without importing React, SVG, Hermes, Electron, the DOM, or time. `BasilOrb` applies those values to its existing monochrome shell: looking left or right shifts the soft light opposite gaze, flips a restrained far-side contour, moves the white sheen, and offsets the contact shadow. The same highlight translation moves each open eye's tiny white catchlight by less than 0.3 SVG units relative to its moving pupil, adding glossy depth without enlarging the supplied compact eyes. Blink, wink, happy crescents, and sleep remain path-based and therefore carry no catchlight. The silhouette, compact face, and black-and-white palette remain unchanged; no WebGL, Three.js, bitmap animation, or proprietary runtime is involved.

`antenna-signal-engine.ts` is a pure state-and-energy signal solver. All 12 generic Basil states map to bounded monochrome antenna poses: calm, receive, process, scan, work, guard, result, alert, transmit, or sleep. The solver derives lean, tip pulse, tip scale, and zero-to-two restrained rings from the existing interpolated state, energy, and animation phase; genuine crown petting adds the stronger signed wag without changing agent state. A clamped joint-attention vector also biases the sensor a few degrees toward Basil's real pointer/object focus; permission and error attenuate that response, while sleep nearly rejects it. Genuine pointer/object weight supplies a restrained visibility floor, so an attentive idle Basil exposes the sensor without fabricating work. The renderer composes this antenna with interaction props instead of replacing them, so real Hermes events can show a pencil, magnifier, shield, speech bubble, or other catalog prop while the small top signal continues to communicate state. No timer chooses a state and the module imports no React, SVG, Hermes, Electron, DOM, or proprietary runtime.

`pointer-contact-engine.ts` gives genuine user attention a small physical response. It accepts only generic state, normalized pointer direction/proximity/dwell, object commitment, direct-interaction strength, and phase. Idle, listening, and success can advance through `notice -> reach -> touch`; the pointer side mirrors a tiny hand, vertical direction adjusts its height, and a completed hold adds restrained contact ticks. Work, permission, error, sleep, and speech remain authoritative, while committed object manipulation and stronger boop/tickle/orbit/swipe/pet/affection gestures suppress the hand. The SVG arm renders behind the shell so its root is naturally hidden and the cue reads as Basil's limb rather than a floating prop.

`manipulation-engine.ts` is a pure causal sequencer shared by every working prop. Genuine `notice` holds the object still while gaze and a considering hand lead; `prepare` extends the working limbs without operating the object; the real landing impulse produces full contact and procedural impact ticks while prop response remains near zero; only settlement or active surface traversal enables the object action. Sustained engagement cycles through `observe`, `reach`, `contact`, `operate`, and `release`, synchronizing limb reach, intent, scene progress, gesture, lift, rotation, and pulse. Folder lids, page/image/browser scans, editor/terminal/composer typing, data analysis, and tool sliders therefore react after hand contact instead of animating as soon as selected. The cycle exists only while a genuine object remains engaged and does not create agent activity.

`task-action-engine.ts` is a pure semantic layer between generic agent events and procedural prop motion. It accepts only `BasilSceneTarget`, generic event kind, and `BasilTaskPhase`; it has no Hermes, React, Electron, DOM, or timing dependency. The four phases map to target-specific verbs such as editor `plan -> compose -> review -> save`, web `query -> navigate -> scan -> select`, terminal `plan -> run -> monitor -> complete`, and document `locate -> read/compose -> review -> complete`. It also returns one restrained procedural cue (`dots`, execute ticks, magnifier, or check) and a motion modifier. The modifier composes multiplicatively with `manipulation-engine.ts`, so semantic action progress never bypasses physical reach/contact gating.

`scene-motion.ts` turns a real selected scene into deterministic, continuously rendered micro-actions. Folders open, document scan lines travel down the page, editor and terminal cursors type with a small working hand, browser cards scan, image frames inspect with a moving focus line, data panels analyze charts, tool sliders move, and composer text advances. The same motion produces restrained task-aware eye offsets; live pointer gaze remains the dominant eye input. These cycles animate only the currently selected genuine event/object and never create or advance agent state.

`attention-engine.ts` gives consecutive real interactions continuity without retaining desktop content. It keeps at most six in-memory visits containing only a generic target category and point, then derives normalized travel direction, novelty, familiarity, sequence length, and target switching. Direction drives anticipation gaze, body lean, and short trailing ink lines. Novel handoffs receive a fading three-dot orbit and slightly brighter landing expression; familiar revisits reduce that surprise. Attention history is neither persisted nor sent across processes and contains no control text or identity.

`handoff-engine.ts` converts two consecutive genuine generic targets into a privacy-safe carried-work payload. It retains only source category, destination category, and payload kind (`code`, `data`, `document`, `folder`, `image`, `message`, `tool`, or `web`); it never reads or stores desktop content, labels, or object identity. The SVG renderer carries the procedural parcel on Basil's trailing side during travel, then moves it above the destination prop for a short delivery cue after landing. First visits, same-target repeats, permission/error/rest scenes, manual drag, and development-only state changes do not produce a handoff.

`task-journey-engine.ts` turns a sequence of genuine generic events into one compact, renderer-independent task memory. A non-development session can `start`, `advance`, `return`, `repeat`, `pause`, `resume`, `complete`, or `fail`; repeated lifecycle events on the same target do not create false steps, while a later return is recognized even after the four-item visual trail has rolled forward. The snapshot stores only opaque session/event keys, generic target categories, status, transition, and counts. It never stores prompts, filenames, commands, page text, tool output, or desktop labels. A new session resets the journey. Both renderers draw the same procedural dotted satellite trail, miniature target glyphs, active pulse, return arrow, and pause/failure/completion badge behind Basil's shell.

`limb-engine.ts` is a renderer-independent procedural pose solver. Given a generic scene target, scene motion, focus intensity, and travel strength, it returns one or two shoulder/elbow/hand curves plus grip angles for `hold`, `inspect`, `operate`, `point`, and `type` intent. A separate carry solver routes a parcel from the trailing side over the shell to the destination and returns matching `carry`/`deliver` arm poses. Props sit outside the shell, arm paths originate at its edge, and the SVG renderer draws wrists and tiny finger grips over the prop so contact remains legible at the 92 px in-app size. Left/right object orientation mirrors the complete scene rig without mirroring Basil's face.

`object-affordance.ts` turns real, generic geometry into animation intent without importing React, Electron, Windows, or Hermes. It classifies bounds as `compact`, `wide`, `tall`, or `surface`, normalizes the genuine hover/click point within those bounds, measures near-to-far surface depth from Basil's side, and derives a unit gaze direction. Embedded DOM clicks and external UIA events feed the same function. The resulting contact changes eye direction, vertical stance, body tilt, and limb reach; a nearby live pointer remains dominant and reduces object-gaze weight. Only bounds, target category, and coordinates are held in renderer memory, with no names, values, labels, or content.

`contact-kinematics-engine.ts` turns that exact contact into a physically coherent working posture. It determines whether the genuine object is above, below, left, or right, selects the correct local contact axis, and derives active-hand reach, counter-bracing hand placement, wrist angles, body lift/lean, pressure, and an upright prop offset. Wide/surface objects produce more distributed bracing than compact controls; deep contacts extend farther; release relaxes the coupling; preview/observe cannot invent pressure. The solver depends only on generic geometry, target category, manipulation state, and real travel. It contains no Hermes, React, Electron, DOM, UIA, content, or autonomous timing code.

`asset-physics-engine.ts` converts that generic object geometry plus payload kind, delivery state, manipulation contact, and genuine travel into physical load. It has no Hermes, React, Electron, DOM, content, or clock dependency. Real scale, `compact`/`wide`/`tall`/`surface` shape, surface depth, target category, and privacy-safe payload kind determine a light, medium, or heavy load. Nothing strains before real handling begins. Once contact or carrying exists, the load drives restrained body drop/lean, squash and stretch, contact-shadow width, hand sag, lower carry arcs, parcel scale, focused brows, and procedural effort ticks. Basil therefore braces more for deep data/tool/code surfaces than for a web link or message while the supplied round silhouette and compact face remain intact.

`engagement-engine.ts` turns genuine `preview`, `approach`, `traverse`, and `engaged` phases into three visible commitment stages. `notice` keeps Basil stationary, shows the prop at 56%, adds restrained attention ticks, lifts his gaze, and brings one hand to a considering pose. `prepare` leans toward the destination and extends the target-appropriate hands partway during real travel. `act` makes full contact only during traversal or after landing. External UIA hover supplies the existing preview phase; Hermes-owned DOM anchors now use the same five-pixel/600 ms stable-pointer gate without moving Basil. DOM preview cancels on movement, exit, blur, new agent activity, or unrelated click, and the activated anchor cannot preview again until the pointer leaves it.

`pointer-kinetics.ts` distinguishes pointer intent from position. Its pure sampler consumes pointer coordinates, actor center, and monotonic time to derive normalized directional velocity, speed, inward approach, and nearby dwell. Velocity uses a bounded short-lived smoothing response, reverses with the real cursor, and decays to zero after movement stops. A rapid real approach briefly enlarges the eyes, produces a small surprised mouth, raises energy, and adds squash; a slow nearby dwell softens the smile/glow, strengthens cheek marks, and periodically winks one eye. A genuine click directly on Basil adds a short affection impulse: the eyes close happily, the smile warms, the shell brightens, and three procedural hearts rise from the orb. Retreat does not trigger approach. Kinetics and affection history are in memory only and reset or decay without creating agent activity.

`pointer-intent-engine.ts` converts that genuine velocity into bounded anticipatory gaze. Fast movement leads the current pointer direction by at most `0.32`; a reversal changes lead direction immediately; stationary or dwelling input returns exactly to the cursor. Active object work damps prediction so Basil can acknowledge the mouse without abandoning the document, editor, or tool, while permission/error/listening/speaking/success remain socially direct and sleep suppresses the signal. The solver imports no React, Electron, Hermes, DOM, native cursor API, or timing source. Both renderers supply samples: embedded Basil receives host pointer events, while the detached overlay uses its existing privacy-safe real Windows cursor point.

`pointer-departure-engine.ts` preserves attention across a genuine renderer boundary without inventing activity. Embedded Hermes records only the normalized direction of the last real pointer sample when a top-level `pointerout` has no related target, then exponentially decays a short edge glance. A real window blur remains a hard reset. The first returning pointer sample cancels departure immediately and emits a separate bounded return impulse. The pure solver normalizes and clamps both signals: departure produces a restrained curious brow plus three procedural edge ticks, while return uses compact happy eyes, a slight lift, and an original monochrome waving hand on the inward side opposite the exited edge so it remains visible near screen boundaries. Permission, error, sleep, and speaking suppress departure; return is stricter and runs only in idle, listening, or success. The detached overlay already polls the real OS cursor outside its transparent window and therefore does not synthesize either boundary event.

`direct-touch-engine.ts` turns explicit direct-character boop and tickle impulses into bounded poses without importing React, Electron, Hermes, the DOM, or a timing source. Embedded Basil emits boop from a genuine browser double-click; the detached overlay emits the same impulse and still executes its existing double-click app-toggle command. The second click clears ordinary affection so hearts and boop do not compete. Genuine wheel/touchpad input over either actor emits a signed tickle impulse, stops React propagation, and leaves the underlying Hermes page scroll unchanged. Boop produces a compact round mouth, restrained widened shell, cheek emphasis, and procedural crown ripple. Tickle produces happy crescent eyes, a small directional wiggle, soft squash, and original side motion marks. Only idle, listening, and success accept either pose; thinking, search, reading, writing, tool use, permission, error, speech, and sleep remain authoritative.

`pointer-gestures.ts` adds path-level intent without depending on React, Electron, Hermes, or a native input library. It retains at most 1.4 seconds of coordinate/timestamp samples and recognizes three deliberate gestures. A near-circular path with stable radius and consistent angular travel produces a signed orbit impulse; a fast, linear path that crosses close to Basil from opposite sides produces a directional swipe impulse; and repeated horizontal reversals confined to Basil's crown produce a signed petting impulse. Petting requires at least three reversals, seven samples, 115 px of path, 24 px of span, 180 ms of duration, moderate speed, and limited vertical spread inside a bounded crown region. Cooldowns and exponential decay prevent repeated firing. Incomplete arcs, stationary dwell, curved passes, face-level wiggles, above-actor wiggles, slow movement, and paths that miss the actor are rejected. No pointer path is persisted or sent to Hermes.

The embedded pointer adapter retains a bounded queue of the latest 24 genuine browser pointer events and consumes every point through `pointer-gestures.ts` on the next animation frame. This prevents a fast physical swipe from collapsing to one latest coordinate when the renderer is busy, while keeping detection and nudge decisions in the independent generic engines. The queue contains only short-lived coordinates and monotonic timestamps, clears on blur, and never generates synthetic points.

`pointer-nudge-engine.ts` turns a newly recognized deliberate swipe into one physical, viewport-safe resting-position change. The pure planner accepts only social/resting states (`idle`, `listening`, `speaking`, or `success`), rejects weak paths, and protects active work, permissions, errors, sleep, and non-engaged phases. State is authoritative, so an idle Basil can leave a stale completed work target. It moves in the swipe direction when room exists and deterministically slides along a screen edge when it does not. `use-basil-spatial.ts` consumes the gesture's one-shot timestamp, persists the destination, and lets the existing spring, locomotion, and landing systems perform the move; decaying gesture strength cannot repeatedly displace Basil.

`drag-collaboration-core.mjs` is the platform-neutral pointer-drag solver shared by embedded Hermes assets and the detached desktop overlay. Its declaration surface is `drag-collaboration-core.d.mts`, while `drag-collaboration-engine.ts` is the typed renderer re-export. Given only a generic target category, actor/pointer/work-area geometry, real displacement, real velocity, and `acquire`/`carry`/`release`, it derives a trailing destination, side, gaze, grip, lean, lift, effort, strength, release response, and a minimum-clearance-constrained frame. It has no Hermes, React, Electron, DOM, Windows UIA, content, or autonomous timing dependency. Document, editor, folder, image, data, terminal, tool, and web surfaces can collaborate; unrelated UI categories remain inert.

`workspace-coordination-engine.ts` is the generic obstruction-yield solver shared by embedded Hermes and the detached overlay. It accepts only actor/frame/target/work-area rectangles, a real pointer point, generic target category, and engagement phase. When the pointer genuinely enters Basil while he is settled beside active work, it scores right/left/above/below placements, preserves the requested object gap after work-area clamping, requires a meaningful pointer-clearance gain, and returns gaze, lean, strength, side, and destination. `use-basil-spatial.ts` routes embedded movement around the active object, including an outward escape waypoint when Basil begins in the expanded collision region. Electron main reuses `planOverlayTravelRoute()` with the current external target as an obstacle for detached `assist` nudges. `BasilOrb` renders the same open-hand and dashed "after you" cue in both hosts. No timer creates the interaction: real pointer geometry is the only trigger, and active drag collaboration takes priority.

`path-planner-core.mjs` is the single pure route-planning runtime used by embedded and detached Basil. Its declaration surface is `path-planner-core.d.mts`, while `path-planner.ts` is the typed renderer-facing re-export. The planner expands each relevant object by Basil's full actor size plus clearance, builds a deterministic visibility graph from safe obstacle corners, and uses Dijkstra shortest-path selection to return top-left waypoints. It ignores tiny decoration and viewport-sized backgrounds, permits arrival at the active object, preserves the destination chosen by the spatial engine, and has no React, DOM, Hermes, Electron, Windows, or timing dependency. `use-basil-spatial.ts` follows embedded waypoints with the existing spring, changes roll/hop direction from live velocity, emits one landing only at the final destination, and cancels the queue immediately for drag or deliberate swipe input.

Detached travel uses the same planner in screen space. On activation only, `electron/basil-windows-uia.ts` enumerates visible, uncloaked, non-minimized top-level window rectangles through Win32/DWM; it does not read UIA names, values, labels, help text, or automation IDs. Electron excludes the activated target process and Hermes-owned processes, converts physical pixels to display-independent coordinates, and calls `planOverlayTravelRoute()` in `electron/basil-external-scene.ts`. The sampled route preserves the exact placement destination, supports negative monitor origins, and sends only route direction/step plus the already-approved target metadata to the renderer. Raw desktop obstacle geometry stays in the main process.

`electron/basil-workspace-memory.ts` reconnects genuine agent work to external surfaces Basil has actually visited. A native activation arms one in-memory target per generic category; stable UIA refreshes update that element's geometry and contact point every 900 ms without producing renderer activity. The UIA bridge caches structural metadata and activation-time top-level obstacles, so refreshes query only the active element's bounding rectangle and offscreen status. The memory accepts only a newer, non-development event whose generic scene matches the visited target, expires stale geometry, rejects previews and unrelated scenes, and is cleared when the overlay closes. It retains no names, values, labels, application titles, document content, or commands. On a match, Electron reuses the normal obstacle-aware travel path and marks the activation as `agent-event`; the overlay then composes the real task phase with the external object's gaze, limbs, prop, and traversal.

`electron/basil-foreground-discovery.ts` handles the first genuine agent event for a surface that Basil has not previously visited. When no explicit user-activated target or matching workspace-memory target exists, a once-per-event gate runs one short-lived foreground UIA query. It reads only process identity, bounds, offscreen state, control type, structural class, keyboard-focusability, supported-pattern names, and top-level obstacle geometry. It never reads UIA Name, Value, HelpText, AutomationId, TextPattern, ValuePattern, application titles, document text, commands, or file paths. The discovered element must still match the current event's generic target exactly, remain foreground and visible, and belong to a non-Hermes process. Explicit user activation always wins. Accepted targets use the existing physical-pixel-to-DIP normalization, obstacle-aware route, `agent-event` activation source, task action, surface traversal, and workspace-memory path; stale, duplicate, development, conversation, mismatched, or timed-out requests do nothing.

An agent-event activation also establishes one explicit active-surface attachment. If UIA later reports that exact process/category surface at new geometry while the same genuine work event still matches it, Electron emits a geometry-driven `follow` movement. Follow reuses the screen-space planner and smooth overlay travel, skips work-surface traversal, and keeps the existing task phase/action active. The renderer does not add another attention visit, handoff, or familiarity increment.

The same geometry contract now applies to the current user-approved external surface without requiring agent work. A pointer, keyboard, selection, control, content, collection, or invocation activation can attach Basil to that exact process/category; a later UIA `refresh` follows only after bounds/contact move by more than 2 DIP, only while no other Basil travel is active, and preserves the original activation source. The existing collision-safe planner moves Basil beside the new rectangle with `follow -> landed`, no traversal replay, and idle task semantics. Dormant memory entries and unrelated process/category geometry remain inert, so another window cannot recruit Basil.

Surface disappearance closes that lifecycle explicitly. Each successful structural write updates only cached bounds plus generic control metadata. If the existing 900 ms refresh later finds the approved element offscreen, invalid, or gone, the native monitor emits one `dismiss` record from that cache before dropping all UIA references and handlers. No stale element content is queried. Electron accepts dismissal only for the current matching process/category, forgets exactly that workspace-memory entry, and publishes `dismissed`. The overlay turns the genuine event into a 760 ms generic `departing` pose with a tiny procedural wave, then clears the target and returns to rest without moving or creating agent work.

Active external surfaces can also expose the standard UI Automation `ScrollPattern`. After genuine activation, `electron/basil-windows-uia.ts` samples only structural horizontal/vertical scroll percentages at 96 ms cadence and emits `scroll` after a real axis changes by at least 0.5 percentage points. It never reads document text, names, values, labels, titles, paths, or commands. `electron/basil-external-scene.ts` maps normalized progress to an exact contact along Basil's currently safe side of the surface. Electron then publishes the existing `follow` movement with smooth detached travel while preserving the current process/category, task action, context, and obstacle set. No wheel timer, scripted progress, new attention visit, handoff, or agent state is invented.

Keyboard focus navigation uses a parallel structural path. After genuine pointer activation, the UIA monitor checks `AutomationElement.FocusedElement` at 120 ms cadence, compares its runtime identity only inside the native helper, and emits `focus` only when a new keyboard-focusable control belongs to the already approved external process. The event contains control type, structural class, process identity, bounds, and center point only. Runtime IDs, keys, names, labels, values, text, titles, paths, and commands never cross IPC. Electron marks the activation source as `keyboard`, preserves the approved obstacle set, and reuses collision-safe `follow` travel without traversal replay. The renderer excludes keyboard focus from agent task semantics, so Tab navigation can change Basil's object attention and procedural prop without fabricating a tool event.

External edit activity uses a separate privacy-safe structural signal. After Basil has genuinely activated or focused an editor, document, data surface, or terminal, the native monitor subscribes to UI Automation's `TextPatternIdentifiers.TextChangedEvent` on that exact element. The callback only increments an atomic counter; it never reads text, keys, selections, values, labels, paths, commands, or document ranges. Electron aggregates the count into a bounded intensity and publishes `activationSource=content`, phase `activity`, and movement reason `activity` without moving Basil or changing agent task state. The independent `external-activity-engine.ts` converts that genuine pulse into typing posture, editor-prop motion, attention, and restrained effort, while the renderer's 520 ms freshness window smoothly returns the pose to rest when native events stop.

Structural selection uses the same privacy boundary without reusing text activity. The native helper finds the nearest ancestor exposing the standard UIA `SelectionPattern`, subscribes to `ElementSelected` and `ElementAddedToSelection` for its subtree, and retains only the latest `AutomationElement` reference and aggregate count inside the helper. A selected item's Name, value, label, text, path, and content are never read. Its generic control structure and rectangle cross IPC as `selection`; a pending selection takes precedence over the parallel keyboard-focus poll. Electron follows the new item through a transient selected-rectangle route obstacle, preventing diagonal travel through the selected row without persisting that obstacle in workspace memory. The generic `external-activity-engine.ts` derives a restrained nod/prop pulse, and `BasilOrb` draws a procedural monochrome check-and-spark cue for 900 ms.

Structural control adjustment subscribes to UIA property-change notifications for toggle state, range change, and expand/collapse state on the already approved control. The callback deliberately ignores `OldValue` and `NewValue`, stores only the sender reference internally, and aggregates a count. No numeric value, toggle state, label, or content crosses IPC. Electron publishes `activationSource=control` and zero-travel `activity`; the generic external-activity engine derives an `adjusting` pose for tool/data controls, and `BasilOrb` draws a procedural rotating dial cue for 760 ms while Hermes task semantics remain idle.

Collection mutation uses UIA `StructureChanged` notifications on the nearest already approved ancestor exposing `SelectionPattern`. The native callback stores only `StructureChangeType.ToString()` and an aggregate count; child runtime IDs remain inside UIA and no item name, value, label, text, path, or content is read or emitted. `electron/basil-external-scene.ts` maps added, removed, and other structural categories to generic `add`, `remove`, and `reorder` variants. Electron publishes `activationSource=collection` with zero travel, and the independent `external-activity-engine.ts` derives an `organizing` pose for data/document/folder surfaces. `BasilOrb` renders the result as an original procedural monochrome paper-stack cue for 840 ms while Hermes task action and phase remain idle.

Native control invocation uses UIA `InvokePatternIdentifiers.InvokedEvent` on an already approved button, menu action, or hyperlink. The callback retains only the sender element reference and aggregate count inside the native helper, then emits generic control structure, geometry, process identity, and count as `invocation`; no label, value, result, text, command, URL, path, or content is read. Electron accepts only matching `tool`/`web` controls and publishes zero-travel `invocation/activity`. The independent external-activity engine derives an `invoking` press pose, and `BasilOrb` draws a tiny procedural monochrome button-and-spark cue for 720 ms while Hermes task semantics remain idle.

The long-running Windows UIA monitor is materialized as a temporary UTF-8 `.ps1` and launched with PowerShell `-File`, then removed when the monitor exits. This avoids Windows' command-line length ceiling as the structural event adapter grows; the monitor remains generated from the single `WINDOWS_UIA_MONITOR_SCRIPT` source and is still isolated from the generic BasilMotion engine.

External desktop objects have a separate two-stage intent lifecycle. The Windows UIA monitor emits `preview` only after the cursor remains within a 5 px radius for 600 ms, refreshes it while the pointer remains stationary, and suppresses further previews after activation until the pointer moves. Preview sends the same geometry and structural metadata as activation, never labels or values. Basil stays in place, turns toward the object, and shows its procedural cue at 56% intensity with a restrained scene profile. A genuine left click emits `activate`, cancels preview expiry, and promotes the target through `approach` to fully `engaged` choreography while the overlay travels beside it. Expiry only removes the preview and restores the real agent scene; it does not create activity.

Object direction is resolved independently from travel direction after placement. In-window anchors use the live DOM rectangle; the desktop overlay uses the privacy-safe UI Automation rectangle and its final screen position. Basil's state gaze and lean turn toward the object, and the procedural working-prop layer mirrors onto the object-facing side without mirroring his face. Above/below anchor math maintains a real gap instead of overlapping the target.

SVG definition IDs are unique per component instance, allowing the in-app dock, development preview, and a future overlay renderer to coexist without gradient or filter collisions.

## Event Flow

Hermes gateway events arrive through the existing desktop WebSocket path:

1. `src/hermes.ts` opens the gateway WebSocket.
2. `src/app/gateway/hooks/use-gateway-boot.ts` forwards events to the app.
3. `src/app/contrib/wiring.tsx` calls `emitGatewayEvent(event)` before Hermes' normal stream handler.
4. `src/basil-motion/basil-motion-controller.tsx` subscribes with `onGatewayEvent('*')`.
5. `src/basil-motion/adapters/hermes.ts` maps the Hermes event to a generic agent event.
6. `src/basil-motion/store.ts` reduces that generic event into Basil's current state.
7. `src/basil-motion/task-journey-engine.ts` updates the privacy-safe multi-object journey from that same event.
8. `src/basil-motion/interaction-router.ts` selects the matching named interaction from safe generic event semantics.
9. `src/basil-motion/interaction-pack.ts` samples its four-beat procedural choreography.
10. `src/basil-motion/scene-choreography.ts` blends the state with generic target-specific parameter and prop intent.
11. `src/basil-motion/attention-engine.ts` derives short-lived direction, novelty, and familiarity from a rolling generic task sequence.
12. `src/basil-motion/handoff-engine.ts` maps the previous and current genuine generic targets to a carried-work payload.
13. `src/basil-motion/engagement-engine.ts` maps genuine lifecycle phases to notice, prepare, and act commitment poses.
14. `src/basil-motion/object-affordance.ts` derives shape, contact, depth, and gaze from real generic bounds and points.
15. `src/basil-motion/contact-kinematics-engine.ts` maps that contact to orientation, grip, bracing, pressure, and body balance.
16. `src/basil-motion/asset-physics-engine.ts` maps genuine geometry and payload semantics to physical load.
17. `src/basil-motion/limb-engine.ts` derives target-specific arm contacts, grip angles, and carried-work trajectories.
18. `src/basil-motion/actor-drag-engine.ts` derives explicit held and release poses from genuine direct manipulation of Basil.
19. `src/basil-motion/pointer-kinetics.ts` derives directional velocity, speed, approach, and dwell from genuine pointer samples.
20. `src/basil-motion/pointer-intent-engine.ts` derives bounded anticipatory gaze and exact stationary settling.
21. `src/basil-motion/pointer-gestures.ts` derives orbit, crown-petting, and directional swipe impulses from the short-lived pointer path.
22. `src/basil-motion/gaze-engine.ts` arbitrates genuine pointer, object, task, and social attention into one coherent facial pose.
23. `src/basil-motion/face-intent-engine.ts` coordinates object-first, user check-in, shared-work, and sleeping facial intent.
24. `src/basil-motion/speech-expression-engine.ts` derives compact loop-safe phoneme and phrase-emphasis poses only while genuine speaking is active.
25. `src/basil-motion/locomotion-engine.ts` derives grounded, roll, hop, brake, and landing poses from real movement signals.
26. `src/basil-motion/scene-motion.ts` derives raw target-specific SVG action progress, gesture, lift, rotation, pulse, and task-aware gaze.
27. `src/basil-motion/task-action-engine.ts` converts real lifecycle phase plus generic target into a semantic action and procedural phase cue.
28. `src/basil-motion/manipulation-engine.ts` gates raw semantic prop and limb motion through observe, reach, contact, operate, and release.
29. `src/basil-motion/path-planner.ts` routes the actor around unrelated live surfaces while preserving the selected final destination.
30. `src/basil-motion/basil-motion-stage.tsx` resolves the matching live UI anchor and moves the procedural SVG actor beside it.

Genuine cross-application pointer dragging follows a separate structural path. `electron/basil-windows-uia.ts` defers ordinary activation until mouse-up, promotes a left press to `drag_start` only after 10 px of real displacement, samples bounded `drag_move` distance/velocity, and emits `drag_end` on the physical release. It sends only generic target structure, geometry, distance, and velocity; UIA names, values, labels, content, paths, and commands remain excluded. Electron main converts physical coordinates to DIP, runs the shared drag solver, keeps the overlay click-through, locks its Windows frame size, and publishes `dragging`/`dropped` poses through the preload bridge. `basil-overlay-app.tsx` and `use-basil-spatial.ts` feed the same pose into `BasilOrb`, producing eye tracking, grip, lean/lift, squash, effort marks, accessory contact, and release without timer-generated activity.

Workspace coordination begins only after a genuine DOM/UIA target is engaged. A real pointer obstruction enters the pure coordination engine, then the host's existing route planner moves Basil to the selected clear placement while retaining the active generic target. The overlay sends `reason: assist` through the isolated nudge IPC, stays click-through for the complete move, and normalizes `screen.getCursorScreenPoint()` through `screen.screenToDipPoint()` before renderer hit-testing so physical Windows pixels and Electron DIPs agree at non-100% scaling. Electron records only the DIP point that caused an assist; UIA previews at that unchanged point are suppressed so a newly revealed background window cannot steal Basil's work context. Movement beyond the existing 5 px hover radius releases the gate and restores normal preview behavior. Landing or a new real target clears the cue.

Genuine external scrolling follows another structural path. The active element's UIA `ScrollPattern` percentage and delta cross the native monitor as `scroll`; the parser normalizes supported axes; `surfaceProgressDestination()` keeps Basil on the same collision-safe side and places his exact contact at the new progress; Electron main interpolates the detached frame and emits `follow -> landed`; and `basil-overlay-app.tsx` feeds the resulting contact, direction, task phase, and context through the existing gaze, limb, locomotion, and face engines. The same surface's redundant hover preview is suppressed during this movement, while a real pointer move to another surface remains available.

Genuine keyboard focus follows the same main-process movement contract: a changed structural focus target is accepted only when it is keyboard-focusable, belongs to the active process, and differs from the current surface. The target is remembered as user-approved workspace geometry, marked `activationSource=keyboard`, and sent through `follow -> landed` with no task phase, handoff, familiarity increment, or work-surface traversal. Button, slider, tab, menu, editor, tree, document, hyperlink, image, and data controls therefore remain reusable generic object categories rather than Hermes-specific commands.

Genuine external content change is intentionally narrower. A `TextChanged` notification is accepted only for the already approved process and editable structural category. Main preserves the current target and obstacle context, publishes a bounded `input` aggregate, and keeps screen travel at zero. The overlay refreshes the generic `typing` activity pose from each real notification, but leaves task action and task phase at `idle`; an external user editing a document is character interaction, not a fabricated Hermes tool call.

Genuine structural selection is accepted only from the already approved process and a selectable generic asset category. The selected element's center and bounds become the new object affordance. Electron publishes `selection/follow`, routes around the selected rectangle, and lands without surface traversal. The renderer shows the `selecting` pose and check cue while task action and task phase remain `idle`; changing a list, tree, file, image, data row, tab, or tool choice does not fabricate agent work.

Genuine control adjustment is accepted only from the active process and generic `tool` or `data` controls. The current external target and obstacle context are preserved, screen travel stays at zero, and the renderer refreshes an `adjusting` pose from each actual property-change notification. The property value is neither read nor required, and no agent event is emitted.

Genuine collection mutation is accepted only from the already approved process and a generic `data`, `document`, or `folder` surface. UIA emits `structure` with aggregate count and category; the parser converts that category to an `add`, `remove`, or `reorder` variant; Electron preserves the current target and obstacle context and publishes zero-travel `collection/activity`; and the overlay refreshes the generic `organizing` pose and matching stack cue. The collection change never creates a Hermes agent event or task phase.

Genuine control invocation is accepted only from the already approved process and a generic `tool` or `web` surface. UIA emits `invocation` only after the native control reports `InvokedEvent`; Electron preserves the active target and obstacle context and publishes zero-travel `invocation/activity`; and the overlay refreshes the generic `invoking` pose and press cue. Focusing or merely hovering the control cannot create this activity, and the invocation does not fabricate an agent tool event.

Genuine user-surface movement follows a separate no-work branch. The UIA monitor's existing 900 ms geometry refresh updates only the remembered exact process/category surface and preserves normalized contact. `shouldFollowBasilUserWorkspaceTarget()` accepts only the current user-approved source, rejects agent-owned, unchanged, wrong-process, and wrong-category geometry, and feeds the existing obstacle-aware `follow` route with traversal disabled. The renderer keeps task action/phase idle and clears any short-lived external activity rather than interpreting window movement as work.

Genuine surface dismissal starts only when that refresh can no longer read the already approved element. The category-only `dismiss` record passes through the external-scene parser; Electron validates it against the current target, cancels travel/preview/drag release, removes only the matching remembered surface, and publishes `dismissed/activity`; and the overlay holds the previous generic affordance just long enough to render `departing` before releasing all external state. Preview expiry continues to dismiss immediately and does not show a farewell.

The initial Hermes mapping is:

- `message.start` -> `thinking`
- `message.delta`, `message.interim` -> `speaking`
- `reasoning.delta`, `reasoning.available`, `moa.aggregating` -> `thinking`
- `tool.generating` -> target-specific state with task phase `prepare`
- `tool.start` -> target-specific state with task phase `execute`
- `tool.progress` -> target-specific state with task phase `inspect`
- `tool.complete` -> `thinking` plus task phase `complete`, retaining the real tool surface long enough to render completion
- `approval.request`, `clarify.request`, `secret.request`, `sudo.request` -> `awaiting_permission`
- `status.update(kind=compacting)` -> `reading`
- `message.complete` -> `success`
- `session.info(running=false)` -> `idle`
- `error` -> `error`

The generic event contract also supports `idle`, `listening`, `sleeping`, and direct `searching`/`reading`/`writing` events so other agent apps can reuse the engine later without importing Hermes. Scene action generation accepts only generic `BasilSceneTarget`, phase, and energy values, so another renderer can reuse it without Electron, Windows UI Automation, or Hermes.

## Spatial Interaction

`spatial-engine.ts` is DOM-free and owns scene target selection, anchor placement, viewport clamping, spring movement, pointer gaze, and interaction-to-animation blending. `dom-scene-adapter.ts` is a generic browser adapter: another agent UI can provide selector specifications and receive measured `BasilSceneAnchor` objects.

Before embedded travel starts, `path-planner.ts` treats Basil as a 108 x 108 actor and converts visible composer, data, document, editor, error, folder, image, permission, terminal, tool, and web anchors into configuration-space obstacles. A clear line remains direct. A blocked line receives the shortest valid corner route with 14 px clearance. Conversation/rest backgrounds are excluded, and the active destination anchor is excluded so Basil can reach the exact side selected by `spatial-engine.ts`. Waypoints never change agent state or invent activity. Layout reconciliation hashes relevant anchor geometry, so Basil replans only when a real anchor moves or resizes; his own per-frame style updates do not restart the route.

Large work surfaces now support deterministic phase-aware perimeter routing. A genuine `prepare`, `execute`, `inspect`, or `complete` event selects an ordered point along the already collision-safe side of `data`, `document`, `editor`, `image`, `terminal`, or `web` bounds. Basil remains outside the asset, while the derived contact point advances inside the same edge so his gaze, body stance, and working hands follow the exact region being processed. Surfaces shorter than 1.55 actor lengths and events without a task phase retain midpoint placement. Repeating the same target and phase returns the same destination exactly; interpolation moves Basil there, but no clock advances the route and no timer invents work.

For detached active surfaces, structural scroll progress selects the corresponding point along the same safe perimeter side. Vertical progress moves Basil along left/right edges; horizontal progress moves him along above/below edges. The complete actor remains clamped to the monitor work area, the target gap is preserved, and exact contact coordinates update the face and working posture instead of merely translating the native window.

Hermes supplies anchors for the composer, assistant messages, links/embeds, image artifacts, tables/grids, file artifacts, code and diff cards, file-tree items, tool blocks, terminals, approval controls, alerts, profile rail, and status bar. Genuine Hermes events carry scene hints such as `web`, `document`, `image`, `data`, `editor`, `terminal`, `tool`, `permission`, and `conversation`. Tool names containing image/photo/screenshot/vision/OCR or spreadsheet/Excel/CSV/table/chart/plot/dataframe intent map to those generic asset scenes before broader read/write classification. `scene-choreography.ts` is Hermes-free and gives each target distinct approach and engaged parameter profiles while preserving stronger real agent-state signals. Basil travels only when one of those events occurs, when the user changes a development state, when the user drags Basil, or when the user clicks a recognized UI object. There is no timer-driven fake work or random roaming.

Pointer movement is tracked globally without React renders per pointer event. The animation loop smoothly blends pointer direction into Basil's eyes, proximity/hover into expression and energy, press into squash, a real tap into temporary affection, pointer speed/approach into anticipation and surprise, nearby dwell into wink/blush, a completed orbit into a directional halo/wink/counter-wobble, a fast cross-orb swipe into a directional lean/stretch/whoosh, and travel speed into particles and glow. Basil is draggable and persists the user's resting position; the next genuine activity event can move him to the relevant live surface.

Every genuine event or recognized click is also recorded in the ephemeral attention engine. Basil anticipates the next destination with directional gaze and lean while keeping pointer gaze dominant, emits rear-facing ink trails only while moving, and settles with a novelty-weighted handoff cue. A revisit increases target-category familiarity instead of replaying the same maximum-surprise response. Manual drag does not fabricate an attention visit.

When two different genuine work surfaces occur consecutively, the attention transition exposes only the previous generic target to `handoff-engine.ts`. The embedded Hermes actor and detached overlay use the same adapter and frame fields, so both render an identical source-specific parcel during real travel and a destination delivery cue after landing. The handoff is event-driven and has no autonomous timer that invents work; animation time only interpolates a payload created by real activity.

External placement scores right, left, above, and below candidates using the visible 120 px actor rather than the larger transparent overlay window. It heavily penalizes overlap with the target, avoids crowding the genuine click point, and uses travel distance only as a small tie-breaker. This supports wide/full-screen controls where a horizontal placement cannot be clear. The chosen object vector also controls which side holds the context prop.

After activation, large work surfaces can continue through `landed -> traverse -> landed` instead of stopping at the first arrival. `surfaceTraversalDestination()` is a pure, platform-neutral geometry planner used for `document`, `editor`, `terminal`, `web`, `image`, and `data` targets. It keeps Basil on the collision-safe side selected by placement, chooses the far surface region relative to the genuine click, clamps to the current display work area, and rejects paths shorter than 38% of the visible actor size. `overlaySurfaceTraversalFrame()` follows a smooth path with a small outward bow so the actor never crosses the content. Compact tools and folders retain a single landing. Traversal keeps the real target's procedural action active, adds restrained working energy, and is immediately cancelled by another real target, drag, pop-in, or close.

The development panel can force all 12 states, all 11 interpolated parameters, every generic scene target, and all 100 named interactions independently. The interaction browser is grouped by category, has an explicit replay command, and includes a phase scrubber for starting at any beat. A target override changes only visual inspection context and is explicitly labelled `automatic target` when disabled; it does not fabricate a gateway event. Overrides and interaction playback mirror to the detached overlay for parity testing.

When Basil is popped out, Electron samples the real desktop cursor at 20 Hz through `screen.screenToDipPoint(screen.getCursorScreenPoint())`. The explicit conversion is required on Windows displays such as the verified 125% DPI desktop, where the native cursor arrives in physical pixels while BrowserWindow and renderer geometry use DIPs. The overlay combines that absolute position with its own screen bounds, so Basil continues looking at the pointer over other applications without installing a native mouse package or sending synthetic input. The same sample drives an inclusive actor hit test and toggles Electron mouse passthrough only when the cursor crosses the visible orb boundary. This makes genuine desktop clicks reach Basil while keeping the overlay's transparent pixels click-through; redundant IPC calls are suppressed.

The detached overlay uses the same one-shot swipe recognition and generic nudge planner as embedded Basil. A resting swipe sends one destination through the isolated `hermes:basil-overlay:nudge` preload bridge; Electron main clamps it to the nearest monitor work area and animates the real transparent window on the existing smooth travel path. The renderer holds the locomotion pose until the promise resolves, then emits the landing pose, while main publishes the final bounds for persistence. A new agent state, active external target, drag, close, or pop-in cancels the request. A deliberate swipe may dismiss passive UIA preview attention, but `travel`, `traverse`, and landed object work remain anchored.

On Windows, the overlay also starts an optional UI Automation listener. It detects deliberate stable hover and genuine left-button presses, resolves the accessibility element under the cursor, and emits only intent, bounding rectangle, process ID, structural class, control type, invoke support, and keyboard-focusability. Names, values, labels, help text, and automation IDs are deliberately excluded. Hermes-owned elements are filtered by the actual main/renderer process IDs rather than screen bounds, so an external window overlapping Hermes remains detectable. Hidden and minimized targets are also ignored. A pure adapter classifies the remaining element as `folder`, `document`, `image`, `data`, `editor`, `terminal`, `web`, `tool`, or `conversation`; WPF/UIA Image controls and photo/image classes map to `image`, while DataItem/DataGrid/Excel/spreadsheet/chart classes map to `data`. Hover previews the matching prop without moving Basil. Activation makes Basil follow a smooth lifted screen-space path, land beside the object, look back toward the cursor, and perform the full procedural action. The listener exists only while the Basil overlay exists and is terminated on pop-in, close, or application quit.

Approved native surfaces also distinguish translation from resizing through the generic workspace adapter. Width or height deltas become an internal `resize` intent; position-only deltas retain ordinary follow behavior. Some controls emit a genuine UIA scroll notification first when their viewport reflows, so Electron checks that event's structural bounds before applying scroll semantics and synchronizes workspace memory at the first size change. The active element also receives a dedicated `BoundingRectangleProperty` subscription. Its callback increments only an aggregate count; it never reads old/new property values, names, text, or content. The monitor consumes those counts at no more than 48 ms cadence and emits current structural geometry through the same `refresh` contract, while the 900 ms poll remains a stale-element fallback. In-flight user-owned follow routes replan from Basil's current position to the newest coalesced geometry instead of ignoring live changes. The renderer maps `resize` to a portable `resizing` activity with smoothly varying body balance and a procedural corner-handle cue. Follow routes include the active surface itself as an obstacle and use 12 px route clearance with a 16 px landing gap, allowing a large saved overlay to leave a near-edge start without crossing the resized asset.

Position-only live geometry now maps to the internal `move` intent instead of replaying ordinary activation. The generic activity adapter derives a `surfing` pose from the route's genuine normalized direction: Basil counter-leans against horizontal motion, follows vertical direction with restrained attention, and renders a small procedural under-orb rail with trailing motion ticks. The pose is target-generic, rejects conversation chrome, decays after movement stops, and never creates or modifies an agent task. Because the same event contract carries `move`, direction, target category, and bounds, other agent shells can reuse the animation without importing Electron or Hermes code.

## States And Parameters

Supported states:

`idle`, `listening`, `thinking`, `searching`, `reading`, `writing`, `using_tool`, `awaiting_permission`, `success`, `error`, `speaking`, `sleeping`.

Interpolated parameters:

`eyeX`, `eyeY`, `blink`, `mouth`, `squash`, `float`, `rotation`, `energy`, `glow`, `accessoryVisibility`, `particleIntensity`.

## Desktop Overlay

Basil can now move between Hermes and an independent transparent, frameless, always-on-top Electron window. Shift-clicking the in-window actor opens the desktop overlay at Basil's current screen position; shift-clicking the overlay actor returns him to Hermes. A normal click produces the same affection reaction in either renderer. The overlay can be dragged anywhere on the desktop, remembers its bounds, remains animated while Hermes is minimized, passes clicks through its transparent area, and double-clicks to toggle the main Hermes window.

The overlay has an independent `hermes:basil-overlay:*` IPC namespace and does not reuse or disable Petdex. The primary renderer remains the single source of truth and mirrors `BasilStateSnapshot` plus parameter overrides to the gateway-less overlay renderer. The core engine still imports no Node, Electron, or Hermes APIs.

## Files Changed

- `apps/desktop/src/app/contrib/wiring.tsx`
- `apps/desktop/electron/main.ts`
- `apps/desktop/electron/preload.ts`
- `apps/desktop/electron/basil-external-scene.ts`
- `apps/desktop/electron/basil-external-scene.test.ts`
- `apps/desktop/electron/basil-windows-uia.ts`
- `apps/desktop/electron/basil-windows-uia.test.ts`
- `apps/desktop/electron/basil-workspace-memory.ts`
- `apps/desktop/electron/basil-workspace-memory.test.ts`
- `apps/desktop/electron/basil-foreground-discovery.ts`
- `apps/desktop/electron/basil-foreground-discovery.test.ts`
- `apps/desktop/src/basil-motion/adapters/generic.ts`
- `apps/desktop/src/basil-motion/adapters/hermes.ts`
- `apps/desktop/src/basil-motion/adapters/hermes-scene.ts`
- `apps/desktop/src/basil-motion/adapters/hermes-scene.test.ts`
- `apps/desktop/src/basil-motion/adapters/hermes.test.ts`
- `apps/desktop/src/basil-motion/accessory-attachment-engine.test.ts`
- `apps/desktop/src/basil-motion/accessory-attachment-engine.ts`
- `apps/desktop/src/basil-motion/actor-drag-engine.test.ts`
- `apps/desktop/src/basil-motion/actor-drag-engine.ts`
- `apps/desktop/src/basil-motion/antenna-signal-engine.test.ts`
- `apps/desktop/src/basil-motion/antenna-signal-engine.ts`
- `apps/desktop/src/basil-motion/asset-physics-engine.test.ts`
- `apps/desktop/src/basil-motion/asset-physics-engine.ts`
- `apps/desktop/src/basil-motion/attention-engine.test.ts`
- `apps/desktop/src/basil-motion/attention-engine.ts`
- `apps/desktop/src/basil-motion/basil-dev-panel.tsx`
- `apps/desktop/src/basil-motion/basil-dev-panel.test.tsx`
- `apps/desktop/src/basil-motion/basil-motion-controller.tsx`
- `apps/desktop/src/basil-motion/basil-overlay-app.tsx`
- `apps/desktop/src/basil-motion/basil-overlay-app.test.tsx`
- `apps/desktop/src/basil-motion/basil-overlay-root.tsx`
- `apps/desktop/src/basil-motion/basil-overlay.test.ts`
- `apps/desktop/src/basil-motion/basil-overlay.ts`
- `apps/desktop/src/basil-motion/basil-tour-app.test.tsx`
- `apps/desktop/src/basil-motion/basil-tour-app.tsx`
- `apps/desktop/src/basil-motion/basil-tour-data.test.ts`
- `apps/desktop/src/basil-motion/basil-tour-data.ts`
- `apps/desktop/src/basil-motion/basil-tour-root.tsx`
- `apps/desktop/src/basil-motion/basil-personality-root.tsx`
- `apps/desktop/src/basil-motion/basil-personality-showcase.test.tsx`
- `apps/desktop/src/basil-motion/basil-personality-showcase.tsx`
- `apps/desktop/src/basil-motion/basil-motion-stage.test.tsx`
- `apps/desktop/src/basil-motion/basil-motion-stage.tsx`
- `apps/desktop/src/basil-motion/basil-orb.test.tsx`
- `apps/desktop/src/basil-motion/basil-orb.tsx`
- `apps/desktop/src/basil-motion/contact-kinematics-engine.test.ts`
- `apps/desktop/src/basil-motion/contact-kinematics-engine.ts`
- `apps/desktop/src/basil-motion/direct-touch-engine.test.ts`
- `apps/desktop/src/basil-motion/direct-touch-engine.ts`
- `apps/desktop/src/basil-motion/dom-scene-adapter.test.ts`
- `apps/desktop/src/basil-motion/dom-scene-adapter.ts`
- `apps/desktop/src/basil-motion/drag-collaboration-core.d.mts`
- `apps/desktop/src/basil-motion/drag-collaboration-core.mjs`
- `apps/desktop/src/basil-motion/drag-collaboration-engine.test.ts`
- `apps/desktop/src/basil-motion/drag-collaboration-engine.ts`
- `apps/desktop/src/basil-motion/engagement-engine.test.ts`
- `apps/desktop/src/basil-motion/engagement-engine.ts`
- `apps/desktop/src/basil-motion/engine.ts`
- `apps/desktop/src/basil-motion/external-activity-engine.test.ts`
- `apps/desktop/src/basil-motion/external-activity-engine.ts`
- `apps/desktop/src/basil-motion/face-intent-engine.test.ts`
- `apps/desktop/src/basil-motion/face-intent-engine.ts`
- `apps/desktop/src/basil-motion/gaze-engine.test.ts`
- `apps/desktop/src/basil-motion/gaze-engine.ts`
- `apps/desktop/src/basil-motion/handoff-engine.test.ts`
- `apps/desktop/src/basil-motion/handoff-engine.ts`
- `apps/desktop/src/basil-motion/index.ts`
- `apps/desktop/src/basil-motion/interaction-accessory.tsx`
- `apps/desktop/src/basil-motion/interaction-pack.test.ts`
- `apps/desktop/src/basil-motion/interaction-pack.ts`
- `apps/desktop/src/basil-motion/interaction-router.test.ts`
- `apps/desktop/src/basil-motion/interaction-router.ts`
- `apps/desktop/src/basil-motion/limb-engine.test.ts`
- `apps/desktop/src/basil-motion/limb-engine.ts`
- `apps/desktop/src/basil-motion/locomotion-engine.test.ts`
- `apps/desktop/src/basil-motion/locomotion-engine.ts`
- `apps/desktop/src/basil-motion/manipulation-engine.test.ts`
- `apps/desktop/src/basil-motion/manipulation-engine.ts`
- `apps/desktop/src/basil-motion/object-affordance.test.ts`
- `apps/desktop/src/basil-motion/object-affordance.ts`
- `apps/desktop/src/basil-motion/pointer-kinetics.test.ts`
- `apps/desktop/src/basil-motion/pointer-kinetics.ts`
- `apps/desktop/src/basil-motion/pointer-gestures.test.ts`
- `apps/desktop/src/basil-motion/pointer-gestures.ts`
- `apps/desktop/src/basil-motion/pointer-intent-engine.test.ts`
- `apps/desktop/src/basil-motion/pointer-intent-engine.ts`
- `apps/desktop/src/basil-motion/pointer-departure-engine.test.ts`
- `apps/desktop/src/basil-motion/pointer-departure-engine.ts`
- `apps/desktop/src/basil-motion/pointer-contact-engine.test.ts`
- `apps/desktop/src/basil-motion/pointer-contact-engine.ts`
- `apps/desktop/src/basil-motion/pointer-nudge-engine.test.ts`
- `apps/desktop/src/basil-motion/pointer-nudge-engine.ts`
- `apps/desktop/src/basil-motion/point-of-interest-engine.test.ts`
- `apps/desktop/src/basil-motion/point-of-interest-engine.ts`
- `apps/desktop/src/basil-motion/personality-cue.tsx`
- `apps/desktop/src/basil-motion/personality-engine.test.ts`
- `apps/desktop/src/basil-motion/personality-engine.ts`
- `apps/desktop/src/basil-motion/personality-pack.test.ts`
- `apps/desktop/src/basil-motion/personality-pack.ts`
- `apps/desktop/src/basil-motion/personality-scheduler.test.ts`
- `apps/desktop/src/basil-motion/personality-scheduler.ts`
- `apps/desktop/src/basil-motion/prop-composition-engine.test.ts`
- `apps/desktop/src/basil-motion/prop-composition-engine.ts`
- `apps/desktop/src/basil-motion/path-planner.test.ts`
- `apps/desktop/src/basil-motion/path-planner-core.d.mts`
- `apps/desktop/src/basil-motion/path-planner-core.mjs`
- `apps/desktop/src/basil-motion/path-planner.ts`
- `apps/desktop/src/basil-motion/spatial-engine.test.ts`
- `apps/desktop/src/basil-motion/spatial-engine.ts`
- `apps/desktop/src/basil-motion/speech-expression-engine.test.ts`
- `apps/desktop/src/basil-motion/speech-expression-engine.ts`
- `apps/desktop/src/basil-motion/scene-choreography.test.ts`
- `apps/desktop/src/basil-motion/scene-choreography.ts`
- `apps/desktop/src/basil-motion/scene-motion.test.ts`
- `apps/desktop/src/basil-motion/scene-motion.ts`
- `apps/desktop/src/basil-motion/shell-lighting-engine.test.ts`
- `apps/desktop/src/basil-motion/shell-lighting-engine.ts`
- `apps/desktop/src/basil-motion/store.ts`
- `apps/desktop/src/basil-motion/store.test.ts`
- `apps/desktop/src/basil-motion/task-action-engine.test.ts`
- `apps/desktop/src/basil-motion/task-action-engine.ts`
- `apps/desktop/src/basil-motion/task-journey-engine.test.ts`
- `apps/desktop/src/basil-motion/task-journey-engine.ts`
- `apps/desktop/src/basil-motion/types.ts`
- `apps/desktop/src/basil-motion/use-basil-spatial.ts`
- `apps/desktop/src/basil-motion/use-basil-frame.ts`
- `apps/desktop/src/basil-motion/use-basil-personality.test.tsx`
- `apps/desktop/src/basil-motion/use-basil-personality.ts`
- `apps/desktop/src/basil-motion/workspace-coordination-engine.test.ts`
- `apps/desktop/src/basil-motion/workspace-coordination-engine.ts`
- `apps/desktop/src/global.d.ts`
- `apps/desktop/src/main.tsx`
- `apps/desktop/src/styles.css`
- `apps/desktop/tsconfig.electron.json`
- `apps/desktop/public/basil-motion/01-social.mp3`
- `apps/desktop/public/basil-motion/02-listening.mp3`
- `apps/desktop/public/basil-motion/03-thinking.mp3`
- `apps/desktop/public/basil-motion/04-search.mp3`
- `apps/desktop/public/basil-motion/05-reading.mp3`
- `apps/desktop/public/basil-motion/06-writing.mp3`
- `apps/desktop/public/basil-motion/07-tools.mp3`
- `apps/desktop/public/basil-motion/08-permission.mp3`
- `apps/desktop/public/basil-motion/09-results.mp3`
- `apps/desktop/public/basil-motion/10-speaking-rest.mp3`
- `apps/desktop/public/basil-motion/11-pointer.mp3`
- `apps/desktop/public/basil-motion/12-desktop.mp3`
- `apps/desktop/BASIL_MOTION.md`

Production-only proof harnesses live in the Codex task workspace under `work/`: `basil-physical-pointer.ps1`, `basil-workspace-coordination-proof.mjs`, `basil-scroll-editor.ps1`, `basil-physical-wheel.ps1`, `basil-scroll-follow-proof.mjs`, `basil-focus-controls.ps1`, `basil-physical-key.ps1`, `basil-focus-follow-proof.mjs`, `basil-physical-type.ps1`, `basil-edit-activity-proof.mjs`, `basil-selection-controls.ps1`, `basil-physical-selection-key.ps1`, `basil-selection-proof.mjs`, `basil-uia-selection-capture.ts`, `basil-control-adjustment-proof.mjs`, `basil-collection-controls.ps1`, `basil-collection-proof.mjs`, `basil-invocation-controls.ps1`, `basil-uia-invocation-capture.ts`, `basil-invocation-proof.mjs`, `basil-move-window.ps1`, `basil-user-surface-follow-proof.mjs`, `basil-surface-dismiss-proof.mjs`, `basil-surface-resize-proof.mjs`, `basil-live-resize-window.ps1`, `basil-live-resize-proof.mjs`, `basil-live-move-window.ps1`, `basil-live-move-proof.mjs`, `basil-pointer-departure-proof.mjs`, `basil-boop-proof.mjs`, `basil-tickle-proof.mjs`, `basil-shell-lighting-proof.mjs`, `basil-production-proof.mjs`, and `inspect-live-basil-overlay.mjs`. They are not imported by Hermes or Basil Motion. Durable project status is mirrored to `AI Agents/Projects/Basil Desktop.md` in the shared Obsidian vault.

## Build And Test Commands

From `apps/desktop`:

- `npm run dev`
- `npm run build`
- `npm run typecheck`
- `npm run test`
- `npm run test:ui`
- `npm run test:e2e`
- `npm run dev:renderer`, then open `http://127.0.0.1:5174/?win=basil-tour` for the narrated showcase
- `npm run dev:renderer`, then open `http://127.0.0.1:5174/?win=basil-personality` for the 20-behaviour Personality Lab

Current focused coverage is 39 files and 307 tests:

- `npx vitest run --project ui src/basil-motion`: 34 files and 232 tests covering the complete 100-entry catalog, unique IDs/labels, ten category counts, 25 motifs, 25 props, four finite bounded beats per cue, looping and settling policy, all-100 runtime reachability, deterministic same-session variety, semantic label/scene/phase/outcome routing, arbitrary-content exclusion, development replay/phase controls, synchronized interaction SVG data/props/transforms, Hermes event/state/scene/tool/asset mapping, privacy-safe session/event identity, genuine `prepare/execute/inspect/complete` lifecycle mapping, target-specific semantic task actions and cues, deterministic ordered perimeter routing, strict asset non-overlap, direct and multi-waypoint obstacle paths, viewport-edge escape routes, deterministic path replay, full-body collision sampling, final-only landing, phase-specific contact geometry, compact-target fallback, repeat-phase stability, live scroll/resize/reflow anchor following, disappeared-anchor hold, observer cleanup, short-lived attention history, generic payload creation/exclusion, notice/prepare/act phase derivation, stable DOM hover preview with zero actor travel and activated-anchor suppression, compact/wide/tall/surface affordance classification, normalized contact/depth/gaze derivation, four-side contact orientation, exact local contact-axis tracking, active-hand reach, counter-bracing, wrist rotation, upright above/below prop posture, pressure gating before contact, deep-versus-compact reach, genuine asset scale/shape/depth/load/effort derivation, pre-contact strain suppression, light/medium/heavy bracing, load-aware body/grip/shadow rendering, load-aware carry height and parcel scale, pointer/object/shared/ambient gaze arbitration, social-state priority, sleep suppression, rendered eye traversal, focused/curious/concerned expressions, causal look-before-reach orientation, real-pointer check-in, release-to-user attention, directional pointer-velocity capture/reversal/decay, bounded predictive gaze, exact stationary settling, object-commitment prediction damping, social-state directness, predictive-gaze SVG diagnostics, sleep suppression, 90 ms face easing, restrained eye-spacing/near-far depth, observe/reach/contact/operate/release sequencing, contact-before-response gating, synchronized limb extension/retraction, procedural contact ticks, traversal contact retention, stale-bound clamping, procedural limb contacts and mirrored carry geometry, nearby-pointer precedence, deterministic pointer kinetics and path gestures, one-shot embedded and detached swipe nudges, stale-context release, passive-preview dismissal, negative-monitor routing, edge-slide fallback, protected active-work contexts, speed/approach/dwell/tap/orbit/swipe interaction blending, false-gesture rejection, surprise/wink/blush/affection/orbit/whoosh rendering, genuine roll/hop/brake/landing pose derivation, shell-only rotation, dynamic contact shadows, arrival impact rendering, two-hand typing, carried-work travel/delivery rendering, sequential overlay handoffs, route-turn locomotion without duplicate attention visits, pointer-activation stale-phase suppression, agent-event external task composition, geometry-only active-surface following with task preservation and duplicate-reaction suppression, genuine scroll-progress contact changes with editor context preservation, preview/approach/traverse/engaged/dismissed overlay transitions, inclusive actor hit-testing, target-facing geometry/choreography/prop mirroring, document/image/data/code/web/tool actions, animated SVG props/task gaze/travel cues, development scene overrides, DOM anchor discovery, click-to-object travel, privacy-safe task-journey start/advance/repeat/return/pause/resume/complete/fail behavior, four-target rolling trails, session reset, embedded/overlay journey mirroring, generic acquire/carry/release drag derivation, pointer-clearance constraints, click-through external carry, shared embedded/overlay drag rendering, genuine obstruction-yield activation, meaningful pointer-clearance gain, target-gap preservation after screen-edge clamping, cue rendering, embedded active-object collision avoidance, and detached native assist requests.
- `npx vitest run --project electron electron/basil-foreground-discovery.test.ts electron/basil-external-scene.test.ts electron/basil-windows-uia.test.ts electron/basil-workspace-memory.test.ts`: 4 files and 36 tests covering privacy-safe UIA intent/geometry/refresh/drag/scroll parsing, genuine click-versus-drag discrimination, structural `drag_start`/`drag_move`/`drag_end` emission, standard `ScrollPattern` sampling at 96 ms with a 0.5-point threshold, scroll percentage/delta normalization, safe-side edge-progress placement, exact structural surface matching, cached structural metadata, activation-only obstacle enumeration, activated-element refresh and stale-reference removal, forbidden private-field exclusion, once-per-genuine-event foreground discovery, development/conversation/duplicate suppression, current-event and exact-structural-target acceptance, active-user-target precedence, stale/Hermes-owned target rejection, workspace target arming/expiry/event deduplication/lifecycle matching, moved-window contact preservation, active-surface follow matching, geometry thresholds, pointer/dormant/wrong-process suppression, structural control classification, process ownership filtering, four-side collision/pointer-aware placement, negative-coordinate monitor clamping, screen-edge placement, full-body collision sampling across real window routes, negative-origin multi-turn paths, curved arrival travel, work-surface traversal eligibility/destination, compact-target rejection, outward path curvature, exact landing, genuine document-to-editor-to-terminal-to-web workspace recall, assist-route avoidance of the active asset, and stationary-pointer preview suppression with movement-gated release.

The latest complete execution supersedes the per-command counts embedded above: renderer coverage is 34 files and 233 tests; Electron coverage is 4 files and 39 tests. New assertions cover lossless bounded pointer-event queueing under loaded animation frames, structural `focus` parsing, 120 ms focused-element polling, private runtime-identity containment, same-process and keyboard-focusable eligibility, changed-surface gating, `keyboard` activation diagnostics, collision-safe follow rendering, and explicit exclusion of agent task semantics.

The current complete execution supersedes those historical counts: renderer coverage is 35 files and 237 tests; Electron coverage is 4 files and 41 tests. New assertions cover the pure external-activity pose solver, finite bounded typing motion, unsupported-surface rejection, privacy-safe `TextChanged` subscription and aggregate parsing, no-content native output, `content/activity/typing` renderer diagnostics, zero-travel behavior, idle task semantics, and deterministic freshness decay.

The latest complete execution supersedes those counts: renderer coverage is 35 files and 240 tests; Electron coverage is 4 files and 45 tests. New assertions cover selectable-target eligibility, bounded selecting pose variation, procedural check-cue rendering and decay, structural selection parsing, subtree event registration/removal, same-container subscription preservation, pending-selection priority over focus, same-process filtering, idle agent semantics, and 1,001-sample collision-free routing around a selected row.

The current complete execution supersedes those counts: renderer coverage is 35 files and 243 tests; Electron coverage is 4 files and 47 tests. New assertions cover adjustment target eligibility and bounded rotating motion, procedural dial-cue rendering/decay, aggregate `adjustment` parsing, structural property-handler registration/removal, explicit `OldValue`/`NewValue` exclusion, control activation diagnostics, zero travel, and idle task semantics.

The latest complete execution supersedes those counts: renderer coverage is 35 files and 246 tests; Electron coverage is 4 files and 49 tests. New assertions cover `add`/`remove`/`reorder` organizing variants, collection-target eligibility, procedural stack-cue rendering and decay, `StructureChanged` registration/removal, category-only aggregation, runtime-ID containment, aggregate `structure` parsing, collection activation diagnostics, zero travel, and idle task semantics. All three TypeScript configurations and scoped ESLint pass. The monolithic repository-wide Vitest command remains unsuitable as a Basil gate on this Windows host: its maximum-parallel run currently reports unrelated POSIX-path assumptions and contended UI timeouts; the complete isolated Basil renderer and Electron suites pass.

The current complete execution supersedes those counts: renderer coverage is 35 files and 249 tests; Electron coverage is 4 files and 51 tests. New assertions cover invocation target eligibility, bounded press motion, procedural button-and-spark rendering and decay, UIA `InvokedEvent` registration/removal, same-process containment, aggregate `invocation` parsing, invocation activation diagnostics, zero travel, and idle task semantics. All three TypeScript configurations, scoped ESLint with zero warnings, and `git diff --check` pass.

The latest complete execution supersedes those counts: renderer coverage is 35 files and 249 tests; Electron coverage is 4 files and 52 tests. New assertions cover all seven user-approved activation sources, moved-geometry eligibility, unchanged/wrong-process/wrong-category/agent-owned rejection, contact preservation through workspace refresh, and idle follow behavior. All three TypeScript configurations, scoped ESLint, `git diff --check`, and the production build pass.

The current complete execution supersedes those counts: renderer coverage is 35 files and 252 tests; Electron coverage is 4 files and 55 tests. New assertions cover work-surface farewell eligibility, conversation rejection, bounded wave motion, procedural departing-cue rendering and timed release, cached structural dismissal, private-content exclusion, `dismiss` parsing, and exact process/category workspace forgetting. All three TypeScript configurations, scoped ESLint with zero warnings, `git diff --check`, and the production build pass.

The latest complete execution supersedes those counts: renderer coverage is 35 files and 255 tests; Electron coverage is 4 files and 57 tests. New assertions cover move-versus-resize classification, portable `resize` intent mapping, work-surface eligibility, bounded balancing lean, procedural corner-cue rendering and decay, idle task semantics, and 1,001-frame near-edge routing of a large saved overlay around the active resized surface. All three TypeScript configurations, scoped ESLint with zero warnings, `git diff --check`, and the production build pass.

The current complete execution supersedes those counts: renderer coverage is 35 files and 255 tests; Electron coverage is 4 files and 58 tests. The new assertion covers active-element `BoundingRectangleProperty` registration, 48 ms aggregate consumption, focus/activation replacement, complete stale-element cleanup, and explicit old/new property-value exclusion. All three TypeScript configurations, scoped ESLint with zero warnings, `git diff --check`, and the production build pass.

The latest complete execution supersedes those counts: renderer coverage is 35 files and 258 tests; Electron coverage is 4 files and 58 tests. New assertions cover translation-to-`move` mapping, unchanged fallback, directional counter-lean, bounded direction values, generic work-surface eligibility, conversation rejection, procedural surf-rail rendering, timed decay, and idle task semantics. All three TypeScript configurations, scoped ESLint with zero warnings, `git diff --check`, and the production build pass.

Unarmed foreground discovery was verified in packaged Electron against a real focused WPF code editor that had never been clicked, previewed, activated, or supplied to Basil. A controlled exact `writing/apply_patch` lifecycle snapshot crossed the real preload/Main IPC bridge, triggered one structural-only foreground query, classified the focused UIA Edit control as `editor`, and moved the physical overlay from `{675,74}` through `preview -> approach -> engaged -> traverse` to the editor edge at `{1046,462}`. A subsequent `reading/read_file` event reused the now-approved workspace target. Both renderers remained `ready=complete` with zero console or page errors. The isolated actor frame is `outputs\basil-unarmed-foreground-editor.png`; the real desktop/editor comparison is `outputs\basil-unarmed-editor-desktop-proof.png`.

The obstacle-aware production proof ran the rebuilt Electron app from `dist` as PID `12772` on CDP port `9224`. A genuine click sent Basil from the left side of Hermes to a live code-card anchor with a web-card obstacle in the direct path. The harness sampled 2,806 rendered frames: the complete 108 px actor recorded zero obstacle overlaps, locomotion progressed through `roll -> land -> grounded`, engagement progressed through `prepare -> act`, the actor stayed topmost, and the renderer console recorded zero errors. The route trace is `outputs\basil-obstacle-aware-travel.png`; the cleaned production smoke is `basil-production-live.png`.

Detached obstacle routing was verified from a rebuilt production Electron process on CDP port `9224` with two separate real WPF processes: one blocking top-level window and one clicked editor target. A native Windows click produced the genuine UIA activation; the overlay then travelled below the blocker, turned horizontally, turned back toward the editor, landed, and traversed the work surface. The harness sampled 1,684 animation frames and observed zero 120 px visible-actor collisions, route vectors `0.672,0.740 -> 1.000,0.000 -> 0.339,-0.941`, locomotion modes `roll`, `hop`, `land`, and `grounded`, phases `approach`, `engaged`, and `traverse`, and zero renderer console errors. The four-frame proof is `outputs\basil-desktop-obstacle-routing.png`.

External workspace recall was verified in packaged Electron with a real WPF editor and native Windows click. Pointer activation travelled to the editor while correctly suppressing a stale task phase. The editor then moved from physical `{1050,200,360,480}` to `{720,90,420,560}`; UIA refreshed its DIP bounds and preserved the normalized contact while Basil stayed still. A controlled exact `apply_patch` lifecycle snapshot sent through the real preload/Main IPC produced `activationSource=agent-event`, recalled Basil to the refreshed rectangle, traversed it, and composed `execute/compose/type`, then `inspect/review/type` and `complete/save`. One measured recall moved the overlay from `{895,482}` through 157 frames to the refreshed editor; both renderers recorded zero console errors. Genuine Hermes gateway-to-generic lifecycle mapping remains covered separately by the adapter/fanout tests and semantic event proof. The three-stage visual proof is `outputs\basil-workspace-recall.png`.

Active-surface attachment was verified in packaged Electron with the same privacy-safe path. A native click armed a real WPF editor, then an exact Hermes `tool_start/apply_patch` snapshot through the preload/Main IPC established agent ownership with `execute/compose/type`. Moving the native editor sent no new agent state: UIA geometry refresh alone produced `follow -> landed`, moved Basil across an observed 849 px x-range, retained `compose`, kept familiarity exactly `0.333`, produced no handoff or traversal replay, and recorded zero renderer errors. In the authoritative same-call timing trace, follow began after `1,374 ms` and landed after `2,003 ms`, consistent with the 900 ms monitor cadence plus smooth travel. The before/move/reattach comparison is `outputs\basil-active-surface-follow.png`.

Production Electron verification on Windows used real OS clicks against WPF/Windows controls and a real Windows Terminal window. Basil correctly classified and travelled through `folder -> tool -> editor -> web -> image -> data -> terminal -> terminal`, including a genuine WPF Image and DataGrid. The harness sampled each cue twice and proved live transforms for `folder-open`, `tool-adjust`, `code-typing`, `web-scan`, `image-inspect`, `data-analyze`, and `terminal-typing`. Every novel handoff cue remained visible after landing, repeated-terminal familiarity increased from `0.000` to `0.333`, every visible actor placement remained clear of the click point, and every prop faced the real object. A real Windows cursor then moved rapidly from far away to Basil and produced approach `1.000` plus the surprise face; remaining nearby produced dwell `0.918`, blush, and a one-eye wink. A native Windows click on the detached orb reached affection `1.000` and displayed the heart reaction. A physical clockwise cursor circle produced orbit `1.000` with signed direction `1`; a physical left-to-right cross-orb swipe produced strength `0.899` and direction `1.000,0.000`. Both gesture effects rendered in the production overlay with zero console errors. Proof images are `basil-object-actions.png`, `basil-pointer-reactions.png`, `basil-gesture-reactions.png`, and `basil-multi-object-reaction.png` in the Codex task outputs.

A separate native hover proof held the physical Windows cursor over a real WPF folder without clicking. Basil classified it as `folder`, remained exactly at his prior position (`0 px` movement), and displayed the curious preview at focus intensity `0.56`. Clicking the same object promoted it to `folder-open`, focus intensity `1.00`, and moved Basil `635 px` beside the folder. Both renderers emitted zero console errors. The comparison image is `basil-hover-engagement.png` in the Codex task outputs.

A real WPF editor traversal proof clicked near the top of a 526 px-high editing surface. Basil first travelled `471 px` to its safe right edge, entered the `traverse` phase with `code-typing` still active, bowed `16 px` outward at mid-path, moved another `182 px` toward the far editing region, and landed exactly without covering editor content. Both renderer consoles remained error-free. The screen-level comparison is `basil-editor-surface-traversal.png` in the Codex task outputs.

A real cross-window handoff proof clicked a WPF editor, allowed its full traversal to finish, then clicked a newly opened Windows Terminal. The second genuine activation produced an `editor:terminal` route with a procedural `code` parcel on Basil's trailing side during approach, retained the terminal context/action, and displayed a separate delivery cue after landing. Both renderer consoles remained error-free. The comparison image is `basil-editor-terminal-handoff.png` in the Codex task outputs.

The same native proof now asserts the limb layer directly: editor engagement reports `type` with two limbs, travel reports `carry`, and terminal landing reports `deliver`. The resulting frames show rooted curved arms and visible finger grips touching the editor, code parcel, and terminal prop while leaving the face clear. Both renderer consoles remained error-free. The three-stage comparison is `basil-procedural-limbs.png` in the Codex task outputs.

A varied-geometry native proof clicked two distant regions of the same real WPF editor. UIA produced normalized contacts `0.091,-0.816` and `0.892,0.786`; Basil's left-eye y changed from `-11.06` to `-5.88`, while the body transform and procedural arm curve also changed. The subsequent editor-to-terminal carry/delivery still passed and both renderer consoles remained error-free. The comparison is `basil-object-geometry.png` in the Codex task outputs.

A real WPF folder proof validates commitment and locomotion staging. Stable hover produced `notice`/`consider`, visible anticipation ticks, prop intensity `0.56`, an exactly grounded pose, and `0 px` actor movement. Native click produced `roll` plus `prepare`/`reach` during genuine travel, then `land` plus `act`/`hold`, impact marks, and `folder-open` after a `635 px` arrival. Both renderer consoles remained error-free. The three-stage comparison is `basil-engagement-stages.png` in the Codex task outputs. Its live 92 px character also verifies the reference-matched smaller oval eyes, compact smile, closer cheek marks, softly shaded shell, and low floor shadow.

The same native proof now validates joint attention. Stable hover classified as `shared` because the physical cursor was indicating the genuine folder; travel became `object` focus. After landing, Basil held the folder with gaze vector `-0.944,0.051`. Moving the physical Windows cursor beside him, without producing a new agent or object event, changed the source to `shared` and the visible gaze to `-0.452,0.062`. The object action remained active and both renderer consoles remained error-free. The side-by-side proof is `basil-joint-attention.png` in the Codex task outputs.

The WPF folder proof also validates causal manipulation. During real travel Basil reported `reach` while the folder response remained exactly `0.000`. At landing he reported `contact`, rendered hand-contact ticks and body impact, and held folder response to `0.017`. After 360 ms of genuine settlement the same object remained engaged, manipulation advanced to `operate`, and folder response reached `1.000`. Both renderer consoles remained error-free. The three-frame proof is `basil-contact-response.png` in the Codex task outputs.

A development Electron proof validates the complete Hermes-to-animation semantic and spatial path using the production application renderer, a controlled 360 x 500 Hermes `file-diff-panel` fixture, and `src/contrib/events.ts`. It dispatches the genuine local gateway payload shapes `tool.generating`, `tool.start`, `tool.progress`, and `tool.complete` for `apply_patch`; Basil reports `plan/prepare`, `compose/execute`, `review/inspect`, and `save/complete`, with matching dots, action ticks, magnifier, and check cues. Absolute top positions advance `148.65 -> 246.88 -> 369.40 -> 443.34`; the asset gap remains exactly `10 px`, overlap remains `0`, and normalized contact y advances `-0.589 -> -0.196 -> 0.295 -> 0.589`. Replaying completion leaves top exactly `443.34`. The disconnected proof profile suppresses only Hermes' first-run and gateway-cover UI after app initialization; it does not replace the event bus, adapter, store, spatial engine, or SVG renderer. The harness verifies Basil is the topmost center element, requires at least 350 dark character pixels per frame (observed `1172-1578`), and observed zero renderer console errors. The four-frame comparison is `basil-editor-task-sequence.png` in the Codex task outputs.

The rebuilt production app was then relaunched from `dist/index.html` and inspected over Electron's local debugging endpoint without modifying renderer state. After normal backend startup settled, Basil was the topmost element at his center, the captured 196 px region contained `487` dark character pixels, procedural phase advanced from `0.632` to `0.855` over 500 ms, and the renderer emitted zero console errors. The production frame is `basil-production-live.png` in the Codex task outputs.

The next production build added physical resting-position response to a deliberate pointer swipe. A Playwright pointer path crossed the live embedded actor; Basil moved exactly `180 px`, persisted the resulting `{x: 773.288, y: 482.600}` destination, landed through the normal spatial engine, and emitted zero renderer console errors. Active work and protected-state immobility are covered in renderer and pure-planner tests. The production frame is `basil-production-pointer-nudge.png` in the Codex task outputs.

The detached production overlay now responds physically to the same deliberate gesture. A native Windows cursor crossed the live always-on-top actor while passive document preview was visible; the explicit swipe dismissed that preview, Electron moved the real transparent window exactly `180 px` from `{x: 1106, y: 443}` to `{x: 926, y: 443}`, persisted `{height: 205, width: 202, x: 926, y: 443}`, reported `roll` during the smooth travel path and `land` on completion, then returned Basil to Hermes. Both renderer consoles remained error-free. The three-frame comparison is `basil-overlay-pointer-nudge.png` in the Codex task outputs.

A development Electron proof dispatched one genuine `tool.start` `apply_patch` payload through `src/contrib/events.ts`, then moved the active 360 x 420 `file-diff-panel` by CSS reflow plus a real scroll notification. Basil retained `compose`/`execute`, kept normalized contact `0.933,-0.188`, moved `234.27 px` through the normal spring, remained exactly `10 px` outside the work surface with zero overlap, and preserved the original agent snapshot byte-for-byte. When the surface disappeared, Basil held his last meaningful position instead of inventing a fallback route. The generic DOM observer coalesces scroll, resize, mutation, and resize-observer signals through one animation frame and cleans up every listener/observer. The renderer emitted zero console errors. The comparison is `basil-live-anchor-follow.png` in the Codex task outputs.

The 100-interaction pack was then exercised in the live `?win=basil-overlay` Electron renderer. The harness explicitly replayed every catalog entry at one of its four beats and captured 100 topmost procedural SVG frames. It observed exactly `100` frames, `25` unique motion motifs, `25` unique monochrome props, and zero renderer console errors. The contact sheet is `basil-animation-pack-100.png` in the Codex task outputs.

The semantic-router milestone was verified through the genuine Hermes renderer event path rather than the development player. Exact local gateway payloads for `tool.generating`, `tool.start`, `tool.progress`, and `tool.complete` with tool `apply_patch` travelled through `src/contrib/events.ts`, `adapters/hermes.ts`, the generic store, and the router. The rendered sequence was `pencil-ready/plan/prepare`, `fix-patch/compose/execute`, `careful-edit/review/inspect`, and `final-polish/save/complete`, with matching pencil, code, pencil, and spark props. Every frame retained source `hermes` and session ID `basil-semantic-event-proof`, remained topmost, and emitted zero console errors. The comparison is `basil-semantic-event-routing.png` in the Codex task outputs.

The final packaged semantic-router build was launched as PID `10588`. A fresh CDP smoke test found Basil topmost, counted `1498` dark character pixels, observed procedural phase advance from `0.747` to `0.969`, and found zero console errors.

The generic task journey was verified in the rebuilt production overlay against four native Windows surfaces: a WPF research list item, a WPF code editor, a real Windows Terminal surface, and a WPF hyperlink. Native activation armed each privacy-safe target. A controlled exact snapshot for each step then travelled through the real preload/Main IPC, producing agent-owned `reading/read/review`, `writing/compose/execute`, `using_tool/run/execute`, and `searching/scan/inspect` behavior. Journey steps advanced `1 -> 2 -> 3 -> 4`, every landing reported `activationSource=agent-event`, and the satellite trail retained `document -> editor -> terminal -> web`. This production bridge proof does not substitute for gateway generation: the pure engine, store, Hermes adapter, semantic-router, and Electron memory tests separately verify that genuine Hermes events create those snapshots and recall only matching armed surfaces. Both live renderers recorded zero console errors. The four production frames are `basil-task-journey-1.png` through `basil-task-journey-4.png` in the Codex task outputs.

Smart face intent was verified in the rebuilt production renderers with both genuine pointer movement and native UIA object input. Moving the real in-app pointer around a centered Basil changed the face vector from `-0.950,-0.016` to `0.959,0.137`, reversed asymmetric eye depth from `1.033,0.938` to `0.938,1.034`, and kept the supplied compact facial proportions. In the detached overlay, holding the Windows cursor over a real WPF document produced `orient/observe` before contact; native click produced document operation with coordinated eyes and hands; the real release phase produced `check_in` toward the user. The face rig reported its 90 ms easing transform throughout, and both renderers recorded zero console errors. The three-stage proof is `outputs\basil-smart-face-intent.png`.

Predictive pointer gaze was verified in the rebuilt detached overlay using only the physical Windows cursor. A fast rightward pass produced normalized velocity `+1.000`, intent `anticipate`, lead `+0.294`, and shifted the predicted x target from raw `-0.465` to `-0.171`. Reversing the real cursor produced velocity `-1.000`, lead `-0.320`, and shifted raw `1.000` to predicted `0.680`. After the cursor stopped, velocity and lead both returned exactly to `0.000`, the predicted target equaled the raw target, and intent became `settle`. The face and rendered eyes followed each direction, and both renderer consoles recorded zero errors. The three-stage proof is `outputs\basil-predictive-pointer-gaze.png`.

Exact contact kinematics was verified in the rebuilt production overlay against a real WPF editor using two native Windows clicks. The first genuine upper-edge contact resolved `above`, shifted the upright editor prop to y `-11.00`, and placed the active-hand endpoint at y `14.32`. The second lower-edge contact resolved `below`, shifted the prop to y `+14.75`, moved the active hand to y `40.00`, counter-moved the bracing hand, and changed the orb's complete body transform. Both operating samples had coupling `1.000`; measured pressure was `1.000` and `0.983`. The editor remained the generic active context, and both renderer consoles recorded zero errors. The side-by-side proof is `outputs\basil-contact-kinematics.png`; the native desktop context is `basil-contact-kinematics-desktop.png`.

Asset physics was verified in the rebuilt production overlay against two real WPF controls activated by native Windows clicks. The wide document measured load `0.330`, effort `0.328`, and depth `0.626`, while the deep editor surface measured load `0.624`, effort `0.459`, and depth `0.924`. The deeper surface therefore added `0.294` load, visibly lowered the grip, leaned and compressed the body, widened the contact shadow by `0.541`, and promoted the effort cue from light to medium without enlarging the compact face. The pure engine and SVG tests additionally prove heavy data/tool payload bracing and lower carry arcs. Both live renderers recorded zero console errors. The side-by-side proof is `outputs\basil-asset-physics.png`.

The physical drag proof moved a real WPF document item from `{x:545,y:434}` to `{x:1043,y:642}` while Basil traversed from `{x:40,y:40}` to `{x:965,y:500}`. The production sampler recorded 130 active frames, 128 carry frames, all `idle -> acquire -> carry -> release` phases, maximum strength `0.88`, grip `1.00`, effort `0.44`, release `1.00`, movement reason `assist`, minimum pointer clearance `96.08 px`, and zero renderer console/page errors. The locked overlay remained within `196-198 px` width and height for the full drag at 125% Windows scaling, then returned to non-resizable. The carry and release proofs are `outputs\basil-drag-collaboration-carry.png` and `basil-drag-collaboration-release.png`.

The current packaged build is running as Electron PID `12380` on CDP port `9224`. A native Windows click engaged a real WPF Edit control and allowed its genuine surface traversal to settle. The physical cursor then entered the 120 px actor at the editor edge. Basil emitted the open-hand workspace cue for 8 sampled frames, retained target `editor`, selected movement reason `assist`, achieved `97.2 px` pointer clearance at strength `1.00`, moved `157.85 px`, and recorded zero actor/editor collisions and zero renderer console/page errors. The stationary post-yield trace remained exclusively `engaged`; no newly revealed background surface produced a ghost preview. A subsequent real pointer move then unlocked the expected editor preview, proving the gate does not suppress intentional hover. The run also retains the 125% DPI correction: native cursor positions are converted to DIPs before exact hit-testing. The isolated procedural proof is `outputs\basil-workspace-yield-actor.png`. Basil was then returned to the visible Hermes interface; the final element-level production smoke found `930` dark character pixels, a live phase change `0.076 -> 0.298`, topmost center hit `circle`, and zero console errors. The live frame is `basil-production-live.png`.

Genuine scroll following was verified in the rebuilt production overlay against a real WPF `TextBox` exposing the standard UIA `ScrollPattern`. A native click established the active editor, then physical Windows wheel input changed vertical progress from `0` to `66.094%`. Basil produced 112 `follow` frames, moved `230 px` along the editor's safe edge, changed exact contact y from `-0.945` to `0.322`, changed face y from `-0.729` to `0.189`, retained `editor` focus and action context, and traversed `hop -> roll -> land` with zero actor/editor collisions and zero renderer console/page errors. No agent event or timer supplied the progress. The proof is `outputs\basil-scroll-follow.png`.

The final bundle passed 38 focused files and 268 tests, all TypeScript configurations, scoped ESLint with zero warnings/errors, and `npm run build`. It is running as Electron PID `8400` on CDP port `9224`; the proof fixture and detached overlay are closed, and Basil is visible inside Hermes. The final embedded smoke found `930` dark character pixels, procedural phase advance `0.152 -> 0.367`, topmost center hit `circle`, and zero console errors. The live frame is `outputs\basil-production-live.png`.

Pointer boundary continuity was verified in the rebuilt production Hermes renderer using real Playwright pointer movement through Electron CDP. Moving to and beyond the renderer's right edge emitted the genuine top-level `pointerout` path, retained a normalized departure glance at strength `0.929`, selected the curious brow, and rendered the procedural edge ticks. Moving the real pointer back into Hermes cleared departure to exactly `0.000`, emitted return strength `0.938`, placed a visible high-contrast wave on Basil's inward side, closed the eyes into compact happy crescents, and added a restrained lift. The return then decayed without creating agent work. The renderer logged zero console errors. The three-stage comparison is `outputs\basil-pointer-departure.png`.

The milestone passes 42 focused files and 349 tests: 38 renderer files / 291 tests and 4 Electron files / 58 tests. All three TypeScript configurations, zero-warning scoped Basil ESLint, `git diff --check`, production build, pointer-boundary proof, and production smoke pass. Basil remains visible in Hermes with 1,149 dark character pixels, phase `0.750 -> 0.965`, topmost center hit `circle`, and zero console errors.

Direct-touch boop was verified in the rebuilt production Hermes renderer with an actual Playwright double-click on the live Basil button. The independent frame reached strength `0.890`, cleared affection to exactly `0.000`, rendered the procedural crown ripple, compact round mouth, cheek response, and soft shell squash, and recorded zero console errors. The proof is `outputs\basil-direct-boop.png`.

The boop milestone passes 43 focused files and 365 tests: 39 renderer files / 307 tests and 4 Electron files / 58 tests. All three TypeScript configurations, zero-warning scoped Basil ESLint, `git diff --check`, production build, genuine-input proof, and production smoke pass. Basil remains visible in Hermes with 1,286 dark character pixels, phase `0.431 -> 0.653`, topmost center hit `circle`, and zero console errors.

Direct wheel tickle was verified in the rebuilt production Hermes renderer with a real Playwright wheel event over the live Basil actor. The independent frame reached strength `0.563` with direction `-1`, rendered happy crescent eyes plus procedural side wiggles, and retained underlying page scroll exactly at `{x:0,y:0}`. An initial `preventDefault()` attempt correctly failed production console verification because React's delegated listener is passive; it was removed, propagation remains contained, and the final proof has zero console errors. The comparison is `outputs\basil-wheel-tickle.png`.

The tickle milestone passes 43 focused files and 369 tests: 39 renderer files / 311 tests and 4 Electron files / 58 tests. Under full parallel jsdom load, the animation-heavy stage file exceeded its timing budget while all other 38 renderer files passed; rerunning that complete stage file alone passed all 13 tests. All three TypeScript configurations, zero-warning scoped Basil ESLint, `git diff --check`, production build, genuine-wheel proof, and production smoke pass. Basil remains visible in Hermes with 1,293 dark character pixels, phase `0.997 -> 0.213` across wraparound, topmost center hit `circle`, and zero console errors.

Gaze-driven shell depth was verified in the rebuilt production Hermes renderer with real Playwright pointer movement. Basil was genuinely dragged from his saved top-left position to screen center, sampled in both directions, then returned to the exact persisted `{x:8,y:8}` position. Left gaze produced light center `38.277,25.045`, flipped rim `scale(-1 1)`, and shadow offset `-1.540`; right gaze produced `30.311,25.071`, rim `scale(1 1)`, and shadow offset `+1.328`. The renderer logged zero errors. The comparison is `outputs\basil-gaze-shell-lighting.png`.

The shell-lighting and catchlight milestone passes 44 focused files and 372 tests: 40 renderer files / 314 tests and 4 Electron files / 58 tests. The renderer gate runs 39 non-stage files / 301 tests together and the animation-heavy stage file / 13 tests separately to avoid this PC's jsdom concurrency starvation. All three TypeScript configurations, zero-warning scoped Basil ESLint, `git diff --check`, production build, production visual proof, and smoke pass. Rebuilt Hermes runs as Electron PID `16892`; Basil is visible with 1,739 dark character pixels, phase `0.900 -> 0.122` across wraparound, topmost center hit `circle`, and zero console errors.

Keyboard-focus following was verified in the rebuilt production overlay against a real WPF editor and button. A native click approved the editor process, then one physical Windows Tab key moved OS focus to the button. Basil produced 118 `keyboard`/`tool`/`follow` frames, retained task action exactly `idle`, moved across observed x `882.60 -> 1318.60` and y `231 -> 448`, traversed `roll -> land -> grounded` and `approach -> engaged`, and recorded zero actor/button collisions and zero renderer console/page errors. The native monitor did not receive or emit a key value, label, or content. The isolated procedural proof is `outputs\basil-keyboard-focus-follow.png`.

The pointer adapter now also queues up to 24 genuine browser pointer events between animation frames, which fixed a real fast-swipe sampling gap exposed by the complete parallel suite. The current bundle passed 38 focused files and 272 tests, all TypeScript configurations, scoped ESLint with zero warnings/errors, and `npm run build`. It is running as Electron PID `5716` on CDP port `9224`; the focus fixture and detached overlay are closed, and Basil is visible inside Hermes. The final embedded smoke found `919` dark character pixels, procedural phase advance `0.558 -> 0.780`, topmost center hit `circle`, and zero console errors. The live frame is `outputs\basil-production-live.png`.

Privacy-safe external edit activity was verified in the rebuilt production overlay against a real WPF editor. Physical Windows input typed `basil` into the focused control while the native bridge observed only aggregate UIA `TextChanged` notifications. Basil produced 28 active `content/activity/typing` frames, 28 distinct editor-path and prop-transform samples, maximum bounded intensity `0.25`, and exactly `0 px` screen travel. Task action and task phase remained exclusively `idle`, the activity decayed to `none` after input stopped, and both renderer consoles recorded zero errors. The isolated procedural proof is `outputs\basil-external-edit-activity.png`.

The current bundle passed 39 focused files and 278 tests, all three TypeScript configurations, scoped ESLint with zero warnings/errors, `git diff --check`, and `npm run build`. It is running as Electron PID `16908` on CDP port `9224`; the edit fixture and detached overlay are closed, and Basil is visible inside Hermes. The final embedded smoke found `934` dark character pixels, procedural phase advance `0.586 -> 0.809`, topmost center hit `circle`, and zero console errors. The live frame is `outputs\basil-production-live.png`.

Privacy-safe structural selection was verified in the rebuilt production overlay against a real WPF `ListBox`. A native physical click approved the first item and one physical Down key selected the second. The UIA bridge emitted only `ListItem` structure, process identity, aggregate count, center, and bounds. Basil produced 28 `selection/selecting/follow` frames, 18 distinct check-cue transforms, moved across a 259 px observed range, traversed `roll -> hop -> land`, and recorded zero selected-row collisions. Task action and task phase remained exclusively `idle`, activity decayed to `none`, and both renderer consoles recorded zero errors. A raw native capture also proved that the DPI-aware physical click landed at the requested UIA point. The isolated procedural proof is `outputs\basil-structural-selection.png`.

The current bundle passed 39 focused files and 285 tests, all three TypeScript configurations, scoped ESLint with zero warnings/errors, `git diff --check`, and `npm run build`. It is running as Electron PID `19596` on CDP port `9224`; the selection fixture, native UIA monitor, and detached overlay are closed, and Basil is visible inside Hermes. The final embedded smoke found `928` dark character pixels, procedural phase advance `0.081 -> 0.296`, topmost center hit `circle`, and zero console errors. The live frame is `outputs\basil-production-live.png`.

Privacy-safe control adjustment was verified in the rebuilt production overlay against a real WPF `Slider`. A native physical click approved and focused the slider, then one physical Right key changed its range property. Basil produced 19 `control/adjusting/activity` frames and 19 distinct dial transforms with exactly `0 px` screen travel. Task action and task phase remained exclusively `idle`, activity decayed to `none`, and both renderer consoles recorded zero errors. The native callback did not inspect or emit the old value, new value, or current numeric value. The isolated procedural proof is `outputs\basil-control-adjustment.png`.

The current bundle passed 39 focused files and 290 tests, all three TypeScript configurations, scoped ESLint with zero warnings/errors, `git diff --check`, and `npm run build`. It is running as Electron PID `10016` on CDP port `9224`; the control fixture, native UIA monitor, and detached overlay are closed, and Basil is visible inside Hermes. The final embedded smoke found `923` dark character pixels, procedural phase advance `0.518 -> 0.733`, topmost center hit `circle`, and zero console errors. The live frame is `outputs\basil-production-live.png`.

Privacy-safe collection mutation was verified in the rebuilt production overlay against a real WPF `ListBox`. A native physical click approved the first item, then one physical Insert key added a real child to the WPF visual tree. Basil produced 22 `collection/organizing/activity` frames and 18 distinct stack-cue transforms, selected the genuine `add` variant, and stayed at exactly `0 px` screen travel. Task action and task phase remained exclusively `idle`, activity decayed to `none`, and the renderer recorded zero console/page errors. Only aggregate count and `ChildAdded` category crossed the adapter; item identity and content remained excluded. The isolated procedural proof is `outputs\basil-collection-organizing.png`.

The collection build passed 39 focused files and 295 tests, all three TypeScript configurations, scoped ESLint with zero warnings/errors, `git diff --check`, and `npm run build`. The native collection fixture is a proof-only WPF process and is not imported by Hermes or Basil Motion. The fixture and detached overlay were closed; rebuilt Hermes is running as Electron PID `20056` on CDP `9224`, with Basil visible in the main interface. The final smoke found `931` dark actor pixels, procedural phase `0.611 -> 0.826`, topmost center hit `circle`, and zero console errors.

Privacy-safe native invocation was verified in the rebuilt production overlay against a real WPF `Button`. A native physical click first approved the button and let Basil settle beside it; one physical Enter key then caused the control itself to emit `InvokePatternIdentifiers.InvokedEvent`. Basil produced 16 `invocation/invoking/activity` frames and 11 distinct press-cue transforms with exactly `0 px` screen travel. Task action and task phase remained exclusively `idle`, activity decayed to `none`, and the renderer recorded zero console/page errors. The raw native capture independently emitted two category-only invocation records with no callback or monitor errors. The isolated procedural proof is `outputs\basil-native-invocation.png`.

The invocation build passed 39 focused files and 300 tests, all three TypeScript configurations, scoped ESLint with zero warnings, `git diff --check`, and `npm run build`. The proof also exposed and fixed Windows `ENAMETOOLONG`: Electron now launches the generated UIA monitor from a temporary `.ps1` rather than embedding its growing source in the command line. The fixture, monitor, temporary script, and detached overlay were closed; rebuilt Hermes runs as Electron PID `17484` on CDP `9224`. Basil is visible in the main interface with `923` dark actor pixels, procedural phase `0.859 -> 0.074` across wraparound, topmost center hit `circle`, and zero console errors.

Pointer-owned active-surface attachment was verified in the rebuilt production overlay against a real WPF `Button`. A physical click approved the control and let Basil settle beside it. Win32 then moved the actual WPF top-level window from its original position to physical `{x:220,y:170}` without sending any agent event or Basil command. The UIA geometry refresh alone produced 153 `pointer/tool/follow` frames, moved the overlay `529 px`, traversed `roll -> land -> grounded` and `approach -> engaged`, preserved focus and pointer ownership, and recorded zero actor/button collisions. Task action and phase remained exclusively `idle`, external activity stayed `none`, and the renderer recorded zero console/page errors. The isolated procedural proof is `outputs\basil-user-surface-follow.png`.

The user-surface follow build passed 39 focused files and 301 tests, all three TypeScript configurations, scoped ESLint, `git diff --check`, and `npm run build`. The fixture, UIA monitor, temporary script, and overlay were closed; rebuilt Hermes runs as Electron PID `7348` on CDP `9224`. Basil is visible in the main interface with `926` dark actor pixels, procedural phase `0.266 -> 0.482`, topmost center hit `circle`, and zero console errors.

External-surface disappearance was verified in the rebuilt production overlay against a real WPF `Button`. A physical click approved the control and let Basil settle beside it; the fixture process then closed without sending any Basil or agent command. The existing stale UIA refresh emitted cached category-only dismissal and released its native handlers. Basil produced 18 `pointer/departing/activity` frames and 18 distinct wave transforms, stayed at exactly `0 px` screen travel, kept task action/phase exclusively `idle`, and returned cleanly to `rest` with activity `none`. The renderer recorded zero console/page errors. The isolated procedural proof is `outputs\basil-surface-farewell.png`.

The dismissal build passed 39 focused files and 307 tests, all three TypeScript configurations, scoped ESLint with zero warnings, `git diff --check`, and `npm run build`. The fixture, UIA monitor, temporary script, and detached overlay are closed; rebuilt Hermes runs as Electron PID `21160` on CDP `9224`. Basil is visible in the main interface with `924` dark actor pixels, procedural phase `0.034 -> 0.249`, topmost center hit `circle`, and zero console errors.

Native surface resizing was verified in the rebuilt production overlay against a real WPF editor. A physical click approved the editor, then Win32 changed the actual top-level window size in place. WPF's genuine viewport reflow notification was structurally reclassified as `resize`; Basil produced 40 `pointer/resizing/follow` frames, 40 distinct body transforms, and 40 distinct procedural corner-cue transforms. The route traversed `hop -> roll -> land -> grounded`, moved around the resized editor with zero actor/content collisions, kept task action and phase exclusively `idle`, decayed to activity `none`, and logged zero console/page errors. The isolated procedural proof is `outputs\basil-surface-resize-balance.png`.

The resize build passed 39 focused files and 312 tests, all three TypeScript configurations, scoped ESLint with zero warnings, `git diff --check`, and `npm run build`. The fixture, UIA monitor, temporary scripts, and detached overlay are closed; rebuilt Hermes runs as Electron PID `16892` on CDP `9224`. Basil is visible in the main interface with `930` dark actor pixels, procedural phase `0.784 -> 0.999`, topmost center hit `circle`, and zero console errors.

Live native resizing was verified against the same real WPF editor with six stepped Win32 size changes. The WPF accessibility provider genuinely coalesced those transitions into five resize-route publications across three distinct observed widths. Basil produced 65 live `resizing/follow` frames, 65 distinct body transforms, and 65 distinct corner-cue transforms while repeatedly replanning from his current position. Locomotion traversed `hop -> roll -> land -> grounded`; every frame remained outside the current editor bounds, task action/phase stayed exclusively `idle`, activity decayed to `none`, and the renderer logged zero console/page errors. The isolated frame is `outputs\basil-live-resize-balance.png`.

The live-geometry build passed 39 focused files and 313 tests, all three TypeScript configurations, scoped ESLint with zero warnings, `git diff --check`, and `npm run build`. The fixture, UIA monitor, temporary scripts, and detached overlay are closed; rebuilt Hermes runs as Electron PID `20608` on CDP `9224`. Basil is visible in the main interface with `932` dark actor pixels, procedural phase `0.724 -> 0.939`, topmost center hit `circle`, and zero console errors.

Live native surface surfing was verified against a real pointer-approved WPF editor. The proof selected the movement direction from Basil's actual settled side, then moved the top-level window through six stepped Win32 positions away from him. The UIA provider emitted four `move/follow` route publications across three distinct observed positions. Basil produced 50 active surfing frames, 50 distinct body transforms, and 50 distinct rail-cue transforms; locomotion traversed `roll -> land -> hop`, every sampled actor stayed outside the current editor bounds, task action/phase stayed exclusively `idle`, activity decayed to `none`, and the renderer logged zero console/page errors. The isolated frame is `outputs\basil-live-surface-surfing.png`.

The surfing build passed 39 focused files and 316 tests, all three TypeScript configurations, scoped ESLint with zero warnings, `git diff --check`, and `npm run build`. The fixture, UIA monitor, temporary scripts, and detached overlay are closed; rebuilt Hermes runs as Electron PID `8748` on CDP `9224`. Basil is visible in the main interface with `930` dark actor pixels, procedural phase `0.393 -> 0.608`, topmost center hit `circle`, and zero console errors.

The complete 100-interaction contact sheet was visually audited against Simon's supplied Basil reference. Permission interactions `071-079` now preserve the core round character silhouette inside a separate, larger procedural hexagonal protection field, with restrained side nodes and no top rivet. The body remains a true circle; the accessory does not turn Basil into a shield or enlarge the compact face. This is an SVG-only Basil Motion primitive in `src/basil-motion/basil-orb.tsx`, independent of Hermes and reusable in either embedded or detached renderers.

The regenerated pack contains exactly 100 frames, 25 motifs, and 25 accessories, with all states and parameters reachable and zero browser console errors. Focused coverage remains 39 files and 316 tests after strengthening the permission-rendering assertion; all three TypeScript configurations, scoped ESLint with zero warnings, `git diff --check`, and `npm run build` pass. The current production bundle runs as Electron PID `15372` on CDP `9224`; Basil is visible in Hermes with `925` dark actor pixels, procedural phase `0.824 -> 0.046` across wraparound, topmost center hit `circle`, and zero console errors. The contact sheet is `outputs\basil-animation-pack-100.png`, corrected reference frames include `work\basil-animation-pack-frames\071-permission-please.png` and `078-risk-warning.png`, and the final live frame is `outputs\basil-production-live.png`.

Speaking now uses the independent pure `speech-expression-engine.ts` instead of one fixed mouth oval. Genuine `speaking` state drives continuously interpolated, compact SVG phonemes across width, opening, roundness, and smile-corner lift; one restrained phrase-emphasis interval adds the happy crescent eyes seen in the supplied reference, while the rest of the cycle preserves social gaze. The pose is phase-continuous, loop-safe, and bounded to a mouth under 3.9 SVG units in half-width and 2.73 units in half-height. No speech animation runs outside a real speaking state.

The regenerated interaction sheet visibly distinguishes the five speaking scenes: `091-speaking-softly`, `092-storyteller`, `093-explain-step`, `094-read-aloud`, and `095-thinking-aloud`; `read-aloud` carries the reference-style closed happy eyes while the other samples retain small attentive eyes. The complete gate now passes 40 focused files and 320 tests: 36 renderer files / 262 tests and 4 Electron files / 58 tests. All three TypeScript configurations, scoped ESLint with zero warnings, `git diff --check`, the production build, the 100-frame pack proof, and the live CDP smoke pass. Rebuilt Hermes runs as Electron PID `10396` on CDP `9224`; Basil is visible with `930` dark actor pixels, phase `0.222 -> 0.437`, topmost center hit `circle`, zero console errors, and no stale UIA monitor or temporary script.

Genuine crown petting is now a third portable path gesture alongside orbit and swipe. `pointer-gestures.ts` recognizes repeated moderate-speed horizontal reversals only inside Basil's upper crown; the same motion across the face center or outside the actor is rejected. The signed decaying impulse crosses the shared `BasilInteractionInput` and `BasilMotionFrame` contracts used by both `use-basil-spatial.ts` and `basil-overlay-app.tsx`. It never nudges Basil or creates agent work. `BasilOrb` responds with compact contented crescent eyes, a tiny smile, restrained cheek/particle energy, subtle squash and tilt, crown sparkles, and a directional antenna wag. Permission, error, and sleeping faces explicitly suppress the reaction.

A physical Windows cursor proof used DPI-corrected screen coordinates against the detached production renderer. It recorded clockwise orbit `1.000`, pet peak `0.333` with direction `-1`, happy eyes and visible pet cue, then rightward swipe `0.897`; all three reactions remained visually distinct and both renderer consoles stayed error-free. The three-panel proof is `outputs\basil-gesture-reactions.png`. The complete gate passes 40 files and 325 tests: 36 renderer files / 267 tests and 4 Electron files / 58 tests. All TypeScript configurations, zero-warning scoped ESLint, `git diff --check`, production build, physical gesture proof, and final CDP smoke pass. Rebuilt Hermes runs as Electron PID `19760` on CDP `9224`; embedded Basil renders `937` dark pixels, advances phase `0.420 -> 0.636`, remains topmost, logs zero console errors, and leaves no UIA monitor or temporary script.

Directly repositioning Basil now has its own portable lifecycle instead of reusing ordinary locomotion. Genuine actor pointer-down/move/up in either host supplies `actorHold` and `actorRelease` through the shared interaction/frame contract. Pure `actor-drag-engine.ts` derives held lift, directional counterbalance, slight vertical stretch, grip, and a lighter/smaller contact shadow; while held, ordinary roll/hop and travel streaks are suppressed without changing the actual position update. Pointer-up derives a short wide squash, happy release eyes, expanded shadow, and procedural landing ticks. This remains distinct from document drag collaboration and external-surface assist.

The embedded adapter also tracks the existing 3 px movement threshold and suppresses only the browser click emitted immediately after a real drag, preventing false affection hearts; the next genuine tap still works. The Electron visual proof repositioned the detached overlay by `405 px`, held grip at `1.000`, retained `grounded` locomotion, and rendered both explicit held and release `1.000` cues with zero console errors. The comparison is `outputs\basil-actor-pickup-release.png`.

The complete gate now passes 41 focused files and 330 tests: 37 renderer files / 272 tests and 4 Electron files / 58 tests. All three TypeScript configurations, scoped ESLint with zero warnings, `git diff --check`, production build, Electron pickup/release proof, and final CDP smoke pass. Rebuilt Hermes runs as Electron PID `19616` on CDP `9224`; Basil is visible with `937` dark pixels, phase `0.339 -> 0.562`, topmost center hit `circle`, zero console errors, and no stale UIA monitor or temporary script.

State-aware antenna signaling now remains visible alongside genuine interaction accessories. The portable solver covers every Basil state, clamps malformed host values, responds smoothly to real energy, and preserves directional petting wag. In the live Hermes development renderer, the built-in control panel selected all 12 states while the same interaction router supplied `hello-basil`, `all-ears`, `deep-thought`, `web-scout`, `page-scan`, `pencil-ready`, `tool-belt`, `permission-please`, `happy-bounce`, `gentle-oops`, `speaking-softly`, and `sleepy-float`. Every state rendered the expected `calm/receive/process/scan/work/guard/result/alert/transmit/sleep` signal, bounded lean and pulse values, correct ring count, and zero console/page errors. The visually audited sheet is `outputs\basil-antenna-state-pack.png`.

The antenna milestone passes 45 focused files and 389 tests: 41 renderer files / 331 tests and 4 Electron files / 58 tests. The authoritative renderer gate is 40 non-stage files / 318 tests plus the isolated animation-stage file / 13 tests. All three TypeScript configurations, zero-warning scoped Basil ESLint, `git diff --check`, production build, all-state visual proof, and final production smoke pass. Rebuilt Hermes runs as Electron PID `19576` on CDP `9224`; the saved actor position remains `{8,8}`, the production renderer contains no development panel, Basil renders 711 dark actor pixels, advances phase `0.650 -> 0.865`, remains topmost at center, and logs zero console/page errors.

The same antenna now acts as a directional sensor for genuine joint attention. The renderer passes only the existing generic gaze vector plus pointer/object weights into the pure solver; it does not inspect Hermes events, DOM targets, pointer history, or desktop content. The bias is capped at 3.2 degrees before state attenuation, remains subordinate to petting, and does not alter pulse, signal kind, state, or task semantics. Ordinary pointer/object attention also supplies a maximum 52%-scaled opacity floor, so the sensor is readable while Basil is actively attending and recedes with attention.

Production proof used only real Playwright pointer movement against the rebuilt Electron actor. Without petting, a manual state override, or an agent event, left/right pointer samples reversed `data-basil-antenna-attention` from `-0.482` to `+0.121` at `0.390` opacity while the actor remained `Basil is idle`; the renderer logged zero console/page errors. The comparison is `outputs\basil-antenna-attention.png`. The complete gate passes 45 files and 392 tests: 41 renderer files / 334 tests and 4 Electron files / 58 tests. The split renderer gate is 40 non-stage files / 321 tests plus 13 isolated stage tests. All three TypeScript configurations, zero-warning scoped lint, `git diff --check`, build, visual proof, and smoke pass. Rebuilt Hermes runs as PID `16448` on CDP `9224`; Basil was restored to `{8,8}`, renders 727 dark pixels, advances phase `0.725 -> 0.941`, remains topmost, and logs zero errors.

Genuine pointer dwell now produces an original procedural hand-contact sequence. Production verification first moved Basil through his real drag handler to a blank Hermes work area, then used ordinary Playwright pointer movement and a stationary hold. Initial proximity produced `notice` strength `0.237`; the existing kinetics tracker reached dwell `1.000` without an injected frame value, advanced to `touch` strength `0.923`, and rendered the side-aware arm, open hand, and compact contact spark. Moving the pointer away naturally returned the cue to `none`. The comparison is `outputs\basil-pointer-contact.png`.

The pointer-contact milestone passes 46 files and 409 tests: 42 renderer files / 351 tests and 4 Electron files / 58 tests. The split renderer gate is 41 non-stage files / 338 tests plus 13 isolated stage tests. All TypeScript configurations, zero-warning scoped lint, `git diff --check`, build, genuine-dwell proof, and production smoke pass. Rebuilt Hermes runs as PID `17892` on CDP `9224`; Basil was restored to `{8,8}`, renders 724 dark pixels, advances phase `0.699 -> 0.907`, returns contact to `none`, remains topmost, and logs zero console/page errors.

The 100-interaction visual audit identified disconnected work props as the strongest remaining repeated weakness. The new accessory attachment solver now carries the catalog's genuine mirror direction into rendering and connects only holdable props with a restrained arm, round hand, and tiny grip line. The arm begins at the shell edge and is painted behind the prop, preserving Basil's circular silhouette and small face. Floating emotional/status marks remain independent, so success, speech, warning, question, and sleep frames do not gain false limbs.

The regenerated contact sheet again contains exactly 100 visual frames, 25 unique motifs, and 25 unique accessories, now with left/right held-prop variation and zero renderer console errors. Proof: `outputs\basil-animation-pack-100.png`. The milestone passes 47 files and 415 tests: 43 renderer files / 357 tests and 4 Electron files / 58 tests. The renderer gate is 42 non-stage files / 344 tests plus 13 isolated stage tests. All three TypeScript configurations, zero-warning scoped lint, production build, full animation-pack proof, and production smoke pass. Rebuilt Hermes runs as PID `10008` on CDP `9224`; Basil restored to `{8,8}`, rendered 1,771 dark pixels in the element capture, advanced phase `0.460 -> 0.675` and later `0.512 -> 0.720`, reacted to the real pointer with `reach`, remained topmost, and logged zero console errors.

The prop-composition pass removed duplicate synthetic work objects from the full pack. With no real screen geometry, searching now presents one magnifier, reading one book, writing one pencil/keyboard/code panel, and tool work one folder/terminal/key rather than an accessory stacked over a second generic scene prop. A separately tested real terminal affordance follows the opposite branch: its geometry-driven context and limbs remain fully visible, the terminal interaction cue becomes a 54%-opacity semantic badge, and the extra grip is absent.

The visually audited contact sheet still reports exactly 100 frames, 25 motifs, 25 accessories, topmost rendering, and zero console errors at `outputs\basil-animation-pack-100.png`. The milestone passes 48 files and 420 tests: 44 renderer files / 362 tests and 4 Electron files / 58 tests. The renderer gate is 43 non-stage files / 349 tests plus 13 isolated stage tests. All TypeScript projects, zero-warning scoped lint, production build, full visual proof, and production smoke pass. Rebuilt Hermes runs as PID `3740` on CDP `9224`; Basil restored to `{8,8}`, rendered 1,768 dark pixels, advanced phase `0.550 -> 0.765`, responded to the real pointer with `reach`, remained topmost, and logged zero console errors.

The wearable pass now anchors all three worn accessories to Basil rather than treating them as floating badges. Listening interactions place a small mirrored ear directly on the appropriate shell edge. Focus/read interactions position thin open glasses around Basil's unchanged small eye centers, preserving pupil visibility and face scale. Antenna interactions suppress their redundant catalog stalk and use the existing animated crown signal, which already reflects real state, energy, pointer/object attention, and petting.

The regenerated 100-frame sheet confirms the aligned ear, actual worn glasses, single crown antenna, 25 motifs/accessories, topmost rendering, and zero console errors at `outputs\basil-animation-pack-100.png`. Coverage remains 48 files and increases to 423 tests: 44 renderer files / 365 tests and 4 Electron files / 58 tests. The split renderer gate is 43 non-stage files / 352 tests plus 13 isolated stage tests. All TypeScript projects, zero-warning scoped lint, production build, visual proof, and production smoke pass. Rebuilt Hermes runs as PID `19624` on CDP `9224`; Basil rendered 1,780 dark pixels, advanced phase `0.489 -> 0.711`, remained topmost, and logged zero console errors.

Held-prop ergonomics were then tuned against the supplied reference at individual-frame resolution. The former shared `y=-35` crown placement was replaced by per-function offsets and reachable shell-edge shoulder/elbow/hand points. `031-web-scout` now holds its magnifier beside the dark face, `051-pencil-ready` holds the pencil near the lower cheek, and `062-terminal-command` presents the terminal at the side. Books, charts, code panels, folders, keys, keyboards, links, shields, and compasses receive matching bounded placements; mirrored interactions remain symmetric.

The regenerated visual pack remains exactly 100 frames, 25 motifs, and 25 accessories with topmost rendering and zero console errors at `outputs\basil-animation-pack-100.png`. Coverage remains 48 files and increases to 424 tests: 44 renderer files / 366 tests and 4 Electron files / 58 tests. The split renderer gate is 43 non-stage files / 353 tests plus 13 isolated stage tests. All TypeScript projects, zero-warning scoped lint, production build, pack proof, and production smoke pass. Rebuilt Hermes runs as PID `21352` on CDP `9224`; Basil rendered 1,775 dark pixels, advanced phase `0.195 -> 0.411`, remained topmost, and logged zero console errors.

The narrated tour adds 12 responsive chapters and 3 minutes 15 seconds of local voice audio. Its first ten chapters showcase every one of the 100 named interactions exactly once; the final two demonstrate ten pointer reactions and ten desktop-intelligence scenarios. Playwright verified automatic audio-driven chapter advance, decoded local MP3 playback at `readyState 4`, play/pause, chapter navigation, timeline seeking, and responsive desktop (`1536x900`) and mobile (`390x844`) layouts with zero console warnings or errors. Visual proofs are `outputs\basil-tour-desktop.png`, `basil-tour-mobile.png`, and `basil-tour-pointer.png`.

The current complete Basil gate passes 50 files and 429 tests: 45 non-stage renderer files / 358 tests, the isolated motion-stage file / 13 tests, and 4 Electron integration files / 58 tests. The two tour files contribute 5 focused assertions covering exact all-100 partitioning, local narration metadata, chapter rendering, interaction/prop switching, and media controls. All three TypeScript projects, zero-warning scoped ESLint, `git diff --check`, and `npm run build` pass. The production bundle contains all 12 MP3 files. Rebuilt Hermes runs as Electron PID `12488` on CDP `9224`; embedded Basil is visible at `{8,8}`, advances phase `0.152 -> 0.464`, remains topmost, and logs zero console/page errors. The live frame is `outputs\hermes-basil-production.png`.

The personality milestone adds 20 signal-driven cameos with 20 distinct procedural motifs and no bitmap or proprietary runtime. The sampler exposes bounded body translation, rotation, squash/stretch, face overrides, energy, accessory motion, foreground occlusion, particles, and reduced-motion output through an independent host-neutral pose. The scheduler never fabricates an agent state, applies cooldown per behaviour so one early cameo cannot silence the full pack, and listens to editor key events in capture phase because the Hermes composer owns bubbling keyboard events.

The focused personality/rendering suite passes 7 files / 59 tests, the isolated motion stage passes 13 tests, and the four Basil Electron integration files pass 58 tests. All TypeScript projects, the scoped zero-warning lint gate, `git diff --check`, and `npm run build` pass. The repository-wide Electron project still has unrelated Windows/POSIX portability failures in relaunch/path tests and two existing script parse suites, so the four Basil integration files remain the authoritative Electron gate on this host.

Playwright audited the complete 20-behaviour sheet plus responsive desktop/mobile Personality Lab with zero browser errors. Proofs are `outputs\basil-personality-pack-20.png`, `basil-personality-peekaboo.png`, and `basil-personality-mobile.png`. A final packaged-Electron test typed through the genuine Hermes `Message` editor: diagnostics recorded `typing-mimic`, `perform`, intensity `1.000`, procedural `typing` cue, nine real personality signals, a stable 108 x 108 actor, and zero console/page errors. The live frame is `outputs\basil-personality-production-typing.png`.

The gaze-follow milestone makes Basil's complete face visibly track both the real mouse and privacy-safe structural points of interest. A new pure selector scores only target category, priority, rectangle, preferred target, actor geometry, and viewport. The Hermes stage supplies its existing DOM anchor snapshots; `BasilOrb` feeds the resulting interest into the existing pointer/object/shared gaze arbiter. Ambient points remain deliberately weak, preferred work surfaces are stronger, and visible permission/error surfaces are urgent. No content, filenames, message text, or control values enter the engine.

Focused coverage passes 5 files / 71 tests across point selection, gaze arbitration, facial depth, SVG rendering, and full Hermes-stage behavior. TypeScript, zero-warning scoped ESLint, `git diff --check`, and the production build pass. Packaged Electron proof recorded the genuine composer as ambient interest, then real Playwright mouse motion reversed the face from `-0.167` left to `+0.963` right, including eye-center movement and a `1.130` total face-vector swing, with zero console/page errors. Proofs are `outputs\basil-gaze-point-of-interest.png` and `basil-gaze-mouse-follow.png`.

## Summon And Hide Presence System

Summon/hide is a host-neutral presence transition layered around the existing Basil state machine. It never invents agent activity and does not replace `idle`, `thinking`, `using_tool`, or any other runtime-derived state. A presence snapshot has only `visible`, `summoning`, `hiding`, or `hidden`, plus a monotonic nonce and wall-clock start time so the same transition can be sampled in separate renderer processes.

`presence-engine.ts` is the pure motion layer. It maps phase and elapsed time to opacity, X/Y scale, vertical movement, rotation, glow, particles, aperture width, ring scale, and spark visibility. Summon lasts 1,120 ms and rises from a monochrome signal aperture with squash, overshoot, and settle. Hide lasts 880 ms and performs a small farewell hop before collapsing into the aperture. Reduced-motion output uses a restrained fade and near-unit scale.

`presence.ts` owns persistence, transition completion, and the generic `basil:presence-command` browser event. It contains no Hermes transcript parsing. `use-basil-presence.ts` samples the pure engine with `requestAnimationFrame`; `presence-cue.tsx` renders the rings, slit, ticks, and sparks as procedural SVG.

Hermes integration is isolated in `adapters/hermes-presence-command.ts`. Push-to-talk dictation and continuous voice pass the real STT transcript through a strict full-utterance matcher. Recognized phrases emit `summon` or `hide` locally and are not sent to the agent. Ordinary requests such as â€œBasil, come out with three product ideasâ€ are deliberately not consumed. Continuous voice returns to listening after a local command instead of waiting for a nonexistent assistant reply.

Supported summon examples:

- `OK Basil, come out now`
- `Basil, show yourself`
- `Basil, appear`
- `Basil, come here`
- `Basil, wake up`

Supported hide examples:

- `Basil, hide now`
- `Basil, disappear`
- `Basil, go away`
- `Basil, go to sleep`
- `Basil, good night`

`adapters/hermes-presence-controls.ts` also contributes `Summon Basil` and `Hide Basil` to the existing Hermes command palette. This is the recovery path when speech-to-text is unavailable. Development builds expose the same two actions in `BasilDevPanel`.

The main renderer sends presence snapshots through the existing Basil overlay state payload. `BasilOverlayApp` samples the same engine and renders the same SVG cue. A hidden detached Basil keeps the transparent window alive for later summon commands but forces mouse passthrough. No proprietary runtime, bitmap animation, timer-generated task activity, or Hermes-specific branch exists in the pure engine.

### Files Added

- `src/basil-motion/presence-engine.ts`
- `src/basil-motion/presence-engine.test.ts`
- `src/basil-motion/presence.ts`
- `src/basil-motion/presence.test.ts`
- `src/basil-motion/use-basil-presence.ts`
- `src/basil-motion/presence-cue.tsx`
- `src/basil-motion/adapters/hermes-presence-command.ts`
- `src/basil-motion/adapters/hermes-presence-command.test.ts`
- `src/basil-motion/adapters/hermes-presence-controls.ts`
- `src/basil-motion/adapters/hermes-presence-controls.test.ts`

### Files Modified

- `src/basil-motion/basil-motion-controller.tsx`
- `src/basil-motion/basil-motion-stage.tsx`
- `src/basil-motion/basil-motion-stage.test.tsx`
- `src/basil-motion/basil-dev-panel.tsx`
- `src/basil-motion/basil-overlay.ts`
- `src/basil-motion/basil-overlay-app.tsx`
- `src/app/chat/composer/hooks/use-composer-voice.ts`
- `src/app/chat/composer/hooks/use-voice-conversation.ts`

### Verification

The focused presence, adapter, stage, overlay, and development-control gate passes 8 files and 60 tests. All renderer, Electron, and E2E TypeScript projects pass; scoped ESLint passes with zero warnings; and `npm run build` completes.

Production Playwright verification used the real Hermes command palette in the rebuilt Electron app. Hide sampled `visible -> hiding -> hidden`, ended at opacity `0` with pointer events disabled, and rendered the procedural hide cue. Summon sampled `hidden -> summoning -> visible`, rendered the signal aperture, overshot above unit scale, settled at identity, restored pointer events, and left Basil topmost. The same commands synchronized through the detached overlay and returned cleanly to the embedded renderer. Both renderer consoles recorded zero errors.

Visual proofs:

- `outputs\basil-summon-aperture.png`
- `outputs\basil-hide-aperture.png`

## Local Ambient Wake Listener

The local presence-command implementation lets a fully hidden Basil hear a
strict summon phrase while Hermes is minimized and a fully visible Basil hear
a strict hide phrase. It is explicitly opt-in and disabled by default. Enable
it from the Hermes command palette with `Enable local Basil voice commands`;
the command changes to `Disable local Basil voice commands` while enabled. The
compact microphone badge shows `armed`, `starting`, `listening`,
`transcribing`, `wake_detected`, `hide_detected`, `paused`, or `error` without
displaying or retaining transcript text. Clicking the badge disables capture.

The feature is deliberately local-only. `HermesBasilAmbientWakeController`
checks the genuine Hermes speech configuration and refuses to start unless STT
is enabled with `stt.provider === "local"`. Audio is captured only while Basil
is exactly `hidden` or `visible`, split by voice activity, and submitted to the
existing local Hermes transcription endpoint. The transcript is immediately
matched by the existing strict full-utterance parser. Hidden accepts only
summon and emits the portable `basil:summon-request` event with source
`ambient-wake`; visible accepts only hide and emits the generic
`basil:presence-command`. Every other transcript is discarded and is never
sent to the agent. The listener pauses during speech playback and both presence
transitions.

The host-neutral `ambient-wake-engine.ts` contains the pure policy that chooses
`off`, `armed`, `paused`, or `listen` from opt-in, stable presence, and playback
state. `ambient-presence-engine.ts` separately accepts only hidden/summon and
visible/hide pairs, rejecting duplicate and transition-phase commands.
`ambient-wake.ts` owns persisted opt-in and public status, but no audio or
Hermes API calls. This keeps the motion package reusable: another host can
supply its own microphone/transcriber controller and emit the same generic
summon request.

`ambient-vad-engine.ts` is a second host-neutral pure policy. It calibrates a
local noise floor, requires sustained speech plus a meaningful peak, and waits
for genuine trailing silence before requesting transcription. Isolated volume
spikes do not count as utterances. An ordinary non-wake transcript enters a
six-second refractory pause before capture resumes, avoiding repeated local
STT work on the same nearby conversation without inventing agent activity.

`microphone-lease.ts` prevents ambient capture from competing with Hermes
dictation or continuous voice. Interactive recording uses priority `10` and
preempts ambient priority `0`; asynchronous permission and `getUserMedia`
completion recheck ownership before keeping a stream. Ambient audio-level UI
publishing is throttled to 120 ms and ambient metering samples at 40 ms. Normal
interactive voice recording retains its existing animation-frame meter.

The main and detached overlay render the same wake snapshot. When Basil is
hidden in the transparent overlay, the window remains otherwise
mouse-pass-through but the microphone badge stays clickable. Existing Electron
`backgroundThrottling: false` behavior lets real capture continue while Hermes
is minimized. Basil's visual frame, personality, and spatial animation loops
stop completely while hidden and resume on summon.

### Foreground Summon Presentation

An ambient wake now brings Basil into view even when the full Hermes window is
minimized or behind another application. `summon-presentation-engine.ts` is a
host-neutral policy that chooses `embedded` or `overlay` from only the request
source and overlay capability. Direct command-palette and in-session voice
summons remain embedded unless Basil is already detached. Ambient wake selects
the overlay whenever the host provides one.

`adapters/hermes-summon-presentation.ts` is the only layer that reads the
Hermes actor element or invokes the Electron overlay bridge. It opens the
transparent always-on-top window at Basil's remembered position, falling back
to the embedded actor if native creation fails. `basil-overlay.ts` now returns
an asynchronous readiness result. A cold summon remains `hidden` until the
overlay renderer sends its existing `ready` control message; only then does the
presenter call the unchanged presence engine. This preserves the entire summon
animation instead of losing its first frames during BrowserWindow startup.

The foreground flow is:

`local STT -> basil:summon-request -> surface policy -> Hermes overlay ready -> summonBasil -> shared presence payload`

Once created, the hidden overlay remains alive only while the local wake
listener is enabled, so subsequent summons begin immediately. Disabling wake
while Basil is fully hidden closes the invisible native window and stops its
desktop monitor. The full Hermes window is never restored or focused by this
path.

When listening is enabled and Basil is hidden, the controller primes that
overlay before a phrase is spoken. Only the clickable local-microphone privacy
badge is visible; the actor and all motion loops remain absent. This removes
BrowserWindow and React startup from the spoken summon path. Hidden cursor
sampling drops to 160 ms, and the Windows UI Automation scene monitor is not
started until Basil becomes visible. Hiding Basil stops that monitor again
while preserving the armed listener.

### Local Name Prefilter

Completed utterances now pass through a permissively licensed, low-cost local
name detector before full local Whisper:

`adaptive VAD -> PocketSphinx Basil-name candidate -> local faster-whisper -> strict phrase parser -> presence event`

The independent `speech-prefilter-engine.ts` has only one policy: an available
negative result is discarded, while a candidate or unavailable result proceeds
to the existing strict STT path. It does not know Hermes, decode audio, parse a
command, or emit activity. Therefore a similar-sounding word can at worst cause
an unnecessary local Whisper call; it cannot summon or hide Basil.

The Hermes backend adapter is `hermes_cli/basil_speech_prefilter.py`. It
resamples the already-recorded utterance to 16 kHz mono PCM with installed
PyAV, then uses PocketSphinx 5.1.1 keyword search for both British
`B AE Z AH L` and US `B EY Z AH L` pronunciations. The decoder and CMU
dictionary remain local. PocketSphinx is in the optional `voice` dependency
group, not the base Hermes install.

When the opt-in listener arms, it requests decoder warm-up without awaiting
the response, so microphone startup remains independent. Decoder access is
serialized and cached in the backend. If PocketSphinx, PyAV, the endpoint, or
the decoder is unavailable, the renderer falls back to the previous strict
local-Whisper path. An available rejection enters a three-second refractory
pause and never loads Whisper for that utterance.

openWakeWord was not adopted because its bundled pre-trained models are
CC-BY-NC-SA and do not include Basil; Vosk was not adopted because its official
small English model is about 40 MB and its documented runtime requirement is
about 300 MB. PocketSphinx provides current Windows/Python 3.12 support,
constrained keyword search, and BSD-licensed code without a proprietary
runtime.

### Procedural Presence Audio

Summon and hide now have short synthesized Web Audio signatures aligned to the
real presence transition:

- Summon is a restrained 390 ms ascending triangle/sine score.
- Hide is a restrained 370 ms descending sine/triangle score.
- Both scores begin with a 45 ms lead so the presence lifecycle releases the
  ambient microphone before audible output.

`presence-audio-engine.ts` is a host-neutral score and playback-policy module;
it has no DOM, Web Audio, React, Electron, or Hermes dependency.
`presence-audio-web.ts` is the browser adapter that reuses one `AudioContext`
and schedules oscillator frequency ramps plus gain envelopes. No audio asset,
proprietary runtime, or fabricated agent activity is involved.

Only the primary renderer owns playback. A new presence nonce entering
`summoning` or `hiding` can play once; initial state, remounts, stable phases,
duplicate commands, and mirrored overlay snapshots remain silent. Hermes
read-aloud or voice-conversation playback suppresses a cue. The persisted
`basil.motion.presence-sounds-enabled.v1` preference defaults on and is exposed
through the command palette and development panel.

The main Basil layer publishes cue, status, and count diagnostics for production
verification. In the rebuilt Electron app, summon and hide each scheduled
exactly three native oscillators, duplicate hide scheduled zero, the mute
command scheduled zero, and AudioContext reached `running`. During both real
transitions the local listener moved `listening -> armed -> starting ->
listening`, proving capture release and restart around playback. Both renderer
consoles remained error-free.

### Files Added

- `src/lib/microphone-lease.ts`
- `src/lib/microphone-lease.test.ts`
- `src/basil-motion/ambient-presence-engine.ts`
- `src/basil-motion/ambient-presence-engine.test.ts`
- `src/basil-motion/ambient-vad-engine.ts`
- `src/basil-motion/ambient-vad-engine.test.ts`
- `src/basil-motion/ambient-wake-engine.ts`
- `src/basil-motion/ambient-wake-engine.test.ts`
- `src/basil-motion/ambient-wake.ts`
- `src/basil-motion/ambient-wake.test.ts`
- `src/basil-motion/ambient-wake-indicator.tsx`
- `src/basil-motion/adapters/hermes-ambient-wake-controller.tsx`
- `src/basil-motion/adapters/hermes-ambient-wake-controller.test.tsx`
- `src/basil-motion/adapters/hermes-summon-presentation.ts`
- `src/basil-motion/adapters/hermes-summon-presentation.test.ts`
- `src/basil-motion/summon-presentation-engine.ts`
- `src/basil-motion/summon-presentation-engine.test.ts`
- `src/basil-motion/summon-request.ts`
- `src/basil-motion/summon-request.test.ts`
- `src/basil-motion/speech-prefilter-engine.ts`
- `src/basil-motion/speech-prefilter-engine.test.ts`
- `src/basil-motion/presence-audio.ts`
- `src/basil-motion/presence-audio.test.ts`
- `src/basil-motion/presence-audio-engine.ts`
- `src/basil-motion/presence-audio-engine.test.ts`
- `src/basil-motion/presence-audio-web.ts`
- `src/basil-motion/presence-audio-web.test.ts`
- `src/basil-motion/use-basil-presence-audio.ts`
- `src/basil-motion/use-basil-presence-audio.test.tsx`
- `src/basil-motion/use-basil-frame.test.tsx`
- `hermes_cli/basil_speech_prefilter.py`
- `tests/hermes_cli/test_basil_speech_prefilter.py`

### Files Modified

- `src/app/chat/composer/hooks/use-mic-recorder.ts`
- `electron/main.ts`
- `src/hermes.ts`
- `src/hermes.test.ts`
- `src/types/hermes.ts`
- `src/basil-motion/adapters/hermes-presence-controls.ts`
- `src/basil-motion/adapters/hermes-presence-controls.test.ts`
- `src/basil-motion/basil-motion-controller.tsx`
- `src/basil-motion/basil-motion-controller.test.tsx`
- `src/basil-motion/basil-dev-panel.tsx`
- `src/basil-motion/basil-motion-stage.tsx`
- `src/basil-motion/index.ts`
- `src/basil-motion/basil-overlay.ts`
- `src/basil-motion/basil-overlay-app.tsx`
- `src/basil-motion/use-basil-frame.ts`
- `src/basil-motion/use-basil-personality.ts`
- `src/basil-motion/use-basil-personality.test.tsx`
- `src/basil-motion/use-basil-spatial.ts`
- `hermes_cli/web_server.py`
- `pyproject.toml`
- `tests/hermes_cli/test_web_server.py`
- `uv.lock`

### Verification

The initial ambient-wake, presence, microphone arbitration, stage, overlay,
personality, and development-control gate passed 14 files and 76 tests. Scoped
ESLint passed with zero warnings, all three TypeScript projects passed, and the
production build completed. The build retained pre-existing non-fatal CSS
optimizer and large-chunk warnings.

After foreground presentation was added, the expanded focused gate passes 17
files and 87 tests. It covers sourced summon delivery, pure surface and
retention policy, renderer-ready ordering, native-open failure fallback,
hidden-overlay cleanup, local transcript mapping, microphone arbitration,
presence animation, the embedded stage, and detached rendering.

After adaptive VAD and priming were added, the final focused gate passes 19
files and 97 tests. Full ESLint has zero errors (nine unrelated existing
warnings), all three TypeScript projects pass, `git diff --check` is clean, and
the production build completes with the existing dirty-tree, CSS optimizer,
large-barrel, and large-chunk warnings.

Production verification used the rebuilt Electron application on CDP `9224`
with Hermes configured for installed local `faster-whisper` STT. The genuine
microphone controller reached `starting -> listening`. A 30-second live trace
remained listening for all 30 samples, did not transcribe or summon, and
rejected an isolated microphone peak of `0.655`. The complete hidden Hermes
process tree averaged 10.70% of one CPU core, or 0.89% of this 12-thread
system, over an eight-second sample. No PowerShell/UI Automation monitor
existed while hidden.

The detached transparent overlay synchronized `visible/armed` and
`hidden/listening`, kept its badge clickable through pointer passthrough,
disabled capture immediately on click, re-enabled cleanly, and docked Basil
back into Hermes. Main and overlay renderers recorded zero console or page
errors. Automated controller coverage submits the genuine transcript
`OK Basil, come out now` through the local-STT adapter and verifies that it
emits an `ambient-wake` summon request; cloud STT is rejected before microphone
capture.

Foreground production proof minimized the main Hermes HWND, then exercised the
same sourced request consumed after real local transcription. Electron created
the native overlay in 133 ms without restoring Hermes. The cold renderer
signaled ready before the state changed from `hidden` to `summoning`, completed
the full 1,120 ms procedural motion, and settled `visible/armed`. With the
overlay warm and hidden/listening, the next sourced summon entered `summoning`
in 6 ms. Win32 independently reported the main window minimized and the Basil
window visible, non-minimized, and topmost. Main and overlay consoles remained
error-free.

Final production proof started from the automatically primed
`hidden/listening` overlay with the Hermes host window hidden. Dispatching the
same sourced request entered `summoning` in 25 ms, completed the full procedural
reveal, and settled `visible` in the transparent topmost overlay. Win32 showed
the host window still hidden and the 424 x 416 Basil window visible and topmost.
Hiding Basil returned to `hidden/listening`, removed the UI Automation monitor,
and left both renderer consoles with zero errors. Automation supplies the exact
spoken transcript through the genuine controller boundary; the final live
presentation proof supplies the resulting sourced request, not synthetic
motion timers.

The hands-free symmetry pass expands the focused gate to 20 files and 102
tests. It covers hidden summon, visible hide, transition-phase rejection,
state-inappropriate command rejection, local-only configuration, and the full
overlay lifecycle. In rebuilt production, the primed summon entered motion in
28 ms, settled visible, and automatically resumed local listening. The generic
hide event entered the 880 ms procedural hide in 8 ms, settled hidden, resumed
listening, and removed the UI Automation monitor. The transcript-to-event half
is exercised with exact local transcript fixtures; the live renderer proof
exercises the emitted production events. Both renderer consoles remained
error-free.

The local prefilter pass expands the Basil renderer gate to 21 files and 106
tests. To avoid an existing animation-timing starvation artifact, 20 files / 81
tests run together and the animation-heavy overlay file passes its 25 tests in
isolation. Three focused renderer/API files pass 30 tests. The Python classifier
passes 4 tests, the focused web-route gate passes 3 tests, and all 11 project
metadata tests pass. Ruff, scoped ESLint, all three TypeScript projects,
`git diff --check`, dependency locking, and the production build pass.

A deterministic 35-file Windows SAPI matrix covered two voices, three speech
rates, both Basil pronunciations, ordinary speech, and close words. The real
classifier recorded 15 candidates with zero false negatives, rejected 18
negatives, and passed two close words (`bezel`, `Hazel`) onward to strict STT;
it cannot turn those into commands. Mean classifier time was 118.80 ms after
including the 643.62 ms cold initialization.

In rebuilt Electron production, the listener's background warm-up was proven
by a subsequent warm request requiring 0.01 ms of decoder work. Five ordinary
utterance checks took 140-196 ms round trip (median 148 ms) and all rejected;
the same ordinary utterance took 2,394 ms through local Whisper. A 30-second
live microphone trace remained `listening` for 29 samples with one normal cycle
restart, reached a `0.477` isolated level peak, and performed no transcription.
The hidden warmed process tree averaged 11.68% of one CPU core, or 0.97% of
this 12-thread system. Both renderer consoles remained error-free.

Visual proofs:

- `outputs\basil-ambient-wake-hidden.png`
- `outputs\basil-ambient-wake-armed.png`
- `outputs\basil-ambient-wake-desktop-summon.png`
- `outputs\basil-ambient-wake-desktop-pop.png`
- `outputs\basil-ambient-wake-instant-pop.png`
- `outputs\basil-instant-summon-final.png`
- `outputs\basil-voice-hide-motion.png`
