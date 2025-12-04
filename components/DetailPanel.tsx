import React, { useState, useEffect, useMemo } from 'react';
import { EnrichedTransaction } from '../types';
import { X, Bot, MapPin, Clock, CreditCard, Activity, FileText, ShieldAlert, CheckCircle, TrendingUp } from 'lucide-react';
import { getFraudExplanation } from '../services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, ComposedChart, Line, ReferenceLine, CartesianGrid } from 'recharts';

interface DetailPanelProps {
  transaction: EnrichedTransaction | null;
  allTransactions: EnrichedTransaction[];
  onClose: () => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-surface border border-slate-700 p-3 rounded-lg shadow-xl text-xs z-50">
          <p className="text-slate-400 mb-2 border-b border-slate-700 pb-1">{data.fullTime}</p>
          <div className="flex justify-between gap-4 mb-1">
            <span className="text-slate-500">Amount:</span>
            <span className="font-mono font-bold text-white">${data.amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-4 mb-2">
            <span className="text-slate-500">Trend (Avg):</span>
            <span className="font-mono text-primary-400">${Math.round(data.movingAvg).toLocaleString()}</span>
          </div>
          <div className={`flex items-center gap-1.5 font-medium ${data.isSuspicious ? 'text-red-400' : 'text-green-400'}`}>
             {data.isSuspicious ? <ShieldAlert size={14}/> : <CheckCircle size={14}/>}
             {data.isSuspicious ? 'Suspicious Activity' : 'Verified Safe'}
          </div>
          {data.isCurrent && (
            <div className="mt-2 text-center bg-surfaceHighlight text-slate-300 py-1 rounded">
                Currently Selected
            </div>
          )}
        </div>
      );
    }
    return null;
};

