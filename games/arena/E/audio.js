"use strict";

const arenaAudio = (() => {
  const storageKey = "reef90/audio/v1";
  const limit = 12;
  const voices = new Set();
  const last = {};
  let enabled = true;
  let volume = .55;
  let context = null;
  let output = null;

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (typeof saved?.enabled === "boolean") enabled = saved.enabled;
    if (Number.isFinite(saved?.volume)) volume = Math.max(0, Math.min(1, saved.volume));
  } catch {
    // Первая партия может начаться без доступа к хранилищу.
  }

  function setOutput() {
    if (!output) return;
    output.gain.cancelScheduledValues(context.currentTime);
    output.gain.setValueAtTime(enabled ? volume * .52 : 0, context.currentTime);
  }

  function release(voice) {
    if (!voices.delete(voice)) return;
    try { voice.osc.disconnect(); } catch {}
    try { voice.gain.disconnect(); } catch {}
  }

  function stop() {
    for (const voice of voices) {
      release(voice);
      try { voice.osc.stop(); } catch {}
    }
    for (const kind of Object.keys(last)) delete last[kind];
  }

  function unlock() {
    if (!enabled || volume === 0) return;
    if (navigator.userActivation && !navigator.userActivation.isActive) return;
    try {
      if (!context) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        const newContext = new Audio();
        const newOutput = newContext.createGain();
        newOutput.connect(newContext.destination);
        context = newContext;
        output = newOutput;
        setOutput();
        context.addEventListener("statechange", () => {
          if (context.state !== "running") stop();
        });
      }
      if (context.state === "suspended" || context.state === "interrupted") {
        context.resume().catch(() => {});
      }
    } catch {
      // Звуковые эффекты остаются дополнительными.
    }
  }

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify({ enabled, volume })); } catch {}
    try { setOutput(); } catch {}
    if (!enabled || volume === 0) stop();
  }

  function tone(from, to, duration, type, level, delay = 0) {
    if (voices.size >= limit) return;

    const start = context.currentTime + delay;
    const end = start + duration;
    const osc = context.createOscillator();
    const gain = context.createGain();
    const voice = { osc, gain };
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(to, end);
    gain.gain.setValueAtTime(.001, start);
    gain.gain.exponentialRampToValueAtTime(level, start + .008);
    gain.gain.exponentialRampToValueAtTime(.001, end);
    osc.connect(gain);
    gain.connect(output);
    osc.onended = () => release(voice);
    osc.start(start);
    osc.stop(end + .006);
    voices.add(voice);
  }

  function play(kind) {
    if (!enabled || volume === 0 || context?.state !== "running") return;
    const interval = kind === "shot" ? .11 : .09;
    const time = context.currentTime;
    if (time - (last[kind] ?? -1) < interval) return;
    last[kind] = time;
    try {
      switch (kind) {
        case "shot":
          tone(370, 115, .092, "sine", .14);
          break;
        case "hit":
          tone(183, 86, .083, "triangle", .22);
          break;
        case "hurt":
          stop();
          tone(153, 57, .29, "triangle", .32);
          tone(88, 46, .34, "sine", .30);
          break;
        case "upgrade":
          tone(392, 402, .17, "sine", .28);
          tone(587, 590, .21, "triangle", .16, .10);
          break;
        case "won":
          tone(330, 332, .26, "sine", .31);
          tone(440, 442, .30, "triangle", .18, .14);
          tone(659, 659, .41, "sine", .29, .29);
          break;
        case "lost":
          tone(247, 220, .23, "triangle", .24);
          tone(147, 105, .38, "sine", .34, .14);
          break;
      }
    } catch {
      stop();
    }
  }

  function snapshot() {
    return {
      enabled,
      volume,
      contextState: context?.state ?? "uninitialized",
      activeVoices: voices.size,
    };
  }

  return {
    unlock, play, stop, snapshot,
    toggle() {
      enabled = !enabled;
      save();
      unlock();
    },
    setVolume(value) {
      volume = Math.max(0, Math.min(1, value));
      save();
      unlock();
    },
  };
})();

window.getAudioState = arenaAudio.snapshot;
