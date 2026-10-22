import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import brandData from "../../../packages/brand/brand.json" with { type: "json" };
import { brandSetupHtml, brandSetupScript, brandSetupStyles } from "../src/brand-setup.ts";

// tsc only emits the TypeScript sources; the preload bridges and the setup
// window's static assets have to be copied into dist alongside them.
const STATIC_FILES = ["preload.cjs", "setup-preload.cjs", "setup.html", "setup.css", "setup.js"];
// The setup window shows the product name and, for upstream, a hosted-cloud choice; both are
// branded while copying so the files in src stay identical to upstream.
const BRANDED = {
  "setup.html": brandSetupHtml,
  "setup.js": brandSetupScript,
  "setup.css": brandSetupStyles,
};
const TOKENS_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../packages/ui-tokens/src/tokens.css",
);

const brandAsset = (relative) =>
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../packages/brand", relative);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

await mkdir(dist, { recursive: true });
await Promise.all([
  ...STATIC_FILES.map(async (file) => {
    const from = path.join(root, "src", file);
    const to = path.join(dist, file);
    const brand = BRANDED[file];
    if (brand) await writeFile(to, brand(await readFile(from, "utf8")));
    else await copyFile(from, to);
  }),
  copyFile(TOKENS_FILE, path.join(dist, "tokens.css")),
  copyFile(brandAsset(brandData.assets.introSvg), path.join(dist, "intro.svg")),
  copyFile(brandAsset(brandData.assets.markSvg), path.join(dist, "mark.svg")),
]);
