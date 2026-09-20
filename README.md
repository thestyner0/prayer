# 주일기도모임 · 기도제목 대시보드 (공개 배포)

- `index.html` — 공개 대시보드. 1~6주차·기도모임 순서·묵상·암송은 그대로 보이고, 「긴급·중보」 탭(7일차)만 AES-GCM으로 암호화되어 있어 비밀번호를 넣어야 열립니다. 다른 주차에서 7일차와 연동된 항목도 비밀번호를 넣기 전에는 🔒로만 표시됩니다.
- `manifest.webmanifest`, `sw.js`, `icon-*.png` — 홈 화면 추가(PWA)·오프라인용.
- `tools/` — 대시보드 데이터(JSON) → index.html(7일차만 암호화) 을 만드는 빌드 스크립트.
  `node tools/build_site.js <dataDir> <password> .`
- `rev.txt` — 마지막으로 배포된 데이터 rev.

내용은 Claude 편집기(아티팩트)에서 고치고, 매일 아침 자동으로 여기에 반영됩니다.
