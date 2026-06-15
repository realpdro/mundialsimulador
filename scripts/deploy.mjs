import basicFtp from 'basic-ftp';
import { readFileSync } from 'node:fs';
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

if (!host || !user || !password) {
  console.error('❌ Faltan datos en .env (FTP_HOST, FTP_USER, FTP_PASSWORD). Abre .env y rellénalos.');
  process.exit(1);
}

const client = new Client(30000);
client.ftp.verbose = false; // NO loguear (oculta el password)

try {
  await client.access({ host, user, password, port, secure: false });
  console.log('✅ Conectado a', host, 'como', user);
  console.log('📂 Estás en:', await client.pwd());
  const items = await client.list();
  console.log('📁 Contenido aquí:', items.map((i) => (i.isDirectory ? i.name + '/' : i.name)).join('  ') || '(vacío)');

  if (testMode) {
    console.log('\n🧪 Modo test: conexión OK, no se ha subido nada.');
  } else {
    const useDir = remoteDir && remoteDir !== '.' ? remoteDir : undefined;
    console.log('\n⏫ Subiendo dist/ →', useDir || '(carpeta actual)', '…');
    let last = 0;
    client.trackProgress((info) => {
      if (info.bytesOverall - last > 200000) { last = info.bytesOverall; process.stdout.write('.'); }
    });
    if (useDir) await client.uploadFromDir(join(root, 'dist'), useDir);
    else await client.uploadFromDir(join(root, 'dist'));
    client.trackProgress();
    console.log('\n✅ ¡Subida completa! Revisa https://mundialsimulador.com (Ctrl+F5).');
  }
} catch (e) {
  console.error('\n❌ Error:', e.message);
  process.exitCode = 1;
} finally {
  client.close();
}
