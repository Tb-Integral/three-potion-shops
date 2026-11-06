'use strict';
(()=>{
 const runs=window.EXPERIMENT.runs,nf=new Intl.NumberFormat('ru-RU');
 const duration=s=>`${Math.floor(Math.round(s)/60)}:${String(Math.round(s)%60).padStart(2,'0')}`;
 const labels={elapsedSeconds:{caption:'Время от начала работы до сдачи, мин:сек',note:'Время включает написание кода, запуск инструментов и проверки самой модели. Последующая работа оценщика сюда не входит.',format:duration},outputTokens:{caption:'Выходные токены за весь запуск, включая рассуждение',note:'Это весь сгенерированный моделью вывод: ответы, код, вызовы инструментов и токены рассуждения. Токены рассуждения уже входят в это число.',format:n=>nf.format(n)},uncachedInputTokens:{caption:'Входные токены без кеша за весь запуск',note:'Из полного входа вычтена кешированная часть. Счётчик включает системные инструкции и результаты инструментов, а не только текст задания.',format:n=>nf.format(n)},totalTokens:{caption:'Все токены: суммарный вход + выход',note:'Здесь повторно учитывается контекст, переданный при каждом ответе модели. Кешированная часть уже входит во входные токены. Это не размер одного запроса и не денежная стоимость.',format:n=>nf.format(n)}};
 const copy={A:'Четыре варки в день, меняющиеся цены и подробное обучение. Нужно выбирать, кому достанется зелье.',B:'Постоянные рецепты и цены, три гостя в день. Самая простая и быстрая реализация.',C:'Будущие заказы видны в очереди. Прямые кнопки варки и цель — 75 монет к пятому вечеру.'};
 let metric='elapsedSeconds',blind=false;
 const $=id=>document.getElementById(id);
 function render(){
  const spec=labels[metric],max=Math.max(...runs.map(r=>r[metric]));
  $('chart-caption').textContent=spec.caption;$('metric-note').textContent=spec.note;
  $('chart').innerHTML=runs.map(r=>`<div class="chart-row variant-${r.variant}"><div class="chart-label"><strong>Вариант ${r.variant}</strong><small>${blind?'Модель скрыта':r.model}</small></div><div class="bar-track" aria-hidden="true"><div class="bar" style="width:${r[metric]/max*100}%"></div></div><span class="chart-value">${spec.format(r[metric])}</span></div>`).join('');
  $('game-grid').innerHTML=runs.map(r=>`<article class="game-card"><div class="game-top"><h3>Вариант ${r.variant}</h3><span class="score evaluation-score">${r.score}/100 · оценка</span></div><a class="preview-link" href="play.html?game=${r.variant}${blind?'&blind=1':''}" aria-label="Играть в вариант ${r.variant}"><img class="preview" src="assets/${r.variant}-desktop.png" alt="Реальный экран игры ${r.variant}" width="1440" height="950" loading="lazy"></a><p class="game-model">${blind?'Модель скрыта':r.model}</p><p class="description">${copy[r.variant]}</p><div class="game-footer"><a class="button" href="play.html?game=${r.variant}${blind?'&blind=1':''}">Играть в ${r.variant}</a><span>${duration(r.elapsedSeconds)} на создание</span></div></article>`).join('');
  document.querySelectorAll('[data-model]').forEach(el=>{const r=runs.find(r=>r.variant===el.dataset.model);el.textContent=blind?'Вариант '+r.variant:r.variant+' · '+r.model});
  document.body.classList.toggle('blind-mode',blind);$('findings').hidden=blind;
 }
 const rows=[['Время работы',r=>duration(r.elapsedSeconds)],['Всего токенов',r=>nf.format(r.totalTokens)],['Входные, всего',r=>nf.format(r.inputTokens)],['↳ из них кешированные',r=>nf.format(r.cachedInputTokens)],['↳ вход без кеша',r=>nf.format(r.uncachedInputTokens)],['Выходные, всего',r=>nf.format(r.outputTokens)],['↳ из них рассуждение',r=>nf.format(r.reasoningOutputTokens)],['Доля кеша во входе',r=>(100*r.cachedInputTokens/r.inputTokens).toFixed(1)+'%'],['Ответов модели',r=>r.modelResponses],['Команд оболочки',r=>r.shellCommands],['Файлов игры',r=>r.runtimeFiles],['Размер файлов игры',r=>nf.format(r.runtimeBytes)+' Б'],['Денежная стоимость',()=> 'Нет данных']];
 $('metrics-table').innerHTML=rows.map(([label,value])=>`<tr><th scope="row">${label}</th>${runs.map(r=>`<td>${value(r)}</td>`).join('')}</tr>`).join('');
 document.querySelectorAll('[data-metric]').forEach(b=>b.addEventListener('click',()=>{metric=b.dataset.metric;document.querySelectorAll('[data-metric]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn===b)));render()}));
 $('blind').addEventListener('change',e=>{blind=e.target.checked;render()});
 render();
})();
