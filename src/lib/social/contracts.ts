import type { Capability, ConnectionState, Platform } from "./catalog";
export type CapabilitySupport = Record<
  Capability,
  "supported" | "unsupported" | "unknown"
>;
export type ConnectionSummary = {
  id: string;
  platform: Platform;
  accountName: string;
  state: ConnectionState;
  grantedCapabilities: Capability[];
  tokenExpiresAt: string | null;
  revocationState: "NONE" | "REVOKED" | "MANUAL_REQUIRED";
};
export type TokenSet = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  grantedScopes: string[];
};
export type ProviderIdentity = { id: string; name: string };
/** Server-only adapter contract. No implementation is registered in this release. */
export interface PlatformConnector {
  platform: Platform;
  support: CapabilitySupport; // What the selected provider API actually supports.
  app: {
    configured: boolean;
    approvedCapabilities: Capability[];
    approvalRevision: string;
  };
  authorizationOrigin: string;
  identityScopes: readonly string[];
  scopes: Record<Capability, readonly string[]>; // No scopes are inferred from user-facing labels.
  pkce: "S256";
  authorizationUrl(input: {
    state: string;
    redirectUri: string;
    scopes: string[];
    codeChallenge: string;
  }): URL;
  exchangeCode(input: {
    code: string;
    redirectUri: string;
    codeVerifier: string;
  }): Promise<TokenSet>;
  identify(tokens: TokenSet): Promise<ProviderIdentity>;
  revoke(tokens: TokenSet): Promise<void>;
  // Future tool implementations must also call the shared server-side account guard.
}
export interface SocialOperations {
  publish?: (input: {
    connectionId: string;
    text: string;
  }) => Promise<{ providerPostId: string }>;
  readComments?: (input: {
    connectionId: string;
    cursor?: string;
  }) => Promise<unknown>;
  replyComments?: (input: {
    connectionId: string;
    commentId: string;
    text: string;
  }) => Promise<unknown>;
  readMessages?: (input: {
    connectionId: string;
    cursor?: string;
  }) => Promise<unknown>;
  sendPermittedReplies?: (input: {
    connectionId: string;
    conversationId: string;
    text: string;
  }) => Promise<unknown>;
  analytics?: (input: {
    connectionId: string;
    from: Date;
    to: Date;
  }) => Promise<unknown>;
}
