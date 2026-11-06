'use strict';

const GOAL = 75;
const SAVE_KEY = 'moon-street-potions-v1';
// Each note lists its start, length, pitch sweep, overtone level and amplitude.
const audio = createGameAudio('moon-street-potions-audio-v1', {
  buy: [[0, .085, 1180, 870, .32, .33], [.035, .09, 840, 750, .24, .22]],
  brew: [[0, .14, 230, 425, .15, .40], [.075, .13, 340, 600, .18, .28],
    [.16, .12, 480, 760, .23, .21]],
  sell: [[0, .16, 587, 585, .33, .34], [.085, .21, 880, 878, .29, .32]],
  day: [[0, .24, 392, 392, .15, .40], [.14, .22, 523, 523, .14, .30],
    [.27, .24, 659, 659, .14, .30]],
  final: [[0, .26, 261, 261, .16, .36], [.14, .25, 330, 330, .13, .28],
    [.27, .35, 392, 392, .19, .33], [.27, .36, 523, 523, .17, .24]]
});
const INGREDIENTS = [
  { id: 'mint', name: 'Лунная мята', short: 'Мята', cost: 2 },
  { id: 'honey', name: 'Янтарный мёд', short: 'Мёд', cost: 3 },
  { id: 'cap', name: 'Сонный гриб', short: 'Гриб', cost: 4 },
  { id: 'salt', name: 'Звёздная соль', short: 'Соль', cost: 3 }
];
const POTIONS = [
  { id: 'vigor', name: 'Бодрость', needs: [1, 1, 0, 0] },
  { id: 'sleep', name: 'Тихий сон', needs: [0, 0, 1, 1] },
  { id: 'flame', name: 'Тёплая искра', needs: [1, 1, 0, 1] }
];
const GUESTS = [
  { name: 'Пекарь Марта', hat: 'cap', colors: ['#806051', '#bf9670', '#494d4c', '#cf9b77', '#523436'] },
  { name: 'Почтальон Ян', hat: 'hood', colors: ['#4c6e65', '#81a185', '#484948', '#bc8066', '#3c3232'] },
  { name: 'Часовщик Мирон', hat: 'glasses', colors: ['#61677f', '#8f8aa0', '#423b47', '#c59a82', '#81776d'] },
  { name: 'Травница Ива', hat: 'crown', colors: ['#677450', '#a0a674', '#56434e', '#d3a37e', '#834e46'] },
  { name: 'Моряк Тихон', hat: 'cap', colors: ['#425c72', '#7396a0', '#535f57', '#9d6a54', '#40313a'] },
  { name: 'Фонарщица Лея', hat: 'hood', colors: ['#835765', '#b68580', '#624d4a', '#d4a78b', '#49323c'] },
  { name: 'Картограф Рута', hat: 'glasses', colors: ['#846852', '#bd9868', '#594444', '#a77262', '#2c2e35'] }
];

function order(guest, potion, price, line) {
  return { guest: GUESTS[guest], potion, price, line };
}

const EVENINGS = [
  [
    order(0, 0, 9, 'Тесто ещё не поднялось, а я уже зеваю.'),
    order(2, 1, 12, 'Часы идут как надо. Вот бы и мне хоть раз уснуть вовремя.'),
    order(5, 2, 14, 'Ночью на мосту даже фонари мёрзнут.')
  ],
  [
    order(1, 0, 8, 'На верхней улице сорок ступенек. Я считал.'),
    order(4, 2, 13, 'До рассвета на причале не согреться.'),
    order(3, 1, 13, 'Вчера полынь снилась всю ночь. Сегодня хочу тишины.'),
    order(0, 0, 11, 'Заказали восемь пирогов. Печь одна.')
  ],
  [
    order(6, 2, 16, 'На севере у меня чернила замерзают прямо в пере.'),
    order(5, 0, 10, 'До самого утра зажигаю огни на площади.'),
    order(2, 1, 11, 'Сегодня убрал все часы из спальни. Тиканье осталось.'),
    order(4, 2, 14, 'У моря в эту пору злые ветра.')
  ],
  [
    order(3, 1, 14, 'Натрудила руки. Пора бы им отдохнуть.'),
    order(1, 0, 11, 'Письмо срочное, ноги обычные. Выручите?'),
    order(6, 2, 15, 'У костра все места заняли. У вас потеплее.'),
    order(0, 1, 12, 'До рассвета могу поспать. Вот бы не передумать.')
  ],
  [
    order(5, 2, 15, 'Сегодня зажигают все фонари, даже на старой башне.'),
    order(4, 0, 10, 'Корабль отходит до первых петухов.'),
    order(2, 1, 15, 'До утра пусть время идёт само.'),
    order(3, 2, 16, 'Хочу донести до дома хоть немного тепла.'),
    order(1, 0, 12, 'Последнее письмо. На нём написано ваше имя.')
  ]
];

