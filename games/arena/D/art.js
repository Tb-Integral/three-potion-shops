"use strict";
const DeepArt = (() => {
  const TAU=Math.PI*2;
  function random(seed){return ()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296}}
  function path(c,d,fill,stroke,width=1){const p=new Path2D(d);if(fill){c.fillStyle=fill;c.fill(p)}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke(p)}}
  function ellipse(c,x,y,rx,ry,fill,stroke,width=1){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke()}}
  function line(c,x,y,u,v,color,width=1){c.beginPath();c.moveTo(x,y);c.lineTo(u,v);c.strokeStyle=color;c.lineWidth=width;c.stroke()}
  function curved(c,pts,color,width=1){c.beginPath();c.moveTo(pts[0],pts[1]);for(let j=2;j<pts.length;j+=6)c.bezierCurveTo(...pts.slice(j,j+6));c.strokeStyle=color;c.lineWidth=width;c.stroke()}
  function jelly(c,x,y,size,color,phase){
    c.save();c.translate(x,y);c.scale(size,size);
    for(let k=-2;k<=2;k++){const t=Math.sin(phase+k*.86)*.09;curved(c,[k*.31,.15,k*.43+t,.69,k*.30-t,.73,k*.36+t,1.03+Math.cos(k)*.32],color,.055)}
    path(c,"M-1 .12C-.94-.5-.53-.92 .03-.92 .58-.9 .94-.45 1 .12 .75 .38 .52 .36 .34 .24 .17 .45 -.15 .43 -.34 .23 -.57 .38 -.84 .33 -1 .12Z","#774953",color,.085);
    curved(c,[-.67,-.16,-.50,-.56,-.23,-.67,-.04,-.68],"#ffe1ab",.07);
    ellipse(c,.29,-.15,.13,.1,"#ffd9ab");c.restore()
  }
  function kelp(c,x,y,h,ink,sway){c.save();c.translate(x,y);c.scale(h,h);for(let k=-2;k<=2;k++){
    c.save();c.rotate(k*.16+sway);const len=1-Math.abs(k)*.15;
    c.scale(1,len);path(c,"M0 0C-.08-.27 .1-.43 .04-.61 -.01-.75 .06-.87 .1-1 .09-.76 .17-.73 .13-.57 .10-.39 .01-.22 .025 0Z",ink);c.restore()
  }c.restore()}
  function seabed(c,w,h,cover){
    const rng=random(cover?392:711);const gradient=c.createLinearGradient(0,0,w*.45,h);
    gradient.addColorStop(0,cover?"#286770":"#17484f");gradient.addColorStop(.5,cover?"#174954":"#123940");gradient.addColorStop(1,"#082b36");c.fillStyle=gradient;c.fillRect(0,0,w,h);
    // Slanting underwater light and fine suspended sediment.
    for(let i=0;i<13;i++){let x=rng()*w*1.5;let breadth=(.018+rng()*.08)*w;let light=c.createLinearGradient(x,0,x-w*.21,h*.75);light.addColorStop(0,cover?"#9ad9b91e":"#94d0b70c");light.addColorStop(1,"#8ad8c100");c.beginPath();c.moveTo(x,0);c.lineTo(x+breadth,0);c.lineTo(x-w*.40+breadth*1.5,h);c.lineTo(x-w*.40,h);c.fillStyle=light;c.fill()}
    for(let i=0;i<Math.round(w*h/850);i++){let x=rng()*w,y=rng()*h,r=.4+rng()*1.2;ellipse(c,x,y,r,r*.76,i%5?"#a0cdbe24":"#b5d0b84f")}
    // Contour lines are drawn from deterministic nested coastlines.
    for(const zone of [[-.17,.45,.23],[.93,1.14,.28],[1.17,.13,.25],[.10,1.12,.17]]){
      const [sx,sy,sz]=zone;for(let k=0;k<12;k++){c.beginPath();for(let j=0;j<=140;j++){const a=j*TAU/140,r=sz*(.50+k*.091)*(1+.10*Math.sin(a*4+.7)+.055*Math.cos(a*7));let x=w*sx+r*w*Math.cos(a),y=h*sy+r*Math.min(w,h)*Math.sin(a);if(!j)c.moveTo(x,y);else c.lineTo(x,y)}c.closePath();c.strokeStyle=cover?"#8bbca330":"#77ab9e23";c.lineWidth=k%4?1:1.7;c.stroke()}
    }
    if(cover){
      // Three engraved silhouettes of the trench.
      const layers=[{y:.83,ink:"#1a4249"},{y:.89,ink:"#12353c"},{y:.96,ink:"#0a2b33"}];
      for(let n=0;n<layers.length;n++){const l=layers[n];c.beginPath();c.moveTo(0,h);for(let i=0;i<=160;i++){let x=w*i/160;let y=h*(l.y+.04*Math.sin(i*.047+n*2.6)+.018*Math.cos(i*.15+n)+rng()*.008);c.lineTo(x,y)}c.lineTo(w,h);c.fillStyle=l.ink;c.fill();for(let j=0;j<12;j++){let x=rng()*w;kelp(c,x,h*(l.y+.018),h*(.018+rng()*.08),l.ink,(rng()-.5)*.5)}}
    }else{
      for(let i=0;i<27;i++){let x=rng()*w,y=rng()*h;if(x>w*.08&&x<w*.92&&y>h*.09&&y<h*.91)continue;kelp(c,x,y,10+rng()*15,"#6ba99739",rng()-.5)}
      c.strokeStyle="#729b902e";c.lineWidth=1;c.setLineDash([2,11]);c.strokeRect(10,10,w-20,h-20);c.setLineDash([])
    }
  }
  function ship(c){
    // Side view of a riveted research submersible, drawn in local plate coordinates.
    const outline="#233e40",light="#ffdfaa",body="#f2a965",shade="#c77847",teal="#4e8582";
    path(c,"M-96 42Q-103 59-81 65L88 65Q107 65 116 56 M-67 37L-61 61M67 37 60 62",null,outline,9);
    path(c,"M-96 42Q-103 59-81 65L88 65Q107 65 116 56 M-67 37L-61 61M67 37 60 62",null,"#b3c3a7",3);
    path(c,"M-112-10-147-25-141-2-144 21-106 12Z",teal,outline,3);
    path(c,"M-123-9-135-42-110-38-89-16Z",shade,outline,3);
    path(c,"M-135-4-156-6-158 3-135 7Z","#d6ae78",outline,3);
    ellipse(c,-155,-12,4,13,"#d4c39a",outline,2);ellipse(c,-155,13,4,12,"#d4c39a",outline,2);
    path(c,"M-39-29-30-53Q-28-59-17-58L21-56 33-33Z",teal,outline,3);
    path(c,"M-15-56V-79Q-15-85-8-85H7V-77H-6V-56Z",shade,outline,3);
    path(c,"M-38-56-32-61H22Q27-59 27-54Z",light,outline,2);
    const hull="M-126-9Q-98-34-51-37L39-36Q85-36 109-18L129-5Q138 1 129 10L114 24Q91 40 41 43L-43 42Q-91 38-122 18Q-135 7-126-9Z";
    path(c,hull,body,outline,4);
    c.save();c.clip(new Path2D(hull));
    path(c,"M-139 3Q-15 39 137 8L135 51H-144Z",shade);
    path(c,"M-138-9Q-30-38 104-21L88-39H-82Z","#ffcf8c");
    for(let j=-123;j<119;j+=6)line(c,j,47,j+21,22,"#915c435e",1);
    for(const x of [-81,-19,54,87])curved(c,[x,-42,x+11,-12,x+12,21,x+2,46],"#9b6449",1.3);
    for(let x=-102;x<=99;x+=12){ellipse(c,x,26-Math.max(0,Math.abs(x)-59)*.15,1.35,1.35,outline);ellipse(c,x,-23+Math.max(0,Math.abs(x)-59)*.2,1,1,"#805d4a")}
    c.restore();
    for(const [x,r] of [[-44,9],[-10,13],[30,14]]){ellipse(c,x,-3,r+3,r+3,light,outline,2);ellipse(c,x,-3,r,r,"#29535b",outline,2);curved(c,[x-r*.65,-3,x-r*.5,-3-r*.65,x,-3-r*.7,x+r*.28,-3-r*.6],"#8dc3ba",2)}
    path(c,"M99-8Q113-11 121-6L126 8 109 14 103 10Z",teal,outline,2);
    ellipse(c,124,1.5,4.5,8,light,outline,2);
    line(c,-102,5,-81,8,outline,2);line(c,-102,10,-80,13,outline,2);
  }
  function cover(c,w,h){
    seabed(c,w,h,true);const portrait=w<650&&w/h<1.25;
    const sx=w*(portrait?.48:.72),sy=h*(portrait?.285:.46);
    const scale=portrait?Math.min(w*.79/300,h*.29/153):Math.min(w*.46/300,h*.55/153);
    const rng=random(5362);
    for(let i=0;i<16;i++){let r=scale*(1.3+rng()*3.7),step=i/17;ellipse(c,sx-scale*(117+step*100),sy+scale*(27+step*4+(rng()-.5)*25),r,r*1.05,null,"#bfdbc28f",Math.max(1,scale*.9))}
    c.save();c.translate(sx,sy);c.rotate(-.15);c.scale(scale,scale);
    let beam=c.createLinearGradient(120,0,280,0);beam.addColorStop(0,"#ffdf954a");beam.addColorStop(1,"#fbd49100");path(c,"M120-2 291-45 292 44 122 7Z",beam);
    ship(c);c.restore();
    jelly(c,w*(portrait?.82:.91),h*(portrait?.10:.19),Math.max(10,scale*12),"#ecad94",1.1);
    jelly(c,w*(portrait?.20:.62),h*(portrait?.41:.74),Math.max(8,scale*10),"#d3a49b",2.8);
    jelly(c,w*(portrait?.12:.57),h*(portrait?.37:.69),Math.max(6,scale*6.6),"#b89c93",0);
  }
  function diver(c,p){c.save();c.translate(p.x,p.y);c.rotate(p.angle);const z=p.radius/16;c.scale(z,z);
    ellipse(c,0,4,21,12,"#071c2780");
    path(c,"M-9-6-18-15-19-11-16-3-24-4-24 4-16 3-19 11-18 15-9 6Z","#ca865b","#203237",1.8);
    path(c,"M-18 0Q-13-12 0-11 11-11 21-3 24 0 21 3 11 11 0 11-13 12-18 0Z","#ffbd76","#182f32",2);
    path(c,"M-12 5Q0 10 17 2L10 8Q-2 13-12 5Z","#d98751");
    ellipse(c,1,0,8,7,"#fce0a2","#815d48",1.7);ellipse(c,2,0,5,4,"#3a6c75","#2b4448",1);
    line(c,15,-4,20,-2,"#fff4cb",2.5);line(c,15,4,20,2,"#fff4cb",2.5);
    c.restore()}
  function enemy(c,e,t){const r=e.radius;c.save();c.translate(e.x,e.y);const lit=e.hit>0;
    if(e.type==="медуза"){c.scale(1,1);c.rotate(e.angle+Math.PI/2);jelly(c,0,0,r,lit?"#fffce1":"#ffb1a0",t*4+e.id)}
    else if(e.type==="скат"){c.rotate(e.angle);c.scale(r,r);path(c,"M1.15 0Q.39-.26-.47-1.1-.62-.73-.5-.23L-1.6 0-.5 .23Q-.62 .73-.47 1.1 .39 .26 1.15 0Z",lit?"#ffefd1":"#c48bbb","#edc0e1",.09);path(c,"M.77 0 .15-.2-.59 0 .15 .2Z","#693f6c");ellipse(c,.43,0,.1,.1,"#fff0c0")}
    else{c.rotate(e.angle);c.scale(r,r);for(let i=-1;i<=1;i++){line(c,-.34+i*.36,-.60,-.47+i*.46,-.96,"#b8a4d4",.13);line(c,-.34+i*.36,.60,-.47+i*.46,.96,"#b8a4d4",.13)}
      path(c,"M-1-.28-.64-.73 .25-.78 .76-.38 .91 0 .76 .38 .25 .78-.64 .73-1 .28Z",lit?"#fff3d0":"#8773a2","#d6bfda",.095);
      for(let i=0;i<3;i++)curved(c,[-.61+i*.33,-.64,-.34+i*.33,-.2,-.34+i*.33,.2,-.61+i*.33,.64],"#594d77",.08);
      for(let s of [-1,1]){path(c,`M.43 ${s*.57}Q.77 ${s*1.13} 1.17 ${s*.76}L.98 ${s*.73} 1.14 ${s*.51}Q.85 ${s*.5} .69 ${s*.39}Z`,"#d6b3d0","#655474",.055);ellipse(c,.65,s*.22,.09,.09,"#ffe1ac")}}
    c.restore()}
  return {cover,seabed,diver,enemy,ellipse,line}
})();
