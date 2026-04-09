import { useEffect, useState } from 'react';
import { Phone, CheckCircle, XCircle, Activity, Clock } from 'lucide-react';

interface Analytics {
  totalCalls: number;
  completedCalls: number;
  failedCalls: number;
  activeCalls: number;
  avgDuration: number;
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4 px-6 py-4 bg-white/5 border border-white/10 rounded-xl">
      <div className={`p-2.5 rounded-lg ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function AnalyticsBar() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-analytics`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        });
        const data = await res.json();
        if (res.ok) setAnalytics(data.analytics);
      } catch {
        // silent fail
      }
    };
    fetchAnalytics();
  }, []);

  const a = analytics;

  const formatDuration = (s: number) => {
    if (!s) return '0s';
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
      <StatCard icon={<Phone className="w-4 h-4 text-blue-300" />} label="Total Calls" value={a?.totalCalls ?? '—'} color="bg-blue-500/20" />
      <StatCard icon={<CheckCircle className="w-4 h-4 text-green-300" />} label="Completed" value={a?.completedCalls ?? '—'} color="bg-green-500/20" />
      <StatCard icon={<XCircle className="w-4 h-4 text-red-300" />} label="Failed" value={a?.failedCalls ?? '—'} color="bg-red-500/20" />
      <StatCard icon={<Activity className="w-4 h-4 text-cyan-300" />} label="Active Now" value={a?.activeCalls ?? '—'} color="bg-cyan-500/20" />
      <StatCard icon={<Clock className="w-4 h-4 text-yellow-300" />} label="Avg Duration" value={a ? formatDuration(a.avgDuration) : '—'} color="bg-yellow-500/20" />
    </div>
  );
}
