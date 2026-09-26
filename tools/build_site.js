// db에서 내려받은 JSON(meta.json + day*.json 또는 read_db out_dir 구조) → 공개 site/index.html
//  · 1~6주차·순서·묵상·암송은 평문(비밀번호 없음)
//  · 7일차(긴급·중보기도)만 AES-256-GCM(PBKDF2-SHA256 600k)으로 암호화해 seed.locked7 에 넣고, 탭을 누르면 페이지 안에서 비밀번호로 풀림
//  · 1~6주차 항목 중 pub===true 인 연동 항목(예: 4주차 사명자 : 박일근)은 빌드 시 7일차 내용을 그대로 박아 넣어 공개, 나머지 7일차 연동 항목은 잠금 표시
// 사용: node build_site.js <dataDir> <password> [outDir=site]
const fs=require("fs"), path=require("path"), crypto=require("crypto");
const [,, dataDir, pw, outDir="site"] = process.argv;
if(!dataDir||!pw){ console.error("usage: node build_site.js <dataDir> <password> [outDir]"); process.exit(1); }
function findJson(dir){ // read_db out_dir: <dir>/prayer/meta.json, <dir>/prayer/meta/days/N.json  |  dbseed: meta.json, dayN.json
  const r={meta:null,days:[],dev:null};
  const walk=(d)=>fs.readdirSync(d,{withFileTypes:true}).forEach(e=>{const p=path.join(d,e.name); if(e.isDirectory()) walk(p); else if(/\.json$/.test(e.name)){ const j=JSON.parse(fs.readFileSync(p,"utf8")); if(j.meeting&&j.commonPrayer) r.meta=j; else if(j.no&&j.sections) r.days.push(j); else if(j.amsong) r.dev=j; }});
  walk(dir); r.days.sort((a,b)=>a.no-b.no); return r;
}
const {meta,days}=findJson(dataDir);
if(!meta||!days.length) { console.error("data not found in", dataDir); process.exit(1); }
(meta.dayIndex||[]).forEach(x=>{const d=days.find(y=>y.no===x.no); if(d){d.title=x.title; d.sub=x.sub; if(x.accent)d.accent=x.accent;}});
const PLAN=JSON.parse(fs.readFileSync(path.join(__dirname,"devotion_plan.json"),"utf8"));
const dev=Object.assign({start:"2026-08-02",amsong:[],rev:0},findJson(dataDir).dev||{});

// --- 앱의 mirrorOf 와 같은 규칙(공개 스냅샷용) ---
const dayByNo=n=>days.find(d=>d.no===n)||null;
function mirrorOf(it){
  if(!it||!it.mirror) return null; const m=it.mirror, d=dayByNo(m.day); if(!d) return null;
  const secs=m.secs||(m.sec?[m.sec]:null); const out=[]; let first=null;
  for(const sc of d.sections){
    if(secs&&!secs.some(q=>(sc.title||"").indexOf(q)>=0)) continue;
    if(!m.item){ let its=sc.items; if(m.match) its=its.filter(x=>(x.t||"").indexOf(m.match)>=0);
      if(m.brief){ let bs=its.filter(x=>x.b); if(!bs.length) bs=its; if(secs&&secs.length>1) out.push(sc.title); bs.forEach(x=>out.push((secs&&secs.length>1?"- ":"")+(x.b||x.t))); if(!first) first=sc.title; if(secs&&secs.length>1) continue; return {t:sc.title,d:out}; }
      return {t:sc.title,d:its.map(x=>{const dd=x.d||[]; return dd.length?x.t+" — "+dd.join(" · "):x.t;})}; }
    for(const x of sc.items){ if((x.t||"").indexOf(m.item)===0){ let dd=x.d||[];
      if(m.block){ const res=[]; let on=false; for(const L of dd){ const isSub=/^-\s+/.test(L); if(!isSub){ on=(L.replace(/^!\s*/,"").indexOf(m.block)===0); continue; } if(on) res.push(L.replace(/^-\s+/,"")); } return {t:x.t,d:res}; }
      if(m.line) dd=dd.filter(l=>l.indexOf(m.line)>=0); return {t:x.t,d:dd}; } } }
  if(out.length) return {t:first||"",d:out};
  return null;
}
const pubDays=days.filter(d=>d.no!==7).map(d=>JSON.parse(JSON.stringify(d)));
let inlined=0, locked=0; const hidden=[]; // 잠긴 연동 항목은 공개 원문에서 제목의 이름·연동 대상을 빼고, 원본은 7일차와 함께 암호화해 두었다가 풀리면 되돌림
pubDays.forEach(d=>d.sections.forEach((s,si)=>s.items.forEach((it,i)=>{
  if(!it.mirror||it.mirror.day!==7) return;
  if(it.pub){ const src=mirrorOf(it); s.items[i]={t:it.t,d:src?src.d:(it.d||[])}; inlined++; }
  else { locked++; hidden.push({no:d.no,si,ii:i,it:JSON.parse(JSON.stringify(it))}); // 원본(연동 대상·label 포함)은 암호화 쪽에만
    s.items[i]={t:/^사명자\s*:/.test(it.t)?"사명자 :":it.t, d:[], mirror:{day:7}}; }
})));
const day7=days.find(d=>d.no===7);
if(!day7){ console.error("day 7 not found"); process.exit(1); }
const SK=crypto.pbkdf2Sync(pw,"prayer-scores-v1",200000,32,"sha256"); // 악보 암호화 키(고정 salt) — 7일차 암호문 안에만 실림
const secret=JSON.stringify({day:day7,hidden,sk:SK.toString("base64")});
const salt=crypto.randomBytes(16), iv=crypto.randomBytes(12), ITER=600000;
const key=crypto.pbkdf2Sync(pw, salt, ITER, 32, "sha256");
const c=crypto.createCipheriv("aes-256-gcm", key, iv);
const ct=Buffer.concat([c.update(Buffer.from(secret,"utf8")), c.final(), c.getAuthTag()]);
const locked7={salt:salt.toString("base64"),iv:iv.toString("base64"),iter:ITER,ct:ct.toString("base64")};

