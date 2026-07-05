/*
  Warnings:

  - The values [IN,OUT] on the enum `Tstate` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `currentMeterReading` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `moveInDate` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `rentDue` on the `Tenant` table. All the data in the column will be lost.
  - The `state` column on the `Unit` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `rentRate` to the `Unit` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Ustate" AS ENUM ('OCCUPIED', 'VACANT');

-- CreateEnum
CREATE TYPE "Lstate" AS ENUM ('ACTIVE', 'TERMINATED');

-- AlterEnum
BEGIN;
CREATE TYPE "Tstate_new" AS ENUM ('ACTIVE', 'FORMER', 'BLACKLISTED');
ALTER TABLE "Tenant" ALTER COLUMN "state" DROP DEFAULT;
ALTER TABLE "Tenant" ALTER COLUMN "state" TYPE "Tstate_new" USING ("state"::text::"Tstate_new");
ALTER TYPE "Tstate" RENAME TO "Tstate_old";
ALTER TYPE "Tstate_new" RENAME TO "Tstate";
DROP TYPE "Tstate_old";
ALTER TABLE "Tenant" ALTER COLUMN "state" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "currentMeterReading",
DROP COLUMN "moveInDate",
DROP COLUMN "rentDue",
ALTER COLUMN "state" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "rentRate" DOUBLE PRECISION NOT NULL,
DROP COLUMN "state",
ADD COLUMN     "state" "Ustate" NOT NULL DEFAULT 'VACANT';

-- DropEnum
DROP TYPE "State";

-- CreateTable
CREATE TABLE "Lease" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "houseId" TEXT NOT NULL,
    "moveInDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "rentDue" INTEGER,
    "additionalCharges" DOUBLE PRECISION,
    "currentMeterReading" DOUBLE PRECISION,
    "status" "Lstate" NOT NULL DEFAULT 'ACTIVE',
    "terminationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lease_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
