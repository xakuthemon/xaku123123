import React, { useMemo, useRef, useState, useEffect } from 'react';
import { EnrichedTransaction } from '../types';
import { ShieldAlert, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface TransactionListProps {
  transactions: EnrichedTransaction[];
  onSelect: (t: EnrichedTransaction) => void;
  externalSearch?: string;
}

// Mini Sparkline Component
const Sparkline = ({ data, color }: { data: number[], color: string }) => {
    const chartData = data.map((val, i) => ({ i, val }));
    return (
        <div className="h-8 w-24">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={color} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <Area 
                        type="monotone" 
                        dataKey="val" 
                        stroke={color} 
                        strokeWidth={2} 
                        fill={`url(#grad-${color})`} 
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, onSelect, externalSearch = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(800);

  const filteredTransactions = useMemo(() => {
    if (!externalSearch) return transactions;
    const lower = externalSearch.toLowerCase();
    return transactions.filter(t => 
      t.clientId.toLowerCase().includes(lower) || 
      t.id.toLowerCase().includes(lower) ||
      t.category.toLowerCase().includes(lower)
    );
  }, [transactions, externalSearch]);

  // Virtualization constants
  const ROW_HEIGHT = 72; // Approximate height of a row including spacing
  const BUFFER = 5;

  useEffect(() => {
    if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
    }
    const handleResize = () => {
        if (containerRef.current) {
            setContainerHeight(containerRef.current.clientHeight);
        }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const totalCount = filteredTransactions.length;
  const totalHeight = totalCount * ROW_HEIGHT;

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER);
  const endIndex = Math.min(totalCount, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER);

  const visibleTransactions = filteredTransactions.slice(startIndex, endIndex);
  
  const topSpacerHeight = startIndex * ROW_HEIGHT;
  const bottomSpacerHeight = Math.max(0, totalHeight - (endIndex * ROW_HEIGHT));

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return (
    <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto pr-2 custom-scrollbar relative"
    >
      <table className="w-full text-left text-sm border-separate border-spacing-y-1">
        <thead className="sticky top-0 bg-surface z-10 text-slate-500 text-xs uppercase tracking-wider font-medium shadow-sm">
          <tr>
            <th className="py-3 px-4 bg-surface">Asset / Client</th>
            <th className="py-3 px-4 bg-surface">Amount</th>
            <th className="py-3 px-4 bg-surface">Risk Trend</th>
            <th className="py-3 px-4 bg-surface">Score</th>
            <th className="py-3 px-4 bg-surface text-right">Action</th>
          </tr>
        </thead>
        <tbody className="text-slate-300">
          {topSpacerHeight > 0 && (
            <tr>
                <td colSpan={5} style={{ height: topSpacerHeight, padding: 0, border: 'none' }} />
            </tr>
          )}
          
          {visibleTransactions.map((txn) => {
             // Fake sparkline data based on random variance around the amount (memoized conceptually by stable ID)
             // In production, this would come from history. Here we deterministic-randomize it based on ID char codes.
             const seed = txn.id.charCodeAt(txn.id.length - 1);
             const sparkData = Array.from({length: 10}, (_, i) => txn.amount * (0.8 + (Math.sin(seed + i) * 0.4)));
             
             const isHighRisk = txn.fraudScore > 0.5;

             return (
              <tr 
                key={txn.id} 
                className="group hover:bg-surfaceHighlight transition-colors rounded-xl cursor-pointer"
                onClick={() => onSelect(txn)}
                style={{ height: ROW_HEIGHT }}
              >
                <td className="py-3 px-4 rounded-l-xl border-y border-l border-transparent group-hover:border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        isHighRisk ? 'bg-red-500/10 text-red-500' : 'bg-primary-500/10 text-primary-500'
                    }`}>
                        {isHighRisk ? <ShieldAlert size={20} /> : <CheckCircle size={20} />}
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-white truncate">{txn.category}</p>
                        <p className="text-xs text-slate-500 font-mono truncate">{txn.clientId}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 border-y border-transparent group-hover:border-slate-700/50 whitespace-nowrap">
                    <p className="text-white font-medium">${txn.amount.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">{new Date(txn.timestamp).toLocaleTimeString()}</p>
                </td>
                <td className="py-3 px-4 border-y border-transparent group-hover:border-slate-700/50">
                    <Sparkline data={sparkData} color={isHighRisk ? '#ef4444' : '#22c55e'} />
                </td>
                <td className="py-3 px-4 border-y border-transparent group-hover:border-slate-700/50">
                    <div className="flex flex-col items-start">
                        <span className={`text-sm font-bold ${isHighRisk ? 'text-red-400' : 'text-green-400'}`}>
                            {(txn.fraudScore * 100).toFixed(0)}%
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                             {isHighRisk ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                             {isHighRisk ? 'High Risk' : 'Low Risk'}
                        </div>
                    </div>
                </td>
                <td className="py-3 px-4 rounded-r-xl border-y border-r border-transparent group-hover:border-slate-700/50 text-right">
                     <button className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors">
                        Analyze
                     </button>
                </td>
              </tr>
            );
          })}
          
          {bottomSpacerHeight > 0 && (
             <tr>
                <td colSpan={5} style={{ height: bottomSpacerHeight, padding: 0, border: 'none' }} />
             </tr>
          )}

          {filteredTransactions.length === 0 && (
             <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500">
                    No transactions found.
                </td>
             </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};