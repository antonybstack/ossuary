export type WeaponId = "sword" | "scythe" | "staff";
export type ArmorId = "bare" | "shroud" | "plate";
export type Phase = "title" | "playing" | "dead";

export type Loadout = {
  name: string;
  soul: string;
  weapon: WeaponId;
  armor: ArmorId;
};

export type HudSnapshot = {
  phase: Phase;
  paused: boolean;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  xp: number;
  xpToLevel: number;
  level: number;
  targetName: string | null;
  targetHp: number;
  targetMaxHp: number;
  cd1: number;
  cd2: number;
  cd3: number;
  toast: string;
  killCount: number;
};

export type ControlsProbe = {
  getYaw: () => number;
  getSpeed: () => number;
  setKeys?: (codes: string[]) => void;
  setSteer?: (v: number) => void;
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
  }
}

export {};
