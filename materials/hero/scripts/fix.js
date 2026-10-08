const { execFileSync } = require('child_process');
const rd = f => execFileSync('ffmpeg', ['-v','error','-i',f,'-f','rawvideo','-pix_fmt','rgb24','-'], { maxBuffer: 1 << 28 });
const wr = (buf, W, H, f) => execFileSync('ffmpeg', ['-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',W+'x'+H,'-i','-',f], { input: buf });
const S = __dirname;
// 1) телефон: подпись под سافا в C испорчена — берём её из B, приводим к яркости C
{ const W = 714, H = 1280, B = rd(S + '/lit_m.jpg'), C = rd(S + '/off_m.png');
  const [x0, y0, x1, y1, f] = [446, 506, 574, 536, 4];
  const sb = [0,0,0], sc = [0,0,0]; let n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { for (let c = 0; c < 3; c++) { sb[c] += B[(y*W+x)*3+c]; sc[c] += C[(y*W+x)*3+c]; } n++; }
  const k = sc.map((v, c) => v / sb[c]);
  for (let y = y0 - f; y < y1 + f; y++) for (let x = x0 - f; x < x1 + f; x++) {
    const e = Math.min(1, (Math.min(x - x0 + f, x1 + f - x, y - y0 + f, y1 + f - y)) / (2 * f));
    for (let c = 0; c < 3; c++) { const i = (y*W+x)*3+c; C[i] = Math.round(C[i] * (1 - e) + Math.min(255, B[i] * k[c]) * e); } }
  wr(C, W, H, S + '/off_m.png'); console.log('C patched, k=', k.map(v => v.toFixed(2)).join(' ')); }
// 2) компьютер: синий экран в тёмном зале A — снимаем синеву
{ const W = 1280, H = 714, A = rd(S + '/off_d.png'); let n = 0;
  for (let y = 395; y < 475; y++) for (let x = 460; x < 535; x++) { const i = (y*W+x)*3, [r, g, b] = [A[i], A[i+1], A[i+2]];
    if (b > r) { const l = Math.round(0.3*r + 0.59*g + 0.11*b); A[i] = Math.round(l * 1.04); A[i+1] = l; A[i+2] = Math.round(l * 0.9); n++; } }
  wr(A, W, H, S + '/off_d.png'); console.log('A blue px fixed', n); }
