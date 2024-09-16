-- CreateTable
CREATE TABLE "ListsUsersMyFlashcards" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "userFlashcardId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListsUsersMyFlashcards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListsUsersMyFlashcards_listId_idx" ON "ListsUsersMyFlashcards"("listId");

-- AddForeignKey
ALTER TABLE "ListsUsersMyFlashcards" ADD CONSTRAINT "ListsUsersMyFlashcards_listId_fkey" FOREIGN KEY ("listId") REFERENCES "listsUsers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListsUsersMyFlashcards" ADD CONSTRAINT "ListsUsersMyFlashcards_userFlashcardId_fkey" FOREIGN KEY ("userFlashcardId") REFERENCES "UserFlashcard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
