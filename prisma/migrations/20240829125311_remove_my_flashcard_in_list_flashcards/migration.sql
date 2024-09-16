/*
  Warnings:

  - You are about to drop the column `myflashcardId` on the `ListsUsersFlashcards` table. All the data in the column will be lost.
  - Made the column `flashcardId` on table `ListsUsersFlashcards` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ListsUsersFlashcards" DROP CONSTRAINT "ListsUsersFlashcards_flashcardId_fkey";

-- DropForeignKey
ALTER TABLE "ListsUsersFlashcards" DROP CONSTRAINT "ListsUsersFlashcards_myflashcardId_fkey";

-- deleta todos os registros aonde o flashcardId é nulo, pois o mesmo será alterado para not null
DELETE FROM "ListsUsersFlashcards" WHERE "flashcardId" IS NULL;

-- AlterTable (remove myFlashcardId pois o mesmo terá uma tabela de relacionamento)
ALTER TABLE "ListsUsersFlashcards" DROP COLUMN "myflashcardId",
ALTER COLUMN "flashcardId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "ListsUsersFlashcards" ADD CONSTRAINT "ListsUsersFlashcards_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "Flashcard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
