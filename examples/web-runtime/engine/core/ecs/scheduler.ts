import type { World } from "./world";

export type SystemFn = (world: World, deltaMs: number) => void;

/** Runs registered systems in order each tick. */
export class Scheduler {
  constructor(
    private readonly world: World,
    private readonly systems: readonly SystemFn[],
  ) {}

  tick(deltaMs: number): void {
    for (const s of this.systems) {
      s(this.world, deltaMs);
    }
  }
}
