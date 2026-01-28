-- DropIndex
DROP INDEX "Contact_userId_idx";

-- DropIndex
DROP INDEX "Contact_userId_name_key";

-- CreateIndex
CREATE INDEX "Contact_userId_name_idx" ON "Contact"("userId", "name");
