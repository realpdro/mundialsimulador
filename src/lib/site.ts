import type { Lang } from '../data/tournament';
import { TEAMS, matchSlug } from '../data/tournament';
import { UI } from '../i18n/ui';

const LOCALE: Record<Lang, string> = { es: 'es-ES', en: 'en-GB', pt: 'pt-BR' };

export function formatDay(iso: string, lang: Lang): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const s = new Intl.DateTimeFormat(LOCALE[lang], {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  }).format(dt);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function spainTime(koSpain: string | null): string {
  return koSpain ? koSpain.slice(11, 16) : '--:--';
}

// Día correcto EN HORA DE ESPAÑA (un partido a las 02:00 cae en el día siguiente al local).
export function spainDateLabel(koSpain: string | null, fallbackDate: string, lang: Lang): string {
  return formatDay(koSpain ? koSpain.slice(0, 10) : fallbackDate, lang);
}

function weekdayName(iso: string, lang: Lang): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat(LOCALE[lang], { weekday: 'long', timeZone: 'UTC' }).format(dt);
}

// Nota para partidos de madrugada en España (00:00–06:59): se juegan la noche local
// anterior, así que en España caen de madrugada del día siguiente. Aclara "noche del X al Y".
export function overnightNote(koSpain: string | null, lang: Lang): string | null {
  if (!koSpain) return null;
  const hh = parseInt(koSpain.slice(11, 13), 10);
  if (isNaN(hh) || hh >= 7) return null;
  const [y, m, d] = koSpain.slice(0, 10).split('-').map(Number);
  const isoOf = (dt: Date) => `${dt.getUTCFullYear()}-${dt.getUTCMonth() + 1}-${dt.getUTCDate()}`;
  const wPrev = weekdayName(isoOf(new Date(Date.UTC(y, m - 1, d - 1))), lang);
  const wThis = weekdayName(isoOf(new Date(Date.UTC(y, m - 1, d))), lang);
  const tmpl: Record<Lang, string> = {
    es: `🌙 madrugada del ${wPrev} al ${wThis}`,
    en: `🌙 overnight, ${wPrev} to ${wThis}`,
    pt: `🌙 madrugada de ${wPrev} para ${wThis}`,
  };
  return tmpl[lang];
}

// --- URLs (trailingSlash: 'always') ---
export const homeUrl = (l: Lang) => `/${l}/`;
export const calUrl = (l: Lang) => `/${l}/calendario/`;
export const groupsUrl = (l: Lang) => `/${l}/grupos/`;
export const groupUrl = (l: Lang, letter: string) => `/${l}/grupos/${letter.toLowerCase()}/`;
export const teamUrl = (l: Lang, code: string) => `/${l}/seleccion/${TEAMS[code].slug}/`;
export const matchUrl = (l: Lang, m: Parameters<typeof matchSlug>[0]): string | null => {
  const s = matchSlug(m);
  return s ? `/${l}/partido/${s}/` : null;
};

const RK: Record<string, 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final'> = {
  R32: 'r32', R16: 'r16', QF: 'qf', SF: 'sf', '3rd': 'third', Final: 'final',
};
export function roundName(lang: Lang, round: string): string {
  return UI[lang].roundNames[RK[round] ?? 'r32'];
}

export function listTeams(names: string[], lang: Lang): string {
  if (names.length <= 1) return names.join('');
  const sep = lang === 'en' ? ' and ' : lang === 'pt' ? ' e ' : ' y ';
  return names.slice(0, -1).join(', ') + sep + names[names.length - 1];
}
