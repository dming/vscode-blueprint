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
    "zh-CN": "Root 节点",
    en: "Root Node",
  },
  legendLegal: {
    "zh-CN": "合法树节点",
    en: "Legal Tree Node",
  },
  legendIllegal: {
    "zh-CN": "非法树节点",
    en: "Illegal Tree Node",
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
