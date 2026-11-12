import Link from "next/link";
import { Layers3 } from "lucide-react";
export default function Setup() {
  return (
    <main className="setup-page">
      <Link className="wordmark" href="/dashboard">
        <Layers3 /> JUSS CMS
      </Link>
      <p className="eyebrow">FIRST-RUN GUIDE</p>
      <h1>Your creative foundation.</h1>
      <p className="muted">
        Get your self-hosted workspace ready in a few steps.
      </p>
      <section className="panel form-panel">
        <ol className="setup-steps">
          <li>
            <h2>Create your account</h2>
            <p>
              Register with your email, type the password twice, and use at
              least 12 characters. Turn on an authenticator in Settings.
            </p>
            <Link href="/sign-up">Create account →</Link>
          </li>
          <li>
            <h2>Create a workspace</h2>
            <p>
              Open Organizations and give your studio or team a name. You’ll
              become its owner.
            </p>
            <Link href="/organizations">Open organizations →</Link>
          </li>
          <li>
            <h2>Build your first brand</h2>
            <p>
              Add your brand name, colors, audience, and communication style.
              Your lettermark is created automatically.
            </p>
            <Link href="/brands/new">Create a brand →</Link>
          </li>
          <li>
            <h2>Bring your team</h2>
            <p>
              Ask teammates to register, then add them by email in
              Organizations. Assign Admin, Editor, or Viewer access.
            </p>
          </li>
        </ol>
      </section>
      <p className="muted">
        Administrator? See README.md for database setup, migrations, and
        production configuration.
      </p>
    </main>
  );
}
