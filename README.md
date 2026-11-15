# BRASS TIDE

An original offline 3v3 tactical FPS set at a coastal flood-control station. Lead blue TIDELINE against rust-red BREAKWATER through the cream-concrete works of Sluice 07. First team to five rounds wins.

## Play

Node 22.18+ and desktop Chrome with WebGL2:

    node serve.ts

Open http://127.0.0.1:8087 and click DEPLOY TO SLUICE 07. Any static HTTP server can serve game/ directly. No build, package install, account, fetch, or online service is needed by the game. Opening index.html as file:// is not supported by browser ES-module security.

Controls:

    WASD                  Accelerated movement
    Mouse                 Look (pointer lock)
    Left mouse            Fire
    Right mouse (hold)    Aim down sights
    R                     Reload from finite reserve
    Ctrl or C (hold)      Crouch: slower, lower eye height, tighter spread
    G                     Throw fragmentation grenade
    E (hold)              Plant at site A, 3 seconds
    B                     Requisition menu during deployment
    Escape                Pause / help / sensitivity / mute
    Arrow keys            Look without pointer lock
    Left-button drag      Look fallback when pointer lock is unavailable

When downed, the camera follows a surviving ally until the round resolves. Reload before the magazine runs dry. Moving and repeated firing widen spread; stop, aim, and crouch for accurate shots. Teammates block bullets, but friendly fire does no damage. Grenades damage anyone in range, including you, but cover stops blast damage. The minimap shows allies and enemies currently visible to your team, not hidden enemies.

## Operation

Deployment lasts 12 simulation seconds. The south dock is sealed during deployment. Buy weapons, armor, and spare grenades with B before moving out. The menu pauses this single-player simulation while inspecting equipment. Each operator starts with a KITE rifle and one frag.

Live rounds last 85 seconds. TIDELINE wins by eliminating defenders or planting a charge at the northern spillway and protecting it for 30 seconds. BREAKWATER wins by eliminating attackers before the plant, holding until timeout, or spending five uninterrupted seconds defusing. Allies can plant and defenders can navigate back to defuse. A planted charge remains live after the attackers die. Round results last five seconds before the next deployment. Earn $300 per enemy elimination, $300 for a plant, $2400 for a win or $1500 for a loss; cash caps at $12000. Magazines and reserve are replenished between rounds. First to five completes the operation; NEW OPERATION restarts the match.

The original three-lane map offers a central utility court, west service lane and east channel. Low cargo cover and taller pump/turbine buildings break sightlines; the final gantry frames the charge site. All art is local procedural geometry or CanvasTexture signage. All audio is synthesized with WebAudio noise, oscillators, envelopes and stereo positioning. No commercial maps, names, characters, sounds, textures or screenshots were used.

## Source layout

    game/sim.js       Pure collision, damage, weapons, economy, objective, rounds
    game/map.js       Original collision volumes, patrol routes and routing nodes
    game/combat.js    Raycast combat, LOS/hearing bots, route planning, grenades
    game/view.js      Three.js scene, static instancing, operators, weapon, effects
    game/audio.js     Original procedural WebAudio sound
    game/app.js       60 Hz accumulator, controls, UI, minimap, browser observations
    game/index.html   Local import map and accessible overlays
    game/style.css    HUD and interface styling
    main.ts           Deterministic standard-library artifact producer
    vendor/           Unchanged make.fun dossier library

The simulation uses a fixed 1/60 second tick with rendering independent of tick count. Wall-aware bot routes use a padded visibility graph when a direct path is blocked. Bots seek visible enemies, hear nearby gunshots, investigate last known positions, reload, hold/fire, plant, and retake the objective. Randomness is used for live spread and bot cadence, not for artifact production.

## Tests and evidence

Pure simulation (Node built-in test runner, no dependencies):

    node --test tests/physics.test.mjs tests/weapons.test.mjs tests/rounds.test.mjs tests/combat.test.mjs

Actual RED and GREEN runs are preserved under evidence/. The browser test uses locally installed Playwright Core OUTSIDE the repository and the existing Chrome executable; it is not a game or entrypoint dependency. tests/browser.test.mjs documents this machine's exact test setup. Serve the game first, then run:

    node tests/browser.test.mjs

It drives real start, purchases, movement, crouch, look, pause, fire, reload and grenade inputs and records local-only requests and JavaScript errors. It captures the four unedited 1280x720 JPEGs in screenshots/ directly from Chrome. The ordinary-input flank can win or lose: no test hook injects health, enemies, scores, positions, timers or staged screenshot states. window.brassTide provides read-only serialized observations and ordinary key/look input controls only. A visual-inspection endpoint was unavailable (HTTP 403); screenshot metadata and actual browser rendering/input were still tested.

## Artifact

    MAKEFUN_OUTPUT_DIR=out/run-a node main.ts

The Node 22-compatible entrypoint copies static game/ and screenshots/ and calls the kit's unchanged buildDossier with the competition caps. It rejects symlinks, checks screenshot count and dossier size, and produces no timestamps or random output. Re-run into out/run-b to compare every file byte for byte. Three.js is the fresh kit's 0.187.0 distribution, unmodified under game/vendor/three.

This repository does not submit entries, contact a wallet, consume an API key, or upload transcripts. Native session bundling, public repository creation/push and make.fun pre-submit checks are intentionally left to the parent workflow. No independent submission has been made.

MIT license. Three.js retains its included upstream MIT notices.
