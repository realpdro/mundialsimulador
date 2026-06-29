// Motor de "en vivo" del lado cliente. Sondea /live.php (feed cacheado) cada ~35s y actualiza
// EN LA PÁGINA, sin recargar: la franja de partidos en juego, los marcadores/insignias de las
// tarjetas (MatchCard) y las clasificaciones de grupo (clasificados + grupos). Autocontenido:
// recibe equipos/grupos/etiquetas por un <script id="live-cfg"> y trae su propia tabla de
// clasificación (idéntica a lib/standings) para no arrastrar datos pesados al bundle.

interface Entry { status: string; scores?: Record<string, number>; winner?: string; live?: boolean; minute?: number }
interface Cfg { lang: string; teams: Record<string, [string, string]>; groups: Record<string, string[]>; labels: { live: string; fin: string; hoyHref: string } }

function readCfg(): Cfg | null {
  const el = document.getElementById('live-cfg');
  if (!el || !el.textContent) return null;
  try { return JSON.parse(el.textContent) as Cfg; } catch { return null; }
}

// Clasificación real de un grupo a partir de byPair (solo partidos FINISHED). Mismo criterio que el server.
function standings(codes: string[], byPair: Record<string, Entry>) {
  const st: Record<string, any> = {};
  codes.forEach((c) => (st[c] = { code: c, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0 }));
  let played = 0;
  for (let i = 0; i < codes.length; i++)
    for (let j = i + 1; j < codes.length; j++) {
      const a = codes[i], b = codes[j];
      const r = byPair[[a, b].slice().sort().join('-')];
      if (!r || r.status !== 'FINISHED' || !r.scores) continue;
      const sa = r.scores[a], sb = r.scores[b];
      if (sa == null || sb == null) continue;
      played++;
      const A = st[a], B = st[b];
      A.pj++; B.pj++; A.gf += sa; A.gc += sb; B.gf += sb; B.gc += sa;
      if (sa > sb) { A.g++; B.p++; A.pts += 3; } else if (sb > sa) { B.g++; A.p++; B.pts += 3; } else { A.e++; B.e++; A.pts++; B.pts++; }
    }
  codes.forEach((c) => (st[c].dg = st[c].gf - st[c].gc));
  const order = codes.slice().sort((x, y) => st[y].pts - st[x].pts || st[y].dg - st[x].dg || st[y].gf - st[x].gf || codes.indexOf(x) - codes.indexOf(y));
  return { order: order.map((c) => st[c]), played };
}

function flagImg(iso: string) {
  return `<img src="/flags/${iso}.webp" width="20" height="14" alt="" loading="lazy" style="border-radius:2px;vertical-align:-2px">`;
}

function renderBanner(byPair: Record<string, Entry>, c: Cfg) {
  const banner = document.getElementById('live-banner');
  if (!banner) return;
  const keys = Object.keys(byPair).filter((k) => byPair[k] && byPair[k].live);
  if (!keys.length) { banner.hidden = true; banner.innerHTML = ''; return; }
  const items = keys.map((k) => {
    const v = byPair[k], p = k.split('-'), a = p[0], b = p[1];
    const sa = v.scores ? v.scores[a] : '', sb = v.scores ? v.scores[b] : '';
    const ta = c.teams[a] || [a, ''], tb = c.teams[b] || [b, ''];
    const mins = v.minute != null ? ` <span class="lb-min">${v.minute}'</span>` : '';
    return `<a class="lb-m" href="${c.labels.hoyHref}">${flagImg(ta[1])} ${ta[0]} <b>${sa}-${sb}</b> ${tb[0]} ${flagImg(tb[1])}${mins}</a>`;
  }).join('');
  banner.innerHTML = `<div class="lb-in"><span class="lb-t">🔴 ${c.labels.live}</span>${items}</div>`;
  banner.hidden = false;
}

function setScore(teamEl: Element, val: number | undefined) {
  if (val == null) return;
  let sc = teamEl.querySelector('.cm-score');
  if (!sc) { sc = document.createElement('b'); sc.className = 'cm-score'; teamEl.appendChild(sc); }
  sc.textContent = String(val);
}

