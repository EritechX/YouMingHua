#!/bin/bash

set -euo pipefail
export LC_ALL=C
export LANG=C
export LC_CTYPE=C
ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
VERSION="$(/usr/bin/tr -d '[:space:]' < "$ROOT/VERSION")"
RELEASE_DIR="$ROOT/release"
ARCHIVE="$RELEASE_DIR/youminghua-v$VERSION.zip"
TMP="$(/usr/bin/mktemp -d /tmp/codex-dream-skin-release.XXXXXX)"
trap '/bin/rm -rf "$TMP"' EXIT

if [ "${1:-}" != "--skip-tests" ]; then "$ROOT/tests/run-tests.sh"; fi

/bin/mkdir -p "$TMP/youminghua" "$RELEASE_DIR"
/usr/bin/rsync -a \
  --exclude '.git/' \
  --exclude '.DS_Store' \
  --exclude 'release/' \
  --exclude 'presets/preset-arina-hashimoto/' \
  "$ROOT/" "$TMP/youminghua/"

# The macOS tree is also published as a standalone ZIP. Bundle prompt guides
# and their referenced images, then translate repository paths for this root.
"$ROOT/scripts/prepare-standalone-docs.sh" "$TMP/youminghua"
rewrite_standalone_links() {
  local file="$1"
  local temporary="${file}.standalone"
  /usr/bin/sed \
    -e 's#\.\./docs/#docs/#g' \
    -e 's#\.\./windows/#https://github.com/Fei-Away/Codex-Dream-Skin/tree/main/windows/#g' \
    "$file" > "$temporary"
  /bin/mv "$temporary" "$file"
}
rewrite_standalone_links "$TMP/youminghua/README.md"
PRESET_README="$TMP/youminghua/presets/README.md"
if [ -f "$PRESET_README" ]; then
  temporary="${PRESET_README}.standalone"
  /usr/bin/sed -e 's#\.\./\.\./docs/#../docs/#g' "$PRESET_README" > "$temporary"
  /bin/mv "$temporary" "$PRESET_README"
fi
/usr/bin/find "$TMP/youminghua" -type f \( -name '.DS_Store' -o -name '._*' \) -delete
[ ! -e "$TMP/youminghua/presets/preset-arina-hashimoto" ] \
  || { printf 'Restricted Arina preset entered the standalone ZIP.\n' >&2; exit 1; }
if /usr/bin/find "$TMP/youminghua" -type f -name 'arina-hashimoto-*' -print -quit | /usr/bin/grep -q .; then
  printf 'Restricted Arina documentation asset entered the standalone ZIP.\n' >&2
  exit 1
fi
/bin/chmod 755 "$TMP/youminghua"/*.command
/bin/chmod 755 "$TMP/youminghua"/scripts/*.sh "$TMP/youminghua"/tests/*.sh
/bin/rm -f "$ARCHIVE"
COPYFILE_DISABLE=1 /usr/bin/ditto -c -k --keepParent --norsrc --noextattr \
  "$TMP/youminghua" "$ARCHIVE"
SHA256="$(/usr/bin/shasum -a 256 "$ARCHIVE" | /usr/bin/awk '{print $1}')"
/usr/bin/printf '%s  %s\n' "$SHA256" "$(basename "$ARCHIVE")" > "$RELEASE_DIR/SHA256SUMS.txt"
/usr/bin/printf 'Created %s\nSHA-256 %s\n' "$ARCHIVE" "$SHA256"
