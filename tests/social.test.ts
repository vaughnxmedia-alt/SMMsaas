import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { can } from "../src/lib/permissions";
import {
  capabilities,
  connectionHref,
  platforms,
  safeReturnTo,
} from "../src/lib/social/catalog";
import {
  capabilityDecision,
  permittedCapabilities,
  transition,
  unknownSupport,
  effectiveState,
} from "../src/lib/social/policy";
import {
  createOAuthProof,
  hashState,
  seal,
  unseal,
} from "../src/lib/social/crypto.server";
import { getConnector } from "../src/lib/social/registry.server";
import type {
  ConnectionSummary,
  PlatformConnector,
} from "../src/lib/social/contracts";
const connector: PlatformConnector = {
  platform: "INSTAGRAM",
  support: {
    ...unknownSupport,
    publish: "supported",
    readComments: "supported",
    analytics: "unsupported",
  },
  app: {
    configured: true,
    approvedCapabilities: ["publish", "readComments"],
    approvalRevision: "test-only",
  },
  authorizationOrigin: "https://provider.example",
  identityScopes: ["identity"],
  pkce: "S256",
  scopes: {
    publish: ["content.write"],
    readComments: ["comments.read"],
    replyComments: [],
    readMessages: [],
    sendPermittedReplies: [],
    analytics: [],
  },
  authorizationUrl: () => {
    throw new Error("Not used");
  },
  exchangeCode: async () => {
    throw new Error("Not used");
  },
  identify: async () => {
    throw new Error("Not used");
  },
  revoke: async () => {},
};
const account: ConnectionSummary = {
  id: "example",
  platform: "INSTAGRAM",
  accountName: "Unit fixture",
  state: "CONNECTED",
  grantedCapabilities: ["publish"],
  tokenExpiresAt: null,
  revocationState: "NONE",
};
describe("connection state machine", () => {
  it("shows expired credentials as needing attention without changing disconnected accounts", () => {
    assert.equal(effectiveState("CONNECTED", new Date(0)), "NEEDS_ATTENTION");
    assert.equal(effectiveState("NOT_CONNECTED", new Date(0)), "NOT_CONNECTED");
    assert.equal(effectiveState("CONNECTED", null), "CONNECTED");
  });
  it("requires authorization in progress before success", () => {
    assert.throws(() => transition("NOT_CONNECTED", "AUTHORIZED"));
    assert.equal(
      transition(transition("NOT_CONNECTED", "START"), "AUTHORIZED"),
      "CONNECTED",
    );
  });
  it("models partial grants, expiration, recovery and disconnection", () => {
    assert.equal(transition("CONNECTING", "PARTIAL"), "LIMITED_ACCESS");
    assert.equal(transition("LIMITED_ACCESS", "EXPIRE"), "NEEDS_ATTENTION");
    assert.equal(transition("NEEDS_ATTENTION", "START"), "CONNECTING");
    assert.equal(transition("CONNECTING", "FAIL"), "NEEDS_ATTENTION");
    assert.equal(transition("NEEDS_ATTENTION", "DISCONNECT"), "NOT_CONNECTED");
  });
  it("does not treat unsupported as authorized", () => {
    assert.equal(transition("NOT_CONNECTED", "UNAVAILABLE"), "UNSUPPORTED");
    assert.throws(() => transition("UNSUPPORTED", "AUTHORIZED"));
  });
});
describe("capability and role policy", () => {
  it("requires supported API, app approval and account-granted scope", () => {
    assert.deepEqual(permittedCapabilities(connector, ["content.write"]), [
      "publish",
    ]);
    assert.deepEqual(
      permittedCapabilities(
        { ...connector, app: { ...connector.app, approvedCapabilities: [] } },
        ["content.write"],
      ),
      [],
    );
    assert.deepEqual(
      permittedCapabilities({ ...connector, support: unknownSupport }, [
        "content.write",
      ]),
      [],
    );
  });
  it("fails closed for every unregistered provider", () => {
    for (const p of platforms) assert.equal(getConnector(p), undefined);
    for (const c of capabilities)
      assert.equal(
        capabilityDecision(account, c, {
          ready: false,
          support: connector.support,
          approved: ["publish"],
        }).allowed,
        false,
      );
  });
  it("reuses a valid grant and rejects expired, missing or unsupported grants", () => {
    const policy = {
      ready: true,
      support: connector.support,
      approved: connector.app.approvedCapabilities,
    };
    assert.equal(capabilityDecision(account, "publish", policy).allowed, true);
    assert.equal(
      capabilityDecision(
        { ...account, state: "LIMITED_ACCESS" },
        "publish",
        policy,
      ).allowed,
      true,
    );
    assert.equal(
      capabilityDecision(account, "readComments", policy).allowed,
      false,
    );
    assert.equal(
      capabilityDecision(
        { ...account, tokenExpiresAt: new Date(0).toISOString() },
        "publish",
        policy,
      ).allowed,
      false,
    );
    assert.equal(
      capabilityDecision(
        { ...account, state: "NEEDS_ATTENTION" },
        "publish",
        policy,
      ).allowed,
      false,
    );
    assert.equal(
      capabilityDecision(account, "analytics", policy).allowed,
      false,
    );
  });
  it("restricts connection management to Owners and Admins", () => {
    for (const role of ["OWNER", "ADMIN"] as const)
      assert.equal(can(role, "connections:manage"), true);
    for (const role of ["EDITOR", "VIEWER"] as const)
      assert.equal(can(role, "connections:manage"), false);
  });
});
describe("OAuth and credential primitives", () => {
  it("creates unpredictable state and S256 PKCE proofs", () => {
    const a = createOAuthProof(),
      b = createOAuthProof();
    assert.notEqual(a.state, b.state);
    assert.match(a.state, /^[A-Za-z0-9_-]{43}$/);
    assert.match(a.verifier, /^[A-Za-z0-9_-]{64}$/);
    assert.equal(
      a.challenge,
      Buffer.from(hashState(a.verifier), "hex").toString("base64url"),
    );
    assert.notEqual(hashState(a.state), a.state);
  });
  it("authenticates ciphertext, key and tenant context", () => {
    const key = randomBytes(32);
    const secret = {
      accessToken: "test-only-access",
      refreshToken: "test-only-refresh",
    };
    const encrypted = seal(secret, "org:a:instagram", key);
    assert.ok(!encrypted.includes(secret.accessToken));
    assert.deepEqual(unseal(encrypted, "org:a:instagram", key), secret);
    assert.throws(() => unseal(encrypted, "org:b:instagram", key));
    assert.throws(() => unseal(encrypted, "org:a:instagram", randomBytes(32)));
    const parts = encrypted.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    assert.throws(() => unseal(parts.join("."), "org:a:instagram", key));
  });
  it("blocks external and unrecognized return destinations", () => {
    for (const path of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/publishing?next=https://evil.example",
      "/api/auth/sign-out",
      null,
    ])
      assert.equal(safeReturnTo(path), "/settings/connections");
    assert.equal(safeReturnTo("/publishing"), "/publishing");
    assert.match(
      connectionHref("/analytics", ["analytics"]),
      /returnTo=%2Fanalytics/,
    );
  });
});
