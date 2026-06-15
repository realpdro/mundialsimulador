// Auto-aloja las 48 banderas en WebP (public/flags/<iso>.webp) descargándolas de flagcdn
// UNA sola vez. En runtime la web ya no depende de flagcdn (más rápido, menos bytes que PNG,
// y no se rompe si flagcdn cae). Re-ejecutable: `node scripts/make-flags.mjs`.
import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'flags');
mkdirSync(outDir, { recursive: true });

// ISOs de los 48 equipos (coincide con tournament.ts; incluye gb-eng y gb-sct).
const ISOS = [
  'mx', 'za', 'kr', 'cz', 'ca', 'qa', 'ch', 'ba', 'br', 'ma', 'ht', 'gb-sct',
  'us', 'py', 'au', 'tr', 'de', 'cw', 'ci', 'ec', 'nl', 'jp', 'tn', 'se',
  'be', 'eg', 'ir', 'nz', 'es', 'cv', 'sa', 'uy', 'fr', 'sn', 'no', 'iq',
  'ar', 'dz', 'at', 'jo', 'pt', 'co', 'uz', 'cd', 'gb-eng', 'hr', 'gh', 'pa',
];

// Fuente w160 (160×120): nítida hasta para el lienzo de compartir; al pasar a WebP queda en ~1-2 KB.
async function one(iso, force) {
  const out = join(outDir, `${iso}.webp`);
  if (!force && existsSync(out) && statSync(out).size > 0) return { iso, skipped: true };
  const res = await fetch(`https://flagcdn.com/w160/${iso}.png`);
  if (!res.ok) throw new Error(`HTTP ${res.status} para ${iso}`);
  const png = Buffer.from(await res.arrayBuffer());
  const webp = await sharp(png).webp({ quality: 82 }).toBuffer();
  writeFileSync(out, webp);
  return { iso, bytes: webp.length };
}

async function main() {
  const force = process.argv.includes('--force');
  let ok = 0, skip = 0, total = 0;
  const fails = [];
  // En lotes de 8 para ir rápido sin saturar flagcdn.
  for (let i = 0; i < ISOS.length; i += 8) {
    const batch = ISOS.slice(i, i + 8);
    const results = await Promise.allSettled(batch.map((iso) => one(iso, force)));
    results.forEach((r, j) => {
      if (r.status === 'fulfilled') {
        if (r.value.skipped) skip++;
        else { ok++; total += r.value.bytes; }
      } else fails.push(`${batch[j]}: ${r.reason.message}`);
    });
  }
  console.log(`✅ Banderas WebP: ${ok} generadas, ${skip} ya existían (${(total / 1024).toFixed(1)} KB nuevos) → public/flags/`);
  if (fails.length) { console.error('❌ Fallos:', fails.join(' | ')); process.exitCode = 1; }
}

main();
