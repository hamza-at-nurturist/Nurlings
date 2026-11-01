import { stripeBillingConfigFromEnv } from "@rakazo/adapters";
import { describe, expect, it } from "vitest";

/**
 * Our deployments run without Stripe. Upstream gates every credit plan, own-connection charge and
 * computer allowance on billing being configured (`deps.billing`, `deploymentSettings
 * .modelCreditsEnabled`); these tests pin the one decision that switches them all on.
 */
describe("billing stays off without Stripe", () => {
  it("is not configured by empty or missing Stripe settings", () => {
    expect(stripeBillingConfigFromEnv({})).toBeUndefined();
    expect(
      stripeBillingConfigFromEnv({
        stripeSecretKey: "",
        stripeWebhookSecret: " ",
        stripePriceId: "",
      }),
    ).toBeUndefined();
  });
});
