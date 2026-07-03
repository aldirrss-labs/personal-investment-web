-- CreateTable
CREATE TABLE "QuarterlySnapshot" (
    "id" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "activeCaps" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuarterlySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnapshotEntry" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "compositeScore" DOUBLE PRECISION NOT NULL,
    "allocationPct" DOUBLE PRECISION NOT NULL,
    "breakdown" JSONB NOT NULL,

    CONSTRAINT "SnapshotEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAnalysis" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "decision" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "keyRisks" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuarterlySnapshot_quarter_key" ON "QuarterlySnapshot"("quarter");

-- CreateIndex
CREATE UNIQUE INDEX "AiAnalysis_ticker_quarter_key" ON "AiAnalysis"("ticker", "quarter");

-- AddForeignKey
ALTER TABLE "SnapshotEntry" ADD CONSTRAINT "SnapshotEntry_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "QuarterlySnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
