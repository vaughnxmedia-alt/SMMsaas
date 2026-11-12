"use client";
import { useActionState } from "react";
import { mutate, type FormState } from "@/app/actions";
export function ActionForm({
  kind,
  children,
  label = "Save changes",
  danger = false,
}: {
  kind: string;
  children: React.ReactNode;
  label?: string;
  danger?: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    mutate.bind(null, kind),
    {},
  );
  return (
    <form action={action} className="form-stack">
      {children}
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
      <button
        disabled={pending}
        className={danger ? "button danger" : "button primary"}
      >
        {pending ? "Saving…" : label}
      </button>
    </form>
  );
}
