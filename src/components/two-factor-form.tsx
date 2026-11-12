"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
function setupKey(uri: string) {
  try {
    return new URL(uri).searchParams.get("secret") ?? uri;
  } catch {
    return uri;
  }
}
export function TwoFactorForm({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [setup, setSetup] = useState<{ uri: string; codes: string[] } | null>(
    null,
  );
  async function begin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const password = String(new FormData(event.currentTarget).get("password"));
    try {
      const result = await authClient.twoFactor.enable({
        password,
        method: "totp",
      });
      if (result.error || result.data?.method !== "totp") {
        setError(result.error?.message ?? "Unable to start authenticator setup.");
      } else {
        setSetup({
          uri: result.data.totpURI,
          codes: result.data.backupCodes,
        });
      }
    } catch {
      setError("Unable to start authenticator setup.");
    } finally {
      setPending(false);
    }
  }
  async function confirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const code = String(new FormData(event.currentTarget).get("code"));
    try {
      const result = await authClient.twoFactor.verifyTotp({ code });
      if (result.error) setError(result.error.message ?? "That code was not accepted.");
      else {
        setSetup(null);
        router.refresh();
      }
    } catch {
      setError("That code was not accepted.");
    } finally {
      setPending(false);
    }
  }
  async function disable(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const password = String(new FormData(event.currentTarget).get("password"));
    try {
      const result = await authClient.twoFactor.disable({ password });
      if (result.error) setError(result.error.message ?? "Unable to turn off two-factor authentication.");
      else router.refresh();
    } catch {
      setError("Unable to turn off two-factor authentication.");
    } finally {
      setPending(false);
    }
  }
  if (setup) {
    return (
      <div className="form-stack">
        <p className="muted">
          Add this key to an authenticator app, then enter the 6-digit code.
        </p>
        <p className="secret-key">{setupKey(setup.uri)}</p>
        {setup.codes.length > 0 && (
          <>
            <p className="muted">Save these backup codes. Each one works once.</p>
            <ul className="backup-codes">
              {setup.codes.map((code) => (
                <li key={code}>{code}</li>
              ))}
            </ul>
          </>
        )}
        <form onSubmit={confirm} className="form-stack">
          <label>
            Authenticator code
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              minLength={6}
              maxLength={8}
            />
          </label>
          {error && (
            <p role="alert" className="notice error">
              {error}
            </p>
          )}
          <button className="button primary" disabled={pending}>
            {pending ? "Checking…" : "Verify and turn on"}
          </button>
        </form>
      </div>
    );
  }
  if (enabled) {
    return (
      <form onSubmit={disable} className="form-stack">
        <p className="muted">
          Two-factor authentication is on. Sign-in asks for an authenticator
          code.
        </p>
        <label>
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </label>
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        <button className="button secondary" disabled={pending}>
          {pending ? "Saving…" : "Turn off two-factor authentication"}
        </button>
      </form>
    );
  }
  return (
    <form onSubmit={begin} className="form-stack">
      <p className="muted">
        Confirm your password to set up an authenticator app.
      </p>
      <label>
        Password
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </label>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      <button className="button primary" disabled={pending}>
        {pending ? "Starting…" : "Set up authenticator"}
      </button>
    </form>
  );
}
