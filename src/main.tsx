import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  ChevronLeft,
  Copy,
  Flame,
  Gift,
  MapPin,
  MessageCircle,
  Music2,
  Settings,
  ShoppingBag,
  Shirt,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
  X,
  Camera,
  Home,
  LogOut,
  Lock,
  Unlock,
  Send,
  Compass,
  Plus,
  Minus,
} from "lucide-react";
import { FestivalWorld } from "./game/world";
import { Connection, type Profile } from "./network";
import {
  fireworks,
  outfits,
  zones,
  emotes,
  type Snapshot,
  type SelfState,
  type AvatarType,
} from "../shared/catalog";
import "./style.css";
import {VoiceControls} from './voice';
import {TouchControls} from './TouchControls';
type Panel =
  | "crackers"
  | "textiles"
  | "inventory"
  | "wardrobe"
  | "friends"
  | "chat"
  | "settings"
  | "map"
  | "emotes"
  | null;
function App() {
  const canvas = useRef<HTMLCanvasElement>(null),
    game = useRef<FestivalWorld | null>(null),
    connection = useRef<Connection | null>(null);
  const [stage, setStage] = useState<"landing" | "onboard" | "game">("landing"),
    [mode, setMode] = useState<"create" | "join">("create"),
    [profile, setProfile] = useState<Profile>({
      name: localStorage.getItem("deepavali-name") ?? "",
      type: "female",
    }),
    [code, setCode] = useState(
      new URLSearchParams(location.search).get("room") ?? "",
    ),
    [limit, setLimit] = useState(10),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [snapshot, setSnapshot] = useState<Snapshot>(),
    [self, setSelf] = useState<SelfState>(),
    [panel, setPanel] = useState<Panel>(null),
    [toast, setToast] = useState(""),
    [selected, setSelected] = useState("flowerpot"),
    [placing, setPlacing] = useState(false),
    [quality, setQuality] = useState(()=>matchMedia('(pointer: coarse)').matches||innerWidth<=700?'low':'high'),
    [reduced, setReduced] = useState(
      matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [volume, setVolume] = useState(0.75),
    [masterVolume,setMasterVolume]=useState(1),
    [speakers,setSpeakers]=useState<string[]>([]),
    [fps, setFps] = useState(0),
    [chat, setChat] = useState<{ id: string; name: string; text: string }[]>(
      [],
    ),
    [message, setMessage] = useState(""),
    [previewOutfit, setPreviewOutfit] = useState(""),
    [now, setNow] = useState(Date.now()),
    [hideUI, setHideUI] = useState(false),
    [sound, setSound] = useState(false),
    [copied, setCopied] = useState(false),
    [purchase, setPurchase] = useState<string | null>(null);
  const stateRef = useRef({ stage, panel, placing, selected });
  stateRef.current = { stage, panel, placing, selected };
  const me = snapshot?.players.find((p) => p.id === self?.id),
    host = !!self && snapshot?.host === self.id;
  const near = me
    ? Math.hypot(me.x - 10, me.z - 2) < 5
      ? "crackers"
      : Math.hypot(me.x + 10, me.z - 2) < 5
        ? "textiles"
        : Math.hypot(me.x, me.z + 5) < 5
          ? "lights"
          : null
    : null;
  const notify = (s: string) => setToast(s);
  useEffect(() => {
    if (!canvas.current) return;
    try {
      const w = new FestivalWorld(canvas.current);
      game.current = w;
      w.onStatus = setError;
      w.onStats = setFps;
      w.onInput = (x, z, run) => connection.current?.move(x, z, run);
      w.onInteract = () => {
        const state = stateRef.current;
        if (state.placing) {
          const p = w.placementPosition();
          connection.current?.command("launch", { item: state.selected, ...p });
          setPlacing(false);
          w.setPlacement("");
          return;
        }
        const p = w.snapshot?.players.find((p) => p.id === w.selfId);
        if (!p) return;
        if (Math.hypot(p.x - 10, p.z - 2) < 5) setPanel("crackers");
        else if (Math.hypot(p.x + 10, p.z - 2) < 5) setPanel("textiles");
        else if (Math.hypot(p.x, p.z + 5) < 5)
          connection.current?.command("lights");
        else notify("Visit a shop counter or the entrance lamps.");
      };
      w.onShortcut = (key) => {
        if (stateRef.current.stage !== "game") return;
        if (key === "Escape") {
          setPanel((p) => (p ? null : "settings"));
          setPlacing(false);
          w.setPlacement("");
        }
        if (key === "i") setPanel("inventory");
        if (key === "m") setPanel("map");
        if (key === "g") setPanel("emotes");
        if (key === " ")
          connection.current?.command("emote", { item: "Celebrate" });
      };
      return () => {
        w.dispose();
        connection.current?.close();
      };
    } catch (e) {
      setError(
        "3D graphics could not start. Please use a WebGL2-capable browser.",
      );
    }
  }, []);
  useEffect(() => {
    if (game.current) {
      game.current.inputBlocked = !!panel || stage !== "game";
      game.current.settings(quality, reduced, sound ? volume*masterVolume : 0);
    }
  }, [panel, stage, quality, reduced, volume, sound,masterVolume]);
  useEffect(() => {
    if (game.current && self) game.current.selfId = self.id;
  }, [self?.id]);
  useEffect(() => {
    const t = setInterval(
      () => setNow(Date.now() + (connection.current?.offset ?? 0)),
      100,
    );
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (game.current) game.current.previewOutfit = previewOutfit;
  }, [previewOutfit]);
  useEffect(() => {
    if (panel !== "textiles" && panel !== "wardrobe") setPreviewOutfit("");
    setPurchase(null);
  }, [panel]);
  async function enter(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const c = new Connection();
    connection.current = c;
    c.onSnapshot = (s) => {
      setSnapshot(s);
      game.current?.setSnapshot(s);
    };
    c.onSelf = setSelf;
    c.onStatus = setStatus;
    c.onClock = (o) => {
      if (game.current) game.current.offset = o;
    };
    c.onResult = (r) =>
      notify(r.message ?? (r.ok ? "Done" : "Please try again."));
    c.onChat = (m) => setChat((old) => [...old.slice(-79), m]);
    try {
      const room = await c.connect(code, profile, mode === "create", limit);
      setCode(room);
      localStorage.setItem("deepavali-name", profile.name);
      history.replaceState({}, "", `?room=${room}`);
      setStage("game");
      setPanel(null);
      game.current?.audio.enable();
      setSound(true);
    } catch (e) {
      setError((e as Error).message);
      c.close();
    } finally {
      setBusy(false);
    }
  }
  function leave() {
    connection.current?.close();
    connection.current = null;
    setStage("landing");
    setSnapshot(undefined);
    setSelf(undefined);
    setPanel(null);
    setStatus("");
    history.replaceState({}, "", "/");
    if (game.current) {
      game.current.snapshot = undefined;
      for (const a of game.current.actors.values()) {
        a.model.dispose();
        a.root.dispose();
      }
      game.current.actors.clear();
      game.current.selfId = "";
    }
  }
  const command = (action: string, data: Record<string, unknown> = {}) => {
    if (status !== "Connected") {
      notify("Wait for your connection to recover.");
      return;
    }
    connection.current?.command(action, data);
  };
  const openOnboard = (m: "create" | "join") => {
    setMode(m);
    setError("");
    setStage("onboard");
  };
  const title: Record<string, string> = {
    crackers: "The cracker corner",
    textiles: "Chennai silks",
    inventory: "Your festival bag",
    wardrobe: "Your wardrobe",
    friends: "Celebrating together",
    chat: "Neighbourhood chat",
    settings: "Make yourself comfortable",
    map: "Around the neighbourhood",
    emotes: "Say it with a gesture",
  };
  const count = Object.values(self?.inventory ?? {}).reduce((a, b) => a + b, 0);
  const finale = snapshot?.finaleAt ?? 0;
  const countdown = Math.ceil((finale - now) / 1000);
  return (
    <main
      className={
        "app " +
        (stage === "game" ? "playing" : "") +
        (hideUI ? " hide-ui" : "")
      }
    >
      <canvas
        ref={canvas}
        className="world-canvas"
        aria-label="Interactive 3D Chennai celebration"
        tabIndex={0}
      />
      <div className="vignette" />
      {stage !== "game" && (
        <>
          <header className="landing-header">
            <a className="brand" href="/" aria-label="Virtual Chennai home">
              <span className="brand-mark">
                <Flame size={23} />
              </span>
              <span>
                VIRTUAL CHENNAI
                <span className="brand-sub">A LITTLE CLOSER TO HOME</span>
              </span>
            </a>
            <div className="header-right">
              <span className="date-pill">
                <span /> 08 NOVEMBER 2026
              </span>
              <button
                className="icon-button"
                aria-label={sound ? "Mute sound" : "Enable sound"}
                onClick={() => {
                  game.current?.audio.enable();
                  setSound(!sound);
                }}
              >
                {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
              </button>
            </div>
          </header>
          {stage === "landing" ? (
            <section className="landing-content">
              <div className="eyebrow">
                <span className="tiny-line" /> CHENNAI, TAMIL NADU · DEEPAVALI
                2026
              </div>
              <p className="tamil-greeting">வாங்க, கொண்டாடலாம்.</p>
              <h1>
                A thousand lights.
                <br />
                Your favourite
                <br />
                <em>people.</em>
              </h1>
              <p className="intro">Virtual Chennai Deepavali 2026</p>
              <p className="intro-sub">
                Celebrate Deepavali together, wherever you are!
                <br />
                One neighbourhood. One shared sky. All of us, together.
              </p>
              <div className="landing-actions">
                <button
                  className="primary"
                  onClick={() => openOnboard("create")}
                >
                  Create Celebration <ArrowUpRight size={19} />
                </button>
                <button
                  className="secondary"
                  onClick={() => openOnboard("join")}
                >
                  Join Friends <ArrowRight size={18} />
                </button>
              </div>
              <div className="landing-notes">
                <span>
                  <Users size={15} /> A private celebration with friends
                </span>
                <span>
                  <Gift size={15} /> Free festival coins
                </span>
              </div>
              <div className="slice-label">
                PLAYABLE DEVELOPMENT BUILD <span>·</span> Reference art in
                progress
              </div>
            </section>
          ) : (
            <section className="onboarding">
              <button
                className="back-button"
                onClick={() => setStage("landing")}
              >
                <ChevronLeft size={16} /> Back to the neighbourhood
              </button>
              <div className="onboard-grid">
                <form onSubmit={enter}>
                  <div className="eyebrow">
                    {mode === "create"
                      ? "MAKE ROOM FOR EVERYONE"
                      : "YOUR FRIENDS ARE WAITING"}
                  </div>
                  <h2>
                    Your evening
                    <br />
                    starts here.
                  </h2>
                  <p className="muted">
                    A name, a character, and you’re part of the celebration.
                  </p>
                  <label>
                    Your name
                    <input
                      required
                      maxLength={24}
                      value={profile.name}
                      placeholder="What should your friends call you?"
                      onChange={(e) =>
                        setProfile({ ...profile, name: e.target.value })
                      }
                    />
                  </label>
                  {mode === "join" ? (
                    <label>
                      Invitation code
                      <input
                        required
                        value={code}
                        maxLength={10}
                        placeholder="10-character room code"
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                      />
                    </label>
                  ) : (
                    <label>
                      Room for
                      <select
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                      >
                        {[2, 4, 6, 8, 10, 12].map((n) => (
                          <option value={n} key={n}>
                            {n} friends
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>Character type</label>
                  <div className="character-options">
                    {(["female", "male"] as AvatarType[]).map((type) => (
                      <button
                        type="button"
                        className={profile.type === type ? "selected" : ""}
                        key={type}
                        onClick={() => setProfile({ ...profile, type })}
                      >
                        {type === "female" ? "Female" : "Male"}{" "}
                        {profile.type === type && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                  <p className="privacy-note">
                    No selfie or account needed. Photo mapping is not enabled in
                    this build; no photos are collected. Character appearance
                    and animations are still being refined.
                  </p>
                  {error && (
                    <p className="error" role="alert">
                      {error}
                    </p>
                  )}
                  <button
                    disabled={busy || !profile.name.trim()}
                    className="primary full"
                  >
                    {busy
                      ? "Opening your celebration…"
                      : mode === "create"
                        ? "Create & enter celebration"
                        : "Join celebration"}
                    <ArrowRight size={18} />
                  </button>
                  <p className="small muted">
                    Your guest identity stays in this browser. Rooms expire
                    after 24 hours.
                  </p>
                </form>
                <div className="character-preview">
                  <AvatarPreview type={profile.type} />
                  <div className="preview-caption">
                    <span>YOUR CHARACTER</span>
                    <strong>{profile.name || "A new friend"}</strong>
                    <small>Drag to rotate · Reference avatar preview</small>
                  </div>
                </div>
              </div>
            </section>
          )}
          <footer className="landing-footer">
            <span>இனிய தீபாவளி நல்வாழ்த்துகள்!</span>
            <span>
              <MapPin size={14} /> Chennai, from wherever you are.
            </span>
            <span className="live-label">
              <i /> A shared, living celebration
            </span>
          </footer>
          <div className="scene-caption">
            <span className="caption-line" />
            <span>
              THE NEIGHBOURHOOD
              <br />
              <strong>A little piece of Chennai.</strong>
            </span>
            <Compass size={29} />
          </div>
        </>
      )}
      {stage === "game" && (
        <div className="game-ui">
          {connection.current&&self&&snapshot&&<VoiceControls connection={connection.current} selfId={self.id} snapshot={snapshot} masterVolume={masterVolume} onSpeakersChange={ids=>setSpeakers(old=>old.join()===ids.join()?old:ids)}/>}
          <header className="game-header">
            <div className="game-brand">
              <Flame size={24} />
              <div>
                CHENNAI <span>DEEPAVALI ’26</span>
              </div>
            </div>
            <button className="room-chip" onClick={() => setPanel("friends")}>
              <span
                className={
                  "connection-dot " + (status === "Connected" ? "" : "offline")
                }
              />{" "}
              {code}
              <Users size={15} />
              {snapshot?.players.length ?? 1}/{snapshot?.limit ?? limit}
            </button>
            <div className="wallet">
              <span className="coin">✦</span>
              {self?.coins.toLocaleString() ?? "—"}
              <span>festival coins</span>
            </div>
            <button
              className="avatar-chip"
              onClick={() => setPanel("wardrobe")}
            >
              {profile.name.slice(0, 1).toUpperCase()}
            </button>
          </header>
          <div className="location-card">
            <span className="eyebrow">
              VANAKKAM, {profile.name.toUpperCase()}
            </span>
            <strong>
              {near === "crackers"
                ? "The cracker corner"
                : near === "textiles"
                  ? "Chennai silks"
                  : me && me.z > 8
                    ? "The celebration ground"
                    : "Festival street"}
            </strong>
            <span>
              <MapPin size={13} /> Chennai · A shared Deepavali evening
            </span>
          </div>
          <button
            className="mini-map"
            onClick={() => setPanel("map")}
            aria-label="Open neighbourhood map"
          >
            <MapDrawing me={me} players={snapshot?.players ?? []} />
            <span>
              <Compass size={13} /> NEIGHBOURHOOD
            </span>
          </button>
          <div className="right-rail">
            <button
              title="Friends"
              aria-label="Friends"
              onClick={() => setPanel("friends")}
            >
              <Users size={20} />
            </button>
            <button
              title="Chat"
              aria-label="Chat"
              onClick={() => setPanel("chat")}
            >
              <MessageCircle size={20} />
              {chat.length > 0 && <i />}
            </button>
            <button
              title="Save photo"
              aria-label="Save photo"
              onClick={() => game.current?.screenshot()}
            >
              <Camera size={20} />
            </button>
            <button title="Look at skyshots" aria-label="Look at skyshots" onClick={()=>game.current?.lookAtSky()}><Sparkles size={20}/></button>
            <button
              title="Settings"
              aria-label="Settings"
              onClick={() => setPanel("settings")}
            >
              <Settings size={20} />
            </button>
          </div>
          {status !== "Connected" && (
            <div className="connection-banner" role="status">
              {status}{" "}
              {status.includes("ended") || status.includes("Removed") ? (
                <button onClick={leave}>Return home</button>
              ) : null}
            </div>
          )}
          {finale > 0 && now < finale + 20000 && (
            <div className="finale-banner">
              {countdown > 0 ? (
                <>
                  <span>OUR SKY. OUR CELEBRATION.</span>
                  <strong>{countdown}</strong>
                </>
              ) : (
                <>
                  <span>இனிய தீபாவளி நல்வாழ்த்துகள்!</span>
                  <strong>Happy Deepavali!</strong>
                </>
              )}
            </div>
          )}
          <div className="bottom-hud">
            <div className="controls-hint">
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd>
              <span>Move</span>
              <span className="hint-divider" />
              <span>Drag to look · Scroll to zoom</span>
            </div>
            {placing ? (
              <div className="interaction placement-prompt">
                <Sparkles size={20} />
                <span>Position the ring inside the celebration ground</span>
                <button onClick={() => game.current?.onInteract()}>
                  Place & light <kbd>E</kbd>
                </button>
                <button
                  className="icon-button"
                  aria-label="Cancel placement"
                  onClick={() => {
                    setPlacing(false);
                    game.current?.setPlacement("");
                  }}
                >
                  <X size={17} />
                </button>
              </div>
            ) : near ? (
              <button
                className="interaction"
                onClick={() => game.current?.onInteract()}
              >
                <kbd>E</kbd>
                {near === "crackers"
                  ? "Browse the cracker shop"
                  : near === "textiles"
                    ? "Explore festival fabrics"
                    : "Switch entrance lamps"}
                <ArrowRight size={17} />
              </button>
            ) : (
              <div className="gentle-hint">
                {me && me.z > 8
                  ? "Choose a firework from your festival bag."
                  : "The shops are open. Come in, have a look."}
              </div>
            )}
            <nav className="dock">
              <button
                onClick={() => setPanel("inventory")}
                className={panel === "inventory" ? "active" : ""}
              >
                <ShoppingBag size={21} />
                <span>Festival bag</span>
                <b>{count}</b>
              </button>
              <button onClick={() => setPanel("wardrobe")}>
                <Shirt size={21} />
                <span>Wardrobe</span>
              </button>
              <button
                className="dock-center"
                onClick={() => setPanel("emotes")}
              >
                <Sparkles size={23} />
                <span>Celebrate</span>
              </button>
              <button
                onClick={() => {
                  command("center");
                  setPanel(null);
                }}
              >
                <Home size={21} />
                <span>Gathering</span>
              </button>
              <button
                onClick={() => {
                  game.current?.audio.enable();
                  setSound(!sound);
                }}
              >
                {sound ? <Volume2 size={21} /> : <VolumeX size={21} />}
                <span>{sound ? "Sound on" : "Sound off"}</span>
              </button>
            </nav>
          </div>
          <TouchControls disabled={!!panel||hideUI}
            onMove={(x,y,run)=>{if(game.current){game.current.stick={x,y};game.current.touchRun=run;}}}
            onLook={(x,y)=>{if(game.current)game.current.lookStick={x,y};}}
            onInteract={()=>game.current?.onInteract()}/>
          {panel && (
            <div className="panel-scrim" onClick={() => setPanel(null)}>
              <aside
                className={"panel " + (panel === "map" ? "map-panel" : "")}
                onClick={(e) => e.stopPropagation()}
              >
                <header>
                  <div>
                    <span className="eyebrow">YOUR DEEPAVALI EVENING</span>
                    <h2>{title[panel]}</h2>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="Close panel"
                    onClick={() => setPanel(null)}
                  >
                    <X size={23} />
                  </button>
                </header>
                <div className="panel-body">
                  {(panel === "crackers" || panel === "inventory") && (
                    <>
                      <p className="muted">
                        {panel === "crackers"
                          ? "Vanakkam! Find a little sparkle for your evening. All prices use free festival coins."
                          : "Your sky, your colours. Choose a firework, then place it in the celebration ground."}
                      </p>
                      <div className="catalog">
                        {fireworks.map((f) => (
                          <button
                            key={f.id}
                            className={
                              "item-card " + (selected === f.id ? "chosen" : "")
                            }
                            onClick={() => {
                              setSelected(f.id);
                              setPurchase(null);
                            }}
                          >
                            <FireworkIcon kind={f.kind} color={f.color} />
                            <span className="item-copy">
                              <small>{f.tamil}</small>
                              <strong>{f.name}</strong>
                              <span>
                                {panel === "inventory"
                                  ? `${self?.inventory[f.id] ?? 0} in your bag`
                                  : `✦ ${f.price} coins`}
                              </span>
                            </span>
                            {selected === f.id && <Check size={17} />}
                          </button>
                        ))}
                      </div>
                      <div className="selection-detail">
                        <p>
                          {
                            fireworks.find((f) => f.id === selected)
                              ?.description
                          }
                        </p>
                        {panel === "crackers" ? (
                          <button
                            className="primary full"
                            onClick={() => setPurchase(selected)}
                          >
                            Buy for ✦{" "}
                            {fireworks.find((f) => f.id === selected)?.price}
                            <ShoppingBag size={17} />
                          </button>
                        ) : (
                          <button
                            className="primary full"
                            disabled={!self?.inventory[selected]}
                            onClick={() => {
                              if (!me || Math.hypot(me.x, me.z - 15) > 9) {
                                notify(
                                  "Go to the celebration ground first, or use Gathering.",
                                );
                                return;
                              }
                              setPlacing(true);
                              game.current?.setPlacement(selected);
                              setPanel(null);
                            }}
                          >
                            Place this firework
                            <Flame size={17} />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                  {(panel === "textiles" || panel === "wardrobe") && (
                    <>
                      <p className="muted">
                        {panel === "textiles"
                          ? "Explore festival colours. Preview a fabric palette on your character before buying."
                          : "Wear a colour you love. Your confirmed outfit is visible to your friends."}
                      </p>
                      <p className="art-note">
                        Fabric colour preview · tailored garments and saree
                        demonstrations are still in development.
                      </p>
                      <div className="outfit-catalog">
                        {outfits
                          .filter(
                            (o) =>
                              (o.type === "all" || o.type === profile.type) &&
                              (panel === "textiles" ||
                                self?.wardrobe.includes(o.id)),
                          )
                          .map((o) => (
                            <button
                              key={o.id}
                              className={
                                "outfit-card " +
                                ((previewOutfit || me?.outfit) === o.id
                                  ? "chosen"
                                  : "")
                              }
                              onClick={() => setPreviewOutfit(o.id)}
                            >
                              <div
                                className="fabric-swatch"
                                style={{ backgroundColor: o.color }}
                              >
                                <span />
                              </div>
                              <strong>{o.name}</strong>
                              <small>
                                {self?.wardrobe.includes(o.id)
                                  ? "In your wardrobe"
                                  : `✦ ${o.price} coins`}
                              </small>
                            </button>
                          ))}
                      </div>
                      {previewOutfit && (
                        <>
                          <AvatarPreview
                            type={profile.type}
                            outfit={previewOutfit}
                          />
                          <div className="button-row">
                            <button
                              className="secondary"
                              onClick={() => setPreviewOutfit("")}
                            >
                              Revert
                            </button>
                            <button
                              className="primary"
                              onClick={() => {
                                if (self?.wardrobe.includes(previewOutfit)) {
                                  command("wear", { item: previewOutfit });
                                  setPreviewOutfit("");
                                } else setPurchase(previewOutfit);
                              }}
                            >
                              {self?.wardrobe.includes(previewOutfit)
                                ? "Wear this outfit"
                                : "Purchase"}
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                  {purchase && (
                    <div
                      className="purchase-confirm"
                      role="alertdialog"
                      aria-label="Confirm purchase"
                    >
                      <strong>Confirm your purchase</strong>
                      <p>
                        {
                          [...fireworks, ...outfits].find(
                            (i) => i.id === purchase,
                          )?.name
                        }{" "}
                        · ✦{" "}
                        {
                          [...fireworks, ...outfits].find(
                            (i) => i.id === purchase,
                          )?.price
                        }{" "}
                        festival coins
                      </p>
                      <div className="button-row">
                        <button
                          className="secondary"
                          onClick={() => setPurchase(null)}
                        >
                          Cancel
                        </button>
                        <button
                          className="primary"
                          onClick={() => {
                            command("buy", { item: purchase });
                            setPurchase(null);
                          }}
                        >
                          Confirm purchase
                        </button>
                      </div>
                    </div>
                  )}
                  {panel === "friends" && (
                    <>
                      <p className="muted">
                        Send an invitation. Share the evening.
                      </p>
                      <div className="invite-card">
                        <span>YOUR PRIVATE ROOM</span>
                        <strong>{code}</strong>
                        <button
                          className="primary full"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(
                                location.origin + "/?room=" + code,
                              );
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2500);
                            } catch {
                              notify(
                                "Copy the invitation from your browser address bar.",
                              );
                            }
                          }}
                        >
                          {copied ? <Check size={17} /> : <Copy size={17} />}{" "}
                          {copied
                            ? "Invitation copied"
                            : "Copy invitation link"}
                        </button>
                      </div>
                      <div className="participants">
                        {snapshot?.players.map((p) => (
                          <div key={p.id}>
                            <span className="person-circle">{p.name[0]}</span>
                            <span>
                              <strong>
                                {p.name}
                                {p.id === self?.id ? " (you)" : ""}
                              </strong>
                              <small>
                                {speakers.includes(p.id)?'Speaking now':p.id === snapshot.host
                                  ? "Celebration host"
                                  : "Here to celebrate"}
                              </small>
                            </span>
                            {host && p.id !== self?.id && (
                              <button
                                className="text-button"
                                onClick={() =>
                                  command("host", {
                                    item: "kick",
                                    target: p.id,
                                  })
                                }
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {host && (
                        <div className="host-controls">
                          <span className="eyebrow">HOST CONTROLS</span>
                          <button
                            className="primary full"
                            disabled={finale + 22000 > now}
                            onClick={() => {
                              command("host", { item: "finale" });
                              setPanel(null);
                            }}
                          >
                            Start Grand Finale <Sparkles size={19} />
                          </button>
                          <button
                            className="secondary full"
                            onClick={() => command("host", { item: "coins" })}
                          >
                            <Gift size={17} /> Give everyone 500 coins
                          </button>
                          <button
                            className="secondary full"
                            onClick={() => command("host", { item: "lock" })}
                          >
                            {snapshot?.locked ? (
                              <Lock size={17} />
                            ) : (
                              <Unlock size={17} />
                            )}{" "}
                            {snapshot?.locked
                              ? "Open room to new friends"
                              : "Close room to new friends"}
                          </button>
                          <label>
                            Participant limit
                            <select
                              value={snapshot?.limit}
                              onChange={(e) =>
                                command("host", {
                                  item: "limit",
                                  value: Number(e.target.value),
                                })
                              }
                            >
                              {Array.from({ length: 11 }, (_, i) => (
                                <option key={i} value={i + 2}>
                                  {i + 2} friends
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            className="danger-link"
                            onClick={() => {
                              if (confirm("End this celebration for everyone?"))
                                command("host", { item: "end" });
                            }}
                          >
                            End celebration for everyone
                          </button>
                        </div>
                      )}
                      {!host &&
                        snapshot &&
                        !snapshot.players.some(
                          (p) => p.id === snapshot.host,
                        ) && (
                          <p className="muted">
                            The host is away. The room stays open for their
                            return.
                          </p>
                        )}
                    </>
                  )}
                  {panel === "chat" && (
                    <>
                      <p className="muted">
                        Keep it kind. Messages are shared with this room and are
                        not saved after you leave.
                      </p>
                      <div className="messages" aria-live="polite">
                        {chat.length ? (
                          chat.map((m, i) => (
                            <div key={m.id + i}>
                              <strong>{m.name}</strong>
                              <p>{m.text}</p>
                            </div>
                          ))
                        ) : (
                          <div className="empty-state">
                            <MessageCircle size={32} />
                            <p>
                              Be the first to say
                              <br />
                              “Happy Deepavali!”
                            </p>
                          </div>
                        )}
                      </div>
                      <form
                        className="chat-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (message.trim()) {
                            command("chat", { text: message });
                            setMessage("");
                          }
                        }}
                      >
                        <input
                          aria-label="Chat message"
                          placeholder="Say something nice…"
                          maxLength={240}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                        />
                        <button className="primary" aria-label="Send message">
                          <Send size={18} />
                        </button>
                      </form>
                    </>
                  )}
                  {panel === "settings" && (
                    <>
                      <label>
                        Graphics quality
                        <select
                          value={quality}
                          onChange={(e) => setQuality(e.target.value)}
                        >
                          <option value="low">Low · lighter effects</option>
                          <option value="medium">Medium</option>
                          <option value="high">High · full sparkle</option>
                        </select>
                      </label>
                      <label className="toggle-label">
                        <span>
                          Reduced flashes
                          <small>
                            Dim particles and disable firework light flashes
                          </small>
                        </span>
                        <input
                          type="checkbox"
                          checked={reduced}
                          onChange={(e) => setReduced(e.target.checked)}
                        />
                      </label>
                      <label>
                        Master volume · {Math.round(masterVolume*100)}%
                        <input aria-label="Master volume" type="range" min="0" max="1" step=".05" value={masterVolume} onChange={e=>setMasterVolume(Number(e.target.value))}/>
                      </label>
                      <label>
                        Sound effects · {Math.round(volume * 100)}%
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step=".05"
                          value={volume}
                          onChange={(e) => setVolume(Number(e.target.value))}
                        />
                      </label>
                      <button
                        className="secondary full"
                        onClick={() => {
                          game.current?.audio.enable();
                          setSound(!sound);
                        }}
                      >
                        {sound ? "Mute sound" : "Enable sound"}
                      </button>
                      <p className="muted">
                        Voice chat is not configured. Use neighbourhood text
                        chat to keep in touch.
                      </p>
                      <div className="stats">
                        <span>Current render rate</span>
                        <strong>{fps} FPS</strong>
                      </div>
                      <p className="small muted">
                        This is a live reading on this device, not a performance
                        guarantee.
                      </p>
                      <button
                        className="secondary full"
                        onClick={() => {
                          setPanel(null);
                          setHideUI(true);
                          setTimeout(() => {
                            game.current?.screenshot();
                            setHideUI(false);
                          }, 300);
                        }}
                      >
                        <Camera size={17} /> Save a clean group photo
                      </button>
                      <button className="danger-link" onClick={leave}>
                        <LogOut size={16} /> Leave celebration
                      </button>
                      <details>
                        <summary>About this development build</summary>
                        <p className="small muted">
                          Licensed reference characters: Babylon.js Assets (CC
                          BY 4.0) and Indian Man In Dhoti by anandmohan662 (CC BY 4.0), modified with garment repairs and animations. Original scene geometry
                          and experimental drapes. No facial photos are
                          collected. Realistic Chennai models, tailored
                          garments, cloth animation and voice are not yet
                          complete.
                        </p>
                      </details>
                    </>
                  )}
                  {panel === "map" && (
                    <>
                      <p className="muted">
                        Meet on Festival Street, shop for the evening, then
                        gather under the lights.
                      </p>
                      <MapDrawing
                        me={me}
                        players={snapshot?.players ?? []}
                        large
                      />
                      <div className="map-legend">
                        <span>
                          <i className="map-dot" /> You
                        </span>
                        <span>
                          <i className="map-dot friend" /> Friends
                        </span>
                      </div>
                      <div className="map-destinations">
                        <div>
                          <Shirt />
                          <span>
                            <strong>Chennai silks</strong>
                            <small>West side · Festival colours</small>
                          </span>
                        </div>
                        <div>
                          <ShoppingBag />
                          <span>
                            <strong>The cracker corner</strong>
                            <small>East side · Something for the sky</small>
                          </span>
                        </div>
                        <div>
                          <Sparkles />
                          <span>
                            <strong>Celebration ground</strong>
                            <small>
                              North end · Launch your fireworks here
                            </small>
                          </span>
                        </div>
                      </div>
                      <button
                        className="primary full"
                        onClick={() => {
                          command("center");
                          setPanel(null);
                        }}
                      >
                        Return to the gathering <ArrowRight size={17} />
                      </button>
                    </>
                  )}
                  {panel === "emotes" && (
                    <>
                      <p className="muted">
                        A little joy goes a long way. Your friends see your
                        selected gesture.
                      </p>
                      <div className="emote-grid">
                        {emotes.map((e, i) => (
                          <button
                            key={e}
                            onClick={() => {
                              command("emote", { item: e });
                              setPanel(null);
                            }}
                          >
                            <span>{["👋", "🙏", "♫", "👏", "✦"][i]}</span>
                            {e}
                          </button>
                        ))}
                      </div>
                      <p className="small muted">
                        Reference rigs currently support walking, idle and
                        limited gestures; other gestures are announced above the
                        character.
                      </p>
                    </>
                  )}
                </div>
              </aside>
            </div>
          )}
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Sparkles size={17} />
          {toast}
        </div>
      )}
      {error && stage !== "onboard" && (
        <div className="error-banner" role="alert">
          {error}
          <button
            className="icon-button"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </main>
  );
}
function AvatarPreview({
  type,
  outfit = "ivory",
}: {
  type: AvatarType;
  outfit?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null),
    w = useRef<FestivalWorld | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const world = new FestivalWorld(ref.current, true);
    w.current = world;
    world.selfId = "preview";
    world.setSnapshot({
      time: Date.now(),
      code: "",
      host: "",
      locked: false,
      limit: 1,
      events: [],
      finaleAt: 0,
      lights: true,
      players: [
        {
          id: "preview",
          name: "",
          type,
          outfit,
          x: 0,
          z: 0,
          yaw: Math.PI,
          moving: false,
          emote: "",
          emoteUntil: 0,
          online: true,
        },
      ],
    });
    return () => {
      world.dispose();
      w.current = null;
    };
  }, [type]);
  useEffect(() => {
    if (w.current) w.current.previewOutfit = outfit;
  }, [outfit]);
  return (
    <canvas
      className="avatar-preview-canvas"
      ref={ref}
      aria-label="Rotate your 3D avatar preview"
    />
  );
}
function FireworkIcon({ kind, color }: { kind: string; color: string }) {
  return (
    <span
      className={"firework-art " + kind}
      style={{ "--spark": color } as React.CSSProperties}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <i
          key={i}
          style={{ transform: `rotate(${i * 40}deg) translateY(-15px)` }}
        />
      ))}
      <b />
    </span>
  );
}
function MapDrawing({
  me,
  players,
  large = false,
}: {
  me?: { x: number; z: number };
  players: { x: number; z: number; id: string }[];
  large?: boolean;
}) {
  const px = (x: number) => 100 + x * 3.3,
    py = (z: number) => 160 - z * 4;
  return (
    <svg
      className={"map-drawing " + (large ? "large" : "")}
      viewBox="0 0 200 230"
      role="img"
      aria-label="Map: textile shop west, cracker shop east, celebration ground north"
    >
      <rect width="200" height="230" rx="12" fill="#202d33" />
      <path d="M80 10h40v210H80zM20 140h160v27H20z" fill="#47534e" />
      <rect x="68" y="53" width="65" height="65" rx="20" fill="#786c49" />
      <circle
        cx="100"
        cy="85"
        r="24"
        fill="none"
        stroke="#ccad6c"
        strokeDasharray="2 4"
      />
      <rect x="22" y="135" width="45" height="29" rx="3" fill="#785460" />
      <rect x="134" y="135" width="45" height="29" rx="3" fill="#667a63" />
      {[20, 180].map((x) => (
        <g key={x}>
          {[30, 80, 190].map((y) => (
            <rect
              key={y}
              x={x === 20 ? 22 : 139}
              y={y}
              width="39"
              height="25"
              rx="2"
              fill="#34413f"
            />
          ))}
        </g>
      ))}
      {large && (
        <>
          <text x="100" y="40" textAnchor="middle">
            CELEBRATION GROUND
          </text>
          <text x="45" y="128" textAnchor="middle">
            TEXTILES
          </text>
          <text x="157" y="128" textAnchor="middle">
            CRACKERS
          </text>
          <text x="100" y="211" textAnchor="middle">
            FESTIVAL STREET
          </text>
        </>
      )}
      {players.map((p) => (
        <circle key={p.id} cx={px(p.x)} cy={py(p.z)} r="3" fill="#e8c577" />
      ))}
      {me && (
        <>
          <circle
            cx={px(me.x)}
            cy={py(me.z)}
            r="7"
            fill="#b5ecc4"
            opacity=".2"
          />
          <circle
            cx={px(me.x)}
            cy={py(me.z)}
            r="3.5"
            fill="#b5ecc4"
            stroke="white"
          />
        </>
      )}
    </svg>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
