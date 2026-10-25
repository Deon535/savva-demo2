// node phone.js on.png off.png — телефонный набор: убрать значок, подогнать тёмный кадр, затухание тротуара → lit_p.png / off_p.png
const { execFileSync } = require('child_process');
const S = __dirname, [onF, offF] = [process.argv[2], process.argv[3]], W = 572, H = 1024, K = 0.5;
const rd = f => execFileSync('ffmpeg', ['-v','error','-i',f,'-f','rawvideo','-pix_fmt','rgb24','-'], { maxBuffer: 1 << 28 });
const wr = (b, f) => execFileSync('ffmpeg', ['-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',W+'x'+H,'-i','-',f], { input: b });
const L = Float32Array.from({ length: 256 }, (_, i) => { const v = i / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
const SRGB = v => Math.round(255 * Math.min(1, v <= .0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - .055));
const on = rd(onF), off = rd(offF);
// 1) значок Gemini: область [453,903,512,962] закрываем соседним куском того же ряда плитки (на 62 px левее), края растушёваны
function patch(b) { const [x0,y0,x1,y1,sh,f] = [453,903,512,962,62,7]; const o = Buffer.from(b);
  for (let y = y0 - f; y < y1 + f; y++) for (let x = x0 - f; x < x1 + f; x++) {
    const e = Math.min(1, Math.min(x - x0 + f, x1 + f - x, y - y0 + f, y1 + f - y) / (2 * f));
    for (let c = 0; c < 3; c++) { const i = (y*W+x)*3+c; o[i] = Math.round(b[i] * (1 - e) + b[(y*W+x-sh)*3+c] * e); } }
  return o; }
const onP = patch(on), offP = patch(off);
// 2) цвет и яркость тёмного: на стене и тротуаре (там нет ламп) = K от горящего, оттенок горящего
const regs = [[100,40,340,250],[100,580,500,880]];
const sa = [0,0,0], sb = [0,0,0];
for (const [x0,y0,x1,y1] of regs) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) for (let c = 0; c < 3; c++) { sa[c] += L[onP[(y*W+x)*3+c]]; sb[c] += L[offP[(y*W+x)*3+c]]; }
const g = sa.map((v, c) => K * v / sb[c]); console.log('gain', g.map(v => v.toFixed(2)).join(' '));
const offG = Buffer.alloc(offP.length); for (let i = 0; i < offP.length; i++) offG[i] = SRGB(L[offP[i]] * g[i % 3]);
// 3) свет кафе гаснет по тротуару (одинаково в обоих кадрах)
const [r0, r1, fmin] = [520, 830, 0.33];
function fall(b) { const o = Buffer.alloc(b.length); for (let y = 0; y < H; y++) { let t = Math.min(1, Math.max(0, (y - r0) / (r1 - r0))); t = t*t*(3-2*t); const f = 1 - (1 - fmin) * t;
  for (let x = 0; x < W * 3; x++) { const i = y*W*3+x; o[i] = SRGB(L[b[i]] * f); } } return o; }
wr(onP, S + '/lit_p0.png'); wr(offG, S + '/off_p0.png');   // до затухания: по ним считаются маски
wr(fall(onP), S + '/lit_p.png'); wr(fall(offG), S + '/off_p.png');
console.log('ok');
