const KEY = "dvoe-home-v1";
const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const SLOTS = [["breakfast", "Завтрак"],["lunch", "Обед"],["dinner", "Ужин"]];
const STATUS = {
  paid: { label: "Оплачен", bg: "#E6D8C4", color: "#2B1810" },
  transit: { label: "В пути", bg: "#D4A24A", color: "#2B1810" },
  pickup: { label: "В ПВЗ", bg: "#7A8F6A", color: "#fff" },
  done: { label: "Забрали", bg: "#2B1810", color: "#F4E9D8" }
};
const emptyProfile = (name, sex) => ({ name, heightCm: "", weightKg: "", bodyFatPct: "", age: "", sex, activity: "light", goal: "maintain" });
function seed() {
  return {
    homeName: "Наш дом",
    inviteCode: "ДВОЕ-" + Math.random().toString(36).slice(2, 6).toUpperCase(),
    profileA: emptyProfile("Я", "male"),
    profileB: emptyProfile("Она", "female"),
    events: [],
    parcels: [{ id: "p1", source: "Авито", title: "Заказ с Авито", orderId: "70000000518187074", status: "pickup", pickupCode: "", address: "Пункт выдачи — уточнить", until: "2026-09-28" }],
    meals: []
  };
}
function load() { try { const raw = localStorage.getItem(KEY); return raw ? Object.assign(seed(), JSON.parse(raw)) : seed(); } catch (e) { return seed(); } }
let state = load();
let tab = "home";
let who = "a";
let installHint = true;
let weekStart = mondayOf(new Date());
let sheet = null;
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
function iso(d) { return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); }
function mondayOf(d) { const x = new Date(d); x.setHours(0,0,0,0); const day = x.getDay(); x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day)); return x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function targets(p) {
  const w = Number(p.weightKg) || 0; if (!w) return null;
  const fat = Number(p.bodyFatPct) || 0; const h = Number(p.heightCm) || 0; const age = Number(p.age) || 0;
  let bmr = 0, method = null;
  if (fat > 0 && fat < 70) { bmr = 370 + 21.6 * (w * (1 - fat / 100)); method = "katch"; }
  else if (h && age) { bmr = p.sex === "male" ? 10*w + 6.25*h - 5*age + 5 : 10*w + 6.25*h - 5*age - 161; method = "mifflin"; }
  else return null;
  const act = { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725 }[p.activity];
  const goal = { maintain: 1, cut: 0.85, bulk: 1.1 }[p.goal];
  const tdee = bmr * act; const kcal = tdee * goal;
  const lbm = fat ? w * (1 - fat / 100) : w;
  const pr = 1.8 * lbm; const f = (kcal * 0.25) / 9; const c = Math.max(0, (kcal - pr * 4 - f * 9) / 4);
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal: Math.round(kcal), p: Math.round(pr), f: Math.round(f), c: Math.round(c), method };
}
function eatenToday(profileKey) {
  const today = iso(new Date());
  return state.meals.filter(function(m){ return m.eaten && m.date === today && (m.forWho === "both" || m.forWho === profileKey); })
    .reduce(function(a,m){ return { kcal: a.kcal + Number(m.kcal||0), p: a.p + Number(m.p||0), f: a.f + Number(m.f||0), c: a.c + Number(m.c||0) }; }, {kcal:0,p:0,f:0,c:0});
}
function mealAt(date, slot) { return state.meals.find(function(m){ return m.date === date && m.slot === slot; }); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&","<":"<",">":">","\"":""","'":"&#39;"}[c]; }); }
function metric(label, value, goal, color) {
  const pct = goal ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return '<div class="metric"><div class="small">'+label+'</div><div class="n">'+value+(goal ? " / "+goal : "")+'</div><div class="bar-wrap"><div class="bar" style="width:'+(goal?pct:0)+'%;background:'+color+'"></div></div><div class="small">'+(goal ? pct+"%" : "без цели")+'</div></div>';
}
function render() {
  const profile = who === "a" ? state.profileA : state.profileB;
  const t = targets(profile);
  const eaten = eatenToday(who);
  const today = iso(new Date());
  document.getElementById("app").innerHTML = '<div class="app"><header class="top"><div class="eyebrow">'+esc(state.homeName)+'</div><h1>Двое</h1><div class="code">Код дома: '+esc(state.inviteCode)+'</div></header><div class="main">'+(installHint ? '<div class="hint">На iPhone: Safari → Поделиться → На экран «Домой».<div style="margin-top:8px"><button class="btn ghost" data-act="dismiss-hint">Понятно</button></div></div>' : '')+'<div class="row" style="margin-bottom:12px"><button class="'+(who==="a"?"btn":"btn ghost")+'" data-act="who" data-who="a">'+esc(state.profileA.name||"Я")+'</button><button class="'+(who==="b"?"btn":"btn ghost")+'" data-act="who" data-who="b">'+esc(state.profileB.name||"Она")+'</button></div>'+(tab==="home"?homeHTML(t,eaten,today):"")+(tab==="parcels"?parcelsHTML():"")+(tab==="menu"?menuHTML():"")+(tab==="body"?bodyHTML(profile,t):"")+'</div>'+sheetHTML()+'<nav class="tabs"><button class="'+(tab==="home"?"on":"")+'" data-act="tab" data-tab="home">Дом</button><button class="'+(tab==="parcels"?"on":"")+'" data-act="tab" data-tab="parcels">Посылки</button><button class="'+(tab==="menu"?"on":"")+'" data-act="tab" data-tab="menu">Меню</button><button class="'+(tab==="body"?"on":"")+'" data-act="tab" data-tab="body">Тело</button></nav></div>';
}
function homeHTML(t, eaten, today) {
  const upcoming = state.events.filter(function(e){ return e.date >= today; }).sort(function(a,b){ return a.date.localeCompare(b.date); }).slice(0,5);
  const pickup = state.parcels.filter(function(p){ return p.status === "pickup"; });
  const dinner = state.meals.find(function(m){ return m.date === today && m.slot === "dinner"; });
  return '<div class="card"><h3 class="serif">Сегодня</h3><div class="row">'+metric("Ккал", eaten.kcal, t&&t.kcal, "#C97B5C")+metric("Белки", eaten.p, t&&t.p, "#2B1810")+'</div><div class="row" style="margin-top:8px">'+metric("Жиры", eaten.f, t&&t.f, "#D4A24A")+metric("Углеводы", eaten.c, t&&t.c, "#7A8F6A")+'</div>'+(t?'':'<p class="small" style="margin-top:8px">Укажите вес на вкладке «Тело», чтобы появилась цель.</p>')+'</div><div class="card"><div class="between"><h3 class="serif">Календарь</h3><button class="btn accent" data-act="open-event">Добавить</button></div>'+(upcoming.length===0?'<p class="muted">Пока пусто — добавьте совместное дело.</p>':'')+upcoming.map(function(e){ return '<div class="list-item"><div class="between"><strong>'+esc(e.title)+'</strong><span class="small">'+esc(e.date)+(e.time?" · "+esc(e.time):"")+'</span></div>'+(e.notes?'<div class="small">'+esc(e.notes)+'</div>':'')+'</div>'; }).join("")+'</div>'+(pickup.length?'<div class="card"><h3 class="serif">Забрать</h3>'+pickup.map(function(p){ return '<div class="list-item"><strong>'+esc(p.title||p.source)+'</strong><div class="small">'+esc(p.address||"Адрес не указан")+(p.pickupCode?" · код "+esc(p.pickupCode):"")+'</div></div>'; }).join("")+'</div>':'')+'<div class="card"><h3 class="serif">Ужин сегодня</h3><p>'+(dinner?esc(dinner.title):"Ещё не записан")+'</p>'+(dinner?'<p class="small">'+dinner.kcal+' ккал · Б '+dinner.p+' · Ж '+dinner.f+' · У '+dinner.c+'</p>':'')+'</div>';
}
function parcelsHTML() {
  return '<div class="between" style="margin-bottom:12px"><h2 class="serif" style="font-size:22px">Посылки</h2><button class="btn accent" data-act="open-parcel">Добавить</button></div><p class="muted" style="margin-bottom:12px">Парсер Gmail — следующий слой. Карточки и код выдачи можно вести вручную.</p>'+state.parcels.map(function(p){ return '<div class="card"><div class="between"><strong>'+esc(p.title||p.source)+'</strong><span class="pill" style="background:'+STATUS[p.status].bg+';color:'+STATUS[p.status].color+'">'+STATUS[p.status].label+'</span></div><p class="small" style="margin:6px 0">'+esc(p.source)+(p.orderId?" · "+esc(p.orderId):"")+'</p><label class="field">Код выдачи<input data-parcel="'+p.id+'" data-field="pickupCode" value="'+esc(p.pickupCode)+'"></label><label class="field">Адрес<input data-parcel="'+p.id+'" data-field="address" value="'+esc(p.address)+'"></label><div class="row" style="flex-wrap:wrap">'+Object.keys(STATUS).map(function(s){ return '<button class="'+(p.status===s?"btn":"btn ghost")+'" data-act="status" data-id="'+p.id+'" data-status="'+s+'">'+STATUS[s].label+'</button>'; }).join("")+'</div></div>'; }).join("");
}
function menuHTML() {
  const days = [0,1,2,3,4,5,6].map(function(i){ return addDays(weekStart,i); });
  let grid = "<div></div>" + days.map(function(d,i){ return '<div class="dayhead'+(i>=5?" we":"")+'">'+DAYS[i]+'<div style="font-size:10px">'+d.getDate()+'</div></div>'; }).join("");
  SLOTS.forEach(function(pair){
    const id = pair[0], label = pair[1];
    grid += '<div class="small" style="align-self:center">'+label+'</div>';
    days.forEach(function(d){
      const date = iso(d); const m = mealAt(date, id);
      grid += '<button class="cell" data-act="cell" data-date="'+date+'" data-slot="'+id+'">'+(m?'<div>'+esc(m.title)+'</div><div>'+m.kcal+' ккал</div><div>'+(m.eaten?"съели":"план")+'</div>':"+")+'</button>';
    });
  });
  return '<div class="between" style="margin-bottom:12px"><h2 class="serif" style="font-size:22px">Меню</h2><div class="row"><button class="btn ghost" data-act="week" data-n="-7">←</button><button class="btn ghost" data-act="week" data-n="7">→</button></div></div><p class="muted" style="margin-bottom:10px">Только то, что впишете. Тап по ячейке.</p><div class="grid7">'+grid+'</div>';
}
function bodyHTML(p, t) {
  return '<h2 class="serif" style="font-size:22px;margin-bottom:12px">Тело</h2><div class="card"><label class="field">Имя<input data-prof="name" value="'+esc(p.name)+'"></label><div class="row"><label class="field" style="flex:1">Рост, см<input type="number" data-prof="heightCm" value="'+esc(p.heightCm)+'"></label><label class="field" style="flex:1">Вес, кг<input type="number" data-prof="weightKg" value="'+esc(p.weightKg)+'"></label></div><label class="field">Процент жира<input type="number" data-prof="bodyFatPct" value="'+esc(p.bodyFatPct)+'"></label><div class="row"><label class="field" style="flex:1">Возраст<input type="number" data-prof="age" value="'+esc(p.age)+'"></label><label class="field" style="flex:1">Пол<select data-prof="sex"><option value="male"'+(p.sex==="male"?" selected":"")+'>муж</option><option value="female"'+(p.sex==="female"?" selected":"")+'>жен</option></select></label></div><label class="field">Активность<select data-prof="activity"><option value="sedentary"'+(p.activity==="sedentary"?" selected":"")+'>сидячий ×1.2</option><option value="light"'+(p.activity==="light"?" selected":"")+'>лёгкий ×1.375</option><option value="moderate"'+(p.activity==="moderate"?" selected":"")+'>средний ×1.55</option><option value="high"'+(p.activity==="high"?" selected":"")+'>высокий ×1.725</option></select></label><label class="field">Цель<select data-prof="goal"><option value="maintain"'+(p.goal==="maintain"?" selected":"")+'>удержать</option><option value="cut"'+(p.goal==="cut"?" selected":"")+'>дефицит −15%</option><option value="bulk"'+(p.goal==="bulk"?" selected":"")+'>набор +10%</option></select></label></div><div class="card"><h3 class="serif">Расчёт</h3>'+(t?'<p class="small">'+(t.method==="katch"?"Кэтч–МакАрдл":"Миффлин–Сан Жеор")+'</p><p>BMR '+t.bmr+' · TDEE '+t.tdee+'</p><p class="serif" style="font-size:28px;margin-top:8px">'+t.kcal+' ккал</p><p>Б '+t.p+' г · Ж '+t.f+' г · У '+t.c+' г</p>':'<p class="muted">Нужен вес. Если нет % жира — ещё рост и возраст.</p>')+'</div>';
}
function sheetHTML() {
  if (!sheet) return "";
  if (sheet.type === "event") {
    const d = sheet.data;
    return '<div class="sheet-bg"><div class="sheet"><div class="between" style="margin-bottom:12px"><h2 class="serif" style="font-size:22px">Событие</h2><button class="btn ghost" data-act="close">Закрыть</button></div><label class="field">Название<input id="e-title" value="'+esc(d.title)+'"></label><label class="field">Дата<input id="e-date" type="date" value="'+esc(d.date)+'"></label><label class="field">Время<input id="e-time" type="time" value="'+esc(d.time)+'"></label><label class="field">Заметка<input id="e-notes" value="'+esc(d.notes)+'"></label><button class="btn accent" data-act="save-event">Сохранить</button></div></div>';
  }
  if (sheet.type === "parcel") {
    const d = sheet.data;
    return '<div class="sheet-bg"><div class="sheet"><div class="between" style="margin-bottom:12px"><h2 class="serif" style="font-size:22px">Посылка</h2><button class="btn ghost" data-act="close">Закрыть</button></div><label class="field">Магазин<input id="p-source" value="'+esc(d.source)+'"></label><label class="field">Название<input id="p-title" value="'+esc(d.title)+'"></label><label class="field">Номер заказа<input id="p-order" value="'+esc(d.orderId)+'"></label><label class="field">Код выдачи<input id="p-code" value="'+esc(d.pickupCode)+'"></label><label class="field">Адрес ПВЗ<input id="p-addr" value="'+esc(d.address)+'"></label><label class="field">Хранить до<input id="p-until" type="date" value="'+esc(d.until)+'"></label><button class="btn accent" data-act="save-parcel">Добавить</button></div></div>';
  }
  if (sheet.type === "meal") {
    const d = sheet.data;
    return '<div class="sheet-bg"><div class="sheet"><div class="between" style="margin-bottom:12px"><h2 class="serif" style="font-size:22px">Блюдо</h2><button class="btn ghost" data-act="close">Закрыть</button></div><label class="field">Название<input id="m-title" value="'+esc(d.title||"")+'"></label><div class="row"><label class="field" style="flex:1">Ккал<input id="m-kcal" type="number" value="'+(d.kcal||"")+'"></label><label class="field" style="flex:1">Б<input id="m-p" type="number" value="'+(d.p||"")+'"></label><label class="field" style="flex:1">Ж<input id="m-f" type="number" value="'+(d.f||"")+'"></label><label class="field" style="flex:1">У<input id="m-c" type="number" value="'+(d.c||"")+'"></label></div><label class="field">Для кого<select id="m-who"><option value="both"'+(d.forWho==="both"?" selected":"")+'>Оба</option><option value="a"'+(d.forWho==="a"?" selected":"")+'>'+esc(state.profileA.name)+'</option><option value="b"'+(d.forWho==="b"?" selected":"")+'>'+esc(state.profileB.name)+'</option></select></label><label class="row" style="gap:10px;margin-bottom:14px"><input id="m-eaten" type="checkbox"'+(d.eaten?" checked":"")+'> Съели — пойдёт в метрики</label><button class="btn accent" data-act="save-meal">Сохранить</button></div></div>';
  }
  return "";
}
document.getElementById("app").addEventListener("click", function(e) {
  const btn = e.target.closest("[data-act]"); if (!btn) return;
  const act = btn.dataset.act;
  if (act === "tab") tab = btn.dataset.tab;
  if (act === "who") who = btn.dataset.who;
  if (act === "dismiss-hint") installHint = false;
  if (act === "week") weekStart = addDays(weekStart, Number(btn.dataset.n));
  if (act === "close") sheet = null;
  if (act === "open-event") sheet = { type: "event", data: { title:"", date: iso(new Date()), time:"", notes:"" } };
  if (act === "open-parcel") sheet = { type: "parcel", data: { source:"Авито", title:"", orderId:"", status:"transit", pickupCode:"", address:"", until:"" } };
  if (act === "cell") {
    const existing = mealAt(btn.dataset.date, btn.dataset.slot) || { date: btn.dataset.date, slot: btn.dataset.slot, title:"", kcal:0, p:0, f:0, c:0, forWho:"both", eaten:false };
    sheet = { type: "meal", data: existing };
  }
  if (act === "status") { state.parcels = state.parcels.map(function(p){ return p.id === btn.dataset.id ? Object.assign({}, p, { status: btn.dataset.status }) : p; }); save(); }
  if (act === "save-event") {
    const title = document.getElementById("e-title").value.trim(); if (!title) return;
    state.events.push({ id: crypto.randomUUID(), title: title, date: document.getElementById("e-date").value, time: document.getElementById("e-time").value, notes: document.getElementById("e-notes").value, who: "both" });
    save(); sheet = null;
  }
  if (act === "save-parcel") {
    state.parcels.push({ id: crypto.randomUUID(), source: document.getElementById("p-source").value, title: document.getElementById("p-title").value, orderId: document.getElementById("p-order").value, pickupCode: document.getElementById("p-code").value, address: document.getElementById("p-addr").value, until: document.getElementById("p-until").value, status: "transit" });
    save(); sheet = null;
  }
  if (act === "save-meal") {
    const d = sheet.data;
    const next = { id: d.id || crypto.randomUUID(), date: d.date, slot: d.slot, title: document.getElementById("m-title").value.trim(), kcal: Number(document.getElementById("m-kcal").value||0), p: Number(document.getElementById("m-p").value||0), f: Number(document.getElementById("m-f").value||0), c: Number(document.getElementById("m-c").value||0), forWho: document.getElementById("m-who").value, eaten: document.getElementById("m-eaten").checked };
    if (!next.title) return;
    state.meals = state.meals.filter(function(m){ return !(m.date === next.date && m.slot === next.slot); });
    state.meals.push(next); save(); sheet = null;
  }
  render();
});
document.getElementById("app").addEventListener("change", function(e) {
  const el = e.target;
  if (el.dataset.parcel) { const p = state.parcels.find(function(x){ return x.id === el.dataset.parcel; }); if (p) { p[el.dataset.field] = el.value; save(); } return; }
  if (el.dataset.prof) {
    const key = who === "a" ? "profileA" : "profileB";
    const val = el.type === "number" ? (el.value === "" ? "" : Number(el.value)) : el.value;
    state[key] = Object.assign({}, state[key], {}); state[key][el.dataset.prof] = val; save(); render();
  }
});
if ("serviceWorker" in navigator) { navigator.serviceWorker.register("./sw.js").catch(function(){}); }
render();
