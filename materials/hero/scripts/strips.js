const { execFileSync } = require('child_process');
const [ref, mov, W, H, T] = [process.argv[2], process.argv[3], +process.argv[4], +process.argv[5], +process.argv[6]];
const load = f => new Uint8Array(execFileSync('ffmpeg', ['-v','error','-i',f,'-f','rawvideo','-pix_fmt','gray','-'], { maxBuffer: 1 << 28 }));
function edges(g){const e=new Float32Array(W*H);for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const i=y*W+x;const gx=g[i-W+1]+2*g[i+1]+g[i+W+1]-g[i-W-1]-2*g[i-1]-g[i+W-1];const gy=g[i+W-1]+2*g[i+W]+g[i+W+1]-g[i-W-1]-2*g[i-W]-g[i-W+1];e[i]=Math.log1p(Math.sqrt(gx*gx+gy*gy)/20)}return e}
const A=edges(load(ref)),Bm=edges(load(mov));
const smp=(y,x)=>{const y0=Math.floor(y),t=y-y0;if(y0<0||y0+1>=H)return NaN;return Bm[y0*W+x]*(1-t)+Bm[(y0+1)*W+x]*t};
const res=[];for(let y0=0;y0+T<=H;y0+=T){let b={r:-2};for(let dy=-4;dy<=4;dy+=0.25){let sa=0,sb=0,sab=0,saa=0,sbb=0,n=0;for(let y=y0;y<y0+T;y++)for(let x=2;x<W-2;x++){const a=A[y*W+x],c=smp(y+dy,x);if(isNaN(c))continue;sa+=a;sb+=c;sab+=a*c;saa+=a*a;sbb+=c*c;n++}const r=(sab/n-sa/n*sb/n)/Math.sqrt((saa/n-(sa/n)**2)*(sbb/n-(sb/n)**2)+1e-9);if(r>b.r)b={r,dy}}res.push(`${y0+T/2}:${b.dy}(${b.r.toFixed(2)})`)}console.log(res.join(' '))
