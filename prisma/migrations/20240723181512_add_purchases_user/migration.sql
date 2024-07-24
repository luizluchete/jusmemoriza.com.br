-- CreateTable
CREATE TABLE "PurchasesUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" TEXT,
    "email" TEXT NOT NULL,
    "purchaseAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "status" TEXT,
    "refundedAt" TIMESTAMP(3),
    "transactionHotmart" TEXT,
    "productHotmart" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchasesUser_pkey" PRIMARY KEY ("id")
);
