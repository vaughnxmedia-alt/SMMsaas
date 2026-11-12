import { z } from "zod";
import { db } from "../db";
import { authorize, AccessError } from "../services";
import {
  capabilities,
  safeReturnTo,
  type Capability,
  type Platform,
} from "./catalog";
import type { PlatformConnector } from "./contracts";
import { getConnector } from "./registry.server";
import { permittedCapabilities, transition } from "./policy";
import { createOAuthProof, hashState, seal, unseal } from "./crypto.server";
export class ConnectionError extends Error {
  constructor(
    public code:
      | "unavailable"
      | "invalid-state"
      | "denied"
      | "failed"
      | "account-mismatch",
    public returnTo?: string,
  ) {
    super(code);
  }
}
export type OAuthActor = { userId: string; sessionId: string };
export const authorizationInput = z.object({
  organizationId: z.string().min(1).max(100),
  returnTo: z.string().max(100).optional(),
  capabilities: z.array(z.enum(capabilities)).max(6),
  connectionId: z.string().max(100).optional(),
});
const tokenSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  expiresAt: z.iso.datetime().optional(),
  grantedScopes: z.array(z.string().max(300)).max(100),
});
function ready(platform: Platform, adapter = getConnector(platform)) {
  if (
    !adapter ||
    adapter.platform !== platform ||
    !adapter.app.configured ||
    !adapter.app.approvalRevision ||
    adapter.pkce !== "S256"
  )
    throw new ConnectionError("unavailable");
  return adapter;
}
function callbackUri(platform: Platform) {
  const base = new URL(process.env.BETTER_AUTH_URL!);
  if (
    base.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(base.hostname)
  )
    throw new ConnectionError("unavailable");
  return new URL(
    `/api/social/${platform.toLowerCase()}/callback`,
    base.origin,
  ).toString();
}
// Adapter override is for server-side contract tests only; HTTP routes never accept one.
export async function beginAuthorization(
  actor: OAuthActor,
  platform: Platform,
  input: unknown,
  adapter?: PlatformConnector,
) {
  const data = authorizationInput.parse(input);
  await authorize(actor.userId, data.organizationId, "connections:manage");
  const connector = ready(platform, adapter);
  const requested = [...new Set(data.capabilities)];
  if (
    requested.some(
      (c) =>
        connector.support[c] !== "supported" ||
        !connector.app.approvedCapabilities.includes(c) ||
        !connector.scopes[c].length,
    )
  )
    throw new ConnectionError("unavailable");
  if (data.connectionId)
    await db.socialConnection.findUniqueOrThrow({
      where: {
        id: data.connectionId,
        organizationId: data.organizationId,
        platform,
      },
    });
  const scopes = [
    ...new Set([
      ...connector.identityScopes,
      ...requested.flatMap((c) => connector.scopes[c]),
    ]),
  ];
  const { state, verifier, challenge } = createOAuthProof();
  const stateHash = hashState(state);
  const uri = callbackUri(platform);
  const url = connector.authorizationUrl({
    state,
    redirectUri: uri,
    scopes,
    codeChallenge: challenge,
  });
  if (
    url.protocol !== "https:" ||
    url.origin !== connector.authorizationOrigin ||
    url.searchParams.get("state") !== state ||
    url.searchParams.get("redirect_uri") !== uri ||
    url.searchParams.get("code_challenge") !== challenge ||
    url.searchParams.get("code_challenge_method") !== "S256" ||
    url.searchParams.get("response_type") !== "code"
  )
    throw new ConnectionError("unavailable");
  await db.$transaction(async (tx) => {
    await authorize(
      actor.userId,
      data.organizationId,
      "connections:manage",
      tx,
    );
    await tx.socialOAuthAttempt.create({
      data: {
        stateHash,
        organizationId: data.organizationId,
        userId: actor.userId,
        sessionId: actor.sessionId,
        platform,
        connectionId: data.connectionId,
        returnTo: safeReturnTo(data.returnTo),
        requestedCapabilities: requested,
        requestedScopes: scopes,
        encryptedVerifier: seal({ verifier }, `oauth:${stateHash}`),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    await tx.activityLog.create({
      data: {
        organizationId: data.organizationId,
        userId: actor.userId,
        action: `Started ${platform} account authorization`,
      },
    });
  });
  return url;
}
export async function completeAuthorization(
  actor: OAuthActor,
  platform: Platform,
  query: URLSearchParams,
  adapter?: PlatformConnector,
) {
  const state = query.get("state");
  if (
    !state ||
    !/^[A-Za-z0-9_-]{43}$/.test(state) ||
    query.getAll("state").length !== 1 ||
    query.getAll("code").length > 1 ||
    query.getAll("error").length > 1
  )
    throw new ConnectionError("invalid-state");
  const attempt = await db.socialOAuthAttempt.findUnique({
    where: { stateHash: hashState(state) },
  });
  if (
    !attempt ||
    attempt.platform !== platform ||
    attempt.userId !== actor.userId ||
    attempt.sessionId !== actor.sessionId ||
    attempt.expiresAt <= new Date() ||
    attempt.consumedAt
  )
    throw new ConnectionError("invalid-state");
  await authorize(actor.userId, attempt.organizationId, "connections:manage");
  const connector = ready(platform, adapter);
  const used = await db.socialOAuthAttempt.updateMany({
    where: { id: attempt.id, consumedAt: null, expiresAt: { gt: new Date() } },
    data: { consumedAt: new Date() },
  });
  if (used.count !== 1) throw new ConnectionError("invalid-state");
  try {
    if (query.has("error")) throw new ConnectionError("denied");
    const code = query.get("code");
    if (!code || code.length > 4096) throw new ConnectionError("failed");
    const { verifier } = z
      .object({ verifier: z.string().min(43).max(128) })
      .parse(unseal(attempt.encryptedVerifier, `oauth:${attempt.stateHash}`));
    const tokens = tokenSchema.parse(
      await connector.exchangeCode({
        code,
        redirectUri: callbackUri(platform),
        codeVerifier: verifier,
      }),
    );
    const identity = z
      .object({
        id: z.string().min(1).max(300),
        name: z.string().min(1).max(300),
      })
      .parse(await connector.identify(tokens));
    const granted = permittedCapabilities(connector, tokens.grantedScopes);
    const status = transition(
      "CONNECTING",
      attempt.requestedCapabilities.every((c) =>
        granted.includes(c as Capability),
      )
        ? "AUTHORIZED"
        : "PARTIAL",
    );
    await db.$transaction(async (tx) => {
      await authorize(
        actor.userId,
        attempt.organizationId,
        "connections:manage",
        tx,
      );
      const active = await tx.socialOAuthAttempt.updateMany({
        where: { id: attempt.id, consumedAt: { not: null } },
        data: { encryptedVerifier: "" },
      });
      if (active.count !== 1) throw new ConnectionError("invalid-state");
      const existing = await tx.socialConnection.findUnique({
        where: {
          organizationId_platform_providerAccountId: {
            organizationId: attempt.organizationId,
            platform,
            providerAccountId: identity.id,
          },
        },
      });
      if (attempt.connectionId && existing?.id !== attempt.connectionId)
        throw new ConnectionError("account-mismatch");
      const context = `tokens:${attempt.organizationId}:${platform}:${identity.id}`;
      if (!tokens.refreshToken && existing?.encryptedTokens) {
        const previous = tokenSchema.parse(
          unseal(existing.encryptedTokens, context),
        );
        tokens.refreshToken = previous.refreshToken;
      }
      const data = {
        accountName: identity.name,
        state: status,
        grantedScopes: tokens.grantedScopes,
        grantedCapabilities: granted,
        encryptedTokens: seal(tokens, context),
        tokenExpiresAt: tokens.expiresAt ? new Date(tokens.expiresAt) : null,
        connectedAt: new Date(),
        disconnectedAt: null,
        revocationState: "NONE" as const,
      };
      await tx.socialConnection.upsert({
        where: {
          organizationId_platform_providerAccountId: {
            organizationId: attempt.organizationId,
            platform,
            providerAccountId: identity.id,
          },
        },
        create: {
          organizationId: attempt.organizationId,
          platform,
          providerAccountId: identity.id,
          ...data,
        },
        update: data,
      });
      await tx.activityLog.create({
        data: {
          organizationId: attempt.organizationId,
          userId: actor.userId,
          action: `Authorized ${platform} account “${identity.name}”${status === "LIMITED_ACCESS" ? " with limited access" : ""}`,
        },
      });
    });
    return {
      returnTo: safeReturnTo(attempt.returnTo),
      organizationId: attempt.organizationId,
    };
  } catch (error) {
    await db.activityLog.create({
      data: {
        organizationId: attempt.organizationId,
        userId: actor.userId,
        action: `${platform} authorization did not complete`,
      },
    });
    if (error instanceof ConnectionError) {
      error.returnTo = safeReturnTo(attempt.returnTo);
      throw error;
    }
    throw new ConnectionError("failed", safeReturnTo(attempt.returnTo));
  } finally {
    // Consumed rows keep their hash for replay detection, never their verifier.
    await db.socialOAuthAttempt.updateMany({
      where: { id: attempt.id },
      data: { encryptedVerifier: "" },
    });
  }
}
export async function disconnectAccount(
  actor: OAuthActor,
  organizationId: string,
  connectionId: string,
) {
  let remote:
    { platform: Platform; encrypted: string; context: string } | undefined;
  await db.$transaction(async (tx) => {
    await authorize(actor.userId, organizationId, "connections:manage", tx);
    const connection = await tx.socialConnection.findUnique({
      where: { id: connectionId, organizationId },
    });
    if (!connection) throw new AccessError();
    if (connection.encryptedTokens)
      remote = {
        platform: connection.platform,
        encrypted: connection.encryptedTokens,
        context: `tokens:${organizationId}:${connection.platform}:${connection.providerAccountId}`,
      };
    await tx.socialOAuthAttempt.deleteMany({
      where: { organizationId, platform: connection.platform },
    });
    await tx.socialConnection.update({
      where: { id: connectionId, organizationId },
      data: {
        state: transition(connection.state, "DISCONNECT"),
        encryptedTokens: null,
        grantedScopes: [],
        grantedCapabilities: [],
        tokenExpiresAt: null,
        disconnectedAt: new Date(),
        revocationState: remote
          ? "MANUAL_REQUIRED"
          : connection.revocationState,
      },
    });
    await tx.activityLog.create({
      data: {
        organizationId,
        userId: actor.userId,
        action: `Disconnected ${connection.platform} account from Juss CMS`,
      },
    });
  });
  if (!remote) return { manualRevocation: false };
  const { platform, encrypted, context } = remote;
  try {
    const adapter = ready(platform);
    await adapter.revoke(tokenSchema.parse(unseal(encrypted, context)));
    // Do not overwrite a concurrent reconnection.
    await db.socialConnection.updateMany({
      where: {
        id: connectionId,
        organizationId,
        state: "NOT_CONNECTED",
        encryptedTokens: null,
      },
      data: { revocationState: "REVOKED" },
    });
    return { manualRevocation: false };
  } catch {
    await db.activityLog.create({
      data: {
        organizationId,
        userId: actor.userId,
        action: `${platform} access removed locally; remove Juss CMS in the platform’s app settings to finish revocation`,
      },
    });
    return { manualRevocation: true };
  }
}
