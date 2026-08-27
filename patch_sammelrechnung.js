/* ============================================================
   patch_sammelrechnung.js
   Fahrschulverwaltung - Sammelrechnungen
   Aendert: schulung.html
   Sicherung: schulung.html.bak-sammelrg
   ============================================================
   Ausfuehren im Projektordner:   node patch_sammelrechnung.js
   ============================================================ */

const fs = require('fs');
const DATEI = 'schulung.html';
const SICHERUNG = 'schulung.html.bak-sammelrg';

if (!fs.existsSync(DATEI)) {
  console.error('ABBRUCH: ' + DATEI + ' nicht gefunden. Bitte im Projektordner ausfuehren.');
  process.exit(1);
}

// Byte-Passthrough: latin1 verhaelt sich wie ein reiner Byte-Kanal,
// dadurch bleiben Umlaute und Zeilenenden unveraendert erhalten.
const buf = fs.readFileSync(DATEI);
let txt = buf.toString('latin1');

fs.writeFileSync(SICHERUNG, buf);
console.log('Sicherung angelegt: ' + SICHERUNG);

let fehler = 0;
let treffer = 0;

// Die Arbeitsdateien nutzen CRLF. Eingefuegte Zeilen daran angleichen,
// damit git diff nicht die ganze Datei als veraendert meldet.
const CRLF = (txt.match(/\r\n/g) || []).length > (txt.split('\n').length / 2);
function zeilenenden(s) { return CRLF ? s.replace(/\r?\n/g, '\r\n') : s; }

// Suchtext -> Regex, das sowohl CRLF als auch LF akzeptiert
function alsRegex(s) {
  const esc = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(esc.replace(/\r?\n/g, '\\r?\\n'), 'g');
}

function ersetze(name, suchen, ersatz, mehrfachErlaubt) {
  const re = alsRegex(suchen);
  const anzahl = (txt.match(re) || []).length;
  if (anzahl === 0) {
    console.error('  FEHLT   : ' + name);
    fehler++;
    return;
  }
  if (anzahl > 1 && !mehrfachErlaubt) {
    console.error('  MEHRDEUTIG (' + anzahl + 'x): ' + name);
    fehler++;
    return;
  }
  txt = txt.replace(re, zeilenenden(ersatz).replace(/\$/g, '$$$$'));
  console.log('  ok (' + anzahl + 'x): ' + name);
  treffer++;
}

/* ---------- 1. Nummernkreis SR ---------- */
ersetze('1. typePrefix: Nummernkreis SR',
`  if(instrPfx[t])return instrPfx[t];
  return ctype(t).prefix;`,
`  if(t==='Sammelrechnung')return 'SR';
  if(instrPfx[t])return instrPfx[t];
  return ctype(t).prefix;`);

/* ---------- 2. Etikett in der Liste ---------- */
ersetze('2a. typeTag: Farbe fuer Sammelrechnung',
`function typeTag(t){
  if(t&&t.startsWith('UW-'))return 'steel';`,
`function typeTag(t){
  if(t==='Sammelrechnung')return 'steel';
  if(t&&t.startsWith('UW-'))return 'steel';`);

ersetze('2b. typeShort: Kuerzel SR',
`  const uwMap={'UW-Gabelstapler':'UW GS','UW-Ladekran':'UW LK',`,
`  if(t==='Sammelrechnung') return 'SR';
  const uwMap={'UW-Gabelstapler':'UW GS','UW-Ladekran':'UW LK',`);

/* ---------- 3. Absturzschutz bei unbekanntem Typ ---------- */
ersetze('3. grundlagenFor: Absturzschutz',
`  return ctype(type).defaultGrundlagen||[];`,
`  return (ctype(type)||{}).defaultGrundlagen||[];`);

