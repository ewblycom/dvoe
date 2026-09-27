(function () {
  var SB_URL = "https://aifalmhaqctfrgqbbtgi.supabase.co";
  var SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpZmFsbWhhcWN0ZnJncWJidGdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0NDQ1NzgsImV4cCI6MjEwNjAyMDU3OH0.gbzMRwMqjxz5RqQVLdN_zLdjEWTJ198ftu7pd0FVseQ";
  var sb = window.supabase.createClient(SB_URL, SB_ANON);
  var HOME = "dvoe-home-v5";
  var DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  var DAYFULL = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
  var MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  var MONTH_TITLE = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  var STEPS = [{ key: "paid", label: "Заказ" }, { key: "transit", label: "В пути" }, { key: "pickup", label: "В ПВЗ" }, { key: "done", label: "Получена" }];
  var STEP_ORDER = { paid: 0, transit: 1, pickup: 2, done: 3 };
  var user = null, tab = "home", authMode = "choose", notice = "", showPass = false, showBody = false, lastEmail = "";
  var weekStart = mondayOf(new Date());
  var menuDay = iso(new Date());
  var calCursor = new Date(); calCursor.setDate(1);
  var selectedDay = iso(new Date());
  var parcelQuery = "";
  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function mondayOf(d) { var x = new Date(d); x.setHours(0,0,0,0); var day = x.getDay(); x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day)); return x; }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function weekLabel(start) { var end = addDays(start, 6); return start.getDate() + " " + MONTHS[start.getMonth()] + " — " + end.getDate() + " " + MONTHS[end.getMonth()]; }
  function authMsg(msg) {
    var m = String(msg || "");
    if (/invalid login/i.test(m)) return "Неверный email или пароль. Регистрировались на ewblycom@icloud.com.";
    if (/already registered|already been registered/i.test(m)) return "Этот email уже зарегистрирован. Нажмите «Уже есть аккаунт».";
    return m;
  }
  function makeCode() { return "ДВОЕ-" + Math.random().toString(36).slice(2, 6).toUpperCase(); }
  function seedHome() {
    return {
      homeName: "Двое", inviteCode: makeCode(),
      events: [{ title: "Забрать Авито", date: "2026-09-21", time: "18:00" }, { title: "Ужин с родителями", date: "2026-09-29", time: "19:00" }],
      parcels: [
        { id: "avito1", source: "Авито", title: "70000000518187074", status: "done", pickupCode: "в приложении Авито", address: "ПВЗ", weight: "1.1 кг", eta: "Забрали 21.09", note: "Заказ с Авито" },
        { id: "five1", source: "5Post", title: "I-275035137", status: "pickup", pickupCode: "913423120", address: "Доблести 9с1", weight: "0.4 кг", eta: "До 20.09", note: "Golden Apple" }
      ],
      meals: [
        { date: iso(new Date()), slot: "breakfast", title: "Омлет", kcal: 320, p: 24, f: 20, c: 8, eaten: true },
        { date: iso(new Date()), slot: "lunch", title: "Гречка", kcal: 590, p: 42, f: 14, c: 64, eaten: true }
      ]
    };
  }
  function loadHome() { try { var raw = localStorage.getItem(HOME); return raw ? Object.assign(seedHome(), JSON.parse(raw)) : seedHome(); } catch (e) { return seedHome(); } }
  var home = loadHome();
  function saveHome() { localStorage.setItem(HOME, JSON.stringify(home)); }
  function meta() { return (user && user.user_metadata) || {}; }
  function bodyOf() { var m = meta(); return { name: m.name || "", heightCm: m.heightCm || "", weightKg: m.weightKg || "", bodyFatPct: m.bodyFatPct || "", age: m.age || "", sex: m.sex || "male", goal: m.goal || "maintain" }; }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function targets(p) {
    var w = Number(p.weightKg) || 0; if (!w) return null;
    var fat = Number(p.bodyFatPct) || 0, h = Number(p.heightCm) || 0, age = Number(p.age) || 0, bmr = 0;
    if (fat > 0 && fat < 70) bmr = 370 + 21.6 * (w * (1 - fat / 100));
    else if (h && age) bmr = p.sex === "male" ? 10 * w + 6.25 * h - 5 * age + 5 : 10 * w + 6.25 * h - 5 * age - 161;
    else return null;
    var kcal = bmr * 1.375 * ({ maintain: 1, cut: 0.8, bulk: 1.15 }[p.goal] || 1);
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
  function svg(d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>"; }
  function icon(name) {
    if (name === "cal") return svg('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>');
    if (name === "box") return svg('<path d="M3 8.5 12 4l9 4.5-9 4.5L3 8.5z"/><path d="M3 8.5V16l9 4.5 9-4.5V8.5"/>');
    if (name === "menu") return svg('<path d="M4 6h16M4 12h16M4 18h10"/>');
    if (name === "flag") return svg('<path d="M5 21V4h9l-1.2 3.5L14 11H5"/>');
    if (name === "folder") return svg('<path d="M3 7h6l2 2h10v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>');
    if (name === "card") return svg('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/>');
    if (name === "help") return svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.7.4-1.4 1-1.4 2"/><path d="M12 17h.01"/>');
    if (name === "mail") return svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>');
    if (name === "check") return svg('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>');
    if (name === "radar") return svg('<path d="M4 12a8 8 0 0 1 16 0"/><path d="M7 12a5 5 0 0 1 10 0"/><circle cx="12" cy="12" r="1.4"/>');
    if (name === "note") return svg('<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>');
    if (name === "gear") return svg('<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M4.9 6.5l1.5 1.5M17.6 16l1.5 1.5M3 12h2M19 12h2M4.9 17.5l1.5-1.5M17.6 8l1.5-1.5"/>');
    if (name === "lock") return svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>');
    if (name === "body") return svg('<circle cx="12" cy="6" r="2.4"/><path d="M6 20c.8-4 3-6 6-6s5.2 2 6 6"/>');
    if (name === "send") return svg('<path d="M4 12 20 5 13 20l-2-7z"/>');
    if (name === "search") return svg('<circle cx="11" cy="11" r="6"/><path d="m20 20-4-4"/>');
    if (name === "scan") return svg('<path d="M5 8V6a1 1 0 0 1 1-1h2M5 16v2a1 1 0 0 0 1 1h2M19 8V6a1 1 0 0 0-1-1h-2M19 16v2a1 1 0 0 1-1 1h-2"/>');
    if (name === "more") return svg('<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>');
    if (name === "user") return svg('<circle cx="12" cy="8" r="3.2"/><path d="M5 19.2c1.3-3 3.8-4.5 7-4.5s5.7 1.5 7 4.5"/>');
    if (name === "out") return svg('<path d="M10 7V5a1 1 0 0 1 1-1h8v16h-8a1 1 0 0 1-1-1v-2M4 12h11M8 8l-4 4 4 4"/>');
    return svg('<circle cx="12" cy="12" r="8"/>');
  }
  function weChip() { return '<button class="we" type="button"><span>Мы</span><span class="dot"></span></button>'; }
  function statusMeta(st) {
    if (st === "done") return { text: "Получена", cls: "done" };
    if (st === "pickup") return { text: "В ПВЗ", cls: "pickup" };
    if (st === "transit") return { text: "В пути", cls: "" };
    return { text: "Оплачен", cls: "" };
  }
  function parcelCard(x) {
    var st = statusMeta(x.status);
    var idx = STEP_ORDER[x.status] == null ? 1 : STEP_ORDER[x.status];
    var steps = STEPS.map(function (s, i) { return '<div class="st' + (i <= idx ? " on" : "") + '"><div class="bar"></div><div class="lab">' + s.label + "</div></div>"; }).join("");
    return '<div class="ship"><div class="ship-top"><div class="ship-ico">' + icon("box") + '</div><div><div class="ship-id">#' + esc(x.title) + '</div><div class="ship-sub">' + esc(x.source) + (x.note ? " · " + esc(x.note) : "") + (x.weight ? " · " + esc(x.weight) : "") + '</div></div><span class="status ' + st.cls + '">• ' + st.text + '</span></div><div class="eta"><b>' + esc(x.eta || "Срок уточняется") + "</b> · " + esc(x.address || "Адрес не указан") + (x.pickupCode ? "<br>Код: " + esc(x.pickupCode) : "") + '</div><div class="steps">' + steps + '</div><div class="row" style="margin-top:12px;gap:6px;flex-wrap:wrap">' + STEPS.map(function (s) { return '<button class="btn sm ghost" style="min-height:32px;padding:6px 10px;font-size:12px;background:#111;color:#fff;border:1px solid #333" data-act="status" data-id="' + x.id + '" data-status="' + s.key + '">' + s.label + "</button>"; }).join("") + "</div></div>";
  }
  function promoCard() {
    return '<div class="promo"><div><div class="tag">Быстро. Вместе. Дома.</div><h3>То, что важно<br>довезём.</h3><p>С Авито и 5Post — партнёр видит код и адрес сразу.</p><button class="btn orange sm" data-act="add-parcel">Добавить →</button></div><svg class="illus" viewBox="0 0 160 110" fill="none"><ellipse cx="96" cy="86" rx="46" ry="10" fill="#ead9c4"/><path d="M118 78c18-2 28-14 24-22" stroke="#e07a3a" stroke-width="2"/><circle cx="146" cy="52" r="8" fill="#e07a3a"/><path d="M146 46v12M140 52h12" stroke="#fff" stroke-width="1.6"/><rect x="58" y="38" width="52" height="40" rx="6" fill="#e07a3a"/><path d="M58 52h52" stroke="#fff" stroke-opacity=".35"/><path d="M84 38v40" stroke="#fff" stroke-opacity=".35"/><rect x="70" y="28" width="28" height="12" rx="3" fill="#f3c4a4"/></svg></div>';
  }
  function calendarHTML() {
    var y = calCursor.getFullYear(), m = calCursor.getMonth();
    var first = new Date(y, m, 1);
    var startOffset = (first.getDay() + 6) % 7;
    var daysIn = new Date(y, m + 1, 0).getDate();
    var prevIn = new Date(y, m, 0).getDate();
    var today = iso(new Date());
    var cells = [], i;
    for (i = 0; i < startOffset; i++) {
      var pd = prevIn - startOffset + i + 1;
      var pm = m === 0 ? 11 : m - 1, py = m === 0 ? y - 1 : y;
      cells.push({ d: pd, iso: py + "-" + String(pm + 1).padStart(2, "0") + "-" + String(pd).padStart(2, "0"), out: true });
    }
    for (i = 1; i <= daysIn; i++) cells.push({ d: i, iso: y + "-" + String(m + 1).padStart(2, "0") + "-" + String(i).padStart(2, "0"), out: false });
    while (cells.length % 7 !== 0 || cells.length < 42) {
      var n = cells.length - startOffset - daysIn + 1;
      var nm = m === 11 ? 0 : m + 1, ny = m === 11 ? y + 1 : y;
      cells.push({ d: n, iso: ny + "-" + String(nm + 1).padStart(2, "0") + "-" + String(n).padStart(2, "0"), out: true });
    }
    var grid = cells.map(function (c) {
      var ev = home.events.some(function (e) { return e.date === c.iso; });
      var cls = "cell" + (c.out ? " out" : "") + (c.iso === today ? " today" : "") + (c.iso === selectedDay ? " sel" : "");
      return '<button class="' + cls + '" data-act="pick-day" data-d="' + c.iso + '"><span>' + c.d + "</span>" + (ev ? '<i class="dot-ev"></i>' : "") + "</button>";
    }).join("");
    var upcoming = home.events.filter(function (e) { return e.date >= today; }).sort(function (a, b) { return a.date.localeCompare(b.date); }).slice(0, 4);
    var html = '<div class="kicker">' + DAYFULL[new Date().getDay()] + "<br>" + new Date().getDate() + ". " + (new Date().getMonth() + 1) + '.</div>';
    html += '<div class="cal-head"><div class="title">' + MONTH_TITLE[m] + '</div><button class="icon-btn" data-act="tab" data-v="menu">' + icon("cal") + '</button><div class="cal-nav"><button data-act="cal" data-n="-1">‹</button><button data-act="cal" data-n="1">›</button></div>' + weChip() + "</div>";
    html += '<div class="wdays">' + DAYS.map(function (d) { return "<div>" + d + "</div>"; }).join("") + '</div><div class="grid">' + grid + "</div>";
    html += '<div class="between" style="margin-top:8px"><div class="section-label" style="margin:8px 0">Ближайшие</div><button class="link" data-act="add-event">Добавить</button></div>';
    if (!upcoming.length) html += '<div class="empty">Ближайших дат нет. Добавьте событие —<br>партнёр увидит его сразу.</div>';
    else {
      html += '<div class="card">';
      upcoming.forEach(function (e) {
        html += '<div class="list-row" style="cursor:default"><div class="list-ico">' + icon("cal") + "</div><span>" + esc(e.title) + '</span><span class="meta">' + esc(e.date.slice(8) + "." + e.date.slice(5, 7)) + (e.time ? " · " + esc(e.time) : "") + "</span></div>";
      });
      html += "</div>";
    }
    var p = bodyOf(); var t = targets(p); var eaten = eatenToday();
    html += '<div class="section-label">Сегодня съели</div><div class="metrics">' + bar("Ккал", eaten.kcal, t && t.kcal, "#f15a24") + bar("Белки", eaten.p, t && t.p, "#111") + bar("Жиры", eaten.f, t && t.f, "#d4a24a") + bar("Углеводы", eaten.c, t && t.c, "#7a8f6a") + "</div>";
    return html;
  }
  function parcelsHTML() {
    var name = bodyOf().name || (user && user.email ? user.email.split("@")[0] : "дом");
    var q = (parcelQuery || "").toLowerCase();
    var list = home.parcels.filter(function (x) {
      if (!q) return true;
      return (x.title + " " + x.source + " " + (x.note || "") + " " + (x.address || "")).toLowerCase().indexOf(q) !== -1;
    });
    var active = list.filter(function (x) { return x.status !== "done"; });
    var done = list.filter(function (x) { return x.status === "done"; });
    var html = '<div class="px">';
    html += '<div class="between"><div><div class="hello-k">Доставим куда угодно</div><div class="hello">Привет, ' + esc(name) + '! 👋</div><div class="small">Следите и забирайте вместе.</div></div><div class="we" style="padding:4px"><span style="width:36px;height:36px;border-radius:50%;background:#ecd9c8;display:grid;place-items:center">' + icon("user") + "</span></div></div>";
    html += '<div class="search">' + icon("search") + '<input id="pq" placeholder="Найти посылку" value="' + esc(parcelQuery) + '">' + icon("scan") + "</div>";
    html += '<div class="actions"><button class="act on" data-act="add-parcel"><div class="tile">' + icon("send") + '</div><span>Добавить</span></button><button class="act" data-act="tab" data-v="parcels"><div class="tile">' + icon("box") + '</div><span>Трекинг</span></button><button class="act" data-act="tab" data-v="home"><div class="tile">' + icon("cal") + '</div><span>Календарь</span></button><button class="act" data-act="tab" data-v="settings"><div class="tile">' + icon("more") + '</div><span>Ещё</span></button></div>';
    html += '<div class="between" style="margin-bottom:10px"><b>Активные</b><button class="link" data-act="add-parcel">Все →</button></div>';
    if (!active.length) html += '<div class="empty" style="padding-top:8px">Сейчас нечего забирать.</div>';
    active.forEach(function (x) { html += parcelCard(x); });
    if (done.length) { html += '<div class="section-label">Полученные</div>'; done.forEach(function (x) { html += parcelCard(x); }); }
    html += promoCard() + "</div>";
    return html;
  }
  function menuHTML() {
    var days = [0,1,2,3,4,5,6].map(function (i) { return addDays(weekStart, i); });
    var html = '<div class="top"><div><div class="kicker">' + weekLabel(weekStart) + '</div><div class="title">Меню</div></div><div class="row"><button class="icon-btn" data-act="week" data-n="-7">‹</button><button class="icon-btn" data-act="week" data-n="7">›</button>' + weChip() + "</div></div>";
    html += '<p class="muted" style="margin-bottom:12px">Общее на двоих. Только то, что впишете.</p><div class="days">';
    days.forEach(function (day, i) {
      var ds = iso(day);
      html += '<button class="daychip' + (ds === menuDay ? " on" : "") + '" data-act="menuday" data-d="' + ds + '">' + DAYS[i] + "<br><b>" + day.getDate() + "</b></button>";
    });
    html += "</div>";
    [["breakfast","Завтрак"],["lunch","Обед"],["dinner","Ужин"]].forEach(function (s) {
      var m = home.meals.find(function (x) { return x.date === menuDay && x.slot === s[0]; });
      html += '<div class="meal"><b>' + s[1] + "</b>";
      if (m) html += '<div class="name">' + esc(m.title) + '</div><div class="small">' + m.kcal + " ккал · Б " + m.p + " · Ж " + m.f + " · У " + m.c + "</div>";
      else html += '<div class="muted">пока пусто</div>';
      html += "</div>";
    });
    html += '<div class="panel"><div class="title" style="font-size:20px;margin-bottom:8px">Добавить блюдо</div><label class="field">Название<input id="dish"></label><div class="macros"><label class="field">Ккал<input id="dkcal" type="number"></label><label class="field">Белки<input id="dp" type="number"></label><label class="field">Жиры<input id="df" type="number"></label><label class="field">Углеводы<input id="dc" type="number"></label></div><button class="btn full" data-act="save-dish">Сохранить блюдо</button></div>';
    return html;
  }
  function settingRow(act, ico, label, meta) {
    return '<button class="list-row" data-act="' + act + '"><div class="list-ico">' + icon(ico) + "</div><span>" + label + "</span>" + (meta ? '<span class="meta">' + meta + "</span>" : "") + '<span class="chev">›</span></button>';
  }
  function settingsHTML() {
    var p = bodyOf(); var t = targets(p);
    var invite = meta().invite_code || home.inviteCode;
    var html = '<div class="top"><div class="title">Ещё</div>' + weChip() + '</div><div class="card">';
    html += settingRow("open-body", "body", "Показания тела", t ? t.kcal + " ккал" : "");
    html += settingRow("open-pass", "lock", "Пароль", "");
    html += settingRow("tab-menu", "note", "Меню на неделю", "");
    html += settingRow("tab-parcels", "radar", "Подарочный радар", "");
    html += settingRow("noop", "help", "Вопрос дня", "");
    html += settingRow("noop", "mail", "Капсула времени", "");
    html += settingRow("noop", "check", "Голосование", "");
    html += settingRow("noop", "folder", "Файлы", "");
    html += settingRow("noop", "card", "Карты", "");
    html += settingRow("logout", "out", "Выйти", "");
    html += '</div><div class="card"><button class="list-row" style="cursor:default"><div class="list-ico">' + icon("gear") + '</div><span>Почта</span><span class="meta">' + esc(user && user.email || "") + "</span></button></div>";
    html += '<div class="panel"><div class="small">Код дома</div><div class="codebox">' + esc(invite) + '</div><div class="muted">Партнёр вводит этот код при регистрации.</div></div>';
    if (showBody) {
      html += '<div class="panel"><div class="title" style="font-size:20px;margin-bottom:8px">Показания тела</div>';
      if (t) html += '<p class="small">Сейчас цель: ' + t.kcal + ' ккал</p>';
      html += '<label class="field">Имя<input id="b-name" value="' + esc(p.name) + '"></label><div class="macros"><label class="field">Рост<input id="b-h" type="number" value="' + esc(p.heightCm) + '"></label><label class="field">Вес<input id="b-w" type="number" value="' + esc(p.weightKg) + '"></label><label class="field">Жир %<input id="b-f" type="number" value="' + esc(p.bodyFatPct) + '"></label><label class="field">Возраст<input id="b-a" type="number" value="' + esc(p.age) + '"></label></div>';
      html += '<label class="field">Цель<select id="b-goal"><option value="cut"' + (p.goal==="cut"?" selected":"") + '>похудение</option><option value="maintain"' + (p.goal==="maintain"?" selected":"") + '>удержание</option><option value="bulk"' + (p.goal==="bulk"?" selected":"") + '>набор</option></select></label><button class="btn full" data-act="save-body">Сохранить тело</button></div>';
    }
    if (showPass) html += '<div class="panel"><div class="title" style="font-size:20px;margin-bottom:8px">Новый пароль</div><label class="field">Пароль<input id="new-pass" type="password"></label><button class="btn full" data-act="save-pass">Сохранить пароль</button></div>';
    return html;
  }
  function authHTML() {
    var html = '<div class="app"><div class="main" style="padding-top:48px"><div class="kicker">дом на двоих</div><div class="title" style="margin-bottom:18px">Двое</div>';
    if (notice) html += '<div class="notice">' + esc(notice) + "</div>";
    if (authMode !== "choose") html += '<p style="margin-bottom:12px"><button class="btn ghost sm" data-act="auth-back">Назад</button></p>';
    if (authMode === "choose") html += '<div class="panel"><div class="title" style="font-size:22px;margin-bottom:14px">Вход</div><button class="btn full" data-act="auth-reg">Создать дом</button><div style="height:8px"></div><button class="btn ghost full" data-act="auth-join">Есть код</button><div style="height:8px"></div><button class="btn ghost full" data-act="auth-login">Уже есть аккаунт</button></div>';
    if (authMode === "reg") html += '<div class="panel"><div class="title" style="font-size:22px;margin-bottom:8px">Создать дом</div><label class="field">Почта<input id="a-email" type="email" value="' + esc(lastEmail) + '"></label><label class="field">Имя<input id="a-name"></label><label class="field">Пароль<input id="a-pass" type="password"></label><button class="btn full" data-act="do-reg">Получить письмо</button></div>';
    if (authMode === "join") html += '<div class="panel"><div class="title" style="font-size:22px;margin-bottom:8px">Код дома</div><label class="field">Почта<input id="a-email" type="email" value="' + esc(lastEmail) + '"></label><label class="field">Имя<input id="a-name"></label><label class="field">Код<input id="a-code"></label><label class="field">Пароль<input id="a-pass" type="password"></label><button class="btn full" data-act="do-join">Получить письмо</button></div>';
    if (authMode === "login") html += '<div class="panel"><div class="title" style="font-size:22px;margin-bottom:8px">Войти</div><p class="muted" style="margin-bottom:8px">Почта регистрации: ewblycom@icloud.com</p><label class="field">Почта<input id="a-email" type="email" value="' + esc(lastEmail || "ewblycom@icloud.com") + '"></label><label class="field">Пароль<input id="a-pass" type="password"></label><button class="btn full" data-act="do-login">Войти</button><div style="height:10px"></div><button class="link" data-act="forgot">Забыли пароль</button></div>';
    if (authMode === "recover") html += '<div class="panel"><div class="title" style="font-size:22px;margin-bottom:8px">Новый пароль</div><label class="field">Пароль<input id="a-pass" type="password"></label><button class="btn full" data-act="do-recover">Сохранить пароль</button></div>';
    return html + "</div></div>";
  }
  function tabs() {
    return '<nav class="tabs"><button class="' + (tab==="home"?"on":"") + '" data-act="tab" data-v="home">' + icon("cal") + 'Календарь</button><button class="' + (tab==="parcels"?"on":"") + '" data-act="tab" data-v="parcels">' + icon("box") + 'Посылки</button><button class="' + (tab==="menu"?"on":"") + '" data-act="tab" data-v="menu">' + icon("menu") + 'Меню</button><button class="' + (tab==="settings"?"on":"") + '" data-act="tab" data-v="settings">' + icon("more") + 'Ещё</button></nav>';
  }
  function render() {
    var root = document.getElementById("app");
    if (!user && authMode !== "recover") { root.innerHTML = authHTML(); return; }
    if (authMode === "recover") { root.innerHTML = authHTML(); return; }
    var body = "";
    if (tab === "home") body = calendarHTML();
    if (tab === "parcels") body = parcelsHTML();
    if (tab === "menu") body = menuHTML();
    if (tab === "settings") body = settingsHTML();
    var wrapMain = tab === "parcels" ? body : '<div class="main">' + body + "</div>";
    root.innerHTML = '<div class="app">' + wrapMain + tabs() + "</div>";
  }
  function redirectTo() { return "https://ewblycom.github.io/dvoe/"; }
  function val(id) { var el = document.getElementById(id); return el ? el.value : ""; }
  document.getElementById("app").addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    var act = b.getAttribute("data-act");
    if (act === "auth-reg") { authMode = "reg"; render(); }
    if (act === "auth-join") { authMode = "join"; render(); }
    if (act === "auth-login") { authMode = "login"; render(); }
    if (act === "auth-back") { authMode = "choose"; notice = ""; render(); }
    if (act === "forgot") {
      lastEmail = val("a-email") || lastEmail || "ewblycom@icloud.com";
      sb.auth.resetPasswordForEmail(lastEmail, { redirectTo: redirectTo() }).then(function (res) {
        notice = res.error ? authMsg(res.error.message) : ("Письмо для смены пароля отправлено на " + lastEmail);
        render();
      });
    }
    if (act === "do-recover") {
      var npw = val("a-pass"); if (!npw) return alert("Введите пароль");
      sb.auth.updateUser({ password: npw }).then(function (res) {
        if (res.error) { notice = authMsg(res.error.message); render(); return; }
        user = res.data.user || user; authMode = "choose"; notice = "Пароль обновлён"; render();
      });
    }
    if (act === "tab") { tab = b.getAttribute("data-v"); render(); }
    if (act === "tab-menu") { tab = "menu"; render(); }
    if (act === "tab-parcels") { tab = "parcels"; render(); }
    if (act === "week") { weekStart = addDays(weekStart, Number(b.getAttribute("data-n"))); if (tab === "menu") menuDay = iso(weekStart); render(); }
    if (act === "cal") { calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() + Number(b.getAttribute("data-n")), 1); render(); }
    if (act === "pick-day") { selectedDay = b.getAttribute("data-d"); render(); }
    if (act === "menuday") { menuDay = b.getAttribute("data-d"); render(); }
    if (act === "open-pass") { showPass = !showPass; render(); }
    if (act === "open-body") { showBody = !showBody; render(); }
    if (act === "noop") return;
    if (act === "do-reg") {
      var email = val("a-email").trim(); lastEmail = email;
      var name = val("a-name").trim() || "Я";
      var pass = val("a-pass");
      if (!email || !pass) return alert("Почта и пароль");
      var invite = makeCode();
      sb.auth.signUp({ email: email, password: pass, options: { emailRedirectTo: redirectTo(), data: { name: name, invite_code: invite, role: "owner" } } }).then(function (res) {
        if (res.error) { notice = authMsg(res.error.message); render(); return; }
        home.inviteCode = invite; saveHome();
        if (res.data.session) { user = res.data.user; render(); } else { notice = "Письмо отправлено на " + email; authMode = "login"; render(); }
      });
    }
    if (act === "do-join") {
      var email2 = val("a-email").trim(); lastEmail = email2;
      var name2 = val("a-name").trim() || "Я";
      var codeIn = val("a-code").trim().toUpperCase();
      var pass2 = val("a-pass");
      if (!email2 || !pass2 || !codeIn) return alert("Заполните поля");
      sb.auth.signUp({ email: email2, password: pass2, options: { emailRedirectTo: redirectTo(), data: { name: name2, invite_code: codeIn, role: "member" } } }).then(function (res) {
        if (res.error) { notice = authMsg(res.error.message); render(); return; }
        home.inviteCode = codeIn; saveHome();
        if (res.data.session) { user = res.data.user; render(); } else { notice = "Письмо отправлено на " + email2; authMode = "login"; render(); }
      });
    }
    if (act === "do-login") {
      lastEmail = val("a-email").trim();
      sb.auth.signInWithPassword({ email: lastEmail, password: val("a-pass") }).then(function (res) {
        if (res.error) { notice = authMsg(res.error.message); render(); return; }
        user = res.data.user; render();
      });
    }
    if (act === "save-body") {
      sb.auth.updateUser({ data: { name: val("b-name"), heightCm: val("b-h"), weightKg: val("b-w"), bodyFatPct: val("b-f"), age: val("b-a"), goal: val("b-goal") } }).then(function (res) {
        if (res.error) alert(res.error.message); else { user = res.data.user; showBody = false; render(); }
      });
    }
    if (act === "save-pass") {
      var np = val("new-pass"); if (!np) return;
      sb.auth.updateUser({ password: np }).then(function (res) { alert(res.error ? res.error.message : "Пароль обновлён"); showPass = false; render(); });
    }
    if (act === "logout") sb.auth.signOut().then(function () { user = null; authMode = "choose"; render(); });
    if (act === "add-event") {
      var title = prompt("Название");
      var date = prompt("Дата ГГГГ-ММ-ДД", selectedDay || iso(new Date()));
      var time = prompt("Время", "19:00");
      if (title && date) { home.events.push({ title: title, date: date, time: time || "" }); saveHome(); render(); }
    }
    if (act === "add-parcel") {
      var t2 = prompt("Номер посылки");
      if (t2) {
        home.parcels.unshift({ id: String(Date.now()), source: "Вручную", title: t2, status: "transit", pickupCode: "", address: "", weight: "", eta: "В пути", note: "Добавили вручную" });
        saveHome(); tab = "parcels"; render();
      }
    }
    if (act === "status") {
      var px = home.parcels.find(function (x) { return x.id === b.getAttribute("data-id"); });
      if (px) { px.status = b.getAttribute("data-status"); saveHome(); render(); }
    }
    if (act === "save-dish") {
      var dishEl = document.getElementById("dish"); if (!dishEl || !dishEl.value.trim()) return;
      home.meals.push({ date: menuDay, slot: "dinner", title: dishEl.value.trim(), kcal: Number(val("dkcal") || 0), p: Number(val("dp") || 0), f: Number(val("df") || 0), c: Number(val("dc") || 0), eaten: true });
      saveHome(); render();
    }
  });
  document.getElementById("app").addEventListener("input", function (e) { if (e.target && e.target.id === "pq") parcelQuery = e.target.value; });
  document.getElementById("app").addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target && e.target.id === "pq") { parcelQuery = e.target.value; render(); } });
  sb.auth.onAuthStateChange(function (event, session) {
    if (event === "PASSWORD_RECOVERY") { user = session && session.user; authMode = "recover"; render(); }
  });
  sb.auth.getSession().then(function (res) {
    user = res.data.session ? res.data.session.user : null;
    if (location.hash.indexOf("type=recovery") !== -1) authMode = "recover";
    render();
  }).catch(function (err) { document.getElementById("app").textContent = "Ошибка: " + err.message; });
})();
