// Client-safe product metadata. No credentials, scopes, or provider API promises.
export const platforms = [
  "INSTAGRAM",
  "FACEBOOK",
  "TIKTOK",
  "YOUTUBE",
  "LINKEDIN",
  "X",
  "THREADS",
] as const;
export type Platform = (typeof platforms)[number];
export const capabilities = [
  "publish",
  "readComments",
  "replyComments",
  "readMessages",
  "sendPermittedReplies",
  "analytics",
] as const;
export type Capability = (typeof capabilities)[number];
export const capabilityLabels: Record<Capability, string> = {
  publish: "Publish content",
  readComments: "Read comments",
  replyComments: "Reply to comments",
  readMessages: "Read messages",
  sendPermittedReplies: "Send permitted replies",
  analytics: "View analytics",
};
export const platformInfo: Record<
  Platform,
  { name: string; mark: string; color: string; eligibility: string }
> = {
  INSTAGRAM: {
    name: "Instagram",
    mark: "IG",
    color: "#c96acb",
    eligibility: "Use a professional account (Business or Creator).",
  },
  FACEBOOK: {
    name: "Facebook",
    mark: "f",
    color: "#5099ff",
    eligibility: "Page features require permission to manage the Page.",
  },
  TIKTOK: {
    name: "TikTok",
    mark: "Tk",
    color: "#52d8df",
    eligibility:
      "Available tools depend on your account and TikTok’s approval.",
  },
  YOUTUBE: {
    name: "YouTube",
    mark: "▶",
    color: "#f87575",
    eligibility: "Use the Google account that manages your YouTube channel.",
  },
  LINKEDIN: {
    name: "LinkedIn",
    mark: "in",
    color: "#67a9e2",
    eligibility: "Organization features may require a Page administrator.",
  },
  X: {
    name: "X",
    mark: "𝕏",
    color: "#c6d2e4",
    eligibility: "Available tools depend on the access approved by X.",
  },
  THREADS: {
    name: "Threads",
    mark: "@",
    color: "#c4b2f5",
    eligibility: "Use the Threads profile you want to manage.",
  },
};
export function isPlatform(value: unknown): value is Platform {
  return platforms.includes(value as Platform);
}
export type Tool = {
  name: string;
  title: string;
  description: string;
  capabilities: Capability[];
  local: boolean;
};
export const tools: Record<string, Tool> = {
  "content-studio": {
    name: "Content Studio",
    title: "From a spark to a story.",
    description:
      "Draft and shape content for your brands. Connect an account later when you’re ready to publish.",
    capabilities: [],
    local: true,
  },
  "media-library": {
    name: "Media Library",
    title: "Every asset. In its element.",
    description:
      "Organize creative assets in one place. Social accounts won’t be required for local media.",
    capabilities: [],
    local: true,
  },
  "content-calendar": {
    name: "Content Calendar",
    title: "See the bigger picture.",
    description:
      "Plan your content locally. Add a social account when you want to schedule delivery.",
    capabilities: ["publish"],
    local: true,
  },
  publishing: {
    name: "Publishing",
    title: "Ready when you are.",
    description:
      "Send approved content to an authorized social account. Choose an account to see what it can publish.",
    capabilities: ["publish"],
    local: false,
  },
  "engagement-inbox": {
    name: "Engagement Inbox",
    title: "Keep the conversation going.",
    description:
      "Read and reply to supported comments and messages. Each action needs permission from the platform.",
    capabilities: ["readComments"],
    local: false,
  },
  "audience-intelligence": {
    name: "Audience Intelligence",
    title: "Know who’s listening.",
    description:
      "Understand your audience using insights your connected accounts permit you to access.",
    capabilities: ["analytics"],
    local: false,
  },
  "ai-script-studio": {
    name: "AI Script Studio",
    title: "Your next idea starts here.",
    description:
      "Shape scripts and captions in your brand’s voice. Social connections will be optional.",
    capabilities: [],
    local: true,
  },
  analytics: {
    name: "Analytics",
    title: "Find meaning in the momentum.",
    description:
      "Review the insights your social accounts make available. Connect an account to review access.",
    capabilities: ["analytics"],
    local: false,
  },
};
export const connectionStates = [
  "NOT_CONNECTED",
  "CONNECTING",
  "CONNECTED",
  "NEEDS_ATTENTION",
  "LIMITED_ACCESS",
  "UNSUPPORTED",
] as const;
export type ConnectionState = (typeof connectionStates)[number];
export const stateLabels: Record<ConnectionState, string> = {
  NOT_CONNECTED: "Not Connected",
  CONNECTING: "Connecting",
  CONNECTED: "Connected",
  NEEDS_ATTENTION: "Needs Attention",
  LIMITED_ACCESS: "Limited Access",
  UNSUPPORTED: "Unsupported",
};
export const stateHelp: Record<ConnectionState, string> = {
  NOT_CONNECTED: "Choose Add Account to get started.",
  CONNECTING: "Finish authorization on the platform, then return here.",
  CONNECTED:
    "The account is authorized. Review its permissions before choosing a tool.",
  NEEDS_ATTENTION:
    "Access may have expired or been removed. Reconnect to review access.",
  LIMITED_ACCESS:
    "Some permissions are missing. You can review access and request only what you need.",
  UNSUPPORTED:
    "This connection or feature is not available. Choose another account or continue locally.",
};
export function safeReturnTo(value: unknown): string {
  return typeof value === "string" &&
    [
      "/",
      "/dashboard",
      "/brands",
      "/settings",
      "/settings/connections",
      ...Object.keys(tools).map((k) => `/${k}`),
    ].includes(value)
    ? value
    : "/settings/connections";
}
export function connectionHref(
  returnTo: string,
  requested: Capability[] = [],
  platform?: Platform,
  connectionId?: string,
) {
  const params = new URLSearchParams({ returnTo: safeReturnTo(returnTo) });
  for (const cap of requested) params.append("capability", cap);
  if (platform) params.set("platform", platform);
  if (connectionId) params.set("connection", connectionId);
  return `/settings/connections/add?${params}`;
}
