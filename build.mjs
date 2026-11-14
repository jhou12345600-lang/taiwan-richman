import { build } from 'esbuild';
import fs from 'fs';
const r = await build({ entryPoints: ['src/main.js'], bundle: true, format: 'esm', write: false, external: ['three', 'three/addons/*'], minify: false, target: 'es2020', charset: 'utf8' });
const code = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const tpl = fs.readFileSync('template.html', 'utf8');
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/index.html', tpl.replace('/*__CODE__*/', () => code));
// 本機測試版：CDN 換成 node_modules
let dev = fs.readFileSync('dist/index.html', 'utf8')
  .replace('https://unpkg.com/mqtt@5.10.1/dist/mqtt.min.js', '/node_modules/mqtt/dist/mqtt.min.js')
  .replace('https://unpkg.com/qrcode-generator@1.4.4/qrcode.js', '/node_modules/qrcode-generator/qrcode.js')
  .replace('https://unpkg.com/three@0.170.0/build/three.module.js', '/node_modules/three/build/three.module.js')
  .replace('https://unpkg.com/three@0.170.0/examples/jsm/', '/node_modules/three/examples/jsm/')
  .replace(/<link href="https:\/\/fonts[^>]*>/, '');
fs.writeFileSync('dev.html', dev);
console.log('built', (fs.statSync('dist/index.html').size / 1024).toFixed(0) + 'KB');
