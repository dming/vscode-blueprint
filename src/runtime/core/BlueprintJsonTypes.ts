/** Serialized blueprint graph item (node + link payload). */
export type BlueprintJsonItem = Record<string, unknown>;

/** Data map filled by `BlueprintData.formatData` and used during graph parsing/execution. */
export type BlueprintDataMap = Record<string, unknown>;

export interface BlueprintFunctionGraphJson {
    id: string | number;
    name: string;
    arr: BlueprintJsonItem[];
    properties?: Array<Record<string, unknown>>;
    output?: Array<Record<string, unknown>>;
    variable?: Array<{ name: string; [key: string]: unknown }>;
    modifiers?: { isStatic?: boolean } & Record<string, unknown>;
    caption?: string;
    tips?: string;
    [key: string]: unknown;
}

export interface BlueprintGraphBucketJson {
    arr: BlueprintJsonItem[];
}

export interface BlueprintAssetJson {
    _$ver?: unknown;
    extends?: string;
    blueprintArr: Record<string, BlueprintGraphBucketJson>;
    variable?: Array<Record<string, unknown>>;
    events?: Array<Record<string, unknown>>;
    functions?: BlueprintFunctionGraphJson[];
    preload?: string[] | null;
    globalInfo?: { isRunningInIDE?: unknown } & Record<string, unknown>;
    [key: string]: unknown;
}

/** Payload object passed into `BlueprintFactory.parseCls` as `data`. */
export interface BlueprintParsePayload {
    id: string | number;
    name: string;
    dataMap: BlueprintDataMap;
    arr: BlueprintJsonItem[];
    [key: string]: unknown;
}
