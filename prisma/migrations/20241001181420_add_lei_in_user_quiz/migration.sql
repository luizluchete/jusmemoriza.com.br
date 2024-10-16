-- AlterTable
ALTER TABLE "UserQuiz" ADD COLUMN     "leiId" TEXT;

-- AddForeignKey
ALTER TABLE "UserQuiz" ADD CONSTRAINT "UserQuiz_leiId_fkey" FOREIGN KEY ("leiId") REFERENCES "leis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
