export type Effect = 'land' | 'arrow' | 'ding' | 'clang' | 'step' | 'fwip' | 'clink'
  | 'boing' | 'whack' | 'ignite' | 'fire' | 'roar' | 'defeat' | 'spin' | 'swoop';
type Layer = { hz: number; end?: number; length: number; gain: number; noise?: boolean; wave?: OscillatorType; delay?: number; build?: boolean };
const effects: Record<Effect, Layer[]> = {
  land: [{ hz: 170, end: 65, length: .075, gain: .13 }],
  arrow: [{ hz: 2800, end: 700, length: .13, gain: .15, noise: true }],
  ding: [{ hz: 1100, length: .25, gain: .12 }, { hz: 2200, length: .13, gain: .045 }],
  clang: [{ hz: 780, end: 710, length: .18, gain: .09 }, { hz: 1297, length: .13, gain: .055 }, { hz: 2110, length: .08, gain: .025 }],
  step: [{ hz: 210, end: 100, length: .065, gain: .09 }, { hz: 650, length: .045, gain: .07, noise: true }],
  fwip: [{ hz: 3300, end: 600, length: .09, gain: .14, noise: true }],
  clink: [{ hz: 1500, length: .11, gain: .075 }, { hz: 2380, length: .075, gain: .025 }],
  boing: [{ hz: 150, end: 650, length: .16, gain: .2, wave: 'triangle' }, { hz: 580, end: 150, length: .3, gain: .12, delay: .12 }],
  whack: [{ hz: 190, end: 48, length: .16, gain: .35, wave: 'triangle' }, { hz: 1250, end: 180, length: .105, gain: .34, noise: true }],
  ignite: [{ hz: 400, end: 1800, length: .42, gain: .22, noise: true }, { hz: 100, end: 55, length: .3, gain: .08, wave: 'triangle' }],
  fire: [{ hz: 1000, end: 230, length: 1.4, gain: .24, noise: true, build: true }],
  roar: [{ hz: 115, end: 48, length: .48, gain: .14, wave: 'sawtooth' }, { hz: 530, end: 160, length: .5, gain: .2, noise: true }],
  defeat: [{ hz: 130, end: 32, length: 1.1, gain: .17, wave: 'sawtooth' }, { hz: 700, end: 110, length: 1.2, gain: .21, noise: true }],
  spin: [{ hz: 90, end: 330, length: 2.25, gain: .11, wave: 'triangle', build: true }, { hz: 350, end: 1800, length: 2.25, gain: .14, noise: true, build: true }],
  swoop: [{ hz: 1900, end: 180, length: .75, gain: .21, noise: true }],
};

class SoundEffects {
  enabled = true;
  private context?: AudioContext;
  private master?: GainNode;
  private noise?: AudioBuffer;
  private voices = new Set<{ source: AudioScheduledSourceNode; gain: GainNode }>();
  private last = new Map<Effect, number>();
  private pendingIgnition = false;

  init() {
    const button = document.querySelector<HTMLButtonElement>('#sound')!;
    const refresh = () => { button.textContent = this.enabled ? 'Sound: ON' : 'Sound: OFF'; button.setAttribute('aria-pressed', String(this.enabled)); };
    refresh();
    button.onclick = () => { this.enabled = !this.enabled; this.stopAll(); if (this.master && this.context) this.master.gain.setTargetAtTime(this.enabled ? .35 : 0, this.context.currentTime, .01); refresh(); if (this.enabled) void this.unlock(); };
    // Capture runs before Phaser handles the same first click/key, including character selection.
    const unlock = () => { if (this.enabled) void this.unlock(); };
    document.addEventListener('pointerdown', unlock, { capture: true });
    document.addEventListener('keydown', unlock, { capture: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.stopAll(); });
  }

  async unlock() {
    try {
      if (!this.context) {
        const a = this.context = new AudioContext();
        this.master = a.createGain(); this.master.gain.value = this.enabled ? .35 : 0;
        const limiter = a.createDynamicsCompressor();
        limiter.threshold.value = -16; limiter.knee.value = 10; limiter.ratio.value = 8;
        limiter.attack.value = .003; limiter.release.value = .12;
        this.master.connect(limiter); limiter.connect(a.destination);
        this.noise = a.createBuffer(1, a.sampleRate * 2.4, a.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      if (this.context.state === 'suspended') await this.context.resume();
      if (this.pendingIgnition) { this.pendingIgnition = false; this.play('ignite'); }
    } catch { /* Browser audio being unavailable must never affect gameplay. */ }
  }

  play(effect: Effect, delay = 0) {
    if (!this.enabled) return;
    const a = this.context;
    if (!a || a.state !== 'running') { if (effect === 'ignite') this.pendingIgnition = true; return; }
    const interval = effect === 'step' ? .28 : effect === 'clang' ? .16 : effect === 'fwip' || effect === 'clink' ? .24 : .045;
    if (a.currentTime - (this.last.get(effect) ?? -10) < interval || this.voices.size + effects[effect].length > 16) return;
    this.last.set(effect, a.currentTime);
    for (const layer of effects[effect]) this.layer(layer, delay);
  }

  grapple() { this.play('fwip'); this.play('clink', .075); }

  private layer(layer: Layer, delay: number) {
    const a = this.context!, start = a.currentTime + delay + (layer.delay ?? 0), end = start + layer.length;
    const gain = a.createGain(), filter = a.createBiquadFilter();
    filter.type = 'lowpass'; filter.Q.value = .7;
    filter.frequency.setValueAtTime(layer.noise ? layer.hz : 2200, start);
    if (layer.noise) filter.frequency.exponentialRampToValueAtTime(layer.end ?? layer.hz, end);
    let source: AudioBufferSourceNode | OscillatorNode;
    if (layer.noise) { source = a.createBufferSource(); source.buffer = this.noise!; }
    else {
      source = a.createOscillator(); source.type = layer.wave ?? 'sine';
      source.frequency.setValueAtTime(layer.hz, start);
      source.frequency.exponentialRampToValueAtTime(layer.end ?? layer.hz, end);
    }
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.linearRampToValueAtTime(layer.build ? layer.gain * .12 : layer.gain, start + .009);
    if (layer.build) gain.gain.linearRampToValueAtTime(layer.gain, start + layer.length * .78);
    gain.gain.exponentialRampToValueAtTime(.0001, end);
    source.connect(filter); filter.connect(gain); gain.connect(this.master!);
    const voice = { source, gain }; this.voices.add(voice);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); this.voices.delete(voice); };
    source.start(start); source.stop(end + .015);
  }

  stopAll() {
    this.pendingIgnition = false; this.last.clear();
    for (const voice of this.voices) {
      const now = this.context!.currentTime;
      voice.gain.gain.cancelScheduledValues(now); voice.gain.gain.setTargetAtTime(.0001, now, .005);
      try { voice.source.stop(now + .025); } catch { /* Already ended. */ }
    }
  }
}

export const sfx = new SoundEffects();
