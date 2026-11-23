/**
 * Fills the database with the demo account, its friends and ratings (see docs/demo.md).
 * Safe to run again: it rebuilds the demo accounts and touches nothing else.
 *
 *   npm run seed:demo
 */
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { resetDemoData } from '../src/app/demo/demo-reset';

config({ path: 'apps/backend/.env' });

const prisma = new PrismaClient();

resetDemoData(prisma)
  .then(() => console.log('Demo data is ready.'))
  .catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
