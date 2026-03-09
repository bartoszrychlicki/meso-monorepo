import dotenv from 'dotenv';
import path from 'path';

let envLoaded = false;

export function loadPosEnv(): void {
  if (envLoaded) {
    return;
  }

  dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
  envLoaded = true;
}

export function getRequiredEnv(name: string): string {
  loadPosEnv();

  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getPosBaseUrl(): string {
  loadPosEnv();

  return process.env.E2E_POS_BASE_URL || 'http://127.0.0.1:4010';
}

export function getSupabaseServiceKey(): string {
  return (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  );
}
