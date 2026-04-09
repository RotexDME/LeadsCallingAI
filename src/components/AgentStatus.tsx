import { useEffect, useState } from 'react';
import { Circle, Terminal } from 'lucide-react';

export default function AgentStatus() {
  const [activeCalls, setActiveCalls] = useState<number | null>(null);

  useEffect(() => {
    const fetchActive = async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-analytics`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        });
        const data = await res.json();
        if (res.ok) setActiveCalls(data.analytics?.activeCalls ?? 0);
      } catch {
        setActiveCalls(null);
      }
    };
    fetchActive();
    const t = setInterval(fetchActive, 10000);
    return () => clearInterval(t);
  }, []);

  const hasActive = activeCalls !== null && activeCalls > 0;

  return (
    <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm mb-8">
      <div className="flex items-center gap-1.5">
        <Circle className={`w-2 h-2 fill-current ${hasActive ? 'text-green-400 animate-pulse' : 'text-gray-600'}`} />
        <span className={hasActive ? 'text-green-300' : 'text-gray-500'}>
          {hasActive ? `${activeCalls} call${activeCalls === 1 ? '' : 's'} in progress` : 'No active calls'}
        </span>
      </div>
      <span className="text-gray-700">|</span>
      <div className="flex items-center gap-1.5 text-gray-500">
        <Terminal className="w-3.5 h-3.5" />
        <span>Run <code className="font-mono text-xs bg-white/8 px-1.5 py-0.5 rounded text-gray-300">python agent.py start</code> to enable calling</span>
      </div>
    </div>
  );
}
