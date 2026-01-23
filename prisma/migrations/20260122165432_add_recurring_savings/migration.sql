-- CreateTable
CREATE TABLE "SavingsRecurring" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "lastAppliedMonth" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bucketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "SavingsRecurring_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavingsRecurring_bucketId_idx" ON "SavingsRecurring"("bucketId");

-- CreateIndex
CREATE INDEX "SavingsRecurring_userId_active_idx" ON "SavingsRecurring"("userId", "active");

-- AddForeignKey
ALTER TABLE "SavingsRecurring" ADD CONSTRAINT "SavingsRecurring_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "SavingsBucket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsRecurring" ADD CONSTRAINT "SavingsRecurring_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
