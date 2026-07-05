/*
  Warnings:

  - Added the required column `tenantId` to the `MeterReading` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MeterReading" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "MeterReading" ADD CONSTRAINT "MeterReading_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
