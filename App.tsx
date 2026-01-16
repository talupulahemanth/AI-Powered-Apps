
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
// Added LANGUAGES to imports from ./types
import { VoiceName, VOICE_OPTIONS, TranscriptionEntry, LANGUAGES } from './types';
import VoiceVisualizer from './components/VoiceVisualizer';
import Settings from './components/Settings';
import { encode, decode, decodeAudioData } from './utils/audioHelpers';

const App: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentVoice, setCurrentVoice] = useState<VoiceName>('Zephyr');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [volume, setVolume] = useState(0);
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState<{ user: string; model: string }>({ user: '', model: '' });

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const inputStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // System Instruction based on translation needs
  const getSystemInstruction = useCallback(() => {
    const langName = VOICE_OPTIONS.find(v => v.id === currentVoice)?.name || 'Gemini';
    return `You are Gemini, a helpful voice assistant.
    You respond naturally and concisely. 
    Current user preference: ${targetLanguage !== 'en' ? `TRANSLATE all responses to ${targetLanguage}.` : 'Respond in English.'}
    Your persona is ${currentVoice}.
    Try to respond with personality.
    Wait for the user to say "Hey Gemini" or just start talking if continuous mode is on. 
    Actually, just treat all voice input as a conversation.`;
  }, [currentVoice, targetLanguage]);

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (inputStreamRef.current) {
      inputStreamRef.current.getTracks().forEach(t => t.stop());
      inputStreamRef.current = null;
    }
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    setIsActive(false);
    setIsModelSpeaking(false);
  };

  const startSession = async () => {
    try {
      // Correctly initialize GoogleGenAI with process.env.API_KEY directly as per guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      inputStreamRef.current = stream;

      const analyser = inputCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            console.log('Gemini Live session opened');
            setIsActive(true);
            
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Calculate volume for visualizer
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              setVolume(Math.min(1, rms * 5));

              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(analyser);
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setIsModelSpeaking(true);
              const outCtx = outputAudioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              
              const audioBuffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outCtx.destination);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) {
                  setIsModelSpeaking(false);
                }
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            // Handle Transcriptions
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setCurrentTranscript(prev => ({ ...prev, user: prev.user + text }));
            }
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              setCurrentTranscript(prev => ({ ...prev, model: prev.model + text }));
            }

            if (message.serverContent?.turnComplete) {
              setTranscriptions(prev => [
                ...prev,
                { id: Date.now().toString() + '-u', role: 'user', text: currentTranscript.user, timestamp: Date.now() },
                { id: Date.now().toString() + '-m', role: 'model', text: currentTranscript.model, timestamp: Date.now() }
              ]);
              setCurrentTranscript({ user: '', model: '' });
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsModelSpeaking(false);
            }
          },
          onerror: (err) => {
            console.error('Session error:', err);
            stopSession();
          },
          onclose: () => {
            console.log('Session closed');
            stopSession();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: currentVoice } }
          },
          systemInstruction: getSystemInstruction(),
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error('Failed to start session:', err);
    }
  };

  const handleToggle = () => {
    if (isActive) {
      stopSession();
    } else {
      startSession();
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full"></div>
      </div>

      {/* Header */}
      <header className="px-6 py-6 flex justify-between items-center bg-transparent z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <i className="fas fa-robot text-white"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Gemini Live</h1>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}></span>
              {isActive ? 'Live Continuous' : 'Ready'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 rounded-full bg-slate-800/50 hover:bg-slate-700 transition-colors flex items-center justify-center border border-slate-700"
          >
            <i className="fas fa-sliders text-slate-300"></i>
          </button>
        </div>
      </header>

      {/* Main Experience */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
        <VoiceVisualizer isActive={isActive} isModelSpeaking={isModelSpeaking} volume={isModelSpeaking ? 0.8 : volume} />
        
        <div className="mt-12 text-center space-y-4 max-w-lg">
          <h2 className="text-2xl font-medium text-slate-200">
            {isActive ? "I'm listening..." : 'Say "Hey Gemini" or tap to start'}
          </h2>
          <p className="text-slate-400 text-sm">
            Experience real-time voice intelligence with live translation and natural conversation.
          </p>
        </div>

        {/* Subtitles Overlay */}
        {showSubtitles && (isActive || currentTranscript.user || currentTranscript.model) && (
          <div className="absolute bottom-32 left-0 w-full px-6 transition-all duration-300 pointer-events-none">
            <div className="max-w-3xl mx-auto space-y-4">
              {currentTranscript.user && (
                <div className="flex justify-end">
                  <div className="bg-blue-600/20 backdrop-blur-md border border-blue-500/30 text-blue-100 px-4 py-2 rounded-2xl rounded-tr-none text-lg">
                    {currentTranscript.user}
                  </div>
                </div>
              )}
              {currentTranscript.model && (
                <div className="flex justify-start">
                  <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 text-white px-4 py-2 rounded-2xl rounded-tl-none text-lg shadow-xl">
                    <span className="text-purple-400 font-bold mr-2">{currentVoice}:</span>
                    {currentTranscript.model}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer Controls */}
      <footer className="p-8 flex flex-col items-center gap-6 bg-transparent z-10">
        <div className="flex items-center gap-6">
          <button 
            className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-2xl transition-all duration-500 transform active:scale-95 ${isActive ? 'bg-red-500 hover:bg-red-400 rotate-0' : 'bg-blue-600 hover:bg-blue-500 rotate-0'}`}
            onClick={handleToggle}
          >
            <i className={`fas ${isActive ? 'fa-stop' : 'fa-microphone'}`}></i>
          </button>
        </div>

        <div className="flex items-center gap-8 text-slate-500 text-sm font-medium">
          <div className="flex items-center gap-2">
            <i className="fas fa-language"></i>
            <span>{LANGUAGES.find(l => l.code === targetLanguage)?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <i className="fas fa-waveform-lines"></i>
            <span>{currentVoice}</span>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      {showSettings && (
        <Settings 
          currentVoice={currentVoice}
          setVoice={setCurrentVoice}
          targetLanguage={targetLanguage}
          setTargetLanguage={setTargetLanguage}
          showSubtitles={showSubtitles}
          setShowSubtitles={setShowSubtitles}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

export default App;
