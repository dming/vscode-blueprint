import { SAMPLE_EDITOR_HOST_BASE_CLASS } from "../../../blueprintConfig/constants";
import { BlueprintBaseClass, Lifecycle } from "../../../blueprintConfig/decorators";

/**
 * All ECS data on an entity must be instances of a concrete subclass of {@link Component}.
 * The world uses `instance.constructor` as the stable column key (same pattern as `class`-keyed maps).
 *
 * Registered in `blueprint.config.json` under {@link SAMPLE_EDITOR_HOST_BASE_CLASS} (same `inherits`
 * host as sample blueprints). Lifecycle hooks match {@link World} dispatch order.
 *
 * Lifecycle (driven by {@link World}):
 * - {@link onAwake} / {@link onStart} — when attached via {@link World.addComponent}
 * - {@link onUpdate} — each {@link World.update}
 * - {@link onDestroy} — when removed or the entity is destroyed
 */
@BlueprintBaseClass(SAMPLE_EDITOR_HOST_BASE_CLASS)
export abstract class Component {
  protected constructor() {}

  /** Invoked when the component is attached to a live entity (before {@link onStart}). */
  @Lifecycle()
  onAwake(): void {}

  /** Invoked once immediately after {@link onAwake} on the same {@link World.addComponent} call. */
  @Lifecycle()
  onStart(): void {}

  /** Invoked each frame via {@link World.update} while the entity remains alive. */
  @Lifecycle({ outputs: ["deltaTime:number"] })
  onUpdate(deltaMs: number): void {
    void deltaMs;
  }

  /** Invoked when the component is removed or the owning entity is destroyed. */
  @Lifecycle()
  onDestroy(): void {}
}

/** Concrete component class; used as the storage key alongside the instance. */
export type ComponentCtor<T extends Component = Component> = new (...args: never[]) => T;
