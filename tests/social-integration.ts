import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { db } from "../src/lib/db";
import { createOrganization } from "../src/lib/services";
import {
  listConnections,
  requireConnection,
} from "../src/lib/social/accounts.server";
import {
  beginAuthorization,
  completeAuthorization,
  disconnectAccount,
} from "../src/lib/social/oauth.server";
import { hashState } from "../src/lib/social/crypto.server";
import { unknownSupport } from "../src/lib/social/policy";
import type { PlatformConnector } from "../src/lib/social/contracts";
async function main() {
  const suffix = randomBytes(8).toString("hex");
  const userId = `social-test-${suffix}`;
  const outsiderId = `social-outsider-${suffix}`;
  const sessionId = `social-session-${suffix}`;
  const orgs: string[] = [];
  const previousKey = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
  process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  const actor = { userId, sessionId };
  const adapter: PlatformConnector = {
    platform: "INSTAGRAM",
    support: {
      ...unknownSupport,
      publish: "supported",
      readComments: "supported",
    },
    app: {
      configured: true,
      approvedCapabilities: ["publish", "readComments"],
      approvalRevision: "TEST FIXTURE ONLY",
    },
    authorizationOrigin: "https://provider.example",
    pkce: "S256",
    identityScopes: ["identity"],
    scopes: {
      publish: ["content.write"],
      readComments: ["comments.read"],
      replyComments: [],
      readMessages: [],
      sendPermittedReplies: [],
      analytics: [],
    },
    authorizationUrl(input) {
      const url = new URL("https://provider.example/authorize");
      for (const [k, v] of Object.entries({
        state: input.state,
        redirect_uri: input.redirectUri,
        scope: input.scopes.join(" "),
        code_challenge: input.codeChallenge,
        code_challenge_method: "S256",
        response_type: "code",
      }))
        url.searchParams.set(k, v);
      return url;
    },
    async exchangeCode() {
      return {
        accessToken: "TEST-ONLY-ACCESS",
        refreshToken: "TEST-ONLY-REFRESH",
        grantedScopes: ["identity", "content.write"],
      };
    },
    async identify() {
      return { id: `provider-${suffix}`, name: "Test fixture only" };
    },
    async revoke() {},
  };
  try {
    await db.user.createMany({
      data: [
        {
          id: userId,
          name: "Social Test",
          email: `social-${suffix}@example.com`,
        },
        {
          id: outsiderId,
          name: "Outside Test",
          email: `outside-${suffix}@example.com`,
        },
      ],
    });
    await db.session.create({
      data: {
        id: sessionId,
        userId,
        token: randomBytes(32).toString("hex"),
        expiresAt: new Date(Date.now() + 600000),
      },
    });
    const org = await createOrganization(userId, {
      name: `Social test ${suffix}`,
    });
    orgs.push(org.id);
    const other = await createOrganization(outsiderId, {
      name: `Other social test ${suffix}`,
    });
    orgs.push(other.id);
    const input = {
      organizationId: org.id,
      returnTo: "/publishing",
      capabilities: ["publish", "readComments"],
    };
    await assert.rejects(() => beginAuthorization(actor, "INSTAGRAM", input));
    assert.equal(
      await db.socialOAuthAttempt.count({ where: { organizationId: org.id } }),
      0,
    );
    await assert.rejects(() => listConnections(outsiderId, org.id));
    for (const role of ["VIEWER", "EDITOR"] as const) {
      await db.organizationMember.upsert({
        where: {
          organizationId_userId: { organizationId: org.id, userId: outsiderId },
        },
        create: { organizationId: org.id, userId: outsiderId, role },
        update: { role },
      });
      await assert.rejects(() =>
        beginAuthorization(
          { userId: outsiderId, sessionId },
          "INSTAGRAM",
          input,
          adapter,
        ),
      );
    }
    const url = await beginAuthorization(actor, "INSTAGRAM", input, adapter);
    const state = url.searchParams.get("state")!;
    const query = new URLSearchParams({ state, code: "test-code" });
    const attempt = await db.socialOAuthAttempt.findUniqueOrThrow({
      where: { stateHash: hashState(state) },
    });
    assert.ok(!attempt.encryptedVerifier.includes("test-code"));
    assert.equal(attempt.returnTo, "/publishing");
    assert.deepEqual(attempt.requestedScopes, [
      "identity",
      "content.write",
      "comments.read",
    ]);
    await assert.rejects(() =>
      completeAuthorization(
        { ...actor, sessionId: "different-session" },
        "INSTAGRAM",
        query,
        adapter,
      ),
    );
    await assert.rejects(() =>
      completeAuthorization(actor, "FACEBOOK", query, adapter),
    );
    await assert.rejects(() =>
      completeAuthorization(
        actor,
        "INSTAGRAM",
        new URLSearchParams(`state=${state}&state=${state}&code=test`),
        adapter,
      ),
    );
    const result = await completeAuthorization(
      actor,
      "INSTAGRAM",
      query,
      adapter,
    );
    assert.equal(result.returnTo, "/publishing");
    await assert.rejects(() =>
      completeAuthorization(actor, "INSTAGRAM", query, adapter),
    );
    const saved = await db.socialConnection.findFirstOrThrow({
      where: { organizationId: org.id },
    });
    assert.equal(saved.state, "LIMITED_ACCESS");
    assert.deepEqual(saved.grantedCapabilities, ["publish"]);
    assert.ok(
      saved.encryptedTokens && !saved.encryptedTokens.includes("TEST-ONLY"),
    );
    const summaries = await listConnections(userId, org.id);
    assert.ok(!JSON.stringify(summaries).includes("encryptedTokens"));
    assert.ok(!JSON.stringify(summaries).includes("TEST-ONLY"));
    assert.equal(
      (
        await db.socialOAuthAttempt.findUniqueOrThrow({
          where: { id: attempt.id },
        })
      ).encryptedVerifier,
      "",
    );
    await assert.rejects(() =>
      requireConnection(userId, org.id, saved.id, "publish"),
    ); // Registry is still disabled, even for a granted fixture.
    await assert.rejects(() =>
      disconnectAccount({ userId: outsiderId, sessionId }, org.id, saved.id),
    );
    await assert.rejects(() => disconnectAccount(actor, other.id, saved.id));
    const again = await beginAuthorization(
      actor,
      "INSTAGRAM",
      { ...input, capabilities: ["publish"], connectionId: saved.id },
      adapter,
    );
    const next = await completeAuthorization(
      actor,
      "INSTAGRAM",
      new URLSearchParams({
        state: again.searchParams.get("state")!,
        code: "test-code",
      }),
      adapter,
    );
    assert.equal(next.returnTo, "/publishing");
    assert.equal(
      await db.socialConnection.count({ where: { organizationId: org.id } }),
      1,
    );
    const expired = await beginAuthorization(
      actor,
      "INSTAGRAM",
      input,
      adapter,
    );
    const expiredState = expired.searchParams.get("state")!;
    await db.socialOAuthAttempt.update({
      where: { stateHash: hashState(expiredState) },
      data: { expiresAt: new Date(0) },
    });
    await assert.rejects(() =>
      completeAuthorization(
        actor,
        "INSTAGRAM",
        new URLSearchParams({ state: expiredState, code: "test-code" }),
        adapter,
      ),
    );
    const denied = await beginAuthorization(actor, "INSTAGRAM", input, adapter);
    await assert.rejects(() =>
      completeAuthorization(
        actor,
        "INSTAGRAM",
        new URLSearchParams({
          state: denied.searchParams.get("state")!,
          error: "access_denied",
        }),
        adapter,
      ),
    );
    const pending = await beginAuthorization(
      actor,
      "INSTAGRAM",
      input,
      adapter,
    );
    const removed = await disconnectAccount(actor, org.id, saved.id);
    assert.equal(removed.manualRevocation, true);
    await assert.rejects(() =>
      completeAuthorization(
        actor,
        "INSTAGRAM",
        new URLSearchParams({
          state: pending.searchParams.get("state")!,
          code: "test-code",
        }),
        adapter,
      ),
    );
    const disconnected = await db.socialConnection.findUniqueOrThrow({
      where: { id: saved.id },
    });
    assert.equal(disconnected.encryptedTokens, null);
    assert.equal(disconnected.state, "NOT_CONNECTED");
    assert.deepEqual(disconnected.grantedCapabilities, []);
    const logs = await db.activityLog.findMany({
      where: { organizationId: org.id },
    });
    assert.ok(logs.some((l) => l.action.includes("Disconnected")));
    assert.ok(!JSON.stringify(logs).includes("TEST-ONLY-ACCESS"));
    console.log(
      "PASS: disabled providers, role/tenant isolation, session-bound one-use state, expiry/denial, partial grants, encrypted storage, safe projections, account reuse, disconnect and audit.",
    );
  } finally {
    await db.organization.deleteMany({ where: { id: { in: orgs } } });
    await db.user.deleteMany({ where: { id: { in: [userId, outsiderId] } } });
    if (previousKey === undefined)
      delete process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
    else process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = previousKey;
    await db.$disconnect();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
