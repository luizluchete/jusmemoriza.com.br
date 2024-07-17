/*
  Warnings:

  - The primary key for the `ListsUsersFlashcards` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The required column `id` was added to the `ListsUsersFlashcards` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropForeignKey
ALTER TABLE "ListsUsersFlashcards" DROP CONSTRAINT "ListsUsersFlashcards_flashcardId_fkey";

 -- deletando todos os flashcards das listas do usuario(foi feito em ambiente de desenvolvimento, a plataforma ainda não estava em produção)
DELETE FROM "ListsUsersFlashcards";

-- AlterTable
ALTER TABLE "ListsUsersFlashcards" DROP CONSTRAINT "ListsUsersFlashcards_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "myflashcardId" TEXT,
ALTER COLUMN "flashcardId" DROP NOT NULL,
ADD CONSTRAINT "ListsUsersFlashcards_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "UserFlashcard" (
    "id" TEXT NOT NULL,
    "frente" TEXT NOT NULL,
    "verso" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFlashcard_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ListsUsersFlashcards" ADD CONSTRAINT "ListsUsersFlashcards_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "Flashcard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListsUsersFlashcards" ADD CONSTRAINT "ListsUsersFlashcards_myflashcardId_fkey" FOREIGN KEY ("myflashcardId") REFERENCES "UserFlashcard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFlashcard" ADD CONSTRAINT "UserFlashcard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
