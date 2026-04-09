import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mic, MicOff, Volume2, Loader2, Phone, AlertCircle } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface VoiceTestModalProps {
  onClose: () => void;
  prompt?: string;
  modelProvider?: string;
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

export default function VoiceTestModal({ onClose, prompt, modelProvider }: VoiceTestModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [error, setError] = useState('');
  const [callStarted, setCallStarted] = useState(false);
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const finalTranscriptRef = useRef('');
  const messagesRef = useRef<Message[]>([]);

  messagesRef.current = messages;

  useEffect(() => {
    const SR: ISpeechRecognitionConstructor | undefined = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || !window.speechSynthesis) {
      setSupported(false);
      return;
    }
    synthRef.current = window.speechSynthesis;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, isSpeaking]);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!synthRef.current) { resolve(); return; }
      synthRef.current.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.05;
      utter.pitch = 1;
      utter.volume = 1;
      const voices = synthRef.current.getVoices();
      const preferred =
        voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
        voices.find(v => v.lang.startsWith('en')) ||
        voices[0];
      if (preferred) utter.voice = preferred;
      utter.onstart = () => setIsSpeaking(true);
      utter.onend = () => { setIsSpeaking(false); resolve(); };
      utter.onerror = () => { setIsSpeaking(false); resolve(); };
      synthRef.current.speak(utter);
    });
  }, []);

  const sendToAI = useCallback(async (userMessage: string, history: Message[]): Promise<string> => {
    setIsThinking(true);
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
          systemPrompt: prompt || undefined,
          modelProvider: modelProvider || 'openai',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI error');
      return data.reply as string;
    } finally {
      setIsThinking(false);
    }
  }, [prompt, modelProvider]);

  const handleFinalSpeech = useCallback(async (spoken: string) => {
    if (!spoken.trim()) return;
    const userMsg: Message = { role: 'user', content: spoken };
    const currentHistory = messagesRef.current;
    setMessages(prev => [...prev, userMsg]);
    setLiveTranscript('');
    try {
      const reply = await sendToAI(spoken, currentHistory);
      const assistantMsg: Message = { role: 'assistant', content: reply };
      setMessages(prev => [...prev, assistantMsg]);
      await speak(reply);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [sendToAI, speak]);

  const startListening = useCallback(() => {
    const SR: ISpeechRecognitionConstructor | undefined = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    finalTranscriptRef.current = '';

    recognition.onstart = () => {
      setIsListening(true);
      setLiveTranscript('');
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
      handleFinalSpeech(spoken);
    };

    recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
      if (event.error !== 'no-speech') setError(`Mic error: ${event.error}`);
      setIsListening(false);
    };

    recognition.start();
  }, [handleFinalSpeech]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const startCall = useCallback(async () => {
    setCallStarted(true);
    setError('');
    const greeting = prompt
      ? 'Hello! I am your AI assistant. How can I help you today?'
      : 'Namaste! Thank you for calling Rapid X High School. How may I assist you today?';
    setMessages([{ role: 'assistant', content: greeting }]);
    await speak(greeting);
  }, [speak, prompt]);

  const handleMicToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const handleClose = useCallback(() => {
    recognitionRef.current?.stop();
    synthRef.current?.cancel();
    onClose();
  }, [onClose]);

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
            Uses browser mic + Web Speech API — no phone required
          </p>
        </div>
      </div>
    </div>
  );
}
