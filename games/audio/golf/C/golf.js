(() => {
  'use strict';

  // Each note lists its start, length, pitch sweep, overtone level and amplitude.
  const audio = createGameAudio('green-club-golf-audio-v1', {
    shot: [[0, .078, 560, 210, .37, .52], [.012, .085, 186, 130, .20, .25]],
    bounce: [[0, .084, 375, 185, .20, .46]],
    cup: [[0, .135, 310, 120, .19, .40], [.063, .20, 780, 660, .25, .28]],
    final: [[0, .22, 392, 392, .18, .35], [.105, .22, 494, 494, .16, .27],
      [.21, .28, 587, 587, .16, .30], [.33, .27, 784, 784, .13, .26]]
  }, bindButton);

  const width = 440;
  const height = 560;
  const rail = { left: 34, top: 38, right: 406, bottom: 522 };
  const ballRadius = 8;
  const cupRadius = 13;
  const dt = 1 / 120;
  const friction = 300;
  const rebound = 0.73;
  const maxPull = 112;
  const minPull = 7;
  const rollout = 3.25;
  const holes = [
    {
      name: 'Прямая аллея', par: 1, tee: { x: 220, y: 414 }, cup: { x: 220, y: 145 },
      turf: ['#478369', '#4d8a6f'], obstacleStyle: 'flowers',
      obstacles: [{ x: 62, y: 260, w: 92, h: 34 }, { x: 300, y: 198, w: 77, h: 34 }],
    },
    {
      name: 'Боковой карман', par: 2, tee: { x: 112, y: 411 }, cup: { x: 328, y: 129 },
      turf: ['#527f5a', '#588661'], obstacleStyle: 'stone',
      obstacles: [{ x: 34, y: 255, w: 237, h: 42 }],
    },
    {
      name: 'Садовые ворота', par: 3, tee: { x: 318, y: 418 }, cup: { x: 322, y: 124 },
      turf: ['#3f7966', '#467f6e'], obstacleStyle: 'hedge',
      obstacles: [{ x: 236, y: 321, w: 170, h: 32 }, { x: 34, y: 216, w: 223, h: 34 }],
    },
  ];

  const canvas = document.querySelector('[data-golf-course]');
  const ctx = canvas.getContext('2d');
  const scenery = document.createElement('canvas');
  const art = scenery.getContext('2d');
  const scale = 2;
  canvas.width = scenery.width = width * scale;
  canvas.height = scenery.height = height * scale;
  ctx.scale(scale, scale);
  art.scale(scale, scale);

  const holeNumber = document.getElementById('hole-number');
  const holeTitle = document.getElementById('hole-title');
  const holePar = document.getElementById('hole-par');
  const status = document.getElementById('status');
  const scoreCells = [...document.querySelectorAll('.scorecard li')];
  const powerBars = [...document.querySelectorAll('#power i')];
  const retry = document.getElementById('retry');
  const result = document.getElementById('result');
  const newRound = document.getElementById('new-round');
  const resultTotal = document.getElementById('result-total');
  const resultSplit = document.getElementById('result-split');

  const strokes = [0, 0, 0];
  const ball = { x: 0, y: 0, vx: 0, vy: 0, radius: ballRadius };
  let holeIndex = 0;
  let phase = 'aim';
  let drag = null;
  let preview = null;
  let frame = null;
  let lastTime = null;
  let accumulator = 0;
  let sinkTime = 0;
  let blurred = false;
  let shotAudio = false;
  let lastBounce = -Infinity;

  function currentHole() {
    return holes[holeIndex];
  }

  Object.defineProperty(window, 'getGolfState', {
    value: () => ({
      holeIndex,
      phase,
      strokes: [...strokes],
      ball: { ...ball },
      cup: { ...currentHole().cup, radius: cupRadius },
      course: { width, height },
      bounds: { ...rail },
      obstacles: currentHole().obstacles.map(rect => ({ ...rect })),
      dragging: drag !== null,
    }),
  });

  function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }

  function strokeLabel(count) {
    const last = count % 10;
    const teen = count % 100 >= 11 && count % 100 <= 14;
    if (!teen && last === 1) return `${count} удар`;
    if (!teen && last >= 2 && last <= 4) return `${count} удара`;
    return `${count} ударов`;
  }

  function updateHud() {
    holeNumber.textContent = `Лунка 0${holeIndex + 1}`;
    holeTitle.textContent = currentHole().name;
    holePar.textContent = `Пар ${currentHole().par}`;
    scoreCells.forEach((cell, index) => {
      const played = index <= holeIndex;
      cell.querySelector('strong').textContent = played ? strokes[index] : '—';
      cell.setAttribute('aria-label', `Лунка ${index + 1}. ${played ? strokeLabel(strokes[index]) : 'Впереди'}`);
      if (index === holeIndex && phase !== 'finished') cell.setAttribute('aria-current', 'step');
      else cell.removeAttribute('aria-current');
    });
    retry.disabled = phase === 'finished';
    result.hidden = phase !== 'finished';
    if (phase === 'finished') {
      resultTotal.textContent = strokeLabel(strokes.reduce((sum, count) => sum + count, 0));
      resultSplit.textContent = `По лункам  ·  ${strokes.join(' / ')}`;
    }
    updateShotHud();
  }

  function updateShotHud() {
    const messages = { aim: drag ? 'Прицеливание' : 'Мяч готов', moving: 'Мяч в движении', sunk: 'В лунке!', finished: 'Партия сыграна' };
    const message = messages[phase];
    if (status.textContent !== message) status.textContent = message;
    const power = preview ? preview.length / maxPull : 0;
    powerBars.forEach((bar, index) => bar.classList.toggle('active', power > index / powerBars.length));
  }

  function line(context, points, color, weight) {
    context.strokeStyle = color;
    context.lineWidth = weight;
    context.beginPath();
    context.moveTo(points[0][0], points[0][1]);
    for (const [x, y] of points.slice(1)) context.lineTo(x, y);
    context.stroke();
  }

  function disk(context, x, y, radius, fill, stroke, weight = 1) {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    if (fill) {
      context.fillStyle = fill;
      context.fill();
    }
    if (stroke) {
      context.strokeStyle = stroke;
      context.lineWidth = weight;
      context.stroke();
    }
  }

  function drawBoard(hole) {
    const { left, top, right, bottom } = rail;
    art.clearRect(0, 0, width, height);
    art.fillStyle = '#ded4b5';
    art.fillRect(0, 0, width, height);
    art.strokeStyle = '#b4ac8c';
    art.lineWidth = 1;
    art.strokeRect(8.5, 8.5, width - 17, height - 17);
    art.strokeRect(12.5, 12.5, width - 25, height - 25);

    art.fillStyle = '#a39b7a';
    art.fillRect(left - 8, top - 7, right - left + 17, bottom - top + 19);
    art.fillStyle = '#846648';
    art.fillRect(left - 7, top - 7, right - left + 14, bottom - top + 14);
    art.fillStyle = '#d8b477';
    art.fillRect(left - 5, top - 5, right - left + 10, bottom - top + 10);

    art.save();
    art.beginPath();
    art.rect(left, top, right - left, bottom - top);
    art.clip();
    art.fillStyle = hole.turf[0];
    art.fillRect(left, top, right - left, bottom - top);
    art.save();
    art.translate(220, 280);
    art.rotate(Math.PI / 7);
    art.fillStyle = hole.turf[1];
    for (let x = -440; x < 440; x += 80) art.fillRect(x, -400, 40, 800);
    art.restore();

    for (let index = 0; index < 390; index += 1) {
      const x = left + ((index * 1891) % 371);
      const y = top + ((index * index * 11 + index * 143) % 483);
      art.fillStyle = index % 3 === 0 ? '#ebebbd35' : '#183a302a';
      art.fillRect(x, y, 1.6, .8);
    }

    art.strokeStyle = '#1b43364d';
    art.lineWidth = 9;
    art.strokeRect(left, top, right - left, bottom - top);
    art.strokeStyle = '#dce5a850';
    art.lineWidth = 1;
    art.strokeRect(left + 13, top + 13, right - left - 26, bottom - top - 26);

    for (const x of [left + 13, right - 13]) {
      for (let y = top + 60; y < bottom - 20; y += 60) {
        art.save();
        art.translate(x, y);
        art.rotate(Math.PI / 4);
        art.fillStyle = '#dfe6bc8c';
        art.fillRect(-2.25, -2.25, 4.5, 4.5);
        art.restore();
      }
    }

    const { tee, cup } = hole;
    disk(art, tee.x, tee.y, 24, '#d4e8b414', '#e1edc77a');
    line(art, [[tee.x - 33, tee.y + 27], [tee.x - 21, tee.y + 27]], '#e1edc7a0', 1.5);
    line(art, [[tee.x + 21, tee.y + 27], [tee.x + 33, tee.y + 27]], '#e1edc7a0', 1.5);
    art.textAlign = 'center';
    art.font = '700 9px system-ui, sans-serif';
    art.fillStyle = '#e7eed1';
    art.fillText('СТАРТ', tee.x, tee.y + 31);

    disk(art, cup.x, cup.y, 43, '#c6e3b21e', '#e3edc63d');
    disk(art, cup.x, cup.y, 28, '#d0e5b421', '#deebc54b');
    disk(art, cup.x, cup.y, cupRadius + 1, '#16372c', '#e0e9bd', 2.4);
    disk(art, cup.x - 1, cup.y - 1, 8.5, '#102b23');

    for (const obstacle of hole.obstacles) drawObstacle(obstacle, hole.obstacleStyle);
    art.restore();

    for (const x of [20, width - 20]) {
      for (const y of [23, height - 23]) {
        disk(art, x, y, 3, '#a59d78', '#f3e3bd');
      }
    }
    art.fillStyle = '#485345';
    art.textAlign = 'center';
    art.textBaseline = 'alphabetic';
    art.font = '700 9px system-ui, sans-serif';
    art.fillText('✦   ПОЛЕ  0' + (holeIndex + 1) + '   ✦', width / 2, 25);
    art.font = '700 8.5px system-ui, sans-serif';
    art.fillText('З Е Л Ё Н Ы Й   К Л У Б', width / 2, 547);
  }

  function drawObstacle(rect, style) {
    const { x, y, w, h } = rect;
    const stone = style === 'stone';
    art.fillStyle = '#193a3060';
    art.fillRect(x + 3, y + 5, w, h);
    art.fillStyle = stone ? '#695945' : '#533b30';
    art.fillRect(x, y, w, h);
    art.fillStyle = stone ? '#ead0a0' : '#cd9366';
    art.fillRect(x + 2, y + 2, w - 4, h - 6);
    art.fillStyle = stone ? '#ac8e66' : '#754e39';
    art.fillRect(x + 3, y + 4, w - 6, h - 11);
    art.fillStyle = stone ? '#c4a675' : '#3e6042';
    art.fillRect(x + 5, y + 5, w - 10, h - 13);

    if (stone) {
      art.save();
      art.beginPath();
      art.rect(x + 5, y + 5, w - 10, h - 13);
      art.clip();
      line(art, [[x + 5, y + h / 2 - 1], [x + w - 5, y + h / 2 - 1]], '#80664e', 1.5);
      for (let joint = x + 16; joint < x + w + 4; joint += 34) {
        line(art, [[joint, y + 5], [joint, y + h / 2 - 1]], '#80664e', 1.5);
        line(art, [[joint - 12, y + h / 2 - 1], [joint - 12, y + h - 8]], '#80664e', 1.5);
        line(art, [[joint + 6, y + 9], [joint + 14, y + 9]], '#ebcf9d8c', 1);
      }
      art.restore();
      return;
    }

    for (let stem = x + 13, index = 0; stem < x + w - 8; stem += 13, index += 1) {
      const leafY = y + h / 2 + (index % 2) * 3 - 3;
      disk(art, stem, leafY + 1, 7, '#274b3a');
      disk(art, stem - 2, leafY - 2, 5, index % 2 ? '#6d9259' : '#8aa565');
      disk(art, stem + 3, leafY + 2, 4, '#537b50');
      if (style === 'flowers' && index % 2 === 0) disk(art, stem - 2, leafY - 3, 2.2, '#f8d29c');
      if (style === 'hedge') line(art, [[stem - 3, leafY], [stem, leafY - 4]], '#b1bc73', .9);
    }
  }

  function drawFlag(cup) {
    const x = cup.x + 10;
    const y = cup.y + 5;
    line(ctx, [[x, y], [x + 21, y + 10]], '#17382b64', 2.3);
    line(ctx, [[x, y], [x, y - 49]], '#263d33', 3.7);
    line(ctx, [[x, y - 1], [x, y - 49]], '#fff0cb', 1.7);
    ctx.fillStyle = '#e6a064';
    ctx.beginPath();
    ctx.moveTo(x + 1, y - 48);
    ctx.lineTo(x + 31, y - 43);
    ctx.lineTo(x + 1, y - 32);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#754932';
    ctx.lineWidth = 1;
    ctx.stroke();
    line(ctx, [[x + 4, y - 45], [x + 19, y - 42.8]], '#f5cd90', 1.2);
    disk(ctx, x, y - 49, 2.1, '#f8dfaa');
  }

  function drawPreview() {
    if (!preview) return;
    const { end, length, ux, uy, points, sinks } = preview;
    const aimX = ball.x + ux * 27;
    const aimY = ball.y + uy * 27;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.setLineDash([3, 5]);
    line(ctx, [[ball.x, ball.y], [ball.x - ux * length, ball.y - uy * length]], '#1e392d', 3.5);
    line(ctx, [[ball.x, ball.y], [ball.x - ux * length, ball.y - uy * length]], '#f6cb80', 1.5);
    ctx.setLineDash([]);
    line(ctx, [[ball.x, ball.y], [aimX, aimY]], '#123b2a', 6);
    line(ctx, [[ball.x, ball.y], [aimX, aimY]], '#fff5ce', 2.6);
    line(ctx, [[aimX - ux * 7 + uy * 5, aimY - uy * 7 - ux * 5], [aimX, aimY],
      [aimX - ux * 7 - uy * 5, aimY - uy * 7 + ux * 5]], '#fff5ce', 2.6);

    for (const point of points) disk(ctx, point.x, point.y, 2.4, '#fff2ca', '#214632', 1);
    disk(ctx, end.x, end.y, sinks ? 19 : 8.5, null, '#233f31', 4);
    disk(ctx, end.x, end.y, sinks ? 19 : 8.5, null, '#ffd17f', 2);
    ctx.restore();
  }

  function draw() {
    ctx.drawImage(scenery, 0, 0, width, height);
    drawFlag(currentHole().cup);
    drawPreview();
    if (phase === 'sunk' || phase === 'finished') {
      const cup = currentHole().cup;
      disk(ctx, cup.x, cup.y, 18, null, '#fae1a3', 2.5);
      return;
    }
    if (phase === 'aim' && !drag) {
      disk(ctx, ball.x, ball.y, 17, '#f0e3aa28', '#fff0b9b0', 1.5);
    }
    disk(ctx, ball.x + 2.5, ball.y + 4, 8.7, '#13392f8a');
    const shine = ctx.createRadialGradient(ball.x - 3, ball.y - 4, 1, ball.x, ball.y, ballRadius);
    shine.addColorStop(0, '#ffffff');
    shine.addColorStop(.65, '#faf5e6');
    shine.addColorStop(1, '#cbcbbb');
    disk(ctx, ball.x, ball.y, ballRadius, shine, '#263f34', 1.3);
    for (const [dx, dy] of [[2.7, 1], [4.1, 3.4], [1, 4.4]]) {
      disk(ctx, ball.x + dx, ball.y + dy, .8, '#8a998780');
    }
  }

  function bounce(body, nx, ny) {
    const outward = body.vx * nx + body.vy * ny;
    if (outward >= 0) return;
    body.vx -= (1 + rebound) * outward * nx;
    body.vy -= (1 + rebound) * outward * ny;
    // The preview uses a separate body and shares this collision calculation.
    if (body === ball && shotAudio && outward < -80) {
      const now = performance.now();
      if (now - lastBounce >= 115) {
        lastBounce = now;
        const impact = clamp((-outward - 80) / 370, 0, 1);
        audio.play('bounce', { level: .28 + impact * .54, rate: .86 + impact * .29 });
      }
    }
  }

  function collideRail(body) {
    const x = clamp(body.x, rail.left + ballRadius, rail.right - ballRadius);
    const y = clamp(body.y, rail.top + ballRadius, rail.bottom - ballRadius);
    if (body.x !== x) bounce(body, Math.sign(x - body.x), 0);
    if (body.y !== y) bounce(body, 0, Math.sign(y - body.y));
    body.x = x;
    body.y = y;
  }

  function collideObstacle(body, { x, y, w, h }) {
    const dx = body.x - clamp(body.x, x, x + w);
    const dy = body.y - clamp(body.y, y, y + h);
    const distance = Math.hypot(dx, dy);
    if (distance >= ballRadius) return;

    let nx;
    let ny;
    let push;
    if (distance > 0) {
      nx = dx / distance;
      ny = dy / distance;
      push = ballRadius - distance;
    } else {
      // Move to the nearest face if a correction placed the centre inside a corner.
      const faces = [[body.x - x, -1, 0], [x + w - body.x, 1, 0],
        [body.y - y, 0, -1], [y + h - body.y, 0, 1]];
      const [depth, faceX, faceY] = faces.reduce((best, face) => face[0] < best[0] ? face : best);
      nx = faceX;
      ny = faceY;
      push = ballRadius + depth;
    }
    body.x += nx * push;
    body.y += ny * push;
    bounce(body, nx, ny);
  }

  // The same fixed-step calculation drives both the preview and the actual ball.
  function step(body, hole) {
    const speed = Math.hypot(body.vx, body.vy);
    const nextSpeed = Math.max(0, speed - friction * dt);
    if (speed > 0) {
      const travelTime = Math.min(dt, speed / friction);
      const travel = (speed + nextSpeed) / 2 * travelTime / speed;
      body.x += body.vx * travel;
      body.y += body.vy * travel;
      body.vx *= nextSpeed / speed;
      body.vy *= nextSpeed / speed;
      for (let pass = 0; pass < 2; pass += 1) {
        collideRail(body);
        for (const obstacle of hole.obstacles) collideObstacle(body, obstacle);
      }
      collideRail(body);
    }
    return Math.hypot(body.vx, body.vy) <= 108
      && Math.hypot(body.x - hole.cup.x, body.y - hole.cup.y) <= 9.5;
  }

  function pointFrom(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * width / rect.width,
      y: (event.clientY - rect.top) * height / rect.height };
  }

  function aimAt(point) {
    const dx = drag.x - point.x;
    const dy = drag.y - point.y;
    const distance = Math.hypot(dx, dy);
    preview = null;
    if (distance < minPull) return;
    const length = Math.min(distance, maxPull);
    const speed = Math.sqrt(2 * friction * length * rollout);
    const ux = dx / distance;
    const uy = dy / distance;
    const vx = ux * speed;
    const vy = uy * speed;
    const ghost = { x: ball.x, y: ball.y, vx, vy };
    const points = [];
    let marker = { x: ball.x, y: ball.y };
    let sinks = false;
    while (ghost.vx !== 0 || ghost.vy !== 0) {
      sinks = step(ghost, currentHole());
      if (sinks) break;
      if (Math.hypot(ghost.x - marker.x, ghost.y - marker.y) > (points.length ? 20 : 38)) {
        marker = { x: ghost.x, y: ghost.y };
        points.push(marker);
      }
    }
    preview = { length, ux, uy, vx, vy, points, end: ghost, sinks };
  }

  function clearDrag() {
    if (!drag) return;
    const pointer = drag.id;
    drag = null;
    preview = null;
    if (canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
    updateShotHud();
    draw();
  }

  function stopClock() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    lastTime = null;
    accumulator = 0;
  }

  function loadHole(index) {
    stopClock();
    clearDrag();
    holeIndex = index;
    phase = 'aim';
    Object.assign(ball, currentHole().tee, { vx: 0, vy: 0 });
    drawBoard(currentHole());
    updateHud();
    draw();
  }

  function schedule() {
    if (frame === null && !document.hidden && !blurred && (phase === 'moving' || phase === 'sunk')) {
      frame = requestAnimationFrame(tick);
    }
  }

  function tick(now) {
    frame = null;
    if (document.hidden || blurred) return;
    const elapsed = lastTime === null ? 0 : Math.min(.05, (now - lastTime) / 1000);
    lastTime = now;
    if (phase === 'moving') {
      accumulator += elapsed;
      while (accumulator >= dt && phase === 'moving') {
        accumulator -= dt;
        if (step(ball, currentHole())) {
          Object.assign(ball, currentHole().cup, { vx: 0, vy: 0 });
          phase = 'sunk';
          sinkTime = .8;
          if (shotAudio) audio.play('cup');
          updateHud();
        } else if (ball.vx === 0 && ball.vy === 0) {
          phase = 'aim';
          stopClock();
          updateHud();
        }
      }
    } else if (phase === 'sunk') {
      sinkTime -= elapsed;
      if (sinkTime <= 0) {
        if (holeIndex < holes.length - 1) {
          loadHole(holeIndex + 1);
        } else {
          phase = 'finished';
          stopClock();
          if (shotAudio) audio.play('final');
          updateHud();
          newRound.focus({ preventScroll: true });
        }
      }
    }
    draw();
    schedule();
  }

  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || phase !== 'aim' || drag) return;
    const point = pointFrom(event);
    if (Math.hypot(point.x - ball.x, point.y - ball.y) > 25) return;
    canvas.setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, ...point };
    updateShotHud();
    draw();
  });

  canvas.addEventListener('pointermove', event => {
    if (drag?.id !== event.pointerId) return;
    aimAt(pointFrom(event));
    updateShotHud();
    draw();
  });

  canvas.addEventListener('pointerup', event => {
    if (drag?.id !== event.pointerId) return;
    aimAt(pointFrom(event));
    const shot = preview;
    clearDrag();
    if (!shot) return;
    // A touch drag can reach an embedded canvas without focusing its frame.
    canvas.focus({ preventScroll: true });
    stopClock();
    ball.vx = shot.vx;
    ball.vy = shot.vy;
    strokes[holeIndex] += 1;
    phase = 'moving';
    shotAudio = true;
    lastBounce = -Infinity;
    audio.play('shot', { gesture: event, level: .5 + .5 * shot.length / maxPull });
    updateHud();
    draw();
    schedule();
  });

  for (const type of ['pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(type, event => {
      if (drag?.id === event.pointerId) clearDrag();
    });
  }
  window.addEventListener('resize', clearDrag);
  window.addEventListener('blur', () => {
    blurred = true;
    shotAudio = false;
    clearDrag();
    stopClock();
  });
  window.addEventListener('focus', () => {
    blurred = false;
    schedule();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      shotAudio = false;
      clearDrag();
      stopClock();
    } else {
      schedule();
    }
  });

  function bindButton(button, action) {
    button.addEventListener('click', action);
    let start = null;
    button.addEventListener('touchstart', event => {
      start = event.touches.length === 1 ? event.changedTouches[0] : null;
    }, { passive: true });
    button.addEventListener('touchcancel', () => { start = null; });
    button.addEventListener('touchend', event => {
      if (!start) return;
      const end = [...event.changedTouches].find(touch => touch.identifier === start.identifier);
      if (!end) return;
      const moved = Math.hypot(end.clientX - start.clientX, end.clientY - start.clientY);
      start = null;
      if (!event.cancelable || moved > 10 || !button.contains(document.elementFromPoint(end.clientX, end.clientY))) return;
      // An emulated touch can end on the button without a synthesized click.
      event.preventDefault();
      button.click();
    }, { passive: false });
  }

  bindButton(retry, () => {
    if (phase === 'finished') return;
    audio.stop();
    strokes[holeIndex] = 0;
    loadHole(holeIndex);
  });
  bindButton(newRound, () => {
    if (phase !== 'finished') return;
    audio.stop();
    strokes.fill(0);
    loadHole(0);
    retry.focus({ preventScroll: true });
  });

  loadHole(0);
})();
