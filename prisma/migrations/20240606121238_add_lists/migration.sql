-- CreateTable
CREATE TABLE "listsUsers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listsUsers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListsUsersFlashcards" (
    "listId" TEXT NOT NULL,
    "flashcardId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListsUsersFlashcards_pkey" PRIMARY KEY ("listId","flashcardId")
);

-- CreateIndex
CREATE INDEX "ListsUsersFlashcards_listId_idx" ON "ListsUsersFlashcards"("listId");

-- AddForeignKey
ALTER TABLE "listsUsers" ADD CONSTRAINT "listsUsers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListsUsersFlashcards" ADD CONSTRAINT "ListsUsersFlashcards_listId_fkey" FOREIGN KEY ("listId") REFERENCES "listsUsers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListsUsersFlashcards" ADD CONSTRAINT "ListsUsersFlashcards_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "Flashcard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
