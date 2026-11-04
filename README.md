# Virtual Chennai Deepavali 2026

A working **first multiplayer vertical slice**, built with React, TypeScript, Babylon.js and Colyseus. The supplied animated male and female characters are bundled for both development and production. The environment and animation/clothing quality remain works in progress; the full realism milestone is unfinished.

## Run locally

Requires Node.js 22.14 or newer and npm.

Source Blender models and private working assets in `assets-source/` are excluded from this public repository. Both exported character GLBs are included under `public/assets/characters/`; a fresh checkout uses the same models as production. The Blender scripts require the original source files to rebuild them. Asset provenance is recorded in `ASSETS.md`, and full feature status in `docs/REQUIREMENTS-AUDIT.md`.

```sh
npm ci
npm run dev
```

Open **http://localhost:5173**. Create a celebration, enter your name and choose a character. A second browser or an incognito window can join with the invitation code. The initial balance is 1,500 free coins and the festival bag already contains all eight firework categories.

The frontend runs on 5173 and the server on 2567. For another device on the same Wi-Fi, open the host computer's LAN address on port 5173 and allow both ports through your local firewall. A `localhost` invitation is only usable on the host computer. Friends over the internet need the HTTPS deployment described below.

## Playing

- WASD moves relative to the camera; Shift runs. Drag to rotate, scroll to zoom.
- E interacts with a nearby shop or the entrance lamps. I opens inventory, M opens the map, G opens gestures, Space celebrates, Escape opens/closes settings.
- On mobile/tablet, use the left thumbstick to move (outer edge sprints), the right thumbstick to look, and **Interact** for nearby shops/lamps. Both sticks work simultaneously and reset when interrupted. Portrait and landscape layouts respect safe areas. Touch devices default to Low graphics and a 30 FPS cap; Settings can increase graphics quality. Low disables shadows/glow and reduces render resolution and particles. These are workload limits, not a measured device-FPS guarantee.
- The textile shop is west of the street, the cracker shop east. Enter the open storefront to buy with free coins. Select a fabric, preview, purchase, then wear it.
- Use **Gathering** to return to the celebration ground. Select a firework in **Festival bag**, choose **Place**, then position the ring by moving and press **Place & light**.
- **Friends** contains the invitation, participant list and host controls. The host can lock joining, set 2–12 seats, grant coins, remove a guest, trigger the finale or end the room.
- **Photo booth** (inside Friends or Settings) lets guests opt into a staged group photo. The host chooses Wave or Stand and starts a shared countdown. Participating guests are arranged together and receive a group camera; anyone can leave. Follow, Portrait and Group view presets and framed local downloads are available.
- Sound starts only after entry or explicit enablement. Settings include volume, reduced flashes and graphics quality. Camera saves the rendered scene locally.

## Implemented

Private rooms, guest identities, reconnect/refresh recovery, disk restoration on server restart, 20 Hz server movement, 10 Hz public snapshots, remote interpolation, private inventories, idempotent purchases and launches, ownership-checked wardrobe changes, eight deterministic firework categories, shared outcome variations, active-event replay for late arrivals, synchronized finale, text chat, synchronized entrance lighting, mobile controls, screenshot capture and host controls.

The server selects event ID, seed, start time and outcome. Clients sample their clock offset with ping/pong and evaluate analytic particles using shared event age. A late client does not restart the effect. Sound cues are not replayed if their start has already passed. Client particle budgets may differ without changing the server outcome. Six ground/aerial behaviors plus comet and multishot are available; realistic recordings and volumetric smoke remain unfinished.

## Explicitly unfinished

See [STATUS.md](STATUS.md) for the complete gap list. In particular:

