function renderDatevPreparation() {
  const host = document.getElementById('datev-preparation-panel');
  if (!host || !window.FTG_DATEV) return;
  const cfg = FTG_DATEV.config(state.settings.grundlagen?.datev_light);
  host.hidden = !cfg.preparation;
  if (!cfg.preparation) { host.replaceChildren(); return; }
  host.replaceChildren();
  const title = document.createElement('strong');
  title.textContent = 'DATEV Light: Rechnungsdaten prüfen';
  const info = document.createElement('p');
  info.textContent = 'Noch keine Übergabe eingerichtet. Die Prüfung verändert keine Daten und ersetzt keine Rechnungsfreigabe. Direkte Schnittstelle gesperrt; keine Buchungssätze.';
  const select = document.createElement('select');
  select.setAttribute('aria-label','Rechnung für DATEV-Prüfung');
  for (const inv of state.invoices) {
    const option = document.createElement('option');
    option.value = inv.id; option.textContent = inv.number+' · '+inv.recipient;
    select.append(option);
  }
  const button = document.createElement('button'); button.type = 'button'; button.className = 'btn ghost sm';
  button.textContent = 'Daten prüfen'; button.disabled = !state.invoices.length;
  const result = document.createElement('div'); result.setAttribute('role','status');
  button.addEventListener('click', () => {
    const inv = state.invoices.find(i=>String(i.id)===select.value);
    result.replaceChildren();
    if (!inv) { result.textContent = 'Rechnung nicht mehr vorhanden. Bitte neu laden.'; return; }
    const report = FTG_DATEV.inspect(inv,state.settings,state.invoices);
    const summary = document.createElement('p');
    summary.textContent = report.errors.length ? 'Bitte prüfen: '+report.errors.length+' Datenhinweis(e).' : 'Basisdaten vollständig. Weitere Voraussetzungen vor Übergabe offen.';
    const list = document.createElement('ul');
    [...report.errors,...report.pending].forEach(message=>{const li=document.createElement('li');li.textContent=message;list.append(li);});
    result.append(summary,list);
  });
  host.append(title,info,select,button,result);
}
