import {
  TEAMS, GROUPS, LETTERS, PAIRS, R32, R16, QF, SF, TP, FN, ALL_KO, MATCHES,
  THIRD_SLOTS, THIRD_TABLE, type Lang,
} from '../data/tournament';
import { UI } from '../i18n/ui';

type Side = 'a' | 'b';
interface Score { sa: string; sb: string; }
interface KoState { sa?: string; sb?: string; w?: '' | Side; }
interface State { mode: 'match' | 'rank'; g: Record<string, Score[]>; k: Record<number, KoState>; rank: Record<string, string[]>; thirdRank: string[]; }

const root = document.querySelector<HTMLElement>('.sim');
if (root) init(root);

function init(el: HTMLElement) {
  const lang = (el.dataset.lang as Lang) || 'es';
  const ui = UI[lang];
  const LS_KEY = 'simulador-mundial-2026';
  const $ = <T extends Element>(s: string) => el.querySelector<T>(s)!;

  const tname = (c?: string | null) => (c && TEAMS[c] ? TEAMS[c].names[lang] : ui.common.tbd);
  const flag = (c?: string | null, lg?: boolean) =>
    c && TEAMS[c] ? `<img class="flag${lg ? ' lg' : ''}" loading="lazy" decoding="async" src="https://flagcdn.com/w40/${TEAMS[c].iso}.png" alt="">` : '';
  const mkEl = (html: string) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild as HTMLElement; };
  const num = (v: any): number | null => { if (v === '' || v == null) return null; const n = +v; return isNaN(n) ? null : n; };
  const cmp = (a: any, b: any) => (b.pts - a.pts) || (b.dg - a.dg) || (b.gf - a.gf);

  function blankState(): State {
    const g: Record<string, Score[]> = {}; LETTERS.forEach((L) => g[L] = PAIRS.map(() => ({ sa: '', sb: '' })));
    const rank: Record<string, string[]> = {}; LETTERS.forEach((L) => rank[L] = GROUPS[L].slice());
    return { mode: 'match', g, k: {}, rank, thirdRank: LETTERS.slice() };
  }
  function migrate(s: any): State {
    if (!s || typeof s !== 'object') return blankState();
    const b = blankState();
    s.mode = s.mode === 'rank' ? 'rank' : 'match';
    if (!s.g) s.g = b.g; else LETTERS.forEach((L) => { if (!Array.isArray(s.g[L]) || s.g[L].length !== 6) s.g[L] = b.g[L]; });
    if (!s.k || typeof s.k !== 'object') s.k = {};
    if (!s.rank) s.rank = b.rank; else LETTERS.forEach((L) => { if (!Array.isArray(s.rank[L]) || s.rank[L].length !== 4 || s.rank[L].some((c: string) => !GROUPS[L].includes(c))) s.rank[L] = GROUPS[L].slice(); });
    if (!Array.isArray(s.thirdRank) || s.thirdRank.length !== 12 || LETTERS.some((L) => !s.thirdRank.includes(L))) s.thirdRank = LETTERS.slice();
    return s as State;
  }
  function load(): State { try { return migrate(JSON.parse(localStorage.getItem(LS_KEY) || 'null')); } catch { return blankState(); } }
  function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {} }
  let state = load();

  // ---- compute ----
  function computeScores(L: string) {
    const codes = GROUPS[L]; const st: any = {};
    codes.forEach((c) => st[c] = { code: c, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0 });
    let played = 0;
    state.g[L].forEach((m, i) => {
      const sa = num(m.sa), sb = num(m.sb); if (sa === null || sb === null) return; played++;
      const [hi, ai] = PAIRS[i]; const h = st[codes[hi]], a = st[codes[ai]];
      h.pj++; a.pj++; h.gf += sa; h.gc += sb; a.gf += sb; a.gc += sa;
      if (sa > sb) { h.g++; a.p++; h.pts += 3; } else if (sa < sb) { a.g++; h.p++; a.pts += 3; } else { h.e++; a.e++; h.pts++; a.pts++; }
    });
    codes.forEach((c) => st[c].dg = st[c].gf - st[c].gc);
    const order = [...codes].sort((x, y) => cmp(st[x], st[y]) || codes.indexOf(x) - codes.indexOf(y));
    return { order, st, complete: played === 6, played };
  }
  function computeRank(L: string) {
    const order = state.rank[L].slice(); const st: any = {};
    order.forEach((c) => st[c] = { code: c, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0 });
    return { order, st, complete: true, played: 0 };
  }
  const computeGroup = (L: string) => state.mode === 'rank' ? computeRank(L) : computeScores(L);

  function computeAll() {
    const gr: any = {}; LETTERS.forEach((L) => gr[L] = computeGroup(L));
    let top8: string[];
    if (state.mode === 'rank') top8 = state.thirdRank.slice(0, 8);
    else {
      const thirds = LETTERS.map((L) => ({ L, ...gr[L].st[gr[L].order[2]] }));
      thirds.sort((a: any, b: any) => cmp(a, b) || LETTERS.indexOf(a.L) - LETTERS.indexOf(b.L));
      top8 = thirds.slice(0, 8).map((t: any) => t.L);
    }
    return { gr, assign: assignThirds(top8), top8: new Set(top8) };
  }
  function assignThirds(groups: string[]): Record<number, string> {
    if (THIRD_TABLE) { const key = [...groups].sort().join(''); if (THIRD_TABLE[key]) return { ...THIRD_TABLE[key] } as any; }
    const res: any = {}; const used = new Set<string>();
    (function bt(i: number): boolean {
      if (i === THIRD_SLOTS.length) return true;
      const s = THIRD_SLOTS[i];
      for (const g of groups) { if (used.has(g) || !s.allow.includes(g)) continue; used.add(g); res[s.m] = g; if (bt(i + 1)) return true; used.delete(g); delete res[s.m]; }
      return false;
    })(0);
    if (Object.keys(res).length !== 8) { const rem = [...groups]; for (const k in res) delete res[k]; THIRD_SLOTS.forEach((s) => { let p = rem.find((g) => s.allow.includes(g)) || rem[0]; res[s.m] = p; rem.splice(rem.indexOf(p), 1); }); }
    return res;
  }
  function resolve(ref: any, ctx: any): string | null {
    if (!ref) return null;
    if (ref.t === '1') return ctx.gr[ref.g].order[0];
    if (ref.t === '2') return ctx.gr[ref.g].order[1];
    if (ref.t === '3') { const L = ctx.assign[ref.m]; return L ? ctx.gr[L].order[2] : null; }
    if (ref.t === 'W') return winnerOf(ref.m, ctx);
    if (ref.t === 'L') return loserOf(ref.m, ctx);
    return null;
  }
  function winnerOf(m: number, ctx: any): string | null {
    const def = MATCHES[m]; const ta = resolve(def.a, ctx), tb = resolve(def.b, ctx); if (!ta || !tb) return null;
    const k = state.k[m] || {}; const sa = num(k.sa), sb = num(k.sb);
    if (sa !== null && sb !== null && sa !== sb) return sa > sb ? ta : tb;
    if (k.w === 'a') return ta; if (k.w === 'b') return tb; return null;
  }
  function loserOf(m: number, ctx: any): string | null {
    const def = MATCHES[m]; const ta = resolve(def.a, ctx), tb = resolve(def.b, ctx); if (!ta || !tb) return null;
    const w = winnerOf(m, ctx); if (!w) return null; return w === ta ? tb : ta;
  }

  // ---- render groups ----
  function buildGroups() {
    const host = $('#groupArea'); host.innerHTML = '';
    host.appendChild(modeBar());
    if (state.mode === 'rank') host.appendChild(thirdsPanel());
    const grid = mkEl('<div class="groups" id="groupGrid"></div>'); host.appendChild(grid);
    LETTERS.forEach((L) => grid.appendChild(state.mode === 'rank' ? rankCard(L) : matchCard(L)));
    if (state.mode === 'match') LETTERS.forEach(renderStanding);
  }
  function modeBar() {
    return mkEl(`<div class="modebar">
      <div class="seg">
        <button class="modebtn ${state.mode === 'match' ? 'on' : ''}" data-mode="match">${ui.sim.modeMatch}</button>
        <button class="modebtn ${state.mode === 'rank' ? 'on' : ''}" data-mode="rank">${ui.sim.modeRank}</button>
      </div>
      ${state.mode === 'rank'
        ? `<button class="seedbtn" id="seedBtn">${ui.sim.seed}</button><span class="hint">${ui.sim.hintRank}</span>`
        : `<span class="hint">${ui.sim.hintMatch}</span>`}
    </div>`);
  }
  function matchCard(L: string) {
    const codes = GROUPS[L]; let rows = '';
    PAIRS.forEach((p, i) => {
      const h = codes[p[0]], a = codes[p[1]];
      rows += `<div class="match" data-i="${i}">
        <div class="side home"><span class="tname">${tname(h)}</span>${flag(h)}</div>
        <div class="score"><input type="number" min="0" inputmode="numeric" data-g="${L}" data-i="${i}" data-s="sa" value="${state.g[L][i].sa}"><span class="vs">-</span><input type="number" min="0" inputmode="numeric" data-g="${L}" data-i="${i}" data-s="sb" value="${state.g[L][i].sb}"></div>
        <div class="side away">${flag(a)}<span class="tname">${tname(a)}</span></div></div>`;
    });
    return mkEl(`<div class="group" data-g="${L}"><div class="ghead"><div class="gname"><span class="tag">${L}</span> ${ui.common.group} ${L}</div><button class="dice" data-rg="${L}">${ui.sim.random}</button></div><div class="stand-wrap"></div><div class="matches"><div class="mlabel">${ui.sim.matches}</div>${rows}</div></div>`);
  }
  function renderStanding(L: string) {
    const card = el.querySelector(`.group[data-g="${L}"]`); if (!card) return;
    const { order, st } = computeScores(L); let rows = '';
    order.forEach((c, idx) => {
      const s = st[c]; const q = idx < 3 ? `q${idx + 1}` : '';
      rows += `<tr class="${q}"><td class="team"><div class="row"><span class="pos">${idx + 1}</span>${flag(c)}<span class="tname">${tname(c)}</span></div></td><td>${s.pj}</td><td>${s.g}</td><td>${s.e}</td><td>${s.p}</td><td>${s.dg > 0 ? '+' : ''}${s.dg}</td><td class="pts">${s.pts}</td></tr>`;
    });
    card.querySelector('.stand-wrap')!.innerHTML = `<table class="stand"><thead><tr><th class="teamh">${lang === 'en' ? 'Team' : lang === 'pt' ? 'Seleção' : 'Equipo'}</th><th>${ui.common.pj}</th><th>${ui.common.w}</th><th>${ui.common.d}</th><th>${ui.common.l}</th><th>${ui.common.gd}</th><th>${ui.common.points}</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  function rankCard(L: string) {
    let rows = '';
    state.rank[L].forEach((c, idx) => {
      rows += `<li class="rankrow q${idx + 1}" draggable="true" data-code="${c}"><span class="pos">${idx + 1}</span><span class="tn">${flag(c)}<span class="tname">${tname(c)}</span></span><span class="qlabel">${ui.sim.q[idx]}</span><span class="arrows"><button class="ra" data-dir="-1" data-g="${L}" data-code="${c}">▲</button><button class="ra" data-dir="1" data-g="${L}" data-code="${c}">▼</button></span></li>`;
    });
    return mkEl(`<div class="group" data-g="${L}"><div class="ghead"><div class="gname"><span class="tag">${L}</span> ${ui.common.group} ${L}</div><button class="dice" data-rg="${L}">${ui.sim.random}</button></div><ul class="ranklist dnd" data-list="g" data-g="${L}">${rows}</ul></div>`);
  }
  function thirdsPanel() {
    let rows = '';
    state.thirdRank.forEach((L, idx) => {
      const third = computeRank(L).order[2]; const qual = idx < 8;
      rows += `<li class="thirdrow ${qual ? 'qualified' : ''}" draggable="true" data-l="${L}"><span class="rk">${idx + 1}</span><span class="tn">${flag(third)}<span class="tname">${tname(third)}</span> <span class="gtag">${ui.sim.thirdOf} ${L}</span></span>${idx === 7 ? `<span class="cut">${ui.sim.cut}</span>` : ''}</li>`;
    });
    return mkEl(`<div class="thirds-panel"><h3>${ui.sim.thirdsTitle}</h3><div class="sub">${ui.sim.thirdsSub}</div><ol class="thirdlist dnd" data-list="t">${rows}</ol></div>`);
  }

  // ---- render knockout ----
  function renderKnockout() {
    const ctx = computeAll(); let html = '';
    ([[ui.roundNames.r32, 'r1', R32], [ui.roundNames.r16, '', R16], [ui.roundNames.qf, '', QF], [ui.roundNames.sf, '', SF], [ui.roundNames.final, 'final', FN]] as const).forEach(([name, cls, list]) => {
      html += `<div class="round ${cls}"><div class="rhead">${name}</div><div class="col">`;
      (list as any[]).forEach((def) => html += tieHTML(def, ctx)); html += `</div></div>`;
    });
    html += `<div class="round tp"><div class="rhead">${ui.roundNames.third}</div><div class="col" style="flex:0 0 auto;justify-content:center">${tieHTML(TP[0], ctx)}</div></div>`;
    $('#bracket').innerHTML = html;
    const champ = winnerOf(104, ctx); const box = $('#championBox');
    if (champ) { box.className = 'champion show'; box.innerHTML = `<div class="trophy">🏆</div><div class="lbl">${ui.sim.champLabel}</div><div class="who">${flag(champ, true)} ${tname(champ)}</div>`; }
    else { box.className = 'champion'; box.innerHTML = ''; }
  }
  function tieHTML(def: any, ctx: any) {
    const ta = resolve(def.a, ctx), tb = resolve(def.b, ctx); const k = state.k[def.m] || {}; const w = winnerOf(def.m, ctx); const ready = ta && tb;
    const rowHtml = (side: Side, code: string | null) => {
      const isW = w && code && (side === 'a' ? code === ta : code === tb); const isL = w && code && !isW;
      const cls = !code ? 'tbd' : (isW ? 'win' : (isL ? 'lose' : '')); const sv = side === 'a' ? (k.sa ?? '') : (k.sb ?? '');
      return `<div class="teamrow ${cls}" data-m="${def.m}" data-side="${side}"><div class="t">${flag(code)}<span class="tname">${tname(code)}</span></div><input class="sc" type="number" min="0" inputmode="numeric" data-km="${def.m}" data-ks="${side}" value="${sv}" ${ready ? '' : 'disabled'} onclick="event.stopPropagation()"></div>`;
    };
    const draw = ready && num(k.sa) !== null && num(k.sb) !== null && num(k.sa) === num(k.sb);
    const foot = draw
      ? `<div class="mfoot"><span>${ui.sim.draw}</span><span><span class="pk" data-pk="${def.m}" data-side="a">${ui.sim.penalty}: ${tname(ta)}</span> · <span class="pk" data-pk="${def.m}" data-side="b">${tname(tb)}</span></span></div>`
      : `<div class="mfoot"><span>${ui.sim.match} ${def.m}</span><span></span></div>`;
    return `<div class="tie" data-tie="${def.m}">${rowHtml('a', ta)}${rowHtml('b', tb)}${foot}</div>`;
  }

  // ---- progress / tabs ----
  function updateProgress() {
    if (state.mode === 'rank') { $('#grPill').textContent = ui.sim.ready; ($('#progFill') as HTMLElement).style.width = '100%'; $('#koLock').textContent = '✓'; ($('#koLock') as HTMLElement).style.color = 'var(--green)'; return true; }
    let done = 0, total = 0, played = 0;
    LETTERS.forEach((L) => { const g = computeScores(L); if (g.complete) done++; total += 6; played += g.played; });
    $('#grPill').textContent = `${done}/12`; ($('#progFill') as HTMLElement).style.width = (played / total * 100) + '%';
    const all = done === 12; $('#koLock').textContent = all ? '✓' : '🔒'; ($('#koLock') as HTMLElement).style.color = all ? 'var(--green)' : '';
    return all;
  }
  function switchTab(tab: 'groups' | 'knockout') {
    $('#tabGroups').classList.toggle('active', tab === 'groups');
    $('#tabKO').classList.toggle('active', tab === 'knockout');
    $('#view-groups').classList.toggle('hidden', tab !== 'groups');
    $('#view-knockout').classList.toggle('hidden', tab !== 'knockout');
    if (tab === 'knockout') renderKnockout();
  }

  // ---- events ----
  const vg = $('#view-groups');
  vg.addEventListener('input', (e) => {
    const inp = (e.target as HTMLElement).closest<HTMLInputElement>('input[data-g]'); if (!inp) return;
    let v = inp.value.replace(/[^0-9]/g, ''); if (v.length > 2) v = v.slice(0, 2); inp.value = v;
    state.g[inp.dataset.g!][+inp.dataset.i!][inp.dataset.s as 'sa' | 'sb'] = v;
    renderStanding(inp.dataset.g!); updateProgress(); save();
  });
  vg.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const mode = t.closest<HTMLElement>('.modebtn');
    if (mode) { if (state.mode !== mode.dataset.mode) { state.mode = mode.dataset.mode as any; buildGroups(); updateProgress(); save(); } return; }
    if (t.closest('#seedBtn')) { seedRankFromScores(); buildGroups(); updateProgress(); save(); toast(ui.sim.seedDone); return; }
    const dice = t.closest<HTMLElement>('[data-rg]');
    if (dice) {
      randomizeGroup(dice.dataset.rg!);
      if (state.mode === 'match') { const card = el.querySelector(`.group[data-g="${dice.dataset.rg}"]`)!; card.querySelectorAll<HTMLInputElement>('input[data-g]').forEach((inp) => { inp.value = state.g[inp.dataset.g!][+inp.dataset.i!][inp.dataset.s as 'sa' | 'sb']; }); renderStanding(dice.dataset.rg!); }
      else buildGroups();
      updateProgress(); save(); return;
    }
    const arr = t.closest<HTMLElement>('.ra');
    if (arr) { moveRank(arr.dataset.g!, arr.dataset.code!, +arr.dataset.dir!); buildGroups(); updateProgress(); save(); return; }
  });
  let dragEl: HTMLElement | null = null;
  vg.addEventListener('dragstart', (e) => { const li = (e.target as HTMLElement).closest<HTMLElement>('[draggable]'); if (!li) return; dragEl = li; li.classList.add('dragging'); });
  vg.addEventListener('dragend', () => {
    if (!dragEl) return; dragEl.classList.remove('dragging');
    const list = dragEl.closest<HTMLElement>('.dnd');
    if (list) {
      const rows = [...list.querySelectorAll<HTMLElement>('[draggable]')];
      if (list.dataset.list === 'g') state.rank[list.dataset.g!] = rows.map((r) => r.dataset.code!);
      else state.thirdRank = rows.map((r) => r.dataset.l!);
      save(); buildGroups(); updateProgress();
    }
    dragEl = null;
  });
  vg.addEventListener('dragover', (e) => {
    const list = (e.target as HTMLElement).closest<HTMLElement>('.dnd'); if (!list || !dragEl || dragEl.closest('.dnd') !== list) return;
    e.preventDefault(); const after = dragAfter(list, (e as DragEvent).clientY);
    if (after == null) list.appendChild(dragEl); else list.insertBefore(dragEl, after);
  });
  function dragAfter(list: HTMLElement, y: number) {
    const els = [...list.querySelectorAll<HTMLElement>('[draggable]:not(.dragging)')];
    return els.reduce<{ offset: number; element: HTMLElement | null }>((closest, child) => {
      const box = child.getBoundingClientRect(); const offset = y - box.top - box.height / 2;
      return (offset < 0 && offset > closest.offset) ? { offset, element: child } : closest;
    }, { offset: -Infinity, element: null }).element;
  }
  function moveRank(L: string, code: string, dir: number) { const arr = state.rank[L]; const i = arr.indexOf(code), j = i + dir; if (j < 0 || j >= arr.length) return;[arr[i], arr[j]] = [arr[j], arr[i]]; }
  function seedRankFromScores() {
    LETTERS.forEach((L) => state.rank[L] = computeScores(L).order.slice());
    const thirds = LETTERS.map((L) => { const o = computeScores(L); return { L, ...o.st[o.order[2]] }; });
    thirds.sort((a: any, b: any) => cmp(a, b) || LETTERS.indexOf(a.L) - LETTERS.indexOf(b.L));
    state.thirdRank = thirds.map((t: any) => t.L);
  }

  const bracket = $('#bracket');
  bracket.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const pk = t.closest<HTMLElement>('[data-pk]');
    if (pk) { const m = +pk.dataset.pk!; state.k[m] = state.k[m] || {}; state.k[m].w = pk.dataset.side as Side; save(); renderKnockout(); return; }
    const row = t.closest<HTMLElement>('.teamrow'); if (!row || row.classList.contains('tbd')) return;
    const m = +row.dataset.m!, side = row.dataset.side as Side; state.k[m] = state.k[m] || {};
    state.k[m].w = state.k[m].w === side ? '' : side; save(); renderKnockout();
  });
  bracket.addEventListener('input', (e) => {
    const inp = (e.target as HTMLElement).closest<HTMLInputElement>('input[data-km]'); if (!inp) return;
    let v = inp.value.replace(/[^0-9]/g, ''); if (v.length > 2) v = v.slice(0, 2); inp.value = v;
    const m = +inp.dataset.km!; state.k[m] = state.k[m] || {}; state.k[m][inp.dataset.ks === 'a' ? 'sa' : 'sb'] = v; save();
  });
  bracket.addEventListener('change', (e) => { if ((e.target as HTMLElement).closest('input[data-km]')) renderKnockout(); });

  $('#tabGroups').addEventListener('click', () => switchTab('groups'));
  $('#tabKO').addEventListener('click', () => switchTab('knockout'));

  $('#btnReset').addEventListener('click', () => { if (!confirm(ui.sim.resetConfirm)) return; state = blankState(); save(); buildGroups(); updateProgress(); switchTab('groups'); toast(ui.sim.resetDone); });
  $('#btnRandom').addEventListener('click', () => { LETTERS.forEach(randomizeGroup); if (state.mode === 'rank') state.thirdRank = shuffle(LETTERS.slice()); save(); buildGroups(); updateProgress(); toast(ui.sim.randomDone); });
  function randomizeGroup(L: string) {
    if (state.mode === 'rank') { state.rank[L] = shuffle(GROUPS[L].slice()); return; }
    state.g[L] = PAIRS.map(() => { const r = () => { const x = Math.random(); return x < .45 ? 0 : x < .75 ? 1 : x < .9 ? 2 : x < .97 ? 3 : 4; }; return { sa: String(r()), sb: String(r()) }; });
  }
  function shuffle<T>(a: T[]) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }

  // ---- share ----
  const b64enc = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const b64dec = (b: string) => { b = b.replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '='; return decodeURIComponent(escape(atob(b))); };
  const shareLink = () => location.origin + location.pathname + '#s=' + b64enc(JSON.stringify(state));
  const modalBg = $('#modalBg');
  const openModal = (h: string) => { $('#modalBody').innerHTML = h; modalBg.classList.add('show'); };
  const closeModal = () => modalBg.classList.remove('show');
  $('#modalX').addEventListener('click', closeModal);
  modalBg.addEventListener('click', (e) => { if (e.target === modalBg) closeModal(); });
  $('#btnShare').addEventListener('click', () => {
    const url = shareLink();
    openModal(`<h3>${ui.sim.shareTitle}</h3><p>${ui.sim.shareDesc}</p><div class="linkbox"><input id="shareUrl" readonly value="${url}"><button class="btn primary" id="copyBtn">${ui.sim.copy}</button></div><div class="mrow"><button class="btn" id="imgBtn">${ui.sim.downloadImg}</button></div>`);
    $('#copyBtn').addEventListener('click', () => copyText(url));
    $('#imgBtn').addEventListener('click', () => { $('#imgBtn').textContent = ui.sim.generating; downloadImage().finally(() => { $('#imgBtn').textContent = ui.sim.downloadImg; }); });
    setTimeout(() => { const i = el.querySelector<HTMLInputElement>('#shareUrl'); if (i) { i.focus(); i.select(); } }, 50);
  });
  function copyText(t: string) {
    const done = () => toast(ui.sim.copied);
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(t).then(done).catch(() => fallbackCopy(done));
    else fallbackCopy(done);
  }
  function fallbackCopy(done: () => void) { const i = el.querySelector<HTMLInputElement>('#shareUrl'); if (i) { i.focus(); i.select(); try { document.execCommand('copy'); done(); } catch {} } }
  function loadImg(code: string): Promise<HTMLImageElement | null> { return new Promise((res) => { if (!code || !TEAMS[code]) return res(null); const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => res(null); im.src = 'https://flagcdn.com/w160/' + TEAMS[code].iso + '.png'; }); }
  async function downloadImage() {
    const c = ui.sim.imgCard; const ctx = computeAll();
    const champ = winnerOf(104, ctx), finA = resolve(FN[0].a, ctx), finB = resolve(FN[0].b, ctx);
    const semis = [resolve(SF[0].a, ctx), resolve(SF[0].b, ctx), resolve(SF[1].a, ctx), resolve(SF[1].b, ctx)];
    const winners = LETTERS.map((L) => ctx.gr[L].order[0]);
    const need = [...new Set([champ, finA, finB, ...semis, ...winners].filter(Boolean))] as string[];
    const imgs: Record<string, HTMLImageElement | null> = {};
    (await Promise.all(need.map((cd) => loadImg(cd).then((im) => [cd, im] as const)))).forEach(([cd, im]) => imgs[cd] = im);
    const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d')!; const CX = W / 2;
    g.fillStyle = '#0a0f1c'; g.fillRect(0, 0, W, H);
    const grd = g.createLinearGradient(0, 0, W, 0); grd.addColorStop(0, '#16a34a'); grd.addColorStop(1, '#38bdf8'); g.fillStyle = grd; g.fillRect(0, 0, W, 10);
    g.textAlign = 'center'; g.fillStyle = '#e8eefb'; g.font = '800 60px Inter,Segoe UI,Arial'; g.fillText(c.title, CX, 104);
    g.fillStyle = '#8a99b8'; g.font = '600 25px Inter,Arial'; g.fillText(c.sub, CX, 146);
    const drawTeam = (code: string | null, cx: number, cy: number, fw: number, font: string) => {
      const fh = fw * 2 / 3, im = code ? imgs[code] : null;
      if (im) { g.drawImage(im, cx - fw / 2, cy - fh, fw, fh); g.strokeStyle = 'rgba(255,255,255,.15)'; g.lineWidth = 1; g.strokeRect(cx - fw / 2, cy - fh, fw, fh); }
      g.fillStyle = '#e8eefb'; g.font = font; g.fillText(tname(code), cx, cy + +(font.match(/\d+/)![0]) + 8);
    };
    g.fillStyle = '#facc15'; g.font = '800 30px Inter,Arial'; g.fillText(c.champ, CX, 250);
    drawTeam(champ, CX, 400, 210, '800 54px Inter,Arial');
    g.fillStyle = '#8a99b8'; g.font = '700 22px Inter,Arial'; g.fillText(c.final, CX, 520);
    drawTeam(finA, CX - 250, 610, 150, '700 30px Inter,Arial');
    g.fillStyle = '#62718f'; g.font = '800 26px Inter,Arial'; g.fillText(ui.common.vs, CX, 600);
    drawTeam(finB, CX + 250, 610, 150, '700 30px Inter,Arial');
    g.fillStyle = '#8a99b8'; g.font = '700 22px Inter,Arial'; g.fillText(c.semis, CX, 720);
    semis.forEach((cd, i) => drawTeam(cd, CX - 405 + i * 270, 800, 120, '600 22px Inter,Arial'));
    g.fillStyle = '#8a99b8'; g.font = '700 22px Inter,Arial'; g.fillText(c.winners, CX, 910);
    winners.forEach((cd, i) => { const col = i % 4, rowi = Math.floor(i / 4), cx = CX - 405 + col * 270, cy = 970 + rowi * 110; g.fillStyle = '#38bdf8'; g.font = '800 18px Inter,Arial'; g.fillText(ui.common.group + ' ' + LETTERS[i], cx, cy - 44); drawTeam(cd, cx, cy, 86, '600 18px Inter,Arial'); });
    g.fillStyle = '#62718f'; g.font = '600 20px Inter,Arial'; g.fillText(c.foot, CX, 1320);
    await new Promise<void>((res) => cv.toBlob((blob) => { if (blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mi-mundial-2026.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast(ui.sim.imgDone); } else toast(ui.sim.imgFail); res(); }, 'image/png'));
  }

  let toastT: any;
  function toast(msg: string) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }

  // ---- init ----
  if (location.hash.startsWith('#s=')) {
    try { state = migrate(JSON.parse(b64dec(location.hash.slice(3)))); save(); } catch {}
    history.replaceState(null, '', location.pathname);
  }
  buildGroups(); updateProgress();
}
