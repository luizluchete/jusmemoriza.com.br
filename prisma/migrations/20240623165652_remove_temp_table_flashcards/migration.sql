/*
  Warnings:

  - You are about to drop the `TempFlashcards` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TempFlashcards" DROP CONSTRAINT "TempFlashcards_flashcardId_fkey";

-- DropForeignKey
ALTER TABLE "TempFlashcards" DROP CONSTRAINT "TempFlashcards_userId_fkey";

-- DropTable
DROP TABLE "TempFlashcards";
