// Independently authored machinery for the full campaign. These recipes are
// not source-game recordings; PCM tests do not establish listening acceptance.
import {SampleAudio, synthesizeSignal, AUDIO_RECIPES, AUDIO_LIMITS, AUDIO_MIX_DB, voiceTier, voicePriority} from './fidelity-audio.js';

const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const levelIndex = value => Number.isInteger(value) ? clamp(value, 0, 99) : 0;
const MUSIC_ROOTS = Object.freeze([220, 246.9417, 196, 261.6256]);
const DURATIONS = Object.freeze({
  electric: .27, piston: .42, press: .55, chain: .46, wheel: .32,
  rotary: .34, spikes: .21, spring: .38, conveyor: .3, platform: .4, slide: .36,
});
export const CAMPAIGN_AUDIO_RECIPES = Object.freeze([...AUDIO_RECIPES, ...Object.keys(DURATIONS)]);
const EFFECT_RECIPES = new Set(CAMPAIGN_AUDIO_RECIPES.filter(recipe => recipe !== 'music' && !recipe.startsWith('voice-')));
// Every machine has a deliberate family, including non-damaging platforms.
// The first four retain the sample's exact recipes; shared mechanisms reuse
// a family rather than producing a new sound for every level configuration.
export const CAMPAIGN_MACHINE_RECIPES = Object.freeze({
  saw: 'saw', guillotine: 'guillotine', anvil: 'anvil', pendulum: 'pendulum',
  railSaw: 'saw', springSpikes: 'spring', inwardSpikes: 'spikes', chainBall: 'chain',
  piston: 'piston', wheel: 'wheel', electric: 'electric', spikeWall: 'spikes',
  press: 'press', cleavers: 'rotary', spikeBay: 'spikes', conveyor: 'conveyor',
  verticalSaw: 'saw', pivotBlade: 'rotary', upPiston: 'piston', crusher: 'press',
  railWheel: 'wheel', drum: 'wheel', barrier: 'slide', bridge: 'platform',
  pivotPlatform: 'platform', tiltPlatform: 'platform', swingPlatform: 'platform',
  spikeBed: 'spikes', spikedWheel: 'wheel',
});
export function campaignMachineRecipe(machine) {
  const type = typeof machine === 'string' ? machine : machine?.type;
  return Object.hasOwn(CAMPAIGN_MACHINE_RECIPES, type) ? CAMPAIGN_MACHINE_RECIPES[type] : 'impact';
}
export function campaignMusicFrequency(level) {
  // Continue the same four-key phrase palette through all 100 levels. The
  // inherited scheduler still uses each full level index for deterministic
  // variation; later levels are not silently clamped to the fourth sample.
  return MUSIC_ROOTS[levelIndex(level) % MUSIC_ROOTS.length];
}
function random(seed) {
  let state = (Number.isFinite(seed) ? seed : 1) >>> 0 || 1;
  return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
}
function envelope(time, duration, attack = .004, decay = 7) {
  return Math.min(1, time / attack) * Math.exp(-time * decay) * clamp((duration - time) / .025, 0, 1);
}

/** Mono PCM used by playback. Existing sample recipes are byte-for-byte reused. */
export function synthesizeCampaignSignal(kind, options = {}) {
  if (!Object.hasOwn(DURATIONS, kind)) return synthesizeSignal(kind, options);
  const rate = clamp(Number.isFinite(options.sampleRate) ? options.sampleRate : 44100, 8000, 96000);
  const duration = DURATIONS[kind], data = new Float32Array(Math.ceil(duration * rate));
  const rng = random(options.seed ?? 1), pitch = .97 + rng() * .06;
  let smoothNoise = 0;
  for (let i = 0; i < data.length; i++) {
    const t = i / rate, noise = rng() * 2 - 1;
    smoothNoise += (noise - smoothNoise) * (1 - Math.exp(-TAU * 850 / rate));
    const tone = (frequency, decay = 0, time = t) => Math.sin(TAU * frequency * pitch * time) * Math.exp(-Math.max(0, time) * decay);
    let value = 0;
    switch (kind) {
      case 'electric': {
        const pulse = .35 + .65 * Math.sin(TAU * 37 * t) ** 2;
        value = envelope(t, duration, .002, 10) * pulse * (.22 * noise + .17 * tone(930) + .13 * tone(1867) + .07 * tone(117));
        break;
      }
      case 'piston': {
        value = .16 * smoothNoise * envelope(t, .17, .012, 4) + .1 * tone(135 + t * 120) * envelope(t, .2, .012, 8);
        const hit = t - .065;
        if (hit >= 0) value += envelope(hit, duration - .065, .002, 10) * (.31 * tone(78, 5, hit) + .16 * tone(475, 7, hit) + .12 * noise * Math.exp(-hit * 35));
        break;
      }
      case 'press': {
        const grind = .65 + .35 * Math.sin(TAU * 24 * t);
        value = envelope(t, duration, .012, 6) * (.24 * tone(56, 4) + .14 * tone(173, 3) + grind * (.18 * smoothNoise + .12 * tone(611, 5)));
        break;
      }
      case 'chain': {
        value = envelope(t, duration, .003, 7) * (.31 * tone(91, 6) + .14 * tone(367, 5));
        for (const delay of [0, .035, .081]) {
          const hit = t - delay;
          if (hit >= 0) value += envelope(hit, duration - delay, .0015, 22) * (.065 * tone(1517, 12, hit) + .05 * tone(2333, 15, hit) + .045 * noise);
        }
        break;
      }
      case 'wheel': {
        const tread = .5 + .5 * Math.sin(TAU * 43 * t) ** 2;
        value = envelope(t, duration, .005, 8) * (.24 * tone(124, 4) + .13 * tone(538, 8) + tread * (.18 * smoothNoise + .06 * noise));
        break;
      }
      case 'rotary': {
        const sweep = .45 + .55 * Math.sin(Math.PI * t / duration) ** 2;
        value = envelope(t, duration, .008, 8) * (.22 * tone(730 + t * 540, 4) + .16 * tone(1493, 8) + .19 * smoothNoise * sweep);
        break;
      }
      case 'spikes':
        value = envelope(t, duration, .002, 18) * (.2 * noise + .19 * tone(1197, 9) + .15 * tone(263, 7));
        break;
      case 'spring':
        value = envelope(t, duration, .003, 8) * (.3 * tone(175 + 210 * Math.exp(-t * 12)) + .13 * tone(685, 8) + .09 * noise * Math.exp(-t * 35));
        break;
      case 'conveyor': {
        const tread = .35 + .65 * Math.sin(TAU * 31 * t) ** 2;
        value = envelope(t, duration, .007, 8) * (.23 * tone(92, 4) + .12 * tone(283, 9) + .24 * smoothNoise * tread);
        break;
      }
      case 'platform':
        value = envelope(t, duration, .008, 7) * (.27 * tone(112, 5) + .16 * tone(329, 4) + .1 * tone(587 - t * 120, 7) + .08 * smoothNoise);
        break;
      case 'slide':
        value = envelope(t, duration, .014, 8) * (.2 * smoothNoise + .16 * tone(351 + t * 90, 5) + .23 * tone(83, 6));
        break;
    }
    // The authored sums fit below .78 without hard-clipping or normalization.
    data[i] = value;
  }
  data[0] = 0; data[data.length - 1] = 0;
  return data;
}

