/* ============================================================
   patch_rechnungsmail.js
   Fahrschulverwaltung - eigene E-Mail-Adresse fuer Rechnungen
   Aendert: schulung.html
   Sicherung: schulung.html.bak-rgmail
   ============================================================
   VORHER in Supabase ausfuehren: 29_invoice_email.sql
   Ausfuehren im Projektordner:   node patch_rechnungsmail.js
   ============================================================ */

const fs = require('fs');
const DATEI = 'schulung.html';
const SICHERUNG = 'schulung.html.bak-rgmail';

if (!fs.existsSync(DATEI)) {
  console.error('ABBRUCH: ' + DATEI + ' nicht gefunden. Bitte im Projektordner ausfuehren.');
  process.exit(1);
}

const buf = fs.readFileSync(DATEI);
let txt = buf.toString('latin1');
fs.writeFileSync(SICHERUNG, buf);
console.log('Sicherung angelegt: ' + SICHERUNG);

let fehler = 0, treffer = 0;
const CRLF = (txt.match(/\r\n/g) || []).length > (txt.split('\n').length / 2);
const zeilenenden = s => CRLF ? s.replace(/\r?\n/g, '\r\n') : s;

function alsRegex(s) {
  const esc = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(esc.replace(/\r?\n/g, '\\r?\\n'), 'g');
}

function ersetze(name, suchen, ersatz, mehrfachErlaubt) {
  const re = alsRegex(suchen);
  const anzahl = (txt.match(re) || []).length;
  if (anzahl === 0) { console.error('  FEHLT   : ' + name); fehler++; return; }
  if (anzahl > 1 && !mehrfachErlaubt) {
    console.error('  MEHRDEUTIG (' + anzahl + 'x): ' + name); fehler++; return;
  }
  txt = txt.replace(re, zeilenenden(ersatz).replace(/\$/g, '$$$$'));
  console.log('  ok (' + anzahl + 'x): ' + name);
  treffer++;
}

/* ===== 1. Datenbank-Zuordnung ===== */

ersetze('1a. zuDb: invoice_email speichern',
`  zuDb:c=>({ name:c.name||'', addr:c.addr||'', contact:c.contact||'', email:c.email||'', phone:c.phone||'' }),`,
`  zuDb:c=>({ name:c.name||'', addr:c.addr||'', contact:c.contact||'', email:c.email||'', invoice_email:c.invoiceEmail||'', phone:c.phone||'' }),`);

ersetze('1b. vonDb: invoice_email laden',
`  vonDb:r=>({ id:r.id, _dbId:r.id, legacy_id:r.legacy_id||'', name:r.name||'(ohne Name)', addr:r.addr||'', contact:r.contact||'', email:r.email||'', phone:r.phone||'', portalCode:r.portal_code||'' }),`,
`  vonDb:r=>({ id:r.id, _dbId:r.id, legacy_id:r.legacy_id||'', name:r.name||'(ohne Name)', addr:r.addr||'', contact:r.contact||'', email:r.email||'', invoiceEmail:r.invoice_email||'', phone:r.phone||'', portalCode:r.portal_code||'' }),`);

ersetze('1c. Normalisierung beim Laden',
`  state.companies=state.companies.filter(Boolean).map(c=>({id:c.id||uid(),name:c.name||'(ohne Name)',addr:c.addr||'',contact:c.contact||'',email:c.email||'',phone:c.phone||''}));`,
`  state.companies=state.companies.filter(Boolean).map(c=>({id:c.id||uid(),name:c.name||'(ohne Name)',addr:c.addr||'',contact:c.contact||'',email:c.email||'',invoiceEmail:c.invoiceEmail||'',phone:c.phone||''}));`);

/* ===== 2. Zentrale Hilfsfunktionen ===== */

ersetze('2. Hilfsfunktionen coInvMail / recipientMailFor',
`function recipientFor(courseIds, instrIds){`,
`// ===== Rechnungs-E-Mail ======================================
// Liefert die Adresse fuer den Rechnungsversand. Ist keine eigene
// hinterlegt, wird ersatzweise die der Kontaktperson genommen -
// so bleibt nie eine Rechnung ohne Empfaengeradresse.
function coInvMail(co){
  if(!co)return '';
  return (co.invoiceEmail||'').trim()||(co.email||'').trim()||'';
}
// Sucht die Rechnungsadresse anhand des Firmennamens.
function recipientMailFor(name){
  if(!name)return '';
  const co=(state.companies||[]).find(c=>c.name===String(name).trim());
  return coInvMail(co);
}

function recipientFor(courseIds, instrIds){`);

