import { useEffect, useRef, useState, type ReactNode } from "react";
import * as control from "../device/controller";
import type { ControlSnapshot } from "../device/types";
import { hidKeyForCode, shortcutLabel } from "./hid-keys";
import { t, tp } from "../i18n";
import { IconActivate, IconRunning } from "./icons";

function profileLabel(
  locale: ControlSnapshot["preferences"]["locale"],
  names: readonly string[] | undefined,
  index: number,
): string {
  return names?.[index] ?? tp(locale, "adv.profileOpt", { n: index + 1 });
}

export function ButtonLayerProfiles({ snapshot }: { snapshot: ControlSnapshot }): ReactNode {
  const [expanded, setExpanded] = useState(true);
  const [assignmentLayer, setAssignmentLayer] = useState<"primary" | "g-shift">("primary");
  const [shortcutTarget, setShortcutTarget] = useState<{ layer: "primary" | "g-shift"; button: number } | null>(null);
  const [shortcutStep, setShortcutStep] = useState<{ key: number; modifiers: number; label: string } | null>(null);
  const [shortcutRecording, setShortcutRecording] = useState(false);
  const [shortcutError, setShortcutError] = useState("");
  const inner = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!body.current || !inner.current) return;
    body.current.style.maxHeight = expanded ? `${inner.current.scrollHeight}px` : "0px";
  });

  const status = snapshot.status;
  const editor = status?.ui?.buttonLayerEditor;
  if (!status || !editor || !status.buttonLayerAssignments?.length) return null;

  const locale = snapshot.preferences.locale;
  const busy = snapshot.settingInProgress;
  const active = status.activeProfile;
  const count = status.profileCount ?? 0;
  const names = status.profileNames;
  const layers = editor.layers;
  const layer = layers.includes(assignmentLayer) ? assignmentLayer : (layers[0] ?? "primary");
  const lockPrimary = editor.lockPrimaryCount ?? 0;
  const assignments = status.buttonLayerAssignments.filter((entry) => entry.layer === layer);
  const stages = status.dpiStages ?? [];
  const dpi = stages.length > 0 ? `${stages.map((stage) => `${stage}`).join(" · ")} DPI` : null;
  const rate = status.pollingRateHz ? `${status.pollingRateHz.toLocaleString()} Hz` : null;
  const liveDetail = [dpi, rate].filter(Boolean).join(" · ");
  const summaryName = active != null
    ? `${profileLabel(locale, names, active - 1)} · ${t(locale, "prof.active")}`
    : t(locale, "prof.assign");

  return (
    <section
      id="button-layer-onboard"
      className={`profile-disclosure device-data${expanded ? " is-open" : ""}`}
      role="tabpanel"
      aria-labelledby="workspace-tab-profiles"
    >
      <div className="profile-summary">
        <button
          id="button-layer-disclosure-toggle"
          className="profile-summary-main"
          type="button"
          aria-expanded={expanded}
          aria-controls="button-layer-disclosure-body"
          onClick={() => setExpanded((open) => !open)}
        >
          <span className="profile-summary-text">
            <span className="profile-summary-label">{t(locale, "prof.editing")}</span>
            <strong>{summaryName}</strong>
            <small>{liveDetail || t(locale, "prof.profileStores")}</small>
          </span>
          <i className="profile-summary-chevron" aria-hidden="true" />
        </button>
      </div>

      <div id="button-layer-disclosure-body" className="profile-disclosure-body" ref={body}>
        <div className="profile-disclosure-inner" ref={inner}>
          {count > 1 && active != null ? (
            <div id="button-layer-profile-list">
              <div className="profile-row-rule">
                <small>STORED ON THE MOUSE</small>
              </div>
              <small className="profile-list-hint">
                Click a profile to switch the mouse to it.
              </small>
              {Array.from({ length: count }, (_, index) => {
                const value = index + 1;
                const running = value === active;
                const tags = running ? t(locale, "prof.active") : "";
                const label = profileLabel(locale, names, index);
                return (
                  <div key={value} className={`profile-row${running ? " is-open" : ""}`}>
                    <button
                      type="button"
                      disabled={busy}
                      title={running ? t(locale, "prof.runningProfile") : t(locale, "prof.switchProfile")}
                      className="profile-row-open"
                      onClick={() => {
                        if (!running) void control.applyProfileSelection(value);
                      }}
                    >
                      <span className={`device-dot${running ? "" : " is-idle"}`} />
                      <span className="profile-row-text">
                        <strong>
                          {label}{tags ? ` · ${tags}` : ""}
                        </strong>
                        <small>
                          {running ? liveDetail || "stored on the mouse" : "stored on the mouse"}
                        </small>
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={busy || running}
                      title={running ? t(locale, "prof.runningProfile") : t(locale, "prof.switchProfile")}
                      aria-label={`Switch to profile ${value}`}
                      aria-pressed={running}
                      className={`icon-button${running ? " is-active" : ""}`}
                      onClick={() => void control.applyProfileSelection(value)}
                    >
                      {running ? <IconRunning /> : <IconActivate />}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="profile-button-editor">
            <div className="profile-button-heading">
              <div>
                <p>BUTTONS</p>
                <h2>{t(locale, "prof.assign")}</h2>
                <small>{t(locale, "prof.assignBody")}</small>
              </div>
              {layers.length > 1 ? (
                <div className="assignment-layer-tabs" role="tablist" aria-label={t(locale, "prof.assignLayer")}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={layer === "primary"}
                    onClick={() => setAssignmentLayer("primary")}
                  >
                    {t(locale, "prof.normalTab")}
                  </button>
                  {layers.includes("g-shift") ? (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={layer === "g-shift"}
                      onClick={() => setAssignmentLayer("g-shift")}
                    >
                      G-Shift
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="assignment-grid">
              {assignments.map((assignment) => {
                const primaryLocked = layer === "primary" && assignment.button < lockPrimary;
                const name = editor.names[assignment.button] ?? `Button ${assignment.button + 1}`;
                return (
                  <label key={`${layer}-${assignment.button}`} className="assignment-card">
                    <span className="assignment-button-number">G{assignment.button + 1}</span>
                    <span className="assignment-button-name">{name}</span>
                    <span className="assignment-select-wrap">
                      <select
                        value={assignment.action}
                        disabled={busy || primaryLocked}
                        title={primaryLocked
                          ? "Primary click buttons cannot be remapped to prevent losing control of the mouse."
                          : assignment.action === "Custom"
                            ? `Unknown mapping: ${assignment.raw.map((byte) => byte.toString(16).padStart(2, "0")).join(" ")}`
                            : undefined}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          if (value === "keyboard") {
                            setShortcutStep(null);
                            setShortcutRecording(false);
                            setShortcutError("");
                            setShortcutTarget({ layer, button: assignment.button });
                            return;
                          }
                          control.applyButtonLayerAssignment(layer, assignment.button, value);
                        }}
                      >
                        {assignment.action === "Custom"
                          ? <option value="Custom">{t(locale, "prof.customPreserved")}</option>
                          : null}
                        {assignment.action === "Keyboard shortcut"
                          ? <option value="Keyboard shortcut">{t(locale, "prof.keyboardShortcut")}</option>
                          : null}
                        {editor.actions.map((action) => <option key={action} value={action}>{action}</option>)}
                        {editor.keyboard
                          ? <option value="keyboard">{t(locale, "prof.keyboardOpt")}</option>
                          : null}
                      </select>
                      <i aria-hidden="true" />
                    </span>
                  </label>
                );
              })}
            </div>
            <small className="setting-note">Changes are stored in this onboard profile.</small>
            {shortcutTarget ? (
              <div className="shortcut-dialog-backdrop" role="presentation" onMouseDown={(event) => {
                if (event.currentTarget === event.target) setShortcutTarget(null);
              }}>
                <div
                  className="shortcut-dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="button-layer-shortcut-title"
                  tabIndex={0}
                  autoFocus
                  onKeyDown={(event) => {
                    if (!shortcutRecording) {
                      if (event.key === "Escape") setShortcutTarget(null);
                      return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    if (event.key === "Escape" && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
                      setShortcutRecording(false);
                      setShortcutError("");
                      return;
                    }
                    if (event.repeat || ["Control", "Shift", "Alt", "Meta"].includes(event.key)) return;
                    const key = hidKeyForCode(event.code);
                    if (key === null) {
                      setShortcutError(`${event.key} cannot be stored by this mouse.`);
                      return;
                    }
                    const modifiers = (event.ctrlKey ? 0x01 : 0) | (event.shiftKey ? 0x02 : 0)
                      | (event.altKey ? 0x04 : 0) | (event.metaKey ? 0x08 : 0);
                    setShortcutStep({ key, modifiers, label: shortcutLabel(event) });
                    setShortcutError("");
                  }}
                >
                  <span className="shortcut-dialog-kicker">{t(locale, "prof.recorder")}</span>
                  <h3 id="button-layer-shortcut-title">{t(locale, "prof.recordTitle")}</h3>
                  <p>{t(locale, "prof.recordBody")}</p>
                  <button
                    type="button"
                    className={`shortcut-record-button${shortcutRecording ? " is-recording" : ""}`}
                    onClick={() => {
                      if (shortcutRecording) {
                        setShortcutRecording(false);
                      } else {
                        setShortcutStep(null);
                        setShortcutError("");
                        setShortcutRecording(true);
                      }
                    }}
                  >
                    <i aria-hidden="true" />{shortcutRecording ? t(locale, "prof.stopRec") : t(locale, "prof.record")}
                  </button>
                  <div className={`shortcut-capture${shortcutStep ? " has-value" : ""}`} aria-live="polite">
                    {shortcutStep
                      ? <ol><li><kbd>{shortcutStep.label}</kbd></li></ol>
                      : shortcutRecording ? t(locale, "prof.listening") : t(locale, "prof.nothingRec")}
                  </div>
                  {shortcutError ? <small className="shortcut-error" role="alert">{shortcutError}</small> : null}
                  <div className="shortcut-dialog-actions">
                    <button type="button" onClick={() => setShortcutTarget(null)}>{t(locale, "common.cancel")}</button>
                    <button
                      type="button"
                      className="is-primary"
                      disabled={shortcutRecording || !shortcutStep}
                      onClick={() => {
                        if (!shortcutStep) return;
                        control.applyButtonLayerKeyboard(
                          shortcutTarget.layer,
                          shortcutTarget.button,
                          shortcutStep.key,
                          shortcutStep.modifiers,
                        );
                        setShortcutTarget(null);
                      }}
                    >
                      {t(locale, "prof.assignShortcut")}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
