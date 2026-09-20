import { create } from "zustand";
import type { ArmorId, HudSnapshot, Loadout, Phase, WeaponId } from "./types";

export const SOULS = [
  { id: "teal", hex: "#6fbfa3", label: "Verdigris" },
  { id: "crimson", hex: "#c45c4a", label: "Crimson" },
  { id: "ice", hex: "#8eb4c8", label: "Glacial" },
  { id: "ember", hex: "#c47a52", label: "Ember" },
] as const;

export const WEAPONS: { id: WeaponId; label: string; blurb: string }[] = [
  { id: "sword", label: "Longsword", blurb: "Close steel. Fast swings." },
  { id: "scythe", label: "Grave Scythe", blurb: "Wide harvest. Longer reach." },
  { id: "staff", label: "Bone Staff", blurb: "Soul bolts. Fight from afar." },
];

export const ARMORS: { id: ArmorId; label: string; blurb: string }[] = [
  { id: "bare", label: "Bare Bone", blurb: "Nothing but the grave." },
  { id: "shroud", label: "Grave Shroud", blurb: "Tattered burial cloth." },
  { id: "plate", label: "Boneplate", blurb: "Ribs bound as armor." },
];

const hudInit: HudSnapshot = {
  phase: "title",
  paused: false,
  hp: 120,
  maxHp: 120,
  mp: 80,
  maxMp: 80,
  xp: 0,
  xpToLevel: 80,
  level: 1,
  targetName: null,
  targetHp: 0,
  targetMaxHp: 1,
  cd1: 0,
  cd2: 0,
  cd3: 0,
  toast: "",
  killCount: 0,
};

type GameStore = {
  loadout: Loadout;
  hud: HudSnapshot;
  ready: boolean;
  muted: boolean;
  setLoadout: (patch: Partial<Loadout>) => void;
  setHud: (patch: Partial<HudSnapshot>) => void;
  setPhase: (phase: Phase) => void;
  setReady: (ready: boolean) => void;
  setMuted: (muted: boolean) => void;
};

export const useGame = create<GameStore>((set) => ({
  loadout: { name: "Ashen", soul: "#6fbfa3", weapon: "sword", armor: "shroud" },
  hud: hudInit,
  ready: false,
  muted: false,
  setLoadout: (patch) => set((s) => ({ loadout: { ...s.loadout, ...patch } })),
  setHud: (patch) => set((s) => ({ hud: { ...s.hud, ...patch } })),
  setPhase: (phase) => set((s) => ({ hud: { ...s.hud, phase } })),
  setReady: (ready) => set({ ready }),
  setMuted: (muted) => set({ muted }),
}));
