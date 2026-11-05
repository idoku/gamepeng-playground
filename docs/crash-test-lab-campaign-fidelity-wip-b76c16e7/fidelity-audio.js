// Independently authored procedural music and machinery, with licensed recordings.
// Signal measurements are technical evidence, not listening or source equivalence.
const TAU = Math.PI * 2;
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const db = n => 10 ** (n / 20);
const DURATIONS = Object.freeze({
  saw: .28, guillotine: .36, anvil: .65, pendulum: .42, impact: .22,
  detach: .32, core: .48, grab: .09, drop: .2, start: .44, retry: .32,
  complete: .95, 'voice-ow': .48, 'voice-ah': .38, 'voice-cheer': .72,
  music: .3,
});
export const AUDIO_RECIPES = Object.freeze(Object.keys(DURATIONS));
export const AUDIO_LIMITS = Object.freeze({sfx: 5, music: 3, voice: 1, buffers: 48});
export const AUDIO_MIX_DB = Object.freeze({master: -4, music: -7, sfx: -5, voice: -1});
const MIX = Object.freeze(Object.fromEntries(Object.entries(AUDIO_MIX_DB).map(([key, value]) => [key, db(value)])));
export const AUDIO_CEILING = .95 * MIX.master;
// Linear for ordinary peaks; smoothly rounds exceptional overlapping transients.
// The 1/4 input gain gives the WaveShaper a ±4 range without hard input clipping.
// The nominal curve bound is -4.45 dBFS after the master. Oversampling filters
// can overshoot it; rendered stress tests separately verify output headroom.
export function limitMixSample(value) {
  const magnitude = Math.abs(value);
  return Math.sign(value) * (magnitude <= .75 ? magnitude : .75 + .2 * (1 - Math.exp(-((magnitude - .75) / .2))));
}
function limiterCurve() {
  return Float32Array.from({length: 8193}, (_, index) => limitMixSample((index / 8192 * 2 - 1) * 4));
}
export function voiceMakeupGain(peak, rms) {
  // Match the two short recordings by energy, without amplifying near-silence.
  // Preserve PCM assets and their provenance; cap makeup at +9 dB and peak at .64.
  if (!(peak > .00001 && rms > .00001)) return 0;
  return Math.min(db(9), db(-25) / rms, .64 / peak);
}
const STEP = 60 / 112 / 2;
const MELODY = [0, 7, 10, 7, 3, 7, 12, 10, 0, 7, 15, 12, 10, 7, 3, 7];

