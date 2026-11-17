"use strict";
(()=>{
const $=id=>document.getElementById(id),canvas=$("arena"),c=canvas.getContext("2d"),water=$("water");
const TAU=Math.PI*2,STEP=1/120,clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const reduced=matchMedia("(prefers-reduced-motion: reduce)"),coarse=matchMedia("(pointer: coarse)");
function hint(){ $("control-hint").textContent=coarse.matches||navigator.maxTouchPoints>0?"Потяните поле для движения":"WASD / стрелки — движение" }
hint();coarse.addEventListener?.("change",hint);canvas.tabIndex=-1;
const definitions=[
  {id:"cannon",name:"Импульсная катушка",icon:"◎",description:"Перезарядка орудия быстрее на 25%."},
  {id:"motor",name:"Турбовинт",icon:"≋",description:"Скорость движения выше на 20%."},
  {id:"hull",name:"Ремкомплект",icon:"✚",description:"+1 к запасу корпуса и ремонт на 3 деления."}
];
const types={"медуза":{r:14,hp:2,speed:41},"скат":{r:13,hp:1,speed:65},"краб":{r:20,hp:5,speed:30}};
let width=800,height=540,bg=null,coverBg=null,pixelW=1,pixelH=1,phase="menu",elapsed=0,kills=0,upgrades=[],enemies=[],shots=[],fx=[],nextId=0,shotWait=0,spawnWait=0,wave=0,stepCount=0,noticeUntil=0;
let raf=0,lastTime=null,accum=0,hudKey="",pointer=null;const keys=new Set();
let p={x:400,y:270,vx:0,vy:0,radius:15,speed:142,angle:-.22,hp:6,max:6,shield:0,reload:.54};
const vector={x:0,y:0};let joy={ox:0,oy:0,x:0,y:0};
// Some embedded touch views deliver pointerup while suppressing the compatibility click.
// Activate a stationary tap once, and retain native click for mouse, keyboard and assistive input.
let buttonTap=null,lastTap=null;
document.addEventListener("pointerdown",e=>{
  if(e.pointerType!=="touch"||!e.isPrimary)return;
  const b=e.target.closest?.("button:enabled");buttonTap=b?{b,id:e.pointerId,x:e.clientX,y:e.clientY}:null;
},true);
document.addEventListener("pointercancel",e=>{if(buttonTap?.id===e.pointerId)buttonTap=null},true);
document.addEventListener("pointerup",e=>{
  if(!buttonTap||e.pointerId!==buttonTap.id)return;
  const {b,x,y}=buttonTap;buttonTap=null;
  if(Math.hypot(e.clientX-x,e.clientY-y)>12||!b.contains(document.elementFromPoint(e.clientX,e.clientY)))return;
  lastTap={b,time:performance.now(),x:e.clientX,y:e.clientY};b.click();
},true);
document.addEventListener("click",e=>{
  if(!e.isTrusted||!e.detail||!lastTap||performance.now()-lastTap.time>750)return;
  if(e.pointerType==="mouse"&&!e.sourceCapabilities?.firesTouchEvents)return;
  if(lastTap.b.contains(e.target)||Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<8){e.preventDefault();e.stopImmediatePropagation()}
},true);
function input(){
  let kx=Number(keys.has("KeyD")||keys.has("ArrowRight"))-Number(keys.has("KeyA")||keys.has("ArrowLeft"));
  let ky=Number(keys.has("KeyS")||keys.has("ArrowDown"))-Number(keys.has("KeyW")||keys.has("ArrowUp"));
  let x=kx||ky?kx:joy.x,y=kx||ky?ky:joy.y;const n=Math.hypot(x,y);vector.x=n>1?x/n:x;vector.y=n>1?y/n:y;
}
function clearInput(){keys.clear();const old=pointer;pointer=null;joy={ox:0,oy:0,x:0,y:0};if(old!==null){try{canvas.releasePointerCapture(old)}catch{}}input();p.vx=p.vy=0}
function stopLoop(){if(raf)cancelAnimationFrame(raf);raf=0;lastTime=null;accum=0}
function surface(w,h){const s=document.createElement("canvas");s.width=w;s.height=h;return s}
function resize(){
  const rect=water.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
  const dpr=Math.min(window.devicePixelRatio||1,2),nw=Math.max(1,Math.round(rect.width*dpr)),nh=Math.max(1,Math.round(rect.height*dpr));
  const ratio=rect.width/rect.height,worldH=Math.sqrt(410000/ratio),worldW=worldH*ratio;
  if(nw!==pixelW||nh!==pixelH||!bg){const scaleX=worldW/width,scaleY=worldH/height;
    for(const o of [p,...enemies,...shots,...fx]){o.x*=scaleX;o.y*=scaleY}
    width=worldW;height=worldH;pixelW=canvas.width=nw;pixelH=canvas.height=nh;
    bg=surface(nw,nh);const g=bg.getContext("2d");g.scale(nw/width,nh/height);DeepArt.seabed(g,width,height,false);
    coverBg=null;if(pointer!==null)clearInput()
  }draw()
}
function fmt(s){const n=Math.ceil(Math.max(0,s)-1e-8);return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0")}
function hud(){
  const key=[fmt(90-elapsed),p.hp,p.max,kills].join("|");if(key===hudKey)return;hudKey=key;
  $("clock").textContent=fmt(90-elapsed);$("kills").textContent=kills;
  const box=$("health");if(box.dataset.state!==p.hp+"/"+p.max){box.dataset.state=p.hp+"/"+p.max;box.setAttribute("aria-label","Прочность "+p.hp+" из "+p.max);box.replaceChildren();for(let i=0;i<p.max;i++){const e=document.createElement("i");if(i>=p.hp)e.className="empty";box.append(e)}}
}
function renderCover(){
  if(!coverBg){coverBg=surface(pixelW,pixelH);const cc=coverBg.getContext("2d"),r=water.getBoundingClientRect();cc.scale(pixelW/r.width,pixelH/r.height);DeepArt.cover(cc,r.width,r.height)}c.drawImage(coverBg,0,0)
}
function draw(){
  c.setTransform(1,0,0,1,0,0);if(phase==="menu"){renderCover();return}if(!bg)return;c.drawImage(bg,0,0);
  c.setTransform(pixelW/width,0,0,pixelH/height,0,0);c.lineCap="round";c.lineJoin="round";
  for(const f of fx){const a=clamp(f.life/f.max,0,1);c.globalAlpha=a;if(f.ring){DeepArt.ellipse(c,f.x,f.y,f.rad*(1-a)+3,f.rad*(1-a)+3,null,f.color,1.3)}else DeepArt.ellipse(c,f.x,f.y,1.5+a,1.5+a,f.color)}
  c.globalAlpha=1;for(const e of enemies)DeepArt.enemy(c,e,elapsed);
  for(const s of shots){const n=Math.hypot(s.vx,s.vy);DeepArt.line(c,s.x-s.vx/n*11,s.y-s.vy/n*11,s.x,s.y,"#9cfff1",3.4);DeepArt.ellipse(c,s.x,s.y,3.2,3.2,"#f6ffde")}
  if(p.shield>0)DeepArt.ellipse(c,p.x,p.y,25,25,"#ffc1a017","#ffe4b5",2);
  DeepArt.diver(c,p);
  if(p.shield>.86){c.strokeStyle="#ff9e79";c.lineWidth=6;c.strokeRect(3,3,width-6,height-6)}
  if(pointer!==null){const scale=width/water.clientWidth,x=joy.ox*scale,y=joy.oy*scale;DeepArt.ellipse(c,x,y,35*scale,35*scale,"#0929325e","#d1ebd392",1.4*scale);DeepArt.ellipse(c,x+joy.x*28*scale,y+joy.y*28*scale,10*scale,10*scale,"#f5d59bb3")}
  c.globalAlpha=1
}
function sparkle(x,y,color,large=false){
  if(reduced.matches){if(fx.length<90)fx.push({x,y,vx:0,vy:0,life:.12,max:.12,ring:true,rad:large?28:12,color});return}
  if(fx.length>80)return;fx.push({x,y,vx:0,vy:0,life:.26,max:.26,ring:true,rad:large?30:13,color});
  for(let i=0;i<(large?7:3);i++){const a=Math.random()*TAU,v=16+Math.random()*45;fx.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.32,max:.32,color})}
}
function spawn(type){
  if(enemies.length>=72)return;const spec=types[type];let x,y,distance;
  for(let j=0;j<16;j++){const edge=Math.floor(Math.random()*4),along=Math.random();x=edge===0?-spec.r:edge===1?width+spec.r:along*width;y=edge===2?-spec.r:edge===3?height+spec.r:along*height;distance=Math.hypot(x-p.x,y-p.y);if(distance>Math.min(175,Math.min(width,height)*.36))break}
  if(distance<Math.min(175,Math.min(width,height)*.36))return;
  enemies.push({id:++nextId,type,x,y,angle:0,radius:spec.r,hp:spec.hp,speed:spec.speed*(.93+Math.random()*.15),hit:0,seed:Math.random()*TAU})
}
function swarm(dt){
  spawnWait-=dt;if(spawnWait<=0){const r=Math.random();let type=r<.17&&elapsed>=13?"краб":r<.43&&elapsed>=5?"скат":"медуза";spawn(type);wave++;if(elapsed>52&&wave%7===0)spawn("медуза");spawnWait=1.18-elapsed*.0048}
  for(const e of enemies){
    const dx=p.x-e.x,dy=p.y-e.y,n=Math.hypot(dx,dy)||1,cycle=elapsed*(e.type==="скат"?2.3:1.7)+e.seed;
    let speed=e.speed*(1+elapsed*.0025),sway=0;
    if(e.type==="медуза"){sway=Math.sin(cycle)*.19;speed*=.88+.17*Math.cos(cycle*1.9)}
    if(e.type==="скат"){sway=Math.sin(cycle)*.33;speed*=.90+.61*Math.max(0,Math.cos(cycle))}
    const angle=Math.atan2(dy,dx)+sway;e.angle=angle;e.vx=Math.cos(angle)*speed;e.vy=Math.sin(angle)*speed;e.x+=e.vx*dt;e.y+=e.vy*dt;e.hit=Math.max(0,e.hit-dt);
    if(n<=p.radius+e.radius-2&&p.shield<=0){
      p.hp--;p.shield=1.55;
      for(const other of enemies){const ox=other.x-p.x,oy=other.y-p.y,range=Math.hypot(ox,oy)||1;if(range<90){const push=(90-range)*.9;other.x+=ox/range*push;other.y+=oy/range*push}}
      sparkle(p.x,p.y,"#ffad84",true);Hydrophone.play("hurt");if(p.hp<=0){finish(false);return}
    }
  }
}
function weapons(dt){
  shotWait-=dt;if(shotWait<=0&&shots.length<32){
    let best=null,dist=226;for(const e of enemies){const d=Math.hypot(e.x-p.x,e.y-p.y);if(d<dist){best=e;dist=d}}
    if(best){const travel=dist/370,ax=best.x-p.x+(best.vx||0)*travel,ay=best.y-p.y+(best.vy||0)*travel,aim=Math.hypot(ax,ay)||1,dx=ax/aim,dy=ay/aim;shots.push({x:p.x+dx*15,y:p.y+dy*15,vx:dx*340,vy:dy*340,radius:3.2,life:.80});shotWait=p.reload;Hydrophone.play("shot")}else shotWait=.06
  }
  for(let i=shots.length-1;i>=0;i--){
    const s=shots[i];s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;let used=false;
    for(let j=enemies.length-1;j>=0;j--){const e=enemies[j];if(Math.hypot(s.x-e.x,s.y-e.y)<=s.radius+e.radius){e.hp--;e.hit=.10;used=true;sparkle(s.x,s.y,"#baf7de",e.hp===0);Hydrophone.play("hit");if(e.hp===0){enemies.splice(j,1);kills++}break}}
    if(used||s.life<=0||s.x < -5||s.x>width+5||s.y < -5||s.y>height+5)shots.splice(i,1)
  }
}
function tick(){
  stepCount++;elapsed=stepCount*STEP;
  if(stepCount===10800){finish(true);return}
  if(stepCount===3600||stepCount===7200){showUpgrade();return}
  p.shield=Math.max(0,p.shield-STEP);p.vx=vector.x*p.speed;p.vy=vector.y*p.speed;
  if(p.vx||p.vy){let a=Math.atan2(p.vy,p.vx)-p.angle;p.angle+=Math.atan2(Math.sin(a),Math.cos(a))*Math.min(1,STEP*12)}
  p.x=clamp(p.x+p.vx*STEP,p.radius+2,width-p.radius-2);p.y=clamp(p.y+p.vy*STEP,p.radius+2,height-p.radius-2);
  swarm(STEP);if(phase!=="playing")return;weapons(STEP);
  for(let i=fx.length-1;i>=0;i--){const f=fx[i];f.life-=STEP;if(f.life<=0){fx.splice(i,1);continue}f.x+=f.vx*STEP;f.y+=f.vy*STEP}
  if(noticeUntil&&elapsed>=noticeUntil){$("notice").textContent="";noticeUntil=0}
}
function frame(t){raf=0;if(phase!=="playing")return;if(lastTime!==null)accum+=Math.min(.2,Math.max(0,(t-lastTime)/1000));lastTime=t;while(accum+1e-9>=STEP&&phase==="playing"){accum-=STEP;tick()}draw();hud();if(phase==="playing")raf=requestAnimationFrame(frame)}
function begin(){clearInput();phase="playing";$("veil").hidden=true;$("pause").disabled=false;lastTime=null;accum=0;canvas.focus({preventScroll:true});if(!raf)raf=requestAnimationFrame(frame)}
function reset(){
  stopLoop();clearInput();Hydrophone.stop();phase="playing";$("cover").hidden=true;$("hud").hidden=false;$("veil").hidden=true;
  stepCount=elapsed=kills=wave=nextId=shotWait=noticeUntil=0;spawnWait=.85;upgrades=[];shots=[];enemies=[];fx=[];$("notice").textContent="";hudKey="";resize();
  p={x:width/2,y:height/2,vx:0,vy:0,radius:15,speed:142,angle:-.22,hp:6,max:6,shield:0,reload:.54};spawn("медуза");spawn("медуза");spawn("скат");hud();begin();draw()
}
function modal(next,kicker,title,desc){
  phase=next;stopLoop();clearInput();Hydrophone.stop();$("pause").disabled=true;$("veil").hidden=false;$("notice").textContent="";noticeUntil=0;
  $("kicker").textContent=kicker;$("dialog-title").textContent=title;$("description").textContent=desc;$("actions").replaceChildren();hud();draw()
}
function action(label,fn){let b=document.createElement("button");b.className="primary";b.type="button";b.textContent=label;b.addEventListener("click",fn);$("actions").append(b);b.focus({preventScroll:true})}
function pause(){if(phase!=="playing")return;modal("paused","Связь с батискафом","Пауза","Время и обитатели глубины замерли.");action("Продолжить",()=>{if(phase==="paused")begin()})}
function showUpgrade(){modal("upgrade","Связь с батискафом · "+elapsed+" секунд","Модернизация","Выберите одно улучшение для этого погружения.");
  for(const d of definitions){const b=document.createElement("button");b.className="choice";b.type="button";b.innerHTML='<span class="symbol" aria-hidden="true"></span><span><b></b><small></small></span><span class="arrow" aria-hidden="true">›</span>';b.querySelector(".symbol").textContent=d.icon;b.querySelector("b").textContent=d.name;b.querySelector("small").textContent=d.description;
    const threshold=stepCount;b.onclick=()=>{if(phase!=="upgrade"||stepCount!==threshold)return;upgrades.push(d.name);if(d.id==="motor")p.speed*=1.2;if(d.id==="cannon")p.reload*=.75;if(d.id==="hull"){p.max++;p.hp=Math.min(p.max,p.hp+3)}begin();hud();Hydrophone.play("upgrade");$("notice").textContent=d.name;noticeUntil=elapsed+2};$("actions").append(b)
  }$("actions").firstElementChild.focus({preventScroll:true})
}
function finish(win){modal(win?"won":"lost","Итоги погружения",win?"На поверхности!":"Корпус пробит", "Время в глубине — "+fmt(elapsed)+" из 01:30\nПоражено целей — "+kills+"\nУлучшения — "+(upgrades.join(", ")||"без улучшений"));Hydrophone.play(win?"won":"lost");action("Новая партия",reset)}
$("start").onclick=reset;$("pause").onclick=pause;
const moveKeys=new Set(["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"]);
window.addEventListener("keydown",e=>{
  if(e.code==="Escape"&&!e.repeat){if(phase==="playing"){e.preventDefault();pause()}else if(phase==="paused"){e.preventDefault();begin()}return}
  if(phase==="playing"&&moveKeys.has(e.code)&&!(e.target===$("volume")&&e.code.startsWith("Arrow"))){e.preventDefault();keys.add(e.code);input()}
});
window.addEventListener("keyup",e=>{if(keys.delete(e.code))input()});
function local(e){const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}}
canvas.addEventListener("pointerdown",e=>{if(phase!=="playing"||pointer!==null||e.button!==0)return;
  // Capture only the field pointer. Native HUD buttons keep their own click.
  pointer=e.pointerId;const a=local(e);joy={ox:a.x,oy:a.y,x:0,y:0};canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});e.preventDefault()
});
canvas.addEventListener("pointermove",e=>{if(e.pointerId!==pointer||phase!=="playing")return;const a=local(e),dx=a.x-joy.ox,dy=a.y-joy.oy,n=Math.hypot(dx,dy);if(n<3){joy.x=joy.y=0}else{const d=Math.max(n,32);joy.x=dx/d;joy.y=dy/d}input()});
function lift(e){if(e.pointerId!==pointer)return;pointer=null;joy.x=joy.y=0;input()}
window.addEventListener("pointerup",lift);window.addEventListener("pointercancel",lift);canvas.addEventListener("lostpointercapture",lift);
function hide(){if(phase==="playing")pause();else clearInput();Hydrophone.stop()}
window.addEventListener("blur",hide);document.addEventListener("visibilitychange",()=>{if(document.hidden)hide()});
new ResizeObserver(resize).observe(water);window.addEventListener("resize",resize);
window.getArenaState=()=>({phase,elapsed,remaining:Math.max(0,90-elapsed),kills,health:p.hp,maxHealth:p.max,player:{x:p.x,y:p.y,vx:p.vx,vy:p.vy,radius:p.radius,speed:p.speed},arena:{width,height},enemies:enemies.map(({id,x,y,radius,type,hp})=>({id,x,y,radius,type,hp})),projectiles:shots.map(({x,y,radius})=>({x,y,radius})),upgrades:[...upgrades],input:{...vector}});
resize()
})();
