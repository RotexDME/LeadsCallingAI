import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight, Phone, Clock, AlertCircle } from 'lucide-react';

interface Call {
  id: string;
  phone_number: string;
  status: string;
  direction: string;
  model_provider: string;
  voice_id: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  error_message: string | null;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-500/15 text-green-300 border-green-500/30',
  failed: 'bg-red-500/15 text-red-300 border-red-500/30',
  no_answer: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  initiated: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  ringing: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  answered: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
};

function formatDuration(seconds: number | null) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const PAGE_SIZE = 10;

export default function CallLogs() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCalls = useCallback(async (offset: number) => {
    setLoading(true);
    setError('');
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-calls?limit=${PAGE_SIZE}&offset=${offset}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      });
      const data = await res.json();
      if (res.ok) {
        setCalls(data.calls ?? []);
        setTotal(data.count ?? 0);
      } else {
        setError(data.error || 'Failed to load call logs');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalls(page * PAGE_SIZE);
  }, [page, fetchCalls]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="relative">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-700 to-gray-600 rounded-2xl opacity-50 blur-lg"></div>

      <div className="relative p-8 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Call Logs</h2>
            <p className="text-gray-500 text-sm mt-0.5">{total} total records</p>
          </div>
          <button
            onClick={() => fetchCalls(page * PAGE_SIZE)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-gray-300 text-sm transition-all duration-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {loading && calls.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Loading calls...
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Phone className="w-10 h-10 mb-3 opacity-30" />
            <p>No calls yet. Start by dispatching a call above.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/3">
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Phone</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium hidden sm:table-cell">Model</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium hidden md:table-cell">Started</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">
                      <Clock className="w-3.5 h-3.5 inline mr-1" />Duration
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {calls.map((call, i) => (
                    <tr
                      key={call.id}
                      className={`border-b border-white/5 transition-colors hover:bg-white/5 ${i % 2 === 0 ? '' : 'bg-white/2'}`}
                    >
                      <td className="px-4 py-3 font-mono text-gray-200">{call.phone_number}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-md border text-xs font-medium capitalize ${STATUS_STYLES[call.status] ?? 'bg-gray-500/15 text-gray-300 border-gray-500/30'}`}>
                          {call.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 capitalize hidden sm:table-cell">{call.model_provider}</td>
                      <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{formatDate(call.started_at ?? call.created_at)}</td>
                      <td className="px-4 py-3 text-gray-300 font-mono">{formatDuration(call.duration_seconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
                <span>Page {page + 1} of {totalPages}</span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
