'use strict';
(() => {
 const W=720,H=1000,R=15, bounds={l:43,r:677,t:43,b:957}, maxDrag=145;
 const courses=[
  {start:[360,820],cup:[360,180],par:2, obstacles:[]},
  {start:[360,837],cup:[360,160],par:3, obstacles:[{x:43,y:465,w:400,h:30},{x:500,y:235,w:177,h:30}]},
  {start:[360,850],cup:[360,140],par:4, obstacles:[{x:43,y:625,w:385,h:30},{x:292,y:400,w:385,h:30},{x:43,y:230,w:385,h:30}]}
 ];
 const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'); canvas.width=W; canvas.height=H;
 const el=id=>document.getElementById(id), holeEl=el('hole'),scoreEl=el('score'),hint=el('hint'),result=el('result'),announce=el('announce');
 let lastBounce=0; function bounce(speed){const now=performance.now();if(speed<35||now-lastBounce<100)return;lastBounce=now;gameAudio.play('bounce',false,Math.min(1,speed/350))}
 let index=0, strokes=[0,0,0],phase='aim',ball,drag=null,last=0,acc=0,transition=0, generation=0;
 function loadHole(){generation++;clearTimeout(transition);drag=null;phase='aim';let c=courses[index];ball={x:c.start[0],y:c.start[1],vx:0,vy:0,radius:R};last=0;acc=0;updateUI();draw()}
 function updateUI(){holeEl.innerHTML=String(index+1).padStart(2,'0')+' <small>/ 03</small>';scoreEl.textContent=strokes[index];el('par').textContent='PAR '+courses[index].par;document.querySelectorAll('.dots i').forEach((e,i)=>e.classList.toggle('active',i===index));hint.innerHTML=phase==='moving'?'Мяч катится <span>— дождись остановки</span>':phase==='sunk'?'Отличный удар! <span>Готовим следующую лунку</span>':'Потяни мяч назад <span>и отпусти для удара</span>'}
 function roundRect(x,y,w,h,r,fill,stroke,line=1){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke()}}
 function circle(x,y,r,color){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill()}
 function draw(){
  ctx.clearRect(0,0,W,H);roundRect(3,3,714,994,35,'#b78a54');roundRect(12,12,696,976,29,'#694f37');roundRect(25,25,670,950,23,'#ceb78c');roundRect(37,37,646,926,16,'#437f62');
  ctx.save();ctx.beginPath();ctx.roundRect(43,43,634,914,12);ctx.clip();
  let g=ctx.createLinearGradient(0,0,720,1000);g.addColorStop(0,'#528c6a');g.addColorStop(1,'#326b54');ctx.fillStyle=g;ctx.fillRect(43,43,634,914);
  ctx.globalAlpha=.055;ctx.fillStyle='#e5f3c9';for(let i=-1;i<11;i++)ctx.fillRect(43,i*135,634,60);ctx.globalAlpha=1;
  ctx.strokeStyle='#d8e4b9';ctx.globalAlpha=.18;ctx.lineWidth=2;ctx.strokeRect(56,56,608,888);ctx.globalAlpha=1;
  const c=courses[index],cx=c.cup[0],cy=c.cup[1];circle(cx,cy+3,29,'#a0c294');circle(cx,cy,23,'#163b30');circle(cx,cy-2,16,'#0a2621');ctx.strokeStyle='#d8d2ac';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(cx+3,cy-8);ctx.lineTo(cx+3,cy-84);ctx.stroke();ctx.fillStyle='#f1be72';ctx.beginPath();ctx.moveTo(cx+5,cy-82);ctx.lineTo(cx+45,cy-70);ctx.lineTo(cx+5,cy-56);ctx.fill();
  for(const o of c.obstacles){roundRect(o.x+2,o.y+7,o.w-4,o.h,13,'#234d3b');roundRect(o.x,o.y,o.w,o.h,12,'#b8915e');roundRect(o.x+4,o.y+4,o.w-8,9,5,'#e2c38a');}
  if(drag){let dx=ball.x-drag.x,dy=ball.y-drag.y,dist=Math.hypot(dx,dy),n=Math.min(dist,maxDrag);if(dist>2){let ux=dx/dist,uy=dy/dist;ctx.setLineDash([10,10]);ctx.lineWidth=4;ctx.strokeStyle='#f8edcfbb';ctx.beginPath();ctx.moveTo(ball.x+ux*24,ball.y+uy*24);ctx.lineTo(ball.x+ux*(50+n*1.8),ball.y+uy*(50+n*1.8));ctx.stroke();ctx.setLineDash([]);let ax=ball.x+ux*(50+n*1.8),ay=ball.y+uy*(50+n*1.8);ctx.fillStyle='#f2c36f';ctx.beginPath();ctx.moveTo(ax+ux*13,ay+uy*13);ctx.lineTo(ax-ux*9-uy*9,ay-uy*9+ux*9);ctx.lineTo(ax-ux*9+uy*9,ay-uy*9-ux*9);ctx.closePath();ctx.fill();ctx.strokeStyle='#f2c36f';ctx.lineWidth=5;ctx.beginPath();ctx.arc(ball.x,ball.y,26,-Math.PI/2,-Math.PI/2+Math.PI*2*n/maxDrag);ctx.stroke();}}
  if(phase!=='sunk'&&phase!=='finished'){circle(ball.x+3,ball.y+7,R+3,'#1b493c80');circle(ball.x,ball.y,R,'#f9f1dd');circle(ball.x-4,ball.y-5,5,'#fffdf5');}
  ctx.restore();
 }
 function collide(o){let nx=Math.max(o.x,Math.min(ball.x,o.x+o.w)),ny=Math.max(o.y,Math.min(ball.y,o.y+o.h)),dx=ball.x-nx,dy=ball.y-ny,d=Math.hypot(dx,dy);if(d>=R)return;if(d===0){let choices=[[Math.abs(ball.x-o.x),-1,0],[Math.abs(o.x+o.w-ball.x),1,0],[Math.abs(ball.y-o.y),0,-1],[Math.abs(o.y+o.h-ball.y),0,1]].sort((a,b)=>a[0]-b[0]);dx=choices[0][1];dy=choices[0][2];d=1;let dep=choices[0][0]+R;ball.x+=dx*dep;ball.y+=dy*dep}else{dx/=d;dy/=d;ball.x+=dx*(R-d);ball.y+=dy*(R-d)}let dot=ball.vx*dx+ball.vy*dy;if(dot<0){bounce(-dot);ball.vx-=1.8*dot*dx;ball.vy-=1.8*dot*dy}}
 function step(dt){if(phase!=='moving')return;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;let b=bounds;if(ball.x-R<b.l){ball.x=b.l+R;if(ball.vx<0){bounce(Math.abs(ball.vx));ball.vx*=-.8}}if(ball.x+R>b.r){ball.x=b.r-R;if(ball.vx>0){bounce(Math.abs(ball.vx));ball.vx*=-.8}}if(ball.y-R<b.t){ball.y=b.t+R;if(ball.vy<0){bounce(Math.abs(ball.vy));ball.vy*=-.8}}if(ball.y+R>b.b){ball.y=b.b-R;if(ball.vy>0){bounce(Math.abs(ball.vy));ball.vy*=-.8}}for(const o of courses[index].obstacles)collide(o);let friction=Math.exp(-1.25*dt);ball.vx*=friction;ball.vy*=friction;let c=courses[index].cup,dx=c[0]-ball.x,dy=c[1]-ball.y,d=Math.hypot(dx,dy),speed=Math.hypot(ball.vx,ball.vy);if(d<18&&speed<125){sink();return}if(speed<8){ball.vx=ball.vy=0;phase='aim';updateUI()}}
 function sink(){gameAudio.play('sink');phase='sunk';ball.vx=ball.vy=0;updateUI();announce.textContent=`Лунка ${index+1} пройдена за ${strokes[index]} ударов`;let gen=generation;transition=setTimeout(()=>{if(gen!==generation)return;if(index<2){index++;loadHole()}else{phase='finished';gameAudio.play('finish');result.hidden=false;el('summary').textContent=`${strokes.reduce((a,b)=>a+b,0)} ударов за три лунки · ${strokes.join(' / ')}`;announce.textContent='Партия завершена. '+el('summary').textContent;draw()}},900)}
 function frame(t){if(last){acc+=Math.min((t-last)/1000,.05);while(acc>=1/120){step(1/120);acc-=1/120}}last=t;draw();requestAnimationFrame(frame)}
 function point(e){let r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
 canvas.addEventListener('pointerdown',e=>{if(phase!=='aim'||drag||e.button!==0)return;let p=point(e);if(Math.hypot(p.x-ball.x,p.y-ball.y)>60)return;e.preventDefault();drag={...p,id:e.pointerId};canvas.setPointerCapture(e.pointerId)});
 canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;let p=point(e);drag.x=p.x;drag.y=p.y});
 canvas.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;let p=point(e),dx=ball.x-p.x,dy=ball.y-p.y,d=Math.hypot(dx,dy);drag=null;if(phase==='aim'&&d>=12){let power=Math.min(d,maxDrag)*6;ball.vx=dx/d*power;ball.vy=dy/d*power;strokes[index]++;gameAudio.play('hit',true,Math.min(1,power/500));phase='moving';updateUI()}});
 function cancel(){drag=null;last=0;acc=0}canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',()=>{drag=null});window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',cancel);window.addEventListener('resize',cancel);
 el('reset').addEventListener('click',()=>{if(phase==='finished')return;gameAudio.stop();strokes[index]=0;loadHole();announce.textContent='Лунка начата заново'});el('again').addEventListener('click',()=>{gameAudio.stop();index=0;strokes=[0,0,0];result.hidden=true;loadHole();announce.textContent='Новая партия'});
 window.getGolfState=()=>({holeIndex:index,phase,strokes:[...strokes],ball:{...ball},cup:{x:courses[index].cup[0],y:courses[index].cup[1],radius:23},course:{width:W,height:H},dragging:!!drag,obstacles:courses[index].obstacles.map(o=>({...o}))});
 loadHole();requestAnimationFrame(frame);
})();
