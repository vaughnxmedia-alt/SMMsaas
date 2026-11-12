import Link from "next/link";
import { Link2, ArrowLeft, Plus, ShieldCheck } from "lucide-react";
import { workspaceContext } from "@/lib/session";
import { can } from "@/lib/permissions";
import {
  platforms,
  platformInfo,
  capabilityLabels,
  connectionHref,
  stateHelp,
} from "@/lib/social/catalog";
import { listConnections } from "@/lib/social/accounts.server";
import { connectionMessages } from "@/lib/social/messages";
import { PageHeader, EmptyState } from "@/components/ui";
import { ConnectionStatus } from "@/components/social/connection-status";
import { StatePreview } from "@/components/social/state-preview";
import { DisconnectForm } from "@/components/social/disconnect-form";
export default async function Connections({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { organization, membership, user } = await workspaceContext();
  const query = await searchParams;
  const notice =
    typeof query.notice === "string"
      ? connectionMessages[query.notice]
      : undefined;
  const accounts = organization
    ? await listConnections(user.id, organization.id)
    : [];
  const manage = Boolean(
    membership && can(membership.role, "connections:manage"),
  );
  return (
    <>
      <Link href="/settings" className="back-link">
        <ArrowLeft size={13} />
        Account settings
      </Link>
      <PageHeader
        eyebrow="SETTINGS / CONNECTED ACCOUNTS"
        title="Your accounts. One place."
        description="Connect once. Use the same authorized account across your workspace’s tools."
        action={
          organization &&
          manage && (
            <Link
              href={connectionHref("/settings/connections")}
              className="button primary"
            >
              <Plus size={16} />
              Add Account
            </Link>
          )
        }
      />
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {!organization ? (
        <EmptyState
          title="Start with a workspace"
          description="Social accounts belong to a workspace and are never shared across organizations."
          href="/organizations"
          label="Choose or create workspace"
        />
      ) : (
        <>
          <section className="connection-intro">
            <ShieldCheck size={23} />
            <div>
              <h2>{organization.name} · Connected Accounts</h2>
              <p>
                Official authorization is coming soon. No platforms are
                connected by this release. You can explore the setup flow
                without entering keys or social passwords.
              </p>
            </div>
            <span className="pill">FOUNDATION RELEASE</span>
          </section>
          {!manage && (
            <p className="notice">
              You can review accounts. Ask an Owner or Admin to add, reconnect,
              or disconnect one.
            </p>
          )}
          <div className="social-grid">
            {platforms.map((platform) => {
              const info = platformInfo[platform];
              const matches = accounts.filter((a) => a.platform === platform);
              return (
                <section className="panel social-card" key={platform}>
                  <div className="social-card-heading">
                    <span
                      className="platform-mark"
                      style={{ color: info.color }}
                    >
                      {info.mark}
                    </span>
                    <div>
                      <h2>{info.name}</h2>
                      <small className="muted">
                        {matches.length
                          ? `${matches.length} saved account${matches.length === 1 ? "" : "s"}`
                          : "No account added"}
                      </small>
                    </div>
                  </div>
                  {!matches.length ? (
                    <>
                      <ConnectionStatus state="NOT_CONNECTED" />
                      <p className="muted">{info.eligibility}</p>
                      <p className="capability-note">
                        Supported features will appear after the connector is
                        approved.
                      </p>
                      {manage && (
                        <Link
                          className="button secondary"
                          href={connectionHref(
                            "/settings/connections",
                            [],
                            platform,
                          )}
                        >
                          <Link2 size={14} />
                          Add Account
                        </Link>
                      )}
                    </>
                  ) : (
                    matches.map((account) => (
                      <article
                        key={account.id}
                        className="saved-social-account"
                      >
                        <h3>{account.accountName}</h3>
                        <ConnectionStatus state={account.state} />
                        <p className="muted">{stateHelp[account.state]}</p>
                        <details className="capability-review">
                          <summary>Review granted access</summary>
                          <ul>
                            {account.grantedCapabilities.length ? (
                              account.grantedCapabilities.map((c) => (
                                <li key={c}>{capabilityLabels[c]}</li>
                              ))
                            ) : (
                              <li>No feature permissions granted.</li>
                            )}
                          </ul>
                          <p className="muted">
                            Provider support and app approval are checked again
                            each time a tool runs.
                          </p>
                        </details>
                        {account.revocationState === "MANUAL_REQUIRED" && (
                          <p className="notice">
                            Also remove Juss CMS in {info.name}’s app settings
                            to finish revoking access.
                          </p>
                        )}
                        {manage && (
                          <>
                            <Link
                              className="button secondary"
                              href={connectionHref(
                                "/settings/connections",
                                account.grantedCapabilities,
                                platform,
                                account.id,
                              )}
                            >
                              {account.state === "NOT_CONNECTED"
                                ? "Reconnect account"
                                : "Reconnect / review access"}
                            </Link>
                            {account.state !== "NOT_CONNECTED" && (
                              <DisconnectForm
                                organizationId={organization.id}
                                connectionId={account.id}
                              />
                            )}
                          </>
                        )}
                      </article>
                    ))
                  )}
                </section>
              );
            })}
          </div>
          <StatePreview />
        </>
      )}
    </>
  );
}
