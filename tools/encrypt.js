// 기도_대시보드.html → 암호화된 site/index.html  (AES-256-GCM, PBKDF2-SHA256 600k)
// 사용: node encrypt.js <입력html> <비밀번호> <출력폴더>
const fs=require("fs"), path=require("path"), crypto=require("crypto");
const [,, src, pw, out] = process.argv;
if(!src||!pw||!out){ console.error("usage: node encrypt.js <html> <password> <outdir>"); process.exit(1); }
const html=fs.readFileSync(src,"utf8");
const salt=crypto.randomBytes(16), iv=crypto.randomBytes(12), ITER=600000;
const key=crypto.pbkdf2Sync(pw, salt, ITER, 32, "sha256");
const c=crypto.createCipheriv("aes-256-gcm", key, iv);
const enc=Buffer.concat([c.update(html,"utf8"), c.final(), c.getAuthTag()]);
const tpl=fs.readFileSync(path.join(__dirname,"wrapper.html"),"utf8");
const page=tpl
  .replace("__SALT__", salt.toString("base64"))
  .replace("__IV__", iv.toString("base64"))
  .replace("__ITER__", String(ITER))
  .replace("__DATA__", enc.toString("base64"))
  .replace("__BUILT__", new Date().toISOString().slice(0,10));
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,"index.html"), page);
console.log("encrypted →", path.join(out,"index.html"), Math.round(page.length/1024)+"KB");
