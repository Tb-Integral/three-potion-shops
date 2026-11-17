'use strict';
// Original ink illustrations. Coordinates are in the local viewBox of each plate.
const Art = (() => {
const ink='#233330',cream='#ebdab1',gold='#cba666';
const svg=(box,body,extra='')=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+box+'" aria-hidden="true" focusable="false" '+extra+'>'+body+'</svg>';
const path=(d,fill='none',stroke=ink,w=2)=>'<path d="'+d+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+w+'" stroke-linecap="round" stroke-linejoin="round"/>';
const ellipse=(x,y,a,b,fill,stroke='none',w=1)=>'<ellipse cx="'+x+'" cy="'+y+'" rx="'+a+'" ry="'+b+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+w+'"/>';
const repeat=(n,f)=>Array.from({length:n},(_,i)=>f(i)).join('');
function seed(n){let s=n;return ()=>((s=(s*1664525+1013904223)>>>0)/4294967296)}
const defs='<defs><pattern id="hatch" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(26)"><path d="M0 0V5" stroke="#3d3630" stroke-width="1" opacity=".28"/></pattern><pattern id="cloth" patternUnits="userSpaceOnUse" width="8" height="8"><path d="m0 8 8-8m-3 8 3-3" stroke="#e0c892" stroke-width=".65" opacity=".38"/></pattern></defs>';
const bark=(d,color)=>path(d,'none',color,1);
function bottle(i){
 const glass=['#9dcab2','#ebad71','#b2b8df'][i],liquid=['#51987e','#cc6d3e','#787baa'][i],dark=['#356d61','#9a4f31','#555b89'][i];
 const outline=['M38 25L38 40Q38 44 29 50Q19 58 20 73Q21 89 44 90Q67 89 68 73Q69 57 58 50Q50 45 50 40L50 25Z','M35 26L35 42Q35 46 24 55Q19 59 20 68L22 81Q23 86 29 88Q44 93 59 88Q65 86 66 81L68 66Q69 59 63 54L53 45L53 26Z','M36 25V42L22 53L18 69L31 87L44 92L57 87L70 69L66 53L52 42V25Z'][i];
 const water=['M21 62Q30 56 44 62T67 61Q73 87 47 90Q17 90 21 62Z','M21 62Q33 58 45 62T67 61L65 81Q63 91 44 90Q23 88 23 81Z','M21 61Q32 57 44 62T67 60L69 69L56 86L44 90L32 86L19 69Z'][i];
 const mark=i===0?path('M40 78Q36 68 51 64Q52 76 40 78ZM36 82L48 68','none',cream,1.7):i===1?path('M44 81Q33 77 43 67Q42 72 45 72Q50 68 48 64Q57 77 44 81Z',cream,'none'):path('M50 67Q40 69 43 76Q45 80 52 78Q48 85 41 81Q33 77 39 69Q44 64 50 67Z',cream,'none');
 return svg('0 0 88 100',ellipse(44,92,30,3,'#29372c30')+path('M37 15Q44 12 51 15L50 26H38Z','#91613e')+repeat(4,j=>bark('M'+(39+j*3)+' 17l1 5','#be9965'))+path(outline,glass)+path(water,liquid,'none')+path(outline,'none',ink,2.2)+path('M33 26Q44 23 55 26L54 30Q43 33 34 30Z',gold)+path('M36 34Q47 37 54 33M36 37Q46 39 53 36','none',dark,2)+mark+path('M29 56Q24 61 25 69M27 74l1 3M41 40v4','none','#fff3d6',2.4)+path(i===2?'M22 55l12 10-3 19M67 55 55 66l2 18':'M58 83q6-5 5-12','none',dark,1.3));
}
function sprig(){
 let out=path('M19 51Q35 43 44 10M28 43 19 26M33 34 51 22','none','#6e6a41',2);
 [[28,42,-60],[23,34,-48],[31,34,-20],[36,29,45],[40,20,-20],[44,14,17],[42,29,62],[20,29,-42]].forEach(([x,y,a])=>out+='<g transform="translate('+x+' '+y+') rotate('+a+')">'+path('M0 0Q-8-5-4-15Q4-13 2-4Z','#78997a','#314d3e',1)+bark('M0-2-3-12','#cad0a1')+'</g>');return out;
}
function ingredient(i){
 if(i===0)return svg('0 0 64 58',sprig());
 if(i===1)return svg('0 0 64 58',path('M11 40 15 28 26 22 32 34 27 47 17 49Z','#ce8a41')+path('M24 39 30 20 42 12 51 19 54 35 44 46 32 49Z','#e9ab51')+path('m30 20 9 5 12-6m-12 6-7 24m7-24 5 21m-17-17-8 6 2 11','none','#a76238',1.5)+path('m34 20 7-5m4 1 3 3','none','#fbe1a2',2));
 return svg('0 0 64 58',path('m18 48-9-14 4-8 9 5 5 15Z','#92aba8')+path('m21 48-5-27 9-13 8 12-3 27Z','#c8d8cf')+path('m27 48 2-26 10-15 7 13-5 26Z','#a6c4bd')+path('m38 47 6-18 10-5 1 12-10 11Z','#c0cfc2')+path('m25 10-2 15 1 19m15-34-3 16-6 20m22-20-6 11-2 7','none','#67877e',1.2));
}
function fir(x,y,h,c){
 const w=h*.19;let s='M'+x+' '+(y-h);
 for(let k=1;k<=8;k++){let t=k/8;s+='l'+(-w*(.36+t*.46))+' '+h*.12+'l'+(w*(.31+t*.31))+' '+(-h*.033)}
 s+='L'+(x-w)+' '+y+' Q'+x+' '+(y-h*.12)+' '+(x+w)+' '+y;
 for(let k=8;k>=1;k--){let t=k/8;s+='L'+(x+w*t*.6)+' '+(y-h*(1-t)-h*.14)+'l'+w*t*.35+' '+h*.035}
 return path(s+'Z',c,'none');
}
function scenery(){
 const r=seed(141);let a='<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#e8c38d"/><stop offset=".77" stop-color="#cfcbac"/><stop offset="1" stop-color="#889f90"/></linearGradient><pattern id="scratches" width="7" height="5" patternUnits="userSpaceOnUse"><path d="M1 3l1-1m4 2h1" stroke="#273d35" opacity=".16" stroke-width=".9"/></pattern></defs><rect width="1000" height="310" fill="url(#sky)"/>';
 a+=ellipse(420,81,36,36,'#f4d6a0','#c5a778',1)+repeat(3,j=>ellipse(420,81,40+j*4,40+j*4,'none','#c9ae83',.55));
 a+=repeat(22,j=>{let x=r()*1000,y=r()*135;return path('M'+x+' '+y+'q18-3 31 0t29-1','none','#ad9f79',.75)});
 a+=path('M0 140Q73 115 134 143Q212 105 296 138Q371 153 428 123Q483 94 570 118Q664 85 734 105Q795 92 852 112Q919 62 1000 87V310H0Z','#abb6a0','none');
 a+=repeat(110,j=>{const x=j*9+r()*10,y=179+16*Math.sin(x/70);return fir(x,y,19+r()*35,'#8da396')});
 a+=path('M0 174Q140 152 231 185T443 183Q576 156 649 159Q769 163 859 137Q945 115 1000 135V310H0Z','#718d7e','none');
 a+=repeat(64,j=>{const x=j*17+r()*9,y=224+16*Math.sin(x/79);return fir(x,y,31+r()*49,'#617f70')});
 a+=path('M0 203Q123 182 235 223Q348 260 467 218Q579 181 673 196Q838 210 1000 154V310H0Z','#526f61','none');
 a+=path('M319 310Q473 272 560 258T554 235Q536 231 575 220Q593 214 566 212Q623 211 593 222Q569 231 588 234Q662 245 601 260Q541 280 519 310Z','#a5b6a1','none');
 a+=repeat(36,j=>{let x=508+r()*106,y=243+r()*42;return path('M'+x+' '+y+'l'+(5+r()*19)+' -1','none','#c4c6a7',.8)});
 // Low foreground banks and inked conifers frame the opening.
 a+=repeat(25,j=>{let x=j<14?j*11-15:800+(j-14)*19;return fir(x,306+r()*12,81+r()*132,'#3c5e52')});
 a+=path('M0 244Q79 202 146 249T334 284Q435 275 477 310H0Z','#304f45','none');
 a+=path('M0 0H38Q45 47 68 87Q115 71 140 39Q130 67 107 83L158 70Q123 92 73 99Q78 123 102 148Q107 117 130 106Q109 131 111 156Q125 176 148 190Q93 162 74 131Q57 106 45 103Q53 196 83 291L24 310Q23 231 0 187Z','#304638','none');
 a+=repeat(36,j=>{let x=r()*164,y=6+r()*83;return path('M'+x+' '+y+'q-10-12 2-27q7 17-2 27Z','#475a42','none')});
 a+=repeat(110,j=>{let x=r()*1000,y=270+r()*43;return bark('M'+x+' '+y+'l'+(r()*9-4)+' -'+(r()*7+2),'#466759')});
 a+='<rect width="1000" height="310" fill="url(#scratches)"/>';return svg('0 0 1000 310',a,'preserveAspectRatio="xMidYMid slice"');
}
function fur(d,g,w=1.2){return path(d,'none',g,w)}
function garment(type){
 const main=['#617667','#7d6953','#536b73'][type],shadow=['#354f48','#574f42','#3b5158'][type];
 const cloak='M90 148Q71 150 59 164Q45 183 35 223L24 263H233L221 204Q214 164 171 148Z';
 let a=path(cloak,main)+path(cloak,'url(#cloth)','none')+path('M85 162Q73 192 65 247M83 177Q77 208 77 230M190 175Q205 194 210 227M181 189Q196 204 202 235','none',shadow,3);
 a+=path('M88 143Q116 160 157 141L179 151Q167 166 134 174Q103 174 79 157Z',shadow)+path('M78 156Q105 166 125 165Q157 161 174 150L174 160Q149 179 119 179Q96 177 78 165Z','#bb975d');
 a+=path('M68 168Q126 187 204 234L200 246Q137 203 63 180Z','#836043')+fur('M70 172Q148 198 199 237','#c49a66');
 a+=path('M119 191l11-12 15 9-11 12Z','#c4a368')+path('m125 190 6-7 8 5-7 7Z',shadow);
 return a;
}
function fox(){
 let a=path('M83 117Q57 91 58 32Q89 45 105 70Q119 62 143 64Q157 43 189 22Q195 60 182 94Q196 110 190 130L200 139L177 140L185 148L157 151Q142 165 125 166Q91 152 79 136L62 138L70 126L55 123Z','#c5804c');
 a+=path('M66 43Q89 59 95 75L75 92Q66 73 66 43ZM151 71Q164 51 183 36Q185 59 175 85Z','#5b493c');
 a+=path('M73 54Q80 63 87 73L79 81ZM162 70 178 46 174 74Z','#d8a881','none');
 a+=path('M68 110Q81 104 101 115Q117 126 130 137Q147 124 152 110Q173 99 188 106L182 117L193 119L180 126L190 128Q171 137 159 146Q143 158 126 158Q106 151 96 141L77 129L84 126L66 122L77 117Z','#e9cf9e','none');
 a+=path('M89 99Q100 87 114 103Q105 110 91 102ZM143 99Q157 84 172 90Q160 102 146 104Z','#293932')+ellipse(103,100,2.6,2.6,'#e1c782')+ellipse(156,96,2.5,2.7,'#e4cc90');
 a+=path('M117 132Q129 127 141 131Q138 139 130 141Q123 140 117 132Z','#313b33')+fur('M130 140l-1 6q-6 4-12-1m12 1q8 3 15-3','#605444',1.4);
 a+=fur('M87 90q14-9 26-1m32-3q11-10 24-8M85 118l-18-4m22 8-24-1m30 5-22 4m83-12 24-8m-22 13 28-6m-26 10 23-2','#675541');
 a+=fur('M110 76l5 10m3-14 5 12m5-13 2 12m6-13-2 12m-10 22 3 11m6-15-1 9m-48 25 9 7m66-9-8 7','#8d5639',1.4);
 return a;
}
function hare(){
 let a=path('M94 82Q68 51 73 6Q88-1 100 25Q113 51 113 79ZM129 79Q129 48 153 10Q165-1 170 10Q171 45 147 84Z','#bbac88');
 a+=path('M103 70Q84 50 79 14Q97 20 105 70ZM136 73Q141 38 162 13Q160 44 145 70Z','#bd9079','none');
 a+=path('M96 72Q121 55 148 71Q173 84 168 106Q171 120 178 129L171 137Q164 144 150 144Q145 161 126 163Q108 163 98 149L78 147L85 141L73 141Q78 128 82 113Q76 93 96 72Z','#b7a685');
 a+=path('M104 119Q123 112 133 123Q145 112 157 118Q176 129 158 142Q146 143 143 154Q124 168 107 150Q93 133 104 119Z','#e6d0aa','none');
 a+=path('M91 101Q99 91 109 99Q103 109 94 106ZM140 100Q147 88 155 95Q155 104 144 106Z','#303a34')+ellipse(102,100,2,2,'#e6d5a4')+ellipse(149,98,2,2,'#e6d5a4');
 a+=path('M124 122Q132 118 139 122L132 130Z','#715443')+fur('M132 130v5q-6 7-13 1m13-1q7 6 13-1M101 127l-29-5m28 10-33 1m34 5-24 5m76-16 28-7m-27 11 31-3m-31 8 23 1','#796851');
 a+=fur('M87 90l9-6m12-5 4 6m5-10 3 7m6-8 1 7m13-2-2 5m-39 27-6 4m4 1-6 4m63-10 5 3','#80765d');
 return a;
}
function owl(){
 let a=path('M72 61L88 73Q123 55 156 70L180 54Q178 79 185 94Q193 128 166 150Q141 171 116 161Q88 155 75 135Q60 112 71 86Z','#a59373');
 a+=path('M75 89Q92 72 114 85L128 99Q147 74 171 79Q187 90 177 116Q164 140 131 147Q101 143 80 122Q65 105 75 89Z','#e2cda4');
 [[99,103],[154,99]].forEach(([x,y])=>{a+=ellipse(x,y,19,19,'#c7b389','#826f52',1.4)+ellipse(x,y,11,12,'#bb9152')+ellipse(x,y,6,8,ink)+ellipse(x-2,y-3,2,2,'#f7e9be')});
 a+=path('M74 75Q104 77 126 96Q148 72 177 68L172 79Q143 83 127 105Q106 87 83 84Z','#6e624c')+path('M117 112Q123 103 134 107L127 128Q123 124 117 112Z','#9f7845');
 a+=fur('M83 121q6 12 15 13m-8-7q5 9 12 10m60-16q-4 9-12 12m16-8q-2 6-7 9M102 145l5 6 4-3m5 4 6 5 4-4m6-4 5 3 5-6m-37-72 5 5 4-4m5-3 5 7 5-6m5-2 5 4 4-4','#7c6f56',1.5);return a;
}
function guest(i){
 let a=defs+garment(i)+[fox,hare,owl][i]();
 // Laced collar and a botanical brooch on the traveling cloak.
 a+=path('M82 147Q101 157 120 160L111 174Q90 168 79 158Z','#40574b')+path('M120 160Q150 151 165 143L172 151Q153 165 131 175Z','#637763')+ellipse(121,168,7,8,'#cfab69',ink,2)+fur('M120 173l2-10m-2 6-3-3m4 1 3-3','#665434');
 if(i===0)a+='<g transform="translate(45 153) rotate(-22) scale(.68)">'+sprig()+'</g>';
 if(i===1)a+=path('m156 193 30 8-7 25-32-8Z','#d5c6a0')+fur('m157 195 11 14 16-6','#8a7452');
 if(i===2)a+=path('m150 205 19-33 8 4-19 33Z','#cdba92')+fur('m168 178 7 4m-8-1 6 4','#8a785a');
 return svg('18 0 221 237',a);
}
function seal(){
return svg('0 0 60 68',path('M30 3Q43 3 53 12L52 39Q49 55 30 64Q10 54 8 39L7 12Q16 4 30 3Z','none',gold,1.6)+path('M24 16h12m-10 3h8v10l10 14q2 7-7 8H22q-8-1-5-8l9-14Z','none',gold,1.8)+path('M19 41q7-5 13-1t10 0M27 46q3-6 9-5q-3 6-9 5Z','none',gold,1.5)+ellipse(30,10,2,2,gold));
}
return {guest,scenery,bottle,ingredient,seal};
})();
