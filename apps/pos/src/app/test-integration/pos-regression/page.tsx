import { notFound } from 'next/navigation';
import { PosRegressionHarness } from '@/modules/e2e/pos-regression-harness';

export default function PosRegressionPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <PosRegressionHarness />
      </div>
    </div>
  );
}