const byId = id => document.getElementById(id);
const ui = Object.fromEntries([
  'play', 'results', 'day-label', 'day-dots', 'coins', 'coin-word', 'portrait', 'vacant',
  'visitor-number', 'visitor-name', 'visitor-line', 'order', 'order-icon', 'order-name',
  'order-stock', 'offer', 'sell', 'skip', 'station-brew', 'station-market', 'brew-panel',
  'market-panel', 'recipes', 'supplies', 'hint', 'feedback', 'stock-line', 'queue',
  'close-day', 'result-title', 'result-line', 'result-totals', 'result-days', 'result-stock',
  'result-restart', 'help-open', 'help', 'restart-open', 'confirm', 'confirm-title',
  'confirm-copy', 'confirm-action', 'save-note'
].map(id => [id, byId(id)]));

function newState() {
  return {
    day: 0,
    position: 0,
    coins: 15,
    stock: [1, 1, 0, 1],
    bottles: [0, 0, 0],
    brewed: 0,
    purchased: 0,
    served: 0,
    days: EVENINGS.map(() => ({ served: 0, lost: 0, revenue: 0, spent: 0, coins: 0 }))
  };
}

function currentOrder(s) {
  return EVENINGS[s.day]?.[s.position];
}

function missing(s, potion) {
  return INGREDIENTS.filter((ingredient, i) => s.stock[i] < potion.needs[i]);
}

// Each accepted command changes one complete game state, including the evening ledger.
function apply(s, action) {
  if (s.day >= EVENINGS.length || !Array.isArray(action)) return false;
  const [kind, index] = action;
  const ledger = s.days[s.day];
  switch (kind) {
    case 'buy': {
      if (action.length !== 2 || !Number.isInteger(index)) return false;
      const ingredient = INGREDIENTS[index];
      if (!ingredient || s.coins < ingredient.cost) return false;
      s.coins -= ingredient.cost;
      s.stock[index]++;
      s.purchased++;
      ledger.spent += ingredient.cost;
      return true;
    }
    case 'brew': {
      if (action.length !== 2 || !Number.isInteger(index)) return false;
      const potion = POTIONS[index];
      if (!potion || missing(s, potion).length) return false;
      potion.needs.forEach((quantity, i) => { s.stock[i] -= quantity; });
      s.bottles[index]++;
      s.brewed++;
      return true;
    }
    case 'sell':
    case 'skip': {
      if (action.length !== 1) return false;
      const visit = currentOrder(s);
      if (!visit) return false;
      if (kind === 'sell') {
        if (!s.bottles[visit.potion]) return false;
        s.bottles[visit.potion]--;
        s.coins += visit.price;
        ledger.served++;
        ledger.revenue += visit.price;
        s.served++;
      } else {
        ledger.lost++;
      }
      s.position++;
      return true;
    }
    case 'close': {
      if (action.length !== 1) return false;
      ledger.lost += EVENINGS[s.day].length - s.position;
      ledger.coins = s.coins;
      s.day++;
      s.position = 0;
      return true;
    }
    default:
      return false;
  }
}

function restore() {
  let raw;
  try {
    raw = window.localStorage.getItem(SAVE_KEY);
  } catch {
    ui['save-note'].hidden = false;
  }
  if (raw === undefined || raw === null) return { s: newState(), log: [] };
  try {
    const saved = JSON.parse(raw);
    if (saved?.version !== 1 || !Array.isArray(saved.log) || saved.log.length > 400) {
      throw new Error('Invalid save');
    }
    const s = newState();
    if (!saved.log.every(action => apply(s, action))) throw new Error('Invalid command');
    return { s, log: saved.log };
  } catch {
    return { s: newState(), log: [], recovered: true };
  }
}

