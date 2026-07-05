/*
  Warnings:

  - Added the required column `unitId` to the `MeterReading` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MeterReading" ADD COLUMN     "unitId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "MeterReading" ADD CONSTRAINT "MeterReading_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
