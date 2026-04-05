// Auto-generated from res/y.blueprint.js

import { EPinDirection, EPinType } from "./BlueprintDefs";

export interface BlueprintPinJson {
    name: string;
    id?: string;
    type?: string;
    [key: string]: unknown;
}

export class BlueprintPin {
    private _direction!: EPinDirection;
    public id!: string;
    public linkTo: BlueprintPin[];
    public name!: string;
    public nid!: string;
    public otype: string | undefined;
    public owner: unknown;
    public type!: EPinType;
    public value: unknown;
    public get direction() {
        return this._direction;
    }

    public set direction(value: EPinDirection) {
        if (value == EPinDirection.Input && this.type == EPinType.BPFun) {
            this.type = EPinType.Other;
        }
        this._direction = value;
    }

    constructor() {
        this.linkTo = [];
    }

    public parse(def: BlueprintPinJson) {
        const d = def;
        this.name = d.name;
        this.nid = d.id || d.name;
        this.otype = d.type;
        switch (d.type) {
            case "exec":
                this.type = EPinType.Exec;
                break;
            case "bpFun":
                this.type = EPinType.BPFun;
                break;
            default:
                this.type = EPinType.Other;
        }
    }

    public startLinkTo(e: BlueprintPin) {
        this.linkTo.push(e);
        if (e.linkTo.indexOf(this) == -1) {
            e.linkTo.push(this);
        }
    }
}
