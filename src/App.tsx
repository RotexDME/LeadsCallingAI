import CallDispatcher from './components/CallDispatcher';
import BulkDialer from './components/BulkDialer';
import CallLogs from './components/CallLogs';
import AnalyticsBar from './components/AnalyticsBar';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="container mx-auto px-4 py-12">
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-green-400 mb-4">
            AI Voice Agent Dashboard
          </h1>
          <p className="text-gray-400 text-lg">Deploy intelligent voice agents instantly</p>
        </header>

        <AnalyticsBar />

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-10">
          <CallDispatcher />
          <BulkDialer />
        </div>

        <div className="max-w-6xl mx-auto">
          <CallLogs />
        </div>

        <footer className="mt-20 text-center text-gray-600 text-sm">
          <p>Powered by Supabase Edge Functions</p>
        </footer>
      </div>
    </div>
  );
}

export default App
