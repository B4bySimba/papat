/*
  Warnings:

  - Added the required column `additionalCharges` to the `RateHistory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RateHistory" ADD COLUMN     "additionalCharges" DOUBLE PRECISION NOT NULL;
