import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { BrandCheck } from "./guard.js";
import { parseBrand } from "./schema.js";

/**
 * Static checks over repository files. They read text only, so they run in plain Node (no app
 * imports) and fail with the offending file and line. Behaviour that needs an app's own code
 * (compiled catalogs, the resolved Expo config, desktop packaging) is covered by the vitest
 * suites listed in `brand-tests.ts`.
 */

async function loadBrand(repoRoot: string) {
  const file = path.join(repoRoot, "packages/brand/brand.json");
  return parseBrand(JSON.parse(await readFile(file, "utf8")));
}

async function readText(repoRoot: string, relative: string): Promise<string | null> {
  try {
    return await readFile(path.join(repoRoot, relative), "utf8");
  } catch {
    return null;
  }
}

/** Hosts and accounts that identify the upstream project and must not reach a shipped app. */
export const UPSTREAM_IDENTITY =
  /\brakazo\.com\b|elie222|apps\.apple\.com\/app\/rakazo|\bu\.expo\.dev\b/;

const COMPOSE_IMAGE_FILES = [
  "infra/compose/docker-compose.images.yml",
  "infra/compose/docker-compose.prod.yml",
  "infra/compose/docker-compose.prod.docker.yml",
  "infra/compose/.env.images.example",
  ".env.example",
];

export const registryDefaultsCheck: BrandCheck = {
  name: "compose and env image defaults equal the brand registry",
  async run(repoRoot) {
    const brand = await loadBrand(repoRoot);
    const problems: string[] = [];
    for (const file of COMPOSE_IMAGE_FILES) {
      const text = await readText(repoRoot, file);
      if (text === null) {
        problems.push(`${file} is missing.`);
        continue;
      }
      text.split("\n").forEach((line, index) => {
        for (const match of line.matchAll(/ghcr\.io\/[^\s"'`})]+/g)) {
          if (!match[0].startsWith(`${brand.registry}/`)) {
            problems.push(
              `${file}:${index + 1} ${match[0]} is outside the brand registry ${brand.registry}/.`,
            );
          }
        }
      });
    }
    return problems;
  },
};

export const desktopPackageCheck: BrandCheck = {
  name: "desktop package identity is Nurlings with no upstream update feed",
  async run(repoRoot) {
    const brand = await loadBrand(repoRoot);
    const text = await readText(repoRoot, "apps/desktop/package.json");
    if (text === null) return ["apps/desktop/package.json is missing."];
    const pkg = JSON.parse(text) as {
      productName?: string;
      author?: { name?: string } | string;
      build?: { publish?: unknown; mac?: { extendInfo?: Record<string, string> } };
    };
    const problems: string[] = [];
    if (pkg.productName !== brand.name) {
      problems.push(
        `apps/desktop/package.json productName is ${pkg.productName}, not ${brand.name}.`,
      );
    }
    if (pkg.build?.publish !== undefined) {
      problems.push("apps/desktop/package.json still has a build.publish update feed.");
    }
    if (/rakazo/i.test(JSON.stringify(pkg.author ?? ""))) {
      problems.push("apps/desktop/package.json author still names the upstream project.");
    }
    for (const [key, value] of Object.entries(pkg.build?.mac?.extendInfo ?? {})) {
      if (/rakazo/i.test(value)) problems.push(`apps/desktop/package.json ${key} names Rakazo.`);
    }
    if (UPSTREAM_IDENTITY.test(text)) {
      problems.push("apps/desktop/package.json names an upstream host or account.");
    }
    return problems;
  },
};

export const expoConfigCheck: BrandCheck = {
  name: "Expo app.json uses the brand identity and has no upstream account or update URL",
  async run(repoRoot) {
    const brand = await loadBrand(repoRoot);
    const text = await readText(repoRoot, "apps/mobile/app.json");
    if (text === null) return ["apps/mobile/app.json is missing."];
    const { expo } = JSON.parse(text) as {
      expo: {
        ios?: { bundleIdentifier?: string };
        android?: { package?: string };
        updates?: { url?: string };
      };
    };
    const problems: string[] = [];
    if (expo.ios?.bundleIdentifier !== brand.native.bundleId) {
      problems.push(`app.json ios.bundleIdentifier is not ${brand.native.bundleId}.`);
    }
    if (expo.android?.package !== brand.native.bundleId) {
      problems.push(`app.json android.package is not ${brand.native.bundleId}.`);
    }
    if (expo.updates?.url !== undefined) problems.push("app.json still has an updates.url.");
    for (const forbidden of ["inbox-zero", "07f7eb04", "u.expo.dev", "com.rakazo.app"]) {
      if (text.includes(forbidden)) problems.push(`app.json still contains ${forbidden}.`);
    }
    return problems;
  },
};

/** Source files whose string literals reach people through email, chat or the settings screens. */
const SERVER_TEXT_FILES = [
  "packages/auth/src/index.ts",
  "packages/auth/src/account-security.ts",
  "apps/api/src/messaging-inbound.ts",
  "apps/api/src/team-chat-bridge.ts",
  "packages/core/src/self-update.ts",
  "packages/adapters/src/pi-models.ts",
  "packages/adapters/src/pi-oauth.ts",
  "packages/adapters/src/mcp-oauth.ts",
  // Prompts sent to models: the fallback system prompts, helper prompt, approval resume text, and
  // the summarizer, safety-checker and engagement-judge instructions.
  "packages/adapters/src/pi-runtime.ts",
  "packages/adapters/src/executor.ts",
  "packages/adapters/src/history-compaction.ts",
  "packages/adapters/src/auto-review.ts",
  "packages/adapters/src/builtin-skills.ts",
  "apps/api/src/team-chat-judge.ts",
];
/**
 * Lines that name the upstream on purpose: internal errors and markers stored in conversations
 * (the automated-message label and the compaction prefix), which other code matches on.
 */
const SERVER_TEXT_EXEMPT =
  /throw new Error|OFFICIAL_REPO_URL|AUTOMATED_MESSAGE_LABEL|Rakazo-owned compacted context/;

export function upstreamNameInServerText(source: string): number[] {
  const lines: number[] = [];
  source.split("\n").forEach((line, index) => {
    const trimmed = line.trim();
    if (/^(\/\/|\*|\/\*)/.test(trimmed)) return;
    if (SERVER_TEXT_EXEMPT.test(line)) return;
    if (/\bRakazo\b/.test(line)) lines.push(index + 1);
  });
  return lines;
}

export const serverTextCheck: BrandCheck = {
  name: "server-sent text (emails, chat, updates, billing blurbs) does not say Rakazo",
  async run(repoRoot) {
    const problems: string[] = [];
    for (const file of SERVER_TEXT_FILES) {
      const source = await readText(repoRoot, file);
      if (source === null) {
        problems.push(`${file} is missing; update SERVER_TEXT_FILES in repo-checks.ts.`);
        continue;
      }
      for (const line of upstreamNameInServerText(source)) {
        problems.push(`${file}:${line} names Rakazo in a string people can read.`);
      }
    }
    return problems;
  },
};

const NURLINGS_VARIABLE = /\bNURLINGS_[A-Z_]+\b/g;

export const deploymentDocCheck: BrandCheck = {
  name: "deployment guide names exactly the installer's NURLINGS_ variables",
  async run(repoRoot) {
    const installer = await readText(repoRoot, "infra/compose/install-images.sh");
    const doc = await readText(repoRoot, "docs/nurlings-deployment.md");
    if (installer === null) return ["infra/compose/install-images.sh is missing."];
    if (doc === null) return ["docs/nurlings-deployment.md is missing."];
    const inInstaller = new Set(installer.match(NURLINGS_VARIABLE) ?? []);
    const inDoc = new Set(doc.match(NURLINGS_VARIABLE) ?? []);
    return [
      ...[...inInstaller]
        .filter((name) => !inDoc.has(name))
        .map((name) => `docs/nurlings-deployment.md does not document ${name}.`),
      ...[...inDoc]
        .filter((name) => !inInstaller.has(name))
        .map(
          (name) => `docs/nurlings-deployment.md names ${name}, which the installer does not read.`,
        ),
    ];
  },
};

async function filesUnder(directory: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...(await filesUnder(full)));
    else found.push(full);
  }
  return found;
}

