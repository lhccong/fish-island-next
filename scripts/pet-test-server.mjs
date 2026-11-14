import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, preview } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2]);
if (![4197, 4198, 4199].includes(port)) throw new Error('Unsupported pet validation port');
const outDir = resolve(
  root,
  port === 4199 ? 'test-results-pet-rankings-build' : `test-results-pet-${port}-build`,
);
if (dirname(outDir) !== root) throw new Error('Validation output must remain in the workspace');
await build({ root, build: { outDir } });
const server = await preview({
  root,
  build: { outDir },
  preview: { host: '127.0.0.1', port, strictPort: true },
});
function close() {
  server.httpServer.closeAllConnections();
  server.httpServer.close(() => process.exit(0));
}
process.once('SIGINT', close);
process.once('SIGTERM', close);
