# Blueprint runtime (`src/runtime`)

Execution engine for blueprint graphs (context, dispatchers, functions, global events).

- **Depends on** [`src/shared/`](../shared/) only (document model, config parsing, types).
- **Does not** import [`src/host/build/`](../host/build/) or validation modules; the editor/build pipeline validates before save.

Add runtime entry points here when implementing execution.
