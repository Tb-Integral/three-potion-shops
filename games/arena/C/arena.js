"use strict";

(() => {
  const $ = (id) => document.getElementById(id);
  const station = document.querySelector(".station");
  const canvas = $("scene");
  const renderer = createArenaRenderer(canvas);
  const duration = 90;
  const tick = 1 / 120;
  const enemyLimit = 64;
  const projectileLimit = 52;
  const effectLimit = 110;
  const types = {
    drone: {radius: 13, hp: 2, speed: 73},
    dart: {radius: 10, hp: 1, speed: 110},
    hauler: {radius: 20, hp: 6, speed: 47},
  };
  const upgrades = [
    [
      {name: "Импульсный затвор", detail: "Темп стрельбы +30%.", icon: "ϟ", apply: (p) => { p.period /= 1.30; }},
      {name: "Ледовые лыжи", detail: "Скорость движения +20%.", icon: "»", apply: (p) => { p.speed *= 1.20; }},
      {name: "Резервный щит", detail: "Ёмкость щита +1, восстановление 2 делений.", icon: "+", apply: (p) => restore(p, 1, 2)},
    ],
    [
      {name: "Осколочные заряды", detail: "Попадание повреждает и соседних дронов.", icon: "✳", apply: (p) => { p.splash = 56; }},
      {name: "Дальняя оптика", detail: "Дальность стрельбы +35%.", icon: "◎", apply: (p) => { p.range *= 1.35; }},
      {name: "Аварийная батарея", detail: "Ёмкость щита +1, восстановление до 4 делений.", icon: "⊞", apply: (p) => restore(p, 1, 4)},
    ],
  ];
  const statuses = {
    menu: "Ожидание связи", playing: "Сигнал в эфире", paused: "Связь на паузе",
    upgrade: "Доставка груза", won: "Сигнал принят", lost: "Сигнал потерян",
  };
  const movement = {
    KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
    KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1],
  };
  const keys = new Set();
  const input = {x: 0, y: 0};
  const arena = {width: 1000, height: 600};
  let phase = "menu";
  let round;
  let pointer = null;
  let frame = 0;
  let previous = 0;
  let accumulator = 0;
  let hudSecond = -1;
  let hudHealth = "";
  let lastFocused;

  function restore(player, capacity, amount) {
    player.maxHealth += capacity;
    player.health = Math.min(player.maxHealth, player.health + amount);
  }

  function freshRound() {
    return {
      elapsed: 0, kills: 0, nextSpawn: 0.45, nextId: 1, choice: 0,
      enemies: [], projectiles: [], effects: [], upgrades: [],
      player: {
        x: arena.width / 2, y: arena.height / 2, vx: 0, vy: 0, angle: -Math.PI / 2,
        radius: 13, speed: 167, health: 5, maxHealth: 5, invulnerable: 0,
        cooldown: 0, period: 0.29, range: 220, splash: 0, shot: 0,
      },
    };
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function timeText(seconds) {
    return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
  }

  function updateHud() {
    const remaining = Math.max(0, Math.ceil(duration - round.elapsed - 1e-6));
    if (remaining !== hudSecond) {
      $("clock").textContent = timeText(remaining);
      $("time-progress").style.transform = "scaleX(" + remaining / duration + ")";
      hudSecond = remaining;
    }
    const {health, maxHealth} = round.player;
    const ratio = health + "/" + maxHealth;
    if (ratio !== hudHealth) {
      $("health-label").textContent = ratio;
      const cells = Array.from({length: maxHealth}, (_, i) => {
        const cell = document.createElement("i");
        cell.classList.toggle("filled", i < health);
        return cell;
      });
      $("health").replaceChildren(...cells);
      station.dataset.danger = String(health <= 2);
      hudHealth = ratio;
    }
    const kills = String(round.kills).padStart(2, "0");
    if ($("kills").textContent !== kills) $("kills").textContent = kills;
    $("hint").hidden = phase !== "playing" || round.elapsed >= 9;
  }

  function releasePointer() {
    if (!pointer) return;
    const id = pointer.id;
    pointer = null;
    if (canvas.hasPointerCapture(id)) {
      try { canvas.releasePointerCapture(id); } catch {}
    }
  }

  function clearInput() {
    keys.clear();
    releasePointer();
    input.x = input.y = 0;
    round.player.vx = round.player.vy = 0;
  }

  function paint() {
    renderer.draw(arena, round, phase, pointer);
  }

  function changePhase(next, focusTarget) {
    const prior = phase;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    clearInput();
    previous = accumulator = 0;
    phase = next;
    station.dataset.phase = next;
    $("status").lastElementChild.textContent = statuses[next];
    $("overlay").hidden = next === "playing";
    $("menu").hidden = next !== "menu";
    $("pause-panel").hidden = next !== "paused";
    $("upgrade-panel").hidden = next !== "upgrade";
    $("result").hidden = next !== "won" && next !== "lost";
    $("pause").disabled = next !== "playing";
    updateHud();
    paint();
    if (focusTarget) focusTarget.focus({preventScroll: true});
    if (next === "playing" && prior !== "playing") frame = requestAnimationFrame(run);
  }

  function start(event) {
    if (!["menu", "won", "lost"].includes(phase)) return;
    arenaAudio.stop();
    arenaAudio.unlock(event);
    round = freshRound();
    changePhase("playing", $("pause"));
  }

  function pause(reason) {
    if (phase !== "playing") return;
    lastFocused = document.activeElement;
    $("pause-text").textContent = reason === "hidden"
      ? "Окно потеряло фокус. Нажмите «Продолжить», когда будете готовы."
      : "Таймер и дроны остановлены. Продолжите кнопкой или Escape.";
    arenaAudio.stop();
    changePhase("paused", $("resume"));
  }

  function resume(event) {
    if (phase !== "paused" || document.hidden) return;
    arenaAudio.unlock(event);
    const focusTarget = lastFocused?.matches("#sound, #volume") ? lastFocused : $("pause");
    changePhase("playing", focusTarget);
  }

  function offerUpgrade() {
    const stage = round.choice;
    $("delivery").textContent = "0" + (stage + 1) + "/02";
    const cards = upgrades[stage].map((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option";
      const glyph = document.createElement("span");
      glyph.className = "glyph";
      glyph.setAttribute("aria-hidden", "true");
      glyph.textContent = option.icon;
      const text = document.createElement("span");
      const title = document.createElement("strong");
      const detail = document.createElement("small");
      title.textContent = option.name;
      detail.textContent = option.detail;
      text.append(title, detail);
      const arrow = document.createElement("span");
      arrow.className = "arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "↗";
      button.append(glyph, text, arrow);
      button.addEventListener("click", (event) => {
        if (phase !== "upgrade" || round.choice !== stage || document.hidden) return;
        option.apply(round.player);
        round.choice++;
        round.upgrades.push(option.name);
        arenaAudio.unlock(event);
        changePhase("playing", $("pause"));
        arenaAudio.play("upgrade");
      });
      return button;
    });
    $("options").replaceChildren(...cards);
    arenaAudio.stop();
    changePhase("upgrade", $("upgrade-title"));
  }

  function finish(outcome) {
    const won = outcome === "won";
    $("result-status").textContent = won ? "ЭВАКУАЦИЯ ЗАВЕРШЕНА" : "МАЯК ПОГАС";
    $("result-title").textContent = won ? "Вы спасены" : "Щит пробит";
    $("result-time").textContent = timeText(Math.floor(round.elapsed + 1e-6));
    $("result-kills").textContent = String(round.kills);
    $("result-upgrades").textContent = round.upgrades.length
      ? "Модули · " + round.upgrades.join(" · ")
      : "Модули ещё не получены.";
    arenaAudio.stop();
    changePhase(outcome, $("again"));
    arenaAudio.play(outcome);
  }

  function updateInput() {
    let x = 0;
    let y = 0;
    for (const key of keys) {
      x += movement[key][0];
      y += movement[key][1];
    }
    if (x || y) {
      x = Math.sign(x);
      y = Math.sign(y);
    } else if (pointer) {
      x = pointer.dx / 41;
      y = pointer.dy / 41;
      if (Math.hypot(x, y) < 0.11) x = y = 0;
    }
    const length = Math.max(1, Math.hypot(x, y));
    input.x = x / length;
    input.y = y / length;
  }

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !event.repeat) {
      if (phase === "playing") pause("manual");
      else if (phase === "paused") resume(event);
      return;
    }
    if (phase !== "playing" || !movement[event.code]) return;
    const onSlider = event.target === $("volume") && event.code.startsWith("Arrow");
    if (onSlider) return;
    event.preventDefault();
    if (event.repeat) return;
    keys.add(event.code);
    updateInput();
    arenaAudio.unlock(event);
  });

  window.addEventListener("keyup", (event) => {
    if (keys.delete(event.code)) updateInput();
  });
  window.addEventListener("blur", () => {
    if (phase === "playing") pause("hidden");
    else arenaAudio.stop();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    if (phase === "playing") pause("hidden");
    else arenaAudio.stop();
  });
  $("start").addEventListener("click", start);
  $("again").addEventListener("click", start);
  $("pause").addEventListener("click", () => pause("manual"));
  $("resume").addEventListener("click", resume);

  canvas.addEventListener("pointerdown", (event) => {
    if (phase !== "playing" || pointer || event.button !== 0) return;
    pointer = {id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, dy: 0};
    try { canvas.setPointerCapture(event.pointerId); } catch {}
    arenaAudio.unlock(event);
  });
  window.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointer?.id) return;
    if (event.pointerType === "mouse" && event.buttons === 0) {
      releasePointer();
    } else {
      pointer.dx = event.clientX - pointer.x;
      pointer.dy = event.clientY - pointer.y;
    }
    updateInput();
  });
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
    window.addEventListener(name, (event) => {
      if (event.pointerId !== pointer?.id) return;
      releasePointer();
      updateInput();
      if (name === "pointerup") arenaAudio.unlock(event);
    });
  }

  function spawn() {
    if (round.enemies.length >= enemyLimit) return;
    const elapsed = round.elapsed;
    const roll = Math.random();
    let type = "drone";
    if (elapsed > 7 && roll < 0.25) type = "hauler";
    else if (elapsed > 3 && roll > 0.61) type = "dart";
    const spec = types[type];
    const {player} = round;
    let farthest;
    for (let attempt = 0; attempt < 10; attempt++) {
      const edge = Math.floor(Math.random() * 4);
      const margin = spec.radius + 7;
      const along = 0.10 + 0.80 * Math.random();
      const x = edge === 0 ? margin : edge === 1 ? arena.width - margin : arena.width * along;
      const y = edge === 2 ? margin : edge === 3 ? arena.height - margin : arena.height * along;
      const distance = Math.hypot(player.x - x, player.y - y);
      if (!farthest || distance > farthest.distance) farthest = {x, y, distance};
      if (distance >= 225 && round.enemies.every((enemy) => Math.hypot(enemy.x - x, enemy.y - y) > 43)) {
        farthest = {x, y, distance};
        break;
      }
    }
    if (farthest.distance < 157) return;
    round.enemies.push({
      ...spec, type, id: round.nextId++, x: farthest.x, y: farthest.y, angle: 0,
      age: 0, flash: 0, speed: spec.speed * (1 + elapsed / 530),
    });
  }

  function moveEnemies(dt) {
    const {player, enemies} = round;
    for (const enemy of enemies) {
      enemy.age += dt;
      enemy.flash -= dt;
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const tangent = enemy.type === "drone" ? Math.sin(enemy.age * 3 + enemy.id) * 0.22 : 0;
      const charge = enemy.type === "dart" ? (enemy.age % 2.15 > 1.50 ? 1.48 : 0.84) : 1;
      const speed = enemy.speed * charge;
      enemy.angle = Math.atan2(dy, dx);
      if (enemy.age >= 0.26) {
        enemy.x += (dx - dy * tangent) / distance * speed * dt;
        enemy.y += (dy + dx * tangent) / distance * speed * dt;
      }
    }
    for (let i = 0; i < enemies.length; i++) {
      const a = enemies[i];
      for (let j = i + 1; j < enemies.length; j++) {
        const b = enemies[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy);
        const spacing = a.radius + b.radius + 2;
        if (distance >= spacing) continue;
        const step = Math.min(2.1, (spacing - distance) * 0.22);
        const x = distance > 0.01 ? dx / distance * step : step;
        const y = distance > 0.01 ? dy / distance * step : 0;
        a.x -= x;
        a.y -= y;
        b.x += x;
        b.y += y;
      }
      a.x = clamp(a.x, a.radius, arena.width - a.radius);
      a.y = clamp(a.y, a.radius, arena.height - a.radius);
    }
  }

  function addEffect(effect) {
    if (round.effects.length < effectLimit) round.effects.push(effect);
  }

  function spark(x, y, color, count, force) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.28 + 0.72 * Math.random()) * force;
      const life = 0.16 + Math.random() * 0.30;
      addEffect({kind: "spark", x, y, color, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life, total: life});
    }
  }

  function ring(x, y, color, size, life) {
    addEffect({kind: "ring", x, y, color, size, vx: 0, vy: 0, life, total: life});
  }

  function fire(dt) {
    const {player, enemies, projectiles} = round;
    player.cooldown = Math.max(0, player.cooldown - dt);
    player.shot = Math.max(0, player.shot - dt);
    if (player.cooldown > 0 || projectiles.length >= projectileLimit) return;
    let target;
    let nearest = player.range ** 2;
    for (const enemy of enemies) {
      if (enemy.age < 0.26) continue;
      const distance = (enemy.x - player.x) ** 2 + (enemy.y - player.y) ** 2;
      if (distance >= nearest) continue;
      nearest = distance;
      target = enemy;
    }
    if (!target) return;
    const lead = Math.sqrt(nearest) / 665;
    const angle = Math.atan2(
      target.y + Math.sin(target.angle) * target.speed * lead - player.y,
      target.x + Math.cos(target.angle) * target.speed * lead - player.x,
    );
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    projectiles.push({x: player.x + x * 16, y: player.y + y * 16, vx: x * 665, vy: y * 665, radius: 3.6, life: (player.range + 34) / 665});
    player.cooldown = player.period;
    player.shot = 0.073;
    player.aim = angle;
    arenaAudio.play("shot");
  }

  function damage(enemy) {
    enemy.hp--;
    enemy.flash = 0.11;
    if (enemy.hp === 0) {
      round.kills++;
      const color = {drone: "#ffad81", dart: "#ff80b8", hauler: "#b7b0ff"}[enemy.type];
      spark(enemy.x, enemy.y, color, 8, 110);
      ring(enemy.x, enemy.y, color, enemy.radius + 16, 0.27);
    }
  }

  function moveProjectiles(dt) {
    const {player, enemies, projectiles} = round;
    let impact = false;
    for (const bullet of projectiles) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      for (const enemy of enemies) {
        if (enemy.hp <= 0 || enemy.age < 0.26) continue;
        if (Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) > bullet.radius + enemy.radius) continue;
        bullet.life = 0;
        impact = true;
        damage(enemy);
        spark(bullet.x, bullet.y, "#ffdfa0", 4, 85);
        if (player.splash) {
          ring(enemy.x, enemy.y, "#ffda91", player.splash, 0.21);
          for (const other of enemies) {
            if (other === enemy || other.hp <= 0 || other.age < 0.26) continue;
            if (Math.hypot(enemy.x - other.x, enemy.y - other.y) <= player.splash) damage(other);
          }
        }
        break;
      }
    }
    round.projectiles = projectiles.filter((bullet) => bullet.life > 0
      && bullet.x >= -15 && bullet.x <= arena.width + 15
      && bullet.y >= -15 && bullet.y <= arena.height + 15);
    if (impact) {
      round.enemies = enemies.filter((enemy) => enemy.hp > 0);
      arenaAudio.play("hit");
    }
  }

  function contact(dt) {
    const {player, enemies} = round;
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    if (player.invulnerable > 0) return;
    const hit = enemies.find((enemy) => enemy.age > 0.26
      && Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.radius + player.radius - 2);
    if (!hit) return;
    player.health--;
    player.invulnerable = 1.12;
    const dx = hit.x - player.x;
    const dy = hit.y - player.y;
    const angle = Math.atan2(dy, dx);
    hit.x += Math.cos(angle) * 24;
    hit.y += Math.sin(angle) * 24;
    spark(player.x, player.y, "#ff8f9a", 12, 155);
    ring(player.x, player.y, "#ff8f9a", 56, 0.38);
    arenaAudio.play("hurt");
  }

  function step(dt) {
    const {player} = round;
    const boundary = round.choice < 2 ? 30 * (round.choice + 1) : duration;
    dt = Math.min(dt, boundary - round.elapsed);
    round.elapsed += dt;
    player.vx = input.x * player.speed;
    player.vy = input.y * player.speed;
    if (input.x || input.y) player.angle = Math.atan2(input.y, input.x);
    player.x = clamp(player.x + player.vx * dt, player.radius, arena.width - player.radius);
    player.y = clamp(player.y + player.vy * dt, player.radius, arena.height - player.radius);
    if (round.elapsed >= round.nextSpawn) {
      spawn();
      round.nextSpawn += Math.max(0.39, 1.03 - round.elapsed * 0.0074) * (0.82 + Math.random() * 0.36);
    }
    moveEnemies(dt);
    fire(dt);
    moveProjectiles(dt);
    contact(dt);
    for (const effect of round.effects) {
      effect.x += effect.vx * dt;
      effect.y += effect.vy * dt;
      effect.life -= dt;
    }
    round.effects = round.effects.filter((effect) => effect.life > 0);
    if (player.health <= 0) finish("lost");
    else if (round.elapsed >= boundary - 1e-8) {
      round.elapsed = boundary;
      if (boundary === duration) finish("won");
      else offerUpgrade();
    }
  }

  function run(now) {
    frame = 0;
    if (phase !== "playing") return;
    if (previous) accumulator += Math.min(0.15, (now - previous) / 1000);
    previous = now;
    while (accumulator >= tick && phase === "playing") {
      accumulator -= tick;
      step(tick);
    }
    if (phase !== "playing") return;
    updateHud();
    paint();
    frame = requestAnimationFrame(run);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / 440, rect.height / 600);
    if (!scale) return;
    const width = rect.width / scale;
    const height = rect.height / scale;
    const xScale = width / arena.width;
    const yScale = height / arena.height;
    for (const item of [round.player, ...round.enemies, ...round.projectiles, ...round.effects]) {
      item.x *= xScale;
      item.y *= yScale;
    }
    round.player.x = clamp(round.player.x, round.player.radius, width - round.player.radius);
    round.player.y = clamp(round.player.y, round.player.radius, height - round.player.radius);
    arena.width = width;
    arena.height = height;
    if (pointer) {
      releasePointer();
      updateInput();
    }
    renderer.resize(arena, rect, scale);
    paint();
  }

  round = freshRound();
  changePhase("menu");
  resize();
  new ResizeObserver(resize).observe(canvas);
  window.addEventListener("resize", resize);

  window.getArenaState = () => {
    const {player, elapsed, kills, enemies, projectiles, upgrades: selected} = round;
    const {x, y, vx, vy, radius, speed, health, maxHealth} = player;
    return {
      phase, elapsed, remaining: Math.max(0, duration - elapsed), kills, health, maxHealth,
      player: {x, y, vx, vy, radius, speed},
      arena: {...arena},
      enemies: enemies.map(({id, x, y, radius, type, hp}) => ({id, x, y, radius, type, hp})),
      projectiles: projectiles.map(({x, y, radius}) => ({x, y, radius})),
      upgrades: [...selected], input: {...input},
      invulnerable: player.invulnerable,
      effects: round.effects.length,
    };
  };
})();
