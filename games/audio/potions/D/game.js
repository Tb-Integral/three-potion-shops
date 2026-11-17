'use strict';
(() => {
 const $ = id => document.getElementById(id);
 const audio = createGameAudio('old-willow-potions.audio.v1');
 // Delay, length, waveform, initial pitch, final pitch and peak gain.
 const buySound = [[0,.085,'triangle',1050,780,.12],[.036,.10,'sine',1510,1460,.068]];
 const brewSound = [[0,.11,'sine',170,355,.18],[.084,.12,'sine',225,495,.16],[.19,.15,'sine',295,660,.14]];
 const saleSound = [[0,.15,'triangle',659,650,.12],[.09,.23,'sine',988,982,.13]];
 const daySound = [[0,.21,'sine',392,396,.15],[.145,.28,'triangle',523,523,.105]];
 const endSound = [[0,.24,'triangle',392,392,.10],[.14,.22,'sine',494,494,.13],[.28,.34,'sine',587,587,.13],[.28,.34,'triangle',294,294,.065]];
 const herbs = ['Шалфей','Смола','Соль'];
 const potions = [
  {name:'Лесная роса',mix:[2,1,0],base:12},
  {name:'Живой уголёк',mix:[1,2,0],base:15},
  {name:'Лунный сон',mix:[0,1,2],base:17}
 ];
 const buyers=['Лис-травник','Заяц-почтальон','Сова-звездочёт'];
 const requests=[
  ['Для увядших трав нужна','От ночной стужи спасёт','До восхода уснуть поможет'],
  ['Цветам в сумке нужна','В дальний путь возьму','После дороги нужен'],
  ['Для сада звёзд нужна','Согреть обсерваторию поможет','До сумерек мне нужен']
 ];
 const days=[
  {name:'Медовое утро',cost:[2,3,3],stock:[5,6,4],guests:[[0,0,0],[1,1,0],[2,2,0]]},
  {name:'Серебряный туман',cost:[3,2,2],stock:[4,5,5],guests:[[2,2,2],[0,0,1],[1,2,1]]},
  {name:'Ветер с холмов',cost:[2,4,3],stock:[6,4,3],guests:[[1,1,3],[0,0,2],[2,1,2]]},
  {name:'Янтарный дождь',cost:[3,2,4],stock:[5,6,4],guests:[[2,0,2],[1,2,3],[0,1,2]]},
  {name:'Ночь ярмарки',cost:[4,3,3],stock:[4,6,5],guests:[[1,1,4],[2,2,4],[0,0,3]]}
 ];
 const target=95,capital=18,key='old-willow-potions.shop.v1';
 const zeros=()=>[0,0,0];
 const fresh=()=>({v:1,day:0,pos:0,cash:capital,herbs:[1,1,0],potions:zeros(),market:days[0].stock.slice(),selected:0,spent:0,revenue:0,brewed:zeros(),sold:zeros(),missed:0,finished:false});
 const sum=xs=>xs.reduce((a,b)=>a+b,0);
 const integer=(n,max=5000)=>Number.isInteger(n)&&n>=0&&n<=max;
 const triple=xs=>Array.isArray(xs)&&xs.length===3&&xs.every(n=>integer(n));
 function valid(s){
  if(!s||s.v!==1||!integer(s.day,4)||!integer(s.pos,3)||!integer(s.selected,2)||typeof s.finished!=='boolean')return false;
  if(![s.herbs,s.potions,s.market,s.brewed,s.sold].every(triple)||![s.cash,s.spent,s.revenue,s.missed].every(n=>integer(n)))return false;
  if(s.finished&&(s.day!==4||s.pos!==3))return false;
  return s.cash===capital+s.revenue-s.spent&&sum(s.sold)+s.missed===s.day*3+s.pos&&
   s.sold.every((n,i)=>n+s.potions[i]===s.brewed[i])&&s.market.every((n,i)=>n<=days[s.day].stock[i]);
 }
 let storeAvailable=true;
 function load(){
  try{const raw=localStorage.getItem(key);if(raw){const saved=JSON.parse(raw);if(valid(saved))return saved}}
  catch(e){if(!(e instanceof SyntaxError))storeAvailable=false}
  return fresh();
 }
 let state=load(),msg='',lastPortrait='',lastFocus=null;
 const today=()=>days[state.day],guest=()=>today().guests[state.pos];
 const price=()=>guest()?potions[guest()[1]].base+guest()[2]:0;
 const count=(n,a,b,c)=>n+' '+(n%10===1&&n%100!==11?a:n%10>=2&&n%10<=4&&(n%100<12||n%100>14)?b:c);
 const coins=n=>count(n,'монета','монеты','монет');
 const missing=(mix,i)=>Math.max(0,mix[i]-state.herbs[i]);
 const fmtMix=mix=>mix.map((n,i)=>n?herbs[i].toLowerCase()+' × '+n:'').filter(Boolean).join(' + ');
 function save(){try{localStorage.setItem(key,JSON.stringify(state));storeAvailable=true}catch{storeAvailable=false}}
 function update(note){msg=note;save();render();announce(note)}
 function announce(note){
  $('live').textContent=note;
  $('tip').classList.remove('flash');void $('tip').offsetWidth;$('tip').classList.add('flash');
 }
 function availability(btn,reason,desc){
  btn.setAttribute('aria-disabled',String(Boolean(reason)));btn.title=reason||desc||'';
 }
 function prepare(){
  $('seal').innerHTML=Art.seal();$('scenery').innerHTML=Art.scenery();
  $('bottles').innerHTML=potions.map((p,i)=>'<button class="flask" data-flask="'+i+'" type="button">'+Art.bottle(i)+'<span class="name">'+p.name+'</span><span class="stock"></span></button>').join('');
  $('goods').innerHTML=herbs.map((h,i)=>'<div class="good"><div class="icon">'+Art.ingredient(i)+'</div><div class="goodName"><b>'+h+'</b><small></small></div><button class="buy" data-buy="'+i+'"></button></div>').join('');
  $('bottles').addEventListener('click',e=>{const btn=e.target.closest('[data-flask]');if(!btn||state.finished)return;state.selected=Number(btn.dataset.flask);msg='';save();render();announce('Выбран рецепт «'+potions[state.selected].name+'». '+$('brewWhy').textContent)});
  $('goods').addEventListener('click',e=>{const btn=e.target.closest('[data-buy]');if(btn)buy(Number(btn.dataset.buy))});
  $('brew').onclick=brew;$('sell').onclick=sell;$('skip').onclick=skip;$('closeDay').onclick=confirmDay;
  $('help').onclick=()=>dialog('help');
  $('dialog').addEventListener('click',e=>{if(e.target===$('dialog')){const b=$('dialog').getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)$('dialog').close()}});
  $('dialog').addEventListener('close',()=>{if(lastFocus&&lastFocus.isConnected&&lastFocus.offsetWidth)lastFocus.focus({preventScroll:true})});
 }
 function buyReason(i){if(!state.market[i])return 'Сегодня раскуплено';if(state.cash<today().cost[i])return 'Не хватает монет';return ''}
 function brewReason(){
  const mix=potions[state.selected].mix,need=mix.map((_,i)=>missing(mix,i));
  return sum(need)?'Не хватает: '+fmtMix(need)+'.':'';
 }
 function tip(){
  if(msg)return msg;
  if(state.day===0&&state.pos===0&&!state.spent&&!sum(state.brewed))
   return 'Соберите 95 монет за пять дней. Для первого заказа купите ещё один шалфей.';
  if(!guest())return 'Все посетители ушли. Можно пополнить запасы и закрыть день.';
  const id=guest()[1];
  if(state.potions[id])return 'Заказ готов. Отдайте зелье посетителю.';
  if(state.selected!==id)return 'Выберите в книге рецепт «'+potions[id].name+'».';
  if(brewReason())return 'Купите недостающее в корзине травницы, затем сварите зелье.';
  return 'Ингредиенты собраны. Сварите зелье и отдайте заказ.';
 }
 function render(){
  $('day').textContent='День '+(state.day+1)+'/5';$('ticks').innerHTML=days.map((d,i)=>'<i class="'+(i<=state.day?'on':'')+'"></i>').join('');
  $('cash').textContent=state.cash;$('shop').hidden=state.finished;$('ending').hidden=!state.finished;
  if(state.finished){renderEnd();return}
  const order=guest(),portraitKey=order?state.day+'-'+state.pos:'closed';
  if(lastPortrait!==portraitKey){
   $('portrait').innerHTML=order?Art.guest(order[0]):'';$('portrait').classList.remove('change');
   if(lastPortrait){void $('portrait').offsetWidth;$('portrait').classList.add('change')}
   lastPortrait=portraitKey;
  }
  $('scenery').dataset.day=state.day;
  $('time').textContent=today().name;
  $('queue').textContent=order?'Посетитель '+(state.pos+1)+' из 3':'До завтра';
  $('guest').textContent=order?buyers[order[0]]:'У тропы тихо';
  $('quote').innerHTML=order?requests[order[0]][order[1]]+' <b>«'+potions[order[1]].name+'».</b>':'Сегодня все трое побывали у прилавка.';
  $('sell').hidden=!order;$('skip').hidden=!order;
  const saleReason=order&&!state.potions[order[1]]?'Нет готового зелья':'';
  $('sellWhy').textContent=saleReason;
  if(order){$('sell').textContent='Продать · '+price()+' ◉';$('sell').setAttribute('aria-label','Продать '+potions[order[1]].name+' за '+coins(price()));availability($('sell'),saleReason);$('skip').textContent='Отпустить без покупки →'}
  $('tip').textContent=tip();
  const p=potions[state.selected];
  document.querySelectorAll('.flask').forEach((b,i)=>{b.setAttribute('aria-pressed',String(i===state.selected));b.querySelector('.stock').textContent='В запасе: '+state.potions[i]});
  $('selectedName').textContent='На один флакон';$('mix').textContent=fmtMix(p.mix);
  const why=brewReason(),currentCost=sum(p.mix.map((n,i)=>n*today().cost[i]));
  $('brewWhy').textContent=(why?why+' ':'')+'Цена ингредиентов сегодня — '+coins(currentCost)+'.';
  $('brew').setAttribute('aria-label','Сварить «'+p.name+'»');availability($('brew'),why);
  document.querySelectorAll('.good').forEach((row,i)=>{
   const cost=today().cost[i],reason=buyReason(i),b=row.querySelector('button');
   row.querySelector('small').textContent='У вас '+state.herbs[i]+' · В корзине '+state.market[i];b.textContent='Купить · '+cost+' ◉';
   if(reason)b.textContent=!state.market[i]?'Раскуплено':'Мало монет';
   b.setAttribute('aria-label','Купить '+herbs[i]+' за '+coins(cost)+(reason?'. '+reason:''));availability(b,reason);
   if(reason)row.querySelector('small').textContent+=' · '+cost+' ◉';
  });
  $('goal').textContent='На крышу лавки нужно '+target+' монет';$('closeDay').textContent=state.day===4?'Подвести итог →':'Закрыть день →';
 }
 function buy(i){
  if(state.finished)return;
  const why=buyReason(i);if(why){msg=why+'.';render();announce(msg);return}
  const cost=today().cost[i];state.cash-=cost;state.spent+=cost;state.herbs[i]++;state.market[i]--;
  audio.play(buySound, 1, true);
  update(herbs[i]+' в запасах. −'+coins(cost)+'. '+(brewReason()?'':'Можно варить выбранное зелье.'));
 }
 function brew(){
  if(state.finished)return;
  const why=brewReason();if(why){msg=why;render();announce(msg);return}
  const i=state.selected;potions[i].mix.forEach((n,j)=>state.herbs[j]-=n);state.potions[i]++;state.brewed[i]++;
  audio.play(brewSound, 1, true);
  update('Готово зелье «'+potions[i].name+'». '+(guest()&&guest()[1]===i?'Можно отдавать заказ.':'Флакон ждёт в запасе.'));
 }
 function sell(){
  const order=guest();if(state.finished||!order)return;
  const i=order[1],income=price();if(!state.potions[i]){msg='Сначала сварите «'+potions[i].name+'».';render();announce(msg);return}
  state.potions[i]--;state.sold[i]++;state.cash+=income;state.revenue+=income;state.pos++;
  audio.play(saleSound, 1, true);
  update('«'+potions[i].name+'» продано. +'+coins(income)+'. '+(guest()?'К прилавку подошёл новый посетитель.':'На сегодня заказов больше нет.'));
  if(!guest())$('closeDay').focus({preventScroll:true});
 }
 function skip(){
  if(state.finished||!guest())return;
  const name=buyers[guest()[0]];state.pos++;state.missed++;update(name+' ушёл без покупки. '+(guest()?'Следующий заказ уже на прилавке.':'Тропа опустела.'));
  if(!guest())$('closeDay').focus({preventScroll:true});
 }
 function confirmDay(){if(state.finished)return;if(guest())dialog('day');else nextDay()}
 function nextDay(){
  if(state.finished)return;
  state.missed+=3-state.pos;state.pos=3;
  if(state.day===4){state.finished=true;audio.play(endSound, 1, true);update('Пять дней завершены. В кошельке '+coins(state.cash)+'.');$('endTitle').focus();return}
  state.day++;state.pos=0;state.market=today().stock.slice();
  audio.play(daySound, 1, true);
  update('Новый день. В корзине свежие ингредиенты, у прилавка первый гость.');
  $('sell').focus({preventScroll:true});window.scrollTo(0,0);
 }
 function renderEnd(){
  const met=state.cash>=target,qty=sum(state.sold);
  const lines=[['В начале',coins(capital)],['Траты на ингредиенты','−'+coins(state.spent)],['Выручка','+'+coins(state.revenue)],['В кошельке',coins(state.cash)],['Продано / сварено',qty+' / '+sum(state.brewed)],['Ушли без покупки',count(state.missed,'посетитель','посетителя','посетителей')]];
  $('ending').innerHTML='<div class="endArt">'+Art.bottle(state.sold.indexOf(Math.max(...state.sold)))+'</div><span class="eyebrow">ПЯТЬ ДНЕЙ У СТАРОЙ ИВЫ</span><h2 id="endTitle" tabindex="-1">'+(met?'У лавки будет новая крыша':'Ярмарка закончилась')+'</h2><p class="profit">'+(met?'Собрано '+coins(state.cash)+' из нужных '+target+'.':'До ремонта не хватило '+coins(target-state.cash)+'.')+'</p><ul class="receipt">'+lines.map(([a,b])=>'<li><span>'+a+'</span><b>'+b+'</b></li>').join('')+'</ul><button class="primary" id="newGame">Начать новую партию</button>';
  $('newGame').onclick=restart;
 }
 function restart(){
  audio.stop();
  state=fresh();msg='';lastPortrait='';save();render();$('help').focus({preventScroll:true});window.scrollTo(0,0);announce('Открылась новая лавка. День первый.');
 }
 function dialog(type){
  const el=$('dialog');if(!el.open)lastFocus=document.activeElement;
  const help=type==='help',day=type==='day';
  let title,body,actions;
  if(help){
   title='Книга лавки';body='<p>До конца пятого дня соберите <b>'+target+' монет</b> на новую крышу. В начале у вас 18 монет, шалфей и смола.</p><ol><li>Прочитайте заказ посетителя и выберите его зелье в книге рецептов.</li><li>Купите недостающие ингредиенты у травницы. Кнопка покупки даёт одну штуку.</li><li>Сварите флакон и продайте его у прилавка.</li></ol><p>Каждый день приходят трое. Можно отпустить гостя или закрыть лавку раньше. Запасы переходят на следующий день. Цены и остаток в корзине меняются утром.</p><p>В итог идут монеты в кошельке. '+(storeAvailable?'Партия сохраняется автоматически.':'Сейчас прогресс хранится только до закрытия страницы.')+'</p>';
   actions='<button class="primary" data-act="back">Вернуться</button>'+(state.finished?'':'<button class="subtle" data-act="reset">Новая партия</button>');
  }else if(day){
   title=state.day===4?'Завершить ярмарку?':'Закрыть лавку?';body='<p>Без покупки '+(state.pos===2?'уйдёт ':'уйдут ')+count(3-state.pos,'гость','гостя','гостей')+'. '+(state.day===4?'После закрытия подведём итог пяти дней.':'Монеты, ингредиенты и готовые зелья останутся у вас.')+'</p>';
   actions='<button class="primary" data-act="back">Остаться</button><button class="subtle" data-act="advance">Закрыть лавку</button>';
  }else{
   title='Начать сначала?';body='<p>Текущая партия закончится. Лавка откроется заново с 18 монетами.</p>';
   actions='<button class="primary" data-act="back">Продолжить партию</button><button class="subtle" data-act="restart">Начать заново</button>';
  }
  $('modal').innerHTML='<span class="eyebrow">У СТАРОЙ ИВЫ</span><h2 id="modalTitle">'+title+'</h2>'+body+'<div class="actions">'+actions+'</div>';
  el.setAttribute('aria-labelledby','modalTitle');if(!el.open)el.showModal();
  $('modal').querySelector('button').focus({preventScroll:true});
  $('modal').onclick=e=>{const action=e.target.dataset.act;if(!action)return;if(action==='reset'){dialog('reset');return}el.close();if(action==='advance'){lastFocus=null;nextDay()}if(action==='restart'){lastFocus=null;restart()}};
 }
 prepare();render();
})();
