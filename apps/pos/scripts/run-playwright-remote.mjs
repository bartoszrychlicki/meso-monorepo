import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const appDir = path.resolve(scriptDir, '..');
const cliPath = path.resolve(appDir, '../../node_modules/playwright/cli.js');

const forwardedArgs = process.argv.slice(2);
if (forwardedArgs[0] === '--') {
  forwardedArgs.shift();
}

const child = spawn(
  process.execPath,
  [cliPath, 'test', '--config=playwright.config.ts', ...forwardedArgs],
  {
    cwd: appDir,
    env: process.env,
    stdio: 'inherit',
  }
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
