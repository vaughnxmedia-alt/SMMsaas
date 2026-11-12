# Social connection foundation

This is a local, self-hosted foundation, preserving the Phase 1 authentication, organizations, brands, role policy, desktop-first UI and PostgreSQL migration history. It does **not** enable real social APIs or publishing.

## Creator experience

Open any tool, read its purpose, and choose **Add Account** when social access is needed. The three-step wizard chooses a platform, explains account eligibility and the requested feature, then offers official authorization only when the provider is ready. A strict allowlist preserves the original tool. Users can skip setup, return to their workflow, or use the existing brand-profile tools. Local content/media/calendar/AI features remain coming soon; connection setup does not unlock those modules.

Settings → Connected Accounts is the shared organization-scoped account center. It contains Instagram, Facebook, TikTok, YouTube, LinkedIn, X, and Threads cards. No platform adapter is registered in this release, so all authorization buttons remain unavailable. Provider credentials cannot be entered through the UI. Setting an environment variable alone cannot enable a connector.

Owners and Admins manage accounts; Editors and Viewers can review account summaries. Every server operation checks membership again. Write-tool guards also require Editor, Admin or Owner access. Workspace selection cookies never authorize an operation. Social accounts belong to the organization and can be reused by its brands/tools; this foundation does not introduce additional per-brand social-account restrictions.

## Real, simulated, and deferred

| Area                                                                 | This release                                                                        |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Account center, wizard, return paths, skip paths, role checks        | Functional                                                                          |
| Organization-scoped schema, audit writes, encrypted token helpers    | Functional                                                                          |
| Shared state/capability policy, UI prompt and server operation guard | Functional                                                                          |
| OAuth start/callback/revocation orchestration                        | Implemented and exercised with isolated test adapters; production registry is empty |
| Connection-state preview                                             | Browser-memory simulation, visibly labeled; no database writes or provider requests |
| Provider authorization, token refresh and actual API calls           | Unavailable; require reviewed platform adapters, credentials and approvals          |
| Publishing, inbox, analytics, local drafting/media tools             | Future modules; no execution or invented metrics                                    |

No simulation is saved as a `SocialConnection`. No demo account is counted as connected. Integration tests create explicitly named test fixtures in the development database and remove them afterward.

## Capability contracts

`catalog.ts` contains client-safe labels and feature intent. `contracts.ts` defines the six capabilities: publishing, reading comments, replying to comments, reading messages, sending permitted replies, and analytics. The optional operation signatures are future contracts, not implemented API methods.

A provider adapter has three independent layers:

1. API support: `supported`, `unsupported`, or `unknown` for each feature. Unknown fails closed.
2. Developer-app approval: configured status, approval revision, and approved features. This is operator-maintained server configuration, never creator input.
3. Account grant: actual scopes returned by the provider, and features derived from those scopes. Requested scopes are never assumed granted.

A tool needs all three layers, a usable connection state, valid token lifetime, and an authorized workspace role. `requireConnection` re-evaluates current app policy and stored scopes, checks the organization and role, and returns a public projection. Future execution code must call this guard immediately before a server-only provider operation. Module-level prompts are onboarding UI, not authorization enforcement. For the inbox, the current onboarding prompt requests reading comments only; message and reply features must request their own capability at the point of use.

The wizard recognizes already usable accounts and offers a return path without another authorization. Missing access requests only identity plus the features chosen for that workflow. Reconnects are bound to the original provider account ID; a different identity cannot silently replace it. Organization/platform/provider-ID uniqueness reuses the record instead of duplicating it.

## Connection states

| State           | Meaning / recovery                                                        |
| --------------- | ------------------------------------------------------------------------- |
| Not Connected   | No usable grant; Add Account                                              |
| Connecting      | An authorization flow is in progress                                      |
| Connected       | Requested access granted; each tool still checks its capability           |
| Needs Attention | Failed, expired, or revoked access; reconnect                             |
| Limited Access  | Only some requested features granted; retain permitted features           |
| Unsupported     | Connector/feature unavailable; choose another account or continue locally |

`transition()` rejects impossible transitions such as Not Connected → Authorized without first entering Connecting. Starting an authorization creates an expiring attempt, never a fake provider account. A new account is persisted only after a server-side token exchange and verified provider identity. Expired saved tokens are presented as Needs Attention without changing the underlying audit history. No background lifecycle/refresh worker exists yet.

The state preview allows direct selection of all six states and selected transition buttons. Its Connected state is explicitly a simulated example and never satisfies the server guard.

