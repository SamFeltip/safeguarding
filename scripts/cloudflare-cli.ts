import { spawnSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';

export const cli = fileURLToPath(new URL('../node_modules/.bin/cf', import.meta.url));
export function run(arguments_: string[]) {
  const child = spawnSync(cli, arguments_, { stdio: 'inherit' });
  if (child.error) throw child.error;
  if (child.status !== 0)
    throw new Error(`Cloudflare command failed: ${arguments_.slice(0, 3).join(' ')}`);
}
export function inspect(arguments_: string[]): unknown {
  const child = spawnSync(cli, arguments_, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  if (child.error) throw child.error;
  if (child.status !== 0) throw new Error(child.stderr || 'Cloudflare request failed.');
  return JSON.parse(child.stdout);
}
