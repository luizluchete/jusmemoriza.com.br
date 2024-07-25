/*
  Warnings:

  - The `productId` column on the `PurchasesUser` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "PurchasesUser" DROP COLUMN "productId",
ADD COLUMN     "productId" INTEGER;
