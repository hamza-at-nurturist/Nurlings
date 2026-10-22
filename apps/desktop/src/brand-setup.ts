// Loaded by scripts/copy-static.mjs in plain Node (type stripping), so this module imports only
// the brand package's self-contained subpaths and has no sibling imports.
import brandData from "@nurlings/brand/brand.json" with { type: "json" };
import { parseBrand } from "@nurlings/brand/schema";
import { brandProduct } from "@nurlings/brand/text";

const brand = parseBrand(brandData);
type SetupBrand = Pick<typeof brand, "name" | "urls">;
type SetupColors = Pick<typeof brand, "colors">;

/**
 * The setup window is static markup and script copied into `dist`. Upstream's files stay
 * untouched; the brand is applied while copying them. A pattern that no longer matches throws, so
 * an upstream change cannot silently ship the old name or the hosted-cloud option.
 */
const CLOUD_CHOICE = /[ \t]*<label class="choice" for="mode-cloud">[\s\S]*?<\/label>\n\n?/;
const NEW_CHOICE = '<input id="mode-new" type="radio" name="mode" value="new" />';
const EXAMPLE_HOST = "rakazo.example.com";
const HEADING = '<h1 class="heading">';
/** The still mark `scripts/copy-static.mjs` writes next to the animation, for reduced motion. */
export const SETUP_STATIC_LOGO = "mark.svg";
/** The intro animation above the heading, from the `intro.svg` that `scripts/copy-static.mjs` copies. */
export const SETUP_LOGO =
  '<img class="logo" src="intro.svg" alt="" width="132" height="76" />\n      ';

function renamed(text: string, identity: SetupBrand): string {
  return brandProduct(text, identity).replaceAll(
    EXAMPLE_HOST,
    `${identity.name.toLowerCase()}.example.com`,
  );
}

export function brandSetupHtml(html: string, identity: SetupBrand = brand): string {
  let result = html;
  if (identity.urls.cloud === null) {
    // No hosted service: drop its choice and make the first remaining choice the default.
    if (!CLOUD_CHOICE.test(result)) {
      throw new Error("Cannot brand setup.html: the hosted-cloud choice was not found.");
    }
    if (!result.includes(NEW_CHOICE)) {
      throw new Error("Cannot brand setup.html: the 'This computer' choice was not found.");
    }
    result = result
      .replace(CLOUD_CHOICE, "")
      .replace(NEW_CHOICE, NEW_CHOICE.replace(" />", " checked />"));
  }
  if (!result.includes(HEADING)) {
    throw new Error("Cannot brand setup.html: the heading was not found.");
  }
  const branded = renamed(result.replace(HEADING, `${SETUP_LOGO}${HEADING}`), identity);
  if (/Rakazo/.test(branded) || branded.includes(EXAMPLE_HOST)) {
    throw new Error("Cannot brand setup.html: upstream text remains after the rewrite.");
  }
  return branded;
}

export function brandSetupScript(script: string, identity: SetupBrand = brand): string {
  const branded = renamed(script, identity);
  if (/Rakazo/.test(branded)) {
    throw new Error("Cannot brand setup.js: upstream text remains after the rewrite.");
  }
  return branded;
}

/**
 * Spacing and the navy plate for the logo, so the animation's white blob reads on any theme.
 * Upstream's stylesheet stays untouched and the window allows no inline style.
 */
export function brandSetupStyles(css: string, identity: SetupColors = brand): string {
  return (
    `${css.trimEnd()}\n\n.logo {\n  display: block;\n  align-self: flex-start;\n  box-sizing: content-box;\n` +
    `  margin: 0 0 18px;\n  padding: 14px 18px;\n  border-radius: 26px;\n  background: ${identity.colors.iconBackground};\n}\n\n` +
    // The animation's own media rule is not applied inside an image everywhere, so swap it here.
    `@media (prefers-reduced-motion: reduce) {\n  .logo {\n    content: url("${SETUP_STATIC_LOGO}");\n  }\n}\n`
  );
}
