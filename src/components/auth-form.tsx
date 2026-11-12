"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { credentialsInput, signUpInput } from "@/lib/validation";
import { ArrowRight, Layers3, ShieldCheck } from "lucide-react";
export function AuthForm({ signup = false }: { signup?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = signup
      ? signUpInput.safeParse(values)
      : credentialsInput.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      setPending(false);
      return;
    }
    try {
      const result = signup
        ? await authClient.signUp.email({
            name: String(values.name),
            email: String(values.email),
            password: String(values.password),
            confirmPassword: String(values.confirmPassword),
          } as Parameters<typeof authClient.signUp.email>[0])
        : await authClient.signIn.email({
            email: String(values.email),
            password: String(values.password),
          });
      if (result.error)
        setError(result.error.message ?? "Unable to authenticate.");
      else if ("twoFactorRedirect" in (result.data ?? {})) {
        router.push("/two-factor");
        router.refresh();
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Unable to connect. Please try again.");
    }
    setPending(false);
  }
  return (
    <main className="auth-page">
      <section className="auth-story">
        <Link className="wordmark" href="/">
          <Layers3 /> JUSS <span>CMS</span>
        </Link>
        <div>
          <p className="eyebrow">YOUR CREATIVE COMMAND CENTER</p>
          <h1>
            Great brands.
            <br />
            Start here.
          </h1>
          <p>
            One focused space for your brands, your team,
            <br />
            and everything you’ll create next.
          </p>
          <div className="orb" />
        </div>
        <small>
          <ShieldCheck size={15} /> Self-hosted. Your content. Your control.
        </small>
      </section>
      <section className="auth-panel">
        <div className="auth-box">
          <span className="pill">JUSS CMS · PHASE 01</span>
          <h2>{signup ? "Create your account" : "Welcome back"}</h2>
          <p className="muted">
            {signup
              ? "Make room for your next big idea."
              : "Your creative workspace is waiting."}
          </p>
          <form onSubmit={submit} className="form-stack">
            {signup && (
              <label>
                Your name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={80}
                />
              </label>
            )}
            <label>
              Email address
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={signup ? "new-password" : "current-password"}
                required
                minLength={12}
                maxLength={128}
              />
            </label>
            {signup && (
              <label>
                Retype password
                <input
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                />
              </label>
            )}
            <small className="muted">Use at least 12 characters.</small>
            {error && (
              <p role="alert" className="notice error">
                {error}
              </p>
            )}
            <button className="button primary" disabled={pending}>
              {pending ? "Please wait…" : signup ? "Create account" : "Sign in"}
              <ArrowRight size={16} />
            </button>
          </form>
          <p className="auth-switch">
            {signup ? "Already have an account?" : "New to Juss CMS?"}{" "}
            <Link href={signup ? "/sign-in" : "/sign-up"}>
              {signup ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