/* ===== 3. Eingabefeld im Firmen-Dialog ===== */

ersetze('3a. openCompany: Leerwert ergaenzen',
`  const co=id?state.companies.find(x=>x.id===id):{name:'',addr:'',contact:'',email:'',phone:''};`,
`  const co=id?state.companies.find(x=>x.id===id):{name:'',addr:'',contact:'',email:'',invoiceEmail:'',phone:''};`);

ersetze('3b. openCompany: neues Eingabefeld',
`      <div class="field"><label>E-Mail</label><input id="co_email" type="email" value="\${co.email||''}" placeholder="info@firma.de"></div>`,
`      <div class="field"><label>E-Mail</label><input id="co_email" type="email" value="\${co.email||''}" placeholder="info@firma.de"></div>
      <div class="field"><label>E-Mail Rechnungsversand</label><input id="co_invmail" type="email" value="\${co.invoiceEmail||''}" placeholder="buchhaltung@firma.de">
        <div class="hint" style="margin-top:4px">Leer lassen, wenn Rechnungen an die Adresse oben gehen sollen.</div></div>`);

ersetze('3c. saveCompany: Feld mitspeichern',
`  const obj={name,addr:document.getElementById('co_addr').value,contact:document.getElementById('co_contact').value,phone:document.getElementById('co_phone').value.trim(),email:document.getElementById('co_email').value.trim()};`,
`  const _im=document.getElementById('co_invmail');
  const obj={name,addr:document.getElementById('co_addr').value,contact:document.getElementById('co_contact').value,phone:document.getElementById('co_phone').value.trim(),email:document.getElementById('co_email').value.trim(),invoiceEmail:_im?_im.value.trim():''};`);

/* ===== 4. Rechnungsversand nutzt die neue Adresse ===== */

ersetze('4a. Rechnungsdialog: Vorbelegung Firmenliste (2 Stellen)',
`  firmList.forEach(f=>{const co=state.companies.find(x=>x.name===f.name);if(co)f.email=co.email||'';});`,
`  firmList.forEach(f=>{const co=state.companies.find(x=>x.name===f.name);if(co)f.email=coInvMail(co);});`,
true);

ersetze('4b. Sammelanlage _giMakeInv',
`  const inv=_giMakeInv(sel.map(r=>r.e.id),firmName,co?co.email||'':'',`,
`  const inv=_giMakeInv(sel.map(r=>r.e.id),firmName,coInvMail(co),`);

ersetze('4c. Rechnung aus Firmenzuordnung',
`    recipient:co?co.name:fd.name,recipientEmail:co?co.email||'':'',`,
`    recipient:co?co.name:fd.name,recipientEmail:co?coInvMail(co):'',`);

ersetze('4d. Versand-Dialog: Vorbelegung',
`  const defaultEmail=inv.recipientEmail||(recipCo&&recipCo.email)||'';`,
`  const defaultEmail=inv.recipientEmail||coInvMail(recipCo)||'';`);

/* ===== 5. createInvoice schrieb bisher gar keine E-Mail ===== */

ersetze('5a. createInvoice (Unterweisungen): E-Mail ergaenzen',
`      recipient:recipientFor([],ids),desc,items,unitPrice:price,discount:disc,`,
`      recipient:recipientFor([],ids),recipientEmail:recipientMailFor(recipientFor([],ids)),desc,items,unitPrice:price,discount:disc,`);

ersetze('5b. createInvoice (Lehrgaenge): E-Mail ergaenzen',
`      recipient:recipientFor(ids,[]),desc,items,unitPrice:price,discount:disc,`,
`      recipient:recipientFor(ids,[]),recipientEmail:recipientMailFor(recipientFor(ids,[])),desc,items,unitPrice:price,discount:disc,`);

/* ===== Ergebnis ===== */
console.log('');
if (fehler > 0) {
  console.error('ABBRUCH: ' + fehler + ' Suchmuster passten nicht. Datei NICHT veraendert.');
  console.error('Die Sicherung ' + SICHERUNG + ' kann geloescht werden.');
  process.exit(1);
}
fs.writeFileSync(DATEI, Buffer.from(txt, 'latin1'));
console.log('FERTIG: ' + treffer + ' Aenderungen in ' + DATEI + ' geschrieben.');
console.log('Zuruecknehmen mit:  copy ' + SICHERUNG + ' ' + DATEI);
