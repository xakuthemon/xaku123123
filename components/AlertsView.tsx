import React, { useState } from 'react';
import { EnrichedTransaction } from '../types';
import { ShieldAlert, CheckCircle, Search, Filter, AlertTriangle, Radio } from 'lucide-react';
import { NotificationToast } from './NotificationToast';

interface AlertsViewProps {
  transactions: EnrichedTransaction[];
  onSelect: (t: EnrichedTransaction) => void;
  latestAlert: EnrichedTransaction | null;
  onClearAlert: () => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ transactions, onSelect, latestAlert, onClearAlert }) => {
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'>('ALL');

  const alerts = transactions.filter(t => t.isSuspicious).filter(t => {
    if (filter === 'ALL') return true;
    return t.riskLevel === filter;
  });

  return (
    <div className="p-8 h-full flex flex-col animate-in fade-in duration-500 relative overflow-hidden">
      
      <NotificationToast 
        transaction={latestAlert} 
        onClose={onClearAlert} 
        onView={(t) => {
            onSelect(t);
            onClearAlert();
        }}
      />

      <div className="flex justify-between items-center mb-8">
        <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <AlertTriangle className="text-red-500" />
                Security Alerts
            </h2>
            <div className="flex items-center gap-2 mt-1">
                <p className="text-slate-400 text-sm">Real-time threat monitoring</p>
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-[10px] text-red-400 font-mono uppercase tracking-wider">Live Feed Active</span>
            </div>
        </div>
        
        <div className="flex gap-2 bg-surface p-1 rounded-xl border border-surfaceHighlight">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((f) => (
                <button
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filter === f 
                        ? 'bg-surfaceHighlight text-white shadow-sm' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                >
                    {f}
                </button>
            ))}
        </div>
      </div>

      <div className="bg-surface border border-surfaceHighlight rounded-2xl overflow-hidden flex-1 flex flex-col shadow-xl">
        <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-background sticky top-0 backdrop-blur-sm z-10 border-b border-surfaceHighlight">
                <tr>
                <th className="p-4 font-medium text-slate-300">Risk Level</th>
                <th className="p-4 font-medium text-slate-300">Transaction ID</th>
                <th className="p-4 font-medium text-slate-300">Trigger Reason</th>
                <th className="p-4 font-medium text-slate-300">Amount</th>
                <th className="p-4 font-medium text-slate-300">Time</th>
                <th className="p-4 font-medium text-slate-300">Action</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-surfaceHighlight">
                {alerts.map((txn) => (
                <tr 
                    key={txn.id} 
                    onClick={() => onSelect(txn)}
                    className={`cursor-pointer transition-colors ${
                        latestAlert?.id === txn.id ? 'bg-red-500/20 animate-pulse' : 'hover:bg-surfaceHighlight bg-red-900/5'
                    }`}
                >
                    <td className="p-4">
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        txn.riskLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                        txn.riskLevel === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-yellow-500/20 text-yellow-400'
                    }`}>
                        {txn.riskLevel}
                    </span>
                    </td>
                    <td className="p-4 font-mono text-white">{txn.id}</td>
                    <td className="p-4 text-slate-300 max-w-xs truncate" title={txn.ruleTriggered}>
                        {txn.ruleTriggered}
                    </td>
                    <td className="p-4 text-white font-mono">${txn.amount.toLocaleString()}</td>
                    <td className="p-4 text-xs">{new Date(txn.timestamp).toLocaleString()}</td>
                    <td className="p-4">
                        <button className="bg-surfaceHighlight hover:bg-slate-700 text-white px-3 py-1 rounded-lg text-xs flex items-center gap-2 transition-colors border border-slate-600">
                            Review
                        </button>
                    </td>
                </tr>
                ))}
                {alerts.length === 0 && (
                    <tr>
                        <td colSpan={6} className="p-12 text-center">
                            <div className="flex flex-col items-center justify-center text-slate-500">
                                <CheckCircle size={48} className="mb-4 text-green-500/50" />
                                <p className="text-lg font-medium text-slate-300">All Clear</p>
                                <p>No alerts matching current filters.</p>
                            </div>
                        </td>
                    </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};