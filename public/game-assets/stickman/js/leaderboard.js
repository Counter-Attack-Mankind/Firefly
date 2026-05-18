const leaderboardListEl = document.getElementById("leaderboardList");
const leaderboardStatusEl = document.getElementById("leaderboardStatus");
const playerNameEl = document.getElementById("playerName");
const leaderboardNameKey = "stickman_runner_player_name_v1";
const leaderboardApi = "/api/stickman-leaderboard";

let leaderboardSubmittedForRun = false;

function sanitizePlayerName(name) {
  const cleaned = String(name || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 16);
  return cleaned || "路过的玩家";
}

function getPlayerName() {
  const name = sanitizePlayerName(playerNameEl?.value);
  if (playerNameEl) {
    playerNameEl.value = name;
  }
  localStorage.setItem(leaderboardNameKey, name);
  return name;
}

function setLeaderboardStatus(text) {
  if (leaderboardStatusEl) {
    leaderboardStatusEl.textContent = text || "";
  }
}

function renderLeaderboard(entries) {
  if (!leaderboardListEl) {
    return;
  }
  const topEntries = (entries || []).slice(0, 10);
  if (topEntries.length === 0) {
    leaderboardListEl.innerHTML = '<li class="leaderboard-empty">还没有分数，来拿第一个第一名。</li>';
    return;
  }
  leaderboardListEl.innerHTML = topEntries
    .map((entry, index) => {
      const name = sanitizePlayerName(entry.name);
      const score = Number(entry.score || 0).toLocaleString();
      return `<li><span class="leaderboard-row"><span class="leaderboard-rank">${index + 1}</span><span class="leaderboard-name">${name}</span><span class="leaderboard-score">${score}</span></span></li>`;
    })
    .join("");
}

async function loadLeaderboard() {
  try {
    const response = await fetch(leaderboardApi, { headers: { accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    renderLeaderboard(data.entries || []);
    setLeaderboardStatus("");
  } catch (_error) {
    renderLeaderboard([]);
    setLeaderboardStatus("排行榜服务暂未配置，分数会先保存在本机。");
  }
}

async function submitLeaderboardScore(score) {
  const finalScore = Math.floor(Number(score || 0));
  if (finalScore <= 0) {
    return;
  }
  setLeaderboardStatus("正在提交分数...");
  try {
    const response = await fetch(leaderboardApi, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        name: getPlayerName(),
        score: finalScore,
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    renderLeaderboard(data.entries || []);
    setLeaderboardStatus("分数已提交。");
  } catch (_error) {
    setLeaderboardStatus("提交失败：排行榜服务暂未配置或不可用。");
  }
}

function leaderboardResetRun() {
  leaderboardSubmittedForRun = false;
}

function leaderboardTrackGameOver() {
  if (!state.started || state.running || leaderboardSubmittedForRun || state.scoreSubmitted) {
    return;
  }
  leaderboardSubmittedForRun = true;
  state.scoreSubmitted = true;
  submitLeaderboardScore(state.score);
}

if (playerNameEl) {
  playerNameEl.value = sanitizePlayerName(localStorage.getItem(leaderboardNameKey) || "");
  playerNameEl.addEventListener("change", () => {
    localStorage.setItem(leaderboardNameKey, sanitizePlayerName(playerNameEl.value));
  });
}

loadLeaderboard();