const D={devotion:{start:dev.start,amsong:dev.amsong,amsongState:dev.amsongState||{current:"psa139",done:{}},updatedAt:dev.updatedAt||"",rev:dev.rev,plan:PLAN},rev:meta.rev,updated:meta.updated,updatedAt:meta.updatedAt,anchorSunday:meta.anchorSunday||meta.anchorMonday,anchorWeek:meta.anchorWeek,meeting:meta.meeting,commonPrayer:meta.commonPrayer,songs:meta.songs||null,dayIndex:meta.dayIndex||[],days:pubDays,locked7};
const seed=JSON.stringify(D).replace(/<\/script/g,"<\\/script");
const html=fs.readFileSync(path.join(__dirname,"prayer_app.src.html"),"utf8").replace("__SEED__",seed);
// 공개 원문에 7일차 실명(선교사 목록 등)이 새지 않는지 확인
const names=[]; day7.sections.forEach(s=>{ if(/^[가-힣]{2,4}$/.test(s.title)) names.push(s.title); s.items.forEach(it=>{ if(/^[가-힣]{2,4} \(/.test(it.t)) names.push(it.t.split(" (")[0]); }); }); hidden.forEach(h=>{ const n=/^사명자\s*:\s*(\S+)/.exec(h.it.t); if(n) names.push(n[1]); });
const pubJson=JSON.stringify(pubDays);
// 잠긴 연동 항목의 실제 내용(환아 이름 등)이 공개 원문에 없는지도 확인
hidden.forEach(h=>{ const src=mirrorOf(h.it); (src?src.d:[]).forEach(l=>{ if(l&&l.length>6&&html.indexOf(l)>=0&&!pubJson.includes(l)) names.push(l.slice(0,30)); }); });
const leak=names.filter(n=>html.indexOf(n)>=0 && !pubJson.includes(n));
const leak2=names.filter(n=>pubJson.includes(n)); if(leak2.length) console.warn("note: day-7 names also present in public days (intended?):",[...new Set(leak2)].join(", "));
if(leak.length){ console.error("LEAK? day-7 names found in public html:", leak); process.exit(2); }
const out=path.resolve(process.cwd(),outDir); fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(__dirname,"prayer_app.html"),html);
fs.writeFileSync(path.join(out,"index.html"),html);
console.log("public site built from rev",D.rev,"updated",D.updated,"| day7 encrypted",Math.round(ct.length/1024)+"KB | pub-inlined",inlined,"locked mirrors",locked,"hidden titles",hidden.length,"→",path.join(out,"index.html"),Math.round(html.length/1024)+"KB");
