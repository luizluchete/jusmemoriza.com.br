/*
  Warnings:

  - Added the required column `userId` to the `cadernos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "cadernos" ADD COLUMN     "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "cadernos" ADD CONSTRAINT "cadernos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
