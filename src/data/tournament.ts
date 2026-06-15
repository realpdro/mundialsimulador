import thirdTableData from './thirdTable.json';
import scheduleData from './schedule.json';

export type Lang = 'es' | 'en' | 'pt';
export const LANGS: Lang[] = ['es', 'en', 'pt'];
export const DEFAULT_LANG: Lang = 'es';

export interface Team {
  code: string;
  iso: string;
  slug: string;
  names: Record<Lang, string>;
}

function mk(code: string, iso: string, slug: string, es: string, en: string, pt: string): Team {
  return { code, iso, slug, names: { es, en, pt } };
}

const TEAM_LIST: Team[] = [
  mk('MEX', 'mx', 'mexico', 'México', 'Mexico', 'México'),
  mk('RSA', 'za', 'sudafrica', 'Sudáfrica', 'South Africa', 'África do Sul'),
  mk('KOR', 'kr', 'corea-del-sur', 'Corea del Sur', 'South Korea', 'Coreia do Sul'),
  mk('CZE', 'cz', 'chequia', 'Chequia', 'Czechia', 'Chéquia'),
  mk('CAN', 'ca', 'canada', 'Canadá', 'Canada', 'Canadá'),
  mk('QAT', 'qa', 'catar', 'Catar', 'Qatar', 'Catar'),
  mk('SUI', 'ch', 'suiza', 'Suiza', 'Switzerland', 'Suíça'),
  mk('BIH', 'ba', 'bosnia', 'Bosnia', 'Bosnia & Herz.', 'Bósnia'),
  mk('BRA', 'br', 'brasil', 'Brasil', 'Brazil', 'Brasil'),
  mk('MAR', 'ma', 'marruecos', 'Marruecos', 'Morocco', 'Marrocos'),
  mk('HAI', 'ht', 'haiti', 'Haití', 'Haiti', 'Haiti'),
  mk('SCO', 'gb-sct', 'escocia', 'Escocia', 'Scotland', 'Escócia'),
  mk('USA', 'us', 'estados-unidos', 'EE.UU.', 'USA', 'EUA'),
  mk('PAR', 'py', 'paraguay', 'Paraguay', 'Paraguay', 'Paraguai'),
  mk('AUS', 'au', 'australia', 'Australia', 'Australia', 'Austrália'),
  mk('TUR', 'tr', 'turquia', 'Turquía', 'Türkiye', 'Turquia'),
  mk('GER', 'de', 'alemania', 'Alemania', 'Germany', 'Alemanha'),
  mk('CUW', 'cw', 'curazao', 'Curazao', 'Curaçao', 'Curaçao'),
  mk('CIV', 'ci', 'costa-de-marfil', 'Costa de Marfil', 'Ivory Coast', 'Costa do Marfim'),
  mk('ECU', 'ec', 'ecuador', 'Ecuador', 'Ecuador', 'Equador'),
  mk('NED', 'nl', 'paises-bajos', 'Países Bajos', 'Netherlands', 'Países Baixos'),
  mk('JPN', 'jp', 'japon', 'Japón', 'Japan', 'Japão'),
  mk('TUN', 'tn', 'tunez', 'Túnez', 'Tunisia', 'Tunísia'),
  mk('SWE', 'se', 'suecia', 'Suecia', 'Sweden', 'Suécia'),
  mk('BEL', 'be', 'belgica', 'Bélgica', 'Belgium', 'Bélgica'),
  mk('EGY', 'eg', 'egipto', 'Egipto', 'Egypt', 'Egito'),
  mk('IRN', 'ir', 'iran', 'Irán', 'Iran', 'Irã'),
  mk('NZL', 'nz', 'nueva-zelanda', 'Nueva Zelanda', 'New Zealand', 'Nova Zelândia'),
  mk('ESP', 'es', 'espana', 'España', 'Spain', 'Espanha'),
  mk('CPV', 'cv', 'cabo-verde', 'Cabo Verde', 'Cape Verde', 'Cabo Verde'),
  mk('KSA', 'sa', 'arabia-saudi', 'Arabia Saudí', 'Saudi Arabia', 'Arábia Saudita'),
  mk('URU', 'uy', 'uruguay', 'Uruguay', 'Uruguay', 'Uruguai'),
  mk('FRA', 'fr', 'francia', 'Francia', 'France', 'França'),
  mk('SEN', 'sn', 'senegal', 'Senegal', 'Senegal', 'Senegal'),
  mk('NOR', 'no', 'noruega', 'Noruega', 'Norway', 'Noruega'),
  mk('IRQ', 'iq', 'irak', 'Irak', 'Iraq', 'Iraque'),
  mk('ARG', 'ar', 'argentina', 'Argentina', 'Argentina', 'Argentina'),
  mk('ALG', 'dz', 'argelia', 'Argelia', 'Algeria', 'Argélia'),
  mk('AUT', 'at', 'austria', 'Austria', 'Austria', 'Áustria'),
  mk('JOR', 'jo', 'jordania', 'Jordania', 'Jordan', 'Jordânia'),
  mk('POR', 'pt', 'portugal', 'Portugal', 'Portugal', 'Portugal'),
  mk('COL', 'co', 'colombia', 'Colombia', 'Colombia', 'Colômbia'),
  mk('UZB', 'uz', 'uzbekistan', 'Uzbekistán', 'Uzbekistan', 'Uzbequistão'),
  mk('COD', 'cd', 'rd-congo', 'RD Congo', 'DR Congo', 'RD Congo'),
  mk('ENG', 'gb-eng', 'inglaterra', 'Inglaterra', 'England', 'Inglaterra'),
  mk('CRO', 'hr', 'croacia', 'Croacia', 'Croatia', 'Croácia'),
  mk('GHA', 'gh', 'ghana', 'Ghana', 'Ghana', 'Gana'),
  mk('PAN', 'pa', 'panama', 'Panamá', 'Panama', 'Panamá'),
];

