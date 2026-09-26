(function () {
  var SB_URL = "https://aifalmhaqctfrgqbbtgi.supabase.co";
  var SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpZmFsbWhhcWN0ZnJncWJidGdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0NDQ1NzgsImV4cCI6MjEwNjAyMDU3OH0.gbzMRwMqjxz5RqQVLdN_zLdjEWTJ198ftu7pd0FVseQ";
  var sb = window.supabase.createClient(SB_URL, SB_ANON);
  var HOME = "dvoe-home-v4";
  var DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  var user = null, tab = "home", authMode = "choose", notice = "", showPass = false;
  var weekStart = mondayOf(new Date());
  var menuDay = iso(new Date());
  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function mondayOf(d) { var x = new Date(d); x.setHours(0,0,0,0); var day = x.getDay(); x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day)); return x; }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function makeCode() { return "ДВОЕ-" + Math.random().toString(36).slice(2, 6).toUpperCase(); }
  function seedHome() {
    var mon = mondayOf(new Date());
    function d(n) { return iso(addDays(mon, n)); }
    return {
      homeName: "Двое", inviteCode: makeCode(),
      events: [{ title: "Забрать Авито", date: "2026-09-21", time: "18:00" }, { title: "Ужин с родителями", date: d(2), time: "19:00" }, { title: "Продукты", date: d(5), time: "12:00" }],
      parcels: [{ id: "avito1", source: "Авито", title: "70000000518187074", status: "done", pickupCode: "в приложении Авито", address: "ПВЗ Авито" }, { id: "five1", source: "5Post", title: "I-275035137", status: "pickup", pickupCode: "913423120", address: "СПб, Доблести 9с1" }],
      meals: [
        { date: d(0), slot: "breakfast", title: "Овсянка с ягодой", kcal: 380, p: 18, f: 10, c: 52, eaten: true },
        { date: d(0), slot: "lunch", title: "Курица и гречка", kcal: 610, p: 48, f: 16, c: 62, eaten: true },
        { date: d(0), slot: "dinner", title: "Рыба и салат", kcal: 470, p: 36, f: 18, c: 22, eaten: false },
        { date: d(1), slot: "breakfast", title: "Яйца и тост", kcal: 340, p: 22, f: 16, c: 24, eaten: false },
        { date: d(1), slot: "lunch", title: "Борщ и хлеб", kcal: 520, p: 20, f: 18, c: 60, eaten: false },
        { date: d(2), slot: "dinner", title: "Паста с томатами", kcal: 580, p: 22, f: 14, c: 84, eaten: false },
        { date: iso(new Date()), slot: "breakfast", title: "Омлет", kcal: 320, p: 24, f: 20, c: 8, eaten: true },
        { date: iso(new Date()), slot: "lunch", title: "Гречка с индейкой", kcal: 590, p: 42, f: 14, c: 64, eaten: true }
      ]
    };
  }
  function loadHome() { try { var raw = localStorage.getItem(HOME); return raw ? Object.assign(seedHome(), JSON.parse(raw)) : seedHome(); } catch (e) { return seedHome(); } }
  var home = loadHome();
  function saveHome() { localStorage.setItem(HOME, JSON.stringify(home)); }
  function meta() { return (user && user.user_metadata) || {}; }
  function bodyOf() { var m = meta(); return { name: m.name || "", heightCm: m.heightCm || "", weightKg: m.weightKg || "", bodyFatPct: m.bodyFatPct || "", age: m.age || "", sex: m.sex || "male", goal: m.goal || "maintain" }; }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">"); }
  function targets(p) {
    var w = Number(p.weightKg) || 0; if (!w) return null;
    var fat = Number(p.bodyFatPct) || 0, h = Number(p.heightCm) || 0, age = Number(p.age) || 0, bmr = 0;
    if (fat > 0 && fat < 70) bmr = 370 + 21.6 * (w * (1 - fat / 100));
    else if (h && age) bmr = p.sex === "male" ? 10 * w + 6.25 * h - 5 * age + 5 : 10 * w + 6.25 * h - 5 * age - 161;
    else return null;
    var kcal = bmr * 1.375 * ({ maintain: 1, cut: 0.85, bulk: 1.1 }[p.goal] || 1);
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
    return '<div class="metric"><div class="small">' + label + '</div><div class="n">' + val + (goal ? " / " + goal : "") + '</div><div class="bar-wrap"><div class="bar" style="width:' + pct + "%;background:" + color + '"></div></div></div>';
  }
  function icon(name) {
    var p = 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"';
    if (name === "home") return '<svg viewBox="0 0 24 24" ' + p + '><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/></svg>';
    if (name === "box") return '<svg viewBox="0 0 24 24" ' + p + '><path d="M3 8.5 12 4l9 4.5-9 4.5L3 8.5z"/><path d="M3 8.5V16l9 4.5 9-4.5V8.5"/></svg>';
    if (name === "menu") return '<svg viewBox="0 0 24 24" ' + p + '><path d="M4 7h16M4 12h16M4 17h10"/></svg>';
    return '<svg viewBox="0 0 24 24" ' + p + '><circle cx="12" cy="8" r="3.2"/><path d="M5 19.2c1.3-3 3.8-4.5 7-4.5s5.7 1.5 7 4.5"/></svg>';
  }
  function weekHTML() {
    var days = [0,1,2,3,4,5,6].map(function (i) { return addDays(weekStart, i); });
    var today = iso(new Date());
    var html = '<div class="between"><h2 class="serif h2">Неделя</h2><div class="row"><button class="btn ghost" data-act="week" data-n="-7">назад</button><button class="btn ghost" data-act="week" data-n="7">вперёд</button></div></div>';
    days.forEach(function (day, i) {
      var ds = iso(day);
      var items = home.events.filter(function (e) { return e.date === ds; });
      html += '<div class="list-item"><strong>' + DAYS[i] + " " + day.getDate() + (ds === today ? " · сегодня" : "") + "</strong>";
      if (!items.length) html += '<div class="small">свободно</div>';
      items.forEach(function (e) { html += "<div>" + esc(e.title) + "</div>"; });
      html += "</div>";
    });
    html += '<div style="margin-top:10px"><button class="btn accent" data-act="add-event">Добавить событие</button></div>';
    return html;
  }
  function menuHTML() {
    var days = [0,1,2,3,4,5,6].map(function (i) { return addDays(weekStart, i); });
    var html = '<div class="between"><h1 class="serif h1">Меню</h1><div class="row"><button class="btn ghost" data-act="week" data-n="-7">нед −</button><button class="btn ghost" data-act="week" data-n="7">нед +</button></div></div>';
    html += '<p class="lede">Общее на двоих. Листайте дни.</p><div class="days">';
    days.forEach(function (day, i) {
      var ds = iso(day);
      html += '<button class="daychip' + (ds === menuDay ? " on" : "") + '" data-act="menuday" data-d="' + ds + '">' + DAYS[i] + "<br>" + day.getDate() + "</button>";
    });
    html += "</div>";
    [["breakfast","Завтрак"],["lunch","Обед"],["dinner","Ужин"]].forEach(function (s) {
      var m = home.meals.find(function (x) { return x.date === menuDay && x.slot === s[0]; });
      html += '<div class="card"><div class="small">' + s[1] + "</div>";
      if (m) html += "<p class='serif h2'>" + esc(m.title) + "</p><p class='small'>" + m.kcal + " ккал · Б " + m.p + " · Ж " + m.f + " · У " + m.c + "</p>";
      else html += '<p class="muted">пока пусто</p>';
      html += "</div>";
    });
    html += '<div class="card"><h2 class="serif h2">Добавить блюдо</h2><label class="field">Название<input id="dish"></label><div class="macros"><label class="field">Ккал<input id="dkcal" type="number"></label><label class="field">Белки<input id="dp" type="number"></label><label class="field">Жиры<input id="df" type="number"></label><label class="field">Углеводы<input id="dc" type="number"></label></div><button class="btn accent" data-act="save-dish">Сохранить блюдо</button></div>';
    return html;
  }
  function authHTML() {
    var html = '<div class="app"><div class="hero"><div><div class="hero-kicker">дом на двоих</div><div class="hero-label serif">Двое</div></div></div><div class="main">';
    if (notice) html += '<div class="card"><p>' + esc(notice) + "</p></div>";
    if (authMode === "choose") html += '<div class="card"><h1 class="serif h1">Вход</h1><p class="lede">Один создаёт дом, второй заходит по коду.</p><div class="row"><button class="btn accent" data-act="auth-reg">Создать дом</button><button class="btn ghost" data-act="auth-join">Есть код</button><button class="btn ghost" data-act="auth-login">Уже есть аккаунт</button></div></div>';
    if (authMode === "reg") html += '<div class="card"><h1 class="serif h1">Создать дом</h1><label class="field">Gmail<input id="a-email" type="email"></label><label class="field">Имя<input id="a-name"></label><label class="field">Пароль<input id="a-pass" type="password"></label><button class="btn accent" data-act="do-reg">Получить письмо</button></div>';
    if (authMode === "join") html += '<div class="card"><h1 class="serif h1">Код дома</h1><label class="field">Gmail<input id="a-email" type="email"></label><label class="field">Имя<input id="a-name"></label><label class="field">Код<input id="a-code"></label><label class="field">Пароль<input id="a-pass" type="password"></label><button class="btn accent" data-act="do-join">Получить письмо</button></div>';
    if (authMode === "login") html += '<div class="card"><h1 class="serif h1">Войти</h1><label class="field">Почта<input id="a-email" type="email"></label><label class="field">Пароль<input id="a-pass" type="password"></label><button class="btn accent" data-act="do-login">Войти</button></div>';
    html += "</div></div>"; return html;
  }
  function tabs() {
    return '<nav class="tabs"><button class="' + (tab==="home"?"on":"") + '" data-act="tab" data-v="home">' + icon("home") + 'Дом</button><button class="' + (tab==="parcels"?"on":"") + '" data-act="tab" data-v="parcels">' + icon("box") + 'Посылки</button><button class="' + (tab==="menu"?"on":"") + '" data-act="tab" data-v="menu">' + icon("menu") + 'Меню</button><button class="' + (tab==="settings"?"on":"") + '" data-act="tab" data-v="settings">' + icon("user") + 'Настройки</button></nav>';
  }
  function render() {
    var root = document.getElementById("app");
    if (!user) { root.innerHTML = authHTML(); return; }
    var p = bodyOf(); var t = targets(p); var eaten = eatenToday();
    var invite = meta().invite_code || home.inviteCode; var body = "";
    if (tab === "home") {
      body += '<h1 class="serif h1">Сегодня</h1><p class="lede">Личные метрики и общий календарь.</p>';
      body += '<div class="row" style="margin-bottom:12px">' + bar("Ккал", eaten.kcal, t && t.kcal, "#C97B5C") + bar("Белки", eaten.p, t && t.p, "#2B1810") + "</div>";
      body += '<div class="row" style="margin-bottom:12px">' + bar("Жиры", eaten.f, t && t.f, "#D4A24A") + bar("Углеводы", eaten.c, t && t.c, "#7A8F6A") + "</div>";
      body += '<div class="card">' + weekHTML() + "</div>";
    }
    if (tab === "parcels") {
      body += '<div class="between"><h1 class="serif h1">Посылки</h1><button class="btn accent" data-act="add-parcel">Добавить</button></div><p class="lede">Общие карточки.</p>';
      home.parcels.forEach(function (x) {
        body += '<div class="card"><div class="between"><strong>' + esc(x.title) + '</strong><span class="pill">' + (x.status==="done"?"Забрали":"В ПВЗ") + "</span></div>";
        body += '<label class="field">Код<input data-parcel="' + x.id + '" data-field="pickupCode" value="' + esc(x.pickupCode) + '"></label>';
        body += '<label class="field">Адрес<input data-parcel="' + x.id + '" data-field="address" value="' + esc(x.address) + '"></label>';
        if (x.status !== "done") body += '<button class="btn" data-act="done" data-id="' + x.id + '">Забрали</button>';
        body += "</div>";
      });
    }
    if (tab === "menu") body += menuHTML();
    if (tab === "settings") {
      body += '<h1 class="serif h1">Настройки</h1><p class="lede">' + esc(user.email) + "</p>";
      body += '<div class="card"><div class="small">Код дома</div><div class="codebox serif">' + esc(invite) + "</div></div>";
      body += '<div class="card"><h2 class="serif h2">Показания тела</h2><label class="field">Имя<input id="b-name" value="' + esc(p.name) + '"></label>';
      body += '<div class="macros"><label class="field">Рост<input id="b-h" type="number" value="' + esc(p.heightCm) + '"></label><label class="field">Вес<input id="b-w" type="number" value="' + esc(p.weightKg) + '"></label><label class="field">Жир %<input id="b-f" type="number" value="' + esc(p.bodyFatPct) + '"></label><label class="field">Возраст<input id="b-a" type="number" value="' + esc(p.age) + '"></label></div>';
      if (t) body += '<p class="small">Цель: ' + t.kcal + " ккал</p>";
      body += '<button class="btn accent" data-act="save-body">Сохранить тело</button></div>';
      body += '<div class="card"><h2 class="serif h2">Пароль</h2>';
      if (!showPass) body += '<button class="btn ghost" data-act="open-pass">Сменить пароль</button>';
      else body += '<label class="field">Новый пароль<input id="new-pass" type="password"></label><button class="btn accent" data-act="save-pass">Сохранить пароль</button>';
      body += '</div><button class="btn ghost" data-act="logout">Выйти</button>';
    }
    root.innerHTML = '<div class="app"><div class="hero"><div><div class="hero-kicker">наш дом</div><div class="hero-label serif">Двое</div></div></div><div class="main">' + body + "</div>" + tabs() + "</div>";
  }
  function redirectTo() { return "https://ewblycom.github.io/dvoe/"; }
  document.getElementById("app").addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    var act = b.getAttribute("data-act");
    if (act === "auth-reg") { authMode = "reg"; render(); }
    if (act === "auth-join") { authMode = "join"; render(); }
    if (act === "auth-login") { authMode = "login"; render(); }
    if (act === "tab") { tab = b.getAttribute("data-v"); render(); }
    if (act === "week") { weekStart = addDays(weekStart, Number(b.getAttribute("data-n"))); if (tab === "menu") menuDay = iso(weekStart); render(); }
    if (act === "menuday") { menuDay = b.getAttribute("data-d"); render(); }
    if (act === "open-pass") { showPass = true; render(); }
    if (act === "do-reg") {
      var email = document.getElementById("a-email").value.trim();
      var name = document.getElementById("a-name").value.trim() || "Я";
      var pass = document.getElementById("a-pass").value;
      if (!email || !pass) return alert("Почта и пароль");
      var invite = makeCode();
      sb.auth.signUp({ email: email, password: pass, options: { emailRedirectTo: redirectTo(), data: { name: name, invite_code: invite, role: "owner" } } }).then(function (res) {
        if (res.error) { notice = res.error.message; render(); return; }
        home.inviteCode = invite; saveHome();
        if (res.data.session) { user = res.data.user; render(); } else { notice = "Письмо отправлено на " + email; authMode = "login"; render(); }
      });
    }
    if (act === "do-join") {
      var email2 = document.getElementById("a-email").value.trim();
      var name2 = document.getElementById("a-name").value.trim() || "Я";
      var codeIn = document.getElementById("a-code").value.trim().toUpperCase();
      var pass2 = document.getElementById("a-pass").value;
      if (!email2 || !pass2 || !codeIn) return alert("Заполните поля");
      sb.auth.signUp({ email: email2, password: pass2, options: { emailRedirectTo: redirectTo(), data: { name: name2, invite_code: codeIn, role: "member" } } }).then(function (res) {
        if (res.error) { notice = res.error.message; render(); return; }
        home.inviteCode = codeIn; saveHome();
        if (res.data.session) { user = res.data.user; render(); } else { notice = "Письмо отправлено на " + email2; authMode = "login"; render(); }
      });
    }
    if (act === "do-login") {
      sb.auth.signInWithPassword({ email: document.getElementById("a-email").value.trim(), password: document.getElementById("a-pass").value }).then(function (res) {
        if (res.error) { notice = res.error.message; render(); return; }
        user = res.data.user; render();
      });
    }
    if (act === "save-body") {
      sb.auth.updateUser({ data: { name: document.getElementById("b-name").value, heightCm: document.getElementById("b-h").value, weightKg: document.getElementById("b-w").value, bodyFatPct: document.getElementById("b-f").value, age: document.getElementById("b-a").value } }).then(function (res) {
        if (res.error) alert(res.error.message); else { user = res.data.user; alert("Тело сохранено"); render(); }
      });
    }
    if (act === "save-pass") {
      var np = document.getElementById("new-pass"); if (!np || !np.value) return;
      sb.auth.updateUser({ password: np.value }).then(function (res) { alert(res.error ? res.error.message : "Пароль обновлён"); showPass = false; render(); });
    }
    if (act === "logout") sb.auth.signOut().then(function () { user = null; authMode = "choose"; render(); });
    if (act === "add-event") { var title = prompt("Название"); var date = prompt("Дата", iso(new Date())); if (title && date) { home.events.push({ title: title, date: date, time: "" }); saveHome(); render(); } }
    if (act === "add-parcel") { var t2 = prompt("Посылка"); if (t2) { home.parcels.push({ id: String(Date.now()), source: "Вручную", title: t2, status: "transit", pickupCode: "", address: "" }); saveHome(); render(); } }
    if (act === "done") { home.parcels = home.parcels.map(function (x) { return x.id === b.getAttribute("data-id") ? Object.assign({}, x, { status: "done" }) : x; }); saveHome(); render(); }
    if (act === "save-dish") {
      var dishEl = document.getElementById("dish"); if (!dishEl || !dishEl.value.trim()) return;
      home.meals.push({ date: menuDay, slot: "extra", title: dishEl.value.trim(), kcal: Number(document.getElementById("dkcal").value || 0), p: Number(document.getElementById("dp").value || 0), f: Number(document.getElementById("df").value || 0), c: Number(document.getElementById("dc").value || 0), eaten: true });
      saveHome(); render();
    }
  });
  document.getElementById("app").addEventListener("change", function (e) {
    var el = e.target;
    if (el.getAttribute("data-parcel")) {
      var px = home.parcels.find(function (x) { return x.id === el.getAttribute("data-parcel"); });
      if (px) { px[el.getAttribute("data-field")] = el.value; saveHome(); }
    }
  });
  sb.auth.getSession().then(function (res) { user = res.data.session ? res.data.session.user : null; render(); }).catch(function (err) { document.getElementById("app").textContent = "Ошибка: " + err.message; });
})();
