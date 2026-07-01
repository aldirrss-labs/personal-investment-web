-- CreateTable
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capPct" DOUBLE PRECISION NOT NULL DEFAULT 50,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "ticker" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sectorId" TEXT,
    "capPct" DOUBLE PRECISION NOT NULL DEFAULT 25,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("ticker")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fundamental" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fundamental_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CriterionScore" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "rawValue" DOUBLE PRECISION NOT NULL,
    "manual" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CriterionScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sector_name_key" ON "Sector"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Fundamental_ticker_quarter_key_key" ON "Fundamental"("ticker", "quarter", "key");

-- CreateIndex
CREATE UNIQUE INDEX "CriterionScore_ticker_quarter_group_key_key" ON "CriterionScore"("ticker", "quarter", "group", "key");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_ticker_fkey" FOREIGN KEY ("ticker") REFERENCES "Company"("ticker") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fundamental" ADD CONSTRAINT "Fundamental_ticker_fkey" FOREIGN KEY ("ticker") REFERENCES "Company"("ticker") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CriterionScore" ADD CONSTRAINT "CriterionScore_ticker_fkey" FOREIGN KEY ("ticker") REFERENCES "Company"("ticker") ON DELETE RESTRICT ON UPDATE CASCADE;
