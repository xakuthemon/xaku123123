import React, { useEffect } from 'react';
import { ShieldAlert, X, ArrowRight, Bell } from 'lucide-react';
import { EnrichedTransaction } from '../types';

interface NotificationToastProps {
  transaction: EnrichedTransaction | null;
  onClose: () => void;
  onView: (t: EnrichedTransaction) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ transaction, onClose, onView }) => {
  useEffect(() => {
    if (transaction) {
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [transaction, onClose]);

  if (!transaction) return null;

  return (
    <div className="fixed top-20 right-8 z-50 animate-in slide-in-from-right-full duration-300">
      <div className="bg-slate-900 border-l-4 border-red-500 rounded-lg shadow-2xl p-4 w-80 flex flex-col relative border-y border-r border-slate-700">
        <button 
            onClick={onClose}
            className="absolute top-2 right-2 text-slate-500 hover:text-white transition-colors"
        >
            <X size={16} />
        </button>

        <div className="flex items-start gap-3">
            <div className="bg-red-500/10 p-2 rounded-full text-red-500 animate-pulse">
                <Bell size={20} />
            </div>
            <div>
                <h4 className="font-bold text-white text-sm">New Fraud Alert Detected</h4>
                <p className="text-xs text-slate-400 mt-1">ID: <span className="font-mono text-slate-300">{transaction.id}</span></p>
            </div>
        </div>

        <div className="mt-3 bg-slate-800/50 p-2 rounded border border-slate-700/50">
            <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Amount:</span>
                <span className="text-white font-mono font-bold">${transaction.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
                <span className="text-slate-500">Risk Score:</span>
                <span className="text-red-400 font-bold">{(transaction.fraudScore * 100).toFixed(0)}%</span>
            </div>
        </div>

        <button 
            onClick={() => onView(transaction)}
            className="mt-3 w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 rounded flex items-center justify-center gap-2 transition-colors"
        >
            Investigate Now <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};