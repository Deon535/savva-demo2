// node falloff.js in out W H r0 r1 fmin — свет от кафе гаснет по тротуару: ниже строки r0 яркость плавно падает до fmin к строке r1 (в линейном свете)
const { execFileSync } = require('child_process');
const [inp, out, W, H, r0, r1, fmin] = [process.argv[2], process.argv[3], +process.argv[4], +process.argv[5], +process.argv[6], +process.argv[7], +process.argv[8]];
const src = execFileSync('ffmpeg', ['-v','error','-i',inp,'-f','rawvideo','-pix_fmt','rgb24','-'], { maxBuffer: 1 << 28 });
const toL = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
const toS = v => Math.round(255 * Math.min(1, v <= .0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - .055));
const LUT = Float32Array.from({ length: 256 }, (_, i) => toL(i));
const dst = Buffer.alloc(src.length);
for (let y = 0; y < H; y++) {
  let t = Math.min(1, Math.max(0, (y - r0) / (r1 - r0))); t = t * t * (3 - 2 * t);
  const f = 1 - (1 - fmin) * t;
  for (let x = 0; x < W * 3; x++) { const i = y * W * 3 + x; dst[i] = toS(LUT[src[i]] * f); }
}
execFileSync('ffmpeg', ['-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',W+'x'+H,'-i','-',out], { input: dst });
