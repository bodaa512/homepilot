import { Plan } from '../models/Plan';

const DEFAULT_PLANS = [
  {
    code: 'free' as const,
    name: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    features: ['منزل واحد', 'صيانة أساسية', 'تخزين مستندات محدود'],
    limits: { homes: 1, aiRequestsPerMonth: 0 },
  },
  {
    code: 'premium' as const,
    name: 'Premium',
    priceMonthly: 9,
    priceYearly: 90,
    features: ['منازل غير محدودة', 'المساعد الذكي', 'مؤشر صحة المنزل', 'تعاون العائلة'],
    limits: { homes: -1, aiRequestsPerMonth: 200 },
  },
  {
    code: 'property_pro' as const,
    name: 'Property Pro',
    priceMonthly: 29,
    priceYearly: 290,
    features: ['إدارة عقارات متعددة', 'إدارة مستأجرين', 'تقارير متقدمة', 'كل ميزات Premium'],
    limits: { homes: -1, aiRequestsPerMonth: 1000 },
  },
];

export async function seedPlans(): Promise<void> {
  for (const plan of DEFAULT_PLANS) {
    await Plan.findOneAndUpdate({ code: plan.code }, plan, { upsert: true, new: true, setDefaultsOnInsert: true });
  }
}
