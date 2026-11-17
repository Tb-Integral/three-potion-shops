"use strict";

const arenaArt = (() => {
  const tau = Math.PI * 2;
  const palette = {
    drift: { body: "#7c3455", rim: "#ff9cb5", lamp: "#ffcccf" },
    dart: { body: "#413666", rim: "#c4b3ff", lamp: "#e4deff" },
    shell: { body: "#735b36", rim: "#ffc678", lamp: "#ffe6ac" },
  };
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  function seeded(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function line(ctx, points, color, width = 1) {
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function disc(ctx, x, y, radius, fill, stroke, width = 1) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, tau);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.stroke();
    }
  }

  function poly(ctx, points, fill, stroke, width = 1) {
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.stroke();
    }
  }

  function bloom(ctx, x, y, radius, color) {
    const halo = ctx.createRadialGradient(x, y, 0, x, y, radius);
    halo.addColorStop(0, color);
    halo.addColorStop(1, "#0000");
    disc(ctx, x, y, radius, halo);
  }

  function fern(ctx, x, y, length, heading, rng, coral) {
    if (length < 8) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading);
    const bend = length * (.15 + rng() * .24);
    const color = coral ? "#53354d" : "#2f5855";
    const tip = coral ? "#bd5c81" : "#559f8e";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-bend * .2, -length * .61, bend, -length);
    ctx.lineWidth = length / 25 + .8;
    ctx.strokeStyle = color;
    ctx.stroke();
    for (let b = 2; b <= 5; ++b) {
      const f = b / 6;
      const branchX = bend * f * f;
      const branchY = -f * length;
      const reach = length * (.29 - f * .18);
      for (const side of [-1, 1]) {
        const dx = branchX + reach * side * (.85 + rng() * .5);
        const dy = branchY - reach * (.5 + rng() * .7);
        ctx.beginPath();
        ctx.moveTo(branchX, branchY);
        ctx.quadraticCurveTo(dx - reach * .24 * side, branchY, dx, dy);
        ctx.lineWidth = 1.1;
        ctx.strokeStyle = color;
        ctx.stroke();
        if (rng() < .85) disc(ctx, dx, dy, 1 + rng() * 1.35, tip);
      }
    }
    disc(ctx, bend, -length, 1.6, tip);
    ctx.restore();
  }

  function contours(ctx, x, y, rx, ry, heading, rng) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading);
    const offset = rng() * tau;
    for (let band = 10; band > 0; band--) {
      const distance = band / 10;
      ctx.beginPath();
      for (let i = 0; i <= 100; ++i) {
        const angle = i * tau / 100;
        const offsetted = 1 + .12 * Math.sin(angle * 3 + offset)
          + .12 * Math.cos(angle * 2 + offset + band * .13)
          + .05 * Math.cos(angle * 5 - band * .20);
        const px = Math.cos(angle) * rx * distance * offsetted;
        const py = Math.sin(angle) * ry * distance * offsetted;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = band > 5 ? "#0b2b3099" : "#13313871";
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = band % 3 === 1 ? "#3b70676e" : "#29565066";
      ctx.stroke();
    }
    ctx.restore();
  }

  function makeBackdrop(canvas, w, h) {
    canvas.width = Math.ceil(w);
    canvas.height = Math.ceil(h);
    const ctx = canvas.getContext("2d");
    const rng = seeded(49731);
    const sea = ctx.createLinearGradient(0, 0, w, h);
    sea.addColorStop(0, "#102b33");
    sea.addColorStop(.46, "#071d28");
    sea.addColorStop(1, "#10192c");
    ctx.fillStyle = sea;
    ctx.fillRect(0, 0, w, h);

    bloom(ctx, w * .78, h * .05, Math.max(w, h) * .72, "#34797667");
    bloom(ctx, w * .13, h * .81, Math.min(w, h) * .72, "#26646d66");
    ctx.save();
    for (let i = 0; i < 12; i++) {
      const top = w * (.63 + rng() * .38);
      const far = top - w * (.22 + rng() * .57);
      const bright = ctx.createLinearGradient(0, 0, 0, h * .7);
      bright.addColorStop(0, "#82e7b515");
      bright.addColorStop(1, "#82e7b500");
      poly(ctx, [top, 0, top + 14 + rng() * 60, 0, far + 50, h * .7, far - 20, h * .7], bright);
    }
    ctx.restore();

    const plankton = Math.round(w * h / 650);
    for (let i = 0; i < plankton; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const large = i % 31 === 0;
      disc(ctx, x, y, large ? 1.4 : .45 + rng() * .85,
        large ? "#8de7be67" : "#81c1c331");
    }

    const isTall = h > w;
    const floor = Math.min(w, h);
    const beds = [
      [-.01, .16, .14, .24, -.27],
      [1, .12, .14, .14, .78],
      [.05, .89, .20, .13, -.21],
      [.95, .81, .13, .20, .62],
      [.42, 1.04, .22, .10, -.01],
    ];
    for (const [cx, cy, rx, ry, angle] of beds) {
      const x = cx * w;
      const y = cy * h;
      const lx = Math.max(floor * .18, rx * w);
      const ly = Math.max(floor * .16, ry * h);
      contours(ctx, x, y, lx, ly, angle, rng);
      for (let i = 0; i < (isTall ? 13 : 21); i++) {
        const az = rng() * tau;
        const d = .4 + rng() * .66;
        fern(ctx, x + Math.cos(az) * d * lx, y + Math.sin(az) * d * ly,
          floor * (.035 + rng() * .071), az * .26 - .7, rng, i % 4 === 0);
      }
    }
    for (let y = 30; y < h; y += 43) {
      for (let x = 30; x < w; x += 43) {
        line(ctx, [x - 2, y, x + 2, y], "#9ee2d126");
        line(ctx, [x, y - 2, x, y + 2], "#9ee2d126");
      }
    }
    const depth = ctx.createRadialGradient(w / 2, h / 2, floor * .15, w / 2, h / 2, Math.hypot(w, h) * .63);
    depth.addColorStop(0, "#02182100");
    depth.addColorStop(1, "#040c15b5");
    ctx.fillStyle = depth;
    ctx.fillRect(0, 0, w, h);
  }

  function drawSub(ctx, x, y, angle, scale, active = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.lineJoin = "round";

    if (active) {
      poly(ctx, [-14, -4, -32, -2, -41, 0, -32, 2, -14, 4], "#72fac262");
      disc(ctx, -26, 0, 3.5, "#b5ffe582");
    }
    poly(ctx, [12, -10, -1, -17, -14, -15, -18, -7, -9, -4], "#276f69", "#a8f2d7", 1.4);
    poly(ctx, [12, 10, -1, 17, -14, 15, -18, 7, -9, 4], "#234f51", "#8bd7c6", 1.4);
    poly(ctx, [23, 0, 13, -10, -5, -11, -17, -7, -19, 0, -17, 7, -5, 11, 13, 10],
      "#2c987f", "#ccffe6", 1.75);
    poly(ctx, [17, 0, 11, -7, 2, -8, -4, -4, -4, 4, 2, 8, 11, 7],
      "#0d3d43", "#81e6ce", .85);
    poly(ctx, [14, 0, 9, -5.3, 4, -5.4, 3, -2.6, 9, -.7], "#78f7de");
    line(ctx, [-12, -5, -12, 5], "#dbfff1", 1.4);
    line(ctx, [-15, -3, -15, 3], "#83e9c6", 1.1);
    disc(ctx, 1, -12.4, 1.6, "#ecfff4");
    disc(ctx, 1, 12.4, 1.6, "#ecfff4");
    ctx.restore();
  }

  function drawEnemy(ctx, enemy, elapsed) {
    const { x, y, angle, type, radius, flash, wake, hp, maxHp, surge } = enemy;
    const { body, rim, lamp } = palette[type];
    ctx.save();
    ctx.translate(x, y);
    const d = wake > 0 ? 1 - wake / .6 : 1;
    if (wake > 0) {
      ctx.globalAlpha *= .72;
      disc(ctx, 0, 0, radius * (1.2 + d * .8), null, rim, 1.2);
      for (let i = 0; i < 4; i++) {
        const phi = i * tau / 4;
        disc(ctx, Math.cos(phi) * radius * 1.5, Math.sin(phi) * radius * 1.5, 2, rim);
      }
    }
    ctx.save();
    ctx.rotate(angle);
    ctx.scale(radius / 17, radius / 17);
    ctx.lineJoin = "round";
    const fill = flash > 0 ? "#faffe8" : body;
    const stroke = flash > 0 ? "#fffef0" : rim;
    if (type === "drift") {
      const swing = reducedMotion.matches ? 0 : Math.sin(elapsed * 6 + enemy.id) * 3;
      line(ctx, [-4, -10, -14, -13, -22, -7 + swing], stroke, 1.7);
      line(ctx, [-5, -3, -14, -5, -23, -3 + swing], stroke, 1.7);
      line(ctx, [-5, 4, -15, 4, -23, 3 - swing], stroke, 1.7);
      line(ctx, [-4, 10, -14, 13, -22, 7 - swing], stroke, 1.7);
      ctx.beginPath();
      ctx.moveTo(-6, -15);
      ctx.bezierCurveTo(25, -16, 25, 16, -6, 15);
      ctx.quadraticCurveTo(0, 0, -6, -15);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      line(ctx, [6, -10, 12, -5, 14, 0, 12, 5, 6, 10], lamp, 1.1);
      disc(ctx, 5, 0, 3.3, lamp);
    } else if (type === "dart") {
      poly(ctx, [21, 0, 2, -8, -13, -15, -8, -5, -18, 0, -8, 5, -13, 15, 2, 8], fill, stroke, 2.1);
      poly(ctx, [15, 0, -2, -3, -7, 0, -2, 3], lamp);
      if (surge) {
        line(ctx, [-20, -6, -34, -6], stroke, 1.5);
        line(ctx, [-20, 6, -34, 6], stroke, 1.5);
      }
    } else {
      poly(ctx, [8, -14, -3, -20, -12, -16, -10, -8, -18, 0, -10, 8, -12, 16, -3, 20, 8, 14],
        "#433b36", stroke, 1.5);
      poly(ctx, [18, 0, 12, -11, 3, -15, -8, -13, -15, -7, -15, 7, -8, 13, 3, 15, 12, 11],
        fill, stroke, 2);
      line(ctx, [-8, -11, -12, -3, -12, 3, -8, 11], lamp, 1.4);
      line(ctx, [0, -12, -4, -5, -4, 5, 0, 12], lamp, 1.4);
      disc(ctx, 10, -3.8, 2.3, lamp);
      disc(ctx, 10, 3.8, 2.3, lamp);
    }
    ctx.restore();
    if (hp < maxHp && hp > 0) {
      const at = radius + 9;
      line(ctx, [-radius * .64, -at, radius * .64, -at], "#051119", 4);
      line(ctx, [-radius * .64, -at, radius * (1.28 * hp / maxHp - .64), -at], rim, 2);
    }
    ctx.restore();
  }

  function drawPreview(ctx, w, h) {
    const condensed = h > w * .86;
    const px = w * (condensed ? .55 : .74);
    const py = h * (condensed ? .255 : .50);
    const r = Math.min(w, h) * (condensed ? .33 : .35);
    bloom(ctx, px, py, r * 1.65, "#339f8577");
    bloom(ctx, px + r * .64, py - r * .50, r, "#4c4d9099");
    ctx.save();
    ctx.translate(px, py);
    for (const size of [.39, .66, .87, 1.12]) {
      disc(ctx, 0, 0, r * size, null, "#92f5d167");
    }
    ctx.setLineDash([2, 8]);
    disc(ctx, 0, 0, r, null, "#b5ffd9aa");
    ctx.setLineDash([]);
    for (let i = 0; i < 32; i++) {
      const angle = i * tau / 32;
      const far = r * 1.18;
      const near = far - (i % 4 === 0 ? 8 : 3);
      line(ctx, [Math.cos(angle) * near, Math.sin(angle) * near, Math.cos(angle) * far, Math.sin(angle) * far], "#89c8b583");
    }
    const beam = ctx.createLinearGradient(0, 0, r, -r * .18);
    beam.addColorStop(0, "#b5ffbf55");
    beam.addColorStop(1, "#7dffcd00");
    poly(ctx, [0, 0, r * 1.36, -r * .83, r * 1.62, -r * .05], beam);
    const ship = r / (condensed ? 37 : 41);
    drawSub(ctx, 0, 0, -.30, ship, true);
    drawEnemy(ctx, { x: r * .61, y: r * -.78, radius: r * .16, angle: 2.18, type: "dart", id: 1 }, 0);
    drawEnemy(ctx, { x: r * .89, y: r * .68, radius: r * .13, angle: -2.73, type: "drift", id: 1 }, 0);
    drawEnemy(ctx, { x: r * -.66, y: r * .8, radius: r * .15, angle: -.89, type: "shell", id: 1 }, 0);
    ctx.restore();
  }

  function drawPlayer(ctx, state) {
    const p = state.player;
    const time = state.elapsed;
    const r = p.radius;
    const lamp = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 49);
    lamp.addColorStop(0, "#74f0c74f");
    lamp.addColorStop(1, "#74f0c700");
    disc(ctx, p.x, p.y, 49, lamp);
    if (state.invulnerable > 0) {
      const hurt = state.hurt > 0;
      disc(ctx, p.x, p.y, r + (hurt ? 11 : 6), hurt ? "#ff8aa834" : "#a7ffdd14",
        hurt ? "#ff91b0" : "#b3f9d99c", 2);
    }
    if (state.shotFlash) {
      const angle = state.firingAngle;
      disc(ctx, p.x + 24 * Math.cos(angle), p.y + 24 * Math.sin(angle), 5, "#e5ff9e");
    }
    if (state.phase !== "lost") {
      drawSub(ctx, p.x, p.y, p.angle, r / 17, Math.hypot(p.vx, p.vy) > 15);
    } else {
      ctx.save();
      ctx.globalAlpha = .5;
      drawSub(ctx, p.x, p.y, p.angle - .22, r / 17);
      ctx.restore();
    }
    if (!reducedMotion.matches && state.phase !== "lost" && (p.vx || p.vy)) {
      for (let i = 0; i < 5; i++) {
        const f = (time * 2.1 + i / 5) % 1;
        const x = p.x - Math.cos(p.angle) * (19 + f * 43);
        const y = p.y - Math.sin(p.angle) * (19 + f * 43) + Math.sin(f * 8) * 5;
        disc(ctx, x, y, 1.9 + f * 1.8, "#9cebd461");
      }
    }
  }

  function drawWorld(ctx, state) {
    ctx.lineCap = "round";
    for (const enemy of state.enemies) drawEnemy(ctx, enemy, state.elapsed);
    for (const bolt of state.projectiles) {
      const dx = bolt.vx * .026;
      const dy = bolt.vy * .026;
      line(ctx, [bolt.x - dx, bolt.y - dy, bolt.x, bolt.y], "#aaff7666", 6);
      line(ctx, [bolt.x - dx * .7, bolt.y - dy * .7, bolt.x, bolt.y], "#ddff97", 2.2);
      disc(ctx, bolt.x, bolt.y, bolt.radius, "#f3ffc7");
    }
    drawPlayer(ctx, state);
    for (const burst of state.effects) {
      ctx.save();
      ctx.globalAlpha = 1 - burst.age / burst.life;
      if (burst.kind === "ring") {
        disc(ctx, burst.x, burst.y, burst.radius + burst.age * 115, null, burst.color, 2.5);
      } else {
        disc(ctx, burst.x, burst.y, burst.radius, burst.color);
      }
      ctx.restore();
    }
    if (state.pointer) {
      const { x, y, dx, dy, reach } = state.pointer;
      disc(ctx, x, y, reach, "#041c2588", "#a7ffddb5", 1.8);
      line(ctx, [x - 5, y, x + 5, y], "#a7ffddaa");
      line(ctx, [x, y - 5, x, y + 5], "#a7ffddaa");
      disc(ctx, x + dx * reach, y + dy * reach, reach * .34, "#42ac91ac", "#c0ffe2", 2.1);
    }
  }

  function create(canvas) {
    const ctx = canvas.getContext("2d");
    const backdrop = document.createElement("canvas");
    let width, height;
    return {
      fit(w, h, cssWidth, cssHeight) {
        if (width !== w || height !== h) makeBackdrop(backdrop, w, h);
        width = w;
        height = h;
        const density = Math.max(1, Math.min(2, devicePixelRatio));
        canvas.style.width = cssWidth + "px";
        canvas.style.height = cssHeight + "px";
        canvas.width = Math.ceil(cssWidth * density);
        canvas.height = Math.ceil(cssHeight * density);
      },
      draw(state) {
        ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
        ctx.drawImage(backdrop, 0, 0, width, height);
        if (state.phase === "menu") drawPreview(ctx, width, height);
        else drawWorld(ctx, state);
      },
    };
  }

  return { create, palette };
})();
