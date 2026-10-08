/*
 * LayeredPlayer - looping boss music in layers, switched on the bar.
 *
 * A "set" is described by a manifest.json (written by
 * .claude/skills/boss-music/scripts/render_layers.py):
 *
 *   { "title": "...",
 *     "intensities": { "calm": ["bed"], "tense": ["bed", "rhythm"], "full": ["bed", "rhythm", "melody"] },
 *     "stages": [ { "id": "stage1", "name": "...", "layers": { "bed": "stage1-bed.ogg", ... },
 *                   "seconds": 88.69, "loopStart": 5.21, "bpm": 138, "beatsPerBar": 3, "barSeconds": 1.304 } ],
 *     "cues":   [ { "id": "rise", "file": "rise.ogg", "seconds": 6.37, "landsAt": 2.857 },
 *                 { "id": "ending", "file": "ending.ogg", "seconds": 9.2 } ] }
 *
 * Every layer of a stage is the same length with the same loop point, so the layers
 * play in sample-accurate step: the entry [0, loopStart) once, then [loopStart, end)
 * over and over, for as long as the scene takes. Changing the intensity fades layers
 * in and out; changing the stage waits for the next bar line.
 *
 * No dependencies, no build step: load it with a plain <script src="layered-player.js">
 * (it defines `window.LayeredPlayer`), or require() it.
 *
 *   const p = new LayeredPlayer();
 *   await p.load("music/clockwork-abbot/layers/manifest.json");
 *   p.start("stage1", { intensity: "calm" });   // call from a click: browsers need a gesture
 *   p.setIntensity("full");                     // fades over a bar
 *   p.goTo("stage2", { via: "rise" });          // on the next bar line, through the rise
 *   p.playCue("ending");                        // on the next bar line; the loop stops
 *
 * To follow a shared clock (every player at a table hearing the same bar), pass
 * `elapsed` - seconds since the stage started for everyone - to start().
 */
