export enum TransactionType {
  TRANSFER = 'TRANSFER',
  PAYMENT = 'PAYMENT',
  WITHDRAWAL = 'WITHDRAWAL',
  DEPOSIT = 'DEPOSIT'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ANALYST' | 'ADMIN' | 'VIEWER';
  avatar?: string;
}

export interface Transaction {
  id: string;
  clientId: string;
  amount: number;
  currency: string;
  timestamp: string; // ISO String
  category: string;
  location: string;
  merchant?: string;
  type: TransactionType;
  trueLabel?: number; // 0 or 1, if available in CSV
}

export interface FraudAnalysis {
  transactionId: string;
  fraudScore: number; // 0.0 to 1.0
  isSuspicious: boolean;
  ruleTriggered?: string;
  aiExplanation?: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface EngineeredFeatures {
  client_amount_mean?: number;
  client_amount_std?: number;
  client_transaction_count?: number;
  amount_zscore?: number;
  is_amount_outlier?: boolean;
  time_since_last_trans?: number; // minutes
  amount_rolling_mean_5?: number;
  amount_rolling_std_5?: number;
  is_rapid_transaction?: boolean;
  category_freq?: number;
}

export interface EnrichedTransaction extends Transaction, FraudAnalysis, EngineeredFeatures {
  // Stage 3 Predictions
  isoForestScore?: number;
  logRegScore?: number;
}

export interface DashboardStats {
  totalTransactions: number;
  flaggedTransactions: number;
  totalVolume: number;
  blockedVolume: number;
  fraudRate: number;
}

export interface ModelMetrics {
  rocAuc: number;
  precision: number;
  recall: number;
  f1Score: number;
}

export interface Stage3Results {
  ruleBased: ModelMetrics;
  isolationForest: ModelMetrics;
  logisticRegression: ModelMetrics;
  bestModel: string;
  featureImportance: { feature: string; coefficient: number }[];
}

export interface BatchAnalysisResult {
  fileName: string;
  totalProcessed: number;
  anomaliesFound: number;
  processingTime: number; // ms
  reportContent: string;
  timestamp: string;
  stage3?: Stage3Results;
}