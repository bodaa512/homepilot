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

export const RepairVsReplaceService = {
  /**
   * No AI or external service involved — this is a deterministic ratio
   * comparison so the reasoning is always inspectable, matching the
   * "clearly labeled recommendation, not a guarantee" requirement.
   */
  calculate(input: RepairVsReplaceInput): RepairVsReplaceResult {
    const remainingLifespanRatio = Math.max(
      0,
      1 - input.currentAgeYears / Math.max(input.expectedLifespanYears, 0.1),
    );
    const totalRepairInvestment = input.repairCost + input.previousRepairsCost;
    const repairToReplacementRatio =
      input.replacementCost > 0 ? totalRepairInvestment / input.replacementCost : 0;

    let recommendation: RepairVsReplaceRecommendation;
    let explanation: string;

    if (remainingLifespanRatio <= 0.15 || repairToReplacementRatio > 0.5) {
      recommendation = 'REPLACE';
      explanation =
        `العمر المتبقي المتوقع للجهاز محدود جدًا (${Math.round(remainingLifespanRatio * 100)}% من عمره الافتراضي)، ` +
        `وإجمالي تكلفة الإصلاحات (${totalRepairInvestment}) يمثل ${Math.round(repairToReplacementRatio * 100)}% ` +
        `من تكلفة الاستبدال (${input.replacementCost}) — الاستبدال على الأرجح أوفر اقتصاديًا.`;
    } else if (repairToReplacementRatio > 0.3 || remainingLifespanRatio <= 0.35) {
      recommendation = 'CONSIDER_REPLACEMENT';
      explanation =
        `تكاليف الإصلاح المتراكمة (${totalRepairInvestment}) بدأت تقترب من نسبة معتبرة ` +
        `(${Math.round(repairToReplacementRatio * 100)}%) من تكلفة الاستبدال — يستحق الأمر مقارنة الخيارين.`;
    } else {
      recommendation = 'REPAIR';
      explanation =
        `تكلفة الإصلاح الحالية معقولة مقارنة بتكلفة الاستبدال (${Math.round(repairToReplacementRatio * 100)}%)، ` +
        `والجهاز لا يزال لديه عمر متبقٍ جيد — الإصلاح هو الخيار الأنسب اقتصاديًا الآن.`;
    }

    return {
      recommendation,
      remainingLifespanRatio: Math.round(remainingLifespanRatio * 1000) / 1000,
      totalRepairInvestment,
      repairToReplacementRatio: Math.round(repairToReplacementRatio * 1000) / 1000,
      explanation,
    };
  },
};
