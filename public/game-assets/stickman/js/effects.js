function spawnSlideDust() {
  if (!player.onGround || player.slideBlend <= 0.45 || !state.running) return;

  const baseX = player.x - 18;
  const baseY = groundY - 4;

  const count = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x: baseX + (Math.random() * 10 - 5),
      y: baseY + (Math.random() * 6 - 3),
      vx: -1.2 - Math.random() * 2.0,
      vy: -0.3 - Math.random() * 1.0,
      size: 2 + Math.random() * 3.5,
      life: 1,
      decay: 0.03 + Math.random() * 0.02
    });
  }
}

function spawnSlideSparks() {
  if (!player.onGround || player.slideBlend <= 0.55 || !state.running) return;

  // 不要太多，偶尔蹦一下更像摩擦火花
  if (Math.random() > 0.35) return;

  const baseX = player.x + 8;
  const baseY = groundY - 2;

  const count = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    state.sparks.push({
      x: baseX + (Math.random() * 8 - 4),
      y: baseY + (Math.random() * 4 - 2),
      vx: -0.8 - Math.random() * 2.5,
      vy: -0.8 - Math.random() * 1.8,
      size: 1.5 + Math.random() * 1.8,
      life: 1,
      decay: 0.08 + Math.random() * 0.04
    });
  }
}

function spawnSkidMark() {
  if (!player.onGround || player.slideBlend <= 0.6 || !state.running) return;

  // 划痕不用每帧都加，不然太密
  if (Math.random() > 0.22) return;

  state.skidMarks.push({
    x: player.x - 6,
    y: groundY + 1,
    w: 10 + Math.random() * 10,
    h: 2 + Math.random() * 1.5,
    life: 1,
    decay: 0.035 + Math.random() * 0.015
  });
}
