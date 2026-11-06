"use strict";

function createArenaRenderer(canvas) {
  const context = canvas.getContext("2d");
  const terrain = document.createElement("canvas");
  const ice = terrain.getContext("2d");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const tau = Math.PI * 2;
  const palette = {
    drone: {fill: "#733a31", line: "#ffad81"},
    dart: {fill: "#703151", line: "#ff8ac3"},
    hauler: {fill: "#463c79", line: "#c0b5ff"},
  };
  let scale = 1;
  let density = 1;

  function randomFor(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function line(ctx, points, color, width = 1) {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  function polygon(ctx, points, fill, stroke, width = 1) {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
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

  function circle(ctx, x, y, radius, fill, stroke, width = 1) {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0, radius), 0, tau);
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

  function background({width, height}) {
    terrain.width = Math.ceil(width);
    terrain.height = Math.ceil(height);
    const random = randomFor(713);
    const base = ice.createLinearGradient(0, 0, width * 0.6, height);
    base.addColorStop(0, "#183645");
    base.addColorStop(0.52, "#142c3e");
    base.addColorStop(1, "#0b202d");
    ice.fillStyle = base;
    ice.fillRect(0, 0, width, height);

    for (let i = 0; i < 25; i++) {
      const x = random() * width;
      const y = random() * height;
      const radius = 45 + random() * 164;
      const glow = ice.createRadialGradient(x, y, 2, x, y, radius);
      glow.addColorStop(0, i % 2 ? "#6dabba32" : "#06162461");
      glow.addColorStop(1, "#152e4100");
      ice.fillStyle = glow;
      ice.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    const sheets = Math.round(width * height / 22500);
    for (let i = 0; i < sheets; i++) {
      const x = random() * width;
      const y = random() * height;
      const size = 18 + random() * 102;
      ice.save();
      ice.translate(x, y);
      ice.rotate(-0.61 + random() * 0.6);
      const points = [
        [-size, -size * 0.1], [-size * 0.37, -size * 0.35], [size * 0.45, -size * 0.21],
        [size, size * 0.10], [size * 0.21, size * 0.29], [-size * 0.41, size * 0.14],
      ];
      polygon(ice, points, i % 2 ? "#8cb6c00c" : "#05172430", "#a4d4dd10");
      line(ice, points.slice(0, 3), "#9ac4d622");
      ice.restore();
    }

    for (let i = -3; i < 13; i++) {
      ice.beginPath();
      for (let x = -20; x <= width + 20; x += 6) {
        const y = i * 49 + 31 * Math.sin(x / 118 + i * 0.18) + 15 * Math.sin(x / 61 + i * 0.27) + x * 0.18;
        if (x === -20) ice.moveTo(x, y);
        else ice.lineTo(x, y);
      }
      ice.strokeStyle = i % 3 === 0 ? "#a2d8e727" : "#a2d8e714";
      ice.lineWidth = 1;
      ice.stroke();
    }

    for (let i = 0; i < width * height / 210; i++) {
      const x = random() * width;
      const y = random() * height;
      const length = random() ** 6 * 15 + 0.5;
      ice.fillStyle = i % 2 ? "#8ec8d328" : "#05172561";
      ice.fillRect(x, y, length, length > 4 ? 1.2 : 0.7);
    }

    ice.strokeStyle = "#b2d1da37";
    ice.lineWidth = 1;
    ice.setLineDash([3, 6]);
    ice.strokeRect(9, 9, width - 18, height - 18);
    ice.setLineDash([]);
    for (let x = 48; x < width - 30; x += 46) {
      line(ice, [[x, 9], [x, 15]], "#a9d0de50");
      line(ice, [[x, height - 9], [x, height - 15]], "#a9d0de50");
    }
    for (let y = 47; y < height - 30; y += 46) {
      line(ice, [[9, y], [15, y]], "#a9d0de50");
      line(ice, [[width - 9, y], [width - 15, y]], "#a9d0de50");
    }
    for (const [x, y, dx, dy] of [[9, 9, 1, 1], [width - 9, 9, -1, 1], [9, height - 9, 1, -1], [width - 9, height - 9, -1, -1]]) {
      line(ice, [[x + 19 * dx, y], [x, y], [x, y + 19 * dy]], "#afd7e478", 2);
    }

    ice.save();
    ice.translate(width / 2, height / 2);
    circle(ice, 0, 0, 58, "#06182622", "#a5c7d82b");
    circle(ice, 0, 0, 41, null, "#a5c7d827");
    polygon(ice, [[-25, 0], [0, -25], [25, 0], [0, 25]], "#b2dcea14", "#a5c7d842");
    line(ice, [[-66, 0], [-51, 0]], "#a5c7d854", 2);
    line(ice, [[51, 0], [66, 0]], "#a5c7d854", 2);
    ice.fillStyle = "#afd2df74";
    ice.font = "600 9px Consolas, monospace";
    ice.textAlign = "center";
    ice.fillText("МАЯК 07", 0, 46);
    ice.restore();
  }

  function menuIllustration({width, height}) {
    const narrow = width / height < 1.12;
    const x = narrow ? width / 2 : width * 0.72;
    const y = narrow ? height * 0.22 : height * 0.49;
    const size = narrow ? 0.74 : 1;
    context.save();
    context.translate(x, y);
    context.scale(size, size);

    const glow = context.createRadialGradient(0, 0, 22, 0, 0, 240);
    glow.addColorStop(0, "#eac47c61");
    glow.addColorStop(0.43, "#c3b0681e");
    glow.addColorStop(1, "#f3cd7200");
    circle(context, 0, 0, 240, glow);
    for (const radius of [52, 88, 131, 174, 221]) {
      circle(context, 0, 0, radius, null, radius === 174 ? "#f2d39978" : "#d1e8e749");
    }
    context.setLineDash([3, 8]);
    circle(context, 0, 0, 197, null, "#d1e8e75d");
    context.setLineDash([]);
    for (let i = 0; i < 48; i++) {
      const angle = tau * i / 48;
      const inner = i % 12 === 0 ? 174 : 182;
      line(context, [[Math.cos(angle) * inner, Math.sin(angle) * inner], [Math.cos(angle) * 188, Math.sin(angle) * 188]],
        i % 12 === 0 ? "#fbd891c2" : "#d1e8e76b");
    }
    line(context, [[-236, 0], [236, 0]], "#e6f9fa35");
    line(context, [[0, -237], [0, 237]], "#e6f9fa35");
    polygon(context, [[0, 0], [65, -209], [132, -174]], "#ffd57d1c");
    line(context, [[0, 0], [101, -196]], "#ffd47990", 1.5);
    for (const [dx, dy, label] of [[105, -93, "01"], [143, 77, "02"], [-132, 83, "03"]]) {
      polygon(context, [[dx, dy - 5], [dx + 5, dy], [dx, dy + 5], [dx - 5, dy]], "#f6be7e", "#ffe5b2");
      context.fillStyle = "#ffe0a6";
      context.font = "11px Consolas, monospace";
      context.fillText(label, dx + 10, dy + 4);
    }

    context.save();
    context.rotate(Math.PI / 4);
    context.fillStyle = "#132b35";
    context.strokeStyle = "#ffdb9b";
    context.lineWidth = 2.5;
    context.fillRect(-33, -33, 66, 66);
    context.strokeRect(-33, -33, 66, 66);
    context.strokeStyle = "#94734c";
    context.lineWidth = 1;
    context.strokeRect(-26, -26, 52, 52);
    context.restore();
    polygon(context, [[0, -29], [8, -7], [22, 0], [8, 7], [0, 29], [-8, 7], [-22, 0], [-8, -7]], "#ffda91");
    circle(context, 0, 0, 4.5, "#fff4d7");

    if (!narrow) {
      context.fillStyle = "#d6e7eb";
      context.font = "600 11px Consolas, monospace";
      context.textAlign = "center";
      context.fillText("МАЯК · 07", 0, 258);
    }
    context.restore();
  }

  function paintEnemy(enemy) {
    const {x, y, radius, type, age, angle, hp, flash} = enemy;
    const colors = palette[type];
    if (age < 0.26) {
      circle(context, x, y, radius + 6 + (reducedMotion.matches ? 0 : 13 * (1 - age / 0.26)), null, colors.line, 1.4);
    }
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    if (age < 0.26) context.globalAlpha = 0.63;
    const edge = flash > 0 ? "#fff5dd" : colors.line;
    const fill = flash > 0 ? "#b4a0a2" : colors.fill;
    if (type === "dart") {
      const charging = age % 2.15 > 1.50;
      if (charging) line(context, [[-25, 0], [-13, 0]], "#ff8ac3a2", 3.5);
      polygon(context, [[13, 0], [-9, -9], [-5, 0], [-9, 9]], fill, edge, 1.7);
      line(context, [[-2, 0], [7, 0]], "#fff0f8", 1.6);
    } else if (type === "hauler") {
      polygon(context, [[20, 0], [11, 16], [-12, 16], [-20, 0], [-12, -16], [11, -16]], fill, edge, 2.1);
      line(context, [[-12, -12], [4, -12], [14, 0], [4, 12], [-12, 12]], "#bcb1ed", 1.2);
      polygon(context, [[5, 0], [-4, 6], [-11, 0], [-4, -6]], "#241c4a", edge, 1);
      circle(context, 7, 0, 3.4, "#e4dcff");
    } else {
      polygon(context, [[13, 0], [4, 11], [-9, 10], [-13, 0], [-9, -10], [4, -11]], fill, edge, 1.7);
      line(context, [[-7, -7], [-12, -13]], edge, 1.4);
      line(context, [[-7, 7], [-12, 13]], edge, 1.4);
      circle(context, 2, 0, 3, "#ffe1bd");
    }
    context.restore();
    if (type === "hauler") {
      context.fillStyle = "#100f26";
      context.fillRect(x - 13, y - 27, 26, 4);
      context.fillStyle = colors.line;
      context.fillRect(x - 13, y - 27, 26 * hp / 6, 3);
    }
  }

  function paintPlayer(player, elapsed) {
    const {x, y, angle, invulnerable, shot} = player;
    circle(context, x, y, 23, "#72dce51f", "#8cdce283");
    if (invulnerable > 0) {
      const radius = 28 + (reducedMotion.matches ? 0 : 3 * Math.sin(elapsed * 17));
      circle(context, x, y, radius, null, "#ffabafa9", 2);
    }
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    polygon(context, [[13, 0], [1, 8], [-10, 8], [-8, 0], [-10, -8], [1, -8]], "#9de8ea", "#e7fffb", 1.5);
    line(context, [[-8, -10], [-2, -13], [6, -9]], "#9de8ea", 2.7);
    line(context, [[-8, 10], [-2, 13], [6, 9]], "#9de8ea", 2.7);
    polygon(context, [[6, 0], [-1, 4], [-5, 0], [-1, -4]], "#175369");
    context.restore();
    if (player.aim !== undefined) {
      context.save();
      context.translate(x, y);
      context.rotate(player.aim);
      line(context, [[4, 0], [17, 0]], "#edf9ed", 2.6);
      if (shot > 0) polygon(context, [[17, -5], [28, 0], [17, 5], [20, 0]], "#ffdb83");
      context.restore();
    }
  }

  function paintEffects(effects) {
    if (reducedMotion.matches) return;
    for (const effect of effects) {
      const ratio = effect.life / effect.total;
      context.globalAlpha = ratio;
      if (effect.kind === "ring") {
        circle(context, effect.x, effect.y, effect.size * (1.05 - 0.55 * ratio), null, effect.color, 2.2);
      } else {
        line(context, [[effect.x, effect.y], [effect.x - effect.vx * 0.025, effect.y - effect.vy * 0.025]], effect.color, 2.1);
      }
    }
    context.globalAlpha = 1;
  }

  function draw(arena, round, phase, pointer) {
    const {width, height} = arena;
    context.setTransform(scale * density, 0, 0, scale * density, 0, 0);
    context.drawImage(terrain, 0, 0, width, height);
    if (phase === "menu") {
      menuIllustration(arena);
      return;
    }
    if (round.player.invulnerable > 0.83) {
      context.strokeStyle = "#ff9da8";
      context.globalAlpha = Math.min(0.9, (round.player.invulnerable - 0.83) * 3);
      context.lineWidth = 5;
      context.strokeRect(2, 2, width - 4, height - 4);
      context.globalAlpha = 1;
    }
    for (const enemy of round.enemies) paintEnemy(enemy);
    for (const bullet of round.projectiles) {
      line(context, [[bullet.x, bullet.y], [bullet.x - bullet.vx * 0.027, bullet.y - bullet.vy * 0.027]], "#ffcb6cab", 3.2);
      circle(context, bullet.x, bullet.y, bullet.radius, "#ffedb6");
    }
    paintEffects(round.effects);
    paintPlayer(round.player, round.elapsed);

    if (pointer) {
      const rect = canvas.getBoundingClientRect();
      const x = (pointer.x - rect.left) / scale;
      const y = (pointer.y - rect.top) / scale;
      const limit = Math.max(1, Math.hypot(pointer.dx, pointer.dy) / 41);
      circle(context, x, y, 41 / scale, "#0d223971", "#b1dce880", 1.1 / scale);
      circle(context, x, y, 2 / scale, "#dff8f9");
      circle(context, x + pointer.dx / limit / scale, y + pointer.dy / limit / scale, 16 / scale, "#80c8d96e", "#b6f3f4", 1.3 / scale);
    }
  }

  function resize(arena, rect, nextScale) {
    scale = nextScale;
    density = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(rect.width * density);
    canvas.height = Math.round(rect.height * density);
    background(arena);
  }

  return {draw, resize};
}
