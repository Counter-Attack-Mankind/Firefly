function loadHighScore() {
  try {
    const raw = Number.parseInt(localStorage.getItem(highScoreKey) || "0", 10);
    if (Number.isNaN(raw) || raw < 0) {
      return 0;
    }
    return raw;
  } catch {
    // Some browsers block storage access (privacy mode, etc.).
    return 0;
  }
}

function saveHighScore(score) {
  try {
    localStorage.setItem(highScoreKey, String(score));
  } catch (err) {
    console.warn("最高分保存失败:", err);
  }
}

