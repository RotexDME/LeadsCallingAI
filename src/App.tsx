import { useState, useCallback } from 'react';
import { LayoutDashboard, Settings } from 'lucide-react';
import CallDispatcher from './components/CallDispatcher';
import BulkDialer from './components/BulkDialer';
import CallLogs from './components/CallLogs';
import AnalyticsBar from './components/AnalyticsBar';
import AgentStatus from './components/AgentStatus';
import SettingsPanel from './components/settings/SettingsPanel';
import ActivityLog from './components/ActivityLog';
import type { ActivityEntry } from './components/VoiceTestModal';

type Tab = 'dashboard' | 'settings';

function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);

  const handleActivity = useCallback((entry: ActivityEntry) => {
    setActivityLog(prev => [...prev.slice(-199), entry]);
  }, []);

  const clearActivity = useCallback(() => {
    setActivityLog([]);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="container mx-auto px-4 py-12">
        <header className="text-center mb-10">
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-green-400 mb-4">
            AI Voice Agent Dashboard
          </h1>
          <p className="text-gray-400 text-lg mb-6">Deploy intelligent voice agents instantly</p>
          <div className="flex justify-center">
            <AgentStatus />
          </div>
        </header>

        <div className="flex justify-center mb-10">
          <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
            <button
              onClick={() => setTab('dashboard')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                tab === 'dashboard'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => setTab('settings')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                tab === 'settings'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>

        {tab === 'dashboard' && (
          <>
            <AnalyticsBar />
            <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-10">
              <CallDispatcher onActivity={handleActivity} />
              <BulkDialer />
            </div>
            <div className="max-w-6xl mx-auto space-y-8">
              <ActivityLog entries={activityLog} onClear={clearActivity} />
              <CallLogs />
            </div>
          </>
        )}

        {tab === 'settings' && (
          <div className="max-w-6xl mx-auto">
            <SettingsPanel />
          </div>
        )}

        <footer className="mt-20 text-center text-gray-600 text-sm">
          <p>Powered by Supabase Edge Functions</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
