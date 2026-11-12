"use client";
import { useActionState } from "react";
import { changePassword, type FormState } from "@/app/actions";
export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    changePassword,
    {},
  );
  return (
    <form action={action} className="form-stack">
      <label>
        Current password
        <input
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
        />
      </label>
      <label>
        New password
        <input
          name="newPassword"
          type="password"
          minLength={12}
          maxLength={128}
          required
          autoComplete="new-password"
        />
      </label>
      <label>
        Retype new password
        <input
          name="confirmPassword"
          type="password"
          minLength={12}
          maxLength={128}
          required
          autoComplete="new-password"
        />
      </label>
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
      <button className="button primary" disabled={pending}>
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
