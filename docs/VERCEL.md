# Vercel frontend and multiplayer backend

The Vercel site currently serves the frontend. A static Vite build does not start `server/index.ts`; room creation requires the Node multiplayer backend.

## Connect an existing backend

1. Deploy this repository's Dockerfile or run `npm ci --include=dev`, `npm run build`, and `npm start` on a Node host. Use one instance and a writable `DATA_DIR`.
2. Set backend `PUBLIC_ORIGIN=https://virtual-diwali.vercel.app`. Terminate HTTPS and forward WebSocket upgrades to its listening port. `/api/health` must return JSON `{"ok":true}`.
3. In the Vercel project's Production environment, set `GAME_SERVER_URL` to that backend's public HTTPS URL. Redeploy. `/api/game-config` returns its matching API and WSS endpoints; the frontend reads them at connection time. This setting contains no credentials.
4. Verify two separate browsers can create/join, exchange messages, reconnect and observe the same event. A frontend preview loading correctly is insufficient evidence of backend operation.

Existing build-time `VITE_SERVER_URL` and `VITE_WS_URL` settings still take precedence. Remove stale values when using runtime `GAME_SERVER_URL`.

The `render.yaml` blueprint uses Render's Free instance without a persistent disk. Set `DATA_DIR=/tmp/virtual-diwali-rooms`. The user-created backend is `https://virtual-diwali.onrender.com`; its health endpoint responds successfully. Use that HTTPS origin as Vercel's Production `GAME_SERVER_URL` and redeploy after changing the variable.

Free Render instances sleep after 15 minutes without inbound traffic and take about a minute to wake. Room state and local JSON files are lost on sleep, restart or redeploy, so the normal 24-hour room lifetime is an upper bound while this instance stays running. Guests must create a new celebration after a reset. No paid instance or disk is configured. See [Render Free limitations](https://render.com/docs/free) and [Blueprint specification](https://render.com/docs/blueprint-spec).

## Public verification — 4 November 2026

Production `GAME_SERVER_URL` is set to `https://virtual-diwali.onrender.com`. After redeployment, the public `/api/game-config` returned that API origin and `wss://virtual-diwali.onrender.com`. Two isolated Chrome contexts at `https://virtual-diwali.vercel.app` passed real room creation/join, participant presence, chat, firework launch, shared finale, photo download and reload/rejoin. No backend or configuration responses were mocked. This verifies a short live session, not sustained load, free-instance recovery or WAN voice quality.

Repeat the public browser smoke test in PowerShell:

```powershell
$env:BROWSER_BASE_URL='https://virtual-diwali.vercel.app'
npm run test:browser -- tests/browser/game.spec.ts --grep 'two separate browser'
```

## Why an API stub is insufficient

Vercel now supports WebSockets, but connections can land on different instances and functions have duration limits. Vercel's documentation requires external state and coordination for shared rooms. This game currently uses a single authoritative Colyseus process and local JSON persistence. Exporting it as a stateless function without adapting matchmaking, presence, persistence and reconnect routing would produce inconsistent rooms.

Hosting the backend inside Vercel would require that distributed-state work and an external store, plus access to the Vercel project. Until a backend is deployed and connected, changing frontend error wording cannot enable online room creation.

References: [Vercel WebSockets and persistent state](https://vercel.com/docs/functions/websockets), [Express on Vercel](https://vercel.com/docs/frameworks/backend/express).
