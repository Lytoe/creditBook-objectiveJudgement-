// ---------- Persistence ----------
function saveData() {
  localStorage.setItem('credit.people', JSON.stringify(people));
  localStorage.setItem('credit.events', JSON.stringify(events));
}
function loadData() {
  try {
    const p = JSON.parse(localStorage.getItem('credit.people') || 'null');
    const e = JSON.parse(localStorage.getItem('credit.events') || 'null');
    if (Array.isArray(p)) people = p;
    if (Array.isArray(e)) events = e;
  } catch { /* ignore and keep seeds */ }
}

// ---------- Seeds (used only if nothing saved) ----------
let people = [
  { id: 1, name: "Zahra", tier: 1, baseCredit: 70, active: true },
  { id: 2, name: "Kaman", tier: 2, baseCredit: 55, active: true },
  { id: 3, name: "Ahoo",  tier: 2, baseCredit: 55, active: true },
  { id: 4, name: "Ali",   tier: 1, baseCredit: 70, active: true }
];
let events = [
  { id: 1, personId: 1, delta: -10, note: "cancel last minute", createdAt: Date.now() - 3_600_000 }
];

// ---------- Helpers ----------
const defaultBase = t => (t===1?70:t===2?55:45);
const byId = id => people.find(p => p.id === id);
function nextId(arr) { return arr.length ? Math.max(...arr.map(x=>x.id)) + 1 : 1; }

function eventsFor(pid) { return events.filter(e => e.personId === pid); }
function scoreFor(pid) {
  const person = byId(pid); if (!person) return 0;
  const sum = eventsFor(pid).reduce((s,e)=>s+e.delta, 0);
  return person.baseCredit + sum;
}
function eventCountFor(pid){ return eventsFor(pid).length; }

// ---------- Mutations ----------
function addPerson(name, tier, baseOverride) {
  name = (name||"").trim();
  tier = Number(tier);
  if (!name) return alert("Name required");
  if (![1,2,3].includes(tier)) return alert("Tier must be 1,2,3");
  const person = {
    id: nextId(people), name, tier,
    baseCredit: baseOverride!=null && baseOverride!=="" ? Number(baseOverride) : defaultBase(tier),
    active: true, createdAt: Date.now()
  };
  people.push(person); saveData(); renderPeople();
}

function editPerson(id, updates) {
  const p = byId(id); if (!p) return;
  if (updates.name != null) p.name = String(updates.name).trim() || p.name;
  if (updates.tier != null) {
    const t = Number(updates.tier);
    if ([1,2,3].includes(t)) p.tier = t;
  }
  if (updates.baseCredit != null && updates.baseCredit !== "") p.baseCredit = Number(updates.baseCredit);
  saveData(); openDetail(id); renderPeople();
}

function deactivatePerson(id) {
  const p = byId(id); if (!p) return;
  p.active = false; saveData();
  // back to list
  document.getElementById('detail').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  renderPeople();
}

function logEvent(personId, delta, note) {
  const allowed = [-10,-5,5,10];
  if (!allowed.includes(Number(delta))) return alert("Delta must be -10, -5, +5 or +10");
  const ev = {
    id: nextId(events),
    personId,
    delta: Number(delta),
    note: (note||"").trim() || "(no note)",
    createdAt: Date.now()
  };
  events.push(ev); saveData(); openDetail(personId);
}

// ---------- Rendering ----------
function renderPeople() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  const ranked = people
    .filter(p => p.active)
    .slice()
    .sort((a,b) => scoreFor(b.id) - scoreFor(a.id) || a.name.localeCompare(b.name));

  ranked.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";
    const score = scoreFor(p.id);
    if (score < 0) card.classList.add("negative");

    card.innerHTML = `
      <h3 style="margin:0 0 6px">${p.name}</h3>
      <div>Tier: ${p.tier}</div>
      <div>Score: ${score} <span style="opacity:.7">(${eventCountFor(p.id)} events)</span></div>
    `;
    card.addEventListener("click", () => openDetail(p.id));
    app.appendChild(card);
  });
}

