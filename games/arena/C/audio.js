"use strict";

const arenaAudio = (() => {
  const storageKey = "north-signal.audio.v1";
  const sound = document.querySelector("#sound");
  const soundText = document.querySelector("#sound-text");
  const slider = document.querySelector("#volume");
  const volumeNumber = document.querySelector("#volume-number");
  let enabled = true;
  let volume = 0.35;
  let context;
  let master;
  const voices = new Set();
  const lastCue = new Map();
  const cues = {
    shot: [[0, 470, 245, 0.075, 0.17, "triangle"]],
    hit: [[0, 180, 94, 0.070, 0.24, "square"]],
    hurt: [[0, 170, 72, 0.20, 0.36, "sawtooth"], [0.07, 92, 46, 0.17, 0.27, "sine"]],
    upgrade: [[0, 440, 440, 0.14, 0.24], [0.10, 554, 554, 0.17, 0.21], [0.19, 740, 740, 0.19, 0.21]],
    won: [[0, 440, 440, 0.19, 0.26], [0.14, 554, 554, 0.19, 0.24], [0.28, 659, 659, 0.19, 0.22], [0.42, 880, 880, 0.38, 0.24]],
    lost: [[0, 330, 330, 0.22, 0.25], [0.15, 247, 247, 0.25, 0.24], [0.34, 147, 108, 0.34, 0.27]],
  };
  const intervals = {shot: 0.16, hit: 0.10};

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (typeof saved?.enabled === "boolean") enabled = saved.enabled;
    if (typeof saved?.volume === "number" && Number.isFinite(saved.volume)) {
      volume = Math.max(0, Math.min(1, saved.volume));
    }
  } catch {}

  function stop() {
    for (const voice of voices) {
      voice.oscillator.onended = null;
      try { voice.oscillator.stop(); } catch {}
      voice.oscillator.disconnect();
      voice.gain.disconnect();
    }
    voices.clear();
    lastCue.clear();
  }

  function reflect() {
    const percent = Math.round(volume * 100);
    sound.setAttribute("aria-pressed", String(enabled));
    soundText.textContent = enabled ? "Звук вкл." : "Звук выкл.";
    slider.value = String(percent);
    slider.setAttribute("aria-valuetext", percent + "%");
    volumeNumber.value = percent + "%";
    if (!master) return;
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    if (!enabled || volume === 0) {
      master.gain.setValueAtTime(0, now);
      stop();
    } else {
      master.gain.setTargetAtTime(volume * 0.58, now, 0.014);
    }
  }

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify({enabled, volume})); } catch {}
  }

  function unlock(event) {
    if (!event.isTrusted || !enabled || volume === 0 || document.hidden) return;
    try {
      if (!context) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        const next = new Audio();
        const gain = next.createGain();
        gain.gain.value = volume * 0.58;
        gain.connect(next.destination);
        context = next;
        master = gain;
        context.addEventListener("statechange", () => {
          if (context.state !== "running") stop();
        });
      }
      if (context.state === "suspended" || context.state === "interrupted") {
        context.resume().catch(() => {});
      }
    } catch {}
  }

  function play(name) {
    if (!enabled || !volume || context?.state !== "running" || document.hidden) return;
    const now = context.currentTime;
    if (now - (lastCue.get(name) ?? -Infinity) < (intervals[name] ?? 0)) return;
    lastCue.set(name, now);
    for (const [offset, from, to, duration, level, type = "triangle"] of cues[name]) {
      if (voices.size >= 9) break;
      try {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const at = now + offset;
        const voice = {oscillator, gain};
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(from, at);
        oscillator.frequency.exponentialRampToValueAtTime(to, at + duration);
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(level, at + 0.011);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
        oscillator.connect(gain);
        gain.connect(master);
        oscillator.onended = () => {
          voices.delete(voice);
          oscillator.disconnect();
          gain.disconnect();
        };
        oscillator.start(at);
        oscillator.stop(at + duration + 0.012);
        voices.add(voice);
      } catch {}
    }
  }

  sound.addEventListener("click", (event) => {
    enabled = !enabled;
    reflect();
    save();
    unlock(event);
  });
  slider.addEventListener("input", (event) => {
    volume = Number(slider.value) / 100;
    reflect();
    save();
    unlock(event);
  });
  slider.addEventListener("pointerup", unlock);
  reflect();

  window.getAudioState = () => ({
    enabled, volume, contextState: context?.state ?? "uninitialized", activeVoices: voices.size,
  });
  return {unlock, play, stop};
})();
