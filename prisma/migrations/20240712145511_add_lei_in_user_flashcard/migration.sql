/*
  Warnings:

  - Added the required column `leiId` to the `UserFlashcard` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UserFlashcard" ADD COLUMN     "leiId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "UserFlashcard" ADD CONSTRAINT "UserFlashcard_leiId_fkey" FOREIGN KEY ("leiId") REFERENCES "leis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
