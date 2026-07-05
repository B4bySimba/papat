/*
  Warnings:

  - A unique constraint covering the columns `[mReadingId]` on the table `bill` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "bill" ADD COLUMN     "mReadingId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "bill_mReadingId_key" ON "bill"("mReadingId");

-- AddForeignKey
ALTER TABLE "bill" ADD CONSTRAINT "bill_mReadingId_fkey" FOREIGN KEY ("mReadingId") REFERENCES "MeterReading"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
