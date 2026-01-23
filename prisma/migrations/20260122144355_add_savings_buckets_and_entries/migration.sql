-- CreateTable
CREATE TABLE "SavingsBucket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'blue',
    "goalAmount" DOUBLE PRECISION,
    "interestYearlyPercent" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavingsBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsEntry" (
    "id" TEXT NOT NULL,
    "bucketId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavingsEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavingsBucket_userId_idx" ON "SavingsBucket"("userId");

-- CreateIndex
CREATE INDEX "SavingsEntry_bucketId_date_idx" ON "SavingsEntry"("bucketId", "date");

-- AddForeignKey
ALTER TABLE "SavingsBucket" ADD CONSTRAINT "SavingsBucket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsEntry" ADD CONSTRAINT "SavingsEntry_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "SavingsBucket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
