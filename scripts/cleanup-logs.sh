#!/usr/bin/env bash
set -euo pipefail

show_help() {
  cat <<'HELP'
Usage: cleanup-logs.sh [PATH ...]

Removes common log and crash-dump files from the provided paths.
If no path is provided, the current directory is scanned.

Examples:
  ./scripts/cleanup-logs.sh
  ./scripts/cleanup-logs.sh ./build ./logs
HELP
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  show_help
  exit 0
fi

if [[ "$#" -eq 0 ]]; then
  set -- .
fi

# Match common log/crash patterns used by game engines and tooling.
patterns=(
  "*.log"
  "*.LOG"
  "*.dmp"
  "*.DMP"
  "crash-*.txt"
  "hs_err_pid*.log"
)

removed=0
for target in "$@"; do
  if [[ ! -d "$target" ]]; then
    echo "Skipping '$target' (not a directory)"
    continue
  fi

  while IFS= read -r -d '' file; do
    rm -f "$file"
    echo "Removed: $file"
    ((removed += 1))
  done < <(find "$target" -type f \( \
    -name "${patterns[0]}" -o \
    -name "${patterns[1]}" -o \
    -name "${patterns[2]}" -o \
    -name "${patterns[3]}" -o \
    -name "${patterns[4]}" -o \
    -name "${patterns[5]}" \
  \) -print0)
done

echo "Done. Removed $removed file(s)."
