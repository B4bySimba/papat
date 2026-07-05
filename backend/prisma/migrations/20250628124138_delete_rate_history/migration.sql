/*
  Warnings:

  - You are about to drop the column `currentMeterReading` on the `Lease` table. All the data in the column will be lost.
  - You are about to drop the `RateHistory` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `added_field_1_price` to the `Lease` table without a default value. This is not possible if the table is not empty.
  - Added the required column `added_field_2_price` to the `Lease` table without a default value. This is not possible if the table is not empty.
  - Added the required column `added_field_3_price` to the `Lease` table without a default value. This is not possible if the table is not empty.
  - Added the required column `added_field_4_price` to the `Lease` table without a default value. This is not possible if the table is not empty.
  - Added the required column `added_field_5_price` to the `Lease` table without a default value. This is not possible if the table is not empty.
  - Added the required column `added_field_6_price` to the `Lease` table without a default value. This is not possible if the table is not empty.
  - Added the required column `added_field_7_price` to the `Lease` table without a default value. This is not possible if the table is not empty.
  - Added the required column `electricityRate` to the `Lease` table without a default value. This is not possible if the table is not empty.
  - Added the required column `garbageFee` to the `Lease` table without a default value. This is not possible if the table is not empty.
  - Added the required column `onEntryMeterReading` to the `Lease` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rentRate` to the `Lease` table without a default value. This is not possible if the table is not empty.
  - Added the required column `waterRate` to the `Lease` table without a default value. This is not possible if the table is not empty.
  - Made the column `moveInDate` on table `Lease` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rentDue` on table `Lease` required. This step will fail if there are existing NULL values in that column.
  - Made the column `additionalCharges` on table `Lease` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "RateHistory" DROP CONSTRAINT "RateHistory_houseId_fkey";

-- DropForeignKey
ALTER TABLE "RateHistory" DROP CONSTRAINT "RateHistory_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "RateHistory" DROP CONSTRAINT "RateHistory_unitId_fkey";

-- AlterTable
ALTER TABLE "Lease" DROP COLUMN "currentMeterReading",
ADD COLUMN     "added_field_1_price" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "added_field_2_price" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "added_field_3_price" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "added_field_4_price" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "added_field_5_price" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "added_field_6_price" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "added_field_7_price" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "electricityRate" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "garbageFee" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "onEntryMeterReading" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "rentRate" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "waterRate" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "moveInDate" SET NOT NULL,
ALTER COLUMN "rentDue" SET NOT NULL,
ALTER COLUMN "additionalCharges" SET NOT NULL;

-- DropTable
DROP TABLE "RateHistory";
