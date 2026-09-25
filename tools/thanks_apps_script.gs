// 기도모임 감사제목 저장소 — Google Apps Script 웹앱
// 배포: 배포 > 새 배포 > 유형 "웹 앱" > 실행 사용자 "나" > 액세스 권한 "모든 사용자" > 배포 > 웹 앱 URL 복사
const TOKEN = "ba8d6a8ccfa59dc1c818f993e43995111d77d3064ca542e677ab794c8c9062d1"; // 사이트 비밀번호에서 파생된 값 (비밀번호 자체는 아님)

function sheet_() {
  const p = PropertiesService.getScriptProperties();
  let id = p.getProperty("sid"), ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create("기도모임 감사제목");
    ss.getSheets()[0].appendRow(["id", "date", "name", "text", "ts"]);
    p.setProperty("sid", ss.getId());
  }
  return ss.getSheets()[0];
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function dstr_(v) { return (v instanceof Date) ? Utilities.formatDate(v, "Asia/Seoul", "yyyy-MM-dd") : String(v || ""); }

function doGet(e) {
  const tok = (e && e.parameter && e.parameter.tok) || "";
  if (tok !== TOKEN) return out_({ ok: false, err: "auth" });
  const v = sheet_().getDataRange().getValues(), items = [];
  for (let i = 1; i < v.length; i++) {
    if (!v[i][0]) continue;
    items.push({ id: String(v[i][0]), date: dstr_(v[i][1]), name: String(v[i][2] || ""), text: String(v[i][3] || ""), ts: dstr_(v[i][4]) });
  }
  return out_({ ok: true, items: items });
}

function doPost(e) {
  let b = {};
  try { b = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, err: "bad json" }); }
  if (b.tok !== TOKEN) return out_({ ok: false, err: "auth" });
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sh = sheet_();
    if (b.action === "add") {
      const text = String(b.text || "").trim().slice(0, 1000), name = String(b.name || "").trim().slice(0, 30);
      if (!text) return out_({ ok: false, err: "empty" });
      const id = Utilities.getUuid();
      const date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date || "")) ? b.date : Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd");
      sh.appendRow([id, "'" + date, name, text, new Date().toISOString()]);
      return out_({ ok: true, id: id });
    }
    if (b.action === "del") {
      const v = sh.getDataRange().getValues();
      for (let i = 1; i < v.length; i++) { if (String(v[i][0]) === String(b.id)) { sh.deleteRow(i + 1); return out_({ ok: true }); } }
      return out_({ ok: false, err: "notfound" });
    }
    return out_({ ok: false, err: "action" });
  } finally { lock.releaseLock(); }
}
