# BRASS TIDE / TACTICAL DEPTH UPGRADE

[![make.fun · threejs-fps-02](https://make.fun/badge/threejs-fps-02.svg)](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)
[![rank](https://make.fun/badge/threejs-fps-02/dcm3llo/brass-tide/rank.svg)](https://make.fun/bounty/threejs-fps-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)
[![reward](https://make.fun/badge/threejs-fps-02/dcm3llo/brass-tide/reward.svg)](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)

An original offline 3v3 tactical FPS set at a coastal flood-control station. This candidate preserves the cream/teal/copper Brass Tide v1 feel while adding a real two-site charge loop, selectable defense, fair bot perception and readable round economy. Lead blue TIDELINE against rust-red BREAKWATER through Sluice 07. First team to five rounds wins.

## Play

The title screen has three honest entry points:

- DEPLOY TO SLUICE 07: the competitive single-player match as TIDELINE attackers.
- DEFEND / BREAKWATER: the same match as the BREAKWATER defender, with real retake and defuse access.
- FIELD SCHOOL / SOLO PLANT + DEFUSE: a clearly labeled, useful onboarding drill with no fake opponents. It uses the same fixed-step charge state machine: walk to a site, hold E to plant, then hold E to defuse after the role changes. It is not a competitive match result.

During a match, 1 and 2 call an attack toward A / NORTH SPILLWAY or B / EAST INTAKE. Tab opens the live six-player roster with kills, deaths, cash and round award.

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
    E (hold)              Use charge: plant, recover, or defuse; interruption resets progress
    1 / 2                 Attack-site call: A / B
    Tab                   Live six-player roster
    B                     Requisition menu during deployment
    Escape                Pause / help / sensitivity / mute
    Arrow keys            Look without pointer lock
    Left-button drag      Look fallback when pointer lock is unavailable

When downed, the camera follows a surviving ally until the round resolves. Reload before the magazine runs dry. Moving and repeated firing widen spread; stop, aim, and crouch for accurate shots. Teammates block bullets, but friendly fire does no damage. Grenades damage anyone in range, including you, but cover stops blast damage. The minimap shows allies and enemies currently visible to your team, not hidden enemies.

## Operation

Deployment lasts 12 simulation seconds. Each team has a sealed spawn buy zone: south dock for TIDELINE, north dock for BREAKWATER. Buy weapons, armor, and spare grenades with B before moving out. Bot operators make their own economy decisions between rounds. Each operator starts with a KITE rifle and one frag.

Live rounds last 85 seconds. TIDELINE wins by elimination or by planting at either A / NORTH SPILLWAY or B / EAST INTAKE and surviving the 30-second charge. The charge has one carrier; killing that carrier drops it at the exact death location and another attacker can recover it. BREAKWATER can win by elimination, timeout before a plant, or five uninterrupted seconds of defusing. Plant and defuse are stationary exclusive holds: movement, release, reload, or damage resets the progress. A planted charge remains live after every attacker dies. Round results show the exact end cause and the next buy phase. Earn $300 per elimination, plant or defuse, $2400 for a win and $1500 for a loss; cash caps at $12000. Dead operators lose purchased armor/utility and return to a pistol, while surviving equipment carries forward. First to five completes the operation; NEW OPERATION restarts the match.

The original three-lane map offers a central utility court, west service lane, east channel and two distinct objective rings. Low cargo cover and taller pump/turbine buildings break sightlines; A is a central spillway push while B is an east-channel flank. World signs, rings, minimap labels and live charge markers all identify both sites. All art is local procedural geometry or CanvasTexture signage. All audio is synthesized with WebAudio noise, oscillators, envelopes and stereo positioning. No commercial maps, names, characters, sounds, textures or screenshots were used.

## Source layout

    game/sim.js       Fixed-step state, two-site charge, interruption, economy, stats, round reset
    game/map.js       Original collision volumes, two sites, hold assignments, graph nodes
    game/combat.js    Raycast combat, FOV/LOS/hearing memory, roles, graph routes, grenades
    game/view.js      Three.js scene, static instancing, operators, weapon, effects
    game/audio.js     Original procedural WebAudio sound
    game/app.js       60 Hz accumulator, controls, UI, minimap, browser observations
    game/index.html   Local import map and accessible overlays
    game/style.css    HUD and interface styling
    main.ts           Deterministic standard-library artifact producer
    vendor/           Unchanged make.fun dossier library

The simulation uses a fixed 1/60 second tick with rendering independent of tick count. Bots use a shared facing/FOV and wall-aware LOS test; gunshots and footsteps update a last-heard location without granting omniscient tracking. Their roles are visible in the squad line and include hold A/B, escort, recover, plant, cover, rotate, reload cover, retake and defuse. A padded visibility graph plus clearance corner nodes keeps objective routes collision-safe. Randomness is used for live spread and bot cadence, not for artifact production.

## Tests and evidence

Pure simulation (Node 22 built-in test runner, no dependencies):

    node --max-old-space-size=512 tests/all.mjs

The final candidate regression run is 25/25. It covers the two sites, carrier-only plant, interruption, drop/recover, defense selection, defuse, earned ledger/equipment reset, FOV/cover/hearing memory, safe routes, roles, utility/reload retreat, Field School and shared movement. RED and GREEN logs are kept outside this repository by the upgrade coordinator.

Upgrade RED/GREEN logs, action traces and rule snapshots are preserved outside the repository in `../logs/` and the coordinator's evidence directory. Browser automation needs Playwright Core installed separately; set `PLAYWRIGHT_MODULE` to its `index.mjs` file URL (the local evidence setup defaults to `../../browser-tools/node_modules/playwright-core/index.mjs`). Chrome's executable path is configured in the test. This is not a game or entrypoint dependency. Serve `game/` first. The final UI acceptance test accepts `BRASS_BASE_URL`, defaulting to port 8097:

    BRASS_BASE_URL=http://127.0.0.1:8087 node --max-old-space-size=512 tests/ui-browser.mjs

`tests/match-browser.mjs combat` and `tests/drill-browser.mjs` record real-time match and solo-training evidence on port 8097. They write screenshots, so run them only in a disposable worktree when preserving the four submitted captures. The legacy `tests/browser.test.mjs` and `tests/browser-probe.mjs` are v1 diagnostic tools, not the candidate acceptance suite; they also overwrite captures and must not be run over the final screenshot set. The external verifier compares streaming hashes; do not regenerate the dossier repeatedly just to compare it.

The bounded browser evidence uses ordinary keyboard/mouse input and read-only snapshots only. It verified WebGL, zero JS/console errors and zero external runtime requests. A real match run recorded kills, carrier drop/recovery, bot plant and a round result. A separate real Field School run walked to B, interrupted and restarted plant, planted, swapped to defender, interrupted and restarted defuse, and completed Charge defused in 31.78 seconds. No actor, HP, score, timer or bomb state was injected. The four final JPEGs are unedited 1280x720 captures: contact, Field School plant, Field School defuse and round ledger. Subjective vision inspection was unavailable with HTTP 403, so no visual-provider claim is made.

## Artifact

    MAKEFUN_OUTPUT_DIR=out/run-a node main.ts
    MAKEFUN_OUTPUT_DIR=out/run-b node main.ts

The Node 22-compatible entrypoint copies static game/ and screenshots/ and calls the kit's unchanged buildDossier with the competition caps. It rejects symlinks, checks screenshot count and dossier size, and produces no timestamps or random output. Re-run into out/run-b to compare every file byte for byte. Three.js is the fresh kit's 0.187.0 distribution, unmodified under game/vendor/three.

No upgrade candidate submission has been made; the original v1 submission is preserved. The public repository is https://github.com/dcm3llo/brass-tide. This branch is the candidate only; the parent owns submission authority. Native session transcripts are bundled separately by the parent workflow; this repository does not submit entries, contact a wallet, consume an API key, or upload transcripts.

MIT license. Three.js retains its included upstream MIT notices.
