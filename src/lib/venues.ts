// Sedes del Mundial 2026 derivadas del calendario. El país de cada estadio es un hecho público
// del sorteo (16 sedes: 11 EE.UU., 3 México, 2 Canadá).
import { SCHEDULE, type Lang } from '../data/tournament';

export const VENUE_ISO: Record<string, 'us' | 'mx' | 'ca'> = {
  'Estadio Azteca': 'mx', 'Estadio Akron': 'mx', 'Estadio BBVA': 'mx',
  'BMO Field': 'ca', 'BC Place': 'ca',
  'Mercedes-Benz Stadium': 'us', "Levi's Stadium": 'us', 'SoFi Stadium': 'us',
  'Lumen Field': 'us', 'MetLife Stadium': 'us', 'Gillette Stadium': 'us',
  'Lincoln Financial Field': 'us', 'Hard Rock Stadium': 'us', 'NRG Stadium': 'us',
  'Arrowhead Stadium': 'us', 'AT&T Stadium': 'us',
};

export const slugifyVenue = (name: string) =>
  name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export interface Venue { slug: string; name: string; city: string; iso: string; count: number; }

export function listVenues(): Venue[] {
  const map = new Map<string, Venue>();
  for (const m of [...SCHEDULE.groupStage, ...SCHEDULE.knockout]) {
    const v = map.get(m.stadium) ?? { slug: slugifyVenue(m.stadium), name: m.stadium, city: m.city, iso: VENUE_ISO[m.stadium] ?? 'us', count: 0 };
    v.count++;
    map.set(m.stadium, v);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export const venueBySlug = (slug: string): Venue | undefined => listVenues().find((v) => v.slug === slug);

export const countryName = (iso: string, lang: Lang): string =>
  (({ us: { es: 'Estados Unidos', en: 'USA', pt: 'EUA' }, mx: { es: 'México', en: 'Mexico', pt: 'México' }, ca: { es: 'Canadá', en: 'Canada', pt: 'Canadá' } } as any)[iso]?.[lang]) ?? '';
