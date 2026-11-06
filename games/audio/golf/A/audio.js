(() => {
  'use strict';
  const key = 'quiet-golf-audio-v1';
  let enabled = true, volume = .45, context = null, master = null;
  let foreground = !document.hidden, lastBounce = -Infinity;
  const voices = new Set(), limit = 10;
  try {
    const settings = JSON.parse(localStorage.getItem(key));
    if (settings && typeof settings.enabled === 'boolean') enabled = settings.enabled;
    if (settings && typeof settings.volume === 'number' && Number.isFinite(settings.volume)) volume = Math.max(0, Math.min(1, settings.volume));
  } catch (_) { /* Sound settings must never prevent play. */ }
  const button = document.getElementById('audio-toggle');
  const slider = document.getElementById('audio-volume');
  function controls() {
    button.textContent = `Звук: ${enabled ? 'вкл' : 'выкл'}`;
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', enabled ? 'Звук включён. Выключить звук' : 'Звук выключен. Включить звук');
    slider.value = String(Math.round(volume * 100));
    slider.setAttribute('aria-valuetext', `${Math.round(volume * 100)} процентов`);
  }
  function persist() { try { localStorage.setItem(key, JSON.stringify({enabled, volume})); } catch (_) {} }
  function mix() {
    if (!master) return;
    try {
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(enabled && foreground && !document.hidden ? volume * .28 : 0, context.currentTime, .004);
    } catch (_) {}
  }
  function stop() {
    lastBounce = -Infinity;
    for (const voice of voices) {
      try {
        const t = context.currentTime;
        const envelope = voice.gain.gain;
        if (envelope.cancelAndHoldAtTime) envelope.cancelAndHoldAtTime(t);
        else { const current = envelope.value; envelope.cancelScheduledValues(t); envelope.setValueAtTime(current, t); }
        voice.gain.gain.setTargetAtTime(0, t, .002);
        voice.osc.stop(t + .015);
      } catch (_) {}
    }
  }
  function unlock(event) {
    if (!event.isTrusted || document.hidden || !foreground || !enabled || volume === 0) return;
    if (event.type === 'keydown' && !['Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    try {
      if (!context) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        context = new Audio();
        master = context.createGain();
        master.gain.value = volume * .28;
        master.connect(context.destination);
        context.addEventListener('statechange', () => { if (context.state !== 'running') stop(); });
      }
      if (context.state === 'suspended' || context.state === 'interrupted') {
        const resumed = context.resume();
        if (resumed && resumed.catch) resumed.catch(() => {});
      }
      mix();
    } catch (_) { /* Missing or denied Web Audio is a silent fallback. */ }
  }
  for (const type of ['pointerdown', 'keydown', 'click']) document.addEventListener(type, unlock, true);
  button.addEventListener('click', event => {
    enabled = !enabled;
    if (!enabled) stop(); else unlock(event);
    mix(); controls(); persist();
  });
  slider.addEventListener('input', event => {
    volume = Math.max(0, Math.min(1, Number(slider.value) / 100));
    if (volume === 0) stop(); else unlock(event);
    mix(); controls(); persist();
  });
  window.addEventListener('blur', () => { foreground = false; mix(); stop(); });
  window.addEventListener('focus', () => { foreground = !document.hidden; mix(); });
  document.addEventListener('visibilitychange', () => { foreground = !document.hidden && document.hasFocus(); if (!foreground) { mix(); stop(); } });
  function tone(frequency, offset, duration, gain = .3, type = 'sine', endFrequency = frequency) {
    if (voices.size >= limit) return;
    const t = context.currentTime + offset;
    const osc = context.createOscillator(), envelope = context.createGain();
    const voice = {osc, gain: envelope};
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), t + duration);
    envelope.gain.setValueAtTime(0, context.currentTime);
    envelope.gain.setValueAtTime(0, t);
    envelope.gain.linearRampToValueAtTime(gain, t + .008);
    envelope.gain.exponentialRampToValueAtTime(.0001, t + duration);
    envelope.gain.linearRampToValueAtTime(0, t + duration + .008);
    osc.connect(envelope); envelope.connect(master); voices.add(voice);
    osc.onended = () => { voices.delete(voice); osc.disconnect(); envelope.disconnect(); };
    osc.start(t); osc.stop(t + duration + .012);
  }
  function play(name, strength = 1) {
    if (!enabled || volume === 0 || !foreground || document.hidden || !context || context.state !== 'running') return;
    try {
      if (name === 'buy') { tone(1020, 0, .11, .22); tone(1360, .045, .12, .13); }
      if (name === 'brew') { [210, 290, 380, 530].forEach((f, i) => tone(f, i * .065, .15, .26, 'sine', f * 1.5)); }
      if (name === 'sell') { [660, 830, 990].forEach((f, i) => tone(f, i * .075, .22, .24)); }
      if (name === 'day') { tone(440, 0, .3, .2, 'triangle'); tone(660, .14, .36, .18); }
      if (name === 'hit') { tone(220, 0, .08, .2 + Math.max(0, Math.min(1, strength)) * .22, 'triangle', 65); }
      if (name === 'bounce') {
        const now = performance.now();
        if (strength < 45 || now - lastBounce < 90) return;
        lastBounce = now;
        tone(190, 0, .065, Math.min(.3, strength / 1700), 'triangle', 105);
      }
      if (name === 'sink') { tone(310, 0, .12, .25, 'sine', 130); tone(780, .09, .24, .2); tone(1040, .18, .26, .17); }
      if (name === 'finish') { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .11, .38, .24)); }
    } catch (_) { stop(); }
  }
  window.GameAudio = Object.freeze({play, stop});
  window.getAudioState = () => ({enabled, volume, contextState: context ? context.state : 'uninitialized', activeVoices: voices.size});
  controls();
})();
