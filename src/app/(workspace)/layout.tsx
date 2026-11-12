import { Sidebar } from "@/components/sidebar";
import { SignOut } from "@/components/sign-out";
import { workspaceContext } from "@/lib/session";
import { switchWorkspace } from "@/app/actions";
import { ChevronRight, CircleHelp } from "lucide-react";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, memberships, organization } = await workspaceContext();
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Sidebar />
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span className="workspace-mark">J</span>
            <form action={switchWorkspace} className="workspace-switch">
              <select
                aria-label="Workspace"
                name="workspace"
                defaultValue={organization?.id ?? ""}
              >
                {!organization && <option value="">No workspace yet</option>}
                {memberships.map((m) => (
                  <option key={m.id} value={m.organizationId}>
                    {m.organization.name}
                  </option>
                ))}
              </select>
              {memberships.length > 1 && (
                <button className="text-button">Switch</button>
              )}
            </form>
            <ChevronRight size={14} />
            <span className="muted">Workspace</span>
          </div>
          <div className="topbar-right">
            <Link href="/setup" title="Setup guide" aria-label="Setup guide">
              <CircleHelp size={19} />
            </Link>
            <span className="topbar-divider" />
            <Link className="avatar" href="/settings" title={user.name}>
              {user.name.slice(0, 2).toUpperCase()}
            </Link>
            <SignOut />
          </div>
        </header>
        <main id="main-content" className="page-content">
          {children}
        </main>
        <footer className="app-footer">
          <span>
            JUSS CMS{" "}
            <span className="muted">/ Your creative command center</span>
          </span>
          <span>
            <i className="status-dot" /> Phase 01 · Foundation
          </span>
        </footer>
      </div>
    </div>
  );
}
