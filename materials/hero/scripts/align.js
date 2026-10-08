// Ищет сдвиг/масштаб картинки B относительно A по контурам (свет разный, края те же).
// node align.js ref.jpg mov.jpg W H   (обе приводятся к W×H без сохранения пропорций)
const { execFileSync } = require('child_process');
const [ref, mov, W, H] = [process.argv[2], process.argv[3], +process.argv[4], +process.argv[5]];
const load = f => new Uint8Array(execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-vf', `scale=${W}:${H}:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 28 }));
function edges(g) {
  const e = new Float32Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    const gx = g[i - W + 1] + 2 * g[i + 1] + g[i + W + 1] - g[i - W - 1] - 2 * g[i - 1] - g[i + W - 1];
    const gy = g[i + W - 1] + 2 * g[i + W] + g[i + W + 1] - g[i - W - 1] - 2 * g[i - W] - g[i - W + 1];
    e[i] = Math.sqrt(gx * gx + gy * gy);
  }
  // локальная нормализация: свет разный, важна форма края, а не его яркость
  let m = 0; for (const v of e) m += v; m /= e.length;
  return e.map(v => Math.log1p(v / (m + 1e-6)));
}
const A = edges(load(ref)), B = edges(load(mov));
function score(s, dx, dy) {
  let sa = 0, sb = 0, sab = 0, saa = 0, sbb = 0, n = 0;
  const cx = W / 2, cy = H / 2;
  for (let y = 8; y < H - 8; y += 2) for (let x = 8; x < W - 8; x += 2) {
    const u = Math.round((x - cx) * s + cx + dx), v = Math.round((y - cy) * s + cy + dy);
    if (u < 1 || v < 1 || u >= W - 1 || v >= H - 1) continue;
    const a = A[y * W + x], b = B[v * W + u];
    sa += a; sb += b; sab += a * b; saa += a * a; sbb += b * b; n++;
  }
  const cov = sab / n - (sa / n) * (sb / n);
  return cov / Math.sqrt((saa / n - (sa / n) ** 2) * (sbb / n - (sb / n) ** 2));
}
let best = { r: -1 };
for (let s = 0.97; s <= 1.0301; s += 0.005)
  for (let dx = -12; dx <= 12; dx++) for (let dy = -12; dy <= 12; dy++) {
    const r = score(s, dx, dy); if (r > best.r) best = { r, s: +s.toFixed(3), dx, dy };
  }
console.log('identity r=' + score(1, 0, 0).toFixed(4), 'best', JSON.stringify(best));
