"use client";
import { useState } from "react";
import {
  connectionStates,
  stateHelp,
  stateLabels,
  type ConnectionState,
} from "@/lib/social/catalog";
import { transition, type ConnectionEvent } from "@/lib/social/policy";
import { ConnectionStatus } from "./connection-status";
export function StatePreview() {
  const [state, setState] = useState<ConnectionState>("NOT_CONNECTED");
  const events: { label: string; event: ConnectionEvent }[] =
    state === "NOT_CONNECTED"
      ? [
          { label: "Preview authorization", event: "START" },
          { label: "Preview unsupported", event: "UNAVAILABLE" },
        ]
      : state === "CONNECTING"
        ? [
            { label: "Preview success", event: "AUTHORIZED" },
            { label: "Preview partial access", event: "PARTIAL" },
            { label: "Preview failure", event: "FAIL" },
          ]
        : ["CONNECTED", "LIMITED_ACCESS"].includes(state)
          ? [
              { label: "Preview expired access", event: "EXPIRE" },
              { label: "Reset preview", event: "DISCONNECT" },
            ]
          : [{ label: "Reset preview", event: "DISCONNECT" }];
  return (
    <details className="panel state-preview">
      <summary>
        Explore connection states{" "}
        <span className="simulation-badge">SIMULATED · UI PREVIEW ONLY</span>
      </summary>
      <p className="muted">
        This preview stays in this browser tab. It never saves an account,
        contacts a platform, or grants access to tools.
      </p>
      <label>
        Preview state
        <select
          value={state}
          onChange={(e) => setState(e.target.value as ConnectionState)}
        >
          {connectionStates.map((s) => (
            <option value={s} key={s}>
              {stateLabels[s]}
            </option>
          ))}
        </select>
      </label>
      <div className="preview-account">
        <div>
          <span className="simulation-badge">SIMULATED ACCOUNT</span>
          <h3>Example profile · not a real connection</h3>
        </div>
        <ConnectionStatus state={state} />
      </div>
      <p aria-live="polite">{stateHelp[state]}</p>
      <div className="connection-actions">
        {events.map((e) => (
          <button
            key={e.event}
            className="button secondary"
            onClick={() => setState(transition(state, e.event))}
          >
            {e.label}
          </button>
        ))}
      </div>
    </details>
  );
}
