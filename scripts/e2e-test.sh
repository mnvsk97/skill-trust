#!/usr/bin/env bash
# End-to-end smoke test:
#   1. Build skill-check locally and pack a tarball
#   2. Spin up a clean Node 20 container
#   3. Install the tarball globally inside the container
#   4. Clone the caveman skill repo
#   5. Run `skill-check lint` against each of its 5 skills
#
# Run from the skill-check project root:
#   bash scripts/e2e-test.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Building skill-check..."
npm install --silent
npm run build --silent

echo "==> Packing tarball..."
rm -f mnvsk97-skill-check-*.tgz
TARBALL=$(npm pack --silent)
echo "    Produced: $TARBALL"

echo "==> Running in Docker (node:20-slim)..."
docker run --rm \
  -v "$ROOT/$TARBALL:/work/skill-check.tgz:ro" \
  node:20-slim bash -euxc '
    apt-get update -qq && apt-get install -y --no-install-recommends git ca-certificates >/dev/null
    npm install -g /work/skill-check.tgz
    skill-check --version

    git clone --depth 1 https://github.com/JuliusBrussee/caveman /caveman

    for skill in caveman caveman-commit caveman-help caveman-review compress; do
      echo
      echo "======================================================================"
      echo "  LINT: skills/$skill"
      echo "======================================================================"
      skill-check lint "/caveman/skills/$skill" || true
    done
  '

echo
echo "==> Done."
