#!/usr/bin/env bash
# End-to-end Docker smoke test:
#   1. Build skill-trust locally and pack a tarball
#   2. Install the tarball globally inside a clean Node 22 container
#   3. Test local lint/vet/score commands
#   4. Test remote GitHub vet/score and skills.sh find/recommend commands
#   5. Run live LLM-backed scan commands using LLM_API_* environment
#
# Run from the skill-trust project root:
#   LLM_API_KEY=... LLM_API_URL=... LLM_MODEL=... bash scripts/e2e-test.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

for var in LLM_API_KEY LLM_API_URL LLM_MODEL; do
  if [[ -z "${!var:-}" ]]; then
    echo "Missing required environment variable: $var" >&2
    echo "Live scan tests require LLM_API_KEY, LLM_API_URL, and LLM_MODEL." >&2
    exit 1
  fi
done

section() {
  echo
  echo "======================================================================"
  echo "  $*"
  echo "======================================================================"
}

section "Building skill-trust"
npm install --silent
npm run build --silent

section "Packing tarball"
rm -f mnvsk97-skill-trust-*.tgz
TARBALL="$(npm pack --silent)"
echo "Produced: $TARBALL"
trap 'rm -f "$ROOT/$TARBALL"' EXIT

section "Running packaged CLI in Docker"
docker run --rm \
  -e LLM_API_KEY \
  -e LLM_API_URL \
  -e LLM_MODEL \
  -v "$ROOT/$TARBALL:/work/skill-trust.tgz:ro" \
  -v "$ROOT/skill:/work/skill:ro" \
  node:22-slim bash -c '
    set -euo pipefail

    section() {
      echo
      echo "======================================================================"
      echo "  $*"
      echo "======================================================================"
    }

    require_output() {
      local file="$1"
      local pattern="$2"
      local message="$3"
      if ! grep -Eq "$pattern" "$file"; then
        echo "$message" >&2
        echo "--- output ---" >&2
        cat "$file" >&2
        exit 1
      fi
    }

    section "Container dependencies"
    apt-get update -qq
    apt-get install -y --no-install-recommends git ca-certificates curl >/dev/null

    section "Install packaged CLI"
    npm install -g /work/skill-trust.tgz >/dev/null
    version="$(skill-trust --version)"
    if [[ "$version" != "0.3.0" ]]; then
      echo "Expected skill-trust version 0.3.0, got $version" >&2
      exit 1
    fi

    skill-trust --help > /tmp/skill-trust-help.txt
    for command in scan vet score find recommend; do
      require_output /tmp/skill-trust-help.txt "(^|[[:space:]])$command([[:space:]]|$)" "Missing command in --help: $command"
    done

    section "Local skill lint/vet/score"
    skill-trust lint /work/skill
    skill-trust vet /work/skill | tee /tmp/local-vet.txt
    require_output /tmp/local-vet.txt "REVIEW" "Expected bundled skill vet result to be REVIEW."
    skill-trust score /work/skill > /tmp/local-score.json
    node -e '"'"'
      const fs = require("fs");
      const score = JSON.parse(fs.readFileSync("/tmp/local-score.json", "utf8"));
      if (score.target !== "/work/skill") throw new Error("unexpected local score target");
      if (score.verdict !== "review") throw new Error(`expected review verdict, got ${score.verdict}`);
      if (typeof score.score !== "number") throw new Error("missing numeric score");
    '"'"'

    section "Remote GitHub skill vet/score"
    target="vercel-labs/agent-skills@vercel-react-best-practices"
    skill-trust vet "$target" | tee /tmp/remote-vet.txt
    require_output /tmp/remote-vet.txt "RECOMMENDED|REVIEW" "Expected remote vet to finish with a non-blocked verdict."
    skill-trust score "$target" > /tmp/remote-score.json
    node -e '"'"'
      const fs = require("fs");
      const score = JSON.parse(fs.readFileSync("/tmp/remote-score.json", "utf8"));
      if (score.verdict === "blocked") throw new Error("remote score unexpectedly blocked");
      if (typeof score.score !== "number") throw new Error("missing numeric remote score");
    '"'"'

    section "skills.sh find/recommend"
    skill-trust find react | tee /tmp/find-react.txt
    require_output /tmp/find-react.txt "npx skills add" "Expected find output to include install commands."

    skill-trust recommend react | tee /tmp/recommend-react.txt
    require_output /tmp/recommend-react.txt "Recommended|Review first" "Expected recommendation grouping."
    require_output /tmp/recommend-react.txt "Install: npx skills add" "Expected recommendation install command."

    skill-trust recommend react --vet --limit 1 | tee /tmp/recommend-react-vet.txt
    require_output /tmp/recommend-react-vet.txt "file-level vet completed" "Expected --vet recommendation to run file-level vetting."

    section "Live LLM scan"
    skill-trust scan "$target" | tee /tmp/scan-remote.txt
    require_output /tmp/scan-remote.txt "Semantic scan:" "Expected semantic scan header."
    require_output /tmp/scan-remote.txt "PASSED|FAILED" "Expected semantic scan status."

    skill-trust vet "$target" --scan | tee /tmp/remote-vet-scan.txt
    require_output /tmp/remote-vet-scan.txt "Trust review:" "Expected vet --scan trust review output."
    require_output /tmp/remote-vet-scan.txt "RECOMMENDED|REVIEW|BLOCKED" "Expected vet --scan verdict."

    skill-trust recommend react --scan --limit 1 | tee /tmp/recommend-react-scan.txt
    require_output /tmp/recommend-react-scan.txt "file-level vet plus semantic scan completed|vetting failed" "Expected recommend --scan to attempt semantic scan."
  '

echo
echo "==> Docker smoke test completed."
