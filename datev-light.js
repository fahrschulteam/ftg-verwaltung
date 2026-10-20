/* DATEV Light: read-only preparation. No transport or accounting writer exists here. */
(function(root) {
  'use strict';
  const extensions = Object.freeze({
    lightPlus: 'Light Plus', paymentMatch: 'Zahlungsabgleich', cash: 'Kasse',
    approvals: 'Freigabeworkflows', reports: 'Auswertungen', accounting: 'Buchungsdaten'
  });
  function config(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};
    return { mode: 'light', preparation: raw.preparation !== false,
      requested: Object.fromEntries(Object.keys(extensions).map(k => [k, raw.requested?.[k] === true])),
      effective: Object.fromEntries(Object.keys(extensions).map(k => [k, false])),
      directTransfer: false, accounting: false };
  }
  function validDate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
  }
  function inspect(inv, settings, invoices) {
    const errors = [];
    const text = v => typeof v === 'string' && v.trim().length > 0;
    if (!text(inv.number)) errors.push('Rechnungsnummer fehlt.');
    if (text(inv.number) && (invoices || []).filter(x => String(x.number).trim() === inv.number.trim()).length > 1)
      errors.push('Rechnungsnummer ist mehrfach vorhanden.');
    if (!validDate(inv.date)) errors.push('Rechnungsdatum fehlt oder ist ungültig.');
    if (!text(inv.recipient)) errors.push('Empfänger fehlt.');
    if (!text(inv.recipientAddr)) errors.push('Empfängeranschrift fehlt.');
    if (!text(inv.desc)) errors.push('Leistungsbeschreibung fehlt.');
    if (!Array.isArray(inv.items) || !inv.items.length) errors.push('Leistungspositionen fehlen.');
    else inv.items.forEach((it, i) => {
      if (!validDate(it.courseDate)) errors.push('Leistungsdatum in Position ' + (i+1) + ' fehlt oder ist ungültig.');
      if (typeof it.price !== 'number' || !Number.isFinite(it.price)) errors.push('Preis in Position ' + (i+1) + ' ist ungültig.');
    });
    for (const k of ['net','taxAmt','gross','taxRate'])
      if (typeof inv[k] !== 'number' || !Number.isFinite(inv[k])) errors.push('Betragsfeld ' + k + ' ist ungültig.');
    if (Math.abs(inv.net + inv.taxAmt - inv.gross) > 0.011) errors.push('Netto, Steuer und Brutto stimmen nicht überein.');
    if (inv.taxRate < 0 || inv.taxRate > 100) errors.push('Steuersatz ist ungültig.');
    if (!Number.isInteger(settings.dueDays) || settings.dueDays < 0 || settings.dueDays > 3650)
      errors.push('Zahlungsziel fehlt oder ist ungültig.');
    // Legacy invoices use current settings in PDFs; never infer a historical due date or release.
    return { errors, status: 'not_transferred', transferable: false,
      pending: ['Unveränderbare Rechnungsfreigabe und historisches Zahlungsziel fehlen im bisherigen Datenmodell.',
        'Rechnungs-PDF muss an die freigegebene Version gebunden werden.',
        'Übergabeformat, Übertragungsprotokoll und Dublettenschutz müssen vor DATEV-Nutzung abgenommen werden.',
        'Direkte Schnittstelle: gesonderte Freigabe erforderlich.'] };
  }
  const api = Object.freeze({ config, inspect, extensions });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FTG_DATEV = api;
})(typeof window !== 'undefined' ? window : globalThis);
