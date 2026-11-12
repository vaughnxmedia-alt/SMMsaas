import Link from "next/link";
import { Link2, ArrowUpRight } from "lucide-react";
import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { PasswordForm } from "@/components/password-form";
import { TwoFactorForm } from "@/components/two-factor-form";
export default async function Settings() {
  const user = await requireUser();
  return (
    <>
      <PageHeader
        eyebrow="MAKE YOURSELF AT HOME"
        title="Account settings"
        description="Your profile, security, and personal details."
      />
      <Link
        className="panel settings-connections-link"
        href="/settings/connections"
      >
        <span className="quick-icon">
          <Link2 size={22} />
        </span>
        <div>
          <h2>Connected Accounts</h2>
          <p className="muted">
            Add accounts, review access, and manage your workspace’s social
            connections.
          </p>
        </div>
        <ArrowUpRight size={20} />
      </Link>
      <div className="settings-grid">
        <section className="panel form-panel">
          <h2>Your profile</h2>
          <div className="avatar large">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <ActionForm kind="profile">
            <label>
              Display name
              <input
                name="name"
                minLength={2}
                maxLength={80}
                required
                defaultValue={user.name}
              />
            </label>
            <label>
              Email address
              <input type="email" value={user.email} disabled readOnly />
            </label>
          </ActionForm>
        </section>
        <section className="panel form-panel">
          <h2>Password & security</h2>
          <p className="muted">
            Choose a unique password with at least 12 characters.
          </p>
          <PasswordForm />
        </section>
        <section className="panel form-panel">
          <h2>Two-factor authentication</h2>
          <TwoFactorForm enabled={Boolean(user.twoFactorEnabled)} />
        </section>
      </div>
    </>
  );
}
