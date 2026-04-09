import { useEffect, useState, useCallback } from 'react';
import { Save, RefreshCw, Eye, EyeOff, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

interface ConfigEntry {
  key: string;
  value: string;
  label: string;
  group: string;
  is_secret: boolean;
  placeholder: string;
  updated_at: string;
}

interface EditState {
  [key: string]: string;
}

interface RevealState {
  [key: string]: boolean;
}

const GROUP_META: Record<string, { label: string; color: string; docUrl?: string }> = {
  livekit: { label: 'LiveKit (Voice Infrastructure)', color: 'border-blue-500/30 bg-blue-500/5', docUrl: 'https://cloud.livekit.io' },
  stt:     { label: 'Deepgram (Speech-to-Text)',     color: 'border-cyan-500/30 bg-cyan-500/5',  docUrl: 'https://console.deepgram.com' },
  llm:     { label: 'LLM Providers (OpenAI / Groq)', color: 'border-green-500/30 bg-green-500/5', docUrl: 'https://platform.openai.com' },
  sip:     { label: 'SIP Trunk (Vobiz / Outbound)',  color: 'border-yellow-500/30 bg-yellow-500/5' },
};

function statusDot(value: string) {
  return value.trim()
    ? <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" title="Configured" />
    : <span className="w-2 h-2 rounded-full bg-gray-600 shrink-0" title="Not set" />;
}

export default function SettingsPanel() {
  const [config, setConfig] = useState<ConfigEntry[]>([]);
  const [edits, setEdits] = useState<EditState>({});
  const [revealed, setRevealed] = useState<RevealState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMsg, setSaveMsg] = useState('');

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-settings`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      });
      const data = await res.json();
      if (res.ok && data.config) {
        setConfig(data.config);
        const initial: EditState = {};
        data.config.forEach((c: ConfigEntry) => { initial[c.key] = c.value; });
        setEdits(initial);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleChange = (key: string, val: string) => {
    setEdits(prev => ({ ...prev, [key]: val }));
  };

  const isDirty = config.some(c => edits[c.key] !== c.value);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('idle');
    const updates = config
      .filter(c => edits[c.key] !== c.value)
      .map(c => ({ key: c.key, value: edits[c.key] ?? '' }));

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-settings`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveStatus('success');
        setSaveMsg(`Saved ${data.updated} setting${data.updated === 1 ? '' : 's'}`);
        await fetchConfig();
      } else {
        setSaveStatus('error');
        setSaveMsg(data.error || 'Save failed');
      }
    } catch {
      setSaveStatus('error');
      setSaveMsg('Network error');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const groups = Array.from(new Set(config.map(c => c.group)));

  const configuredCount = config.filter(c => c.value.trim()).length;
  const sipConfigured = config
    .filter(c => c.group === 'sip')
    .every(c => c.value.trim());

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Agent Settings</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {configuredCount} of {config.length} keys configured
            {sipConfigured
              ? <span className="ml-2 text-green-400 text-xs">• SIP calling ready</span>
              : <span className="ml-2 text-yellow-500 text-xs">• SIP not configured — use Browser Test mode</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchConfig}
            disabled={loading}
            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 text-sm"
          >
            {saving
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
              : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
        </div>
      </div>

      {saveStatus !== 'idle' && (
        <div className={`flex items-center gap-2 p-3 mb-6 rounded-xl text-sm border ${
          saveStatus === 'success'
            ? 'bg-green-500/10 border-green-500/20 text-green-300'
            : 'bg-red-500/10 border-red-500/20 text-red-300'
        }`}>
          {saveStatus === 'success'
            ? <CheckCircle className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />}
          {saveMsg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading settings...
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => {
            const entries = config.filter(c => c.group === group);
            const meta = GROUP_META[group] ?? { label: group, color: 'border-white/10 bg-white/3' };
            const groupConfigured = entries.filter(c => (edits[c.key] ?? c.value).trim()).length;

            return (
              <div key={group} className={`border rounded-2xl overflow-hidden ${meta.color}`}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
                  <div className="flex items-center gap-3">
                    <h3 className="text-white font-semibold text-sm">{meta.label}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      groupConfigured === entries.length
                        ? 'bg-green-500/15 text-green-300 border-green-500/25'
                        : groupConfigured > 0
                          ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/25'
                          : 'bg-gray-700/40 text-gray-500 border-gray-600/30'
                    }`}>
                      {groupConfigured}/{entries.length}
                    </span>
                  </div>
                  {meta.docUrl && (
                    <a
                      href={meta.docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      Docs <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="divide-y divide-white/5">
                  {entries.map(entry => {
                    const currentVal = edits[entry.key] ?? entry.value;
                    const changed = currentVal !== entry.value;
                    const isRevealed = revealed[entry.key];

                    return (
                      <div key={entry.key} className="px-6 py-4 flex items-center gap-4">
                        <div className="flex items-center gap-2 w-52 shrink-0">
                          {statusDot(currentVal)}
                          <label className="text-sm text-gray-300 font-medium truncate">
                            {entry.label}
                          </label>
                        </div>

                        <div className="flex-1 relative">
                          <input
                            type={entry.is_secret && !isRevealed ? 'password' : 'text'}
                            value={currentVal}
                            onChange={e => handleChange(entry.key, e.target.value)}
                            placeholder={entry.placeholder}
                            className={`w-full px-4 py-2.5 bg-black/40 border rounded-xl text-sm text-white placeholder-gray-700 outline-none transition-all duration-200 pr-10 font-mono ${
                              changed
                                ? 'border-blue-500/60 ring-1 ring-blue-500/30'
                                : 'border-white/10 focus:border-white/25'
                            }`}
                          />
                          {entry.is_secret && (
                            <button
                              type="button"
                              onClick={() => setRevealed(prev => ({ ...prev, [entry.key]: !prev[entry.key] }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors"
                            >
                              {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          )}
                        </div>

                        {changed && (
                          <span className="text-xs text-blue-400 shrink-0">unsaved</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 p-4 bg-white/3 border border-white/8 rounded-xl text-xs text-gray-500 leading-relaxed">
        Settings are stored in your Supabase database. The Python agent reads keys directly from its <code className="font-mono bg-white/8 px-1 rounded text-gray-400">.env</code> file — update that file on your server to apply LiveKit / SIP changes to the running agent. These settings power the browser Voice Test mode immediately.
      </div>
    </div>
  );
}
