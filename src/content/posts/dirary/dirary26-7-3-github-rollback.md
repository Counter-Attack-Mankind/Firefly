---
title: GitHub 回滚操作指南
published: 2026-07-03
description: 记录 GitHub 与 Git 中常见回滚场景的处理方式，包括撤销未提交修改、回退提交、revert 安全回滚、reset 强制回滚和 reflog 救回误操作。
pinned: false
tags: [日记, GitHub, Git, 回滚]
category: 日记
draft: false
---

## 今天的主题

今天整理一下 GitHub 回滚相关的操作。

回滚这件事看起来只是“退回去”，但实际要先分清楚当前代码处在哪个阶段：是还没提交、已经提交但没推送，还是已经推送到 GitHub。不同阶段对应的安全做法不一样，不能一上来就 `reset --hard`。

这篇主要记录几种常见场景，方便以后出问题时快速对照。

## 1. 查看当前状态

回滚前先看工作区状态：

```bash
git status
```

再看最近提交记录：

```bash
git log --oneline
```

如果想看每次 HEAD 移动记录，可以用：

```bash
git reflog
```

`status` 用来看当前有没有未提交修改，`log` 用来看提交历史，`reflog` 用来在误操作之后找回之前的位置。

## 2. 撤销还没有提交的修改

如果文件只是改了，还没有 `git add`，可以撤销某个文件的修改：

```bash
git restore 文件名
```

例如：

```bash
git restore src/main.cpp
```

如果想撤销所有未暂存修改：

```bash
git restore .
```

这会直接丢弃工作区改动，执行前要确认这些改动不需要保留。

## 3. 撤销已经 add 但还没 commit 的修改

如果已经执行过：

```bash
git add .
```

但还没有提交，可以先把暂存区撤下来：

```bash
git restore --staged 文件名
```

撤下所有暂存文件：

```bash
git restore --staged .
```

注意，这一步只是取消暂存，不会删除文件内容。文件仍然保留在工作区里。

如果取消暂存后还想丢弃工作区修改，再执行：

```bash
git restore 文件名
```

## 4. 回退最后一次提交但保留代码

如果已经 `commit` 了，但还没有推送到 GitHub，并且想撤销这次提交，同时保留代码修改，可以使用：

```bash
git reset --soft HEAD~1
```

这会撤销最后一次提交，但代码仍然保留，并且修改还在暂存区。

如果想撤销提交，并把修改放回工作区而不是暂存区，可以用：

```bash
git reset --mixed HEAD~1
```

`--mixed` 是比较常用的回退方式：提交没了，但代码还在，可以重新检查、修改、再提交。

## 5. 彻底回退最后一次提交

如果最后一次提交和代码修改都不想要，可以使用：

```bash
git reset --hard HEAD~1
```

这会让当前分支回到上一个提交，并丢弃这次提交带来的代码变化。

这条命令比较危险，因为工作区修改会被清掉。执行前最好先确认：

```bash
git status
git log --oneline
```

如果不确定，先不要用 `--hard`。

## 6. 回退到指定提交

如果想回到某个指定提交，先查看提交记录：

```bash
git log --oneline
```

假设要回到提交 `abc1234`：

```bash
git reset --hard abc1234
```

这表示当前分支直接退回到 `abc1234` 这个版本。

如果这个提交还没有推送到远程，这样做通常只影响本地。但如果已经推送到 GitHub，就要谨慎，因为本地历史会和远程历史不一致。

## 7. 已经推送到 GitHub：优先使用 revert

如果错误提交已经推送到了 GitHub，尤其是别人可能已经拉取了这份代码，优先使用：

```bash
git revert 提交ID
```

例如：

```bash
git revert abc1234
```

`revert` 不会删除历史，而是新增一个“反向提交”，用新的提交抵消之前那次错误提交。

然后正常推送：

```bash
git push
```

这种方式最安全，适合公共分支，比如 `main`、`master`、团队协作分支。

## 8. 已经推送但必须强制回滚

如果确实要让 GitHub 上的分支也退回到某个旧版本，可以先本地回退：

```bash
git reset --hard abc1234
```

然后强制推送：

```bash
git push --force
```

更推荐使用相对安全一点的：

```bash
git push --force-with-lease
```

`--force-with-lease` 会在远程分支没有被别人更新的情况下才强制推送，可以减少覆盖别人提交的风险。

强制推送会改写 GitHub 上的提交历史。如果是多人协作分支，执行前一定要确认没有影响别人。

## 9. 误操作后的救命工具 reflog

如果不小心 `reset --hard` 错了，也不是完全没救。

可以查看 HEAD 的移动记录：

```bash
git reflog
```

输出中会看到类似：

```text
abc1234 HEAD@{0}: reset: moving to abc1234
def5678 HEAD@{1}: commit: add rollback guide
```

如果发现 `def5678` 才是想回去的位置，可以执行：

```bash
git reset --hard def5678
```

`reflog` 记录的是本地仓库 HEAD 的移动轨迹，所以它经常能救回误删的提交。

## 10. 常用场景速查

下面是一个简单对照：

```text
未 add，想撤销文件修改：
git restore 文件名

已 add，想取消暂存：
git restore --staged 文件名

已 commit，想撤销提交但保留代码：
git reset --mixed HEAD~1

已 commit，想彻底丢掉最后一次提交：
git reset --hard HEAD~1

已 push，想安全回滚：
git revert 提交ID

已 push，必须改写远程历史：
git reset --hard 提交ID
git push --force-with-lease

误操作后找回提交：
git reflog
git reset --hard 提交ID
```

## 写在最后

GitHub 回滚最重要的不是记住某一条命令，而是先判断场景。

如果只是本地文件写错了，用 `restore`；如果提交错了但还没推送，用 `reset`；如果已经推送到 GitHub，优先用 `revert`。只有在非常确定要改写历史时，才使用 `reset --hard` 加强制推送。

今天的关键词：Git、GitHub、restore、reset、revert、reflog、强制推送。
