import { brand } from "@nurlings/brand";
import type { DesktopSetup } from "@rakazo/contracts";
import type { AboutPanelOptionsOptions } from "electron";
import { normalizeServerUrl, RAKAZO_CLOUD_URL } from "./setup-config.js";

/**
 * A profile whose saved server is the upstream's hosted service must not reconnect to it. It is
 * discarded so setup opens again. Only applies while the brand has no hosted service of its own.
 */
export function isUpstreamCloudSetup(
  setup: DesktopSetup | null,
  urls: Pick<typeof brand.urls, "cloud"> = brand.urls,
): boolean {
  if (setup === null || urls.cloud !== null || setup.mode !== "existing") return false;
  const saved = normalizeServerUrl(setup.serverUrl);
  return saved !== null && saved === normalizeServerUrl(RAKAZO_CLOUD_URL);
}

/** What the system About panel shows: the product name, version and tagline. */
export function aboutPanelOptions(
  version: string,
  identity: Pick<typeof brand, "name" | "tagline"> = brand,
): AboutPanelOptionsOptions {
  return { applicationName: identity.name, applicationVersion: version, credits: identity.tagline };
}
