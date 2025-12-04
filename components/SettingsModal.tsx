import React, { useState, useEffect } from 'react';
import { X, Key, CheckCircle, Save } from 'lucide-react';
import { User } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, user }) => {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem('GEMINI_API_KEY');
    if (storedKey) setApiKey(storedKey);
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('GEMINI_API_KEY', apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div className="bg-surface border border-surfaceHighlight w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-surfaceHighlight flex justify-between items-center bg-surface">
          <h2 className="text-xl font-bold text-white">Platform Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 hover:bg-surfaceHighlight rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
             <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">User Profile</h3>
             <div className="flex items-center gap-4 p-4 bg-background rounded-2xl border border-surfaceHighlight">
                <img src={user?.avatar} alt={user?.name} className="w-12 h-12 rounded-full border border-slate-700" />
                <div>
                    <p className="text-white font-bold">{user?.name}</p>
                    <p className="text-sm text-slate-400">{user?.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-surfaceHighlight rounded text-[10px] text-primary-400 font-mono">{user?.role}</span>
                </div>
             </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Key size={16} /> API Configuration
             </h3>
             <div className="bg-background p-4 rounded-2xl border border-surfaceHighlight">
                <label className="block text-xs text-slate-400 mb-2">Gemini API Key (Required for Reports & Explanations)</label>
                <div className="flex gap-2">
                    <input 
                        type="password" 
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="flex-1 bg-surface border border-surfaceHighlight text-white rounded-xl px-3 py-2 text-sm focus:border-primary-500 focus:outline-none placeholder:text-slate-600"
                    />
                    <button 
                        onClick={handleSave}
                        className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
                            saved ? 'bg-green-600 text-white' : 'bg-primary-600 hover:bg-primary-500 text-white'
                        }`}
                    >
                        {saved ? <CheckCircle size={16} /> : <Save size={16} />}
                        {saved ? 'Saved' : 'Save'}
                    </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                    Your key is stored locally in your browser and never sent to our servers.
                </p>
             </div>
          </div>
        </div>

        <div className="p-6 border-t border-surfaceHighlight bg-surface flex justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-surfaceHighlight hover:bg-slate-700 text-slate-200 rounded-xl text-sm transition-colors border border-slate-700">
                Done
            </button>
        </div>
      </div>
    </div>
  );
};