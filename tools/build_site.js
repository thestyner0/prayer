// db에서 내려받은 JSON(meta.json + day*.json 또는 read_db out_dir 구조) → prayer_app.html(공개용, 편집 불가) → 암호화 site/index.html
// 사용: node build_site.js <dataDir> <password> [outDir=site]
const fs=require("fs"), path=require("path"), cp=require("child_process");
const [,, dataDir, pw, outDir="site"] = process.argv;
if(!dataDir||!pw){ console.error("usage: node build_site.js <dataDir> <password> [outDir]"); process.exit(1); }
function findJson(dir){ // read_db out_dir: <dir>/prayer/meta.json, <dir>/prayer/meta/days/N.json  |  dbseed: meta.json, dayN.json
  const r={meta:null,days:[],dev:null};
  const walk=(d)=>fs.readdirSync(d,{withFileTypes:true}).forEach(e=>{const p=path.join(d,e.name); if(e.isDirectory()) walk(p); else if(/\.json$/.test(e.name)){ const j=JSON.parse(fs.readFileSync(p,"utf8")); if(j.meeting&&j.commonPrayer) r.meta=j; else if(j.no&&j.sections) r.days.push(j); else if(j.amsong) r.dev=j; }});
  walk(dir); r.days.sort((a,b)=>a.no-b.no); return r;
}
const {meta,days}=findJson(dataDir);
if(!meta||!days.length) { console.error("data not found in", dataDir); process.exit(1); }
const PLAN=JSON.parse(fs.readFileSync(path.join(__dirname,"devotion_plan.json"),"utf8"));
const dev=Object.assign({start:"2026-08-02",amsong:[],rev:0},findJson(dataDir).dev||{});
const D={devotion:{start:dev.start,amsong:dev.amsong,rev:dev.rev,plan:PLAN},rev:meta.rev,updated:meta.updated,updatedAt:meta.updatedAt,anchorSunday:meta.anchorSunday||meta.anchorMonday,anchorWeek:meta.anchorWeek,meeting:meta.meeting,commonPrayer:meta.commonPrayer,days};
(meta.dayIndex||[]).forEach(x=>{const d=days.find(y=>y.no===x.no); if(d){d.title=x.title; d.sub=x.sub; if(x.accent)d.accent=x.accent;}});
const seed=JSON.stringify(D).replace(/<\/script/g,"<\\/script");
const html=fs.readFileSync(path.join(__dirname,"prayer_app.src.html"),"utf8").replace("__SEED__",seed);
fs.writeFileSync(path.join(__dirname,"prayer_app.html"),html);
cp.execFileSync("node",[path.join(__dirname,"encrypt.js"),path.join(__dirname,"prayer_app.html"),pw,path.resolve(process.cwd(),outDir)],{stdio:"inherit"});
console.log("site built from rev",D.rev,"updated",D.updated);
