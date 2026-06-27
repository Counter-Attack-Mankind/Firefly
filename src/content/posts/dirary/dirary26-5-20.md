---
title: 火柴人跑酷新增角色
published: 2026-05-20
description: 记录今天对火柴人跑酷小游戏的继续打磨：结算页面、角色系统、技能代价、磁铁表现、BGM 和移动端操作体验。
pinned: false
tags: [日记, 游戏开发]
category: 日记
draft: false
---

## 今天的主题

今天继续围绕火柴人跑酷小游戏做了一轮很密集的调整。

昨天更多是在把游戏基础体验补完整，今天则明显进入了“角色差异化”和“视觉表现打磨”的阶段。每个角色不再只是换一张头像，而是开始有自己的玩法节奏、技能代价和视觉识别。

## 版本视频记录

今天还留了 4 个版本视频，按从旧到新的顺序放在这里。以后回头看时，可以更直观地看到这个小游戏是怎么一点点变丰满的。

### 版本 1

<iframe src="https://player.bilibili.com/player.html?bvid=BV1eGLm6eEan&page=1&high_quality=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" style="width: 100%; aspect-ratio: 16 / 9; border-radius: 12px; margin: 0.75rem 0 0.5rem;"></iframe>

[在 B 站打开版本 1](https://www.bilibili.com/video/BV1eGLm6eEan/?vd_source=c7479589abf8957bed689bced4a49d56)

### 版本 2

<iframe src="https://player.bilibili.com/player.html?bvid=BV1vGLm6eEwU&page=1&high_quality=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" style="width: 100%; aspect-ratio: 16 / 9; border-radius: 12px; margin: 0.75rem 0 0.5rem;"></iframe>

[在 B 站打开版本 2](https://www.bilibili.com/video/BV1vGLm6eEwU/)

### 版本 3

<iframe src="https://player.bilibili.com/player.html?bvid=BV1RGLm6eEiF&page=1&high_quality=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" style="width: 100%; aspect-ratio: 16 / 9; border-radius: 12px; margin: 0.75rem 0 0.5rem;"></iframe>

[在 B 站打开版本 3](https://www.bilibili.com/video/BV1RGLm6eEiF/?vd_source=c7479589abf8957bed689bced4a49d56)

### 版本 4

<iframe src="https://player.bilibili.com/player.html?bvid=BV15GLm6eEmm&page=1&high_quality=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" style="width: 100%; aspect-ratio: 16 / 9; border-radius: 12px; margin: 0.75rem 0 0.5rem;"></iframe>

[在 B 站打开版本 4](https://www.bilibili.com/video/BV15GLm6eEmm/?vd_source=c7479589abf8957bed689bced4a49d56)

## 结算和选角

今天先完善了游戏结束后的结算流程。

游戏结束后会出现结算页面，显示玩家本局得分。如果分数还没有进入排行榜，就提示“再接再厉”，并告诉玩家距离第 10 名还差多少分；如果成功进入排行榜，就要求玩家输入名称，并记录排名。

后面又把选角界面从游戏画面下方独立出来，做成和游戏界面同尺寸的页面。现在流程更像一个完整游戏：

- 进入小游戏后先看到提示页面。
- 手机用户可以选择全屏模式，PC 用户可以忽略。
- 然后进入选角色页面。
- 选完角色后点击“进入游戏”。
- 游戏结束后再回到结算/选角流程。

选角页面也重新美化了一遍，每页最多显示 4 个角色，后续新增角色可以通过左右翻页切换。页面里有角色跑动模型预览、技能说明和简介，页码也放到了角色列表下方，显示得更明显。

## 新角色和技能

今天新增并完善了好几个角色。

### LJW

LJW 是今天变化比较大的角色。

他的技能是收集金币后按 `E` 触发飞行冲刺。冲刺期间：

- 使用 `fly.png` 作为飞行动画。
- 后方会有 `pet.png` 浮动跟随。
- 处于无敌状态。
- 会撞碎下铲障碍物。
- 可以吸引金币。
- 冲刺结束后落地，并清除自身周围 300px 范围内的危险物。
- 落地后额外获得 1 秒无敌调整时间，人物会闪烁。

这个角色现在更像一个用于穿越危险区的机动型角色。

### CSY

今天还新增了 CSY。

CSY 没有主动技能，但有异于常人的被动能力：

- 三段跳。
- 护盾持续时间比其他角色多 2 秒。
- 磁铁持续时间比其他角色多 2 秒。
- 人物周围有红色火焰气场。

一开始 CSY 的头像显示不正常，后来发现是路径大小写问题。修正为 `character/csy/csy.png` 后，又取消了对头像的额外预处理，让它和其他角色一样正常加载。

### WD

WD 的技能也重新设计了代价。

原本复活扇是一局只能释放一次，后来改成可以重复释放。但为了平衡强度，每释放一次复活扇，金币得分和距离得分都会降低：

- 第 0 次：100%
- 第 1 次：80%
- 第 2 次：55%
- 第 3 次：32%
- 第 4 次：15%
- 第 5 次及以后：基本停止增长

这样 WD 可以不断用复活扇保命，但代价是分数成长越来越慢。

### JS

JS 的技能时间也增强了。

双倍得分从 10 秒改成 20 秒。技能期间金币贴图会替换成 `pluscoin.png`，右上角分数也会变成红色高亮，用来和普通得分状态区分。

## 磁铁效果

今天对磁铁机制改了好几版。

最开始磁铁是一个跟随人物的图像，后来觉得太像普通宠物，不够像吸金币能力，于是取消了跟随图像，改为人物周边的电磁效果。

中间尝试过多层圆环和波纹，但视觉上有点像护盾，和护盾特效重复。最后改成更简约的外置电磁节点和连线效果：特效在人物外侧，不遮挡人物本体，同时能看出金币被吸引的状态。

LJW 在飞行冲刺期间也加强了吸金币能力，吸引半径和拉力都比普通磁铁更强，避免飞在空中时吸不到地面金币。

## 音乐和移动端

今天加入了背景音乐。

进入游戏后会播放 `bgm.mp3`，播放完后自动循环。每一局开始时会从头播放，游戏结束后暂停。

移动端操作也继续打磨了按钮大小和误触逻辑。手机端全屏由全屏按钮负责，手机端按钮本身只负责生成跳跃、下铲、技能等操作按钮。这样职责更清晰，也减少了全屏和控制按钮互相影响的问题。

## 写在最后

今天的修改让这个小游戏越来越像一个“角色驱动”的跑酷游戏。

LSJ、PDH、JS、WD、LJW、CSY 开始有了不同的性格：有人冲分，有人保命，有人飞行，有人靠被动能力突破操作上限。它不再只是一个火柴人在跑，而是慢慢变成了一组有差异、有代价、有视觉标签的角色系统。

今天的关键词：结算、选角、LJW、CSY、WD、磁铁、BGM、技能代价。
