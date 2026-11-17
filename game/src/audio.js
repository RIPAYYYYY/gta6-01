// Synthesized sound for Neon Bay Nights: every effect is a WebAudio oscillator
// or noise burst made at run time. No audio files, no network, nothing to load.
export function createAudio() {
  const audio = {
    ctx: null,
    muted: false,
    engineOsc: null,
    engineGain: null,
    sirenOsc: null,
    sirenGain: null,
    musicTimer: 0,
    musicStep: 0,
  };

  function ensure() {
    if (audio.ctx) return audio.ctx;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audio.ctx = new Ctx();
    } catch {
      return null;
    }
    return audio.ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    const ctx = ensure();
    if (!ctx || audio.muted) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), ctx.currentTime + dur);
      gain.gain.setValueAtTime(vol || 0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur + 0.02);
    } catch { /* sound is decoration; never break the game */ }
  }

  function noise(dur, vol, lowpass) {
    const ctx = ensure();
    if (!ctx || audio.muted) return;
    try {
      const len = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass || 1200;
      const gain = ctx.createGain();
      gain.gain.value = vol || 0.15;
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start();
    } catch { /* ignore */ }
  }

  return {
    unlock() { ensure(); if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume(); },
    toggleMute() { audio.muted = !audio.muted; return audio.muted; },
    shoot() { noise(0.12, 0.22, 2500); tone(180, 0.1, 'square', 0.1, 60); },
    punch() { noise(0.08, 0.18, 600); },
    pickup() { tone(660, 0.09, 'sine', 0.12); setTimeout(() => tone(990, 0.14, 'sine', 0.12), 70); },
    cash() { tone(880, 0.08, 'triangle', 0.12); setTimeout(() => tone(1174, 0.12, 'triangle', 0.12), 60); },
    mission() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.12), i * 110));
    },
    wanted() { tone(220, 0.3, 'sawtooth', 0.09, 440); },
    crash() { noise(0.25, 0.25, 500); },
    horn() { tone(370, 0.18, 'square', 0.06, 340); },
    siren(on) {
      const ctx = ensure();
      if (!ctx) return;
      try {
        if (on && !audio.sirenOsc) {
          audio.sirenOsc = ctx.createOscillator();
          audio.sirenGain = ctx.createGain();
          audio.sirenOsc.type = 'sine';
          audio.sirenOsc.frequency.value = 700;
          audio.sirenGain.gain.value = audio.muted ? 0 : 0.035;
          const lfo = ctx.createOscillator();
          lfo.frequency.value = 0.7;
          const lfoGain = ctx.createGain();
          lfoGain.gain.value = 260;
          lfo.connect(lfoGain).connect(audio.sirenOsc.frequency);
          audio.sirenOsc.connect(audio.sirenGain).connect(ctx.destination);
          audio.sirenOsc.start();
          lfo.start();
          audio.sirenLfo = lfo;
        } else if (!on && audio.sirenOsc) {
          audio.sirenOsc.stop();
          if (audio.sirenLfo) audio.sirenLfo.stop();
          audio.sirenOsc = null;
          audio.sirenLfo = null;
        }
      } catch { /* ignore */ }
    },
    engine(speedRatio) {
      const ctx = ensure();
      if (!ctx) return;
      try {
        if (!audio.engineOsc) {
          audio.engineOsc = ctx.createOscillator();
          audio.engineGain = ctx.createGain();
          audio.engineOsc.type = 'sawtooth';
          audio.engineOsc.frequency.value = 60;
          audio.engineGain.gain.value = 0;
          audio.engineOsc.connect(audio.engineGain).connect(ctx.destination);
          audio.engineOsc.start();
        }
        const target = audio.muted ? 0 : 0.02 + speedRatio * 0.05;
        audio.engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
        audio.engineOsc.frequency.setTargetAtTime(55 + speedRatio * 130, ctx.currentTime, 0.1);
      } catch { /* ignore */ }
    },
    /** A tiny bass-line loop, one note per call, driven by the main loop. */
    musicTick(dt, driving) {
      const ctx = ensure();
      if (!ctx || audio.muted) return;
      audio.musicTimer += dt;
      const beat = driving ? 0.22 : 0.34;
      if (audio.musicTimer < beat) return;
      audio.musicTimer = 0;
      const bass = [55, 55, 65.4, 49, 55, 55, 73.4, 82.4];
      const note = bass[audio.musicStep % bass.length];
      audio.musicStep += 1;
      tone(note, beat * 0.9, 'triangle', 0.05);
      if (audio.musicStep % 4 === 0) tone(note * 4, 0.08, 'sine', 0.02);
    },
  };
}
