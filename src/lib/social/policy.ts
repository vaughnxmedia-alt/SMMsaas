import { capabilities, type Capability, type ConnectionState } from "./catalog";
import type {
  CapabilitySupport,
  ConnectionSummary,
  PlatformConnector,
} from "./contracts";
export const unknownSupport: CapabilitySupport = Object.fromEntries(
  capabilities.map((c) => [c, "unknown"]),
) as CapabilitySupport;
export function permittedCapabilities(
  connector: PlatformConnector,
  grantedScopes: readonly string[],
): Capability[] {
  return capabilities.filter(
    (c) =>
      connector.app.configured &&
      connector.support[c] === "supported" &&
      connector.app.approvedCapabilities.includes(c) &&
      connector.scopes[c].length > 0 &&
      connector.scopes[c].every((scope) => grantedScopes.includes(scope)),
  );
}
export function capabilityDecision(
  connection: ConnectionSummary,
  capability: Capability,
  policy: {
    ready: boolean;
    support: CapabilitySupport;
    approved: readonly Capability[];
  },
  now = Date.now(),
): { allowed: boolean; reason: string } {
  if (!policy.ready)
    return {
      allowed: false,
      reason: "Authorization is not available for this platform yet.",
    };
  if (policy.support[capability] !== "supported")
    return {
      allowed: false,
      reason: "This feature is not supported by this connector.",
    };
  if (!policy.approved.includes(capability))
    return {
      allowed: false,
      reason: "This feature is awaiting platform approval.",
    };
  if (!["CONNECTED", "LIMITED_ACCESS"].includes(connection.state))
    return {
      allowed: false,
      reason: "Reconnect this account to review access.",
    };
  if (
    connection.tokenExpiresAt &&
    new Date(connection.tokenExpiresAt).getTime() <= now
  )
    return {
      allowed: false,
      reason: "Access has expired. Reconnect this account.",
    };
  if (!connection.grantedCapabilities.includes(capability))
    return { allowed: false, reason: "Review access to allow this feature." };
  return { allowed: true, reason: "Access granted" };
}
export type ConnectionEvent =
  | "START"
  | "AUTHORIZED"
  | "PARTIAL"
  | "FAIL"
  | "EXPIRE"
  | "REVOKE"
  | "DISCONNECT"
  | "UNAVAILABLE";
const transitions: Record<
  ConnectionEvent,
  { from: ConnectionState[]; to: ConnectionState }
> = {
  START: {
    from: ["NOT_CONNECTED", "NEEDS_ATTENTION", "LIMITED_ACCESS", "CONNECTED"],
    to: "CONNECTING",
  },
  AUTHORIZED: { from: ["CONNECTING"], to: "CONNECTED" },
  PARTIAL: { from: ["CONNECTING"], to: "LIMITED_ACCESS" },
  FAIL: { from: ["CONNECTING"], to: "NEEDS_ATTENTION" },
  EXPIRE: { from: ["CONNECTED", "LIMITED_ACCESS"], to: "NEEDS_ATTENTION" },
  REVOKE: {
    from: ["CONNECTED", "LIMITED_ACCESS", "CONNECTING"],
    to: "NEEDS_ATTENTION",
  },
  DISCONNECT: {
    from: [
      "CONNECTED",
      "LIMITED_ACCESS",
      "NEEDS_ATTENTION",
      "CONNECTING",
      "UNSUPPORTED",
      "NOT_CONNECTED",
    ],
    to: "NOT_CONNECTED",
  },
  UNAVAILABLE: {
    from: ["NOT_CONNECTED", "CONNECTING", "NEEDS_ATTENTION"],
    to: "UNSUPPORTED",
  },
};
export function transition(
  state: ConnectionState,
  event: ConnectionEvent,
): ConnectionState {
  const rule = transitions[event];
  if (!rule.from.includes(state))
    throw new Error(`Invalid connection transition: ${state} → ${event}`);
  return rule.to;
}

export function effectiveState(
  state: ConnectionState,
  expiresAt: Date | null,
  now = Date.now(),
): ConnectionState {
  return ["CONNECTED", "LIMITED_ACCESS"].includes(state) &&
    expiresAt &&
    expiresAt.getTime() <= now
    ? "NEEDS_ATTENTION"
    : state;
}
