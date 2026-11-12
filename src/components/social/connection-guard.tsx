import Link from "next/link";
import { Link2, ShieldCheck } from "lucide-react";
import { connectionHref, type Capability } from "@/lib/social/catalog";
import { listConnections, platformPolicy } from "@/lib/social/accounts.server";
import { capabilityDecision } from "@/lib/social/policy";
export async function ConnectionGuard({
  userId,
  organizationId,
  returnTo,
  required,
  canManage,
  local = false,
}: {
  userId: string;
  organizationId?: string;
  returnTo: string;
  required: Capability[];
  canManage: boolean;
  local?: boolean;
}) {
  const accounts = organizationId
    ? await listConnections(userId, organizationId)
    : [];
  const ready = accounts.filter((a) =>
    required.every(
      (c) => capabilityDecision(a, c, platformPolicy(a.platform)).allowed,
    ),
  );
  const needsAccount = required.length > 0 && !ready.length;
  return (
    <section className="panel tool-connection">
      <span className="empty-icon">
        {needsAccount ? <Link2 size={25} /> : <ShieldCheck size={25} />}
      </span>
      <div>
        <h2>
          {!organizationId
            ? "Choose a workspace first"
            : needsAccount
              ? "Add an account when you’re ready"
              : required.length
                ? "Use your connected accounts"
                : "Start without connecting"}
        </h2>
        <p className="muted">
          {!organizationId
            ? "Accounts are shared only within their workspace."
            : needsAccount
              ? "Choose a platform and review access. No social passwords are entered in Juss CMS."
              : required.length
                ? `${ready.length} account${ready.length === 1 ? "" : "s"} available for this tool. You won’t need to reconnect.`
                : "This tool won’t require a social account. Your brands and workspace are ready to use now."}
        </p>
        {organizationId && (
          <p className="tool-boundary">
            {local
              ? "Local tool features are still coming soon. Brand profiles are available now."
              : "Account access doesn’t enable this module yet. Its tools are still coming soon."}
          </p>
        )}
        <div className="connection-actions">
          {!organizationId ? (
            <Link className="button primary" href="/organizations">
              Choose or create workspace
            </Link>
          ) : canManage ? (
            <Link
              href={
                ready.length
                  ? "/settings/connections"
                  : connectionHref(returnTo, required)
              }
              className="button primary"
            >
              <Link2 size={14} />
              {ready.length ? "Manage accounts" : "Add Account"}
            </Link>
          ) : (
            <Link href="/settings/connections" className="button secondary">
              Review accounts
            </Link>
          )}
          <Link className="button secondary" href="/brands">
            {local
              ? "Continue with brand profiles"
              : "Skip for now · work on brands"}
          </Link>
        </div>
        {organizationId && !canManage && (
          <p className="muted permission-note">
            Ask a workspace Owner or Admin to add or reconnect an account.
          </p>
        )}
      </div>
    </section>
  );
}