- Photoreal Chennai buildings, scooters, autos, shop interiors and suitable human characters are **not delivered**. The Xbot reference is a mannequin, not a realistic male avatar.
- The garment overlay is not a properly fitted or skinned veshti/saree; it can clip. Fabric purchases change its palette, not a tailored garment mesh.
- No selfie processing, facial reconstruction, uploads or external avatar provider is connected. No photographs are collected.
- Salesperson and cloth presentation remain drafts; shelf retrieval, realistic hand contact, cloth simulation, full emote library and advanced photo-booth staging are unfinished.
- No claim of 60 FPS, broad device compatibility or eight simultaneous rendered browsers. Eight live network clients and two actual browser sessions are separate tests.

## Verification

```sh
npm test                 # server-domain tests
npm run build            # strict TypeScript check + production bundle
npm run test:network     # live server required on 2567; eight real WS clients
npm run test:browser     # dev server required; installed Google Chrome
```

Browser tests use Playwright with two isolated browser contexts and a touch viewport. Screenshots and the HTML test report are written to `test-results/` and `playwright-report/`. See [docs/TEST-RESULTS.md](docs/TEST-RESULTS.md) for measured results and untested cases. The network test verifies transactions, shared appearance, event payloads, reconnect inventory and late joining rather than mocking the server.

## Deployment

No paid service or external account is required for local use. A public machine or hosting service supporting persistent Node processes, WebSocket upgrades and a writable volume is required for internet invitations. This application is a single-process server; do not run multiple replicas against the same JSON directory.

1. Run `npm ci` and `npm run build` on the deployment host.
2. Copy `.env.example` to `.env`. Set `PUBLIC_ORIGIN` to the exact HTTPS origin, `PORT=2567`, and `DATA_DIR` to a persistent private directory. Keep these files out of the public web root.
3. Run `npm start`. It serves both `dist/` and the multiplayer API/WebSocket connections.
4. Terminate HTTPS at a reverse proxy. A Caddy example is in [deploy/Caddyfile](deploy/Caddyfile). Point your domain to the host and replace the sample domain in that file. Caddy forwards WebSocket upgrades automatically.
5. Confirm two browsers on different networks can join, reconnect and see the same finale before inviting the group.

The default frontend uses the same host for HTTP and WSS in production. For split hosting, set `VITE_SERVER_URL` and `VITE_WS_URL` **before building**, and use the frontend's exact origin for `PUBLIC_ORIGIN`. Never put provider secrets in any `VITE_*` variable.

For the Vercel frontend, `GAME_SERVER_URL` can instead point to the deployed backend through the runtime `/api/game-config` function. See [Vercel setup](docs/VERCEL.md). A frontend-only Vercel deployment does not run the multiplayer service.

The `.env` file is loaded by `npm start`. Local `npm run dev` uses development defaults. Room codes and names are stored in the configured data directory. Rooms expire after 24 hours; expired records are removed by the cleanup described in the privacy document. Graceful shutdown and restart retain live rooms and their inventories. No cloud storage is used.

Voice uses opt-in WebRTC peer connections and room-scoped signaling. The two-client localhost workflow is tested with fake audio devices; WAN/device quality is unverified. Configure `VOICE_STUN_URL` and a coturn-compatible `VOICE_TURN_URL` / `VOICE_TURN_SECRET` for internet connectivity. The TURN shared secret stays server-side; joined voice guests receive one-hour credentials. Use HTTPS/WSS in production. The voice controls provide local microphone mute, participant mute, independent volume and proximity attenuation. Speaker indicators, relay deployment, broad device compatibility and larger-room voice performance remain unfinished.

[Poly Haven](https://polyhaven.com/license) provides CC0 surfaces; assets are bundled locally, not downloaded during gameplay. Asset licensing and exact sources are in [ASSETS.md](ASSETS.md).

## Code map

`shared/catalog.ts` defines items, shared types and movement bounds. `server/world.ts` implements domain rules; `server/index.ts` provides rooms, validation and persistence. `src/network.ts` manages guest connections and clock compensation. `src/game/world.ts` renders the scene and characters; `src/game/fireworks.ts` evaluates deterministic particles. `src/main.tsx` contains onboarding and game UI.
