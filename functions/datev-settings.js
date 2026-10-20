'use strict';
// Server-authorized preference storage only. No DATEV endpoints or credentials.
const { config } = require('../datev-light');
const URL = 'https://ejuhpgcwskyqwheinlub.supabase.co';
exports.handler = async function(event) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  const reply = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
  if (!['GET','POST'].includes(event.httpMethod)) return reply(405, {error:'Methode nicht erlaubt.'});
  const token = event.headers?.authorization || event.headers?.Authorization || '';
  if (!/^Bearer \S+$/.test(token)) return reply(401, {error:'Anmeldung erforderlich.'});
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) return reply(503, {error:'Serverkonfiguration fehlt. Es wurde nichts gespeichert.'});
  const serverHeaders = { apikey:key, Authorization:'Bearer '+key };
  try {
    const userRes = await fetch(URL+'/auth/v1/user', {headers:{apikey:key,Authorization:token}});
    if (!userRes.ok) return reply(401,{error:'Anmeldung abgelaufen.'});
    const user = await userRes.json();
    if (!user.id) return reply(401,{error:'Anmeldung ungültig.'});
    const roleRes = await fetch(URL+'/rest/v1/app_users?id=eq.'+encodeURIComponent(user.id)+'&select=rolle,aktiv', {headers:serverHeaders});
    if (!roleRes.ok) throw new Error('role');
    const roles = await roleRes.json();
    if (roles.length !== 1 || roles[0].rolle !== 'admin' || roles[0].aktiv === false) return reply(403,{error:'Nur aktive Administratoren dürfen DATEV-Einstellungen verwalten.'});
    const read = await fetch(URL+'/rest/v1/firma?id=eq.1&select=grundlagen', {headers:serverHeaders});
    if (!read.ok) throw new Error('read');
    const rows = await read.json();
    if (rows.length !== 1) throw new Error('firma');
    const original = rows[0].grundlagen;
    const g = original || {};
    if (event.httpMethod === 'GET') return reply(200,config(g.datev_light));
    let body;
    try { body = JSON.parse(event.body); } catch { return reply(400,{error:'Ungültige Einstellungen.'}); }
    if (!body || typeof body.preparation !== 'boolean' || !body.requested ||
        Object.values(body.requested).some(v=>typeof v !== 'boolean') ||
        Object.keys(body).some(k=>!['preparation','requested'].includes(k)) ||
        Array.isArray(body.requested) ||
        Object.keys(body.requested).some(k=>!Object.hasOwn(config().requested,k)))
      return reply(400,{error:'Nur Vorbereitung und Erweiterungswünsche sind einstellbar.'});
    const next = config(body);
    // Compare-and-swap prevents overwriting simultaneous changes to other settings.
    const filter = original == null ? '&grundlagen=is.null' : '&grundlagen=eq.'+encodeURIComponent(JSON.stringify(original));
    const saved = await fetch(URL+'/rest/v1/firma?id=eq.1'+filter, {
      method:'PATCH', headers:{...serverHeaders,'Content-Type':'application/json',Prefer:'return=representation'},
      body:JSON.stringify({grundlagen:{...g,datev_light:{...(g.datev_light||{}),preparation:next.preparation,requested:next.requested}}})
    });
    if (!saved.ok) throw new Error('save');
    if ((await saved.json()).length !== 1) return reply(409,{error:'Einstellungen wurden parallel geändert. Bitte neu laden.'});
    return reply(200,next);
  } catch {
    return reply(503,{error:'DATEV-Einstellungen derzeit nicht verfügbar. Bitte neu laden und prüfen.'});
  }
};
