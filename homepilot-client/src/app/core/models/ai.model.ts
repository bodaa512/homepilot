/** يطابق AIMessage في السيرفر (models/AIConversation.ts). */
export interface AIChatMessage {
  _id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export type RepairVsReplaceRecommendation = 'REPAIR' | 'CONSIDER_REPLACEMENT' | 'REPLACE';

export interface RepairVsReplaceInput {
  originalPrice: number;
  currentAgeYears: number;
  expectedLifespanYears: number;
  repairCost: number;
  previousRepairsCost: number;
  replacementCost: number;
}

export interface RepairVsReplaceResult {
  recommendation: RepairVsReplaceRecommendation;
  remainingLifespanRatio: number;
  totalRepairInvestment: number;
  repairToReplacementRatio: number;
  explanation: string;
}
