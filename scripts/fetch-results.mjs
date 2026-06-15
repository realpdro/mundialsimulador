// Descarga los resultados reales del Mundial (football-data.org) y los guarda
// en src/data/results.json para que el build los muestre. 1 llamada por ejecución.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(join(root, '.env'), 'utf8').replace(/^﻿/, '');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
  return env;
}

// Nombre en inglés (football-data) -> código interno
const EN = {
  MEX: 'Mexico', RSA: 'South Africa', KOR: 'South Korea', CZE: 'Czechia',
  CAN: 'Canada', QAT: 'Qatar', SUI: 'Switzerland', BIH: 'Bosnia & Herz.',
  BRA: 'Brazil', MAR: 'Morocco', HAI: 'Haiti', SCO: 'Scotland',
  USA: 'USA', PAR: 'Paraguay', AUS: 'Australia', TUR: 'Türkiye',
  GER: 'Germany', CUW: 'Curaçao', CIV: 'Ivory Coast', ECU: 'Ecuador',
  NED: 'Netherlands', JPN: 'Japan', TUN: 'Tunisia', SWE: 'Sweden',
  BEL: 'Belgium', EGY: 'Egypt', IRN: 'Iran', NZL: 'New Zealand',
  ESP: 'Spain', CPV: 'Cape Verde', KSA: 'Saudi Arabia', URU: 'Uruguay',
  FRA: 'France', SEN: 'Senegal', NOR: 'Norway', IRQ: 'Iraq',
  ARG: 'Argentina', ALG: 'Algeria', AUT: 'Austria', JOR: 'Jordan',
  POR: 'Portugal', COL: 'Colombia', UZB: 'Uzbekistan', COD: 'DR Congo',
  ENG: 'England', CRO: 'Croatia', GHA: 'Ghana', PAN: 'Panama',
};
// Alias para los nombres que la API escribe distinto (normalizados)
const ALIASES = {
  unitedstates: 'USA', unitedstatesofamerica: 'USA',
  bosniaherzegovina: 'BIH', bosniaandherzegovina: 'BIH',
  capeverdeislands: 'CPV', caboverde: 'CPV',
  turkey: 'TUR', turkiye: 'TUR',
  cotedivoire: 'CIV', ivorycoast: 'CIV',
  congodr: 'COD', drcongo: 'COD', democraticrepublicofcongo: 'COD',
  iriran: 'IRN', iran: 'IRN', islamicrepublicofiran: 'IRN',
  korearepublic: 'KOR', southkorea: 'KOR', republicofkorea: 'KOR',
  czechrepublic: 'CZE', czechia: 'CZE',
};
const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const LOOKUP = {};
for (const [code, en] of Object.entries(EN)) LOOKUP[norm(en)] = code;
const resolve = (name) => { const n = norm(name); return ALIASES[n] || LOOKUP[n] || null; };

const env = loadEnv();
const KEY = env.FOOTBALL_API_KEY || process.env.FOOTBALL_API_KEY;
if (!KEY) { console.warn('⚠️  Falta FOOTBALL_API_KEY; se mantienen los resultados anteriores.'); process.exit(0); }

let res;
try {
  res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', { headers: { 'X-Auth-Token': KEY } });
} catch (e) { console.warn('⚠️  Sin conexión con la API (' + e.message + '); se mantienen los resultados anteriores.'); process.exit(0); }
if (!res.ok) { console.warn('⚠️  API HTTP ' + res.status + ' — se mantienen los resultados anteriores.'); process.exit(0); }
const data = await res.json();
const matches = data.matches || [];

const byPair = {};
const unmapped = new Set();
let withScore = 0, live = 0;
for (const m of matches) {
  const a = resolve(m.homeTeam?.name), b = resolve(m.awayTeam?.name);
  if (!a) unmapped.add(m.homeTeam?.name);
  if (!b) unmapped.add(m.awayTeam?.name);
  if (!a || !b) continue;
  const key = [a, b].sort().join('-');
  const hs = m.score?.fullTime?.home, as = m.score?.fullTime?.away;
  const hasScore = hs !== null && hs !== undefined && as !== null && as !== undefined;
  const entry = { status: m.status, utc: m.utcDate };
  if (hasScore) { entry.scores = { [a]: hs, [b]: as }; withScore++; }
  if (['IN_PLAY', 'PAUSED'].includes(m.status)) { entry.live = true; live++; }
  byPair[key] = entry;
}

const out = { updatedAt: new Date().toISOString(), source: 'football-data.org', byPair };
writeFileSync(join(root, 'src', 'data', 'results.json'), JSON.stringify(out, null, 0));

console.log(`✅ Resultados guardados: ${Object.keys(byPair).length} partidos mapeados · ${withScore} con marcador · ${live} en juego.`);
if (unmapped.size) console.log('⚠️  Sin mapear:', [...unmapped].join(', '));
else console.log('✅ Todos los equipos mapeados correctamente.');
