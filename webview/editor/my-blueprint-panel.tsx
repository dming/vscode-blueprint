import { App, Button, Dropdown, Typography } from "antd";
import React, { useState } from "react";
import type { UiTextKey } from "./ui-text";

export type GraphVariable = { name: string; type: string };

export type GraphListEntry = { id: string; name: string };

const getTypeSwatchClass = (type: string): string => {
  const t = type.trim().toLowerCase();
  if (!t) return "bp-pin-type-unknown";
  return `bp-pin-type-${t.replace(/[^a-z0-9_-]/g, "-")}`;
};

export type MyBlueprintPanelProps = {
  /** Lifecycle hook names from the inherited base class (config). */
  lifecycleHooks: string[];
  selectedLifecycleHook: string | null;
  /** Highlights lifecycle rows only when viewing the main graph (not a function). */
  lifecycleListActive: boolean;
  /** When false (e.g. variable row selected), explorer graph rows are not highlighted. */
  graphExplorerActive: boolean;
  /** Shown when `lifecycleHooks` is empty (e.g. no inherits, unknown base, or no hooks declared). */
  lifecycleEmptyHint?: string | null;
  /** Base-class lifecycle hooks not yet present on the main graph (+ dropdown). */
  lifecycleHooksAvailableToAdd: string[];
  /** User picked a hook from the + menu; editor should insert Event.Start on the main graph. */
  onPickLifecycleHookToAdd: (hook: string) => void;
  /** Tooltip for the + control (enabled: pick from list; disabled: reason). */
  addLifecyclePlusTitle: string;
  functionGraphs: GraphListEntry[];
  /** Currently open function graph id, if any. */
  activeFunctionId: string | null;
  /** When set (typically while a function graph is open), show a return control in the explorer. */
  onBackToEventGraph?: () => void;
  onSelectFunctionId: (id: string) => void;
  onAddFunction: () => void;
  onRenameFunction: (id: string) => void;
  onDeleteFunction: (id: string) => void;
  variables: GraphVariable[];
  selectedVariableIndex: number | null;
  onSelectLifecycleHook: (hook: string) => void;
  /** Same as double-clicking the matching Event.Start on the canvas: focus hook + center viewport on node. */
  onLifecycleHookDoubleClick?: (hook: string) => void;
  onSelectVariable: (index: number) => void;
  onAddVariable: () => void;
  onRemoveVariable: (index: number) => void;
  t: (key: UiTextKey) => string;
};