const TEXT_EXTENSIONS = /\.(html|js|mjs|css|json|webmanifest|txt|svg|map)$/;
/** Built-in strings of the shared core that no screen can reach; see the design's D7. */
const BUILT_EXEMPT = /elie222\/rakazo-bot-voices/;

/**
 * Scans the built web app. It needs `pnpm --filter @rakazo/web build` to have run, so it is only
 * part of `brand:check --built`.
 */
export const builtWebCheck: BrandCheck = {
  name: "built web app is branded and has no upstream host",
  async run(repoRoot) {
    const dist = path.join(repoRoot, "apps/web/dist");
    try {
      await stat(dist);
    } catch {
      return [
        "apps/web/dist is missing; build the web app first (pnpm --filter @rakazo/web build).",
      ];
    }
    const brand = await loadBrand(repoRoot);
    const problems: string[] = [];
    const html = await readText(repoRoot, "apps/web/dist/index.html");
    if (html === null || !html.includes(brand.name) || /\bRakazo\b/.test(html)) {
      problems.push(`apps/web/dist/index.html must say ${brand.name} and not Rakazo.`);
    }
    const manifest = await readText(repoRoot, "apps/web/dist/site.webmanifest");
    if (manifest === null || !manifest.includes(brand.name) || /\bRakazo\b/.test(manifest)) {
      problems.push(`apps/web/dist/site.webmanifest must say ${brand.name} and not Rakazo.`);
    }
    for (const file of await filesUnder(dist)) {
      if (!TEXT_EXTENSIONS.test(file)) continue;
      const text = (await readFile(file, "utf8")).replace(BUILT_EXEMPT, "");
      const match = UPSTREAM_IDENTITY.exec(text);
      if (match) {
        problems.push(`${path.relative(repoRoot, file)} contains ${match[0]}.`);
      }
    }
    return problems;
  },
};

export const staticRepoChecks: BrandCheck[] = [
  registryDefaultsCheck,
  desktopPackageCheck,
  expoConfigCheck,
  serverTextCheck,
  deploymentDocCheck,
];
