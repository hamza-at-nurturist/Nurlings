#!/usr/bin/env python3
"""Classify every case-insensitive 'rakazo' occurrence in tracked files into four groups.

Usage: inventory.py <repo> <out_summary.md> <out_lines.md>
Groups: user-facing | app-identity | internal | external-links
Rules are path- and context-based and intentionally conservative: anything ambiguous is
'internal' unless it is a standalone capitalised word 'Rakazo' in non-comment text.
"""
import re
import subprocess
import sys
from collections import Counter, defaultdict

repo, out_summary, out_lines = sys.argv[1:4]

raw = subprocess.run(
    ["git", "-C", repo, "grep", "-nIi", "--no-color", "rakazo"],
    capture_output=True, text=True, check=True,
).stdout.splitlines()

TOKEN = re.compile(r"rakazo", re.I)
PLACEHOLDER = re.compile(
    r"rakazo\.(example|test|local)|example\.com/mirror/rakazo|(someone|me|example)/rakazo"
    r"|rakazo\.example", re.I)
# spans that point at Rakazo-owned infrastructure
EXTERNAL_SPAN = re.compile(
    r"https?://[^\s\"'`)>\]]*|mailto:[^\s\"'`)>\]]*|[\w.+-]+@rakazo\.com"
    r"|ghcr\.io/[^\s\"'`)>\]]*|elie222/rakazo[^\s\"'`)>\]]*|inbox-zero/rakazo"
    r"|discord\.gg/\S+|rakazo\.com\S*|apps\.apple\.com\S*", re.I)

IDENTITY_FILES = {
    "apps/desktop/package.json", "apps/mobile/app.json", "apps/mobile/app.config.ts",
    "apps/mobile/eas.json", "apps/web/index.html", "apps/web/public/site.webmanifest",
    "apps/www/public/site.webmanifest", "apps/desktop/assets/README.md",
    "packages/ui-tokens/assets/README.md", "packages/ui-tokens/scripts/export-brand.ts",
    "apps/desktop/src/setup.html", "apps/www/src/layouts/Base.astro",
}
PERMISSION = re.compile(r"UsageDescription|Permission|NSLocalNetwork", re.I)
COMMENT_START = ("//", "*", "/*", "<!--", "--", "#")


def is_comment(path: str, text: str) -> bool:
    s = text.strip()
    if path.endswith((".md", ".mdx", ".html", ".astro", ".json", ".po", ".txt")):
        return path.endswith(".po") and s.startswith("#")
    return s.startswith(COMMENT_START)


def classify(path: str, text: str, m: re.Match) -> tuple[str, str]:
    s, e = m.span()
    tok_start = s
    while tok_start > 0 and re.match(r"[A-Za-z0-9_@./:-]", text[tok_start - 1]):
        tok_start -= 1
    tok_end = e
    while tok_end < len(text) and re.match(r"[A-Za-z0-9_./:-]", text[tok_end]):
        tok_end += 1
    token = text[tok_start:tok_end].rstrip(".:/,;")

    for span in EXTERNAL_SPAN.finditer(text):
        if span.start() <= s < span.end():
            if PLACEHOLDER.search(span.group(0)):
                return "internal", token
            return "external-links", token
    if PLACEHOLDER.search(token):
        return "internal", token

    word = text[s:e]
    before = text[s - 1] if s else " "
    after = text[e] if e < len(text) else " "
    if re.match(r"/\d", text[e:e + 2]):                       # User-Agent "Rakazo/0.1"
        return "external-links", token
    if word == "Rakazo" and text[e:e + 5] == ".icon":
        return "app-identity", token
    # build artifacts named after productName: Rakazo.app, Rakazo-1.0.0.dmg, Rakazo-*.AppImage
    if word == "Rakazo" and re.match(r"(\.app\b|-[\d*]|/Contents|\.(dmg|zip|exe|AppImage))", text[e:e + 16]):
        return "app-identity", token
    if word == "Rakazo" and text[max(0, s - 9):s] == "/MacOS/":
        return "app-identity", token
    if path in IDENTITY_FILES:
        if token.startswith("@rakazo/") or word.isupper():
            return "internal", token
        if PERMISSION.search(text) or (word == "Rakazo" and re.search(r"\"[^\"]*Rakazo [a-z]", text)):
            return "user-facing", token
        return "app-identity", token
    if path.startswith("apps/www/public/brand/") or path.startswith("apps/www/public/og/"):
        return "app-identity", token
    if token.startswith("@rakazo/") or word.isupper() or word.islower() and word == "rakazo":
        return "internal", token
    if word == "Rakazo" and (before.isalnum() or before == "_" or after.isalnum() or after == "_"):
        return "internal", token                              # RakazoDesktop, isRakazoHealth
    if word != "Rakazo":
        return "internal", token
    if is_comment(path, text):
        return "internal", token + "  (comment)"
    return "user-facing", token


