import { ApiTokenAuth } from "./api-token.js";
import type { AuthStrategy } from "../types/index.js";

export interface ResolvedAuth {
  auth: AuthStrategy;
  apiUrl: string;
  tenantSlug: string;
}

// Hosts a credential may be sent to: StandShare's own domain, and loopback for
// local development. Anything else is refused before a credential is read.
const STANDSHARE_DOMAIN = "standshare.app";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isStandShareHost(hostname: string): boolean {
  return (
    hostname === STANDSHARE_DOMAIN ||
    hostname.endsWith(`.${STANDSHARE_DOMAIN}`) ||
    LOOPBACK_HOSTS.has(hostname)
  );
}

/**
 * Resolve how to reach the StandShare API from an environment.
 *
 * Takes the environment as a parameter (callers pass `process.env`) so tests
 * can exercise every branch without touching the real one.
 *
 * The host check runs first, before the tenant slug and before any credential
 * is read: an API key or password configured against a host StandShare does not
 * run would be handed to whoever does run it.
 */
export function resolveAuth(env: NodeJS.ProcessEnv): ResolvedAuth {
  const apiUrl = env.STANDSHARE_API_URL;
  if (!apiUrl) throw new Error("STANDSHARE_API_URL is required");

  let hostname: string;
  try {
    hostname = new URL(apiUrl).hostname;
  } catch {
    throw new Error("STANDSHARE_API_URL is not a valid URL. Use https://api.standshare.app.");
  }

  if (!isStandShareHost(hostname)) {
    throw new Error(
      `STANDSHARE_API_URL points at "${hostname}", which is not a StandShare host. ` +
        "Use https://api.standshare.app. " +
        "StandShare does not own standshare.com, the address older versions of the README showed. " +
        "If an API key was ever used with this address, revoke it at /admin/org-settings/api-keys " +
        "and create a new one; if you signed in with an email and password, change that password."
    );
  }

  const tenantSlug = env.STANDSHARE_TENANT_SLUG;
  if (!tenantSlug) throw new Error("STANDSHARE_TENANT_SLUG is required");

  const apiToken = env.STANDSHARE_API_TOKEN;
  if (apiToken) return { auth: new ApiTokenAuth(apiToken), apiUrl, tenantSlug };

  throw new Error(
    "STANDSHARE_API_TOKEN is required. Email/password sign-in was removed in 1.0.1. " +
      "Create an API key in StandShare at /admin/org-settings/api-keys."
  );
}
