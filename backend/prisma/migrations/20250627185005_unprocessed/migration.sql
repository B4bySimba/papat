/*
  Warnings:

  - Made the column `leaseId` on table `payment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `payment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `houseId` on table `payment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "payment" ALTER COLUMN "leaseId" SET NOT NULL,
ALTER COLUMN "tenantId" SET NOT NULL,
ALTER COLUMN "houseId" SET NOT NULL,
ALTER COLUMN "invoiceNumber" DROP NOT NULL;
