// Auto-generated from res/y.blueprint.js

import { BlueprintRuntimeBaseNode } from "./BlueprintRuntimeBaseNode";

export class BluePrintAsNode extends BlueprintRuntimeBaseNode {
    public optimize() {
        const out = this.outPutParmPins[0];
        const insert = this.inPutParmPins[0];
        const pre = insert.linkTo[0];
        if (pre) {
            out.linkTo.forEach((value) => {
                const index = value.linkTo.indexOf(out);
                value.linkTo[index] = pre;
                const indexnew = pre.linkTo.indexOf(value);
                if (indexnew != -1) {
                    pre.linkTo[indexnew] = value;
                } else {
                    pre.linkTo.push(value);
                }
            });
            const index = pre.linkTo.indexOf(insert);
            pre.linkTo.splice(index, 1);
        }
    }
}
