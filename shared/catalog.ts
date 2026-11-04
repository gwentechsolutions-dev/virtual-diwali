export const fireworks = [
  {
    id: "sparkler",
    name: "Golden sparklers",
    tamil: "கம்பி மத்தாப்பு",
    price: 40,
    color: "#ffd27a",
    duration: 8000,
    kind: "sparkler",
    description: "A soft shower of gold, close to the ground.",
  },
  {
    id: "flowerpot",
    name: "Flower pot",
    tamil: "பூந்தொட்டி",
    price: 80,
    color: "#ffb84d",
    duration: 7000,
    kind: "fountain",
    description: "A rising fountain of warm, crackling sparks.",
  },
  {
    id: "chakra",
    name: "Ground chakra",
    tamil: "சங்கு சக்கரம்",
    price: 65,
    color: "#a0e7e5",
    duration: 6500,
    kind: "chakra",
    description: "A whirling circle of silver and turquoise.",
  },
  {
    id: "rocket",
    name: "Sky rocket",
    tamil: "ராக்கெட்",
    price: 110,
    color: "#ff8ca5",
    duration: 6500,
    kind: "rocket",
    description: "A climbing trail and a rose-gold starburst.",
  },
  {
    id: "serial",
    name: "Celebration string",
    tamil: "சரவெடி",
    price: 90,
    color: "#ffcb82",
    duration: 6000,
    kind: "serial",
    description: "A rhythmic sequence of small ground bursts.",
  },
  {
    id: "aerial",
    name: "Chennai chrysanthemum",
    tamil: "வான வேடிக்கை",
    price: 150,
    color: "#b4a0ff",
    duration: 7000,
    kind: "aerial",
    description: "A wide violet bloom across the evening sky.",
  },
  {
    id: "comet",
    name: "Emerald comet",
    tamil: "பச்சை ஒளி",
    price: 95,
    color: "#8df2b7",
    duration: 5500,
    kind: "comet",
    description: "A green arc with a long golden ember tail.",
  },
  {
    id: "multishot",
    name: "Festival sky bouquet",
    tamil: "வண்ண வானம்",
    price: 220,
    color: "#f9a4e4",
    duration: 11000,
    kind: "multishot",
    description: "Three staggered blooms, one shared sky.",
  },
  {"kind":"single","color":"#ffe4ae","id":"single","duration":2500,"description":"One crisp ground flash and a short spark crown.","name":"Festival flash","price":45,"tamil":"தீபாவளி ஒளி"},
  {"kind":"colour-fountain","color":"#66edc2","id":"colour-fountain","duration":9000,"description":"Emerald, ruby and silver fountain phases.","name":"Three-colour fountain","price":120,"tamil":"தீபாவளி ஒளி"},
  {"kind":"peacock","color":"#7ee6f5","id":"peacock-fountain","duration":10000,"description":"Five spreading jets and a silver finish.","name":"Peacock fan","price":180,"tamil":"தீபாவளி ஒளி"},
  {"kind":"waterfall","color":"#ffd58a","id":"waterfall","duration":11000,"description":"A curtain of falling golden embers.","name":"Golden waterfall","price":160,"tamil":"தீபாவளி ஒளி"},
  {"kind":"crackle","color":"#fff2bc","id":"crackle","duration":7000,"description":"Scattered silver crackles above a rising spray.","name":"Crackling cloud","price":130,"tamil":"தீபாவளி ஒளி"},
  {"kind":"willow","color":"#f6c56c","id":"willow","duration":10000,"description":"Long golden trails form a cascading canopy.","name":"Marina golden willow","price":200,"tamil":"தீபாவளி ஒளி"},
  {"kind":"palm","color":"#ffc879","id":"palm","duration":8500,"description":"Eight branches open above a glittering trunk.","name":"Coconut palm crown","price":175,"tamil":"தீபாவளி ஒளி"},
  {"kind":"ring","color":"#c8a2ff","id":"ring","duration":7500,"description":"An expanding violet ring with silver tips.","name":"Violet sky ring","price":170,"tamil":"தீபாவளி ஒளி"},
  {"kind":"colour-peony","color":"#ff6179","id":"colour-peony","duration":8000,"description":"Ruby stars change to emerald as they fade.","name":"Ruby to emerald peony","price":190,"tamil":"தீபாவளி ஒளி"},
  {"kind":"display-pack","color":"#ffcf9a","id":"display-pack","duration":18000,"description":"Six timed layered blooms and golden tails.","name":"Chennai sky symphony","price":450,"tamil":"தீபாவளி ஒளி"},
] as const;
export const outfits = [
  {
    id: "ivory",
    name: "Ivory & temple gold",
    type: "all",
    price: 0,
    color: "#eee0bc",
    description: "Your complimentary festival palette.",
  },
  {
    id: "maroon",
    name: "Kanchipuram ruby",
    type: "female",
    price: 250,
    color: "#8c2445",
    description: "Ruby silk palette with a gold border.",
  },
  {
    id: "peacock",
    name: "Peacock silk",
    type: "female",
    price: 280,
    color: "#137d82",
    description: "Deep teal with warm zari gold.",
  },
  {
    id: "saffron",
    name: "Saffron silk shirt",
    type: "male",
    price: 180,
    color: "#d88832",
    description: "A warm saffron festival palette.",
  },
  {
    id: "indigo",
    name: "Midnight blue",
    type: "all",
    price: 220,
    color: "#3a4e90",
    description: "Indigo silk palette for the evening.",
  },
] as const;
export type FireworkId = (typeof fireworks)[number]["id"];
export type AvatarType = "male" | "female";
export type Outcome = "normal" | "delayed" | "brief" | "weak" | "no-burst";
export interface FireworkEvent {
  id: string;
  item: FireworkId;
  player: string;
  x: number;
  z: number;
  seed: number;
  start: number;
  duration: number;
  outcome: Outcome;
  finale?: boolean;
}
export interface PublicPlayer {
  id: string;
  name: string;
  type: AvatarType;
  outfit: string;
  x: number;
  z: number;
  yaw: number;
  moving: boolean;
  running?: boolean;
  photoReady?:boolean;
  emote: string;
  emoteUntil: number;
  online: boolean;
}
export interface SelfState {
  id: string;
  coins: number;
  inventory: Record<string, number>;
  wardrobe: string[];
}
export interface Snapshot {
  photoScene?:PhotoScene;
  shopActions?: ShopAction[];
  time: number;
  code: string;
  host: string;
  locked: boolean;
  limit: number;
  players: PublicPlayer[];
  events: FireworkEvent[];
  finaleAt: number;
  lights: boolean;
}
export interface PhotoScene {id:string;start:number;end:number;pose:'Wave'|'Idle';participants:string[]}
export interface ShopAction {
  id:string;
  shop:'textiles'|'crackers';
  player:string;
  item:string;
  start:number;
  duration:number;
}
export const zones = {
  textiles: { x: -10, z: 2, r: 5 },
  crackers: { x: 10, z: 2, r: 5 },
  celebration: { x: 0, z: 15, r: 9 },
};
export const emotes = [
  "Wave",
  "Namaste",
  "Dance",
  "Clap",
  "Celebrate",
] as const;
export function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function isWalkable(x: number, z: number) {
  return (
    Math.abs(x) <= 19 &&
    z >= -15 &&
    z <= 26 &&
    !(Math.abs(x) > 7 && (z < -3 || z > 7))
  );
}
