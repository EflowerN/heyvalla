import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const backend = resolve(frontend, '../backend');
const dataDir = resolve(frontend, '.e2e');
mkdirSync(dataDir, { recursive: true });
const database = resolve(dataDir, 'browser-tests.sqlite');
writeFileSync(database, '');
const env = { ...process.env, FOLLOWME_API_KEY: '', APP_ENV: 'testing', APP_DEBUG: 'false', APP_KEY: `base64:${randomBytes(32).toString('base64')}`, DB_CONNECTION: 'sqlite', DB_DATABASE: database, DB_URL: '', CACHE_STORE: 'database', SESSION_DRIVER: 'array', QUEUE_CONNECTION: 'sync', LOG_CHANNEL: 'stderr' };
for (const command of [['migrate', '--force', '--no-interaction'], ['heyvalla:demo', '--days=7', '--no-interaction']]) {
  const result = spawnSync('php', ['artisan', ...command], { cwd: backend, env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const server = spawn('php', ['artisan', 'serve', '--host=127.0.0.1', '--port=18766', '--no-reload'], { cwd: backend, env, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { server.kill(signal); });
server.on('exit', code => process.exit(code ?? 0));