function random(seed) {
  let state = (Number.isFinite(seed) ? seed : 1) >>> 0 || 1;
  return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
}
function envelope(t, duration, attack = .004, decay = 5) {
  return Math.min(1, t / attack) * Math.exp(-t * decay) * clamp((duration - t) / .025, 0, 1);
}
function formant(frequency, rate, q = 5) {
  const w = TAU * Math.min(frequency, rate * .42) / rate, alpha = Math.sin(w) / (2 * q), a = 1 + alpha;
  return {b: alpha / a, a1: -2 * Math.cos(w) / a, a2: (1 - alpha) / a};
}
function voiceSignal(kind, data, rate, rng, pitch) {
  const duration = data.length / rate;
  const states = Array.from({length: 3}, () => ({x1: 0, x2: 0, y1: 0, y2: 0}));
  let phase = 0, coefficients;
  for (let i = 0; i < data.length; i++) {
    const t = i / rate, u = t / duration;
    // One fixed robot identity, with different acted pitch/vowel trajectories:
    // contact = startled ah, detachment = descending ow, success = ah-oo cheer.
    const cheer = kind === 'voice-cheer', ow = kind === 'voice-ow';
    const f0 = pitch * (ow ? 225 - 98 * u : cheer ? 185 + 100 * u + 20 * Math.sin(TAU * u) : 190 + 85 * Math.sin(Math.PI * u));
    const morph = ow ? u : cheer ? clamp((u - .35) * 2, 0, 1) : .12 * Math.sin(Math.PI * u);
    if (i % 64 === 0) coefficients = [760 - 420 * morph, 1220 - 460 * morph, 2650 - 400 * morph].map(f => formant(f, rate));
    phase = (phase + f0 / rate) % 1;
    // Glottal pulse with a softened edge, followed by three moving resonators.
    const excitation = Math.tanh(3 * Math.sin(TAU * phase)) + .22 * Math.sin(TAU * phase * 2) + .025 * (rng() * 2 - 1);
    let signal = 0;
    for (let j = 0; j < states.length; j++) {
      const s = states[j], c = coefficients[j];
      const y = c.b * (excitation - s.x2) - c.a1 * s.y1 - c.a2 * s.y2;
      s.x2 = s.x1; s.x1 = excitation; s.y2 = s.y1; s.y1 = y;
      signal += y * [1, .68, .3][j];
    }
    const syllable = cheer ? 1 - .85 * Math.exp(-(((u - .43) / .07) ** 2)) : 1;
    const shape = Math.sin(Math.PI * u) ** .65 * syllable;
    data[i] = (signal + .07 * Math.sin(TAU * phase)) * shape * (.88 + .12 * Math.sin(TAU * 31 * t));
  }
  let peak = .001;
  for (const value of data) peak = Math.max(peak, Math.abs(value));
  const fade = Math.max(1, rate * .003);
  for (let i = 0; i < data.length; i++) data[i] *= .64 / peak * Math.min(1, i / fade, (data.length - 1 - i) / fade);
}

/** Render the same mono PCM used by playback; no AudioContext or output needed. */
export function synthesizeSignal(kind, options = {}) {
  if (!Object.hasOwn(DURATIONS, kind)) kind = 'impact';
  const rate = clamp(Number.isFinite(options.sampleRate) ? options.sampleRate : 44100, 8000, 96000);
  const duration = DURATIONS[kind], data = new Float32Array(Math.ceil(duration * rate));
  const rng = random(options.seed ?? 1), pitch = .97 + rng() * .06;
  if (kind.startsWith('voice-')) { voiceSignal(kind, data, rate, rng, pitch); return data; }
  const step = Math.abs(Math.floor(Number.isFinite(options.step) ? options.step : 0));
  const root = clamp(Number.isFinite(options.frequency) ? options.frequency : 220, 60, 1400);
  for (let i = 0; i < data.length; i++) {
    const t = i / rate, n = rng() * 2 - 1;
    const tone = (frequency, decay = 0, time = t) => Math.sin(TAU * frequency * pitch * time) * Math.exp(-Math.max(0, time) * decay);
    let value = 0;
    switch (kind) {
      case 'saw': value = envelope(t, duration, .003, 9) * (.24 * n + .23 * Math.tanh(3 * tone(185)) + .2 * tone(1420 + 180 * Math.sin(t * 41))); break;
      case 'guillotine': {
        const hit = Math.max(0, t - .045);
        value = .18 * n * envelope(t, .075, .02, 9);
        if (t >= .045) value += envelope(hit, duration - .045, .001, 13) * (.28 * n + .22 * tone(970, 4, hit) + .2 * tone(1693, 7, hit) + .2 * tone(98, 10, hit));
        break;
      }
      case 'anvil': value = envelope(t, duration, .002, 4) * (.31 * tone(72, 9) + .23 * tone(311, 1) + .13 * tone(719, 4) + .1 * tone(1397, 7) + .16 * n * Math.exp(-t * 45)); break;
      case 'pendulum': value = envelope(t, duration, .006, 8) * (.42 * tone(107 - 45 * t) + .19 * tone(493, 4) + .16 * n * Math.exp(-t * 24)); break;
      case 'detach': value = envelope(t, duration, .002, 10) * (.28 * n * Math.exp(-t * 30) + .33 * tone(410 - t * 760) + .16 * tone(1280, 15)); break;
      case 'core': value = envelope(t, duration, .004, 8) * (.36 * tone(66 - t * 35) + .23 * n * Math.exp(-t * 8) + .19 * tone(687, 5)); break;
      case 'grab': value = envelope(t, duration, .003, 30) * .42 * tone(460 + t * 900); break;
      case 'drop': value = envelope(t, duration, .004, 15) * (.32 * tone(220 - t * 600) + .12 * n * Math.exp(-t * 20)); break;
      case 'start': case 'retry': case 'complete': {
        const notes = kind === 'complete' ? [0, 7, 12, 16, 19] : kind === 'start' ? [0, 7, 12] : [7, 0];
        const spacing = kind === 'complete' ? .12 : .095;
        for (let j = 0; j < notes.length; j++) {
          const local = t - j * spacing;
          if (local >= 0) value += envelope(local, duration - j * spacing, .004, 11) * (.25 * tone(330 * 2 ** (notes[j] / 12), 0, local) + .05 * tone(660 * 2 ** (notes[j] / 12), 8, local));
        }
        break;
      }
      case 'music': {
        const frequency = root * 2 ** (MELODY[step % MELODY.length] / 12);
        value = envelope(t, duration, .006, 14) * (.32 * tone(frequency) + .07 * tone(frequency * 2, 7));
        if (step % 2 === 0) value += envelope(t, .25, .004, 12) * .27 * tone(root / 2);
        value += envelope(t, .055, .002, 55) * .055 * n;
        if (step % 4 === 2) value += envelope(t, .1, .001, 32) * .07 * n;
        break;
      }
      default: value = envelope(t, duration, .002, 17) * (.32 * tone(133) + .18 * n * Math.exp(-t * 20));
    }
    data[i] = clamp(value, -.78, .78);
  }
  // Both endpoints are zero, including the very short UI cues.
  data[0] = 0; data[data.length - 1] = 0;
  return data;
}

