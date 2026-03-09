import { createRunContext, writeRunContext } from './support/run-context';
import { cleanupRunArtifacts, sweepStaleE2eData } from './support/cleanup';
import { createAdminClient, provisionRunUser } from './support/supabase-admin';

async function globalSetup(): Promise<void> {
  const admin = createAdminClient();
  const initialContext = createRunContext();

  await sweepStaleE2eData(admin, initialContext);
  await cleanupRunArtifacts(admin, initialContext);

  const provisioned = await provisionRunUser(admin, initialContext);
  await writeRunContext(provisioned);
}

export default globalSetup;
