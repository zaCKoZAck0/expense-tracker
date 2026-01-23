/*
  Warnings:

  - Added the required column `userId` to the `SavingsEntry` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "SavingsBucket_userId_idx";

-- DropIndex
DROP INDEX "SavingsEntry_bucketId_date_idx";

-- AlterTable
ALTER TABLE "SavingsBucket" ALTER COLUMN "color" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SavingsEntry" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'deposit',
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "SavingsBucket_userId_createdAt_idx" ON "SavingsBucket"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SavingsEntry_bucketId_idx" ON "SavingsEntry"("bucketId");

-- CreateIndex
CREATE INDEX "SavingsEntry_userId_date_idx" ON "SavingsEntry"("userId", "date");

-- AddForeignKey
ALTER TABLE "SavingsEntry" ADD CONSTRAINT "SavingsEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