function defaultContextFactory() {
  const Constructor = globalThis.AudioContext || globalThis.webkitAudioContext || globalThis.window?.AudioContext || globalThis.window?.webkitAudioContext;
  if (!Constructor) throw new Error('Web Audio is unavailable');
  return new Constructor();
}
function machineName(machine) {
  const name = typeof machine === 'string' ? machine : machine?.type;
  return ['saw', 'guillotine', 'anvil', 'pendulum'].includes(name) ? name : 'impact';
}

// Authored event tiers, not claims about the original game's performance.
// Values come from observed contact metadata; physics remains independent.
export function voiceTier(kind, details = {}) {
  if (kind === 'detach' || kind === 'core' || kind === 'core-destroyed') return 'detach';
  if (kind !== 'contact') return kind === 'complete' ? 'complete' : null;
  const speed = Number.isFinite(details.impactSpeed) ? Math.max(0, details.impactSpeed) : 0;
  const damage = Number.isFinite(details.damage) ? Math.max(0, details.damage) : 0;
  return speed >= 420 || damage >= .25 ? 'contact-heavy' : speed >= 180 || damage >= .05 ? 'contact-medium' : 'contact-light';
}
export function voicePriority(kind, details = {}) {
  return {'contact-light': 1, 'contact-medium': 2, 'contact-heavy': 3, detach: 4, complete: 5}[voiceTier(kind, details)] || 0;
}
export function selectVoiceEvent(events, now) {
  let best = null, priority = 0;
  for (const event of events) {
    if (!['contact', 'detach', 'core-destroyed'].includes(event.type)) continue;
    if (Number.isFinite(now) && Number.isFinite(event.time) && now - event.time > .2) continue;
    const next = voicePriority(event.type, event);
    if (next >= priority) { best = event; priority = next; }
  }
  return best;
}
export function freshAudioEvents(events, seen) {
  // The physics event history is capped. Object membership survives its front
  // truncation without storing the whole session or replaying old reactions.
  return events.filter(event => { if (seen.has(event)) return false; seen.add(event); return true; });
}

