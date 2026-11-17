"use strict";
const Hydrophone=(()=>{
  let enabled=true,volume=.55,ctx=null,master=null;const voices=new Set(),last=new Map();
  try{const p=JSON.parse(localStorage.getItem("bathyscaphe.sound.v1")||"null");if(p&&typeof p.enabled==="boolean")enabled=p.enabled;if(p&&typeof p.volume==="number"&&Number.isFinite(p.volume)&&p.volume>=0&&p.volume<=1)volume=p.volume}catch{}
  function save(){try{localStorage.setItem("bathyscaphe.sound.v1",JSON.stringify({enabled,volume}))}catch{}}
  function stop(){for(const v of voices){v.o.onended=null;try{v.o.stop();v.o.disconnect();v.g.disconnect()}catch{}}voices.clear();last.clear()}
  function sync(){if(master&&ctx)master.gain.setValueAtTime(enabled?volume*.43:0,ctx.currentTime);if(!enabled||volume===0)stop();const btn=document.getElementById("sound");btn.setAttribute("aria-pressed",String(enabled));btn.setAttribute("aria-label",enabled?"Выключить звук":"Включить звук");btn.querySelector("span").textContent=enabled?"Звук":"Без звука";document.getElementById("volume").value=volume*100}
  function unlock(){if(!enabled||volume===0)return;try{if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;ctx=new AC();master=ctx.createGain();master.connect(ctx.destination);sync()}if(ctx.state==="suspended"||ctx.state==="interrupted")ctx.resume().catch(()=>{})}catch{}}
  function tone(f,to,dur,shape,level,delay=0){if(!ctx||!master||ctx.state!=="running"||!enabled||volume===0||voices.size>=12)return;try{let o=ctx.createOscillator(),g=ctx.createGain(),now=ctx.currentTime+delay;const v={o,g};o.type=shape;o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(to,now+dur);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(level,now+.008);g.gain.exponentialRampToValueAtTime(.0001,now+dur);o.connect(g);g.connect(master);o.onended=()=>{voices.delete(v);o.disconnect();g.disconnect()};voices.add(v);o.start(now);o.stop(now+dur+.004)}catch{}}
  function play(kind){if(!ctx||ctx.state!=="running"||!enabled||!volume)return;const now=ctx.currentTime;
    if(kind==="shot"||kind==="hit"){if(now-(last.get(kind)??-1)<(kind==="shot"?.13:.11))return;last.set(kind,now)}
    switch(kind){
      case "shot":tone(580,210,.095,"sine",.23);break;
      case "hit":tone(910,490,.065,"triangle",.16);break;
      case "hurt":tone(132,54,.31,"triangle",.45);tone(157,64,.26,"sine",.32);break;
      case "upgrade":tone(330,360,.14,"sine",.35);tone(550,630,.22,"sine",.3,.09);break;
      case "won":for(const [i,f] of [330,440,550,660].entries())tone(f,f*1.025,.30,"sine",.33,i*.12);break;
      case "lost":tone(235,170,.35,"triangle",.32);tone(155,73,.54,"sine",.4,.18);break;
    }}
  const sound=document.getElementById("sound"),slider=document.getElementById("volume");
  sound.addEventListener("click",()=>{enabled=!enabled;sync();unlock();save()});
  slider.addEventListener("input",()=>{volume=Number(slider.value)/100;sync();unlock();save()});
  window.addEventListener("pointerdown",unlock,{capture:true});window.addEventListener("keydown",unlock,{capture:true});
  sync();
  window.getAudioState=()=>({enabled,volume,contextState:ctx?ctx.state:"uninitialized",activeVoices:voices.size});
  return {stop,play,unlock}
})();
