import { Schema, model, Document, Types } from 'mongoose';

interface ScoreBreakdown {
  maintenance: number;
  assetCondition: number;
  warrantyCoverage: number;
  repairCostTrend: number;
  criticalAssetsRisk: number;
}

export interface IHomeHealthScore extends Document {
  _id: Types.ObjectId;
  home: Types.ObjectId;
  score: number;
  breakdown: ScoreBreakdown;
  previousScore?: number;
  reasons: string[];
  calculatedAt: Date;
}

const homeHealthScoreSchema = new Schema<IHomeHealthScore>({
  home: { type: Schema.Types.ObjectId, ref: 'Home', required: true },
  score: { type: Number, required: true, min: 0, max: 100 },
  breakdown: {
    maintenance: { type: Number, required: true },
    assetCondition: { type: Number, required: true },
    warrantyCoverage: { type: Number, required: true },
    repairCostTrend: { type: Number, required: true },
    criticalAssetsRisk: { type: Number, required: true },
  },
  previousScore: { type: Number },
  reasons: { type: [String], default: [] },
  calculatedAt: { type: Date, default: Date.now },
});

// Powers "latest score for this home" and score-history charts.
homeHealthScoreSchema.index({ home: 1, calculatedAt: -1 });

export const HomeHealthScore = model<IHomeHealthScore>('HomeHealthScore', homeHealthScoreSchema);
