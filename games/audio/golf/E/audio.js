"use strict";

const createGameAudio = (storageKey, onActivate) => {
  const toggle = document.getElementById("sound-toggle");
  const slider = document.getElementById("sound-volume");
  const voices = new Set();
  const voiceLimit = 8;
  const masterLevel = .42;
  let enabled = true;
  let volume = .55;
  let context;
  let master;
  let focused = true;
  let pending;

  try {
    const settings = JSON.parse(localStorage.getItem(storageKey));
    if (typeof settings?.enabled === "boolean") enabled = settings.enabled;
    if (Number.isFinite(settings?.volume) && settings.volume >= 0 && settings.volume <= 1) {
      volume = Math.round(settings.volume * 100) / 100;
    }
  } catch {
    // The controls also work with in-memory settings.
  }

  function updateControls() {
    toggle.textContent = enabled ? "Звук: вкл" : "Звук: выкл";
    toggle.setAttribute("aria-pressed", String(enabled));
    slider.value = Math.round(volume * 100);
    if (master && context.state !== "closed") {
      try {
        const now = context.currentTime;
        const gain = master.gain;
        const level = enabled ? volume * masterLevel : 0;
        if (typeof gain.cancelAndHoldAtTime === "function") gain.cancelAndHoldAtTime(now);
        else gain.cancelScheduledValues(now);
        // Give a playing sound the same short release on mute and at zero volume.
        if (context.state === "running") gain.setTargetAtTime(level, now, .002);
        else gain.setValueAtTime(level, now);
      } catch {
        stop();
      }
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({enabled, volume}));
    } catch {
      // Keep the current choice for this page.
    }
  }

  function audible() {
    return enabled && volume > 0 && focused && !document.hidden;
  }

  function retire(voice) {
    if (!voices.delete(voice)) return;
    voice.oscillator.disconnect();
    voice.envelope.disconnect();
  }

  function stop() {
    pending = undefined;
    for (const voice of voices) {
      const now = context.currentTime;
      const gain = voice.envelope.gain;
      try {
        if (context.state === "running" && voice.start <= now && voice.end > now &&
            typeof gain.cancelAndHoldAtTime === "function") {
          if (voice.releasing) continue;
          voice.releasing = true;
          const end = now + .007;
          gain.cancelAndHoldAtTime(now);
          gain.linearRampToValueAtTime(0, end);
          voice.oscillator.stop(end);
        } else {
          // This also removes notes scheduled to start later.
          retire(voice);
          voice.oscillator.stop(now);
        }
      } catch {
        retire(voice);
      }
    }
  }

  function start(notes, strength) {
    if (!audible() || context?.state !== "running") return;
    const now = context.currentTime;
    for (const {type, hz, tail = hz, at = 0, duration, peak} of notes) {
      if (voices.size >= voiceLimit) break;
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      const start = now + at;
      const end = start + duration;
      const voice = {oscillator, envelope, start, end};
      voices.add(voice);
      try {
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(hz, start);
        oscillator.frequency.exponentialRampToValueAtTime(tail, end);
        envelope.gain.setValueAtTime(0, start);
        envelope.gain.linearRampToValueAtTime(peak * strength, start + .008);
        envelope.gain.exponentialRampToValueAtTime(.0001, end - .006);
        envelope.gain.linearRampToValueAtTime(0, end);
        oscillator.connect(envelope).connect(master);
        oscillator.onended = () => retire(voice);
        oscillator.start(start);
        oscillator.stop(end);
      } catch {
        retire(voice);
      }
    }
  }

  function unlock() {
    if (context && context.state !== "closed") return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    const next = new Audio();
    try {
      const output = next.createGain();
      output.gain.value = volume * masterLevel;
      output.connect(next.destination);
      next.addEventListener("statechange", () => {
        if (context === next && next.state !== "running" && voices.size) stop();
      });
      context = next;
      master = output;
    } catch (error) {
      next.close().catch(() => {});
      throw error;
    }
  }

  function play(notes, {gesture = false, strength = 1} = {}) {
    if (gesture && !document.hidden) focused = true;
    if (!audible()) return;
    try {
      if (gesture) unlock();
      if (context?.state === "running") {
        pending = undefined;
        start(notes, strength);
      } else if (gesture && context && context.state !== "closed") {
        // Keep only the triggering effect while the browser answers this gesture.
        const request = {time: performance.now()};
        pending = request;
        context.resume().then(() => {
          if (pending !== request) return;
          pending = undefined;
          if (performance.now() - request.time < 300) start(notes, strength);
        }).catch(() => {
          if (pending === request) pending = undefined;
        });
      }
    } catch {
      // Audio failures leave the action and its game state intact.
    }
  }

  onActivate(toggle, event => {
    enabled = !enabled;
    if (!enabled) stop();
    updateControls();
    saveSettings();
    if (enabled && event.isTrusted) play([], {gesture: true});
  });
  slider.addEventListener("input", () => {
    volume = slider.valueAsNumber / 100;
    if (volume === 0) stop();
    updateControls();
    saveSettings();
  });
  window.addEventListener("blur", () => {
    focused = false;
    stop();
  });
  window.addEventListener("focus", () => { focused = true; });
  window.addEventListener("pagehide", stop);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
  });
  updateControls();

  window.getAudioState = () => ({
    enabled, volume, contextState: context?.state ?? "uninitialized", activeVoices: voices.size,
  });
  return {play, stop};
};