function updateCards(byPair: Record<string, Entry>, c: Cfg) {
  document.querySelectorAll<HTMLElement>('[data-pair]').forEach((card) => {
    const v = byPair[card.getAttribute('data-pair') || ''];
    if (!v) return;
    const a = card.getAttribute('data-a'), b = card.getAttribute('data-b');
    const teams = card.querySelectorAll<HTMLElement>('.cm-teams > .cm-team');
    if (teams.length === 2 && v.scores && a && b) {
      setScore(teams[0], v.scores[a]); setScore(teams[1], v.scores[b]);
      teams[0].classList.toggle('win', v.winner === a);
      teams[1].classList.toggle('win', v.winner === b);
    }
    const stat = card.querySelector('.cm-stat-col');
    if (stat) {
      const old = stat.querySelector('.live, .fin, .time');
      const badge = v.live
        ? `<span class="live">${v.minute != null ? v.minute + "'" : ''}</span>`
        : v.scores ? `<span class="fin">FT</span>` : null;
      if (badge && old) old.outerHTML = badge;
    }
    if (v.scores || v.live) card.classList.add('played');
  });
}

function updateStandings(byPair: Record<string, Entry>, c: Cfg) {
  // clasificados: rejilla por grupo
  document.querySelectorAll<HTMLElement>('.qcard[data-group]').forEach((card) => {
    const codes = c.groups[card.getAttribute('data-group') || ''];
    if (!codes) return;
    const s = standings(codes, byPair);
    const byCode: Record<string, HTMLElement> = {};
    card.querySelectorAll<HTMLElement>('.qrow').forEach((r) => (byCode[r.getAttribute('data-code') || ''] = r));
    s.order.forEach((row: any, i: number) => {
      const el = byCode[row.code]; if (!el) return;
      const pos = el.querySelector('.qpos'); if (pos) pos.textContent = String(i + 1);
      const pts = el.querySelector('.qpts'); if (pts) pts.textContent = s.played > 0 ? String(row.pts) : '·';
      el.style.borderLeftColor = i < 2 ? '#22c55e' : i === 2 ? '#f59e0b' : '#ef4444';
      card.appendChild(el);
    });
  });
  // grupos/[grupo]: tabla de clasificación completa
  document.querySelectorAll<HTMLElement>('[data-live-stand]').forEach((tbody) => {
    const codes = c.groups[tbody.getAttribute('data-live-stand') || ''];
    if (!codes) return;
    const s = standings(codes, byPair);
    const byCode: Record<string, HTMLElement> = {};
    tbody.querySelectorAll<HTMLElement>('tr[data-code]').forEach((r) => (byCode[r.getAttribute('data-code') || ''] = r));
    s.order.forEach((row: any, i: number) => {
      const el = byCode[row.code]; if (!el) return;
      const tds = el.querySelectorAll('td');
      const pos = el.querySelector('.pos'); if (pos) pos.textContent = String(i + 1);
      if (tds[1]) tds[1].textContent = String(row.pj);
      if (tds[2]) tds[2].textContent = String(row.g);
      if (tds[3]) tds[3].textContent = String(row.e);
      if (tds[4]) tds[4].textContent = String(row.p);
      if (tds[5]) tds[5].textContent = (row.dg > 0 ? '+' : '') + row.dg;
      const pts = el.querySelector('.pts'); if (pts) pts.textContent = String(row.pts);
      el.className = i === 0 ? 'q1' : i === 1 ? 'q2' : i === 2 ? 'q3' : '';
      tbody.appendChild(el);
    });
  });
}

export function startLive() {
  const c = readCfg();
  if (!c) return;
  function tick() {
    fetch('/live.php', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || !d.byPair) return;
        renderBanner(d.byPair, c!);
        updateCards(d.byPair, c!);
        updateStandings(d.byPair, c!);
      })
      .catch(() => {});
  }
  tick();
  setInterval(tick, 35000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
}
