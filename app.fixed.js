(function () {
  var KEY = "dvoe-home-v1";
  function seed() {
    return {
      homeName: "Наш дом",
      inviteCode: "ДВОЕ-" + Math.random().toString(36).slice(2, 6).toUpperCase(),
      profileA: { name: "Я", heightCm: "", weightKg: "", bodyFatPct: "", age: "", sex: "male", activity: "light", goal: "maintain" },
      profileB: { name: "Она", heightCm: "", weightKg: "", bodyFatPct: "", age: "", sex: "female", activity: "light", goal: "maintain" },
      events: [],
      parcels: [{ id: "p1", source: "Авито", title: "Заказ с Авито", status: "pickup", pickupCode: "", address: "" }],
      meals: []
    };
  }
  function load() {
    try { var raw = localStorage.getItem(KEY); return raw ? Object.assign(seed(), JSON.parse(raw)) : seed(); }
    catch (e) { return seed(); }
  }
  var state = load();
  var tab = "home";
  var who = "a";
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
  function render() {
    var p = who === "a" ? state.profileA : state.profileB;
    var t = targets(p);
    var body = "";
    if (tab === "home") {
      body += '<div class="card"><h3 class="serif">Сегодня</h3>';
      if (t) body += "<p>" + t.kcal + " ккал · Б " + t.p + " · Ж " + t.f + " · У " + t.c + "</p>";
      else body += '<p class="muted">На вкладке «Тело» укажите вес — появится цель.</p>';
      body += '</div><div class="card"><div class="between"><h3 class="serif">Календарь</h3></div>';
      if (!state.events.length) body += '<p class="muted">Пока пусто.</p>';
      state.events.forEach(function (e) {
        body += '<div class="list-item"><strong>' + esc(e.title) + "</strong> <span class=\"small\">" + esc(e.date) + "</span></div>";
      });
      body += '<p style="margin-top:8px"><button class="btn accent" data-act="add-event">Добавить событие</button></p></div>';
    }
    if (tab === "parcels") {
      body += '<div class="between" style="margin-bottom:12px"><h2 class="serif">Посылки</h2><button class="btn accent" data-act="add-parcel">Добавить</button></div>';
      state.parcels.forEach(function (x) {
        body += '<div class="card"><strong>' + esc(x.title || x.source) + "</strong>";
        body += '<p class="small">' + esc(x.source) + " · " + esc(x.status) + "</p>";
        body += '<label class="field">Код<input data-parcel="' + x.id + '" data-field="pickupCode" value="' + esc(x.pickupCode) + '"></label>';
        body += '<label class="field">Адрес<input data-parcel="' + x.id + '" data-field="address" value="' + esc(x.address) + '"></label>';
        body += '<div class="row"><button class="btn" data-act="done" data-id="' + x.id + '">Забрали</button></div></div>';
      });
    }
    if (tab === "menu") {
      body += '<h2 class="serif">Меню</h2><p class="muted">Название блюда, ккал и БЖУ — только вручную.</p>';
      body += '<div class="card"><label class="field">Блюдо сегодня<input id="dish" placeholder="например гречка с курицей"></label>';
      body += '<div class="row"><label class="field" style="flex:1">Ккал<input id="dkcal" type="number"></label>';
      body += '<label class="field" style="flex:1">Б<input id="dp" type="number"></label>';
      body += '<label class="field" style="flex:1">Ж<input id="df" type="number"></label>';
      body += '<label class="field" style="flex:1">У<input id="dc" type="number"></label></div>';
      body += '<button class="btn accent" data-act="save-dish">Сохранить как съеденное</button></div>';
      state.meals.forEach(function (m) {
        body += '<div class="list-item">' + esc(m.title) + " · " + m.kcal + " ккал</div>";
      });
    }
    if (tab === "body") {
      body += '<h2 class="serif">Тело</h2><div class="card">';
      body += '<label class="field">Имя<input data-prof="name" value="' + esc(p.name) + '"></label>';
      body += '<div class="row"><label class="field" style="flex:1">Рост<input type="number" data-prof="heightCm" value="' + esc(p.heightCm) + '"></label>';
      body += '<label class="field" style="flex:1">Вес<input type="number" data-prof="weightKg" value="' + esc(p.weightKg) + '"></label></div>';
      body += '<label class="field">% жира<input type="number" data-prof="bodyFatPct" value="' + esc(p.bodyFatPct) + '"></label>';
      body += '<div class="row"><label class="field" style="flex:1">Возраст<input type="number" data-prof="age" value="' + esc(p.age) + '"></label>';
      body += '<label class="field" style="flex:1">Пол<select data-prof="sex"><option value="male"' + (p.sex === "male" ? " selected" : "") + '>муж</option><option value="female"' + (p.sex === "female" ? " selected" : "") + ">жен</option></select></label></div></div>";
      if (t) body += '<div class="card"><h3 class="serif">Цель</h3><p class="serif" style="font-size:28px">' + t.kcal + " ккал</p><p>Б " + t.p + " · Ж " + t.f + " · У " + t.c + "</p></div>";
    }
    document.getElementById("app").innerHTML =
      '<div class="app"><header class="top"><div class="eyebrow">' + esc(state.homeName) + '</div><h1>Двое</h1><div class="code">Код дома: ' + esc(state.inviteCode) + "</div></header>" +
      '<div class="main"><div class="row" style="margin-bottom:12px"><button class="' + (who === "a" ? "btn" : "btn ghost") + '" data-act="who" data-v="a">' + esc(state.profileA.name) + '</button><button class="' + (who === "b" ? "btn" : "btn ghost") + '" data-act="who" data-v="b">' + esc(state.profileB.name) + "</button></div>" + body + "</div>" +
      '<nav class="tabs"><button class="' + (tab === "home" ? "on" : "") + '" data-act="tab" data-v="home">Дом</button><button class="' + (tab === "parcels" ? "on" : "") + '" data-act="tab" data-v="parcels">Посылки</button><button class="' + (tab === "menu" ? "on" : "") + '" data-act="tab" data-v="menu">Меню</button><button class="' + (tab === "body" ? "on" : "") + '" data-act="tab" data-v="body">Тело</button></nav></div>';
  }
  document.getElementById("app").addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    var act = b.getAttribute("data-act");
    if (act === "tab") tab = b.getAttribute("data-v");
    if (act === "who") who = b.getAttribute("data-v");
    if (act === "add-event") {
      var title = prompt("Название события");
      if (title) { state.events.push({ title: title, date: new Date().toISOString().slice(0, 10) }); save(); }
    }
    if (act === "add-parcel") {
      var title2 = prompt("Название посылки");
      if (title2) { state.parcels.push({ id: String(Date.now()), source: "Вручную", title: title2, status: "transit", pickupCode: "", address: "" }); save(); }
    }
    if (act === "done") {
      state.parcels = state.parcels.map(function (x) { return x.id === b.getAttribute("data-id") ? Object.assign({}, x, { status: "done" }) : x; });
      save();
    }
    if (act === "save-dish") {
      var dish = document.getElementById("dish").value.trim();
      if (!dish) return;
      state.meals.push({ title: dish, kcal: Number(document.getElementById("dkcal").value || 0), p: Number(document.getElementById("dp").value || 0), f: Number(document.getElementById("df").value || 0), c: Number(document.getElementById("dc").value || 0), eaten: true, date: new Date().toISOString().slice(0, 10) });
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
