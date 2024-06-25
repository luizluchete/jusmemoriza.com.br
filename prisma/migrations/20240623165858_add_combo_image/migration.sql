-- AlterTable
ALTER TABLE "combos" ADD COLUMN     "color" TEXT;

-- CreateTable
CREATE TABLE "ComboImage" (
    "id" TEXT NOT NULL,
    "altText" TEXT,
    "contentType" TEXT NOT NULL,
    "blob" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "comboId" TEXT NOT NULL,

    CONSTRAINT "ComboImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ComboImage_comboId_key" ON "ComboImage"("comboId");

-- AddForeignKey
ALTER TABLE "ComboImage" ADD CONSTRAINT "ComboImage_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "combos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
