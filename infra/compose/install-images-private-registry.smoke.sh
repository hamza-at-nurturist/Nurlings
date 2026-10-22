#!/usr/bin/env bash
# Private repository and registry support in install-images.sh, with fake docker and curl.
set -euo pipefail
root="$(cd "$(dirname "$0")" && pwd)"
src="$root/install-images.sh"
fail() { echo "FAIL: $*" >&2; exit 1; }

tmp="$(mktemp -d "${TMPDIR:-/tmp}/install-images-private.XXXXXX")"
trap 'rm -rf "$tmp"' EXIT

DL_TOKEN="fake-download-token-aaaaaaaaaaaa"
REG_TOKEN="fake-registry-token-bbbbbbbbbbbb"

write_stubs() {
  local bin="$1"
  mkdir -p "$bin"
  cat > "$bin/docker" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
log="${STUB_DOCKER_LOG:?}"
{ printf 'docker'; for a in "$@"; do printf ' %s' "$a"; done; printf '\n'; } >> "$log"
if [[ "${1:-}" == login ]]; then
  printf 'stdin=%s\n' "$(cat)" >> "$log"
  [[ "${STUB_LOGIN_FAIL:-}" == 1 ]] && { echo "unauthorized" >&2; exit 1; }
  echo "Login Succeeded"
  exit 0
fi
[[ "${1:-}" == compose ]] || { echo "STUB: unexpected docker $*" >&2; exit 1; }
shift
verb=""; help=false; short=false
for a in "$@"; do
  case "$a" in
    --help|-h) help=true ;;
    --short) short=true ;;
    version|up|pull|config) [[ -n "$verb" ]] || verb="$a" ;;
  esac
done
echo "VERB=${verb:-none}" >> "$log"
if [[ "$verb" == config ]]; then cat >/dev/null || true; fi
if [[ "$help" == true ]]; then
  printf 'Usage: docker compose up\n\nOptions:\n  --pull string\n  --wait\n  --wait-timeout int\n'
  exit 0
fi
case "$verb" in
  version) if [[ "$short" == true ]]; then echo 2.24.0; else echo "Docker Compose version v2.24.0"; fi ;;
  config)
    printf '%s\n' POSTGRES_PASSWORD=x POSTGRES_APP_PASSWORD=x BETTER_AUTH_SECRET=x ENCRYPTION_KEY=x SCREEN_PROXY_SECRET=x SANDBOX_SUPERVISOR_TOKEN=x
    ;;
  pull) [[ "${STUB_PULL_FAIL:-}" == 1 ]] && { echo "denied: permission_denied" >&2; exit 1; }; true ;;
  up) ;;
  *) echo "STUB: unexpected compose verb ${verb:-none}" >&2; exit 1 ;;
esac
STUB
  cat > "$bin/curl" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
log="${STUB_CURL_LOG:?}"
{ printf 'curl'; for a in "$@"; do printf ' %s' "$a"; done; printf '\n'; } >> "$log"
if [[ " $* " == *" --help "* ]]; then echo "--retry-all-errors"; exit 0; fi
out=""; prev=""; config=false
for a in "$@"; do
  [[ "$prev" == "-o" ]] && out="$a"
  [[ "$prev" == "-K" && "$a" == "-" ]] && config=true
  prev="$a"
done
if [[ "$config" == true ]]; then printf 'config=%s\n' "$(cat)" >> "$log"; fi
[[ -n "$out" ]] || exit 1
printf 'stub-download\n' > "$out"
STUB
  chmod +x "$bin/docker" "$bin/curl"
}

new_work() {
  local work="$1"
  mkdir -p "$work/cwd"
  write_stubs "$work/bin"
  cat > "$work/cwd/.env" <<'ENV'
POSTGRES_PASSWORD=p
POSTGRES_APP_PASSWORD=p
BETTER_AUTH_SECRET=p
ENCRYPTION_KEY=p
SCREEN_PROXY_SECRET=p
SANDBOX_SUPERVISOR_TOKEN=p
SANDBOX_COMPUTER_EGRESS=open
ENV
  : > "$work/docker.log"; : > "$work/curl.log"
}

# run <work> [VAR=value ...] -- [installer args]; prints combined output, returns the exit code.
run_install() {
  local work="$1"; shift
  local env_args=()
  while [[ "$#" -gt 0 && "$1" != -- ]]; do env_args+=("$1"); shift; done
  [[ "${1:-}" == -- ]] && shift
  (
    cd "$work/cwd"
    env "STUB_DOCKER_LOG=$work/docker.log" "STUB_CURL_LOG=$work/curl.log" "PATH=$work/bin:$PATH" \
      ${env_args[@]+"${env_args[@]}"} bash "$src" "$@" 2>&1
  )
}

