#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
site_dir='/thome/1panel/1panel/www/sites/new.yucoder.cn/index'

cd "$repo_dir"
if [[ "$(git branch --show-current)" != 'master' ]]; then
  echo 'Please switch this checkout to master before deploying.' >&2
  exit 1
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo 'The checkout has local changes. Commit or save them before deploying.' >&2
  exit 1
fi

git pull --ff-only origin master
npm ci
npm run build
test -s dist/index.html

mkdir -p -- "$site_dir"
# Copy assets before the entry point so existing clients can finish loading.
# Keep previous hashed assets and server-managed files; do not delete the site directory.
while IFS= read -r -d '' entry; do
  cp -a -- "$entry" "$site_dir/"
done < <(find dist -mindepth 1 -maxdepth 1 ! -name index.html -print0)
entry_tmp="$(mktemp "$site_dir/.index.html.XXXXXX")"
trap 'rm -f -- "$entry_tmp"' EXIT
cp -- dist/index.html "$entry_tmp"
chmod 644 "$entry_tmp"
mv -f -- "$entry_tmp" "$site_dir/index.html"
echo "Deployed to $site_dir"
