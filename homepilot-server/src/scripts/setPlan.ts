/* eslint-disable no-console */
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User';

const VALID_PLANS = ['free', 'premium', 'property_pro'] as const;
type PlanCode = (typeof VALID_PLANS)[number];

/**
 * تغيير باقة مستخدم يدويًا (للتطوير المحلي، من غير ما تحتاج Stripe):
 *   npm run set-plan -- someone@example.com premium
 * الباقة المجانية بتسمح ببيت واحد بس؛ premium و property_pro من غير حد.
 */
async function main(): Promise<void> {
  const email = process.argv[2];
  const plan = process.argv[3] as PlanCode | undefined;

  if (!email || !plan || !VALID_PLANS.includes(plan)) {
    console.error(`Usage: npm run set-plan -- someone@example.com <${VALID_PLANS.join('|')}>`);
    process.exit(1);
  }

  await connectDB();

  const user = await User.findOneAndUpdate({ email: email.toLowerCase() }, { planCode: plan }, { new: true });

  if (!user) {
    console.error(`No user found with email: ${email}`);
    await disconnectDB();
    process.exit(1);
  }

  console.log(`${user.email} is now on the "${user.planCode}" plan.`);
  await disconnectDB();
  process.exit(0);
}

main().catch((error) => {
  console.error('Failed to set plan:', error);
  process.exit(1);
});
