const GAME_CODES = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyQ",
  "KeyE",
  "KeyR",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "Tab",
  "Digit1",
  "Digit2",
  "Digit3",
  "Escape",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyC",
]);

export type Actions = {
  moveX: number;
  moveY: number;
  sprint: boolean;
  attack: boolean;
  skill1: boolean;
  skill2: boolean;
  skill3: boolean;
  tab: boolean;
  pause: boolean;
};

export type TouchStick = { x: number; y: number; active: boolean };

export function createInput(canvas: HTMLCanvasElement) {
  const keys = new Set<string>();
  let injected: string[] | null = null;
  let lookDx = 0;
  let lookDy = 0;
  const stick: TouchStick = { x: 0, y: 0, active: false };
  let pointerLocked = false;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  const prev = { attack: false, skill1: false, skill2: false, skill3: false, tab: false, pause: false };

  const onKeyDown = (e: KeyboardEvent) => {
    if (GAME_CODES.has(e.code)) e.preventDefault();
    keys.add(e.code);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keys.delete(e.code);
  };
  const clear = () => keys.clear();

  const onMouseMove = (e: MouseEvent) => {
    if (pointerLocked) {
      lookDx += e.movementX;
      lookDy += e.movementY;
    } else if (dragging) {
      lookDx += e.clientX - lastX;
      lookDy += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
    }
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button === 2) {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      e.preventDefault();
    }
  };
  const onPointerUp = (e: PointerEvent) => {
    if (e.button === 2) dragging = false;
  };

  const onContext = (e: Event) => e.preventDefault();

  const onLockChange = () => {
    pointerLocked = document.pointerLockElement === canvas;
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clear);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clear();
  });
  window.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("contextmenu", onContext);
  document.addEventListener("pointerlockchange", onLockChange);

  function held(code: string) {
    if (injected) return injected.includes(code);
    return keys.has(code);
  }

  function sample(): Actions & {
    lookDx: number;
    lookDy: number;
    justAttack: boolean;
    justSkill1: boolean;
    justSkill2: boolean;
    justSkill3: boolean;
    justTab: boolean;
    justPause: boolean;
  } {
    let mx = 0;
    let my = 0;
    if (held("KeyA") || held("ArrowLeft")) mx -= 1;
    if (held("KeyD") || held("ArrowRight")) mx += 1;
    if (held("KeyW") || held("ArrowUp")) my += 1;
    if (held("KeyS") || held("ArrowDown")) my -= 1;
    if (stick.active) {
      mx += stick.x;
      my += stick.y;
    }
    const mag = Math.hypot(mx, my);
    if (mag > 1) {
      mx /= mag;
      my /= mag;
    }

    const attack = held("Space") || keys.has("Mouse0");
    const skill1 = held("Digit1");
    const skill2 = held("Digit2") || held("KeyQ");
    const skill3 = held("Digit3") || held("KeyE") || held("KeyR");
    const tab = held("Tab");
    const pause = held("Escape");

    const dx = lookDx;
    const dy = lookDy;
    lookDx = 0;
    lookDy = 0;

    const result = {
      moveX: mx,
      moveY: my,
      sprint: held("ShiftLeft") || held("ShiftRight"),
      attack,
      skill1,
      skill2,
      skill3,
      tab,
      pause,
      lookDx: dx,
      lookDy: dy,
      justAttack: attack && !prev.attack,
      justSkill1: skill1 && !prev.skill1,
      justSkill2: skill2 && !prev.skill2,
      justSkill3: skill3 && !prev.skill3,
      justTab: tab && !prev.tab,
      justPause: pause && !prev.pause,
    };
    prev.attack = attack;
    prev.skill1 = skill1;
    prev.skill2 = skill2;
    prev.skill3 = skill3;
    prev.tab = tab;
    prev.pause = pause;
    return result;
  }

  return {
    sample,
    stick,
    setInjected(codes: string[] | null) {
      injected = codes;
    },
    requestLock() {
      if (canvas.requestPointerLock) canvas.requestPointerLock();
    },
    exitLock() {
      if (document.pointerLockElement) document.exitPointerLock();
    },
    noteMouseDown() {
      keys.add("Mouse0");
    },
    noteMouseUp() {
      keys.delete("Mouse0");
    },
    dispose() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clear);
      window.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("contextmenu", onContext);
      document.removeEventListener("pointerlockchange", onLockChange);
    },
  };
}

export type InputHandle = ReturnType<typeof createInput>;