export class CampaignAudio extends SampleAudio {
  constructor({voiceEnabled = false, ...options} = {}) {
    super({...options, voiceFallback: options.voiceFallback ?? false});
    this._voiceEnabled = Boolean(voiceEnabled);
  }
  get voiceEnabled() { return this._voiceEnabled; }
  async loadVoices() {
    // Provisional recordings neither fetch nor play until explicitly enabled.
    // Reuse the same-origin loader, makeup and finite pool limits unchanged.
    return this._voiceEnabled ? super.loadVoices() : false;
  }
  setVoiceEnabled(enabled) {
    enabled = Boolean(enabled);
    if (enabled === this._voiceEnabled) return;
    this._voiceEnabled = enabled;
    if (enabled) { void this.loadVoices(); return; }
    for (const source of [...this._sources]) if (source.bus === 'voice') {
      try { source.node.stop(); } catch { /* Already ended. */ }
      this._remove(source);
    }
    this._voiceUntil = -Infinity; this._voiceStartedAt = -Infinity; this._voicePriority = 0;
    try {
      // Cancel only the retired voice's duck, retaining music position, cached
      // assets, SFX, the exact bus gain, master mute and background-pause intent.
      const gain = this._buses?.music.gain, now = this._context?.currentTime || 0;
      gain?.cancelScheduledValues(now); gain?.setValueAtTime(10 ** (AUDIO_MIX_DB.music / 20), now);
    } catch (error) { this._fail(error); }
  }
  _voice(...args) { if (this._voiceEnabled) return super._voice(...args); }
  reset(level = 0) {
    // Let the base stop sources, reset clocks/cooldowns and release ducking.
    // It creates no buffers during reset, so replace only its four-level clamp.
    super.reset(0);
    this._level = levelIndex(level);
  }
  _buffer(recipe, seed, step = 0) {
    const frequency = campaignMusicFrequency(this._level);
    const key = `${recipe}:${seed}:${step % 16}:${frequency}`;
    if (this._buffers.has(key)) return this._buffers.get(key);
    const context = this._context, pcm = synthesizeCampaignSignal(recipe, {sampleRate: context.sampleRate, seed, step, frequency});
    const buffer = context.createBuffer(1, pcm.length, context.sampleRate); buffer.getChannelData(0).set(pcm);
    if (this._buffers.size >= AUDIO_LIMITS.buffers) this._buffers.delete(this._buffers.keys().next().value);
    this._buffers.set(key, buffer); return buffer;
  }
  event(kind, details = {}) {
    if (!this.ready) return;
    details = details || {};
    try {
      const {machine, part} = details;
      const now = this._context.currentTime; this._prune(now);
      const recipe = kind === 'contact' ? campaignMachineRecipe(machine) : kind === 'core-destroyed' ? 'core' : kind;
      if (!EFFECT_RECIPES.has(recipe)) return;
      // Match the sample's shared contact throttle: 29 machine families must
      // not each get an independent burst budget on multi-contact frames.
      const cooldown = kind === 'contact' ? .09 : kind === 'complete' ? .8 : .055;
      if (now - (this._last.get(kind) ?? -Infinity) < cooldown) return;
      this._last.set(kind, now);
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
}
