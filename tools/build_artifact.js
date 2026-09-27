// db에서 내려받은 JSON → 아티팩트용 HTML 조각 (7일차 포함 전부 평문; 아티팩트는 비공개)
// 사용: node build_artifact.js <dataDir> [out=/root/dash/art_prayer_app.html] [password(악보 키용)]
const fs=require("fs"), path=require("path"), crypto=require("crypto");
const [,, dataDir, out="/root/dash/art_prayer_app.html", pw]=process.argv;
function findJson(dir){ const r={meta:null,days:[],dev:null};
  const walk=(d)=>fs.readdirSync(d,{withFileTypes:true}).forEach(e=>{const p=path.join(d,e.name); if(e.isDirectory()) walk(p); else if(/\.json$/.test(e.name)){ const j=JSON.parse(fs.readFileSync(p,"utf8")); if(j.meeting&&j.commonPrayer) r.meta=j; else if(j.no&&j.sections) r.days.push(j); else if(j.amsong) r.dev=j; }});
  walk(dir); r.days.sort((a,b)=>a.no-b.no); return r; }
const {meta,days,dev:dv}=findJson(dataDir);
if(!meta||!days.length){ console.error("data not found in",dataDir); process.exit(1); }
(meta.dayIndex||[]).forEach(x=>{const d=days.find(y=>y.no===x.no); if(d){d.title=x.title; d.sub=x.sub; if(x.accent)d.accent=x.accent;}});
const PLAN=JSON.parse(fs.readFileSync(path.join(__dirname,"devotion_plan.json"),"utf8"));
const dev=Object.assign({start:"2026-08-02",amsong:[],rev:0},dv||{});
const sk=pw?crypto.pbkdf2Sync(pw,"prayer-scores-v1",200000,32,"sha256").toString("base64"):undefined;
const D={devotion:{start:dev.start,amsong:dev.amsong,amsongState:dev.amsongState||{current:"psa139",done:{}},updatedAt:dev.updatedAt||"",rev:dev.rev,plan:PLAN},rev:meta.rev,updated:meta.updated,updatedAt:meta.updatedAt,anchorSunday:meta.anchorSunday||meta.anchorMonday,anchorWeek:meta.anchorWeek,meeting:meta.meeting,commonPrayer:meta.commonPrayer,songs:meta.songs||null,sk,days};
let s=fs.readFileSync(path.join(__dirname,"prayer_app.src.html"),"utf8").replace("__SEED__",JSON.stringify(D).replace(/<\/script/g,"<\\/script"));
const tm=s.match(/<title>[^<]*<\/title>/i), title=tm?tm[0]:"";
s=s.replace(/<!DOCTYPE html>\s*/i,"").replace(/<html[^>]*>\s*/i,"").replace(/<head>\s*/i,"").replace(/<meta charset[^>]*>\s*/i,"").replace(/<meta name="viewport"[^>]*>\s*/i,"").replace(title+"\n","").replace(/<\/head>\s*<body>\s*/i,"\n").replace(/<\/body>\s*<\/html>\s*$/i,"");
s=title+"\n"+s;
fs.writeFileSync(out,s);
console.log("artifact fragment →",out,Math.round(s.length/1024)+"KB rev",D.rev,"days",days.map(d=>d.no).join(","),sk?"(score key)":"(no score key)");
