(function () {
  var KEY = "dvoe-home-v2";
  var DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  function iso(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function mondayOf(d) {
    var x = new Date(d); x.setHours(0, 0, 0, 0);
    var day = x.getDay();
    x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
    return x;
  }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function seed() {
    var mon = mondayOf(new Date());
    var d = function (n) { return iso(addDays(mon, n)); };
    return {
      registered: true,
      homeName: "Наш дом",
      inviteCode: "ДВОЕ-7K2M",
      profileA: { name: "Дима", heightCm: 178, weightKg: 82, bodyFatPct: 18, age: 32, sex: "male", activity: "light", goal: "maintain" },
      profileB: { name: "Она", heightCm: 165, weightKg: 58, bodyFatPct: 24, age: 30, sex: "female", activity: "light", goal: "cut" },
      events: [
        { title: "Забрать Авито", date: "2026-09-21", time: "18:00", who: "a" },
        { title: "Ужин с родителями", date: d(2), time: "19:00", who: "both" },
        { title: "Продукты", date: d(5), time: "12:00", who: "both" },
        { title: "Прогулка", date: d(6), time: "16:00", who: "both" }
      ],
      parcels: [
        { id: "avito-518187074", source: "Авито", title: "Заказ 70000000518187074", status: "done", pickupCode: "в приложении Авито", address: "ПВЗ Авито", until: "2026-09-28", note: "Доставили 21.09, забрали в тот же день" },
        { id: "5post-275035137", source: "5Post / Золотое Яблоко", title: "Заказ I-275035137", status: "pickup", pickupCode: "913423120", address: "Санкт-Петербург, ул. Доблести, 9с1, касса Пятёрочки", until: "2026-09-20", note: "Срок хранения до 20.09 — проверьте, не ушло ли обратно" }
      ],
      meals: [
        { date: iso(new Date()), slot: "breakfast", title: "Овсянка с яйцом", kcal: 420, p: 28, f: 14, c: 45, forWho: "both", eaten: true },
        { date: iso(new Date()), slot: "lunch", title: "Курица и гречка", kcal: 610, p: 48, f: 16, c: 62, forWho: "both", eaten: true },
        { date: iso(new Date()), slot: "dinner", title: "Рыба и салат", kcal: 480, p: 36, f: 18, c: 28, forWho: "both", eaten: false }
      ]
    };
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? Object.assign(seed(), JSON.parse(raw)) : seed();
    } catch (e) { return seed(); }
  }
  var state = load();
  var tab = "home";
  var who = "a";
  var weekStart = mondayOf(new Date());
  var screen = state.registered ? "app" : "reg";
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
  }
  function targets(p) {
    var w = Number(p.weightKg) || 0; if (!w) return null;
    var fat = Number(p.bodyFatPct) || 0, h = Number(p.heightCm) || 0, age = Number(p.age) || 0, bmr = 0;
    if (fat > 0 && fat < 70) bmr = 370 + 21.6 * (w * (1 - fat / 100));
    else if (h && age) bmr = p.sex === "male" ? 10 * w + 6.25 * h - 5 * age + 5 : 10 * w + 6.25 * h - 5 * age - 161;
    else return null;
    var act = { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725 }[p.activity] || 1.375;
    var g = { maintain: 1, cut: 0.85, bulk: 1.1 }[p.goal] || 1;
    var kcal = bmr * act * g;
    var lbm = fat ? w * (1 - fat / 100) : w;
    var pr = 1.8 * lbm, f = (kcal * 0.25) / 9, c = Math.max(0, (kcal - pr * 4 - f * 9) / 4);
    return { kcal: Math.round(kcal), p: Math.round(pr), f: Math.round(f), c: Math.round(c) };
  }
  function eatenToday() {
    var today = iso(new Date());
    return state.meals.filter(function (m) {
      return m.eaten && m.date === today && (m.forWho === "both" || m.forWho === who);
    }).reduce(function (a, m) {
      return { kcal: a.kcal + Number(m.kcal || 0), p: a.p + Number(m.p || 0), f: a.f + Number(m.f || 0), c: a.c + Number(m.c || 0) };
    }, { kcal: 0, p: 0, f: 0, c: 0 });
  }
  function bar(label, val, goal, color) {
    var pct = goal ? Math.min(100, Math.round((val / goal) * 100)) : 0;
    return '<div class="metric"><div class="small">' + label + '</div><div class="n">' + val + (goal ? " / " + goal : "") + '</div><div class="bar-wrap"><div class="bar" style="width:' + pct + "%;background:" + color + '"></div></div><div class="small">' + (goal ? pct + "%" : "") + "</div></div>";
  }
  function weekHTML() {
    var days = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return addDays(weekStart, i); });
    var today = iso(new Date());
    var html = '<div class="between" style="margin-bottom:8px"><h3 class="serif">Неделя</h3><div class="row"><button class="btn ghost" data-act="week" data-n="-7">←</button><button class="btn ghost" data-act="week" data-n="7">→</button></div></div>';
    days.forEach(function (day, i) {
      var ds = iso(day);
      var items = state.events.filter(function (e) { return e.date === ds; });
      html += '<div class="list-item"><div class="between"><strong>' + DAYS[i] + " " + day.getDate() + "</strong>" + (ds === today ? '<span class="pill" style="background:#C97B5C;color:#fff">сегодня</span>' : "") + "</div>";
      if (!items.length) html += '<div class="small">свободно</div>';
      items.forEach(function (e) {
        html += "<div>" + (e.time ? e.time + " · " : "") + esc(e.title) + "</div>";
      });
      html += "</div>";
    });
    html += '<p style="margin-top:10px"><button class="btn accent" data-act="add-event">Добавить в календарь</button></p>';
    return html;
  }
  function render() {
    if (screen === "reg") {
      document.getElementById("app").innerHTML = '<div class="app"><header class="top"><div class="eyebrow">Двое</div><h1>Создать дом</h1></header><div class="main"><div class="card"><label class="field">Как дом называется<input id="r-home" value="Наш дом"></label><label class="field">Ваше имя<input id="r-a" value="Дима"></label><label class="field">Её имя<input id="r-b" value="Она"></label><button class="btn accent" data-act="create-home">Войти в дом</button><p class="small" style="margin-top:10px">Код дома появится после входа. Пока данные живут в этом телефоне.</p></div></div></div>';
      return;
    }
    var p = who === "a" ? state.profileA : state.profileB;
    var t = targets(p);
    var eaten = eatenToday();
    var body = "";
    if (tab === "home") {
      body += '<div class="card"><h3 class="serif">Метрики сегодня</h3><div class="row">' + bar("Ккал", eaten.kcal, t && t.kcal, "#C97B5C") + bar("Белки", eaten.p, t && t.p, "#2B1810") + '</div><div class="row" style="margin-top:8px">' + bar("Жиры", eaten.f, t && t.f, "#D4A24A") + bar("Углеводы", eaten.c, t && t.c, "#7A8F6A") + "</div></div>";
      body += '<div class="card">' + weekHTML() + "</div>";
    }
    if (tab === "parcels") {
      body += '<div class="between" style="margin-bottom:12px"><h2 class="serif">Посылки</h2><button class="btn accent" data-act="add-parcel">Добавить</button></div>';
      body += '<p class="muted" style="margin-bottom:10px">Из почты за 2 недели. Код Авито в письме не приходит — его смотрят в приложении.</p>';
      state.parcels.forEach(function (x) {
        var st = x.status === "done" ? "Забрали" : x.status === "pickup" ? "В ПВЗ" : "В пути";
        var bg = x.status === "done" ? "#2B1810" : x.status === "pickup" ? "#7A8F6A" : "#D4A24A";
        var fg = x.status === "transit" ? "#2B1810" : "#fff";
        body += '<div class="card"><div class="between"><strong>' + esc(x.title) + '</strong><span class="pill" style="background:' + bg + ";color:" + fg + '">' + st + "</span></div>";
        body += '<p class="small">' + esc(x.source) + (x.until ? " · до " + esc(x.until) : "") + "</p>";
        body += '<label class="field">Код выдачи<input data-parcel="' + x.id + '" data-field="pickupCode" value="' + esc(x.pickupCode) + '"></label>';
        body += '<label class="field">Адрес<input data-parcel="' + x.id + '" data-field="address" value="' + esc(x.address) + '"></label>';
        if (x.note) body += '<p class="small">' + esc(x.note) + "</p>";
        if (x.status !== "done") body += '<button class="btn" data-act="done" data-id="' + x.id + '">Забрали</button>';
        body += "</div>";
      });
    }
    if (tab === "menu") {
      body += '<h2 class="serif">Меню</h2><p class="muted">Только то, что впишете. Галочка «съели» идёт в метрики.</p>';
      ["breakfast", "lunch", "dinner"].forEach(function (slot) {
        var label = slot === "breakfast" ? "Завтрак" : slot === "lunch" ? "Обед" : "Ужин";
        var m = state.meals.find(function (x) { return x.date === iso(new Date()) && x.slot === slot; });
        body += '<div class="card"><h3 class="serif">' + label + "</h3>";
        if (m) body += "<p>" + esc(m.title) + "</p><p class=\"small\">" + m.kcal + " ккал · Б " + m.p + " · Ж " + m.f + " · У " + m.c + " · " + (m.eaten ? "съели" : "план") + "</p>";
        else body += '<p class="muted">пусто</p>';
        body += "</div>";
      });
      body += '<div class="card"><label class="field">Новое блюдо на сегодня<input id="dish"></label><div class="row"><label class="field" style="flex:1">Ккал<input id="dkcal" type="number"></label><label class="field" style="flex:1">Б<input id="dp" type="number"></label><label class="field" style="flex:1">Ж<input id="df" type="number"></label><label class="field" style="flex:1">У<input id="dc" type="number"></label></div><button class="btn accent" data-act="save-dish">Сохранить как съеденное</button></div>';
    }
    if (tab === "body") {
      body += '<h2 class="serif">Тело</h2><div class="card">';
      body += '<label class="field">Имя<input data-prof="name" value="' + esc(p.name) + '"></label>';
      body += '<div class="row"><label class="field" style="flex:1">Рост<input type="number" data-prof="heightCm" value="' + esc(p.heightCm) + '"></label>';
      body += '<label class="field" style="flex:1">Вес<input type="number" data-prof="weightKg" value="' + esc(p.weightKg) + '"></label></div>';
      body += '<label class="field">% жира<input type="number" data-prof="bodyFatPct" value="' + esc(p.bodyFatPct) + '"></label>';
      body += '<div class="row"><label class="field" style="flex:1">Возраст<input type="number" data-prof="age" value="' + esc(p.age) + '"></label>';
      body += '<label class="field" style="flex:1">Пол<select data-prof="sex"><option value="male"' + (p.sex === "male" ? " selected" : "") + '>муж</option><option value="female"' + (p.sex === "female" ? " selected" : "") + ">жен</option></select></label></div>';
      body += '<label class="field">Цель<select data-prof="goal"><option value="maintain"' + (p.goal === "maintain" ? " selected" : "") + '>удержать</option><option value="cut"' + (p.goal === "cut" ? " selected" : "") + '>дефицит</option><option value="bulk"' + (p.goal === "bulk" ? " selected" : "") + ">набор</option></select></label></div>';
      if (t) body += '<div class="card"><h3 class="serif">Цель</h3><p class="serif" style="font-size:28px">' + t.kcal + " ккал</p><p>Б " + t.p + " · Ж " + t.f + " · У " + t.c + "</p></div>";
      body += '<p class="small">Цифры демо, поправьте под себя.</p>';
    }
    document.getElementById("app").innerHTML =
      '<div class="app"><header class="top"><div class="eyebrow">' + esc(state.homeName) + '</div><h1>Двое</h1><div class="code">Код дома: ' + esc(state.inviteCode) + "</div></header>" +
      '<div class="main"><div class="row" style="margin-bottom:12px"><button class="' + (who === "a" ? "btn" : "btn ghost") + '" data-act="who" data-v="a">' + esc(state.profileA.name) + '</button><button class="' + (who === "b" ? "btn" : "btn ghost") + '" data-act="who" data-v="b">' + esc(state.profileB.name) + "</button></div>" + body + "</div>" +
      '<nav class="tabs"><button class="' + (tab === "home" ? "on" : "") + '" data-act="tab" data-v="home">Дом</button><button class="' + (tab === "parcels" ? "on" : "") + '" data-act="tab" data-v="parcels">Посылки</button><button class="' + (tab === "menu" ? "on" : "") + '" data-act="tab" data-v="menu">Меню</button><button class="' + (tab === "body" ? "on" : "") + '" data-act="tab" data-v="body">Тело</button></nav></div>';
  }
  document.getElementById("app").addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    var act = b.getAttribute("data-act");
    if (act === "create-home") {
      state.homeName = document.getElementById("r-home").value || "Наш дом";
      state.profileA.name = document.getElementById("r-a").value || "Я";
      state.profileB.name = document.getElementById("r-b").value || "Она";
      state.registered = true;
      save(); screen = "app";
    }
    if (act === "tab") tab = b.getAttribute("data-v");
    if (act === "who") who = b.getAttribute("data-v");
    if (act === "week") weekStart = addDays(weekStart, Number(b.getAttribute("data-n")));
    if (act === "add-event") {
      var title = prompt("Название");
      var date = prompt("Дата ГГГГ-ММ-ДД", iso(new Date()));
      if (title && date) { state.events.push({ title: title, date: date, time: "", who: "both" }); save(); }
    }
    if (act === "add-parcel") {
      var t2 = prompt("Название посылки");
      if (t2) { state.parcels.push({ id: String(Date.now()), source: "Вручную", title: t2, status: "transit", pickupCode: "", address: "", until: "", note: "" }); save(); }
    }
    if (act === "done") {
      state.parcels = state.parcels.map(function (x) { return x.id === b.getAttribute("data-id") ? Object.assign({}, x, { status: "done" }) : x; });
      save();
    }
    if (act === "save-dish") {
      var dish = document.getElementById("dish").value.trim();
      if (!dish) return;
      state.meals.push({ date: iso(new Date()), slot: "extra", title: dish, kcal: Number(document.getElementById("dkcal").value || 0), p: Number(document.getElementById("dp").value || 0), f: Number(document.getElementById("df").value || 0), c: Number(document.getElementById("dc").value || 0), forWho: "both", eaten: true });
      save();
    }
    render();
  });
  document.getElementById("app").addEventListener("change", function (e) {
    var el = e.target;
    if (el.getAttribute("data-parcel")) {
      var px = state.parcels.find(function (x) { return x.id === el.getAttribute("data-parcel"); });
      if (px) { px[el.getAttribute("data-field")] = el.value; save(); }
    }
    if (el.getAttribute("data-prof")) {
      var key = who === "a" ? "profileA" : "profileB";
      var val = el.type === "number" ? (el.value === "" ? "" : Number(el.value)) : el.value;
      state[key][el.getAttribute("data-prof")] = val;
      save(); render();
    }
  });
  render();
})();
