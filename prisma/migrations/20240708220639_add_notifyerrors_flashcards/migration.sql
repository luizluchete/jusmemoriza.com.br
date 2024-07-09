/*
  Warnings:

  - You are about to drop the `NotifyErrorQuiz` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "NotifyErrorQuiz" DROP CONSTRAINT "NotifyErrorQuiz_fixedById_fkey";

-- DropForeignKey
ALTER TABLE "NotifyErrorQuiz" DROP CONSTRAINT "NotifyErrorQuiz_quizId_fkey";

-- DropForeignKey
ALTER TABLE "NotifyErrorQuiz" DROP CONSTRAINT "NotifyErrorQuiz_userId_fkey";

-- DropTable
DROP TABLE "NotifyErrorQuiz";

-- CreateTable
CREATE TABLE "NotifyError" (
    "id" TEXT NOT NULL,
    "quizId" TEXT,
    "flashcardId" TEXT,
    "userId" TEXT NOT NULL,
    "userMessage" TEXT NOT NULL,
    "fixedMessage" TEXT,
    "fixed" BOOLEAN NOT NULL DEFAULT false,
    "fixedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotifyError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotifyError_userId_idx" ON "NotifyError"("userId");

-- AddForeignKey
ALTER TABLE "NotifyError" ADD CONSTRAINT "NotifyError_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotifyError" ADD CONSTRAINT "NotifyError_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "Flashcard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotifyError" ADD CONSTRAINT "NotifyError_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotifyError" ADD CONSTRAINT "NotifyError_fixedById_fkey" FOREIGN KEY ("fixedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
