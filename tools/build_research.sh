#!/bin/bash
# 연구주제 트래커 아티팩트(art_research_tracker.html) → 비밀번호 사이트 빌드
# 사용: bash build_research.sh [비밀번호=850403] [outDir=research_site]
set -e
cd "$(dirname "$0")"
PW="${1:-850403}"; OUT="${2:-research_site}"
FRAG=/root/dash/art_research_tracker.html
{ printf '<!DOCTYPE html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n</head>\n<body>\n'; cat "$FRAG"; printf '\n</body>\n</html>\n'; } > research_full.html
node encrypt.js research_full.html "$PW" "$OUT" wrapper_research.html
