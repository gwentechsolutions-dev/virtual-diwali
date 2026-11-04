import { Client, type Room } from "colyseus.js";
import type { Snapshot, SelfState, AvatarType } from "../shared/catalog";
const api = import.meta.env.VITE_SERVER_URL ?? "";
const ws =
  import.meta.env.VITE_WS_URL ??
  `${location.protocol === "https:" ? "wss" : "ws"}://${location.hostname}${location.port === "5173" ? ":2567" : location.port ? ":" + location.port : ""}`;
export interface Profile {
  name: string;
  type: AvatarType;
}
async function roomResponse(response:Response) {
 const data=await response.json().catch(()=>null);
 if(!data)throw Error('The celebration server is unavailable. Please try again shortly.');
 if(!response.ok)throw Error(data.error??'Could not connect to the celebration.');
 return data;
}
export class Connection {
  api=api;
  ws=ws;
  private configured=false;
  async configureBackend(){
    if(this.configured||api||import.meta.env.VITE_WS_URL||!import.meta.env.PROD)return;
    const response=await fetch('/api/game-config',{cache:'no-store'});
    const config=await response.json().catch(()=>null);
    // Same-origin Node deployments don't need a separate configuration route.
    if(response.status===404||!config)return;
    if(!response.ok)throw Error(config.error??'The multiplayer server is unavailable.');
    if(typeof config.api!=='string'||typeof config.ws!=='string')throw Error('The multiplayer server connection is incomplete.');
    this.api=config.api;this.ws=config.ws;this.configured=true;
  }
  room?: Room;
  stopped = false;
  code = "";
  profile!: Profile;
  secret = "";
  offset = 0;
  timer?: ReturnType<typeof setInterval>;
  attempt = 0;
  onSnapshot = (s: Snapshot) => {};
  onSelf = (s: SelfState) => {};
  onStatus = (s: string) => {};
  onResult = (r: any) => {};
  onChat = (m: any) => {};
  onClock = (offset: number) => {};
  onVoiceRoster=(ids:string[])=>{};
  onVoiceSignal=(signal:any)=>{};
  onVoiceConfig=(config:RTCConfiguration)=>{};
  onVoiceDisconnect=()=>{};
  async connect(code: string, profile: Profile, create = false, limit = 10) {
    this.profile = profile;
    this.stopped = false;
    this.onStatus("Connecting");
    await this.configureBackend();
    let info;
    if (create) {
      const r = await fetch(this.api + "/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit }),
      });
      info = await roomResponse(r);
      if (!r.ok) throw Error(info.error ?? "Could not create celebration.");
    } else {
      const r = await fetch(
        this.api + "/api/rooms/" + encodeURIComponent(code.trim().toUpperCase()),
      );
      info = await roomResponse(r);
      if (!r.ok) throw Error(info.error ?? "Celebration not found.");
    }
    this.code = info.code;
    const key = "deepavali-guest-" + this.code;
    this.secret =
      localStorage.getItem(key) ??
      Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) =>
        v.toString(16).padStart(2, "0"),
      ).join("");
    localStorage.setItem(key, this.secret);
    await this.join(info.roomId);
    return this.code;
  }
  async join(roomId: string) {
    const room = await new Client(this.ws).joinById(roomId, {
      ...this.profile,
      secret: this.secret,
    });
    if (this.stopped) {
      void room.leave();
      return;
    }
    this.room = room;
    room.onMessage('voice-roster',ids=>this.onVoiceRoster(ids));
    room.onMessage('voice-signal',signal=>this.onVoiceSignal(signal));
    room.onMessage('voice-config',config=>this.onVoiceConfig(config));
    this.attempt = 0;
    room.onMessage("welcome", () => {});
    room.onMessage("snapshot", (s: Snapshot) => this.onSnapshot(s));
    room.onMessage("self", (s: SelfState) => this.onSelf(s));
    room.onMessage("chat", (m) => this.onChat(m));
    room.onMessage("result", (r) => this.onResult(r));
    room.onMessage("pong", ({ sent, time }) => {
      const sample = time - (sent + Date.now()) / 2;
      this.offset =
        this.offset === 0 ? sample : this.offset * 0.7 + sample * 0.3;
      this.onClock(this.offset);
    });
    room.onError((_code, message) =>
      this.onStatus(message ?? "Connection error"),
    );
    room.onLeave((code) => {
      this.onVoiceDisconnect();
      clearInterval(this.timer);
      if (this.stopped) return;
      if (code === 4003 || code === 4004) {
        this.stopped = true;
        this.onStatus(code === 4003 ? "Removed by host" : "Celebration ended");
        return;
      }
      void this.reconnect();
    });
    this.timer = setInterval(() => room.send("ping", Date.now()), 2000);
    room.send("ping", Date.now());
    this.onStatus("Connected");
  }
  async reconnect() {
    if (this.stopped) return;
    this.onStatus("Reconnecting");
    await new Promise((r) =>
      setTimeout(r, Math.min(1000 * 2 ** this.attempt++, 10000)),
    );
    if (this.stopped) return;
    try {
      const res = await fetch(this.api + "/api/rooms/" + this.code);
      const info = await res.json();
      if (!res.ok) throw Error(info.error);
      await this.join(info.roomId);
    } catch (e) {
      if (this.attempt < 8) void this.reconnect();
      else this.onStatus("Connection lost — reload to rejoin");
    }
  }
  command(action: string, data: Record<string, unknown> = {}) {
    const id = crypto.randomUUID();
    this.room?.send("command", { id, action, ...data });
    return id;
  }
  move(dx: number, dz: number, run: boolean) {
    if (this.room?.connection.isOpen)
      this.room.send("move", {
        dx: Math.max(-1, Math.min(1, dx)),
        dz: Math.max(-1, Math.min(1, dz)),
        run,
      });
  }
  close() {
    this.stopped = true;
    clearInterval(this.timer);
    void this.room?.leave();
  }
}
