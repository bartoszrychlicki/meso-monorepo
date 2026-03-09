import fs from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';

export const PLAYWRIGHT_OUTPUT_DIR = path.resolve(
  __dirname,
  '../../output/playwright'
);
export const AUTH_STATE_DIR = path.join(PLAYWRIGHT_OUTPUT_DIR, '.auth');
export const RUN_CONTEXT_PATH = path.join(AUTH_STATE_DIR, 'remote-run-context.json');
export const STORAGE_STATE_PATH = path.join(AUTH_STATE_DIR, 'remote-user.json');

export const SEEDED_LOCATION = {
  id: '11111111-1111-1111-1111-111111111001',
  name: 'Kuchnia Centralna',
} as const;

export const SEEDED_WAREHOUSE = {
  id: '99999999-9999-9999-9999-999999990001',
  name: 'Magazyn glowny',
} as const;

export const SEEDED_MENU_CATEGORY = {
  id: '33333333-3333-3333-3333-333333333001',
  name: 'Burgery',
} as const;

export const SEEDED_STOCK_ITEMS = {
  beef: {
    id: '88888888-8888-8888-8888-888888880001',
    name: 'Wolowina mielona',
  },
  buns: {
    id: '88888888-8888-8888-8888-888888880002',
    name: 'Bulki burgerowe',
  },
  cheddar: {
    id: '88888888-8888-8888-8888-888888880003',
    name: 'Ser cheddar',
  },
} as const;

export interface RemoteE2ERunContext {
  runId: string;
  prefix: string;
  email: string;
  password: string;
  username: string;
  fullName: string;
  userId: string | null;
  createdAt: string;
}

function sanitizeRunId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function generateRunId(): string {
  const iso = new Date().toISOString().replace(/[:.]/g, '-').toLowerCase();
  const randomSuffix = randomBytes(3).toString('hex');
  return sanitizeRunId(`${iso}-${randomSuffix}`);
}

export function createRunContext(): RemoteE2ERunContext {
  const runId = sanitizeRunId(process.env.E2E_RUN_ID || generateRunId());
  const prefix = `E2E-POS-${runId}`;

  return {
    runId,
    prefix,
    email: `e2e+${runId}@mesopos.pl`,
    password: `MesoE2E!${runId.slice(-10)}Aa1`,
    username: `e2e-${runId}`,
    fullName: `E2E POS ${runId}`,
    userId: null,
    createdAt: new Date().toISOString(),
  };
}

export async function ensureRunArtifactsDir(): Promise<void> {
  await fs.mkdir(AUTH_STATE_DIR, { recursive: true });
}

export async function writeRunContext(context: RemoteE2ERunContext): Promise<void> {
  await ensureRunArtifactsDir();
  await fs.writeFile(RUN_CONTEXT_PATH, JSON.stringify(context, null, 2), 'utf8');
}

export async function readRunContext(): Promise<RemoteE2ERunContext> {
  const raw = await fs.readFile(RUN_CONTEXT_PATH, 'utf8');
  return JSON.parse(raw) as RemoteE2ERunContext;
}

export function buildTaggedValue(context: RemoteE2ERunContext, suffix: string): string {
  return `${context.prefix}-${suffix}`;
}
