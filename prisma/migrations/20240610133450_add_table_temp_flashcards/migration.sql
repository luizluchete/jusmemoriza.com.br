-- CreateTable
CREATE TABLE "TempFlashcards" (
    "userId" TEXT NOT NULL,
    "flashcardId" TEXT NOT NULL,

    CONSTRAINT "TempFlashcards_pkey" PRIMARY KEY ("userId","flashcardId")
);

-- AddForeignKey
ALTER TABLE "TempFlashcards" ADD CONSTRAINT "TempFlashcards_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "Flashcard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TempFlashcards" ADD CONSTRAINT "TempFlashcards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
