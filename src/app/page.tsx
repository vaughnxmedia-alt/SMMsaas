import Link from "next/link";
import { headers } from "next/headers";
import { Layers3 } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { Opening } from "@/components/opening";
import { ActionForm } from "@/components/action-form";
import { SignOut } from "@/components/sign-out";
import { HiddenOrg } from "@/components/ui";
export const dynamic = "force-dynamic";
export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return (
      <Opening>
        <main className="directory gate">
          <h1>JUSS CMS</h1>
          <div className="directory-actions">
            <Link className="button primary" href="/sign-in">
              Sign in
            </Link>
            <Link className="button secondary" href="/sign-up">
              Create account
            </Link>
          </div>
        </main>
      </Opening>
    );
  }
  const memberships = await db.organizationMember.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    include: {
      organization: {
        include: {
          members: {
            where: { role: { not: "OWNER" } },
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });
  return (
    <Opening>
      <main className="directory">
        <header className="directory-bar">
          <Link className="wordmark" href="/">
            <Layers3 /> JUSS <em>CMS</em>
          </Link>
          <div className="directory-user">
            <Link href="/dashboard">Dashboard</Link>
            <SignOut />
          </div>
        </header>
        <h1>Businesses</h1>
        <div className="directory-grid">
          {memberships.map((membership) => {
            const business = membership.organization;
            const manage = can(membership.role, "workspace:manage");
            return (
              <section className="panel business-card" key={business.id}>
                <h2>{business.name}</h2>
                {business.members.length > 0 && (
                  <ul className="account-list">
                    {business.members.map((member) => (
                      <li key={member.id}>
                        <strong>{member.user.name}</strong>
                        <span className="muted">
                          {member.user.email} · {member.role.toLowerCase()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {manage && (
                  <ActionForm kind="member:save" label="Add account">
                    <HiddenOrg id={business.id} />
                    <input type="hidden" name="returnTo" value="/" />
                    <label>
                      Email
                      <input
                        name="email"
                        type="email"
                        required
                        autoComplete="off"
                      />
                    </label>
                    <label>
                      Role
                      <select name="role" defaultValue="VIEWER">
                        <option value="VIEWER">Viewer</option>
                        <option value="EDITOR">Editor</option>
                        {membership.role === "OWNER" && (
                          <option value="ADMIN">Admin</option>
                        )}
                      </select>
                    </label>
                  </ActionForm>
                )}
              </section>
            );
          })}
          <section className="panel business-card">
            <h2>Add a business</h2>
            <ActionForm kind="organization:create" label="Add business">
              <input type="hidden" name="returnTo" value="/" />
              <label>
                Business name
                <input name="name" minLength={2} maxLength={80} required />
              </label>
            </ActionForm>
          </section>
        </div>
      </main>
    </Opening>
  );
}
