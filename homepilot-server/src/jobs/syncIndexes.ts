import mongoose from 'mongoose';

export async function syncAllIndexes(): Promise<void> {
  const modelNames = mongoose.modelNames();

  for (const name of modelNames) {
    try {
      await mongoose.model(name).syncIndexes();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`[syncIndexes] failed for model "${name}":`, error);
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[syncIndexes] reconciled indexes for ${modelNames.length} model(s)`);
}