## OAuth security design

- Only authenticated same-origin POST requests may start a flow. Owners/Admins are checked before an attempt is created and again before grants are saved.
- Start generates 256-bit random state and a separate S256 PKCE verifier. The database stores only the state hash, a verifier encrypted at rest, and the authenticated user/session/organization/provider binding. Attempts expire after ten minutes.
- The adapter must use HTTPS, its configured authorization origin, the exact canonical callback, the state, authorization-code response type and S256 PKCE challenge. Callbacks never use a request Host header to select the redirect URI.
- Callback handling rejects duplicate/malformed state parameters, expired/consumed attempts, wrong users/sessions/platforms, replay, denied access, and reconnect identity mismatches. Atomic consumption prevents two exchanges from a single attempt. Disconnect invalidates that platform’s outstanding attempts in the organization. A callback cannot save after its attempt has been invalidated.
- Access/refresh tokens and PKCE verifiers use AES-256-GCM with random nonces and authenticated tenant/provider context. Social credentials are independent of Better Auth login accounts. Public projections exclude encrypted credentials and raw scopes; no client props, action results or logs contain tokens.
- Successful callbacks restore the authorized organization and return to the allowlisted original tool. Recoverable failures offer a fresh wizard with the original return path. Callback responses use `no-store` and `no-referrer`; provider error descriptions are not echoed.
- Disconnect removes local grants and encrypted credentials in the same transaction as its audit record, immediately blocking tools. The server then requests provider revocation when an adapter exists. If it cannot, the saved record clearly requires removing Juss CMS in the provider’s app settings; local removal is not presented as successful provider revocation.

No social passwords, confidential client secrets, refresh tokens, developer IDs, webhook URLs, or OAuth scope editing are exposed to ordinary users. In an official hosted deployment, its operator owns app configuration and approval. Self-hosted operators would configure reviewed provider adapters on the server, not ask each creator to supply credentials.

### Future adapter release checklist

Before registering an adapter in `registry.server.ts`, verify official provider eligibility, exact capabilities/API version, approval and verification status, incremental scopes, PKCE support, confidential-client authentication, exact callback registration, account selection, token refresh behavior, permitted reply windows, and provider revocation semantics. The current scaffold requires S256 PKCE; providers with different protocols need an explicit reviewed extension rather than bypassing the proof checks. Do not infer API availability from the platform’s presence in the catalog.

Add a real adapter only after provider-specific integration tests and approval. There are no generic scraping or browser automation fallbacks.

For production also add provider-aware rate limits, refresh concurrency control, webhook signature/permission-change handling where applicable, log redaction for callback codes/state at the reverse proxy, and scheduled attempt cleanup. Periodically remove expired attempts; consumed verifiers are already cleared immediately. Keep the encryption key in a secret manager, back it up securely, and re-encrypt stored credentials through a controlled migration before rotating it. Losing the key requires reconnecting affected accounts. Never derive this key from the authentication secret.

## Operator setup and verification

Apply the new additive migration with `npm run db:migrate`. It creates `SocialConnection`, `SocialOAuthAttempt`, and related enums/indexes/foreign keys; it does not rewrite the foundation migration or touch existing user/brand records.

`SOCIAL_TOKEN_ENCRYPTION_KEY` is optional while providers are disabled. Before enabling an approved adapter, generate a separate 32-byte base64 key (`openssl rand -base64 32`) and store it server-side. The example environment file contains no usable key. No provider credentials are shipped.

```sh
npm run lint
npm run typecheck
npm test
npm run test:social       # PostgreSQL contract tests; no platform network calls
npm run test:migrations   # temporary database, replay migrations twice
npm run build
npm start                # separate terminal for HTTP tests
npm run test:integration  # authentication + Phase 1 + connection UI/routes
```

Tests cover state transitions, capability intersection, role/tenant isolation, encryption authentication and context binding, session-bound state, replay/expiry/denial, account reuse, disabled providers, public projections, disconnect and audit records. HTTP tests check the real unconfigured start route, origin rejection and invalid callbacks without pretending any provider works.

Design references: [OAuth security BCP, RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html), [S256 PKCE, RFC 7636](https://www.rfc-editor.org/rfc/rfc7636), [Meta Instagram platform](https://developers.facebook.com/docs/instagram-platform/), and [YouTube authorization](https://developers.google.com/youtube/v3/guides/authentication). These do not constitute approval of a Juss CMS provider app.
