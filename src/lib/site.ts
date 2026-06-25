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

// koSpain ('2026-06-28 21:00') -> ISO 8601 con zona horaria de España. En jun-jul rige el
// horario de verano (CEST, +02:00). Necesario para que Google valide startDate de SportsEvent.
export function toIsoSpain(koSpain: string | null): string | null {
  return koSpain ? `${koSpain.replace(' ', 'T')}:00+02:00` : null;
}
// Mismo formato +02:00 sumando horas (para endDate ≈ inicio + 2h), con vuelta de día correcta.
export function isoSpainPlus(koSpain: string | null, hours: number): string | null {
  if (!koSpain) return null;
  const end = new Date(new Date(`${koSpain.replace(' ', 'T')}:00+02:00`).getTime() + hours * 3600000 + 2 * 3600000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${end.getUTCFullYear()}-${p(end.getUTCMonth() + 1)}-${p(end.getUTCDate())}T${p(end.getUTCHours())}:${p(end.getUTCMinutes())}:00+02:00`;
}

// Slug ES estable de cada ronda eliminatoria (compartido por los 3 idiomas, como el resto de slugs).
export const ROUND_SLUG: Record<string, string> = { R32: 'dieciseisavos', R16: 'octavos', QF: 'cuartos', SF: 'semifinales', '3rd': 'tercer-puesto', Final: 'final' };
export const SLUG_ROUND: Record<string, string> = Object.fromEntries(Object.entries(ROUND_SLUG).map(([k, v]) => [v, k]));
export const roundUrl = (l: Lang, round: string) => `/${l}/ronda/${ROUND_SLUG[round] ?? 'dieciseisavos'}/`;
export const koMatchUrl = (l: Lang, matchNo: number) => `/${l}/partido-ko/${matchNo}/`;
