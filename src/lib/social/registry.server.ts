import type { Platform } from "./catalog";
import type { PlatformConnector } from "./contracts";
// Intentionally empty. Adding environment variables alone cannot enable a provider.
// A reviewed implementation, configured app and verified approvals are all required.
const connectors: Readonly<Partial<Record<Platform, PlatformConnector>>> =
  Object.freeze({});
export function getConnector(platform: Platform) {
  return connectors[platform];
}
