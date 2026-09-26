import { spawn } from 'node:child_process';
import { acceptanceRuntimeEnvironment } from './acceptance/local-runtime.mjs';

const args = process.argv.slice(2);
const valueFor = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const host = valueFor('--host', '127.0.0.1');
const port = valueFor('--port', '3016');
const env = acceptanceRuntimeEnvironment({ host, port });
const child = spawn('npm', ['run', 'start', '--', '-H', host, '-p', port], { cwd: process.cwd(), stdio: 'inherit', env });
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
