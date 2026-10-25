// node grade.js lit off out k — красим погашенный кадр в оттенок горящего на «нейтральных» местах (стена, тротуар), яркость = k от горящего
const { execFileSync } = require('child_process');
const [lit, off, out, k] = [process.argv[2], process.argv[3], process.argv[4], +process.argv[5]];
const W = 1280, H = 714;
const rd = f => execFileSync('ffmpeg', ['-v','error','-i',f,'-vf',`scale=${W}:${H}`,'-f','rawvideo','-pix_fmt','rgb24','-'], { maxBuffer: 1 << 28 });
const L = Float32Array.from({ length: 256 }, (_, i) => { const v = i / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
const S = v => Math.round(255 * Math.min(1, v <= .0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - .055));
const a = rd(lit), b = rd(off);
// стена над фасадом и тротуар — там нет ламп
const regs = [[330, 0, 1000, 120], [250, 600, 1000, 714]];
const sa = [0,0,0], sb = [0,0,0];
for (const [x0,y0,x1,y1] of regs) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) for (let c = 0; c < 3; c++) { sa[c] += L[a[(y*W+x)*3+c]]; sb[c] += L[b[(y*W+x)*3+c]]; }
const g = sa.map((v, c) => k * v / sb[c]);
console.log('gain rgb', g.map(v => v.toFixed(2)).join(' '));
const o = Buffer.alloc(b.length); for (let i = 0; i < b.length; i++) o[i] = S(L[b[i]] * g[i % 3]);
execFileSync('ffmpeg', ['-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',W+'x'+H,'-i','-',out], { input: o });
