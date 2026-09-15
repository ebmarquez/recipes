import { verifyOutput } from '../src/lib/verify-output.ts';

try {
  await verifyOutput();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
