import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { brand } from "@nurlings/brand";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

interface ComposeService {
  image?: string;
  ports?: unknown;
  container_name?: unknown;
  extra_hosts?: unknown;
  restart?: string;
  pull_policy?: string;
  volumes?: unknown[];
  /** A list of `KEY=value` strings or a map. */
  environment?: Record<string, unknown> | string[];
  healthcheck?: unknown;
  depends_on?: Record<string, { condition?: string }>;
}

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const composeFile = path.join(repoRoot, "deploy/coolify/docker-compose.yml");
const readmeFile = path.join(repoRoot, "deploy/coolify/README.md");
const source = readFileSync(composeFile, "utf8");
const compose = parse(source, { merge: true }) as {
  name?: string;
  services: Record<string, ComposeService>;
};
const services = compose.services;

function environment(service: ComposeService): Record<string, string | null> {
  const env = service.environment ?? {};
  if (Array.isArray(env)) {
    return Object.fromEntries(
      env.map((entry) => {
        const at = entry.indexOf("=");
        return at < 0 ? [entry, null] : [entry.slice(0, at), entry.slice(at + 1)];
      }),
    );
  }
  return Object.fromEntries(
    Object.entries(env).map(([key, value]) => [key, value === null ? null : String(value)]),
  );
}

const ONE_SHOT = ["computer", "data-init"];
const GENERATED = {
  POSTGRES_PASSWORD: "SERVICE_PASSWORD_POSTGRES",
  BETTER_AUTH_SECRET: "SERVICE_PASSWORD_64_AUTH",
  ENCRYPTION_KEY: "SERVICE_PASSWORD_64_CRYPT",
  SCREEN_PROXY_SECRET: "SERVICE_PASSWORD_64_SCREEN",
  SANDBOX_SUPERVISOR_TOKEN: "SERVICE_PASSWORD_64_SUPERVISOR",
} as const;

/**
 * The Coolify file is pasted into the dashboard as-is, so nothing can be checked at deploy time
 * beyond Compose itself. These checks fail when it drifts from the app or loses a safety property.
 * Which settings the api and worker receive is checked in compose-env.test.ts.
 */
