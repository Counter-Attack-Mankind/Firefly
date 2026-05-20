const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");

const groundY = canvas.height - 72;
const playerGroundY = groundY - 4;
const gravity = 0.9;
const fastFallAccel = 1.85;
const jumpPower = -18;
const doubleJumpPower = -16.4;
const maxJumps = 2;
const shieldDurationMs = 5000;
const csyPowerupBonusMs = 2000;
const activeShieldPickupBonusMs = 500;
const coinBonus = 10;
const highScoreKey = "stickman_runner_highscore_v1";
const powerupWarningMs = 2000;
const secretChargeMax = 300;       //lsj技能金币数量
const shieldSkillChargeMax = 200;    //pdh技能金币数量
const doubleScoreSkillChargeMax = 200;  //js技能金币数量
const reviveSkillChargeMax = 400;  //wd技能金币数量
const ljwDashSkillChargeMax = 300;  //ljw技能金币数量
const doubleScoreDurationMs = 20000;
const wdReviveInvincibleMs = 2000;
const ljwLandingInvincibleMs = 1000;
const ljwDashDistance = 200;
const ljwDashSpeed = 15.8;
const ljwDashFlyY = groundY - 178;
const ljwDashClearRadius = 300;
const secretChargePerCoin = 1;
const secretRealmDistance = 100;
const secretCoinSpacing = 62;
const lowbarCliffMinDistance = 820;
const lowbarJumpMinDistance = 520;
const jumpObstacleMinDistance = 200;
const collectibleCliffPadding = 42;
const petCoinMagnetRadius = 190;
const petCoinMagnetSpeed = 0.28;
const ljwDashMagnetRadius = 360;
const ljwDashMagnetSpeed = 0.58;
const obstacleSpawnLeadMin = 300;
const obstacleSpawnLeadRange = 220;
const coinPreloadBuffer = 24;
const slideCoinSpacing = 46;
const jumpCoinArcChance = 0.7;
const betweenJumpCoinChance = 0.45;
const sceneSwitchEveryScore = 1000;   //场景变换距离
const sceneTunnelLeadScore = 120;
const sceneTunnelFadeScore = 95;
const sceneTunnelX = canvas.width - 170;
const sceneTunnelSpawnX = canvas.width + 80;
const sceneTunnelExitX = 12;
const sceneTunnelWidth = 150;
const sceneTunnelClearRadius = 260;
const sceneTunnelEnterDistance = canvas.width / 6;
const sceneExitSafeDistance = canvas.width / 2;
const sceneExitSafeScore = 120;
const sceneApproachSpeed = 5.2;
const sceneDarkenMs = 520;
const sceneBrightenMs = 700;
const playerRunX = canvas.width * 0.25;
const sceneOrder = [1, 0, 2]; // 城市 -> 沙漠 -> 故宫
const sceneThemes = [
  {
    id: "desert",
    name: "沙漠",
    obstacleType: "pillar",
    skyNightTop: [16, 14, 38],
    skyDayTop: [244, 180, 92],
    skyNightBottom: [45, 34, 58],
    skyDayBottom: [255, 236, 178],
    groundNight: [60, 43, 28],
    groundDay: [214, 166, 88],
    groundStrokeNight: [112, 76, 42],
    groundStrokeDay: [245, 205, 126]
  },
  {
    id: "city",
    name: "城市",
    obstacleType: "block",
    skyNightTop: [8, 16, 34],
    skyDayTop: [105, 178, 232],
    skyNightBottom: [24, 30, 48],
    skyDayBottom: [225, 238, 246],
    groundNight: [34, 37, 44],
    groundDay: [88, 92, 96],
    groundStrokeNight: [87, 92, 104],
    groundStrokeDay: [188, 193, 198]
  },
  {
    id: "maze",
    name: "故宫",
    obstacleType: "spike",
    skyNightTop: [16, 10, 24],
    skyDayTop: [190, 70, 56],
    skyNightBottom: [42, 22, 30],
    skyDayBottom: [255, 210, 144],
    groundNight: [42, 32, 32],
    groundDay: [128, 104, 82],
    groundStrokeNight: [92, 66, 48],
    groundStrokeDay: [208, 174, 112]
  },
  {
    id: "dream",
    name: "秘境",
    obstacleType: "block",
    skyNightTop: [24, 20, 66],
    skyDayTop: [166, 214, 255],
    skyNightBottom: [62, 42, 98],
    skyDayBottom: [255, 222, 246],
    groundNight: [58, 42, 92],
    groundDay: [152, 118, 208],
    groundStrokeNight: [122, 90, 184],
    groundStrokeDay: [224, 196, 255]
  }
];
const secretSceneIndex = sceneThemes.findIndex((theme) => theme.id === "dream");
const characterConfigs = {
  lsj: {
    id: "lsj",
    name: "LSJ",
    assetBase: "character/lsj",
    headSrc: "character/lsj/lsj.png",
    fallbackHeadSrc: "character_move/lsj.png",
    headCrop: { x: 0, y: 0, w: 1, h: 1, scale: 1, offsetY: 0 },
    skillType: "dream",
    skillName: "秘境能量",
    skillOrb: "秘",
    chargeMax: secretChargeMax,
    readyText: "按 E 释放秘境",
    chargingText: "收集金币充能",
    skillDescription: "收集金币充满能量后，按 E 进入无障碍秘境冲刺。",
    intro: "作者本人那还说啥了，选我就对了"
  },
  pdh: {
    id: "pdh",
    name: "PDH",
    assetBase: "character/pdh",
    headSrc: "character/pdh/pdh.png",
    fallbackHeadSrc: "character_move/pdh.png",
    shieldSkillImageSrc: "character/pdh/pdh_skill.png",
    fallbackShieldSkillImageSrc: "character_move/pdh_skill.png",
    headCrop: { x: 0, y: 0, w: 1, h: 1, scale: 1, offsetY: 5 },
    skillType: "shield",
    skillName: "护盾能量",
    skillOrb: "盾",
    chargeMax: shieldSkillChargeMax,
    readyText: "按 E 召唤护盾",
    chargingText: "收集金币充能",
    skillDescription: "收集金币充满能量后，按 E 召唤强化护盾抵御危险。",
    intro: "盾构不用多说"
  },
  js: {
    id: "js",
    name: "JS",
    assetBase: "character/js",
    headSrc: "character/js/js.png",
    fallbackHeadSrc: "character_move/js.png",
    headCrop: { x: 0.08, y: 0, w: 0.84, h: 0.74, scale: 1.08, offsetY: 6 },
    skillType: "doubleScore",
    skillName: "双倍能量",
    skillOrb: "双",
    chargeMax: doubleScoreSkillChargeMax,
    readyText: "按 E 双倍得分",
    chargingText: "收集金币充能",
    skillDescription: "收集金币充满能量后，按 E 开启 20 秒双倍得分。",
    intro: "我JS真的不爱钱"
  },
  wd: {
    id: "wd",
    name: "WD",
    assetBase: "character/wd",
    headSrc: "character/wd/wd.png",
    fallbackHeadSrc: "character_move/lsj.png",
    fanSkillImageSrc: "character/wd/skill.png",
    headCrop: { x: 0, y: 0, w: 1, h: 1, scale: 1, offsetY: 0 },
    skillType: "revive",
    skillName: "复活扇",
    skillOrb: "扇",
    chargeMax: reviveSkillChargeMax,
    readyText: "按 E 召唤扇子",
    chargingText: "收集金币充能",
    skillDescription: "按 E 召唤复活扇，抵挡一次致命伤害，但每次使用会消耗，金币与距离得分增幅递减，第5次后不再增加。",
    intro: "万事万物都有代价"
  },
  ljw: {
    id: "ljw",
    name: "LJW",
    assetBase: "character/ljw",
    headSrc: "character/ljw/ljw.png",
    fallbackHeadSrc: "character_move/lsj.png",
    headCrop: { x: 0, y: 0, w: 1, h: 1, scale: 1, offsetY: 0 },
    skillType: "dash",
    skillName: "飞行冲刺",
    skillOrb: "冲",
    chargeMax: ljwDashSkillChargeMax,
    readyText: "按 E 飞行冲刺",
    chargingText: "收集金币充能",
    skillDescription: "收集金币充满能量后，按 E 飞行冲刺 200m，期间无敌并撞碎下铲障碍。",
    intro: "我也有个超人梦"
  },
  csy: {
    id: "csy",
    name: "CSY",
    assetBase: "character/csy",
    headSrc: "character/csy/csy.png",
    fallbackHeadSrc: "character_move/lsj.png",
    headCrop: { x: 0, y: 0, w: 1, h: 1, scale: 1, offsetY: 0 },
    skillType: "passive",
    skillName: "异常体质",
    skillOrb: "异",
    chargeMax: 0,
    readyText: "被动能力",
    chargingText: "三段跳 / 强化道具",
    skillDescription: "无主动技能。天生拥有三段跳，护盾与磁铁持续时间比其他角色多 2 秒。",
    intro: "异于常人的能力者，周身持续散发微弱红色力场。"
  }
};

