-- CreateTable
CREATE TABLE "cadernos" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cadernos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caderno_quizzes" (
    "cadernoId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caderno_quizzes_pkey" PRIMARY KEY ("cadernoId","quizId")
);

-- AddForeignKey
ALTER TABLE "caderno_quizzes" ADD CONSTRAINT "caderno_quizzes_cadernoId_fkey" FOREIGN KEY ("cadernoId") REFERENCES "cadernos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caderno_quizzes" ADD CONSTRAINT "caderno_quizzes_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
