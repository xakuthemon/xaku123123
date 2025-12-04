import { Transaction, FraudAnalysis, EnrichedTransaction, EngineeredFeatures, Stage3Results, ModelMetrics, TransactionType } from '../types';

/**
 * UTILITY: Sigmoid function for Logistic Regression simulation
 */
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/**
 * STAGE 1 & 2: FEATURE ENGINEERING PIPELINE
 * Replicates the Python script's logic:
 * - Group by Client
 * - Calculate Aggregates (Mean, Std, Max)
 * - Calculate Rolling Windows
 * - Create Z-Scores and Velocity features
 */
export const processBatchWithFeatures = (transactions: Transaction[]): EnrichedTransaction[] => {
  // 1. Group by Client (nameOrig)
  const clientGroups: Record<string, Transaction[]> = {};
  transactions.forEach(t => {
    if (!clientGroups[t.clientId]) clientGroups[t.clientId] = [];
    clientGroups[t.clientId].push(t);
  });

  const enrichedResults: EnrichedTransaction[] = [];

  // 2. Process each client's history
  Object.values(clientGroups).forEach(group => {
    // Sort by time (step)
    group.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // --- Client Aggregates ---
    const amounts = group.map(t => t.amount);
    const sum = amounts.reduce((a, b) => a + b, 0);
    const mean = sum / amounts.length;
    const max = Math.max(...amounts);
    
    // Std Dev
    const variance = amounts.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / amounts.length;
    const std = Math.sqrt(variance) || 1; // avoid division by zero

    // Rolling window state
    const rollingWindow5: number[] = [];

    group.forEach((txn, index) => {
      // --- Feature Calculation ---
      
      // Feature: Z-Score
      const zScore = (txn.amount - mean) / std;
      const isOutlier = Math.abs(zScore) > 3;

      // Feature: Max for client
      const isMax = txn.amount === max;

      // Feature: Time Deltas & Velocity
      let timeSinceLast = 0;
      let isRapid = false;
      if (index > 0) {
        const prevTime = new Date(group[index - 1].timestamp).getTime();
        const currTime = new Date(txn.timestamp).getTime();
        // Assuming timestamp is generated from 'step' (hours)
        timeSinceLast = (currTime - prevTime) / (1000 * 60 * 60); // Difference in hours
        if (timeSinceLast <= 1) isRapid = true; // Transaction within same hour step
      }

      // Feature: Rolling Statistics
      rollingWindow5.push(txn.amount);
      if (rollingWindow5.length > 5) rollingWindow5.shift();
      const rollingMean5 = rollingWindow5.reduce((a,b) => a+b, 0) / rollingWindow5.length;
      
      const variance5 = rollingWindow5.reduce((acc, val) => acc + Math.pow(val - rollingMean5, 2), 0) / rollingWindow5.length;
      const rollingStd5 = Math.sqrt(variance5) || 1;

      // Deviation from rolling mean (in sigmas)
      const amountVsRollingMean = (txn.amount - rollingMean5) / rollingStd5;


      // --- STAGE 3.3: RULE-BASED ENGINE (From Python Script) ---
      let ruleScore = 0;
      const triggers: string[] = [];

      // Rule 1: High Z-Score (> 3)
      if (Math.abs(zScore) > 3) {
        ruleScore += 0.3;
        triggers.push(`Z-Score Anomaly (${zScore.toFixed(1)}σ)`);
      }

      // Rule 2: Max Amount for Client
      if (isMax && group.length > 1) {
        ruleScore += 0.25;
        triggers.push('Max Amount for Client');
      }

      // Rule 3: Rapid Transaction
      if (isRapid) {
        ruleScore += 0.2;
        triggers.push('Rapid Sequence (Same Step)');
      }

      // Rule 4: Deviation from Rolling Mean
      if (Math.abs(amountVsRollingMean) > 2) {
        ruleScore += 0.2;
        triggers.push(`Rolling Deviation (${amountVsRollingMean.toFixed(1)}σ)`);
      }

      // Rule 5: Round Numbers (Heuristic addition)
      if (txn.amount > 1000 && txn.amount % 100 === 0) {
        ruleScore += 0.1;
      }

      // Cap score
      ruleScore = Math.min(ruleScore, 1.0);
      
      const isSuspicious = ruleScore >= 0.5;
      
      let riskLevel: FraudAnalysis['riskLevel'] = 'LOW';
      if (ruleScore > 0.8) riskLevel = 'CRITICAL';
      else if (ruleScore > 0.5) riskLevel = 'HIGH';
      else if (ruleScore > 0.3) riskLevel = 'MEDIUM';

      // --- Construct Enriched Object ---
      const enriched: EnrichedTransaction = {
        ...txn,
        transactionId: txn.id,
        fraudScore: parseFloat(ruleScore.toFixed(2)),
        isSuspicious,
        riskLevel,
        ruleTriggered: triggers.join(', '),
        // Features
        client_amount_mean: parseFloat(mean.toFixed(2)),
        client_amount_std: parseFloat(std.toFixed(2)),
        client_transaction_count: group.length,
        amount_zscore: parseFloat(zScore.toFixed(2)),
        is_amount_outlier: isOutlier,
        time_since_last_trans: parseFloat(timeSinceLast.toFixed(2)),
        amount_rolling_mean_5: parseFloat(rollingMean5.toFixed(2)),
        amount_rolling_std_5: parseFloat(rollingStd5.toFixed(2)),
        is_rapid_transaction: isRapid,
        category_freq: 0 
      };

      enrichedResults.push(enriched);
    });
  });

  return enrichedResults;
};

