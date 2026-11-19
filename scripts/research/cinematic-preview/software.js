// GPU가 없는 브라우저용 대체 경로. 같은 Three 카메라와 파이썬 좌표를 투영합니다.
import * as T from 'three';
export function softwareRenderer(canvas){
 const ctx=canvas.getContext('2d'),cache=new WeakMap();let last=-Infinity;
 function pixels(tex){const image=tex.image;if(!cache.has(image)){const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const g=c.getContext('2d');g.drawImage(image,0,0);cache.set(image,g.getImageData(0,0,c.width,c.height))}return cache.get(image)}
 function render(scene,camera,a){
 if(a.now-last<45)return;last=a.now;camera.updateMatrixWorld();
 const w=canvas.width,h=canvas.height,F=h/(2*Math.tan(camera.fov*Math.PI/360));
 const right=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,1),back=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,2);
 const at=(v)=>{const p=v.clone().sub(camera.position),z=-p.dot(back);return [w/2+F*p.dot(right)/z,h/2-F*p.dot(up)/z,z]};
 ctx.fillStyle=a.film?(a.music?'#101724':'#060913'):'#10141c';ctx.fillRect(0,0,w,h);
 if(a.music){
 const polygon=(coords,color)=>{ctx.fillStyle=color;ctx.beginPath();coords.forEach(([x,y,z],i)=>{let p=at(new T.Vector3(x,y,z));i?ctx.lineTo(...p.slice(0,2)):ctx.moveTo(...p.slice(0,2))});ctx.closePath();ctx.fill();};
 if(a.film)polygon([[-5.5,-.21,-2.5],[5.5,-.21,-2.5],[5.5,-.21,2.5],[-5.5,-.21,2.5]],'#293648');
 const faces=[];a.keys.forEach((key,i)=>{const x=key.position.x,c=key.material.color,v=Math.max(0,a.when[i]+.7-a.now/1000)/.7;
 const glow=at(key.position);if(a.film&&v>0){const r=F/glow[2]*2,g=ctx.createRadialGradient(glow[0],glow[1],0,glow[0],glow[1],r);g.addColorStop(0,'#'+c.getHexString()+Math.round(150*v).toString(16).padStart(2,'0'));g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(glow[0]-r,glow[1]-r,2*r,2*r)}
 const pts=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(([u,b,z])=>[x+.56*u,key.position.y+.16*b,1.35*z]);
 [[0,1,2,3],[4,5,6,7],[0,4,7,3],[1,5,6,2],[3,2,6,7]].forEach((f,j)=>{const coords=f.map(k=>pts[k]);faces.push([coords.reduce((s,p)=>s+at(new T.Vector3(...p))[2],0),coords,'#'+c.clone().multiplyScalar([.38,.52,.42,.45,.87][j]+v*.9).getHexString()])});
 });faces.sort((a,b)=>b[0]-a[0]).forEach(f=>polygon(f[1],f[2]));return;
 }
 if(a.film){ctx.fillStyle='#a5afc4';for(let i=0;i<a.sky.length;i+=3){let [x,y,z]=at(new T.Vector3(a.sky[i],a.sky[i+1],a.sky[i+2]));if(z>0&&x>=0&&x<w&&y>=0&&y<h){ctx.globalAlpha=.22+(i%19)/32;ctx.fillRect(x,y,1.2,1.2)}}ctx.globalAlpha=1;
 if(!a.surface){ctx.beginPath();for(let i=0;i<=180;i++){const t=i*Math.PI/90,[x,y]=at(new T.Vector3(5*Math.cos(t),0,5*Math.sin(t)));i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.strokeStyle='#324052';ctx.stroke()}
 const [x,y,z]=at(a.spheres[0].position);if(z>.2){const r=1.65*F/z;const g=ctx.createRadialGradient(x,y,r*.80,x,y,2.6*r);g.addColorStop(0,'rgba(255,158,50,.60)');g.addColorStop(.28,'rgba(255,116,23,.21)');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-3*r,y-3*r,6*r,6*r)}}
 const frame=ctx.getImageData(0,0,w,h),out=frame.data;
 const order=a.spheres.map((s,i)=>[s.position.distanceTo(camera.position),i]).sort((u,v)=>v[0]-u[0]);
 for(const [dist,i] of order){const s=a.spheres[i],R=s.geometry.parameters.radius,[cx,cy,cz]=at(s.position);if(cz < -R)continue;
 const ox=camera.position.x-s.position.x,oy=camera.position.y-s.position.y,oz=camera.position.z-s.position.z,cc=dist*dist-R*R;
 const rad=F*R/Math.max(.001,cz-R)*2;const near=cz<2*R;
 const x0=near?0:Math.max(0,Math.floor(cx-rad)),x1=near?w:Math.min(w,Math.ceil(cx+rad)),y0=near?0:Math.max(0,Math.floor(cy-rad)),y1=near?h:Math.min(h,Math.ceil(cy+rad));
 const im=pixels(a.film?a.textures[i]:a.basic[i].map),rot=s.rotation.y;
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
 const px=(x+.5-w/2)/F,py=(h/2-y-.5)/F;
 const dx=right.x*px+up.x*py-back.x,dy=right.y*px+up.y*py-back.y,dz=right.z*px+up.z*py-back.z;
 const aa=1+px*px+py*py,b=ox*dx+oy*dy+oz*dz,disc=b*b-aa*cc;if(disc<0)continue;const t=(-b-Math.sqrt(disc))/aa;if(t<=.01)continue;
 const nx=(ox+t*dx)/R,ny=(oy+t*dy)/R,nz=(oz+t*dz)/R;
 const u=(1.5-(Math.atan2(nz,nx)+rot)/(2*Math.PI))%1,v=Math.acos(Math.min(1,Math.max(-1,ny)))/Math.PI;
 const j=4*(Math.min(im.height-1,Math.floor(v*im.height))*im.width+Math.floor(u*im.width)),k=4*(y*w+x);
 const lx=-s.position.x-R*nx,ly=-s.position.y-R*ny,lz=-s.position.z-R*nz,ll=Math.hypot(lx,ly,lz),day=Math.max(0,(lx*nx+ly*ny+lz*nz)/ll);
 const light=i===0?1:.19+(a.sunlight?1.22*day:0);const rim=a.film&&a.sunlight&&i===1?Math.pow(Math.max(0,1+(nx*dx+ny*dy+nz*dz)/Math.sqrt(aa)),3)*day:0;
 for(let ch=0;ch<3;ch++)out[k+ch]=i===0&&!a.film?233:im.data[j+ch]*light+rim*[49,151,240][ch];
 }}
 ctx.putImageData(frame,0,0);
 }
 return {setPixelRatio(){},getPixelRatio(){return Math.min(1,800/Math.max(1,canvas.clientWidth))},setSize(w,h){const p=this.getPixelRatio();canvas.width=Math.floor(w*p);canvas.height=Math.floor(h*p)},render};
}
