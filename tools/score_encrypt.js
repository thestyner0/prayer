// 악보 이미지 암호화: node score_encrypt.js <비밀번호> <입력 이미지> <출력 .bin>
// 출력 = iv(12바이트) + AES-256-GCM 암호문(+tag). 키 = PBKDF2(비밀번호, "prayer-scores-v1", 200000, SHA-256)
const fs=require("fs"),crypto=require("crypto");
const [pw,inp,out]=process.argv.slice(2);
const key=crypto.pbkdf2Sync(pw,"prayer-scores-v1",200000,32,"sha256"), iv=crypto.randomBytes(12);
const c=crypto.createCipheriv("aes-256-gcm",key,iv);
fs.writeFileSync(out,Buffer.concat([iv,c.update(fs.readFileSync(inp)),c.final(),c.getAuthTag()]));
console.log("encrypted",inp,"→",out);