/* ---------- 4. Neue Funktionen ---------- */
const NEUE_FUNKTIONEN = `// ===== Sammelrechnungen =====================================
// Sucht Empfaenger, die mehr als eine offene (nicht versendete)
// Rechnung haben. Versendete oder bezahlte bleiben unberuehrt.
function srFindGroups(){
  const open=(state.invoices||[]).filter(i=>!i.sentAt&&!i.paidAt);
  const map={};
  open.forEach(i=>{
    const k=(i.recipient||'').trim();
    if(!k)return;
    (map[k]=map[k]||[]).push(i);
  });
  return Object.keys(map).filter(k=>map[k].length>1).map(k=>({recipient:k,invs:map[k]}));
}
// Hinweisleiste ueber der Liste der offenen Rechnungen
function srBannerHtml(){
  const groups=srFindGroups();
  if(!groups.length)return '';
  return groups.map(x=>{
    const sum=x.invs.reduce((s,i)=>s+(+i.gross||0),0);
    const nums=x.invs.map(i=>i.number).join(', ');
    const safe=String(x.recipient).replace(/\\\\/g,'\\\\\\\\').replace(/'/g,"\\\\'");
    return '<tr><td colspan="7" style="padding:0;border:0">'
      +'<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;'
      +'margin:6px 0;padding:8px 12px;border:1px solid #2A6CAE;border-radius:6px;background:#f4f8fc">'
      +'<div style="flex:1;min-width:220px;font-size:.84rem;color:var(--ink)">'
      +'<strong>'+x.recipient+'</strong> hat '+x.invs.length+' offene Rechnungen ('+nums+')'
      +' &middot; zusammen '+eur(sum)+'</div>'
      +'<button class="btn sm" style="border-color:#2A6CAE;color:#2A6CAE" '
      +'onclick="srMerge(\\''+safe+'\\')">Zusammenfassen</button>'
      +'</div></td></tr>';
  }).join('');
}
// Fasst alle offenen Rechnungen eines Empfaengers zu einer zusammen.
function srMerge(recipient){
  const invs=(state.invoices||[]).filter(i=>!i.sentAt&&!i.paidAt&&(i.recipient||'').trim()===String(recipient).trim());
  if(invs.length<2){toast('Keine zwei offenen Rechnungen gefunden');return}
  const nums=invs.map(i=>i.number).join(', ');
  askConfirm('Rechnungen '+nums+' zu einer Sammelrechnung zusammenfassen?\\n\\n'
    +'Die Einzelrechnungen landen im Papierkorb und sind wiederherstellbar.',()=>{
    const items=[];
    invs.forEach(i=>{
      (i.items||[]).forEach(it=>{ items.push(Object.assign({},it,{modul:it.modul||i.type})); });
    });
    items.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''))
      ||String(a.courseDate||'').localeCompare(String(b.courseDate||'')));
    const net=items.reduce((s,it)=>s+(+it.price||0),0);
    const tax=state.settings.tax!=null?state.settings.tax:0;
    const taxAmt=net*tax/100;
    const gross=net+taxAmt;
    const email=(invs.find(i=>i.recipientEmail)||{}).recipientEmail||'';
    const addr=(invs.find(i=>i.recipientAddr)||{}).recipientAddr||'';
    const no=nextInvNo('Sammelrechnung');
    const inv={id:uid(),number:no.number,year:no.year,seq:no.seq,type:'Sammelrechnung',
      date:today(),recipient:String(recipient).trim(),recipientEmail:email,recipientAddr:addr,
      desc:'Sammelrechnung mit '+items.length+' Positionen',
      items:items,unitPrice:0,discount:0,taxRate:tax,net:net,taxAmt:taxAmt,gross:gross,
      sentAt:'',paidAt:'',bildungsgutschein:false};
    invs.forEach(i=>{ try{_pkPush('rechnung','Rechnung '+i.number+' - '+(i.recipient||''),{inv:i});}catch(e){} });
    const ids=new Set(invs.map(i=>i.id));
    state.invoices=state.invoices.filter(x=>!ids.has(x.id));
    state.invoices.push(inv);
    try{_invUpdateExtDates(inv);}catch(e){}
    save();renderAll();toast('Sammelrechnung '+no.number+' angelegt');
  });
}

function delInvoice(id){`;

ersetze('4. Neue Funktionen srFindGroups / srBannerHtml / srMerge',
`function delInvoice(id){`,
NEUE_FUNKTIONEN);

/* ---------- 5. Hinweisleiste einbauen ---------- */
ersetze('5a. Liste: Banner voranstellen',
`    bOpen.innerHTML=open.length?open.map(i=>baseRow(i,`,
`    bOpen.innerHTML=srBannerHtml()+(open.length?open.map(i=>baseRow(i,`);

ersetze('5b. Liste: Klammer schliessen',
`    )).join(''):'<tr><td colspan="6"><div class="empty" style="padding:14px">Keine offenen Rechnungen.</div></td></tr>';`,
`    )).join(''):'<tr><td colspan="6"><div class="empty" style="padding:14px">Keine offenen Rechnungen.</div></td></tr>');`);

/* ---------- 6. Modul-Spalte in der Liste ---------- */
ersetze('6a. Liste: Spaltenkopf Modul',
`            <th style="padding:5px 12px;text-align:left;font-size:.75rem;color:var(--steel);width:40%">Teilnehmer</th>
            <th style="padding:5px 12px;text-align:left;font-size:.75rem;color:var(--steel)">Datum</th>`,
`            <th style="padding:5px 12px;text-align:left;font-size:.75rem;color:var(--steel);width:34%">Teilnehmer</th>
            <th style="padding:5px 12px;text-align:left;font-size:.75rem;color:var(--steel)">Modul</th>
            <th style="padding:5px 12px;text-align:left;font-size:.75rem;color:var(--steel)">Datum</th>`);

ersetze('6b. Liste: Modul-Zelle',
`              <td style="padding:5px 12px">\${it.name}</td>
              <td style="padding:5px 12px;color:var(--muted)">\${fmt(it.courseDate)}</td>`,
`              <td style="padding:5px 12px">\${it.name}</td>
              <td style="padding:5px 12px;color:var(--muted)">\${typeShort(it.modul||i.type)}</td>
              <td style="padding:5px 12px;color:var(--muted)">\${fmt(it.courseDate)}</td>`);

/* ---------- 7. PDF: Modul je Position ---------- */
ersetze('7. PDF: Modul pro Positionszeile',
`    const posLabel=inv.type&&inv.type.startsWith('UW-')?inv.type.replace('UW-','')+'-Unterweisung':inv.type;`,
`    const _mt=it.modul||inv.type;
    const posLabel=_mt&&_mt.startsWith('UW-')?_mt.replace('UW-','')+'-Unterweisung':_mt;`);

/* ---------- 8. PDF: Summe aus Einzelpositionen ---------- */
ersetze('8. PDF: Zwischensumme korrekt berechnen',
`  const sub=inv.unitPrice*inv.items.length;`,
`  const sub=inv.items.reduce((s,it)=>s+(+it.price||0),0)||(inv.unitPrice*inv.items.length);`,
true);

/* ---------- Ergebnis ---------- */
console.log('');
if (fehler > 0) {
  console.error('ABBRUCH: ' + fehler + ' Suchmuster passten nicht. Datei NICHT veraendert.');
  console.error('Die Sicherung ' + SICHERUNG + ' kann geloescht werden.');
  process.exit(1);
}

fs.writeFileSync(DATEI, Buffer.from(txt, 'latin1'));
console.log('FERTIG: ' + treffer + ' Aenderungen in ' + DATEI + ' geschrieben.');
console.log('Zuruecknehmen mit:  copy ' + SICHERUNG + ' ' + DATEI);
