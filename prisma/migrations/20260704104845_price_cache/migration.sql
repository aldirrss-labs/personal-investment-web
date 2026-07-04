-- CreateTable
CREATE TABLE "PriceCache" (
    "ticker" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceCache_pkey" PRIMARY KEY ("ticker")
);
