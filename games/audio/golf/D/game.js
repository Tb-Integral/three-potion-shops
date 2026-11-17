(() => {
'use strict';
const W=440,H=510,R=7,FRICTION=245,STEP=1/144,BOUNCE=.77,MAX_PULL=108;
const audio = createGameAudio('pereval-golf.audio.v1');
// Delay, length, waveform, initial pitch, final pitch and peak gain.
const strikeSound = [[0,.066,'triangle',940,190,.21],[.004,.084,'sine',260,105,.14]];
const rimSound = [[0,.079,'sine',580,265,.18]];
const cupSound = [[0,.10,'triangle',590,205,.15],[.085,.18,'sine',340,285,.14]];
const finishSound = [[0,.20,'triangle',392,392,.11],[.135,.22,'sine',494,494,.14],[.275,.33,'triangle',659,659,.10],[.275,.33,'sine',330,330,.085]];
let lastBounce = -Infinity;
function soundBounce(impact) {
  const now = performance.now();
  if (impact < 43 || now - lastBounce < 95) return;
  lastBounce = now;
  audio.play(rimSound, Math.min(1, impact / 360));
}
const levels=[
  {name:'Солнечный склон',par:2,tee:[139,397],cup:[253,126],
    rim:[[69,371],[81,293],[127,214],[129,137],[165,85],[254,61],[313,88],[338,142],[326,225],[292,279],[285,364],[247,416],[179,451],[104,443]],
    rocks:[[[113,269],[131,246],[149,246],[160,257],[154,279],[130,291],[112,284]]]},
  {name:'Ущелье',par:3,tee:[106,401],cup:[336,124],
    rim:[[47,385],[66,309],[102,259],[167,235],[176,159],[206,104],[269,76],[347,73],[385,106],[387,157],[359,191],[297,196],[260,210],[247,284],[219,316],[153,333],[145,400],[125,441],[80,446],[52,425]],
    rocks:[[[305,87],[325,84],[334,96],[326,110],[309,111],[300,102]]]},
  {name:'Каменные ворота',par:4,tee:[124,411],cup:[302,96],
    rim:[[51,396],[59,320],[106,278],[95,220],[128,168],[149,109],[210,67],[307,47],[358,70],[388,125],[367,174],[321,209],[326,273],[279,332],[263,395],[219,446],[137,464],[80,448]],
    rocks:[[[101,289],[135,278],[178,286],[199,303],[189,321],[155,330],[116,324],[98,311]],[[226,174],[256,151],[296,148],[319,161],[319,184],[298,200],[256,205],[233,197]]]}
];
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),$=id=>document.getElementById(id);
const hud={stage:$('stageNum'),name:$('stageName'),shots:$('shots'),par:$('par'),route:$('route'),reset:$('reset'),toast:$('toast'),result:$('result'),status:$('status'),lamp:$('lamp')};
let hole=0,phase='aim',strokes=[0,0,0],ball,drag=null,staticMap,last=null,carry=0,sunkTime=0,paused=false;
const level=()=>levels[hole];
const vec=p=>({x:p[0],y:p[1]});
function edges(poly){return poly.map((p,i)=>[p,poly[(i+1)%poly.length]]);}
levels.forEach(l=>{l.walls=[...edges(l.rim),...l.rocks.flatMap(edges)];});
const clamp=(v,min,max)=>Math.max(min,Math.min(v,max));
function distanceTo(x,y,a,b){
  const dx=b[0]-a[0],dy=b[1]-a[1];
  const t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy),0,1);
  return [x-a[0]-t*dx,y-a[1]-t*dy];
}
function inside(x,y,poly){
  let yes=false;
  for(const [a,b] of edges(poly)){
    if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;
  }
  return yes;
}
function step(b, onBounce){
  const l=level(),speed=Math.hypot(b.vx,b.vy);
  const next=Math.max(0,speed-FRICTION*STEP);
  if(speed>0){
    const dist=(speed+next)*.5* Math.min(STEP,speed/FRICTION);
    b.x+=b.vx/speed*dist;b.y+=b.vy/speed*dist;b.vx*=next/speed;b.vy*=next/speed;
  }
  for(let pass=0;pass<2;pass++){
    for(const [a,c] of l.walls){
      const [dx,dy]=distanceTo(b.x,b.y,a,c),d=Math.hypot(dx,dy);
      if(d>=R||d<1e-9)continue;
      const nx=dx/d,ny=dy/d;
      b.x+=nx*(R-d+.002);b.y+=ny*(R-d+.002);
      const dot=b.vx*nx+b.vy*ny;
      if(dot<0){b.vx-=(1+BOUNCE)*dot*nx;b.vy-=(1+BOUNCE)*dot*ny;if(onBounce)onBounce(-dot);}
    }
  }
  if(Math.hypot(b.x-l.cup[0],b.y-l.cup[1])<=9.5&&Math.hypot(b.vx,b.vy)<=125)return 'sunk';
  return next===0?'aim':'moving';
}
function rng(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function path(g,points){g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();}
function poly(g,points,fill,stroke,width=1){path(g,points);if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke();}}
function line(g,x,y,tx,ty,color,width=1){g.beginPath();g.moveTo(x,y);g.lineTo(tx,ty);g.strokeStyle=color;g.lineWidth=width;g.stroke();}
function oval(g,x,y,rx,ry,color){g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle=color;g.fill();}
function contours(g){
  const value=(x,y)=>Math.sin(x/91+y/149)+.6*Math.cos(x/47-y/68)+.3*Math.sin(y/31+x/64)+.16*Math.sin(x/19+y/28);
  // Marching squares makes the lines follow shared terrain elevations.
  g.lineWidth=.65;
  for(let k=-22;k<=21;k++){
    const z=k*.105;g.beginPath();g.strokeStyle=k%5===0?'#8d9f83':'#acb99a';
    for(let y=-7;y<H;y+=8)for(let x=-7;x<W;x+=8){
      const pts=[[x,y],[x+8,y],[x+8,y+8],[x,y+8]],v=pts.map(p=>value(...p)),cross=[];
      for(let i=0;i<4;i++){const j=(i+1)%4;if((v[i]>z)===(v[j]>z))continue;const t=(z-v[i])/(v[j]-v[i]);cross.push([pts[i][0]+(pts[j][0]-pts[i][0])*t,pts[i][1]+(pts[j][1]-pts[i][1])*t]);}
      for(let i=1;i<cross.length;i+=2){g.moveTo(...cross[i-1]);g.lineTo(...cross[i]);}
    }
    g.stroke();
  }
}
function pine(g,x,y,s,t){
  g.save();g.translate(x,y);g.scale(s,s);
  oval(g,3,1,7,2.3,'#63735b42');
  line(g,0,-8,0,1,'#665f43',1.8);
  for(let i=0;i<3;i++){const a=i*4.4;
    const tip=-24+a*1.16,w=3.1+i*1.55,bot=tip+11+i;
    poly(g,[[0,tip],[-w,bot-1],[-1,bot-2],[0,bot],[w,bot-2]],t?'#52765d':'#41664f');
    poly(g,[[0,tip],[-w,bot-1],[-1,bot-2],[0,bot]],t?'#8c9e74':'#748e69');
  }
  g.restore();
}
function cliff(g,p,seed){
  const r=rng(seed);
  for(const [a,b] of edges(p)){
    const len=Math.hypot(b[0]-a[0],b[1]-a[1]),num=Math.ceil(len/15);
    for(let i=0;i<num;i++){
      const t=i/num,u=(i+1)/num,ax=a[0]+(b[0]-a[0])*t,ay=a[1]+(b[1]-a[1])*t,bx=a[0]+(b[0]-a[0])*u,by=a[1]+(b[1]-a[1])*u;
      const col=['#b9b99b','#a5ab90','#c3c1a0','#aab099'][Math.floor(r()*4)];
      poly(g,[[ax,ay],[bx,by],[bx+2,by+8],[ax+2,ay+8]],col,'#808e77',.65);
    }
  }
}
function boulder(g,p){
  const [cx,cy]=p.reduce(([x,y],[a,b])=>[x+a/p.length,y+b/p.length],[0,0]);
  poly(g,p.map(([x,y])=>[x+2,y+3]),'#43665366');
  poly(g,p,'#b9ba9f');
  const ridge=[cx-2,cy-4];
  for(const [a,b] of edges(p)){
    const shade=['#d2c8ac','#e6dcc2','#cbc5aa','#a4a68d','#a1a48c','#b6b69c','#d5cfb4','#dcd6b9'];
    const n=Math.floor((Math.atan2(a[1]-cy,a[0]-cx)+Math.PI)*8/(2*Math.PI))%8;
    poly(g,[a,b,ridge],shade[n],shade[n],.4);
  }
  poly(g,p,null,'#697b65',1.5);
  line(g,ridge[0],ridge[1],p[0][0]+4,p[0][1]+1,'#a8aa8e',.8);
}
function generateMap(){
  const l=level(),s=canvas.width/W;
  staticMap=document.createElement('canvas');staticMap.width=canvas.width;staticMap.height=canvas.height;
  const g=staticMap.getContext('2d');g.scale(s,staticMap.height/H);
  const r=rng(7571+hole*191);g.fillStyle=['#dce1c7','#d8deca','#dddcc3'][hole];g.fillRect(0,0,W,H);
  contours(g);
  for(let i=0;i<2500;i++){const x=r()*W,y=r()*H;line(g,x,y,x+.4+r()*1.2,y+.3,'#65795531',.55);}
  const clusters=[[40,108],[61,175],[365,282],[387,423],[46,472],[194,21],[408,58],[286,477],[18,305],[418,202]];
  const trees=[];
  for(const [cx,cy] of clusters){
    for(let n=0;n<21;n++){
      const a=r()*Math.PI*2,d=Math.sqrt(r())*43,x=cx+Math.cos(a)*d,y=cy+Math.sin(a)*d;
      if(inside(x,y,l.rim)||l.walls.some(([a,b])=>Math.hypot(...distanceTo(x,y,a,b))<22))continue;
      trees.push([x,y,.58+r()*.62,r()>.6]);
    }
  }
  trees.sort((a,b)=>a[1]-b[1]);trees.forEach(p=>pine(g,...p));
  g.lineJoin='round';g.save();g.shadowColor='#4b5b4f65';g.shadowOffsetY=4*s;g.shadowBlur=5*s;
  poly(g,l.rim.map(([x,y])=>[x+2,y+7]),'#71836e');g.restore();
  cliff(g,l.rim,277+hole);poly(g,l.rim,'#8db081','#4a6c52',2);
  g.save();path(g,l.rim);g.clip();
  const ramp=g.createLinearGradient(95,50,322,445);ramp.addColorStop(0,'#b1cc8d');ramp.addColorStop(.6,'#8ab582');ramp.addColorStop(1,'#77a487');g.fillStyle=ramp;g.fillRect(0,0,W,H);
  for(let x=-500;x<W+220;x+=45){poly(g,[[x,0],[x+22,0],[x+22+340,H],[x+340,H]],'#eff0ae19');}
  for(let i=0;i<9500;i++){const x=r()*W,y=r()*H;line(g,x,y,x+.3+r()*.7,y-r()*.7,i%3?'#30583f1a':'#edf4c33b',.6);}
  const [hx,hy]=l.cup;oval(g,hx,hy,45,38,'#cadd9d55');
  g.beginPath();g.ellipse(hx,hy,45,38,0,0,Math.PI*2);g.strokeStyle='#eff0bc66';g.lineWidth=.9;g.setLineDash([2,4]);g.stroke();g.setLineDash([]);
  g.lineWidth=9;g.strokeStyle='#40694c';path(g,l.rim);g.stroke();
  g.lineWidth=6.5;g.strokeStyle='#d2c9a1';g.stroke();
  g.lineWidth=2.8;g.strokeStyle='#faf0c5';g.stroke();
  g.restore();l.rocks.forEach(p=>boulder(g,p));
  const [tx,ty]=l.tee;
  g.save();g.translate(tx,ty);g.rotate(-.06);g.fillStyle='#709575';g.fillRect(-12,-3,24,6);line(g,-12,0,12,0,'#dfdfb5',1);g.restore();
  // A restrained cartographic compass stays outside the playable rim.
  g.save();g.translate(27,27);g.fillStyle='#45614f';g.textAlign='center';g.font='bold 9px Georgia';g.fillText('С',0,-7);poly(g,[[0,-2],[-3,11],[0,8]],'#45614f');poly(g,[[0,-2],[3,11],[0,8]],'#f9f2d7','#45614f',.5);g.restore();
  for(const [x,y,sx,sy] of [[8,8,1,1],[W-8,8,-1,1],[8,H-8,1,-1],[W-8,H-8,-1,-1]]){
    line(g,x,y,x+9*sx,y,'#536751',.8);line(g,x,y,x,y+9*sy,'#536751',.8);
  }
}
function flag(g){
  const [x,y]=level().cup;
  oval(g,x,y+1,12.4,10.6,'#c4d49b');oval(g,x,y,11,9.6,'#263c31');oval(g,x+.5,y+2,8.5,5.5,'#152b24');
  line(g,x,y,x+12,y+4,'#586d4a66',2);
  line(g,x,y,x-1,y-38,'#faf2cf',3.3);line(g,x-.5,y,x-1.5,y-38,'#514e3d',1.25);
  poly(g,[[x-1.5,y-37],[x+7,y-37],[x+18,y-33],[x+11,y-27],[x+3,y-28],[x-1.5,y-26]],'#d75e39','#90402a',.85);
  line(g,x+.5,y-35,x+6,y-35,'#f3ab78',1.1);
}
function power(){
  if(!drag)return {vx:0,vy:0,len:0};
  const dx=drag.start.x-drag.pos.x,dy=drag.start.y-drag.pos.y,raw=Math.hypot(dx,dy),len=Math.min(MAX_PULL,raw);
  const v=len*4.55/(raw||1);return {vx:dx*v,vy:dy*v,len};
}
function aimGuide(g){
  const {vx,vy,len}=power();if(len<4)return;
  const ghost={x:ball.x,y:ball.y,vx,vy};
  let walk=0,tick=0,out='moving';
  g.save();
  while(tick++<345&&out==='moving'){
    const oldX=ghost.x,oldY=ghost.y;out=step(ghost);walk+=Math.hypot(ghost.x-oldX,ghost.y-oldY);
    if(walk>10){oval(g,ghost.x,ghost.y,1.8,1.8,'#fff7d7');oval(g,ghost.x,ghost.y,1,1,'#47654b');walk=0;}
  }
  g.beginPath();g.arc(ghost.x,ghost.y,4,0,Math.PI*2);g.strokeStyle='#345842';g.lineWidth=1.4;g.stroke();
  const speed=Math.hypot(vx,vy),nx=vx/speed,ny=vy/speed;
  const size=15+Math.min(14,len/6),x=ball.x+nx*size,y=ball.y+ny*size;
  line(g,ball.x,ball.y,x,y,'#fff6d8',4);line(g,ball.x,ball.y,x,y,'#a14a32',2.3);
  poly(g,[[x+nx*4,y+ny*4],[x-nx*4+ny*3,y-ny*4-nx*3],[x-nx*4-ny*3,y-ny*4+nx*3]],'#a14a32');
  g.restore();
}
function draw(){
  if(!staticMap)return;
  ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(staticMap,0,0);
  ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);flag(ctx);
  if(phase==='aim'&&drag)aimGuide(ctx);
  if(phase==='aim'||phase==='moving'){
    const {x,y}=ball;
    if(phase==='aim'){
      ctx.beginPath();ctx.arc(x,y,14,0,Math.PI*2);ctx.strokeStyle='#fff5d4';ctx.lineWidth=2.1;ctx.stroke();
      ctx.beginPath();ctx.arc(x,y,15.5,0,Math.PI*2);ctx.strokeStyle='#627b59';ctx.lineWidth=.9;ctx.stroke();
    }
    oval(ctx,x+2.3,y+3.3,R+.4,R*.85,'#3d584e75');
    const gloss=ctx.createRadialGradient(x-2,y-2,1,x+1,y+1,7.9);gloss.addColorStop(0,'#fffef0');gloss.addColorStop(.6,'#faf5df');gloss.addColorStop(1,'#b6b5a2');
    oval(ctx,x,y,R,R,'#425c4b');oval(ctx,x-.1,y-.2,R-.7,R-.7,gloss);
    [[2,1],[.2,3.3],[3.5,-1.3]].forEach(([dx,dy])=>oval(ctx,x+dx,y+dy,.7,.6,'#bac0a6'));
  }
}
function words(n){return n%10===1&&n%100!==11?'удар':n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?'удара':'ударов';}
function setStatus(text){if(hud.status.textContent!==text)hud.status.textContent=text;}
function refresh(){
  const l=level();hud.stage.textContent='Лунка '+(hole+1)+' из 3';hud.name.textContent=l.name;
  hud.shots.textContent=strokes[hole];hud.par.textContent=l.par;hud.route.replaceChildren();
  for(let i=0;i<3;i++){
    const item=document.createElement('li'),done=i<hole||(i===hole&&['sunk','finished'].includes(phase));
    item.className=done?'done':i===hole?'now':'';
    item.textContent=done?'✓ '+strokes[i]+' '+words(strokes[i]):'0'+(i+1);
    item.setAttribute('aria-label','Лунка '+(i+1)+(done?', '+strokes[i]+' '+words(strokes[i]):i===hole?', текущая':', впереди'));
    hud.route.append(item);
  }
  hud.reset.disabled=phase==='finished';hud.lamp.className=phase==='moving'||drag?'hot':'';
  setStatus(phase==='aim'?(drag?'Прицеливание':'К удару'):phase==='moving'?'Мяч в движении':phase==='sunk'?'В лунке!':'Финиш');
}
function cancelAim(){
  if(!drag)return;
  const id=drag.id;drag=null;
  if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
  canvas.style.cursor='default';refresh();draw();
}
function startHole(index){
  audio.stop();lastBounce=-Infinity;
  cancelAim();hole=index;strokes[hole]=0;phase='aim';ball={...vec(level().tee),vx:0,vy:0,radius:R};last=null;carry=0;sunkTime=0;
  hud.toast.hidden=true;hud.result.hidden=true;
  generateMap();refresh();draw();
}
function finish(){
  audio.play(finishSound);
  phase='finished';hud.toast.hidden=true;hud.result.hidden=false;
  const sum=strokes.reduce((a,b)=>a+b);$('total').textContent='Вся партия — '+sum+' '+words(sum);
  const list=$('scorecard');list.replaceChildren();levels.forEach((l,i)=>{
    const item=document.createElement('li'),value=document.createElement('b');item.append(l.name);value.textContent=strokes[i];item.append(value);list.append(item);
  });
  refresh();$('newGame').focus({preventScroll:true});
}
function land(){
  audio.play(cupSound);
  ball.vx=ball.vy=0;[ball.x,ball.y]=level().cup;phase='sunk';sunkTime=0;
  hud.toast.textContent='В лунке!  ·  '+strokes[hole]+' '+words(strokes[hole]);hud.toast.hidden=false;refresh();
}
function frame(now){
  const dt=last===null?0:Math.min(.065,(now-last)/1000);last=now;
  if(!paused&&!document.hidden){
    if(phase==='moving'){
      carry+=dt;
      while(carry>=STEP&&phase==='moving'){
        carry-=STEP;const result=step(ball, soundBounce);
        if(result==='sunk')land();
        else if(result==='aim'){phase='aim';ball.vx=ball.vy=0;carry=0;refresh();}
      }
      draw();
    }else if(phase==='sunk'){
      sunkTime+=dt;
      if(sunkTime>=1.25){if(hole===2)finish();else startHole(hole+1);}
    }
  }
  requestAnimationFrame(frame);
}
function coursePoint(e){
  const rect=canvas.getBoundingClientRect();
  return {x:(e.clientX-rect.left)*W/rect.width,y:(e.clientY-rect.top)*H/rect.height};
}
function canGrab(p){return phase==='aim'&&Math.hypot(p.x-ball.x,p.y-ball.y)<=Math.max(20,24*W/canvas.getBoundingClientRect().width);}
// The canvas handles its own touch gestures, including when embedded.
canvas.addEventListener('touchstart', e => e.preventDefault(), {passive:false});
canvas.addEventListener('pointerdown',e=>{
  if(!e.isPrimary||e.button!==0||drag||phase!=='aim')return;
  const p=coursePoint(e);if(!canGrab(p))return;
  canvas.focus({preventScroll:true});e.preventDefault();drag={id:e.pointerId,start:p,pos:p};canvas.setPointerCapture(e.pointerId);
  canvas.style.cursor='grabbing';refresh();draw();
});
canvas.addEventListener('pointermove',e=>{
  if(!drag){if(e.pointerType==='mouse')canvas.style.cursor=canGrab(coursePoint(e))?'grab':'default';return;}
  if(e.pointerId!==drag.id)return;
  drag.pos=coursePoint(e);const pct=Math.round(power().len/MAX_PULL*100);
  setStatus('Сила '+pct+' %');draw();
});
canvas.addEventListener('pointerup',e=>{
  if(e.pointerId!==drag?.id)return;
  drag.pos=coursePoint(e);const shot=power();cancelAim();
  if(phase!=='aim'||shot.len<4)return;
  audio.play(strikeSound, .52 + .48 * shot.len / MAX_PULL, true);
  ball.vx=shot.vx;ball.vy=shot.vy;strokes[hole]++;phase='moving';carry=0;last=null;refresh();draw();
});
for(const name of ['pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>{if(e.pointerId===drag?.id)cancelAim();});
function suspend(){paused=true;cancelAim();last=null;carry=0;}
function resume(){paused=false;last=null;carry=0;}
window.addEventListener('blur',suspend);window.addEventListener('focus',resume);
document.addEventListener('visibilitychange',()=>document.hidden?suspend():resume());
window.addEventListener('pagehide',suspend);window.addEventListener('pageshow',resume);
function resize(){
  cancelAim();last=null;carry=0;
  const w=Math.round(canvas.getBoundingClientRect().width*Math.min(2,window.devicePixelRatio||1)),h=Math.round(w*H/W);
  if(w>0&&(canvas.width!==w||canvas.height!==h)){canvas.width=w;canvas.height=h;generateMap();draw();}
}
window.addEventListener('resize',resize);new ResizeObserver(resize).observe(canvas);
hud.reset.addEventListener('click',()=>{if(phase!=='finished')startHole(hole);});
$('newGame').addEventListener('click',()=>{strokes=[0,0,0];startHole(0);hud.reset.focus({preventScroll:true});});
window.getGolfState=()=>({holeIndex:hole,phase,strokes:[...strokes],ball:{...ball},cup:{...vec(level().cup),radius:11},course:{width:W,height:H},dragging:!!drag,boundary:level().rim.map(p=>[...p]),obstacles:level().rocks.map(poly=>poly.map(p=>[...p]))});
startHole(0);resize();requestAnimationFrame(frame);
})();
