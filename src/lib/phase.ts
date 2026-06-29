// Conciencia de fase del torneo: deriva del feed de resultados en qué momento estamos
// (pretemporada / fase de grupos / eliminatorias / terminado) para que la web no muestre
// contenido desactualizado (p.ej. liderar con "Grupos" cuando ya se juegan los Dieciseisavos).
import { SCHEDULE, ES_NAME_TO_CODE } from '../data/tournament';

type R = { status?: string; scores?: Record<string, number>; live?: boolean };
export const isPlayed = (r: R | null | undefined): boolean => !!r && (r.status === 'FINISHED' || (!!r.scores && !r.live));

export type Phase = 'pre' | 'groups' | 'knockouts' | 'finished';

export function phaseInfo(byPair: Record<string, R>) {
  const gs = SCHEDULE.groupStage;
  const groupPlayed = gs.filter((m) => {
    const a = ES_NAME_TO_CODE[m.teamA], b = ES_NAME_TO_CODE[m.teamB];
    return !!a && !!b && isPlayed(byPair[[a, b].slice().sort().join('-')]);
  }).length;
  const groupTotal = gs.length;
  const groupStageDone = groupTotal > 0 && groupPlayed >= groupTotal;
  const anyLive = Object.values(byPair).some((r) => r?.live);

  let phase: Phase = 'pre';
  if (groupPlayed === 0) phase = 'pre';
  else if (!groupStageDone) phase = 'groups';
  else phase = 'knockouts';

  return { phase, groupPlayed, groupTotal, groupStageDone, anyLive };
}
