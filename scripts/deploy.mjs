import basicFtp from 'basic-ftp';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const { Client } = basicFtp;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Carga .env (sin dependencias). El password NUNCA se imprime ni se sube a ningún sitio.
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

const env = loadEnv();
const host = env.FTP_HOST || process.env.FTP_HOST;
const user = env.FTP_USER || process.env.FTP_USER;
const password = env.FTP_PASSWORD || process.env.FTP_PASSWORD;
const port = parseInt(env.FTP_PORT || process.env.FTP_PORT || '21', 10);
const remoteDir = (env.FTP_REMOTE_DIR || process.env.FTP_REMOTE_DIR || 'public_html').trim();
const testMode = process.argv.includes('--test');
const fullMode = process.argv.includes('--full'); // fuerza subida completa (ignora el manifiesto)

if (!host || !user || !password) {
  console.error('❌ Faltan datos en .env (FTP_HOST, FTP_USER, FTP_PASSWORD).');
  process.exit(1);
}

// Recorre dist/ y calcula el hash de cada archivo (subida incremental).
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
}
const distDir = join(root, 'dist');
const toRel = (abs) => abs.slice(distDir.length + 1).split('\\').join('/');
const local = {};
for (const abs of walk(distDir)) local[toRel(abs)] = createHash('md5').update(readFileSync(abs)).digest('hex');

const MANIFEST = '.deploy-manifest.json';
const client = new Client(120000); // 120s por operación: tolera red lenta en CI
client.ftp.verbose = false; // NO loguear (oculta el password)

try {
  await client.access({ host, user, password, port, secure: false });
  const useDir = remoteDir && remoteDir !== '.' ? remoteDir : '';
  if (useDir) await client.ensureDir(useDir);
  const base = (await client.pwd()).replace(/\/+$/, ''); // dir base absoluto ('' si es la raíz)
  console.log('✅ Conectado a', host, '· base:', base || '/');

  if (testMode) {
    console.log('🧪 Modo test: conexión OK, no se ha subido nada.');
  } else {
    // Descarga el manifiesto remoto (qué hay ya desplegado). Si no existe, sube todo.
    let remote = {};
    const tmp = join(root, '.remote-manifest.json');
    if (!fullMode) {
      try { await client.downloadTo(tmp, `${base}/${MANIFEST}`); remote = JSON.parse(readFileSync(tmp, 'utf8')); } catch {}
    }
    try { if (existsSync(tmp)) rmSync(tmp); } catch {}

    const rels = Object.keys(local).sort();
    const changed = rels.filter((r) => local[r] !== remote[r]);
    console.log(`📦 ${rels.length} archivos · ${changed.length} a subir (${fullMode || !Object.keys(remote).length ? 'completo' : 'incremental'}).`);

    const finalManifest = { ...remote };
    let done = 0, failed = 0, curDir = null;
    for (const rel of changed) {
      const slash = rel.lastIndexOf('/');
      const d = slash >= 0 ? rel.slice(0, slash) : '';
      const name = slash >= 0 ? rel.slice(slash + 1) : rel;
      const targetDir = d ? `${base}/${d}` : (base || '/');
      try {
        if (targetDir !== curDir) { await client.ensureDir(targetDir); curDir = targetDir; }
        await client.uploadFrom(join(distDir, rel), name);
        finalManifest[rel] = local[rel];
        if (++done % 25 === 0) process.stdout.write('.');
      } catch (e) { failed++; console.error('\n⚠️  falló', rel, '-', e.message); }
    }
    // Quita del manifiesto lo que ya no existe en local (páginas borradas).
    for (const r of Object.keys(finalManifest)) if (!(r in local)) delete finalManifest[r];

    // Sube el manifiesto actualizado (refleja lo realmente desplegado).
    writeFileSync(tmp, JSON.stringify(finalManifest));
    try { await client.ensureDir(base || '/'); await client.uploadFrom(tmp, MANIFEST); }
    catch (e) { console.error('⚠️  no se pudo subir el manifiesto:', e.message); }
    try { if (existsSync(tmp)) rmSync(tmp); } catch {}

    console.log(`\n✅ Subida ${changed.length ? '' : '(sin cambios) '}completa: ${done} subidos, ${failed} fallidos. https://mundialsimulador.com`);
    if (failed) process.exitCode = 1;
  }
} catch (e) {
  console.error('\n❌ Error:', e.message);
  process.exitCode = 1;
} finally {
  client.close();
}
