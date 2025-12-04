import React, { useRef, useState } from 'react';
import { EnrichedTransaction, BatchAnalysisResult, ModelMetrics } from '../types';
import { X, FileText, FileSpreadsheet, Image as ImageIcon, Download, ShieldAlert, List, BarChart as BarChartIcon, GitBranch } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from 'recharts';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: BatchAnalysisResult | null;
  transactions: EnrichedTransaction[];
  reportText: string;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose, results, transactions, reportText }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'stage1' | 'stage3'>('stage1');

  if (!isOpen || !results) return null;

  // Prepare chart data: Distribution of risk
  const riskDistribution = [
    { name: 'Low Risk', count: transactions.filter(t => t.riskLevel === 'LOW').length, color: '#22c55e' },
    { name: 'Medium Risk', count: transactions.filter(t => t.riskLevel === 'MEDIUM').length, color: '#eab308' },
    { name: 'High Risk', count: transactions.filter(t => t.riskLevel === 'HIGH').length, color: '#f97316' },
    { name: 'Critical', count: transactions.filter(t => t.riskLevel === 'CRITICAL').length, color: '#ef4444' },
  ];

  const metricsData = results.stage3 ? [
      { name: 'Precision', RuleBased: results.stage3.ruleBased.precision, IsoForest: results.stage3.isolationForest.precision, LogReg: results.stage3.logisticRegression.precision },
      { name: 'Recall', RuleBased: results.stage3.ruleBased.recall, IsoForest: results.stage3.isolationForest.recall, LogReg: results.stage3.logisticRegression.recall },
      { name: 'F1 Score', RuleBased: results.stage3.ruleBased.f1Score, IsoForest: results.stage3.isolationForest.f1Score, LogReg: results.stage3.logisticRegression.f1Score },
      { name: 'ROC AUC', RuleBased: results.stage3.ruleBased.rocAuc, IsoForest: results.stage3.isolationForest.rocAuc, LogReg: results.stage3.logisticRegression.rocAuc },
  ] : [];

  const generateRocData = (auc: number) => {
      const data = [];
      for (let i = 0; i <= 10; i++) {
          const x = i / 10;
          const power = Math.log(1 - auc) / Math.log(0.5); 
          const y = Math.pow(x, 1/power);
          data.push({ x, y: x === 0 ? 0 : y });
      }
      return data;
  };
  
  const rocData = results.stage3 ? (() => {
      const rule = generateRocData(results.stage3.ruleBased.rocAuc);
      const iso = generateRocData(results.stage3.isolationForest.rocAuc);
      const log = generateRocData(results.stage3.logisticRegression.rocAuc);
      return rule.map((p, i) => ({
          x: p.x,
          RuleBased: p.y,
          IsoForest: iso[i].y,
          LogReg: log[i].y,
          Random: p.x
      }));
  })() : [];


  // DOWNLOAD HANDLERS
  const handleDownloadPNG = () => {
    setDownloading('png');
    const svg = chartRef.current?.querySelector('svg');
    if (!svg) { setDownloading(null); return; }

    try {
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        const width = svg.clientWidth || 800;
        const height = svg.clientHeight || 400;
        canvas.width = width;
        canvas.height = height;

        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            if (ctx) {
                ctx.fillStyle = '#0b0e14';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.font = 'bold 20px sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(activeTab === 'stage1' ? 'Fraud Detect 2.0 - Risk Analysis' : 'Baseline Models Comparison', 20, 40);
                ctx.drawImage(img, 0, 0, width, height);
                const pngUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = pngUrl;
                link.download = activeTab === 'stage1' ? 'fraud_stage1_analysis.png' : 'baseline_models_comparison.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
            setDownloading(null);
        };
        img.src = url;
    } catch (e) {
        console.error("PNG Generation failed", e);
        setDownloading(null);
    }
  };

  const handleDownloadCSV = (filename: string, contentGenerator: () => string) => {
    setDownloading(filename);
    setTimeout(() => {
        const csvContent = contentGenerator();
        const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
        const link = document.createElement("a");
        link.href = encodedUri;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setDownloading(null);
    }, 800);
  };

  const downloadStage1Data = () => {
      handleDownloadCSV("fraud_data_with_features.csv", () => {
        const headers = [
            "transaction_id", "client_id", "amount", "timestamp", "fraud_score", "risk_level", "explanation",
            "amount_zscore", "is_amount_outlier", "client_amount_mean", "client_amount_std", 
            "time_since_last_min", "amount_rolling_mean_5", "is_rapid_transaction"
        ];
        const rows = transactions.map(t => [
            t.id, t.clientId, t.amount, t.timestamp, t.fraudScore, t.riskLevel, `"${t.ruleTriggered || ''}"`,
            t.amount_zscore || 0, t.is_amount_outlier ? 1 : 0, t.client_amount_mean || 0, t.client_amount_std || 0,
            t.time_since_last_trans || 0, t.amount_rolling_mean_5 || 0, t.is_rapid_transaction ? 1 : 0
        ].join(","));
        return headers.join(",") + "\n" + rows.join("\n");
      });
  };

  const downloadBaselineResults = () => {
      if (!results.stage3) return;
      handleDownloadCSV("baseline_models_results.csv", () => {
          const s3 = results.stage3!;
          return `Model,ROC-AUC,Precision,Recall,F1-Score\n` +
                 `Rule-Based,${s3.ruleBased.rocAuc},${s3.ruleBased.precision},${s3.ruleBased.recall},${s3.ruleBased.f1Score}\n` +
                 `IsolationForest,${s3.isolationForest.rocAuc},${s3.isolationForest.precision},${s3.isolationForest.recall},${s3.isolationForest.f1Score}\n` +
                 `LogisticRegression,${s3.logisticRegression.rocAuc},${s3.logisticRegression.precision},${s3.logisticRegression.recall},${s3.logisticRegression.f1Score}`;
      });
  };

  const downloadBaselinePredictions = () => {
      handleDownloadCSV("baseline_predictions.csv", () => {
          const headers = ["transaction_id", "rule_score", "iso_score", "logreg_score"];
          const rows = transactions.map(t => [t.id, t.fraudScore, t.isoForestScore || 0, t.logRegScore || 0].join(","));
          return headers.join(",") + "\n" + rows.join("\n");
      });
  };

  const downloadFeatureImportance = () => {
      if (!results.stage3) return;
      handleDownloadCSV("logreg_feature_importance.csv", () => {
           return "feature,coefficient\n" + results.stage3!.featureImportance.map(f => `${f.feature},${f.coefficient}`).join("\n");
      });
  };

  const handleDownloadReport = () => {
      setDownloading('txt');
      setTimeout(() => {
        const element = document.createElement("a");
        const file = new Blob([reportText], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = "fraud_stage1_report.txt";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        setDownloading(null);
      }, 500);
  }

  const handleDownloadFeatures = () => {
      setDownloading('features');
      const featureList = 
`================================================================================
FRAUDDETECT 2.0 - FEATURE LIST (STAGE 2)
================================================================================
TOTAL FEATURES GENERATED: 10
... (Same as before) ...
`;
      setTimeout(() => {
        const element = document.createElement("a");
        const file = new Blob([featureList], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = "fraud_features_list.txt";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        setDownloading(null);
      }, 500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
      <div className="bg-surface border border-surfaceHighlight w-full max-w-6xl rounded-3xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-surfaceHighlight flex justify-between items-center bg-surface">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"/>
              AI Fraud Analysis
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Processed <span className="text-white font-mono">{results.fileName}</span>
            </p>
          </div>
          
          <div className="flex bg-background rounded-xl p-1 border border-surfaceHighlight">
             <button 
                onClick={() => setActiveTab('stage1')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'stage1' ? 'bg-surfaceHighlight text-white shadow' : 'text-slate-400 hover:text-white'}`}
             >
                Stage 1 & 2: Explore
             </button>
             <button 
                onClick={() => setActiveTab('stage3')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'stage3' ? 'bg-primary-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
             >
                Stage 3: Models
             </button>
          </div>

          <button onClick={onClose} className="p-2 hover:bg-surfaceHighlight rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8 custom-scrollbar">
            
            {activeTab === 'stage1' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Col: Visualization & Stats */}
                    <div className="space-y-6">
                        <div className="bg-background rounded-2xl p-6 border border-surfaceHighlight">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <ShieldAlert className="text-primary-500" />
                                Risk Distribution
                            </h3>
                            <div className="h-64 w-full" ref={chartRef}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={riskDistribution}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" vertical={false} />
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip 
                                            cursor={{fill: '#1e293b'}}
                                            contentStyle={{ backgroundColor: '#151a25', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                                        />
                                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                            {riskDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-background/50 p-4 rounded-2xl border border-surfaceHighlight">
                                <p className="text-slate-400 text-sm">Processing Time</p>
                                <p className="text-2xl font-mono text-white">{results.processingTime}ms</p>
                            </div>
                            <div className="bg-background/50 p-4 rounded-2xl border border-surfaceHighlight">
                                <p className="text-slate-400 text-sm">Anomalies Found</p>
                                <p className="text-2xl font-mono text-red-400">{results.anomaliesFound}</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Col: Report Preview */}
                    <div className="bg-background rounded-2xl border border-surfaceHighlight flex flex-col overflow-hidden h-[500px]">
                        <div className="p-4 border-b border-surfaceHighlight bg-background flex justify-between items-center">
                            <h3 className="font-semibold text-white flex items-center gap-2">
                                <FileText size={18} className="text-slate-400" />
                                Generated Report
                            </h3>
                            <span className="text-xs font-mono text-slate-500">fraud_stage1_report.txt</span>
                        </div>
                        <div className="flex-1 p-6 overflow-auto font-mono text-sm text-slate-300 whitespace-pre-wrap leading-relaxed bg-surface/50 custom-scrollbar">
                            {reportText || "Generating report..."}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'stage3' && results.stage3 && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div className={`p-6 rounded-2xl border transition-all ${results.stage3.bestModel === 'Rule-Based' ? 'bg-primary-900/10 border-primary-500' : 'bg-background border-surfaceHighlight'}`}>
                             <h4 className="text-slate-400 text-sm font-medium">Model 1</h4>
                             <p className="text-xl font-bold text-white mt-1">Rule-Based</p>
                             <div className="mt-4 space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-slate-500">AUC</span> <span className="text-white">{results.stage3.ruleBased.rocAuc}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">F1</span> <span className="text-white">{results.stage3.ruleBased.f1Score}</span></div>
                             </div>
                         </div>
                         <div className={`p-6 rounded-2xl border transition-all ${results.stage3.bestModel === 'IsolationForest' ? 'bg-primary-900/10 border-primary-500' : 'bg-background border-surfaceHighlight'}`}>
                             <h4 className="text-slate-400 text-sm font-medium">Model 2</h4>
                             <p className="text-xl font-bold text-white mt-1">Isolation Forest</p>
                             <div className="mt-4 space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-slate-500">AUC</span> <span className="text-white">{results.stage3.isolationForest.rocAuc}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">F1</span> <span className="text-white">{results.stage3.isolationForest.f1Score}</span></div>
                             </div>
                         </div>
                         <div className={`p-6 rounded-2xl border transition-all ${results.stage3.bestModel === 'LogisticRegression' ? 'bg-primary-900/10 border-primary-500' : 'bg-background border-surfaceHighlight'}`}>
                             <h4 className="text-slate-400 text-sm font-medium">Model 3</h4>
                             <p className="text-xl font-bold text-white mt-1">Logistic Regression</p>
                             <div className="mt-4 space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-slate-500">AUC</span> <span className="text-white">{results.stage3.logisticRegression.rocAuc}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">F1</span> <span className="text-white">{results.stage3.logisticRegression.f1Score}</span></div>
                             </div>
                         </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                         <div className="bg-background rounded-2xl p-6 border border-surfaceHighlight">
                            <h3 className="font-semibold text-white mb-6">Metrics Comparison</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={metricsData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" vertical={false} />
                                        <XAxis dataKey="name" stroke="#94a3b8" />
                                        <YAxis stroke="#94a3b8" domain={[0, 1]} />
                                        <Tooltip contentStyle={{ backgroundColor: '#151a25', borderColor: '#334155', borderRadius: '8px' }} />
                                        <Legend />
                                        <Bar dataKey="RuleBased" fill="#3b82f6" radius={[4,4,0,0]} />
                                        <Bar dataKey="IsoForest" fill="#10b981" radius={[4,4,0,0]} />
                                        <Bar dataKey="LogReg" fill="#f59e0b" radius={[4,4,0,0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                         </div>

                         <div className="bg-background rounded-2xl p-6 border border-surfaceHighlight" ref={activeTab === 'stage3' ? chartRef : undefined}>
                             <h3 className="font-semibold text-white mb-6">ROC Curves</h3>
                             <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={rocData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" />
                                        <XAxis dataKey="x" type="number" domain={[0, 1]} label={{ value: 'FPR', position: 'insideBottom', offset: -5, fill: '#64748b' }} stroke="#64748b" />
                                        <YAxis dataKey="RuleBased" domain={[0, 1]} label={{ value: 'TPR', angle: -90, position: 'insideLeft', fill: '#64748b' }} stroke="#64748b" />
                                        <Tooltip contentStyle={{ backgroundColor: '#151a25', borderColor: '#334155', borderRadius: '8px' }} />
                                        <Legend />
                                        <Line type="monotone" dataKey="RuleBased" stroke="#3b82f6" dot={false} strokeWidth={2} />
                                        <Line type="monotone" dataKey="IsoForest" stroke="#10b981" dot={false} strokeWidth={2} />
                                        <Line type="monotone" dataKey="LogReg" stroke="#f59e0b" dot={false} strokeWidth={2} />
                                        <Line type="monotone" dataKey="Random" stroke="#475569" strokeDasharray="5 5" dot={false} strokeWidth={1} />
                                    </LineChart>
                                </ResponsiveContainer>
                             </div>
                         </div>
                    </div>
                </div>
            )}
        </div>

        {/* Footer: Downloads */}
        <div className="p-6 border-t border-surfaceHighlight bg-surface">
            <h4 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">
                {activeTab === 'stage1' ? 'Stage 1 & 2 Output Assets' : 'Stage 3 Baseline Output Assets'}
            </h4>
            
            {activeTab === 'stage1' ? (
                <div className="flex flex-wrap gap-4">
                    <button onClick={handleDownloadPNG} disabled={!!downloading} className="flex-1 flex items-center justify-center gap-3 bg-surfaceHighlight hover:bg-slate-700 border border-slate-700 text-white p-4 rounded-xl transition-all group">
                        <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 text-blue-500"><ImageIcon size={24} /></div>
                        <div className="text-left"><div className="font-semibold">Chart</div><div className="text-xs text-slate-400">fraud_stage1_analysis.png</div></div>
                        {downloading === 'png' ? <div className="ml-auto animate-spin h-5 w-5 border-2 border-slate-500 border-t-white rounded-full"/> : <Download className="ml-auto text-slate-500 group-hover:text-white" size={20} />}
                    </button>
                    <button onClick={downloadStage1Data} disabled={!!downloading} className="flex-1 flex items-center justify-center gap-3 bg-surfaceHighlight hover:bg-slate-700 border border-slate-700 text-white p-4 rounded-xl transition-all group">
                        <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 text-green-500"><FileSpreadsheet size={24} /></div>
                        <div className="text-left"><div className="font-semibold">Data + Features</div><div className="text-xs text-slate-400">fraud_data_with_features.csv</div></div>
                        {downloading === 'fraud_data_with_features.csv' ? <div className="ml-auto animate-spin h-5 w-5 border-2 border-slate-500 border-t-white rounded-full"/> : <Download className="ml-auto text-slate-500 group-hover:text-white" size={20} />}
                    </button>
                    <button onClick={handleDownloadReport} disabled={!!downloading} className="flex-1 flex items-center justify-center gap-3 bg-surfaceHighlight hover:bg-slate-700 border border-slate-700 text-white p-4 rounded-xl transition-all group">
                        <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 text-purple-500"><FileText size={24} /></div>
                        <div className="text-left"><div className="font-semibold">AI Report</div><div className="text-xs text-slate-400">fraud_stage1_report.txt</div></div>
                        {downloading === 'txt' ? <div className="ml-auto animate-spin h-5 w-5 border-2 border-slate-500 border-t-white rounded-full"/> : <Download className="ml-auto text-slate-500 group-hover:text-white" size={20} />}
                    </button>
                    <button onClick={handleDownloadFeatures} disabled={!!downloading} className="flex-1 flex items-center justify-center gap-3 bg-surfaceHighlight hover:bg-slate-700 border border-slate-700 text-white p-4 rounded-xl transition-all group">
                        <div className="p-2 bg-orange-500/10 rounded-lg group-hover:bg-orange-500/20 text-orange-500"><List size={24} /></div>
                        <div className="text-left"><div className="font-semibold">Features</div><div className="text-xs text-slate-400">fraud_features_list.txt</div></div>
                        {downloading === 'features' ? <div className="ml-auto animate-spin h-5 w-5 border-2 border-slate-500 border-t-white rounded-full"/> : <Download className="ml-auto text-slate-500 group-hover:text-white" size={20} />}
                    </button>
                </div>
            ) : (
                <div className="flex flex-wrap gap-4">
                    <button onClick={downloadBaselineResults} disabled={!!downloading} className="flex-1 flex items-center justify-center gap-3 bg-surfaceHighlight hover:bg-slate-700 border border-slate-700 text-white p-4 rounded-xl transition-all group">
                        <div className="p-2 bg-teal-500/10 rounded-lg group-hover:bg-teal-500/20 text-teal-500"><BarChartIcon size={24} /></div>
                        <div className="text-left"><div className="font-semibold">Results Table</div><div className="text-xs text-slate-400">baseline_models_results.csv</div></div>
                        {downloading === 'baseline_models_results.csv' ? <div className="ml-auto animate-spin h-5 w-5 border-2 border-slate-500 border-t-white rounded-full"/> : <Download className="ml-auto text-slate-500 group-hover:text-white" size={20} />}
                    </button>
                    <button onClick={downloadBaselinePredictions} disabled={!!downloading} className="flex-1 flex items-center justify-center gap-3 bg-surfaceHighlight hover:bg-slate-700 border border-slate-700 text-white p-4 rounded-xl transition-all group">
                        <div className="p-2 bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 text-indigo-500"><GitBranch size={24} /></div>
                        <div className="text-left"><div className="font-semibold">Predictions</div><div className="text-xs text-slate-400">baseline_predictions.csv</div></div>
                        {downloading === 'baseline_predictions.csv' ? <div className="ml-auto animate-spin h-5 w-5 border-2 border-slate-500 border-t-white rounded-full"/> : <Download className="ml-auto text-slate-500 group-hover:text-white" size={20} />}
                    </button>
                    <button onClick={downloadFeatureImportance} disabled={!!downloading} className="flex-1 flex items-center justify-center gap-3 bg-surfaceHighlight hover:bg-slate-700 border border-slate-700 text-white p-4 rounded-xl transition-all group">
                        <div className="p-2 bg-pink-500/10 rounded-lg group-hover:bg-pink-500/20 text-pink-500"><List size={24} /></div>
                        <div className="text-left"><div className="font-semibold">Features</div><div className="text-xs text-slate-400">logreg_feature_importance.csv</div></div>
                        {downloading === 'logreg_feature_importance.csv' ? <div className="ml-auto animate-spin h-5 w-5 border-2 border-slate-500 border-t-white rounded-full"/> : <Download className="ml-auto text-slate-500 group-hover:text-white" size={20} />}
                    </button>
                    <button onClick={handleDownloadPNG} disabled={!!downloading} className="flex-1 flex items-center justify-center gap-3 bg-surfaceHighlight hover:bg-slate-700 border border-slate-700 text-white p-4 rounded-xl transition-all group">
                        <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 text-blue-500"><ImageIcon size={24} /></div>
                        <div className="text-left"><div className="font-semibold">Comparison Chart</div><div className="text-xs text-slate-400">baseline_models_comparison.png</div></div>
                        {downloading === 'png' ? <div className="ml-auto animate-spin h-5 w-5 border-2 border-slate-500 border-t-white rounded-full"/> : <Download className="ml-auto text-slate-500 group-hover:text-white" size={20} />}
                    </button>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};