-- AlterTable
ALTER TABLE "NotifyErrorQuiz" ADD COLUMN     "fixedById" TEXT;

-- AddForeignKey
ALTER TABLE "NotifyErrorQuiz" ADD CONSTRAINT "NotifyErrorQuiz_fixedById_fkey" FOREIGN KEY ("fixedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
