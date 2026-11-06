(() => {
 'use strict';
 const KEY = 'moon-apothecary-v1';
 const INGREDIENTS = [
  {name:'Мята',icon:'mint',price:3},
  {name:'Янтарь',icon:'amber',price:4},
  {name:'Лунник',icon:'moonflower',price:6}
 ];
 const POTIONS = [
  {name:'Бодрость',color:'#b97383',recipe:[2,1,0],price:17,flavor:['После леса ноги гудят. Есть что-нибудь бодрящее?','До рассвета ещё печь пироги. Нужна капелька сил.','Сегодня несу почту на дальний холм. Поможете?']},
  {name:'Тихий сон',color:'#8097ba',recipe:[1,0,1],price:16,flavor:['Звёзды считаю, а заснуть не получается.','Пусть мне приснится море. Только без штормов.','Соседский петух перепутал ночь и утро.']},
  {name:'Лунный свет',color:'#cfaa63',recipe:[0,1,1],price:18,flavor:['На тропинке темно. Понадобится свет в бутылочке.','Хочу подарить дочке маленькую луну.','Ищу кота в саду. Он опять притворяется тенью.']}
 ];
 const DAYS = [
  {orders:[0,1,0,2],bonus:-1,title:'Первая искра',note:'Сегодня заглянут 4 соседа.'},
  {orders:[1,2,1,0,1],bonus:1,title:'Сонные травы',note:'Тихий сон сегодня дороже на 3 монеты.'},
  {orders:[0,0,2,1,0],bonus:0,title:'Долгая дорога',note:'Бодрость сегодня дороже на 3 монеты.'},
  {orders:[2,1,2,0,2,1],bonus:2,title:'Ночь светлячков',note:'Лунный свет сегодня дороже на 3 монеты.'},
  {orders:[2,0,1,2,0,2],bonus:2,title:'Праздник полной луны',note:'Лунный свет сегодня дороже на 3 монеты.'}
 ];
 const NAMES = ['Мира, почтальон','Тихон, садовник','Нора, пекарь','Лис, путешественник','Ася, смотритель маяка','Лев, книжник','Тея, собирательница','Финн, музыкант'];
 const $ = id => document.getElementById(id);
 let state, storageHealthy = true, toastTimer, tab = 'brew';
 const blankDay = () => ({sold:[0,0,0],revenue:0,spent:0,skipped:0,brewed:0});
 const initial = () => ({version:1,day:1,money:50,ingredients:[0,0,0],potions:[0,0,0],heat:4,cursor:0,phase:'day',selected:0,tutorial:0,tutorialHidden:false,days:Array.from({length:5},blankDay)});
 const integer = (n,min,max) => Number.isInteger(n) && n>=min && n<=max;
 const array3 = (a,max) => Array.isArray(a) && a.length===3 && a.every(n=>integer(n,0,max));
 function valid(s) {
  if(!s || s.version!==1 || !integer(s.day,1,5) || !integer(s.money,0,10000) || !array3(s.ingredients,10000) || !array3(s.potions,20) || !integer(s.heat,0,4) || !integer(s.cursor,0,DAYS[s.day-1].orders.length) || !['day','summary','finished'].includes(s.phase) || !integer(s.selected,0,2) || !integer(s.tutorial,0,3) || typeof s.tutorialHidden!=='boolean' || !Array.isArray(s.days) || s.days.length!==5) return false;
  if(s.phase==='finished' && s.day!==5) return false;
  for(let i=0;i<5;i++) {
   const d=s.days[i];
   if(!d || !array3(d.sold,6) || !integer(d.revenue,0,200) || !integer(d.spent,0,10000) || !integer(d.skipped,0,6) || !integer(d.brewed,0,4)) return false;
   const total=d.sold.reduce((a,b)=>a+b,0)+d.skipped;
   if(total>DAYS[i].orders.length || (i<s.day-1 && total!==DAYS[i].orders.length) || (i===s.day-1 && total!==s.cursor) || (i>s.day-1 && (total || d.revenue || d.spent || d.brewed))) return false;
   if(d.revenue!==d.sold.reduce((sum,count,p)=>sum+count*(POTIONS[p].price+(DAYS[i].bonus===p?3:0)),0)) return false;
  }
  if(s.phase!=='day' && s.cursor!==DAYS[s.day-1].orders.length) return false;
  if(s.heat!==4-s.days[s.day-1].brewed) return false;
  const revenue=s.days.reduce((n,d)=>n+d.revenue,0),spent=s.days.reduce((n,d)=>n+d.spent,0);
  const brewed=s.days.reduce((n,d)=>n+d.brewed,0),sold=s.days.reduce((n,d)=>n+d.sold.reduce((a,b)=>a+b,0),0);
  return s.money===50+revenue-spent && s.potions.reduce((a,b)=>a+b,0)===brewed-sold;
 }
 function load() {
  try {
   const raw=localStorage.getItem(KEY);
   if(!raw) return initial();
   const parsed=JSON.parse(raw);
   if(!valid(parsed)) throw new Error('invalid');
   return parsed;
  } catch(e) {
   if(e instanceof SyntaxError || e.message==='invalid') {
    $('storage-warning').textContent='Старое сохранение повреждено. Открыли новую лавку — можно играть.';
   } else {
    storageHealthy=false;
    $('storage-warning').textContent='Сохранение недоступно. Лавка работает, но после закрытия страницы прогресс может потеряться.';
   }
   $('storage-warning').hidden=false;
   return initial();
  }
 }
 function save() {
  try { localStorage.setItem(KEY,JSON.stringify(state)); storageHealthy=true; }
  catch(e) { storageHealthy=false; $('storage-warning').hidden=false; $('storage-warning').textContent='Не удалось сохранить. Можно продолжать играть, но не закрывайте страницу, если хотите закончить партию.'; }
  $('save-status').textContent=storageHealthy?'Лавка сохранена · играйте в своём темпе':'Прогресс только в этой открытой вкладке';
 }
 const dayData = () => DAYS[state.day-1];
 const current = () => dayData().orders[state.cursor];
 const active = () => state.phase==='day';
 const price = p => POTIONS[p].price+(dayData().bonus===p?3:0);
 const cost = p => POTIONS[p].recipe.reduce((sum,n,i)=>sum+n*INGREDIENTS[i].price,0);
 function brewReason(p) {
  if(!active()) return state.phase==='finished'?'Партия завершена.':'Лавка закрыта. Начните следующий день.';
  if(state.heat===0) return 'Огонь погас: новые 4 варки будут завтра.';
  const missing=POTIONS[p].recipe.map((n,i)=>n>state.ingredients[i]?`${INGREDIENTS[i].name.toLowerCase()} ×${n-state.ingredients[i]}`:null).filter(Boolean);
  return missing.length?'Не хватает: '+missing.join(', ')+'.':'Всё готово. Одна варка займёт 1 огонь.';
 }
 const canBrew = p => active() && state.heat>0 && POTIONS[p].recipe.every((n,i)=>state.ingredients[i]>=n);
 function tell(message) { clearTimeout(toastTimer); $('toast').textContent=message; $('toast').classList.add('show'); toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2600); }
 function bottle(p,cls='') { return `<svg class="${cls}" viewBox="0 0 64 80" aria-hidden="true" style="color:${POTIONS[p].color}"><use href="#bottle"/></svg>`; }
 function portrait(index) {
  const colors=['#a96558','#688f85','#a58a59','#7d809e','#818e56','#ac7864','#8f7290','#708ca0'];
  const hair=['#523d31','#c6b698','#694a38','#3a4235','#533e3f','#95816a','#493e35','#b59665'];
  const c=colors[index%8],h=hair[index%8];
  return `<svg viewBox="0 0 210 270"><path d="M33 260q2-83 71-90 72 8 76 90" fill="${c}" stroke="#243b33" stroke-width="3"/><path d="m76 176 28 29 30-29-7 57H83Z" fill="#e3d2aa"/><path d="m61 193 43 57 45-57-13 76H72Z" fill="${c}"/><path d="M73 182q-21-21-18-73 0-59 48-64 56 2 57 60 7 55-24 78Z" fill="${h}"/><path d="M91 149h28v37q-14 16-28 0Z" fill="#d5a57e"/><ellipse cx="65" cy="126" rx="10" ry="14" fill="#deb58d"/><ellipse cx="142" cy="126" rx="10" ry="14" fill="#deb58d"/><path d="M67 100q1-43 37-43 38 0 38 43v34q-5 39-37 41-34-3-38-41Z" fill="#e5bd94"/><path d="M64 113q-3-65 42-62 47 0 40 63-29-10-41-34-7 29-41 33Z" fill="${h}"/><path d="M78 119q8-4 15 0m22 0q8-4 14 0" fill="none" stroke="#6d5540" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="86" cy="127" rx="2.5" ry="3.5" fill="#36423a"/><ellipse cx="121" cy="127" rx="2.5" ry="3.5" fill="#36423a"/><path d="m104 128-4 12 6 1" fill="none" stroke="#be8d68" stroke-width="2" stroke-linecap="round"/><path d="M95 151q10 7 20-1" fill="none" stroke="#875b4c" stroke-width="2" stroke-linecap="round"/><ellipse cx="80" cy="141" rx="8" ry="4" fill="#dba08b" opacity=".6"/><ellipse cx="128" cy="141" rx="8" ry="4" fill="#dba08b" opacity=".6"/><path d="m54 194-12 53m113-53 12 53" stroke="#344b3e" stroke-opacity=".45" stroke-width="3"/><circle cx="104" cy="218" r="4" fill="#e4c588"/><path d="M37 257q5-13 24-9l21 9m49 0 20-9q19-4 24 9" fill="#e5bd94" stroke="#c19571" stroke-width="2"/>${index%3===0?'<path d="M57 89q13-42 48-45 44 8 49 45Z" fill="#547569"/><path d="M48 88q53-17 114 0" fill="none" stroke="#bbc293" stroke-width="8"/>':''}${index%3===1?'<g fill="none" stroke="#7e6c48" stroke-width="2"><circle cx="85" cy="128" r="12"/><circle cx="122" cy="128" r="12"/><path d="M97 127h13"/></g>':''}</svg>`;
 }
 function render() {
  const finished=state.phase==='finished', summary=state.phase==='summary',p=current();
  document.body.classList.toggle('finished',finished);
  document.body.classList.toggle('closing',summary);
  $('day-label').textContent=finished?'Пять дней позади':`День ${state.day} / 5`;
  $('day-dots').innerHTML=DAYS.map((_,i)=>`<i class="${i<state.day-1?'past':i===state.day-1?'current':''}"></i>`).join('');
  $('money').textContent=state.money; $('heat').textContent=state.heat;
  $('guide').hidden=state.tutorialHidden||finished||summary;
  const guides=[
   '<b>1. Закупитесь.</b> Для первого зелья купите 2 мяты и 1 янтарь. Начинаем с 50 монет.',
   '<b>2. Зажгите котёл.</b> Выберите «Бодрость» и сварите зелье. В день хватит огня на 4 варки.',
   '<b>3. Угостите посетителя.</b> Продайте нужное зелье у прилавка. Следующий гость уже ждёт!',
   '<b>Ваша цель — пять удачных дней.</b> Учитывайте заказы, берегите монеты. Запасы остаются на завтра.'
  ];
  $('guide-text').innerHTML=guides[state.tutorial];
  $('visitor-zone').hidden=!active(); $('day-summary').hidden=!summary;
  $('day-strip').hidden=finished||summary; $('workbench').hidden=finished;
  document.querySelector('.tool-tabs').hidden=finished;
  $('final-results').hidden=!finished;
  if(active()) {
   const noVisitor=p===undefined;
   $('visitor-label').textContent=noVisitor?'Все гости разошлись':`Посетитель ${state.cursor+1} из ${dayData().orders.length}`;
   $('visitor-name').textContent=noVisitor?'Тихий вечер':NAMES[(state.day*2+state.cursor-2)%NAMES.length];
   $('visitor-line').textContent=noVisitor?'Можно сварить запас на завтра или закрыть лавку.':POTIONS[p].flavor[(state.day+state.cursor)%3];
   document.querySelector('.order-wish').hidden=noVisitor;
   $('customer-art').style.opacity=noVisitor?'0':'1';
   if(!noVisitor) {
    $('customer-art').innerHTML=portrait((state.day*2+state.cursor-2)%NAMES.length);
    $('order-name').textContent=POTIONS[p].name; $('offer').textContent=`+${price(p)} ◈`;
    document.querySelector('.order-bottle').style.color=POTIONS[p].color;
   }
   $('sell').disabled=noVisitor||state.potions[p]===0;
   $('sell').textContent=noVisitor?'Все обслужены':'Продать';
   $('skip').disabled=noVisitor;
   $('sale-reason').textContent=noVisitor?'До завтра новых гостей не будет.':state.potions[p]===0?'Сначала сварите это зелье.':`Готово в запасе: ${state.potions[p]}. Можно продавать.`;
   const remaining=dayData().orders.slice(state.cursor).reduce((a,v)=>(a[v]++,a),[0,0,0]);
   $('demand').innerHTML=`Осталось гостей: <b>${remaining.reduce((a,b)=>a+b,0)}</b>${dayData().bonus>=0?` · <span class="demand-bonus">${POTIONS[dayData().bonus].name} +3 ◈</span>`:' · Первый день'} `;
   $('end-day').innerHTML=`${state.day===5?'Завершить партию':'Закрыть лавку'} <span aria-hidden="true">→</span>`;
  }
  $('recipe-choices').innerHTML=POTIONS.map((v,i)=>`<button class="recipe-choice ${state.selected===i?'selected':''}" data-recipe="${i}" aria-pressed="${state.selected===i}" ${!active()?'disabled':''} aria-label="${v.name}. Готово: ${state.potions[i]}. Выбрать рецепт">${bottle(i)}<span><strong>${v.name}</strong><small>Готово: ${state.potions[i]} · ${price(i)} ◈</small></span>${state.selected===i?'<i class="recipe-dot" aria-hidden="true"></i>':''}</button>`).join('');
  $('recipe-ingredients').textContent=POTIONS[state.selected].recipe.map((n,i)=>n?`${INGREDIENTS[i].name} ×${n}`:null).filter(Boolean).join(' + ');
  $('recipe-price').textContent=`Себестоимость ${cost(state.selected)} ◈ · Продажа ${price(state.selected)} ◈`;
  $('brew').disabled=!canBrew(state.selected);
  $('brew-reason').textContent=brewReason(state.selected);
  $('brew-liquid').setAttribute('fill',POTIONS[state.selected].color);
  $('ingredients').innerHTML=INGREDIENTS.map((v,i)=>`<div class="ingredient"><svg class="ingredient-art" viewBox="0 0 64 64" aria-hidden="true"><use href="#${v.icon}"/></svg><span class="ingredient-title">${v.name}</span><span class="ingredient-stock">В запасе: <b>${state.ingredients[i]}</b></span><button data-buy="${i}" ${!active()||state.money<v.price?'disabled':''} aria-label="Купить: ${v.name}, 1 штука за ${v.price} монет">+1 за ${v.price} ◈</button>${active()&&state.money<v.price?'<span class="unavailable">Мало монет</span>':''}</div>`).join('');
  if(summary) renderSummary();
  if(finished) renderFinal();
 }
 function renderSummary() {
  const d=state.days[state.day-1],sold=d.sold.reduce((a,b)=>a+b,0);
  $('day-summary').innerHTML=`<div class="summary-symbol" aria-hidden="true">☾</div><p class="eyebrow">${dayData().title}</p><h2>День ${state.day} завершён</h2><p>Продано зелий: <strong>${sold}</strong> · Выручка: <strong>${d.revenue} ◈</strong><br>Ушли без покупки: ${d.skipped}. В кошельке ${state.money} ◈.</p><button id="next-day" class="primary">Начать день ${state.day+1} →</button>`;
 }
 function renderFinal() {
  const sold=POTIONS.map((_,p)=>state.days.reduce((n,d)=>n+d.sold[p],0));
  const total=sold.reduce((a,b)=>a+b,0),revenue=state.days.reduce((n,d)=>n+d.revenue,0),spent=state.days.reduce((n,d)=>n+d.spent,0),skipped=state.days.reduce((n,d)=>n+d.skipped,0);
  const ingredientValue=state.ingredients.reduce((n,v,i)=>n+v*INGREDIENTS[i].price,0),potionValue=state.potions.reduce((n,v,i)=>n+v*cost(i),0),wealth=state.money+ingredientValue+potionValue,profit=wealth-50;
  const rank=total>=18?'Любимая лавка деревни':total>=12?'Мастер добрых зелий':total>=5?'Первая алхимическая искра':'Тихая лавка';
  const text=total>=18?'На празднике полной луны ваши зелья в каждом доме. Соседи уже спрашивают, когда вы снова откроетесь.':total>=12?'В деревне стало чуть светлее, бодрее и спокойнее. Вашу вывеску теперь узнают на лесной тропинке.':total>=5?'Несколько тёплых встреч, несколько удачных рецептов. У этой маленькой лавки уже есть своя история.':'Пять спокойных дней позади. В следующий раз можно чаще зажигать котёл и встречать гостей.';
  $('final-results').innerHTML=`<p class="eyebrow">Полнолуние · партия завершена</p><h2>${rank}</h2><p class="verdict">${text}</p><div class="result-grid"><div><strong>${total} / 26</strong><span>гостей с зельем</span></div><div><strong>${state.money} ◈</strong><span>монет в кошельке</span></div><div><strong>${profit>=0?'+':''}${profit} ◈</strong><span>рост стоимости лавки</span></div></div><p class="final-details">${sold.map((n,i)=>`${POTIONS[i].name}: ${n}`).join(' · ')}<br>Выручка ${revenue} ◈ · Закупки ${spent} ◈ · Ушли без покупки: ${skipped}<br>Остатки: ${state.ingredients.reduce((a,b)=>a+b,0)} ингредиентов и ${state.potions.reduce((a,b)=>a+b,0)} зелий стоимостью ${ingredientValue+potionValue} ◈.<br>Стоимость лавки = монеты + запасы по себестоимости. В начале было 50 ◈.</p><button id="new-game-final" class="primary">Открыть новую лавку</button>`;
 }
 function commit() {
  const focused=document.activeElement;
  const focusKey=focused?.hasAttribute('data-buy')?`[data-buy="${focused.dataset.buy}"]`:focused?.hasAttribute('data-recipe')?`[data-recipe="${focused.dataset.recipe}"]`:null;
  save(); render();
  if(focusKey) document.querySelector(focusKey)?.focus({preventScroll:true});
 }
 function buy(i) {
  if(!active() || !integer(i,0,2) || state.money<INGREDIENTS[i].price) return;
  state.money-=INGREDIENTS[i].price; state.ingredients[i]++; state.days[state.day-1].spent+=INGREDIENTS[i].price;
  if(state.tutorial===0 && POTIONS[0].recipe.every((n,k)=>state.ingredients[k]>=n)) state.tutorial=1;
  commit(); tell(`${INGREDIENTS[i].name}: +1 в запас · −${INGREDIENTS[i].price} ◈`);
 }
 function brew() {
  const p=state.selected;if(!canBrew(p)) return;
  POTIONS[p].recipe.forEach((n,i)=>state.ingredients[i]-=n);state.potions[p]++;state.heat--;state.days[state.day-1].brewed++;
  if(state.tutorial<2) state.tutorial=2;
  commit();tell(`${POTIONS[p].name} готово! −1 варка`);
  $('cauldron-art').classList.remove('brewed');void $('cauldron-art').offsetWidth;$('cauldron-art').classList.add('brewed');
 }
 function advanceVisitor() {
  state.cursor++;commit();$('visitor-zone').classList.remove('new-customer');void $('visitor-zone').offsetWidth;$('visitor-zone').classList.add('new-customer');
 }
 function sell() {
  const p=current();if(!active() || p===undefined || state.potions[p]<1) return;
  const amount=price(p);state.potions[p]--;state.money+=amount;state.days[state.day-1].sold[p]++;state.days[state.day-1].revenue+=amount;state.tutorial=3;
  advanceVisitor();tell(`Спасибо за зелье! +${amount} ◈`);
 }
 function skip() {
  if(!active() || current()===undefined) return;
  state.days[state.day-1].skipped++;advanceVisitor();tell('Посетитель ушёл без покупки.');
 }
 function closeDay() {
  if(!active()) return;
  const remaining=dayData().orders.length-state.cursor;
  state.days[state.day-1].skipped+=remaining;state.cursor=dayData().orders.length;
  state.phase=state.day===5?'finished':'summary';commit();
  if(state.phase==='finished') $('final-results').scrollIntoView({behavior:'auto',block:'start'});
  else $('next-day').focus({preventScroll:true});
 }
 function nextDay() {
  if(state.phase!=='summary'||state.day>=5) return;
  state.day++;state.cursor=0;state.heat=4;state.phase='day';commit();tell(`День ${state.day}: ${dayData().note}`);
  $('end-day').focus({preventScroll:true});
 }
 function openDialog(html) { $('dialog-body').innerHTML=html;$('dialog').showModal(); }
 function help() {
  openDialog(`<h2>Добро пожаловать в лавку</h2><p>У вас 5 дней и 50 монет. Встречайте соседей, варите нужные зелья и растите маленькую лавку.</p><ol><li><b>Купите ингредиенты.</b> Мята — 3 ◈, янтарь — 4 ◈, лунник — 6 ◈. Запасы видны под предметами.</li><li><b>Выберите рецепт и сварите.</b> Каждое зелье тратит ингредиенты и 1 варку. На день даётся 4 варки.</li><li><b>Продайте зелье посетителю.</b> Если нужного нет, можно отпустить гостя. Никто не торопит.</li><li><b>Закройте лавку.</b> День можно закончить в любой момент. Все запасы останутся, огонь восстановится.</li></ol><p class="muted">Гости приходят по очереди: 4, 5, 5, 6 и 6 за пять дней. Цены зависят от дня. В итоге учитываются продажи, монеты и стоимость оставшихся запасов. Неистраченные варки не переносятся.</p><div class="dialog-actions"><button class="primary" data-dialog="close">Вернуться в лавку</button></div><button class="danger-link" data-dialog="reset">Начать новую партию…</button>`);
 }
 function confirmReset() {
  if($('dialog').open) $('dialog').close();
  openDialog('<h2>Открыть новую лавку?</h2><p>Текущая партия и её итоги будут заменены. Вы снова начнёте с первого дня и 50 монет.</p><div class="dialog-actions"><button class="secondary" data-dialog="close" autofocus>Оставить текущую</button><button class="primary" data-dialog="new">Новая партия</button></div>');
 }
 function newGame() {
  if($('dialog').open) $('dialog').close();
  state=initial();tab='brew';document.body.classList.remove('market-active');updateTabs();commit();window.scrollTo(0,0);tell('Новая лавка открыта. У вас 50 монет и пять дней.');
 }
 function updateTabs() { document.querySelectorAll('[data-tab]').forEach(b=>{const selected=b.dataset.tab===tab;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',selected);}); }
 $('help').addEventListener('click',help);
 $('dismiss-guide').addEventListener('click',()=>{state.tutorialHidden=true;commit();});
 $('brew').addEventListener('click',brew);$('sell').addEventListener('click',sell);$('skip').addEventListener('click',skip);
 $('end-day').addEventListener('click',()=>{
  if(!active()) return;
  const remain=dayData().orders.length-state.cursor;
  if(!remain) return closeDay();
  openDialog(`<h2>${state.day===5?'Закончить пятый день?':'Закрыть лавку на сегодня?'}</h2><p>Ещё ${remain} ${remain===1?'посетитель ждёт':'посетителей ждут'} у двери. Они уйдут без покупки. Ваши монеты и запасы сохранятся.</p><div class="dialog-actions"><button class="secondary" data-dialog="close" autofocus>Ещё поработать</button><button class="primary" data-dialog="end">${state.day===5?'Подвести итоги':'Закрыть лавку'}</button></div>`);
 });
 document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||b.disabled)return;
  if(b.hasAttribute('data-buy')) buy(Number(b.dataset.buy));
  if(b.hasAttribute('data-recipe')&&active()) {state.selected=Number(b.dataset.recipe);commit();}
  if(b.hasAttribute('data-tab')) {tab=b.dataset.tab;document.body.classList.toggle('market-active',tab==='market');updateTabs();}
  if(b.id==='next-day') nextDay();
  if(b.id==='new-game-final') confirmReset();
  if(b.dataset.dialog==='close') $('dialog').close();
  if(b.dataset.dialog==='reset') confirmReset();
  if(b.dataset.dialog==='new') newGame();
  if(b.dataset.dialog==='end') {$('dialog').close();closeDay();}
 });
 state=load();render();save();
})();
