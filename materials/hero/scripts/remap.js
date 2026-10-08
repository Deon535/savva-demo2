// node remap.js in out W H "y0:d0,y1:d1,..."  — строка выхода y берётся из строки входа y + d(y), d — ломаная, интерполяция линейная
const { execFileSync } = require('child_process');
const [inp, out, W, H, pts] = [process.argv[2], process.argv[3], +process.argv[4], +process.argv[5], process.argv[6]];
const P = pts.split(',').map(s => s.split(':').map(Number));
const d = y => { if (y <= P[0][0]) return P[0][1]; for (let i = 1; i < P.length; i++) if (y <= P[i][0]) { const [a, da] = P[i-1], [b, db] = P[i]; return da + (db - da) * (y - a) / (b - a); } return P[P.length-1][1]; };
const src = execFileSync('ffmpeg', ['-v','error','-i',inp,'-f','rawvideo','-pix_fmt','rgb24','-'], { maxBuffer: 1 << 28 });
const dst = Buffer.alloc(W * H * 3);
for (let y = 0; y < H; y++) {
  const sy = Math.min(H - 1, Math.max(0, y + d(y))), y0 = Math.floor(sy), y1 = Math.min(H - 1, y0 + 1), t = sy - y0;
  for (let x = 0; x < W * 3; x++) dst[y * W * 3 + x] = Math.round(src[y0 * W * 3 + x] * (1 - t) + src[y1 * W * 3 + x] * t);
}
execFileSync('ffmpeg', ['-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',W+'x'+H,'-i','-',out], { input: dst });