(function (root) {
  "use strict";

  const EPS = 0.03;          // (seconds) the soonest a change can be scheduled
  const XFADE = 0.6;         // (seconds) the old stage's fade under the new one's entry

  class LayeredPlayer {
    constructor(opts = {}) {
      this.ctx = opts.context || null;
      this._dest = opts.destination || null;
      this.manifest = null;
      this.base = "";
      this.buffers = new Map();         // url -> AudioBuffer
      this.voice = null;                // the stage now playing
      this.intensity = opts.intensity || "full";
      this.volume = opts.volume == null ? 0.8 : opts.volume;
      this.pending = null;              // {kind, at, ...} a change waiting for its bar line
      this.listeners = {};
      this._timers = [];
    }

    // --- events: "state" (anything changed), "bar" ({bar, stage}), "error" ---
    on(name, fn) { (this.listeners[name] = this.listeners[name] || []).push(fn); return this; }
    _emit(name, data) { (this.listeners[name] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); }

    _audio() {
      if (!this.ctx) {
        const AC = root.AudioContext || root.webkitAudioContext;
        this.ctx = new AC();
      }
      if (!this.master) {
        // A gentle limiter: the layers are mastered together, but a stage change overlaps two.
        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.value = -2;
        this.limiter.knee.value = 2;
        this.limiter.ratio.value = 20;
        this.limiter.attack.value = 0.003;
        this.limiter.release.value = 0.25;
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.limiter);
        this.limiter.connect(this._dest || this.ctx.destination);
      }
      return this.ctx;
    }

    /**
     * Fetch and decode a set: `source` is the manifest's URL, or the manifest object itself.
     * `onProgress(done, total)` is called as files arrive. `opts.resolve(file)` -> the URL
     * to fetch a file from (default: next to the manifest).
     */
    async load(source, onProgress, opts = {}) {
      const ctx = this._audio();
      const here = root.location ? root.location.href : undefined;
      if (typeof source === "string") {
        const res = await fetch(source);
        if (!res.ok) throw new Error(`manifest ${source}: HTTP ${res.status}`);
        this.manifest = await res.json();
        this.base = new URL(".", new URL(source, here)).href;
      } else {
        this.manifest = source;
        this.base = here || "";
      }
      this.resolve = opts.resolve || ((f) => new URL(f, this.base).href);
      const urls = [];
      for (const s of this.manifest.stages || []) for (const f of Object.values(s.layers)) urls.push(f);
      for (const c of this.manifest.cues || []) urls.push(c.file);
      let done = 0;
      await Promise.all(urls.map(async (f) => {
        const url = this.resolve(f);
        const r = await fetch(url);
        if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`);
        const data = await r.arrayBuffer();
        const buf = await new Promise((ok, bad) => ctx.decodeAudioData(data, ok, bad));
        this.buffers.set(url, buf);
        done += 1;
        if (onProgress) onProgress(done, urls.length);
      }));
      this._emit("state", this.state());
      return this.manifest;
    }

    stage(id) { return (this.manifest.stages || []).find((s) => s.id === id); }
    cue(id) { return (this.manifest.cues || []).find((c) => c.id === id); }
    _buf(file) { return this.buffers.get(this.resolve(file)); }
    _layersOn(name) {
      const m = (this.manifest && this.manifest.intensities) || {};
      return Array.isArray(name) ? name : (m[name] || ["bed", "rhythm", "melody"]);
    }

    /** Where a stage is (seconds into its file) `e` seconds after it started. */
    static position(stage, e) {
      const dur = stage.seconds, ls = stage.loopStart || 0;
      if (e < dur) return Math.max(0, e);
      return ls + ((e - ls) % (dur - ls));
    }

    /** The audio-clock time of the next bar line of the stage playing (or now). */
    nextBar(after) {
      const ctx = this._audio();
      const t = Math.max(after == null ? ctx.currentTime : after, ctx.currentTime) + EPS;
      const v = this.voice;
      if (!v) return t;
      const bar = v.stage.barSeconds;
      return v.t0 + Math.ceil((t - v.t0) / bar) * bar;
    }

    /** `at` (a bar line a shared clock chose), or - when it has already passed - the next one. */
    _barAt(at) {
      if (at == null) return this.nextBar();
      return at >= this.ctx.currentTime + EPS ? at : this.nextBar();
    }

    _startVoice(stage, at, elapsed, fadeIn) {
      const ctx = this.ctx;
      const out = ctx.createGain();
      out.gain.value = 0;
      out.connect(this.master);
      const on = this._layersOn(this.intensity);
      const voice = { stage, out, sources: {}, gains: {}, t0: at - (elapsed || 0) };
      const offset = LayeredPlayer.position(stage, elapsed || 0);
      for (const [name, file] of Object.entries(stage.layers)) {
        const buf = this._buf(file);
        if (!buf) continue;
        const g = ctx.createGain();
        g.gain.value = on.includes(name) ? 1 : 0;
        g.connect(out);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.loopStart = Math.min(stage.loopStart || 0, buf.duration - 0.01);
        src.loopEnd = buf.duration;
        src.connect(g);
        src.start(at, offset);
        voice.sources[name] = src;
        voice.gains[name] = g;
      }
      out.gain.setValueAtTime(0, at);
      out.gain.linearRampToValueAtTime(1, at + (fadeIn || 0.02));
      return voice;
    }

    _endVoice(voice, at, fade) {
      if (!voice) return;
      const g = voice.out.gain;
      g.cancelScheduledValues(at);
      g.setValueAtTime(g.value, Math.max(this.ctx.currentTime, at - 0.001));
      g.linearRampToValueAtTime(0, at + fade);
      for (const s of Object.values(voice.sources)) { try { s.stop(at + fade + 0.05); } catch (e) { /* stopped */ } }
      this._later(at + fade + 0.2, () => voice.out.disconnect());
    }

    _later(atCtx, fn) {
      const ms = Math.max(0, (atCtx - this.ctx.currentTime) * 1000);
      const id = setTimeout(() => { this._timers = this._timers.filter((x) => x !== id); fn(); }, ms);
      this._timers.push(id);
    }

    /**
     * Start a stage now (no bar to wait for). `intensity`: a name from the manifest or a
     * list of layers. `elapsed`: seconds since it started on a shared clock (late joiners).
     * `at`: an audio-clock time to start it at instead of now.
     */
    start(stageId, opts = {}) {
      const ctx = this._audio();
      if (ctx.state === "suspended") ctx.resume();
      const stage = this.stage(stageId);
      if (!stage) throw new Error(`no stage ${stageId}`);
      if (opts.intensity) this.intensity = opts.intensity;
      this._cancelPending();
      const at = opts.at != null ? Math.max(opts.at, ctx.currentTime + EPS) : ctx.currentTime + EPS;
      if (this.voice) this._endVoice(this.voice, at, 0.4);
      this.voice = this._startVoice(stage, at, opts.elapsed || 0, opts.elapsed ? 1.0 : 0.02);
      this._tick();
      this._emit("state", this.state());
    }

    /** Fade layers to an intensity (a name or a list of layers) over `fade` seconds (default: a bar). */
    setIntensity(name, opts = {}) {
      this.intensity = name;
      const v = this.voice;
      if (v) {
        const t = this.ctx.currentTime;
        const fade = opts.fade == null ? Math.max(1, v.stage.barSeconds) : opts.fade;
        const on = this._layersOn(name);
        for (const [layer, g] of Object.entries(v.gains)) {
          g.gain.cancelScheduledValues(t);
          g.gain.setValueAtTime(g.gain.value, t);
          g.gain.linearRampToValueAtTime(on.includes(layer) ? 1 : 0, t + fade);
        }
      }
      this._emit("state", this.state());
    }

    /**
     * Move to another stage on the next bar line. `via`: a cue id (a rise) played from
     * that bar line; the new stage starts where it lands (its "landsAt"), the old loop
     * plays on under it until then. `opts.at`: the audio-clock time of that bar line
     * instead (a shared clock decided it).
     */
    goTo(stageId, opts = {}) {
      const ctx = this._audio();
      const stage = this.stage(stageId);
      if (!stage) throw new Error(`no stage ${stageId}`);
      if (!this.voice) return this.start(stageId, opts);
      if (opts.intensity) this.intensity = opts.intensity;
      this._cancelPending();
      const at = this._barAt(opts.at);
      const via = opts.via ? this.cue(opts.via) : null;
      const lands = via ? at + (via.landsAt || via.seconds) : at;
      const old = this.voice;
      if (via) this._playBuffer(via.file, at);
      this.pending = { kind: "stage", to: stageId, via: opts.via || null, at: lands };
      this._endVoice(old, lands, via ? 0.12 : XFADE);
      this.voice = this._startVoice(stage, lands, 0, 0.02);
      this._later(lands, () => { this.pending = null; this._emit("state", this.state()); });
      this._emit("state", this.state());
    }

    /** Play a one-shot cue (an ending) on the next bar line (or `opts.at`); the loop stops under its attack. */
    playCue(cueId, opts = {}) {
      const cue = this.cue(cueId);
      if (!cue) throw new Error(`no cue ${cueId}`);
      this._audio();
      this._cancelPending();
      const at = opts.at != null ? this._barAt(opts.at)
        : opts.now || !this.voice ? this.ctx.currentTime + EPS : this.nextBar();
      this._playBuffer(cue.file, at);
      if (opts.keepLoop !== true && this.voice) {
        const v = this.voice;
        this.voice = null;
        this._endVoice(v, at, 0.15);
      }
      this.pending = { kind: "cue", cue: cueId, at };
      this._later(at, () => { this.pending = null; this._emit("state", this.state()); });
      this._emit("state", this.state());
    }

    _playBuffer(file, at) {
      const buf = this._buf(file);
      if (!buf) return;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.master);
      src.start(at);
    }

    _cancelPending() {
      // (a change already scheduled on the audio clock stays scheduled; this only clears the note of it)
      this.pending = null;
    }

    /** Fade everything out over `fade` seconds. */
    stop(opts = {}) {
      if (!this.ctx) return;
      const fade = opts.fade == null ? 1.5 : opts.fade;
      this._cancelPending();
      this._endVoice(this.voice, this.ctx.currentTime + EPS, fade);
      this.voice = null;
      this._emit("state", this.state());
    }

    setVolume(v) {
      this.volume = Math.max(0, Math.min(1, v));
      if (this.master) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }

    /** What is playing: {stage, intensity, bar, beat, pending, playing}. */
    state() {
      const v = this.voice, ctx = this.ctx;
      let bar = null, beat = null, inLoop = false;
      if (v && ctx && ctx.currentTime >= v.t0) {
        const e = ctx.currentTime - v.t0, s = v.stage;
        const pos = LayeredPlayer.position(s, e);
        bar = Math.floor(pos / s.barSeconds);
        beat = Math.floor((pos % s.barSeconds) / (s.barSeconds / s.beatsPerBar));
        inLoop = e >= (s.loopStart || 0);
      }
      return {
        loaded: !!this.manifest, playing: !!v, stage: v ? v.stage.id : null,
        intensity: this.intensity, bar, beat, inLoop,
        pending: this.pending ? { ...this.pending, inSeconds: ctx ? Math.max(0, this.pending.at - ctx.currentTime) : 0 } : null,
      };
    }

    _tick() {
      if (this._raf) return;
      let last = null;
      const step = () => {
        const s = this.state();
        const key = `${s.stage}:${s.bar}:${s.beat}`;
        if (key !== last) { last = key; this._emit("bar", s); }
        this._raf = this.voice || this.pending ? (root.requestAnimationFrame || setTimeout)(step, 16) : null;
      };
      step();
    }
  }

  root.LayeredPlayer = LayeredPlayer;
  if (typeof module !== "undefined" && module.exports) module.exports = { LayeredPlayer };
})(typeof window !== "undefined" ? window : globalThis);