export const TEAMS: Record<string, Team> = Object.fromEntries(TEAM_LIST.map((t) => [t.code, t]));
export const ES_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  TEAM_LIST.map((t) => [t.names.es, t.code]),
);
export const SLUG_TO_CODE: Record<string, string> = Object.fromEntries(
  TEAM_LIST.map((t) => [t.slug, t.code]),
);

export function teamName(code: string | null | undefined, lang: Lang): string {
  if (!code || !TEAMS[code]) return '';
  return TEAMS[code].names[lang];
}
// Banderas auto-alojadas en WebP (public/flags/<iso>.webp, generadas por scripts/make-flags.mjs).
// El parámetro de ancho se mantiene por compatibilidad pero ya no se usa (un único archivo nítido).
export function flagUrl(code: string | null | undefined, _w = 40): string {
  if (!code || !TEAMS[code]) return '';
  return `/flags/${TEAMS[code].iso}.webp`;
}

export const GROUPS: Record<string, string[]> = {
  A: ['MEX', 'RSA', 'KOR', 'CZE'], B: ['CAN', 'QAT', 'SUI', 'BIH'], C: ['BRA', 'MAR', 'HAI', 'SCO'],
  D: ['USA', 'PAR', 'AUS', 'TUR'], E: ['GER', 'CUW', 'CIV', 'ECU'], F: ['NED', 'JPN', 'TUN', 'SWE'],
  G: ['BEL', 'EGY', 'IRN', 'NZL'], H: ['ESP', 'CPV', 'KSA', 'URU'], I: ['FRA', 'SEN', 'NOR', 'IRQ'],
  J: ['ARG', 'ALG', 'AUT', 'JOR'], K: ['POR', 'COL', 'UZB', 'COD'], L: ['ENG', 'CRO', 'GHA', 'PAN'],
};
export const LETTERS = Object.keys(GROUPS);
export const PAIRS: [number, number][] = [[0, 1], [2, 3], [0, 2], [3, 1], [0, 3], [1, 2]];

export type Ref =
  | { t: '1'; g: string } | { t: '2'; g: string }
  | { t: '3'; m: number } | { t: 'W'; m: number } | { t: 'L'; m: number };
export interface KoDef { m: number; a: Ref; b: Ref; }

