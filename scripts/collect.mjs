// Collecte les stats des îles depuis l'API publique Fortnite Data (lancé par GitHub Actions)
import fs from 'node:fs';
import path from 'node:path';

const API = 'https://api.fortnite.com/ecosystem/v1';
const DATA = path.resolve('data');
const FIELDS = ['peakCCU', 'uniquePlayers', 'plays', 'minutesPlayed', 'averageMinutesPerPlayer', 'favorites', 'recommendations'];
const read = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch { return d; } };
const write = (f, v) => fs.writeFileSync(path.join(DATA, f), JSON.stringify(v));

async function get(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'IslandPulse/1.0 (github actions)' } });
    if (r.status === 429) { await new Promise(s => setTimeout(s, 5000 * (attempt + 1))); continue; }
    if (!r.ok) { const e = new Error(`HTTP ${r.status} ${url}`); e.status = r.status; throw e; }
    return r.json();
  }
  throw new Error('HTTP 429 (trop de requêtes) ' + url);
}

let style = null;
async function metrics(code, interval, from, to) {
  const f = encodeURIComponent(from.toISOString()), t = encodeURIComponent(to.toISOString());
  const urls = {
    path: `${API}/islands/${code}/metrics/${interval}?from=${f}&to=${t}`,
    query: `${API}/islands/${code}/metrics?interval=${interval}&startDate=${f}&endDate=${t}`,
  };
  const order = style === 'query' ? ['query', 'path'] : ['path', 'query'];
  let err;
  for (const s of order) {
    try { const v = await get(urls[s]); style = s; return toRows(v); } catch (e) { err = e; console.log('  essai', s, '→', e.message); }
  }
  throw err;
}

function toRows(resp) {
  const rows = {};
  for (const f of FIELDS) {
    const arr = Array.isArray(resp?.[f]) ? resp[f] : resp?.[f]?.intervals;
    if (Array.isArray(arr)) for (const p of arr) if (p?.timestamp) (rows[p.timestamp] ||= { ts: p.timestamp })[f] = p.value ?? null;
  }
  const ret = Array.isArray(resp?.retention) ? resp.retention : resp?.retention?.intervals;
  if (Array.isArray(ret)) for (const p of ret) if (p?.timestamp) Object.assign(rows[p.timestamp] ||= { ts: p.timestamp }, { d1: p.d1 ?? null, d7: p.d7 ?? null });
  return Object.values(rows).sort((a, b) => a.ts.localeCompare(b.ts));
}

function merge(oldRows = [], newRows = [], keepSince = null) {
  const m = new Map(oldRows.map(r => [r.ts, r]));
  for (const r of newRows) m.set(r.ts, { ...(m.get(r.ts) || {}), ...r });
  let out = [...m.values()].sort((a, b) => a.ts.localeCompare(b.ts));
  if (keepSince) out = out.filter(r => r.ts >= keepSince);
  return out;
}

const config = read('islands.json', { islands: [] });
const now = new Date();
const status = { updatedAt: now.toISOString(), islands: [] };

for (const isl of config.islands) {
  const code = isl.code;
  console.log('Île', code);
  const file = `island-${code}.json`;
  const prev = read(file, { code, minute: [], hour: [], day: [] });
  const entry = { code, title: isl.title || code, ok: true, error: null };
  try {
    try { const meta = await get(`${API}/islands/${code}`); prev.meta = meta; entry.title = meta.title || entry.title; } catch (e) { console.log('  meta:', e.message); }
    const minute = await metrics(code, 'minute', new Date(now - 864e5), now);
    const hour = await metrics(code, 'hour', new Date(now - 7 * 864e5), now);
    const day = await metrics(code, 'day', new Date(now - 7 * 864e5), now);
    prev.minute = merge(prev.minute, minute, new Date(now - 864e5).toISOString());
    prev.hour = merge(prev.hour, hour, new Date(now - 90 * 864e5).toISOString());
    prev.day = merge(prev.day, day);
    prev.title = entry.title;
    prev.updatedAt = now.toISOString();
    console.log(`  ok : ${minute.length} pts 10 min, ${hour.length} pts heure, ${day.length} pts jour`);
  } catch (e) {
    entry.ok = false; entry.error = e.status === 404 ? 'Île introuvable ou pas encore publique' : e.message;
    console.log('  ERREUR', e.message);
  }
  write(file, prev);
  status.islands.push(entry);
}
write('status.json', status);
