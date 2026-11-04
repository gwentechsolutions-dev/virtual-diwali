# Vercel frontend and multiplayer backend

The Vercel site currently serves the frontend. A static Vite build does not start `server/index.ts`; room creation requires the Node multiplayer backend.

## Connect an existing backend

1. Deploy this repository's Dockerfile or run `npm ci`, `npm run build`, and `npm start` on a persistent Node host. Use one instance and a writable persistent `DATA_DIR`.
2. Set backend `PUBLIC_ORIGIN=https://virtual-diwali.vercel.app`. Terminate HTTPS and forward WebSocket upgrades to its listening port. `/api/health` must return JSON `{"ok":true}`.
3. In the Vercel project's Production environment, set `GAME_SERVER_URL` to that backend's public HTTPS URL. Redeploy. `/api/game-config` returns its matching API and WSS endpoints; the frontend reads them at connection time. This setting contains no credentials.
4. Verify two separate browsers can create/join, exchange messages, reconnect and observe the same event. A frontend preview loading correctly is insufficient evidence of backend operation.

Existing build-time `VITE_SERVER_URL` and `VITE_WS_URL` settings still take precedence. Remove stale values when using runtime `GAME_SERVER_URL`.

An optional `render.yaml` blueprint prepares one Node service with a 1GB room-data disk and the frontend's allowed origin. No Render resource has been created. This is a paid Starter configuration; approval of the service and storage charges is required before deploying it. Once provisioned, its HTTPS URL becomes `GAME_SERVER_URL` in Vercel. See [Render pricing](https://render.com/pricing) and [Blueprint specification](https://render.com/docs/blueprint-spec).

## Why an API stub is insufficient

Vercel now supports WebSockets, but connections can land on different instances and functions have duration limits. Vercel's documentation requires external state and coordination for shared rooms. This game currently uses a single authoritative Colyseus process and local JSON persistence. Exporting it as a stateless function without adapting matchmaking, presence, persistence and reconnect routing would produce inconsistent rooms.

Hosting the backend inside Vercel would require that distributed-state work and an external store, plus access to the Vercel project. Until a backend is deployed and connected, changing frontend error wording cannot enable online room creation.

References: [Vercel WebSockets and persistent state](https://vercel.com/docs/functions/websockets), [Express on Vercel](https://vercel.com/docs/frameworks/backend/express).
