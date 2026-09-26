(function () {
  var SB_URL = "https://aifalmhaqctfrgqbbtgi.supabase.co";
  var SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpZmFsbWhhcWN0ZnJncWJidGdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0NDQ1NzgsImV4cCI6MjEwNjAyMDU3OH0.gbzMRwMqjxz5RqQVLdN_zLdjEWTJ198ftu7pd0FVseQ";
  var sb = window.supabase.createClient(SB_URL, SB_ANON);
  var HOME = "dvoe-home-v4";
  var DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  var user = null;
  var tab = "home";
  var authMode = "choose";
  var notice = "";
  var weekStart = mondayOf(new Date());
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
  function makeCode() { return "ДВОЕ-" + Math.random().toString(36).slice(2, 6).toUpperCase(); }
  function seedHome(code) {
    var mon = mondayOf(new Date());
    function d(n) { return iso(addDays(mon, n)); }
    return {
      homeName: "Двое",
      inviteCode: code || makeCode(),
      events: [{ title: "Забрать Авито", date: "2026-09-21", time: "18:00" }, { title: "Ужин с родителями", date: d(2), time: "19:00" }],
      parcels: [
        { id: "avito1", source: "Авито", title: "70000000518187074", status: "done", pickupCode: "в приложении Авито", address: "ПВЗ Авито", until: "2026-09-28", note: "" },
        { id: "five1", source: "5Post", title: "I-275035137", status: "pickup", pickupCode: "913423120", address: "СПб, Доблести 9с1", until: "2026-09-20", note: "" }
      ],
      meals: [
        { date: iso(new Date()), slot: "breakfast", title: "Овсянка", kcal: 420, p: 28, f: 14, c: 45, eaten: true },
        { date: iso(new Date()), slot: "lunch", title: "Гречка", kcal: 610, p: 48, f: 16, c: 62, eaten: true }
      ]
    };
  }
  function loadHome() {
    try { var raw = localStorage.getItem(HOME); return raw ? Object.assign(seedHome(), JSON.parse(raw)) : seedHome(); }
    catch (e) { return seedHome(); }
  }
  var home = loadHome();
  function saveHome() { localStorage.setItem(HOME, JSON.stringify(home)); }
  function meta() { return (user && user.user_metadata) || {}; }
  function bodyOf() {
    var m = meta();
    return { name: m.name || "", heightCm: m.heightCm || "", weightKg: m.weightKg || "", bodyFatPct: m.bodyFatPct || "", age: m.age || "", sex: m.sex || "male", activity: m.activity || "light", goal: m.goal || "maintain" };
  }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">"); }
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
    return '<div class="metric"><div class="small">' + label + '</div><div class="n">' + val + (goal ? " / " + goal : "") + '</div><div class="bar-wrap"><div class="bar" style="width:' + pct + "%;background:" + color + '"></div></div></div>';
  }
  function weekHTML() {
    var days = [0,1,2,3,4,5,6].map(function (i) { return addDays(weekStart, i); });
    var today = iso(new Date());
    var html = '<div class="between" style="margin-bottom:8px"><h3 class="serif">Неделя</h3><div class="row"><button class="btn ghost" data-act="week" data-n="-7">назад</button><button class="btn ghost" data-act="week" data-n="7">вперёд</button></div></div>';
    days.forEach(function (day, i) {
      var ds = iso(day);
      var items = home.events.filter(function (e) { return e.date === ds; });
      html += '<div class="list-item"><strong>' + DAYS[i] + " " + day.getDate() + (ds === today ? " · сегодня" : "") + "</strong>";
      if (!items.length) html += '<div class="small">свободно</div>';
      items.forEach(function (e) { html += "<div>" + esc(e.title) + "</div>"; });
      html += "</div>";
    });
    html += '<p style="margin-top:10px"><button class="btn accent" data-act="add-event">Добавить</button></p>';
    return html;
  }
  function authHTML() {
    var html = '<div class="app"><div class="hero"><div class="hero-label">Двое</div></div><div class="main">';
    if (notice) html += '<div class="card"><p>' + esc(notice) + "</p></div>";
    if (authMode === "choose") html += '<div class="card"><h2 class="serif">Вход</h2><button class="btn accent full" data-act="auth-reg">Создать дом</button><button class="btn ghost full" data-act="auth-join">У меня есть код</button><button class="btn ghost full" data-act="auth-login">Уже есть аккаунт</button></div>';
    if (authMode === "reg") html += '<div class="card"><h2 class="serif">Создать дом</h2><label class="field">Gmail<input id="a-email" type="email"></label><label class="field">Имя<input id="a-name"></label><label class="field">Пароль<input id="a-pass" type="password"></label><button class="btn accent full" data-act="do-reg">Получить письмо</button></div>';
    if (authMode === "join") html += '<div class="card"><h2 class="serif">Войти по коду</h2><label class="field">Gmail<input id="a-email" type="email"></label><label class="field">Имя<input id="a-name"></label><label class="field">Код<input id="a-code"></label><label class="field">Пароль<input id="a-pass" type="password"></label><button class="btn accent full" data-act="do-join">Получить письмо</button></div>';
    if (authMode === "login") html += '<div class="card"><h2 class="serif">Вход</h2><label class="field">Почта<input id="a-email" type="email"></label><label class="field">Пароль<input id="a-pass" type="password"></label><button class="btn accent full" data-act="do-login">Войти</button></div>';
    html += "</div></div>";
    return html;
  }
  function render() {
    var root = document.getElementById("app");
    if (!user) { root.innerHTML = authHTML(); return; }
    var p = bodyOf();
    var t = targets(p);
    var eaten = eatenToday();
    var invite = meta().invite_code || home.inviteCode;
    var body = "";
    if (tab === "home") {
      body += '<div class="card"><h3 class="serif">Метрики</h3><div class="row">' + bar("Ккал", eaten.kcal, t && t.kcal, "#C97B5C") + bar("Белки", eaten.p, t && t.p, "#2B1810") + '</div><div class="row" style="margin-top:8px">' + bar("Жиры", eaten.f, t && t.f, "#D4A24A") + bar("Углеводы", eaten.c, t && t.c, "#7A8F6A") + "</div></div>";
      body += '<div class="card">' + weekHTML() + "</div>";
    }
    if (tab === "parcels") {
      body += '<div class="between" style="margin-bottom:12px"><h2 class="serif">Посылки</h2><button class="btn accent" data-act="add-parcel">Добавить</button></div>';
      home.parcels.forEach(function (x) {
        var st = x.status === "done" ? "Забрали" : "В ПВЗ";
        body += '<div class="card"><div class="between"><strong>' + esc(x.title) + '</strong><span class="pill" style="background:#7A8F6A;color:#fff">' + st + "</span></div>";
        body += '<label class="field">Код<input data-parcel="' + x.id + '" data-field="pickupCode" value="' + esc(x.pickupCode) + '"></label>';
        body += '<label class="field">Адрес<input data-parcel="' + x.id + '" data-field="address" value="' + esc(x.address) + '"></label></div>';
      });
    }
    if (tab === "menu") {
      body += '<h2 class="serif">Меню</h2><div class="card"><label class="field">Блюдо<input id="dish"></label><div class="macros"><label class="field">Ккал<input id="dkcal" type="number"></label><label class="field">Б<input id="dp" type="number"></label><label class="field">Ж<input id="df" type="number"></label><label class="field">У<input id="dc" type="number"></label></div><button class="btn accent full" data-act="save-dish">Сохранить</button></div>';
    }
    if (tab === "settings") {
      body += '<h2 class="serif">Настройки</h2><div class="card"><p>' + esc(user.email) + '</p><label class="field">Новый пароль<input id="new-pass" type="password"></label><button class="btn ghost full" data-act="save-pass">Сменить</button></div>';
      body += '<div class="card"><h3 class="serif">Код дома</h3><div class="codebox">' + esc(invite) + "</div></div>";
      body += '<div class="card"><label class="field">Имя<input data-body="name" value="' + esc(p.name) + '"></label><div class="macros"><label class="field">Рост<input type="number" data-body="heightCm" value="' + esc(p.heightCm) + '"></label><label class="field">Вес<input type="number" data-body="weightKg" value="' + esc(p.weightKg) + '"></label></div></div>';
      body += "<button class='btn ghost full' data-act='logout'>Выйти</button>";
    }
    root.innerHTML = '<div class="app"><div class="hero"><div class="hero-label">Двое</div></div><div class="main">' + body + '</div><nav class="tabs"><button class="' + (tab === "home" ? "on" : "") + '" data-act="tab" data-v="home">Дом</button><button class="' + (tab === "parcels" ? "on" : "") + '" data-act="tab" data-v="parcels">Посылки</button><button class="' + (tab === "menu" ? "on" : "") + '" data-act="tab" data-v="menu">Меню</button><button class="' + (tab === "settings" ? "on" : "") + '" data-act="tab" data-v="settings">Настройки</button></nav></div>';
  }
  function redirectTo() { return "https://ewblycom.github.io/dvoe/"; }
  document.getElementById("app").addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    var act = b.getAttribute("data-act");
    if (act === "auth-reg") { authMode = "reg"; render(); }
    if (act === "auth-join") { authMode = "join"; render(); }
    if (act === "auth-login") { authMode = "login"; render(); }
    if (act === "tab") { tab = b.getAttribute("data-v"); render(); }
    if (act === "week") { weekStart = addDays(weekStart, Number(b.getAttribute("data-n"))); render(); }
    if (act === "do-reg") {
      var email = document.getElementById("a-email").value.trim();
      var name = document.getElementById("a-name").value.trim() || "Я";
      var pass = document.getElementById("a-pass").value;
      if (!email || !pass) return alert("Почта и пароль");
      var invite = makeCode();
      sb.auth.signUp({ email: email, password: pass, options: { emailRedirectTo: redirectTo(), data: { name: name, invite_code: invite, role: "owner" } } }).then(function (res) {
        if (res.error) { notice = res.error.message; render(); return; }
        home.inviteCode = invite; saveHome();
        if (res.data.session) { user = res.data.user; render(); }
        else { notice = "Письмо отправлено на " + email; authMode = "login"; render(); }
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
        if (res.data.session) { user = res.data.user; render(); }
        else { notice = "Письмо отправлено на " + email2; authMode = "login"; render(); }
      });
    }
    if (act === "do-login") {
      sb.auth.signInWithPassword({ email: document.getElementById("a-email").value.trim(), password: document.getElementById("a-pass").value }).then(function (res) {
        if (res.error) { notice = res.error.message; render(); return; }
        user = res.data.user; render();
      });
    }
    if (act === "save-pass") {
      var np = document.getElementById("new-pass");
      if (np && np.value) sb.auth.updateUser({ password: np.value }).then(function (res) { alert(res.error ? res.error.message : "Ок"); });
    }
    if (act === "logout") sb.auth.signOut().then(function () { user = null; authMode = "choose"; render(); });
    if (act === "add-event") {
      var title = prompt("Название"); var date = prompt("Дата", iso(new Date()));
      if (title && date) { home.events.push({ title: title, date: date, time: "" }); saveHome(); render(); }
    }
    if (act === "add-parcel") {
      var t2 = prompt("Посылка");
      if (t2) { home.parcels.push({ id: String(Date.now()), source: "Вручную", title: t2, status: "transit", pickupCode: "", address: "" }); saveHome(); render(); }
    }
    if (act === "save-dish") {
      var dishEl = document.getElementById("dish");
      if (!dishEl || !dishEl.value.trim()) return;
      home.meals.push({ date: iso(new Date()), slot: "extra", title: dishEl.value.trim(), kcal: Number(document.getElementById("dkcal").value || 0), p: Number(document.getElementById("dp").value || 0), f: Number(document.getElementById("df").value || 0), c: Number(document.getElementById("dc").value || 0), eaten: true });
      saveHome(); render();
    }
  });
  document.getElementById("app").addEventListener("change", function (e) {
    var el = e.target;
    if (el.getAttribute("data-parcel")) {
      var px = home.parcels.find(function (x) { return x.id === el.getAttribute("data-parcel"); });
      if (px) { px[el.getAttribute("data-field")] = el.value; saveHome(); }
    }
    if (el.getAttribute("data-body") && user) {
      var patch = {};
      patch[el.getAttribute("data-body")] = el.type === "number" ? Number(el.value) : el.value;
      sb.auth.updateUser({ data: patch });
    }
  });
  sb.auth.getSession().then(function (res) {
    user = res.data.session ? res.data.session.user : null;
    render();
  }).catch(function (err) {
    document.getElementById("app").textContent = "Ошибка: " + err.message;
  });
})();
