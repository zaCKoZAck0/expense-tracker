/*
  Warnings:

  - You are about to drop the column `type` on the `SavingsEntry` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SavingsEntry" DROP COLUMN "type",
ADD COLUMN     "entryType" TEXT NOT NULL DEFAULT 'deposit';
