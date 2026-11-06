'use strict';

const createGameAudio = (storageKey, effects, bindToggle) => {
  const toggle = document.getElementById('audio-toggle');
  const slider = document.getElementById('audio-volume');
  const buffers = new Map();
  const voices = new Set();
  const voiceLimit = 4;
  let enabled = true;
  let volume = .65;
  let context;
  let master;
  let revision = 0;

  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey));
    if (typeof saved?.enabled === 'boolean') enabled = saved.enabled;
    if (Number.isFinite(saved?.volume) && saved.volume >= 0 && saved.volume <= 1) volume = saved.volume;
  } catch {
    // Storage can be restricted, especially when the game is embedded.
  }

  function paintSettings() {
    toggle.textContent = enabled ? 'Звук: вкл' : 'Звук: выкл';
    toggle.setAttribute('aria-pressed', String(enabled));
    slider.value = String(Math.round(volume * 100));
  }

  function saveSettings() {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ enabled, volume }));
    } catch {
      // Keep the settings for this page even when storage is unavailable.
    }
  }

  function retire(voice) {
    voices.delete(voice);
    voice.source.disconnect();
    voice.gain.disconnect();
  }

  function stop() {
    revision++;
    for (const voice of voices) {
      try {
        const now = context.currentTime;
        if (context.state !== 'running') {
          voice.source.stop();
          retire(voice);
        } else if (!voice.stopping) {
          voice.stopping = true;
          voice.gain.gain.setValueAtTime(voice.level, now);
          voice.gain.gain.linearRampToValueAtTime(0, now + .008);
          voice.source.stop(now + .008);
        }
      } catch {
        retire(voice);
      }
    }
  }

  function setMasterLevel() {
    if (!enabled || volume === 0) stop();
    if (context && enabled && volume > 0) {
      try {
        master.gain.setTargetAtTime(.52 * volume, context.currentTime, .012);
      } catch {
        // A failed audio device does not affect the settings controls.
      }
    }
  }

  bindToggle(toggle, () => {
    enabled = !enabled;
    paintSettings();
    setMasterLevel();
    saveSettings();
  });
  slider.addEventListener('input', () => {
    volume = Number(slider.value) / 100;
    setMasterLevel();
    saveSettings();
  });
  window.addEventListener('blur', stop);
  window.addEventListener('pagehide', stop);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
  });

  function canPlay() {
    return enabled && volume > 0 && !document.hidden && document.hasFocus();
  }

  function getBuffer(name) {
    if (buffers.has(name)) return buffers.get(name);
    const notes = effects[name];
    const sampleRate = context.sampleRate;
    const duration = Math.max(...notes.map(([offset, length]) => offset + length));
    const buffer = context.createBuffer(1, Math.ceil(duration * sampleRate), sampleRate);
    const samples = buffer.getChannelData(0);
    for (const [offset, length, fromHz, toHz, overtone, level] of notes) {
      const start = Math.round(offset * sampleRate);
      const count = Math.min(samples.length - start, Math.ceil(length * sampleRate));
      const attack = Math.min(.012, length * .15);
      const release = Math.min(.025, length * .3);
      for (let i = 0; i < count; i++) {
        const time = i / sampleRate;
        const phase = 2 * Math.PI * (fromHz * time + (toHz - fromHz) * time * time / (2 * length));
        const envelope = Math.min(1, time / attack, (count - 1 - i) / (sampleRate * release));
        const body = Math.sin(phase) + overtone * Math.sin(phase * 2.37);
        samples[start + i] += level * envelope * Math.exp(-3 * time / length) * body;
      }
    }
    buffers.set(name, buffer);
    return buffer;
  }

  function playNow(name, level, rate) {
    if (!canPlay() || context?.state !== 'running' || voices.size >= voiceLimit) return;
    let voice;
    try {
      const source = context.createBufferSource();
      source.buffer = getBuffer(name);
      source.playbackRate.value = rate;
      const gain = context.createGain();
      gain.gain.value = level;
      voice = { source, gain, level, stopping: false };
      source.connect(gain);
      gain.connect(master);
      source.onended = () => retire(voice);
      source.start();
      voices.add(voice);
    } catch {
      if (voice) retire(voice);
    }
  }

  function play(name, { gesture, level = 1, rate = 1 } = {}) {
    if (!canPlay()) return;
    try {
      if (context?.state === 'running') {
        playNow(name, level, rate);
        return;
      }
      // Resume only on a real user action. Simulation events do not queue.
      if (!gesture?.isTrusted || navigator.userActivation?.isActive === false) return;
      if (!context || context.state === 'closed') {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        const nextContext = new Audio();
        const nextMaster = nextContext.createGain();
        nextMaster.gain.value = .52 * volume;
        nextMaster.connect(nextContext.destination);
        nextContext.addEventListener('statechange', () => {
          if (context === nextContext && nextContext.state !== 'running'
              && (voices.size || nextContext.state !== 'suspended')) stop();
        });
        context = nextContext;
        master = nextMaster;
      }
      if (context.state === 'running') {
        playNow(name, level, rate);
        return;
      }
      const request = revision;
      const deadline = performance.now() + 200;
      context.resume().then(() => {
        if (revision === request && performance.now() <= deadline) {
          setMasterLevel();
          playNow(name, level, rate);
        }
      }).catch(() => {});
    } catch {
      // Web Audio may be disabled or denied. Gameplay remains available.
    }
  }

  Object.defineProperty(window, 'getAudioState', {
    value: () => ({
      enabled,
      volume,
      contextState: context?.state ?? 'uninitialized',
      activeVoices: [...voices].filter(voice => !voice.stopping).length
    })
  });

  paintSettings();
  return { play, stop };
};
