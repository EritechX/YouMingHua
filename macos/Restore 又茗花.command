#!/bin/bash
set -euo pipefail
INSTALLED="$HOME/.codex/youminghua/scripts/restore-dream-skin-macos.sh"
if [ ! -x "$INSTALLED" ]; then
  /usr/bin/osascript -e 'display alert "没有找到已安装的 又茗花。" as warning' >/dev/null
  exit 1
fi
exec "$INSTALLED" --restore-base-theme --restart-codex
