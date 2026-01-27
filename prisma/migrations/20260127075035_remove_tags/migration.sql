/*
  Warnings:

  - You are about to drop the column `tags` on the `Expense` table. All the data in the column will be lost.
  - You are about to drop the `Tag` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Tag" DROP CONSTRAINT "Tag_userId_fkey";

-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "tags";

-- DropTable
DROP TABLE "Tag";
