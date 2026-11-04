import { randomBytes, randomUUID, createHash } from "node:crypto";
import {
  fireworks,
  outfits,
  emotes,
  isWalkable,
  zones,
  type PublicPlayer,
  type FireworkEvent,
  type Snapshot,
  type SelfState,
  type Outcome,
  type ShopAction,
} from "../shared/catalog.js";
export interface Member extends PublicPlayer {
  secret: string;
  coins: number;
  inventory: Record<string, number>;
  wardrobe: string[];
  receipts: Record<string, unknown>;
  banned: boolean;
}
export interface SavedWorld {
  shopActions?: ShopAction[];
  code: string;
  host: string;
  created: number;
  locked: boolean;
  limit: number;
  members: Record<string, Member>;
  events: FireworkEvent[];
  finaleAt: number;
  lights: boolean;
  ended: boolean;
}
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export class World {
  data: SavedWorld;
  constructor(saved?: SavedWorld, limit = 10) {
    this.data = saved ?? {
      code: randomBytes(5).toString("hex").toUpperCase(),
      host: "",
      created: Date.now(),
      locked: false,
      limit: Math.max(2, Math.min(12, limit)),
      members: {},
      events: [],
      finaleAt: 0,
      lights: true,
      ended: false,
    };
    Object.values(this.data.members).forEach((p) => (p.online = false));
  }
  join(secret: string, name: string, type: "male" | "female") {
    const digest = hash(secret);
    let p = Object.values(this.data.members).find((p) => p.secret === digest);
    if (this.data.ended || Date.now() - this.data.created > 86400000)
      throw Error("This celebration has ended. Create a new room.");
    if (p?.banned) throw Error("You have been removed from this celebration.");
    if (p?.online)
      throw Error("This guest is already connected in another tab.");
    if (
      Object.values(this.data.members).filter((p) => p.online).length >=
      this.data.limit
    )
      throw Error("This celebration is full.");
    if (!p) {
      if (this.data.locked)
        throw Error("The host has closed this room to new guests.");
      if (Object.keys(this.data.members).length >= 64)
        throw Error("Guest limit reached.");
      p = {
        id: randomUUID(),
        secret: digest,
        name,
        type,
        outfit: "ivory",
        x: 0,
        z: -8,
        yaw: 0,
        moving: false,
        emote: "",
        emoteUntil: 0,
        online: true,
        coins: 1500,
        inventory: {
          sparkler: 3,
          flowerpot: 2,
          chakra: 2,
          rocket: 2,
          serial: 2,
          aerial: 2,
          comet: 1,
          multishot: 1,
        },
        wardrobe: ["ivory"],
        receipts: {},
        banned: false,
      };
      this.data.members[p.id] = p;
      if (!this.data.host) this.data.host = p.id;
    }
    p.online = true;
    return p;
  }
  move(p: Member, dx: number, dz: number, run: boolean, dt: number) {
    const len = Math.hypot(dx, dz);
    if (len > 1) {
      dx /= len;
      dz /= len;
    }
    const step = (run ? 5 : 3) * Math.min(0.1, dt);
    const x = p.x + dx * step,
      z = p.z + dz * step;
    if (isWalkable(x, p.z)) p.x = x;
    if (isWalkable(p.x, z)) p.z = z;
    p.moving = len > 0.01;
    p.running = p.moving && run;
    if (p.moving) p.yaw = Math.atan2(dx, dz);
  }
  transaction(p: Member, id: string, action: () => unknown) {
    if (Object.hasOwn(p.receipts, id)) return p.receipts[id];
    if (Object.keys(p.receipts).length >= 2000)
      throw Error("This guest has reached the daily action limit.");
    const value = action();
    p.receipts[id] = value;
    return value;
  }
  near(p: Member, zone: keyof typeof zones) {
    const a = zones[zone];
    return Math.hypot(p.x - a.x, p.z - a.z) <= a.r;
  }
  buy(p: Member, item: string, id: string) {
    return this.transaction(p, id, () => {
      const f = fireworks.find((f) => f.id === item),
        o = outfits.find((o) => o.id === item);
      if (!f && !o) throw Error("Unknown item.");
      if (!this.near(p, f ? "crackers" : "textiles"))
        throw Error("Visit the shop counter to make a purchase.");
      if (o && o.type !== "all" && o.type !== p.type)
        throw Error("Choose an outfit for your character type.");
      if (o && p.wardrobe.includes(item))
        return { message: "Already in your wardrobe." };
      const price = (f ?? o)!.price;
      if (p.coins < price) throw Error("Not enough festival coins.");
      const now=Date.now(),shop=f?'crackers':'textiles';
      const actions=(this.data.shopActions??[]).filter(a=>a.start+a.duration>now);
      const queue=actions.filter(a=>a.shop===shop);
      if(queue.length>=3)throw Error('The shopkeeper is serving other guests. Please wait a moment.');
      p.coins -= price;
      if (f) p.inventory[item] = (p.inventory[item] ?? 0) + 1;
      else p.wardrobe.push(item);
      this.data.shopActions=actions;
      this.data.shopActions.push({id:randomUUID(),shop,player:p.id,item,start:Math.max(now,...queue.map(a=>a.start+a.duration)),duration:f?4500:9000});
      return { message: `${(f ?? o)!.name} added.` };
    });
  }
  wear(p: Member, item: string) {
    if (!p.wardrobe.includes(item)) throw Error("Purchase this outfit first.");
    p.outfit = item;
  }
  launch(
    p: Member,
    item: string,
    id: string,
    x: number,
    z: number,
    now = Date.now(),
  ) {
    return this.transaction(p, id, () => {
      const f = fireworks.find((f) => f.id === item);
      if (!f) throw Error("Unknown firework.");
      if (
        !Number.isFinite(x) ||
        !Number.isFinite(z) ||
        !this.near(p, "celebration") ||
        Math.hypot(x, z - 15) > 8 ||
        Math.hypot(x - p.x, z - p.z) > 4
      )
        throw Error(
          "Place your firework nearby inside the celebration ground.",
        );
      if (!p.inventory[item])
        throw Error("You have used all of this firework.");
      if (
        this.data.events.filter((e) => e.start + e.duration > now).length >= 10
      )
        throw Error("The sky is busy. Wait a moment.");
      const r = randomBytes(4).readUInt32LE() / 0xffffffff;
      const outcome: Outcome =
        r < 0.78
          ? "normal"
          : r < 0.86
            ? "delayed"
            : r < 0.92
              ? "brief"
              : r < 0.98
                ? "weak"
                : "no-burst";
      const e: FireworkEvent = {
        id: randomUUID(),
        item: f.id,
        player: p.id,
        x,
        z,
        seed: randomBytes(4).readUInt32LE(),
        start: now + (outcome === "delayed" ? 2600 : 700),
        duration: outcome === "brief" ? f.duration * 0.55 : f.duration,
        outcome,
      };
      p.inventory[item]--;
      this.data.events.push(e);
      p.emote = "Light";
      p.emoteUntil = now + 1500;
      return { event: e, message: "Firework placed. Look up!" };
    });
  }
  emote(p: Member, name: string) {
    if (!emotes.includes(name as any)) throw Error("Unknown gesture.");
    p.emote = name;
    p.emoteUntil = Date.now() + 5000;
  }
  hostAction(p: Member, action: string, target?: string, value?: number) {
    if (p.id !== this.data.host) throw Error("Only the host can do that.");
    switch (action) {
      case "lock":
        this.data.locked = !this.data.locked;
        break;
      case "limit":
        if (!value || value < 2 || value > 12 || !Number.isInteger(value))
          throw Error("Choose 2–12 guests.");
        this.data.limit = value;
        break;
      case "coins":
        Object.values(this.data.members)
          .filter((m) => m.online)
          .forEach((m) => (m.coins = Math.min(100000, m.coins + 500)));
        break;
      case "kick":
        if (target === p.id || !target || !this.data.members[target])
          throw Error("Choose another guest.");
        this.data.members[target].banned = true;
        break;
      case "end":
        this.data.ended = true;
        break;
      case "finale": {
        const now = Date.now();
        if (this.data.finaleAt + 22000 > now)
          throw Error("The finale is already playing.");
        this.data.finaleAt = now + 5000;
        for (let i = 0; i < 9; i++)
          this.data.events.push({
            id: randomUUID(),
            item: i % 3 === 0 ? "multishot" : "aerial",
            player: p.id,
            x: ((i % 3) - 1) * 5,
            z: 18,
            seed: randomBytes(4).readUInt32LE(),
            start: this.data.finaleAt + i * 1100,
            duration: 11000,
            outcome: "normal",
            finale: true,
          });
        break;
      }
      default:
        throw Error("Unknown host action.");
    }
  }
  snapshot(now = Date.now()): Snapshot {
    this.data.shopActions=(this.data.shopActions??[]).filter(a=>a.start+a.duration>now);
    this.data.events = this.data.events.filter(
      (e) => e.start + e.duration + 2000 > now,
    );
    return {
      shopActions:this.data.shopActions,
      time: now,
      code: this.data.code,
      host: this.data.host,
      locked: this.data.locked,
      limit: this.data.limit,
      players: Object.values(this.data.members)
        .filter((p) => p.online)
        .map(
          ({ secret, coins, inventory, wardrobe, receipts, banned, ...p }) => p,
        ),
      events: this.data.events,
      finaleAt: this.data.finaleAt,
      lights: this.data.lights,
    };
  }
  self(p: Member): SelfState {
    return {
      id: p.id,
      coins: p.coins,
      inventory: p.inventory,
      wardrobe: p.wardrobe,
    };
  }
}
