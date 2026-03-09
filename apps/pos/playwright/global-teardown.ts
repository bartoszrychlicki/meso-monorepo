import { readRunContext } from './support/run-context';
import { cleanupRunArtifacts, assertRunArtifactsDeleted } from './support/cleanup';
import { createAdminClient } from './support/supabase-admin';

async function globalTeardown(): Promise<void> {
  const admin = createAdminClient();
  let context;

  try {
    context = await readRunContext();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }

  await cleanupRunArtifacts(admin, context);
  await assertRunArtifactsDeleted(admin, context);
}

export default globalTeardown;
