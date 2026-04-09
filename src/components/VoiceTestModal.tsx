import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mic, MicOff, Volume2, Loader2, Phone, AlertCircle, Globe } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface VoiceTestModalProps {
  onClose: () => void;
  prompt?: string;
  modelProvider?: string;
  voiceName?: string;
  onActivity?: (entry: ActivityEntry) => void;
}

export interface ActivityEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'ai' | 'user' | 'tts' | 'stt';
  label: string;
  detail?: string;
}

interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: { [index: number]: { isFinal: boolean; [index: number]: { transcript: string } }; length: number };
}

interface ISpeechRecognitionErrorEvent {
  error: string;
}

interface ISpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
}

interface ISpeechRecognitionConstructor {
  new(): ISpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: ISpeechRecognitionConstructor;
    webkitSpeechRecognition: ISpeechRecognitionConstructor;
  }
}

const LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-IN', label: 'English (India)' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'ta-IN', label: 'Tamil' },
  { code: 'te-IN', label: 'Telugu' },
  { code: 'kn-IN', label: 'Kannada' },
  { code: 'ml-IN', label: 'Malayalam' },
  { code: 'mr-IN', label: 'Marathi' },
  { code: 'gu-IN', label: 'Gujarati' },
  { code: 'bn-IN', label: 'Bengali' },
  { code: 'pa-IN', label: 'Punjabi' },
  { code: 'es-ES', label: 'Spanish' },
  { code: 'fr-FR', label: 'French' },
  { code: 'de-DE', label: 'German' },
  { code: 'ar-SA', label: 'Arabic' },
  { code: 'zh-CN', label: 'Chinese (Mandarin)' },
  { code: 'ja-JP', label: 'Japanese' },
  { code: 'pt-BR', label: 'Portuguese (Brazil)' },
];

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function VoiceTestModal({ onClose, prompt, modelProvider, voiceName, onActivity }: VoiceTestModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [error, setError] = useState('');
  const [callStarted, setCallStarted] = useState(false);
  const [supported, setSupported] = useState(true);
  const [selectedLang, setSelectedLang] = useState('en-US');

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobUrlRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const finalTranscriptRef = useRef('');
  const messagesRef = useRef<Message[]>([]);

  messagesRef.current = messages;

  const log = useCallback((type: ActivityEntry['type'], label: string, detail?: string) => {
    onActivity?.({ id: makeId(), timestamp: new Date(), type, label, detail });
  }, [onActivity]);

  useEffect(() => {
    const SR: ISpeechRecognitionConstructor | undefined = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      log('error', 'Browser does not support Web Speech API');
    }
  }, [log]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, isSpeaking]);

  useEffect(() => {
    return () => {
      if (audioBlobUrlRef.current) URL.revokeObjectURL(audioBlobUrlRef.current);
      audioRef.current?.pause();
    };
  }, []);

  const speak = useCallback(async (text: string): Promise<void> => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioBlobUrlRef.current) {
      URL.revokeObjectURL(audioBlobUrlRef.current);
      audioBlobUrlRef.current = null;
    }

    try {
      log('tts', 'TTS request sent', `voice=${voiceName || 'alloy'}, chars=${text.length}`);
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ text, voice: voiceName || 'alloy' }),
      });

      if (!res.ok) {
        throw new Error(`TTS HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      audioBlobUrlRef.current = blobUrl;
      log('success', 'TTS audio received', `size=${(blob.size / 1024).toFixed(1)} KB`);

      return new Promise((resolve) => {
        const audio = new Audio(blobUrl);
        audioRef.current = audio;
        audio.onplay = () => setIsSpeaking(true);
        audio.onended = () => { setIsSpeaking(false); resolve(); };
        audio.onerror = () => { setIsSpeaking(false); resolve(); };
        audio.play().catch(() => { setIsSpeaking(false); resolve(); });
      });
    } catch (e: unknown) {
      log('error', 'TTS failed, using browser fallback', e instanceof Error ? e.message : String(e));
      return new Promise((resolve) => {
        const synth = window.speechSynthesis;
        if (!synth) { resolve(); return; }
        synth.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1.05;
        utter.onstart = () => setIsSpeaking(true);
        utter.onend = () => { setIsSpeaking(false); resolve(); };
        utter.onerror = () => { setIsSpeaking(false); resolve(); };
        synth.speak(utter);
      });
    }
  }, [voiceName, log]);

  const sendToAI = useCallback(async (userMessage: string, history: Message[]): Promise<string> => {
    setIsThinking(true);
    log('info', 'Sending to AI', `provider=${modelProvider || 'openai'}, history=${history.length} msgs`);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-chat`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: [...history, { role: 'user', content: userMessage }],
          contextOverride: prompt || undefined,
          modelProvider: modelProvider || 'openai',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI error');
      log('ai', 'AI reply received', `model=${data.model}, reply="${data.reply?.slice(0, 60)}${data.reply?.length > 60 ? '…' : ''}"`);
      return data.reply as string;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'AI error';
      log('error', 'AI request failed', msg);
      throw e;
    } finally {
      setIsThinking(false);
    }
  }, [prompt, modelProvider, log]);

  const handleFinalSpeech = useCallback(async (spoken: string) => {
    if (!spoken.trim()) return;
    const userMsg: Message = { role: 'user', content: spoken };
    const currentHistory = messagesRef.current;
    setMessages(prev => [...prev, userMsg]);
    setLiveTranscript('');
    log('user', 'User spoke', spoken);
    try {
      const reply = await sendToAI(spoken, currentHistory);
      const assistantMsg: Message = { role: 'assistant', content: reply };
      setMessages(prev => [...prev, assistantMsg]);
      await speak(reply);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [sendToAI, speak, log]);

  const startListening = useCallback(() => {
    const SR: ISpeechRecognitionConstructor | undefined = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = selectedLang;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    finalTranscriptRef.current = '';

    recognition.onstart = () => {
      setIsListening(true);
      setLiveTranscript('');
      log('stt', 'Microphone listening', `lang=${selectedLang}`);
    };

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }
      if (final) finalTranscriptRef.current += final;
      setLiveTranscript(finalTranscriptRef.current + interim);
    };

    recognition.onend = () => {
      setIsListening(false);
      const spoken = finalTranscriptRef.current.trim();
      finalTranscriptRef.current = '';
      setLiveTranscript('');
      if (spoken) {
        log('stt', 'Speech recognized', spoken);
      } else {
        log('info', 'No speech detected');
      }
      handleFinalSpeech(spoken);
    };

    recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
      if (event.error !== 'no-speech') {
        setError(`Mic error: ${event.error}`);
        log('error', 'Microphone error', event.error);
      }
      setIsListening(false);
    };

    recognition.start();
  }, [handleFinalSpeech, selectedLang, log]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const startCall = useCallback(async () => {
    setCallStarted(true);
    setError('');
    log('info', 'Browser voice test started', `lang=${selectedLang}, voice=${voiceName || 'alloy'}`);
    try {
      const greeting = await sendToAI('__greeting__', []);
      setMessages([{ role: 'assistant', content: greeting }]);
      await speak(greeting);
    } catch {
      const fallback = 'Hello! How can I help you today?';
      setMessages([{ role: 'assistant', content: fallback }]);
      log('info', 'Using fallback greeting');
      await speak(fallback);
    }
  }, [speak, sendToAI, selectedLang, voiceName, log]);

  const handleMicToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const handleClose = useCallback(() => {
    recognitionRef.current?.stop();
    audioRef.current?.pause();
    audioRef.current = null;
    if (audioBlobUrlRef.current) {
      URL.revokeObjectURL(audioBlobUrlRef.current);
      audioBlobUrlRef.current = null;
    }
    log('info', 'Browser voice test ended');
    onClose();
  }, [onClose, log]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-gray-950 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${callStarted ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
            <h2 className="text-white font-semibold">Browser Voice Test</h2>
            {callStarted && (
              <span className="text-xs px-2 py-0.5 bg-green-500/15 text-green-300 border border-green-500/20 rounded-full">Live</span>
            )}
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!callStarted && (
          <div className="px-6 pt-4">
            <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
              <Globe className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="flex-1">
                <label className="text-xs text-gray-400 block mb-1">Speech recognition language</label>
                <select
                  value={selectedLang}
                  onChange={e => setSelectedLang(e.target.value)}
                  className="w-full bg-transparent text-white text-sm outline-none cursor-pointer"
                >
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code} className="bg-gray-900 text-white">
                      {l.label} ({l.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2 px-1">
              The AI responds in the language of your choice — set it in the system prompt.
            </p>
          </div>
        )}

        {!supported && (
          <div className="flex items-center gap-3 m-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-300 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Your browser does not support the Web Speech API. Please use Chrome or Edge.
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-48">
          {messages.length === 0 && !callStarted && (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-sm text-center gap-2">
              <Phone className="w-8 h-8 opacity-30" />
              <p>Click "Start Call" to talk with the AI agent right in your browser.</p>
              <p className="text-xs text-gray-600">No phone or SIP trunk needed.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600/80 text-white rounded-br-sm'
                  : 'bg-white/8 text-gray-100 border border-white/10 rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start">
              <div className="px-4 py-2.5 bg-white/8 border border-white/10 rounded-2xl rounded-bl-sm flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Thinking...
              </div>
            </div>
          )}

          {isSpeaking && (
            <div className="flex justify-start">
              <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2 text-gray-500 text-xs">
                <Volume2 className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                Speaking...
              </div>
            </div>
          )}

          {isListening && liveTranscript && (
            <div className="flex justify-end">
              <div className="max-w-[80%] px-4 py-2.5 bg-blue-600/30 text-blue-200 border border-blue-500/20 rounded-2xl rounded-br-sm text-sm italic">
                {liveTranscript}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="px-6 py-4 border-t border-white/10">
          {!callStarted ? (
            <button
              onClick={startCall}
              disabled={!supported}
              className="w-full py-3 px-6 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4" />
              Start Call
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleMicToggle}
                disabled={isThinking || isSpeaking || !supported}
                className={`flex-1 py-3 px-6 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                  isListening
                    ? 'bg-red-600 hover:bg-red-500 text-white ring-2 ring-red-400 ring-offset-2 ring-offset-gray-950'
                    : 'bg-white/10 hover:bg-white/15 text-white border border-white/20'
                }`}
              >
                {isListening ? (
                  <><MicOff className="w-4 h-4" /> Stop</>
                ) : (
                  <><Mic className="w-4 h-4" /> {isSpeaking ? 'Wait...' : 'Speak'}</>
                )}
              </button>
              <button
                onClick={handleClose}
                className="py-3 px-4 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-500/20 rounded-xl transition-colors text-sm font-medium"
              >
                End
              </button>
            </div>
          )}
          <p className="text-center text-gray-600 text-xs mt-2">
            Uses OpenAI TTS + browser mic — no phone required
          </p>
        </div>
      </div>
    </div>
  );
}
