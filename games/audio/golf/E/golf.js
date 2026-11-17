(() => {
  'use strict';

  const WIDTH = 600;
  const HEIGHT = 660;
  const BALL_RADIUS = 11;
  const CUP_RADIUS = 22;
  const CAPTURE_RADIUS = 13;
  const CAPTURE_SPEED = 92;
  const MAX_PULL = 145;
  const MAX_SPEED = 830;
  const FRICTION = 360;
  const STEP = 1 / 240;

  const holes = [
    {
      border: [[91, 45], [509, 45], [558, 94], [558, 567], [509, 616], [91, 616], [42, 567], [42, 94]],
      tee: [184, 523],
      target: [403, 138],
      obstacles: [[421, 396, 484, 350, 27]],
      grass: ['#8dac77', '#577f5d'],
      stripe: '#e3e8ad',
      grain: 116
    },
    {
      border: [[137, 45], [484, 45], [558, 119], [558, 548], [489, 616], [105, 616], [42, 553], [42, 140]],
      tee: [352, 510],
      target: [390, 135],
      obstacles: [[245, 330, 489, 330, 29]],
      grass: ['#a3b77c', '#687f4d'],
      stripe: '#f4ecb2',
      grain: 381
    },
    {
      border: [[91, 45], [503, 45], [558, 100], [558, 518], [460, 616], [101, 616], [42, 557], [42, 94]],
      tee: [162, 529],
      target: [444, 130],
      obstacles: [[128, 435, 367, 435, 23], [235, 281, 485, 281, 25]],
      grass: ['#7fa690', '#4f786b'],
      stripe: '#c8e1bf',
      grain: 713
    }
  ].map(hole => {
    const walls = hole.border.map(([x, y], index) => {
      const [nextX, nextY] = hole.border[(index + 1) % hole.border.length];
      const dx = nextX - x;
      const dy = nextY - y;
      const length = Math.hypot(dx, dy);
      return { x, y, nx: -dy / length, ny: dx / length };
    });
    const obstacles = hole.obstacles.map(([ax, ay, bx, by, radius]) => ({ ax, ay, bx, by, radius }));
    return { ...hole, walls, obstacles, cup: { x: hole.target[0], y: hole.target[1], radius: CUP_RADIUS } };
  });

  const canvas = document.querySelector('[data-golf-course]');
  const ctx = canvas.getContext('2d');
  const scenery = document.createElement('canvas');
  scenery.width = WIDTH;
  scenery.height = HEIGHT;
  const art = scenery.getContext('2d');
  const entries = Array.from(document.querySelectorAll('.entry'));
  const status = document.getElementById('status');
  const force = document.getElementById('force');
  const forceFill = document.getElementById('force-fill');
  const reset = document.getElementById('reset');
  const summary = document.getElementById('summary');
  const total = document.getElementById('total');
  const totalUnit = document.getElementById('total-unit');
  const newGame = document.getElementById('new-game');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const audio = createGameAudio('mini-golf-audio-v1', onButtonActivate);
  const effects = {
    stroke: [
      { type: 'triangle', hz: 520, tail: 122, duration: .072, peak: .22 },
      { type: 'sine', hz: 1550, tail: 410, duration: .043, peak: .14 }
    ],
    bounce: [
      { type: 'triangle', hz: 298, tail: 100, duration: .082, peak: .19 }
    ],
    cup: [
      { type: 'triangle', hz: 365, tail: 155, duration: .085, peak: .17 },
      { type: 'sine', hz: 540, tail: 216, at: .031, duration: .12, peak: .21 },
      { type: 'sine', hz: 220, at: .09, duration: .17, peak: .15 }
    ],
    finish: [
      { type: 'triangle', hz: 392, duration: .19, peak: .16 },
      { type: 'triangle', hz: 493.88, at: .095, duration: .20, peak: .17 },
      { type: 'sine', hz: 587.33, at: .19, duration: .30, peak: .20 },
      { type: 'sine', hz: 783.99, at: .27, duration: .27, peak: .16 }
    ]
  };

  let holeIndex = 0;
  let course = holes[0];
  let phase = 'aim';
  let strokes = [0, 0, 0];
  let ball;
  let drag = null;
  let preview = null;
  let accumulator = 0;
  let lastFrame = null;
  let sinkTime = 0;
  let sinkStart;
  let focused = true;
  let dirty = true;
  let viewWidth = 0;
  let viewHeight = 0;
  let lastBounceAt = -Infinity;

  // The course is convex. Its inward normals describe the exact straight wall faces.
  function bounce(body, nx, ny, restitution) {
    const alongNormal = body.vx * nx + body.vy * ny;
    if (alongNormal < 0) {
      body.vx -= (1 + restitution) * alongNormal * nx;
      body.vy -= (1 + restitution) * alongNormal * ny;
      return -alongNormal;
    }
    return 0;
  }

  function collide(body, hole) {
    let impact = 0;
    for (let pass = 0; pass < 2; pass += 1) {
      for (const wall of hole.walls) {
        const distance = (body.x - wall.x) * wall.nx + (body.y - wall.y) * wall.ny;
        if (distance < BALL_RADIUS) {
          body.x += (BALL_RADIUS - distance) * wall.nx;
          body.y += (BALL_RADIUS - distance) * wall.ny;
          impact = Math.max(impact, bounce(body, wall.nx, wall.ny, .78));
        }
      }

      for (const obstacle of hole.obstacles) {
        const dx = obstacle.bx - obstacle.ax;
        const dy = obstacle.by - obstacle.ay;
        const projection = ((body.x - obstacle.ax) * dx + (body.y - obstacle.ay) * dy) / (dx * dx + dy * dy);
        const t = Math.max(0, Math.min(1, projection));
        const x = obstacle.ax + t * dx;
        const y = obstacle.ay + t * dy;
        const awayX = body.x - x;
        const awayY = body.y - y;
        const minDistance = BALL_RADIUS + obstacle.radius;
        const distance = Math.hypot(awayX, awayY);
        if (distance < minDistance) {
          const axisLength = Math.hypot(dx, dy);
          const nx = distance > 0 ? awayX / distance : -dy / axisLength;
          const ny = distance > 0 ? awayY / distance : dx / axisLength;
          body.x = x + nx * minDistance;
          body.y = y + ny * minDistance;
          impact = Math.max(impact, bounce(body, nx, ny, .74));
        }
      }
    }
    return impact;
  }

  // Shared by the actual shot and the guide. Even at full power one step spans under 3.5 units.
  function roll(body, hole, onImpact) {
    body.x += body.vx * STEP;
    body.y += body.vy * STEP;
    const impact = collide(body, hole);
    if (impact >= 78) onImpact?.(impact);
    const speed = Math.hypot(body.vx, body.vy);
    const newSpeed = Math.max(0, speed - FRICTION * STEP);
    if (newSpeed <= CAPTURE_SPEED && Math.hypot(body.x - hole.cup.x, body.y - hole.cup.y) <= CAPTURE_RADIUS) {
      body.vx = 0;
      body.vy = 0;
      return 'sunk';
    }
    if (newSpeed === 0) {
      body.vx = 0;
      body.vy = 0;
      return 'aim';
    }
    body.vx *= newSpeed / speed;
    body.vy *= newSpeed / speed;
    return 'moving';
  }

  function playBounce(impact) {
    const now = performance.now();
    if (now - lastBounceAt < 100) return;
    lastBounceAt = now;
    const strength = Math.min(.9, .24 + (impact - 78) / 850);
    audio.play(effects.bounce, { strength });
  }

  function aimFor(dx, dy) {
    const length = Math.hypot(dx, dy);
    const pull = Math.min(length, MAX_PULL);
    const fraction = length === 0 ? 0 : pull / length;
    const pullX = dx * fraction;
    const pullY = dy * fraction;
    return { pull, pullX, pullY, vx: -pullX * MAX_SPEED / MAX_PULL, vy: -pullY * MAX_SPEED / MAX_PULL };
  }

  function predict(aim) {
    const projected = { x: ball.x, y: ball.y, vx: aim.vx, vy: aim.vy };
    const path = [{ x: ball.x, y: ball.y }];
    let result = 'moving';
    for (let step = 1; result === 'moving'; step += 1) {
      result = roll(projected, course);
      if (step % 7 === 0 || result !== 'moving') path.push({ x: projected.x, y: projected.y });
    }
    return { path, sinks: result === 'sunk' };
  }

  function updateHud() {
    entries.forEach((entry, index) => {
      const active = index === holeIndex && phase !== 'finished';
      if (active) entry.setAttribute('aria-current', 'step');
      else entry.removeAttribute('aria-current');
      entry.querySelector('.count').textContent = index <= holeIndex ? strokes[index] : '—';
    });
    const messages = {
      aim: 'Потяните мяч назад и отпустите.',
      moving: 'Мяч катится…',
      sunk: 'В лунке!',
      finished: 'Все три лунки пройдены.'
    };
    status.textContent = messages[phase];
    status.hidden = Boolean(drag);
    force.hidden = !drag;
    reset.hidden = phase === 'finished';
    summary.hidden = phase !== 'finished';
  }

  function loadHole(index) {
    clearDrag();
    holeIndex = index;
    course = holes[index];
    ball = { x: course.tee[0], y: course.tee[1], vx: 0, vy: 0 };
    phase = 'aim';
    accumulator = 0;
    sinkTime = 0;
    lastFrame = null;
    drawScenery(course);
    updateHud();
    dirty = true;
  }

  function finish() {
    phase = 'finished';
    audio.play(effects.finish);
    const score = strokes.reduce((sum, count) => sum + count, 0);
    const tail = score % 100;
    total.textContent = score;
    totalUnit.textContent = tail >= 11 && tail <= 14 ? 'ударов'
      : score % 10 === 1 ? 'удар'
      : score % 10 >= 2 && score % 10 <= 4 ? 'удара'
      : 'ударов';
    updateHud();
    newGame.focus({ preventScroll: true });
  }

  function clearDrag() {
    if (!drag) return;
    const pointerId = drag.pointerId;
    drag = null;
    preview = null;
    canvas.classList.remove('dragging', 'grab');
    if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    updateHud();
    dirty = true;
  }

  function pointAt(event, rect = canvas.getBoundingClientRect()) {
    return { x: (event.clientX - rect.left) * WIDTH / rect.width,
      y: (event.clientY - rect.top) * HEIGHT / rect.height };
  }

  function grabRadius() {
    return Math.max(30, 24 * WIDTH / (viewWidth || WIDTH));
  }

  function overBall(point) {
    return Math.hypot(point.x - ball.x, point.y - ball.y) <= grabRadius();
  }

  canvas.addEventListener('pointerdown', event => {
    if (phase !== 'aim' || drag || event.button !== 0 || !event.isPrimary) return;
    const rect = canvas.getBoundingClientRect();
    const start = pointAt(event, rect);
    if (!overBall(start)) return;
    event.preventDefault();
    drag = { start, rect, pointerId: event.pointerId, aim: aimFor(0, 0) };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('dragging');
    forceFill.style.transform = 'scaleX(0)';
    updateHud();
    dirty = true;
  });

  function updateAim(event) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width !== drag.rect.width || rect.height !== drag.rect.height ||
        rect.left !== drag.rect.left || rect.top !== drag.rect.top) {
      clearDrag();
      return null;
    }
    const point = pointAt(event, rect);
    return aimFor(point.x - drag.start.x, point.y - drag.start.y);
  }

  window.addEventListener('pointermove', event => {
    if (drag?.pointerId === event.pointerId) {
      const aim = updateAim(event);
      if (!aim) return;
      drag.aim = aim;
      preview = aim.pull >= minPull() ? predict(aim) : null;
      forceFill.style.transform = 'scaleX(' + (aim.pull / MAX_PULL) + ')';
      dirty = true;
    } else if (!drag && event.target === canvas) {
      canvas.classList.toggle('grab', phase === 'aim' && overBall(pointAt(event)));
    }
  });

  function minPull() {
    return Math.max(7, 6 * WIDTH / (viewWidth || WIDTH));
  }

  window.addEventListener('pointerup', event => {
    if (drag?.pointerId !== event.pointerId) return;
    const aim = updateAim(event);
    clearDrag();
    if (!aim || aim.pull < minPull() || phase !== 'aim') return;
    ball.vx = aim.vx;
    ball.vy = aim.vy;
    strokes[holeIndex] += 1;
    phase = 'moving';
    lastBounceAt = -Infinity;
    audio.play(effects.stroke, { gesture: event.isTrusted, strength: .4 + .6 * aim.pull / MAX_PULL });
    accumulator = 0;
    lastFrame = null;
    updateHud();
    dirty = true;
  });

  function cancelPointer(event) {
    if (drag?.pointerId === event.pointerId) clearDrag();
  }

  window.addEventListener('pointercancel', cancelPointer);
  canvas.addEventListener('lostpointercapture', cancelPointer);
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  window.addEventListener('blur', () => {
    focused = false;
    clearDrag();
    lastFrame = null;
  });
  window.addEventListener('focus', () => {
    focused = true;
    lastFrame = null;
  });
  document.addEventListener('visibilitychange', () => {
    clearDrag();
    lastFrame = null;
  });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width !== viewWidth || rect.height !== viewHeight) clearDrag();
    viewWidth = rect.width;
    viewHeight = rect.height;
    const density = Math.min(2, window.devicePixelRatio || 1);
    const pixelsWide = Math.max(1, Math.round(rect.width * density));
    const pixelsHigh = Math.max(1, Math.round(rect.height * density));
    if (canvas.width !== pixelsWide || canvas.height !== pixelsHigh) {
      canvas.width = pixelsWide;
      canvas.height = pixelsHigh;
      dirty = true;
    }
    ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
  }

  window.addEventListener('resize', () => {
    clearDrag();
    resize();
  });
  new ResizeObserver(resize).observe(canvas);

  function onButtonActivate(button, activate) {
    const tapSlop = 12;
    let touchStart;
    let handledTouch;

    button.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch' && event.isPrimary) touchStart = event;
    });
    button.addEventListener('pointermove', event => {
      if (touchStart?.pointerId === event.pointerId &&
          Math.hypot(event.clientX - touchStart.clientX, event.clientY - touchStart.clientY) > tapSlop) touchStart = undefined;
    });
    function cancelTouch(event) {
      if (touchStart?.pointerId === event.pointerId) touchStart = undefined;
    }
    button.addEventListener('pointercancel', cancelTouch);
    button.addEventListener('lostpointercapture', cancelTouch);
    button.addEventListener('pointerup', event => {
      if (touchStart?.pointerId !== event.pointerId) return;
      const distance = Math.hypot(event.clientX - touchStart.clientX, event.clientY - touchStart.clientY);
      touchStart = undefined;
      if (button.disabled || distance > tapSlop ||
          !button.contains(document.elementFromPoint(event.clientX, event.clientY))) return;
      // A touch after a canvas drag may reach the button without a synthesized click.
      handledTouch = event;
      activate(event);
    });
    button.addEventListener('click', event => {
      if (handledTouch && event.detail > 0 && event.timeStamp - handledTouch.timeStamp < 500) {
        const samePointer = event.pointerType === 'touch' && event.pointerId === handledTouch.pointerId;
        const fromTouch = event.pointerType === 'touch' || event.sourceCapabilities?.firesTouchEvents === true;
        const legacyClick = !event.pointerType && event.sourceCapabilities?.firesTouchEvents !== false;
        const compatibilityClick = (fromTouch || legacyClick) &&
          Math.hypot(event.clientX - handledTouch.clientX, event.clientY - handledTouch.clientY) <= tapSlop;
        if (samePointer || compatibilityClick) return;
      }
      activate(event);
    });
  }

  onButtonActivate(reset, () => {
    if (phase === 'finished') return;
    audio.stop();
    strokes[holeIndex] = 0;
    loadHole(holeIndex);
  });
  onButtonActivate(newGame, () => {
    audio.stop();
    strokes = [0, 0, 0];
    loadHole(0);
    reset.focus({ preventScroll: true });
  });

  function frame(time) {
    const active = focused && !document.hidden;
    const elapsed = active && lastFrame !== null ? Math.min(.05, (time - lastFrame) / 1000) : 0;
    lastFrame = active ? time : null;
    if (phase === 'moving' && elapsed > 0) {
      accumulator += elapsed;
      while (accumulator >= STEP && phase === 'moving') {
        accumulator -= STEP;
        phase = roll(ball, course, playBounce);
      }
      if (phase !== 'moving') {
        accumulator = 0;
        if (phase === 'sunk') {
          audio.play(effects.cup);
          sinkTime = 0;
          sinkStart = { x: ball.x, y: ball.y };
        }
        updateHud();
      }
      dirty = true;
    } else if (phase === 'sunk' && elapsed > 0) {
      sinkTime += elapsed;
      if (!reducedMotion.matches) {
        const t = Math.min(1, sinkTime / .26);
        ball.x = sinkStart.x + (course.cup.x - sinkStart.x) * t;
        ball.y = sinkStart.y + (course.cup.y - sinkStart.y) * t;
      }
      if (sinkTime >= .55) {
        if (holeIndex < holes.length - 1) loadHole(holeIndex + 1);
        else finish();
      }
      dirty = true;
    }

    if (dirty) {
      paint();
      dirty = false;
    }
    requestAnimationFrame(frame);
  }

  function randomWithSeed(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function traceBorder(context, border) {
    context.beginPath();
    context.moveTo(border[0][0], border[0][1]);
    for (const [x, y] of border.slice(1)) context.lineTo(x, y);
    context.closePath();
  }

  function drawScenery(hole) {
    const random = randomWithSeed(hole.grain);
    const sand = art.createLinearGradient(0, 0, WIDTH, HEIGHT);
    sand.addColorStop(0, '#eadbbd');
    sand.addColorStop(.55, '#d8c4a0');
    sand.addColorStop(1, '#c5ad88');
    art.fillStyle = sand;
    art.fillRect(0, 0, WIDTH, HEIGHT);
    for (let dot = 0; dot < 8500; dot += 1) {
      art.fillStyle = dot % 2 ? '#74552e25' : '#fff4d980';
      const size = random() * 1.25 + .25;
      art.fillRect(random() * WIDTH, random() * HEIGHT, size * 1.4, size);
    }

    // Fine contours of the sand apron echo the shape of each green.
    art.save();
    art.lineJoin = 'round';
    for (const width of [87, 65, 42]) {
      traceBorder(art, hole.border);
      art.strokeStyle = '#896e4738';
      art.lineWidth = width;
      art.stroke();
      art.strokeStyle = sand;
      art.lineWidth = width - 2;
      art.stroke();
    }
    art.restore();

    art.save();
    traceBorder(art, hole.border);
    art.lineJoin = 'round';
    art.shadowColor = '#442e20a0';
    art.shadowOffsetY = 7;
    art.shadowBlur = 10;
    art.strokeStyle = '#5f422c';
    art.lineWidth = 24;
    art.stroke();
    art.restore();
    art.lineJoin = 'round';
    art.strokeStyle = '#9e7047';
    art.lineWidth = 22;
    art.stroke();
    art.strokeStyle = '#d9aa73';
    art.lineWidth = 17;
    art.stroke();
    art.strokeStyle = '#b58756';
    art.lineWidth = 12;
    art.stroke();

    art.save();
    art.clip();
    const turf = art.createLinearGradient(120, 0, 490, 660);
    turf.addColorStop(0, hole.grass[0]);
    turf.addColorStop(1, hole.grass[1]);
    art.fillStyle = turf;
    art.fillRect(0, 0, WIDTH, HEIGHT);
    art.save();
    art.translate(-80, -80);
    art.rotate(-.16);
    art.globalAlpha = .12;
    art.fillStyle = hole.stripe;
    for (let y = 0; y < 850; y += 90) art.fillRect(0, y, 780, 44);
    art.restore();
    for (let blade = 0; blade < 18000; blade += 1) {
      art.fillStyle = blade % 2 ? '#173f2e20' : '#fff8cf36';
      const x = random() * WIDTH;
      const y = random() * HEIGHT;
      art.fillRect(x, y, random() * 2 + .28, random() * 1.3 + .3);
    }
    art.lineWidth = 19;
    art.strokeStyle = '#183b2c18';
    art.stroke();
    art.lineWidth = 8;
    art.strokeStyle = '#183b2c28';
    art.stroke();
    art.restore();
    traceBorder(art, hole.border);
    art.lineWidth = 2;
    art.strokeStyle = '#edc990';
    art.stroke();

    for (const [x, y] of hole.border) {
      const screwX = x + Math.sign(x - WIDTH / 2) * 4;
      const screwY = y + Math.sign(y - HEIGHT / 2) * 4;
      dot(art, screwX, screwY, 2, '#6f4f37');
      dot(art, screwX - .5, screwY - .5, .7, '#efcf9c');
    }
    for (const obstacle of hole.obstacles) drawPlanter(obstacle, random);

    const [teeX, teeY] = hole.tee;
    art.strokeStyle = '#eff0cd6b';
    art.lineWidth = 2;
    art.beginPath();
    art.moveTo(teeX - 17, teeY + 19);
    art.lineTo(teeX + 17, teeY + 19);
    art.stroke();
    dot(art, teeX - 18, teeY + 19, 3.8, '#cdb36f');
    dot(art, teeX + 18, teeY + 19, 3.8, '#cdb36f');
  }

  function dot(context, x, y, radius, fill) {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = fill;
    context.fill();
  }

  function drawPlanter(obstacle, random) {
    const { ax, ay, bx, by, radius } = obstacle;
    const length = Math.hypot(bx - ax, by - ay);
    art.save();
    art.translate(ax, ay);
    art.rotate(Math.atan2(by - ay, bx - ax));
    const outer = new Path2D();
    outer.roundRect(-radius, -radius, length + 2 * radius, 2 * radius, radius);
    art.shadowColor = '#152f25b0';
    art.shadowOffsetY = 7;
    art.shadowBlur = 9;
    art.fillStyle = '#68492f';
    art.fill(outer);
    art.shadowColor = 'transparent';
    art.lineWidth = 2;
    art.strokeStyle = '#423a29';
    art.stroke(outer);
    art.clip(outer);
    const rim = art.createLinearGradient(0, -radius, 0, radius);
    rim.addColorStop(0, '#f2d2a0');
    rim.addColorStop(.52, '#bc8955');
    rim.addColorStop(1, '#a9774c');
    art.fillStyle = rim;
    art.fillRect(-radius, -radius, length + 2 * radius, radius * 2);

    const inner = radius - 6;
    const bed = new Path2D();
    bed.roundRect(-inner, -inner, length + 2 * inner, 2 * inner, inner);
    art.fillStyle = '#425740';
    art.fill(bed);
    art.strokeStyle = '#63482d';
    art.stroke(bed);
    art.clip(bed);

    for (let leaf = 0; leaf < length * .95 + 65; leaf += 1) {
      const shades = ['#49694c', '#698756', '#88a363', '#a2ac6a', '#576d48'];
      const x = random() * (length + 2 * inner) - inner;
      const y = random() * 2 * inner - inner;
      art.beginPath();
      art.ellipse(x, y, random() * 5.5 + 1.5, random() * 2.2 + 1.2, random() * Math.PI, 0, Math.PI * 2);
      art.fillStyle = shades[leaf % shades.length];
      art.fill();
    }
    for (let bloom = 0; bloom < length / 14 + 3; bloom += 1) {
      const x = random() * (length + 2 * inner) - inner;
      const y = random() * 2 * inner - inner;
      dot(art, x, y, 2 + random() * 1.5, bloom % 3 ? '#e4c982' : '#f5e3ac');
    }
    art.restore();
  }

  function drawCup() {
    const { x, y, radius } = course.cup;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#17362f55';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 3, y - 3);
    ctx.lineTo(x + 49, y + 30);
    ctx.stroke();
    dot(ctx, x, y, radius + 3, '#c9d6a2');
    dot(ctx, x, y, radius + 1, '#37513a');
    const holeShade = ctx.createLinearGradient(x, y - radius, x, y + radius);
    holeShade.addColorStop(0, '#0b2721');
    holeShade.addColorStop(.74, '#172f25');
    holeShade.addColorStop(1, '#345040');
    dot(ctx, x, y, radius - 2, holeShade);
    ctx.restore();
  }

  function drawFlag() {
    const { x, y } = course.cup;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#213c32';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, y - 3);
    ctx.lineTo(x, y - 76);
    ctx.stroke();
    ctx.strokeStyle = '#f6e7b9';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 1, y - 75);
    ctx.quadraticCurveTo(x + 19, y - 80, x + 42, y - 65);
    ctx.quadraticCurveTo(x + 20, y - 62, x + 1, y - 50);
    ctx.closePath();
    ctx.fillStyle = '#f6b750';
    ctx.fill();
    ctx.strokeStyle = '#7d512e';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    dot(ctx, x - .45, y - 77, 3, '#f5e3b8');
    ctx.restore();
  }

  function drawGuide() {
    const { pull, pullX, pullY } = drag.aim;
    if (pull === 0) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#ffd17a';
    ctx.lineWidth = 3.5;
    ctx.setLineDash([3, 7]);
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(ball.x + pullX, ball.y + pullY);
    ctx.stroke();
    ctx.setLineDash([]);
    dot(ctx, ball.x + pullX, ball.y + pullY, 7, '#ffd17a');
    dot(ctx, ball.x + pullX, ball.y + pullY, 3, '#543e2f');

    if (preview) {
      ctx.beginPath();
      ctx.moveTo(ball.x, ball.y);
      for (const point of preview.path) ctx.lineTo(point.x, point.y);
      ctx.setLineDash([2, 9]);
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#263e33b0';
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fff6d5';
      ctx.stroke();
      ctx.setLineDash([]);

      const last = preview.path[preview.path.length - 1];
      const stop = preview.sinks ? course.cup : last;
      ctx.beginPath();
      ctx.arc(stop.x, stop.y, preview.sinks ? CUP_RADIUS + 6 : 6, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = preview.sinks ? '#ffe184' : '#fff6d5';
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBall() {
    const disappearing = phase === 'sunk';
    const scale = disappearing ? (reducedMotion.matches ? 0 : Math.max(0, 1 - sinkTime / .26)) : 1;
    if (phase === 'finished' || scale === 0) return;
    const { x, y } = ball;
    const radius = BALL_RADIUS * scale;
    ctx.save();
    if (phase === 'aim' && !drag) {
      ctx.beginPath();
      ctx.arc(x, y, grabRadius(), 0, Math.PI * 2);
      ctx.strokeStyle = '#213d3375';
      ctx.lineWidth = 4;
      ctx.setLineDash([5, 6]);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fcf4c9e0';
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (!disappearing) {
      ctx.beginPath();
      ctx.ellipse(x + 4, y + 5, 12, 9, .25, 0, Math.PI * 2);
      ctx.fillStyle = '#203a3188';
      ctx.fill();
    }
    const sphere = ctx.createRadialGradient(x - radius * .36, y - radius * .46, 0, x, y, radius);
    sphere.addColorStop(0, '#ffffff');
    sphere.addColorStop(.63, '#fffcf1');
    sphere.addColorStop(1, '#d8e1cf');
    dot(ctx, x, y, radius, sphere);
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = '#243b31';
    ctx.stroke();
    for (const [dx, dy] of [[.37, .44], [.55, .16], [.21, .61]]) {
      dot(ctx, x + radius * dx, y + radius * dy, radius * .082, '#a7b7a68c');
    }
    ctx.restore();
  }

  function paint() {
    ctx.drawImage(scenery, 0, 0);
    drawCup();
    if (drag) drawGuide();
    drawFlag();
    drawBall();
  }

  window.getGolfState = () => ({
    holeIndex,
    phase,
    strokes: [...strokes],
    ball: { ...ball, radius: BALL_RADIUS },
    cup: { ...course.cup },
    course: { width: WIDTH, height: HEIGHT },
    dragging: Boolean(drag),
    obstacles: course.obstacles.map(obstacle => ({ ...obstacle })),
    border: course.border.map(([x, y]) => ({ x, y }))
  });

  loadHole(0);
  resize();
  requestAnimationFrame(frame);
})();