let { s: state, log, recovered } = restore();
let station = 'brew';
let paintedVisit = '';
let confirmAction = '';

function persist() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, log }));
    ui['save-note'].hidden = true;
  } catch {
    ui['save-note'].hidden = false;
  }
}

function say(message) {
  ui.feedback.textContent = message;
}

function dispatch(action, gesture) {
  const before = currentOrder(state);
  if (!apply(state, action)) return;
  log.push(action);
  persist();
  render();
  const [kind, index] = action;
  switch (kind) {
    case 'buy':
      audio.play('buy', { gesture });
      say(`Куплено: ${INGREDIENTS[index].name}. Потрачено ${INGREDIENTS[index].cost} мон.`);
      flash(supplyRows[index].card, 'fresh');
      break;
    case 'brew':
      audio.play('brew', { gesture });
      say(`Зелье «${POTIONS[index].name}» готово!`);
      flash(recipeRows[index].card, 'fresh');
      break;
    case 'sell':
      audio.play('sell', { gesture });
      say(`Заказ выполнен! +${before.price} мон.`);
      break;
    case 'skip':
      say('Посетитель ушёл. Зелья и монеты остались у вас.');
      break;
    case 'close':
      audio.play(state.day === EVENINGS.length ? 'final' : 'day', { gesture });
      if (state.day === EVENINGS.length) ui['result-title'].focus();
      else {
        say(`Наступил день ${state.day + 1}. У двери новая очередь.`);
        ui.sell.focus({ preventScroll: true });
        ui['day-label'].scrollIntoView({ block: 'nearest' });
      }
      return;
  }
  if (before && !currentOrder(state)) ui['close-day'].focus({ preventScroll: true });
}

function flash(element, name) {
  element.classList.remove(name);
  void element.offsetWidth;
  element.classList.add(name);
}

function icon(id, className = '') {
  return `<svg class="${className}" aria-hidden="true"><use href="#${id}"></use></svg>`;
}

function currency(value) {
  const end = value % 10;
  const teens = value % 100 >= 11 && value % 100 <= 14;
  if (teens || end === 0 || end > 4) return 'монет';
  return end === 1 ? 'монета' : 'монеты';
}

function itemRow(item, index, kind) {
  const card = document.createElement('article');
  card.className = 'item';
  card.dataset.item = item.id;
  const price = kind === 'buy'
    ? `<span class="price">${icon('coin')}${item.cost}</span>` : '';
  card.innerHTML = `
    ${icon(item.id, 'item-art')}
    <div class="item-copy">
      <h3>${item.name}</h3>
      <p class="item-detail"></p>
      <p class="item-stock" id="${item.id}-stock"></p>
    </div>
    <button type="button" class="button secondary" aria-describedby="${item.id}-stock"
      aria-label="${kind === 'buy' ? `Купить: ${item.name}, ${item.cost} ${currency(item.cost)}` : `Сварить: ${item.name}`}">
      ${kind === 'buy' ? 'Купить' : 'Сварить'}${price}
    </button>`;
  const button = card.querySelector('button');
  button.addEventListener('click', event => dispatch([kind, index], event));
  return { card, button, detail: card.querySelector('.item-detail'), stock: card.querySelector('.item-stock') };
}

const recipeRows = POTIONS.map((item, i) => {
  const row = itemRow(item, i, 'brew');
  const names = INGREDIENTS.filter((ingredient, ingredientIndex) => item.needs[ingredientIndex])
    .map(ingredient => ingredient.short.toLowerCase());
  const cost = item.needs.reduce((total, count, index) => total + count * INGREDIENTS[index].cost, 0);
  row.detail.textContent = `${names.join(' + ')} · ${cost} мон.`;
  ui.recipes.append(row.card);
  return row;
});
const supplyRows = INGREDIENTS.map((item, i) => {
  const row = itemRow(item, i, 'buy');
  ui.supplies.append(row.card);
  return row;
});

function setStation(next) {
  station = next;
  ['brew', 'market'].forEach(name => {
    ui[`station-${name}`].setAttribute('aria-pressed', String(station === name));
    ui[`${name}-panel`].hidden = station !== name;
  });
}

