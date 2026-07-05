/*
  Warnings:

  - The `state` column on the `Unit` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Unit" DROP COLUMN "state",
ADD COLUMN     "state" BOOLEAN NOT NULL DEFAULT false;

-- DropEnum
DROP TYPE "Ustate";
