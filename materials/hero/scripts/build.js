// node build.js d|m outdir — маски зон света + превью середины загорания
const { execFileSync } = require('child_process');
const S = __dirname, set = process.argv[2], OUT = process.argv[3];
const CFG = {
  d: { lit: S + '/lit_d.png', off: S + '/off_d.png', W: 1280, H: 714, zones: {
        // [x0,y0,x1,y1] прямоугольники зоны, перо (мягкий край), порог «свет ламп» lo..hi
        room: { r: [[150,270,592,578],[698,270,1124,578],[130,250,1150,290]], f: 14, lo: .004, hi: .03 },
        bra:  { r: [[598,326,692,484]], f: 16, lo: .01, hi: .08 },
        en:   { r: [[262,128,552,262]], f: 18, lo: .01, hi: .07 },
        ar:   { r: [[786,134,1026,262]], f: 18, lo: .01, hi: .07 },
        out:  { r: [[1170,420,1280,580],[0,190,60,320]], f: 24, lo: .01, hi: .06 } } },
  m: { lit: S + '/lit_m.jpg', off: S + '/off_m.png', W: 714, H: 1280, zones: {
        room: { r: [[80,546,330,722],[386,546,632,722],[66,532,650,560]], f: 10, lo: .004, hi: .03 },
        bra:  { r: [[332,570,384,668]], f: 10, lo: .01, hi: .08 },
        en:   { r: [[146,452,304,536]], f: 12, lo: .01, hi: .07 },
        ar:   { r: [[438,456,576,536]], f: 12, lo: .01, hi: .07 },
        out:  { r: [[640,620,714,720],[0,640,40,720]], f: 16, lo: .01, hi: .06 } } } }[set];
const { W, H } = CFG, N = W * H;
const rd = f => execFileSync('ffmpeg', ['-v','error','-i',f,'-f','rawvideo','-pix_fmt','rgb24','-'], { maxBuffer: 1 << 28 });
const LUT = Float32Array.from({ length: 256 }, (_, i) => { const v = i / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
const a = rd(CFG.lit), b = rd(CFG.off), La = new Float32Array(N), Lb = new Float32Array(N);
for (let i = 0; i < N; i++) { const f = (p, j) => 0.2126 * LUT[p[j]] + 0.7152 * LUT[p[j+1]] + 0.0722 * LUT[p[j+2]]; La[i] = f(a, i*3); Lb[i] = f(b, i*3); }
const rs = []; for (let i = 0; i < N; i += 7) if (Lb[i] > 0.004) rs.push(La[i] / Lb[i]); rs.sort((x, y) => x - y);
const g = rs[Math.floor(rs.length * 0.35)];
const art = new Float32Array(N); for (let i = 0; i < N; i++) art[i] = Math.max(0, La[i] - Lb[i] * g);
function blur(m, r) { // два прохода коробочного размытия ≈ гаусс
  const t = new Float32Array(N), o = new Float32Array(N);
  for (let k = 0; k < 2; k++) {
    const src = k ? o : m;
    for (let y = 0; y < H; y++) { let s = 0; for (let x = -r; x <= r; x++) s += src[y*W + Math.min(W-1, Math.max(0, x))];
      for (let x = 0; x < W; x++) { t[y*W+x] = s / (2*r+1); s += src[y*W + Math.min(W-1, x+r+1)] - src[y*W + Math.max(0, x-r)]; } }
    for (let x = 0; x < W; x++) { let s = 0; for (let y = -r; y <= r; y++) s += t[Math.min(H-1, Math.max(0, y))*W + x];
      for (let y = 0; y < H; y++) { o[y*W+x] = s / (2*r+1); s += t[Math.min(H-1, y+r+1)*W + x] - t[Math.max(0, y-r)*W + x]; } }
  }
  return o;
}
const ss = (lo, hi, v) => { const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo))); return t * t * (3 - 2 * t); };
const masks = {};
for (const [name, z] of Object.entries(CFG.zones)) {
  const rect = new Float32Array(N);
  for (const [x0,y0,x1,y1] of z.r) for (let y = Math.max(0,y0); y < Math.min(H,y1); y++) for (let x = Math.max(0,x0); x < Math.min(W,x1); x++) rect[y*W+x] = 1;
  const soft = blur(rect, z.f);
  const shape = blur(Float32Array.from(art, v => ss(z.lo, z.hi, v)), 3);
  const m = new Float32Array(N); for (let i = 0; i < N; i++) m[i] = Math.min(1, soft[i] * shape[i] * 1.15);
  masks[name] = m;
  // маска: белый + прозрачность, половинное разрешение (свет мягкий, деталь не нужна)
  const ya = Buffer.alloc(N * 2); for (let i = 0; i < N; i++) { ya[i*2] = 255; ya[i*2+1] = Math.round(m[i] * 255); }
  execFileSync('ffmpeg', ['-v','error','-y','-f','rawvideo','-pix_fmt','ya8','-s',W+'x'+H,'-i','-','-vf',`scale=${Math.round(W/2)}:${Math.round(H/2)}:flags=area`,'-pix_fmt','ya8',`${OUT}/hero-mask-${name}${set==='m'?'-m':''}.png`], { input: ya });
}
// превью: несколько моментов загорания (обычное смешивание: off → слои lit под масками)
const states = [[0,0,0,0,0,0],[1,0,0,0,0,0],[1,1,1,0,0,0],[1,1,1,1,1,0],[1,1,1,1,1,1]];
const names = ['room','bra','en','ar','out'];
const frames = states.map(st => { const o = Buffer.alloc(N*3);
  for (let i = 0; i < N; i++) { let k = 0; names.forEach((n, j) => { if (st[j]) k = k + (1 - k) * masks[n][i]; }); if (st[5]) k = 1;
    for (let c = 0; c < 3; c++) o[i*3+c] = Math.round(b[i*3+c] * (1 - k) + a[i*3+c] * k); } return o; });
frames.forEach((f, i) => execFileSync('ffmpeg', ['-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',W+'x'+H,'-i','-',`${S}/prev_${set}_${i}.png`], { input: f }));
console.log(set, 'gain', g.toFixed(2), 'ok');
