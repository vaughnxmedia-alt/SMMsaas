"use client";
import { useActionState } from "react";
import { disconnectSocial } from "@/app/social-actions";
export function DisconnectForm({
  organizationId,
  connectionId,
}: {
  organizationId: string;
  connectionId: string;
}) {
  const [state, action, pending] = useActionState(disconnectSocial, {});
  return (
    <details className="connection-disconnect">
      <summary>Disconnect account…</summary>
      <p className="muted">
        This stops all Juss CMS tools from using this account. Your posts on the
        platform are kept.
      </p>
      <form action={action}>
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="connectionId" value={connectionId} />
        <button className="button danger" disabled={pending}>
          {pending ? "Disconnecting…" : "Confirm disconnect"}
        </button>
        {state.error && (
          <p role="alert" className="notice error">
            {state.error}
          </p>
        )}
        {state.success && (
          <p role="status" className="notice">
            {state.success}
          </p>
        )}
      </form>
    </details>
  );
}
