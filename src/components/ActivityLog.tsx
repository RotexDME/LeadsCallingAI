import { useRef, useEffect } from 'react';
import { Activity, Trash2, Mic, Volume2, Bot, User, Info, AlertCircle, CheckCircle } from 'lucide-react';
import type { ActivityEntry } from './VoiceTestModal';

interface ActivityLogProps {
  entries: ActivityEntry[];
  onClear: () => void;
}

const TYPE_CONFIG: Record<ActivityEntry['type'], { icon: React.ReactNode; color: string; badge: string }> = {
  info:    { icon: <Info className="w-3.5 h-3.5" />,         color: 'text-gray-400',  badge: 'bg-gray-700/50 text-gray-400 border-gray-600/30' },
  success: { icon: <CheckCircle className="w-3.5 h-3.5" />,  color: 'text-green-400', badge: 'bg-green-500/15 text-green-300 border-green-500/25' },
  error:   { icon: <AlertCircle className="w-3.5 h-3.5" />,  color: 'text-red-400',   badge: 'bg-red-500/15 text-red-300 border-red-500/25' },
  ai:      { icon: <Bot className="w-3.5 h-3.5" />,          color: 'text-blue-400',  badge: 'bg-blue-500/15 text-blue-300 border-blue-500/25' },
  user:    { icon: <User className="w-3.5 h-3.5" />,         color: 'text-cyan-400',  badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25' },
  tts:     { icon: <Volume2 className="w-3.5 h-3.5" />,      color: 'text-teal-400',  badge: 'bg-teal-500/15 text-teal-300 border-teal-500/25' },
  stt:     { icon: <Mic className="w-3.5 h-3.5" />,          color: 'text-orange-400',badge: 'bg-orange-500/15 text-orange-300 border-orange-500/25' },
};

const TYPE_LABEL: Record<ActivityEntry['type'], string> = {
  info: 'INFO', success: 'OK', error: 'ERR', ai: 'AI', user: 'USER', tts: 'TTS', stt: 'STT',
};

function formatTime(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export default function ActivityLog({ entries, onClear }: ActivityLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  return (
    <div className="relative">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-700 to-gray-600 rounded-2xl opacity-50 blur-lg" />
      <div className="relative bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <Activity className="w-4 h-4 text-blue-400" />
            <h2 className="text-white font-bold text-lg">Activity Log</h2>
            {entries.length > 0 && (
              <span className="text-xs px-2 py-0.5 bg-blue-500/15 text-blue-300 border border-blue-500/20 rounded-full">
                {entries.length} events
              </span>
            )}
          </div>
          {entries.length > 0 && (
            <button
              onClick={onClear}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 hover:text-white text-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        <div className="h-72 overflow-y-auto font-mono text-xs">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2">
              <Activity className="w-8 h-8 opacity-30" />
              <p>No activity yet.</p>
              <p className="text-gray-700">Events will appear here when you run a Browser Voice Test.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/4">
              {entries.map(entry => {
                const cfg = TYPE_CONFIG[entry.type];
                return (
                  <div key={entry.id} className="flex items-start gap-3 px-5 py-2.5 hover:bg-white/3 transition-colors">
                    <span className="text-gray-600 shrink-0 pt-0.5 w-20">{formatTime(entry.timestamp)}</span>
                    <span className={`shrink-0 pt-0.5 ${cfg.color}`}>{cfg.icon}</span>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded border text-[10px] font-bold leading-none ${cfg.badge}`}>
                      {TYPE_LABEL[entry.type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-200">{entry.label}</span>
                      {entry.detail && (
                        <span className="text-gray-500 ml-2 break-all">{entry.detail}</span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