describe("the Coolify compose file", () => {
  it("has the stack's services and no updater", () => {
    expect(Object.keys(services).sort()).toEqual([
      "api",
      "computer",
      "data-init",
      "postgres",
      "supervisor",
      "web",
      "worker",
    ]);
    // The API reads these names, so they stay listed; they must never carry a value here.
    const api = environment(services.api ?? {});
    expect(api.RAKAZO_UPDATER_URL).toBeNull();
    expect(api.RAKAZO_UPDATER_TOKEN).toBeNull();
    expect(source).not.toContain(`${brand.registry}/updater`);
  });

  it("leaves the project name, ports and container names to Coolify", () => {
    expect(compose.name).toBeUndefined();
    for (const [name, service] of Object.entries(services)) {
      expect({ name, ports: service.ports }).toEqual({ name, ports: undefined });
      expect({ name, container: service.container_name }).toEqual({ name, container: undefined });
      // host.docker.internal would let the app reach the Coolify host's own services.
      expect({ name, hosts: service.extra_hosts }).toEqual({ name, hosts: undefined });
    }
  });

  it("pins every first-party image to the one required version variable", () => {
    const required = "${NURLINGS_VERSION:?";
    const refs = [...source.matchAll(/\$\{NURLINGS_VERSION([^}]*)\}/g)].map((m) => m[1] ?? "");
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) expect(ref.startsWith(":?")).toBe(true);
    for (const name of ["supervisor", "api", "worker", "web"]) {
      expect(services[name]?.image).toMatch(
        new RegExp(`^${brand.registry.replace(/\./g, "\\.")}/app:\\$\\{NURLINGS_VERSION:\\?`),
      );
    }
    expect(services.computer?.image).toContain(`${brand.registry}/computer:${required}`);
    expect(environment(services.supervisor ?? {}).RAKAZO_COMPUTER_IMAGE).toContain(
      `${brand.registry}/computer:${required}`,
    );
  });

  it("lets one variable make a redeploy pull moved images, and defaults to not pulling", () => {
    const firstParty = Object.entries(services).filter(([, service]) =>
      service.image?.startsWith(`${brand.registry}/`),
    );
    expect(firstParty.map(([name]) => name).sort()).toEqual([
      "api",
      "computer",
      "supervisor",
      "web",
      "worker",
    ]);
    for (const [name, service] of firstParty) {
      expect({ name, pullPolicy: service.pull_policy }).toEqual({
        name,
        pullPolicy: "${NURLINGS_PULL_POLICY:-missing}",
      });
    }
    // A client server on a release tag must not depend on the registry at every redeploy.
    expect(source).not.toMatch(/pull_policy:\s*always/);
  });

  it("uses only our registry, a digest-pinned database and no floating tags", () => {
    for (const [name, service] of Object.entries(services)) {
      const image = service.image ?? "";
      expect({ name, image }).not.toEqual({
        name,
        image: expect.stringMatching(/rakazo|elie222/i),
      });
      expect(image).not.toMatch(/:(latest|edge)\b/);
    }
    expect(services.postgres?.image).toMatch(/^postgres:16@sha256:[0-9a-f]{64}$/);
    expect(services["data-init"]?.image).toBe("busybox:1");
    expect(source).not.toMatch(/ghcr\.io\/elie222/i);
    expect(brand.registry).toBe(brand.registry.toLowerCase());
  });

  it("mounts the Docker socket on the supervisor only", () => {
    const mounting = Object.entries(services)
      .filter(([, service]) => JSON.stringify(service.volumes ?? []).includes("docker.sock"))
      .map(([name]) => name);
    expect(mounting).toEqual(["supervisor"]);
  });

  it("keeps Postgres data and bot workspaces in named volumes", () => {
    const named = parse(source) as { volumes: Record<string, unknown> };
    expect(Object.keys(named.volumes).sort()).toEqual(["appdata", "pgdata"]);
    expect(services.postgres?.volumes).toContain("pgdata:/var/lib/postgresql/data");
    for (const name of ["supervisor", "api", "worker"]) {
      expect(services[name]?.volumes).toContain("appdata:/data");
    }
  });

  it("generates distinct secrets and never holds a literal one", () => {
    const names = Object.values(GENERATED);
    expect(new Set(names).size).toBe(names.length);
    const holders = {
      POSTGRES_PASSWORD: services.postgres,
      BETTER_AUTH_SECRET: services.api,
      ENCRYPTION_KEY: services.api,
      SCREEN_PROXY_SECRET: services.web,
      SANDBOX_SUPERVISOR_TOKEN: services.supervisor,
    };
    for (const [key, variable] of Object.entries(GENERATED)) {
      const holder = holders[key as keyof typeof holders];
      expect(environment(holder ?? {})[key]).toBe(`\${${variable}}`);
    }
    // The app login and the owner login share one generated database password pair.
    expect(environment(services.api ?? {}).DATABASE_URL).toContain("${SERVICE_PASSWORD_APPDB}");
    expect(environment(services.api ?? {}).DATABASE_MIGRATION_URL).toContain(
      "${SERVICE_PASSWORD_POSTGRES}",
    );
    for (const [name, service] of Object.entries(services)) {
      for (const [key, value] of Object.entries(environment(service))) {
        if (!/SECRET|TOKEN|PASSWORD|ENCRYPTION_KEY|API_KEY/.test(key) || value === null) continue;
        expect({ name, key, value }).toEqual({ name, key, value: expect.stringMatching(/^\$\{/) });
      }
    }
  });

  it("derives every public URL from the single web domain", () => {
    const web = environment(services.web ?? {});
    // The _5173 variable routes to the container port; its value carries ":5173", so the app's
    // public URLs must come from the port-free SERVICE_URL_WEB / SERVICE_FQDN_WEB.
    expect(Object.keys(web)).toEqual(expect.arrayContaining(["SERVICE_FQDN_WEB_5173"]));
    expect(web.RAKAZO_HOST).toBe("${SERVICE_FQDN_WEB}");
    const api = environment(services.api ?? {});
    expect(api.BETTER_AUTH_URL).toBe("${SERVICE_URL_WEB}");
    expect(api.WEB_ORIGIN).toBe("${SERVICE_URL_WEB}");
    expect(api.API_URL).toBe("${SERVICE_URL_WEB}");
    for (const [name, service] of Object.entries(services)) {
      if (name === "web") continue;
      expect(
        Object.keys(environment(service)).filter((key) => key.startsWith("SERVICE_FQDN")),
      ).toEqual([]);
    }
  });

  it("leaves sign-up open until the operator closes it after the first account", () => {
    const api = environment(services.api ?? {});
    expect(api.SIGNUPS_ENABLED).toBe("${SIGNUPS_ENABLED:-true}");
    expect(api.SIGNUP_ALLOWLIST).toBe("${SIGNUP_ALLOWLIST:-}");
    expect(readFileSync(readmeFile, "utf8")).toMatch(/SIGNUPS_ENABLED[^\n]*false/);
  });

  it("restricts bot computer egress unless an operator overrides it", () => {
    const env = environment(services.supervisor ?? {});
    expect(env.SANDBOX_COMPUTER_EGRESS).toBe("${SANDBOX_COMPUTER_EGRESS:-restricted}");
    expect(env.SANDBOX_COMPUTER_DNS).toContain("1.1.1.1");
    expect(env.SANDBOX_SCREEN_NETWORK).toBe("isolated");
  });

  it("checks every long-running service and orders startup by health", () => {
    for (const [name, service] of Object.entries(services)) {
      if (ONE_SHOT.includes(name)) {
        expect({ name, restart: service.restart }).toEqual({ name, restart: "no" });
      } else {
        expect({ name, healthcheck: Boolean(service.healthcheck) }).toEqual({
          name,
          healthcheck: true,
        });
      }
    }
    expect(JSON.stringify(services.worker?.healthcheck)).toContain("dist/health-check.js");
    const waits = (service: string) =>
      Object.fromEntries(
        Object.entries(services[service]?.depends_on ?? {}).map(([dep, v]) => [dep, v.condition]),
      );
    expect(waits("api")).toEqual({
      postgres: "service_healthy",
      "data-init": "service_completed_successfully",
      supervisor: "service_healthy",
    });
    expect(waits("worker")).toMatchObject({ api: "service_healthy", postgres: "service_healthy" });
    expect(waits("web")).toEqual({ api: "service_healthy" });
    expect(waits("supervisor")).toEqual({
      computer: "service_completed_successfully",
      "data-init": "service_completed_successfully",
    });
  });

  it("migrates before the API serves", () => {
    expect(JSON.stringify(parse(source).services.api.command)).toContain("pnpm db:deploy &&");
  });

  it("defaults the database to our name and keeps Rakazo out of everything a person sees", () => {
    const postgres = environment(services.postgres ?? {});
    expect(postgres.POSTGRES_USER).toBe("${POSTGRES_USER:-nurlings}");
    expect(postgres.POSTGRES_DB).toBe("${POSTGRES_DB:-nurlings}");
    // Internal identifiers the images read stay: RAKAZO_* names, the rakazo_app role, the
    // supervisor's package filter. Everything else (images, domains, defaults) must not name it.
    const allowed = [/RAKAZO_[A-Z_]+/g, /SLACK_RAKAZO_BOT_ID/g, /rakazo_app/g, /@rakazo\/[a-z-]+/g];
    let text = source
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("#"))
      .join("\n");
    for (const pattern of allowed) text = text.replace(pattern, "");
    expect(text.match(/.*rakazo.*/gi) ?? []).toEqual([]);
  });
});

