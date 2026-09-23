/* games/shared/audio.js — MAGA audio bus (MAESTRO doctrine).
 * Zero-dependency WebAudio synth engine. No assets, no fetch, classic script.
 * Implements the recipe schema from 01-design-docs/06-audio/README.md:
 *   { id, kind:'sfx'|'music'|'ui', polyphony,
 *     recipe:{ type:'noise_burst'|'square_blip'|'saw_thud'|'fm_chirp'|
 *                    'arpeggio'|'drone',
 *              durationMs, wave, freq, freqEnd, duty,
 *              filter:{type,freq,Q}, envelope:{a,d,s,r}, gain,
 *              noise:{amount,color}, vibrato:{hz,depth},
 *              pattern:[noteNames], bpm, loop } }
 * Plus a step-sequencer for music beds (multi-track patterns, note names).
 *
 * API:
 *   const AU = new AudioBus();
 *   AU.register({...recipe objects...});
 *   AU.play('sfx.pistol_fire');           // one-shot, polyphony-capped
 *   AU.music('music.combat');             // switch beds (bar-quantized)
 *   AU.stopMusic(); AU.duck(0.5, 200);    // dip music under SFX
 *   AU.muted / AU.volume (0..1), persisted by caller if wanted.
 *   AU.unlock() — call on first gesture (autoplay policy).
 */
