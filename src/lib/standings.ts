import { GROUPS } from '../data/tournament';

interface R { status: string; scores?: Record<string, number>; }
export interface Stat { code: string; pj: number; g: number; e: number; p: number; gf: number; gc: number; dg: number; pts: number; }

// Clasificación REAL de un grupo a partir de los resultados ya jugados (solo FINISHED).
export function realStandings(letter: string, byPair: Record<string, R>): { order: Stat[]; played: number } {
  const codes = GROUPS[letter];
  const st: Record<string, Stat> = {};
  codes.forEach((c) => (st[c] = { code: c, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0 }));
  let played = 0;
  for (let i = 0; i < codes.length; i++) {
    for (let j = i + 1; j < codes.length; j++) {
      const a = codes[i], b = codes[j];
      const r = byPair[[a, b].sort().join('-')];
      if (!r || r.status !== 'FINISHED' || !r.scores) continue;
      const sa = r.scores[a], sb = r.scores[b];
      if (sa === undefined || sb === undefined) continue;
      played++;
      const A = st[a], B = st[b];
      A.pj++; B.pj++; A.gf += sa; A.gc += sb; B.gf += sb; B.gc += sa;
      if (sa > sb) { A.g++; B.p++; A.pts += 3; }
      else if (sb > sa) { B.g++; A.p++; B.pts += 3; }
      else { A.e++; B.e++; A.pts++; B.pts++; }
    }
  }
  codes.forEach((c) => (st[c].dg = st[c].gf - st[c].gc));
  const order = [...codes].sort(
    (x, y) => st[y].pts - st[x].pts || st[y].dg - st[x].dg || st[y].gf - st[x].gf || codes.indexOf(x) - codes.indexOf(y),
  );
  return { order: order.map((c) => st[c]), played };
}