/**
 * STAGE 3: BASELINE MODELS EXECUTION
 * implements the actual mathematical logic for the 3 models described in the case study.
 */
export const runStage3Analysis = (transactions: EnrichedTransaction[]): Stage3Results => {
    
    // 1. Establish Ground Truth
    // If trueLabel is present (from 'isFraud' column), use it.
    // Otherwise, fallback to the strict Rule-Based definition for demo purposes.
    const groundTruth = transactions.map(t => {
        if (t.trueLabel !== undefined) return t.trueLabel;
        return t.fraudScore > 0.7 ? 1 : 0; 
    });

    // --- MODEL 1: RULE-BASED ---
    // Already calculated in Stage 2 pipeline as 'fraudScore'
    const ruleScores = transactions.map(t => t.fraudScore);
    const rulePreds = ruleScores.map(s => s >= 0.5 ? 1 : 0);

    // --- MODEL 2: ISOLATION FOREST (Approximation) ---
    // Real IsoForest builds trees. Here we simulate the *anomaly score* function 
    // by combining normalized distances in multiple dimensions (Amount, Z-Score, Deviation).
    const isoScores = transactions.map(t => {
        // Normalize features roughly to 0-1 range for distance calculation
        const f1 = Math.min(Math.abs(t.amount_zscore || 0) / 10, 1); // Z-Score contribution
        const f2 = Math.min((t.amount_rolling_std_5 || 0) / (t.client_amount_mean || 1), 1); // Volatility
        const f3 = t.is_rapid_transaction ? 1.0 : 0.0; // Temporal anomaly

        // Weighted Euclidean distance from "Normal" center (0,0,0)
        const distance = Math.sqrt(f1*f1 + f2*f2 + f3*f3) / 1.73; // Normalize by sqrt(3)
        return parseFloat(distance.toFixed(4));
    });
    const isoPreds = isoScores.map(s => s > 0.4 ? 1 : 0); // IsoForest usually has a lower threshold for "outlier"

    // --- MODEL 3: LOGISTIC REGRESSION (Linear Model) ---
    // Uses weights derived from the "Feature Importance" section of the Python script
    const logRegScores = transactions.map(t => {
        // Weights (Coefficients)
        const w_zscore = 2.45;
        const w_rapid = 1.89;
        const w_amount = 0.0001; // Scaled down
        const w_rolling_dev = 1.2;
        const bias = -4.5;

        // Features
        const x_zscore = Math.abs(t.amount_zscore || 0);
        const x_rapid = t.is_rapid_transaction ? 1 : 0;
        const x_amount = t.amount;
        const x_rolling_dev = Math.abs((t.amount - (t.amount_rolling_mean_5 || 0)) / (t.amount_rolling_std_5 || 1));

        // Linear Combination
        const z = (w_zscore * x_zscore) + (w_rapid * x_rapid) + (w_amount * x_amount) + (w_rolling_dev * x_rolling_dev) + bias;
        
        // Sigmoid Activation
        const prob = sigmoid(z);
        return parseFloat(prob.toFixed(4));
    });
    const logRegPreds = logRegScores.map(s => s > 0.5 ? 1 : 0);

    // Store scores back to transaction objects for CSV export
    transactions.forEach((t, i) => {
        t.isoForestScore = isoScores[i];
        t.logRegScore = logRegScores[i];
    });

    // Helper: Calculate Metrics
    const calcMetrics = (preds: number[], scores: number[], truth: number[]): ModelMetrics => {
        let tp = 0, fp = 0, fn = 0, tn = 0;
        truth.forEach((actual, i) => {
            const pred = preds[i];
            if (actual === 1 && pred === 1) tp++;
            if (actual === 0 && pred === 1) fp++;
            if (actual === 1 && pred === 0) fn++;
            if (actual === 0 && pred === 0) tn++;
        });

        const precision = (tp + fp) === 0 ? 0 : tp / (tp + fp);
        const recall = (tp + fn) === 0 ? 0 : tp / (tp + fn);
        const f1Score = (precision + recall) === 0 ? 0 : 2 * (precision * recall) / (precision + recall);
        
        // ROC AUC (Trapezoidal approximation)
        const pairs = scores.map((s, i) => ({ s, t: truth[i] })).sort((a, b) => b.s - a.s);
        let auc = 0;
        let posCount = 0;
        pairs.forEach(p => {
            if (p.t === 1) posCount++;
            else auc += posCount;
        });
        const totalPos = truth.filter(x => x === 1).length;
        const totalNeg = truth.length - totalPos;
        const rocAuc = totalPos * totalNeg === 0 ? 0.5 : auc / (totalPos * totalNeg);

        return {
            precision: parseFloat(precision.toFixed(4)),
            recall: parseFloat(recall.toFixed(4)),
            f1Score: parseFloat(f1Score.toFixed(4)),
            rocAuc: parseFloat(rocAuc.toFixed(4))
        };
    };

    const ruleMetrics = calcMetrics(rulePreds, ruleScores, groundTruth);
    const isoMetrics = calcMetrics(isoPreds, isoScores, groundTruth);
    const logMetrics = calcMetrics(logRegPreds, logRegScores, groundTruth);

    // Determine Best Model
    let bestModel = 'Rule-Based';
    let maxAuc = ruleMetrics.rocAuc;

    if (isoMetrics.rocAuc > maxAuc) {
        maxAuc = isoMetrics.rocAuc;
        bestModel = 'IsolationForest';
    }
    if (logMetrics.rocAuc > maxAuc) {
        maxAuc = logMetrics.rocAuc;
        bestModel = 'LogisticRegression';
    }

    // Feature Importance (Static return based on the Python script findings)
    const featureImportance = [
        { feature: 'amount_zscore', coefficient: 2.45 },
        { feature: 'is_rapid_transaction', coefficient: 1.89 },
        { feature: 'amount_rolling_dev', coefficient: 1.2 },
        { feature: 'client_transaction_count', coefficient: 0.4 },
        { feature: 'amount', coefficient: 0.0001 }
    ];

    return {
        ruleBased: ruleMetrics,
        isolationForest: isoMetrics,
        logisticRegression: logMetrics,
        bestModel,
        featureImportance
    };
};

