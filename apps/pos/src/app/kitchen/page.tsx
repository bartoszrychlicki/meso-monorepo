'use client';

import Link from 'next/link';
import { KdsBoard } from '@/modules/kitchen/components/kds-board';
import { KdsStats } from '@/modules/kitchen/components/kds-stats';
import { ArrowLeft, ChefHat } from 'lucide-react';

export default function KitchenKdsPage() {
  return (
    <div
      className="flex h-screen flex-col bg-slate-900"
      data-page="kitchen-kds"
    >
      {/* Header bar */}
      <header className="flex items-center gap-4 border-b border-slate-700 bg-slate-800 px-4 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-600 hover:text-white"
          data-action="back-to-dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
          Wroc
        </Link>

        <div className="mx-4 h-6 w-px bg-slate-600" />

        <div className="flex items-center gap-3">
          <ChefHat className="h-7 w-7 text-orange-400" />
          <h1 className="text-xl font-black tracking-tight text-white">
            MESO KDS
          </h1>
        </div>

        <div className="mx-4 h-6 w-px bg-slate-600" />

        <div className="flex-1">
          <KdsStats />
        </div>
      </header>

      {/* Main KDS board area */}
      <main className="flex flex-1 overflow-hidden p-2">
        <KdsBoard />
      </main>
    </div>
  );
}
