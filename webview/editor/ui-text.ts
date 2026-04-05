export type UiLocale = "zh-CN" | "en";

export const UI_TEXT = {
  connectionSourceOrTargetNodeMissing: {
    "zh-CN": "源节点或目标节点不存在。",
    en: "Source or target node does not exist.",
  },
  connectionSourceOrTargetPinMissing: {
    "zh-CN": "源 Pin 或目标 Pin 不存在。",
    en: "Source or target pin does not exist.",
  },
  connectionPinTypeMismatch: {
    "zh-CN": "Pin 类型不匹配：{from} -> {to}。",
    en: "Pin type mismatch: {from} -> {to}.",
  },
  connectionAlreadyExists: {
    "zh-CN": "连线已存在。",
    en: "Connection already exists.",
  },
  connectionExecInputAlreadyConnected: {
    "zh-CN": "Exec 输入 '{nodeId}.{pinName}' 已有一条输入连线。",
    en: "Exec input '{nodeId}.{pinName}' already has an incoming edge.",
  },
  connectionReplaceIncomingTitle: {
    "zh-CN": "替换已有连线？",
    en: "Replace existing connection?",
  },
  connectionReplaceIncomingBody: {
    "zh-CN": "输入「{target}」已由「{existing}」接入。是否断开该连线并改为从「{incoming}」接入？",
    en: 'Input "{target}" is already linked from "{existing}". Remove that link and connect from "{incoming}" instead?',
  },
  connectionReplaceIncomingOk: {
    "zh-CN": "替换",
    en: "Replace",
  },
  rootNodeNotEligible: {
    "zh-CN": "只有树的根节点（没有入边）才能设置为全局 Root。",
    en: "Only a tree root node (without incoming links) can be set as root.",
  },
  setAsRootNode: {
    "zh-CN": "设为 Root 节点",
    en: "Set As Root Node",
  },
  showLegend: {
    "zh-CN": "显示图例",
    en: "Show Legend",
  },
  hideLegend: {
    "zh-CN": "隐藏图例",
    en: "Hide Legend",
  },
  legendTitle: {
    "zh-CN": "树状态图例",
    en: "Tree Status Legend",
  },
  legendRoot: {
    "zh-CN": "基类生命周期事件（蓝）",
    en: "Base class lifecycle event (blue)",
  },
  legendLegal: {
    "zh-CN": "合法树节点",
    en: "Legal Tree Node",
  },
  legendIllegal: {
    "zh-CN": "非法树节点",
    en: "Illegal Tree Node",
  },
  myBlueprintTitle: {
    "zh-CN": "我的蓝图",
    en: "My Blueprint",
  },
  myBlueprintSectionGraphs: {
    "zh-CN": "图表",
    en: "Graphs",
  },
  myBlueprintSectionEventGraphs: {
    "zh-CN": "事件图表",
    en: "Event Graphs",
  },
  myBlueprintSectionFunctions: {
    "zh-CN": "函数",
    en: "Functions",
  },
  myBlueprintSectionVariables: {
    "zh-CN": "变量",
    en: "Variables",
  },
  myBlueprintSectionDispatchers: {
    "zh-CN": "事件分发器",
    en: "Event Dispatchers",
  },
  myBlueprintEmptyFunctions: {
    "zh-CN": "暂无函数",
    en: "No functions yet",
  },
  myBlueprintEmptyDispatchers: {
    "zh-CN": "暂无事件分发器",
    en: "No event dispatchers yet",
  },
  myBlueprintLifecycleEmpty: {
    "zh-CN": "无生命周期事件。",
    en: "No lifecycle events.",
  },
  myBlueprintLifecyclePickBase: {
    "zh-CN": "请先在右侧 Inspector 中选择继承的基础类；再用「+」从声明的事件中选择并加入事件图表。",
    en: "Pick an inherited base class in the Inspector first, then use + to add lifecycle events from that class to the event graph.",
  },
  myBlueprintLifecycleUnknownBase: {
    "zh-CN": "配置中未找到基础类「{name}」。",
    en: 'Base class "{name}" is not defined in blueprint.config.json.',
  },
  myBlueprintLifecycleNoHooks: {
    "zh-CN": "基础类「{name}」在配置中未声明 lifecycle，无法从「+」添加。",
    en: 'Base class "{name}" declares no lifecycle hooks in config; nothing to add via +.',
  },
  myBlueprintLifecycleUsePlusToAdd: {
    "zh-CN":
      "请点击「+」，在下拉列表中选择要加入事件图表的生命周期；画布上会添加对应的事件起点节点。",
    en: "Click + and pick a lifecycle to add to the event graph. An Event Start node is created on the canvas.",
  },
  myBlueprintLifecycleAllAdded: {
    "zh-CN": "基础类声明的生命周期均已加入事件图表。",
    en: "All lifecycle hooks from the base class are already in the event graph.",
  },
  myBlueprintAddLifecycleNeedBase: {
    "zh-CN": "请先在 Inspector 中选择继承的基础类。",
    en: "Pick an inherited base class in the Inspector first.",
  },
  myBlueprintAddLifecycleTooltip: {
    "zh-CN": "从下拉列表选择要添加的生命周期事件",
    en: "Pick a lifecycle event from the menu to add",
  },
  myBlueprintAddLifecycleAria: {
    "zh-CN": "添加生命周期事件",
    en: "Add lifecycle event",
  },
  lifecycleAddDuplicateTitle: {
    "zh-CN": "已添加",
    en: "Already added",
  },
  lifecycleAddDuplicateBody: {
    "zh-CN": "「{name}」已在事件图表中。",
    en: '"{name}" is already in the event graph.',
  },
  lifecycleAddInvalidTitle: {
    "zh-CN": "无效的生命周期",
    en: "Invalid lifecycle",
  },
  lifecycleAddInvalidBody: {
    "zh-CN": "「{name}」不在当前基础类的 lifecycle 声明中。",
    en: '"{name}" is not declared on the current base class lifecycle list.',
  },
  canvasEditingMainGraph: {
    "zh-CN": "事件图（主图）",
    en: "Event graph (main)",
  },
  myBlueprintAddFunctionTooltip: {
    "zh-CN": "新建函数图",
    en: "Create function graph",
  },
  functionContextRename: {
    "zh-CN": "重命名…",
    en: "Rename…",
  },
  functionContextDelete: {
    "zh-CN": "删除函数",
    en: "Delete function",
  },
  functionContextMenuAria: {
    "zh-CN": "函数操作菜单",
    en: "Function actions",
  },
  functionRenameModalTitle: {
    "zh-CN": "重命名函数",
    en: "Rename function",
  },
  functionRenamePlaceholder: {
    "zh-CN": "显示名称",
    en: "Display name",
  },
  functionRenameOk: {
    "zh-CN": "保存",
    en: "Save",
  },
  functionCancel: {
    "zh-CN": "取消",
    en: "Cancel",
  },
  functionDeleteConfirmTitle: {
    "zh-CN": "删除函数？",
    en: "Delete function?",
  },
  functionDeleteConfirmContent: {
    "zh-CN": "将删除函数「{name}」及其图。主图中对该函数的调用目标会被清空。",
    en: 'Delete function "{name}" and its graph. Invoke nodes targeting it will be cleared.',
  },
  functionDeleteOk: {
    "zh-CN": "删除",
    en: "Delete",
  },
  dispatcherDeleteConfirmTitle: {
    "zh-CN": "删除事件调度器？",
    en: "Delete event dispatcher?",
  },
  dispatcherDeleteConfirmContent: {
    "zh-CN": "将删除「{name}」及其监听图，并清除主图/函数图中对该调度器的广播/绑定/清除节点引用。",
    en: 'Remove "{name}" and its listener graph, and clear nodes that target it (broadcast, bind, clear).',
  },
  dispatcherDeleteOk: {
    "zh-CN": "删除",
    en: "Delete",
  },
  dispatcherRenameModalTitle: {
    "zh-CN": "重命名事件调度器",
    en: "Rename event dispatcher",
  },
  dispatcherRenamePlaceholder: {
    "zh-CN": "显示名称",
    en: "Display name",
  },
  dispatcherTechnicalIdLabel: {
    "zh-CN": "技术 ID（用于生成代码与引用）",
    en: "Technical id (code / references)",
  },
  dispatcherTechnicalIdPlaceholder: {
    "zh-CN": "例如 disp_health",
    en: "e.g. disp_health",
  },
  dispatcherRenameIdConflictTitle: {
    "zh-CN": "无法使用该 ID",
    en: "Cannot use this id",
  },
  dispatcherRenameIdConflictBody: {
    "zh-CN": "该 ID 已被其他函数或调度器使用，或格式无效。",
    en: "This id is already used by another function or dispatcher, or is invalid.",
  },
  dispatcherEntryAddPayloadPin: {
    "zh-CN": "添加负载引脚",
    en: "Add payload pin",
  },
  dispatcherEntryRemovePayloadPin: {
    "zh-CN": "删除",
    en: "Remove",
  },
  functionEntryAddPayloadPin: {
    "zh-CN": "添加输入参数引脚",
    en: "Add input parameter pin",
  },
  functionEntryRemovePayloadPin: {
    "zh-CN": "删除",
    en: "Remove",
  },
  functionReturnAddPayloadPin: {
    "zh-CN": "添加返回值引脚",
    en: "Add return value pin",
  },
  functionReturnRemovePayloadPin: {
    "zh-CN": "删除",
    en: "Remove",
  },
  functionRowDragInvokeHint: {
    "zh-CN": "拖到画布以插入「调用函数」节点",
    en: "Drag onto the canvas to add an Invoke Function node",
  },
  invokeFunctionTargetLabel: {
    "zh-CN": "调用的函数",
    en: "Call target",
  },
  invokeFunctionTargetPlaceholder: {
    "zh-CN": "选择 functions 中的一项",
    en: "Pick a function from the document",
  },
  invokeNodeCanvasNoFunction: {
    "zh-CN": "未选择函数",
    en: "No function selected",
  },
  bindDispatcherNodeCanvasNoTarget: {
    "zh-CN": "未选择调度器 / 函数",
    en: "No dispatcher / function selected",
  },
  broadcastDispatcherNodeCanvasNoDispatcher: {
    "zh-CN": "未选择调度器",
    en: "No dispatcher selected",
  },
  clearDispatcherNodeCanvasNoDispatcher: {
    "zh-CN": "未选择调度器",
    en: "No dispatcher selected",
  },
  globalEventNodeCanvasNoChannel: {
    "zh-CN": "未选择通道",
    en: "No channel selected",
  },
  broadcastDispatcherTargetLabel: {
    "zh-CN": "广播目标调度器",
    en: "Broadcast dispatcher",
  },
  broadcastDispatcherTargetPlaceholder: {
    "zh-CN": "选择 dispatchers 中的一项",
    en: "Pick a dispatcher from the document",
  },
  globalEventChannelLabel: {
    "zh-CN": "全局事件通道",
    en: "Global event channel",
  },
  globalEventChannelPlaceholder: {
    "zh-CN": "选择 globalEventChannels 中的一项",
    en: "Pick a channel from blueprint.config.json",
  },
  inspectorEditingDispatcher: {
    "zh-CN": "正在编辑事件调度器「{name}」。可点左侧「返回事件图」回到主事件图。",
    en: 'Editing event dispatcher "{name}". Use “Back to event graph” to return to the main graph.',
  },
  myBlueprintDispatchersLater: {
    "zh-CN": "事件分发器将在后续版本支持。",
    en: "Event dispatchers will be supported in a future version.",
  },
  myBlueprintAddFunctionAria: {
    "zh-CN": "添加函数",
    en: "Add function",
  },
  myBlueprintAddVariableAria: {
    "zh-CN": "添加变量",
    en: "Add variable",
  },
  myBlueprintAddDispatcherAria: {
    "zh-CN": "添加事件调度器",
    en: "Add event dispatcher",
  },
  myBlueprintRemoveVariableAria: {
    "zh-CN": "删除变量",
    en: "Remove variable",
  },
  inspectorDocumentSection: {
    "zh-CN": "文档",
    en: "Document",
  },
  inheritsLabel: {
    "zh-CN": "继承基础类",
    en: "Inherits",
  },
  inheritsPlaceholder: {
    "zh-CN": "选择基础类（来自 blueprint.config.json）",
    en: "Select base class (from blueprint.config.json)",
  },
  inheritsChangeWarnTitle: {
    "zh-CN": "更改继承基类",
    en: "Change inherited base class",
  },
  inheritsChangeWarnBody: {
    "zh-CN": "当前已继承「{current}」。更改基类会影响生命周期钩子等。确定要重新选择吗？",
    en: 'This blueprint already inherits "{current}". Changing the base can affect lifecycle hooks and related UI. Open the picker?',
  },
  inheritsChangeConfirm: {
    "zh-CN": "继续",
    en: "Continue",
  },
  inheritsClearWarnTitle: {
    "zh-CN": "清除继承基类",
    en: "Clear inherited base class",
  },
  inheritsClearWarnBody: {
    "zh-CN": "当前继承「{current}」。确定要清除吗？",
    en: 'Currently inheriting "{current}". Clear inheritance?',
  },
  inheritsClearConfirm: {
    "zh-CN": "清除",
    en: "Clear",
  },
  inspectorSelectTargetHint: {
    "zh-CN": "在画布中选择节点，或在左侧「变量」中选择一项以编辑。也可设置继承的基础类。",
    en: "Select a node on the canvas, pick a variable on the left, or set the inherited base class above.",
  },
  inspectorEditingFunction: {
    "zh-CN": "正在编辑函数「{name}」。可点左侧「返回事件图」或事件图表中的生命周期项回到主事件图。",
    en: 'Editing function "{name}". Use “Back to event graph” or a lifecycle hook under Event graphs in the left panel.',
  },
  backToEventGraph: {
    "zh-CN": "返回事件图",
    en: "Back to event graph",
  },
  inspectorVariableSectionTitle: {
    "zh-CN": "变量",
    en: "Variable",
  },
  variableNameLabel: {
    "zh-CN": "名称",
    en: "Name",
  },
  variableTypeLabel: {
    "zh-CN": "类型",
    en: "Type",
  },
  variableDeleteButton: {
    "zh-CN": "删除变量",
    en: "Delete variable",
  },
} as const;

export type UiTextKey = keyof typeof UI_TEXT;

export const detectUiLocale = (language: string | undefined): UiLocale => {
  if (language && /^zh\b/i.test(language)) {
    return "zh-CN";
  }
  return "en";
};

export const resolveUiLocale = (): UiLocale => {
  if (typeof navigator !== "undefined") {
    return detectUiLocale(navigator.language);
  }
  return "en";
};

export const translateUiText = (
  key: UiTextKey,
  locale: UiLocale,
  params?: Record<string, string | number>
): string => {
  let text: string = UI_TEXT[key][locale];
  if (!params) {
    return text;
  }
  for (const [name, value] of Object.entries(params)) {
    text = text.replace(`{${name}}`, String(value));
  }
  return text;
};
