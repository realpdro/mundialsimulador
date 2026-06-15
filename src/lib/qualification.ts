// Estado de clasificación a la fase eliminatoria a partir de los resultados reales.
// Formato Mundial 2026 (48 selecciones): pasan los 2 primeros de cada uno de los 12 grupos
// (24) + los 8 MEJORES TERCEROS = 32 equipos a dieciseisavos.
// Mientras un grupo no haya jugado sus 6 partidos, sus posiciones (y por tanto los terceros)
// son PROVISIONALES; solo es definitivo cuando complete === true / allGroupsComplete === true.
import { LETTERS } from '../data/tournament';
import { realStandings, type Stat } from './standings';

export interface GroupQual { L: string; order: Stat[]; played: number; complete: boolean; }
export interface ThirdRow { L: string; stat: Stat; rank: number; qualifies: boolean; }
export interface Qual {
  groups: GroupQual[];
  thirds: ThirdRow[];        // 12 terceros, ordenados mejor→peor
  allGroupsComplete: boolean;
  anyPlayed: boolean;
  qualifiedCodes: string[];  // definitivos: 1.º/2.º de grupos completos + (si todo completo) 8 mejores terceros
}

export function computeQualification(byPair: Record<string, { status?: string; scores?: Record<string, number> }>): Qual {
  const groups: GroupQual[] = LETTERS.map((L) => {
    const st = realStandings(L, byPair);
    return { L, order: st.order, played: st.played, complete: st.played === 6 };
  });
  const allGroupsComplete = groups.every((g) => g.complete);
  const anyPlayed = groups.some((g) => g.played > 0);

  // 3.º de cada grupo, ordenados por pts, DG, GF (criterio FIFA para mejores terceros).
  const raw = groups.map((g) => ({ L: g.L, stat: g.order[2] }));
  const ranked = [...raw].sort(
    (x, y) => y.stat.pts - x.stat.pts || y.stat.dg - x.stat.dg || y.stat.gf - x.stat.gf || x.L.localeCompare(y.L),
  );
  const thirds: ThirdRow[] = ranked.map((r, i) => ({ L: r.L, stat: r.stat, rank: i + 1, qualifies: i < 8 }));

  const directQ = groups.filter((g) => g.complete).flatMap((g) => [g.order[0].code, g.order[1].code]);
  const thirdQ = allGroupsComplete ? thirds.filter((t) => t.qualifies).map((t) => t.stat.code) : [];
  return { groups, thirds, allGroupsComplete, anyPlayed, qualifiedCodes: [...directQ, ...thirdQ] };
}
