'use client';

import { useEffect, useState } from 'react';
import { useKitchenStats } from '../hooks';
import { Flame, Clock, CheckCircle2, Timer } from 'lucide-react';

export function KdsStats() {
  const { completedToday, avgPrepTime, activeCount } = useKitchenStats();
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    function updateTime() {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('pl-PL', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    }
    updateTime();
    const id = setInterval(updateTime, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-6 text-sm" data-component="kds-stats">
      <div className="flex items-center gap-2 text-slate-300">
        <Flame className="h-5 w-5 text-orange-400" />
        <span className="font-medium">Aktywne:</span>
        <span className="text-lg font-bold text-white">{activeCount}</span>
      </div>

      <div className="hidden items-center gap-2 text-slate-300 sm:flex">
        <Clock className="h-5 w-5 text-blue-400" />
        <span className="font-medium">Avg czas:</span>
        <span className="text-lg font-bold text-white">
          {avgPrepTime > 0 ? `${avgPrepTime} min` : '--'}
        </span>
      </div>

      <div className="flex items-center gap-2 text-slate-300">
        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        <span className="font-medium">Dzisiaj:</span>
        <span className="text-lg font-bold text-white">{completedToday}</span>
      </div>

      <div className="ml-auto flex items-center gap-2 text-slate-300">
        <Timer className="h-5 w-5 text-slate-400" />
        <span className="font-mono text-lg font-bold text-white">{currentTime}</span>
      </div>
    </div>
  );
}