export const MyBlueprintPanel: React.FC<MyBlueprintPanelProps> = ({
  lifecycleHooks,
  selectedLifecycleHook,
  lifecycleListActive,
  graphExplorerActive,
  lifecycleEmptyHint,
  lifecycleHooksAvailableToAdd,
  onPickLifecycleHookToAdd,
  addLifecyclePlusTitle,
  functionGraphs,
  activeFunctionId,
  onBackToEventGraph,
  onSelectFunctionId,
  onAddFunction,
  onRenameFunction,
  onDeleteFunction,
  variables,
  selectedVariableIndex,
  onSelectLifecycleHook,
  onLifecycleHookDoubleClick,
  onSelectVariable,
  onAddVariable,
  onRemoveVariable,
  t,
}) => {
  const { message } = App.useApp();
  const [graphsOpen, setGraphsOpen] = useState(true);
  const [eventGraphsOpen, setEventGraphsOpen] = useState(true);
  const [functionsOpen, setFunctionsOpen] = useState(true);
  const [variablesOpen, setVariablesOpen] = useState(true);
  const [dispatchersOpen, setDispatchersOpen] = useState(true);

  const showLater = (key: UiTextKey) => {
    void message.info(t(key), 2.5);
  };

  const lifecycleRowActive = (hook: string) =>
    lifecycleListActive && graphExplorerActive && hook === selectedLifecycleHook;
  const functionRowActive = (id: string) => graphExplorerActive && id === activeFunctionId;

  return (
    <aside className="bp-explorer" aria-label={t("myBlueprintTitle")}>
      <div className="bp-explorer-header">
        <Typography.Text className="bp-explorer-title">{t("myBlueprintTitle")}</Typography.Text>
      </div>
      {activeFunctionId && onBackToEventGraph ? (
        <div className="bp-explorer-return-bar">
          <Button type="link" size="small" block className="bp-explorer-return-btn" onClick={onBackToEventGraph}>
            {t("backToEventGraph")}
          </Button>
        </div>
      ) : null}
      <div className="bp-explorer-body" role="tree">
        {/* Graphs */}
        <section className="bp-explorer-section">
          <div className="bp-explorer-section-head">
            <button
              type="button"
              className="bp-explorer-section-toggle"
              onClick={() => setGraphsOpen((o) => !o)}
              aria-expanded={graphsOpen}
            >
              <span className={`bp-explorer-chevron ${graphsOpen ? "bp-explorer-chevron-open" : ""}`} aria-hidden />
              {t("myBlueprintSectionGraphs")}
            </button>
          </div>
          {graphsOpen ? (
            <div className="bp-explorer-section-children" role="group">
              <div className="bp-explorer-section-head bp-explorer-section-head-nested">
                <button
                  type="button"
                  className="bp-explorer-section-toggle"
                  onClick={() => setEventGraphsOpen((o) => !o)}
                  aria-expanded={eventGraphsOpen}
                >
                  <span className={`bp-explorer-chevron ${eventGraphsOpen ? "bp-explorer-chevron-open" : ""}`} aria-hidden />
                  {t("myBlueprintSectionEventGraphs")}
                </button>
                <Dropdown
                  menu={{
                    items: lifecycleHooksAvailableToAdd.map((hook) => ({
                      key: hook,
                      label: hook,
                    })),
                    onClick: ({ key, domEvent }) => {
                      domEvent?.stopPropagation();
                      onPickLifecycleHookToAdd(String(key));
                    },
                  }}
                  trigger={["click"]}
                  disabled={lifecycleHooksAvailableToAdd.length === 0}
                >
                  <Button
                    type="text"
                    size="small"
                    className="bp-explorer-add"
                    aria-label={t("myBlueprintAddLifecycleAria")}
                    title={addLifecyclePlusTitle}
                    disabled={lifecycleHooksAvailableToAdd.length === 0}
                    onClick={(e) => e.stopPropagation()}
                  >
                    +
                  </Button>
                </Dropdown>
              </div>
              {eventGraphsOpen ? (
                <div className="bp-explorer-tree" role="group">
                  {lifecycleHooks.length === 0 ? (
                    <div className="bp-explorer-muted bp-explorer-padding">
                      {lifecycleEmptyHint ?? t("myBlueprintLifecycleEmpty")}
                    </div>
                  ) : (
                    lifecycleHooks.map((hook) => (
                      <button
                        key={hook}
                        type="button"
                        role="treeitem"
                        className={`bp-explorer-item ${lifecycleRowActive(hook) ? "bp-explorer-item-active" : ""}`}
                        onClick={() => onSelectLifecycleHook(hook)}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          onLifecycleHookDoubleClick?.(hook);
                        }}
                      >
                        <span className="bp-explorer-item-label" title={hook}>
                          {hook}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* Functions */}
        <section className="bp-explorer-section">
          <div className="bp-explorer-section-head">
            <button
              type="button"
              className="bp-explorer-section-toggle"
              onClick={() => setFunctionsOpen((o) => !o)}
              aria-expanded={functionsOpen}
            >
              <span className={`bp-explorer-chevron ${functionsOpen ? "bp-explorer-chevron-open" : ""}`} aria-hidden />
              {t("myBlueprintSectionFunctions")}
            </button>
            <Button
              type="text"
              size="small"
              className="bp-explorer-add"
              aria-label={t("myBlueprintAddFunctionAria")}
              title={t("myBlueprintAddFunctionTooltip")}
              onClick={onAddFunction}
            >
              +
            </Button>
          </div>
          {functionsOpen ? (
            functionGraphs.length === 0 ? (
              <div className="bp-explorer-muted bp-explorer-padding">{t("myBlueprintEmptyFunctions")}</div>
            ) : (
              <div className="bp-explorer-tree" role="group">
                {functionGraphs.map((g) => (
                  <div
                    key={g.id}
                    className={`bp-explorer-item-row ${functionRowActive(g.id) ? "bp-explorer-item-row-active" : ""}`}
                  >
                    <button
                      type="button"
                      role="treeitem"
                      className="bp-explorer-item bp-explorer-item-grow"
                      onClick={() => onSelectFunctionId(g.id)}
                    >
                      <span className="bp-explorer-item-label" title={g.id}>
                        {g.name || g.id}
                      </span>
                    </button>
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: "rename",
                            label: t("functionContextRename"),
                            onClick: () => onRenameFunction(g.id),
                          },
                          {
                            key: "delete",
                            label: t("functionContextDelete"),
                            danger: true,
                            onClick: () => onDeleteFunction(g.id),
                          },
                        ],
                      }}
                      trigger={["click"]}
                    >
                      <Button
                        type="text"
                        size="small"
                        className="bp-explorer-fn-menu"
                        aria-label={t("functionContextMenuAria")}
                        onClick={(e) => e.stopPropagation()}
                      >
                        ⋯
                      </Button>
                    </Dropdown>
                  </div>
                ))}
              </div>
            )
          ) : null}
        </section>

        {/* Variables */}
        <section className="bp-explorer-section">
          <div className="bp-explorer-section-head">
            <button
              type="button"
              className="bp-explorer-section-toggle"
              onClick={() => setVariablesOpen((o) => !o)}
              aria-expanded={variablesOpen}
            >
              <span className={`bp-explorer-chevron ${variablesOpen ? "bp-explorer-chevron-open" : ""}`} aria-hidden />
              {t("myBlueprintSectionVariables")}
            </button>
            <Button
              type="text"
              size="small"
              className="bp-explorer-add"
              aria-label={t("myBlueprintAddVariableAria")}
              onClick={onAddVariable}
            >
              +
            </Button>
          </div>
          {variablesOpen ? (
            <div className="bp-explorer-tree" role="group">
              {variables.length === 0 ? (
                <div className="bp-explorer-muted bp-explorer-padding">—</div>
              ) : (
                variables.map((v, index) => (
                  <div
                    key={`${v.name}-${index}`}
                    className={`bp-explorer-item-row ${selectedVariableIndex === index ? "bp-explorer-item-row-active" : ""}`}
                  >
                    <button
                      type="button"
                      role="treeitem"
                      className="bp-explorer-item bp-explorer-item-grow"
                      onClick={() => onSelectVariable(index)}
                    >
                      <span className={`bp-explorer-type-swatch ${getTypeSwatchClass(v.type)}`} aria-hidden />
                      <span className="bp-explorer-item-label">{v.name}</span>
                      <span className="bp-explorer-item-type">{v.type}</span>
                    </button>
                    <Button
                      type="text"
                      size="small"
                      danger
                      className="bp-explorer-remove"
                      aria-label={t("myBlueprintRemoveVariableAria")}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveVariable(index);
                      }}
                    >
                      ×
                    </Button>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </section>

        {/* Event dispatchers */}
        <section className="bp-explorer-section">
          <div className="bp-explorer-section-head">
            <button
              type="button"
              className="bp-explorer-section-toggle"
              onClick={() => setDispatchersOpen((o) => !o)}
              aria-expanded={dispatchersOpen}
            >
              <span className={`bp-explorer-chevron ${dispatchersOpen ? "bp-explorer-chevron-open" : ""}`} aria-hidden />
              {t("myBlueprintSectionDispatchers")}
            </button>
            <Button
              type="text"
              size="small"
              className="bp-explorer-add"
              aria-label={t("myBlueprintAddDispatcherAria")}
              title={t("myBlueprintDispatchersLater")}
              onClick={() => showLater("myBlueprintDispatchersLater")}
            >
              +
            </Button>
          </div>
          {dispatchersOpen ? (
            <div className="bp-explorer-muted bp-explorer-padding">{t("myBlueprintEmptyDispatchers")}</div>
          ) : null}
        </section>
      </div>
    </aside>
  );
};
