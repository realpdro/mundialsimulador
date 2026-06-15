// Imagen Open Graph dinámica por partido (1200×630), una por idioma. Se regenera en CADA build,
// así el cron (cada ~15 min, cuando cambia el marcador) refresca la tarjeta con el resultado real.
// Las redes (WhatsApp/Twitter/FB) no ejecutan JS: necesitan un PNG estático en og:image. Esto lo crea.
import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { LANGS, type Lang, type GroupMatch, SCHEDULE, ES_NAME_TO_CODE, TEAMS, teamName, matchSlug } from '../../../../data/tournament';
import RESULTS from '../../../../data/results.json';

export const prerender = true;

export function getStaticPaths() {
  const paths: { params: { lang: Lang; partido: string }; props: { m: GroupMatch } }[] = [];
  for (const lang of LANGS) {
    for (const m of SCHEDULE.groupStage) {
      const slug = matchSlug(m);
      if (slug) paths.push({ params: { lang, partido: slug }, props: { m } });
    }
  }
  return paths;
}

const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const MONTHS: Record<Lang, string[]> = {
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  pt: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
};

export const GET: APIRoute = async ({ params, props }) => {
  const lang = params.lang as Lang;
  const m = (props as { m: GroupMatch }).m;
  const a = ES_NAME_TO_CODE[m.teamA], b = ES_NAME_TO_CODE[m.teamB];
  const L = m.group;
  const nameA = teamName(a, lang), nameB = teamName(b, lang);

  const result = (RESULTS as any).byPair?.[[a, b].sort().join('-')] ?? null;
  const sa = result?.scores?.[a], sb = result?.scores?.[b];
  const hasScore = sa !== null && sa !== undefined && sb !== null && sb !== undefined;
  const live = !!result?.live;

  const gms = SCHEDULE.groupStage
    .filter((x) => x.group === L)
    .sort((x, y) => (x.koSpain || x.date).localeCompare(y.koSpain || y.date));
  const jornada = Math.floor(gms.findIndex((x) => x.teamA === m.teamA && x.teamB === m.teamB) / 2) + 1;

  const d = (m.koSpain || m.date).slice(0, 10);
  const mo = Number(d.split('-')[1]);
  const da = Number(d.split('-')[2]);
  const time = m.koSpain ? m.koSpain.slice(11, 16) : '';
  const dateStr = `${da} ${MONTHS[lang][(mo || 1) - 1]}${time ? ` · ${time}h` : ''}`;

  const groupLbl = { es: `GRUPO ${L} · J${jornada}`, en: `GROUP ${L} · MD${jornada}`, pt: `GRUPO ${L} · R${jornada}` }[lang];
  const statusTxt = live
    ? { es: 'EN VIVO', en: 'LIVE', pt: 'AO VIVO' }[lang]
    : { es: 'FINAL', en: 'FULL-TIME', pt: 'FIM DE JOGO' }[lang];
  const statusColor = live ? '#ff5a5a' : '#22c55e';

  const fsize = (n: string) => (n.length > 13 ? 35 : n.length > 10 ? 40 : 46);

  const center = hasScore
    ? `<text x="600" y="352" font-family="Arial, sans-serif" font-weight="bold" font-size="148" fill="#ffffff" text-anchor="middle">${sa} – ${sb}</text>
       <text x="600" y="420" font-family="Arial, sans-serif" font-weight="bold" font-size="40" fill="${statusColor}" text-anchor="middle">${statusTxt}</text>`
    : `<text x="600" y="320" font-family="Arial, sans-serif" font-weight="bold" font-size="98" fill="#5b6b8c" text-anchor="middle">VS</text>
       <text x="600" y="392" font-family="Arial, sans-serif" font-weight="bold" font-size="38" fill="#8a99b8" text-anchor="middle">${esc(dateStr)}</text>`;

  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#16233e"/><stop offset="0.62" stop-color="#0a0f1c"/>
      </linearGradient>
      <linearGradient id="ac" x1="0" y1="0" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#22c55e"/><stop offset="1" stop-color="#38bdf8"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <rect width="1200" height="14" fill="url(#ac)"/>
    <text x="80" y="92" font-family="Arial, sans-serif" font-weight="bold" font-size="38" fill="#8a99b8">MUNDIAL 2026</text>
    <text x="1120" y="92" font-family="Arial, sans-serif" font-weight="bold" font-size="34" fill="#8a99b8" text-anchor="end">${esc(groupLbl)}</text>
    <rect x="163" y="208" width="214" height="160" rx="12" fill="none" stroke="#2c3a57" stroke-width="3"/>
    <rect x="823" y="208" width="214" height="160" rx="12" fill="none" stroke="#2c3a57" stroke-width="3"/>
    <text x="270" y="452" font-family="Arial, sans-serif" font-weight="bold" font-size="${fsize(nameA)}" fill="#e8eefb" text-anchor="middle">${esc(nameA)}</text>
    <text x="930" y="452" font-family="Arial, sans-serif" font-weight="bold" font-size="${fsize(nameB)}" fill="#e8eefb" text-anchor="middle">${esc(nameB)}</text>
    ${center}
    <text x="80" y="566" font-family="Arial, sans-serif" font-size="29" fill="#6f7da0">${esc(`${m.stadium} · ${m.city}`)}</text>
    <text x="1120" y="566" font-family="Arial, sans-serif" font-weight="bold" font-size="30" fill="#38bdf8" text-anchor="end">mundialsimulador.com</text>
  </svg>`;

  const flagBuf = (iso: string) =>
    sharp(readFileSync(join(process.cwd(), 'public', 'flags', `${iso}.webp`))).resize(200, 150).png().toBuffer();
  const [fa, fb] = await Promise.all([flagBuf(TEAMS[a].iso), flagBuf(TEAMS[b].iso)]);

  const png = await sharp(Buffer.from(svg))
    .composite([
      { input: fa, left: 170, top: 213 },
      { input: fb, left: 830, top: 213 },
    ])
    .png()
    .toBuffer();

  return new Response(png, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=900' },
  });
};
