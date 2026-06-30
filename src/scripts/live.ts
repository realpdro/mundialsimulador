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

function updateTicker(byPair: Record<string, Entry>, _c: Cfg) {
  document.querySelectorAll<HTMLElement>('.tk-chip[data-pair]').forEach((chip) => {
    const v = byPair[chip.getAttribute('data-pair') || ''];
    if (!v) return;
    const a = chip.getAttribute('data-a'), b = chip.getAttribute('data-b');
    const sc = chip.querySelector('.tk-sc');
    if (sc && v.scores && a && b) sc.textContent = `${v.scores[a]}-${v.scores[b]}`;
    const stat = chip.querySelector('.tk-stat');
    if (stat) {
      if (v.live) { stat.textContent = v.minute != null ? `${v.minute}'` : '•'; stat.className = 'tk-stat live'; chip.classList.add('live'); }
      else if (v.scores) { stat.textContent = 'FT'; stat.className = 'tk-stat'; }
    }
  });
}

function setScoreEl(el: Element | null, val: number | undefined) {
  if (!el || val == null) return;
  const next = String(val);
  if (el.textContent !== next) {
    el.textContent = next;
    el.classList.remove('flash');
    void (el as HTMLElement).offsetWidth;
    el.classList.add('flash');
  }
}

function updateCards(byPair: Record<string, Entry>, _c: Cfg) {
  document.querySelectorAll<HTMLElement>('.am[data-pair]').forEach((card) => {
    const v = byPair[card.getAttribute('data-pair') || ''];
    if (!v) return;
    const a = card.getAttribute('data-a'), b = card.getAttribute('data-b');
    const sa = card.querySelector('.am-score[data-side="a"]');
    const sb = card.querySelector('.am-score[data-side="b"]');
    if (v.scores && a && b) {
      setScoreEl(sa, v.scores[a]);
      setScoreEl(sb, v.scores[b]);
      const w = v.winner;
      if (w) {
        card.querySelector('.am-side.home')?.classList.toggle('lose', w === b);
        card.querySelector('.am-side.away')?.classList.toggle('lose', w === a);
        sa?.classList.toggle('win', w === a); sa?.classList.toggle('lose', w === b);
        sb?.classList.toggle('win', w === b); sb?.classList.toggle('lose', w === a);
      }
    }
    const st = card.querySelector('.am-st');
    if (st) {
      if (v.live) { st.textContent = v.minute != null ? `${v.minute}'` : '•'; st.className = 'am-st live'; }
      else if (v.scores) { st.textContent = 'Final'; st.className = 'am-st fin'; }
    }
    if (v.scores || v.live) card.classList.add('played');
  });
}

// Tarjeta destacada (.feat): estructura propia, no .am. Mantiene marcador + etiqueta coherentes
// (un destacado elegido como "próximo" en el build que ya se ha jugado pasa a "Final", no se queda en "Próximo").
function updateFeatured(byPair: Record<string, Entry>, c: Cfg) {
  const f = document.querySelector<HTMLElement>('.feat[data-pair]');
  if (!f) return;
  const v = byPair[f.getAttribute('data-pair') || ''];
  if (!v) return;
  const a = f.getAttribute('data-a'), b = f.getAttribute('data-b');
  if (v.scores && a && b) {
    const sa = f.querySelector('.feat-score b[data-side="a"]');
    const sb = f.querySelector('.feat-score b[data-side="b"]');
    if (sa) setScoreEl(sa, v.scores[a]);
    if (sb) setScoreEl(sb, v.scores[b]);
    f.classList.add('played');
  }
  const st = f.querySelector('.feat-st');
  const tag = f.querySelector('.feat-tag');
  if (v.live) {
    if (st) { st.textContent = v.minute != null ? `${v.minute}'` : '•'; st.className = 'feat-st live'; }
    if (tag) { tag.textContent = c.labels.live; tag.className = 'feat-tag live'; }
  } else if (v.scores) {
    if (st) { st.textContent = 'Final'; st.className = 'feat-st'; }
    if (tag) { tag.textContent = 'Final'; tag.className = 'feat-tag'; }
  }
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

let liveTimer: ReturnType<typeof setInterval> | null = null;
let liveTick: (() => void) | null = null;
let visBound = false;

// Idempotente: seguro re-llamarlo en cada astro:page-load (View Transitions). Limpia el
// intervalo previo y lee el #live-cfg de la página nueva; el listener de visibilidad se
// registra una sola vez. Las queries son sobre `document` en vivo → apuntan al DOM actual.
export function startLive() {
  if (liveTimer !== null) { clearInterval(liveTimer); liveTimer = null; }
  liveTick = null;
  const c = readCfg();
  if (!c) return;
  function tick() {
    fetch('/live.php', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || !d.byPair) return;
        updateTicker(d.byPair, c!);
        updateFeatured(d.byPair, c!);
        updateCards(d.byPair, c!);
        updateStandings(d.byPair, c!);
      })
      .catch(() => {});
  }
  liveTick = tick;
  tick();
  liveTimer = setInterval(tick, 35000);
  if (!visBound) {
    visBound = true;
    document.addEventListener('visibilitychange', () => { if (!document.hidden && liveTick) liveTick(); });
  }
}