export class SampleAudio {
  constructor({contextFactory = defaultContextFactory, onUnavailable = () => {}, voiceAssets = {}, voiceFallback, onVoiceUnavailable = () => {}} = {}) {
    this._factory = contextFactory; this._onUnavailable = onUnavailable;
    this._enabled = true; this._paused = false; this._ready = false; this._unlocked = false;
    this._context = null; this._buses = null; this._nodes = []; this._sources = new Set();
    this._buffers = new Map(); this._suspends = new Set(); this._request = 0;
    this._level = 0; this._step = 0; this._nextMusic = 0; this._serial = 0;
    this._last = new Map(); this._voiceUntil = -Infinity; this._voiceStartedAt = -Infinity; this._voicePriority = 0; this._voiceChoice = new Map(); this._reported = false;
    this._voiceAssets = Object.fromEntries(['contact', 'contact-light', 'contact-medium', 'contact-heavy', 'detach', 'complete'].map(kind => [kind, Array.isArray(voiceAssets[kind]) ? voiceAssets[kind].filter(url => typeof url === 'string').slice(0, 3) : []]));
    this._onVoiceUnavailable = onVoiceUnavailable; this._voices = {}; this._voiceLoadContext = null; this._voiceLoadPending = null;
    this._voiceStatus = Object.values(this._voiceAssets).some(urls => urls.length) ? 'pending' : 'unconfigured';
    this._voiceFallback = voiceFallback ?? this._voiceStatus === 'unconfigured';
  }
  get enabled() { return this._enabled; }
  get ready() { return this._ready && this._enabled && !this._paused && this._context?.state === 'running'; }
  get voiceStatus() { return this._voiceStatus; }
  _wanted() { return this._enabled && !this._paused; }
  _graph(context) {
    const buses = {};
    for (const name of ['master', 'music', 'sfx', 'voice']) {
      const node = context.createGain(); this._nodes.push(node); buses[name] = node;
      node.gain.setValueAtTime(name === 'master' ? 0 : MIX[name], context.currentTime);
    }
    const input = context.createGain(), limiter = context.createWaveShaper();
    input.gain.setValueAtTime(.25, context.currentTime);
    limiter.curve = limiterCurve(); limiter.oversample = '4x';
    this._nodes.push(input, limiter);
    for (const name of ['music', 'sfx', 'voice']) buses[name].connect(input);
    input.connect(limiter); limiter.connect(buses.master);
    buses.master.connect(context.destination); this._buses = buses;
  }
  _master(value) {
    const parameter = this._buses?.master.gain;
    if (!parameter) return;
    try { parameter.cancelScheduledValues(this._context.currentTime); parameter.setValueAtTime(value, this._context.currentTime); } catch { /* Already closed. */ }
  }
  _suspend(context) {
    if (!context || context.state === 'closed') return;
    try {
      const pending = Promise.resolve(context.suspend()).catch(() => {}).finally(() => this._suspends.delete(pending));
      this._suspends.add(pending);
    } catch { /* Master mute and stopped sources still enforce silence. */ }
  }
  _remove(source) {
    this._sources.delete(source);
    try { source.node.disconnect(); } catch { /* Optional output cleanup. */ }
    source.node.onended = null;
  }
  _stopAll() {
    for (const source of [...this._sources]) {
      try { source.node.stop(); } catch { /* May have ended already. */ }
      this._remove(source);
    }
    this._voiceUntil = -Infinity;
    this._voiceStartedAt = -Infinity;
    this._voicePriority = 0;
  }
  _quiet() {
    this._request++; this._ready = false; this._master(0); this._stopAll(); this._suspend(this._context);
  }
  _fail(error) {
    this._enabled = false; this._quiet();
    for (const node of this._nodes) { try { node.disconnect(); } catch {} }
    const context = this._context;
    this._context = null; this._buses = null; this._nodes = []; this._buffers.clear(); this._unlocked = false; this._voices = {};
    this._voiceStatus = Object.values(this._voiceAssets).some(urls => urls.length) ? 'pending' : 'unconfigured';
    try { if (context?.close) Promise.resolve(context.close()).catch(() => {}); } catch {}
    if (!this._reported) { this._reported = true; try { this._onUnavailable(error); } catch {} }
  }
  async unlock() { return this._unlock(false); }
  async _unlock(background) {
    if (!this._wanted()) return false;
    if (this.ready) return true;
    const request = ++this._request;
    let context;
    try {
      if (!this._context || this._context.state === 'closed') {
        for (const node of this._nodes) { try { node.disconnect(); } catch {} }
        this._nodes = []; this._buffers.clear();
        this._context = this._factory(); this._graph(this._context);
      }
      context = this._context;
      // Call resume synchronously in the gesture, before awaiting anything.
      const pendingResume = context.resume();
      const suspends = [...this._suspends];
      await pendingResume;
      if (suspends.length) await Promise.all(suspends);
      if (request !== this._request || !this._wanted() || context !== this._context) {
        if (!this._wanted()) this._suspend(context);
        return false;
      }
      // An earlier asynchronous suspend may have landed after the gesture.
      if (context.state !== 'running') await context.resume();
      if (request !== this._request || !this._wanted() || context !== this._context) {
        if (!this._wanted()) this._suspend(context);
        return false;
      }
      if (context.state !== 'running') throw new Error('Audio playback is blocked');
      this._ready = true; this._unlocked = true; this._reported = false;
      this._nextMusic = context.currentTime + .025; this._master(MIX.master);
      void this.loadVoices();
      return true;
    } catch (error) {
      if (request === this._request) {
        if (background) this._quiet(); // Keep sound intent; retry in the next gesture.
        else this._fail(error);
      }
      return false;
    }
  }
  // Loading is optional and never delays the gesture, music or game simulation.
  // URLs must remain on the app's origin; no third-party runtime service is used.
  async loadVoices() {
    const context = this._context;
    if (!context || !this._unlocked || this._voiceStatus === 'unconfigured') return false;
    if (this._voiceLoadContext === context) return this._voiceLoadPending;
    this._voiceLoadContext = context; this._voices = {}; this._voiceStatus = 'loading';
    this._voiceLoadPending = (async () => {
      let failures = 0;
      const groups = Object.entries(this._voiceAssets).filter(([, urls]) => urls.length);
      for (const [kind, urls] of groups) {
        const buffers = [];
        for (const url of urls) {
          try {
            const base = globalThis.location?.href || 'http://localhost/';
            const target = new URL(url, base);
            if (!['http:', 'https:'].includes(target.protocol) || target.origin !== new URL(base).origin) throw new Error('Voice asset must be same-origin');
            const response = await globalThis.fetch(url, {credentials: 'same-origin', redirect: 'error'});
            if (!response.ok) throw new Error('Voice asset unavailable');
            const bytes = await response.arrayBuffer();
            if (bytes.byteLength > 1024 * 1024) throw new Error('Voice asset exceeds budget');
            const decoded = await context.decodeAudioData(bytes);
            if (!(decoded.duration > 0 && decoded.duration <= 4) || !(decoded.numberOfChannels >= 1 && decoded.numberOfChannels <= 2)) throw new Error('Voice asset has unsupported duration or channels');
            // Bounded mono voice makeup; keep the source files unchanged.
            // Brief endpoint fades avoid clicks from trimmed clips.
            const normalized = context.createBuffer(1, decoded.length, decoded.sampleRate), data = normalized.getChannelData(0);
            let peak = 0, energy = 0;
            for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
              const input = decoded.getChannelData(channel);
              for (let i = 0; i < data.length; i++) { if (!Number.isFinite(input[i])) throw new Error('Voice asset contains invalid PCM'); data[i] += input[i] / decoded.numberOfChannels; }
            }
            for (const value of data) { peak = Math.max(peak, Math.abs(value)); energy += value * value; }
            if (peak < .00001) throw new Error('Voice asset is silent');
            const scale = voiceMakeupGain(peak, Math.sqrt(energy / data.length)), fade = Math.max(1, Math.floor(decoded.sampleRate * .003));
            for (let i = 0; i < data.length; i++) data[i] *= scale * Math.min(1, i / fade, (data.length - 1 - i) / fade);
            buffers.push(normalized);
          } catch { failures++; }
          if (context !== this._context) return false;
        }
        this._voices[kind] = buffers;
      }
      if (context !== this._context) return false;
      const available = groups.filter(([kind]) => this._voices[kind]?.length).length;
      this._voiceStatus = available === groups.length && failures === 0 ? 'ready' : available ? 'partial' : 'unavailable';
      if (failures) { try { this._onVoiceUnavailable(new Error(this._voiceFallback ? 'Some voice recordings could not load; synthetic fallback remains available' : 'Some voice recordings could not load; missing vocal reactions remain silent')); } catch {} }
      return this._voiceStatus === 'ready';
    })();
    return this._voiceLoadPending;
  }
  setEnabled(enabled) {
    enabled = Boolean(enabled);
    if (enabled === this._enabled) return;
    this._enabled = enabled;
    if (!enabled) this._quiet();
    else { this._request++; this._reported = false; }
  }
  setPaused(paused) {
    paused = Boolean(paused);
    if (paused === this._paused) return;
    this._paused = paused;
    if (paused) this._quiet();
    else if (this._enabled && this._unlocked && this._context) void this._unlock(true);
  }
  reset(levelIndex = 0) {
    this._level = Number.isInteger(levelIndex) ? clamp(levelIndex, 0, 3) : 0;
    this._stopAll(); this._last.clear(); this._serial = 0; this._step = 0;
    this._nextMusic = (this._context?.currentTime || 0) + .025;
    try {
      const parameter = this._buses?.music.gain, now = this._context?.currentTime || 0;
      parameter?.cancelScheduledValues(now); parameter?.setValueAtTime(MIX.music, now);
    } catch (error) { this._fail(error); }
  }
  _prune(now) { for (const source of [...this._sources]) if (source.end <= now) this._remove(source); }
  _buffer(recipe, seed, step = 0) {
    const frequency = [220, 246.9417, 196, 261.6256][this._level];
    const key = `${recipe}:${seed}:${step % 16}:${frequency}`;
    if (this._buffers.has(key)) return this._buffers.get(key);
    const context = this._context, pcm = synthesizeSignal(recipe, {sampleRate: context.sampleRate, seed, step, frequency});
    const buffer = context.createBuffer(1, pcm.length, context.sampleRate); buffer.getChannelData(0).set(pcm);
    if (this._buffers.size >= AUDIO_LIMITS.buffers) this._buffers.delete(this._buffers.keys().next().value);
    this._buffers.set(key, buffer); return buffer;
  }
  _play(recipe, bus, time, seed, step = 0) {
    if ([...this._sources].filter(source => source.bus === bus).length >= AUDIO_LIMITS[bus]) return false;
    return this._playBuffer(this._buffer(recipe, seed, step), bus, time);
  }
  _playBuffer(buffer, bus, time) {
    if ([...this._sources].filter(source => source.bus === bus).length >= AUDIO_LIMITS[bus]) return false;
    const node = this._context.createBufferSource();
    const source = {node, bus, end: time + buffer.duration};
    this._sources.add(source);
    node.buffer = buffer; node.onended = () => this._remove(source);
    node.connect(this._buses[bus]); node.start(time);
    return true;
  }
  _voice(recipe, now, seed, important = false, group = recipe === 'voice-cheer' ? 'complete' : recipe === 'voice-ow' ? 'detach' : 'contact', priority = important ? 5 : 1) {
    const selectionGroup = this._voices[group]?.length ? group : group === 'contact-heavy' && this._voices.detach?.length ? 'detach' : group.startsWith('contact-') ? 'contact' : group;
    const choices = this._voices[selectionGroup] || [];
    if (!choices.length && !this._voiceFallback) return;
    // A major injury may replace a minor contact. Equal/lower reactions wait;
    // no delayed vocal queue survives a collision, retry or background pause.
    const interrupt = important || priority >= 4 && priority > this._voicePriority;
    if (!interrupt && now < this._voiceUntil + .3) return;
    if (priority < 4 && now - this._voiceStartedAt < 1.25) return;
    if (interrupt) for (const source of [...this._sources]) if (source.bus === 'voice') { try { source.node.stop(); } catch {} this._remove(source); }
    const previous = this._voiceChoice.get(selectionGroup);
    const index = choices.length > 1 && previous !== undefined ? (previous + 1) % choices.length : seed % Math.max(1, choices.length);
    const buffer = choices.length ? choices[index] : this._buffer(recipe, seed);
    if (!this._playBuffer(buffer, 'voice', now + .015)) return;
    if (choices.length) this._voiceChoice.set(selectionGroup, index);
    this._voiceUntil = now + .015 + buffer.duration;
    this._voiceStartedAt = now;
    this._voicePriority = priority;
    const gain = this._buses.music.gain;
    gain.cancelScheduledValues(now); gain.setValueAtTime(Number.isFinite(gain.value) ? gain.value : MIX.music, now);
    gain.linearRampToValueAtTime(MIX.music * .45, now + .025);
    gain.setValueAtTime(MIX.music * .45, this._voiceUntil);
    gain.linearRampToValueAtTime(MIX.music, this._voiceUntil + .4);
  }
  event(kind, details = {}) {
    if (!this.ready) return;
    try {
      const {machine, part} = details || {};
      const now = this._context.currentTime; this._prune(now);
      const recipe = kind === 'contact' ? machineName(machine) : kind === 'core-destroyed' ? 'core' : kind;
      if (!['saw', 'guillotine', 'anvil', 'pendulum', 'impact', 'detach', 'core', 'grab', 'drop', 'start', 'retry', 'complete'].includes(recipe)) return;
      const cooldown = kind === 'contact' ? .09 : kind === 'complete' ? .8 : .055;
      const key = kind === 'contact' ? 'contact' : kind;
      if (now - (this._last.get(key) ?? -Infinity) < cooldown) return;
      this._last.set(key, now);
      const seed = 1 + this._level * 101 + (this._serial++ % 8) * 17 + (typeof part === 'string' ? part.length : 0);
      if (kind === 'complete') {
        const effects = [...this._sources].filter(source => source.bus === 'sfx');
        if (effects.length >= AUDIO_LIMITS.sfx) { try { effects[0].node.stop(); } catch {} this._remove(effects[0]); }
      }
      this._play(recipe, 'sfx', now, seed);
      const stale = Number.isFinite(details.age) && details.age > .2;
      if (details.voice === false || stale) return;
      if (kind === 'complete') this._voice('voice-cheer', now, seed, true);
      else if (kind === 'detach' || recipe === 'core') this._voice('voice-ow', now, seed, false, 'detach', 4);
      else if (kind === 'contact') this._voice('voice-ah', now, seed, false, voiceTier(kind, details), voicePriority(kind, details));
    } catch (error) { this._fail(error); }
  }
  tick() {
    if (!this.ready) return;
    try {
      const now = this._context.currentTime; this._prune(now);
      // A stalled tab never replays a backlog. Phase continues from the clock.
      if (this._nextMusic < now - .1) {
        const skipped = Math.ceil((now - this._nextMusic) / STEP);
        this._step += skipped; this._nextMusic += skipped * STEP;
      }
      let scheduled = 0;
      while (this._nextMusic < now + .13 && scheduled++ < 2) {
        this._play('music', 'music', Math.max(now, this._nextMusic), this._level + 13, this._step++);
        this._nextMusic += STEP;
      }
    } catch (error) { this._fail(error); }
  }
}
