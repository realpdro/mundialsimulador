import { R32, THIRD_SLOTS, MATCHES, type KoDef } from '../data/tournament';

export interface Opp { kind: '1' | '2' | '3'; group?: string; }
export interface Scenarios {
  first: { match: number; opp: Opp };
  second: { match: number; opp: Opp };
  thirdWinnerGroups: string[];
}

function findByPos(pos: '1' | '2', g: string): KoDef {
  return R32.find(
    (m) =>
      ((m.a as any).t === pos && (m.a as any).g === g) ||
      ((m.b as any).t === pos && (m.b as any).g === g),
  )!;
}

function opponent(m: KoDef, pos: '1' | '2', g: string): Opp {
  const aIsMe = (m.a as any).t === pos && (m.a as any).g === g;
  const other: any = aIsMe ? m.b : m.a;
  if (other.t === '3') return { kind: '3' };
  return { kind: other.t, group: other.g };
}

// Escenarios deterministas de un grupo (cuadro oficial R32 + asignación de terceros).
export function groupScenarios(g: string): Scenarios {
  const m1 = findByPos('1', g);
  const m2 = findByPos('2', g);
  const thirdWinnerGroups = THIRD_SLOTS
    .filter((s) => s.allow.includes(g))
    .map((s) => {
      const m: any = MATCHES[s.m];
      const w = m.a.t === '1' ? m.a : m.b.t === '1' ? m.b : null;
      return w ? (w.g as string) : '';
    })
    .filter(Boolean);
  return {
    first: { match: m1.m, opp: opponent(m1, '1', g) },
    second: { match: m2.m, opp: opponent(m2, '2', g) },
    thirdWinnerGroups,
  };
}
