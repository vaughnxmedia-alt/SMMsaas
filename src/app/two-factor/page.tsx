"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
export default function TwoFactorPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [backup, setBackup] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const code = String(new FormData(event.currentTarget).get("code")).trim();
    try {
      const result = backup
        ? await authClient.twoFactor.verifyBackupCode({ code })
        : await authClient.twoFactor.verifyTotp({ code });
      if (result.error) {
        setError(result.error.message ?? "That code was not accepted.");
        setPending(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("That code was not accepted.");
      setPending(false);
    }
  }
  return (
    <main className="directory gate">
      <h1>Two-factor authentication</h1>
      <form onSubmit={submit} className="form-stack two-factor-form">
        <label>
          {backup ? "Backup code" : "Authenticator code"}
          <input
            name="code"
            required
            autoComplete="one-time-code"
            inputMode={backup ? "text" : "numeric"}
          />
        </label>
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        <button className="button primary" disabled={pending}>
          {pending ? "Checking…" : "Verify"}
        </button>
        <button
          className="text-button"
          type="button"
          onClick={() => {
            setBackup((value) => !value);
            setError("");
          }}
        >
          {backup ? "Use an authenticator code" : "Use a backup code"}
        </button>
      </form>
    </main>
  );
}