function render() {
  const done = state.day === EVENINGS.length;
  ui.play.hidden = done;
  ui.results.hidden = !done;
  ui['restart-open'].hidden = done;
  if (done) {
    renderResults();
    return;
  }
  const orders = EVENINGS[state.day];
  const visit = currentOrder(state);
  ui['day-label'].textContent = `День ${state.day + 1} / ${EVENINGS.length}`;
  ui['day-dots'].innerHTML = EVENINGS.map((_, i) => `<i class="${i === state.day ? 'current' : i < state.day ? 'past' : ''}"></i>`).join('');
  ui.coins.textContent = state.coins;
  ui['coin-word'].textContent = currency(state.coins);
  renderVisit(orders, visit);
  renderStocks();
  renderHint(visit);
  const upcoming = orders.slice(state.position + 1);
  ui.queue.innerHTML = upcoming.map(next => {
    const potion = POTIONS[next.potion];
    return `<span class="queue-token">${icon(potion.id)}${potion.name} <span class="queue-price">${next.price} мон.</span></span>`;
  }).join('') || (visit ? 'За этим посетителем никого.' : 'На сегодня заказов больше нет.');
  ui['close-day'].textContent = state.day === EVENINGS.length - 1 ? 'Завершить партию' : 'Закрыть лавку';
}

function renderVisit(orders, visit) {
  ui.portrait.toggleAttribute('hidden', !visit);
  ui.vacant.hidden = Boolean(visit);
  ui.order.hidden = !visit;
  ui.sell.hidden = !visit;
  ui.skip.hidden = !visit;
  if (!visit) {
    ui['visitor-number'].textContent = 'ПОСЛЕДНИЙ ПОСЕТИТЕЛЬ УШЁЛ';
    ui['visitor-name'].textContent = 'Тихий прилавок';
    ui['visitor-line'].textContent = state.day === EVENINGS.length - 1
      ? 'Самое время закрыть лавку и пересчитать монеты.'
      : 'Можно закупить припасы на завтра или закрыть лавку.';
    return;
  }
  const { guest, potion, price, line } = visit;
  const visitKey = `${state.day}/${state.position}`;
  if (paintedVisit !== visitKey) {
    ui.portrait.dataset.hat = guest.hat;
    ['coat', 'trim', 'shirt', 'skin', 'hair'].forEach((name, i) => {
      ui.portrait.style.setProperty(`--${name}`, guest.colors[i]);
    });
    flash(ui.portrait, 'arrive');
    paintedVisit = visitKey;
  }
  ui['visitor-number'].textContent = `ПОСЕТИТЕЛЬ ${state.position + 1} ИЗ ${orders.length}`;
  ui['visitor-name'].textContent = guest.name;
  ui['visitor-line'].textContent = `«${line}»`;
  ui['order-icon'].setAttribute('href', `#${POTIONS[potion].id}`);
  ui['order-name'].textContent = POTIONS[potion].name;
  ui.offer.textContent = price;
  ui.offer.parentElement.setAttribute('aria-label', `${price} ${currency(price)}`);
  const count = state.bottles[potion];
  ui['order-stock'].textContent = count ? `Готово: ${count} шт.` : 'Зелье нужно сварить';
  ui['order-stock'].classList.toggle('available', count > 0);
  ui.sell.setAttribute('aria-disabled', String(!count));
}

function renderStocks() {
  POTIONS.forEach((potion, i) => {
    const row = recipeRows[i];
    const unavailable = missing(state, potion);
    const missingNames = unavailable.map(item => item.short.toLowerCase()).join(', ');
    row.stock.textContent = `Готово: ${state.bottles[i]}${missingNames ? ` · нужно: ${missingNames}` : ''}`;
    row.button.setAttribute('aria-disabled', String(Boolean(unavailable.length)));
  });
  INGREDIENTS.forEach((item, i) => {
    const row = supplyRows[i];
    const affordable = state.coins >= item.cost;
    row.stock.textContent = `В запасе: ${state.stock[i]}${affordable ? '' : ' · мало монет'}`;
    row.button.setAttribute('aria-disabled', String(!affordable));
  });
  ui['stock-line'].innerHTML = INGREDIENTS.map((item, i) => `<span class="stock-token">${icon(item.id)}${item.short} ${state.stock[i]}</span>`).join('');
}

