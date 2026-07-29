import fs from 'node:fs';
import path from 'node:path';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const url = 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Patrick+Hand&family=Rock+Salt&family=Archivo:wght@400;500;600;700&display=swap';
const outDir = path.resolve('public/fonts');
fs.mkdirSync(outDir, { recursive: true });

const css = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();
const urls = [...new Set([...css.matchAll(/https:\/\/[^)]+\.woff2/g)].map(m => m[0]))];
let out = css;
for (const u of urls) {
  const name = u.split('/').slice(-2).join('-');
  const buf = Buffer.from(await (await fetch(u)).arrayBuffer());
  fs.writeFileSync(path.join(outDir, name), buf);
  out = out.split(u).join('./fonts/' + name);
}
fs.writeFileSync(path.join(outDir, 'fonts.css'), out.split('./fonts/').join('/fonts/'));
console.log('saved', urls.length, 'font files');
