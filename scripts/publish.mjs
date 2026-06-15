// Orquesta: descargar resultados -> (si hay cambio) construir -> subir.
// Con --ci, NO redespliega si los resultados no cambiaron (evita frescura falsa y gasto de rastreo).
// Sin --ci (deploy manual de código), construye y sube SIEMPRE.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ci = process.argv.includes('--ci');
const run = (cmd, args) => spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: true });

console.log('▶ Descargando resultados…');
const fetched = run('node', ['scripts/fetch-results.mjs']);
const changed = fetched.status === 0; // 0 = cambió y se reescribió; 3 = sin cambios / error

if (ci && !changed) {
  console.log('= Sin cambios reales: no se reconstruye ni se sube (frescura veraz, sin quemar rastreo).');
  process.exit(0);
}

console.log('▶ Construyendo…');
const built = run('npm', ['run', 'build']);
if (built.status !== 0) { console.error('❌ El build falló.'); process.exit(built.status || 1); }

console.log('▶ Subiendo por FTP…');
const dep = run('node', ['scripts/deploy.mjs']);
process.exit(dep.status || 0);
