(function () {
  var HOME = "dvoe-home-v4";
  var AUTH = "dvoe-auth-v4";
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
  function code() { return "ДВОЕ-" + Math.random().toString(36).slice(2, 6).toUpperCase(); }
  function seedHome() {
    var mon = mondayOf(new Date());
    function d(n) { return iso(addDays(mon, n)); }
    return {
      homeName: "Двое",
      inviteCode: code(),
      events: [
        { title: "Забрать Авито", date: "2026-09-21", time: "18:00" },
        { title: "Ужин с родителями", date: d(2), time: "19:00" },
        { title: "Продукты", date: d(5), time: "12:00" }
      ],
      parcels: [
        { id: "avito1", source: "Авито", title: "70000000518187074", status: "done", pickupCode: "в приложении Авито", address: "ПВЗ Авито", until: "2026-09-28", note: "Доставили и забрали 21.09" },
        { id: "five1", source: "5Post / Золотое Яблоко", title: "I-275035137", status: "pickup", pickupCode: "913423120", address: "СПб, Доблести 9с1, Пятёрочка", until: "2026-09-20", note: "Срок хранения уже вышел" }
      ],
      meals: [
        { date: iso(new Date()), slot: "breakfast", title: "Овсянка с яйцом", kcal: 420, p: 28, f: 14, c: 45, eaten: true },
        { date: iso(new Date()), slot: "lunch", title: "Курица и гречка", kcal: 610, p: 48, f: 16, c: 62, eaten: true },
        { date: iso(new Date()), slot: "dinner", title: "Рыба и салат", kcal: 480, p: 36, f: 18, c: 28, eaten: false }
      ]
    };
  }
  function emptyBody() {
    return { name: "", heightCm: "", weightKg: "", bodyFatPct: "", age: "", sex: "male", activity: "light", goal: "maintain" };
  }
  function loadJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  var home = loadJSON(HOME, null) || seedHome();
  var session = loadJSON(AUTH, null);
  var tab = "home";
  var weekStart = mondayOf(new Date());
  var authMode = "choose";
  function saveHome() { localStorage.setItem(HOME, JSON.stringify(home)); }
  function saveAuth() { localStorage.setItem(AUTH, JSON.stringify(session)); }
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
    return home.meals.filter(function (m) { return m.eaten && m.date === today; }).reduce(function (a, m) {
      return { kcal: a.kcal + Number(m.kcal || 0), p: a.p + Number(m.p || 0), f: a.f + Number(m.f || 0), c: a.c + Number(m.c || 0) };
    }, { kcal: 0, p: 0, f: 0, c: 0 });
  }
  function bar(label, val, goal, color) {
    var pct = goal ? Math.min(100, Math.round((val / goal) * 100)) : 0;
    return '<div class="metric"><div class="small">' + label + '</div><div class="n">' + val + (goal ? " / " + goal : "") + '</div><div class="bar-wrap"><div class="bar" style="width:' + pct + "%;background:" + color + '"></div></div><div class="small">' + (goal ? pct + "%" : "") + "</div></div>";
  }
  function weekHTML() {
    var days = [0,1,2,3,4,5,6].map(function (i) { return addDays(weekStart, i); });
    var today = iso(new Date());
    var html = '<div class="between" style="margin-bottom:8px"><h3 class="serif">Неделя</h3><div class="row"><button class="btn ghost" data-act="week" data-n="-7">назад</button><button class="btn ghost" data-act="week" data-n="7">вперёд</button></div></div>';
    days.forEach(function (day, i) {
      var ds = iso(day);
      var items = home.events.filter(function (e) { return e.date === ds; });
      html += '<div class="list-item"><div class="between"><strong>' + DAYS[i] + " " + day.getDate() + "</strong>";
      if (ds === today) html += '<span class="pill" style="background:#C97B5C;color:#fff">сегодня</span>';
      html += "</div>";
      if (!items.length) html += '<div class="small">свободно</div>';
      items.forEach(function (e) { html += "<div>" + (e.time ? e.time + " · " : "") + esc(e.title) + "</div>"; });
      html += "</div>";
    });
    html += '<p style="margin-top:10px"><button class="btn accent" data-act="add-event">Добавить</button></p>';
    return html;
  }
  function authHTML() {
    var html = '<div class="app"><div class="hero"><div class="hero-label">Двое</div></div><div class="main">';
    if (authMode === "choose") {
      html += '<div class="card"><h2 class="serif">Вход в дом</h2><p class="muted">Один регистрируется и получает код. Второй входит по коду.</p><button class="btn accent full" data-act="auth-reg">Создать дом</button><button class="btn ghost full" data-act="auth-join">У меня есть код</button></div>';
    }
    if (authMode === "reg") {
      html += '<div class="card"><h2 class="serif">Создать дом</h2><label class="field">Почта<input id="a-email" type="email" placeholder="you@gmail.com"></label><label class="field">Имя<input id="a-name"></label><label class="field">Пароль<input id="a-pass" type="password"></label><button class="btn accent full" data-act="do-reg">Зарегистрироваться</button><p class="small">Письмо-подтверждение заработает после ключа Supabase anon.</p></div>';
    }
    if (authMode === "join") {
      html += '<div class="card"><h2 class="serif">Войти по коду</h2><label class="field">Почта<input id="a-email" type="email"></label><label class="field">Имя<input id="a-name"></label><label class="field">Код дома<input id="a-code" placeholder="ДВОЕ-XXXX"></label><label class="field">Пароль<input id="a-pass" type="password"></label><button class="btn accent full" data-act="do-join">Войти</button></div>';
    }
    html += "</div></div>";
    return html;
  }
  function render() {
    var root = document.getElementById("app");
    if (!session) { root.innerHTML = authHTML(); return; }
    var p = session.body || emptyBody();
    if (!p.name) p.name = session.name;
    var t = targets(p);
    var eaten = eatenToday();
    var body = "";
    if (tab === "home") {
      body += '<div class="card"><h3 class="serif">Метрики сегодня</h3><p class="small">Личные, по вашему телу и общему меню.</p><div class="row">' + bar("Ккал", eaten.kcal, t && t.kcal, "#C97B5C") + bar("Белки", eaten.p, t && t.p, "#2B1810") + '</div><div class="row" style="margin-top:8px">' + bar("Жиры", eaten.f, t && t.f, "#D4A24A") + bar("Углеводы", eaten.c, t && t.c, "#7A8F6A") + "</div></div>";
      body += '<div class="card">' + weekHTML() + "</div>";
    }
    if (tab === "parcels") {
      body += '<div class="between" style="margin-bottom:12px"><h2 class="serif">Посылки</h2><button class="btn accent" data-act="add-parcel">Добавить</button></div>';
      home.parcels.forEach(function (x) {
        var st = x.status === "done" ? "Забрали" : x.status === "pickup" ? "В ПВЗ" : "В пути";
        var bg = x.status === "done" ? "#2B1810" : x.status === "pickup" ? "#7A8F6A" : "#D4A24A";
        body += '<div class="card"><div class="between"><strong>' + esc(x.title) + '</strong><span class="pill" style="background:' + bg + ';color:#fff">' + st + "</span></div>";
        body += '<p class="small">' + esc(x.source) + (x.until ? " · до " + esc(x.until) : "") + "</p>";
        body += '<label class="field">Код выдачи<input data-parcel="' + x.id + '" data-field="pickupCode" value="' + esc(x.pickupCode) + '"></label>';
        body += '<label class="field">Адрес<input data-parcel="' + x.id + '" data-field="address" value="' + esc(x.address) + '"></label>';
        if (x.note) body += '<p class="small">' + esc(x.note) + "</p>";
        if (x.status !== "done") body += '<button class="btn" data-act="done" data-id="' + x.id + '">Забрали</button>';
        body += "</div>";
      });
    }
    if (tab === "menu") {
      body += '<h2 class="serif">Меню</h2><p class="muted">Общее на двоих.</p>';
      ["breakfast","lunch","dinner"].forEach(function (slot) {
        var label = slot === "breakfast" ? "Завтрак" : slot === "lunch" ? "Обед" : "Ужин";
        var m = home.meals.find(function (x) { return x.date === iso(new Date()) && x.slot === slot; });
        body += '<div class="card"><h3 class="serif">' + label + "</h3>";
        if (m) body += "<p>" + esc(m.title) + "</p><p class='small'>" + m.kcal + " ккал · Б " + m.p + " · Ж " + m.f + " · У " + m.c + "</p>";
        else body += '<p class="muted">пусто</p>';
        body += "</div>";
      });
      body += '<div class="card"><label class="field">Новое блюдо<input id="dish"></label><div class="macros"><label class="field">Ккал<input id="dkcal" type="number" inputmode="numeric"></label><label class="field">Белки<input id="dp" type="number" inputmode="numeric"></label><label class="field">Жиры<input id="df" type="number" inputmode="numeric"></label><label class="field">Углеводы<input id="dc" type="number" inputmode="numeric"></label></div><button class="btn accent full" data-act="save-dish">Сохранить как съеденное</button></div>';
    }
    if (tab === "settings") {
      var maleSel = p.sex === "male" ? " selected" : "";
      var femaleSel = p.sex === "female" ? " selected" : "";
      var g1 = p.goal === "maintain" ? " selected" : "";
      var g2 = p.goal === "cut" ? " selected" : "";
      var g3 = p.goal === "bulk" ? " selected" : "";
      body += '<h2 class="serif">Настройки</h2>';
      body += '<div class="card"><h3 class="serif">Аккаунт</h3><p>' + esc(session.email) + '</p><label class="field">Новый пароль<input id="new-pass" type="password"></label><button class="btn ghost full" data-act="save-pass">Сохранить пароль</button></div>';
      body += '<div class="card"><h3 class="serif">Код дома</h3><div class="codebox">' + esc(home.inviteCode) + "</div></div>";
      body += '<div class="card"><h3 class="serif">Тело</h3>';
      body += '<label class="field">Имя<input data-body="name" value="' + esc(p.name) + '"></label>';
      body += '<div class="macros"><label class="field">Рост<input type="number" data-body="heightCm" value="' + esc(p.heightCm) + '"></label><label class="field">Вес<input type="number" data-body="weightKg" value="' + esc(p.weightKg) + '"></label><label class="field">Жир %<input type="number" data-body="bodyFatPct" value="' + esc(p.bodyFatPct) + '"></label><label class="field">Возраст<input type="number" data-body="age" value="' + esc(p.age) + '"></label></div>';
      body += '<label class="field">Пол<select data-body="sex"><option value="male"' + maleSel + '>муж</option><option value="female"' + femaleSel + '>жен</option></select></label>';
      body += '<label class="field">Цель<select data-body="goal"><option value="maintain"' + g1 + '>удержать</option><option value="cut"' + g2 + '>дефицит</option><option value="bulk"' + g3 + '>набор</option></select></label>';
      if (t) body += "<p>Цель: " + t.kcal + " ккал · Б " + t.p + " · Ж " + t.f + " · У " + t.c + "</p>";
      body += "</div><button class='btn ghost full' data-act='logout'>Выйти</button>";
    }
    root.innerHTML =
      '<div class="app"><div class="hero"><div class="hero-label">' + esc(home.homeName || "Двое") + "</div></div>" +
      '<div class="main">' + body + "</div>" +
      '<nav class="tabs"><button class="' + (tab === "home" ? "on" : "") + '" data-act="tab" data-v="home">Дом</button><button class="' + (tab === "parcels" ? "on" : "") + '" data-act="tab" data-v="parcels">Посылки</button><button class="' + (tab === "menu" ? "on" : "") + '" data-act="tab" data-v="menu">Меню</button><button class="' + (tab === "settings" ? "on" : "") + '" data-act="tab" data-v="settings">Настройки</button></nav></div>';
  }
  var root = document.getElementById("app");
  root.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]");
    if (!b) return;
    var act = b.getAttribute("data-act");
    if (act === "auth-reg") authMode = "reg";
    if (act === "auth-join") authMode = "join";
    if (act === "do-reg") {
      var email = (document.getElementById("a-email").value || "").trim();
      var name = (document.getElementById("a-name").value || "").trim() || "Я";
      var pass = document.getElementById("a-pass").value || "";
      if (!email || !pass) return alert("Нужны почта и пароль");
      home = seedHome();
      saveHome();
      session = { email: email, name: name, pass: pass, body: Object.assign(emptyBody(), { name: name, heightCm: 178, weightKg: 82, bodyFatPct: 18, age: 32 }) };
      saveAuth();
    }
    if (act === "do-join") {
      var email2 = (document.getElementById("a-email").value || "").trim();
      var name2 = (document.getElementById("a-name").value || "").trim() || "Я";
      var codeIn = (document.getElementById("a-code").value || "").trim().toUpperCase();
      var pass2 = document.getElementById("a-pass").value || "";
      if (!email2 || !codeIn || !pass2) return alert("Заполните поля");
      if (home.inviteCode !== codeIn) { home.inviteCode = codeIn; saveHome(); }
      session = { email: email2, name: name2, pass: pass2, body: Object.assign(emptyBody(), { name: name2, sex: "female", heightCm: 165, weightKg: 58, bodyFatPct: 24, age: 30, goal: "cut" }) };
      saveAuth();
    }
    if (act === "tab") tab = b.getAttribute("data-v");
    if (act === "week") weekStart = addDays(weekStart, Number(b.getAttribute("data-n")));
    if (act === "add-event") {
      var title = prompt("Название");
      var date = prompt("Дата ГГГГ-ММ-ДД", iso(new Date()));
      if (title && date) { home.events.push({ title: title, date: date, time: "" }); saveHome(); }
    }
    if (act === "add-parcel") {
      var t2 = prompt("Название посылки");
      if (t2) { home.parcels.push({ id: String(Date.now()), source: "Вручную", title: t2, status: "transit", pickupCode: "", address: "", until: "", note: "" }); saveHome(); }
    }
    if (act === "done") {
      home.parcels = home.parcels.map(function (x) { return x.id === b.getAttribute("data-id") ? Object.assign({}, x, { status: "done" }) : x; });
      saveHome();
    }
    if (act === "save-dish") {
      var dishEl = document.getElementById("dish");
      if (!dishEl || !dishEl.value.trim()) return;
      home.meals.push({ date: iso(new Date()), slot: "extra", title: dishEl.value.trim(), kcal: Number(document.getElementById("dkcal").value || 0), p: Number(document.getElementById("dp").value || 0), f: Number(document.getElementById("df").value || 0), c: Number(document.getElementById("dc").value || 0), eaten: true });
      saveHome();
    }
    if (act === "save-pass") {
      var np = document.getElementById("new-pass");
      if (np && np.value) { session.pass = np.value; saveAuth(); alert("Сохранён"); }
    }
    if (act === "logout") { session = null; authMode = "choose"; }
    render();
  });
  root.addEventListener("change", function (e) {
    var el = e.target;
    if (el.getAttribute("data-parcel")) {
      var px = home.parcels.find(function (x) { return x.id === el.getAttribute("data-parcel"); });
      if (px) { px[el.getAttribute("data-field")] = el.value; saveHome(); }
    }
    if (el.getAttribute("data-body") && session) {
      if (!session.body) session.body = emptyBody();
      var val = el.type === "number" ? (el.value === "" ? "" : Number(el.value)) : el.value;
      session.body[el.getAttribute("data-body")] = val;
      saveAuth();
      render();
    }
  });
  try { render(); } catch (err) { root.textContent = "Ошибка: " + err.message; }
})();
