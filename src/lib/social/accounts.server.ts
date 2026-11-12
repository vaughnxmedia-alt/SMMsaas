import { db } from "../db";
import { authorize, AccessError } from "../services";
import { capabilities, type Capability, type Platform } from "./catalog";
import type { ConnectionSummary } from "./contracts";
import { getConnector } from "./registry.server";
import {
  capabilityDecision,
  permittedCapabilities,
  effectiveState,
  unknownSupport,
} from "./policy";
export const publicConnectionSelect = {
  id: true,
  platform: true,
  accountName: true,
  state: true,
  grantedCapabilities: true,
  tokenExpiresAt: true,
  revocationState: true,
} as const;
export async function listConnections(
  userId: string,
  organizationId: string,
): Promise<ConnectionSummary[]> {
  await authorize(userId, organizationId, "read");
  const records = await db.socialConnection.findMany({
    where: { organizationId },
    select: publicConnectionSelect,
    orderBy: { createdAt: "asc" },
  });
  return records.map((c) => ({
    ...c,
    state: effectiveState(c.state, c.tokenExpiresAt),
    tokenExpiresAt: c.tokenExpiresAt?.toISOString() ?? null,
    grantedCapabilities: c.grantedCapabilities.filter((v): v is Capability =>
      capabilities.includes(v as Capability),
    ),
  }));
}
export function platformPolicy(platform: Platform) {
  const connector = getConnector(platform);
  return {
    ready: Boolean(connector?.app.configured),
    support: connector?.support ?? unknownSupport,
    approved: connector?.app.approvedCapabilities ?? [],
  };
}
// Recheck membership and grants for EVERY future tool operation. Selection is never authorization.
export async function requireConnection(
  userId: string,
  organizationId: string,
  connectionId: string,
  capability: Capability,
) {
  await authorize(
    userId,
    organizationId,
    ["publish", "replyComments", "sendPermittedReplies"].includes(capability)
      ? "brand:write"
      : "read",
  );
  const record = await db.socialConnection.findUnique({
    where: { id: connectionId, organizationId },
    select: {
      ...publicConnectionSelect,
      grantedScopes: true,
      encryptedTokens: true,
    },
  });
  if (!record || !record.encryptedTokens) throw new AccessError();
  const connector = getConnector(record.platform);
  if (!connector) throw new AccessError();
  const effective = permittedCapabilities(connector, record.grantedScopes);
  const summary: ConnectionSummary = {
    ...record,
    tokenExpiresAt: record.tokenExpiresAt?.toISOString() ?? null,
    grantedCapabilities: record.grantedCapabilities.filter(
      (c): c is Capability => effective.includes(c as Capability),
    ),
  };
  if (
    !capabilityDecision(summary, capability, platformPolicy(record.platform))
      .allowed
  )
    throw new AccessError();
  // Return only the public projection, never the raw record or credentials.
  return {
    id: summary.id,
    platform: summary.platform,
    accountName: summary.accountName,
    state: summary.state,
    grantedCapabilities: summary.grantedCapabilities,
    tokenExpiresAt: summary.tokenExpiresAt,
    revocationState: summary.revocationState,
  };
}
