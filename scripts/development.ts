import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { parseEnv } from 'node:util';
import { loadEnv } from 'vite';
import { run } from './cloudflare-cli.ts';

const path = '.dev.vars';
let contents = existsSync(path) ? readFileSync(path, 'utf8') : '';
const configured = parseEnv(contents);
const variables = loadEnv('development', process.cwd(), '');
for (const name of ['AUTH0_DOMAIN', 'AUTH0_AUDIENCE']) {
  if (!configured[name] && variables[name])
    contents += `\n${name}=${JSON.stringify(variables[name])}\n`;
}
if (!configured.BACKUP_ENCRYPTION_KEY) {
  contents += `\nBACKUP_ENCRYPTION_KEY=${randomBytes(32).toString('hex')}\n`;
}
writeFileSync(path, contents, { mode: 0o600 });
chmodSync(path, 0o600);
run(['dev', ...process.argv.slice(2)]);
