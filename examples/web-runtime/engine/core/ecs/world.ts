import type { Component, ComponentCtor } from "./component";
import type { EntityId } from "./types";

/**
 * Minimal archetype-free ECS: one map per component type, entity iteration for queries.
 * Component identity is the concrete class (`constructor`); payloads extend {@link Component}.
 */
export class World {
    private nextEntity = 1 as EntityId;
    private readonly alive = new Set<EntityId>();
    private readonly columns = new Map<ComponentCtor, Map<EntityId, Component>>();

    spawn(): EntityId {
        const id = this.nextEntity++;
        this.alive.add(id);
        return id;
    }

    destroy(entity: EntityId): void {
        if (!this.alive.has(entity)) {
            return;
        }
        for (const map of this.columns.values()) {
            const c = map.get(entity);
            if (c !== undefined) {
                c.onDestroy();
                map.delete(entity);
            }
        }
        this.alive.delete(entity);
    }

    isAlive(entity: EntityId): boolean {
        return this.alive.has(entity);
    }

    /**
     * Attaches a component instance to an entity. The instance must be a subclass of {@link Component};
     * its `constructor` selects the storage column (only one instance per type per entity).
     * Replaces an existing component of the same type after `onDestroy` on the old instance.
     */
    addComponent(entity: EntityId, component: Component): void {
        this.assertAlive(entity);
        const ctor = component.constructor as ComponentCtor;
        let col = this.columns.get(ctor);
        if (!col) {
            col = new Map();
            this.columns.set(ctor, col);
        }
        const previous = col.get(entity);
        if (previous !== undefined) {
            previous.onDestroy();
        }
        col.set(entity, component);
        component.onAwake();
        component.onStart();
    }

    removeComponent<T extends Component>(entity: EntityId, ctor: ComponentCtor<T>): void {
        this.assertAlive(entity);
        const col = this.columns.get(ctor);
        const c = col?.get(entity);
        if (c !== undefined && col !== undefined) {
            c.onDestroy();
            col.delete(entity);
        }
    }

    getComponent<T extends Component>(entity: EntityId, ctor: ComponentCtor<T>): T | undefined {
        if (!this.alive.has(entity)) {
            return undefined;
        }
        return this.columns.get(ctor)?.get(entity) as T | undefined;
    }

    hasComponent<T extends Component>(entity: EntityId, ctor: ComponentCtor<T>): boolean {
        return this.alive.has(entity) && this.columns.get(ctor)?.has(entity) === true;
    }

    /**
     * Per-frame hook: invokes {@link Component.onUpdate} on every component belonging to a live entity.
     * Call from your game loop (e.g. after ECS systems); order across columns is insertion order of component types.
     */
    update(deltaMs: number): void {
        for (const map of this.columns.values()) {
            for (const [entity, comp] of map) {
                if (this.alive.has(entity)) {
                    comp.onUpdate(deltaMs);
                }
            }
        }
    }

    /** Every entity that has `ctor`, in arbitrary order. */
    eachComponent<T extends Component>(
        ctor: ComponentCtor<T>,
        fn: (entity: EntityId, c: T) => void
    ): void {
        const col = this.columns.get(ctor);
        if (!col) {
            return;
        }
        for (const [entity, raw] of col) {
            if (this.alive.has(entity)) {
                fn(entity, raw as T);
            }
        }
    }

    /** Entities that have both `a` and `b`. */
    eachWith2<A extends Component, B extends Component>(
        a: ComponentCtor<A>,
        b: ComponentCtor<B>,
        fn: (entity: EntityId, ca: A, cb: B) => void
    ): void {
        const colA = this.columns.get(a);
        const colB = this.columns.get(b);
        if (!colA || !colB) {
            return;
        }
        for (const [entity, va] of colA) {
            if (!this.alive.has(entity)) {
                continue;
            }
            const vb = colB.get(entity);
            if (vb !== undefined) {
                fn(entity, va as A, vb as B);
            }
        }
    }

    /** Entities that have all three components. */
    eachWith3<A extends Component, B extends Component, C extends Component>(
        a: ComponentCtor<A>,
        b: ComponentCtor<B>,
        c: ComponentCtor<C>,
        fn: (entity: EntityId, ca: A, cb: B, cc: C) => void
    ): void {
        const colA = this.columns.get(a);
        const colB = this.columns.get(b);
        const colC = this.columns.get(c);
        if (!colA || !colB || !colC) {
            return;
        }
        for (const [entity, va] of colA) {
            if (!this.alive.has(entity)) {
                continue;
            }
            const vb = colB.get(entity);
            const vc = colC.get(entity);
            if (vb !== undefined && vc !== undefined) {
                fn(entity, va as A, vb as B, vc as C);
            }
        }
    }

    get entityCount(): number {
        return this.alive.size;
    }

    private assertAlive(entity: EntityId): void {
        if (!this.alive.has(entity)) {
            throw new Error(`ECS: entity ${entity} is not alive`);
        }
    }
}
