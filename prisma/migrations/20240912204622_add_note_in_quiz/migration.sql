-- CreateTable
CREATE TABLE "NoteUserQuiz" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteUserQuiz_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NoteUserQuiz_userId_idx" ON "NoteUserQuiz"("userId");

-- AddForeignKey
ALTER TABLE "NoteUserQuiz" ADD CONSTRAINT "NoteUserQuiz_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteUserQuiz" ADD CONSTRAINT "NoteUserQuiz_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
