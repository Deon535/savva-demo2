// node hshift.js in out W H "x0:d0,x1:d1" — столбец x берётся из x + d(x), d — ломаная
const { execFileSync } = require('child_process');
const [inp, out, W, H, pts] = [process.argv[2], process.argv[3], +process.argv[4], +process.argv[5], process.argv[6]];
const P = pts.split(',').map(s => s.split(':').map(Number));
const d = x => { if (x <= P[0][0]) return P[0][1]; for (let i = 1; i < P.length; i++) if (x <= P[i][0]) { const [a, da] = P[i-1], [b, db] = P[i]; return da + (db - da) * (x - a) / (b - a); } return P[P.length-1][1]; };
const src = execFileSync('ffmpeg', ['-v','error','-i',inp,'-f','rawvideo','-pix_fmt','rgb24','-'], { maxBuffer: 1 << 28 });
const dst = Buffer.alloc(W * H * 3);
for (let x = 0; x < W; x++) { const sx = Math.min(W - 1, Math.max(0, x + d(x))), x0 = Math.floor(sx), x1 = Math.min(W - 1, x0 + 1), t = sx - x0;
  for (let y = 0; y < H; y++) for (let c = 0; c < 3; c++) dst[(y*W+x)*3+c] = Math.round(src[(y*W+x0)*3+c] * (1 - t) + src[(y*W+x1)*3+c] * t); }
execFileSync('ffmpeg', ['-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',W+'x'+H,'-i','-',out], { input: dst });
