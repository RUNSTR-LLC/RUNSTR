#!/bin/bash
# Manual workaround: recursively copy ALL React Native codegen tmp outputs
# (including Fabric renderer artifacts) into the locations the Pods build
# expects. Root cause: install-time codegen silently no-ops with
# newArchEnabled + useFrameworks:static.
#
# Usage: ./scripts/copy-codegen-headers.sh

set -uo pipefail

PROJECT_ROOT="/Users/dakotabrown/runstr.project"
TMP_ROOT=$(echo /private/var/folders/d6/*/T)
GEN_DEST="$PROJECT_ROOT/ios/build/generated/ios"

DERIVED=$(ls -dt ~/Library/Developer/Xcode/DerivedData/RUNSTR-* 2>/dev/null | head -1)
FRAMEWORK_HEADERS="$DERIVED/Build/Products/Debug-iphonesimulator/ReactCodegen/ReactCodegen.framework/Headers"

if [ -z "$DERIVED" ]; then
  echo "ERROR: No RUNSTR-* DerivedData found. Build at least once first."
  exit 1
fi

echo "DerivedData:       $DERIVED"
echo "Framework Headers: $FRAMEWORK_HEADERS"
echo "Generated dest:    $GEN_DEST"
echo ""

mkdir -p "$GEN_DEST" "$FRAMEWORK_HEADERS"

# Find every tmp dir matching the codegen pattern and rsync its full out/ tree.
# Newest tmp wins for any module (sort by mtime ascending, so later overwrites earlier).
count=0
for tmp_out in $(ls -dtr "$TMP_ROOT"/*/out 2>/dev/null); do
  if [ -d "$tmp_out" ]; then
    rsync -a "$tmp_out/" "$GEN_DEST/"
    rsync -a "$tmp_out/" "$FRAMEWORK_HEADERS/"
    count=$((count + 1))
  fi
done

echo "Mirrored $count tmp dirs into both destinations."
echo ""
echo "=== Verification ==="
echo "Files in $FRAMEWORK_HEADERS:"
find "$FRAMEWORK_HEADERS" -name "*.h" | wc -l | xargs echo "  .h count:"
echo "Files in $GEN_DEST:"
find "$GEN_DEST" -name "*.h" | wc -l | xargs echo "  .h count:"
echo ""
echo "Sample Fabric renderer headers:"
find "$GEN_DEST/react/renderer/components" -name "*.h" 2>/dev/null | head -5
echo ""
echo "Done. Retry Cmd+R in Xcode."