# 1. Plain install: no login, no curl config.
new_work "$tmp/plain"
out="$(run_install "$tmp/plain" --)" || fail "plain install failed: $out"
grep -q '^docker login' "$tmp/plain/docker.log" && fail "plain install must not log in"
grep -q -- ' -K ' "$tmp/plain/curl.log" && fail "plain install must not send a curl config"
grep -qF -e 'nurturist-ai/nurlings/main/infra/compose' "$tmp/plain/curl.log" || fail "default download base is not the Nurlings repository: $(cat "$tmp/plain/curl.log")"
[[ "$out" == *"Nurlings is starting"* ]] || fail "missing start message: $out"
[[ "$out" != *"Rakazo"* ]] || fail "operator text still says Rakazo: $out"

# 2. Download token: bearer header goes to curl on stdin only.
new_work "$tmp/download"
out="$(run_install "$tmp/download" "NURLINGS_DOWNLOAD_TOKEN=$DL_TOKEN" --)" || fail "download-token install failed: $out"
grep -qF -e 'Authorization: Bearer '"$DL_TOKEN" "$tmp/download/curl.log" || fail "curl did not receive the bearer header on stdin"
grep -E '^curl ' "$tmp/download/curl.log" | grep -qF -e "$DL_TOKEN" && fail "token leaked into curl arguments"
grep -E '^curl ' "$tmp/download/curl.log" | grep -qF -e ' -K -' || fail "curl was not given the config on stdin"
[[ "$out" != *"$DL_TOKEN"* ]] || fail "download token appeared in installer output"

# 3. Registry login happens before the pull; the token is on stdin only and never printed.
new_work "$tmp/login"
out="$(run_install "$tmp/login" NURLINGS_REGISTRY_USER=fake-machine-user "NURLINGS_REGISTRY_TOKEN=$REG_TOKEN" --)" || fail "login install failed: $out"
login_line="$(grep -n '^docker login' "$tmp/login/docker.log" | head -1 | cut -d: -f1)"
pull_line="$(grep -n 'VERB=pull' "$tmp/login/docker.log" | head -1 | cut -d: -f1)"
[[ -n "$login_line" && -n "$pull_line" && "$login_line" -lt "$pull_line" ]] || fail "login must run before pull: $(cat "$tmp/login/docker.log")"
grep -qF -e 'docker login ghcr.io --username fake-machine-user --password-stdin' "$tmp/login/docker.log" || fail "unexpected login arguments"
grep -qF -e "stdin=$REG_TOKEN" "$tmp/login/docker.log" || fail "token did not reach docker login on stdin"
grep -E '^docker ' "$tmp/login/docker.log" | grep -qF -e "$REG_TOKEN" && fail "registry token leaked into docker arguments"
[[ "$out" != *"$REG_TOKEN"* ]] || fail "registry token appeared in installer output"

# 4. A user without a token (or the reverse) is refused before anything is pulled.
new_work "$tmp/half"
if out="$(run_install "$tmp/half" NURLINGS_REGISTRY_USER=fake-machine-user --)"; then fail "half-configured login should fail"; fi
[[ "$out" == *"set both NURLINGS_REGISTRY_USER and NURLINGS_REGISTRY_TOKEN"* ]] || fail "missing pairing message: $out"
grep -q 'VERB=pull' "$tmp/half/docker.log" && fail "must not pull after a refused login"

# 5. A failed login and a failed pull explain how to authenticate, without echoing the token.
new_work "$tmp/badlogin"
if out="$(run_install "$tmp/badlogin" NURLINGS_REGISTRY_USER=fake-machine-user "NURLINGS_REGISTRY_TOKEN=$REG_TOKEN" STUB_LOGIN_FAIL=1 --)"; then fail "failed login should fail"; fi
[[ "$out" == *"could not log in to ghcr.io"* ]] || fail "missing login failure message: $out"
[[ "$out" != *"$REG_TOKEN"* ]] || fail "token printed on login failure"

new_work "$tmp/nopull"
if out="$(run_install "$tmp/nopull" STUB_PULL_FAIL=1 --)"; then fail "failed pull should fail"; fi
[[ "$out" == *"NURLINGS_REGISTRY_USER"* && "$out" == *"read:packages"* ]] || fail "missing authentication hint: $out"

# 6. A token with a space or quote is rejected rather than written into a curl config.
new_work "$tmp/badtoken"
if out="$(run_install "$tmp/badtoken" 'NURLINGS_DOWNLOAD_TOKEN=bad token' --)"; then fail "malformed token should fail"; fi
[[ "$out" == *"NURLINGS_DOWNLOAD_TOKEN contains a character"* ]] || fail "missing token validation message: $out"
[[ "$out" != *"bad token"* ]] || fail "malformed token echoed"

echo "install-images private registry smoke ok"
