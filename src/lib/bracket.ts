// Resuelve el cuadro eliminatorio REAL a partir de los resultados.
// - Slots de grupo (1.º/2.º) → equipo real cuando el grupo está completo.
// - Slots de tercero → equipo real cuando TODOS los grupos terminan (vía thirdTable.json, Anexo C FIFA).
// - Slots de ganador/perdedor (W/L) → equipo real cuando se juega el partido que los alimenta
//   (usa el campo `winner`, que incluye prórroga/penaltis).
// Mientras no se resuelven, cada slot muestra una etiqueta de procedencia ("1.º A", "Mejor 3.º", "Ganador P74").
import { R32, R16, QF, SF, TP, FN, MATCHES, THIRD_SLOTS, LETTERS, THIRD_TABLE, type Ref, type Lang } from '../data/tournament';
import { realStandings, type Stat } from './standings';
import { computeQualification } from './qualification';

export interface Side { code: string | null; label: string; }
export interface BMatch { m: number; a: Side; b: Side; winner: string | null; }
export interface BRound { key: string; round: string; matches: BMatch[] }

type R = { status?: string; scores?: Record<string, number>; live?: boolean; winner?: string };

const T = {
  es: { first: '1.º', second: '2.º', best3: 'Mejor 3.º', winner: 'Ganador', loser: 'Perdedor', mt: 'P' },
  en: { first: '1st', second: '2nd', best3: 'Best 3rd', winner: 'Winner', loser: 'Loser', mt: 'M' },
  pt: { first: '1.º', second: '2.º', best3: 'Melhor 3.º', winner: 'Vencedor', loser: 'Perdedor', mt: 'P' },
};

export function resolveBracket(byPair: Record<string, R>, lang: Lang) {
  const L = T[lang];
  const stand: Record<string, { order: Stat[]; played: number }> = {};
  for (const g of LETTERS) stand[g] = realStandings(g, byPair);
  const complete = (g: string) => stand[g].played === 6;
  const allComplete = LETTERS.every(complete);

  // Asignación de terceros (solo si TODOS los grupos han terminado).
  let thirdAssign: Record<string, string> = {};
  if (allComplete) {
    const q = computeQualification(byPair);
    const key = q.thirds.filter((t) => t.qualifies).map((t) => t.L).sort().join('');
    thirdAssign = (THIRD_TABLE as any)[key] || {};
  }

  const pairResult = (cA: string | null, cB: string | null): R | null =>
    cA && cB ? byPair[[cA, cB].sort().join('-')] ?? null : null;

  const seed = (ref: Ref): Side => {
    const r: any = ref;
    if (r.t === '1') return { code: complete(r.g) ? stand[r.g].order[0].code : null, label: `${L.first} ${r.g}` };
    if (r.t === '2') return { code: complete(r.g) ? stand[r.g].order[1].code : null, label: `${L.second} ${r.g}` };
    if (r.t === '3') {
      const allow = THIRD_SLOTS.find((s) => s.m === r.m)?.allow ?? [];
      const g = thirdAssign[String(r.m)];
      return { code: allComplete && g ? stand[g].order[2].code : null, label: `${L.best3} (${allow.join('/')})` };
    }
    if (r.t === 'W') return { code: winnerOf(r.m), label: `${L.winner} ${L.mt}${r.m}` };
    if (r.t === 'L') return { code: loserOf(r.m), label: `${L.loser} ${L.mt}${r.m}` };
    return { code: null, label: '?' };
  };

  function winnerOf(m: number): string | null {
    const def = MATCHES[m]; if (!def) return null;
    const A = seed(def.a), B = seed(def.b);
    const res = pairResult(A.code, B.code);
    return res?.winner ?? null;
  }
  function loserOf(m: number): string | null {
    const def = MATCHES[m]; if (!def) return null;
    const A = seed(def.a), B = seed(def.b);
    const res = pairResult(A.code, B.code);
    if (!res?.winner) return null;
    return res.winner === A.code ? B.code : res.winner === B.code ? A.code : null;
  }

  const mkRound = (defs: typeof R32, key: string, round: string): BRound => ({
    key, round,
    matches: defs.map((d) => {
      const a = seed(d.a), b = seed(d.b);
      const res = pairResult(a.code, b.code);
      return { m: d.m, a, b, winner: res?.winner ?? null };
    }),
  });

  return {
    allComplete,
    rounds: [
      mkRound(R32, 'r32', 'R32'),
      mkRound(R16, 'r16', 'R16'),
      mkRound(QF, 'qf', 'QF'),
      mkRound(SF, 'sf', 'SF'),
      mkRound(FN, 'final', 'Final'),
      mkRound(TP, 'third', '3rd'),
    ],
  };
}
