/*
  Warnings:

  - You are about to drop the `bill` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "bill" DROP CONSTRAINT "bill_houseId_fkey";

-- DropForeignKey
ALTER TABLE "bill" DROP CONSTRAINT "bill_leaseId_fkey";

-- DropForeignKey
ALTER TABLE "bill" DROP CONSTRAINT "bill_mReadingId_fkey";

-- DropForeignKey
ALTER TABLE "bill" DROP CONSTRAINT "bill_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "bill" DROP CONSTRAINT "bill_unitId_fkey";

-- DropTable
DROP TABLE "bill";
