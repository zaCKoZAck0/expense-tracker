import { PrismaPg } from '@prisma/adapter-pg'
import type { PrismaClient as PrismaClientType } from '../prisma/generated/client'
import { PrismaClient } from '../prisma/generated/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const globalForPrisma = global as unknown as { prisma?: PrismaClientType };

export const db: PrismaClientType =
  globalForPrisma.prisma ?? new PrismaClient({ adapter, log: ['query'] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
