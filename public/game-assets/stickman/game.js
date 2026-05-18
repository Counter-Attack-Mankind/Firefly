// 游戏逻辑已按职责拆分到 js/ 目录，index.html 会按下面的顺序加载：
// 1. config.js   - DOM、常量、资源路径和全局资源对象
// 2. storage.js  - 最高分读取与保存
// 3. state.js    - 游戏状态、玩家、实体数组和背景对象
// 4. audio.js    - 音频解锁、音效播放
// 5. actions.js  - 重开、跳跃、护盾等玩家动作
// 6. spawners.js - 障碍、悬崖、金币、宠物、炮弹生成规则
// 7. effects.js  - 灰尘、火花、划痕粒子生成
// 8. update.js   - 主更新循环、碰撞、地形/生成安全检查
// 9. render.js   - 所有 Canvas 绘制
// 10. app.js     - 分数 HUD、头像遮罩、输入绑定、启动循环