groups: dict[str, list[tuple[str, int, str, str]]] = defaultdict(list)
for line in raw:
    path, lineno, text = line.split(":", 2)
    if path == "pnpm-lock.yaml":
        for m in TOKEN.finditer(text):
            groups["internal"].append((path, int(lineno), "@rakazo/* (lockfile)", text))
        continue
    for m in TOKEN.finditer(text):
        g, tok = classify(path, text, m)
        groups[g].append((path, int(lineno), tok, text))


def area(path: str) -> str:
    p = path.split("/")
    return "/".join(p[:2]) if p[0] in ("apps", "packages", "infra") and len(p) > 2 else p[0] if len(p) == 1 else "/".join(p[:2]) if p[0] in ("apps", "packages", "infra", "docs", ".github") else p[0]


def is_test(path: str) -> bool:
    return bool(re.search(r"(\.test\.|\.spec\.|/e2e/|/testkit/|\.maestro/|__tests__)", path))


order = ["user-facing", "app-identity", "external-links", "internal"]
titles = {
    "user-facing": "User-facing (UI text, titles, emails, onboarding, errors, docs shown to users)",
    "app-identity": "App identity (Electron/Expo identifiers, icons, splash, favicons, manifests)",
    "external-links": "External links (rakazo.com, GitHub, Discord, Cloud/waitlist, registries, UA, telemetry targets)",
    "internal": "Internal (@rakazo/* packages, RAKAZO_* env, DB/Docker names, code identifiers, comments)",
}

with open(out_summary, "w") as f:
    f.write("<!-- generated by scratchpad inventory.py from `git grep -nIi rakazo` on main @ upstream HEAD -->\n\n")
    total = sum(len(v) for v in groups.values())
    f.write(f"Total occurrences in tracked text files: **{total}**\n\n")
    f.write("| Group | Occurrences | Files |\n|---|---:|---:|\n")
    for g in order:
        f.write(f"| {g} | {len(groups[g])} | {len({h[0] for h in groups[g]})} |\n")
    for g in order:
        f.write(f"\n## {titles[g]}\n\n")
        byarea: dict[str, Counter] = defaultdict(Counter)
        tokens: dict[str, Counter] = defaultdict(Counter)
        for path, ln, tok, _ in groups[g]:
            a = area(path) + (" (tests)" if is_test(path) else "")
            byarea[a][path] += 1
            tokens[a][tok] += 1
        for a in sorted(byarea, key=lambda k: -sum(byarea[k].values())):
            n = sum(byarea[a].values())
            f.write(f"### {a} — {n} hits in {len(byarea[a])} files\n\n")
            if g == "internal":
                top = ", ".join(f"`{t}` ×{c}" for t, c in tokens[a].most_common(12))
                f.write(f"Top tokens: {top}\n\n")
            else:
                for p, c in byarea[a].most_common():
                    f.write(f"- `{p}` ({c})\n")
                f.write("\n")

with open(out_lines, "w") as f:
    f.write("<!-- generated: line-level occurrences for the three groups that change. "
            "Internal occurrences are deliberately not listed per line (see inventory.md). -->\n\n")
    for g in ["user-facing", "app-identity", "external-links"]:
        f.write(f"## {titles[g]}\n\n")
        seen_po = set()
        for path, ln, tok, text in sorted(groups[g]):
            if path.endswith(".po") and not path.startswith("apps/web/src/locales/en/"):
                continue                                      # same msgids in 11 other locales
            if path.startswith("apps/mobile/lib/locales/") and not path.endswith("/de.ts"):
                continue                                      # one representative mobile locale map
            snippet = text.strip()
            i = snippet.lower().find("rakazo")
            lo = max(0, i - 70)
            snippet = ("…" if lo else "") + snippet[lo:i + 110]
            f.write(f"- `{path}:{ln}` `{tok}` — {snippet}\n")
        f.write("\n")

for g in order:
    print(g, len(groups[g]), len({h[0] for h in groups[g]}))
