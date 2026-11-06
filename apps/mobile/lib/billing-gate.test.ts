import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const mobileRoot = path.resolve(import.meta.dirname, "..");
const read = (file: string) =>
  readFileSync(path.join(mobileRoot, file), "utf8").replace(/\s+/g, " ");

/**
 * With no Stripe the server reports `billingEnabled: false`, and the app must then show no
 * paywall, plan or credit entry. Both ways in are behind that flag.
 */
describe("mobile billing entries follow the server's billingEnabled flag", () => {
  it("only opens the paywall after the server says billing is on", () => {
    const home = read("app/index.tsx");
    // Billing off forgets referrals; only the billing-on branch reads status and may open the paywall.
    const gate = home.indexOf("if (!nextMe.billingEnabled) forgetReferrals(); else {");
    const paywall = home.indexOf('router.push("/paywall")');
    expect(gate).toBeGreaterThan(-1);
    expect(paywall).toBeGreaterThan(gate);
  });

  it("only lists Billing in account settings when billing is on", () => {
    expect(read("app/(settings)/account.tsx")).toContain("{me?.billingEnabled ? (");
  });
});
