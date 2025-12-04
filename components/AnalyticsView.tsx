import React, { useMemo } from 'react';
import { EnrichedTransaction } from '../types';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MapPin, Tag, TrendingUp } from 'lucide-react';

interface AnalyticsViewProps {
  transactions: EnrichedTransaction[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ transactions }) => {
  
  // 1. Fraud by Category
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.filter(t => t.isSuspicious).forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }))
             .sort((a, b) => b.value - a.value).slice(0, 5);
  }, [transactions]);

  // 2. Fraud by Location
  const locationData = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.filter(t => t.isSuspicious).forEach(t => {
      const loc = t.location.split(',')[0]; // City only
      counts[loc] = (counts[loc] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, count: counts[key] }))
             .sort((a, b) => b.count - a.count).slice(0, 7);
  }, [transactions]);

  // 3. Hourly Distribution (Fraud vs Normal)
  const hourlyData = useMemo(() => {
    const hours = Array(24).fill(0).map((_, i) => ({ name: `${i}:00`, fraud: 0, normal: 0 }));
    transactions.forEach(t => {
      const h = new Date(t.timestamp).getHours();
      if (t.isSuspicious) hours[h].fraud += t.amount;
      else hours[h].normal += t.amount;
    });
    return hours;
  }, [transactions]);

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#8b5cf6', '#6366f1'];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 overflow-y-auto h-full custom-scrollbar">
      <h2 className="text-2xl font-bold text-white mb-6">Fraud Analytics Overview</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Category Chart */}
        <div className="bg-surface border border-surfaceHighlight rounded-2xl p-6 shadow-xl">
          <h3 className="font-semibold text-white mb-6 flex items-center gap-2">
            <Tag size={18} className="text-primary-500" />
            Top Fraud Categories
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#151a25', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Location Chart */}
        <div className="bg-surface border border-surfaceHighlight rounded-2xl p-6 shadow-xl">
          <h3 className="font-semibold text-white mb-6 flex items-center gap-2">
            <MapPin size={18} className="text-primary-500" />
            High Risk Locations
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locationData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} />
                <Tooltip cursor={{fill: '#1e2433'}} contentStyle={{ backgroundColor: '#151a25', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Volume Trend */}
        <div className="bg-surface border border-surfaceHighlight rounded-2xl p-6 lg:col-span-2 shadow-xl">
          <h3 className="font-semibold text-white mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary-500" />
            Transaction Volume (24h Distribution)
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip cursor={{fill: '#1e2433'}} contentStyle={{ backgroundColor: '#151a25', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="normal" stackId="a" fill="#8b5cf6" name="Legitimate Volume" radius={[0,0,0,0]} />
                <Bar dataKey="fraud" stackId="a" fill="#ef4444" name="Fraud Volume" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};