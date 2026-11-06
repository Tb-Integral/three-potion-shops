(() => {
  'use strict';
  const canvas = document.getElementById('course');
  const ctx = canvas.getContext('2d');
  const el = id => document.getElementById(id);
  const W = 420, H = 560, R = 8, CUP_R = 13;
  const WALL = 22, MAX_PULL = 115, MAX_SPEED = 520, FRICTION = 150;
  const levels = [
    { name: 'Первый бриз', start: [210, 443], cup: [210, 118], par: 2,
      obstacles: [{x:59,y:258,w:66,h:58},{x:295,y:258,w:66,h:58}], hint: 'Прямая дорожка. Поймайте силу удара.' },
    { name: 'За поворотом', start: [102, 449], cup: [305, 112], par: 3,
      obstacles: [{x:104,y:274,w:201,h:28}], hint: 'Обойдите длинный остров справа.' },
    { name: 'Дорога к маяку', start: [93, 459], cup: [299, 99], par: 5,
      obstacles: [{x:22,y:337,w:225,h:29},{x:174,y:186,w:224,h:29}], hint: 'Сначала справа, затем слева. И к флагу!' }
  ];
  let holeIndex = 0, phase = 'aim', strokes = [0,0,0];
  let ball, drag = null, previousTime = null, accumulator = 0;
  let frame = 0;
  const dots = Array.from({length:145},(_,i)=>({x:30+((i*137+37)%360),y:28+((i*89+43)%503),a:.07+(i%4)*.015}));
  function level() { return levels[holeIndex]; }
  function cancelDrag() {
    const old = drag; drag = null;
    if (old && canvas.hasPointerCapture(old.id)) canvas.releasePointerCapture(old.id);
    el('power').style.width = '0%';
    if (phase === 'aim') el('status').textContent = 'Потяните от мяча назад и отпустите';
  }
  function resetHole() {
    GameAudio.stop();
    cancelDrag();
    strokes[holeIndex] = 0;
    ball = {x:level().start[0],y:level().start[1],vx:0,vy:0,radius:R};
    phase = 'aim'; accumulator = 0; previousTime = null;
    el('result').hidden = true; el('scorecard').hidden = true;
    el('restart').disabled = false;
    updateUI();
  }
  function updateUI() {
    el('hole-number').textContent = String(holeIndex+1).padStart(2,'0');
    el('hole-progress').textContent = `ЛУНКА ${holeIndex+1} / 3`;
    el('hole-name').textContent = level().name;
    el('stroke-count').textContent = strokes[holeIndex];
    el('status').textContent = phase === 'moving' ? 'Мяч катится…' : 'Потяните от мяча назад и отпустите';
    [...el('progress').children].forEach((node,i)=>{
      node.className = i === holeIndex ? 'active' : i < holeIndex ? 'done' : '';
      node.textContent = `${i+1} · ${i <= holeIndex && strokes[i] ? strokes[i] : '—'}`;
    });
  }
  function sink() {
    ball.vx=0; ball.vy=0;
    // Capture occurs only within 9 logical pixels of the cup's centre.
    ball.x=level().cup[0]; ball.y=level().cup[1];
    phase = holeIndex === 2 ? 'finished' : 'sunk'; cancelDrag();
    GameAudio.play(phase === 'finished' ? 'finish' : 'sink');
    el('result').hidden = false;
    el('restart').disabled = true;
    if (phase === 'finished') {
      const total = strokes.reduce((a,b)=>a+b,0);
      el('result-kicker').textContent='ТРИ ЛУНКИ ПОЗАДИ';
      el('result-title').textContent= total <= 10 ? 'Красиво сыграно!' : 'Хорошая прогулка!';
      el('result-copy').textContent=`Всего ударов: ${total}. Море никуда не спешит — можно ещё круг.`;
      el('scorecard').hidden=false;
      el('scorecard').replaceChildren(...strokes.map((n,i)=>{const d=document.createElement('div');d.textContent=`Лунка ${i+1}`;const s=document.createElement('strong');s.textContent=n;d.append(s);return d;}));
      el('continue').textContent='Сыграть ещё раз ↗';
      el('status').textContent='Партия завершена';
    } else {
      el('result-kicker').textContent='ТОЧНО В ЛУНКУ';
      el('result-title').textContent=strokes[holeIndex]===1?'С первого удара!':'Есть попадание!';
      el('result-copy').textContent=`Ударов: ${strokes[holeIndex]}. Дальше — «${levels[holeIndex+1].name}».`;
      el('continue').textContent=`К лунке ${holeIndex+2} ↗`;
      el('status').textContent='Лунка пройдена';
    }
    el('continue').focus({preventScroll:true});
  }
  function reflect(nx,ny) {
    const v = ball.vx*nx+ball.vy*ny;
    if (v<0) {GameAudio.play('bounce', -v);ball.vx-=1.78*v*nx;ball.vy-=1.78*v*ny;}
  }
  function collide(o) {
    const qx=Math.max(o.x,Math.min(ball.x,o.x+o.w));
    const qy=Math.max(o.y,Math.min(ball.y,o.y+o.h));
    let dx=ball.x-qx,dy=ball.y-qy,d=Math.hypot(dx,dy);
    if(d>=R) return;
    if(d>0.0001){dx/=d;dy/=d;ball.x+=dx*(R-d+.001);ball.y+=dy*(R-d+.001);reflect(dx,dy);}
    else {
      const faces=[{d:ball.x-o.x,nx:-1,ny:0},{d:o.x+o.w-ball.x,nx:1,ny:0},{d:ball.y-o.y,nx:0,ny:-1},{d:o.y+o.h-ball.y,nx:0,ny:1}];
      faces.sort((a,b)=>a.d-b.d);const f=faces[0];
      ball.x+=f.nx*(f.d+R+.001);ball.y+=f.ny*(f.d+R+.001);reflect(f.nx,f.ny);
    }
  }
  function physics(dt) {
    if (phase!=='moving') return;
    ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
    if(ball.x<WALL+R){ball.x=WALL+R;reflect(1,0);}
    if(ball.x>W-WALL-R){ball.x=W-WALL-R;reflect(-1,0);}
    if(ball.y<WALL+R){ball.y=WALL+R;reflect(0,1);}
    if(ball.y>H-WALL-R){ball.y=H-WALL-R;reflect(0,-1);}
    level().obstacles.forEach(collide);
    let speed=Math.hypot(ball.vx,ball.vy);
    if(speed<=145 && Math.hypot(ball.x-level().cup[0],ball.y-level().cup[1])<=9){sink();return;}
    const next=Math.max(0,speed-FRICTION*dt);
    if(next<5){ball.vx=0;ball.vy=0;phase='aim';updateUI();return;}
    ball.vx*=next/speed;ball.vy*=next/speed;
  }
  function local(e) {const b=canvas.getBoundingClientRect();return {x:(e.clientX-b.left)*W/b.width,y:(e.clientY-b.top)*H/b.height};}
  function aimVector(){if(!drag)return {x:0,y:0,power:0,length:0};let dx=drag.startX-drag.x,dy=drag.startY-drag.y;const n=Math.hypot(dx,dy);const ratio=n>MAX_PULL?MAX_PULL/n:1;return {x:dx*ratio,y:dy*ratio,power:Math.min(1,n/MAX_PULL),length:n};}
  canvas.addEventListener('pointerdown',e=>{
    if(phase!=='aim'||drag||document.hidden||e.button!==0)return;
    const p=local(e);const grab=Math.max(32,26*W/canvas.getBoundingClientRect().width);
    if(Math.hypot(p.x-ball.x,p.y-ball.y)>grab)return;
    const rect=canvas.getBoundingClientRect();
    e.preventDefault();drag={id:e.pointerId,startX:p.x,startY:p.y,x:p.x,y:p.y,viewWidth:innerWidth,viewHeight:innerHeight,rectWidth:rect.width,rectHeight:rect.height};canvas.setPointerCapture(e.pointerId);
    el('status').textContent='Тяните назад. Стрелка покажет удар.';
  });
  canvas.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id)return;e.preventDefault();const p=local(e);drag.x=p.x;drag.y=p.y;
    const a=aimVector();el('power').style.width=`${a.power*100}%`;
    el('status').textContent=a.length<7?'Оттяните чуть дальше':`Сила удара · ${Math.round(a.power*100)}%`;
  });
  canvas.addEventListener('pointerup',e=>{
    if(!drag||e.pointerId!==drag.id)return;
    const rect=canvas.getBoundingClientRect();
    if(drag.viewWidth!==innerWidth||drag.viewHeight!==innerHeight||Math.abs(drag.rectWidth-rect.width)>.5||Math.abs(drag.rectHeight-rect.height)>.5){cancelDrag();return;}
    const p=local(e);drag.x=p.x;drag.y=p.y;const a=aimVector();cancelDrag();
    if(a.length<7||phase!=='aim')return;
    const speed=a.power*MAX_SPEED;const n=Math.hypot(a.x,a.y);
    ball.vx=a.x/n*speed;ball.vy=a.y/n*speed;phase='moving';GameAudio.play('hit', a.power);strokes[holeIndex]++;accumulator=0;previousTime=null;updateUI();
  });
  canvas.addEventListener('pointercancel',cancelDrag);
  canvas.addEventListener('lostpointercapture',()=>{if(drag)cancelDrag();});
  function suspend(){cancelDrag();previousTime=null;accumulator=0;}
  window.addEventListener('blur',suspend);document.addEventListener('visibilitychange',suspend);
  window.addEventListener('resize',()=>{cancelDrag();resizeCanvas();});
  el('restart').addEventListener('click',()=>{if(phase==='aim'||phase==='moving')resetHole();});
  el('continue').addEventListener('click',()=>{if(phase==='finished'){holeIndex=0;strokes=[0,0,0];}else if(phase==='sunk')holeIndex++;else return;resetHole();el('restart').focus({preventScroll:true});});
  function resizeCanvas(){const b=canvas.getBoundingClientRect();const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(b.width*dpr);canvas.height=Math.round(b.height*dpr);}
  const observer=new ResizeObserver(()=>{cancelDrag();resizeCanvas();});observer.observe(canvas);
  function rr(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
  function circle(x,y,r,c){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();}
  function drawIsland(o,i){
    rr(o.x,o.y+5,o.w,o.h,5,'#284f3e55');rr(o.x,o.y,o.w,o.h,4,'#b9b48b');rr(o.x+3,o.y+3,o.w-6,o.h-6,3,'#344f3d');
    ctx.save();ctx.beginPath();ctx.rect(o.x+4,o.y+4,o.w-8,o.h-8);ctx.clip();
    for(let x=o.x+10;x<o.x+o.w;x+=16){circle(x,o.y+o.h/2+(i%2?2:-2),8,'#45674a');circle(x-2,o.y+o.h/2-3,4,'#5c7954');}
    ctx.restore();
    if(o.h>40){circle(o.x+18,o.y+18,2.2,'#e4c174');circle(o.x+44,o.y+39,2.2,'#efb78c');}
  }
  function render(){
    ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#b4bd9b';ctx.fillRect(0,0,W,H);
    // A wooden course frame, with quiet sea-green turf and hand-cut mowing bands.
    rr(5,5,W-10,H-10,16,'#d6c9a2');rr(12,12,W-24,H-24,11,'#526c4f');rr(21,21,W-42,H-42,7,'#668e6a');
    ctx.save();ctx.beginPath();ctx.roundRect(22,22,W-44,H-44,7);ctx.clip();
    for(let y=-100;y<H;y+=94){ctx.fillStyle='#ffffff05';ctx.beginPath();ctx.moveTo(22,y);ctx.lineTo(W-22,y+90);ctx.lineTo(W-22,y+137);ctx.lineTo(22,y+47);ctx.fill();}
    dots.forEach(d=>circle(d.x,d.y,.7,`rgba(233,240,194,${d.a})`));
    ctx.restore();
    // Small inlaid marks keep the frame from feeling like a flat app panel.
    [[12,12],[W-12,12],[12,H-12],[W-12,H-12]].forEach(([x,y])=>circle(x,y,2,'#a89e7b'));
    ctx.fillStyle='#deebbf88';ctx.font='10px Georgia';ctx.textAlign='center';ctx.fillText(`—  ${String(holeIndex+1).padStart(2,'0')}  —`,W/2,H-34);
    level().obstacles.forEach(drawIsland);
    const [cx,cy]=level().cup;
    circle(cx,cy+2,15,'#426446');circle(cx,cy,13,'#183b32');circle(cx,cy+3,8,'#102e28');
    ctx.strokeStyle='#fff4cf';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx,cy-1);ctx.lineTo(cx,cy-49);ctx.stroke();
    ctx.fillStyle='#be563c';ctx.beginPath();ctx.moveTo(cx+1,cy-49);ctx.lineTo(cx+30,cy-40);ctx.lineTo(cx+1,cy-30);ctx.fill();
    ctx.fillStyle='#fff2da';ctx.font='bold 10px Arial';ctx.textAlign='left';ctx.fillText(holeIndex+1,cx+7,cy-37);
    if(phase==='aim'&&!drag){ctx.strokeStyle='#e6edc481';ctx.setLineDash([2,5]);ctx.lineWidth=1;ctx.beginPath();ctx.arc(ball.x,ball.y,25,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
    if(drag){const a=aimVector();if(a.length>=7){
      const n=Math.hypot(a.x,a.y),ux=a.x/n,uy=a.y/n,len=26+a.power*104;
      const endX=ball.x+ux*len,endY=ball.y+uy*len;
      ctx.strokeStyle='#fff6d8';ctx.lineWidth=2;ctx.setLineDash([5,6]);ctx.beginPath();ctx.moveTo(ball.x+ux*13,ball.y+uy*13);ctx.lineTo(endX,endY);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='#fff6d8';ctx.beginPath();ctx.moveTo(endX+ux*5,endY+uy*5);ctx.lineTo(endX-ux*6-uy*5,endY-uy*6+ux*5);ctx.lineTo(endX-ux*6+uy*5,endY-uy*6-ux*5);ctx.fill();
      ctx.strokeStyle='#e7c88c99';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(ball.x,ball.y);ctx.lineTo(ball.x-a.x,ball.y-a.y);ctx.stroke();circle(ball.x-a.x,ball.y-a.y,5,'#f2dbab');
    }}
    if(phase!=='sunk'&&phase!=='finished'){
      circle(ball.x+2,ball.y+3,R+1,'#25453455');const g=ctx.createRadialGradient(ball.x-3,ball.y-4,1,ball.x,ball.y,R);g.addColorStop(0,'#ffffff');g.addColorStop(.75,'#f6f1d8');g.addColorStop(1,'#c8d0af');circle(ball.x,ball.y,R,g);circle(ball.x+2,ball.y+2,1,'#bcc7b7');
    }
  }
  function tick(time){
    if(!document.hidden){
      if(previousTime!==null)accumulator+=Math.min((time-previousTime)/1000,.05);
      previousTime=time;
      while(accumulator>=1/120){physics(1/120);accumulator-=1/120;}
      render();
    }else{previousTime=null;accumulator=0;}
    frame=requestAnimationFrame(tick);
  }
  window.getGolfState=()=>({holeIndex,phase,strokes:[...strokes],ball:{...ball},cup:{x:level().cup[0],y:level().cup[1],radius:CUP_R},course:{width:W,height:H},dragging:!!drag,obstacles:level().obstacles.map(o=>({...o})),bounds:{left:WALL,right:W-WALL,top:WALL,bottom:H-WALL},maxPull:MAX_PULL,maxSpeed:MAX_SPEED,friction:FRICTION});
  resetHole();resizeCanvas();frame=requestAnimationFrame(tick);
})();
