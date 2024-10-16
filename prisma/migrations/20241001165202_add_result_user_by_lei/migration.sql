-- CreateTable
CREATE TABLE "LeiResultUser" (
    "ratingQuiz" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "leiId" TEXT NOT NULL,

    CONSTRAINT "LeiResultUser_pkey" PRIMARY KEY ("leiId","userId")
);

-- AddForeignKey
ALTER TABLE "LeiResultUser" ADD CONSTRAINT "LeiResultUser_leiId_fkey" FOREIGN KEY ("leiId") REFERENCES "leis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeiResultUser" ADD CONSTRAINT "LeiResultUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
