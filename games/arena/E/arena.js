"use strict";

(() => {
  const $ = (id) => document.getElementById(id);
  const station = document.querySelector(".station");
  const bay = $("bay");
  const field = $("field");
  const art = arenaArt.create(field);
  const panels = { menu: $("menuPanel"), paused: $("pausePanel"), upgrade: $("upgradePanel"), result: $("resultPanel") };
  const pauseButton = $("pauseButton");
  const volume = $("volume");
  const muteButton = $("muteButton");
  const notice = $("notice");
  const tau = 2 * Math.PI;
  const step = .01;
  const end = 9000;
  const maxEnemies = 52;
  const maxBolts = 58;
  const maxEffects = 110;
  const keys = new Set();
  const moveKeys = {
    KeyA: [-1, 0], ArrowLeft: [-1, 0],
    KeyD: [1, 0], ArrowRight: [1, 0],
    KeyW: [0, -1], ArrowUp: [0, -1],
    KeyS: [0, 1], ArrowDown: [0, 1],
  };
  const species = {
    drift: { radius: 16, speed: 96, hp: 2 },
    dart: { radius: 15, speed: 133, hp: 1 },
    shell: { radius: 24, speed: 68, hp: 5 },
  };
  const icon = {
    twin: '<path d="M5 19 10 5M14 19 19 5M10 5l2 5m7-5 2 5"/>',
    motor: '<path d="M13 3 5 14h6l-1 7 9-11h-6z"/>',
    repair: '<path d="M12 21 4.6 14a5 5 0 0 1 7.4-6.7A5 5 0 0 1 19.4 14z"/><path d="M9 12h6m-3-3v6"/>',
    drill: '<path d="M4 17 17 4l4 1 1 4L9 22zm5-5 4 4m0-8 4 4"/>',
    cadence: '<path d="M5 8h13l-4-4m4 4-4 4M3 16h13l-4-4m4 4-4 4"/>',
    air: '<path d="M12 3a9 9 0 1 0 9 9m-9-4v5l4 2M18 3v6m-3-3h6"/>',
  };
  const modules = [
    [
      {
        id: "twin", name: "Двойной импульс", detail: "Два снаряда за выстрел",
        apply: (s) => { s.twin = true; },
      },
      {
        id: "motor", name: "Гидроускоритель", detail: "Скорость +22%",
        apply: (s) => { s.player.speed *= 1.22; },
      },
      {
        id: "repair", name: "Усиленный корпус", detail: "+2 к максимуму, ремонт на 2",
        apply: (s) => { s.maxHealth += 2; s.health += 2; },
      },
    ],
    [
      {
        id: "drill", name: "Пробойник", detail: "+1 к урону и +40% дальности",
        apply: (s) => { s.damage += 1; s.range *= 1.4; },
      },
      {
        id: "cadence", name: "Быстрый заряд", detail: "На 50% больше выстрелов",
        apply: (s) => { s.interval /= 1.5; s.shotWait = 0; },
      },
      {
        id: "air", name: "Аварийный контур", detail: "Полный ремонт, +1 к запасу",
        apply: (s) => { s.maxHealth += 1; s.health = s.maxHealth; s.invulnerable = 2; },
      },
    ],
  ];

  let arena = { width: 960, height: 540 };
  let state = makeState("menu");
  let surfaceWidth = 0;
  let surfaceHeight = 0;
  let frameId = null;
  let lastFrame = null;
  let carry = 0;
  let previousHealth = "";
  let stage = 0;
  let moduleNoticeUntil = 0;

  function makeState(phase) {
    return {
      phase, ticks: 0, elapsed: 0, kills: 0, health: 7, maxHealth: 7,
      player: { x: arena.width / 2, y: arena.height / 2, vx: 0, vy: 0, radius: 17, speed: 240, angle: -.35 },
      enemies: [], projectiles: [], effects: [], upgrades: [],
      input: { x: 0, y: 0 }, pointer: null,
      shotWait: .15, shotFlash: 0, firingAngle: 0, invulnerable: 0, hurt: 0,
      damage: 1, range: 292, interval: .35, twin: false,
      spawnWait: .75, id: 0, shownDart: false, shownShell: false,
    };
  }

  function dimensions(w, h) {
    const ratio = w / h;
    const area = 465000;
    return { width: Math.round(Math.sqrt(area * ratio)), height: Math.round(Math.sqrt(area / ratio)) };
  }

  function resize() {
    const w = bay.clientWidth;
    const h = bay.clientHeight;
    if (w < 1 || h < 1) return;
    if (w !== surfaceWidth || h !== surfaceHeight) resetInput();
    surfaceWidth = w;
    surfaceHeight = h;
    if (state.phase === "menu") {
      arena = dimensions(w, h);
      state.player.x = arena.width / 2;
      state.player.y = arena.height / 2;
    }
    const scale = Math.min(w / arena.width, h / arena.height);
    art.fit(arena.width, arena.height, Math.min(w, arena.width * scale), Math.min(h, arena.height * scale));
    art.draw(state);
  }

  function clock(totalSeconds) {
    const seconds = Math.floor(totalSeconds);
    return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
  }

  function hud() {
    const remaining = Math.ceil((end - state.ticks) / 100);
    const timeLabel = clock(remaining);
    const kills = String(state.kills);
    const health = state.health + "/" + state.maxHealth;
    const timer = $("timer");
    const killCount = $("killCount");
    if (timer.textContent !== timeLabel) timer.textContent = timeLabel;
    if (killCount.textContent !== kills) killCount.textContent = kills;
    if (previousHealth !== health) {
      $("hullPips").replaceChildren(...Array.from({ length: state.maxHealth }, (_, i) => {
        const pip = document.createElement("i");
        if (i < state.health) pip.className = "filled";
        return pip;
      }));
      $("hullText").textContent = "Корпус " + state.health + " из " + state.maxHealth;
      previousHealth = health;
    }
    $("timeFill").style.transform = "scaleX(" + (1 - state.ticks / end) + ")";
    station.dataset.hurt = String(state.hurt > 0);

    const showNotice = state.phase === "playing" && state.ticks < moduleNoticeUntil;
    notice.hidden = !showNotice;
  }

  function refreshAudio() {
    const prefs = arenaAudio.snapshot();
    muteButton.setAttribute("aria-pressed", String(prefs.enabled));
    $("muteLabel").textContent = prefs.enabled ? "Звук вкл." : "Звук выкл.";
    volume.value = Math.round(prefs.volume * 100);
  }

  function resetInput() {
    keys.clear();
    releasePointer();
    state.input.x = 0;
    state.input.y = 0;
    state.player.vx = 0;
    state.player.vy = 0;
  }

  function releasePointer() {
    const pointer = state.pointer;
    if (!pointer) return;
    state.pointer = null;
    try {
      if (field.hasPointerCapture(pointer.id)) field.releasePointerCapture(pointer.id);
    } catch {}
  }

  function stopFrame() {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    lastFrame = null;
    carry = 0;
  }

  function changePhase(phase, focus = null) {
    stopFrame();
    resetInput();
    arenaAudio.stop();
    state.phase = phase;
    station.dataset.phase = phase;
    pauseButton.disabled = phase !== "playing";
    panels.menu.hidden = phase !== "menu";
    panels.paused.hidden = phase !== "paused";
    panels.upgrade.hidden = phase !== "upgrade";
    panels.result.hidden = phase !== "won" && phase !== "lost";
    hud();
    art.draw(state);
    focus?.focus({ preventScroll: true });
    if (phase === "playing") frameId = requestAnimationFrame(frame);
  }

  function start() {
    if (state.phase !== "menu" && state.phase !== "lost" && state.phase !== "won") return;
    arenaAudio.unlock();
    resetInput();
    arena = dimensions(bay.clientWidth, bay.clientHeight);
    state = makeState("menu");
    stage = 0;
    moduleNoticeUntil = 0;
    resize();
    const first = startPoint();
    spawn("drift", first.x, first.y);
    changePhase("playing", field);
  }

  function startPoint() {
    return { x: arena.width * .69, y: arena.height * .26 };
  }

  function pause() {
    if (state.phase === "playing") changePhase("paused", $("resumeButton"));
  }

  function resume() {
    if (state.phase !== "paused" || document.hidden) return;
    arenaAudio.unlock();
    changePhase("playing", field);
  }

  function showModules(next) {
    stage = next;
    const box = $("upgradeChoices");
    $("upgradeStage").textContent = next === 0 ? "30 секунд · первый модуль" : "60 секунд · второй модуль";
    const buttons = modules[next].map((module) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "choice";
      item.innerHTML = '<span class="mod-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + icon[module.id] + '</svg></span>';
      const title = document.createElement("strong");
      title.textContent = module.name;
      const description = document.createElement("span");
      description.className = "description";
      description.textContent = module.detail;
      item.append(title, description);
      item.addEventListener("click", () => {
        if (state.phase !== "upgrade" || stage !== next || state.upgrades.length !== next) return;
        arenaAudio.unlock();
        module.apply(state);
        state.upgrades.push(module.name);
        moduleNoticeUntil = state.ticks + 270;
        notice.textContent = module.name + " · " + module.detail;
        changePhase("playing", field);
        arenaAudio.play("upgrade");
      });
      return item;
    });
    box.replaceChildren(...buttons);
    changePhase("upgrade", buttons[0]);
  }

  function finish(phase) {
    const won = phase === "won";
    $("resultCaption").textContent = won ? "Маяк принят" : "Погружение прервано";
    $("resultTitle").textContent = won ? "Выжили!" : "Корпус разрушен";
    $("resultTime").textContent = clock(state.elapsed) + " / 1:30";
    $("resultKills").textContent = state.kills;
    $("resultUpgrades").textContent = state.upgrades.length ? "Модули · " + state.upgrades.join(" · ") : "Модули ещё не установлены.";
    changePhase(phase, $("restartButton"));
    arenaAudio.play(phase);
  }

  function inputDirection() {
    let kx = 0;
    let ky = 0;
    for (const key of keys) {
      const [x, y] = moveKeys[key];
      kx += x;
      ky += y;
    }
    kx = Math.sign(kx);
    ky = Math.sign(ky);
    const pointer = state.pointer;
    if (pointer && (pointer.dx || pointer.dy)) {
      state.input.x = pointer.dx;
      state.input.y = pointer.dy;
    } else {
      const length = Math.max(1, Math.hypot(kx, ky));
      state.input.x = kx / length;
      state.input.y = ky / length;
    }
  }

  function clamp(value, lower, upper) {
    return Math.max(lower, Math.min(upper, value));
  }

  function contain(body) {
    body.x = clamp(body.x, body.radius, arena.width - body.radius);
    body.y = clamp(body.y, body.radius, arena.height - body.radius);
  }

  function movePlayer() {
    const p = state.player;
    inputDirection();
    const { x, y } = state.input;
    const priorX = p.x;
    const priorY = p.y;
    p.x += x * p.speed * step;
    p.y += y * p.speed * step;
    contain(p);
    p.vx = (p.x - priorX) / step;
    p.vy = (p.y - priorY) / step;
    if (x || y) p.angle = Math.atan2(y, x);
  }

  function spawn(type, x, y) {
    if (state.enemies.length >= maxEnemies) return;
    const { radius, speed, hp } = species[type];
    state.enemies.push({
      id: ++state.id, type, x, y, radius, speed,
      hp, maxHp: hp, wake: .60, flash: 0, age: 0, surge: false, vx: 0, vy: 0,
      angle: Math.atan2(state.player.y - y, state.player.x - x),
    });
  }

  function arrival(type) {
    const p = state.player;
    const margin = species[type].radius + 9;
    let roomiest = null;
    for (let i = 0; i < 12; i++) {
      const side = Math.floor(Math.random() * 4);
      const t = Math.random() * .86 + .07;
      const x = side === 0 ? margin : side === 1 ? arena.width - margin : arena.width * t;
      const y = side === 2 ? margin : side === 3 ? arena.height - margin : arena.height * t;
      const distance = Math.min(Math.hypot(x - p.x, y - p.y),
        Math.hypot(x - p.x - p.vx * .45, y - p.y - p.vy * .45));
      if (distance >= 202) {
        spawn(type, x, y);
        return;
      }
      if (!roomiest || distance > roomiest.distance) roomiest = { x, y, distance };
    }
    if (roomiest.distance >= 95) spawn(type, roomiest.x, roomiest.y);
  }

  function spawnWave() {
    state.spawnWait -= step;
    if (state.spawnWait > 0) return;
    const time = state.elapsed;
    const mix = Math.random();
    if (time >= 5 && !state.shownDart) {
      state.shownDart = true;
      arrival("dart");
    } else if (time >= 10 && !state.shownShell) {
      state.shownShell = true;
      arrival("shell");
    } else if (time >= 10 && mix < .15 + time / 1050) {
      arrival("shell");
    } else {
      arrival(time >= 5 && mix > .78 - time / 480 ? "dart" : "drift");
    }
    if (time >= 43 && Math.random() < (time - 40) / 155) arrival(Math.random() < .5 ? "drift" : "dart");
    state.spawnWait = Math.max(.46, 1.10 - time * .0074) * (.84 + Math.random() * .32);
  }

  function separateEnemies() {
    const pool = state.enemies;
    for (let i = 0; i < pool.length; i++) {
      const first = pool[i];
      for (let j = i + 1; j < pool.length; j++) {
        const second = pool[j];
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const distance = Math.hypot(dx, dy);
        const wanted = (first.radius + second.radius) * .89;
        if (distance >= wanted) continue;
        const amount = Math.min(2.2, (wanted - distance) * .33);
        const x = distance > .0001 ? dx * amount / distance : amount;
        const y = distance > .0001 ? dy * amount / distance : 0;
        first.x -= x;
        first.y -= y;
        second.x += x;
        second.y += y;
        contain(first);
        contain(second);
      }
    }
  }

  function moveEnemies() {
    const p = state.player;
    const pressure = state.elapsed / 90;
    for (const enemy of state.enemies) {
      enemy.flash = Math.max(0, enemy.flash - step);
      const bearing = Math.atan2(p.y - enemy.y, p.x - enemy.x);
      if (enemy.wake > 0) {
        enemy.wake -= step;
        enemy.angle = bearing;
        continue;
      }
      enemy.age += step;
      let multiplier = 1 + pressure * .30;
      if (enemy.type === "dart") {
        const rhythm = (enemy.age + enemy.id * .1) % 2.38;
        const surge = rhythm > 1.72 && rhythm < 2.17;
        if (!enemy.surge) enemy.angle = bearing;
        enemy.surge = surge;
        multiplier *= surge ? 1.50 : rhythm > 1.43 && rhythm <= 1.72 ? .55 : 1;
      } else {
        enemy.angle = bearing;
      }
      enemy.vx = Math.cos(enemy.angle) * enemy.speed * multiplier;
      enemy.vy = Math.sin(enemy.angle) * enemy.speed * multiplier;
      enemy.x += enemy.vx * step;
      enemy.y += enemy.vy * step;
      contain(enemy);
    }
    separateEnemies();
  }

  function addBolt(angle, distance) {
    if (state.projectiles.length >= maxBolts) return;
    const p = state.player;
    const muzzle = Math.min(18, distance * .46);
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    state.projectiles.push({
      x: p.x + x * muzzle, y: p.y + y * muzzle,
      vx: 535 * x, vy: 535 * y, radius: 3.6,
      life: (state.range + 24) / 535,
    });
  }

  function aimAndFire() {
    if (state.shotWait > 0) {
      state.shotWait -= step;
      return;
    }

    const p = state.player;
    let nearest = null;
    let distance = state.range;
    for (const enemy of state.enemies) {
      if (enemy.wake > 0) continue;
      const d = Math.hypot(enemy.x - p.x, enemy.y - p.y);
      if (d < distance) {
        distance = d;
        nearest = enemy;
      }
    }
    if (!nearest) return;
    const travel = Math.max(0, distance - 18) / 535;
    const aim = {
      x: clamp(nearest.x + nearest.vx * travel, nearest.radius, arena.width - nearest.radius),
      y: clamp(nearest.y + nearest.vy * travel, nearest.radius, arena.height - nearest.radius),
    };
    const direction = Math.atan2(aim.y - p.y, aim.x - p.x);
    if (!p.vx && !p.vy) p.angle = direction;
    if (state.twin) {
      addBolt(direction, distance);
      addBolt(direction + .078, distance);
    } else {
      addBolt(direction, distance);
    }
    state.shotWait = state.interval;
    state.shotFlash = .055;
    state.firingAngle = direction;
    arenaAudio.play("shot");
  }

  function addEffect(effect) {
    if (state.effects.length < maxEffects) state.effects.push({ age: 0, ...effect });
  }

  function burst(x, y, color, radius, large) {
    if (large) addEffect({ kind: "ring", x, y, radius: radius * .68, color, life: .34, vx: 0, vy: 0 });
    const count = large ? 9 : 4;
    for (let i = 0; i < count; ++i) {
      const direction = Math.random() * tau;
      const speed = 34 + Math.random() * (large ? 100 : 62);
      addEffect({
        kind: "spark", x, y, radius: 1.7 + Math.random() * 2.2, color,
        life: .17 + Math.random() * .22, vx: Math.cos(direction) * speed, vy: Math.sin(direction) * speed,
      });
    }
  }

  function moveBolts() {
    const survivors = [];
    for (const bolt of state.projectiles) {
      bolt.life -= step;
      bolt.x += bolt.vx * step;
      bolt.y += bolt.vy * step;
      if (bolt.life <= 0 || bolt.x < -8 || bolt.y < -8 || bolt.x > arena.width + 8 || bolt.y > arena.height + 8) continue;
      const struck = state.enemies.find((enemy) => (
        enemy.hp > 0 && enemy.wake <= 0 && Math.hypot(enemy.x - bolt.x, enemy.y - bolt.y) <= enemy.radius + bolt.radius
      ));
      if (!struck) {
        survivors.push(bolt);
        continue;
      }
      struck.hp -= state.damage;
      struck.flash = .085;
      const color = arenaArt.palette[struck.type].rim;
      if (struck.hp <= 0) {
        state.kills++;
        burst(struck.x, struck.y, color, struck.radius, true);
      } else {
        burst(bolt.x, bolt.y, color, struck.radius, false);
      }
      arenaAudio.play("hit");
    }
    state.projectiles = survivors;
    state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
  }

  function contact() {
    if (state.invulnerable > 0) return;
    const p = state.player;
    const enemy = state.enemies.find((target) => (
      target.wake <= 0 && Math.hypot(target.x - p.x, target.y - p.y) < p.radius + target.radius
    ));
    if (!enemy) return;
    state.health--;
    state.invulnerable = 1.6;
    state.hurt = .24;
    const bearing = Math.atan2(p.y - enemy.y, p.x - enemy.x);
    p.x += Math.cos(bearing) * 27;
    p.y += Math.sin(bearing) * 27;
    contain(p);
    burst(p.x, p.y, "#ff91b0", p.radius + 7, true);
    arenaAudio.play("hurt");
  }

  function simulate() {
    state.ticks++;
    state.elapsed = state.ticks / 100;
    state.invulnerable = Math.max(0, state.invulnerable - step);
    state.hurt = Math.max(0, state.hurt - step);
    state.shotFlash = Math.max(0, state.shotFlash - step);
    movePlayer();
    spawnWave();
    moveEnemies();
    aimAndFire();
    moveBolts();
    contact();
    state.effects = state.effects.filter((effect) => {
      effect.age += step;
      effect.x += effect.vx * step;
      effect.y += effect.vy * step;
      return effect.age < effect.life;
    });

    if (state.health <= 0) finish("lost");
    else if (state.ticks >= end) finish("won");
    else if (state.ticks === 3000) showModules(0);
    else if (state.ticks === 6000) showModules(1);
  }

  function frame(now) {
    frameId = null;
    if (state.phase !== "playing") return;
    if (lastFrame !== null) carry += Math.min(.12, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    while (carry >= step && state.phase === "playing") {
      carry -= step;
      simulate();
    }
    if (state.phase === "playing") {
      hud();
      art.draw(state);
      frameId = requestAnimationFrame(frame);
    }
  }

  function point(event) {
    const rect = field.getBoundingClientRect();
    const scale = arena.width / rect.width;
    return {
      x: clamp((event.clientX - rect.left) * scale, 0, arena.width),
      y: clamp((event.clientY - rect.top) * arena.height / rect.height, 0, arena.height),
      reach: 38 * scale,
    };
  }

  field.tabIndex = -1;
  field.addEventListener("pointerdown", (event) => {
    if (state.phase !== "playing" || state.pointer || (event.pointerType === "mouse" && event.button !== 0)) return;
    const info = point(event);
    state.pointer = { id: event.pointerId, ...info, dx: 0, dy: 0 };
    try { field.setPointerCapture(event.pointerId); } catch {}
    event.preventDefault();
  });

  window.addEventListener("pointermove", (event) => {
    if (!state.pointer || state.pointer.id !== event.pointerId) return;
    const pointer = state.pointer;
    const rect = field.getBoundingClientRect();
    const dx = (event.clientX - rect.left) * arena.width / rect.width - pointer.x;
    const dy = (event.clientY - rect.top) * arena.height / rect.height - pointer.y;
    const length = Math.hypot(dx, dy);
    const strength = clamp((length / pointer.reach - .14) / .86, 0, 1);
    pointer.dx = length > 0 ? dx * strength / length : 0;
    pointer.dy = length > 0 ? dy * strength / length : 0;
  });

  function pointerEnded(event) {
    if (state.pointer?.id !== event.pointerId) return;
    releasePointer();
    inputDirection();
  }

  window.addEventListener("pointerup", pointerEnded);
  window.addEventListener("pointercancel", pointerEnded);
  field.addEventListener("lostpointercapture", pointerEnded);
  window.addEventListener("keydown", (event) => {
    if (event.code === "Escape" || event.key === "Escape") {
      if (event.repeat) return;
      if (state.phase === "playing" || state.phase === "paused") event.preventDefault();
      if (state.phase === "playing") pause();
      else if (state.phase === "paused") resume();
      return;
    }
    if (state.phase !== "playing" || !Object.hasOwn(moveKeys, event.code) || event.target === volume) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    keys.add(event.code);
    event.preventDefault();
  });
  window.addEventListener("keyup", (event) => keys.delete(event.code));
  volume.addEventListener("focus", () => keys.clear());
  window.addEventListener("blur", () => {
    if (state.phase === "playing") pause();
    else resetInput();
    arenaAudio.stop();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    if (state.phase === "playing") pause();
    else resetInput();
    arenaAudio.stop();
  });

  for (const type of ["pointerup", "keydown", "click"]) document.addEventListener(type, (event) => {
    if (event.isTrusted && !document.hidden) arenaAudio.unlock();
  }, { capture: true });

  $("startButton").addEventListener("click", start);
  $("restartButton").addEventListener("click", start);
  $("resumeButton").addEventListener("click", resume);
  pauseButton.addEventListener("click", pause);
  muteButton.addEventListener("click", () => {
    arenaAudio.toggle();
    refreshAudio();
  });
  volume.addEventListener("input", () => {
    arenaAudio.setVolume(Number(volume.value) / 100);
  });

  window.getArenaState = () => {
    const { phase, elapsed, ticks, kills, health, maxHealth, input, upgrades, player, enemies, projectiles } = state;
    const { x, y, vx, vy, radius, speed } = player;
    return {
      phase, elapsed, remaining: (end - ticks) / 100, kills, health, maxHealth,
      player: { x, y, vx, vy, radius, speed },
      arena: { ...arena },
      enemies: enemies.map(({ id, x, y, radius, type, hp }) => ({ id, x, y, radius, type, hp })),
      projectiles: projectiles.map(({ x, y, radius }) => ({ x, y, radius })),
      upgrades: [...upgrades], input: { ...input },
    };
  };

  refreshAudio();
  hud();
  resize();
  new ResizeObserver(resize).observe(bay);
  window.addEventListener("resize", resize);
})();
