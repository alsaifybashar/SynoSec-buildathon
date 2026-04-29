#!/usr/bin/env sh
set -eu

cd /workspace

manifest_hash="$(
  {
    sha256sum package.json
    sha256sum pnpm-lock.yaml
    sha256sum pnpm-workspace.yaml
    sha256sum apps/backend/package.json
    sha256sum apps/frontend/package.json
    sha256sum apps/connector/package.json
    sha256sum packages/contracts/package.json
  } | sha256sum | awk '{ print $1 }'
)"

state_dir="/workspace/node_modules/.cache"
state_file="${state_dir}/pnpm-manifest.hash"

install_required=0

if [ ! -d /workspace/node_modules/.pnpm ] || [ ! -f "$state_file" ] || [ "$(cat "$state_file")" != "$manifest_hash" ]; then
  install_required=1
fi

# Each workspace package mounts its own node_modules volume in docker-compose.
# Those volumes can become empty or stale independently of the root pnpm store,
# so validate a direct dependency link for each workspace before skipping install.
for required_path in \
  /workspace/apps/backend/node_modules/@prisma/client \
  /workspace/apps/frontend/node_modules/react-router-dom \
  /workspace/apps/connector/node_modules/@synosec/contracts \
  /workspace/packages/contracts/node_modules/zod
do
  if [ ! -e "$required_path" ]; then
    install_required=1
    break
  fi
done

if [ "$install_required" -eq 1 ]; then
  mkdir -p "$state_dir"
  CI=true pnpm install --frozen-lockfile
  printf "%s" "$manifest_hash" > "$state_file"
fi
