// Island Pulse — interface
const $root = document.getElementById('root');
const COLORS = ['#FF3DCB', '#3DF5FF', '#B6FF3D', '#FFB23D', '#9B7BFF', '#FF6B8A'];
let refreshTimer = null, chartRange = '24h', chartMetric = 'peakCCU';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('fr-FR');
const n = v => v == null ? '—' : v >= 100000 ? nf.format(Math.round(v / 1000)) + ' k' : nf.format(Math.round(v));
const money = v => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(v || 0);
const pct = v => v == null ? '—' : Math.round(v * (v <= 1 ? 100 : 1)) + ' %';
const mins = v => v == null ? '—' : (v >= 1 ? Math.round(v) + ' min' : Math.round(v * 60) + ' s');
const monthLabel = m => { const [y, mm] = m.split('-'); return new Date(+y, +mm - 1, 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }); };
const ago = iso => { if (!iso) return ''; const s = (Date.now() - new Date(iso)) / 1000; return s < 90 ? "à l'instant" : s < 3600 ? `il y a ${Math.round(s / 60)} min` : `il y a ${Math.round(s / 3600)} h`; };
const colorFor = code => COLORS[[...code].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

const ICON = {
  pulse: '<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#3DF5FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="2 12 6 12 9 4 15 20 18 12 22 12"/></svg>',
  lock: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3DF5FF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>',
  plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  maps: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
  cash: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  gear: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  trash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
};

function drawChart(svg, rows, metric, color) {
  const pts = rows.filter(r => r[metric] != null).map(r => ({ t: +new Date(r.ts), v: r[metric] }));
  const tip = document.getElementById('tip');
  if (pts.length < 2) { svg.innerHTML = `<text x="160" y="80" text-anchor="middle" fill="#A9A2CF" font-size="12">Pas encore assez de données pour cette période</text>`; return; }
  const W = 320, H = 150, P = 6;
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t, max = Math.max(...pts.map(p => p.v)) * 1.1 || 1;
  const x = t => P + (t - t0) / (t1 - t0 || 1) * (W - 2 * P), y = v => H - 18 - v / max * (H - 30);
  const line = pts.map(p => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const fmt = t => new Date(t).toLocaleString('fr-FR', chartRange === '24h' ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short' });
  svg.innerHTML = `
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    ${[0.25, 0.5, 0.75].map(f => `<line x1="0" x2="${W}" y1="${y(max * f)}" y2="${y(max * f)}" stroke="#2E2766" stroke-width="1" vector-effect="non-scaling-stroke"/>`).join('')}
    <polygon points="${x(t0)},${H - 18} ${line} ${x(t1)},${H - 18}" fill="url(#g)"/>
    <polyline points="${line}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    <line id="cur" x1="0" x2="0" y1="0" y2="${H - 18}" stroke="#fff" stroke-opacity="0" vector-effect="non-scaling-stroke"/>`;
  tip.textContent = `Max ${n(max / 1.1)} · ${fmt(t0)} → ${fmt(t1)}`;
  const cur = svg.querySelector('#cur');
  const move = e => {
    const r = svg.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width * W;
    let best = pts[0]; for (const p of pts) if (Math.abs(x(p.t) - px) < Math.abs(x(best.t) - px)) best = p;
    cur.setAttribute('x1', x(best.t)); cur.setAttribute('x2', x(best.t)); cur.setAttribute('stroke-opacity', '.5');
    tip.textContent = `${fmt(best.t)} : ${n(best.v)} ${METRICS[metric].toLowerCase()}`;
  };
  svg.onpointermove = move; svg.onpointerdown = move;
}


// ---------------- données (fichiers JSON du dépôt, mis à jour par GitHub Actions) ----------------
const cacheBust = () => '?t=' + Math.floor(Date.now() / 60000);
async function getJSON(p) { const r = await fetch(p + cacheBust()); if (!r.ok) throw new Error('Données introuvables (' + r.status + ')'); return r.json(); }
const sumSince = (rows, f, sinceMs) => { let s = 0, k = 0; for (const r of rows || []) if (+new Date(r.ts) >= sinceMs && r[f] != null) { s += r[f]; k++; } return k ? s : null; };
const last = (rows, f) => { for (let i = (rows || []).length - 1; i >= 0; i--) if (rows[i][f] != null) return { value: rows[i][f], ts: rows[i].ts }; return { value: null, ts: null }; };
// joueurs en jeu : la dernière valeur seulement si elle est récente, sinon « moins de 5 » (Epic masque les petits chiffres)
function liveOf(rows) {
  rows = rows || []; if (!rows.length) return { value: null, ts: null, low: false };
  const l = last(rows, 'peakCCU'), end = +new Date(rows[rows.length - 1].ts);
  if (l.ts && end - +new Date(l.ts) <= 40 * 60000) return { ...l, low: false };
  return { value: null, ts: rows[rows.length - 1].ts, low: true };
}
const liveText = (lv, suffix = '') => lv.low ? '< 5' + suffix : lv.value == null ? '—' : n(lv.value) + suffix;
async function loadAll() {
  const cfg = await getJSON('data/islands.json');
  const status = await getJSON('data/status.json').catch(() => ({ islands: [] }));
  const islands = await Promise.all(cfg.islands.map(async i => {
    const d = await getJSON(`data/island-${i.code}.json`).catch(() => ({ code: i.code, minute: [], hour: [], day: [] }));
    const st = (status.islands || []).find(s => s.code === i.code) || {};
    return { ...d, code: i.code, title: d.title || st.title || i.code, error: st.ok === false ? st.error : null };
  }));
  return { islands, status };
}

// ---------------- gains (gardés sur ce téléphone uniquement) ----------------
const EKEY = 'island-pulse-earnings';
const loadEarnings = () => { try { return JSON.parse(localStorage.getItem(EKEY)) || []; } catch { return []; } };
const saveEarnings = l => { try { localStorage.setItem(EKEY, JSON.stringify(l)); } catch {} };
const monthNow = () => new Date().toISOString().slice(0, 7);
function earningsSummary() {
  const l = loadEarnings(), m = monthNow(), byCode = {}, byMonth = {};
  for (const e of l) { byMonth[e.month] = (byMonth[e.month] || 0) + e.amount; if (e.month === m && e.code) byCode[e.code] = (byCode[e.code] || 0) + e.amount; }
  return { list: l, thisMonth: l.filter(e => e.month === m).reduce((s, e) => s + e.amount, 0), total: l.reduce((s, e) => s + e.amount, 0), byCode, byMonth };
}
function parseCsv(text) {
  const lines = String(text).split(/\r?\n/).filter(l => l.trim()); if (!lines.length) return [];
  const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
  const split = l => l.split(sep).map(s => s.trim().replace(/^"|"$/g, ''));
  const head = split(lines[0]).map(h => h.toLowerCase()); const find = re => head.findIndex(h => re.test(h));
  let iD = find(/month|mois|date|period|période/), iC = find(/island|île|ile|code|map/), iA = find(/amount|montant|payout|gain|earn|usd|\$/), start = 1;
  if (iA < 0) { iD = 0; iC = head.length > 2 ? 1 : -1; iA = head.length - 1; start = 0; }
  const norm = c => { const d = String(c || '').replace(/\D/g, ''); return d.length === 12 ? d.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3') : null; };
  const out = [];
  for (const l of lines.slice(start)) {
    const c = split(l); const amount = parseFloat(String(c[iA] || '').replace(/[^\d,.-]/g, '').replace(',', '.')); if (!isFinite(amount)) continue;
    const raw = String(c[iD] || ''); let m, month = monthNow();
    if ((m = raw.match(/(\d{4})[-/.](\d{1,2})/))) month = `${m[1]}-${m[2].padStart(2, '0')}`;
    else if ((m = raw.match(/\d{1,2}[-/.](\d{1,2})[-/.](\d{4})/))) month = `${m[2]}-${m[1].padStart(2, '0')}`;
    else if ((m = raw.match(/(\d{1,2})[-/.](\d{4})/))) month = `${m[2]}-${m[1].padStart(2, '0')}`;
    out.push({ id: Math.random().toString(36).slice(2), month, code: iC >= 0 ? norm(c[iC]) : null, amount, note: 'import CSV' });
  }
  return out;
}

function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }
function nav(active) {
  const item = (href, key, icon, label) => `<a href="${href}" class="${active === key ? 'on' : ''}" ${active === key ? 'aria-current="page"' : ''}>${icon}${label}</a>`;
  return `<nav class="bar" aria-label="Navigation"><div class="in">${item('#/', 'maps', ICON.maps, 'Mes maps')}${item('#/gains', 'gains', ICON.cash, 'Gains')}${item('#/infos', 'infos', ICON.gear, 'Infos')}</div></nav>`;
}
function render(html) { $root.innerHTML = html; }
function barHeights(list) { const max = Math.max(...list.map(m => m.amount), 1); return list.map(m => [Math.max(4, m.amount / max * 100), m]); }

// ---------------- mes maps ----------------
async function viewDashboard() {
  const { islands, status } = await loadAll();
  const es = earningsSummary(); const now = Date.now();
  const rows = islands.map(i => ({ ...i, live: liveOf(i.minute), unique7: sumSince(i.day, 'uniquePlayers', now - 7.5 * 864e5), money: es.byCode[i.code] || 0 }));
  const liveTotal = rows.reduce((s, i) => s + (i.live.value || 0), 0), unique7 = rows.reduce((s, i) => s + (i.unique7 || 0), 0);
  render(`<div class="app">
    <div class="row between">
      <div class="col" style="gap:2px"><span class="small dim">Island Pulse</span><h1 class="display">MES MAPS</h1></div>
      <span class="pill live" title="Mise à jour ${esc(ago(status.updatedAt))}"><span class="dot"></span>LIVE</span>
    </div>
    <a href="#/gains" class="card money col" style="text-decoration:none;color:inherit">
      <span class="small" style="color:#E6DFFF;font-weight:600">Gains ce mois-ci</span>
      <span class="big lime">${money(es.thisMonth)}</span>
      <span class="small" style="color:#E6DFFF">${es.total ? 'Total depuis le début : ' + money(es.total) : 'Touche pour ajouter tes gains'}</span>
    </a>
    <div class="grid2">
      <div class="card tile col" style="gap:4px"><span class="xs muted">Joueurs en ce moment</span><span class="num">${!liveTotal && rows.some(i => i.live.low) ? '< 5' : n(liveTotal)}</span></div>
      <div class="card tile col" style="gap:4px"><span class="xs muted">Joueurs sur 7 j</span><span class="num">${n(unique7)}</span></div>
    </div>
    <span class="section">Tes îles</span>
    <div class="col" style="gap:10px">
      ${rows.map(i => `<a class="island" href="#/map/${esc(i.code)}">
        <div class="thumb" style="background:${colorFor(i.code)};box-shadow:0 0 12px ${colorFor(i.code)}">${esc(String(i.title || '?').trim()[0].toUpperCase())}</div>
        <div class="grow col" style="gap:3px"><strong class="ellipsis">${esc(i.title)}</strong><span class="xs dim">${esc(i.code)}</span>${i.error ? `<span class="xs err">${esc(i.error)}</span>` : ''}</div>
        <div class="col right" style="gap:3px;align-items:flex-end"><strong style="color:var(--cyan)">${liveText(i.live, ' en jeu')}</strong><span class="xs" style="color:var(--lime)">${i.money ? '+' + money(i.money) : ''}</span></div>
      </a>`).join('')}
    </div>
    <p class="xs dim" style="text-align:center">Stats publiques Epic · mises à jour ${status.updatedAt ? esc(ago(status.updatedAt)) : 'bientôt (première collecte en cours)'}.<br>Moins de 5 joueurs = pas de chiffre (règle d’Epic).</p>
  </div>${nav('maps')}`);
  refreshTimer = setTimeout(() => (location.hash === '#/' || location.hash === '') && route(), 120000);
}

// ---------------- détail d'une map ----------------
const METRICS = { peakCCU: 'Joueurs en jeu', uniquePlayers: 'Joueurs uniques', plays: 'Parties', minutesPlayed: 'Minutes jouées' };
async function viewMap(code) {
  const d = await getJSON(`data/island-${code}.json`);
  const now = Date.now(), col = colorFor(code), es = earningsSummary();
  const series = chartRange === '24h' ? d.minute : chartRange === '7d' ? (d.hour || []).filter(r => +new Date(r.ts) >= now - 7 * 864e5) : chartRange === '30d' ? (d.day || []).filter(r => +new Date(r.ts) >= now - 30 * 864e5) : d.day;
  const live = liveOf(d.minute), since = now - 7.5 * 864e5;
  const k = { plays7: sumSince(d.day, 'plays', since), unique7: sumSince(d.day, 'uniquePlayers', since), minutes7: sumSince(d.day, 'minutesPlayed', since), avg: last(d.day, 'averageMinutesPerPlayer').value, d1: last(d.day, 'd1').value, d7: last(d.day, 'd7').value, fav7: sumSince(d.day, 'favorites', since), rec7: sumSince(d.day, 'recommendations', since) };
  const mine = es.list.filter(e => e.code === code);
  const byMonth = Object.entries(mine.reduce((a, e) => (a[e.month] = (a[e.month] || 0) + e.amount, a), {})).sort().map(([month, amount]) => ({ month, amount }));
  const firstDay = (d.day || [])[0];
  const note = (chartRange === '30d' || chartRange === 'all') && firstDay && +new Date(firstDay.ts) > now - 8 * 864e5 ? 'Epic ne garde que 7 jours : l’historique s’allonge tout seul chaque jour.' : null;
  render(`<div class="app">
    <div class="row">
      <a href="#/" class="btn icon" aria-label="Retour">${ICON.back}</a>
      <div class="grow col" style="gap:2px"><h1 class="display ellipsis" style="font-size:26px">${esc(d.title || code)}</h1><span class="xs dim">${esc(code)}</span></div>
    </div>
    <div class="card cyan col" style="gap:10px">
      <div class="row between"><span class="small muted" style="font-weight:600">Joueurs en jeu</span><span class="pill live" style="padding:0;border:none"><span class="dot ${live.value == null && !live.low ? 'off' : ''}"></span>${live.ts ? esc(ago(live.ts)) : 'pas de donnée'}</span></div>
      <span class="big cyan">${liveText(live)}</span>${live.low ? '<span class="xs dim">Moins de 5 joueurs en ce moment : Epic n’affiche pas le chiffre exact.</span>' : ''}
      <div class="chips" role="group" aria-label="Indicateur">${Object.entries(METRICS).map(([key, l]) => `<button class="chip ${chartMetric === key ? 'on' : ''}" data-metric="${key}">${l}</button>`).join('')}</div>
      <svg class="chart" id="chart" viewBox="0 0 320 150" preserveAspectRatio="none" role="img" aria-label="Évolution ${esc(METRICS[chartMetric])}"></svg>
      <div class="tip" id="tip"></div>
      <div class="chips" role="group" aria-label="Période">${[['24h', '24 h'], ['7d', '7 j'], ['30d', '30 j'], ['all', 'Tout']].map(([r, l]) => `<button class="chip ${chartRange === r ? 'on' : ''}" data-range="${r}">${l}</button>`).join('')}</div>
      ${note ? `<span class="xs dim">${note}</span>` : ''}
    </div>
    <div class="grid2">
      ${[['Parties (7 j)', n(k.plays7)], ['Joueurs (cumul 7 j)', n(k.unique7)], ['Temps moyen / joueur', mins(k.avg)], ['Rétention J1', pct(k.d1)], ['Rétention J7', pct(k.d7)], ['Favoris (7 j)', n(k.fav7)], ['Minutes jouées (7 j)', n(k.minutes7)], ['Recommandations (7 j)', n(k.rec7)]]
        .map(([l, v]) => `<div class="card col" style="gap:4px;padding:12px"><span class="xs muted">${l}</span><span class="kpi">${v}</span></div>`).join('')}
    </div>
    <a href="#/gains" class="card money lime col" style="text-decoration:none;color:inherit;gap:10px">
      <div class="row between"><span class="small" style="color:#E6DFFF;font-weight:600">Gains de cette map</span><span class="xs" style="color:#E6DFFF">ce mois</span></div>
      <span class="big lime" style="font-size:38px">${money(es.byCode[code] || 0)}</span>
      ${byMonth.length ? `<div class="bars">${barHeights(byMonth.slice(-8)).map(([h, m]) => `<div style="height:${h}%" title="${esc(monthLabel(m.month))} : ${esc(money(m.amount))}"></div>`).join('')}</div><span class="xs" style="color:#E6DFFF">Total : ${money(mine.reduce((s, e) => s + e.amount, 0))} · par mois</span>` : `<span class="xs" style="color:#E6DFFF">Aucun gain saisi pour cette map. Touche pour en ajouter.</span>`}
    </a>
  </div>${nav('maps')}`);
  drawChart(document.getElementById('chart'), series || [], chartMetric, col);
  document.querySelectorAll('[data-range]').forEach(b => b.onclick = () => { chartRange = b.dataset.range; viewMap(code); });
  document.querySelectorAll('[data-metric]').forEach(b => b.onclick = () => { chartMetric = b.dataset.metric; viewMap(code); });
  refreshTimer = setTimeout(() => location.hash === '#/map/' + code && viewMap(code), 120000);
}

// ---------------- gains ----------------
async function viewGains() {
  const s = earningsSummary();
  const { islands } = await loadAll().catch(() => ({ islands: [] }));
  const months = Object.entries(s.byMonth).sort().slice(-8).map(([month, amount]) => ({ month, amount }));
  render(`<div class="app">
    <h1 class="display">MES GAINS</h1>
    <div class="card money col" style="gap:8px">
      <span class="small" style="color:#E6DFFF;font-weight:600">Ce mois-ci</span>
      <span class="big lime">${money(s.thisMonth)}</span>
      <span class="small" style="color:#E6DFFF">Total : ${money(s.total)}</span>
      ${months.length ? `<div class="bars" style="margin-top:6px">${barHeights(months).map(([h, m]) => `<div style="height:${h}%" title="${esc(monthLabel(m.month))} : ${esc(money(m.amount))}"></div>`).join('')}</div>
      <div class="row between xs" style="color:#E6DFFF"><span>${esc(monthLabel(months[0].month))}</span><span>${esc(monthLabel(months[months.length - 1].month))}</span></div>` : ''}
    </div>
    <form class="card col" id="gForm" style="gap:12px">
      <strong>Ajouter un paiement</strong>
      <div class="grid2">
        <label>Mois<input type="month" id="gMonth" value="${monthNow()}" required></label>
        <label>Montant ($)<input id="gAmt" inputmode="decimal" placeholder="0,00" required></label>
      </div>
      <label>Île<select id="gCode"><option value="">Toutes / non précisé</option>${islands.map(i => `<option value="${esc(i.code)}">${esc(i.title)}</option>`).join('')}</select></label>
      <button class="btn primary full" type="submit">${ICON.plus} Ajouter</button>
      <p id="gmsg" class="err" style="margin:0"></p>
    </form>
    <div class="card col" style="gap:10px">
      <strong>Importer un fichier CSV</strong>
      <span class="small muted">Une colonne <b>mois</b>, une colonne <b>montant</b>, et en option le <b>code</b> de l’île.</span>
      <label class="btn" style="flex-direction:row;color:var(--text);font-size:15px">Choisir un fichier<input type="file" id="csv" accept=".csv,text/csv" style="display:none"></label>
    </div>
    <span class="section">Historique</span>
    <div class="card" style="padding:4px 16px">
      ${s.list.length ? s.list.slice().sort((a, b) => b.month.localeCompare(a.month)).map(e => `<div class="list-item">
        <div class="grow col" style="gap:2px"><strong>${esc(money(e.amount))}</strong><span class="xs dim">${esc(monthLabel(e.month))} · ${esc((islands.find(i => i.code === e.code) || {}).title || e.code || 'Toutes les îles')}${e.note ? ' · ' + esc(e.note) : ''}</span></div>
        <button class="btn icon danger" data-del="${esc(e.id)}" aria-label="Supprimer ce paiement">${ICON.trash}</button></div>`).join('') : '<p class="small muted">Aucun paiement enregistré pour l’instant.</p>'}
    </div>
    <p class="xs dim" style="text-align:center">Tes gains restent privés : ils sont enregistrés seulement sur cet appareil.</p>
  </div>${nav('gains')}`);
  document.getElementById('gForm').onsubmit = e => {
    e.preventDefault();
    const amount = parseFloat(gAmt.value.replace(',', '.'));
    if (!isFinite(amount)) { gmsg.textContent = 'Montant invalide'; return; }
    saveEarnings([...loadEarnings(), { id: Math.random().toString(36).slice(2), month: gMonth.value || monthNow(), code: gCode.value || null, amount, note: '' }]);
    toast('Paiement ajouté'); viewGains();
  };
  document.getElementById('csv').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    const rows = parseCsv(await f.text());
    if (!rows.length) return toast('Aucune ligne lisible');
    saveEarnings([...loadEarnings(), ...rows]); toast(`${rows.length} ligne(s) importée(s)`); viewGains();
  };
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { saveEarnings(loadEarnings().filter(x => x.id !== b.dataset.del)); viewGains(); });
}

// ---------------- infos ----------------
async function viewInfos() {
  const status = await getJSON('data/status.json').catch(() => ({}));
  render(`<div class="app">
    <h1 class="display">INFOS</h1>
    <div class="card col" style="gap:8px">
      <strong>Mettre l’appli sur ton écran d’accueil</strong>
      <span class="small muted"><b>iPhone</b> (Safari) : bouton Partager puis « Sur l’écran d’accueil ».</span>
      <span class="small muted"><b>Android</b> (Chrome) : menu ⋮ puis « Ajouter à l’écran d’accueil ».</span>
    </div>
    <div class="card col" style="gap:8px">
      <strong>Mise à jour des stats</strong>
      <span class="small muted">Dernière collecte : ${status.updatedAt ? esc(new Date(status.updatedAt).toLocaleString('fr-FR')) : 'en attente'}</span>
      <span class="small muted">GitHub récupère tes stats chez Epic environ toutes les 15 minutes, même quand ton PC est éteint.</span>
    </div>
    <div class="card col" style="gap:8px">
      <strong>Ajouter une autre map</strong>
      <span class="small muted">Sur GitHub, modifie le fichier <code>data/islands.json</code> et ajoute une ligne avec le code de ta map. Ou demande à Claude de le faire.</span>
    </div>
  </div>${nav('infos')}`);
}

// ---------------- routeur ----------------
async function route() {
  clearTimeout(refreshTimer);
  const h = location.hash.replace(/^#/, '') || '/';
  try {
    const m = h.match(/^\/map\/([\d-]+)$/);
    if (m) return await viewMap(m[1]);
    if (h === '/gains') return await viewGains();
    if (h === '/infos') return await viewInfos();
    return await viewDashboard();
  } catch (e) {
    render(`<div class="app"><div class="empty col" style="gap:12px"><strong>Pas encore de données</strong><span class="small">${esc(e.message)}. La première collecte arrive dans quelques minutes.</span><button class="btn primary" onclick="route()">Réessayer</button></div></div>${nav('')}`);
  }
}
window.addEventListener('hashchange', route);
route();
