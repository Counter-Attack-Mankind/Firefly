function mixColor(c1, c2, t) {
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function getCurrentSceneTheme() {
  return sceneThemes[state.sceneIndex] || sceneThemes[0];
}

function drawSky() {
  const day = state.dayTime;
  const theme = getCurrentSceneTheme();
  const top = mixColor(theme.skyNightTop, theme.skyDayTop, day);
  const bottom = mixColor(theme.skyNightBottom, theme.skyDayBottom, day);

  const grad = ctx.createLinearGradient(0, 0, 0, groundY);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, groundY + 1);

  const nightOpacity = 1 - day;
  if (nightOpacity > 0.05) {
    for (const s of stars) {
      const twinkle = 0.5 + Math.sin(performance.now() * 0.002 + s.tw) * 0.5;
      ctx.fillStyle = `rgba(255,255,220,${(0.1 + twinkle * 0.6) * nightOpacity})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const sunX = 80 + state.dayTime * (canvas.width - 160);
  const sunY = 75 + Math.sin(state.dayTime * Math.PI) * 72;
  const moonX = canvas.width - sunX;
  const moonY = 90 + Math.sin(state.dayTime * Math.PI) * 70;

  ctx.fillStyle = `rgba(255, 230, 110, ${0.2 + day * 0.7})`;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(230, 235, 255, ${0.15 + (1 - day) * 0.75})`;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 17, 0, Math.PI * 2);
  ctx.fill();
}

function drawHillsAndTrees() {
  const theme = getCurrentSceneTheme();
  if (theme.id === "city") {
    drawCityBackdrops();
    return;
  }
  if (theme.id === "maze") {
    drawMazeBackdrops();
    return;
  }

  const day = state.dayTime;
  const hillColor = mixColor([60, 42, 30], [211, 161, 78], day);
  ctx.fillStyle = hillColor;
  for (const h of hills) {
    ctx.beginPath();
    ctx.ellipse(h.x + h.w / 2, groundY + 10, h.w / 2, h.h, 0, Math.PI, 0, true);
    ctx.fill();
  }

  const trunk = mixColor([72, 48, 28], [148, 96, 42], day);
  const leaf = mixColor([36, 80, 52], [76, 156, 82], day);
  for (const t of trees) {
    ctx.fillStyle = trunk;
    ctx.fillRect(t.x - 2, groundY - 10 - t.h, 4, t.h);
    ctx.fillStyle = leaf;
    ctx.beginPath();
    ctx.arc(t.x, groundY - 14 - t.h, 10, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFarMountains() {
  const theme = getCurrentSceneTheme();
  if (theme.id === "city") {
    drawCitySkyline();
    return;
  }
  if (theme.id === "maze") {
    drawMazeWalls();
    return;
  }

  const day = state.dayTime;
  // 远景颜色随昼夜变化更明显
  const fill1 = mixColor([54, 39, 32], [224, 173, 86], day);
  const fill2 = mixColor([38, 29, 26], [196, 136, 62], day);
  const outline = mixColor([92, 65, 45], [244, 196, 112], day);

  const baseY = groundY + 25;

  ctx.lineWidth = 1;
  for (let i = 0; i < farMountains.length; i += 1) {
    const m = farMountains[i];
    const useFill = i % 2 === 0 ? fill1 : fill2;
    ctx.fillStyle = useFill;
    ctx.strokeStyle = outline;
    ctx.globalAlpha = 0.85;

    const peak1 = baseY - m.h * (0.7 + (i % 3) * 0.08);
    const a = m.x;
    const b = m.x + m.w;

    ctx.beginPath();
    ctx.moveTo(a, baseY);
    ctx.lineTo(a + m.w * 0.25, peak1);
    ctx.lineTo(a + m.w * 0.55, peak1 - m.h * 0.15);
    ctx.lineTo(a + m.w * 0.85, peak1 - m.h * 0.05);
    ctx.lineTo(b, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawGround() {
  const day = state.dayTime;
  const theme = getCurrentSceneTheme();
  const groundColor = mixColor(theme.groundNight, theme.groundDay, day);
  const strokeColor = mixColor(theme.groundStrokeNight, theme.groundStrokeDay, day);

  const topY = groundY + 1;
  const groundH = canvas.height - groundY;

  const visibleCliffs = cliffs
    .filter((c) => c.x + c.w > 0 && c.x < canvas.width)
    .slice()
    .sort((a, b) => a.x - b.x);

  // 只在“有地面”的区域画地面；缺口保持天空，从而形成悬崖。
  ctx.fillStyle = groundColor;
  let cursor = 0;
  for (const c of visibleCliffs) {
    const gapStart = Math.max(0, c.x);
    const gapEnd = Math.min(canvas.width, c.x + c.w);
    if (gapEnd <= cursor) continue;

    if (gapStart > cursor) {
      ctx.fillRect(cursor, topY, gapStart - cursor, groundH);
    }

    cursor = Math.max(cursor, gapEnd);
  }
  if (cursor < canvas.width) {
    ctx.fillRect(cursor, topY, canvas.width - cursor, groundH);
  }

  // 悬崖内绘制火焰（醒目提示危险区域）
  const flameTime = performance.now() * 0.01;
  for (const c of visibleCliffs) {
    const gapStart = Math.max(0, c.x);
    const gapEnd = Math.min(canvas.width, c.x + c.w);
    const gapW = gapEnd - gapStart;
    if (gapW <= 6) continue;

    // 熔岩底色
    const lavaGrad = ctx.createLinearGradient(0, groundY + 2, 0, canvas.height);
    lavaGrad.addColorStop(0, "rgba(255, 120, 0, 0.85)");
    lavaGrad.addColorStop(0.55, "rgba(255, 70, 0, 0.9)");
    lavaGrad.addColorStop(1, "rgba(120, 15, 0, 0.95)");
    ctx.fillStyle = lavaGrad;
    ctx.fillRect(gapStart, groundY + 2, gapW, canvas.height - (groundY + 2));

    // 火焰舌头
    const flameCount = Math.max(4, Math.floor(gapW / 18));
    for (let i = 0; i < flameCount; i += 1) {
      const fx = gapStart + (i + 0.5) * (gapW / flameCount);
      const wave = Math.sin(flameTime + i * 0.9);
      const flameH = 14 + (wave * 0.5 + 0.5) * 18;
      const flameW = 6 + (Math.cos(flameTime * 0.9 + i) * 0.5 + 0.5) * 6;

      ctx.fillStyle = "rgba(255, 220, 80, 0.9)";
      ctx.beginPath();
      ctx.moveTo(fx, groundY + 1 - flameH);
      ctx.quadraticCurveTo(fx - flameW, groundY + 1 - flameH * 0.42, fx, groundY + 1);
      ctx.quadraticCurveTo(fx + flameW, groundY + 1 - flameH * 0.42, fx, groundY + 1 - flameH);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 120, 20, 0.88)";
      ctx.beginPath();
      ctx.moveTo(fx, groundY + 1 - flameH * 0.72);
      ctx.quadraticCurveTo(
        fx - flameW * 0.55,
        groundY + 1 - flameH * 0.28,
        fx,
        groundY + 1
      );
      ctx.quadraticCurveTo(
        fx + flameW * 0.55,
        groundY + 1 - flameH * 0.28,
        fx,
        groundY + 1 - flameH * 0.72
      );
      ctx.fill();
    }
  }

  // 地面纹理只在实地上画
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  const step = theme.id === "city" ? 44 : theme.id === "maze" ? 34 : 28;
  for (let x = 0; x < canvas.width; x += step) {
    const sampleX = x + 6;
    if (!isSolidGroundAt(sampleX)) continue;
    if (theme.id === "city") {
      ctx.beginPath();
      ctx.moveTo(x, groundY + 13);
      ctx.lineTo(x + 24, groundY + 13);
      ctx.stroke();
    } else if (theme.id === "maze") {
      ctx.strokeRect(x, groundY + 8, 22, 18);
    } else {
      ctx.beginPath();
      ctx.moveTo(x, groundY + 1);
      ctx.lineTo(x + 12, groundY + 11);
      ctx.stroke();
    }
  }
}

function drawCitySkyline() {
  const day = state.dayTime;
  const base = groundY + 15;
  const fill = mixColor([20, 25, 38], [108, 122, 136], day);
  const windowColor = `rgba(255, 226, 120, ${0.18 + (1 - day) * 0.5})`;

  ctx.fillStyle = fill;
  for (const m of farMountains) {
    const x = m.x;
    const w = Math.max(38, m.w * 0.28);
    const h = Math.max(58, m.h * 0.9);
    ctx.fillRect(x, base - h, w, h);
    ctx.fillStyle = windowColor;
    for (let wx = x + 8; wx < x + w - 6; wx += 16) {
      for (let wy = base - h + 12; wy < base - 12; wy += 18) {
        ctx.fillRect(wx, wy, 5, 7);
      }
    }
    ctx.fillStyle = fill;
  }
}

function drawCityBackdrops() {
  const day = state.dayTime;
  ctx.fillStyle = mixColor([26, 38, 52], [116, 136, 150], day);
  for (const h of hills) {
    ctx.fillRect(h.x, groundY - h.h * 0.8, h.w * 0.55, h.h * 0.8);
  }
}

function drawMazeWalls() {
  const day = state.dayTime;
  const wall = mixColor([70, 26, 24], [164, 48, 36], day);
  const roof = mixColor([58, 38, 20], [196, 132, 48], day);
  const roofDark = mixColor([34, 24, 18], [112, 72, 34], day);
  const gold = mixColor([138, 102, 38], [238, 194, 82], day);
  const base = groundY + 18;

  for (const m of farMountains) {
    const x = m.x;
    const w = Math.max(120, m.w * 0.62);
    const bodyH = Math.max(34, m.h * 0.32);
    const y = base - bodyH;

    ctx.fillStyle = wall;
    ctx.fillRect(x, y, w, bodyH);

    ctx.fillStyle = roofDark;
    ctx.beginPath();
    ctx.moveTo(x - 16, y);
    ctx.lineTo(x + w * 0.5, y - bodyH * 0.72);
    ctx.lineTo(x + w + 16, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 4);
    ctx.lineTo(x + w * 0.5, y - bodyH * 0.55);
    ctx.lineTo(x + w + 8, y - 4);
    ctx.lineTo(x + w - 18, y + 6);
    ctx.lineTo(x + 18, y + 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = gold;
    ctx.fillRect(x + 12, y + 10, w - 24, 4);
    for (let px = x + 18; px < x + w - 18; px += 24) {
      ctx.fillRect(px, y + 16, 6, bodyH - 18);
    }
  }
}

function drawMazeBackdrops() {
  const day = state.dayTime;
  const wall = mixColor([62, 22, 20], [150, 42, 32], day);
  const gate = mixColor([22, 18, 18], [74, 48, 34], day);
  const trim = mixColor([110, 74, 28], [224, 174, 70], day);

  ctx.fillStyle = wall;
  ctx.fillRect(0, groundY - 44, canvas.width, 44);
  ctx.fillStyle = trim;
  ctx.fillRect(0, groundY - 48, canvas.width, 5);

  for (const h of hills) {
    const gateW = Math.max(34, h.w * 0.2);
    ctx.fillStyle = gate;
    ctx.fillRect(h.x, groundY - 34, gateW, 34);
    ctx.fillStyle = trim;
    ctx.fillRect(h.x + 4, groundY - 38, gateW - 8, 4);
  }
}

function drawClouds() {
  const alpha = 0.2 + state.dayTime * 0.75;
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  for (const c of clouds) {
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.w * 0.45, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(c.x + 20, c.y - 8, c.w * 0.34, 14, 0, 0, Math.PI * 2);
    ctx.ellipse(c.x + 38, c.y, c.w * 0.39, 15, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLimb(startX, startY, angleDeg, upperLen, lowerLen, bendDeg) {
  const a = (angleDeg * Math.PI) / 180;
  const bx = startX + Math.cos(a) * upperLen;
  const by = startY + Math.sin(a) * upperLen;
  const b = ((angleDeg + bendDeg) * Math.PI) / 180;
  const ex = bx + Math.cos(b) * lowerLen;
  const ey = by + Math.sin(b) * lowerLen;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(bx, by);
  ctx.lineTo(ex, ey);
  ctx.stroke();
}

function drawPlayer() {
  const footY = player.y;
  const inAir = !player.onGround;
  const rising = player.vy < -1;
  const sliding = player.slideBlend > 0.45;
  const landSquash = player.landRecover * 4;

  const bodyStretch = inAir ? (rising ? -4 : 2) : landSquash;
  const bodyH = player.bodyHeight + bodyStretch;
  
  const pivotX = player.x + (inAir ? player.vy * -0.14 : 0);
  // 让“脚的最底端”更贴近地面顶部像素（地面在 groundY+1 开始绘制）
  const pivotY = footY + 1;

  ctx.save();
  ctx.translate(pivotX, pivotY);

  ctx.strokeStyle = "#000";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  let headPivotY = 0;
  let headRotation = 0; 

  if (sliding) {
    // --- 滑铲姿态优化 ---
    const slideT = Math.min(1, Math.max(0, player.slideBlend));
    const slideEase = slideT * slideT * (3 - 2 * slideT); // smoothstep
    // 滑铲：两手向后撑地（向左），两腿向右伸（向右）
    const torsoStartX = -6 - slideEase * 5;
    const torsoStartY = -14 + slideEase * 5;
    const torsoEndX = 22 + slideEase * 28;
    const torsoEndY = -28 + slideEase * 10;
    
    ctx.beginPath();
    ctx.moveTo(torsoStartX, torsoStartY);
    ctx.lineTo(torsoEndX, torsoEndY);
    ctx.stroke();

    headPivotY = torsoEndY;
    const headPivotX = torsoEndX;
    // 头部旋转：顺着滑动方向倾斜
    // Bind head tightly to the torso endpoint; avoid extra rotation to prevent
    // visible gap/shake during the slide.
    headRotation = 0;

    const shoulderX = torsoStartX;
    const shoulderY = torsoStartY;
    const hipX = torsoEndX;
    const hipY = torsoEndY;

    // 手（向后撑地）
    // angleDeg 在 90~180 会朝左且向下（sin>0），更贴合“撑地”效果
    const leftArmAngle = 165 - slideEase * 6;
    const leftElbowBend = 12 + slideEase * 6; // 确保第二段仍在 90~180，避免向上断开
    const rightArmAngle = 176 - slideEase * 4;
    // 保持第二段仍朝左下（避免超过 180 导致向上“打折”）
    const rightElbowBend = 4 + slideEase * 1;
    // 手短：上臂略短、前臂更短
    drawLimb(shoulderX, shoulderY, leftArmAngle, 16, 10, leftElbowBend);
    drawLimb(shoulderX, shoulderY, rightArmAngle, 14, 9, rightElbowBend);

    // 腿（向右伸滑铲）
    // angleDeg 在 0~90 会朝右且向下
    const leftLegAngle = 42 + slideEase * 10;
    const leftKneeBend = 18 - slideEase * 6; // 第二段仍保持 0~90 附近
    const rightLegAngle = 22 + slideEase * 8;
    const rightKneeBend = 24 - slideEase * 8;
    // 腿长：更好看且线段连接更明显
    drawLimb(hipX, hipY, leftLegAngle, 26, 18, leftKneeBend);
    drawLimb(hipX, hipY, rightLegAngle, 26, 18, rightKneeBend);

    ctx.translate(headPivotX, headPivotY);

  } else {
    // --- 奔跑/跳跃姿态优化 ---
    const neckY = -bodyH;
    const phase = player.runCycle;
    const stride = Math.sin(phase);
    const bounce = inAir ? 0 : Math.max(0, Math.sin(phase * 2)) * 2.2;
    const torsoLean = inAir ? 0 : 0.13 + Math.max(0, Math.cos(phase * 2)) * 0.025;
    ctx.translate(0, -bounce);
    ctx.rotate(torsoLean);

    const hipY = -bodyH * 0.36;
    const shoulderY = neckY + 21;
    headPivotY = neckY;

    // 躯干线段（受旋转影响）
    ctx.beginPath();
    ctx.moveTo(0, neckY);
    ctx.lineTo(0, hipY);
    ctx.stroke();

    const leftLegSignal = stride;
    const rightLegSignal = -stride;
    const leftArmSignal = -leftLegSignal;
    const rightArmSignal = -rightLegSignal;

    let leftArmAngle = 62 - leftArmSignal * 96;
    let rightArmAngle = 62 - rightArmSignal * 96;
    let leftElbowBend = leftArmSignal > 0 ? 54 : -16;
    let rightElbowBend = rightArmSignal > 0 ? 54 : -16;

    let leftLegAngle = 82 - leftLegSignal * 42;
    let rightLegAngle = 82 - rightLegSignal * 42;
    let leftKneeBend = leftLegSignal > 0 ? 48 + leftLegSignal * 8 : 30 + (-leftLegSignal) * 18;
    let rightKneeBend = rightLegSignal > 0 ? 48 + rightLegSignal * 8 : 30 + (-rightLegSignal) * 18;

if (inAir) {
  if (rising) {
    leftArmAngle = -132;
    rightArmAngle = -60;
    leftLegAngle = 120;
    rightLegAngle = 64;
    leftKneeBend = 28;
    rightKneeBend = 18;
    leftElbowBend = 24;
    rightElbowBend = 18;
  } else {
    leftArmAngle = -72;
    rightArmAngle = -128;
    leftLegAngle = 74;
    rightLegAngle = 116;
    leftKneeBend = 18;
    rightKneeBend = 18;
    leftElbowBend = 16;
    rightElbowBend = 16;
  }
}

// 手臂
drawLimb(0, shoulderY, leftArmAngle, 15, 12, leftElbowBend);
drawLimb(0, shoulderY, rightArmAngle, 15, 12, rightElbowBend);

// 腿：后腿先画，前腿后画，减少视觉重叠
const leftLegFront = leftLegSignal > rightLegSignal;

if (leftLegFront) {
  drawLimb(0, hipY, rightLegAngle, 19, 21, rightKneeBend); // 后腿
  drawLimb(0, hipY, leftLegAngle, 19, 21, leftKneeBend);   // 前腿
} else {
  drawLimb(0, hipY, leftLegAngle, 19, 21, leftKneeBend);   // 后腿
  drawLimb(0, hipY, rightLegAngle, 19, 21, rightKneeBend); // 前腿
}

    ctx.translate(0, headPivotY);
  }

  // 绘制头像
  const headSize = player.headSize;
  const half = headSize / 2;
  // Head anchor: apply the same translation for all states so the head stays
  // tightly connected to the torso line endpoint.
  ctx.translate(0, -half + 2);

  if (headRotation !== 0) {
    ctx.rotate(headRotation);
  }

  if (headMaskCanvas) {
    ctx.drawImage(headMaskCanvas, -half, -half, headSize, headSize);
  } else if (headImage.complete && headImage.naturalWidth > 0) {
    ctx.drawImage(headImage, -half, -half, headSize, headSize);
  } else {
    ctx.fillStyle = "#cccccc";
    ctx.fillRect(-half, -half, headSize, headSize);
  }

  // 护盾逻辑
  if (hasShield()) {
    const pulse = 0.8 + Math.sin(performance.now() * 0.015) * 0.18;
    ctx.strokeStyle = "rgba(0, 180, 255, 0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, headSize * (0.62 + pulse * 0.09), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}




function drawObstacleItem(obstacle) {
  if (obstacle.type === "lowbar") {
    drawConstructionBar(obstacle);
    return;
  }
  if (obstacle.type === "block") {
    drawRoadBarrier(obstacle);
    return;
  }
  if (obstacle.type === "pillar") {
    drawCactus(obstacle);
    return;
  }
  drawMetalSpikes(obstacle);
}

function drawConstructionBar(obstacle) {
  const x = obstacle.x;
  const bottomY = obstacle.y + obstacle.h;
  const beamH = Math.min(18, Math.max(12, obstacle.h * 0.1));
  const beamY = bottomY - beamH;

  ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
  ctx.fillRect(x + 6, beamY + beamH + 3, obstacle.w - 12, 4);

  ctx.fillStyle = "#4b3420";
  ctx.fillRect(x + 6, obstacle.y, 6, obstacle.h);
  ctx.fillRect(x + obstacle.w - 12, obstacle.y, 6, obstacle.h);

  ctx.fillStyle = "#f08a24";
  roundRect(x, beamY, obstacle.w, beamH, 4);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  roundRect(x, beamY, obstacle.w, beamH, 4);
  ctx.clip();
  ctx.strokeStyle = "#fff3c4";
  ctx.lineWidth = 7;
  for (let stripeX = x - obstacle.w; stripeX < x + obstacle.w * 1.8; stripeX += 26) {
    ctx.beginPath();
    ctx.moveTo(stripeX, beamY + beamH + 6);
    ctx.lineTo(stripeX + 22, beamY - 6);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = "#7a4319";
  ctx.lineWidth = 2;
  roundRect(x, beamY, obstacle.w, beamH, 4);
  ctx.stroke();
}

function drawRoadBarrier(obstacle) {
  const visualW = obstacle.w * 1.25;
  const visualH = obstacle.h * 1.25;
  const x = obstacle.x + obstacle.w / 2 - visualW / 2;
  const y = groundY + 1 - visualH;

  ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
  ctx.fillRect(x + visualW * 0.1, groundY + 2, visualW * 0.8, 5);

  if (roadblocksImage.complete && roadblocksImage.naturalWidth > 0) {
    ctx.drawImage(roadblocksImage, x, y, visualW, visualH);
    return;
  }

  ctx.fillStyle = "#f28b25";
  roundRect(x + visualW * 0.12, y + visualH * 0.08, visualW * 0.76, visualH * 0.86, 6);
  ctx.fill();
  ctx.strokeStyle = "#fff4cf";
  ctx.lineWidth = Math.max(6, visualW * 0.14);
  ctx.beginPath();
  ctx.moveTo(x + visualW * 0.22, y + visualH * 0.78);
  ctx.lineTo(x + visualW * 0.58, y + visualH * 0.2);
  ctx.moveTo(x + visualW * 0.46, y + visualH * 0.86);
  ctx.lineTo(x + visualW * 0.78, y + visualH * 0.32);
  ctx.stroke();
}

function drawCactus(obstacle) {
  const visualH = obstacle.h * 1.08;
  const visualW = visualH * 0.62;
  const x = obstacle.x + obstacle.w / 2 - visualW / 2;
  const y = groundY + 1 - visualH;

  ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
  ctx.fillRect(x + visualW * 0.08, groundY + 2, visualW * 0.84, 5);

  if (cactusImage.complete && cactusImage.naturalWidth > 0) {
    ctx.drawImage(cactusImage, x, y, visualW, visualH);
    return;
  }

  const cx = x + visualW * 0.5;
  const trunkW = visualW * 0.34;
  ctx.fillStyle = "#2f9b62";
  roundRect(cx - trunkW / 2, y + visualH * 0.08, trunkW, visualH * 0.84, trunkW * 0.5);
  ctx.fill();
  roundRect(x + visualW * 0.18, y + visualH * 0.35, trunkW * 0.75, visualH * 0.32, trunkW * 0.5);
  ctx.fill();
  roundRect(x + visualW * 0.62, y + visualH * 0.22, trunkW * 0.75, visualH * 0.36, trunkW * 0.5);
  ctx.fill();
}

function drawMetalSpikes(obstacle) {
  const count = Math.max(2, Math.round(obstacle.w / 18));
  const spikeW = obstacle.w / count;
  ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
  ctx.fillRect(obstacle.x - 3, groundY + 2, obstacle.w + 6, 5);

  for (let i = 0; i < count; i += 1) {
    const left = obstacle.x + i * spikeW;
    const right = left + spikeW;
    const mid = (left + right) * 0.5;
    const grad = ctx.createLinearGradient(left, obstacle.y, right, groundY);
    grad.addColorStop(0, "#f1f5f9");
    grad.addColorStop(0.55, "#8b97a8");
    grad.addColorStop(1, "#3d4654");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(left + 2, groundY + 1);
    ctx.lineTo(mid, obstacle.y);
    ctx.lineTo(right - 2, groundY + 1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#26313f";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function roundRect(x, y, w, h, r) {
  const radius = Math.min(r, Math.abs(w) * 0.5, Math.abs(h) * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawObstacles() {
  obstacles.forEach(drawObstacleItem);
}

function drawPowerups() {
  powerups.forEach((p) => {
    ctx.fillStyle = "rgba(45, 165, 255, 0.18)";
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w * 0.95, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#1b86d6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x + p.w / 2, p.y + 4);
    ctx.lineTo(p.x + p.w / 2, p.y + p.h - 4);
    ctx.moveTo(p.x + 4, p.y + p.h / 2);
    ctx.lineTo(p.x + p.w - 4, p.y + p.h / 2);
    ctx.stroke();
  });
}

function drawCoins() {
  coins.forEach((c) => {
    ctx.save();
    ctx.translate(c.x, c.y);
    const size = c.r * 2.35;
    if (coinImage.complete && coinImage.naturalWidth > 0) {
      ctx.drawImage(coinImage, -size / 2, -size / 2, size, size);
    } else {
      ctx.fillStyle = "#f6c632";
      ctx.beginPath();
      ctx.arc(0, 0, c.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#b47e05";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, c.r - 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  });
}

function drawPets() {
  pets.forEach((p) => {
    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);

    if (p.type === "pickup") {
      const pulse = 1 + Math.sin(performance.now() * 0.008 + p.x * 0.02) * 0.08;
      ctx.scale(pulse, pulse);

      ctx.fillStyle = "rgba(255, 230, 120, 0.18)";
      ctx.beginPath();
      ctx.arc(0, 0, p.w * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }

    if (petImage.complete && petImage.naturalWidth > 0) {
      ctx.drawImage(petImage, -p.w / 2, -p.h / 2, p.w, p.h);
    } else {
      const size = Math.min(p.w, p.h);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = Math.max(5, size * 0.16);
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.34, Math.PI * 0.18, Math.PI * 0.82, true);
      ctx.stroke();

      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = Math.max(3, size * 0.1);
      ctx.beginPath();
      ctx.moveTo(-size * 0.22, size * 0.2);
      ctx.lineTo(-size * 0.34, size * 0.34);
      ctx.moveTo(size * 0.22, size * 0.2);
      ctx.lineTo(size * 0.34, size * 0.34);
      ctx.stroke();

      ctx.fillStyle = "#0f172a";
      ctx.font = `bold ${Math.round(size * 0.34)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("N", -size * 0.26, size * 0.42);
      ctx.fillText("S", size * 0.26, size * 0.42);
    }

    // companion 微光
    if (p.type === "companion") {
      const alpha = 0.18 + 0.14 * Math.sin(performance.now() * 0.01);
      ctx.strokeStyle = `rgba(120, 220, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, p.w * 0.42, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  });
}
function drawCannonballs() {
  cannonballs.forEach(c => {
    if (c.warning) {
      // 红色闪烁预警线
      const blink = Math.sin(performance.now() * 0.02) > 0;
      if (blink) {
        ctx.strokeStyle = "rgba(255, 0, 0, 0.35)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, c.y);
        ctx.lineTo(canvas.width, c.y);
        ctx.stroke();
      }
      return;
    }

    const w = c.w || rpgDrawWidth;
    const h = c.h || rpgDrawHeight;

    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.shadowColor = "rgba(15, 23, 42, 0.28)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    if (rpgImage.complete && rpgImage.naturalWidth > 0) {
      ctx.drawImage(rpgImage, -w / 2, -h / 2, w, h);
    } else {
      const grad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
      grad.addColorStop(0, "#ef4444");
      grad.addColorStop(0.18, "#facc15");
      grad.addColorStop(0.68, "#e2e8f0");
      grad.addColorStop(1, "#f59e0b");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h * 0.28, w * 0.82, h * 0.56, h * 0.28);
      ctx.fill();
      ctx.fillStyle = "#92400e";
      ctx.beginPath();
      ctx.moveTo(w * 0.22, -h * 0.25);
      ctx.lineTo(w * 0.48, -h * 0.42);
      ctx.lineTo(w * 0.44, h * 0.42);
      ctx.lineTo(w * 0.22, h * 0.25);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  });
}

function drawDangerVignette() {
  let dangerAlpha = 0;

  // 只要有处于预警阶段的炮弹，就触发边缘红光
  for (const c of cannonballs) {
    if (!c.warning) continue;

    const elapsed = performance.now() - c.spawnTime;
    const t = Math.min(1, elapsed / 1000); // 1秒预警进度

    // 越接近发射，闪得越快、越亮
    const blinkSpeed = 0.02 + t * 0.08;
    const blink = 0.45 + 0.55 * Math.abs(Math.sin(performance.now() * blinkSpeed));
    const alpha = (0.06 + t * 0.22) * blink;

    if (alpha > dangerAlpha) dangerAlpha = alpha;
  }

  if (dangerAlpha <= 0.001) return;

  const w = canvas.width;
  const h = canvas.height;
  const edge = 90;

  // 上边
  let grad = ctx.createLinearGradient(0, 0, 0, edge);
  grad.addColorStop(0, `rgba(255,0,0,${dangerAlpha})`);
  grad.addColorStop(1, "rgba(255,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, edge);

  // 下边
  grad = ctx.createLinearGradient(0, h, 0, h - edge);
  grad.addColorStop(0, `rgba(255,0,0,${dangerAlpha})`);
  grad.addColorStop(1, "rgba(255,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, h - edge, w, edge);

  // 左边
  grad = ctx.createLinearGradient(0, 0, edge, 0);
  grad.addColorStop(0, `rgba(255,0,0,${dangerAlpha})`);
  grad.addColorStop(1, "rgba(255,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, edge, h);

  // 右边
  grad = ctx.createLinearGradient(w, 0, w - edge, 0);
  grad.addColorStop(0, `rgba(255,0,0,${dangerAlpha})`);
  grad.addColorStop(1, "rgba(255,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(w - edge, 0, edge, h);
}

function drawGameOver() {
  if (!state.started || state.running) {
    return;
  }
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 54px Microsoft YaHei";
  ctx.textAlign = "center";
  ctx.fillText("游戏结束", canvas.width / 2, canvas.height / 2 - 15);
  ctx.font = "26px Microsoft YaHei";
  ctx.fillText("按 R 重新开始", canvas.width / 2, canvas.height / 2 + 38);
}

function drawStartScreen() {
  if (state.started) {
    return;
  }
  ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "bold 48px Microsoft YaHei";
  ctx.fillText("火柴人 2D 跑酷", canvas.width / 2, canvas.height / 2 - 36);
  ctx.font = "26px Microsoft YaHei";
  ctx.fillText("按任意键或点击画面开始游戏", canvas.width / 2, canvas.height / 2 + 18);
  ctx.font = "18px Microsoft YaHei";
  ctx.fillText("空格 / ↑ 跳跃，↓ 下铲或速降，R 重新开始", canvas.width / 2, canvas.height / 2 + 58);
}

function drawPauseScreen() {
  if (!state.paused || !state.started || !state.running) {
    return;
  }
  ctx.fillStyle = "rgba(15, 23, 42, 0.34)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "bold 44px Microsoft YaHei";
  ctx.fillText("已暂停", canvas.width / 2, canvas.height / 2 - 10);
  ctx.font = "20px Microsoft YaHei";
  ctx.fillText("点击右下角播放按钮继续", canvas.width / 2, canvas.height / 2 + 36);
}

function drawSceneTransition() {
  if (state.sceneTunnelVisible) {
    const x = state.sceneTunnelX;
    const w = sceneTunnelWidth;
    const h = 185;
    const y = groundY + 1 - h;

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    ctx.fillRect(x + 10, groundY + 4, w - 20, 8);

    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, "#151515");
    grad.addColorStop(0.5, "#343434");
    grad.addColorStop(1, "#101010");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x, groundY + 1);
    ctx.lineTo(x, y + h * 0.45);
    ctx.quadraticCurveTo(x + w * 0.5, y - 42, x + w, y + h * 0.45);
    ctx.lineTo(x + w, groundY + 1);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#6f6f6f";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(x + 12, groundY + 1);
    ctx.lineTo(x + 12, y + h * 0.48);
    ctx.quadraticCurveTo(x + w * 0.5, y - 20, x + w - 12, y + h * 0.48);
    ctx.lineTo(x + w - 12, groundY + 1);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 225, 120, 0.38)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i += 1) {
      const inset = 28 + i * 18;
      ctx.beginPath();
      ctx.moveTo(x + inset, groundY);
      ctx.quadraticCurveTo(x + w * 0.5, y + 10 + i * 16, x + w - inset, groundY);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (state.sceneTransitionDarkness > 0.001) {
    ctx.fillStyle = `rgba(0, 0, 0, ${state.sceneTransitionDarkness})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function draw() {
  drawSky();
  drawClouds();
  drawFarMountains();
  drawHillsAndTrees();
  drawGround();
  drawObstacles();
  drawPowerups();
  drawCoins();
  drawCannonballs();
  drawDangerVignette();

// --- 地面划痕 ---
state.skidMarks.forEach(m => {
  ctx.fillStyle = `rgba(55, 55, 55, ${m.life * 0.28})`;
  ctx.fillRect(m.x, m.y, m.w, m.h);
});

// --- 灰尘拖尾 ---
state.particles.forEach(p => {
  ctx.fillStyle = `rgba(180, 180, 180, ${p.life * 0.6})`;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
  ctx.fill();
});

// --- 火花 ---
state.sparks.forEach(s => {
  ctx.strokeStyle = `rgba(255, 190, 60, ${s.life * 0.9})`;
  ctx.lineWidth = Math.max(1, s.size);
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(s.x - s.vx * 1.4, s.y - s.vy * 0.6);
  ctx.stroke();
});
  // ---------------------------------


  drawPlayer();
  drawPets();
  drawSceneTransition();
  drawPauseScreen();
  drawStartScreen();
  drawGameOver();
}

