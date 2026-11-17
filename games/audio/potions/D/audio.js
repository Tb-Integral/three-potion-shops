'use strict';

const createGameAudio = (storageKey) => {
  const toggle = document.getElementById('soundToggle');
  const slider = document.getElementById('soundVolume');
  let enabled = true;
  let volume = 0.45;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (typeof saved?.enabled === 'boolean') enabled = saved.enabled;
    if (Number.isFinite(saved?.volume) && saved.volume >= 0 && saved.volume <= 1) volume = saved.volume;
  } catch { /* The controls also work for this session without storage. */ }

  let context = null;
  let output = null;
  let resumeRequest = null;
  let resumeAt = -Infinity;
  let foreground = !document.hidden;
  let revision = 0;
  const voices = new Set();
  const limit = 6;
  const audible = () => enabled && volume > 0 && foreground && !document.hidden;

  function reflect() {
    toggle.textContent = enabled ? 'Звук: вкл' : 'Звук: выкл';
    toggle.setAttribute('aria-pressed', String(enabled));
    slider.value = Math.round(volume * 100);
    slider.setAttribute('aria-valuetext', slider.value + ' %');
  }
  function persist() {
    reflect();
    try { localStorage.setItem(storageKey, JSON.stringify({enabled, volume})); } catch {}
  }
  function stop() {
    revision++;
    for (const voice of [...voices]) retire(voice);
  }
  function retire(voice) {
    voices.delete(voice);
    try {
      const now = context.currentTime;
      if (context.state !== 'running') {
        voice.gain.disconnect();
        voice.osc.stop();
        return;
      }
      const level = voice.gain.gain;
      level.cancelAndHoldAtTime(now);
      level.linearRampToValueAtTime(0, now + 0.006);
      voice.osc.stop(now + 0.007);
    } catch {
      try { voice.gain.disconnect(); voice.osc.stop(); } catch {}
    }
  }
  function unlock(event) {
    if (!event.isTrusted || !audible() || navigator.userActivation?.isActive === false) return;
    try {
      if (!context) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        context = new Audio();
        output = context.createGain();
        output.gain.value = volume;
        output.connect(context.destination);
        context.addEventListener('statechange', () => {
          if (context.state !== 'running') stop();
        });
      }
      const now = performance.now();
      if ((context.state === 'suspended' || context.state === 'interrupted') && (!resumeRequest || now - resumeAt > 250)) {
        resumeAt = now;
        const pending = context.resume().catch(() => {});
        resumeRequest = pending;
        pending.then(() => { if (resumeRequest === pending) resumeRequest = null; });
      }
    } catch { /* Audio is optional. */ }
  }
  function tones(score, strength) {
    const now = context.currentTime;
    for (const [delay, duration, type, from, to, peak] of score) {
      if (voices.size >= limit) return;
      const start = now + delay;
      const end = start + duration;
      const osc = context.createOscillator();
      const gain = context.createGain();
      const voice = {osc, gain};
      osc.type = type;
      osc.frequency.setValueAtTime(from, start);
      osc.frequency.exponentialRampToValueAtTime(to, end);
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(peak * strength, start + Math.min(0.012, duration / 5));
      gain.gain.exponentialRampToValueAtTime(0.00008, end - 0.004);
      gain.gain.linearRampToValueAtTime(0, end);
      osc.connect(gain);
      gain.connect(output);
      osc.onended = () => { voices.delete(voice); osc.disconnect(); gain.disconnect(); };
      osc.start(start);
      osc.stop(end);
      voices.add(voice);
    }
  }
  function play(score, strength = 1, fromGesture = false) {
    if (!audible() || !context || !output) return;
    const id = ++revision;
    const deadline = performance.now() + 220;
    const run = () => {
      if (id !== revision || !audible() || context.state !== 'running' || performance.now() > deadline) return;
      try { tones(score, strength); } catch { stop(); }
    };
    if (context.state === 'running') run();
    else if (fromGesture && resumeRequest) resumeRequest.then(run);
  }
  for (const name of ['pointerdown', 'pointerup', 'keydown', 'click']) {
    document.addEventListener(name, event => {
      if (event.button > 0 || event.repeat) return;
      // A tap's click can be the first event after its iframe gets focus.
      // Edge reports isPrimary=false for this click, including for a single finger.
      if (name.startsWith('pointer') && !event.isPrimary) return;
      if (!event.target.closest?.('button, input, canvas')) return;
      if (event.type === 'keydown' && !['Enter', ' ', 'Home', 'End', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      // Disabling the sound for the first time needs no audio device.
      if (event.target.closest('#soundToggle') && enabled) return;
      unlock(event);
    }, true);
  }
  toggle.addEventListener('click', event => {
    enabled = !enabled;
    if (enabled) unlock(event);
    else stop();
    persist();
  });
  slider.addEventListener('input', event => {
    volume = Number(slider.value) / 100;
    if (!volume) stop();
    else unlock(event);
    if (output) {
      try { output.gain.setTargetAtTime(volume, context.currentTime, 0.003); } catch {}
    }
    persist();
  });
  function leave() { foreground = false; stop(); }
  function enter() { foreground = !document.hidden && document.hasFocus(); }
  window.addEventListener('blur', leave);
  window.addEventListener('focus', enter);
  window.addEventListener('pagehide', leave);
  window.addEventListener('pageshow', enter);
  document.addEventListener('visibilitychange', () => document.hidden ? leave() : enter());
  reflect();
  window.getAudioState = () => ({enabled, volume, contextState: context?.state ?? 'uninitialized', activeVoices: voices.size});
  return {play, stop};
};
