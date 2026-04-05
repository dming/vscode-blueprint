// Auto-generated from res/y.blueprint.js

import { BlueprintEventNode } from "./BlueprintEventNode";

export class BlueprintCustomFunStart extends BlueprintEventNode {
    public eventName: string | undefined;
    public onParseLinkData(
        node: { dataId?: unknown; name?: string },
        manager: { dataMap: Record<string, { name?: string }> },
    ) {
        if (node.dataId) {
            this.eventName = manager.dataMap[String(node.dataId)].name;
        } else {
            this.eventName = node.name;
        }
    }
}
