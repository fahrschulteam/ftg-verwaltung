/* patch_version.js  -  Cache-Version fuer schulung.html in app.js setzen. */
const fs = require('fs');
const path = require('path');

const NEUE_VERSION = '20260901';
const DATEI = path.join(process.cwd(), 'app.js');

if (!fs.existsSync(DATEI)) {
  console.error('ABBRUCH: app.js im aktuellen Ordner nicht gefunden.');
  process.exit(1);
}

const buf = fs.readFileSync(DATEI);
const txt = buf.toString('latin1');

const re = /schulung\.html\?v=[0-9a-z]+/g;
const treffer = txt.match(re) || [];

if (treffer.length === 0) {
  console.error('ABBRUCH: keine Stelle "schulung.html?v=..." gefunden.');
  process.exit(1);
}

console.log('Gefunden: ' + treffer.length + ' Stelle(n)');
treffer.forEach(t => console.log('    vorher: ' + t));

fs.writeFileSync(DATEI + '.bak', buf);
const neu = txt.replace(re, 'schulung.html?v=' + NEUE_VERSION);
fs.writeFileSync(DATEI, Buffer.from(neu, 'latin1'));

console.log('');
console.log('OK  alle auf schulung.html?v=' + NEUE_VERSION + ' gesetzt');
console.log('OK  Sicherheitskopie: app.js.bak');