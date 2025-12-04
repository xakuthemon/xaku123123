import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
    LayoutDashboard, 
    UploadCloud, 
    Play, 
    Pause, 
    Download, 
    ShieldCheck, 
    AlertTriangle, 
    Activity,
    FileCode,
    Loader2,
    Settings,
    LogOut,
    Search,
    Bell,
    Grid,
    ChevronDown,
    Zap
} from 'lucide-react';
import { EnrichedTransaction, DashboardStats, BatchAnalysisResult, Transaction, TransactionType, User } from './types';
import { MOCK_TRANSACTIONS } from './constants';
import { analyzeTransaction, generateRandomTransaction, processBatchWithFeatures, runStage3Analysis } from './services/fraudEngine';
import { generateBatchReport } from './services/geminiService';
import { StatsCard } from './components/StatsCard';
import { TransactionList } from './components/TransactionList';
import { DetailPanel } from './components/DetailPanel';
import { AnalysisModal } from './components/AnalysisModal';
import { AnalyticsView } from './components/AnalyticsView';
import { AlertsView } from './components/AlertsView';
import { LoginView } from './components/LoginView';
import { SettingsModal } from './components/SettingsModal';
import { login, logout, getCurrentUser, isAuthenticated } from './services/authService';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function App() {
  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // App Data State
  const [transactions, setTransactions] = useState<EnrichedTransaction[]>([]);
  const transactionsRef = useRef<EnrichedTransaction[]>([]); 

  const [selectedTransaction, setSelectedTransaction] = useState<EnrichedTransaction | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'analytics' | 'alerts'>('dashboard');
  const [latestAlert, setLatestAlert] = useState<EnrichedTransaction | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  
  // Batch Analysis State
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<BatchAnalysisResult | null>(null);
  const [analysisReport, setAnalysisReport] = useState('');
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthenticated()) {
        setCurrentUser(getCurrentUser());
        setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = async (email: string) => {
    const user = await login(email);
    setCurrentUser(user);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  useEffect(() => {
    const processed = processBatchWithFeatures(MOCK_TRANSACTIONS);
    setTransactions(processed);
  }, []);

  useEffect(() => {
    let interval: any;
    if (isLive) {
      interval = setInterval(() => {
        const newTxn = generateRandomTransaction();
        const currentHistory = transactionsRef.current;
        const enriched = analyzeTransaction(newTxn, currentHistory); 
        
        if (enriched.isSuspicious) {
            setLatestAlert(enriched);
        }

        setTransactions(prev => {
            // Buffer increased to 10,000 thanks to virtualization
            const updated = [enriched, ...prev];
            return updated.slice(0, 10000); 
        }); 
      }, 100); // 100ms interval for rapid simulation
    }
    return () => clearInterval(interval);
  }, [isLive]);

  const stats: DashboardStats = useMemo(() => {
    const total = transactions.length;
    const flagged = transactions.filter(t => t.isSuspicious).length;
    const volume = transactions.reduce((acc, t) => acc + t.amount, 0);
    const blocked = transactions.filter(t => t.isSuspicious).reduce((acc, t) => acc + t.amount, 0);
    
    return {
        totalTransactions: total,
        flaggedTransactions: flagged,
        totalVolume: volume,
        blockedVolume: blocked,
        fraudRate: total > 0 ? (flagged / total) * 100 : 0
    };
  }, [transactions]);

  const chartData = useMemo(() => {
    return [...transactions].reverse().map(t => ({
        time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'}),
        amount: t.amount,
        score: t.fraudScore * 100
    })).slice(-50); 
  }, [transactions]);

  const handleExport = () => {
      const csvContent = "data:text/csv;charset=utf-8," 
        + "transaction_id,fraud_score,is_suspicious,risk_level,explanation\n"
        + transactions.map(e => `${e.id},${e.fraudScore},${e.isSuspicious},${e.riskLevel},"${e.ruleTriggered}"`).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "fraud_report_2.0.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const parseCSV = (csvText: string): Transaction[] => {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    
    const idx = {
        step: headers.indexOf('step'),
        type: headers.indexOf('type'),
        amount: headers.indexOf('amount'),
        nameOrig: headers.indexOf('nameOrig'),
        nameDest: headers.indexOf('nameDest'),
        isFraud: headers.indexOf('isFraud')
    };

    if (idx.amount === -1 || idx.type === -1) {
        console.warn("Standard schema not found, using heuristic parsing.");
    }

    // Process up to 10k rows for parsing
    const dataLines = lines.slice(1, 10001);
    const baseDate = new Date('2023-01-01T00:00:00Z');

    return dataLines.map((line, i) => {
        const row = line.split(',').map(v => v.trim());
        const step = parseInt(row[idx.step]) || 0;
        const timestamp = new Date(baseDate.getTime() + step * 60 * 60 * 1000).toISOString();

        return {
            id: `TX-${i}-${row[idx.step]}`,
            clientId: row[idx.nameOrig] || `Unknown-${i}`,
            amount: parseFloat(row[idx.amount]) || 0,
            currency: 'USD',
            timestamp: timestamp,
            category: row[idx.type] || 'PAYMENT',
            location: 'Unknown',
            type: TransactionType.PAYMENT,
            trueLabel: parseInt(row[idx.isFraud]) || 0
        };
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const startTime = Date.now();

    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target?.result as string;
        
        const rawTransactions = parseCSV(text);
        
        if (rawTransactions.length === 0) {
            alert("Could not parse transactions. Ensure CSV format matches the FraudDetect 2.0 schema.");
            setIsProcessing(false);
            return;
        }

        await new Promise(r => setTimeout(r, 500));
        
        const enrichedBatch = processBatchWithFeatures(rawTransactions);
        const stage3Results = runStage3Analysis(enrichedBatch);

        setTransactions(enrichedBatch);

        const batchStats = {
            totalTransactions: enrichedBatch.length,
            flaggedTransactions: enrichedBatch.filter(t => t.isSuspicious).length,
            totalVolume: enrichedBatch.reduce((acc, t) => acc + t.amount, 0),
            blockedVolume: enrichedBatch.filter(t => t.isSuspicious).reduce((acc, t) => acc + t.amount, 0),
            fraudRate: (enrichedBatch.filter(t => t.isSuspicious).length / enrichedBatch.length) * 100
        };

        const triggers = new Set<string>();
        enrichedBatch.forEach(t => {
            if (t.ruleTriggered) t.ruleTriggered.split(', ').forEach(tr => triggers.add(tr));
        });

        const report = await generateBatchReport(batchStats, Array.from(triggers));

        setAnalysisResult({
            fileName: file.name,
            totalProcessed: enrichedBatch.length,
            anomaliesFound: batchStats.flaggedTransactions,
            processingTime: Date.now() - startTime,
            reportContent: report,
            timestamp: new Date().toLocaleString(),
            stage3: stage3Results
        });
        setAnalysisReport(report);
        setIsProcessing(false);
        setShowAnalysisModal(true);
        
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const renderContent = () => {
    switch(currentView) {
      case 'analytics':
        return <AnalyticsView transactions={transactions} />;
      case 'alerts':
        return (
            <AlertsView 
                transactions={transactions} 
                onSelect={setSelectedTransaction} 
                latestAlert={latestAlert}
                onClearAlert={() => setLatestAlert(null)}
            />
        );
      case 'dashboard':
      default:
        return (
          <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
            
            {/* Middle Column: Main Feed */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden min-w-0">
                
                {/* Hero Section (Balance / Volume) */}
                <div className="bg-surface rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                    {/* Background Chart Effect */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none">
                         <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorAmountHero" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <Area 
                                    type="monotone" 
                                    dataKey="amount" 
                                    stroke="#8b5cf6" 
                                    strokeWidth={3}
                                    fill="url(#colorAmountHero)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                            <ShieldCheck size={18} />
                            <span className="text-sm font-medium">Safe Transaction Volume</span>
                        </div>
                        <h2 className="text-4xl font-bold text-white mb-2">
                            ${(stats.totalVolume - stats.blockedVolume).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </h2>
                         <div className="flex items-center gap-2">
                             <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                <Activity size={12} /> Live
                             </span>
                             <span className="text-slate-500 text-xs">processed in current session</span>
                         </div>
                    </div>
                </div>

                {/* Transaction List */}
                <div className="flex-1 bg-surface rounded-2xl overflow-hidden flex flex-col min-h-0">
                    <div className="p-5 border-b border-surfaceHighlight flex justify-between items-center">
                        <h3 className="font-semibold text-white">Live Transactions</h3>
                        <div className="flex gap-2">
                            <button className="px-3 py-1.5 text-xs font-medium bg-surfaceHighlight hover:bg-slate-700 text-slate-300 rounded-lg transition-colors">
                                All
                            </button>
                            <button className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors">
                                Watchlist
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden relative">
                         <TransactionList 
                            transactions={transactions} 
                            onSelect={setSelectedTransaction} 
                            externalSearch={globalSearch}
                        />
                    </div>
                </div>
            </div>

            {/* Right Column: Stats & Actions */}
            <div className="w-full lg:w-80 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
                
                {/* Promo / Action Card */}
                <div className="bg-gradient-to-br from-primary-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden group cursor-pointer" onClick={() => !isProcessing && fileInputRef.current?.click()}>
                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                         <FileCode size={80} />
                    </div>
                    <div className="relative z-10">
                         <h3 className="font-bold text-lg mb-1">AI Data Ingestion</h3>
                         <p className="text-indigo-100 text-xs mb-4">Upload synthetic datasets for deep deep learning analysis.</p>
                         <button className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                            {isProcessing ? <Loader2 className="animate-spin" size={16}/> : <UploadCloud size={16} />}
                            {isProcessing ? 'Processing...' : 'Upload CSV'}
                         </button>
                         <input 
                            type="file" 
                            accept=".csv" 
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </div>
                </div>

                {/* Top Movers (Risk Stats) */}
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-white font-semibold">Risk Stats</h3>
                        <span className="text-primary-500 text-xs font-medium cursor-pointer hover:underline">See All</span>
                    </div>

                    <StatsCard 
                        title="Fraud Rate"
                        value={`${stats.fraudRate.toFixed(2)}%`}
                        icon={<AlertTriangle size={20} />}
                        trend="+2.4%"
                        trendUp={false} // Red because fraud up is bad
                    />
                    <StatsCard 
                        title="Blocked Volume"
                        value={`$${(stats.blockedVolume / 1000).toFixed(1)}k`}
                        icon={<ShieldCheck size={20} />}
                        trend="-1.2%"
                        trendUp={true}
                    />
                     <StatsCard 
                        title="Suspicious Txns"
                        value={stats.flaggedTransactions}
                        icon={<Zap size={20} />}
                        trend="High"
                    />
                </div>

                {/* Mini Stories / News */}
                <div className="bg-surface rounded-2xl p-5 border border-surfaceHighlight">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-white font-semibold">Analysis Reports</h3>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex gap-3 items-start group cursor-pointer">
                             <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                <FileCode size={20} />
                             </div>
                             <div>
                                <p className="text-sm text-slate-300 group-hover:text-white transition-colors line-clamp-2">
                                    Latest Batch Analysis: {analysisResult ? analysisResult.fileName : "No file uploaded"}
                                </p>
                                <span className="text-xs text-slate-500">
                                    {analysisResult ? 'Ready to view' : 'Waiting for upload'}
                                </span>
                             </div>
                        </div>
                         <div className="flex gap-3 items-start group cursor-pointer" onClick={() => setShowAnalysisModal(true)}>
                             <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-400 group-hover:bg-primary-500 group-hover:text-white transition-colors">
                                <Activity size={20} />
                             </div>
                             <div>
                                <p className="text-sm text-slate-300 group-hover:text-white transition-colors">
                                    View Full Analytics Report
                                </p>
                                <span className="text-xs text-slate-500">Click to open modal</span>
                             </div>
                        </div>
                    </div>
                </div>

            </div>
          </div>
        );
    }
  };

  if (!isLoggedIn) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex bg-background text-slate-200 font-sans selection:bg-primary-500/30">
      
      {/* Sidebar - Minimalist */}
      <aside className="w-20 lg:w-64 bg-surface border-r border-surfaceHighlight flex flex-col z-20 transition-all duration-300">
        <div className="h-20 flex items-center justify-center lg:justify-start lg:px-6 border-b border-surfaceHighlight">
            <div className="flex items-center gap-3">
                <div className="text-primary-500">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                        <path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/>
                    </svg>
                </div>
                <span className="hidden lg:block font-bold text-xl text-white tracking-tight">FraudDetect</span>
            </div>
        </div>

        <nav className="flex-1 py-6 space-y-2 px-3">
            {[
                { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
                { id: 'analytics', icon: Activity, label: 'Analytics' },
                { id: 'alerts', icon: AlertTriangle, label: 'Alerts', badge: stats.flaggedTransactions },
            ].map((item) => (
                 <button 
                    key={item.id}
                    onClick={() => setCurrentView(item.id as any)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative ${
                        currentView === item.id
                        ? 'text-white bg-primary-600 shadow-lg shadow-primary-900/20' 
                        : 'text-slate-400 hover:text-white hover:bg-surfaceHighlight'
                    }`}
                >
                    <item.icon size={22} className={currentView === item.id ? "text-white" : "text-slate-500 group-hover:text-white transition-colors"} />
                    <span className="hidden lg:block font-medium">{item.label}</span>
                    {item.badge ? (
                        <span className="hidden lg:flex absolute right-3 w-5 h-5 bg-red-500 text-white text-[10px] items-center justify-center rounded-full">
                            {item.badge > 99 ? '99+' : item.badge}
                        </span>
                    ) : null}
                     {/* Tooltip for small screen */}
                    <div className="lg:hidden absolute left-14 bg-surfaceHighlight px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-slate-700">
                        {item.label}
                    </div>
                </button>
            ))}
            
            <div className="pt-4 mt-4 border-t border-surfaceHighlight">
                 <button 
                    onClick={() => setShowSettings(true)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-surfaceHighlight transition-colors"
                >
                    <Settings size={22} />
                    <span className="hidden lg:block font-medium">Settings</span>
                </button>
                <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-surfaceHighlight transition-colors"
                >
                    <LogOut size={22} />
                    <span className="hidden lg:block font-medium">Log Out</span>
                </button>
            </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Header */}
        <header className="h-20 flex items-center justify-between px-6 lg:px-8 border-b border-surfaceHighlight bg-background/80 backdrop-blur-md sticky top-0 z-30">
            
            {/* Search Bar */}
            <div className="flex-1 max-w-xl relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-500 transition-colors" size={18} />
                <input 
                    type="text" 
                    placeholder="Search for a transaction, client ID or asset..." 
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    className="w-full bg-surface border border-surfaceHighlight rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all placeholder:text-slate-600"
                />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 ml-4">
                
                {/* Simulation Toggle */}
                <button 
                    onClick={() => setIsLive(!isLive)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg ${
                        isLive 
                        ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-red-900/20 hover:brightness-110' 
                        : 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-primary-900/20 hover:brightness-110'
                    }`}
                >
                    {isLive ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                    {isLive ? 'Stop Live' : 'Start Live Mode'}
                </button>

                 <button 
                    onClick={handleExport}
                    className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 transition-all"
                >
                    <Download size={16} />
                    Export
                </button>

                <div className="h-8 w-px bg-surfaceHighlight mx-2"></div>
                
                <div className="relative cursor-pointer group">
                     <Bell size={20} className="text-slate-400 group-hover:text-white transition-colors" />
                     <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-background"></span>
                </div>

                {/* Profile Dropdown */}
                <div className="flex items-center gap-3 pl-2 cursor-pointer group">
                    <img src={currentUser?.avatar} alt="User" className="w-9 h-9 rounded-full border border-slate-700 group-hover:border-primary-500 transition-colors" />
                    <div className="hidden md:block text-right">
                        <p className="text-sm font-medium text-white group-hover:text-primary-400 transition-colors">{currentUser?.name}</p>
                        <ChevronDown size={12} className="ml-auto text-slate-500" />
                    </div>
                </div>

            </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 p-6 lg:p-8 overflow-hidden">
            {renderContent()}
        </div>

        {/* Slide-over Detail Panel */}
        <DetailPanel 
          transaction={selectedTransaction} 
          allTransactions={transactions}
          onClose={() => setSelectedTransaction(null)} 
        />
        
        {/* Analysis Modal */}
        <AnalysisModal 
            isOpen={showAnalysisModal}
            onClose={() => setShowAnalysisModal(false)}
            results={analysisResult}
            transactions={transactions.slice(0, analysisResult?.totalProcessed || 50)}
            reportText={analysisReport}
        />

        {/* Settings Modal */}
        <SettingsModal 
            isOpen={showSettings} 
            onClose={() => setShowSettings(false)}
            user={currentUser}
        />
        
      </main>
    </div>
  );
}