import { workspaceContext } from "@/lib/session";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { PageHeader, HiddenOrg } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { switchWorkspace } from "@/app/actions";
export default async function Organizations() {
  const { organization, membership, memberships, user } =
    await workspaceContext();
  const members = organization
    ? await db.organizationMember.findMany({
        where: { organizationId: organization.id },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      })
    : [];
  const manage = membership && can(membership.role, "workspace:manage");
  return (
    <>
      <PageHeader
        eyebrow="BETTER TOGETHER"
        title="Your workspaces"
        description="A shared home for your brands and the people behind them."
      />
      <div className="settings-grid">
        <section className="panel form-panel">
          <h2>Your organizations</h2>
          {memberships.map((m) => (
            <form className="workspace-row" action={switchWorkspace} key={m.id}>
              <input type="hidden" name="workspace" value={m.organizationId} />
              <div>
                <h3>{m.organization.name}</h3>
                <small className="muted">{m.role.toLowerCase()}</small>
              </div>
              <button
                className="button secondary"
                disabled={m.organizationId === organization?.id}
              >
                {m.organizationId === organization?.id ? "Current" : "Switch"}
              </button>
            </form>
          ))}
          <h2>Create a workspace</h2>
          <ActionForm kind="organization:create" label="Create workspace">
            <label>
              Workspace name
              <input
                name="name"
                minLength={2}
                maxLength={80}
                required
                placeholder="Your studio or team"
              />
            </label>
          </ActionForm>
        </section>
        {organization && (
          <section className="panel form-panel">
            <h2>{organization.name}</h2>
            {manage && (
              <ActionForm kind="organization:update">
                <HiddenOrg id={organization.id} />
                <label>
                  Workspace name
                  <input
                    name="name"
                    defaultValue={organization.name}
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </label>
              </ActionForm>
            )}
            <h2>Members</h2>
            <p className="muted">
              Owners control the workspace. Admins manage brands and members.
              Editors manage brands. Viewers have read access.
            </p>
            {members.map((m) => (
              <div className="member-row" key={m.id}>
                <div>
                  <strong>{m.user.name}</strong>
                  <small className="muted">
                    {m.user.email} · {m.role.toLowerCase()}
                  </small>
                </div>
                {manage &&
                  m.role !== "OWNER" &&
                  m.userId !== user.id &&
                  (membership.role === "OWNER" || m.role !== "ADMIN") && (
                    <ActionForm kind="member:remove" label="Remove" danger>
                      <HiddenOrg id={organization.id} />
                      <input type="hidden" name="userId" value={m.userId} />
                    </ActionForm>
                  )}
              </div>
            ))}
            {manage && (
              <>
                <h3>Add or update a member</h3>
                <p className="muted">
                  Enter the email of an existing registered user.
                </p>
                <ActionForm kind="member:save" label="Save membership">
                  <HiddenOrg id={organization.id} />
                  <label>
                    Email
                    <input name="email" type="email" required />
                  </label>
                  <label>
                    Role
                    <select name="role">
                      <option value="VIEWER">Viewer</option>
                      <option value="EDITOR">Editor</option>
                      {membership.role === "OWNER" && (
                        <option value="ADMIN">Admin</option>
                      )}
                    </select>
                  </label>
                </ActionForm>
              </>
            )}
            {membership?.role === "OWNER" && (
              <details className="danger-zone">
                <summary>Delete workspace…</summary>
                <p className="muted">
                  Permanently deletes all brands and activity. Type the
                  workspace name to confirm.
                </p>
                <ActionForm
                  kind="organization:delete"
                  label="Permanently delete workspace"
                  danger
                >
                  <HiddenOrg id={organization.id} />
                  <label>
                    Workspace name
                    <input name="confirmation" required autoComplete="off" />
                  </label>
                </ActionForm>
              </details>
            )}
          </section>
        )}
      </div>
    </>
  );
}
