"use strict";

(() => {
  const STORAGE_KEY = "forest-potion-shop-v1";
  const GOAL = 120;
  const START_MONEY = 14;
  const BREW_LIMIT = 3;
  const ingredients = {
    mint: {name: "Мята", unit: "мята"},
    dew: {name: "Лунная роса", unit: "роса"},
    amber: {name: "Янтарная смола", unit: "смола"},
    berry: {name: "Сонная ягода", unit: "ягода"},
  };
  const potions = {
    vigor: {name: "Отвар бодрости", short: "Бодрость", recipe: {mint: 2, dew: 1}},
    sleep: {name: "Тихий сон", short: "Сон", recipe: {berry: 2, dew: 1}},
    light: {name: "Лесной огонь", short: "Огонь", recipe: {amber: 1, dew: 1, mint: 1}},
  };
  const people = {
    marta: {name: "Марта", role: "Травница"},
    ilya: {name: "Илья", role: "Дозорный"},
    mira: {name: "Мира", role: "Посыльная"},
    rodion: {name: "Родион", role: "Часовщик"},
    olya: {name: "Оля", role: "Ткачиха"},
    nika: {name: "Ника", role: "Хранительница маяка"},
  };
  const days = [
    {
      prices: {mint: 2, dew: 3, amber: 4, berry: 3},
      supply: {mint: 6, dew: 3, amber: 2, berry: 3},
      orders: [
        ["marta", "vigor", 10, "Я с рассвета на ногах. Найдётся глоток бодрости?"],
        ["olya", "sleep", 15, "Всё думаю о недотканном узоре. Помоги уснуть."],
        ["ilya", "light", 18, "Ночью иду к старой заставе. Фонарь там ни разу не зажёгся."],
        ["mira", "vigor", 11, "Письмо нужно доставить до заката. Ноги уже со мной спорят."],
      ],
    },
    {
      prices: {mint: 2, dew: 5, amber: 5, berry: 2},
      supply: {mint: 6, dew: 2, amber: 3, berry: 4},
      orders: [
        ["mira", "light", 15, "До перевала дойду уже в темноте. Продашь мне огонь?"],
        ["rodion", "sleep", 18, "Похоже, мои часы тикают даже во сне. Можно тишины?"],
        ["nika", "light", 21, "Туман спустился к причалу. За хороший свет плачу щедро."],
        ["marta", "vigor", 9, "Мята сегодня дёшева. Сваришь что-нибудь взбодриться?"],
      ],
    },
    {
      prices: {mint: 3, dew: 2, amber: 6, berry: 2},
      supply: {mint: 5, dew: 4, amber: 2, berry: 4},
      orders: [
        ["ilya", "sleep", 20, "Моя смена кончилась, а я всё ещё слышу шаги на крыльце."],
        ["olya", "light", 15, "Тёмную нить в сумерках не видно. Нужен маленький огонь."],
        ["mira", "vigor", 14, "Пока весь город завтракает, я уже дважды обежала площадь."],
        ["rodion", "sleep", 17, "Вчера завёл кукушку. Сегодня она разбудила весь дом."],
      ],
    },
    {
      prices: {mint: 3, dew: 4, amber: 4, berry: 4},
      supply: {mint: 5, dew: 3, amber: 3, berry: 3},
      orders: [
        ["nika", "light", 23, "Ветер забрал последний огонёк. С твоим до утра дотяну."],
        ["marta", "vigor", 13, "Корзина полная, а дома ждёт вторая. Дай мне бодрости."],
        ["olya", "sleep", 16, "Завтра довяжу край. Сегодня хочу только спать."],
        ["ilya", "light", 19, "Говорят, твой огонь даже в бурю не гаснет."],
      ],
    },
    {
      prices: {mint: 2, dew: 5, amber: 5, berry: 3},
      supply: {mint: 5, dew: 2, amber: 2, berry: 4},
      orders: [
        ["rodion", "sleep", 19, "Последние часы отдал. Теперь мне бы отдохнуть."],
        ["mira", "vigor", 18, "Одно письмо осталось. Отпразднуем глотком бодрости?"],
        ["nika", "light", 25, "В честь ярмарки зажгу огонь на самой высокой башне."],
        ["marta", "sleep", 21, "Сегодня собирала сонные ягоды, а сама совсем не сплю."],
      ],
    },
  ];

  const totalOrders = days.reduce((sum, day) => sum + day.orders.length, 0);
  const totalSupply = days.reduce((sum, day) => sum + Object.values(day.supply).reduce((a, b) => a + b, 0), 0);
  const maxEvents = totalOrders + totalSupply + days.length * (BREW_LIMIT + 1);
  const byId = id => document.getElementById(id);
  const dialog = byId("dialog");
  const ingredientKeys = Object.keys(ingredients);
  const potionKeys = Object.keys(potions);
  const bookIcon = Art.icon("ledger");
  const coinIcon = Art.icon("coin");
  const bottles = Object.fromEntries(potionKeys.map(key => [key, Art.bottle(key)]));
  const portraits = Object.fromEntries(Object.keys(people).map(key => [key, Art.portrait(key)]));
  const audio = createGameAudio("forest-potion-shop-audio-v1");
  const effects = {
    buy: [
      {type: "triangle", hz: 350, tail: 175, duration: .075, peak: .14},
      {type: "sine", hz: 978, at: .022, duration: .10, peak: .13},
    ],
    cook: [
      {type: "sine", hz: 210, tail: 365, duration: .095, peak: .21},
      {type: "sine", hz: 282, tail: 537, at: .06, duration: .12, peak: .18},
      {type: "triangle", hz: 783, tail: 1047, at: .14, duration: .125, peak: .12},
    ],
    sell: [
      {type: "triangle", hz: 659, duration: .16, peak: .17},
      {type: "sine", hz: 1318, duration: .085, peak: .11},
      {type: "triangle", hz: 988, at: .085, duration: .18, peak: .19},
    ],
    day: [
      {type: "triangle", hz: 294, duration: .30, peak: .21},
      {type: "sine", hz: 440, at: .14, duration: .31, peak: .18},
    ],
    goal: [
      {type: "triangle", hz: 392, duration: .24, peak: .19},
      {type: "triangle", hz: 494, at: .10, duration: .25, peak: .17},
      {type: "triangle", hz: 587, at: .20, duration: .27, peak: .17},
      {type: "sine", hz: 784, at: .30, duration: .36, peak: .22},
    ],
    result: [
      {type: "triangle", hz: 392, duration: .24, peak: .18},
      {type: "sine", hz: 330, at: .12, duration: .25, peak: .20},
      {type: "triangle", hz: 262, at: .25, duration: .33, peak: .18},
    ],
  };

  let state = freshState();
  let events = [];
  let storageUnavailable = false;
  let storageRecovered = false;
  let dialogPage = "";
  let dialogRecipe = "";
  let dialogOpener = null;
  let dialogFeedback = "";
  let toastTimeout;

  function freshState() {
    return {
      day: 0, order: 0, money: START_MONEY, brews: BREW_LIMIT, done: false,
      stock: {vigor: 1, sleep: 0, light: 0},
      inventory: {mint: 1, dew: 1, amber: 0, berry: 0},
      supply: {...days[0].supply},
      sold: 0, passed: 0, brewed: 0, bought: 0, earned: 0, spent: 0,
      todaySold: 0, todayEarned: 0,
    };
  }

  function remaining(s) {
    return days[s.day].orders.length - s.order;
  }

  function buyReason(s, key) {
    if (s.supply[key] === 0) return "На рынке не хватает товара";
    if (s.money < days[s.day].prices[key]) return "Не хватает монет";
    return "";
  }

  function missing(s, key) {
    return Object.entries(potions[key].recipe)
      .map(([item, quantity]) => [item, quantity - s.inventory[item]])
      .filter(([, quantity]) => quantity > 0);
  }

  function brewReason(s, key) {
    if (!s.brews) return "Котёл остынет до утра. Варки на сегодня закончились.";
    const short = missing(s, key);
    if (short.length) return `Не хватает: ${short.map(([item, quantity]) => `${ingredients[item].unit} × ${quantity}`).join(", ")}.`;
    return "";
  }

  function shoppingPlan(s, key) {
    const items = missing(s, key);
    const cost = items.reduce((sum, [item, quantity]) => sum + days[s.day].prices[item] * quantity, 0);
    const unavailable = items.filter(([item, quantity]) => quantity > s.supply[item])
      .map(([item]) => ingredients[item].unit);
    let reason = "";
    if (unavailable.length) reason = `На рынке не хватает: ${unavailable.join(", ")}.`;
    else if (cost > s.money) reason = `До покупки не хватает ${cost - s.money} мон.`;
    return {items, cost, reason};
  }

  function buy(s, key, quantity) {
    const cost = days[s.day].prices[key] * quantity;
    s.money -= cost;
    s.spent += cost;
    s.bought += quantity;
    s.inventory[key] += quantity;
    s.supply[key] -= quantity;
    return cost;
  }

  function applyAction(s, [action, key]) {
    if (s.done) return null;
    const day = days[s.day];

    switch (action) {
      case "buy": {
        if (!ingredientKeys.includes(key) || buyReason(s, key)) return null;
        const cost = buy(s, key, 1);
        return `Покупка · ${ingredients[key].name} × 1 · −${cost} мон.`;
      }
      case "buy-set": {
        if (!potionKeys.includes(key)) return null;
        const plan = shoppingPlan(s, key);
        if (!plan.items.length || plan.reason) return null;
        for (const [item, quantity] of plan.items) buy(s, item, quantity);
        return `Ингредиенты куплены · −${plan.cost} мон.`;
      }
      case "cook": {
        if (!potionKeys.includes(key) || brewReason(s, key)) return null;
        for (const [item, quantity] of Object.entries(potions[key].recipe)) s.inventory[item] -= quantity;
        s.brews -= 1;
        s.stock[key] += 1;
        s.brewed += 1;
        return `На полке новый флакон · ${potions[key].name}`;
      }
      case "sell": {
        const order = day.orders[s.order];
        if (!order || !s.stock[order[1]]) return null;
        const [person, potion, price] = order;
        s.stock[potion] -= 1;
        s.money += price;
        s.earned += price;
        s.sold += 1;
        s.todayEarned += price;
        s.todaySold += 1;
        s.order += 1;
        return `${people[person].name} благодарит! +${price} мон.`;
      }
      case "skip": {
        const order = day.orders[s.order];
        if (!order) return null;
        s.order += 1;
        s.passed += 1;
        return `${people[order[0]].name} уходит без зелья.`;
      }
      case "close-shift":
        s.passed += remaining(s);
        if (s.day === days.length - 1) {
          s.order = day.orders.length;
          s.done = true;
          return "Пятый день завершён. Книга лавки закрыта.";
        }
        s.day += 1;
        s.order = 0;
        s.brews = BREW_LIMIT;
        s.supply = {...days[s.day].supply};
        s.todaySold = 0;
        s.todayEarned = 0;
        return `День ${s.day + 1}. Котёл и рынок снова готовы.`;
      default:
        return null;
    }
  }

  function load() {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {
      storageUnavailable = true;
      return;
    }
    if (raw === null) return;

    try {
      const save = JSON.parse(raw);
      if (save?.version !== 1 || !Array.isArray(save.events) || save.events.length > maxEvents) throw new Error();
      const restored = freshState();
      for (const event of save.events) {
        if (!Array.isArray(event) || event.length !== 2
          || typeof event[0] !== "string" || typeof event[1] !== "string"
          || !applyAction(restored, event)) throw new Error();
      }
      state = restored;
      events = save.events;
    } catch {
      storageRecovered = true;
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({version: 1, events}));
      storageUnavailable = false;
    } catch {
      storageUnavailable = true;
    }
  }

  function countWord(n, words) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod100 > 10 && mod100 < 20) return words[2];
    if (mod10 === 1) return words[0];
    if (mod10 >= 2 && mod10 <= 4) return words[1];
    return words[2];
  }

  function coin(amount) {
    return `<span class="price">${coinIcon}<span>${amount}</span></span>`;
  }

  function button(label, action, kind = "", options = {}) {
    const {key = "", disabled = false, name = "", description = ""} = options;
    return `<button type="button" class="btn ${kind}" data-action="${action}" data-key="${key}"
      ${disabled ? "disabled" : ""} ${name ? `aria-label="${name}"` : ""}
      ${description ? `aria-describedby="${description}"` : ""}>${label}</button>`;
  }

  function setFeedback(message, inDialog = false) {
    clearTimeout(toastTimeout);
    const toast = byId("toast");
    toast.classList.toggle("active", !inDialog);
    toast.textContent = inDialog ? "" : message;
    if (inDialog) dialogFeedback = message;
    else toastTimeout = setTimeout(() => toast.classList.remove("active"), 2600);
    byId("announcer").textContent = "";
    requestAnimationFrame(() => {
      byId("announcer").textContent = message;
    });
  }

  function renderHeader() {
    const stepText = state.done ? "5 дней" : `День ${state.day + 1} из ${days.length}`;
    const dots = days.map((_, day) => {
      let style = "";
      if (state.done || day < state.day) style = "passed";
      else if (day === state.day) style = "today";
      return `<i class="${style}"></i>`;
    }).join("");
    byId("calendar").innerHTML = `<span>${stepText}</span><span class="day-dots" aria-hidden="true">${dots}</span>`;
    const wallet = byId("wallet");
    wallet.innerHTML = `${coinIcon}<span class="sr-only">Монет в кассе </span>${state.money}`;
  }

  function renderShop(order) {
    const scene = byId("scene");
    scene.dataset.day = state.day + 1;
    scene.classList.toggle("closed", state.done || !order);
    byId("opening-text").textContent = state.done ? "Лавка закрыта" : order ? "Лавка открыта" : "Очередь пуста";
    const art = byId("visitor-art");
    const person = order?.[0] ?? "";
    if (art.dataset.person !== person) {
      art.dataset.person = person;
      art.innerHTML = portraits[person] || "";
    }
    byId("stock-total").textContent = Object.values(state.stock).reduce((sum, quantity) => sum + quantity, 0);
    byId("shelf").innerHTML = potionKeys.map(key => {
      const count = state.stock[key];
      const style = count === 0 ? "empty" : key === order?.[1] ? "matched" : "";
      return `<li class="${style}" data-potion="${key}">
        <span class="bottle">${bottles[key]}</span>
        <strong><span aria-hidden="true">${potions[key].short}</span><span class="sr-only">${potions[key].name}</span></strong>
        <span class="stock-count">${count}</span>
      </li>`;
    }).join("");
  }

  function orderTicket([person, key, price, quote]) {
    const ready = state.stock[key] > 0;
    const count = days[state.day].orders.length;
    let status = "Этого зелья нет на полке. Загляните к котлу.";
    if (!ready && !state.brews) status = "Зелья нет, и варки закончились. Можно пропустить заказ.";
    if (ready) status = "Флакон на полке. Можно продавать.";
    return `
      <div class="ticket-top">
        <p class="eyebrow">Посетитель ${state.order + 1} / ${count}</p>
        <button type="button" class="queue-link" data-action="queue">Очередь</button>
      </div>
      <h2 id="guest-heading" tabindex="-1">${people[person].name}</h2>
      <p class="role">${people[person].role}</p>
      <p class="quote">«${quote}»</p>
      <div class="request">
        <span class="bottle">${bottles[key]}</span>
        <div><strong>${potions[key].name}</strong><small>1 флакон</small></div>
        ${coin(`+${price}`)}
      </div>
      <div class="ticket-actions">
        ${button("Продать", "sell", "primary", {disabled: !ready, description: "order-status"})}
        ${button("Пропустить", "skip", "paper")}
      </div>
      <p class="order-status" id="order-status">${status}</p>`;
  }

  function emptyTicket() {
    return `<div class="seal">${bookIcon}</div>
      <p class="eyebrow">Вечер · День ${state.day + 1}</p>
      <h2 id="guest-heading" tabindex="-1">Все ушли домой</h2>
      <p class="role">Заказов выполнено ${state.todaySold} из ${days[state.day].orders.length} · Выручка ${state.todayEarned} мон.</p>
      <p class="quote">${state.day === days.length - 1 ? "Теперь можно закрыть книгу лавки и посчитать выручку." : "Можно пополнить запасы на завтра или закрыть лавку."}</p>
      <div class="ticket-actions">${button(state.day === days.length - 1 ? "Подвести итоги" : "Закрыть день", "finish-day", "primary")}</div>`;
  }

  function resultTicket() {
    const successful = state.money >= GOAL;
    const fortune = successful ? "Дело на подъёме" : "Пять дней позади";
    const goalStatus = successful ? `Цель в ${GOAL} монет выполнена` : `До цели в ${GOAL} монет осталось ${GOAL - state.money}`;
    return `<div class="seal">${bookIcon}</div>
      <p class="eyebrow">Книга лавки</p>
      <h2 id="guest-heading" tabindex="-1">${fortune}</h2>
      <p class="fortune">${coin(state.money)} <span class="sr-only">монет в кассе</span></p>
      <p class="role">${goalStatus}</p>
      <dl class="ledger">
        <div><dt>Продано зелий</dt><dd>${state.sold} из ${totalOrders}</dd></div>
        <div><dt>Пропущено заказов</dt><dd>${state.passed}</dd></div>
        <div><dt>Сварено зелий</dt><dd>${state.brewed}</dd></div>
        <div><dt>Выручка</dt><dd>${state.earned} мон.</dd></div>
        <div><dt>Потрачено на рынке</dt><dd>${state.spent} мон.</dd></div>
      </dl>
      <div class="ticket-actions">${button("Новая партия", "restart", "primary")}</div>`;
  }

  function renderHint(order) {
    let hint;
    if (state.done) {
      hint = "Пять дней работы записаны в книге лавки.";
    } else if (state.day === 0 && state.order === 0 && state.sold === 0) {
      hint = "Первый отвар уже на полке. <b>Продайте его</b> Марте.";
    } else if (state.day === 0 && state.bought === 0 && state.brewed === 0) {
      hint = "Откройте <b>котёл</b>, чтобы сверить рецепт, и докупите недостающее <b>на рынке</b>.";
    } else if (state.day === 0 && state.brewed === 0 && state.bought > 0) {
      hint = "Ингредиенты куплены. Откройте <b>котёл</b> и сварите зелье для заказа.";
    } else if (state.day === 0 && !order) {
      hint = "День подошёл к концу. Ингредиенты и флаконы останутся на завтра.";
    } else {
      hint = `Соберите <b>${GOAL} монет</b> к закрытию пятого дня.`;
    }
    byId("hint").innerHTML = `${Art.icon("hint")}<span>${hint}</span>`;
  }

  function renderGame() {
    const order = state.done ? null : days[state.day].orders[state.order];
    renderHeader();
    renderShop(order);
    const ticket = byId("ticket");
    ticket.classList.toggle("empty-ticket", !order && !state.done);
    ticket.classList.toggle("result", state.done);
    ticket.innerHTML = state.done ? resultTicket() : order ? orderTicket(order) : emptyTicket();
    byId("stations").hidden = state.done;
    byId("turn-caption").textContent = `${state.brews} ${countWord(state.brews, ["варка", "варки", "варок"])} в запасе`;
    byId("shift-actions").innerHTML = !state.done && order
      ? button("Закрыть день →", "finish-day", "outline") : "";
    renderHint(order);
  }

  function marketView() {
    const day = days[state.day];
    const intro = `<p class="dialog-intro">В кассе <b>${state.money} мон.</b> Товар пополняется к утру.</p>`;
    const rows = ingredientKeys.map(key => {
      const reason = buyReason(state, key);
      const action = button(`Купить ${coin(day.prices[key])}`, "buy", "outline", {
        key, disabled: reason !== "", name: `Купить: ${ingredients[key].name} за ${day.prices[key]} мон.`,
        description: `stock-${key}`,
      });
      return `<li class="list-row">
        <span class="item-icon">${Art.ingredient(key)}</span>
        <div><strong>${ingredients[key].name}</strong>
          <small id="stock-${key}">Дома ${state.inventory[key]} · На рынке ${state.supply[key]}${reason ? `<br><span class="shortage">${reason}</span>` : ""}</small>
        </div>${action}
      </li>`;
    }).join("");

    let shopping = "";
    if (dialogRecipe) {
      const plan = shoppingPlan(state, dialogRecipe);
      const list = plan.items.map(([key, quantity]) => `${ingredients[key].unit} × ${quantity}`).join(", ");
      const ready = plan.items.length === 0;
      shopping = `<section class="shopping-plan">
        <strong>Для «${potions[dialogRecipe].name}»</strong>
        <p class="ingredients" id="shopping-list">${ready ? "Всё уже в запасе." : `Нужно докупить: ${list}.${plan.reason ? ` ${plan.reason}` : ""}`}</p>
        <div class="dialog-actions">
          ${ready ? "" : button(`Купить недостающее ${coin(plan.cost)}`, "buy-set", "primary", {key: dialogRecipe, disabled: plan.reason !== "", description: "shopping-list"})}
          ${button("К котлу", "brew", "outline")}
        </div>
      </section>`;
    }
    return `${intro}${shopping}<ul class="rows">${rows}</ul>`;
  }

  function brewView() {
    const orderKey = days[state.day].orders[state.order]?.[1];
    const intro = `<p class="dialog-intro">Варок на сегодня <b>${state.brews} из ${BREW_LIMIT}</b>. За варку получится один флакон.</p>`;
    const rows = potionKeys.map(key => {
      const recipe = Object.entries(potions[key].recipe).map(([item, quantity]) => `${ingredients[item].unit} × ${quantity}`).join(" · ");
      const reason = brewReason(state, key);
      const action = button("Варить", "cook", "primary", {
        key, disabled: reason !== "", name: `Варить «${potions[key].name}»`, description: `recipe-${key}`,
      });
      const canShop = reason && state.brews > 0;
      return `<li class="list-row recipe-row ${key === orderKey ? "current-recipe" : ""}">
        <span class="item-icon">${bottles[key]}</span>
        <div><strong>${potions[key].name}</strong>
          <small class="recipe-list">${recipe}</small>
          <small id="recipe-${key}" class="${reason ? "shortage" : ""}">${reason || (key === orderKey ? "Текущий заказ · " : "") + "Можно сварить"}</small>
        </div>
        <div class="recipe-actions">${action}${canShop ? button("На рынок", "shop-for", "outline", {key, name: `На рынок за ингредиентами для «${potions[key].name}»`}) : ""}</div>
      </li>`;
    }).join("");
    const stock = ingredientKeys.map(key => `${ingredients[key].unit} ${state.inventory[key]}`).join(" · ");
    return `${intro}<ul class="rows">${rows}</ul>
      <p class="ingredients">В кладовой<br>${stock}</p>
      <div class="dialog-actions">${button("К прилавку", "dismiss", "outline")}</div>`;
  }

  function queueView() {
    const orders = days[state.day].orders.slice(state.order);
    return `<p class="dialog-intro">Покупатели ждут по порядку. Сравните цены и решите, на какие заказы хватит ингредиентов.</p>
      <ol class="rows" start="${state.order + 1}">${orders.map(([person, key, price], i) => `
        <li class="list-row ${i === 0 ? "current-recipe" : ""}">
          <span class="item-icon">${bottles[key]}</span>
          <div><strong>${people[person].name}</strong><small>${potions[key].name}${i === 0 ? " · Сейчас у прилавка" : ""}</small></div>
          <span class="queue-price">${coin(`+${price}`)}</span>
        </li>`).join("")}</ol>`;
  }

  function helpView() {
    return `<p class="dialog-intro">У вас пять дней, чтобы собрать <b>${GOAL} монет</b> за прилавком.</p>
      <ol class="help-list">
        <li>Посмотрите, что просит посетитель и сколько он заплатит. Можно заглянуть в очередь.</li>
        <li>Сверьтесь с рецептами у котла. Недостающее можно купить на рынке. Цены и наличие меняются каждый день.</li>
        <li>Сварите зелье и продайте его у прилавка. Котла хватает на ${BREW_LIMIT} варки в день.</li>
        <li>Закройте день, когда захотите. Запасы перейдут на завтра, а оставшиеся заказы пропадут.</li>
      </ol>
      <p class="ingredients">${storageUnavailable ? "Сохранение сейчас недоступно." : "Ход партии сохраняется автоматически."}</p>
      <div class="dialog-actions">${state.done ? "" : button("Новая партия", "reset-prompt", "outline")}${button("Понятно", "dismiss", "primary")}</div>`;
  }

  function closingView() {
    const n = remaining(state);
    const peopleWord = countWord(n, ["посетитель", "посетителя", "посетителей"]);
    const outcome = n === 1 ? "Посетитель уйдёт" : "Посетители уйдут";
    return `<p>В очереди ещё <b>${n} ${peopleWord}</b>. ${outcome} без покупки после закрытия.</p>
      <div class="dialog-actions">${button("Остаться", "dismiss", "outline")}
        ${button(state.day === days.length - 1 ? "Подвести итоги" : "Закрыть день", "close-shift", "primary")}
      </div>`;
  }

  const pages = {
    market: {label: "Лавочные дела", title: "Рынок", view: marketView},
    brew: {label: "Лавочные дела", title: "Котёл", view: brewView},
    queue: {label: "Заказы на сегодня", title: "Очередь", view: queueView},
    help: {label: "Памятка алхимика", title: "Как вести лавку", view: helpView},
    closing: {label: "День заканчивается", title: "Закрыть лавку?", view: closingView},
    reset: {
      label: "Новая партия", title: "Начать заново?",
      view: () => `<p>Текущая партия будет сброшена до первого дня.</p>
        <div class="dialog-actions">${button("Остаться", "dismiss", "outline")}
          ${button("Начать заново", "restart", "destructive")}
        </div>`,
    },
  };

  function renderDialog() {
    const page = pages[dialogPage];
    const label = byId("dialog-label");
    label.textContent = page.label;
    byId("dialog-title").textContent = page.title;
    byId("dialog-content").innerHTML = `${page.view()}
      ${["market", "brew"].includes(dialogPage) ? `<p class="dialog-feedback">${dialogFeedback}</p>` : ""}`;
  }

  function openDialog(page, opener, recipe = "") {
    const alreadyOpen = dialog.open;
    if (!alreadyOpen) dialogOpener = opener;
    dialogPage = page;
    dialogRecipe = recipe;
    dialogFeedback = "";
    renderDialog();
    if (!alreadyOpen) dialog.showModal();
    dialog.scrollTop = 0;
    dialog.querySelector(".dialog-close").focus({preventScroll: true});
  }

  function focusAction(region, action, key = "") {
    const target = [...region.querySelectorAll("button[data-action]:not(:disabled)")].find(button =>
      button.dataset.action === action && (button.dataset.key || "") === key);
    if (!target) return false;
    target.focus({preventScroll: true});
    return true;
  }

  function perform(action, key = "", gesture) {
    const entry = [action, key];
    const message = applyAction(state, entry);
    if (!message) return;
    events.push(entry);
    save();
    const effect = action === "close-shift"
      ? (state.done ? (state.money >= GOAL ? "goal" : "result") : "day")
      : action === "buy-set" ? "buy" : action;
    if (effects[effect]) audio.play(effects[effect], {gesture});
    const inDialog = dialog.open && action !== "close-shift";
    const scroll = dialog.scrollTop;
    if (dialog.open && !inDialog) dialog.close();
    renderGame();
    setFeedback(message, inDialog);
    if (inDialog) {
      renderDialog();
      dialog.scrollTop = scroll;
      if (!focusAction(dialog, action, key)) {
        const next = action === "buy-set"
          ? dialog.querySelector('button[data-action="brew"]')
          : dialog.querySelector(`button[data-action="${action}"]:not(:disabled)`);
        (next || dialog.querySelector(".dialog-close")).focus({preventScroll: true});
      }
    } else {
      byId("guest-heading")?.focus({preventScroll: true});
    }
  }

  function restart() {
    audio.stop();
    dialogOpener = null;
    if (dialog.open) dialog.close();
    state = freshState();
    events = [];
    save();
    renderGame();
    setFeedback("Новая партия. Марта ждёт первый флакон.");
    byId("guest-heading").focus({preventScroll: true});
  }

  document.addEventListener("click", event => {
    const control = event.target.closest("button[data-action]");
    if (!control || (dialog.open && !dialog.contains(control))) return;
    const {action, key} = control.dataset;
    if (action === "dismiss") {
      if (dialog.open) dialog.close();
      return;
    }
    if (action === "help") {
      openDialog("help", control);
      return;
    }
    if (action === "restart") {
      if (state.done || dialogPage === "reset") restart();
      return;
    }
    if (state.done) return;

    switch (action) {
      case "market":
      case "brew":
      case "queue":
        openDialog(action, control);
        break;
      case "shop-for":
        openDialog("market", control, key);
        break;
      case "finish-day":
        if (remaining(state)) openDialog("closing", control);
        else perform("close-shift", "", event.isTrusted);
        break;
      case "reset-prompt":
        openDialog("reset", control);
        break;
      default:
        perform(action, key, event.isTrusted);
    }
  });

  dialog.addEventListener("close", () => {
    if (dialog.open) return;
    const focus = document.activeElement;
    if (dialogOpener && (focus === document.body || dialog.contains(focus))) {
      const {action, key} = dialogOpener.dataset;
      if (!focusAction(document, action, key || "")) byId("guest-heading")?.focus({preventScroll: true});
    }
    dialogPage = "";
    dialogRecipe = "";
    dialogOpener = null;
  });

  byId("brand-icon").innerHTML = Art.icon("brand");
  byId("market-icon").innerHTML = Art.icon("market");
  byId("brew-icon").innerHTML = Art.icon("brew");
  byId("shop-art").innerHTML = Art.shop();
  load();
  renderGame();
  if (storageRecovered) setFeedback("Сохранение повреждено. Лавка открыта заново.");
  if (storageUnavailable) setFeedback("Сохранение недоступно. Можно играть на этой странице.");
})();
