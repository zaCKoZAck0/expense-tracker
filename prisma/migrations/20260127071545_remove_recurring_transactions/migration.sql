/*
  Warnings:

  - You are about to drop the `RecurringTransaction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RecurringTransaction" DROP CONSTRAINT "RecurringTransaction_userId_fkey";

-- DropTable
DROP TABLE "RecurringTransaction";