export const DetailPanel: React.FC<DetailPanelProps> = ({ transaction, allTransactions, onClose }) => {
  const [explanation, setExplanation] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (transaction) {
      if (transaction.aiExplanation) {
        setExplanation(transaction.aiExplanation);
      } else if (transaction.isSuspicious) {
        setLoading(true);
        getFraudExplanation(transaction).then((res) => {
            setExplanation(res);
            setLoading(false);
            transaction.aiExplanation = res; 
        });
      } else {
        setExplanation("This transaction appears normal based on current heuristic rules.");
      }
    } else {
        setExplanation('');
    }
  }, [transaction]);

  const clientHistory = useMemo(() => {
    if (!transaction) return [];
    
    const clientTxns = allTransactions
      .filter(t => t.clientId === transaction.clientId)
      .sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return clientTxns.slice(-30).map((t, index, arr) => {
        const windowStart = Math.max(0, index - 4);
        const windowSlice = arr.slice(windowStart, index + 1);
        const avg = windowSlice.reduce((sum, item) => sum + item.amount, 0) / windowSlice.length;

        return {
            id: t.id,
            time: new Date(t.timestamp).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}),
            fullTime: new Date(t.timestamp).toLocaleString(),
            amount: t.amount,
            isSuspicious: t.isSuspicious,
            isCurrent: t.id === transaction.id,
            movingAvg: avg,
            riskColor: t.isSuspicious ? '#ef4444' : '#22c55e'
        };
    });
  }, [transaction, allTransactions]);

  if (!transaction) return null;

  const data = [
    { name: 'Fraud Score', value: transaction.fraudScore * 100 },
    { name: 'Trust Score', value: 100 - (transaction.fraudScore * 100) },
  ];
  const COLORS = [transaction.isSuspicious ? '#ef4444' : '#22c55e', '#1e2433'];

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-background border-l border-surfaceHighlight shadow-2xl p-6 transform transition-transform duration-300 z-50 overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="text-primary-500" />
            Transaction Analysis
        </h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white bg-surfaceHighlight p-2 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Score Visualization */}
      <div className="h-48 mb-6 relative">
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip 
                    contentStyle={{ backgroundColor: '#151a25', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                />
            </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
            <span className="text-3xl font-bold text-white">{Math.round(transaction.fraudScore * 100)}</span>
            <span className="text-xs text-slate-400 uppercase tracking-widest">Risk Score</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* AI Explanation Box */}
        <div className="bg-surface rounded-2xl p-5 border border-surfaceHighlight relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5">
                 <Bot size={100} />
             </div>
            <h3 className="text-sm font-semibold text-primary-400 mb-2 flex items-center gap-2">
                <Bot size={16} /> Gemini Explainable AI
            </h3>
            <div className="text-slate-300 text-sm leading-relaxed relative z-10">
                {loading ? (
                    <div className="animate-pulse space-y-2">
                        <div className="h-2 bg-slate-700 rounded w-3/4"></div>
                        <div className="h-2 bg-slate-700 rounded w-full"></div>
                        <div className="h-2 bg-slate-700 rounded w-5/6"></div>
                    </div>
                ) : (
                    explanation
                )}
            </div>
        </div>

        {/* Financial Chart */}
        <div className="bg-surface rounded-2xl p-5 border border-surfaceHighlight">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-300">Client Volatility & Trend</h3>
                <div className="flex gap-3 text-[10px]">
                     <div className="flex items-center gap-1 text-slate-400"><span className="w-2 h-0.5 bg-primary-400"></span> 5-SMA</div>
                     <div className="flex items-center gap-1 text-slate-400"><span className="w-2 h-2 rounded-sm bg-red-500"></span> Suspicious</div>
                </div>
            </div>
            
            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={clientHistory} margin={{top: 5, right: 5, bottom: 5, left: -20}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" vertical={false} />
                        <XAxis dataKey="time" hide />
                        <YAxis stroke="#64748b" fontSize={10} tickFormatter={(val) => `$${val}`} />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent', stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '5 5'}} />
                        
                        <Bar dataKey="amount" barSize={8} radius={[2, 2, 0, 0]}>
                            {clientHistory.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.riskColor}
                                    fillOpacity={entry.isCurrent ? 1 : 0.4}
                                    stroke={entry.isCurrent ? '#fff' : 'none'}
                                    strokeWidth={2}
                                />
                            ))}
                        </Bar>

                        <Line 
                            type="monotone" 
                            dataKey="movingAvg" 
                            stroke="#8b5cf6" 
                            strokeWidth={2} 
                            dot={false}
                            activeDot={{r: 4, fill: '#8b5cf6'}}
                        />

                         <ReferenceLine x={clientHistory.find(h => h.isCurrent)?.time} stroke="#fff" strokeDasharray="3 3" />

                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-surfaceHighlight">
                <div className="p-2 bg-surfaceHighlight rounded-full text-slate-400"><CreditCard size={18} /></div>
                <div>
                    <p className="text-xs text-slate-500">Amount</p>
                    <p className="font-mono text-white font-medium">${transaction.amount.toLocaleString()} {transaction.currency}</p>
                </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-surfaceHighlight">
                <div className="p-2 bg-surfaceHighlight rounded-full text-slate-400"><MapPin size={18} /></div>
                <div>
                    <p className="text-xs text-slate-500">Location</p>
                    <p className="text-white font-medium">{transaction.location}</p>
                </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-surfaceHighlight">
                <div className="p-2 bg-surfaceHighlight rounded-full text-slate-400"><Clock size={18} /></div>
                <div>
                    <p className="text-xs text-slate-500">Time</p>
                    <p className="text-white font-medium">{new Date(transaction.timestamp).toLocaleTimeString()}</p>
                </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-surfaceHighlight">
                <div className="p-2 bg-surfaceHighlight rounded-full text-slate-400"><FileText size={18} /></div>
                <div>
                    <p className="text-xs text-slate-500">Triggers</p>
                    <p className="text-white font-medium text-xs">{transaction.ruleTriggered || 'No explicit rules triggered'}</p>
                </div>
            </div>
        </div>
      </div>

      <div className="mt-8 flex gap-3 pb-8">
        <button className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-medium transition-colors border border-red-500/50 shadow-lg shadow-red-900/20">
            Block Transaction
        </button>
        <button className="flex-1 bg-surfaceHighlight hover:bg-slate-700 text-white py-3 rounded-xl font-medium transition-colors border border-slate-600">
            Mark Safe
        </button>
      </div>
    </div>
  );
};