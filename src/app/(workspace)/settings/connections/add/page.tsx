import Link from "next/link";
import { notFound } from "next/navigation";
import { workspaceContext } from "@/lib/session";
import { can } from "@/lib/permissions";
import {
  capabilities,
  isPlatform,
  platforms,
  safeReturnTo,
  type Capability,
} from "@/lib/social/catalog";
import { listConnections, platformPolicy } from "@/lib/social/accounts.server";
import { capabilityDecision } from "@/lib/social/policy";
import { connectionMessages } from "@/lib/social/messages";
import { PageHeader, EmptyState } from "@/components/ui";
import { ConnectionWizard } from "@/components/social/connection-wizard";
export default async function AddConnection({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { organization, membership, user } = await workspaceContext();
  const query = await searchParams;
  const returnTo = safeReturnTo(query.returnTo);
  const selected = isPlatform(query.platform) ? query.platform : undefined;
  const raw = Array.isArray(query.capability)
    ? query.capability
    : query.capability
      ? [query.capability]
      : [];
  const requested = [
    ...new Set(
      raw.filter((c): c is Capability =>
        capabilities.includes(c as Capability),
      ),
    ),
  ];
  const notice =
    typeof query.notice === "string"
      ? connectionMessages[query.notice]
      : undefined;
  const accounts = organization
    ? await listConnections(user.id, organization.id)
    : [];
  const connection =
    typeof query.connection === "string"
      ? accounts.find((a) => a.id === query.connection)
      : undefined;
  if (query.connection && !connection) notFound();
  const availability = Object.fromEntries(
    platforms.map((p) => [p, platformPolicy(p).ready]),
  ) as Record<(typeof platforms)[number], boolean>;
  const reusable = requested.length
    ? accounts.filter((a) =>
        requested.every(
          (c) => capabilityDecision(a, c, platformPolicy(a.platform)).allowed,
        ),
      )
    : [];
  return (
    <>
      <PageHeader
        eyebrow="CONNECTED ACCOUNTS"
        title={connection ? "Review your connection" : "Add a social account"}
        description="Choose a platform. Review access. Return to your work."
      />
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {!organization ? (
        <EmptyState
          title="Choose a workspace first"
          description="Your connected accounts are shared only with this workspace."
          href="/organizations"
          label="Choose or create workspace"
        />
      ) : !membership || !can(membership.role, "connections:manage") ? (
        <section className="panel form-panel">
          <h2>Ask your Owner or Admin</h2>
          <p className="muted">
            Only workspace Owners and Admins can manage social connections.
          </p>
          <Link className="button secondary" href={returnTo}>
            Return to your workflow
          </Link>
        </section>
      ) : (
        <ConnectionWizard
          reusable={reusable}
          organizationId={organization.id}
          returnTo={returnTo}
          requested={requested}
          initialPlatform={connection?.platform ?? selected}
          connection={connection}
          availability={availability}
        />
      )}
    </>
  );
}
