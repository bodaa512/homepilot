import { RepairVsReplaceService } from '../../src/services/repairVsReplace.service';

describe('RepairVsReplaceService', () => {
  it('recommends REPLACE when remaining lifespan is very low', () => {
    const result = RepairVsReplaceService.calculate({
      originalPrice: 20000,
      currentAgeYears: 9.5,
      expectedLifespanYears: 10,
      repairCost: 4500,
      previousRepairsCost: 8000,
      replacementCost: 15000,
    });
    expect(result.recommendation).toBe('REPLACE');
  });

  it('recommends REPAIR when the asset is young and repair cost is low relative to replacement', () => {
    const result = RepairVsReplaceService.calculate({
      originalPrice: 20000,
      currentAgeYears: 1,
      expectedLifespanYears: 10,
      repairCost: 500,
      previousRepairsCost: 0,
      replacementCost: 15000,
    });
    expect(result.recommendation).toBe('REPAIR');
  });

  it('recommends CONSIDER_REPLACEMENT in the middle ground', () => {
    const result = RepairVsReplaceService.calculate({
      originalPrice: 20000,
      currentAgeYears: 6,
      expectedLifespanYears: 10,
      repairCost: 3000,
      previousRepairsCost: 2500,
      replacementCost: 15000,
    });
    expect(result.recommendation).toBe('CONSIDER_REPLACEMENT');
  });

  it('never divides by zero when replacementCost is 0', () => {
    const result = RepairVsReplaceService.calculate({
      originalPrice: 1000,
      currentAgeYears: 2,
      expectedLifespanYears: 5,
      repairCost: 100,
      previousRepairsCost: 0,
      replacementCost: 0,
    });
    expect(Number.isFinite(result.repairToReplacementRatio)).toBe(true);
  });
});