export const R32: KoDef[] = [
  { m: 73, a: { t: '2', g: 'A' }, b: { t: '2', g: 'B' } }, { m: 74, a: { t: '1', g: 'E' }, b: { t: '3', m: 74 } },
  { m: 75, a: { t: '1', g: 'F' }, b: { t: '2', g: 'C' } }, { m: 76, a: { t: '1', g: 'C' }, b: { t: '2', g: 'F' } },
  { m: 77, a: { t: '1', g: 'I' }, b: { t: '3', m: 77 } }, { m: 78, a: { t: '2', g: 'E' }, b: { t: '2', g: 'I' } },
  { m: 79, a: { t: '1', g: 'A' }, b: { t: '3', m: 79 } }, { m: 80, a: { t: '1', g: 'L' }, b: { t: '3', m: 80 } },
  { m: 81, a: { t: '1', g: 'D' }, b: { t: '3', m: 81 } }, { m: 82, a: { t: '1', g: 'G' }, b: { t: '3', m: 82 } },
  { m: 83, a: { t: '2', g: 'K' }, b: { t: '2', g: 'L' } }, { m: 84, a: { t: '1', g: 'H' }, b: { t: '2', g: 'J' } },
  { m: 85, a: { t: '1', g: 'B' }, b: { t: '3', m: 85 } }, { m: 86, a: { t: '1', g: 'J' }, b: { t: '2', g: 'H' } },
  { m: 87, a: { t: '1', g: 'K' }, b: { t: '3', m: 87 } }, { m: 88, a: { t: '2', g: 'D' }, b: { t: '2', g: 'G' } },
];
export const R16: KoDef[] = [
  { m: 89, a: { t: 'W', m: 74 }, b: { t: 'W', m: 77 } }, { m: 90, a: { t: 'W', m: 73 }, b: { t: 'W', m: 75 } },
  { m: 91, a: { t: 'W', m: 76 }, b: { t: 'W', m: 78 } }, { m: 92, a: { t: 'W', m: 79 }, b: { t: 'W', m: 80 } },
  { m: 93, a: { t: 'W', m: 83 }, b: { t: 'W', m: 84 } }, { m: 94, a: { t: 'W', m: 81 }, b: { t: 'W', m: 82 } },
  { m: 95, a: { t: 'W', m: 86 }, b: { t: 'W', m: 88 } }, { m: 96, a: { t: 'W', m: 85 }, b: { t: 'W', m: 87 } },
];
export const QF: KoDef[] = [
  { m: 97, a: { t: 'W', m: 89 }, b: { t: 'W', m: 90 } }, { m: 98, a: { t: 'W', m: 93 }, b: { t: 'W', m: 94 } },
  { m: 99, a: { t: 'W', m: 91 }, b: { t: 'W', m: 92 } }, { m: 100, a: { t: 'W', m: 95 }, b: { t: 'W', m: 96 } },
];
export const SF: KoDef[] = [
  { m: 101, a: { t: 'W', m: 97 }, b: { t: 'W', m: 98 } }, { m: 102, a: { t: 'W', m: 99 }, b: { t: 'W', m: 100 } },
];
export const TP: KoDef[] = [{ m: 103, a: { t: 'L', m: 101 }, b: { t: 'L', m: 102 } }];
export const FN: KoDef[] = [{ m: 104, a: { t: 'W', m: 101 }, b: { t: 'W', m: 102 } }];
export const ALL_KO: KoDef[] = [...R32, ...R16, ...QF, ...SF, ...TP, ...FN];
export const MATCHES: Record<number, KoDef> = Object.fromEntries(ALL_KO.map((x) => [x.m, x]));

export const THIRD_SLOTS = [
  { m: 74, allow: ['A', 'B', 'C', 'D', 'F'] }, { m: 77, allow: ['C', 'D', 'F', 'G', 'H'] },
  { m: 79, allow: ['C', 'E', 'F', 'H', 'I'] }, { m: 80, allow: ['E', 'H', 'I', 'J', 'K'] },
  { m: 81, allow: ['B', 'E', 'F', 'I', 'J'] }, { m: 82, allow: ['A', 'E', 'H', 'I', 'J'] },
  { m: 85, allow: ['E', 'F', 'G', 'I', 'J'] }, { m: 87, allow: ['D', 'E', 'I', 'J', 'L'] },
];

export interface GroupMatch {
  group: string; teamA: string; teamB: string; date: string;
  koLocal: string; tzLocal: string; city: string; stadium: string; koSpain: string;
}
export interface KoMatch {
  round: string; matchNo: number; date: string; koLocal: string | null;
  tzLocal: string | null; city: string; stadium: string; koSpain: string | null;
}
export interface Schedule { groupStage: GroupMatch[]; knockout: KoMatch[]; }

export const SCHEDULE = scheduleData as Schedule;
export const THIRD_TABLE = thirdTableData as Record<string, Record<string, string>>;

// Slug estable de un partido de grupos, igual en los 3 idiomas (basado en el slug ES de cada equipo).
// p. ej. España vs Cabo Verde -> "espana-vs-cabo-verde". null si algún equipo no está aún definido.
export function matchSlug(m: GroupMatch): string | null {
  const a = ES_NAME_TO_CODE[m.teamA], b = ES_NAME_TO_CODE[m.teamB];
  if (!a || !b) return null;
  return `${TEAMS[a].slug}-vs-${TEAMS[b].slug}`;
}
