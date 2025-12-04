import React, { useState } from 'react';
import { ShieldCheck, Loader2, Lock, Mail } from 'lucide-react';

interface LoginViewProps {
  onLogin: (email: string) => Promise<void>;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onLogin(email);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md bg-surface border border-surfaceHighlight rounded-3xl shadow-2xl p-8 relative z-10 backdrop-blur-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-br from-primary-600 to-indigo-600 p-3 rounded-2xl mb-4 shadow-lg shadow-primary-900/50">
            <ShieldCheck className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">FraudDetect 2.0</h1>
          <p className="text-slate-400 text-sm mt-2">Enterprise Fraud Prevention Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Work Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="text-slate-500" size={18} />
              </div>
              <input 
                type="email" 
                required
                className="w-full bg-background border border-surfaceHighlight text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all placeholder:text-slate-600"
                placeholder="analyst@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="text-slate-500" size={18} />
              </div>
              <input 
                type="password" 
                required
                className="w-full bg-background border border-surfaceHighlight text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all placeholder:text-slate-600"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-900/20"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In to Dashboard'}
          </button>
        </form>

        <div className="mt-8 text-center">
            <p className="text-xs text-slate-500">Restricted Access. Authorized Personnel Only.</p>
        </div>
      </div>
    </div>
  );
};