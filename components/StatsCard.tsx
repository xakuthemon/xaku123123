import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, trend, trendUp }) => {
  // Parsing trend string to see if it's positive or negative for color
  const isPositive = trendUp !== undefined ? trendUp : (trend?.includes('+') || trend === 'High');
  const isNegative = trendUp !== undefined ? !trendUp : (trend?.includes('-'));

  return (
    <div className="bg-surface rounded-2xl p-4 flex items-center justify-between border border-surfaceHighlight hover:border-slate-600 transition-colors cursor-pointer group">
      <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-surfaceHighlight flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
            {icon}
          </div>
          <div>
              <p className="text-white font-semibold text-sm">{title}</p>
              <p className="text-slate-400 text-xs">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
          </div>
      </div>
      
      {trend && (
          <div className="text-right">
               <p className={`font-medium text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {trend}
               </p>
               <p className="text-[10px] text-slate-500">24h chg</p>
          </div>
      )}
    </div>
  );
};