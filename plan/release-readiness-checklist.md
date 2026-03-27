# Blueprint Editor Release Readiness Checklist

用于提交前和发布前的最终检查，默认目标是当前仓库的蓝图编辑器版本。

## 1) 功能冒烟测试

- [ ] 打开 `sample/blueprint/main.bp.json` 可进入 Blueprint Editor
- [ ] `Add Node` 可新增节点（模板可选）
- [ ] 节点可拖拽，位置变化可保存
- [ ] 输出 Pin 到输入 Pin 可连线
- [ ] 点击边可删除边
- [ ] 右侧 Inspector 可编辑 `title`、`inputs`、`outputs`
- [ ] `Build` 按钮可执行并生成 `*.compiled.json`
- [ ] 构建错误可在右侧 `Build Issues` 展示并可点击定位

## 2) 配置与命令一致性

- [ ] 命令 ID 均使用 `blueprint.*` 命名空间
- [ ] `package.json` 中无 `behavior3.*` command/config 残留
- [ ] 设置项仅包含 `blueprint.autoOpen` 与 `blueprint.nodeDefFile`
- [ ] Explorer 右键与标题栏菜单条件匹配 `*.bp.json`

## 3) 代码与资源清理

- [ ] 无行为树旧目录与旧实现残留（`behavior3/`、旧 `components/contexts`）
- [ ] `webview/shared/misc/` 仅保留当前需要的文件
- [ ] `public/` 下无未使用的旧图标/旧语言包
- [ ] `sample/` 下仅保留蓝图示例资源
- [ ] `.vscodeignore` 与当前项目结构一致

## 4) 构建与打包

- [ ] `npm run build` 成功
- [ ] `npm run package` 成功
- [ ] 产物为 `vscode-blueprint-editor-<version>.vsix`
- [ ] VSIX 安装后可正常打开蓝图文件

## 5) 文档一致性

- [ ] `README.md` 名称、命令、设置项均为 Blueprint 版本
- [ ] README 中示例路径与仓库真实路径一致
- [ ] 示例文件说明与实际字段结构一致（`formatVersion/graph/nodes/edges`）

## 6) Git 提交前检查

- [ ] `git status` 仅包含预期改动
- [ ] 无临时文件（调试日志、缓存、本地产物）被误提交
- [ ] 提交信息描述“为什么改”而非仅“改了什么”
- [ ] 如需 PR，包含测试步骤与风险说明

## 7) 可选增强（非阻塞发布）

- [ ] 构建错误定位后自动居中目标节点
- [ ] 节点模板面板支持收藏与最近使用
- [ ] Build Issues 支持按 `error/warning` 筛选
- [ ] 大图性能优化（局部渲染、批量更新节流）

