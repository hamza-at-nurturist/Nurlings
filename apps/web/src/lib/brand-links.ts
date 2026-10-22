import { brand } from "@nurlings/brand";

type StoreUrls = Pick<typeof brand.urls, "iosApp" | "androidApp">;

/**
 * The mobile app download for this device, or `null` when no store listing is configured, in
 * which case the UI shows no "Get the mobile app" entry rather than a dead link.
 */
export function mobileAppUrl(userAgent: string, urls: StoreUrls = brand.urls): string | null {
  return (/Android/i.test(userAgent) ? urls.androidApp : urls.iosApp) ?? null;
}

/** Documentation lives on the product site until dedicated pages exist. */
export const DOCS_URL = brand.urls.site;
