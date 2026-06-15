import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, '..', 'public', 'og.png');

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
  <text x="1010" y="500" font-family="Arial, sans-serif" font-weight="bold" font-size="340" fill="#16233e" text-anchor="middle">26</text>
  <rect x="90" y="116" width="108" height="108" rx="26" fill="url(#ac)"/>
  <circle cx="144" cy="170" r="33" fill="#0a0f1c"/>
  <circle cx="144" cy="170" r="19" fill="none" stroke="#e8eefb" stroke-width="6"/>
  <text x="232" y="186" font-family="Arial, sans-serif" font-weight="bold" font-size="44" fill="#8a99b8">MUNDIAL 2026</text>
  <text x="88" y="352" font-family="Arial, sans-serif" font-weight="bold" font-size="94" fill="#e8eefb">Simulador del</text>
  <text x="88" y="452" font-family="Arial, sans-serif" font-weight="bold" font-size="94" fill="#e8eefb">Mundial 2026</text>
  <text x="92" y="528" font-family="Arial, sans-serif" font-weight="bold" font-size="33" fill="#8a99b8">Elige los resultados, monta el cuadro y descubre al campeon</text>
  <text x="92" y="588" font-family="Arial, sans-serif" font-weight="bold" font-size="30" fill="#22c55e">Mexico  -  EE.UU.  -  Canada  -  48 selecciones</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(out);
console.log('og.png creado en', out);