function openDetail(id) {
  const person = byId(id); if (!person) return;
  const detail = document.getElementById("detail");
  const score = scoreFor(person.id);
  const negStyle = score < 0 ? 'class="card negative"' : 'class="card"';

  detail.innerHTML = `
    <div style="margin:8px 16px">
      <button id="backBtn">← Back</button>
    </div>

    <div ${negStyle} style="margin:8px 16px">
      <h2 style="margin:0 0 8px">${person.name}</h2>
      <div>Tier: ${person.tier}</div>
      <div>Base: ${person.baseCredit}</div>
      <div><strong>Score: ${score}</strong></div>
    </div>

    <div class="card" style="margin:8px 16px">
      <h3 style="margin:0 0 8px">Log Event</h3>
      <div class="row">
        <select id="deltaSelect">
          <option value="-10">-10</option>
          <option value="-5">-5</option>
          <option value="5">+5</option>
          <option value="10">+10</option>
        </select>
        <input id="noteInput" placeholder="note (optional)" />
        <button id="saveEventBtn">Save</button>
      </div>
    </div>

    <div class="card" style="margin:8px 16px">
      <h3 style="margin:0 0 8px">History</h3>
      <div id="history"></div>
    </div>

    <div class="card" style="margin:8px 16px">
      <h3 style="margin:0 0 8px">Edit / Deactivate</h3>
      <div class="row">
        <input id="nameEdit" value="${person.name}" />
        <select id="tierEdit">
          <option ${person.tier===1?'selected':''} value="1">Tier 1</option>
          <option ${person.tier===2?'selected':''} value="2">Tier 2</option>
          <option ${person.tier===3?'selected':''} value="3">Tier 3</option>
        </select>
        <input id="baseEdit" type="number" value="${person.baseCredit}" />
        <button id="saveEditBtn">Save</button>
        <button id="deactivateBtn" class="danger">Deactivate</button>
      </div>
    </div>
  `;

  // Fill history
  const list = eventsFor(id).slice().sort((a,b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  const historyEl = document.getElementById("history");
  historyEl.innerHTML = list.length
    ? list.map(e => `
        <div style="margin:6px 0">
          <strong style="color:${e.delta<0?'#ff8080':'#80ff80'}">${e.delta>0?'+':''}${e.delta}</strong>
          — ${escapeHtml(e.note)} <span style="opacity:.6">${fmtDate(e.createdAt)}</span>
        </div>`).join("")
    : "<div>(no events yet)</div>";

  // Wire actions
  document.getElementById('backBtn').addEventListener('click', () => {
    detail.classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    renderPeople(); // refresh list with new score/flags
  });
  document.getElementById('saveEventBtn').addEventListener('click', () => {
    const delta = Number(document.getElementById('deltaSelect').value);
    const note  = document.getElementById('noteInput').value;
    logEvent(person.id, delta, note);
  });
  document.getElementById('saveEditBtn').addEventListener('click', () => {
    editPerson(person.id, {
      name: document.getElementById('nameEdit').value,
      tier: Number(document.getElementById('tierEdit').value),
      baseCredit: Number(document.getElementById('baseEdit').value)
    });
  });
  document.getElementById('deactivateBtn').addEventListener('click', () => {
    if (confirm('Deactivate this person?')) deactivatePerson(person.id);
  });

  // Swap views
  document.getElementById('app').classList.add('hidden');
  detail.classList.remove('hidden');
}

// ---------- Add person (main FAB) ----------
document.getElementById('addPersonBtn').addEventListener('click', () => {
  const name = prompt("Name?");
  if (name == null) return;
  const tier = Number(prompt("Tier (1..3)?", "2"));
  if (![1,2,3].includes(tier)) return alert("Tier must be 1,2,3");
  const base = prompt("Base credit (optional, blank = default)");
  addPerson(name, tier, base === "" ? null : Number(base));
});

// ---------- Utils ----------
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function fmtDate(ts){ const d=new Date(ts); return d.toISOString().replace('T',' ').slice(0,16); }

// ---------- Boot ----------
loadData();
renderPeople();
