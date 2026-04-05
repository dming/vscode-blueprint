# Blueprint Editor 5分钟体感测试清单

目标：用最短时间验证“能不能顺手用”，并快速定位交互问题。  
建议测试文件：`sample/main.bp.json`、`sample/multi-root-warning.bp.json`

## 0. 安装与打开（约30秒）

- [-] 通过 `Install from VSIX...` 安装最新 `vscode-blueprint-editor-*.vsix`
- [-] 打开 `sample/main.bp.json`，确认默认进入 Blueprint 视图
- [-] 命令面板能看到 Blueprint 相关命令（Build / Toggle / Open Config 等）

## 1. 基础画布体感（约1分钟）

- [-] 鼠标滚轮缩放自然，缩放中心跟随鼠标
- [-] `Alt + 拖拽`（或中键拖拽）平移顺滑，无明显卡顿
- [-] 框选多个节点后可整体拖动
- [-] 拖动节点时按 `Esc` 可回到拖动前位置

## 2. 节点编辑与选择（约1分钟）

- [-] 添加节点后会被选中，Inspector 可编辑 `Title / Inputs / Outputs`
- [-] 多选节点后 `Delete` 可一次删除
- [-] `Ctrl/Cmd + A` 全选、`Esc` 清空选择符合预期
- [-] 对齐与分布按钮执行后，节点位置结果直观

## 3. 连线交互体感（约1分钟）

- [-] 从输出 Pin 发起连线时出现预览线
- [-] 悬停输入 Pin 时，预览线终点会吸附到 Pin 中心
- [-] 悬停输入 Pin 时有可连接性反馈（可连=绿，不可连=红）
- [-] 点到非法目标时有瞬时红色反馈，且提示文本可理解
- [-] `Esc` 可取消连线中状态（不残留 pending）

## 4. 撤销/重做体验（约1分钟）

- [-] `Ctrl/Cmd + Z`、`Ctrl + Y` 或 `Ctrl/Cmd + Shift + Z` 可正常工作
- [-] 拖拽节点只占用 1 条历史（不会每帧都占一条）
- [-] Inspector 连续输入后，失焦再记录 1 条历史（不会逐字一条）
- [-] Undo/Redo 后没有异常高亮、残留连线状态

## 5. 快速回归（约30秒）

- [-] 点击 `Build` 后结果可返回，错误可在 Inspector 列表中定位
- [ ] 点击 Build Issue 能聚焦到对应节点/边
- [-] 关闭并重开同一 `.bp.json`，图数据保持一致

## 6. Root/Hint/Legend 轻量冒烟（约1分钟）

- [-] 在 `sample/main.bp.json` 右键一个“有入边”的节点，确认 `Set As Root Node` 菜单为禁用
- [-] 在 `sample/main.bp.json` 发起一个类型不匹配连线，确认出现本地化错误提示（zh/en）
- [-] 在 `sample/main.bp.json` 发起重复连线，确认出现“连线已存在 / Connection already exists.”
- [-] 在工具栏切换图例显示/隐藏，确认 `Tree Status Legend`/`树状态图例` 正常显示
- [ ] 打开 `sample/multi-root-warning.bp.json` 并执行 Build，确认：
  - 构建不失败（warning 不阻塞）
  - Build Issues 出现 multi-root warning
  - 额外 root 节点（非第一个 root）在画布上高亮

## 7. Event Dispatchers（约1分钟）

- [ ] 左栏 **Event Dispatchers** 可新增调度器，单击进入监听子图，**返回事件图** 可回到主图
- [ ] 监听图中选中 `Dispatcher Entry`，Inspector 可为载荷增加/改名/删除引脚（exec 不可删）
- [ ] 主图 `Broadcast Dispatcher` 在 Inspector 中选目标后，输入引脚与对应 Entry 的载荷同步
- [ ] 重命名调度器：显示名与技术 ID 均可改；改 ID 后 Broadcast/Bind/Clear 的引用随之更新
- [ ] `npm run test:build-validation` 通过；生成 TS 中 Broadcast 为 `await ctx.dispatchers...` 且含 `dispatcherListeners` 循环（若存在 Bind）

---

## 测试反馈模板（可直接复制）

```
测试时间：
VS Code 版本：
系统：

总体体感（1-5）：4

最顺手的3点：
1.连线交互体感
2.
3.

最影响体验的3点：
1.节点复制粘贴无效
2.连线无法删除
3.节点编辑的按钮，最好在画布左侧，还能允许滚动

复现步骤（如有问题）：
1.
2.
3.

期望行为：
实际行为：
```

## 本轮建议记录（可选）

```
Smoke run date:
Tested VSIX:
Tested files:
- sample/main.bp.json
- sample/multi-root-warning.bp.json

Pass:
- Root menu enable/disable
- Localized connection hints
- Legend toggle
- Multi-root warning + extra-root highlight

Notes:
- 
```

## Smoke Run Notes（持续记录）

每次准备发布前，建议先执行：

- [ ] `npm run verify:local`
- [ ] 手动按第 1-6 节完成冒烟

记录表（按时间倒序）：

| Date | VSIX Version | Scope | Result | Notes |
|---|---|---|---|---|
| 2026-03-29 | 2.0.1-24 | main + multi-root-warning | PARTIAL | 26 pass / 0 fail / 2 untested (Build issue focus, multi-root warning flow) |
