/*
  Warnings:

  - You are about to drop the `SavingsRecurring` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SavingsRecurring" DROP CONSTRAINT "SavingsRecurring_bucketId_fkey";

-- DropForeignKey
ALTER TABLE "SavingsRecurring" DROP CONSTRAINT "SavingsRecurring_userId_fkey";

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'expense';

-- DropTable
DROP TABLE "SavingsRecurring";
