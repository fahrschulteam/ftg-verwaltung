/* fix_doc.js - personal.js
   Spalte heisst hochgeladen, nicht
   hochgeladen_am. */

const fs = require('fs');
const p = 'personal.js';

if (!fs.existsSync(p)) {
  console.error('ABBRUCH: personal.js fehlt.');
  process.exit(1);
}

const buf = fs.readFileSync(p);
const txt = buf.toString('latin1');

const alt = "'hochgeladen_am'";
const neu = "'hochgeladen'";

const n = txt.split(alt).length - 1;
if (n !== 1) {
  console.error('ABBRUCH: ' + n
    + ' Treffer statt 1');
  process.exit(1);
}

fs.writeFileSync(p + '.bak', buf);
fs.writeFileSync(p, Buffer.from(
  txt.replace(alt, neu), 'latin1'));

console.log('OK korrigiert');
console.log('OK Kopie: personal.js.bak');