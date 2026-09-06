# 주일기도모임 · 기도제목 대시보드 (암호화 배포)

- `index.html` — 비밀번호로 암호화된 대시보드. 열면 비밀번호를 묻습니다.
- `manifest.webmanifest`, `sw.js`, `icon-*.png` — 홈 화면 추가(PWA)·오프라인용.
- `tools/` — 대시보드 데이터(JSON) → 공개용 HTML → 암호화 index.html 을 만드는 빌드 스크립트.
  `node tools/build_site.js <dataDir> <password> .`
- `rev.txt` — 마지막으로 배포된 데이터 rev.

내용은 Claude 편집기(아티팩트)에서 고치고, 매일 아침 자동으로 여기에 반영됩니다.
