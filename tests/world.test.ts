import { test } from "node:test";
import assert from "node:assert/strict";
import { World } from "../server/world.js";
import { seeded, fireworks } from "../shared/catalog.js";
const secret = "a".repeat(64),
  other = "b".repeat(64);
test("guest identity survives reload; secret and private inventories never enter public state", () => {
  const w = new World(),
    p = w.join(secret, "Arun", "male");
  p.coins = 800;
  p.online = false;
  const restored = new World(JSON.parse(JSON.stringify(w.data)));
  const again = restored.join(secret, "Someone else", "female");
  assert.equal(again.id, p.id);
  assert.equal(again.coins, 800);
  assert.equal(again.name, "Arun");
  assert.ok(!JSON.stringify(restored.snapshot()).includes(secret));
  assert.ok(!("secret" in restored.snapshot().players[0]));
  assert.ok(!("inventory" in restored.snapshot().players[0]));
});
test("duplicate sessions, locked rooms, participant cap and removed guests are enforced", () => {
  const w = new World(undefined, 2),
    p = w.join(secret, "Host", "male");
  assert.throws(() => w.join(secret, "Duplicate", "male"), /already connected/);
  w.hostAction(p, "lock");
  assert.throws(() => w.join(other, "New", "female"), /closed/);
  w.hostAction(p, "lock");
  const q = w.join(other, "Guest", "female");
  assert.throws(() => w.join("c".repeat(64), "Third", "male"), /full/);
  w.hostAction(p, "kick", q.id);
  q.online = false;
  assert.throws(() => w.join(other, "Guest", "female"), /removed/);
});
test("purchases enforce proximity, balance, catalogue, body type and idempotency", () => {
  const w = new World(),
    p = w.join(secret, "Host", "male");
  assert.throws(() => w.buy(p, "rocket", "one"), /Visit/);
  p.x = 10;
  p.z = 2;
  const before = p.coins,
    stock = p.inventory.rocket;
  w.buy(p, "rocket", "two");
  w.buy(p, "rocket", "two");
  assert.equal(p.coins, before - 110);
  assert.equal(p.inventory.rocket, stock + 1);
  assert.throws(() => w.buy(p, "not-an-item", "bad"), /Unknown/);
  p.coins = 0;
  assert.throws(() => w.buy(p, "rocket", "poor"), /Not enough/);
  p.x = -10;
  p.coins = 1500;
  assert.throws(() => w.buy(p, "peacock", "wrong"), /character type/);
  w.buy(p, "saffron", "outfit");
  w.buy(p, "saffron", "outfit-again");
  assert.equal(p.coins, 1320);
  w.wear(p, "saffron");
  assert.equal(p.outfit, "saffron");
  assert.throws(() => w.wear(p, "indigo"), /Purchase/);
});
test("launch replay consumes once, uses shared seed, rejects invalid placement, restores current events", () => {
  const w = new World(),
    p = w.join(secret, "Host", "female");
  assert.throws(() => w.launch(p, "rocket", "wrong", 0, 15), /celebration/);
  p.x = 0;
  p.z = 12;
  assert.throws(() => w.launch(p, "rocket", "nan", NaN, NaN), /celebration/);
  const before = p.inventory.rocket;
  const first = w.launch(p, "rocket", "same", 0, 14) as any;
  assert.deepEqual(w.launch(p, "rocket", "same", 0, 14), first);
  assert.equal(p.inventory.rocket, before - 1);
  assert.equal(w.snapshot().events.length, 1);
  assert.equal(
    new World(JSON.parse(JSON.stringify(w.data))).snapshot().events[0].seed,
    first.event.seed,
  );
  const a = seeded(first.event.seed),
    b = seeded(first.event.seed);
  assert.deepEqual(
    Array.from({ length: 100 }, a),
    Array.from({ length: 100 }, b),
  );
});
test("all catalogue items activate; effects capped and expired events removed", () => {
  const w = new World(),
    p = w.join(secret, "Host", "female");
  p.x = 0;
  p.z = 15;
  for (const f of fireworks) {
    p.inventory[f.id]=1;
    w.data.events=[];
    w.launch(p, f.id, f.id, 1, 15);
    assert.equal(w.snapshot().events[0].item,f.id);
  }
  w.data.events=[];p.inventory.sparkler=12;p.inventory.flowerpot=1;
  for(let i=0;i<8;i++)w.launch(p,'sparkler','cap-'+i,0,16);
  w.launch(p, "sparkler", "extra1", 0, 16);
  w.launch(p, "sparkler", "extra2", 0, 16);
  assert.throws(() => w.launch(p, "flowerpot", "overflow", 0, 16), /busy/);
  assert.equal(w.snapshot(Date.now() + 30000).events.length, 0);
});
test("movement speed is server-owned and solid building bounds hold", () => {
  const w = new World(),
    p = w.join(secret, "Host", "female");
  w.move(p, 100, 100, true, 1000);
  assert.ok(Math.hypot(p.x, p.z + 8) <= 0.501);
  p.x = 6.9;
  p.z = -8;
  w.move(p, 1, 0, true, 0.1);
  assert.equal(p.x, 6.9);
  p.x = 0;
  p.z = 25.9;
  w.move(p, 0, 1, true, 0.1);
  assert.equal(p.z, 25.9);
});
test("only host can administer and finale is shared and replay-limited", () => {
  const w = new World(),
    p = w.join(secret, "Host", "male"),
    q = w.join(other, "Friend", "female");
  assert.throws(() => w.hostAction(q, "coins"), /Only the host/);
  w.hostAction(p, "coins");
  assert.equal(q.coins, 2000);
  w.hostAction(p, "finale");
  assert.equal(w.data.events.length, 9);
  assert.throws(() => w.hostAction(p, "finale"), /already playing/);
  w.hostAction(p, "end");
  assert.throws(() => w.join("c".repeat(64), "New", "male"), /ended/);
});
