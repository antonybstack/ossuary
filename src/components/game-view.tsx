import { useEffect, useRef, useState, type RefObject } from "react";
import { Ghost, Pause, Skull, Sword, Volume2, VolumeX, Wand2 } from "lucide-react";
import type { Engine } from "@/game/engine";
import { ARMORS, SOULS, WEAPONS, useGame } from "@/game/store";

export function GameView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const loadout = useGame((s) => s.loadout);
  const ready = useGame((s) => s.ready);
  const muted = useGame((s) => s.muted);
  const hud = useGame((s) => s.hud);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let engine: Engine | null = null;
    let cancelled = false;
    void import("@/game/engine").then(({ createEngine }) => {
      if (cancelled || !canvas.isConnected) return;
      engine = createEngine(canvas);
      engineRef.current = engine;
      engine.setLoadout(useGame.getState().loadout);
      engine.setMuted(useGame.getState().muted);
    });
    return () => {
      cancelled = true;
      engine?.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setLoadout(loadout);
  }, [loadout]);

  useEffect(() => {
    engineRef.current?.setMuted(muted);
  }, [muted]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full touch-none" />
      {hud.phase === "title" && (
        <TitleOverlay ready={ready} onStart={() => engineRef.current?.start()} />
      )}
      {hud.phase === "playing" && <PlayHud engine={engineRef} />}
      {hud.phase === "dead" && <DeathOverlay onRespawn={() => engineRef.current?.respawn()} />}
      {hud.paused && hud.phase === "playing" && <PauseOverlay />}
    </div>
  );
}

function TitleOverlay({ ready, onStart }: { ready: boolean; onStart: () => void }) {
  const loadout = useGame((s) => s.loadout);
  const setLoadout = useGame((s) => s.setLoadout);
  const muted = useGame((s) => s.muted);
  const setMuted = useGame((s) => s.setMuted);

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-6">
      <header className="pointer-events-auto flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xs tracking-[0.35em] text-subtle uppercase">Crypt of the First Bone</p>
          <h1 className="font-display mt-1 text-3xl leading-none tracking-tight text-fg sm:text-6xl">Ossuary</h1>
          <p className="mt-2 hidden max-w-md text-sm leading-relaxed text-muted sm:block">
            A playable undead hero. Rigged skull, ribcage, and twenty-four bones — customize the soul-fire, then hunt the graveyard.
          </p>
        </div>
        <button
          type="button"
          aria-label={muted ? "Unmute" : "Mute"}
          className="flex size-11 items-center justify-center rounded-md border border-border bg-surface text-fg"
          onClick={() => setMuted(!muted)}
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      </header>

      <section className="pointer-events-auto w-full max-w-xl rounded-xl border border-border bg-surface/90 p-3 sm:p-5">
        <label className="hidden text-xs font-medium tracking-wide text-muted uppercase sm:block">Name</label>
        <input
          value={loadout.name}
          maxLength={16}
          aria-label="Name"
          placeholder="Name"
          onChange={(e) => setLoadout({ name: e.target.value })}
          className="h-11 w-full rounded-md border border-border bg-raised px-3 text-sm text-fg outline-none focus:ring-1 focus:ring-ring sm:mt-1"
        />

        <p className="mt-3 hidden text-xs font-medium tracking-wide text-muted uppercase sm:block">Soul-fire</p>
        <div className="mt-2 flex gap-2">
          {SOULS.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-label={s.label}
              title={s.label}
              onClick={() => setLoadout({ soul: s.hex })}
              className={`size-11 rounded-md border ${loadout.soul === s.hex ? "border-primary ring-1 ring-ring" : "border-border"}`}
              style={{ background: s.hex }}
            />
          ))}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {WEAPONS.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setLoadout({ weapon: w.id })}
              className={`rounded-md border px-2 py-2 text-left ${loadout.weapon === w.id ? "border-primary bg-raised" : "border-border bg-bg"}`}
            >
              <span className="block text-sm font-medium text-fg">{w.label}</span>
              <span className="mt-0.5 hidden text-xs text-muted sm:block">{w.blurb}</span>
            </button>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          {ARMORS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setLoadout({ armor: a.id })}
              className={`rounded-md border px-2 py-2 text-left ${loadout.armor === a.id ? "border-primary bg-raised" : "border-border bg-bg"}`}
            >
              <span className="block text-sm font-medium text-fg">{a.label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={!ready}
          onClick={onStart}
          className="mt-3 flex h-12 w-full items-center justify-center rounded-md bg-primary font-display text-sm tracking-[0.2em] text-bg uppercase disabled:opacity-50"
        >
          Start
        </button>
        <p className="mt-2 hidden text-center text-xs text-subtle sm:block">
          WASD move · hold right mouse to look · Space attack · 1 2 3 skills
        </p>
      </section>
    </div>
  );
}

