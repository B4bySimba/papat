/*
  Warnings:

  - Made the column `onEntryMeterReading` on table `Lease` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Lease" ALTER COLUMN "onEntryMeterReading" SET NOT NULL;
