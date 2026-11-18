(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statuses = {yes:'Да', no:'Нет', partial:'Частично', unknown:'Не проверено', not_applicable:'Не задана'};
  const primary = [
    ['goal15','Цель понятна за 15 секунд'], ['mouse','Удобно мышью'],
    ['touch','Удобно касанием'], ['readable','Текст и кнопки хорошо видны'],
    ['feedback','Понятная реакция на действия'], ['finish','Партия проходится до конца'],
    ['bugs','Найдено мешающих ошибок'], ['requirements','Подтверждено требований']
  ];
  const extra = [['no_manual','Можно начать без инструкции'],['audio','Есть звуковые эффекты'],['mute','Звук можно отключить'],['restart','Перезапуск работает']];
  const genre = {
    potions:[['money_goal','Достигнута цель по монетам'],['economy','Покупки и продажи считаются правильно'],['save','Прогресс сохраняется']],
    golf:[['holes','Пройдено лунок'],['wall_tunneling','Мяч проходит сквозь препятствия'],['predictable','Сила удара предсказуема']],
    arena:[['endings','Проверены победа и поражение'],['upgrades','Работают оба выбора улучшений'],['idle_win','Получилось победить без движения']]
  };
  const format = (run, key, round) => {
    if (key === 'bugs') return `<span class="quality-value ${run.bugs.length ? 'quality-warning' : ''}">${run.bugs.length}</span>`;
    if (key === 'requirements') {
      const passed = run.requirements.filter(x => x.status === 'pass').length;
      const unknown = run.requirements.filter(x => x.status === 'unknown').length;
      return `<span class="quality-value">${Math.round(passed / run.requirements.length * 100)}%</span><small>${passed} из ${run.requirements.length}${unknown ? ` · ${unknown} не проверено` : ''}</small>`;
    }
    const item = run.criteria[key] || run.genre[key];
    if (typeof item?.value === 'number') return `<span class="quality-value">${item.value} из ${key === 'holes' ? 3 : 2}</span>`;
    const status = item?.status || 'unknown';
    const negative = key === 'wall_tunneling';
    const warning = status === 'partial' || (negative ? status === 'yes' : key !== 'idle_win' && status === 'no');
    return `<span class="quality-value${warning ? ' quality-warning' : ''}${status === 'unknown' ? ' quality-muted' : ''}">${statuses[status] || statuses.unknown}</span>`;
  };
  window.renderCriteria = (round, blind, names) => {
    el('quality-hidden').hidden = !blind;
    el('quality-content').hidden = blind;
    // Remove prior content too, so hidden reviews do not leak through keyboard navigation.
    el('quality-table').replaceChildren();
    el('quality-notes-body').replaceChildren();
    if (blind) return;
    const data = typeof CRITERIA_REVIEW !== 'undefined' ? CRITERIA_REVIEW.rounds[round] : null;
    el('quality-more').hidden = !data;
    if (!data) { el('quality-meta').textContent = 'Результаты этой проверки пока недоступны.'; return; }
    el('quality-meta').textContent = 'Проверено 18 ноября 2026 · Проверяющая модель: Astra 6.2 · Касания: эмуляция Edge';
    const rows = list => list.map(([key,label]) => `<tr><th scope="row">${escape(round === 'arena' && key === 'mouse' ? 'Удобно клавишами' : label)}</th>${data.runs.map(run => `<td>${format(run,key,round)}</td>`).join('')}</tr>`).join('');
    el('quality-table').innerHTML = `<caption class="sr-only">Критерии готовых игр: ${escape(data.title)}</caption><colgroup><col class="quality-label-col">${data.runs.map(() => '<col>').join('')}</colgroup><thead><tr><th scope="col">Критерий</th>${data.runs.map(run => `<th scope="col">${escape(names[run.variant])}</th>`).join('')}</tr></thead><tbody>${rows(primary)}</tbody><tbody id="quality-extra" hidden>${rows(extra.concat(genre[round]))}</tbody>`;
    el('quality-scope').textContent = round === 'arena' ? 'Победа без движения — результат одной контрольной партии с выбором улучшений.' : round === 'golf' ? 'Проходимость и столкновения проверены на конкретных маршрутах и ударах.' : '«Не задана» означает, что в этой игре нет числовой цели по монетам.';
    const button = el('quality-more');
    button.setAttribute('aria-expanded','false'); button.textContent = 'Все 15 критериев';
    button.onclick = () => {
      const expanded = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(expanded)); el('quality-extra').hidden = !expanded;
      button.textContent = expanded ? 'Оставить основные критерии' : 'Все 15 критериев';
    };
    const labels = primary.concat(extra,genre[round]).filter(([key]) => key !== 'bugs' && key !== 'requirements');
    el('quality-notes-body').innerHTML = data.runs.map(run => {
      const bugs = run.bugs.length ? `<ul class="quality-bugs">${run.bugs.map(bug => `<li><strong>${escape(bug.title)}</strong><p>${escape(bug.impact)}</p><p>${escape(bug.steps.join(' → '))}</p></li>`).join('')}</ul>` : '<p>Мешающих ошибок в проверенных сценариях не найдено.</p>';
      const notes = labels.map(([key,label]) => { const item = run.criteria[key] || run.genre[key]; return `<dt>${escape(round === 'arena' && key === 'mouse' ? 'Удобно клавишами' : label)}</dt><dd>${escape(item?.note || 'Не проверено.')}</dd>`; }).join('');
      return `<details class="quality-model-notes"><summary>${escape(names[run.variant])} · найдено ошибок: ${run.bugs.length}</summary>${bugs}<dl>${notes}</dl><details><summary>Чек-лист требований: ${run.requirements.filter(r => r.status === 'pass').length} из ${run.requirements.length}</summary><ul>${run.requirements.map(req => `<li><strong>${req.status === 'pass' ? 'Да' : req.status === 'fail' ? 'Нет' : 'Не проверено'} — ${escape(req.label)}</strong><p>${escape(req.note)}</p></li>`).join('')}</ul></details>${run.limitations.length ? `<p class="quality-muted">${escape(run.limitations.join(' '))}</p>` : ''}</details>`;
    }).join('');
  };
})();
