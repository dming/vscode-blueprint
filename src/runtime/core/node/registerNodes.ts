import { BluePrintAsNode } from "./BluePrintAsNode";
import { BluePrintBlockNode } from "./BluePrintBlockNode";
import { BlueprintComplexNode } from "./BlueprintComplexNode";
import { BlueprintCustomFunNode } from "./BlueprintCustomFunNode";
import { BlueprintCustomFunReturn } from "./BlueprintCustomFunReturn";
import { BlueprintCustomFunReturnContext } from "./BlueprintCustomFunReturnContext";
import { BlueprintCustomFunStart } from "./BlueprintCustomFunStart";
import { BlueprintEventNode } from "./BlueprintEventNode";
import { BlueprintFactory } from "../BlueprintFactory";
import { BlueprintFunNode } from "./BlueprintFunNode";
import { BlueprintGetTempVarNode } from "./BlueprintGetTempVarNode";
import { BlueprintGetVarNode } from "./BlueprintGetVarNode";
import { BlueprintNewTargetNode } from "./BlueprintNewTargetNode";
import { BlueprintRuntimeBaseNode } from "./BlueprintRuntimeBaseNode";
import { BlueprintSequenceNode } from "./BlueprintSequenceNode";
import { BlueprintSetTempVarNode } from "./BlueprintSetTempVarNode";
import { BlueprintSetVarNode } from "./BlueprintSetVarNode";
import { BPType } from "../BlueprintDefs";

export function registerBlueprintNodes() {
    const rc = BlueprintFactory.regBPClass.bind(BlueprintFactory);
    rc(BPType.Event, BlueprintEventNode);
    rc(BPType.Pure, BlueprintRuntimeBaseNode);
    rc(BPType.Operator, BlueprintRuntimeBaseNode);
    rc(BPType.Function, BlueprintFunNode);
    rc(BPType.GetValue, BlueprintGetVarNode);
    rc(BPType.SetValue, BlueprintSetVarNode);
    rc(BPType.GetTmpValue, BlueprintGetTempVarNode);
    rc(BPType.SetTmpValue, BlueprintSetTempVarNode);
    rc(BPType.Branch, BlueprintComplexNode);
    rc(BPType.Sequence, BlueprintSequenceNode);
    rc(BPType.NewTarget, BlueprintNewTargetNode);
    rc(BPType.CustomFun, BlueprintCustomFunNode);
    rc(BPType.CustomFunStart, BlueprintCustomFunStart);
    rc(BPType.CustomFunReturn, BlueprintCustomFunReturn);
    rc(BPType.Block, BluePrintBlockNode);
    rc(BPType.Assertion, BluePrintAsNode);

    BlueprintFactory.regBPContextData(BPType.CustomFunReturn, BlueprintCustomFunReturnContext);
}