(function (root) {
'use strict';

const NOTE = (() => {
  const N = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  return n => {
    if (typeof n === 'number') return n;
    const m = /^([A-G][#b]?)(-?\d)$/.exec(n);
    if (!m) return 440;
    return 440 * Math.pow(2, (N[m[1]] + (parseInt(m[2], 10) + 1) * 12 - 69) / 12);
  };
})();

function mkNoiseBuffer(ctx, seconds = 1.2) {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

class AudioBus {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.5;
    this.recipes = new Map();
    this.voices = new Map();     // cue id -> count (polyphony caps)
    this.musicState = null;      // {def, stepTimer, step, nextAt}
    this.pendingMusic = null;
    this._noiseBuf = null;
  }

  unlock() {
    if (!this.ctx) {
      try {
        this.ctx = new (root.AudioContext || root.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : this.volume;
        this.master.connect(this.ctx.destination);
        this.musicBus = this.ctx.createGain();
        this.musicBus.gain.value = 0.9;
        this.musicBus.connect(this.master);
      } catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : this.volume; }
  setVolume(v) { this.volume = v; if (this.master && !this.muted) this.master.gain.value = v; }

  register(list) { for (const r of list) this.recipes.set(r.id, r); }

  /* ---- one-shot SFX ---- */
  play(id, opts = {}) {
    const def = this.recipes.get(id);
    if (!def || this.muted) return;
    const ctx = this.unlock(); if (!ctx) return;
    const cap = def.polyphony || 4;
    const n = this.voices.get(id) || 0;
    if (n >= cap) return;
    this.voices.set(id, n + 1);
    let doneOnce = false;
    const done = () => { if (doneOnce) return; doneOnce = true; this.voices.set(id, Math.max(0, (this.voices.get(id) || 1) - 1)); };
    try { this._voice(def.recipe || {}, ctx.currentTime, opts.gain ?? 1, opts.freqMul ?? 1, this.master, done); }
    catch (e) { done(); }
  }

  _voice(r, t0, gainMul, freqMul, dest, done) {
    const ctx = this.ctx;
    const dur = (r.durationMs || 120) / 1000;
    const g = ctx.createGain();
    const env = r.envelope || { a: 0.002, d: dur * 0.7, s: 0, r: dur * 0.3 };
    const peak = (r.gain ?? 0.22) * gainMul;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + Math.max(0.001, env.a || 0.002));
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * (env.s ?? 0)), t0 + (env.a || 0.002) + Math.max(0.001, env.d || 0.05));
    g.gain.setValueAtTime(Math.max(0.0002, peak * (env.s ?? 0)), t0 + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + (env.r || 0.03));
    let out = g;
    if (r.filter) {
      const f = ctx.createBiquadFilter();
      f.type = r.filter.type || 'lowpass';
      f.frequency.value = r.filter.freq || 1600;
      f.Q.value = r.filter.Q || 0.7;
      g.connect(f); out = f;
    }
    out.connect(dest);
    const tEnd = t0 + dur + (env.r || 0.03) + 0.05;
    const wantOsc = !r.noise || (r.noise.amount ?? 0) < 1;
    const type = r.type || 'square_blip';
    if (type === 'arpeggio' && Array.isArray(r.pattern) && r.pattern.length) {
      // note-per-step run across the whole envelope duration
      const step = dur / r.pattern.length;
      r.pattern.forEach((n, i) => {
        if (n === 0 || n == null) return;
        const o = ctx.createOscillator();
        o.type = r.wave || 'square';
        o.frequency.value = NOTE(n) * freqMul;
        o.connect(g);
        o.start(t0 + i * step);
        o.stop(Math.min(tEnd, t0 + (i + 1) * step + 0.02));
      });
      setTimeout(done, (dur + (env.r || 0.03) + 0.06) * 1000);
      return;
    }
    if (wantOsc && type !== 'noise_burst') {
      const o = ctx.createOscillator();
      o.type = type === 'saw_thud' ? 'sawtooth' : type === 'fm_chirp' ? 'sine' : (r.wave || 'square');
      const f = (r.freq || 440) * freqMul;
      o.frequency.setValueAtTime(f, t0);
      if (r.freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(20, r.freqEnd * freqMul), t0 + dur);
      if (type === 'fm_chirp') { // FM: modulator osc -> frequency
        const m = ctx.createOscillator(), mg = ctx.createGain();
        m.frequency.value = (r.vibrato && r.vibrato.hz) || 24;
        mg.gain.value = (r.vibrato && r.vibrato.depth) || f * 0.5;
        m.connect(mg); mg.connect(o.frequency);
        m.start(t0); m.stop(tEnd);
      } else if (r.vibrato && r.vibrato.hz) {
        const m = ctx.createOscillator(), mg = ctx.createGain();
        m.frequency.value = r.vibrato.hz; mg.gain.value = r.vibrato.depth || 0;
        m.connect(mg); mg.connect(o.frequency);
        m.start(t0); m.stop(tEnd);
      }
      o.connect(g); o.start(t0); o.stop(tEnd);
      o.onended = done;
    }
    if (r.noise && (r.noise.amount ?? 0) > 0) {
      this._noiseBuf = this._noiseBuf || mkNoiseBuffer(ctx);
      const src = ctx.createBufferSource();
      src.buffer = this._noiseBuf; src.loop = true;
      const ng = ctx.createGain();
      const oscPart = wantOsc && type !== 'noise_burst' ? (1 - r.noise.amount) : 1;
      ng.gain.value = r.noise.amount * (wantOsc ? 1 : 1) / Math.max(0.001, oscPart === 1 && !wantOsc ? 1 : 1);
      ng.gain.value = r.noise.amount;
      src.connect(ng); ng.connect(g);
      src.start(t0); src.stop(tEnd);
      if (!wantOsc || type === 'noise_burst') src.onended = done;
    }
    if (!wantOsc && !(r.noise && r.noise.amount > 0)) setTimeout(done, (dur + 0.1) * 1000);
  }

  /* ---- music: pattern sequencer ----
   * recipe.pattern: array of steps; each step is a note name, Hz number,
   * 0/ null for rest, or [notes] for a chord. recipe.bpm sets tempo;
   * recipe.stepsPerBeat (default 1 → 16ths feel via bpm*4 if stepsAre16ths).
   * Multi-track: recipe.tracks = [{wave, gain, pattern, octaveShift}] */
  music(id, { fade = 0.15 } = {}) {
    const def = this.recipes.get(id);
    if (!def) return;
    if (this.musicState && this.musicState.id === id) return;
    this.pendingMusic = id;
    const ctx = this.unlock(); if (!ctx) return;
    this._startMusic(def);
  }

  _startMusic(def) {
    this.stopMusic(0.05);
    const ctx = this.ctx;
    const r = def.recipe || {};
    const bpm = r.bpm || 120;
    const tracks = r.tracks || [{ wave: r.wave || 'square', gain: r.gain ?? 0.12, pattern: r.pattern || [] }];
    const stepsPerBeat = r.stepsPerBeat || 4;          // default: 16th notes
    const stepDur = 60 / bpm / stepsPerBeat;
    const st = { id: def.id, step: 0, nextAt: ctx.currentTime + 0.06, timer: null, tracks };
    const tick = () => {
      if (!this.musicState || this.musicState !== st) return;
      while (st.nextAt < ctx.currentTime + 0.12) {
        for (const tr of tracks) {
          const cell = tr.pattern[st.step % tr.pattern.length];
          if (cell && cell !== 0) {
            const notes = Array.isArray(cell) ? cell : [cell];
            for (const n of notes) {
              const o = ctx.createOscillator(), g = ctx.createGain();
              o.type = tr.wave || 'square';
              o.frequency.value = NOTE(n) * Math.pow(2, tr.octaveShift || 0);
              const gl = (tr.gain ?? 0.12);
              g.gain.setValueAtTime(0.0001, st.nextAt);
              g.gain.linearRampToValueAtTime(gl, st.nextAt + 0.008);
              g.gain.exponentialRampToValueAtTime(0.0001, st.nextAt + stepDur * (tr.legato ? 1 : 0.82));
              o.connect(g); g.connect(this.musicBus);
              o.start(st.nextAt); o.stop(st.nextAt + stepDur * 1.05);
            }
          }
        }
        st.step++; st.nextAt += stepDur;
      }
    };
    st.timer = setInterval(tick, 30);
    this.musicState = st;
  }

  stopMusic(fade = 0.1) {
    if (this.musicState) { clearInterval(this.musicState.timer); this.musicState = null; }
    this.pendingMusic = null;
  }

  duck(amount = 0.4, ms = 250) {
    if (!this.musicBus || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setValueAtTime(Math.max(0, 1 - amount) * 0.9, t);
    this.musicBus.gain.linearRampToValueAtTime(0.9, t + ms / 1000);
  }
}

root.MAGA_AUDIO = { AudioBus, NOTE };
})(typeof globalThis !== 'undefined' ? globalThis : this);
