/*
  Warnings:

  - The primary key for the `House` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `House` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `landlordId` column on the `House` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Landlord` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Landlord` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Lease` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Lease` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `leaseId` column on the `MeterReading` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tenantId` column on the `MeterReading` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `RateHistory` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `RateHistory` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Tenant` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Tenant` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Unit` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Unit` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `leaseId` column on the `payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tenantId` column on the `payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `houseId` column on the `payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[code]` on the table `House` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `Landlord` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `Lease` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `RateHistory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[unitId,code]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `Unit` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[houseId,code]` on the table `Unit` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `Lease` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `tenantId` on the `Lease` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `unitId` on the `Lease` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `houseId` on the `Lease` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `unitId` on the `MeterReading` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `code` to the `RateHistory` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `tenantId` on the `RateHistory` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `unitId` on the `RateHistory` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `houseId` on the `RateHistory` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `code` to the `Tenant` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `unitId` on the `Tenant` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `code` to the `Unit` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `houseId` on the `Unit` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "House" DROP CONSTRAINT "House_landlordId_fkey";

-- DropForeignKey
ALTER TABLE "Lease" DROP CONSTRAINT "Lease_houseId_fkey";

-- DropForeignKey
ALTER TABLE "Lease" DROP CONSTRAINT "Lease_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Lease" DROP CONSTRAINT "Lease_unitId_fkey";

-- DropForeignKey
ALTER TABLE "MeterReading" DROP CONSTRAINT "MeterReading_leaseId_fkey";

-- DropForeignKey
ALTER TABLE "MeterReading" DROP CONSTRAINT "MeterReading_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "MeterReading" DROP CONSTRAINT "MeterReading_unitId_fkey";

-- DropForeignKey
ALTER TABLE "RateHistory" DROP CONSTRAINT "RateHistory_houseId_fkey";

-- DropForeignKey
ALTER TABLE "RateHistory" DROP CONSTRAINT "RateHistory_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "RateHistory" DROP CONSTRAINT "RateHistory_unitId_fkey";

-- DropForeignKey
ALTER TABLE "Tenant" DROP CONSTRAINT "Tenant_unitId_fkey";

-- DropForeignKey
ALTER TABLE "Unit" DROP CONSTRAINT "Unit_houseId_fkey";

-- DropForeignKey
ALTER TABLE "payment" DROP CONSTRAINT "payment_houseId_fkey";

-- DropForeignKey
ALTER TABLE "payment" DROP CONSTRAINT "payment_leaseId_fkey";

-- DropForeignKey
ALTER TABLE "payment" DROP CONSTRAINT "payment_tenantId_fkey";

-- DropIndex
DROP INDEX "RateHistory_tenantId_key";

-- DropIndex
DROP INDEX "Tenant_unitId_id_key";

-- DropIndex
DROP INDEX "Unit_houseId_id_key";

-- AlterTable
ALTER TABLE "House" DROP CONSTRAINT "House_pkey",
ADD COLUMN     "code" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "landlordId",
ADD COLUMN     "landlordId" INTEGER,
ADD CONSTRAINT "House_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Landlord" DROP CONSTRAINT "Landlord_pkey",
ADD COLUMN     "code" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Landlord_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Lease" DROP CONSTRAINT "Lease_pkey",
ADD COLUMN     "code" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenantId",
ADD COLUMN     "tenantId" INTEGER NOT NULL,
DROP COLUMN "unitId",
ADD COLUMN     "unitId" INTEGER NOT NULL,
DROP COLUMN "houseId",
ADD COLUMN     "houseId" INTEGER NOT NULL,
ADD CONSTRAINT "Lease_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "MeterReading" DROP COLUMN "leaseId",
ADD COLUMN     "leaseId" INTEGER,
DROP COLUMN "tenantId",
ADD COLUMN     "tenantId" INTEGER,
DROP COLUMN "unitId",
ADD COLUMN     "unitId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "RateHistory" DROP CONSTRAINT "RateHistory_pkey",
ADD COLUMN     "code" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "tenantId",
ADD COLUMN     "tenantId" INTEGER NOT NULL,
DROP COLUMN "unitId",
ADD COLUMN     "unitId" INTEGER NOT NULL,
DROP COLUMN "houseId",
ADD COLUMN     "houseId" INTEGER NOT NULL,
ADD CONSTRAINT "RateHistory_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Tenant" DROP CONSTRAINT "Tenant_pkey",
ADD COLUMN     "code" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "unitId",
ADD COLUMN     "unitId" INTEGER NOT NULL,
ADD CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Unit" DROP CONSTRAINT "Unit_pkey",
ADD COLUMN     "code" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "houseId",
ADD COLUMN     "houseId" INTEGER NOT NULL,
ADD CONSTRAINT "Unit_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "payment" DROP COLUMN "leaseId",
ADD COLUMN     "leaseId" INTEGER,
DROP COLUMN "tenantId",
ADD COLUMN     "tenantId" INTEGER,
DROP COLUMN "houseId",
ADD COLUMN     "houseId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "House_code_key" ON "House"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Landlord_code_key" ON "Landlord"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Lease_code_key" ON "Lease"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RateHistory_code_key" ON "RateHistory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_code_key" ON "Tenant"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_unitId_code_key" ON "Tenant"("unitId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_code_key" ON "Unit"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_houseId_number_key" ON "Unit"("houseId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_houseId_code_key" ON "Unit"("houseId", "code");

-- AddForeignKey
ALTER TABLE "House" ADD CONSTRAINT "House_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RateHistory" ADD CONSTRAINT "RateHistory_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RateHistory" ADD CONSTRAINT "RateHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RateHistory" ADD CONSTRAINT "RateHistory_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "MeterReading" ADD CONSTRAINT "MeterReading_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "MeterReading" ADD CONSTRAINT "MeterReading_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "MeterReading" ADD CONSTRAINT "MeterReading_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
