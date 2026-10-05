/* eslint-disable no-console */
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User';
import { GlobalRole } from '../constants/roles';

async function main(): Promise<void> {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npm run make-admin -- someone@example.com');
    process.exit(1);
  }

  await connectDB();

  const user = await User.findOneAndUpdate({ email }, { role: GlobalRole.PLATFORM_ADMIN }, { new: true });

  if (!user) {
    console.error(`No user found with email: ${email}`);
    await disconnectDB();
    process.exit(1);
  }

  console.log(`${user.email} is now a platform_admin.`);
  await disconnectDB();
  process.exit(0);
}

main().catch((error) => {
  console.error('Failed to promote user:', error);
  process.exit(1);
});
