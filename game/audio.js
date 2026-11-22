// audio.js — every sound is synthesized with WebAudio. No audio files, no
// network: soft footsteps, a lockpick tick, a pickup chime, a rising alarm
// siren and a getaway fanfare, all from oscillators and filtered noise.
export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    muted: false,
    sirenNodes: null,
    ensure() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return true;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.35;
        this.master.connect(this.ctx.destination);
        return true;
      } catch {
        return false;
      }
    },
    tone(freq, dur, type, vol, when = 0, slideTo = null) {
      if (!this.ensure()) return;
      const t0 = this.ctx.currentTime + when;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    },
    noiseBurst(dur, vol, filterFreq) {
      if (!this.ensure()) return;
      const t0 = this.ctx.currentTime;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = filterFreq;
      const gain = this.ctx.createGain();
      gain.gain.value = vol;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start(t0);
    },
    step(sneaking) {
      this.noiseBurst(0.05, sneaking ? 0.05 : 0.12, 900);
    },
    tick() {
      this.tone(1400, 0.05, 'square', 0.08);
    },
    pickup() {
      this.tone(660, 0.12, 'sine', 0.22);
      this.tone(990, 0.18, 'sine', 0.22, 0.09);
      this.tone(1320, 0.24, 'sine', 0.18, 0.18);
    },
    throwClink() {
      this.tone(2200, 0.06, 'triangle', 0.14);
      this.noiseBurst(0.1, 0.1, 2400);
    },
    empZap() {
      this.tone(180, 0.35, 'sawtooth', 0.16, 0, 40);
      this.noiseBurst(0.3, 0.12, 3200);
    },
    denied() {
      this.tone(160, 0.15, 'square', 0.12);
    },
    startSiren() {
      if (!this.ensure() || this.sirenNodes) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 620;
      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 1.6;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 220;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.06;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start();
      lfo.start();
      this.sirenNodes = { osc, lfo, gain };
    },
    stopSiren() {
      if (!this.sirenNodes) return;
      const { osc, lfo, gain } = this.sirenNodes;
      try {
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
        osc.stop(this.ctx.currentTime + 0.4);
        lfo.stop(this.ctx.currentTime + 0.4);
      } catch { /* already stopped */ }
      this.sirenNodes = null;
    },
    fanfare() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((n, i) => this.tone(n, 0.32, 'triangle', 0.22, i * 0.13));
      this.tone(1319, 0.6, 'triangle', 0.2, 0.55);
    },
    caughtSting() {
      this.tone(220, 0.5, 'sawtooth', 0.18, 0, 110);
      this.tone(110, 0.7, 'sawtooth', 0.14, 0.1, 55);
    },
  };
  return audio;
}
