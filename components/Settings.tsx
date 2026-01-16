
import React from 'react';
import { VOICE_OPTIONS, LANGUAGES, VoiceName } from '../types';

interface SettingsProps {
  currentVoice: VoiceName;
  setVoice: (voice: VoiceName) => void;
  targetLanguage: string;
  setTargetLanguage: (lang: string) => void;
  showSubtitles: boolean;
  setShowSubtitles: (show: boolean) => void;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({
  currentVoice,
  setVoice,
  targetLanguage,
  setTargetLanguage,
  showSubtitles,
  setShowSubtitles,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="fas fa-cog text-blue-400"></i>
            Settings
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Voice Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">AI Voice Profile</label>
            <div className="grid grid-cols-1 gap-2">
              {VOICE_OPTIONS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVoice(v.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    currentVoice === v.id
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg'
                      : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${v.gender === 'male' ? 'bg-indigo-500' : 'bg-pink-500'}`}>
                      <i className={`fas ${v.gender === 'male' ? 'fa-mars' : 'fa-venus'} text-xs text-white`}></i>
                    </div>
                    <span className="font-medium">{v.name}</span>
                  </div>
                  {currentVoice === v.id && <i className="fas fa-check-circle text-blue-400"></i>}
                </button>
              ))}
            </div>
          </div>

          {/* Language Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Translation Target</label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subtitles Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Live Captions</label>
            <button
              onClick={() => setShowSubtitles(!showSubtitles)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showSubtitles ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showSubtitles ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="p-6 bg-slate-800/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
