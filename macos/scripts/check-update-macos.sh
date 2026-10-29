#!/bin/bash
# Fixed-version 又茗花 distribution; no upstream update feed is configured.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
VERSION="$(/usr/bin/tr -d '[:space:]' < "$ROOT/DISTRIBUTION_VERSION")"
printf '%s' "$VERSION" | /usr/bin/grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$' \
  || { printf 'Invalid DISTRIBUTION_VERSION.\n' >&2; exit 1; }
case "${1:-}" in
  --json)
    [ "$#" -eq 1 ] || exit 2
    printf '{"currentVersion":"v%s","latestVersion":null,"updateAvailable":false,"releaseUrl":null,"channel":"unconfigured","updateChannelConfigured":false}\n' "$VERSION"
    ;;
  --interactive)
    [ "$#" -eq 1 ] || exit 2
    /usr/bin/osascript <<'APPLESCRIPT'
display alert "又茗花" message "更新渠道尚未配置，请向分享者获取新版安装包。" buttons {"好"}
APPLESCRIPT
    ;;
  '')
    printf '又茗花 v%s — updates are supplied manually by the distributor.\n' "$VERSION"
    ;;
  *) printf 'Unknown update argument: %s\n' "$1" >&2; exit 2 ;;
esac