function renderHint(visit) {
  const goal = `Цель к пятому вечеру — ${GOAL} монет.`;
  if (state.day === 0 && state.position === 0 && !state.brewed) {
    ui.hint.textContent = 'Сварите «Бодрость». Для первой бутылочки всё есть.';
  } else if (!state.served && visit && state.bottles[visit.potion]) {
    ui.hint.textContent = 'Зелье готово. Продайте его на прилавке.';
  } else if (state.served && !state.purchased) {
    ui.hint.textContent = 'Загляните в «Припасы», чтобы докупить ингредиенты для следующего заказа.';
  } else {
    ui.hint.textContent = goal;
  }
}

function renderResults() {
  const total = key => state.days.reduce((sum, entry) => sum + entry[key], 0);
  const victory = state.coins >= GOAL;
  ui['result-title'].textContent = victory ? 'Лавка процветает' : 'Пять вечеров позади';
  ui['result-line'].textContent = victory
    ? `Вы собрали ${state.coins} ${currency(state.coins)} и выполнили цель в ${GOAL} монет.`
    : `До цели в ${GOAL} монет не хватило ${GOAL - state.coins} мон.`;
  ui['result-totals'].innerHTML = [
    ['Монет в кассе', state.coins],
    ['Сварено зелий', state.brewed],
    ['Выполнено заказов', state.served],
    ['Ушли без покупки', total('lost')]
  ].map(([label, count]) => `<div><dt>${label}</dt><dd>${count}</dd></div>`).join('');
  ui['result-days'].innerHTML = state.days.map((entry, i) => `
    <div class="result-day">
      <strong>День ${i + 1}</strong>
      <span>Заказы ${entry.served}/${EVENINGS[i].length}</span>
      <span>Выручка ${entry.revenue}</span>
      <span>Касса ${entry.coins} мон.</span>
    </div>`).join('');
  const bottles = state.bottles.reduce((sum, count) => sum + count, 0);
  const stock = state.stock.reduce((sum, count) => sum + count, 0);
  ui['result-stock'].textContent = `На припасы потрачено ${total('spent')} мон. Остаток: ${bottles} зелий, ${stock} ед. ингредиентов.`;
}

function ask(kind, title, copy, buttonLabel) {
  confirmAction = kind;
  ui['confirm-title'].textContent = title;
  ui['confirm-copy'].textContent = copy;
  ui['confirm-action'].textContent = buttonLabel;
  ui.confirm.returnValue = '';
  ui.confirm.showModal();
}

function restart() {
  audio.stop();
  state = newState();
  log = [];
  paintedVisit = '';
  setStation('brew');
  say('');
  persist();
  render();
  ui['station-brew'].focus({ preventScroll: true });
  ui['day-label'].scrollIntoView({ block: 'nearest' });
}

ui['help-open'].addEventListener('click', () => ui.help.showModal());
ui['restart-open'].addEventListener('click', () => {
  ask('restart', 'Открыть новую лавку?', 'Начнётся первый день. Текущая партия будет сброшена.', 'Начать заново');
});
ui['result-restart'].addEventListener('click', restart);
ui['station-brew'].addEventListener('click', () => setStation('brew'));
ui['station-market'].addEventListener('click', () => setStation('market'));
ui.sell.addEventListener('click', event => dispatch(['sell'], event));
ui.skip.addEventListener('click', () => dispatch(['skip']));
ui['close-day'].addEventListener('click', event => {
  if (state.day === EVENINGS.length) return;
  const remaining = EVENINGS[state.day].length - state.position;
  if (!remaining) {
    dispatch(['close'], event);
    return;
  }
  const last = state.day === EVENINGS.length - 1;
  ask('close', last ? 'Закрыть лавку в последний раз?' : 'Закрыть лавку на ночь?',
    `В очереди осталось ${remaining} из ${EVENINGS[state.day].length}. Они уйдут без покупки.`,
    last ? 'Подвести итог' : 'Закрыть лавку');
});
ui.confirm.querySelector('form').addEventListener('submit', event => {
  event.preventDefault();
  ui.confirm.close();
  if (event.submitter?.value !== 'proceed') return;
  if (confirmAction === 'restart') restart();
  if (confirmAction === 'close') dispatch(['close'], event);
});

render();
if (recovered) say('Сохранение не удалось прочитать. Открыта новая лавка.');
