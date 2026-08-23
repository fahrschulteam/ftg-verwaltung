// ════════════════════════════════════════════════════════════════════
//  MODUL TO-DOS
//  Persönliche Aufgabenliste je eingeloggtem Nutzer.
//  Jeder sieht nur eigene To-dos (für sich selbst angelegt oder ihm
//  zugewiesen). Admin/Verwaltung können zusätzlich To-dos für Kollegen
//  anlegen ("vergeben"). Sichtbarkeit wird serverseitig per RLS
//  erzwungen (siehe SQL-Migration), die Filterung hier ist nur UI.
// ════════════════════════════════════════════════════════════════════

let todosState = {
  liste: [],
  nutzer: [],          // app_users (für Zuweisen-Auswahl), nur bei canWrite() geladen
  loaded: false,
  nutzerGeladen: false,
  filterStatus: 'offen',   // offen | erledigt | alle
  filterAnsicht: 'mir',    // mir | vergeben
};

const PRIO_LABEL = { niedrig:'Niedrig', normal:'Normal', hoch:'Hoch' };
const PRIO_FARBE = { niedrig:'#6B7280', normal:'#2A6CAE', hoch:'#C0001A' };

function escTodo(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function ladeTodos() {
  try {
    const { data, error } = await sb.from('todos')
      .select('*, ersteller:ersteller_id(name), zugewiesen:zugewiesen_an(name)')
      .order('erledigt', { ascending:true })
      .order('faellig_am', { ascending:true, nullsFirst:false })
      .order('created_at', { ascending:false });
    if (error) toast('Fehler beim Laden der To-dos: ' + error.message, 'err');
    todosState.liste = data || [];
  } catch(e) {
    toast('Ladefehler: ' + e.message, 'err');
    todosState.liste = [];
  }
  todosState.loaded = true;
}

async function ladeTodoNutzer() {
  if (todosState.nutzerGeladen) return;
  try {
    const { data, error } = await sb.from('app_users').select('id,name').eq('aktiv', true).order('name');
    if (!error) todosState.nutzer = data || [];
  } catch(e) {}
  todosState.nutzerGeladen = true;
}

// ── Badge im Hauptmenü (offene, mir zugewiesene To-dos) ──
async function ladeTodoBadge() {
  if (typeof sb === 'undefined' || !currentUser) return;
  try {
    const { count, error } = await sb.from('todos')
      .select('id', { count:'exact', head:true })
      .eq('zugewiesen_an', currentUser.id).eq('erledigt', false);
    if (!error) setTodoBadge(count || 0);
  } catch(e) {}
}
function setTodoBadge(n) {
  const el = document.getElementById('todo-nav-badge');
  if (!el) return;
  if (n > 0) { el.textContent = n > 99 ? '99+' : n; el.style.display = 'inline-flex'; }
  else el.style.display = 'none';
}

// ── Render ──
window.renderTodos = async function() {
  const view = document.getElementById('view-todos');
  if (!todosState.loaded) {
    view.innerHTML = '<div class="loading"><div class="spinner"></div>Lade To-dos …</div>';
    await ladeTodos();
  }
  if (canWrite()) await ladeTodoNutzer();

  if (!document.getElementById('todos-mod-shell')) {
    view.innerHTML = `
      <div class="mod-shell" id="todos-mod-shell">
        <aside class="mod-side"><nav>
          <div class="mod-side-label">To-Dos</div>
          <button class="mod-side-btn" data-ts="offen" onclick="setTodoStatus('offen')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;flex-shrink:0"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span class="mod-lbl">Offen (<span id="t-cnt-offen">0</span>)</span></button>
          <button class="mod-side-btn" data-ts="erledigt" onclick="setTodoStatus('erledigt')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><span class="mod-lbl">Erledigt (<span id="t-cnt-erledigt">0</span>)</span></button>
          <button class="mod-side-btn" data-ts="alle" onclick="setTodoStatus('alle')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;flex-shrink:0"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg><span class="mod-lbl">Alle (<span id="t-cnt-alle">0</span>)</span></button>
          ${canWrite() ? `
          <div class="mod-side-divider"></div>
          <div class="mod-side-label">Ansicht</div>
          <button class="mod-side-btn" data-ta="mir" onclick="setTodoAnsicht('mir')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;flex-shrink:0"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span class="mod-lbl">Für mich</span></button>
          <button class="mod-side-btn" data-ta="vergeben" onclick="setTodoAnsicht('vergeben')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;flex-shrink:0"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg><span class="mod-lbl">Von mir vergeben</span></button>
          ` : ''}
        </nav></aside>
        <div class="mod-main" id="todos-content"></div>
      </div>`;
  }
  document.querySelectorAll('#todos-mod-shell [data-ts]').forEach(b =>
    b.classList.toggle('active', b.dataset.ts === todosState.filterStatus));
  document.querySelectorAll('#todos-mod-shell [data-ta]').forEach(b =>
    b.classList.toggle('active', b.dataset.ta === todosState.filterAnsicht));

  renderTodosContent();
};

function setTodoStatus(s) { todosState.filterStatus = s; renderTodos(); }
function setTodoAnsicht(a) { todosState.filterAnsicht = a; renderTodos(); }

function todosGefiltert() {
  const meineId = currentUser?.id;
  let liste = todosState.liste.filter(t => {
    if (todosState.filterAnsicht === 'vergeben' && canWrite()) {
      return t.ersteller_id === meineId && t.zugewiesen_an !== meineId;
    }
    return t.zugewiesen_an === meineId;
  });
  if (todosState.filterStatus === 'offen') liste = liste.filter(t => !t.erledigt);
  if (todosState.filterStatus === 'erledigt') liste = liste.filter(t => t.erledigt);
  return liste;
}

function renderTodosContent() {
  const el = document.getElementById('todos-content');
  if (!el) return;

  // Zähler aktualisieren (innerhalb der aktuellen Ansicht mir/vergeben)
  const basis = todosState.liste.filter(t => {
    const meineId = currentUser?.id;
    if (todosState.filterAnsicht === 'vergeben' && canWrite()) return t.ersteller_id === meineId && t.zugewiesen_an !== meineId;
    return t.zugewiesen_an === meineId;
  });
  const cntOffen = document.getElementById('t-cnt-offen');
  const cntErl = document.getElementById('t-cnt-erledigt');
  const cntAlle = document.getElementById('t-cnt-alle');
  if (cntOffen) cntOffen.textContent = basis.filter(t => !t.erledigt).length;
  if (cntErl) cntErl.textContent = basis.filter(t => t.erledigt).length;
  if (cntAlle) cntAlle.textContent = basis.length;

  const liste = todosGefiltert();
  const vergebenAnsicht = todosState.filterAnsicht === 'vergeben' && canWrite();
  const heute = new Date(); heute.setHours(0,0,0,0);

  el.innerHTML = `
    <div class="toolbar" style="padding:18px 0 0;">
      <h2>To-Dos</h2>
      <span style="flex:1"></span>
      <button class="btn btn-primary" onclick="oeffneTodoForm()">+ Neues To-do</button>
    </div>
    <div style="padding:0 0 24px;">
      ${liste.length ? liste.map(todoCardHtml).join('') : `
        <div class="module-placeholder">
          <div class="ph-icon">✓</div>
          <h3>Keine To-dos</h3>
          <p>${todosState.filterStatus === 'offen' ? 'Aktuell sind keine offenen To-dos vorhanden.' : 'Keine Einträge in dieser Ansicht.'}</p>
        </div>`}
    </div>`;

  function todoCardHtml(t) {
    const meineId = currentUser?.id;
    const darfErledigen = t.zugewiesen_an === meineId || t.ersteller_id === meineId;
    const darfLoeschen = t.ersteller_id === meineId;
    const ueberfaellig = t.faellig_am && !t.erledigt && new Date(t.faellig_am) < heute;
    const faelligTxt = t.faellig_am ? new Date(t.faellig_am).toLocaleDateString('de-DE') : null;
    const zuName = t.zugewiesen?.name || '–';
    const vonName = t.ersteller?.name || '–';
    return `
      <div class="card" style="display:flex; gap:12px; align-items:flex-start; padding:14px 16px; margin-bottom:10px; ${t.erledigt ? 'opacity:.6;' : ''}">
        <button onclick="toggleTodoErledigt('${t.id}', ${!t.erledigt})" title="${t.erledigt ? 'Als offen markieren' : 'Als erledigt markieren'}"
          style="flex-shrink:0; width:22px; height:22px; border-radius:50%; border:2px solid ${t.erledigt ? '#22C55E' : 'var(--border)'};
          background:${t.erledigt ? '#22C55E' : '#fff'}; color:#fff; cursor:${darfErledigen ? 'pointer' : 'default'}; font-size:13px;
          display:flex; align-items:center; justify-content:center; margin-top:2px;"
          ${darfErledigen ? '' : 'disabled'}>${t.erledigt ? '✓' : ''}</button>
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <strong style="font-size:14px; ${t.erledigt ? 'text-decoration:line-through;' : ''}">${escTodo(t.titel)}</strong>
            <span style="font-size:10px; font-weight:700; padding:2px 7px; border-radius:10px; color:#fff; background:${PRIO_FARBE[t.prioritaet] || PRIO_FARBE.normal};">${PRIO_LABEL[t.prioritaet] || 'Normal'}</span>
            ${ueberfaellig ? '<span style="font-size:10px; font-weight:700; padding:2px 7px; border-radius:10px; color:#fff; background:#C0001A;">Überfällig</span>' : ''}
          </div>
          ${t.beschreibung ? `<div style="font-size:13px; color:var(--grau); margin-top:4px; white-space:pre-wrap;">${escTodo(t.beschreibung)}</div>` : ''}
          <div style="font-size:11px; color:var(--grau); margin-top:6px; display:flex; gap:14px; flex-wrap:wrap;">
            ${faelligTxt ? `<span>📅 Fällig: ${faelligTxt}</span>` : ''}
            ${vergebenAnsicht ? `<span>→ Zugewiesen an: ${escTodo(zuName)}</span>` : (t.ersteller_id !== meineId ? `<span>Von: ${escTodo(vonName)}</span>` : '')}
          </div>
        </div>
        ${darfLoeschen ? `<button onclick="loescheTodo('${t.id}')" title="Löschen" style="flex-shrink:0; background:none; border:none; cursor:pointer; color:var(--grau); font-size:15px; padding:4px;">🗑</button>` : ''}
      </div>`;
  }
}

// ── Erledigt-Status umschalten ──
async function toggleTodoErledigt(id, neu) {
  const t = todosState.liste.find(x => x.id === id);
  if (!t) return;
  t.erledigt = neu; t.erledigt_am = neu ? new Date().toISOString() : null; // optimistisch
  renderTodosContent();
  const { error } = await sb.from('todos').update({ erledigt: neu, erledigt_am: t.erledigt_am }).eq('id', id);
  if (error) { toast('Fehler: ' + error.message, 'err'); t.erledigt = !neu; renderTodosContent(); }
  ladeTodoBadge();
}

// ── Löschen ──
async function loescheTodo(id) {
  if (!confirm('Dieses To-do wirklich löschen?')) return;
  const { error } = await sb.from('todos').delete().eq('id', id);
  if (error) { toast('Fehler: ' + error.message, 'err'); return; }
  todosState.liste = todosState.liste.filter(t => t.id !== id);
  renderTodosContent();
  ladeTodoBadge();
  toast('To-do gelöscht', 'ok');
}

// ── Neues To-do (Formular) ──
function oeffneTodoForm() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'todo-form-modal';
  modal.innerHTML = `
    <div class="modal" style="width:min(560px,96vw);">
      <div class="modal-header"><h3>Neues To-do</h3><button class="close-btn" onclick="document.getElementById('todo-form-modal').remove()">✕</button></div>
      <div class="modal-body">
        <div class="frow"><label>Titel *</label><input id="tf-titel" placeholder="z. B. Rechnung Nr. 1234 prüfen"></div>
        <div class="frow"><label>Beschreibung</label><textarea id="tf-beschreibung" rows="3" placeholder="Optional"></textarea></div>
        <div class="fgrid">
          <div class="frow"><label>Fällig am</label><input type="date" id="tf-faellig"></div>
          <div class="frow"><label>Priorität</label>
            <select id="tf-prioritaet">
              <option value="niedrig">Niedrig</option>
              <option value="normal" selected>Normal</option>
              <option value="hoch">Hoch</option>
            </select>
          </div>
          ${canWrite() ? `
          <div class="frow">
            <label>Zugewiesen an</label>
            <select id="tf-zugewiesen">
              <option value="${currentUser.id}">Für mich selbst</option>
              ${todosState.nutzer.filter(n => n.id !== currentUser.id).map(n =>
                `<option value="${n.id}">${escTodo(n.name)}</option>`).join('')}
            </select>
          </div>` : ''}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="document.getElementById('todo-form-modal').remove()">Abbrechen</button>
        <button class="btn btn-primary" onclick="speichereTodo()">Speichern</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('tf-titel')?.focus(), 50);
}

async function speichereTodo() {
  const titel = document.getElementById('tf-titel').value.trim();
  if (!titel) { toast('Bitte einen Titel angeben.', 'err'); return; }
  const zugewiesen_an = canWrite()
    ? (document.getElementById('tf-zugewiesen')?.value || currentUser.id)
    : currentUser.id;
  const data = {
    titel,
    beschreibung: document.getElementById('tf-beschreibung').value.trim() || null,
    faellig_am: document.getElementById('tf-faellig').value || null,
    prioritaet: document.getElementById('tf-prioritaet').value,
    zugewiesen_an,
    ersteller_id: currentUser.id,
  };
  const { error } = await sb.from('todos').insert(data);
  if (error) { toast('Fehler beim Speichern: ' + error.message, 'err'); return; }
  document.getElementById('todo-form-modal')?.remove();
  toast('To-do gespeichert', 'ok');
  todosState.loaded = false;
  await renderTodos();
  ladeTodoBadge();
}
