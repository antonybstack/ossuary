export function createAudio() {
  let ctx: AudioContext | null = null;
  const master = { gain: null as GainNode | null, muted: false };
  let drone: { stop: () => void } | null = null;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC({ latencyHint: "interactive" });
    const g = ctx.createGain();
    g.gain.value = 0.7;
    g.connect(ctx.destination);
    master.gain = g;
    return ctx;
  }

  function resume() {
    const c = ensure();
    if (c.state === "suspended") void c.resume();
  }

  function bus() {
    const c = ensure();
    return master.gain ?? c.destination;
  }

  function envGain(duration: number, peak = 0.2) {
    const c = ensure();
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(peak, c.currentTime + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    g.connect(bus());
    return g;
  }

  function noiseBuffer() {
    const c = ensure();
    const len = c.sampleRate * 0.25;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  let noise: AudioBuffer | null = null;

  function clack(rate = 1) {
    const c = ensure();
    const o = c.createOscillator();
    o.type = "triangle";
    o.frequency.value = (220 + Math.random() * 80) * rate;
    const g = envGain(0.09, 0.07);
    o.connect(g);
    o.start();
    o.stop(c.currentTime + 0.1);
  }

  function whoosh() {
    const c = ensure();
    if (!noise) noise = noiseBuffer();
    const src = c.createBufferSource();
    src.buffer = noise;
    src.playbackRate.value = 0.7 + Math.random() * 0.4;
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 900;
    const g = envGain(0.22, 0.12);
    src.connect(f);
    f.connect(g);
    src.start();
  }

  function hit() {
    const c = ensure();
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(140, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(50, c.currentTime + 0.16);
    const g = envGain(0.18, 0.16);
    o.connect(g);
    o.start();
    o.stop(c.currentTime + 0.2);
    clack(0.6);
  }

  function cast() {
    const c = ensure();
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(320, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(720, c.currentTime + 0.25);
    const g = envGain(0.32, 0.1);
    o.connect(g);
    o.start();
    o.stop(c.currentTime + 0.32);
  }

  function levelUp() {
    const c = ensure();
    [440, 554, 659].forEach((f, i) => {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const g = envGain(0.4, 0.08);
      o.connect(g);
      o.start(c.currentTime + i * 0.07);
      o.stop(c.currentTime + 0.4 + i * 0.07);
    });
  }

  function death() {
    const c = ensure();
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(180, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.8);
    const g = envGain(0.9, 0.12);
    o.connect(g);
    o.start();
    o.stop(c.currentTime + 0.9);
  }

  function startDrone() {
    if (drone) return;
    const c = ensure();
    const o1 = c.createOscillator();
    const o2 = c.createOscillator();
    o1.type = "sine";
    o2.type = "triangle";
    o1.frequency.value = 55;
    o2.frequency.value = 82.5;
    const g = c.createGain();
    g.gain.value = 0.03;
    o1.connect(g);
    o2.connect(g);
    g.connect(bus());
    o1.start();
    o2.start();
    drone = {
      stop() {
        o1.stop();
        o2.stop();
        g.disconnect();
      },
    };
  }

  function setMuted(m: boolean) {
    master.muted = m;
    const c = ctx;
    if (c && master.gain) {
      master.gain.gain.setTargetAtTime(m ? 0 : 0.7, c.currentTime, 0.04);
    }
  }

  return {
    resume,
    clack,
    whoosh,
    hit,
    cast,
    levelUp,
    death,
    startDrone,
    setMuted,
    dispose() {
      drone?.stop();
      drone = null;
      void ctx?.close();
      ctx = null;
    },
  };
}

export type AudioHandle = ReturnType<typeof createAudio>;
