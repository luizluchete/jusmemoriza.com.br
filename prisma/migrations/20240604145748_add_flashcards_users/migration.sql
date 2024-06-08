-- CreateTable
CREATE TABLE "FlashcardUserFavorites" (
    "flashcardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlashcardUserFavorites_pkey" PRIMARY KEY ("flashcardId","userId")
);

-- CreateTable
CREATE TABLE "flashcard_user_answers" (
    "id" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "flashcardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flashcard_user_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlashcardUserFavorites_userId_idx" ON "FlashcardUserFavorites"("userId");

-- CreateIndex
CREATE INDEX "flashcard_user_answers_flashcardId_idx" ON "flashcard_user_answers"("flashcardId");

-- AddForeignKey
ALTER TABLE "FlashcardUserFavorites" ADD CONSTRAINT "FlashcardUserFavorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardUserFavorites" ADD CONSTRAINT "FlashcardUserFavorites_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "Flashcard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_user_answers" ADD CONSTRAINT "flashcard_user_answers_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "Flashcard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_user_answers" ADD CONSTRAINT "flashcard_user_answers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
