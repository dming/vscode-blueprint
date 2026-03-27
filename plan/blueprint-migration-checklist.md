# Blueprint Migration Checklist

目标：在当前 `vscode-blueprint-editor` 基础上，持续完善蓝图编辑器能力与工程质量。

## 0. 里程碑与策略

- [ ] 决定目标蓝图类型（执行流、数据流，或两者）
- [ ] 决定首个输出目标（仅保存 JSON、生成代码、或运行时解释）
- [ ] 确认兼容策略（是否需要导入旧行为树文件）
- [ ] 明确 MVP 范围（仅单图/单文件，还是含跨文件子图）

验收标准：
- 形成明确的 MVP 功能边界与非目标清单。

## 1. 文件格式与数据模型（最高优先级）

- [x] 新建蓝图文档 Schema（建议 `formatVersion`）
- [x] 定义核心实体：`Graph`、`Node`、`Pin`、`Edge`
- [ ] 定义节点类型元数据：标题、分类、输入输出 Pin、默认值、说明
- [ ] 定义变量系统：图变量、局部变量、常量节点
- [ ] 定义兼容/迁移字段：`legacy`、`metadata`、`extensions`

建议最小结构：

```json
{
  "formatVersion": 1,
  "graph": {
    "id": "main",
    "name": "Main",
    "nodes": [],
    "edges": [],
    "variables": []
  },
  "metadata": {}
}
```

验收标准：
- 能稳定序列化/反序列化。
- 能在不丢信息的情况下保存一个空蓝图和简单示例蓝图。

## 2. 扩展宿主层改造（复用为主）

- [x] 保留 `CustomEditorProvider` 主框架
- [x] 将文件识别从“行为树 JSON”改为“蓝图 JSON”（可加魔数字段判断）
- [x] 新增蓝图命令：新建蓝图、校验蓝图、构建蓝图
- [x] 调整设置项：从 `behavior3.*` 迁移到 `blueprint.*`（可兼容旧键）
- [x] 保留/重命名输出通道（日志、错误、构建结果）

涉及目录：
- `src/extension.ts`
- `src/treeEditorProvider.ts`
- `src/build/runBuild.ts`
- `src/settingResolver.ts`

验收标准：
- `.json` 或新扩展名文件可用蓝图编辑器打开。
- 命令面板可触发蓝图相关命令。

## 3. Webview 画布核心（重构重点）

- [x] 将树结构编辑逻辑替换为图结构编辑逻辑
- [x] 支持节点自由摆放（不再使用树布局）
- [x] 支持从 Pin 发起连线并连接到目标 Pin
- [x] 支持断线、重连、删除边
- [x] 保留撤销/重做，但改为图编辑命令粒度

重点文件：
- `webview/editor/components/graph.ts`（核心重构）
- `webview/editor/components/register-node.ts`
- `webview/editor/components/editor.tsx`
- `webview/editor/contexts/workspace-context.ts`

验收标准：
- 能完成“创建节点 -> 连线 -> 保存 -> 重开恢复”的闭环。

## 4. Inspector 与节点定义系统

- [x] Inspector 从“树节点字段”改为“节点+Pin+变量”编辑
- [x] 支持 Pin 类型与默认值编辑（如 `number/string/bool/exec`）
- [x] 新建节点定义文件（可沿用 `.b3-setting` 思路，建议改名）
- [ ] 支持节点搜索、分类、收藏（后两项可第二阶段）

涉及文件：
- `webview/editor/components/inspector.tsx`
- `webview/editor/contexts/setting-context.ts`
- `src/nodeDefIcons.ts`（可复用图标映射机制）

验收标准：
- 用户可在 Inspector 完整配置节点参数与 Pin 数据。

## 5. 语义校验与编译/导出

- [x] 新建蓝图校验器：类型匹配、必连 Pin、环路规则、入口规则
- [ ] 设计中间表示（IR），避免编辑数据结构直接耦合代码生成
- [ ] 支持至少一种导出目标（JSON IR 或代码）
- [x] 将错误定位回节点/边并在 UI 高亮

涉及文件：
- `src/build/runBuild.ts`
- `webview/shared/misc/b3util.ts`（建议拆分为 blueprint util）
- `sample/scripts/*`（替换为蓝图构建脚本示例）

验收标准：
- 构建命令可输出目标产物，并在错误时给出可定位提示。

## 6. 交互体验与工程质量

- [ ] 快捷键适配：复制/粘贴、删除、查找节点、聚焦节点
- [ ] 多选、框选、对齐、分组（可阶段性）
- [ ] 大图性能优化：局部重绘、节流、防抖
- [ ] i18n 文案补齐中英文
- [ ] 增加示例工程与最小模板

验收标准：
- 常用编辑操作流畅，且无明显输入延迟。

## 7. 兼容迁移与发布

- [ ] 提供行为树到蓝图的导入器（可选）
- [ ] 旧文件检测与提示（只读/转换）
- [ ] README 全量更新（功能、格式、命令、调试）
- [ ] 版本策略：2.x 兼容期或 3.0 破坏性升级

验收标准：
- 用户可明确知道旧项目如何升级与迁移。

## 8. 建议执行顺序（Sprint 视角）

Sprint 1（MVP 数据闭环）：
- [x] 完成新 Schema + 基础读写 + 节点自由摆放 + 连线 + 保存恢复

Sprint 2（可用编辑器）：
- [ ] Inspector、节点定义、基础校验、错误提示（进行中）

Sprint 3（可交付）：
- [ ] Build 导出、文档、示例、性能优化、发布准备

## 9. 当前仓库改造清单（逐目录）

- [x] `src/*`：扩展命令、文件识别、构建入口改造
- [x] `webview/editor/*`：画布和 Inspector 重构为蓝图语义
- [ ] `webview/shared/misc/*`：从 `b3*` 工具拆出 `blueprint*` 工具
- [ ] `sample/*`：替换为蓝图示例数据与脚本
- [ ] `README.md`：改为蓝图编辑器说明与开发指南

## 10. 可选增强（后续）

- [ ] 子图/函数图（Graph within Graph）
- [ ] 运行时调试（高亮执行路径）
- [ ] LSP 结合（表达式和变量智能提示）
- [ ] 插件化节点市场（第三方节点包）

