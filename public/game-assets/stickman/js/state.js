const state = {
  started: false,
  running: false,
  paused: false,
  speed: 6.6,
  prevSpeed: 6.6,
  score: 0,
  highScore: loadHighScore(),
  obstacleTimer: 0,
  obstacleInterval: 1060,
  powerupTimer: 0,
  powerupInterval: 8200,
  coinTimer: 0,
  coinInterval: 900,
  shieldUntil: 0,
  shieldHits: 0,
  dayTime: 0.12,
  dayDirection: 1,
  lastTime: 0,
  downPressed: false,
  sceneIndex: 0,
  nextSceneScore: sceneSwitchEveryScore,
  nextSceneIndex: 1,
  lastSceneSwitchScore: -sceneTunnelFadeScore,
  sceneTransitionPhase: "none",
  sceneTransitionTimer: 0,
  sceneWorldFrozen: false,
  sceneTransitionDarkness: 0,
  sceneTunnelVisible: false,
  sceneTunnelX: sceneTunnelSpawnX,
  sceneExitSafeUntil: 0,
  cliffTimer: 0,
  cliffInterval: 7800,
  particles: [],
  sparks: [],
  skidMarks: [],
  cannonTimer: 0,
  cannonInterval: 14000,
  cannonCountUnder1000: 0,
  nextCannonHigh: false,
  nextPetScore: petSpawnEveryScore,
  scoreSubmitted: false,
  lockReleasedForRun: false

};

const player = {
  x: playerRunX,
  y: playerGroundY,
  vy: 0,
  onGround: true,
  jumpsUsed: 0,
  bodyHeight: 72,
  headSize: 50,
  runCycle: 0,
  landRecover: 0,
  slideBlend: 0
};

const obstacles = [];
const cliffs = [];
const powerups = [];
const coins = [];
const clouds = Array.from({ length: 7 }, (_, i) => ({
  x: 80 + i * 150 + Math.random() * 90,
  y: 35 + Math.random() * 110,
  w: 48 + Math.random() * 42,
  s: 0.25 + Math.random() * 0.55
}));
const stars = Array.from({ length: 50 }, () => ({
  x: Math.random() * canvas.width,
  y: 16 + Math.random() * (groundY - 160),
  r: 0.7 + Math.random() * 1.6,
  tw: Math.random() * Math.PI * 2
}));
const hills = Array.from({ length: 6 }, (_, i) => ({
  x: i * 210,
  w: 180 + Math.random() * 120,
  h: 40 + Math.random() * 48
}));

const farMountains = Array.from({ length: 7 }, (_, i) => ({
  x: i * 260 + Math.random() * 140,
  w: 240 + Math.random() * 180,
  h: 70 + Math.random() * 90,
  // 每座山的视差速度略不同，增加层次
  p: 0.14 + Math.random() * 0.18
}));
const trees = Array.from({ length: 8 }, (_, i) => ({
  x: i * 145 + Math.random() * 50,
  h: 20 + Math.random() * 34
}));

