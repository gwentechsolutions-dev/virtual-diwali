import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { Client, Room } from "colyseus.js";
import { writeFileSync, mkdirSync } from "node:fs";
import type { Snapshot, SelfState } from "../shared/catalog.js";
const http = "http://127.0.0.1:2567",
  ws = "ws://127.0.0.1:2567";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => boolean, message: string) {
  for (let i = 0; i < 100; i++) {
    if (fn()) return;
    await delay(50);
  }
  throw Error(message);
}
const res = await fetch(http + "/api/rooms", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ limit: 10 }),
});
assert.equal(res.status, 200);
const info = (await res.json()) as { roomId: string; code: string };
const guests: {
  room: Room;
  secret: string;
  state?: Snapshot;
  self?: SelfState;
}[] = [];
async function join(secret = randomBytes(32).toString("hex")) {
  const room = await new Client(ws).joinById(info.roomId, {
    secret,
    name: "Guest " + guests.length,
    type: "female",
  });
  const guest = {
    room,
    secret,
    state: undefined as Snapshot | undefined,
    self: undefined as SelfState | undefined,
  };
  room.onMessage("welcome", () => {});
  room.onMessage("snapshot", (s: Snapshot) => (guest.state = s));
  room.onMessage("self", (s: SelfState) => (guest.self = s));
  room.onMessage("result", () => {});
  room.onMessage("chat", () => {});
  room.onMessage("pong", () => {});
  guests.push(guest);
  await until(() => !!guest.self, "No private state");
  return guest;
}
function command(
  room: Room,
  action: string,
  data: Record<string, unknown> = {},
  id = randomUUID(),
) {
  return new Promise<any>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Error("Command timed out: " + action)),
      5000,
    );
    const off = room.onMessage("result", (r: any) => {
      if (r.id === id) {
        clearTimeout(timer);
        off();
        resolve(r);
      }
    });
    room.send("command", { id, action, ...data });
  });
}
async function move(room: Room, dx: number, dz: number, ms: number) {
  const t = setInterval(() => room.send("move", { dx, dz, run: true }), 50);
  await delay(ms);
  clearInterval(t);
  room.send("move", { dx: 0, dz: 0, run: false });
  await delay(150);
}
const started = Date.now();
try {
  for (let i = 0; i < 8; i++) await join();
  const host = guests[0];
  await until(
    () => guests.every((g) => g.state?.players.length === 8),
    "Eight players not visible",
  );
  assert.equal(
    (await command(guests[1].room, "host", { item: "coins" })).ok,
    false,
  );
  await command(host.room, "center");
  await move(host.room, 0, -1, 1600);
  await move(host.room, 1, 0, 1900);
  const coins = host.self!.coins;
  const stock = host.self!.inventory.rocket;
  const purchaseId = randomUUID();
  assert.equal(
    (await command(host.room, "buy", { item: "rocket" }, purchaseId)).ok,
    true,
  );
  assert.equal(
    (await command(host.room, "buy", { item: "rocket" }, purchaseId)).ok,
    true,
  );
  await until(() => host.self?.coins === coins - 110, "Wrong balance");
  assert.equal(host.self!.inventory.rocket, stock + 1);
  await move(host.room, -1, 0, 3800);
  assert.equal((await command(host.room, "buy", { item: "peacock" })).ok, true);
  await command(host.room, "wear", { item: "peacock" });
  await until(
    () =>
      guests.every(
        (g) =>
          g.state?.players.find((p) => p.id === host.self!.id)?.outfit ===
          "peacock",
      ),
    "Outfit not synchronized",
  );
  await command(host.room, "emote", { item: "Dance" });
  await until(
    () =>
      guests.every(
        (g) =>
          g.state?.players.find((p) => p.id === host.self!.id)?.emote ===
          "Dance",
      ),
    "Emote not synchronized",
  );
  await command(host.room, "center");
  const id = randomUUID();
  const fired = await command(
    host.room,
    "launch",
    { item: "aerial", x: 0, z: 12 },
    id,
  );
  assert.equal(fired.ok, true);
  assert.equal(
    (await command(host.room, "launch", { item: "aerial", x: 0, z: 12 }, id))
      .event.id,
    fired.event.id,
  );
  await until(
    () =>
      guests.every((g) => g.state?.events.some((e) => e.id === fired.event.id)),
    "Event not synchronized",
  );
  for (const g of guests)
    assert.deepEqual(
      g.state!.events.find((e) => e.id === fired.event.id),
      fired.event,
    );
  const late = await join();
  await until(
    () => !!late.state?.events.some((e) => e.id === fired.event.id),
    "Late join missed active event",
  );
  const before = JSON.parse(JSON.stringify(host.self));
  await host.room.leave();
  await delay(200);
  const restored = await join(host.secret);
  assert.deepEqual(restored.self, before);
  assert.equal(
    (await command(restored.room, "host", { item: "finale" })).ok,
    true,
  );
  const online = guests.filter((g) => g.room.connection.isOpen);
  await until(
    () => online.every((g) => !!g.state?.finaleAt),
    "Finale not synchronized",
  );
  assert.equal(new Set(online.map((g) => g.state!.finaleAt)).size, 1);
  mkdirSync("test-results", { recursive: true });
  writeFileSync(
    "test-results/network.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        participants: 9,
        durationMs: Date.now() - started,
        checks: [
          "eight simultaneous WebSocket clients",
          "server-owned movement",
          "purchase replay",
          "wardrobe ownership and broadcast",
          "emote broadcast",
          "identical firework IDs/seeds/outcomes/timestamps",
          "late join active event",
          "guest reconnect inventory",
          "non-host admin rejected",
          "shared finale timestamp",
        ],
        passed: true,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: eight-client synchronization, shopping, late join and reconnect; nine clients at peak.",
  );
} finally {
  for (const g of guests) if (g.room.connection.isOpen) await g.room.leave();
}