describe("the Coolify runbook", () => {
  const readme = existsSync(readmeFile) ? readFileSync(readmeFile, "utf8") : "";

  it("covers each topic with its own section", () => {
    for (const heading of [
      /server requirements/i,
      /docker login/i,
      /restrict-computer-egress/i,
      /dns/i,
      /add resource/i,
      /variables/i,
      /update/i,
      /back ?up/i,
      /restore/i,
      /problems|troubleshooting/i,
    ]) {
      expect(readme).toMatch(heading);
    }
    expect(readme).toContain("NURLINGS_VERSION");
    expect(readme).toContain("ENCRYPTION_KEY");
    expect(readme).toMatch(/Engine 26/);
  });

  it("only documents variables the compose file reads", () => {
    const rows = [...readme.matchAll(/^\| `([A-Z][A-Z0-9_]+)` \|/gm)].map((m) => m[1] ?? "");
    expect(rows).toContain("NURLINGS_VERSION");
    for (const variable of rows)
      expect({ variable, found: source.includes(variable) }).toEqual({
        variable,
        found: true,
      });
  });

  it("never names the upstream or tells the operator to use a floating tag", () => {
    expect(readme).not.toMatch(/elie222/i);
    const images = readme.match(/ghcr\.io\/[^\s`'"<>]+/g) ?? [];
    expect(images.filter((image) => !image.startsWith(`${brand.registry}/`))).toEqual([]);
    expect(readme).not.toMatch(/NURLINGS_VERSION\s*=\s*(latest|edge)\b/);
  });
});
