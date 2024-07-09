-- CreateTable
CREATE TABLE "FlashcardIgnore" (
    "id" TEXT NOT NULL,
    "flashcardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlashcardIgnore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlashcardIgnore_userId_idx" ON "FlashcardIgnore"("userId");

-- AddForeignKey
ALTER TABLE "FlashcardIgnore" ADD CONSTRAINT "FlashcardIgnore_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "Flashcard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardIgnore" ADD CONSTRAINT "FlashcardIgnore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