function PlayHud({ engine }: { engine: RefObject<Engine | null> }) {
  const hud = useGame((s) => s.hud);
  const loadout = useGame((s) => s.loadout);
  const muted = useGame((s) => s.muted);
  const setMuted = useGame((s) => s.setMuted);
  const hpPct = Math.max(0, hud.hp / hud.maxHp);
  const mpPct = Math.max(0, hud.mp / hud.maxMp);
  const xpPct = Math.max(0, hud.xp / hud.xpToLevel);

  return (
    <>
      <div className="pointer-events-none absolute inset-0 p-3 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 max-w-xs rounded-lg border border-border bg-surface/80 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-display truncate text-sm text-fg">{loadout.name}</p>
              <p className="font-mono text-xs text-muted">Lv {hud.level}</p>
            </div>
            <Bar pct={hpPct} tone="danger" />
            <Bar pct={mpPct} tone="mana" />
            <Bar pct={xpPct} tone="soul" slim />
          </div>

          {hud.targetName && (
            <div className="w-44 rounded-lg border border-border bg-surface/80 p-3">
              <p className="truncate text-xs tracking-wide text-muted uppercase">{hud.targetName}</p>
              <Bar pct={hud.targetHp / hud.targetMaxHp} tone="danger" />
            </div>
          )}

          <div className="pointer-events-auto flex items-center gap-2">
            <p className="hidden rounded-md border border-border bg-surface/80 px-3 py-2 font-mono text-xs text-muted sm:block">
              {hud.killCount} felled
            </p>
            <button
              type="button"
              className="flex size-11 items-center justify-center rounded-md border border-border bg-surface text-fg"
              aria-label={muted ? "Unmute" : "Mute"}
              onClick={() => setMuted(!muted)}
            >
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
          </div>
        </div>

        {hud.toast ? (
          <p className="mt-4 text-center font-display text-sm tracking-wide text-primary">{hud.toast}</p>
        ) : null}

        <div className="absolute right-3 bottom-24 left-3 flex justify-center sm:bottom-6">
          <div className="pointer-events-auto flex gap-2">
            <SkillBtn
              label="1"
              name="Slash"
              cd={hud.cd1}
              icon={<Sword className="size-4" />}
              onClick={() => engine.current?.pressSkill(1)}
            />
            <SkillBtn
              label="2"
              name="Drain"
              cd={hud.cd2}
              icon={<Wand2 className="size-4" />}
              onClick={() => engine.current?.pressSkill(2)}
            />
            <SkillBtn
              label="3"
              name="Raise"
              cd={hud.cd3}
              icon={<Ghost className="size-4" />}
              onClick={() => engine.current?.pressSkill(3)}
            />
          </div>
        </div>
      </div>
      <TouchLayer engine={engine} />
    </>
  );
}

