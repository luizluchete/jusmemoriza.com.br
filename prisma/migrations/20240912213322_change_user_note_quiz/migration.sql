/*
  Warnings:

  - The primary key for the `NoteUserQuiz` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `NoteUserQuiz` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "NoteUserQuiz_userId_idx";

-- AlterTable
ALTER TABLE "NoteUserQuiz" DROP CONSTRAINT "NoteUserQuiz_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "NoteUserQuiz_pkey" PRIMARY KEY ("quizId", "userId");
