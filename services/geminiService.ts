import { GoogleGenAI } from "@google/genai";
import { EnrichedTransaction, DashboardStats } from '../types';

const getApiKey = () => {
  return localStorage.getItem('GEMINI_API_KEY') || process.env.API_KEY;
};

/**
 * Generates a natural language explanation for a suspicious transaction.
 */
export const getFraudExplanation = async (transaction: EnrichedTransaction): Promise<string> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    return "API Key missing. Please configure it in Settings.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      Act as a senior fraud analyst for a financial institution. 
      Analyze the following transaction which has been flagged by our anomaly detection engine.
      
      Transaction Data:
      - ID: ${transaction.id}
      - Amount: ${transaction.amount} ${transaction.currency}
      - Category: ${transaction.category}
      - Location: ${transaction.location}
      - Type: ${transaction.type}
      - Time: ${transaction.timestamp}
      - ML Fraud Score: ${transaction.fraudScore} (0-1 scale)
      - Triggers: ${transaction.ruleTriggered || 'None'}

      Provide a concise, explainable AI report (max 3 sentences) on why this is suspicious. 
      Focus on patterns like geography, amount anomalies, or category mismatch. 
      Start with "Suspicious because..." or "Likely legitimate because..."
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "No explanation generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI Explanation unavailable. Check your API Key.";
  }
};

/**
 * Generates a formal "Stage 1 Report" for a batch of transactions.
 */
export const generateBatchReport = async (stats: DashboardStats, topTriggers: string[]): Promise<string> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    return "API Key missing. Please configure it in Settings.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      Generate a formal "FraudDetect Stage 1 Analysis Report" for a batch of uploaded financial data.
      
      Batch Statistics:
      - Total Transactions: ${stats.totalTransactions}
      - Anomalies Detected: ${stats.flaggedTransactions}
      - Total Volume Processed: $${stats.totalVolume.toFixed(2)}
      - At-Risk Volume: $${stats.blockedVolume.toFixed(2)}
      - Fraud Rate: ${stats.fraudRate.toFixed(2)}%
      - Common Detection Triggers: ${topTriggers.join(', ')}

      The report should be formatted as a professional text file with the following sections:
      1. EXECUTIVE SUMMARY
      2. RISK ANALYSIS
      3. KEY FINDINGS
      4. RECOMMENDATIONS

      Keep it strictly professional, suitable for a banking compliance officer. Do not use markdown formatting (like **bold**), just plain text with caps for headers.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Report generation failed.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Report unavailable. Check your API Key.";
  }
};