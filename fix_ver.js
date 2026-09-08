/* fix_ver.js - Cache-Version von
   personal.js in index.html anheben. */

const fs = require('fs');
const p = 'index.html';
const NEU = '20260907';

const buf = fs.readFileSync(p);
const txt = buf.toString('latin1');

const re = /personal\.js\?v=[0-9a-z]*/g;
const treffer = txt.match(re) || [];

if (!treffer.length) {
  console.error('ABBRUCH: nicht gefunden.');
  process.exit(1);
}

treffer.forEach(function(t){
  console.log('vorher: ' + t);
});

fs.writeFileSync(p + '.bak', buf);
fs.writeFileSync(p, Buffer.from(
  txt.replace(re, 'personal.js?v=' + NEU),
  'latin1'));

console.log('OK auf ' + NEU + ' gesetzt');