function Bar({ pct, tone, slim }: { pct: number; tone: "danger" | "mana" | "soul"; slim?: boolean }) {
  const color = tone === "danger" ? "bg-danger" : tone === "mana" ? "bg-mana" : "bg-soul";
  return (
    <div className={`mt-1.5 overflow-hidden rounded-xs bg-bg ${slim ? "h-1" : "h-2"}`}>
      <div className={`h-full ${color}`} style={{ width: `${Math.round(Math.min(1, pct) * 100)}%` }} />
    </div>
  );
}

function SkillBtn({
  label,
  name,
  cd,
  icon,
  onClick,
}: {
  label: string;
  name: string;
  cd: number;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  const ready = cd <= 0.02;
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex size-12 items-center justify-center rounded-md border border-border bg-surface text-fg"
    >
      {icon}
      <span className="sr-only">{name}</span>
      <span className="absolute top-0.5 left-1 font-mono text-xs leading-none text-subtle">{label}</span>
      {!ready ? <span className="absolute inset-0 rounded-md bg-bg/70" /> : null}
    </button>
  );
}

function TouchLayer({ engine }: { engine: RefObject<Engine | null> }) {
  const [nub, setNub] = useState({ x: 0, y: 0 });
  const origin = useRef({ x: 0, y: 0, id: -1 });
  const lookId = useRef(-1);
  const last = useRef({ x: 0, y: 0 });

  return (
    <div className="pointer-events-none absolute inset-0 sm:hidden">
      <div
        className="pointer-events-auto absolute bottom-6 left-4 size-28 rounded-full border border-border bg-surface/40"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          origin.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
          setNub({ x: 0, y: 0 });
          engine.current?.setStick(0, 0, true);
        }}
        onPointerMove={(e) => {
          if (origin.current.id !== e.pointerId) return;
          const dx = e.clientX - origin.current.x;
          const dy = e.clientY - origin.current.y;
          const m = Math.hypot(dx, dy);
          const s = m > 46 ? 46 / m : 1;
          setNub({ x: dx * s, y: dy * s });
          engine.current?.setStick((dx * s) / 46, (-dy * s) / 46, true);
        }}
        onPointerUp={() => {
          origin.current.id = -1;
          setNub({ x: 0, y: 0 });
          engine.current?.setStick(0, 0, false);
        }}
      >
        <div
          className="absolute top-1/2 left-1/2 size-11 rounded-full bg-primary/80"
          style={{ transform: `translate(calc(-50% + ${nub.x}px), calc(-50% + ${nub.y}px))` }}
        />
      </div>
      <button
        type="button"
        className="pointer-events-auto absolute right-4 bottom-6 flex size-16 items-center justify-center rounded-full border border-border bg-surface text-fg"
        onPointerDown={() => engine.current?.pressAttack()}
        aria-label="Attack"
      >
        <Skull className="size-6" />
      </button>
      <div
        className="pointer-events-auto absolute inset-y-0 right-0 w-1/2"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          lookId.current = e.pointerId;
          last.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          if (e.pointerId !== lookId.current) return;
          engine.current?.lookDelta(e.clientX - last.current.x, e.clientY - last.current.y);
          last.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => {
          lookId.current = -1;
        }}
      />
    </div>
  );
}

function DeathOverlay({ onRespawn }: { onRespawn: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-bg/70 p-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-center">
        <Skull className="mx-auto size-8 text-muted" />
        <h2 className="font-display mt-3 text-2xl text-fg">Fallen</h2>
        <p className="mt-2 text-sm text-muted">The ossuary does not keep its dead for long.</p>
        <button
          type="button"
          className="mt-5 h-12 w-full rounded-md bg-primary font-display text-sm tracking-[0.18em] text-bg uppercase"
          onClick={onRespawn}
        >
          Rise again
        </button>
      </div>
    </div>
  );
}

function PauseOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-bg/60 p-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-center">
        <Pause className="mx-auto size-6 text-muted" />
        <h2 className="font-display mt-3 text-2xl text-fg">Paused</h2>
        <p className="mt-2 text-sm text-muted">Press Escape to resume.</p>
      </div>
    </div>
  );
}
