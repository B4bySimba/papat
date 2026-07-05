/*
  Warnings:

  - The `rentDue` column on the `Tenant` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "rentDue",
ADD COLUMN     "rentDue" INTEGER;