// Fallback for demo mode
export const analyzeTransaction = (txn: Transaction, history: Transaction[]): EnrichedTransaction => {
    // OPTIMIZATION: Only use history relevant to the specific client. 
    // This reduces N drastically for the feature engineering step.
    const clientHistory = history.filter(t => t.clientId === txn.clientId);
    const batch = [...clientHistory, txn];
    
    // Use the batch processor on the smaller subset
    const results = processBatchWithFeatures(batch);
    
    // Return the newly enriched transaction (last in batch)
    return results.find(t => t.id === txn.id) || results[results.length - 1];
};

export const generateRandomTransaction = (): Transaction => {
  const categories = ['PAYMENT', 'TRANSFER', 'CASH_OUT', 'DEBIT', 'CASH_IN'];
  const locations = ['New York, US', 'London, UK', 'Paris, FR', 'Tokyo, JP', 'Lagos, NG', 'Moscow, RU', 'Berlin, DE'];
  
  const isFraud = Math.random() > 0.9; 
  const amount = isFraud ? Math.floor(Math.random() * 50000) + 5000 : Math.floor(Math.random() * 1000) + 10;
  
  // Use a smaller set of clients to simulate rapid recurring transactions for demo
  const clientId = `USR-${Math.floor(Math.random() * 20) + 100}`;

  return {
    id: `TXN-${Math.floor(Math.random() * 1000000)}`,
    clientId,
    amount,
    currency: 'USD',
    timestamp: new Date().toISOString(),
    category: categories[Math.floor(Math.random() * categories.length)],
    location: locations[Math.floor(Math.random() * locations.length)],
    type: TransactionType.PAYMENT,
  };
};