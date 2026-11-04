import express from "express";
import { rateLimit } from "express-rate-limit";
import { createServer } from "node:http";
import { randomBytes,createHmac } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { Room, Server, matchMaker, type Client } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { z } from "zod";
import { World, type Member, type SavedWorld } from "./world.js";
import {saveJsonAtomic} from './storage.js';
const dir = resolve(process.env.DATA_DIR ?? "data");
mkdirSync(dir, { recursive: true });
const rooms = new Map<string, CelebrationRoom>();
const ticket = randomBytes(32).toString("hex");
const joinSchema = z.object({
  secret: z.string().regex(/^[a-f0-9]{64}$/),
  name: z
    .string()
    .trim()
    .min(1)
    .max(24)
    .regex(/^[\p{L}\p{N} ._'’-]+$/u),
  type: z.enum(["male", "female"]),
});
const cmdSchema = z.object({
  id: z.string().uuid(),
  action: z.enum([
    "buy",
    "wear",
    "launch",
    "emote",
    "host",
    "center",
    "lights",
    "chat",
  ]),
  item: z.string().max(40).optional(),
  x: z.number().finite().optional(),
  z: z.number().finite().optional(),
  target: z.string().max(64).optional(),
  value: z.number().finite().optional(),
  text: z.string().trim().min(1).max(240).optional(),
});
class CelebrationRoom extends Room {
  world!: World;
  members = new Map<string, Member>();
  inputs = new Map<
    string,
    { dx: number; dz: number; run: boolean; at: number }
  >();
  rates = new Map<string, number[]>();
  voiceMembers=new Set<string>();
  voiceRoster(){this.broadcast('voice-roster',[...this.voiceMembers]);}
  dirty = false;
  lastSaveWarning=0;
  onCreate(options: any) {
    if (options.ticket !== ticket)
      throw Error("Use the celebration creation endpoint.");
    this.world = new World(options.saved, options.limit);
    this.maxClients = 12;
    this.autoDispose = false;
    this.setPrivate(true);
    rooms.set(this.world.data.code, this);
    this.persist();
    this.onMessage('voice-state',(c,v)=>{
      if(!this.allow(c,4,'voice-state')||typeof v!=='boolean')return;
      const p=this.members.get(c.sessionId);if(!p)return;
      if(v){
        this.voiceMembers.add(p.id);
        const iceServers:RTCIceServer[]=[];
        if(process.env.VOICE_STUN_URL)iceServers.push({urls:process.env.VOICE_STUN_URL});
        if(process.env.VOICE_TURN_URL&&process.env.VOICE_TURN_SECRET){
          const username=`${Math.floor(Date.now()/1000)+3600}:${p.id}`;
          iceServers.push({urls:process.env.VOICE_TURN_URL,username,credential:createHmac('sha1',process.env.VOICE_TURN_SECRET).update(username).digest('base64')});
        }
        c.send('voice-config',{iceServers});
      }else this.voiceMembers.delete(p.id);
      this.voiceRoster();
    });
    this.onMessage('voice-signal',(c,v)=>{
      if(!this.allow(c,60,'voice-signal'))return;
      const p=this.members.get(c.sessionId);if(!p||!this.voiceMembers.has(p.id))return;
      const parsed=z.object({to:z.string().max(64),description:z.object({type:z.enum(['offer','answer']),sdp:z.string().max(64000)}).optional(),candidate:z.object({candidate:z.string().max(4096),sdpMid:z.string().max(256).nullable().optional(),sdpMLineIndex:z.number().int().min(0).max(100).nullable().optional(),usernameFragment:z.string().max(256).nullable().optional()}).optional()}).safeParse(v);
      if(!parsed.success||!this.voiceMembers.has(parsed.data.to)||p.id===parsed.data.to)return;
      const target=this.clients.find(cl=>this.members.get(cl.sessionId)?.id===parsed.data.to);
      target?.send('voice-signal',{...parsed.data,from:p.id});
    });
    this.onMessage("ping", (c, v) => {
      if (typeof v === "number" && this.allow(c, 60))
        c.send("pong", { sent: v, time: Date.now() });
    });
    this.onMessage("move", (c, v) => {
      if (!this.allow(c, 100)) return;
      const r = z
        .object({
          dx: z.number().finite().min(-1).max(1),
          dz: z.number().finite().min(-1).max(1),
          run: z.boolean(),
        })
        .safeParse(v);
      if (r.success)
        this.inputs.set(c.sessionId, { ...r.data, at: Date.now() });
    });
    this.onMessage("command", (c, v) => {
      try {
        if (!this.allow(c, 100) || !this.allow(c, 8, "command"))
          throw Error("Please slow down.");
        const m = cmdSchema.parse(v),
          p = this.members.get(c.sessionId)!;
        let result: unknown = { message: "Done" };
        switch (m.action) {
          case "buy":
            result = this.world.buy(p, m.item ?? "", m.id);
            break;
          case "wear":
            this.world.wear(p, m.item ?? "");
            break;
          case "launch":
            result = this.world.launch(
              p,
              m.item ?? "",
              m.id,
              m.x ?? NaN,
              m.z ?? NaN,
            );
            break;
          case "emote":
            this.world.emote(p, m.item ?? "");
            break;
          case "center":
            p.x = 0;
            p.z = 10;
            break;
          case "lights":
            if (Math.hypot(p.x, p.z + 5) > 5)
              throw Error("Approach the entrance lamps.");
            this.world.data.lights = !this.world.data.lights;
            break;
          case "chat":
            if (!m.text) throw Error("Enter a message.");
            if (!this.allow(c, 5, "chat"))
              throw Error("Please wait before sending another message.");
            this.broadcast("chat", {
              id: m.id,
              name: p.name,
              text: m.text,
              time: Date.now(),
            });
            break;
          case "host":
            result = this.world.transaction(p, m.id, () => {
              this.world.hostAction(p, m.item ?? "", m.target, m.value);
              return { message: "Celebration updated" };
            });
            if (m.item === "kick")
              for (const cl of this.clients) {
                if (this.members.get(cl.sessionId)?.banned) cl.leave(4003);
              }
            if (m.item === "end") {
              this.persist();
              void this.disconnect(4004);
            }
            break;
        }
        this.persist();
        c.send("result", { id: m.id, ok: true, ...(result as object) });
        this.sendState();
      } catch (e) {
        c.send("result", {
          id: v?.id,
          ok: false,
          message:
            e instanceof z.ZodError ? "Invalid request." : (e as Error).message,
        });
      }
    });
    this.setSimulationInterval((dt) => {
      for (const [sid, p] of this.members) {
        const i = this.inputs.get(sid);
        this.world.move(
          p,
          i && Date.now() - i.at < 300 ? i.dx : 0,
          i && Date.now() - i.at < 300 ? i.dz : 0,
          i?.run ?? false,
          dt / 1000,
        );
      }
      this.dirty = true;
    }, 50);
    this.clock.setInterval(() => this.sendState(), 100);
    this.clock.setInterval(() => {
      if (this.dirty) this.persist();
      if (Date.now() - this.world.data.created > 86400000) {
        this.world.data.ended = true;
        this.persist();
        void this.disconnect(4004);
      }
    }, 2000);
  }
  allow(c: Client, max: number, kind = "all") {
    const key = c.sessionId + kind,
      now = Date.now(),
      a = (this.rates.get(key) ?? []).filter((t) => t > now - 1000);
    a.push(now);
    this.rates.set(key, a.slice(-110));
    return a.length <= max;
  }
  onAuth(_c: Client, options: any) {
    return joinSchema.parse(options);
  }
  onJoin(c: Client, options: any) {
    const o = joinSchema.parse(options);
    const p = this.world.join(o.secret, o.name, o.type);
    this.members.set(c.sessionId, p);
    this.persist();
    c.send("welcome", { id: p.id, code: this.world.data.code });
    this.sendState();
  }
  onLeave(c: Client) {
    const p = this.members.get(c.sessionId);
    if(p&&this.voiceMembers.delete(p.id))this.voiceRoster();
    if (p) p.online = false;
    this.members.delete(c.sessionId);
    this.inputs.delete(c.sessionId);
    this.rates.delete(c.sessionId + "all");
    this.rates.delete(c.sessionId + "chat");
    this.rates.delete(c.sessionId + "command");
    this.persist();
    this.sendState();
  }
  onDispose() {
    rooms.delete(this.world.data.code);
    this.persist();
    if (this.world.data.ended)
      unlinkSync(join(dir, this.world.data.code + ".json"));
  }
  sendState() {
    const state = this.world.snapshot();
    for (const c of this.clients) {
      const p = this.members.get(c.sessionId);
      if (p) {
        c.send("snapshot", state);
        c.send("self", this.world.self(p));
      }
    }
  }
  persist() {
    const path = join(dir, this.world.data.code + ".json");
    const error=saveJsonAtomic(path,this.world.data);
    this.dirty=!!error;
    if(error&&Date.now()-this.lastSaveWarning>30000){
      this.lastSaveWarning=Date.now();
      console.warn(`Room ${this.world.data.code} save deferred; retaining in-memory state and retrying: ${error.message}`);
    }
  }
}
const app = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = process.env.PUBLIC_ORIGIN;
  if (origin && allowed && origin !== allowed)
    return void res.status(403).json({ error: "Origin not allowed." });
  if (origin && (!allowed || origin === allowed)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return void res.sendStatus(204);
  res.header("X-Content-Type-Options", "nosniff");
  res.header("Referrer-Policy", "same-origin");
  next();
});
app.use(express.json({ limit: "4kb" }));
app.use(
  "/api",
  rateLimit({
    windowMs: 60000,
    limit: 40,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.post("/api/rooms", async (req, res) => {
  try {
    if (rooms.size >= 100)
      return void res.status(503).json({ error: "Server is full. Try later." });
    const limit = z
      .number()
      .int()
      .min(2)
      .max(12)
      .default(10)
      .parse(req.body.limit);
    const r = await matchMaker.createRoom("celebration", { ticket, limit });
    const room = [...rooms.values()].find((room) => room.roomId === r.roomId)!;
    res.json({ roomId: r.roomId, code: room.world.data.code });
  } catch {
    res.status(400).json({ error: "Choose a guest limit from 2 to 12." });
  }
});
app.get("/api/rooms/:code", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room || room.world.data.ended)
    return void res.status(404).json({
      error: "Celebration not found or expired. Check your invitation.",
    });
  res.json({ roomId: room.roomId, code: room.world.data.code });
});
app.use(express.static(resolve("dist")));
app.get("*", (_req, res) => res.sendFile(resolve("dist/index.html")));
const http = createServer(app);
const game = new Server({
  transport: new WebSocketTransport({
    server: http,
    maxPayload: 8192,
    verifyClient: ({ origin }, cb) =>
      cb(
        !process.env.PUBLIC_ORIGIN ||
          !origin ||
          origin === process.env.PUBLIC_ORIGIN,
        403,
        "Origin not allowed",
      ),
  }),
});
game.define("celebration", CelebrationRoom);
await game.listen(Number(process.env.PORT ?? 2567), "0.0.0.0");
for (const file of readdirSync(dir).filter((f) =>
  /^[A-F0-9]{10}\.json$/.test(f),
)) {
  try {
    const saved: SavedWorld = JSON.parse(readFileSync(join(dir, file), "utf8"));
    if (!saved.ended && Date.now() - saved.created < 86400000)
      await matchMaker.createRoom("celebration", { ticket, saved });
    else unlinkSync(join(dir, file));
  } catch (e) {
    console.error("Could not restore room", file, (e as Error).message);
  }
}
console.log(
  `Deepavali server listening on http://localhost:${process.env.PORT ?? 2567}`,
);