const headImage = new Image();
const cannonballs = [];
const rpgImage = new Image();
rpgImage.src = "character_move/RPG.png";
const rpgDrawWidth = 82;
const rpgDrawHeight = 52;
const rpgHitWidth = 60;
const rpgHitHeight = 32;

const petImage = new Image();
petImage.src = "character_move/pet.webp";

const coinImage = new Image();
coinImage.src = "character_move/coin.png";
const plusCoinImage = new Image();
plusCoinImage.src = "character/js/pluscoin.png";
const ljwFlyImage = new Image();
ljwFlyImage.src = "character/ljw/fly.png";
const ljwDashPetImage = new Image();
ljwDashPetImage.src = "character/ljw/pet.png";
const cactusImage = new Image();
cactusImage.src = "character_move/cactus.png";
const roadblocksImage = new Image();
roadblocksImage.src = "character_move/roadblocks.png";
const pdhSkillImage = new Image();
pdhSkillImage.src = characterConfigs.pdh.shieldSkillImageSrc;
const wdSkillImage = new Image();
wdSkillImage.src = characterConfigs.wd.fanSkillImageSrc;

const pets = [];
const petFollowDurationMs = 10000;
const petSpawnEveryScore = 200;
const petFollowOffsetX = -72;   // 宠物在主角左侧，保持更明显距离
const petFollowOffsetY = -58;   // 悬浮在玩家上后方
const petMaxWanderX = 46;       // 相对主人左右最大游走
const petMaxWanderY = 34;       // 相对主人上下最大游走

// 音频载入
const startAudio = new Audio("audio/begin.mp3");
startAudio.preload = "auto";
startAudio.volume = 0.6;
const shieldAudio = new Audio("audio/protect.mp3");
shieldAudio.preload = "auto";
shieldAudio.volume = 0.7;
const loseAudio = new Audio("audio/lose.mp3");
loseAudio.preload = "auto";
loseAudio.volume = 0.7;
const alarmAudio = new Audio("audio/alarm.mp3");
alarmAudio.preload = "auto";
alarmAudio.volume = 0.8;
const dreamAudio = new Audio("audio/dream.mp3");
dreamAudio.preload = "auto";
dreamAudio.volume = 0.72;
const bgmAudio = new Audio("audio/bgm.mp3");
bgmAudio.preload = "auto";
bgmAudio.loop = true;
bgmAudio.volume = 0.42;

//头像载入
headImage.src = characterConfigs.lsj.headSrc;

let audioCtx = null;
let audioUnlocked = false;
